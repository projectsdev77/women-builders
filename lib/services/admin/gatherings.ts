import type { Prisma, RoleType } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { Errors } from '@/lib/errors';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { isCountryCode } from '@/lib/countries';
import { isValidTimeZone, utcToZonedInput, zonedTimeToUtc } from '@/lib/time';
import { audit } from '../audit';
import { lock } from '../locks';
import { notify } from '../notifications';
import { endsAt, promoteFromWaitlist, summary } from '../gatherings';
import { photoUrl } from '../photo-url';

/** Gatherings admin (R3 F23). */

const DEFAULT_SEATS = { DINNER: 12, WORKING_SESSION: 20, OTHER: 12 } as const;
const ROLE = z.enum(['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER']);
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Choose a date and time');

export const gatheringInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Give it a title').max(120),
    type: z.enum(['DINNER', 'WORKING_SESSION', 'OTHER']),
    description: z.string().trim().min(10, 'Describe the topic or format').max(3000),
    startsAtLocal: localDateTime,
    timeZone: z.string().trim().refine(isValidTimeZone, 'Choose a valid time zone'),
    durationMinutes: z.coerce.number().int().min(15).max(24 * 60),
    online: z.boolean(),
    city: z.string().trim().max(100).optional().transform((v) => v || null),
    country: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toUpperCase() : null))
      .refine((v) => v === null || isCountryCode(v), 'Choose a country'),
    venue: z.string().trim().max(1000).optional().transform((v) => v || null),
    capacity: z.coerce.number().int().min(1).max(500).optional(),
    audience: z.enum(['ALL', 'ROLES', 'INVITE_ONLY']),
    audienceRoles: z.array(ROLE).default([]),
    seatMode: z.enum(['CURATED', 'OPEN']),
    requestsCloseAtLocal: localDateTime,
    teamHosted: z.boolean().default(true),
    hostIds: z.array(z.string()).max(10).default([]),
    inviteIds: z.array(z.string()).max(500).default([]),
    showOnPublicSite: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (!v.online && (!v.city || !v.country)) ctx.addIssue({ code: 'custom', path: ['city'], message: 'In-person gatherings need a city and country' });
    if (v.audience === 'ROLES' && !v.audienceRoles.length) ctx.addIssue({ code: 'custom', path: ['audienceRoles'], message: 'Choose at least one role' });
    if (!v.teamHosted && !v.hostIds.length) ctx.addIssue({ code: 'custom', path: ['hostIds'], message: 'Add a host, or host it as the team' });
  });
export type GatheringInput = z.output<typeof gatheringInputSchema>;

function toData(v: GatheringInput) {
  const startsAt = zonedTimeToUtc(v.startsAtLocal, v.timeZone);
  const requestsCloseAt = zonedTimeToUtc(v.requestsCloseAtLocal, v.timeZone);
  if (requestsCloseAt > startsAt) throw Errors.validation('Requests must close before the gathering starts.', { fieldErrors: { requestsCloseAtLocal: ['Close requests before it starts'] } });
  return {
    title: v.title,
    type: v.type,
    description: v.description,
    startsAt,
    timeZone: v.timeZone,
    durationMinutes: v.durationMinutes,
    online: v.online,
    city: v.city,
    country: v.country,
    venue: v.venue,
    capacity: v.capacity ?? DEFAULT_SEATS[v.type],
    audience: v.audience,
    audienceRoles: v.audience === 'ROLES' ? (v.audienceRoles as RoleType[]) : [],
    seatMode: v.seatMode,
    requestsCloseAt,
    teamHosted: v.teamHosted,
    showOnPublicSite: v.showOnPublicSite,
  };
}

async function activeMemberIds(db: Tx, ids: string[]) {
  if (!ids.length) return [];
  const rows = await db.user.findMany({ where: { id: { in: ids }, accountStatus: 'ACTIVE', profile: { isNot: null } }, select: { id: true } });
  return rows.map((r) => r.id);
}

