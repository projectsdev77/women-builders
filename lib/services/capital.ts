import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { LIMITS } from '@/lib/config';
import { INVESTING_CONFIRM_EVERY_DAYS, INVESTING_UNCONFIRMED_AFTER_DAYS, OPTIONS, RAISING_STATUSES, normalizeTags } from './profile-fields';
import { canSee, toMemberCard, toMemberView, type MemberCard, type MemberView, type Viewer } from './privacy';
import { calculateRelevance, type Reason } from './relevance';
import { relationshipSets, statusFromSets } from './relationships';
import { baseWhere, candidateInclude, list, loadViewer, mutualCounts, visibleInput, type Candidate } from './discovery';

/**
 * The Capital view (R3 F9): a lens on the same directory, with two tabs. Every filter
 * respects hidden fields, so a filter never reveals something the viewer can't see (G5).
 */

const DAY = 86_400_000;
const country = z.string().trim().max(2).optional().default('').transform((v) => v.toUpperCase());
const page = z.coerce.number().int().min(1).max(500).default(1);
const amount = z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(0).max(10_000_000).optional());

export const investorsQuerySchema = z.object({
  stage: list(z.enum(OPTIONS.investmentStages)),
  /** "I'm raising checks of $___" in USD thousands: investors whose visible range includes it. */
  amount,
  sector: list(z.string().max(60)),
  investorType: list(z.enum(OPTIONS.investorType)),
  leads: z.enum(['Leads', 'Follows']).optional().or(z.literal('').transform(() => undefined)),
  country,
  /** "Currently investing" is on by default; `investing=all` turns it off. */
  investing: z.enum(['1', 'all']).optional().default('1'),
  page,
});
export type InvestorsQuery = z.output<typeof investorsQuerySchema>;

export const foundersQuerySchema = z.object({
  stage: list(z.enum(OPTIONS.companyStage)),
  industry: z.string().trim().max(80).optional().default(''),
  country,
  raiseMin: amount,
  raiseMax: amount,
  page,
});
export type FoundersQuery = z.output<typeof foundersQuerySchema>;

export interface InvestorCard extends MemberCard {
  city: string | null;
  investor: NonNullable<MemberView['investor']>;
  reasons: Reason[];
}
export interface FounderCard extends MemberCard {
  founder: NonNullable<MemberView['founder']>;
  reasons: Reason[];
}

const hasRole = (role: 'INVESTOR' | 'FOUNDER'): Prisma.ProfileWhereInput => ({
  OR: [{ primaryRole: role }, { secondaryRoles: { has: role } }],
});

function paginate<T>(rows: T[], pageNo: number) {
  const limit = LIMITS.searchPageSizeDefault;
  return {
    results: rows.slice((pageNo - 1) * limit, pageNo * limit),
    pagination: { total: rows.length, page: pageNo, limit, totalPages: Math.max(1, Math.ceil(rows.length / limit)) },
  };
}

async function withMutuals<T extends MemberCard>(connected: Set<string>, rows: T[]) {
  const counts = await mutualCounts(connected, rows.map((r) => r.id));
  for (const r of rows) r.mutualConnections = counts.get(r.id) ?? 0;
  return rows;
}

