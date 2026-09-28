import type { OutreachStatus } from '@prisma/client';
import type { Tx } from '@/lib/db';

/**
 * The single path for changing a prospect's outreach status: every change is
 * recorded in PotentialMemberStatusChange (G16).
 */
export async function changeProspectStatus(
  db: Tx,
  potentialMemberId: string,
  toStatus: OutreachStatus,
  actorId: string | null,
) {
  const current = await db.potentialMember.findUnique({
    where: { id: potentialMemberId },
    select: { outreachStatus: true },
  });
  if (!current || current.outreachStatus === toStatus) return;
  await db.potentialMember.update({
    where: { id: potentialMemberId },
    data: { outreachStatus: toStatus },
  });
  await db.potentialMemberStatusChange.create({
    data: { potentialMemberId, fromStatus: current.outreachStatus, toStatus, changedById: actorId },
  });
}
