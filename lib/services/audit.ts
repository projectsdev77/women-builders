import type { Prisma } from '@prisma/client';
import type { Tx } from '@/lib/db';

export async function audit(
  db: Tx,
  entry: {
    actorId: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    details?: Prisma.InputJsonValue;
  },
) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      details: entry.details,
    },
  });
}
