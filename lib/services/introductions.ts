import type { Introduction, IntroductionStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { APP_NAME, LIMITS } from '@/lib/config';
import { templates } from '@/lib/email/templates';
import { audit } from './audit';
import { connect } from './connections';
import { lock } from './locks';
import { notify } from './notifications';
import { photoUrl } from './photo-url';
import { canSendConnectionRequests } from './profile-fields';
import { activeConnection, isBlockedEitherWay, pair } from './relationships';
import { todayInAppTz } from './admin/dates';
import { metAtGathering } from './gatherings';

/**
 * Warm introductions (R3 F12). A (requester) asks B (introducer, a mutual connection) or
 * the Women Builders team to introduce her to C (target). Every "no" is silent: until a
 * step's deadline passes, A sees the same status whether or not someone declined.
 */

const DAY = 86_400_000;
const OPEN: IntroductionStatus[] = ['ASKED', 'FORWARDED'];
export const TEAM_LABEL = `The ${APP_NAME} team`;

/** Requests that still look open to the requester (declines stay hidden until the deadline). */
function openForRequester(now: Date): Prisma.IntroductionWhereInput {
  return {
    OR: [
      { status: { in: ['ASKED', 'DECLINED_BY_INTRODUCER'] }, introducerDueAt: { gt: now } },
      { status: { in: ['FORWARDED', 'DECLINED_BY_TARGET'] }, targetDueAt: { gt: now } },
    ],
  };
}

export type RequesterStatus = 'waiting_introducer' | 'waiting_target' | 'connected' | 'no_introduction' | 'cancelled';

export function requesterStatus(i: Pick<Introduction, 'status' | 'introducerDueAt' | 'targetDueAt'>, now = new Date()): RequesterStatus {
  switch (i.status) {
    case 'ACCEPTED':
      return 'connected';
    case 'CANCELLED':
      return 'cancelled';
    case 'ASKED':
    case 'DECLINED_BY_INTRODUCER':
      return i.introducerDueAt > now ? 'waiting_introducer' : 'no_introduction';
    case 'FORWARDED':
    case 'DECLINED_BY_TARGET':
      return i.targetDueAt && i.targetDueAt > now ? 'waiting_target' : 'no_introduction';
    default:
      return 'no_introduction';
  }
}

async function activeMember(db: Tx, id: string) {
  return db.user.findFirst({
    where: { id, accountStatus: 'ACTIVE', profile: { isNot: null } },
    select: { id: true, name: true, allowIntroRequests: true, preferIntroductions: true },
  });
}

/** Mutual connections of A and C who accept introduction requests, minus anyone blocked with A. */
async function eligibleIntroducerIds(db: Tx, requesterId: string, targetId: string): Promise<string[]> {
  const rows = await db.connection.findMany({
    where: { removedAt: null, OR: [{ userAId: { in: [requesterId, targetId] } }, { userBId: { in: [requesterId, targetId] } }] },
    select: { userAId: true, userBId: true },
  });
  const ofA = new Set<string>();
  const ofC = new Set<string>();
  for (const r of rows) {
    if (r.userAId === requesterId) ofA.add(r.userBId);
    if (r.userBId === requesterId) ofA.add(r.userAId);
    if (r.userAId === targetId) ofC.add(r.userBId);
    if (r.userBId === targetId) ofC.add(r.userAId);
  }
  const mutual = [...ofA].filter((id) => ofC.has(id) && id !== requesterId && id !== targetId);
  if (!mutual.length) return [];
  const blocked = await db.block.findMany({
    where: { OR: [{ blockerId: requesterId, blockedId: { in: mutual } }, { blockedId: requesterId, blockerId: { in: mutual } }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = new Set(blocked.flatMap((b) => [b.blockerId, b.blockedId]));
  const ok = await db.user.findMany({
    where: { id: { in: mutual.filter((id) => !blockedIds.has(id)) }, accountStatus: 'ACTIVE', allowIntroRequests: true },
    select: { id: true },
  });
  return ok.map((u) => u.id);
}

function monthStart(now: Date) {
  const today = todayInAppTz(now);
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
}

/** Everything the profile page needs to offer an introduction (R3 F12). */
export async function introductionOptions(viewerId: string, targetId: string) {
  const now = new Date();
  const [target, introducerIds, open, teamThisMonth, viewer, metAt] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetId }, select: { preferIntroductions: true } }),
    eligibleIntroducerIds(prisma, viewerId, targetId),
    prisma.introduction.findFirst({ where: { requesterId: viewerId, targetId, ...openForRequester(now) }, select: { id: true } }),
    prisma.introduction.count({ where: { requesterId: viewerId, viaTeam: true, createdAt: { gte: monthStart(now) } } }),
    prisma.profile.findUnique({ where: { userId: viewerId } }),
    metAtGathering(prisma, viewerId, targetId),
  ]);
  const introducers = await prisma.user.findMany({
    where: { id: { in: introducerIds } },
    select: { id: true, name: true, profile: { select: { headline: true, photoKey: true, photoVersion: true } } },
    orderBy: { name: 'asc' },
  });
  return {
    preferIntroductions: !!target?.preferIntroductions,
    /** They met at a gathering in the last 30 days: direct Connect is allowed (R3 F11). */
    metAt,
    introducers: introducers.map((u) => ({
      id: u.id,
      name: u.name,
      headline: u.profile?.headline ?? null,
      photoUrl: u.profile ? photoUrl(u.id, u.profile) : null,
    })),
    /** "Ask the team" is offered only when nobody in her network can introduce her. */
    teamAvailable: introducerIds.length === 0,
    teamRemainingThisMonth: Math.max(0, LIMITS.teamIntrosPerMonth - teamThisMonth),
    hasOpenRequest: !!open,
    canAsk: !!viewer && canSendConnectionRequests(viewer),
  };
}

