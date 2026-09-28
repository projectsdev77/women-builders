import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { DURATIONS_MS, LIMITS } from '@/lib/config';
import { lock } from './locks';
import { canSendConnectionRequests } from './profile-fields';
import { toMemberCard, type MemberCard, type ProfileWithUser } from './privacy';
import { activeConnection, isBlockedEitherWay, pair } from './relationships';
import { notifyConnectionAccepted, notifyConnectionRequest } from './notifications';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function activeMember(tx: Tx, id: string) {
  return tx.user.findFirst({ where: { id, accountStatus: 'ACTIVE', profile: { isNot: null } }, select: { id: true, name: true } });
}

async function connect(tx: Tx, a: string, b: string) {
  const key = pair(a, b);
  return tx.connection.upsert({
    where: { userAId_userBId: key },
    create: key,
    // Reconnecting after a removal restores the same conversation (Req 21.6).
    update: { removedAt: null, createdAt: new Date() },
  });
}

export type SendResult = { status: 'sent'; requestId: string } | { status: 'connected' };

/**
 * Sends a connection request (Req 3, G1, G6). Runs in one transaction under advisory
 * locks for the sender (rate limit) and the pair (one pending request per pair).
 */
export async function sendConnectionRequest(senderId: string, receiverId: string, message?: string | null): Promise<SendResult> {
  if (senderId === receiverId) throw Errors.validation("You can't connect with yourself.");
  const text = message?.trim() ? message.trim() : null;
  if (text && text.length > LIMITS.connectionRequestMessageMax) {
    throw Errors.validation(`Keep your note under ${LIMITS.connectionRequestMessageMax} characters.`);
  }

  return prisma.$transaction(async (tx) => {
    await lock(tx, `rate:connreq:${senderId}`);
    const { userAId, userBId } = pair(senderId, receiverId);
    await lock(tx, `pair:${userAId}:${userBId}`);

    const [sender, receiver] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: senderId }, include: { profile: true } }),
      activeMember(tx, receiverId),
    ]);
    // Blocked and inactive members look like they don't exist (G9).
    if (!receiver || (await isBlockedEitherWay(tx, senderId, receiverId))) throw Errors.notFound('Member');
    if (!sender.profile || !canSendConnectionRequests(sender.profile)) {
      throw new AppError(
        'PROFILE_INCOMPLETE',
        'Complete your profile (at least 60%, including the required fields for your role) to send connection requests.',
        403,
      );
    }
    if (await activeConnection(tx, senderId, receiverId)) throw Errors.conflict("You're already connected.");

    const now = new Date();
    // Crossing requests: they already asked you, so connect (G6).
    const reverse = await tx.connectionRequest.findFirst({
      where: { senderId: receiverId, receiverId: senderId, status: 'PENDING', expiresAt: { gt: now } },
    });
    if (reverse) {
      await tx.connectionRequest.update({ where: { id: reverse.id }, data: { status: 'ACCEPTED', respondedAt: now } });
      await connect(tx, senderId, receiverId);
      await notifyConnectionAccepted(tx, receiverId, sender.name, senderId);
      return { status: 'connected' as const };
    }

    const existing = await tx.connectionRequest.findFirst({
      where: {
        senderId,
        receiverId,
        status: { in: ['PENDING', 'DECLINED', 'CANCELLED'] },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.status === 'PENDING' || existing?.status === 'DECLINED') {
      // A declined request still looks pending to the sender (silent decline).
      throw Errors.conflict('You already have a pending request to this member.');
    }
    if (existing?.status === 'CANCELLED') {
      throw new AppError(
        'REQUEST_COOLDOWN',
        `You withdrew a request to this member recently. You can send a new one after ${existing.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`,
        409,
      );
    }

    const sentToday = await tx.connectionRequest.count({
      where: { senderId, createdAt: { gt: new Date(now.getTime() - 24 * 3600 * 1000) } },
    });
    if (sentToday >= LIMITS.connectionRequestsPer24h) {
      throw Errors.rateLimited(
        `You've sent ${LIMITS.connectionRequestsPer24h} connection requests in the last 24 hours. Please try again later.`,
      );
    }

    const request = await tx.connectionRequest.create({
      data: {
        senderId,
        receiverId,
        message: text,
        expiresAt: new Date(now.getTime() + DURATIONS_MS.connectionRequestExpiry),
      },
    });
    await notifyConnectionRequest(tx, receiverId, sender.name, text);
    return { status: 'sent' as const, requestId: request.id };
  });
}

/** Only the receiver may accept (G2). Anything else is a 404. */
export async function acceptConnectionRequest(actorId: string, requestId: string) {
  return prisma.$transaction(async (tx) => {
    const req = await tx.connectionRequest.findFirst({
      where: { id: requestId, receiverId: actorId, status: 'PENDING', expiresAt: { gt: new Date() } },
    });
    if (!req) throw Errors.notFound('Request');
    const { userAId, userBId } = pair(req.senderId, req.receiverId);
    await lock(tx, `pair:${userAId}:${userBId}`);
    if (!(await activeMember(tx, req.senderId)) || (await isBlockedEitherWay(tx, req.senderId, actorId))) {
      throw Errors.notFound('Request');
    }
    await tx.connectionRequest.update({ where: { id: req.id }, data: { status: 'ACCEPTED', respondedAt: new Date() } });
    const connection = await connect(tx, req.senderId, actorId);
    const actor = await tx.user.findUniqueOrThrow({ where: { id: actorId }, select: { name: true } });
    await notifyConnectionAccepted(tx, req.senderId, actor.name, actorId);
    return { connectionId: connection.id, memberId: req.senderId };
  });
}

