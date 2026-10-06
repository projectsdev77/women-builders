import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { DURATIONS_MS, appUrl } from '@/lib/config';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { randomToken, sha256 } from '@/lib/security/tokens';
import { normalizeEmail } from '@/lib/validation/common';
import { audit } from '../audit';
import { changeProspectStatus } from '../prospect-status';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export function joinUrl(token: string) {
  return `${appUrl()}/join?invite=${encodeURIComponent(token)}`;
}

/**
 * Issues an invitation inside the caller's transaction (R3 F4). Refuses do-not-contact and
 * existing members. Links to the prospect with the same email when one isn't given.
 * `actorId` is null when the system re-sends an invitation on the member's behalf.
 */
export async function issueInvitation(
  tx: Tx,
  actorId: string | null,
  input: { email?: string | null; potentialMemberId?: string | null },
) {
  let prospect = input.potentialMemberId
    ? await tx.potentialMember.findUnique({ where: { id: input.potentialMemberId } })
    : null;
  if (input.potentialMemberId && !prospect) throw Errors.notFound('Potential member');
  const email = input.email ? normalizeEmail(input.email) : prospect?.email;
  if (!email) throw Errors.validation('This potential member has no email address. Add one first.');
  prospect ??= await tx.potentialMember.findUnique({ where: { email } });

  const dnc = await tx.potentialMember.findFirst({
    where: {
      outreachStatus: 'DO_NOT_CONTACT',
      OR: [{ email }, ...(prospect?.linkedInUrl ? [{ linkedInUrl: prospect.linkedInUrl }] : [])],
    },
  });
  if (dnc || prospect?.outreachStatus === 'DO_NOT_CONTACT') {
    throw new AppError('DO_NOT_CONTACT', 'This person asked not to be contacted.', 409);
  }
  const member = await tx.user.findUnique({ where: { email } });
  if (member && member.accountStatus !== 'DELETED') throw new AppError('ALREADY_MEMBER', 'This email already has an account.', 409);

  // One live invitation per email.
  await tx.invitation.updateMany({ where: { email, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  const token = randomToken();
  const invitation = await tx.invitation.create({
    data: {
      email,
      tokenHash: sha256(token),
      potentialMemberId: prospect?.id ?? null,
      invitedById: actorId,
      expiresAt: new Date(Date.now() + DURATIONS_MS.invitation),
    },
  });
  const inviter = actorId ? await tx.user.findUnique({ where: { id: actorId }, select: { name: true } }) : null;
  await enqueueEmail(tx, { to: email, kind: 'invitation', content: templates.invitation(joinUrl(token), inviter?.name) });
  if (prospect) await changeProspectStatus(tx, prospect.id, 'INVITED', actorId);
  await audit(tx, { actorId, action: 'invitation.create', targetType: 'invitation', targetId: invitation.id, details: { email } });
  return { id: invitation.id, email, expiresAt: invitation.expiresAt.toISOString() };
}

/** Invite by email, optionally linked to a prospect (Req 22). Refuses do-not-contact (G8). */
export function createInvitation(actorId: string, input: { email?: string | null; potentialMemberId?: string | null }) {
  return prisma.$transaction((tx) => issueInvitation(tx, actorId, input));
}

/**
 * One reminder for invitations unused after 7 days (R3 F4). Only token hashes are stored,
 * so the reminder carries a fresh link and the old link stops working. Expiry is unchanged.
 */
export async function sendInvitationReminders(now = new Date()): Promise<number> {
  const due = await prisma.invitation.findMany({
    where: {
      usedAt: null,
      revokedAt: null,
      reminderSentAt: null,
      expiresAt: { gt: now },
      createdAt: { lt: new Date(now.getTime() - 7 * 86_400_000) },
    },
    take: 200,
  });
  for (const inv of due) {
    const token = randomToken();
    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({ where: { id: inv.id }, data: { tokenHash: sha256(token), reminderSentAt: now } });
      await enqueueEmail(tx, {
        to: inv.email,
        kind: 'invitation_reminder',
        content: templates.invitationReminder(joinUrl(token), inv.expiresAt),
      });
    });
  }
  return due.length;
}

export async function revokeInvitation(actorId: string, id: string) {
  const res = await prisma.invitation.updateMany({ where: { id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  if (res.count === 0) throw Errors.notFound('Open invitation');
  await audit(prisma, { actorId, action: 'invitation.revoke', targetType: 'invitation', targetId: id });
}

export async function listInvitations() {
  const rows = await prisma.invitation.findMany({
    include: { invitedBy: { select: { name: true } }, potentialMember: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const now = new Date();
  return rows.map((i) => ({
    id: i.id,
    email: i.email,
    invitedBy: i.invitedBy?.name ?? null,
    prospect: i.potentialMember,
    createdAt: i.createdAt.toISOString(),
    expiresAt: i.expiresAt.toISOString(),
    reminderSentAt: i.reminderSentAt?.toISOString() ?? null,
    status: i.usedAt ? 'accepted' : i.revokedAt ? 'revoked' : i.expiresAt < now ? 'expired' : 'pending',
  }));
}