/** "New gathering near you": same country (or online), audience matches, opted in (R3 F14). */
async function announce(tx: Tx, gatheringId: string) {
  const g = await tx.gathering.findUniqueOrThrow({ where: { id: gatheringId }, include: { invites: true, hosts: true } });
  if (g.nearbyNotifiedAt || g.status !== 'SCHEDULED') return 0;
  await tx.gathering.update({ where: { id: gatheringId }, data: { nearbyNotifiedAt: new Date() } });
  const hostIds = new Set(g.hosts.map((h) => h.userId));
  if (g.audience === 'INVITE_ONLY') {
    const invited = await tx.user.findMany({
      where: { id: { in: g.invites.map((i) => i.userId).filter((id) => !hostIds.has(id)) }, accountStatus: 'ACTIVE' },
      select: { email: true },
    });
    for (const u of invited) await enqueueEmail(tx, { to: u.email, kind: 'gathering_invite', content: templates.gatheringInvite(summary(g)) });
    return invited.length;
  }
  const where: Prisma.ProfileWhereInput = {
    user: { accountStatus: 'ACTIVE' },
    userId: { notIn: [...hostIds] },
    ...(g.online ? {} : { country: g.country }),
    ...(g.audience === 'ROLES' ? { OR: [{ primaryRole: { in: g.audienceRoles } }, { secondaryRoles: { hasSome: g.audienceRoles } }] } : {}),
  };
  const members = await tx.profile.findMany({ where, select: { userId: true }, take: 5000 });
  for (const m of members) await notify(tx, m.userId, 'gathering_nearby', (u) => templates.gatheringNearby(summary(g), u));
  return members.length;
}

export async function createGathering(adminId: string, input: GatheringInput) {
  return prisma.$transaction(async (tx) => {
    const data = toData(input);
    if (data.startsAt <= new Date()) throw Errors.validation('Choose a time in the future.', { fieldErrors: { startsAtLocal: ['Choose a time in the future'] } });
    const [hosts, invites] = await Promise.all([activeMemberIds(tx, input.hostIds), activeMemberIds(tx, input.inviteIds)]);
    const g = await tx.gathering.create({
      data: {
        ...data,
        createdById: adminId,
        hosts: { create: hosts.map((userId) => ({ userId })) },
        invites: { create: input.audience === 'INVITE_ONLY' ? invites.map((userId) => ({ userId })) : [] },
      },
    });
    await announce(tx, g.id);
    await audit(tx, { actorId: adminId, action: 'gathering.create', targetType: 'gathering', targetId: g.id });
    return { id: g.id };
  });
}

/** Editing the date, time or place notifies confirmed attendees (R3 F23). */
export async function updateGathering(adminId: string, id: string, input: GatheringInput) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, `gathering:${id}`);
    const before = await tx.gathering.findUnique({ where: { id }, include: { invites: true } });
    if (!before) throw Errors.notFound('Gathering');
    if (before.status === 'CANCELLED') throw Errors.conflict('This gathering was cancelled.');
    const data = toData(input);
    const [hosts, invites] = await Promise.all([activeMemberIds(tx, input.hostIds), activeMemberIds(tx, input.inviteIds)]);
    await tx.gatheringHost.deleteMany({ where: { gatheringId: id } });
    const newInvites = invites.filter((uid) => !before.invites.some((i) => i.userId === uid));
    if (input.audience === 'INVITE_ONLY') {
      await tx.gatheringInvite.deleteMany({ where: { gatheringId: id, userId: { notIn: invites } } });
    }
    const g = await tx.gathering.update({
      where: { id },
      data: {
        ...data,
        hosts: { create: hosts.map((userId) => ({ userId })) },
        invites: { create: input.audience === 'INVITE_ONLY' ? newInvites.map((userId) => ({ userId })) : [] },
      },
    });
    const changed =
      before.startsAt.getTime() !== g.startsAt.getTime() ||
      before.durationMinutes !== g.durationMinutes ||
      before.timeZone !== g.timeZone ||
      before.online !== g.online ||
      before.city !== g.city ||
      before.country !== g.country ||
      before.venue !== g.venue;
    if (changed) {
      const confirmed = await tx.seatRequest.findMany({ where: { gatheringId: id, status: 'CONFIRMED' }, include: { user: { select: { email: true } } } });
      for (const s of confirmed) await enqueueEmail(tx, { to: s.user.email, kind: 'gathering_changed', content: templates.gatheringChanged(summary(g), g.venue) });
      // Reminders follow the new time.
      if (before.startsAt.getTime() !== g.startsAt.getTime()) {
        await tx.gathering.update({ where: { id }, data: { reminder2dSentAt: null, reminderDaySentAt: null } });
      }
    }
    // Invitees added later get their invitation too.
    if (input.audience === 'INVITE_ONLY' && before.nearbyNotifiedAt && newInvites.length) {
      const users = await tx.user.findMany({ where: { id: { in: newInvites } }, select: { email: true } });
      for (const u of users) await enqueueEmail(tx, { to: u.email, kind: 'gathering_invite', content: templates.gatheringInvite(summary(g)) });
    }
    // Open mode with more seats: move people up from the waitlist.
    if (g.seatMode === 'OPEN') while (await promoteFromWaitlist(tx, id));
    await audit(tx, { actorId: adminId, action: 'gathering.update', targetType: 'gathering', targetId: id, details: { notifiedAttendees: changed } });
    return { id };
  });
}