// ---------------------------------------------------------------- asking

export const askSchema = z.object({
  targetId: z.string().min(1),
  /** A member id, or "team" for an "Ask the team" introduction. */
  introducerId: z.string().min(1),
  noteToIntroducer: z
    .string()
    .trim()
    .min(10, 'Tell them a little about why (at least 10 characters)')
    .max(LIMITS.introNoteToIntroducerMax, `Keep it under ${LIMITS.introNoteToIntroducerMax.toLocaleString('en-US')} characters`),
  noteToTarget: z
    .string()
    .trim()
    .max(LIMITS.introNoteToTargetMax, `Keep it under ${LIMITS.introNoteToTargetMax} characters`)
    .optional()
    .transform((v) => v || null),
});
export type AskInput = z.output<typeof askSchema>;

export async function askIntroduction(requesterId: string, input: AskInput) {
  const { targetId } = input;
  const viaTeam = input.introducerId === 'team';
  if (requesterId === targetId) throw Errors.validation("You can't ask for an introduction to yourself.");
  if (!viaTeam && (input.introducerId === requesterId || input.introducerId === targetId)) {
    throw Errors.validation('Choose someone else to introduce you.');
  }
  return prisma.$transaction(async (tx) => {
    await lock(tx, `intro:${requesterId}`);
    const now = new Date();
    const [requester, target] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: requesterId }, include: { profile: true } }),
      activeMember(tx, targetId),
    ]);
    if (!target || (await isBlockedEitherWay(tx, requesterId, targetId))) throw Errors.notFound('Member');
    if (!requester.profile || !canSendConnectionRequests(requester.profile)) {
      throw new AppError(
        'PROFILE_INCOMPLETE',
        'Complete your profile (at least 60%, including the required fields for your role) to ask for introductions.',
        403,
      );
    }
    if (await activeConnection(tx, requesterId, targetId)) throw Errors.conflict("You're already connected.");
    // No double routes: a pending request either way blocks an introduction (a silently
    // declined request still looks pending to its sender).
    const pending = await tx.connectionRequest.count({
      where: {
        expiresAt: { gt: now },
        OR: [
          { senderId: requesterId, receiverId: targetId, status: { in: ['PENDING', 'DECLINED'] } },
          { senderId: targetId, receiverId: requesterId, status: 'PENDING' },
        ],
      },
    });
    if (pending) throw Errors.conflict('There is already a connection request between you. Wait for it to be answered or to expire.');

    const open = openForRequester(now);
    if (await tx.introduction.count({ where: { requesterId, targetId, ...open } })) {
      throw Errors.conflict('You already have an introduction request open for this member.');
    }
    if ((await tx.introduction.count({ where: { requesterId, ...open } })) >= LIMITS.introOpenPerMember) {
      throw Errors.rateLimited(`You can have ${LIMITS.introOpenPerMember} introduction requests open at a time.`);
    }

    const introducerIds = await eligibleIntroducerIds(tx, requesterId, targetId);
    let introducerId: string | null = null;
    if (viaTeam) {
      if (introducerIds.length) throw Errors.validation('Someone in your network can introduce you. Ask them first.');
      const used = await tx.introduction.count({ where: { requesterId, viaTeam: true, createdAt: { gte: monthStart(now) } } });
      if (used >= LIMITS.teamIntrosPerMonth) {
        throw Errors.rateLimited(`You can ask the team for ${LIMITS.teamIntrosPerMonth} introductions a month.`);
      }
    } else {
      if (!introducerIds.includes(input.introducerId)) throw Errors.notFound('Introducer');
      introducerId = input.introducerId;
      const recent = await tx.introduction.count({
        where: { requesterId, introducerId, targetId, createdAt: { gt: new Date(now.getTime() - LIMITS.introSamePairCooldownDays * DAY) } },
      });
      if (recent) throw Errors.conflict('You asked this person for this introduction recently. Try someone else, or wait.');
    }

    const intro = await tx.introduction.create({
      data: {
        requesterId,
        introducerId,
        viaTeam,
        targetId,
        noteToIntroducer: input.noteToIntroducer,
        noteToTarget: input.noteToTarget,
        introducerDueAt: new Date(now.getTime() + LIMITS.introResponseDays * DAY),
      },
    });
    if (introducerId) {
      await notify(tx, introducerId, 'introduction', (u) =>
        templates.introductionAsked(requester.name, target.name, input.noteToIntroducer, u),
      );
    }
    return { id: intro.id };
  });
}

