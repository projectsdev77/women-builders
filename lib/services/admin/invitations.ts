import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { DURATIONS_MS, appUrl } from '@/lib/config';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { randomToken, sha256 } from '@/lib/security/tokens';
import { normalizeEmail } from '@/lib/validation/common';
import { audit } from '../audit';
import { changeProspectStatus } from '../prospect-status';

/** Invite by email, optionally linked to a prospect (Req 22). Refuses do-not-contact (G8). */
export async function createInvitation(actorId: string, input: { email?: string | null; potentialMemberId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const prospect = input.potentialMemberId
      ? await tx.potentialMember.findUnique({ where: { id: input.potentialMemberId } })
      : null;
    if (input.potentialMemberId && !prospect) throw Errors.notFound('Potential member');
    const email = input.email ? normalizeEmail(input.email) : prospect?.email;
    if (!email) throw Errors.validation('This potential member has no email address. Add one first.');

    const dnc = await tx.potentialMember.findFirst({
      where: {
        outreachStatus: 'DO_NOT_CONTACT',
        OR: [{ email }, ...(prospect?.linkedInUrl ? [{ linkedInUrl: prospect.linkedInUrl }] : [])],
      },
    });
    if (dnc || prospect?.outreachStatus === 'DO_NOT_CONTACT') {
      throw new AppError('DO_NOT_CONTACT', 'This person asked not to be contacted.', 409);
    }
    const member = await tx.user.findUnique({ where: { email } });
    if (member && member.accountStatus !== 'REJECTED') throw new AppError('ALREADY_MEMBER', 'This email already has an account.', 409);

    // One live invitation per email.
    await tx.invitation.updateMany({ where: { email, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const token = randomToken();
    const invitation = await tx.invitation.create({
      data: {
        email,
        tokenHash: sha256(token),
        potentialMemberId: prospect?.id ?? null,
        invitedById: actorId,
        expiresAt: new Date(Date.now() + DURATIONS_MS.invitation),
      },
    });
    const inviter = await tx.user.findUnique({ where: { id: actorId }, select: { name: true } });
    const url = `${appUrl()}/register?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    await enqueueEmail(tx, { to: email, kind: 'invitation', content: templates.invitation(url, inviter?.name) });
    if (prospect) await changeProspectStatus(tx, prospect.id, 'INVITED', actorId);
    await audit(tx, { actorId, action: 'invitation.create', targetType: 'invitation', targetId: invitation.id, details: { email } });
    return { id: invitation.id, email, expiresAt: invitation.expiresAt.toISOString() };
  });
}

export async function revokeInvitation(actorId: string, id: string) {
  const res = await prisma.invitation.updateMany({ where: { id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
  if (res.count === 0) throw Errors.notFound('Open invitation');
  await audit(prisma, { actorId, action: 'invitation.revoke', targetType: 'invitation', targetId: id });
}

export async function listInvitations() {
  const rows = await prisma.invitation.findMany({
    include: { invitedBy: { select: { name: true } }, potentialMember: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const now = new Date();
  return rows.map((i) => ({
    id: i.id,
    email: i.email,
    invitedBy: i.invitedBy?.name ?? null,
    prospect: i.potentialMember,
    createdAt: i.createdAt.toISOString(),
    expiresAt: i.expiresAt.toISOString(),
    status: i.usedAt ? 'accepted' : i.revokedAt ? 'revoked' : i.expiresAt < now ? 'expired' : 'pending',
  }));
}
