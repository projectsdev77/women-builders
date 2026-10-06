import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createSession, findSessionUser } from '@/lib/auth/session';
import { deactivateMember, reactivateMember, setAdmin } from '@/lib/services/admin/members';
import {
  declineRequest,
  inviteFromRequest,
  inviteRequestSchema,
  listInviteRequests,
  markRequestSpam,
  openRequestCounts,
  sendOverdueRequestsDigest,
  submitInviteRequest,
} from '@/lib/services/invite-requests';
import {
  createProspect,
  followUpQueue,
  logOutreachAttempt,
  prospectCreateSchema,
  updateProspect,
} from '@/lib/services/admin/prospects';
import { importProspects } from '@/lib/services/admin/import';
import { createInvitation } from '@/lib/services/admin/invitations';
import { resolveReport } from '@/lib/services/admin/reports';
import { dashboardMetrics, defaultRange } from '@/lib/services/admin/dashboard';
import { addDays, formatDateOnly, todayInAppTz } from '@/lib/services/admin/dates';
import { archiveOldProspects } from '@/lib/jobs/archive';
import { resetDb } from './helpers';
import { createMember } from './factories';

beforeEach(resetDb);
const admin = () => createMember({ isAdmin: true, profile: null });
const prospect = (o: Record<string, unknown>) => prospectCreateSchema.parse({ name: 'Pat Prospect', ...o });

const request = (o: Record<string, unknown> = {}) =>
  inviteRequestSchema.parse({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    primaryRole: 'BUILDER',
    country: 'gb',
    statement: 'Building an analytical engine for everyone, and looking for co-builders.',
    consent: true,
    ...o,
  });

