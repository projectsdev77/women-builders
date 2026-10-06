import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { DURATIONS_MS, LIMITS } from '@/lib/config';
import { lock } from './locks';
import { isBlockedEitherWay, pair } from './relationships';
import { notifyNewMessage } from './notifications';
import { photoUrl } from './photo-url';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type ConversationState =
  | { canSend: true }
  | { canSend: false; reason: 'not_connected' | 'removed' | 'inactive' | 'deleted' };

const READ_ONLY_COPY = {
  not_connected: 'You can only message your connections.',
  removed: 'This connection was removed. The conversation is read-only.',
  inactive: 'This member is no longer active. The conversation is read-only.',
  deleted: 'This account was deleted. You can still read your conversation, but it is read-only.',
} as const;

/**
 * Loads the connection between actor and other. Blocked pairs are hidden entirely (404),
 * matching "invisible to each other everywhere" (Req 21.1).
 */
async function loadConversation(db: Tx | typeof prisma, actorId: string, otherId: string) {
  if (actorId === otherId) throw Errors.notFound('Conversation');
  if (await isBlockedEitherWay(db, actorId, otherId)) throw Errors.notFound('Conversation');
  const [connection, other] = await Promise.all([
    db.connection.findUnique({ where: { userAId_userBId: pair(actorId, otherId) } }),
    db.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, accountStatus: true, profile: { select: { headline: true, photoKey: true, photoVersion: true } } } }),
  ]);
  if (!connection || !other) throw Errors.notFound('Conversation');
  const state: ConversationState = connection.removedAt
    ? { canSend: false, reason: 'removed' }
    : other.accountStatus === 'DELETED'
      ? { canSend: false, reason: 'deleted' }
      : other.accountStatus !== 'ACTIVE'
        ? { canSend: false, reason: 'inactive' }
        : { canSend: true };
  return { connection, other, state };
}

