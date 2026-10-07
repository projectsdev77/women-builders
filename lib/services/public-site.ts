import { prisma } from '@/lib/db';
import { PUBLIC_NUMBER_THRESHOLDS } from '@/lib/config';
import { countryName } from '@/lib/countries';
import { GATHERING_TYPE_LABELS } from './gatherings';

/**
 * Live numbers for the public homepage (R3 F1). Every number comes from real data, and a
 * number is shown only once it passes its threshold.
 */
export async function publicNumbers() {
  const [members, countries, introductions, gatherings] = await Promise.all([
    prisma.profile.count({ where: { user: { accountStatus: 'ACTIVE' } } }),
    // Hidden locations count in the total but are never shown individually.
    prisma.profile.findMany({ where: { user: { accountStatus: 'ACTIVE' }, country: { not: null } }, distinct: ['country'], select: { country: true } }),
    prisma.introduction.count({ where: { status: 'ACCEPTED' } }),
    prisma.gathering.count({ where: { status: 'SCHEDULED', startsAt: { lt: new Date() }, seats: { some: { attendance: 'ATTENDED' } } } }),
  ]);
  const raw = { members, countries: countries.length, introductions, gatherings };
  const labels = { members: 'Members', countries: 'Countries', introductions: 'Introductions made', gatherings: 'Gatherings held' } as const;
  return (Object.keys(raw) as Array<keyof typeof raw>)
    .filter((k) => raw[k] >= PUBLIC_NUMBER_THRESHOLDS[k])
    .map((k) => ({ key: k, value: raw[k], label: labels[k] }));
}

/** Upcoming gatherings an admin chose to show publicly: type, title, city (or online) and month only. */
export async function publicGatherings() {
  const rows = await prisma.gathering.findMany({
    where: { showOnPublicSite: true, status: 'SCHEDULED', startsAt: { gt: new Date() }, audience: { not: 'INVITE_ONLY' } },
    orderBy: { startsAt: 'asc' },
    take: 6,
    select: { id: true, title: true, type: true, online: true, city: true, country: true, startsAt: true, timeZone: true },
  });
  return rows.map((g) => ({
    id: g.id,
    title: g.title,
    type: GATHERING_TYPE_LABELS[g.type],
    place: g.online ? 'Online' : [g.city, countryName(g.country)].filter(Boolean).join(', '),
    month: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: g.timeZone }).format(g.startsAt),
  }));
}