describe('invitation requests (R3 F3, F21)', () => {
  it('creates a prospect and an open request, and confirms by email', async () => {
    expect(await submitInviteRequest(request(), '1.1.1.1')).toBe('created');
    const pm = await prisma.potentialMember.findUniqueOrThrow({ where: { email: 'ada@example.com' }, include: { requests: true } });
    expect(pm.outreachStatus).toBe('REQUESTED');
    expect(pm.requests).toHaveLength(1);
    expect(pm.requests[0]).toMatchObject({ status: 'OPEN', country: 'GB', primaryRole: 'BUILDER' });
    expect(await prisma.emailOutbox.count({ where: { kind: 'request_received' } })).toBe(1);
    expect(await openRequestCounts()).toEqual({ open: 1, overdue: 0 });
  });

  it('attaches to a prospect the team already knows, matched by LinkedIn', async () => {
    const a = await admin();
    const known = await createProspect(a.id, prospect({ linkedInUrl: 'https://www.linkedin.com/in/ada' }));
    expect(await submitInviteRequest(request({ linkedInUrl: 'linkedin.com/in/Ada/' }), '1.1.1.1')).toBe('attached');
    const pm = await prisma.potentialMember.findUniqueOrThrow({ where: { id: known.id } });
    expect(pm.outreachStatus).toBe('REQUESTED');
    expect(pm.email).toBe('ada@example.com');
  });

  it('never opens a second request, and silently drops honeypot submissions', async () => {
    await submitInviteRequest(request(), '1.1.1.1');
    expect(await submitInviteRequest(request(), '1.1.1.2')).toBe('already_open');
    expect(await submitInviteRequest(request({ email: 'bot@example.com', website: 'spam.io' }), '1.1.1.3')).toBe('ignored');
    expect(await prisma.invitationRequest.count()).toBe(1);
  });

  it('emails existing members instead, and records do-not-contact people without emailing', async () => {
    await createMember({ email: 'ada@example.com' });
    expect(await submitInviteRequest(request(), '1.1.1.1')).toBe('existing_member');
    expect(await prisma.emailOutbox.count({ where: { kind: 'already_member' } })).toBe(1);

    await prisma.potentialMember.create({ data: { name: 'Eve', email: 'eve@example.com', outreachStatus: 'DO_NOT_CONTACT' } });
    const before = await prisma.emailOutbox.count();
    expect(await submitInviteRequest(request({ email: 'eve@example.com' }), '1.1.1.1')).toBe('do_not_contact');
    expect(await prisma.emailOutbox.count()).toBe(before);
    expect(await prisma.invitationRequest.count()).toBe(0);
  });

  it('rate-limits one network to 5 an hour', async () => {
    for (let i = 0; i < 5; i++) await submitInviteRequest(request({ email: `p${i}@example.com` }), '9.9.9.9');
    await expect(submitInviteRequest(request({ email: 'p6@example.com' }), '9.9.9.9')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(await submitInviteRequest(request({ email: 'p6@example.com' }), '8.8.8.8')).toBe('created');
  });

  it('invite: sends the invitation, closes the request and audits', async () => {
    const a = await admin();
    await submitInviteRequest(request(), '1.1.1.1');
    const [r] = await listInviteRequests('OPEN');
    await inviteFromRequest(a.id, r!.id, 'Strong fit');
    expect(await prisma.invitationRequest.findUniqueOrThrow({ where: { id: r!.id } })).toMatchObject({ status: 'INVITED', decidedById: a.id });
    expect((await prisma.potentialMember.findUniqueOrThrow({ where: { id: r!.potentialMemberId } })).outreachStatus).toBe('INVITED');
    expect(await prisma.emailOutbox.count({ where: { kind: 'invitation', to: 'ada@example.com' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'request.invite' } })).toBe(1);
    await expect(inviteFromRequest(a.id, r!.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('decline: kind email, Not a fit, and no new request for 90 days', async () => {
    const a = await admin();
    await submitInviteRequest(request(), '1.1.1.1');
    const [r] = await listInviteRequests('OPEN');
    await declineRequest(a.id, r!.id, 'Not building yet');
    expect(await prisma.emailOutbox.count({ where: { kind: 'request_declined' } })).toBe(1);
    expect((await prisma.potentialMember.findUniqueOrThrow({ where: { id: r!.potentialMemberId } })).outreachStatus).toBe('NOT_A_FIT');
    expect(await submitInviteRequest(request(), '1.1.1.2')).toBe('recently_declined');

    await prisma.potentialMemberStatusChange.updateMany({ where: { toStatus: 'NOT_A_FIT' }, data: { createdAt: new Date(Date.now() - 91 * 86_400_000) } });
    expect(await submitInviteRequest(request(), '1.1.1.3')).toBe('attached');
    expect((await listInviteRequests('OPEN'))[0]!.previousRequests).toBe(1);
  });

  it('spam: archives without email', async () => {
    const a = await admin();
    await submitInviteRequest(request(), '1.1.1.1');
    const [r] = await listInviteRequests('OPEN');
    const before = await prisma.emailOutbox.count();
    await markRequestSpam(a.id, r!.id);
    expect(await prisma.emailOutbox.count()).toBe(before);
    expect((await prisma.potentialMember.findUniqueOrThrow({ where: { id: r!.potentialMemberId } })).archivedAt).not.toBeNull();
  });

  it('flags requests older than three weeks and emails admins a digest', async () => {
    await admin();
    await submitInviteRequest(request(), '1.1.1.1');
    expect(await sendOverdueRequestsDigest()).toBe(0);
    await prisma.invitationRequest.updateMany({ data: { slaStartsAt: new Date(Date.now() - 22 * 86_400_000) } });
    expect(await openRequestCounts()).toEqual({ open: 1, overdue: 1 });
    expect((await listInviteRequests('OPEN'))[0]).toMatchObject({ overdue: true, daysWaiting: 22 });
    expect(await sendOverdueRequestsDigest()).toBe(1);
    expect(await prisma.emailOutbox.count({ where: { kind: 'overdue_requests_digest' } })).toBe(1);
  });
});

describe('member management (Req 8, 23, G3)', () => {
  it('deactivation ends sessions immediately; reactivation restores access', async () => {
    const a = await admin();
    const m = await createMember();
    const token = await createSession(m.id);
    await deactivateMember(a.id, m.id);
    expect(await findSessionUser(token)).toBeNull();
    await expect(deactivateMember(a.id, a.id)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await reactivateMember(a.id, m.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: m.id } })).accountStatus).toBe('ACTIVE');
  });

  it('lets admins grant and revoke others but not themselves', async () => {
    const a = await admin();
    const b = await admin();
    await expect(setAdmin(a.id, a.id, false)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await setAdmin(a.id, b.id, false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: b.id } })).isAdmin).toBe(false);
    const c = await createMember();
    await setAdmin(a.id, c.id, true);
    expect(await prisma.auditLog.count({ where: { action: { in: ['admin.grant', 'admin.revoke'] } } })).toBe(2);
  });

  it('refuses to revoke the only remaining admin', async () => {
    const a = await admin();
    const b = await admin();
    await setAdmin(a.id, b.id, false);
    const c = await createMember();
    await expect(setAdmin(c.id, a.id, false)).rejects.toMatchObject({ message: "You can't remove the last admin." });
  });
});