/** The requester can withdraw while it is still open. */
export async function cancelIntroduction(requesterId: string, id: string) {
  const res = await prisma.introduction.updateMany({
    where: { id, requesterId, status: { in: [...OPEN, 'DECLINED_BY_INTRODUCER', 'DECLINED_BY_TARGET'] } },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
  if (!res.count) throw Errors.notFound('Introduction');
}

// ---------------------------------------------------------------- introducer (member or team)

export const introduceSchema = z.object({
  note: z
    .string()
    .trim()
    .max(LIMITS.introducerNoteMax, `Keep it under ${LIMITS.introducerNoteMax} characters`)
    .optional()
    .transform((v) => v || null),
});

async function loadForIntroducer(tx: Tx, id: string, by: { memberId: string } | { team: true }) {
  const where: Prisma.IntroductionWhereInput =
    'team' in by ? { id, viaTeam: true, status: 'ASKED' } : { id, introducerId: by.memberId, status: 'ASKED' };
  const intro = await tx.introduction.findFirst({ where: { ...where, introducerDueAt: { gt: new Date() } } });
  if (!intro) throw Errors.notFound('Introduction');
  // If A and C blocked each other since, or either left, the introduction quietly disappears.
  const [a, c] = await Promise.all([activeMember(tx, intro.requesterId), activeMember(tx, intro.targetId)]);
  if (!a || !c || (await isBlockedEitherWay(tx, intro.requesterId, intro.targetId))) throw Errors.notFound('Introduction');
  return { intro, requester: a, target: c };
}

async function forward(tx: Tx, id: string, by: { memberId: string } | { team: true; adminId: string }, note: string | null) {
  const { intro, requester } = await loadForIntroducer(tx, id, by);
  if ('memberId' in by) {
    // The introducer must still know both people.
    const [ab, bc] = await Promise.all([
      activeConnection(tx, by.memberId, intro.requesterId),
      activeConnection(tx, by.memberId, intro.targetId),
    ]);
    if (!ab || !bc) throw Errors.notFound('Introduction');
  }
  const now = new Date();
  await tx.introduction.update({
    where: { id },
    data: {
      status: 'FORWARDED',
      introducerNote: note,
      forwardedAt: now,
      targetDueAt: new Date(now.getTime() + LIMITS.introResponseDays * DAY),
      handledById: 'team' in by ? by.adminId : null,
    },
  });
  const label = 'team' in by ? TEAM_LABEL : (await tx.user.findUniqueOrThrow({ where: { id: by.memberId }, select: { name: true } })).name;
  await notify(tx, intro.targetId, 'introduction', (u) => templates.introduced(label, requester.name, u));
}

export function introduce(introducerId: string, id: string, note: string | null) {
  return prisma.$transaction((tx) => forward(tx, id, { memberId: introducerId }, note));
}

/** "Not this time": silent. */
export async function passIntroduction(introducerId: string, id: string) {
  const res = await prisma.introduction.updateMany({
    where: { id, introducerId, status: 'ASKED' },
    data: { status: 'DECLINED_BY_INTRODUCER', respondedAt: new Date() },
  });
  if (!res.count) throw Errors.notFound('Introduction');
}

export function teamIntroduce(adminId: string, id: string, note: string | null) {
  return prisma.$transaction(async (tx) => {
    await forward(tx, id, { team: true, adminId }, note);
    await audit(tx, { actorId: adminId, action: 'introduction.team_introduce', targetType: 'introduction', targetId: id });
  });
}

export async function teamPass(adminId: string, id: string) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.introduction.updateMany({
      where: { id, viaTeam: true, status: 'ASKED' },
      data: { status: 'DECLINED_BY_INTRODUCER', respondedAt: new Date(), handledById: adminId },
    });
    if (!res.count) throw Errors.notFound('Introduction');
    await audit(tx, { actorId: adminId, action: 'introduction.team_pass', targetType: 'introduction', targetId: id });
  });
}

