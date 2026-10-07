import type { Prisma, RoleType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { Errors } from '@/lib/errors';
import { DURATIONS_MS, LIMITS } from '@/lib/config';
import { INVESTING_UNCONFIRMED_AFTER_DAYS, OPTIONS, RAISING_STATUSES, normalizeTags } from './profile-fields';
import { countryName } from '@/lib/countries';
import { canSee, toMemberCard, type MemberCard, type ProfileWithUser, type Viewer } from './privacy';
import {
  calculateRelevance,
  relevanceInput,
  tokenize,
  type Reason,
  type RelevanceInput,
} from './relevance';
import { relationshipSets, statusFromSets, type RelationshipSets } from './relationships';
import { sameUpcomingGathering } from './gatherings';

export type Candidate = ProfileWithUser & { user: ProfileWithUser['user'] & { lastActiveAt: Date } };

export const candidateInclude = {
  user: { select: { id: true, name: true, approvedAt: true, createdAt: true, lastActiveAt: true, preferIntroductions: true } },
} as const;

export async function loadViewer(viewerId: string) {
  const p = await prisma.profile.findUnique({
    where: { userId: viewerId },
    include: { user: { select: { lastActiveAt: true } } },
  });
  if (!p) throw Errors.notFound('Profile');
  return relevanceInput(p, p.user.lastActiveAt);
}

/** Relevance input restricted to what the viewer may see of the target (G5). */
export function visibleInput(c: Candidate, viewer: Viewer): RelevanceInput {
  return {
    ...relevanceInput(c, c.user.lastActiveAt),
    needs: canSee(c, 'needs', viewer) ? c.needs : null,
    offerings: canSee(c, 'offerings', viewer) ? c.offerings : null,
    city: canSee(c, 'location', viewer) ? c.city : null,
  };
}

export async function mutualCounts(viewerConnections: Set<string>, candidateIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (viewerConnections.size === 0 || candidateIds.length === 0) return counts;
  const mine = [...viewerConnections];
  const rows = await prisma.connection.findMany({
    where: {
      removedAt: null,
      OR: [
        { userAId: { in: mine }, userBId: { in: candidateIds } },
        { userBId: { in: mine }, userAId: { in: candidateIds } },
      ],
    },
    select: { userAId: true, userBId: true },
  });
  for (const r of rows) {
    const candidate = viewerConnections.has(r.userAId) ? r.userBId : r.userAId;
    counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
  }
  return counts;
}

export const baseWhere = (viewerId: string, sets: RelationshipSets): Prisma.ProfileWhereInput => ({
  userId: { notIn: [viewerId, ...sets.blocked] },
  user: { accountStatus: 'ACTIVE' },
});

// ---------------------------------------------------------------- search

export const list = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(item));

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  primaryRole: list(z.enum(['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER'])),
  secondaryRole: list(z.enum(['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER'])),
  expertise: list(z.string().max(60)),
  country: z
    .string()
    .trim()
    .max(2)
    .optional()
    .default('')
    .transform((v) => v.toUpperCase()),
  city: z.string().trim().max(100).optional().default(''),
  openTo: list(z.enum(OPTIONS.openTo)),
  investing: z.enum(['1']).optional(),
  raising: z.enum(['1']).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.searchPageSizeMax).default(LIMITS.searchPageSizeDefault),
});
export type SearchQuery = z.output<typeof searchQuerySchema>;

export interface SearchResult {
  member: MemberCard;
  relevanceScore: number;
  reasons: Reason[];
}

/** Text match over the fields this viewer can see (G14). Name matches score highest. */
export function textMatchScore(c: Candidate, viewer: Viewer, q: string): number {
  const query = q.trim().toLowerCase();
  if (!query) return 0;
  const name = c.user.name.toLowerCase();
  if (name === query) return 100;
  const nameWords = name.split(/\s+/);
  const queryWords = query.split(/\s+/).filter(Boolean);
  if (name.startsWith(query) || queryWords.every((w) => nameWords.some((n) => n.startsWith(w)))) return 95;

  const terms = tokenize(query);
  if (terms.length === 0) return 0;
  const visibleText = [
    c.headline,
    c.industry,
    c.companyStage,
    c.functionalExpertise,
    c.expertiseAreas.join(' '),
    c.technicalSkills.join(' '),
    c.sectorPreferences.join(' '),
    canSee(c, 'professionalBackground', viewer) ? c.professionalBackground : null,
    canSee(c, 'currentFocus', viewer) ? c.currentFocus : null,
    canSee(c, 'needs', viewer) ? c.needs : null,
    canSee(c, 'offerings', viewer) ? c.offerings : null,
    canSee(c, 'companyName', viewer) ? c.companyName : null,
    canSee(c, 'location', viewer) ? c.city : null,
    canSee(c, 'location', viewer) ? countryName(c.country) : null,
    c.openTo.join(' '),
    c.firmName,
  ]
    .filter(Boolean)
    .join(' ');
  const haystack = new Set(tokenize(visibleText));
  const hits = terms.filter((t) => haystack.has(t)).length;
  return Math.round((80 * hits) / terms.length);
}

