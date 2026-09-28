import { prisma } from '@/lib/db';
import { DURATIONS_MS } from '@/lib/config';

/**
 * Soft-archives prospects closed as NOT_INTERESTED / NOT_A_FIT with no activity for
 * 2 years. Never deletes, and never touches DO_NOT_CONTACT (G8).
 */
export async function archiveOldProspects(): Promise<number> {
  const res = await prisma.potentialMember.updateMany({
    where: {
      archivedAt: null,
      outreachStatus: { in: ['NOT_INTERESTED', 'NOT_A_FIT'] },
      updatedAt: { lt: new Date(Date.now() - DURATIONS_MS.prospectRetention) },
    },
    data: { archivedAt: new Date() },
  });
  return res.count;
}
