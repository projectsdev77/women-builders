import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { utcToZonedInput, zonedTimeToUtc } from '@/lib/time';
import {
  cancelGathering,
  createGathering,
  decideSeats,
  gatheringInputSchema,
  gatheringQueue,
  markAttendance,
  updateGathering,
} from '@/lib/services/admin/gatherings';
import {
  cancelSeat,
  gatheringCalendar,
  getGathering,
  listGatherings,
  gatheringListSchema,
  peopleYouMet,
  requestSeat,
  sendGatheringReminders,
  whosComing,
} from '@/lib/services/gatherings';
import { sendConnectionRequest } from '@/lib/services/connections';
import { getRecommendations } from '@/lib/services/discovery';
import { resetDb } from './helpers';
import { COMPLETE_FOUNDER, createMember as baseCreate, type MemberOverrides } from './factories';

beforeEach(resetDb);
const DAY = 86_400_000;
const TZ = 'Africa/Lagos';
const createMember = (o: MemberOverrides = {}) =>
  baseCreate({ ...o, profile: o.profile === null ? null : { ...COMPLETE_FOUNDER, country: 'NG', ...o.profile } });
const local = (msFromNow: number) => utcToZonedInput(new Date(Date.now() + msFromNow), TZ);
const input = (o: Record<string, unknown> = {}) =>
  gatheringInputSchema.parse({
    title: 'Founders and investors dinner',
    type: 'DINNER',
    description: 'A small dinner about raising a seed round in West Africa.',
    startsAtLocal: local(10 * DAY),
    timeZone: TZ,
    durationMinutes: 150,
    online: false,
    city: 'Lagos',
    country: 'NG',
    venue: '12 Admiralty Way, Lekki',
    audience: 'ALL',
    seatMode: 'CURATED',
    requestsCloseAtLocal: local(8 * DAY),
    capacity: 2,
    ...o,
  });
const q = (o: Record<string, unknown> = {}) => gatheringListSchema.parse(o);

async function pastGathering(adminId: string, members: string[]) {
  const { id } = await createGathering(adminId, input({ seatMode: 'OPEN', capacity: 10 }));
  for (const m of members) await requestSeat(m, id, null);
  // Move it into the past: it ended yesterday.
  await prisma.gathering.update({ where: { id }, data: { startsAt: new Date(Date.now() - 2 * DAY), requestsCloseAt: new Date(Date.now() - 3 * DAY) } });
  return id;
}

describe('time zones', () => {
  it('converts local gathering time to UTC and back', () => {
    expect(zonedTimeToUtc('2026-11-12T19:00', 'Africa/Lagos').toISOString()).toBe('2026-11-12T18:00:00.000Z');
    expect(zonedTimeToUtc('2026-07-01T09:00', 'America/Los_Angeles').toISOString()).toBe('2026-07-01T16:00:00.000Z');
    expect(utcToZonedInput(new Date('2026-07-01T16:00:00Z'), 'America/Los_Angeles')).toBe('2026-07-01T09:00');
  });
});