describe('potential members (Req 6, 7, 13, G8, G16)', () => {
  it('requires email or LinkedIn and dedupes on both, including members', async () => {
    const a = await admin();
    expect(prospectCreateSchema.safeParse({ name: 'No contact' }).success).toBe(false);
    await createProspect(a.id, prospect({ email: 'Pat@Example.com' }));
    await expect(createProspect(a.id, prospect({ email: 'pat@example.com' }))).rejects.toMatchObject({ code: 'DUPLICATE' });
    await createProspect(a.id, prospect({ linkedInUrl: 'linkedin.com/in/pat' }));
    await expect(createProspect(a.id, prospect({ linkedInUrl: 'https://www.linkedin.com/in/PAT/' }))).rejects.toMatchObject({ code: 'DUPLICATE' });
    const m = await createMember();
    await expect(createProspect(a.id, prospect({ email: m.email }))).rejects.toMatchObject({ code: 'ALREADY_MEMBER' });
  });

  it('records every status change and keeps DNC forever', async () => {
    const a = await admin();
    const p = await createProspect(a.id, prospect({ email: 'dnc@example.com' }));
    await updateProspect(a.id, p.id, { outreachStatus: 'CONTACTED' });
    await logOutreachAttempt(a.id, p.id, { attemptDate: new Date('2026-09-01'), method: 'Email', outcome: 'Please stop', newStatus: 'DO_NOT_CONTACT', nextFollowUpDate: null });
    const history = await prisma.potentialMemberStatusChange.findMany({ where: { potentialMemberId: p.id }, orderBy: { createdAt: 'asc' } });
    expect(history.map((h) => h.toStatus)).toEqual(['IDENTIFIED', 'CONTACTED', 'DO_NOT_CONTACT']);
    await expect(updateProspect(a.id, p.id, { archived: true })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    // Old DNC records survive archival, and still block re-adding and invitations.
    await prisma.potentialMember.update({ where: { id: p.id }, data: { updatedAt: new Date('2020-01-01') } });
    await archiveOldProspects();
    expect((await prisma.potentialMember.findUniqueOrThrow({ where: { id: p.id } })).archivedAt).toBeNull();
    await expect(createProspect(a.id, prospect({ email: 'dnc@example.com' }))).rejects.toMatchObject({ code: 'DO_NOT_CONTACT' });
    await expect(createInvitation(a.id, { email: 'DNC@example.com' })).rejects.toMatchObject({ code: 'DO_NOT_CONTACT' });
  });

  it('archives old closed prospects softly (never deletes)', async () => {
    const a = await admin();
    const p = await createProspect(a.id, prospect({ email: 'old@example.com' }));
    await updateProspect(a.id, p.id, { outreachStatus: 'NOT_INTERESTED' });
    await prisma.potentialMember.update({ where: { id: p.id }, data: { updatedAt: new Date('2020-01-01') } });
    expect(await archiveOldProspects()).toBe(1);
    const after = await prisma.potentialMember.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.archivedAt).not.toBeNull();
  });

  it('follow-up queue uses date-only "today", sorts overdue first and skips closed records', async () => {
    const a = await admin();
    const today = todayInAppTz();
    const due = await createProspect(a.id, prospect({ email: 'due@example.com', nextFollowUpDate: formatDateOnly(today) }));
    const overdue = await createProspect(a.id, prospect({ email: 'late@example.com', nextFollowUpDate: formatDateOnly(addDays(today, -3)) }));
    await createProspect(a.id, prospect({ email: 'future@example.com', nextFollowUpDate: formatDateOnly(addDays(today, 3)) }));
    const closed = await createProspect(a.id, prospect({ email: 'closed@example.com', nextFollowUpDate: formatDateOnly(today) }));
    await updateProspect(a.id, closed.id, { outreachStatus: 'NOT_A_FIT' });
    const queue = await followUpQueue();
    expect(queue.map((q) => q.id)).toEqual([overdue.id, due.id]);
    expect(queue[0]).toMatchObject({ overdue: true });
    expect(queue[1]).toMatchObject({ dueToday: true });
    expect(await followUpQueue({ withinDays: 7 })).toHaveLength(3);
  });

  it('invites a prospect, sets INVITED and refuses existing members', async () => {
    const a = await admin();
    const p = await createProspect(a.id, prospect({ email: 'inv@example.com' }));
    await createInvitation(a.id, { potentialMemberId: p.id });
    expect((await prisma.potentialMember.findUniqueOrThrow({ where: { id: p.id } })).outreachStatus).toBe('INVITED');
    expect(await prisma.emailOutbox.count({ where: { kind: 'invitation', to: 'inv@example.com' } })).toBe(1);
    const m = await createMember();
    await expect(createInvitation(a.id, { email: m.email })).rejects.toMatchObject({ code: 'ALREADY_MEMBER' });
  });
});

