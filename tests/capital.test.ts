import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { foundersQuerySchema, investorsQuerySchema, listInvestors, listRaisingFounders } from '@/lib/services/capital';
import { getRecommendations } from '@/lib/services/discovery';
import { needsInvestingCheck, sendInvestingCheckins, setInvestingStatus } from '@/lib/services/investing';
import { pair } from '@/lib/services/relationships';
import { resetDb } from './helpers';
import { createMember } from './factories';

beforeEach(resetDb);
const DAY = 86_400_000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY);
const iq = (o: Record<string, unknown> = {}) => investorsQuerySchema.parse(o);
const fq = (o: Record<string, unknown> = {}) => foundersQuerySchema.parse(o);

function investor(name: string, o: Record<string, unknown> = {}) {
  return createMember({
    name,
    profile: {
      primaryRole: 'INVESTOR',
      investorType: 'Angel',
      investmentStages: ['Seed'],
      checkSizeMin: 25,
      checkSizeMax: 100,
      sectorPreferences: ['fintech'],
      currentlyInvesting: true,
      investingConfirmedAt: daysAgo(10),
      ...o,
    },
  });
}

describe('Capital: investors (R3 F9)', () => {
  it('shows only investors currently investing by default, freshest first', async () => {
    const viewer = await createMember();
    const fresh = await investor('Fresh Fay', { lastCheckMonth: '2026-01' });
    const older = await investor('Older Olu', { investingConfirmedAt: daysAgo(100), lastCheckMonth: '2026-09' });
    await investor('Stale Sue', { investingConfirmedAt: daysAgo(130) });
    await investor('Paused Pam', { currentlyInvesting: false });
    await createMember({ name: 'Secondary Sam', profile: { primaryRole: 'FOUNDER', secondaryRoles: ['INVESTOR'], currentlyInvesting: true, investingConfirmedAt: daysAgo(1), investmentStages: ['Seed'] } });

    const def = await listInvestors(viewer.id, iq());
    expect(def.results.map((r) => r.name)).toEqual(['Fresh Fay', 'Secondary Sam', 'Older Olu']);
    expect(def.results[0]!.id).toBe(fresh.id);
    expect(def.results.at(-1)!.id).toBe(older.id);

    const all = await listInvestors(viewer.id, iq({ investing: 'all' }));
    expect(all.results.map((r) => r.name)).toEqual(expect.arrayContaining(['Stale Sue', 'Paused Pam']));
    expect(all.results.find((r) => r.name === 'Stale Sue')!.investor.investing).toBe('unconfirmed');
  });

  it('matches "I\'m raising checks of $X" only against check sizes the viewer can see', async () => {
    const viewer = await createMember();
    await investor('In Range', { checkSizeMin: 50, checkSizeMax: 200 });
    await investor('Too Small', { checkSizeMin: 5, checkSizeMax: 25 });
    const hidden = await investor('Hidden Range', { checkSizeMin: 50, checkSizeMax: 200, hiddenFields: ['checkSize'] });
    expect((await listInvestors(viewer.id, iq({ amount: '100' }))).results.map((r) => r.name)).toEqual(['In Range']);
    // Without the filter she appears, with the range hidden.
    const card = (await listInvestors(viewer.id, iq())).results.find((r) => r.id === hidden.id)!;
    expect(card.investor.checkSizeMin).toBeNull();
    // A connection sees it and matches.
    await prisma.connection.create({ data: { ...pair(viewer.id, hidden.id) } });
    expect((await listInvestors(viewer.id, iq({ amount: '100' }))).results.map((r) => r.name).sort()).toEqual(['Hidden Range', 'In Range']);
  });

  it('filters by stage, type, leads and sector', async () => {
    const viewer = await createMember();
    await investor('Lead VC', { investorType: 'VC fund', leadsRounds: 'Leads', investmentStages: ['Series A'], sectorPreferences: ['climate'] });
    await investor('Both Angel', { leadsRounds: 'Both' });
    await investor('Follower', { leadsRounds: 'Follows' });
    expect((await listInvestors(viewer.id, iq({ leads: 'Leads' }))).results.map((r) => r.name).sort()).toEqual(['Both Angel', 'Lead VC']);
    expect((await listInvestors(viewer.id, iq({ stage: 'Series A' }))).results.map((r) => r.name)).toEqual(['Lead VC']);
    expect((await listInvestors(viewer.id, iq({ investorType: 'VC fund' }))).results.map((r) => r.name)).toEqual(['Lead VC']);
    expect((await listInvestors(viewer.id, iq({ sector: 'Climate' }))).results.map((r) => r.name)).toEqual(['Lead VC']);
  });
});

