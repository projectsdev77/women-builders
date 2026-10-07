import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { publicGatherings, publicNumbers } from '@/lib/services/public-site';
import { createGathering, gatheringInputSchema } from '@/lib/services/admin/gatherings';
import { getGathering, requestSeat } from '@/lib/services/gatherings';
import { deleteAccount } from '@/lib/services/data-rights';
import { utcToZonedInput } from '@/lib/time';
import { resetDb } from './helpers';
import { createMember, TEST_PASSWORD } from './factories';

beforeEach(resetDb);
const DAY = 86_400_000;
const local = (ms: number) => utcToZonedInput(new Date(Date.now() + ms), 'Europe/London');
const input = (o: Record<string, unknown> = {}) =>
  gatheringInputSchema.parse({
    title: 'Operators breakfast', type: 'WORKING_SESSION', description: 'Scaling teams across countries.',
    startsAtLocal: local(20 * DAY), timeZone: 'Europe/London', durationMinutes: 90, online: false, city: 'London', country: 'GB',
    venue: 'Secret address', audience: 'ALL', seatMode: 'OPEN', requestsCloseAtLocal: local(19 * DAY), capacity: 1, ...o,
  });

describe('public website (R3 F1)', () => {
  it('shows a number only once it passes its threshold', async () => {
    for (let i = 0; i < 4; i++) await createMember({ profile: { country: ['NG', 'GB', 'US', 'DE'][i] } });
    expect(await publicNumbers()).toEqual([]);
    await createMember({ profile: { country: 'KE' } });
    expect((await publicNumbers()).map((n) => n.key)).toEqual(['countries']);
  });

  it('teases only gatherings marked public, without venue or date', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    await createGathering(admin.id, input());
    await createGathering(admin.id, input({ title: 'Public breakfast', showOnPublicSite: true }));
    const list = await publicGatherings();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: 'Public breakfast', place: 'London, United Kingdom', type: 'Working session' });
    expect(JSON.stringify(list)).not.toContain('Secret address');
  });
});

describe('deletion and gatherings (R3 F19)', () => {
  it('frees a seat within 7 days, promotes the waitlist and tells admins', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const [a, b] = await Promise.all([createMember(), createMember()]);
    const { id } = await createGathering(admin.id, input({ startsAtLocal: local(3 * DAY), requestsCloseAtLocal: local(2 * DAY) }));
    await requestSeat(a.id, id, null);
    await requestSeat(b.id, id, null);
    await deleteAccount(a.id, TEST_PASSWORD);
    expect((await getGathering(b.id, id)).mySeat?.status).toBe('CONFIRMED');
    expect(await prisma.emailOutbox.count({ where: { kind: 'seat_freed', to: admin.email } })).toBe(1);
  });
});
