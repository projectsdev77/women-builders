import type { Gathering, GatheringType, Prisma, RoleType } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { appUrl } from '@/lib/config';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates, type GatheringSummary } from '@/lib/email/templates';
import { formatLocation } from '@/lib/countries';
import { addDaysToYmd, formatInZone, localDate, localHour } from '@/lib/time';
import { lock } from './locks';
import { photoUrl } from './photo-url';
import { relationshipSets, statusFromSets } from './relationships';

/**
 * Gatherings (R3 F14): small dinners ("tables") and working sessions ("rooms").
 * The venue or link is shown only to confirmed attendees and hosts.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export const PEOPLE_YOU_MET_DAYS = 30;
export const LATE_CANCEL_HOURS = 24;
export const SEAT_NOTE_MAX = 300;
export const GATHERING_TYPE_LABELS: Record<GatheringType, string> = {
  DINNER: 'Dinner',
  WORKING_SESSION: 'Working session',
  OTHER: 'Gathering',
};

export const endsAt = (g: Pick<Gathering, 'startsAt' | 'durationMinutes'>) => new Date(g.startsAt.getTime() + g.durationMinutes * 60_000);

export function summary(g: Pick<Gathering, 'id' | 'title' | 'startsAt' | 'timeZone' | 'online' | 'city' | 'country'>): GatheringSummary {
  return {
    id: g.id,
    title: g.title,
    when: formatInZone(g.startsAt, g.timeZone),
    where: g.online ? 'Online' : formatLocation(g.city, g.country) || 'To be announced',
  };
}

type Member = { id: string; roles: RoleType[]; country: string | null };

async function loadMember(db: Tx, userId: string): Promise<Member> {
  const p = await db.profile.findUnique({ where: { userId }, select: { primaryRole: true, secondaryRoles: true, country: true } });
  if (!p) throw Errors.notFound('Profile');
  return { id: userId, roles: [p.primaryRole, ...p.secondaryRoles], country: p.country };
}

/** Who may see a gathering: its audience, invitees, hosts, and anyone who already asked for a seat. */
function visibleWhere(m: Member): Prisma.GatheringWhereInput {
  return {
    OR: [
      { audience: 'ALL' },
      { audience: 'ROLES', audienceRoles: { hasSome: m.roles } },
      { invites: { some: { userId: m.id } } },
      { hosts: { some: { userId: m.id } } },
      { seats: { some: { userId: m.id } } },
    ],
  };
}

const hostInclude = {
  hosts: { include: { user: { select: { id: true, name: true, accountStatus: true, profile: { select: { headline: true, photoKey: true, photoVersion: true } } } } } },
} as const;

function hostList(g: Prisma.GatheringGetPayload<{ include: typeof hostInclude }>) {
  return [
    ...(g.teamHosted ? [{ id: null, name: 'The Women Builders team', headline: null, photoUrl: null }] : []),
    ...g.hosts
      .filter((h) => h.user.accountStatus === 'ACTIVE')
      .map((h) => ({
        id: h.user.id,
        name: h.user.name,
        headline: h.user.profile?.headline ?? null,
        photoUrl: h.user.profile ? photoUrl(h.user.id, h.user.profile) : null,
      })),
  ];
}

// ---------------------------------------------------------------- list and detail

export const gatheringListSchema = z.object({
  type: z.enum(['DINNER', 'WORKING_SESSION', 'OTHER']).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().trim().max(100).optional().default(''),
  online: z.enum(['1']).optional(),
  view: z.enum(['upcoming', 'mine']).optional().default('upcoming'),
});
export type GatheringListQuery = z.output<typeof gatheringListSchema>;

