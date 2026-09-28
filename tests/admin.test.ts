import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { createSession, findSessionUser } from '@/lib/auth/session';
import {
  approveApplication,
  deactivateMember,
  reactivateMember,
  rejectApplication,
  setAdmin,
} from '@/lib/services/admin/members';
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

describe('applications (Req 8, 18, G10)', () => {
  it('approves only verified applications, syncs the prospect, emails and audits', async () => {
    const a = await admin();
    const applicant = await createMember({ accountStatus: 'PENDING' });
    await prisma.user.update({ where: { id: applicant.id }, data: { emailVerifiedAt: null } });
    await expect(approveApplication(a.id, applicant.id)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    await prisma.user.update({ where: { id: applicant.id }, data: { emailVerifiedAt: new Date() } });
    const p = await prisma.potentialMember.create({ data: { name: 'x', email: applicant.email, userId: applicant.id, outreachStatus: 'APPLIED' } });

    await approveApplication(a.id, applicant.id, 'Great fit');
    const u = await prisma.user.findUniqueOrThrow({ where: { id: applicant.id } });
    expect(u.accountStatus).toBe('ACTIVE');
    expect(u.approvedAt).not.toBeNull();
    expect((await prisma.potentialMember.findUniqueOrThrow({ where: { id: p.id } })).outreachStatus).toBe('APPROVED');
    expect(await prisma.emailOutbox.count({ where: { kind: 'welcome' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'application.approve' } })).toBe(1);
  });

  it('rejects with a neutral email and ends sessions', async () => {
    const a = await admin();
    const applicant = await createMember({ accountStatus: 'PENDING' });
    const token = await createSession(applicant.id);
    await rejectApplication(a.id, applicant.id);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: applicant.id } })).accountStatus).toBe('REJECTED');
    expect(await findSessionUser(token)).toBeNull();
    expect(await prisma.emailOutbox.count({ where: { kind: 'application_rejected' } })).toBe(1);
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
    await createMember({ accountStatus: 'PENDING' });
    const p1 = await createProspect(a.id, prospect({ email: 'p1@example.com' }));
    const p2 = await createProspect(a.id, prospect({ email: 'p2@example.com' }));
    await updateProspect(a.id, p1.id, { outreachStatus: 'CONTACTED' });
    await updateProspect(a.id, p1.id, { outreachStatus: 'APPROVED' });
    await updateProspect(a.id, p2.id, { outreachStatus: 'CONTACTED' });
    await updateProspect(a.id, p2.id, { outreachStatus: 'NOT_INTERESTED' });
    const m = await dashboardMetrics(defaultRange());
    expect(m.activeMembers).toBe(1); // admin has no profile
    expect(m.pendingApplications.verified).toBe(1);
    const contacted = m.conversion.find((c) => c.status === 'CONTACTED')!;
    expect(contacted).toMatchObject({ entered: 2, reachedApproved: 1, rate: 50 });
    expect(m.potentialMembersByStatus.NOT_INTERESTED).toBe(1);
    expect(m.memberGrowth).toHaveLength(12);
    expect(m.memberGrowth.at(-1)!.newMembers).toBeGreaterThanOrEqual(1);
  });
});
