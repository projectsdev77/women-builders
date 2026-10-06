import { prisma } from '@/lib/db';
import { CHARTER_VERSION } from '@/content/charter';
import { enqueueEmail } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';

export async function acceptCharter(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { charterVersion: CHARTER_VERSION, charterAcceptedAt: new Date(), charterNoticeVersion: CHARTER_VERSION },
  });
}

/**
 * When the charter version goes up, email each active member once (R3 F2). Members who
 * joined before the charter existed (version null) get the email too.
 */
export async function sendCharterNotices(): Promise<number> {
  const members = await prisma.user.findMany({
    where: {
      accountStatus: 'ACTIVE',
      OR: [{ charterVersion: null }, { charterVersion: { lt: CHARTER_VERSION } }],
      AND: [{ OR: [{ charterNoticeVersion: null }, { charterNoticeVersion: { lt: CHARTER_VERSION } }] }],
    },
    select: { id: true, email: true, name: true },
    take: 500,
  });
  for (const m of members) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: m.id }, data: { charterNoticeVersion: CHARTER_VERSION } });
      await enqueueEmail(tx, { to: m.email, kind: 'charter_updated', content: templates.charterUpdated(m.name.split(' ')[0]!) });
    });
  }
  return members.length;
}