export async function listGatherings(userId: string, q: GatheringListQuery) {
  const m = await loadMember(prisma, userId);
  const now = new Date();
  const and: Prisma.GatheringWhereInput[] = [visibleWhere(m)];
  if (q.view === 'mine') {
    and.push({ OR: [{ seats: { some: { userId, status: { in: ['REQUESTED', 'CONFIRMED', 'WAITLISTED'] } } } }, { hosts: { some: { userId } } }] });
  } else {
    and.push({ status: 'SCHEDULED', startsAt: { gt: new Date(now.getTime() - 2 * DAY) } });
    if (q.type) and.push({ type: q.type });
    if (q.city) and.push({ city: { contains: q.city, mode: 'insensitive' } });
    if (q.online) and.push({ online: true });
  }
  const rows = await prisma.gathering.findMany({
    where: { AND: and },
    include: {
      ...hostInclude,
      seats: { where: { status: 'CONFIRMED' }, select: { userId: true } },
    },
    orderBy: { startsAt: q.view === 'mine' ? 'desc' : 'asc' },
    take: 200,
  });
  const mySeats = await prisma.seatRequest.findMany({ where: { userId, gatheringId: { in: rows.map((r) => r.id) } } });
  const seatBy = new Map(mySeats.map((s) => [s.gatheringId, s]));

  const items = rows
    .filter((g) => q.view === 'mine' || endsAt(g) > now)
    .map((g) => ({
      id: g.id,
      title: g.title,
      type: g.type,
      startsAt: g.startsAt.toISOString(),
      timeZone: g.timeZone,
      durationMinutes: g.durationMinutes,
      online: g.online,
      city: g.city,
      country: g.country,
      location: g.online ? 'Online' : formatLocation(g.city, g.country),
      capacity: g.capacity,
      seatMode: g.seatMode,
      seatsLeft: Math.max(0, g.capacity - g.seats.length),
      status: g.status,
      past: endsAt(g) <= now,
      mySeat: seatBy.get(g.id)?.status ?? null,
      hosts: hostList(g),
      // Her country first, then online, then everything else (R3 F14).
      rank: g.country && g.country === m.country ? 0 : g.online ? 1 : 2,
    }));
  if (q.view === 'upcoming') items.sort((a, b) => a.rank - b.rank || a.startsAt.localeCompare(b.startsAt));
  return items;
}
export type GatheringListItem = Awaited<ReturnType<typeof listGatherings>>[number];

async function loadVisible(db: Tx, userId: string, id: string) {
  const m = await loadMember(db, userId);
  const g = await db.gathering.findFirst({ where: { id, ...visibleWhere(m) }, include: hostInclude });
  // Cancelled gatherings stay visible only to people who had a seat or request.
  if (!g) throw Errors.notFound('Gathering');
  return { g, m };
}

export async function getGathering(userId: string, id: string) {
  const { g } = await loadVisible(prisma, userId, id);
  const now = new Date();
  const [seat, confirmed] = await Promise.all([
    prisma.seatRequest.findUnique({ where: { gatheringId_userId: { gatheringId: id, userId } } }),
    prisma.seatRequest.count({ where: { gatheringId: id, status: 'CONFIRMED' } }),
  ]);
  const isHost = g.hosts.some((h) => h.userId === userId);
  const insider = isHost || seat?.status === 'CONFIRMED';
  const ended = endsAt(g) <= now;
  const open = g.status === 'SCHEDULED' && now < g.requestsCloseAt && now < g.startsAt;
  return {
    id: g.id,
    title: g.title,
    type: g.type,
    description: g.description,
    startsAt: g.startsAt.toISOString(),
    timeZone: g.timeZone,
    durationMinutes: g.durationMinutes,
    online: g.online,
    location: g.online ? 'Online' : formatLocation(g.city, g.country),
    venue: insider ? g.venue : null,
    capacity: g.capacity,
    seatMode: g.seatMode,
    seatsLeft: Math.max(0, g.capacity - confirmed),
    requestsCloseAt: g.requestsCloseAt.toISOString(),
    status: g.status,
    cancelReason: g.status === 'CANCELLED' ? g.cancelReason : null,
    hosts: hostList(g),
    isHost,
    insider,
    ended,
    canRequest: open && !isHost && (!seat || seat.status === 'CANCELLED'),
    canCancel: !!seat && ['REQUESTED', 'CONFIRMED', 'WAITLISTED'].includes(seat.status) && now < g.startsAt && g.status === 'SCHEDULED',
    mySeat: seat ? { status: seat.status, note: seat.note, lateCancel: seat.lateCancel } : null,
    calendarUrl: insider && g.status === 'SCHEDULED' ? `/api/gatherings/${g.id}/calendar.ics` : null,
  };
}
export type GatheringDetail = Awaited<ReturnType<typeof getGathering>>;