/** Silent decline: the sender is never told (Req 3.6 R2). */
export async function declineConnectionRequest(actorId: string, requestId: string) {
  const res = await prisma.connectionRequest.updateMany({
    where: { id: requestId, receiverId: actorId, status: 'PENDING' },
    data: { status: 'DECLINED', respondedAt: new Date() },
  });
  if (res.count === 0) throw Errors.notFound('Request');
}

/** Only the sender may cancel. Works on silently-declined requests too (they look pending). */
export async function cancelConnectionRequest(actorId: string, requestId: string) {
  const res = await prisma.connectionRequest.updateMany({
    where: {
      id: requestId,
      senderId: actorId,
      OR: [{ status: 'PENDING' }, { status: 'DECLINED', expiresAt: { gt: new Date() } }],
    },
    data: { status: 'CANCELLED', respondedAt: new Date() },
  });
  if (res.count === 0) throw Errors.notFound('Request');
}

const cardInclude = {
  profile: true,
} as const;

type UserWithProfile = { id: string; name: string; approvedAt: Date | null; createdAt: Date; profile: ProfileWithUser | null };

function card(u: { id: string; name: string; approvedAt: Date | null; createdAt: Date; profile: Omit<ProfileWithUser, 'user'> | null }, connected: boolean, status: MemberCard['connectionStatus']): MemberCard | null {
  if (!u.profile) return null;
  return toMemberCard({ ...u.profile, user: u } as ProfileWithUser, { isSelf: false, connected }, status);
}

export interface IncomingRequest {
  id: string;
  message: string | null;
  createdAt: string;
  expiresAt: string;
  member: MemberCard;
}
export interface OutgoingRequest {
  id: string;
  createdAt: string;
  expiresAt: string;
  member: MemberCard;
}

/** Pending requests for the requests page (Req 15). Outgoing declined requests appear pending. */
export async function listRequests(actorId: string): Promise<{ incoming: IncomingRequest[]; outgoing: OutgoingRequest[] }> {
  const now = new Date();
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: actorId }, { blockedId: actorId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blocked = [...new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]))].filter((id) => id !== actorId);
  const [incoming, outgoing] = await Promise.all([
    prisma.connectionRequest.findMany({
      where: {
        receiverId: actorId,
        status: 'PENDING',
        expiresAt: { gt: now },
        senderId: { notIn: blocked },
        sender: { accountStatus: 'ACTIVE' },
      },
      include: { sender: { include: cardInclude } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.connectionRequest.findMany({
      where: {
        senderId: actorId,
        OR: [{ status: 'PENDING' }, { status: 'DECLINED' }],
        expiresAt: { gt: now },
        receiverId: { notIn: blocked },
        receiver: { accountStatus: 'ACTIVE' },
      },
      include: { receiver: { include: cardInclude } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    incoming: incoming.flatMap((r) => {
      const m = card(r.sender as unknown as UserWithProfile, false, 'pending_received');
      return m ? [{ id: r.id, message: r.message, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(), member: m }] : [];
    }),
    outgoing: outgoing.flatMap((r) => {
      const m = card(r.receiver as unknown as UserWithProfile, false, 'pending_sent');
      return m ? [{ id: r.id, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(), member: m }] : [];
    }),
  };
}

export interface ConnectionItem {
  member: MemberCard;
  connectedAt: string;
}

/** Active connections, optionally filtered by name/keyword (Req 14). */
export async function listConnections(actorId: string, q = ''): Promise<ConnectionItem[]> {
  const rows = await prisma.connection.findMany({
    where: { removedAt: null, OR: [{ userAId: actorId }, { userBId: actorId }] },
    include: { userA: { include: cardInclude }, userB: { include: cardInclude } },
    orderBy: { createdAt: 'desc' },
  });
  const needle = q.trim().toLowerCase();
  const items: ConnectionItem[] = [];
  for (const r of rows) {
    const other = r.userAId === actorId ? r.userB : r.userA;
    if (other.accountStatus !== 'ACTIVE') continue;
    const m = card(other as unknown as UserWithProfile, true, 'connected');
    if (!m) continue;
    if (needle) {
      const hay = [m.name, m.headline, m.companyName, m.location, ...(other.profile?.expertiseAreas ?? [])].join(' ').toLowerCase();
      if (!hay.includes(needle)) continue;
    }
    items.push({ member: m, connectedAt: r.createdAt.toISOString() });
  }
  return items;
}

/** Soft-removes a connection; history stays read-only (Req 21.6). */
export async function removeConnection(actorId: string, otherId: string) {
  const res = await prisma.connection.updateMany({
    where: { ...pair(actorId, otherId), removedAt: null },
    data: { removedAt: new Date() },
  });
  if (res.count === 0) throw Errors.notFound('Connection');
}

/** The request the profile page acts on: an incoming one wins over an outgoing one. */
export async function pendingRequestBetween(viewerId: string, otherId: string) {
  const now = new Date();
  const incoming = await prisma.connectionRequest.findFirst({
    where: { senderId: otherId, receiverId: viewerId, status: 'PENDING', expiresAt: { gt: now } },
    select: { id: true, message: true },
  });
  if (incoming) return { id: incoming.id, message: incoming.message };
  const outgoing = await prisma.connectionRequest.findFirst({
    where: { senderId: viewerId, receiverId: otherId, status: { in: ['PENDING', 'DECLINED'] }, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  return outgoing ? { id: outgoing.id, message: null } : null;
}

export async function expireConnectionRequests(): Promise<number> {
  const res = await prisma.connectionRequest.updateMany({
    where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED', respondedAt: new Date() },
  });
  return res.count;
}
