import { z } from 'zod';
import type { InviteRequestStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { sha256 } from '@/lib/security/tokens';
import { isCountryCode } from '@/lib/countries';
import { canonicalLinkedInUrl, emailSchema, nameSchema, neutralizeFormula, roleSchema } from '@/lib/validation/common';
import { audit } from './audit';
import { lock } from './locks';
import { changeProspectStatus } from './prospect-status';
import { ROLE_LABELS } from './profile-fields';
import { issueInvitation } from './admin/invitations';

export const REQUEST_ANSWER_DAYS = 21; // "you'll hear back within three weeks" (R3 F3/F21)
export const REREQUEST_AFTER_DAYS = 90;
const LIMITS = { perIpPerHour: 5, perEmailPerDay: 3 };

export const inviteRequestSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  linkedInUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const c = canonicalLinkedInUrl(v);
      if (!c) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a LinkedIn profile URL, like https://www.linkedin.com/in/your-name' });
        return z.NEVER;
      }
      return c;
    }),
  primaryRole: roleSchema,
  city: z.string().trim().max(100).optional().transform((v) => v || null),
  country: z
    .string({ required_error: 'Choose your country' })
    .trim()
    .transform((v, ctx) => {
      const code = v.toUpperCase();
      if (!isCountryCode(code)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose your country' });
        return z.NEVER;
      }
      return code;
    }),
  statement: z
    .string({ required_error: 'Tell us what you are building or working on' })
    .trim()
    .min(20, 'Tell us a bit more (at least 20 characters)')
    .max(1000, 'Keep it under 1,000 characters'),
  referrer: z.string().trim().max(120).optional().transform((v) => v || null),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please agree so we can review your request' }) }),
  /** Honeypot: real people never see or fill this. */
  website: z.string().max(500).optional(),
});
export type InviteRequestInput = z.output<typeof inviteRequestSchema>;

export type SubmitOutcome =
  | 'created'
  | 'attached'
  | 'already_open'
  | 'invitation_resent'
  | 'recently_declined'
  | 'do_not_contact'
  | 'existing_member'
  | 'ignored';

/**
 * Handles a public "Request an invitation" submission (R3 F3). The visitor always sees the
 * same confirmation, so the form never reveals who is already known; the outcome is only
 * for tests and logs.
 */