// ---------------------------------------------------------------- seats

export const seatSchema = z.object({
  note: z
    .string()
    .trim()
    .max(SEAT_NOTE_MAX, `Keep it under ${SEAT_NOTE_MAX} characters`)
    .optional()
    .transform((v) => v || null),
});

/** Request a seat (curated) or take one (open, with an automatic waitlist). */
export async function requestSeat(userId: string, id: string, note: string | null) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, `gathering:${id}`);
    const { g } = await loadVisible(tx, userId, id);
    const now = new Date();
    if (g.status !== 'SCHEDULED' || now >= g.startsAt) throw Errors.conflict('This gathering is no longer taking requests.');
    if (now >= g.requestsCloseAt) throw Errors.conflict('Requests for this gathering have closed.');
    if (g.hosts.some((h) => h.userId === userId)) throw Errors.conflict("You're hosting this gathering.");
    const existing = await tx.seatRequest.findUnique({ where: { gatheringId_userId: { gatheringId: id, userId } } });
    if (existing && existing.status !== 'CANCELLED') throw Errors.conflict('You already asked for a seat at this gathering.');

    let status: 'REQUESTED' | 'CONFIRMED' | 'WAITLISTED' = 'REQUESTED';
    if (g.seatMode === 'OPEN') {
      const taken = await tx.seatRequest.count({ where: { gatheringId: id, status: 'CONFIRMED' } });
      status = taken < g.capacity ? 'CONFIRMED' : 'WAITLISTED';
    }
    const data = { note, status, lateCancel: false, attendance: null, decidedAt: status === 'REQUESTED' ? null : now, createdAt: now };
    const seat = existing
      ? await tx.seatRequest.update({ where: { id: existing.id }, data })
      : await tx.seatRequest.create({ data: { gatheringId: id, userId, ...data } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    if (status === 'CONFIRMED') await enqueueEmail(tx, { to: user.email, kind: 'seat_confirmed', content: templates.seatConfirmed(summary(g), g.venue) });
    if (status === 'WAITLISTED') await enqueueEmail(tx, { to: user.email, kind: 'seat_waitlisted', content: templates.seatWaitlisted(summary(g)) });
    return { status: seat.status };
  });
}

/** Open mode: the longest-waiting member gets the freed seat. */
export async function promoteFromWaitlist(tx: Tx, gatheringId: string) {
  const g = await tx.gathering.findUniqueOrThrow({ where: { id: gatheringId } });
  if (g.seatMode !== 'OPEN' || g.status !== 'SCHEDULED' || g.startsAt <= new Date()) return null;
  const taken = await tx.seatRequest.count({ where: { gatheringId, status: 'CONFIRMED' } });
  if (taken >= g.capacity) return null;
  const next = await tx.seatRequest.findFirst({
    where: { gatheringId, status: 'WAITLISTED', user: { accountStatus: 'ACTIVE' } },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { email: true } } },
  });
  if (!next) return null;
  await tx.seatRequest.update({ where: { id: next.id }, data: { status: 'CONFIRMED', decidedAt: new Date() } });
  await enqueueEmail(tx, { to: next.user.email, kind: 'seat_confirmed', content: templates.seatConfirmed(summary(g), g.venue) });
  return next.userId;
}

export async function cancelSeat(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    await lock(tx, `gathering:${id}`);
    const seat = await tx.seatRequest.findUnique({ where: { gatheringId_userId: { gatheringId: id, userId } }, include: { gathering: true } });
    if (!seat || !['REQUESTED', 'CONFIRMED', 'WAITLISTED'].includes(seat.status)) throw Errors.notFound('Seat');
    const now = new Date();
    if (now >= seat.gathering.startsAt) throw Errors.conflict('This gathering has already started.');
    const late = seat.status === 'CONFIRMED' && seat.gathering.startsAt.getTime() - now.getTime() < LATE_CANCEL_HOURS * HOUR;
    await tx.seatRequest.update({ where: { id: seat.id }, data: { status: 'CANCELLED', lateCancel: late, decidedAt: now } });
    if (seat.status === 'CONFIRMED') await promoteFromWaitlist(tx, id);
    return { lateCancel: late };
  });
}

// ---------------------------------------------------------------- who's coming, calendar, people you met

