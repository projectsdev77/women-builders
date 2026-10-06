import type { Profile, RoleType } from '@prisma/client';
import { ROLE_LABELS, STAGE_TO_INVESTMENT_STAGE, investingStatus } from './profile-fields';

/**
 * Relevance scoring (Spec R2, G13).
 * total = 0.30·roleMatch + 0.40·needsOfferings + 0.20·expertise + 0.10·recency (each 0–100)
 */
export const WEIGHTS = { roleMatch: 0.3, needsOfferings: 0.4, expertise: 0.2, recency: 0.1 } as const;

const STOP_WORDS = new Set(
  (
    'a an and or the of to in on for with at by from as is are be been am was were it its this that these those ' +
    'i me my we our you your they their them he she her his who whom which what when where how why ' +
    'can could would should will may might must do does did done have has had not no yes so if than then too very ' +
    'about into over under up out more most some any all each other also etc just like love happy ' +
    'need needs needed looking seeking want wanting help helping offer offering offerings provide providing ' +
    'someone anyone people person thing things ideally especially particularly really great good new'
  ).split(' '),
);

/** Light suffix stemmer: fundraising/fundraise → fundrais, investors → investor. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 6 && w.endsWith('ment')) w = w.slice(0, -4);
  else if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

/** Keeps 2+ character tokens so "AI", "ML", "VC", "PR", "B2B" survive. */
export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}+#]+/u)) {
    if (raw.length < 2 || STOP_WORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

export function tokenSet(text: string | null | undefined): Set<string> {
  return new Set(tokenize(text));
}

/** Cosine similarity on binary sets: stuffing a huge list lowers the score. */
export function cosine(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / Math.sqrt(a.size * b.size);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Symmetric role affinity, 0–100. Pairs are unordered. */
const ROLE_AFFINITY: Record<string, number> = {
  'FOUNDER|INVESTOR': 100,
  'BUILDER|FOUNDER': 80,
  'FOUNDER|OPERATOR': 80,
  'FOUNDER|FOUNDER': 60,
  'OPERATOR|OPERATOR': 60,
  'BUILDER|BUILDER': 60,
  'BUILDER|OPERATOR': 60,
  'INVESTOR|INVESTOR': 50,
  'INVESTOR|OPERATOR': 30,
  'BUILDER|INVESTOR': 30,
};

export function roleAffinity(a: RoleType, b: RoleType): number {
  return ROLE_AFFINITY[[a, b].sort().join('|')] ?? 0;
}

/** Founder↔investor fit scores 100 only when the stages line up and she is investing (R3 F10). */
export const FOUNDER_INVESTOR_MISMATCH = 70;

export function stageFits(founder: Pick<RelevanceInput, 'companyStage'>, investor: Pick<RelevanceInput, 'investmentStages' | 'investingActive'>) {
  const stage = founder.companyStage ? STAGE_TO_INVESTMENT_STAGE[founder.companyStage] : undefined;
  return !!stage && !!investor.investingActive && (investor.investmentStages ?? []).includes(stage);
}

type RoleSide = Pick<RelevanceInput, 'roles' | 'companyStage' | 'investmentStages' | 'investingActive'>;

/** Best affinity across all roles held by either side (primary + secondary). */
export function roleMatch(
  aSide: RoleType[] | RoleSide,
  bSide: RoleType[] | RoleSide,
): { score: number; a: RoleType; b: RoleType; stageFit: boolean } {
  const A: RoleSide = Array.isArray(aSide) ? { roles: aSide } : aSide;
  const B: RoleSide = Array.isArray(bSide) ? { roles: bSide } : bSide;
  let best = { score: 0, a: A.roles[0]!, b: B.roles[0]!, stageFit: false };
  for (const a of A.roles) for (const b of B.roles) {
    let s = roleAffinity(a, b);
    let stageFit = false;
    if (a === 'FOUNDER' && b === 'INVESTOR') stageFit = stageFits(A, B);
    if (a === 'INVESTOR' && b === 'FOUNDER') stageFit = stageFits(B, A);
    if ((a === 'FOUNDER' && b === 'INVESTOR') || (a === 'INVESTOR' && b === 'FOUNDER')) s = stageFit ? 100 : FOUNDER_INVESTOR_MISMATCH;
    if (s > best.score) best = { score: s, a, b, stageFit };
  }
  return best;
}

export function recencyScore(lastActiveAt: Date, now = new Date()): number {
  const days = Math.floor((now.getTime() - lastActiveAt.getTime()) / 86_400_000);
  if (days <= 0) return 100;
  if (days >= 90) return 0;
  return Math.round(100 - (days / 90) * 100);
}

/** The subset of profile data relevance needs; callers pass only what the viewer may see. */
export interface RelevanceInput {
  roles: RoleType[];
  needs: string | null;
  offerings: string | null;
  expertiseAreas: string[];
  lastActiveAt: Date;
  /** Founder side of the stage fit (R3 F10). */
  companyStage?: string | null;
  /** Investor side of the stage fit. */
  investmentStages?: string[];
  investingActive?: boolean;
  /** Only for the "Also in <city>" reason; never scored. Null when hidden from the viewer. */
  city?: string | null;
  country?: string | null;
}

export function relevanceInput(
  p: Pick<Profile, 'primaryRole' | 'secondaryRoles' | 'needs' | 'offerings' | 'expertiseAreas'> &
    Partial<Pick<Profile, 'companyStage' | 'investmentStages' | 'currentlyInvesting' | 'investingConfirmedAt' | 'city' | 'country'>>,
  lastActiveAt: Date,
): RelevanceInput {
  return {
    roles: [p.primaryRole, ...p.secondaryRoles.filter((r) => r !== p.primaryRole)],
    needs: p.needs,
    offerings: p.offerings,
    expertiseAreas: p.expertiseAreas,
    lastActiveAt,
    companyStage: p.companyStage ?? null,
    investmentStages: p.investmentStages ?? [],
    investingActive: investingStatus(p) === 'active',
    city: p.city ?? null,
    country: p.country ?? null,
  };
}

export type ReasonType =
  | 'role_match'
  | 'stage_fit'
  | 'needs_offering'
  | 'offers_what_they_need'
  | 'expertise'
  | 'mutual_connection'
  | 'same_city'
  | 'same_gathering';
export interface Reason {
  type: ReasonType;
  description: string;
}

export interface RelevanceScore {
  total: number;
  breakdown: { roleMatch: number; needsOfferings: number; expertise: number; recency: number };
  reasons: Reason[];
}

/** Original words from `text` whose stems are in `stems` (for readable explanations). */
function matchedWords(text: string | null, stems: Set<string>, max = 3): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[^\p{L}\p{N}+#]+/u)) {
    const lower = raw.toLowerCase();
    if (lower.length < 2 || STOP_WORDS.has(lower)) continue;
    const s = stem(lower);
    if (stems.has(s) && !seen.has(s)) {
      seen.add(s);
      out.push(raw);
      if (out.length >= max) break;
    }
  }
  return out;
}

function intersect(a: Set<string>, b: Set<string>): Set<string> {
  return new Set([...a].filter((x) => b.has(x)));
}

export function calculateRelevance(
  viewer: RelevanceInput,
  target: RelevanceInput,
  opts: { mutualConnections?: number; sameGathering?: string | null; now?: Date } = {},
): RelevanceScore {
  const role = roleMatch(viewer, target);

  const vNeeds = tokenSet(viewer.needs);
  const vOffers = tokenSet(viewer.offerings);
  const tNeeds = tokenSet(target.needs);
  const tOffers = tokenSet(target.offerings);
  const directions: number[] = [];
  if (vNeeds.size && tOffers.size) directions.push(cosine(vNeeds, tOffers));
  if (tNeeds.size && vOffers.size) directions.push(cosine(tNeeds, vOffers));
  const needsOfferings = directions.length
    ? Math.round((100 * directions.reduce((s, d) => s + d, 0)) / directions.length)
    : 0;

  const vTags = new Set(viewer.expertiseAreas);
  const tTags = new Set(target.expertiseAreas);
  const expertise = Math.round(100 * jaccard(vTags, tTags));
  const recency = recencyScore(target.lastActiveAt, opts.now);

  const total = Math.round(
    WEIGHTS.roleMatch * role.score +
      WEIGHTS.needsOfferings * needsOfferings +
      WEIGHTS.expertise * expertise +
      WEIGHTS.recency * recency,
  );

  const reasons: Reason[] = [];
  if (role.stageFit) {
    reasons.push(
      role.a === 'FOUNDER'
        ? { type: 'stage_fit', description: 'Investing at your stage' }
        : { type: 'stage_fit', description: 'Raising at a stage you invest in' },
    );
  }
  const helps = matchedWords(target.offerings, intersect(vNeeds, tOffers));
  if (helps.length) reasons.push({ type: 'needs_offering', description: `Can help with what you need: ${helps.join(', ')}` });
  const youHelp = matchedWords(target.needs, intersect(tNeeds, vOffers));
  if (youHelp.length) reasons.push({ type: 'offers_what_they_need', description: `Looking for what you offer: ${youHelp.join(', ')}` });
  if (role.score >= 60 && !role.stageFit) {
    reasons.push({
      type: 'role_match',
      description:
        role.a === role.b
          ? `Fellow ${ROLE_LABELS[role.b].toLowerCase()}`
          : `${ROLE_LABELS[role.b]}: a natural fit for your work as a ${ROLE_LABELS[role.a].toLowerCase()}`,
    });
  }
  const shared = [...intersect(vTags, tTags)].slice(0, 3);
  if (shared.length) reasons.push({ type: 'expertise', description: `Shared expertise: ${shared.join(', ')}` });
  const mutual = opts.mutualConnections ?? 0;
  if (mutual > 0) {
    reasons.push({
      type: 'mutual_connection',
      description: `${mutual} mutual connection${mutual === 1 ? '' : 's'} can introduce you`,
    });
  }
  if (opts.sameGathering) {
    reasons.push({ type: 'same_gathering', description: `Going to the same gathering: ${opts.sameGathering}` });
  }
  // "Also in <city>" is a reason only; it never changes the score (R3 F10).
  if (viewer.city && target.city && viewer.country === target.country && viewer.city.trim().toLowerCase() === target.city.trim().toLowerCase()) {
    reasons.push({ type: 'same_city', description: `Also in ${target.city.trim()}` });
  }

  return { total, breakdown: { roleMatch: role.score, needsOfferings, expertise, recency }, reasons };
}
