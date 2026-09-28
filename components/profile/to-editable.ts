import type { Profile } from '@prisma/client';
import type { EditableProfile } from './profile-editor';

export function toEditable(name: string, p: Profile): EditableProfile {
  const s = (v: string | null) => v ?? '';
  return {
    name,
    primaryRole: p.primaryRole,
    secondaryRoles: p.secondaryRoles,
    headline: s(p.headline),
    professionalBackground: s(p.professionalBackground),
    expertiseAreas: p.expertiseAreas,
    currentFocus: s(p.currentFocus),
    needs: s(p.needs),
    offerings: s(p.offerings),
    location: s(p.location),
    linkedInUrl: s(p.linkedInUrl),
    websiteUrl: s(p.websiteUrl),
    companyName: s(p.companyName),
    companyStage: s(p.companyStage),
    industry: s(p.industry),
    fundingStatus: s(p.fundingStatus),
    functionalExpertise: s(p.functionalExpertise),
    seniorityLevel: s(p.seniorityLevel),
    operationalFocus: p.operationalFocus,
    investmentStages: p.investmentStages,
    checkSizeMin: p.checkSizeMin?.toString() ?? '',
    checkSizeMax: p.checkSizeMax?.toString() ?? '',
    sectorPreferences: p.sectorPreferences,
    technicalSkills: p.technicalSkills,
    projectTypes: p.projectTypes,
    collaborationInterests: s(p.collaborationInterests),
    hiddenFields: p.hiddenFields,
  };
}
