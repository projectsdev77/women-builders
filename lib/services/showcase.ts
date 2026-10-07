import type { TestimonialStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { Errors } from '@/lib/errors';
import { formatLocation } from '@/lib/countries';
import { audit } from './audit';
import { ROLE_LABELS } from './profile-fields';
import { getSiteSettings, updateSiteSettings } from './site-settings';

/**
 * Public showcase and quotes (R3 F16). Everything here is opt-in: members choose to be
 * featured, admins pick up to 6 of them, and admins approve which quotes appear.
 */

export const SHOWCASE_MAX = 6;
export const QUOTE_MAX = 280;

// ---------------------------------------------------------------- member side

export async function setShowcaseOptIn(userId: string, optIn: boolean) {
  await prisma.user.update({ where: { id: userId }, data: { showcaseOptIn: optIn } });
  // Switching it off removes her from the site immediately.
  if (!optIn) {
    const settings = await getSiteSettings();
    if (settings.showcase.includes(userId)) {
      await prisma.siteSetting.update({ where: { key: 'showcase' }, data: { value: settings.showcase.filter((id) => id !== userId) } });
    }
  }
}

export const quoteSchema = z.object({
  text: z.string().trim().min(10, 'Write at least a sentence').max(QUOTE_MAX, `Keep it under ${QUOTE_MAX} characters`),
});

/** One quote from Settings per member: a new one replaces the previous one. */
export async function submitQuote(userId: string, text: string) {
  return prisma.$transaction(async (tx) => {
    await tx.testimonial.deleteMany({ where: { authorId: userId, winId: null } });
    return tx.testimonial.create({ data: { authorId: userId, text }, select: { id: true, status: true } });
  });
}

export async function withdrawQuote(userId: string, id: string) {
  const res = await prisma.testimonial.deleteMany({ where: { id, authorId: userId } });
  if (!res.count) throw Errors.notFound('Quote');
}

export async function myPublicPresence(userId: string) {
  const [user, quotes, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { showcaseOptIn: true } }),
    prisma.testimonial.findMany({ where: { authorId: userId }, orderBy: { createdAt: 'desc' }, select: { id: true, text: true, status: true, winId: true } }),
    getSiteSettings(),
  ]);
  return { showcaseOptIn: user.showcaseOptIn, featured: settings.showcase.includes(userId), quotes };
}

// ---------------------------------------------------------------- admin side

export async function listQuotes(status: TestimonialStatus) {
  const rows = await prisma.testimonial.findMany({
    where: { status, author: { accountStatus: 'ACTIVE' } },
    include: { author: { select: { id: true, name: true, profile: { select: { primaryRole: true, headline: true } } } } },
    orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' },
    take: 100,
  });
  return rows.map((t) => ({
    id: t.id,
    text: t.text,
    fromWin: !!t.winId,
    createdAt: t.createdAt.toISOString(),
    author: { id: t.author.id, name: t.author.name, role: t.author.profile ? ROLE_LABELS[t.author.profile.primaryRole] : null, headline: t.author.profile?.headline ?? null },
  }));
}

export async function decideQuote(adminId: string, id: string, approve: boolean) {
  await prisma.$transaction(async (tx) => {
    const res = await tx.testimonial.updateMany({ where: { id }, data: { status: approve ? 'APPROVED' : 'REJECTED', decidedAt: new Date(), decidedById: adminId } });
    if (!res.count) throw Errors.notFound('Quote');
    await audit(tx, { actorId: adminId, action: approve ? 'quote.approve' : 'quote.reject', targetType: 'testimonial', targetId: id });
  });
}

/** Members who opted in, for the admin picker. */
export async function showcaseCandidates() {
  const rows = await prisma.user.findMany({
    where: { showcaseOptIn: true, accountStatus: 'ACTIVE', profile: { isNot: null } },
    select: { id: true, name: true, profile: { select: { headline: true, photoKey: true } } },
    orderBy: { name: 'asc' },
  });
  return rows.map((u) => ({ id: u.id, name: u.name, headline: u.profile?.headline ?? null, hasPhoto: !!u.profile?.photoKey }));
}

export async function setShowcase(adminId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length > SHOWCASE_MAX) throw Errors.validation(`Choose up to ${SHOWCASE_MAX} members.`);
  const ok = await prisma.user.count({ where: { id: { in: unique }, showcaseOptIn: true, accountStatus: 'ACTIVE', profile: { isNot: null } } });
  if (ok !== unique.length) throw Errors.validation('Only members who opted in can be featured.');
  await updateSiteSettings(adminId, { showcase: unique });
}

// ---------------------------------------------------------------- public side

/** The featured members actually shown: still opted in, still active, in the admin's order. */
async function showcasedIds() {
  const settings = await getSiteSettings();
  if (!settings.showcase.length) return [];
  const ok = await prisma.user.findMany({
    where: { id: { in: settings.showcase }, showcaseOptIn: true, accountStatus: 'ACTIVE', profile: { isNot: null } },
    select: { id: true },
  });
  const okSet = new Set(ok.map((u) => u.id));
  return settings.showcase.filter((id) => okSet.has(id));
}

export async function isShowcased(userId: string) {
  return (await showcasedIds()).includes(userId);
}

/** Name, photo, headline, role and city only (R3 F16). */
export async function publicShowcase() {
  const ids = await showcasedIds();
  if (!ids.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, profile: { select: { headline: true, primaryRole: true, city: true, country: true, photoKey: true, photoVersion: true, hiddenFields: true } } },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return ids.map((id) => {
    const u = byId.get(id)!;
    const p = u.profile!;
    return {
      name: u.name,
      headline: p.headline,
      role: ROLE_LABELS[p.primaryRole],
      roleKey: p.primaryRole,
      // Respect "location hidden from non-connections": the public is not a connection.
      city: p.hiddenFields.includes('location') ? null : formatLocation(p.city, p.country) || null,
      photoUrl: p.photoKey ? `/api/public/showcase-photo/${u.id}?v=${p.photoVersion}` : null,
    };
  });
}

/** Approved quotes from active members; quotes from wins only while the win is still quotable. */
export async function publicQuotes(take = 6) {
  const rows = await prisma.testimonial.findMany({
    where: {
      status: 'APPROVED',
      author: { accountStatus: 'ACTIVE' },
      OR: [{ winId: null }, { win: { visibility: 'QUOTABLE' } }],
    },
    include: { author: { select: { name: true, profile: { select: { primaryRole: true } } } } },
    orderBy: { decidedAt: 'desc' },
    take,
  });
  return rows.map((t) => ({ id: t.id, text: t.text, name: t.author.name, role: t.author.profile ? ROLE_LABELS[t.author.profile.primaryRole] : null }));
}
