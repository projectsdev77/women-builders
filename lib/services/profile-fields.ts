import type { Profile, RoleType } from '@prisma/client';
import { COMPLETENESS_THRESHOLD } from '@/lib/config';

export const ROLE_LABELS: Record<RoleType, string> = {
  FOUNDER: 'Founder',
  OPERATOR: 'Operator',
  INVESTOR: 'Investor',
  BUILDER: 'Builder',
};

export const OPTIONS = {
  companyStage: ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Bootstrapped', 'Public'],
  fundingStatus: ['Not raising', 'Raising now', 'Raising in 6 months', 'Recently closed a round'],
  functionalExpertise: [
    'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Operations', 'Finance',
    'People / HR', 'Legal', 'Data', 'Customer Success', 'Other',
  ],
  seniorityLevel: ['Individual contributor', 'Manager', 'Director', 'VP', 'C-level', 'Advisor'],
  investmentStages: ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Growth'],
  investorType: ['Angel', 'VC fund', 'Family office', 'Corporate', 'Syndicate lead', 'Other'],
  leadsRounds: ['Leads', 'Follows', 'Both'],
  // "Open to" gives every role a clear signal of what she's available for (R3 F6).
  openTo: [
    'Advising', 'Investing', 'Hiring', 'Being hired', 'Co-founding',
    'Freelance or project work', 'Mentoring', 'Speaking',
  ],
} as const;

/** The investment stage a company at this stage raises (R3 F10). Bootstrapped and public companies have none. */
export const STAGE_TO_INVESTMENT_STAGE: Record<string, string | undefined> = {
  Idea: 'Pre-seed',
  'Pre-seed': 'Pre-seed',
  Seed: 'Seed',
  'Series A': 'Series A',
  'Series B': 'Series B',
  'Series C+': 'Growth',
};

/** Funding statuses that count as "raising" for Capital and Discover filters (R3 F9). */
export const RAISING_STATUSES = ['Raising now', 'Raising in 6 months'] as const;

/** Profile fields that count towards completeness for every member (G15). */
export const CORE_FIELDS = [
  'headline',
  'photo',
  'professionalBackground',
  'expertiseAreas',
  'currentFocus',
  'needs',
  'offerings',
  'country',
] as const;

/** Virtual fields: `checkSize` = both bounds set; `photo` = a photo is uploaded. */
export type CompletenessField =
  | (typeof CORE_FIELDS)[number]
  | 'companyName' | 'companyStage' | 'industry' | 'fundingStatus'
  | 'functionalExpertise' | 'seniorityLevel' | 'operationalFocus'
  | 'investorType' | 'investmentStages' | 'checkSize' | 'sectorPreferences'
  | 'technicalSkills' | 'projectTypes' | 'collaborationInterests';

export const ROLE_FIELDS: Record<RoleType, CompletenessField[]> = {
  FOUNDER: ['companyName', 'companyStage', 'industry', 'fundingStatus'],
  OPERATOR: ['functionalExpertise', 'seniorityLevel', 'operationalFocus'],
  INVESTOR: ['investorType', 'investmentStages', 'checkSize', 'sectorPreferences'],
  BUILDER: ['technicalSkills', 'projectTypes', 'collaborationInterests'],
};

/** Fields the primary role must fill before sending connection requests (G15). */
export const REQUIRED_FOR_PRIMARY_ROLE: Record<RoleType, CompletenessField[]> = {
  FOUNDER: ['companyName', 'companyStage'],
  OPERATOR: ['functionalExpertise', 'seniorityLevel'],
  INVESTOR: ['investmentStages', 'checkSize'],
  BUILDER: ['technicalSkills'],
};

export const FIELD_LABELS: Record<CompletenessField, string> = {
  headline: 'Headline',
  photo: 'Photo',
  country: 'Country',
  professionalBackground: 'Professional background',
  expertiseAreas: 'Expertise areas',
  currentFocus: 'Current focus',
  needs: 'What you need',
  offerings: 'What you can offer',
  companyName: 'Company name',
  companyStage: 'Company stage',
  industry: 'Industry',
  fundingStatus: 'Funding status',
  functionalExpertise: 'Functional expertise',
  seniorityLevel: 'Seniority',
  operationalFocus: 'Operational focus areas',
  investorType: 'Investor type',
  investmentStages: 'Investment stages',
  checkSize: 'Check size range',
  sectorPreferences: 'Sector preferences',
  technicalSkills: 'Technical skills',
  projectTypes: 'Project types',
  collaborationInterests: 'Collaboration interests',
};

type ProfileLike = Pick<Profile, 'primaryRole' | 'secondaryRoles'> & Partial<Profile>;

export function isFilled(profile: ProfileLike, field: CompletenessField): boolean {
  if (field === 'checkSize') return profile.checkSizeMin != null && profile.checkSizeMax != null;
  if (field === 'photo') return !!profile.photoKey;
  const value = (profile as Record<string, unknown>)[field];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value != null;
}

export function applicableFields(profile: ProfileLike): CompletenessField[] {
  const roles = [profile.primaryRole, ...profile.secondaryRoles.filter((r) => r !== profile.primaryRole)];
  const fields: CompletenessField[] = [...CORE_FIELDS];
  for (const role of roles) fields.push(...ROLE_FIELDS[role]);
  return fields;
}

/** score = round(100 × filled / applicable) (G15). */
export function calculateCompleteness(profile: ProfileLike): number {
  const fields = applicableFields(profile);
  const filled = fields.filter((f) => isFilled(profile, f)).length;
  return Math.round((100 * filled) / fields.length);
}

export function missingFields(profile: ProfileLike): CompletenessField[] {
  return applicableFields(profile).filter((f) => !isFilled(profile, f));
}

export function missingRequiredFields(profile: ProfileLike): CompletenessField[] {
  return REQUIRED_FOR_PRIMARY_ROLE[profile.primaryRole].filter((f) => !isFilled(profile, f));
}

export function canSendConnectionRequests(profile: ProfileLike): boolean {
  return (
    calculateCompleteness(profile) >= COMPLETENESS_THRESHOLD &&
    missingRequiredFields(profile).length === 0
  );
}

/** Tags are lowercase, trimmed, with spaces/underscores collapsed to hyphens (G13). */
export function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}\-+.#]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export function normalizeTags(tags: string[], max = 20): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const n = normalizeTag(t);
    if (n && !out.includes(n)) out.push(n);
    if (out.length >= max) break;
  }
  return out;
}

export type InvestingStatus = 'active' | 'unconfirmed' | 'paused' | null;
export const INVESTING_CONFIRM_EVERY_DAYS = 90;
export const INVESTING_UNCONFIRMED_AFTER_DAYS = 120;

/**
 * "Currently investing" with freshness (R3 F9): a Yes that hasn't been confirmed for
 * 120 days is shown as "Status not confirmed" and drops out of the default filter.
 */
export function investingStatus(
  p: { currentlyInvesting?: boolean | null; investingConfirmedAt?: Date | null },
  now = new Date(),
): InvestingStatus {
  if (p.currentlyInvesting == null) return null;
  if (!p.currentlyInvesting) return 'paused';
  const confirmed = p.investingConfirmedAt?.getTime() ?? 0;
  return now.getTime() - confirmed > INVESTING_UNCONFIRMED_AFTER_DAYS * 86_400_000 ? 'unconfirmed' : 'active';
}