export async function searchMembers(viewerId: string, query: SearchQuery) {
  const [viewerInput, sets] = await Promise.all([loadViewer(viewerId), relationshipSets(viewerId)]);
  const where: Prisma.ProfileWhereInput = { ...baseWhere(viewerId, sets) };
  const and: Prisma.ProfileWhereInput[] = [];
  if (query.primaryRole.length) and.push({ primaryRole: { in: query.primaryRole as RoleType[] } });
  if (query.secondaryRole.length) and.push({ secondaryRoles: { hasSome: query.secondaryRole as RoleType[] } });
  const tags = normalizeTags(query.expertise);
  if (tags.length) and.push({ expertiseAreas: { hasSome: tags } });
  if (query.country) and.push({ country: query.country });
  if (query.city) and.push({ city: { contains: query.city, mode: 'insensitive' } });
  if (query.openTo.length) and.push({ openTo: { hasSome: query.openTo } });
  if (query.investing) {
    // Investors whose "currently investing" is a fresh Yes (R3 F9).
    and.push(
      { OR: [{ primaryRole: 'INVESTOR' }, { secondaryRoles: { has: 'INVESTOR' } }] },
      { currentlyInvesting: true },
      { investingConfirmedAt: { gt: new Date(Date.now() - INVESTING_UNCONFIRMED_AFTER_DAYS * 86_400_000) } },
    );
  }
  if (query.raising) {
    and.push(
      { OR: [{ primaryRole: 'FOUNDER' }, { secondaryRoles: { has: 'FOUNDER' } }] },
      { fundingStatus: { in: [...RAISING_STATUSES] } },
    );
  }
  if (query.q) {
    // SQL prefilter (broad); visibility-aware scoring below decides the final match.
    const words = [...new Set([query.q, ...query.q.split(/\s+/)].filter((w) => w.length >= 2 || w === query.q))].slice(0, 8);
    const stems = tokenize(query.q).slice(0, 8);
    const or: Prisma.ProfileWhereInput[] = [];
    for (const w of [...new Set([...words, ...stems])]) {
      const c = { contains: w, mode: 'insensitive' as const };
      or.push(
        { user: { name: c } },
        { headline: c },
        { professionalBackground: c },
        { currentFocus: c },
        { needs: c },
        { offerings: c },
        { companyName: c },
        { industry: c },
        { city: c },
        { firmName: c },
      );
    }
    const qTags = normalizeTags([query.q, ...query.q.split(/\s+/)]);
    if (qTags.length) {
      or.push({ expertiseAreas: { hasSome: qTags } }, { technicalSkills: { hasSome: qTags } }, { sectorPreferences: { hasSome: qTags } });
    }
    and.push({ OR: or });
  }
  if (and.length) where.AND = and;

  const candidates = (await prisma.profile.findMany({
    where,
    include: candidateInclude,
    orderBy: { user: { lastActiveAt: 'desc' } },
    take: LIMITS.candidateCap,
  })) as Candidate[];

  const scored: Array<SearchResult & { rank: number }> = [];
  for (const c of candidates) {
    const viewer: Viewer = { isSelf: false, connected: sets.connected.has(c.userId) };
    // Filters must not match fields hidden from this viewer (no oracle, G5).
    if ((query.country || query.city) && !canSee(c, 'location', viewer)) continue;
    if (query.raising && !canSee(c, 'fundingStatus', viewer)) continue;
    const text = textMatchScore(c, viewer, query.q);
    if (query.q && text === 0) continue;
    const rel = calculateRelevance(viewerInput, visibleInput(c, viewer));
    // Name matches form their own top tier (Req 2.6 R2), then the weighted blend.
    const nameTier = text >= 95 ? 1000 : 0;
    const rank = query.q
      ? nameTier + 0.6 * text + 0.25 * rel.total + 0.15 * c.completenessScore
      : 0.7 * rel.total + 0.3 * c.completenessScore;
    scored.push({
      member: toMemberCard(c, viewer, statusFromSets(sets, c.userId)),
      relevanceScore: rel.total,
      reasons: rel.reasons,
      rank,
    });
  }
  scored.sort((a, b) => b.rank - a.rank || a.member.name.localeCompare(b.member.name));
  const start = (query.page - 1) * query.limit;
  const page = scored.slice(start, start + query.limit);
  const mutuals = await mutualCounts(sets.connected, page.map((r) => r.member.id));
  for (const r of page) r.member.mutualConnections = mutuals.get(r.member.id) ?? 0;
  return {
    results: page.map(({ rank: _rank, ...r }) => r),
    pagination: {
      total: scored.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(scored.length / query.limit)),
    },
  };
}