export async function submitInviteRequest(input: InviteRequestInput, ip: string): Promise<SubmitOutcome> {
  if (input.website) return 'ignored'; // bot
  const ipHash = sha256(`invite:${ip}`);
  const now = new Date();
  const [fromIp, forEmail] = await Promise.all([
    prisma.publicSubmission.count({ where: { kind: 'invite_request', ipHash, createdAt: { gt: new Date(now.getTime() - 3600_000) } } }),
    prisma.publicSubmission.count({ where: { kind: 'invite_request', email: input.email, createdAt: { gt: new Date(now.getTime() - 86_400_000) } } }),
  ]);
  if (fromIp >= LIMITS.perIpPerHour) {
    throw new AppError('RATE_LIMITED', 'Too many requests from your network. Please try again in an hour.', 429);
  }
  await prisma.publicSubmission.create({ data: { kind: 'invite_request', ipHash, email: input.email } });
  if (forEmail >= LIMITS.perEmailPerDay) return 'ignored';

  return prisma.$transaction(async (tx) => {
    await lock(tx, `invite-request:${input.email}`);

    const member = await tx.user.findUnique({ where: { email: input.email } });
    if (member && member.accountStatus !== 'DELETED') {
      await enqueueEmail(tx, { to: input.email, kind: 'already_member', content: templates.alreadyMember() });
      return 'existing_member';
    }

    // Prefer an email match, then LinkedIn.
    let prospect = await tx.potentialMember.findUnique({ where: { email: input.email } });
    if (!prospect && input.linkedInUrl) prospect = await tx.potentialMember.findUnique({ where: { linkedInUrl: input.linkedInUrl } });
    const note = (text: string) =>
      prospect ? tx.outreachNote.create({ data: { potentialMemberId: prospect.id, content: text } }) : Promise.resolve(null);
    const day = now.toISOString().slice(0, 10);

    if (prospect?.outreachStatus === 'DO_NOT_CONTACT') {
      await note(`Requested an invitation on ${day}. This person is on the do-not-contact list; no email was sent.`);
      return 'do_not_contact';
    }
    if (prospect) {
      const open = await tx.invitationRequest.findFirst({ where: { potentialMemberId: prospect.id, status: 'OPEN' } });
      if (open) {
        await note(`Requested again on ${day} (a request is already open).`);
        return 'already_open';
      }
      const liveInvite = await tx.invitation.findFirst({
        where: { email: input.email, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
      });
      if (liveInvite) {
        await issueInvitation(tx, null, { email: input.email, potentialMemberId: prospect.id });
        await note(`Requested an invitation on ${day}; the open invitation was re-sent.`);
        return 'invitation_resent';
      }
      if (prospect.outreachStatus === 'NOT_A_FIT') {
        const declined = await tx.potentialMemberStatusChange.findFirst({
          where: { potentialMemberId: prospect.id, toStatus: 'NOT_A_FIT' },
          orderBy: { createdAt: 'desc' },
        });
        if (declined && now.getTime() - declined.createdAt.getTime() < REREQUEST_AFTER_DAYS * 86_400_000) {
          await note(`Requested again on ${day}, less than 90 days after being declined. No new request was opened.`);
          return 'recently_declined';
        }
      }
    }

    const consentNote = `Requested an invitation via the website on ${day} and agreed to the privacy notice.`;
    let outcome: SubmitOutcome = 'attached';
    if (!prospect) {
      prospect = await tx.potentialMember.create({
        data: {
          name: neutralizeFormula(input.name),
          email: input.email,
          linkedInUrl: input.linkedInUrl,
          role: ROLE_LABELS[input.primaryRole],
          discoverySource: 'Website request',
          referrerName: input.referrer,
          lawfulBasisNote: consentNote,
          outreachStatus: 'REQUESTED',
        },
      });
      await tx.potentialMemberStatusChange.create({ data: { potentialMemberId: prospect.id, fromStatus: null, toStatus: 'REQUESTED' } });
      outcome = 'created';
    } else {
      await tx.potentialMember.update({
        where: { id: prospect.id },
        data: {
          archivedAt: null,
          linkedInUrl: prospect.linkedInUrl ?? input.linkedInUrl,
          email: prospect.email ?? input.email,
          referrerName: prospect.referrerName ?? input.referrer,
          lawfulBasisNote: [prospect.lawfulBasisNote, consentNote].filter(Boolean).join('\n'),
        },
      });
      await changeProspectStatus(tx, prospect.id, 'REQUESTED', null);
    }
    await tx.invitationRequest.create({
      data: {
        potentialMemberId: prospect.id,
        name: input.name,
        email: input.email,
        linkedInUrl: input.linkedInUrl,
        primaryRole: input.primaryRole,
        city: input.city,
        country: input.country,
        statement: input.statement,
        referrer: input.referrer,
        consentAt: now,
        slaStartsAt: now,
      },
    });
    await enqueueEmail(tx, { to: input.email, kind: 'request_received', content: templates.requestReceived(input.name.split(' ')[0]!) });
    return outcome;
  });
}

// ---------------------------------------------------------------- admin queue (R3 F21)

export function isOverdue(r: { status: InviteRequestStatus; slaStartsAt: Date }, now = new Date()) {
  return r.status === 'OPEN' && now.getTime() - r.slaStartsAt.getTime() > REQUEST_ANSWER_DAYS * 86_400_000;
}

export async function listInviteRequests(status: InviteRequestStatus | 'ALL' = 'OPEN') {
  const where: Prisma.InvitationRequestWhereInput = status === 'ALL' ? {} : { status };
  const rows = await prisma.invitationRequest.findMany({
    where,
    include: {
      potentialMember: {
        include: {
          notes: { orderBy: { createdAt: 'desc' }, take: 5 },
          attempts: { orderBy: { attemptDate: 'desc' }, take: 3 },
          requests: { select: { id: true, createdAt: true, status: true } },
        },
      },
    },
    orderBy: { slaStartsAt: status === 'OPEN' ? 'asc' : 'desc' },
    take: 200,
  });
  const decidedBy = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.decidedById).filter((x): x is string => !!x) } },
    select: { id: true, name: true },
  });
  const names = new Map(decidedBy.map((u) => [u.id, u.name]));
  const now = new Date();
  return rows.map((r) => ({
    ...r,
    overdue: isOverdue(r, now),
    daysWaiting: Math.floor((now.getTime() - r.slaStartsAt.getTime()) / 86_400_000),
    decidedByName: r.decidedById ? names.get(r.decidedById) ?? 'Former admin' : null,
    previousRequests: r.potentialMember.requests.filter((x) => x.id !== r.id).length,
  }));
}

