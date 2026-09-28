import type { ReportStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { Errors } from '@/lib/errors';
import { audit } from '../audit';

export async function listReports(status: ReportStatus | 'ALL' = 'OPEN') {
  const rows = await prisma.report.findMany({
    where: status === 'ALL' ? {} : { status },
    include: {
      reporter: { select: { id: true, name: true } },
      reportedUser: { select: { id: true, name: true, accountStatus: true } },
      resolvedBy: { select: { name: true } },
    },
    orderBy: { createdAt: status === 'OPEN' ? 'asc' : 'desc' },
    take: 200,
  });
  const ids = [...new Set(rows.map((r) => r.reportedUserId).filter((id): id is string => !!id))];
  const counts = await prisma.report.groupBy({
    by: ['reportedUserId'],
    where: { reportedUserId: { in: ids } },
    _count: { id: true },
  });
  const totals = new Map(counts.map((c) => [c.reportedUserId, c._count.id]));
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    messageExcerpt: r.messageExcerpt,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter, // null when the reporter deleted their account
    reportedUser: {
      id: r.reportedUser?.id ?? null,
      name: r.reportedUser?.name ?? `${r.reportedUserName} (account deleted)`,
      accountStatus: r.reportedUser?.accountStatus ?? null,
      totalReports: r.reportedUserId ? (totals.get(r.reportedUserId) ?? 1) : 1,
    },
    resolvedBy: r.resolvedBy?.name ?? null,
    resolutionNote: r.resolutionNote,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }));
}

export async function resolveReport(actorId: string, id: string, status: 'RESOLVED' | 'DISMISSED', note?: string | null) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.report.updateMany({
      where: { id, status: 'OPEN' },
      data: { status, resolvedById: actorId, resolutionNote: note?.trim() || null, resolvedAt: new Date() },
    });
    if (res.count === 0) throw Errors.notFound('Open report');
    await audit(tx, { actorId, action: `report.${status.toLowerCase()}`, targetType: 'report', targetId: id, details: note ? { note } : undefined });
  });
}
