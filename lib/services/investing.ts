import { prisma } from '@/lib/db';
import { Errors } from '@/lib/errors';
import { templates } from '@/lib/email/templates';
import { INVESTING_CONFIRM_EVERY_DAYS } from './profile-fields';
import { notify } from './notifications';

const DAY = 86_400_000;
const isInvestor = { OR: [{ primaryRole: 'INVESTOR' as const }, { secondaryRoles: { has: 'INVESTOR' as const } }] };

/** True when an investor should see the "Are you still investing?" prompt on Home (R3 F9). */
export function needsInvestingCheck(
  p: { primaryRole: string; secondaryRoles: string[]; currentlyInvesting: boolean | null; investingConfirmedAt: Date | null },
  now = new Date(),
) {
  if (p.primaryRole !== 'INVESTOR' && !p.secondaryRoles.includes('INVESTOR')) return false;
  if (p.currentlyInvesting == null || !p.investingConfirmedAt) return true;
  return now.getTime() - p.investingConfirmedAt.getTime() > INVESTING_CONFIRM_EVERY_DAYS * DAY;
}

/** "Yes, still investing" or "Paused". Either answer counts as a confirmation. */
export async function setInvestingStatus(userId: string, investing: boolean) {
  const p = await prisma.profile.findUnique({ where: { userId }, select: { primaryRole: true, secondaryRoles: true } });
  if (!p || (p.primaryRole !== 'INVESTOR' && !p.secondaryRoles.includes('INVESTOR'))) {
    throw Errors.validation('Only members with the investor role can set this.');
  }
  return prisma.profile.update({
    where: { userId },
    data: { currentlyInvesting: investing, investingConfirmedAt: new Date() },
    select: { currentlyInvesting: true, investingConfirmedAt: true },
  });
}

/**
 * Daily: email investors whose answer is older than 90 days (or missing), at most once
 * per 90 days, respecting the "Investing check-ins" email preference.
 */
export async function sendInvestingCheckins(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - INVESTING_CONFIRM_EVERY_DAYS * DAY);
  const due = await prisma.profile.findMany({
    where: {
      ...isInvestor,
      user: { accountStatus: 'ACTIVE' },
      AND: [
        { OR: [{ investingConfirmedAt: null }, { investingConfirmedAt: { lt: cutoff } }] },
        { OR: [{ investingCheckSentAt: null }, { investingCheckSentAt: { lt: cutoff } }] },
      ],
    },
    select: { userId: true, user: { select: { name: true } } },
    take: 500,
  });
  for (const p of due) {
    await prisma.$transaction(async (tx) => {
      await tx.profile.update({ where: { userId: p.userId }, data: { investingCheckSentAt: now } });
      await notify(tx, p.userId, 'investing_checkin', (u) => templates.investingCheckin(p.user.name.split(' ')[0]!, u));
    });
  }
  return due.length;
}
