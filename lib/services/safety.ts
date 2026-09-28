import type { ReportReason } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Errors } from '@/lib/errors';
import { LIMITS } from '@/lib/config';
import { pair } from './relationships';

/**
 * Block (Req 21.1–21.2): silent to the blocked member; removes any connection and
 * cancels pending requests in both directions.
 */
export async function blockMember(actorId: string, targetId: string) {
  if (actorId === targetId) throw Errors.validation("You can't block yourself.");
  const target = await prisma.user.count({ where: { id: targetId } });
  if (!target) throw Errors.notFound('Member');
  const now = new Date();
  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: actorId, blockedId: targetId } },
      create: { blockerId: actorId, blockedId: targetId },
      update: {},
    }),
    prisma.connection.updateMany({ where: { ...pair(actorId, targetId), removedAt: null }, data: { removedAt: now } }),
    prisma.connectionRequest.updateMany({
      where: {
        status: { in: ['PENDING', 'DECLINED'] },
        OR: [
          { senderId: actorId, receiverId: targetId },
          { senderId: targetId, receiverId: actorId },
        ],
      },
      data: { status: 'CANCELLED', respondedAt: now },
    }),
  ]);
}

/** Unblocking does not restore the connection (Req 21.3). */
export async function unblockMember(actorId: string, targetId: string) {
  await prisma.block.deleteMany({ where: { blockerId: actorId, blockedId: targetId } });
}

export async function listBlocked(actorId: string) {
  const rows = await prisma.block.findMany({
    where: { blockerId: actorId },
    include: { blocked: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({ id: r.blocked.id, name: r.blocked.name, blockedAt: r.createdAt.toISOString() }));
}

export const REPORT_REASONS: Record<ReportReason, string> = {
  HARASSMENT: 'Harassment or unwanted contact',
  SPAM: 'Spam or unsolicited selling',
  FAKE_PROFILE: 'Fake or impersonating profile',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  OTHER: 'Something else',
};

/** Report a member, optionally a specific message from them to you (Req 21.4). */
export async function reportMember(
  actorId: string,
  input: { memberId: string; reason: ReportReason; details?: string | null; messageId?: string | null },
) {
  if (actorId === input.memberId) throw Errors.validation("You can't report yourself.");
  const target = await prisma.user.count({ where: { id: input.memberId } });
  if (!target) throw Errors.notFound('Member');
  let messageExcerpt: string | null = null;
  if (input.messageId) {
    const msg = await prisma.message.findFirst({
      where: { id: input.messageId, senderId: input.memberId, receiverId: actorId },
    });
    if (!msg) throw Errors.notFound('Message');
    messageExcerpt = msg.content;
  }
  const details = input.details?.trim() || null;
  if (details && details.length > LIMITS.reportDetailsMax) {
    throw Errors.validation(`Keep details under ${LIMITS.reportDetailsMax} characters.`);
  }
  const report = await prisma.report.create({
    data: {
      reporterId: actorId,
      reportedUserId: input.memberId,
      reason: input.reason,
      details,
      messageId: input.messageId ?? null,
      messageExcerpt,
    },
  });
  return { reportId: report.id };
}
