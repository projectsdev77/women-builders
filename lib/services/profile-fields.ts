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
} as const;

/** Profile fields that count towards completeness for every member (G15). */
export const CORE_FIELDS = [
  'headline',
  'professionalBackground',
  'expertiseAreas',
  'currentFocus',
  'needs',
  'offerings',
  'location',
] as const;

/** Virtual field `checkSize` = both checkSizeMin and checkSizeMax set. */
export type CompletenessField =
  | (typeof CORE_FIELDS)[number]
  | 'companyName' | 'companyStage' | 'industry' | 'fundingStatus'
  | 'functionalExpertise' | 'seniorityLevel' | 'operationalFocus'
  | 'investmentStages' | 'checkSize' | 'sectorPreferences'
  | 'technicalSkills' | 'projectTypes' | 'collaborationInterests';

export const ROLE_FIELDS: Record<RoleType, CompletenessField[]> = {
  FOUNDER: ['companyName', 'companyStage', 'industry', 'fundingStatus'],
  OPERATOR: ['functionalExpertise', 'seniorityLevel', 'operationalFocus'],
  INVESTOR: ['investmentStages', 'checkSize', 'sectorPreferences'],
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
  professionalBackground: 'Professional background',
  expertiseAreas: 'Expertise areas',
  currentFocus: 'Current focus',
  needs: 'What you need',
  offerings: 'What you can offer',
  location: 'Location',
  companyName: 'Company name',
  companyStage: 'Company stage',
  industry: 'Industry',
  fundingStatus: 'Funding status',
  functionalExpertise: 'Functional expertise',
  seniorityLevel: 'Seniority',
  operationalFocus: 'Operational focus areas',
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
