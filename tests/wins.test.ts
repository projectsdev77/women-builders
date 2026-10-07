import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { logWin, memberWins, myWins, recentWins, respondToWin, sendWinPrompts, winSchema, winTotals, WINS_PER_MONTH } from '@/lib/services/wins';
import { deleteAccount } from '@/lib/services/data-rights';
import { publicNumbers } from '@/lib/services/public-site';
import { updateSiteSettings } from '@/lib/services/site-settings';
import { pair } from '@/lib/services/relationships';
import { resetDb } from './helpers';
import { createMember, TEST_PASSWORD } from './factories';

beforeEach(resetDb);
const DAY = 86_400_000;
const month = new Date().toISOString().slice(0, 7);
const win = (o: Record<string, unknown> = {}) => winSchema.parse({ type: 'HIRE', month, ...o });

describe('wins (R3 F15)', () => {
  it('asks named members to confirm; confirmation verifies; amounts never leave the author and the team totals', async () => {
    const a = await createMember({ name: 'Ada Founder' });
    const b = await createMember({ name: 'Bea Investor', profile: { primaryRole: 'INVESTOR', lastCheckMonth: '2025-01' } });
    const { id } = await logWin(a.id, win({ type: 'INVESTMENT', participantIds: [b.id], amountK: 250, story: 'Bea led our pre-seed.', visibility: 'MEMBERS' }));
    expect(await prisma.emailOutbox.count({ where: { kind: 'win_confirmation', to: b.email } })).toBe(1);

    const viewer = await createMember();
    // Before confirming, Bea isn't named publicly.
    expect((await memberWins(viewer.id, a.id))[0]!.with).toEqual([]);
    expect((await myWins(b.id)).toConfirm).toHaveLength(1);

    await respondToWin(b.id, id, true);
    const shown = (await memberWins(viewer.id, a.id))[0]!;
    expect(shown).toMatchObject({ verified: true, story: 'Bea led our pre-seed.' });
    expect(shown.with.map((w) => w.name)).toEqual(['Bea Investor']);
    expect(JSON.stringify(shown)).not.toContain('250');
    expect((await memberWins(viewer.id, b.id)).map((w) => w.id)).toEqual([id]);
    // A confirmed investment updates the investor's "last check written".
    expect((await prisma.profile.findUniqueOrThrow({ where: { userId: b.id } })).lastCheckMonth).toBe(month);

    const totals = await winTotals(new Date(Date.now() - DAY), new Date(Date.now() + DAY));
    expect(totals).toMatchObject({ total: 1, investmentTotalK: 250 });
    expect((await myWins(a.id)).logged[0]!.amountK).toBe(250);
  });

  it('keeps anonymous wins out of every list but counts them', async () => {
    const a = await createMember();
    const viewer = await createMember();
    await logWin(a.id, win());
    expect(await memberWins(viewer.id, a.id)).toEqual([]);
    expect(await recentWins(viewer.id)).toEqual([]);
    await updateSiteSettings((await createMember({ isAdmin: true, profile: null })).id, {
      publicNumbers: { thresholds: { members: 999, countries: 999, introductions: 999, gatherings: 999, wins: 1 }, hidden: [] },
    });
    expect((await publicNumbers()).map((n) => n.key)).toEqual(['wins']);
  });

  it('declining removes her silently; blocked members cannot be named or see each other', async () => {
    const [a, b, c] = await Promise.all([createMember(), createMember(), createMember()]);
    const { id } = await logWin(a.id, win({ participantIds: [b.id], visibility: 'MEMBERS' }));
    await respondToWin(b.id, id, false);
    expect((await memberWins(c.id, a.id))[0]!.with).toEqual([]);
    await expect(respondToWin(b.id, id, true)).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await prisma.block.create({ data: { blockerId: c.id, blockedId: a.id } });
    await expect(logWin(a.id, win({ participantIds: [c.id] }))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await recentWins(c.id)).toEqual([]);
  });

  it('validates amounts, future months and the monthly limit', async () => {
    expect(() => win({ type: 'HIRE', amountK: 10 })).toThrow();
    expect(() => win({ month: '2999-01' })).toThrow();
    const a = await createMember();
    await prisma.win.createMany({ data: Array.from({ length: WINS_PER_MONTH }, () => ({ authorId: a.id, type: 'OTHER' as const, month })) });
    await expect(logWin(a.id, win())).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('prompts once, 60 days after an accepted introduction', async () => {
    const [a, b, c] = await Promise.all([createMember(), createMember(), createMember({ name: 'Cleo Target' })]);
    await prisma.connection.create({ data: pair(a.id, c.id) });
    await prisma.introduction.create({
      data: { requesterId: a.id, introducerId: b.id, targetId: c.id, noteToIntroducer: 'x', status: 'ACCEPTED', introducerDueAt: new Date(), respondedAt: new Date(Date.now() - 61 * DAY) },
    });
    expect(await sendWinPrompts()).toBe(1);
    expect(await sendWinPrompts()).toBe(0);
    const mail = await prisma.emailOutbox.findFirstOrThrow({ where: { kind: 'win_prompt' } });
    expect(mail.to).toBe(a.email);
    expect(mail.subject).toBe('Did anything come of meeting Cleo?');
  });

  it('account deletion keeps the count but drops the story', async () => {
    const a = await createMember();
    const viewer = await createMember();
    await logWin(a.id, win({ story: 'A private story', visibility: 'MEMBERS' }));
    await deleteAccount(a.id, TEST_PASSWORD);
    expect(await prisma.win.count()).toBe(1);
    expect((await prisma.win.findFirstOrThrow()).story).toBeNull();
    expect(await recentWins(viewer.id)).toEqual([]);
  });
});
