import type { Profile, RoleType, User } from '@prisma/client';
import type { ConnectionStatus } from './relationships';

/** The only fields a member may hide from non-connections (G5, Req 9.2). */
export const HIDEABLE_FIELDS = [
  'location',
  'professionalBackground',
  'currentFocus',
  'needs',
  'offerings',
  'companyName',
  'fundingStatus',
  'checkSize',
  'linkedInUrl',
  'websiteUrl',
] as const;
export type HideableField = (typeof HIDEABLE_FIELDS)[number];

export function sanitizeHiddenFields(fields: string[]): HideableField[] {
  return HIDEABLE_FIELDS.filter((f) => fields.includes(f));
}

export type ProfileWithUser = Profile & { user: Pick<User, 'id' | 'name' | 'approvedAt' | 'createdAt'> };

export interface Viewer {
  isSelf: boolean;
  connected: boolean;
}

/** Can this viewer see this (possibly hidden) field? Connections see everything (Req 9.3 R2). */
export function canSee(profile: Pick<Profile, 'hiddenFields'>, field: HideableField, viewer: Viewer): boolean {
  if (viewer.isSelf || viewer.connected) return true;
  return !profile.hiddenFields.includes(field);
}

export interface MemberView {
  id: string;
  name: string;
  headline: string | null;
  primaryRole: RoleType;
  secondaryRoles: RoleType[];
  expertiseAreas: string[];
  location: string | null;
  professionalBackground: string | null;
  currentFocus: string | null;
  needs: string | null;
  offerings: string | null;
  linkedInUrl: string | null;
  websiteUrl: string | null;
  founder: { companyName: string | null; companyStage: string | null; industry: string | null; fundingStatus: string | null } | null;
  operator: { functionalExpertise: string | null; seniorityLevel: string | null; operationalFocus: string[] } | null;
  investor: { investmentStages: string[]; checkSizeMin: number | null; checkSizeMax: number | null; sectorPreferences: string[] } | null;
  builder: { technicalSkills: string[]; projectTypes: string[]; collaborationInterests: string | null } | null;
  completenessScore: number;
  memberSince: string | null;
  /** True when some fields are hidden from this viewer (UI shows "connect to see more"). */
  hasHiddenFields: boolean;
  connectionStatus: ConnectionStatus | 'self';
}

/**
 * The single way profile data leaves the server (G5). Email is never included (Req 9.6).
 */
export function toMemberView(p: ProfileWithUser, viewer: Viewer, status: ConnectionStatus | 'self'): MemberView {
  const see = (f: HideableField) => canSee(p, f, viewer);
  const roles = new Set<RoleType>([p.primaryRole, ...p.secondaryRoles]);
  return {
    id: p.user.id,
    name: p.user.name,
    headline: p.headline,
    primaryRole: p.primaryRole,
    secondaryRoles: p.secondaryRoles,
    expertiseAreas: p.expertiseAreas,
    location: see('location') ? p.location : null,
    professionalBackground: see('professionalBackground') ? p.professionalBackground : null,
    currentFocus: see('currentFocus') ? p.currentFocus : null,
    needs: see('needs') ? p.needs : null,
    offerings: see('offerings') ? p.offerings : null,
    linkedInUrl: see('linkedInUrl') ? p.linkedInUrl : null,
    websiteUrl: see('websiteUrl') ? p.websiteUrl : null,
    founder: roles.has('FOUNDER')
      ? {
          companyName: see('companyName') ? p.companyName : null,
          companyStage: p.companyStage,
          industry: p.industry,
          fundingStatus: see('fundingStatus') ? p.fundingStatus : null,
        }
      : null,
    operator: roles.has('OPERATOR')
      ? { functionalExpertise: p.functionalExpertise, seniorityLevel: p.seniorityLevel, operationalFocus: p.operationalFocus }
      : null,
    investor: roles.has('INVESTOR')
      ? {
          investmentStages: p.investmentStages,
          checkSizeMin: see('checkSize') ? p.checkSizeMin : null,
          checkSizeMax: see('checkSize') ? p.checkSizeMax : null,
          sectorPreferences: p.sectorPreferences,
        }
      : null,
    builder: roles.has('BUILDER')
      ? { technicalSkills: p.technicalSkills, projectTypes: p.projectTypes, collaborationInterests: p.collaborationInterests }
      : null,
    completenessScore: p.completenessScore,
    memberSince: (p.user.approvedAt ?? p.user.createdAt)?.toISOString() ?? null,
    hasHiddenFields: !viewer.isSelf && !viewer.connected && p.hiddenFields.length > 0,
    connectionStatus: status,
  };
}

/** Compact card used by search, recommendations and connection lists. */
export interface MemberCard {
  id: string;
  name: string;
  headline: string | null;
  primaryRole: RoleType;
  secondaryRoles: RoleType[];
  expertiseAreas: string[];
  location: string | null;
  companyName: string | null;
  connectionStatus: ConnectionStatus;
}

export function toMemberCard(p: ProfileWithUser, viewer: Viewer, status: ConnectionStatus): MemberCard {
  return {
    id: p.user.id,
    name: p.user.name,
    headline: p.headline,
    primaryRole: p.primaryRole,
    secondaryRoles: p.secondaryRoles,
    expertiseAreas: p.expertiseAreas.slice(0, 6),
    location: canSee(p, 'location', viewer) ? p.location : null,
    companyName: canSee(p, 'companyName', viewer) ? p.companyName : null,
    connectionStatus: status,
  };
}
