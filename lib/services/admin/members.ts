import type { AccountStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { audit } from '../audit';
import { changeProspectStatus } from '../prospect-status';

export async function listMembers(opts: { q?: string; status?: AccountStatus | 'ALL'; admins?: boolean; page?: number; limit?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, opts.limit ?? 25);
  const where: Prisma.UserWhereInput = {};
  if (opts.status && opts.status !== 'ALL') where.accountStatus = opts.status;
  if (opts.admins) where.isAdmin = true;
  if (opts.q?.trim()) {
    const c = { contains: opts.q.trim(), mode: 'insensitive' as const };
    where.OR = [{ name: c }, { email: c }, { profile: { headline: c } }, { profile: { companyName: c } }];
  }
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        profile: { select: { primaryRole: true, headline: true, completenessScore: true } },
        _count: { select: { reportsReceived: { where: { status: 'OPEN' } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return {
    members: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.accountStatus === 'DELETED' ? '' : u.email, // erased on deletion
      isAdmin: u.isAdmin,
      accountStatus: u.accountStatus,
      deactivatedBy: u.deactivatedBy,
      primaryRole: u.profile?.primaryRole ?? null,
      headline: u.profile?.headline ?? null,
      completenessScore: u.profile?.completenessScore ?? null,
      createdAt: u.createdAt.toISOString(),
      approvedAt: u.approvedAt?.toISOString() ?? null,
      lastActiveAt: u.lastActiveAt.toISOString(),
      openReports: u._count.reportsReceived,
    })),
    pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/** Admins see every field regardless of privacy settings (Req 8.1). */
export async function getMemberDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      potentialMember: { select: { id: true, name: true, outreachStatus: true } },
      reportsReceived: { orderBy: { createdAt: 'desc' }, take: 20, include: { reporter: { select: { id: true, name: true } } } },
    },
  });
  if (!user) throw Errors.notFound('Member');
  const [connections, messagesSent, requestsSent, history] = await Promise.all([
    prisma.connection.count({ where: { removedAt: null, OR: [{ userAId: userId }, { userBId: userId }] } }),
    prisma.message.count({ where: { senderId: userId } }),
    prisma.connectionRequest.count({ where: { senderId: userId } }),
    prisma.auditLog.findMany({
      where: { targetType: 'user', targetId: userId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);
  const { passwordHash: _passwordHash, ...safe } = user;
  return { user: safe, stats: { connections, messagesSent, requestsSent }, history };
}

export async function deactivateMember(actorId: string, userId: string, reason?: string | null) {
  if (actorId === userId) throw Errors.validation("You can't deactivate your own account here. Use Settings.");
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') throw Errors.notFound('Active member');
    await tx.user.update({ where: { id: userId }, data: { accountStatus: 'DEACTIVATED', deactivatedBy: 'ADMIN' } });
    // End every session now; DB-backed sessions make this immediate (G3).
    await tx.session.deleteMany({ where: { userId } });
    await enqueueEmail(tx, { to: user.email, kind: 'account_deactivated', content: templates.accountDeactivated() });
    await audit(tx, { actorId, action: 'member.deactivate', targetType: 'user', targetId: userId, details: reason ? { reason } : undefined });
  });
}

export async function reactivateMember(actorId: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'DEACTIVATED') throw Errors.notFound('Deactivated member');
    await tx.user.update({ where: { id: userId }, data: { accountStatus: 'ACTIVE', deactivatedBy: null } });
    await audit(tx, { actorId, action: 'member.reactivate', targetType: 'user', targetId: userId });
  });
}

/** Grant/revoke admin (Req 23): never yourself, never the last admin. */
export async function setAdmin(actorId: string, userId: string, isAdmin: boolean) {
  if (actorId === userId) throw Errors.validation("You can't change your own admin access.");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('admins'))`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw Errors.notFound('Member');
    if (isAdmin && user.accountStatus !== 'ACTIVE') throw Errors.validation('Only active accounts can be admins.');
    if (!isAdmin && user.isAdmin) {
      const remaining = await tx.user.count({ where: { isAdmin: true, accountStatus: 'ACTIVE', id: { not: userId } } });
      if (remaining === 0) throw Errors.validation("You can't remove the last admin.");
    }
    await tx.user.update({ where: { id: userId }, data: { isAdmin } });
    await audit(tx, { actorId, action: isAdmin ? 'admin.grant' : 'admin.revoke', targetType: 'user', targetId: userId });
  });
}

export async function listAdmins() {
  return prisma.user.findMany({
    where: { isAdmin: true, accountStatus: 'ACTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}
