import type { Tx } from '@/lib/db';
import { prisma } from '@/lib/db';

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'connected';

/** Canonical ordering for a connection pair (G6). */
export function pair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

export async function isBlockedEitherWay(db: Tx, a: string, b: string): Promise<boolean> {
  const count = await db.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return count > 0;
}

export async function activeConnection(db: Tx, a: string, b: string) {
  const c = await db.connection.findUnique({ where: { userAId_userBId: pair(a, b) } });
  return c && !c.removedAt ? c : null;
}

/**
 * Connection status as seen by `viewerId`. A declined request keeps looking
 * pending to its sender until it would have expired (silent decline, G6).
 */
export async function connectionStatus(db: Tx, viewerId: string, otherId: string): Promise<ConnectionStatus> {
  if (await activeConnection(db, viewerId, otherId)) return 'connected';
  // An incoming request wins over an outgoing (possibly silently declined) one.
  const received = await db.connectionRequest.findFirst({
    where: { senderId: otherId, receiverId: viewerId, status: 'PENDING' },
    select: { id: true },
  });
  if (received) return 'pending_received';
  const sent = await db.connectionRequest.findFirst({
    where: {
      senderId: viewerId,
      receiverId: otherId,
      OR: [{ status: 'PENDING' }, { status: 'DECLINED', expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return sent ? 'pending_sent' : 'none';
}

/** Bulk version for lists: ids of members the viewer is connected to / blocked with / pending with. */
export async function relationshipSets(viewerId: string) {
  const now = new Date();
  const [connections, blocks, sent, received] = await Promise.all([
    prisma.connection.findMany({
      where: { removedAt: null, OR: [{ userAId: viewerId }, { userBId: viewerId }] },
      select: { userAId: true, userBId: true },
    }),
    prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
      select: { blockerId: true, blockedId: true },
    }),
    prisma.connectionRequest.findMany({
      where: {
        senderId: viewerId,
        OR: [{ status: 'PENDING' }, { status: 'DECLINED', expiresAt: { gt: now } }],
      },
      select: { receiverId: true },
    }),
    prisma.connectionRequest.findMany({
      where: { receiverId: viewerId, status: 'PENDING' },
      select: { senderId: true },
    }),
  ]);
  return {
    connected: new Set(connections.map((c) => (c.userAId === viewerId ? c.userBId : c.userAId))),
    blocked: new Set(blocks.map((b) => (b.blockerId === viewerId ? b.blockedId : b.blockerId))),
    pendingSent: new Set(sent.map((r) => r.receiverId)),
    pendingReceived: new Set(received.map((r) => r.senderId)),
  };
}

export type RelationshipSets = Awaited<ReturnType<typeof relationshipSets>>;

export function statusFromSets(sets: RelationshipSets, otherId: string): ConnectionStatus {
  if (sets.connected.has(otherId)) return 'connected';
  if (sets.pendingReceived.has(otherId)) return 'pending_received';
  if (sets.pendingSent.has(otherId)) return 'pending_sent';
  return 'none';
}