export async function cancelGathering(adminId: string, id: string, reason: string) {
  if (!reason.trim()) throw Errors.validation('Tell people why.', { fieldErrors: { reason: ['Tell people why'] } });
  await prisma.$transaction(async (tx) => {
    const g = await tx.gathering.findUnique({ where: { id } });
    if (!g || g.status === 'CANCELLED') throw Errors.notFound('Gathering');
    await tx.gathering.update({ where: { id }, data: { status: 'CANCELLED', cancelReason: reason.trim() } });
    const seats = await tx.seatRequest.findMany({
      where: { gatheringId: id, status: { in: ['REQUESTED', 'CONFIRMED', 'WAITLISTED'] } },
      include: { user: { select: { email: true } } },
    });
    for (const s of seats) await enqueueEmail(tx, { to: s.user.email, kind: 'gathering_cancelled', content: templates.gatheringCancelled(summary(g), reason.trim()) });
    await audit(tx, { actorId: adminId, action: 'gathering.cancel', targetType: 'gathering', targetId: id, details: { reason } });
  });
}

// ---------------------------------------------------------------- lists and the request queue

export async function listAdminGatherings(view: 'upcoming' | 'past') {
  const now = new Date();
  const rows = await prisma.gathering.findMany({
    where: view === 'upcoming' ? { startsAt: { gt: new Date(now.getTime() - 2 * 86_400_000) } } : { startsAt: { lt: now } },
    include: { seats: { select: { status: true } } },
    orderBy: { startsAt: view === 'upcoming' ? 'asc' : 'desc' },
    take: 200,
  });
  return rows
    .filter((g) => (view === 'upcoming' ? endsAt(g) > now : endsAt(g) <= now))
    .map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      startsAt: g.startsAt.toISOString(),
      timeZone: g.timeZone,
      location: summary(g).where,
      status: g.status,
      seatMode: g.seatMode,
      capacity: g.capacity,
      confirmed: g.seats.filter((s) => s.status === 'CONFIRMED').length,
      pending: g.seats.filter((s) => s.status === 'REQUESTED').length,
      waitlisted: g.seats.filter((s) => s.status === 'WAITLISTED').length,
    }));
}