async function blockedWith(userId: string) {
  const sets = await relationshipSets(userId);
  return { sets, blocked: new Set(sets.blocked) };
}

/** Confirmed attendees and hosts, for insiders only. Blocked pairs never see each other. */
export async function whosComing(userId: string, id: string) {
  const detail = await getGathering(userId, id);
  if (!detail.insider) throw Errors.forbidden('Only confirmed attendees can see who is coming.');
  const { sets, blocked } = await blockedWith(userId);
  const seats = await prisma.seatRequest.findMany({
    where: { gatheringId: id, status: 'CONFIRMED', user: { accountStatus: 'ACTIVE' } },
    include: { user: { select: { id: true, name: true, profile: { select: { headline: true, primaryRole: true, photoKey: true, photoVersion: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  return {
    hosts: detail.hosts.filter((h) => !h.id || !blocked.has(h.id)),
    attendees: seats
      .filter((s) => !blocked.has(s.userId))
      .map((s) => ({
        id: s.user.id,
        name: s.user.name,
        headline: s.user.profile?.headline ?? null,
        primaryRole: s.user.profile?.primaryRole ?? null,
        photoUrl: s.user.profile ? photoUrl(s.user.id, s.user.profile) : null,
        isMe: s.userId === userId,
        connectionStatus: s.userId === userId ? null : statusFromSets(sets, s.userId),
      })),
  };
}

function icsEscape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** An .ics file for confirmed attendees and hosts. */
export async function gatheringCalendar(userId: string, id: string) {
  const detail = await getGathering(userId, id);
  if (!detail.insider || detail.status !== 'SCHEDULED') throw Errors.notFound('Gathering');
  const start = new Date(detail.startsAt);
  const end = new Date(start.getTime() + detail.durationMinutes * 60_000);
  const url = `${appUrl()}/gatherings/${id}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Women Builders//Gatherings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:gathering-${id}@womenbuilders`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(detail.title)}`,
    `DESCRIPTION:${icsEscape(`${detail.description.slice(0, 1000)}\n\n${url}`)}`,
    `LOCATION:${icsEscape(detail.venue ?? detail.location ?? '')}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return { filename: `${detail.title.replace(/[^\w]+/g, '-').toLowerCase().slice(0, 60) || 'gathering'}.ics`, body: `${lines.join('\r\n')}\r\n` };
}

// Not `NOT: { attendance: 'NO_SHOW' }`: in SQL that also drops rows where attendance is unset.
const NOT_NO_SHOW: Prisma.SeatRequestWhereInput[] = [{ attendance: null }, { attendance: 'ATTENDED' }];

/** Gatherings that ended in the last 30 days where this member was there (confirmed, not a no-show, or hosting). */
function attendedWhere(userId: string, since: Date, now: Date): Prisma.GatheringWhereInput {
  return {
    status: 'SCHEDULED',
    startsAt: { gte: since, lt: now },
    OR: [
      { seats: { some: { userId, status: 'CONFIRMED', OR: NOT_NO_SHOW } } },
      { hosts: { some: { userId } } },
    ],
  };
}

/** "People you met" for 30 days after a gathering, with one-tap Connect (R3 F14). */
export async function peopleYouMet(userId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - (PEOPLE_YOU_MET_DAYS + 2) * DAY);
  const gatherings = await prisma.gathering.findMany({
    where: attendedWhere(userId, since, now),
    include: {
      hosts: { select: { userId: true } },
      seats: { where: { status: 'CONFIRMED', OR: NOT_NO_SHOW }, select: { userId: true } },
    },
    orderBy: { startsAt: 'desc' },
  });
  const { sets, blocked } = await blockedWith(userId);
  const seen = new Map<string, { gatheringId: string; title: string }>();
  for (const g of gatherings) {
    if (endsAt(g) > now || now.getTime() - endsAt(g).getTime() > PEOPLE_YOU_MET_DAYS * DAY) continue;
    for (const id of [...g.hosts.map((h) => h.userId), ...g.seats.map((s) => s.userId)]) {
      if (id === userId || blocked.has(id) || seen.has(id)) continue;
      seen.set(id, { gatheringId: g.id, title: g.title });
    }
  }
  if (!seen.size) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: [...seen.keys()] }, accountStatus: 'ACTIVE', profile: { isNot: null } },
    select: { id: true, name: true, profile: { select: { headline: true, primaryRole: true, photoKey: true, photoVersion: true } } },
  });
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    headline: u.profile?.headline ?? null,
    primaryRole: u.profile!.primaryRole,
    photoUrl: photoUrl(u.id, u.profile!),
    metAt: seen.get(u.id)!,
    connectionStatus: statusFromSets(sets, u.id),
  }));
}

