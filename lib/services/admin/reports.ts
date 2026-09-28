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
  const counts = await prisma.report.groupBy({
    by: ['reportedUserId'],
    where: { reportedUserId: { in: rows.map((r) => r.reportedUserId) } },
    _count: { _all: true },
  });
  const totals = new Map(counts.map((c) => [c.reportedUserId, c._count._all]));
  return rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    messageExcerpt: r.messageExcerpt,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    reporter: r.reporter,
    reportedUser: { ...r.reportedUser, totalReports: totals.get(r.reportedUserId) ?? 1 },
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