export async function sendMessage(senderId: string, otherId: string, rawContent: string) {
  const content = rawContent.trim();
  if (!content) throw Errors.validation('Write a message first.');
  if (content.length > LIMITS.messageMax) {
    throw Errors.validation(`Messages can be at most ${LIMITS.messageMax.toLocaleString()} characters.`);
  }
  const result = await prisma.$transaction(async (tx) => {
    await lock(tx, `message:${senderId}`); // serializes the unanswered-message check
    const conv = await loadConversation(tx, senderId, otherId).catch((e) => {
      if (e instanceof AppError && e.code === 'NOT_FOUND') {
        throw new AppError('CANNOT_MESSAGE', READ_ONLY_COPY.not_connected, 403);
      }
      throw e;
    });
    if (!conv.state.canSend) throw new AppError('CANNOT_MESSAGE', READ_ONLY_COPY[conv.state.reason], 403);

    // No daily message cap (owner decision): messaging is already limited to accepted
    // connections, and block/report cover abuse. The only limit is the one below.
    // Stop one-sided floods: max N messages in a row without a reply (G1).
    const lastReply = await tx.message.findFirst({
      where: { connectionId: conv.connection.id, senderId: otherId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const unanswered = await tx.message.count({
      where: { connectionId: conv.connection.id, senderId, ...(lastReply ? { createdAt: { gt: lastReply.createdAt } } : {}) },
    });
    if (unanswered >= LIMITS.unansweredMessagesPerConversation) {
      throw Errors.rateLimited(`You've sent ${LIMITS.unansweredMessagesPerConversation} messages without a reply. Wait for ${conv.other.name.split(' ')[0]} to respond.`);
    }

    const message = await tx.message.create({
      data: { connectionId: conv.connection.id, senderId, receiverId: otherId, content },
    });
    const sender = await tx.user.findUniqueOrThrow({ where: { id: senderId }, select: { name: true } });
    await notifyNewMessage(tx, {
      to: otherId,
      fromId: senderId,
      fromName: sender.name,
      connectionId: conv.connection.id,
      preview: content,
      bucketMs: DURATIONS_MS.messageEmailCoalesce,
    });
    return message;
  });
  return serialize(result, senderId);
}

function serialize(m: { id: string; senderId: string; content: string; createdAt: Date; readAt: Date | null }, actorId: string) {
  return {
    id: m.id,
    fromMe: m.senderId === actorId,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  };
}
export type MessageItem = ReturnType<typeof serialize>;

/** Chronological history (Req 4.4). `after` lets the 3s poll fetch only new messages. */
export async function getConversation(actorId: string, otherId: string, opts: { after?: string } = {}) {
  const conv = await loadConversation(prisma, actorId, otherId);
  let afterDate: Date | undefined;
  if (opts.after) {
    const ref = await prisma.message.findFirst({ where: { id: opts.after, connectionId: conv.connection.id }, select: { createdAt: true } });
    afterDate = ref?.createdAt;
  }
  const messages = await prisma.message.findMany({
    where: { connectionId: conv.connection.id, ...(afterDate ? { createdAt: { gt: afterDate } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: afterDate ? 200 : 500,
  });
  return {
    other: {
      id: conv.other.id,
      name: conv.other.name,
      headline: conv.other.profile?.headline ?? null,
      active: conv.other.accountStatus === 'ACTIVE',
      deleted: conv.other.accountStatus === 'DELETED',
      photoUrl: conv.other.profile ? photoUrl(conv.other.id, conv.other.profile) : null,
    },
    state: conv.state.canSend ? { canSend: true as const } : { canSend: false as const, reason: conv.state.reason, message: READ_ONLY_COPY[conv.state.reason] },
    messages: messages.map((m) => serialize(m, actorId)),
  };
}

/** Marks everything the other member sent me as read (actor must be the receiver, G2). */
export async function markConversationRead(actorId: string, otherId: string) {
  const conv = await loadConversation(prisma, actorId, otherId);
  const res = await prisma.message.updateMany({
    where: { connectionId: conv.connection.id, receiverId: actorId, readAt: null },
    data: { readAt: new Date() },
  });
  return { marked: res.count };
}

export interface ConversationSummary {
  member: { id: string; name: string; headline: string | null; active: boolean; deleted: boolean; photoUrl: string | null };
  lastMessage: MessageItem | null;
  unreadCount: number;
  readOnly: boolean;
}

/** Conversation list sorted by recent activity (unblocked pairs only). */
export async function listConversations(actorId: string): Promise<ConversationSummary[]> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: actorId }, { blockedId: actorId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blocked = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));
  const connections = await prisma.connection.findMany({
    where: { OR: [{ userAId: actorId }, { userBId: actorId }] },
    include: {
      userA: { select: { id: true, name: true, accountStatus: true, profile: { select: { headline: true, photoKey: true, photoVersion: true } } } },
      userB: { select: { id: true, name: true, accountStatus: true, profile: { select: { headline: true, photoKey: true, photoVersion: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  const unread = await prisma.message.groupBy({
    by: ['connectionId'],
    where: { receiverId: actorId, readAt: null },
    _count: { _all: true },
  });
  const unreadMap = new Map(unread.map((u) => [u.connectionId, u._count._all]));

  return connections
    .map((c) => {
      const other = c.userAId === actorId ? c.userB : c.userA;
      return { c, other, last: c.messages[0] ?? null };
    })
    .filter(({ c, other, last }) => !blocked.has(other.id) && (last || (!c.removedAt && other.accountStatus === 'ACTIVE')))
    .sort((a, b) => (b.last?.createdAt ?? b.c.createdAt).getTime() - (a.last?.createdAt ?? a.c.createdAt).getTime())
    .map(({ c, other, last }) => ({
      member: {
        id: other.id,
        name: other.name,
        headline: other.profile?.headline ?? null,
        active: other.accountStatus === 'ACTIVE',
        deleted: other.accountStatus === 'DELETED',
        photoUrl: other.profile ? photoUrl(other.id, other.profile) : null,
      },
      lastMessage: last ? serialize(last, actorId) : null,
      unreadCount: unreadMap.get(c.id) ?? 0,
      readOnly: !!c.removedAt || other.accountStatus !== 'ACTIVE',
    }));
}