describe('gatherings (R3 F14, F23)', () => {
  it('announces to members in the same country who opted in, and respects audiences', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const lagos = await createMember();
    const optedOut = await createMember();
    await prisma.notificationPreference.update({ where: { userId: optedOut.id }, data: { gatheringsNearMe: false } });
    const london = await createMember({ profile: { country: 'GB' } });
    const { id } = await createGathering(admin.id, input());
    expect(await prisma.emailOutbox.count({ where: { kind: 'gathering_nearby' } })).toBe(1);
    expect((await prisma.emailOutbox.findFirstOrThrow({ where: { kind: 'gathering_nearby' } })).to).toBe(lagos.email);
    // Everyone eligible can still see it; her own country sorts first.
    expect((await listGatherings(london.id, q())).map((g) => g.id)).toEqual([id]);

    const investor = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    const roles = await createGathering(admin.id, input({ audience: 'ROLES', audienceRoles: ['INVESTOR'] }));
    expect((await listGatherings(investor.id, q())).map((g) => g.id)).toContain(roles.id);
    expect((await listGatherings(lagos.id, q())).map((g) => g.id)).not.toContain(roles.id);

    const invited = await createGathering(admin.id, input({ audience: 'INVITE_ONLY', inviteIds: [lagos.id] }));
    expect(await prisma.emailOutbox.count({ where: { kind: 'gathering_invite', to: lagos.email } })).toBe(1);
    expect((await listGatherings(lagos.id, q())).map((g) => g.id)).toContain(invited.id);
    await expect(getGathering(london.id, invited.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('curated: request, confirm within capacity, decline kindly; venue only for confirmed guests', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const [a, b, c] = await Promise.all([createMember(), createMember(), createMember()]);
    const { id } = await createGathering(admin.id, input({ capacity: 2 }));
    for (const m of [a, b, c]) expect((await requestSeat(m.id, id, 'I bring ops experience')).status).toBe('REQUESTED');
    await expect(requestSeat(a.id, id, null)).rejects.toMatchObject({ code: 'CONFLICT' });
    expect((await getGathering(a.id, id)).venue).toBeNull();
    await expect(whosComing(a.id, id)).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const queue = await gatheringQueue(id);
    const seatOf = (uid: string) => queue.seats.find((s) => s.member.id === uid)!.id;
    await decideSeats(admin.id, [seatOf(a.id), seatOf(b.id)], 'CONFIRMED');
    await expect(decideSeats(admin.id, [seatOf(c.id)], 'CONFIRMED')).rejects.toMatchObject({ code: 'CONFLICT' });
    await decideSeats(admin.id, [seatOf(c.id)], 'DECLINED');
    expect(await prisma.emailOutbox.count({ where: { kind: 'seat_confirmed' } })).toBe(2);
    expect(await prisma.emailOutbox.count({ where: { kind: 'seat_declined', to: c.email } })).toBe(1);

    const detail = await getGathering(a.id, id);
    expect(detail.venue).toBe('12 Admiralty Way, Lekki');
    expect((await whosComing(a.id, id)).attendees.map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    expect((await gatheringQueue(id)).mix.FOUNDER).toBe(2);

    const ics = await gatheringCalendar(a.id, id);
    expect(ics.body).toContain('BEGIN:VEVENT');
    expect(ics.body).toContain('LOCATION:12 Admiralty Way\\, Lekki');
    await expect(gatheringCalendar(c.id, id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('open: first come first served, waitlist promotion, late cancellation', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const [a, b, c] = await Promise.all([createMember(), createMember(), createMember()]);
    const { id } = await createGathering(admin.id, input({ seatMode: 'OPEN', capacity: 2 }));
    expect((await requestSeat(a.id, id, null)).status).toBe('CONFIRMED');
    expect((await requestSeat(b.id, id, null)).status).toBe('CONFIRMED');
    expect((await requestSeat(c.id, id, null)).status).toBe('WAITLISTED');
    expect((await cancelSeat(a.id, id)).lateCancel).toBe(false);
    expect((await getGathering(c.id, id)).mySeat?.status).toBe('CONFIRMED');

    await prisma.gathering.update({ where: { id }, data: { startsAt: new Date(Date.now() + 3 * 3_600_000) } });
    expect((await cancelSeat(b.id, id)).lateCancel).toBe(true);
  });

  it('flags blocked pairs and never shows them to each other', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const [a, b] = await Promise.all([createMember({ name: 'Ada' }), createMember({ name: 'Bea' })]);
    await prisma.block.create({ data: { blockerId: a.id, blockedId: b.id } });
    const { id } = await createGathering(admin.id, input({ seatMode: 'OPEN', capacity: 5 }));
    await requestSeat(a.id, id, null);
    await requestSeat(b.id, id, null);
    expect((await gatheringQueue(id)).seats.find((s) => s.member.id === a.id)!.conflictsWith).toEqual(['Bea']);
    expect((await whosComing(a.id, id)).attendees.map((x) => x.id)).toEqual([a.id]);
  });

  it('emails confirmed guests when the time changes, and everyone when cancelled', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const a = await createMember();
    const b = await createMember();
    const { id } = await createGathering(admin.id, input({ seatMode: 'OPEN', capacity: 1 }));
    await requestSeat(a.id, id, null);
    await requestSeat(b.id, id, null); // waitlisted
    await updateGathering(admin.id, id, input({ seatMode: 'OPEN', capacity: 1, title: 'Renamed dinner' }));
    expect(await prisma.emailOutbox.count({ where: { kind: 'gathering_changed' } })).toBe(0);
    await updateGathering(admin.id, id, input({ seatMode: 'OPEN', capacity: 2, startsAtLocal: local(11 * DAY) }));
    expect(await prisma.emailOutbox.count({ where: { kind: 'gathering_changed', to: a.email } })).toBe(1);
    // More seats in open mode moves the waitlist up.
    expect((await getGathering(b.id, id)).mySeat?.status).toBe('CONFIRMED');
    await cancelGathering(admin.id, id, 'The venue closed.');
    expect(await prisma.emailOutbox.count({ where: { kind: 'gathering_cancelled' } })).toBe(2);
    await expect(requestSeat((await createMember()).id, id, null)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('sends the 2-day and morning-of reminders once each', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const a = await createMember();
    const { id } = await createGathering(admin.id, input({ seatMode: 'OPEN' }));
    await requestSeat(a.id, id, null);
    // 19:00 Lagos time on 2026-11-12.
    await prisma.gathering.update({ where: { id }, data: { startsAt: new Date('2026-11-12T18:00:00Z') } });
    expect(await sendGatheringReminders(new Date('2026-11-09T09:00:00Z'))).toBe(0); // 3 days before
    expect(await sendGatheringReminders(new Date('2026-11-10T09:00:00Z'))).toBe(1); // 2 days before
    expect(await sendGatheringReminders(new Date('2026-11-11T09:00:00Z'))).toBe(0);
    expect(await sendGatheringReminders(new Date('2026-11-12T05:00:00Z'))).toBe(0); // 6:00 local, too early
    expect(await sendGatheringReminders(new Date('2026-11-12T07:00:00Z'))).toBe(1); // 8:00 local
    expect(await sendGatheringReminders(new Date('2026-11-12T08:00:00Z'))).toBe(0);
  });

  it('"People you met" for 30 days, skipping no-shows, and lets them connect even if one prefers introductions', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const [a, b, gone] = await Promise.all([createMember(), createMember(), createMember()]);
    await prisma.user.update({ where: { id: b.id }, data: { preferIntroductions: true } });
    await expect(sendConnectionRequest(a.id, b.id)).rejects.toMatchObject({ code: 'PREFERS_INTRODUCTIONS' });
    const id = await pastGathering(admin.id, [a.id, b.id, gone.id]);
    const goneSeat = (await gatheringQueue(id)).seats.find((s) => s.member.id === gone.id)!;
    await markAttendance(admin.id, id, [{ seatId: goneSeat.id, attendance: 'NO_SHOW' }]);

    const met = await peopleYouMet(a.id);
    expect(met.map((p) => p.id)).toEqual([b.id]);
    expect(met[0]!.metAt.title).toBe('Founders and investors dinner');
    await expect(sendConnectionRequest(a.id, b.id, 'We met at Founders and investors dinner.')).resolves.toMatchObject({ status: 'sent' });

    await prisma.gathering.update({ where: { id }, data: { startsAt: new Date(Date.now() - 40 * DAY) } });
    expect(await peopleYouMet(a.id)).toHaveLength(0);
  });

  it('recommends people going to the same gathering, with the reason', async () => {
    const admin = await createMember({ isAdmin: true, profile: null });
    const [a, b] = await Promise.all([createMember(), createMember({ profile: { primaryRole: 'INVESTOR' } })]);
    const { id } = await createGathering(admin.id, input({ seatMode: 'OPEN', capacity: 5 }));
    await requestSeat(a.id, id, null);
    await requestSeat(b.id, id, null);
    const rec = (await getRecommendations(a.id)).recommendations.find((r) => r.member.id === b.id)!;
    expect(rec.reasons.map((r) => r.description)).toContain('Going to the same gathering: Founders and investors dinner');
  });
});