describe('CSV import (Req 19, G16)', () => {
  it('previews, then imports valid rows and reports duplicates, DNC, members and errors', async () => {
    const a = await admin();
    const m = await createMember({ email: 'member@example.com' });
    const dnc = await createProspect(a.id, prospect({ email: 'dnc@example.com' }));
    await updateProspect(a.id, dnc.id, { outreachStatus: 'DO_NOT_CONTACT' });
    await createProspect(a.id, prospect({ email: 'known@example.com' }));
    const csv = [
      'Name,Email,Company,Role,LinkedIn URL,Source',
      'Alice Builder,alice@tech.com,TechCorp,builder,,Event',
      'Dup In File,ALICE@tech.com,,,,',
      'Known,known@example.com,,,,',
      'Stop,dnc@example.com,,,,',
      `Member,${m.email},,,,`,
      ',nobody@example.com,,,,',
      'Bad Email,not-an-email,,,,',
      '"=HYPERLINK(""x"")",formula@example.com,"Acme, Inc.",Investor,https://www.linkedin.com/in/formula,',
      'Link Only,,,,linkedin.com/in/link-only,',
    ].join('\r\n');

    const preview = await importProspects(a.id, csv, true);
    expect(preview).toMatchObject({ dryRun: true, successful: 3, skipped: 4, errors: 2 });
    expect(await prisma.potentialMember.count()).toBe(2);

    const done = await importProspects(a.id, csv, false);
    expect(done.successful).toBe(3);
    const alice = await prisma.potentialMember.findUniqueOrThrow({ where: { email: 'alice@tech.com' } });
    expect(alice.role).toBe('Builder');
    const formula = await prisma.potentialMember.findUniqueOrThrow({ where: { email: 'formula@example.com' } });
    expect(formula.name.startsWith("'=")).toBe(true);
    expect(formula.company).toBe('Acme, Inc.');
    expect(done.rows.find((r) => r.row === 3)?.message).toBe('Appears earlier in this file');
    expect(await prisma.auditLog.count({ where: { action: 'prospects.import' } })).toBe(1);
  });

  it('rejects files without a name header or with too many rows', async () => {
    const a = await admin();
    await expect(importProspects(a.id, 'email\nx@y.com', true)).rejects.toMatchObject({ code: 'BAD_HEADER' });
    const big = ['name,email', ...Array.from({ length: 2001 }, (_, i) => `n${i},n${i}@x.com`)].join('\n');
    await expect(importProspects(a.id, big, true)).rejects.toMatchObject({ code: 'TOO_MANY_ROWS' });
  });
});

describe('reports and dashboard (Req 20, 21.5)', () => {
  it('resolves open reports once and audits', async () => {
    const a = await admin();
    const x = await createMember();
    const y = await createMember();
    const r = await prisma.report.create({ data: { reporterId: x.id, reportedUserId: y.id, reportedUserName: y.name, reason: 'SPAM' } });
    await resolveReport(a.id, r.id, 'RESOLVED', 'Warned member');
    await expect(resolveReport(a.id, r.id, 'DISMISSED')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await prisma.auditLog.count({ where: { action: 'report.resolved' } })).toBe(1);
  });

  it('computes counts, non-linear conversion and growth by approval month', async () => {
    const a = await admin();
    await createMember();
    await submitInviteRequest(request(), '1.1.1.1');
    const p1 = await createProspect(a.id, prospect({ email: 'p1@example.com' }));
    const p2 = await createProspect(a.id, prospect({ email: 'p2@example.com' }));
    await updateProspect(a.id, p1.id, { outreachStatus: 'CONTACTED' });
    await updateProspect(a.id, p1.id, { outreachStatus: 'APPROVED' });
    await updateProspect(a.id, p2.id, { outreachStatus: 'CONTACTED' });
    await updateProspect(a.id, p2.id, { outreachStatus: 'NOT_INTERESTED' });
    const m = await dashboardMetrics(defaultRange());
    expect(m.activeMembers).toBe(1); // admin has no profile
    expect(m.requests).toEqual({ open: 1, overdue: 0 });
    const contacted = m.conversion.find((c) => c.status === 'CONTACTED')!;
    expect(contacted).toMatchObject({ entered: 2, reachedApproved: 1, rate: 50 });
    expect(m.potentialMembersByStatus.NOT_INTERESTED).toBe(1);
    expect(m.memberGrowth).toHaveLength(12);
    expect(m.memberGrowth.at(-1)!.newMembers).toBeGreaterThanOrEqual(1);
  });
});