// ---------------------------------------------------------------- recommendations

export interface Recommendation {
  member: MemberCard;
  relevanceScore: number;
  explanation: string;
  reasons: Reason[];
}

/**
 * Up to 20 recommendations (Req 5.2 R2). Excludes self, connections, pending in either
 * direction, blocked, recently dismissed and non-active members (Req 5.6).
 */
export async function getRecommendations(viewerId: string) {
  const [viewerInput, sets] = await Promise.all([loadViewer(viewerId), relationshipSets(viewerId)]);
  const dismissed = await prisma.dismissedRecommendation.findMany({
    where: { userId: viewerId, showAgainAfter: { gt: new Date() } },
    select: { dismissedUserId: true },
  });
  const exclude = new Set<string>([
    viewerId,
    ...sets.blocked,
    ...sets.connected,
    ...sets.pendingSent,
    ...sets.pendingReceived,
    ...dismissed.map((d) => d.dismissedUserId),
  ]);
  const candidates = (await prisma.profile.findMany({
    where: { userId: { notIn: [...exclude] }, user: { accountStatus: 'ACTIVE' } },
    include: candidateInclude,
    orderBy: { user: { lastActiveAt: 'desc' } },
    take: LIMITS.candidateCap,
  })) as Candidate[];

  const [mutuals, gatherings] = await Promise.all([
    mutualCounts(sets.connected, candidates.map((c) => c.userId)),
    sameUpcomingGathering(viewerId),
  ]);
  const scored = candidates
    .map((c) => {
      const viewer: Viewer = { isSelf: false, connected: false };
      const rel = calculateRelevance(viewerInput, visibleInput(c, viewer), {
        mutualConnections: mutuals.get(c.userId) ?? 0,
        sameGathering: gatherings.get(c.userId),
      });
      return { c, viewer, rel, mutual: mutuals.get(c.userId) ?? 0 };
    })
    .filter((s) => s.rel.total > 0)
    .sort((a, b) => b.rel.total - a.rel.total || b.mutual - a.mutual)
    .slice(0, LIMITS.recommendationsMax);

  const recommendations: Recommendation[] = scored.map(({ c, viewer, rel, mutual }) => ({
    member: { ...toMemberCard(c, viewer, 'none'), mutualConnections: mutual },
    relevanceScore: rel.total,
    explanation: rel.reasons[0]?.description ?? 'Active member of the community',
    reasons: rel.reasons,
  }));
  return {
    recommendations,
    count: recommendations.length,
    /** The UI shows an empty-state prompt when this is true (Req 5.2 R2). */
    fewerThanMinimum: recommendations.length < LIMITS.recommendationsMinBeforeEmptyState,
  };
}

/** Dismiss for 30 days; upsert so re-dismissing after the cooldown works (G6). */
export async function dismissRecommendation(viewerId: string, memberId: string) {
  if (viewerId === memberId) throw Errors.validation('You cannot dismiss yourself.');
  const exists = await prisma.user.count({ where: { id: memberId } });
  if (!exists) throw Errors.notFound('Member');
  const now = new Date();
  const showAgainAfter = new Date(now.getTime() + DURATIONS_MS.dismissCooldown);
  await prisma.dismissedRecommendation.upsert({
    where: { userId_dismissedUserId: { userId: viewerId, dismissedUserId: memberId } },
    create: { userId: viewerId, dismissedUserId: memberId, dismissedAt: now, showAgainAfter },
    update: { dismissedAt: now, showAgainAfter },
  });
}

/** Undo a "Not now" (the toast's Undo button). */
export async function undoDismissRecommendation(viewerId: string, memberId: string) {
  await prisma.dismissedRecommendation.deleteMany({ where: { userId: viewerId, dismissedUserId: memberId } });
}
