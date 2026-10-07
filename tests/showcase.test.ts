import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import {
  decideQuote,
  isShowcased,
  listQuotes,
  publicQuotes,
  publicShowcase,
  setShowcase,
  setShowcaseOptIn,
  submitQuote,
} from '@/lib/services/showcase';
import { logWin, winSchema } from '@/lib/services/wins';
import { deleteAccount } from '@/lib/services/data-rights';
import { resetDb } from './helpers';
import { createMember, TEST_PASSWORD } from './factories';

beforeEach(resetDb);

describe('public showcase (R3 F16)', () => {
  it('features only opted-in members the team picked, and drops them the moment they opt out', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const ada = await createMember({ name: 'Ada', profile: { city: 'Lagos', country: 'NG', headline: 'Founder, Paystride' } });
    const bea = await createMember({ name: 'Bea' });
    await expect(setShowcase(admin.id, [ada.id])).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await setShowcaseOptIn(ada.id, true);
    await setShowcase(admin.id, [ada.id]);
    expect(await publicShowcase()).toEqual([
      { name: 'Ada', headline: 'Founder, Paystride', role: 'Founder', city: 'Lagos, Nigeria', photoUrl: null },
    ]);
    expect(await isShowcased(ada.id)).toBe(true);
    expect(await isShowcased(bea.id)).toBe(false);
    await setShowcaseOptIn(ada.id, false);
    expect(await publicShowcase()).toEqual([]);
    expect(await isShowcased(ada.id)).toBe(false);
  });

  it('respects a hidden location and never shows more than 6', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const members = await Promise.all(Array.from({ length: 7 }, (_, i) => createMember({ name: `M${i}`, profile: { city: 'Paris', country: 'FR', hiddenFields: ['location'] } })));
    for (const m of members) await setShowcaseOptIn(m.id, true);
    await expect(setShowcase(admin.id, members.map((m) => m.id))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await setShowcase(admin.id, members.slice(0, 6).map((m) => m.id));
    const shown = await publicShowcase();
    expect(shown).toHaveLength(6);
    expect(shown[0]!.city).toBeNull();
  });
});

describe('quotes (R3 F16)', () => {
  it('appear only after approval; a new quote replaces the old one; wins can supply quotes', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const ada = await createMember({ name: 'Ada' });
    await submitQuote(ada.id, 'The warmest network I have joined.');
    await submitQuote(ada.id, 'I met my lead investor at a dinner here.');
    const pending = await listQuotes('PENDING');
    expect(pending.map((q) => q.text)).toEqual(['I met my lead investor at a dinner here.']);
    expect(await publicQuotes()).toEqual([]);
    await decideQuote(admin.id, pending[0]!.id, true);
    expect((await publicQuotes()).map((q) => q.name)).toEqual(['Ada']);

    await logWin(ada.id, winSchema.parse({ type: 'HIRE', month: new Date().toISOString().slice(0, 7), story: 'Hired our first engineer through a member.', visibility: 'QUOTABLE' }));
    expect((await listQuotes('PENDING'))[0]).toMatchObject({ fromWin: true });
  });

  it('account deletion removes quotes and the showcase', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const ada = await createMember();
    await setShowcaseOptIn(ada.id, true);
    await setShowcase(admin.id, [ada.id]);
    const q = await submitQuote(ada.id, 'Everyone here answers your email.');
    await decideQuote(admin.id, q.id, true);
    await deleteAccount(ada.id, TEST_PASSWORD);
    expect(await publicQuotes()).toEqual([]);
    expect(await publicShowcase()).toEqual([]);
    expect(await prisma.testimonial.count()).toBe(0);
  });
});