// ---------------------------------------------------------------- target

export async function acceptIntroduction(targetId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const intro = await tx.introduction.findFirst({ where: { id, targetId, status: 'FORWARDED', targetDueAt: { gt: new Date() } } });
    if (!intro) throw Errors.notFound('Introduction');
    const { userAId, userBId } = pair(intro.requesterId, targetId);
    await lock(tx, `pair:${userAId}:${userBId}`);
    const requester = await activeMember(tx, intro.requesterId);
    if (!requester || (await isBlockedEitherWay(tx, intro.requesterId, targetId))) throw Errors.notFound('Introduction');

    const now = new Date();
    await tx.introduction.update({ where: { id }, data: { status: 'ACCEPTED', respondedAt: now } });
    const connection = await connect(tx, intro.requesterId, targetId);
    // Any request between them is answered by the introduction.
    await tx.connectionRequest.updateMany({
      where: {
        status: 'PENDING',
        OR: [
          { senderId: intro.requesterId, receiverId: targetId },
          { senderId: targetId, receiverId: intro.requesterId },
        ],
      },
      data: { status: 'ACCEPTED', respondedAt: now },
    });
    const target = await tx.user.findUniqueOrThrow({ where: { id: targetId }, select: { name: true } });
    await notify(tx, intro.requesterId, 'introduction', (u) => templates.introductionAcceptedRequester(target.name, targetId, u));
    if (intro.introducerId) {
      await notify(tx, intro.introducerId, 'introduction', (u) =>
        templates.introductionAcceptedIntroducer(requester.name, target.name, u),
      );
    }
    return { connectionId: connection.id, memberId: intro.requesterId };
  });
}

/** "Not now": silent. */
export async function declineIntroduction(targetId: string, id: string) {
  const res = await prisma.introduction.updateMany({
    where: { id, targetId, status: 'FORWARDED' },
    data: { status: 'DECLINED_BY_TARGET', respondedAt: new Date() },
  });
  if (!res.count) throw Errors.notFound('Introduction');
}

// ---------------------------------------------------------------- lists