export async function listInvestors(viewerId: string, q: InvestorsQuery) {
  const [viewerInput, sets] = await Promise.all([loadViewer(viewerId), relationshipSets(viewerId)]);
  const now = new Date();
  const and: Prisma.ProfileWhereInput[] = [hasRole('INVESTOR')];
  if (q.stage.length) and.push({ investmentStages: { hasSome: q.stage } });
  const sectors = normalizeTags(q.sector);
  if (sectors.length) and.push({ sectorPreferences: { hasSome: sectors } });
  if (q.investorType.length) and.push({ investorType: { in: q.investorType } });
  if (q.leads) and.push({ leadsRounds: { in: [q.leads, 'Both'] } });
  if (q.country) and.push({ country: q.country });
  if (q.amount != null) and.push({ checkSizeMin: { lte: q.amount } }, { checkSizeMax: { gte: q.amount } });
  if (q.investing === '1') {
    and.push({ currentlyInvesting: true }, { investingConfirmedAt: { gt: new Date(now.getTime() - INVESTING_UNCONFIRMED_AFTER_DAYS * DAY) } });
  }
  const candidates = (await prisma.profile.findMany({
    where: { ...baseWhere(viewerId, sets), AND: and },
    include: candidateInclude,
    take: LIMITS.candidateCap,
  })) as Candidate[];

  const freshSince = now.getTime() - INVESTING_CONFIRM_EVERY_DAYS * DAY;
  const rows = [];
  for (const c of candidates) {
    const viewer: Viewer = { isSelf: false, connected: sets.connected.has(c.userId) };
    if (q.country && !canSee(c, 'location', viewer)) continue;
    if (q.amount != null && !canSee(c, 'checkSize', viewer)) continue;
    const view = toMemberView(c, viewer, statusFromSets(sets, c.userId));
    const rel = calculateRelevance(viewerInput, visibleInput(c, viewer));
    rows.push({
      card: {
        ...toMemberCard(c, viewer, statusFromSets(sets, c.userId)),
        city: view.city,
        investor: view.investor!,
        reasons: rel.reasons,
      } satisfies InvestorCard,
      fresh: c.currentlyInvesting === true && (c.investingConfirmedAt?.getTime() ?? 0) > freshSince,
      lastCheck: c.lastCheckMonth ?? '',
      relevance: rel.total,
    });
  }
  // Sort: freshly confirmed first, then most recent check, then relevance, then name (R3 F9).
  rows.sort(
    (a, b) =>
      Number(b.fresh) - Number(a.fresh) ||
      b.lastCheck.localeCompare(a.lastCheck) ||
      b.relevance - a.relevance ||
      a.card.name.localeCompare(b.card.name),
  );
  const { results, pagination } = paginate(rows.map((r) => r.card), q.page);
  return { results: await withMutuals(sets.connected, results), pagination };
}

export async function listRaisingFounders(viewerId: string, q: FoundersQuery) {
  const [viewerInput, sets] = await Promise.all([loadViewer(viewerId), relationshipSets(viewerId)]);
  const and: Prisma.ProfileWhereInput[] = [hasRole('FOUNDER'), { fundingStatus: { in: [...RAISING_STATUSES] } }];
  if (q.stage.length) and.push({ companyStage: { in: q.stage } });
  if (q.industry) and.push({ industry: { contains: q.industry, mode: 'insensitive' } });
  if (q.country) and.push({ country: q.country });
  if (q.raiseMin != null) and.push({ raiseAmount: { gte: q.raiseMin } });
  if (q.raiseMax != null) and.push({ raiseAmount: { lte: q.raiseMax } });
  const candidates = (await prisma.profile.findMany({
    where: { ...baseWhere(viewerId, sets), AND: and },
    include: candidateInclude,
    take: LIMITS.candidateCap,
  })) as Candidate[];

  const rows = [];
  for (const c of candidates) {
    const viewer: Viewer = { isSelf: false, connected: sets.connected.has(c.userId) };
    // A founder who hides her funding status doesn't appear here for non-connections.
    if (!canSee(c, 'fundingStatus', viewer)) continue;
    if (q.country && !canSee(c, 'location', viewer)) continue;
    if ((q.raiseMin != null || q.raiseMax != null) && !canSee(c, 'raiseAmount', viewer)) continue;
    const view = toMemberView(c, viewer, statusFromSets(sets, c.userId));
    const rel = calculateRelevance(viewerInput, visibleInput(c, viewer));
    rows.push({
      card: { ...toMemberCard(c, viewer, statusFromSets(sets, c.userId)), founder: view.founder!, reasons: rel.reasons } satisfies FounderCard,
      now: c.fundingStatus === 'Raising now',
      relevance: rel.total,
    });
  }
  rows.sort((a, b) => Number(b.now) - Number(a.now) || b.relevance - a.relevance || a.card.name.localeCompare(b.card.name));
  const { results, pagination } = paginate(rows.map((r) => r.card), q.page);
  return { results: await withMutuals(sets.connected, results), pagination };
}
