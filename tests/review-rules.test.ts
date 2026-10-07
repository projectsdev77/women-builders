import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import {
  castVote,
  inviteRequestSchema,
  listInviteRequests,
  openRequestCounts,
  submitInviteRequest,
  inviteFromRequest,
} from '@/lib/services/invite-requests';
import { getSiteSettings, updateSiteSettings } from '@/lib/services/site-settings';
import { setReviewer } from '@/lib/services/admin/members';
import { publicNumbers } from '@/lib/services/public-site';
import { resetDb } from './helpers';
import { createMember } from './factories';

beforeEach(resetDb);
const request = (email: string) =>
  inviteRequestSchema.parse({ name: 'Ada Lovelace', email, primaryRole: 'BUILDER', country: 'GB', statement: 'Building an analytical engine for everyone.', consent: true });
const staff = (u: { id: string; isAdmin: boolean; isReviewer: boolean }) => ({ id: u.id, isAdmin: u.isAdmin, isReviewer: u.isReviewer });

async function openRequest(email = 'ada@example.com') {
  await submitInviteRequest(request(email), `ip-${email}`);
  return (await prisma.invitationRequest.findFirstOrThrow({ where: { email } })).id;
}

describe('review rules (R3 F21, R2)', () => {
  it('invites automatically once the required approvals are reached (default 2)', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const reviewer = await createMember();
    await setReviewer(admin.id, reviewer.id, true);
    const r = await prisma.user.findUniqueOrThrow({ where: { id: reviewer.id } });
    const id = await openRequest();

    expect(await castVote(staff(r), id, 'APPROVE', 'Strong builder')).toBe('recorded');
    // Changing a vote is allowed until decided.
    expect(await castVote(staff(r), id, 'DECLINE', null)).toBe('recorded');
    expect(await castVote(staff(r), id, 'APPROVE', 'Changed my mind')).toBe('recorded');
    expect(await castVote(staff(admin), id, 'APPROVE', null)).toBe('invited');
    expect((await prisma.invitationRequest.findUniqueOrThrow({ where: { id } })).status).toBe('INVITED');
    expect(await prisma.emailOutbox.count({ where: { kind: 'invitation', to: 'ada@example.com' } })).toBe(1);
    await expect(castVote(staff(admin), id, 'DECLINE', null)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('declines automatically, flags split votes, and lets an admin decide directly', async () => {
    const [a1, a2, a3] = await Promise.all([1, 2, 3].map(() => createMember({ isAdmin: true, profile: null })));
    const id = await openRequest();
    await castVote(staff(a1!), id, 'APPROVE', null);
    await castVote(staff(a2!), id, 'DECLINE', 'Not building yet');
    const [row] = await listInviteRequests('OPEN', { id: a1!.id, isAdmin: true });
    expect(row).toMatchObject({ needsDecision: true, tally: { approvals: 1, declines: 1, required: 2 } });
    expect(row!.votes.map((v) => v.choice).sort()).toEqual(['APPROVE', 'DECLINE']);
    expect(await castVote(staff(a3!), id, 'DECLINE', null)).toBe('declined');
    expect(await prisma.emailOutbox.count({ where: { kind: 'request_declined' } })).toBe(1);

    const id2 = await openRequest('bea@example.com');
    await castVote(staff(a2!), id2, 'DECLINE', null);
    await inviteFromRequest(a1!.id, id2, 'Overriding the vote');
    expect((await prisma.invitationRequest.findUniqueOrThrow({ where: { id: id2 } })).status).toBe('INVITED');
  });

  it('reviewers see the tally and their own vote, not who voted what; non-staff cannot vote', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const reviewer = await createMember();
    await setReviewer(admin.id, reviewer.id, true);
    const id = await openRequest();
    await castVote(staff(admin), id, 'APPROVE', 'Secret admin note');
    const [row] = await listInviteRequests('OPEN', { id: reviewer.id, isAdmin: false });
    expect(row!.votes).toEqual([]);
    expect(row!.tally.approvals).toBe(1);
    expect(row!.myVote).toBeNull();
    const member = await createMember();
    await expect(castVote({ id: member.id, isAdmin: false, isReviewer: false }, id, 'APPROVE', null)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('respects a one-vote rule from settings', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    await updateSiteSettings(admin.id, { requiredApprovals: 1 });
    const id = await openRequest();
    expect(await castVote(staff(admin), id, 'APPROVE', null)).toBe('invited');
  });
});

describe('waitlist (R3 F21, F26)', () => {
  it('collects requests without a clock while closed, and starts the clock on reopening', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    await updateSiteSettings(admin.id, { applicationsOpen: false, nextReview: 'Next review: March' });
    const id = await openRequest();
    const req = await prisma.invitationRequest.findUniqueOrThrow({ where: { id } });
    expect(req.waitlisted).toBe(true);
    const mail = await prisma.emailOutbox.findFirstOrThrow({ where: { kind: 'request_received' } });
    expect(mail.subject).toContain('waitlist');
    expect(mail.text).toContain('Next review: March');
    // Old waitlisted requests are never "overdue".
    await prisma.invitationRequest.update({ where: { id }, data: { slaStartsAt: new Date(Date.now() - 60 * 86_400_000) } });
    expect(await openRequestCounts()).toEqual({ open: 0, overdue: 0, waitlist: 1 });
    await expect(castVote(staff(admin), id, 'APPROVE', null)).rejects.toMatchObject({ code: 'CONFLICT' });

    const { reopened } = await updateSiteSettings(admin.id, { applicationsOpen: true });
    expect(reopened).toBe(1);
    expect(await openRequestCounts()).toEqual({ open: 1, overdue: 0, waitlist: 0 });
    expect(await prisma.auditLog.count({ where: { action: 'settings.update' } })).toBe(2);
  });
});

describe('public numbers settings (R3 F26)', () => {
  it('applies admin thresholds and hides numbers on request', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    await createMember({ profile: { country: 'NG' } });
    await createMember({ profile: { country: 'KE' } });
    expect(await publicNumbers()).toEqual([]);
    await updateSiteSettings(admin.id, { publicNumbers: { thresholds: { members: 2, countries: 2, introductions: 25, gatherings: 3, wins: 10 }, hidden: [] } });
    expect((await publicNumbers()).map((n) => n.key)).toEqual(['members', 'countries']);
    await updateSiteSettings(admin.id, { publicNumbers: { ...(await getSiteSettings()).publicNumbers, hidden: ['members'] } });
    expect((await publicNumbers()).map((n) => n.key)).toEqual(['countries']);
  });
});