export async function openRequestCounts() {
  const now = new Date();
  const [open, overdue] = await Promise.all([
    prisma.invitationRequest.count({ where: { status: 'OPEN' } }),
    prisma.invitationRequest.count({
      where: { status: 'OPEN', slaStartsAt: { lt: new Date(now.getTime() - REQUEST_ANSWER_DAYS * 86_400_000) } },
    }),
  ]);
  return { open, overdue };
}

async function loadOpen(tx: Prisma.TransactionClient, id: string) {
  const r = await tx.invitationRequest.findUnique({ where: { id }, include: { potentialMember: true } });
  if (!r || r.status !== 'OPEN') throw Errors.notFound('Open request');
  return r;
}

export async function inviteFromRequest(actorId: string, id: string, note?: string | null) {
  return prisma.$transaction(async (tx) => {
    const r = await loadOpen(tx, id);
    const invitation = await issueInvitation(tx, actorId, { email: r.email, potentialMemberId: r.potentialMemberId });
    await tx.invitationRequest.update({
      where: { id },
      data: { status: 'INVITED', decidedAt: new Date(), decidedById: actorId, decisionNote: note?.trim() || null },
    });
    await audit(tx, { actorId, action: 'request.invite', targetType: 'invitation_request', targetId: id });
    return invitation;
  });
}

export async function declineRequest(actorId: string, id: string, note?: string | null) {
  await prisma.$transaction(async (tx) => {
    const r = await loadOpen(tx, id);
    await tx.invitationRequest.update({
      where: { id },
      data: { status: 'DECLINED', decidedAt: new Date(), decidedById: actorId, decisionNote: note?.trim() || null },
    });
    await changeProspectStatus(tx, r.potentialMemberId, 'NOT_A_FIT', actorId);
    await enqueueEmail(tx, { to: r.email, kind: 'request_declined', content: templates.requestDeclined(r.name.split(' ')[0]!) });
    await audit(tx, { actorId, action: 'request.decline', targetType: 'invitation_request', targetId: id });
  });
}

/** Closes a junk request silently and archives the prospect (no email). */
export async function markRequestSpam(actorId: string, id: string, note?: string | null) {
  await prisma.$transaction(async (tx) => {
    const r = await loadOpen(tx, id);
    await tx.invitationRequest.update({
      where: { id },
      data: { status: 'SPAM', decidedAt: new Date(), decidedById: actorId, decisionNote: note?.trim() || null },
    });
    if (r.potentialMember.outreachStatus !== 'DO_NOT_CONTACT') {
      await tx.potentialMember.update({ where: { id: r.potentialMemberId }, data: { archivedAt: new Date() } });
    }
    await audit(tx, { actorId, action: 'request.spam', targetType: 'invitation_request', targetId: id });
  });
}

/** Weekly email to admins when requests have waited past the three-week promise. */
export async function sendOverdueRequestsDigest(): Promise<number> {
  const { overdue } = await openRequestCounts();
  if (!overdue) return 0;
  const admins = await prisma.user.findMany({ where: { isAdmin: true, accountStatus: 'ACTIVE' }, select: { email: true } });
  await prisma.$transaction(async (tx) => {
    for (const a of admins) {
      await enqueueEmail(tx, { to: a.email, kind: 'overdue_requests_digest', content: templates.overdueRequestsDigest(overdue) });
    }
  });
  return overdue;
}