/** The edit form's current values. */
export async function getGatheringForEdit(id: string) {
  const g = await prisma.gathering.findUnique({
    where: { id },
    include: {
      hosts: { include: { user: { select: { id: true, name: true } } } },
      invites: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!g) throw Errors.notFound('Gathering');
  return {
    id: g.id,
    status: g.status,
    cancelReason: g.cancelReason,
    startsAt: g.startsAt.toISOString(),
    endsAt: endsAt(g).toISOString(),
    values: {
      title: g.title,
      type: g.type,
      description: g.description,
      startsAtLocal: utcToZonedInput(g.startsAt, g.timeZone),
      timeZone: g.timeZone,
      durationMinutes: g.durationMinutes,
      online: g.online,
      city: g.city ?? '',
      country: g.country ?? '',
      venue: g.venue ?? '',
      capacity: g.capacity,
      audience: g.audience,
      audienceRoles: g.audienceRoles,
      seatMode: g.seatMode,
      requestsCloseAtLocal: utcToZonedInput(g.requestsCloseAt, g.timeZone),
      teamHosted: g.teamHosted,
      hosts: g.hosts.map((h) => h.user),
      invites: g.invites.map((i) => i.user),
      showOnPublicSite: g.showOnPublicSite,
    },
  };
}
export type GatheringEditValues = Awaited<ReturnType<typeof getGatheringForEdit>>['values'];

export const NO_SHOW_FLAG_AT = 2;

/** Requests with role, city and note; the live role mix; blocked-pair conflicts; no-show history. */
export async function gatheringQueue(id: string) {
  const g = await prisma.gathering.findUnique({ where: { id } });
  if (!g) throw Errors.notFound('Gathering');
  const seats = await prisma.seatRequest.findMany({
    where: { gatheringId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          accountStatus: true,
          profile: { select: { headline: true, primaryRole: true, city: true, country: true, photoKey: true, photoVersion: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  const live = seats.filter((s) => s.status !== 'CANCELLED' && s.status !== 'DECLINED').map((s) => s.userId);
  const [blocks, noShows] = await Promise.all([
    prisma.block.findMany({ where: { blockerId: { in: live }, blockedId: { in: live } }, select: { blockerId: true, blockedId: true } }),
    prisma.seatRequest.groupBy({ by: ['userId'], where: { userId: { in: seats.map((s) => s.userId) }, attendance: 'NO_SHOW' }, _count: { _all: true } }),
  ]);
  const names = new Map(seats.map((s) => [s.userId, s.user.name]));
  const conflicts = new Map<string, string[]>();
  for (const b of blocks) {
    for (const [x, y] of [[b.blockerId, b.blockedId], [b.blockedId, b.blockerId]] as const) {
      conflicts.set(x, [...new Set([...(conflicts.get(x) ?? []), names.get(y)!])]);
    }
  }
  const noShowBy = new Map(noShows.map((n) => [n.userId, n._count._all]));
  const mix: Record<RoleType, number> = { FOUNDER: 0, OPERATOR: 0, INVESTOR: 0, BUILDER: 0 };
  for (const s of seats) if (s.status === 'CONFIRMED' && s.user.profile) mix[s.user.profile.primaryRole]++;
  return {
    capacity: g.capacity,
    seatMode: g.seatMode,
    started: g.startsAt <= new Date(),
    mix,
    seats: seats.map((s) => ({
      id: s.id,
      status: s.status,
      note: s.note,
      lateCancel: s.lateCancel,
      attendance: s.attendance,
      createdAt: s.createdAt.toISOString(),
      member: {
        id: s.user.id,
        name: s.user.name,
        active: s.user.accountStatus === 'ACTIVE',
        headline: s.user.profile?.headline ?? null,
        primaryRole: s.user.profile?.primaryRole ?? null,
        city: s.user.profile?.city ?? null,
        country: s.user.profile?.country ?? null,
        photoUrl: s.user.profile ? photoUrl(s.user.id, s.user.profile) : null,
      },
      conflictsWith: conflicts.get(s.userId) ?? [],
      noShows: noShowBy.get(s.userId) ?? 0,
    })),
  };
}

export type SeatDecision = 'CONFIRMED' | 'WAITLISTED' | 'DECLINED';

export async function decideSeats(adminId: string, seatIds: string[], decision: SeatDecision) {
  if (!seatIds.length) return { updated: 0 };
  return prisma.$transaction(async (tx) => {
    const seats = await tx.seatRequest.findMany({ where: { id: { in: seatIds } }, include: { gathering: true, user: { select: { email: true } } } });
    const gatheringIds = [...new Set(seats.map((s) => s.gatheringId))];
    if (gatheringIds.length !== 1) throw Errors.notFound('Seat');
    const g = seats[0]!.gathering;
    await lock(tx, `gathering:${g.id}`);
    if (g.status !== 'SCHEDULED') throw Errors.conflict('This gathering was cancelled.');
    let confirmed = await tx.seatRequest.count({ where: { gatheringId: g.id, status: 'CONFIRMED' } });
    let updated = 0;
    for (const s of seats) {
      if (!['REQUESTED', 'WAITLISTED', 'CONFIRMED'].includes(s.status) || s.status === decision) continue;
      if (decision === 'CONFIRMED') {
        if (confirmed >= g.capacity) throw Errors.conflict(`All ${g.capacity} seats are taken. Add seats or waitlist people instead.`);
        confirmed++;
      }
      if (s.status === 'CONFIRMED') confirmed--;
      await tx.seatRequest.update({ where: { id: s.id }, data: { status: decision, decidedAt: new Date() } });
      const content =
        decision === 'CONFIRMED' ? templates.seatConfirmed(summary(g), g.venue) : decision === 'WAITLISTED' ? templates.seatWaitlisted(summary(g)) : templates.seatDeclined(summary(g));
      await enqueueEmail(tx, { to: s.user.email, kind: `seat_${decision.toLowerCase()}`, content });
      updated++;
    }
    await audit(tx, { actorId: adminId, action: `gathering.seat_${decision.toLowerCase()}`, targetType: 'gathering', targetId: g.id, details: { seats: seatIds.length } });
    return { updated };
  });
}

export async function markAttendance(adminId: string, gatheringId: string, entries: Array<{ seatId: string; attendance: 'ATTENDED' | 'NO_SHOW' | null }>) {
  await prisma.$transaction(async (tx) => {
    const g = await tx.gathering.findUnique({ where: { id: gatheringId } });
    if (!g) throw Errors.notFound('Gathering');
    if (g.startsAt > new Date()) throw Errors.conflict('You can mark attendance once the gathering has started.');
    for (const e of entries) {
      await tx.seatRequest.updateMany({ where: { id: e.seatId, gatheringId, status: 'CONFIRMED' }, data: { attendance: e.attendance } });
    }
    await audit(tx, { actorId: adminId, action: 'gathering.attendance', targetType: 'gathering', targetId: gatheringId, details: { entries: entries.length } });
  });
}

export async function messageAttendees(adminId: string, gatheringId: string, subject: string, body: string) {
  return prisma.$transaction(async (tx) => {
    const g = await tx.gathering.findUnique({ where: { id: gatheringId } });
    if (!g) throw Errors.notFound('Gathering');
    const seats = await tx.seatRequest.findMany({ where: { gatheringId, status: 'CONFIRMED' }, include: { user: { select: { email: true } } } });
    for (const s of seats) await enqueueEmail(tx, { to: s.user.email, kind: 'gathering_message', content: templates.gatheringMessage(summary(g), subject, body) });
    await audit(tx, { actorId: adminId, action: 'gathering.message', targetType: 'gathering', targetId: gatheringId, details: { subject, recipients: seats.length } });
    return { sent: seats.length };
  });
}

/** Members to pick as hosts or invitees. */
export async function searchMembersForPicker(q: string) {
  if (q.trim().length < 2) return [];
  const rows = await prisma.user.findMany({
    where: { accountStatus: 'ACTIVE', profile: { isNot: null }, name: { contains: q.trim(), mode: 'insensitive' } },
    select: { id: true, name: true, profile: { select: { headline: true } } },
    take: 10,
    orderBy: { name: 'asc' },
  });
  return rows.map((r) => ({ id: r.id, name: r.name, headline: r.profile?.headline ?? null }));
}