describe('Capital: founders raising (R3 F9)', () => {
  it('lists raising founders, hiding those who hide their funding status from non-connections', async () => {
    const viewer = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    await createMember({ name: 'Raising Now', profile: { companyStage: 'Seed', fundingStatus: 'Raising now', raiseAmount: 1500 } });
    await createMember({ name: 'Raising Soon', profile: { companyStage: 'Series A', fundingStatus: 'Raising in 6 months' } });
    await createMember({ name: 'Not Raising', profile: { fundingStatus: 'Not raising' } });
    const secret = await createMember({ name: 'Secret', profile: { fundingStatus: 'Raising now', hiddenFields: ['fundingStatus'] } });

    const res = await listRaisingFounders(viewer.id, fq());
    expect(res.results.map((r) => r.name)).toEqual(['Raising Now', 'Raising Soon']);
    expect(res.results[0]!.founder.raiseAmount).toBe(1500);
    expect((await listRaisingFounders(viewer.id, fq({ stage: 'Series A' }))).results.map((r) => r.name)).toEqual(['Raising Soon']);
    expect((await listRaisingFounders(viewer.id, fq({ raiseMin: '1000' }))).results.map((r) => r.name)).toEqual(['Raising Now']);

    await prisma.connection.create({ data: { ...pair(viewer.id, secret.id) } });
    expect((await listRaisingFounders(viewer.id, fq())).results.map((r) => r.name)).toContain('Secret');
  });
});

describe('stage fit in recommendations (R3 F10)', () => {
  it('ranks an investor at the founder\'s stage above one at another stage', async () => {
    const founder = await createMember({ profile: { companyStage: 'Seed' } });
    const fit = await investor('Seed Investor', { investmentStages: ['Seed'] });
    await investor('Growth Investor', { investmentStages: ['Growth'] });
    const { recommendations } = await getRecommendations(founder.id);
    expect(recommendations[0]!.member.id).toBe(fit.id);
    expect(recommendations[0]!.reasons.map((r) => r.description)).toContain('Investing at your stage');
  });
});

describe('investing check-ins (R3 F9)', () => {
  it('asks investors every 90 days, once, and respects the email preference', async () => {
    const due = await investor('Due', { investingConfirmedAt: daysAgo(91) });
    await investor('Recent');
    const never = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    const optedOut = await investor('Opted Out', { investingConfirmedAt: daysAgo(91) });
    await prisma.notificationPreference.update({ where: { userId: optedOut.id }, data: { investingCheckins: false } });
    await createMember({ profile: { primaryRole: 'FOUNDER' } });

    expect(await sendInvestingCheckins()).toBe(3); // due, never answered, opted out (marked, but no email)
    expect(await prisma.emailOutbox.count({ where: { kind: 'investing_checkin' } })).toBe(2);
    expect(await sendInvestingCheckins()).toBe(0);

    const p = await prisma.profile.findUniqueOrThrow({ where: { userId: due.id } });
    expect(needsInvestingCheck(p)).toBe(true);
    await setInvestingStatus(due.id, false);
    const after = await prisma.profile.findUniqueOrThrow({ where: { userId: due.id } });
    expect(after.currentlyInvesting).toBe(false);
    expect(needsInvestingCheck(after)).toBe(false);
    expect(needsInvestingCheck(await prisma.profile.findUniqueOrThrow({ where: { userId: never.id } }))).toBe(true);
  });

  it('only investors can set the status', async () => {
    const f = await createMember();
    await expect(setInvestingStatus(f.id, true)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