/** Title of a gathering both attended in the last 30 days: lets them connect directly (R3 F11). */
export async function metAtGathering(db: Tx, a: string, b: string): Promise<string | null> {
  const now = new Date();
  const since = new Date(now.getTime() - (PEOPLE_YOU_MET_DAYS + 2) * DAY);
  const shared = await db.gathering.findMany({
    where: { AND: [attendedWhere(a, since, now), attendedWhere(b, since, now)] },
    select: { title: true, startsAt: true, durationMinutes: true },
    orderBy: { startsAt: 'desc' },
  });
  const hit = shared.find((g) => endsAt(g) <= now && now.getTime() - endsAt(g).getTime() <= PEOPLE_YOU_MET_DAYS * DAY);
  return hit?.title ?? null;
}

/** Members confirmed for the same upcoming gathering as the viewer, for "Going to the same gathering". */
export async function sameUpcomingGathering(userId: string): Promise<Map<string, string>> {
  const now = new Date();
  const mine = await prisma.gathering.findMany({
    where: {
      status: 'SCHEDULED',
      startsAt: { gt: now },
      OR: [{ seats: { some: { userId, status: 'CONFIRMED' } } }, { hosts: { some: { userId } } }],
    },
    include: { seats: { where: { status: 'CONFIRMED' }, select: { userId: true } }, hosts: { select: { userId: true } } },
    orderBy: { startsAt: 'asc' },
  });
  const out = new Map<string, string>();
  for (const g of mine) {
    for (const id of [...g.seats.map((s) => s.userId), ...g.hosts.map((h) => h.userId)]) {
      if (id !== userId && !out.has(id)) out.set(id, g.title);
    }
  }
  return out;
}

export function assertGatheringOpen(g: Pick<Gathering, 'status'>) {
  if (g.status !== 'SCHEDULED') throw new AppError('GATHERING_CANCELLED', 'This gathering was cancelled.', 409);
}

/**
 * Reminders 2 days before (by the gathering's local calendar) and on the morning of the
 * gathering (from 7:00 local time). Runs hourly; each reminder is sent once.
 */
export async function sendGatheringReminders(now = new Date()): Promise<number> {
  const upcoming = await prisma.gathering.findMany({
    where: { status: 'SCHEDULED', startsAt: { gt: now, lt: new Date(now.getTime() + 3 * DAY) } },
    include: {
      seats: { where: { status: 'CONFIRMED', user: { accountStatus: 'ACTIVE' } }, include: { user: { select: { email: true } } } },
      hosts: { include: { user: { select: { email: true, accountStatus: true } } } },
    },
  });
  let sent = 0;
  for (const g of upcoming) {
    const today = localDate(now, g.timeZone);
    const day = localDate(g.startsAt, g.timeZone);
    let kind: 'soon' | 'today' | null = null;
    if (today === day && localHour(now, g.timeZone) >= 7 && !g.reminderDaySentAt) kind = 'today';
    else if (today < day && today >= addDaysToYmd(day, -2) && !g.reminder2dSentAt) kind = 'soon';
    if (!kind) continue;
    const emails = [...g.seats.map((s) => s.user.email), ...g.hosts.filter((h) => h.user.accountStatus === 'ACTIVE').map((h) => h.user.email)];
    await prisma.$transaction(async (tx) => {
      await tx.gathering.update({
        where: { id: g.id },
        data: kind === 'today' ? { reminderDaySentAt: now, reminder2dSentAt: g.reminder2dSentAt ?? now } : { reminder2dSentAt: now },
      });
      for (const to of new Set(emails)) {
        await enqueueEmail(tx, { to, kind: `gathering_reminder_${kind}`, content: templates.gatheringReminder(summary(g), kind!, g.venue) });
      }
    });
    sent += emails.length;
  }
  return sent;
}
