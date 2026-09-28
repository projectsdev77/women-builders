import type { OutreachStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { OUTREACH_STATUSES, followUpQueue } from './prospects';
import { addDays, formatDateOnly, todayInAppTz } from './dates';

export interface DateRange {
  from: Date;
  to: Date; // exclusive
}

export function defaultRange(): DateRange {
  const to = addDays(todayInAppTz(), 1);
  return { from: addDays(to, -90), to };
}

/**
 * Dashboard metrics (Req 20). Conversion: for each status, prospects who entered it in
 * the range and how many of those later reached APPROVED (non-linear funnel, G16).
 */
export async function dashboardMetrics(range: DateRange) {
  const [activeMembers, pendingVerified, pendingUnverified, openReports, byStatusRaw, changes, approvals, followUps] = await Promise.all([
    prisma.user.count({ where: { accountStatus: 'ACTIVE', profile: { isNot: null } } }),
    prisma.user.count({ where: { accountStatus: 'PENDING', emailVerifiedAt: { not: null } } }),
    prisma.user.count({ where: { accountStatus: 'PENDING', emailVerifiedAt: null } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.potentialMember.groupBy({ by: ['outreachStatus'], where: { archivedAt: null }, _count: { _all: true } }),
    prisma.potentialMemberStatusChange.findMany({
      where: { createdAt: { gte: range.from, lt: range.to } },
      select: { potentialMemberId: true, toStatus: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { approvedAt: { gte: addDays(range.from, -366), lt: range.to } },
      select: { approvedAt: true },
    }),
    followUpQueue({ withinDays: 7 }),
  ]);

  const potentialMembersByStatus = Object.fromEntries(OUTREACH_STATUSES.map((s) => [s, 0])) as Record<OutreachStatus, number>;
  for (const r of byStatusRaw) potentialMembersByStatus[r.outreachStatus] = r._count._all;

  // Earliest APPROVED per prospect (any time) to test "later reached approved".
  const approvedRows = await prisma.potentialMemberStatusChange.findMany({
    where: { toStatus: 'APPROVED', potentialMemberId: { in: [...new Set(changes.map((c) => c.potentialMemberId))] } },
    select: { potentialMemberId: true, createdAt: true },
  });
  const approvedAt = new Map<string, Date>();
  for (const a of approvedRows) {
    const prev = approvedAt.get(a.potentialMemberId);
    if (!prev || a.createdAt > prev) approvedAt.set(a.potentialMemberId, a.createdAt);
  }
  const conversion = OUTREACH_STATUSES.map((status) => {
    const entered = new Map<string, Date>();
    for (const c of changes) if (c.toStatus === status && !entered.has(c.potentialMemberId)) entered.set(c.potentialMemberId, c.createdAt);
    let reachedApproved = 0;
    for (const [id, at] of entered) {
      const ap = approvedAt.get(id);
      if (ap && ap >= at) reachedApproved++;
    }
    return {
      status,
      entered: entered.size,
      reachedApproved,
      rate: entered.size ? Math.round((100 * reachedApproved) / entered.size) : null,
    };
  });

  // Member growth by approval month (Req 20.3 R2), last 12 months up to the range end.
  const months: Array<{ month: string; newMembers: number }> = [];
  const end = new Date(range.to.getTime() - 1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    months.push({ month: d.toISOString().slice(0, 7), newMembers: 0 });
  }
  for (const a of approvals) {
    const key = a.approvedAt!.toISOString().slice(0, 7);
    const m = months.find((x) => x.month === key);
    if (m) m.newMembers++;
  }
  const newMembersInRange = approvals.filter((a) => a.approvedAt! >= range.from).length;

  return {
    range: { from: formatDateOnly(range.from)!, to: formatDateOnly(addDays(range.to, -1))! },
    activeMembers,
    newMembersInRange,
    pendingApplications: { verified: pendingVerified, unverified: pendingUnverified },
    openReports,
    potentialMembersByStatus,
    conversion,
    memberGrowth: months,
    upcomingFollowUps: followUps,
  };
}

export async function listAuditLog(page = 1, limit = 50) {
  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    entries: rows.map((r) => ({
      id: r.id,
      actor: r.actor?.name ?? 'System',
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      details: r.details,
      createdAt: r.createdAt.toISOString(),
    })),
    pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}