const person = { select: { id: true, name: true, accountStatus: true, profile: { select: { headline: true, photoKey: true, photoVersion: true } } } } as const;
type Person = Prisma.UserGetPayload<typeof person>;
const personView = (u: Person | null) =>
  u && {
    id: u.id,
    name: u.accountStatus === 'DELETED' ? 'Deleted account' : u.name,
    headline: u.profile?.headline ?? null,
    photoUrl: u.profile ? photoUrl(u.id, u.profile) : null,
  };

export type IntroTab = 'asked' | 'for-me' | 'mine';

async function blockedPairs(userIds: string[]) {
  const rows = await prisma.block.findMany({
    where: { blockerId: { in: userIds }, blockedId: { in: userIds } },
    select: { blockerId: true, blockedId: true },
  });
  return new Set(rows.flatMap((r) => [`${r.blockerId}:${r.blockedId}`, `${r.blockedId}:${r.blockerId}`]));
}

export async function listIntroductions(userId: string, tab: IntroTab) {
  const now = new Date();
  const where: Prisma.IntroductionWhereInput =
    tab === 'asked'
      ? { introducerId: userId, status: { not: 'CANCELLED' } }
      : tab === 'for-me'
        ? { targetId: userId, status: { in: ['FORWARDED', 'ACCEPTED', 'DECLINED_BY_TARGET'] } }
        : { requesterId: userId };
  const rows = await prisma.introduction.findMany({
    where,
    include: { requester: person, introducer: person, target: person },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  // Blocking hides introductions between the pair (R3 F12).
  const blocked = await blockedPairs([...new Set(rows.flatMap((r) => [r.requesterId, r.targetId]))]);
  const visible = rows.filter((r) => !blocked.has(`${r.requesterId}:${r.targetId}`));
  const items = visible.map((r) => {
    const base = {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      viaTeam: r.viaTeam,
      requester: personView(r.requester)!,
      introducer: r.viaTeam ? { id: null, name: TEAM_LABEL, headline: null, photoUrl: null } : personView(r.introducer),
      target: personView(r.target)!,
    };
    if (tab === 'mine') {
      return { ...base, noteToIntroducer: r.noteToIntroducer, noteToTarget: r.noteToTarget, status: requesterStatus(r, now), actionable: false };
    }
    if (tab === 'asked') {
      const actionable = r.status === 'ASKED' && r.introducerDueAt > now;
      return {
        ...base,
        noteToIntroducer: r.noteToIntroducer,
        noteToTarget: r.noteToTarget,
        status: actionable ? 'pending' : r.status === 'FORWARDED' || r.status === 'ACCEPTED' || r.status === 'DECLINED_BY_TARGET' ? 'introduced' : r.status === 'DECLINED_BY_INTRODUCER' ? 'passed' : 'expired',
        dueAt: r.introducerDueAt.toISOString(),
        actionable,
      };
    }
    const actionable = r.status === 'FORWARDED' && !!r.targetDueAt && r.targetDueAt > now;
    return {
      ...base,
      noteToTarget: r.noteToTarget,
      introducerNote: r.introducerNote,
      status: actionable ? 'pending' : r.status === 'ACCEPTED' ? 'accepted' : r.status === 'DECLINED_BY_TARGET' ? 'declined' : 'expired',
      dueAt: r.targetDueAt?.toISOString() ?? null,
      actionable,
    };
  });
  // Pending first.
  return items.sort((a, b) => Number(b.actionable) - Number(a.actionable));
}
export type IntroductionItem = Awaited<ReturnType<typeof listIntroductions>>[number];

/** For the nav badge: introductions waiting for this member's answer. */
export async function introductionsAwaiting(userId: string) {
  const now = new Date();
  return prisma.introduction.count({
    where: {
      OR: [
        { introducerId: userId, status: 'ASKED', introducerDueAt: { gt: now } },
        { targetId: userId, status: 'FORWARDED', targetDueAt: { gt: now } },
      ],
    },
  });
}

/** The note a conversation opens with when the pair met through an introduction. */
export async function introductionForPair(a: string, b: string) {
  const intro = await prisma.introduction.findFirst({
    where: { status: 'ACCEPTED', OR: [{ requesterId: a, targetId: b }, { requesterId: b, targetId: a }] },
    orderBy: { respondedAt: 'desc' },
    include: { introducer: { select: { name: true, accountStatus: true } }, requester: { select: { name: true } } },
  });
  if (!intro) return null;
  return {
    by: intro.viaTeam ? TEAM_LABEL : intro.introducer?.accountStatus === 'DELETED' ? 'Deleted account' : intro.introducer?.name ?? 'a member',
    introducerNote: intro.introducerNote,
    requesterName: intro.requester.name,
    requesterNote: intro.noteToTarget,
    at: (intro.respondedAt ?? intro.createdAt).toISOString(),
  };
}

// ---------------------------------------------------------------- admin and jobs

export async function listTeamIntroductions(status: 'ASKED' | 'HANDLED' = 'ASKED') {
  const now = new Date();
  const rows = await prisma.introduction.findMany({
    where: status === 'ASKED' ? { viaTeam: true, status: 'ASKED', introducerDueAt: { gt: now } } : { viaTeam: true, handledById: { not: null } },
    include: { requester: person, target: person },
    orderBy: { createdAt: status === 'ASKED' ? 'asc' : 'desc' },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    dueAt: r.introducerDueAt.toISOString(),
    status: r.status,
    requester: personView(r.requester)!,
    target: personView(r.target)!,
    noteToIntroducer: r.noteToIntroducer,
    noteToTarget: r.noteToTarget,
    introducerNote: r.introducerNote,
  }));
}

export async function introductionCounts(from?: Date, to?: Date) {
  const range = from && to ? { gte: from, lt: to } : undefined;
  const [made, accepted, teamMade, teamAccepted, teamWaiting] = await Promise.all([
    prisma.introduction.count({ where: { viaTeam: false, forwardedAt: range ?? { not: null } } }),
    prisma.introduction.count({ where: { viaTeam: false, status: 'ACCEPTED', ...(range ? { respondedAt: range } : {}) } }),
    prisma.introduction.count({ where: { viaTeam: true, forwardedAt: range ?? { not: null } } }),
    prisma.introduction.count({ where: { viaTeam: true, status: 'ACCEPTED', ...(range ? { respondedAt: range } : {}) } }),
    prisma.introduction.count({ where: { viaTeam: true, status: 'ASKED', introducerDueAt: { gt: new Date() } } }),
  ]);
  return { made, accepted, teamMade, teamAccepted, teamWaiting };
}

/** Daily: close requests whose time ran out. Nobody is notified (R3 F12). */
export async function expireIntroductions(now = new Date()): Promise<number> {
  const [a, b] = await prisma.$transaction([
    prisma.introduction.updateMany({ where: { status: 'ASKED', introducerDueAt: { lte: now } }, data: { status: 'EXPIRED' } }),
    prisma.introduction.updateMany({ where: { status: 'FORWARDED', targetDueAt: { lte: now } }, data: { status: 'EXPIRED' } }),
  ]);
  return a.count + b.count;
}

/**
 * Called on block and account deletion. Open introductions involving the people are closed
 * silently: they end exactly like a decline, so nobody learns why (R3 F12).
 */
async function closeSilently(db: Tx, where: Prisma.IntroductionWhereInput) {
  const now = new Date();
  await db.introduction.updateMany({ where: { ...where, status: 'ASKED' }, data: { status: 'DECLINED_BY_INTRODUCER', respondedAt: now } });
  await db.introduction.updateMany({ where: { ...where, status: 'FORWARDED' }, data: { status: 'DECLINED_BY_TARGET', respondedAt: now } });
}

export function closeIntroductionsBetween(db: Tx, a: string, b: string) {
  const ids = [a, b];
  return closeSilently(db, {
    OR: [
      { requesterId: { in: ids }, targetId: { in: ids } },
      { requesterId: { in: ids }, introducerId: { in: ids } },
      { introducerId: { in: ids }, targetId: { in: ids } },
    ],
  });
}

export function closeIntroductionsFor(db: Tx, userId: string) {
  return closeSilently(db, { OR: [{ requesterId: userId }, { introducerId: userId }, { targetId: userId }] });
}
