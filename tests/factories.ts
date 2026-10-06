import type { AccountStatus, RoleType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { calculateCompleteness } from '@/lib/services/profile-fields';
import { CHARTER_VERSION } from '@/content/charter';

// Pre-computed bcrypt hash of "Password123" (cost 4, fast for tests).
export const TEST_PASSWORD = 'Password123';
export const TEST_HASH = '$2a$04$/LcNypDgrDkZZ8cW8862gO2c8/7HfaR72Y7jGGYvdZQAEcIThXl1K';

let n = 0;

export interface MemberOverrides {
  name?: string;
  email?: string;
  isAdmin?: boolean;
  accountStatus?: AccountStatus;
  charterVersion?: number | null;
  lastActiveAt?: Date;
  profile?: Partial<{
    primaryRole: RoleType;
    secondaryRoles: RoleType[];
    headline: string;
    professionalBackground: string;
    expertiseAreas: string[];
    currentFocus: string;
    needs: string;
    offerings: string;
    city: string;
    country: string;
    openTo: string[];
    firmName: string;
    investorType: string;
    currentlyInvesting: boolean;
    investingConfirmedAt: Date;
    raiseAmount: number;
    photoKey: string;
    companyName: string;
    companyStage: string;
    industry: string;
    fundingStatus: string;
    functionalExpertise: string;
    seniorityLevel: string;
    investmentStages: string[];
    checkSizeMin: number;
    checkSizeMax: number;
    sectorPreferences: string[];
    technicalSkills: string[];
    hiddenFields: string[];
  }> | null;
}

export async function createMember(o: MemberOverrides = {}) {
  n++;
  const profile =
    o.profile === null
      ? null
      : {
          primaryRole: 'FOUNDER' as RoleType,
          secondaryRoles: [] as RoleType[],
          headline: `Member ${n}`,
          expertiseAreas: [] as string[],
          ...o.profile,
        };
  return prisma.user.create({
    data: {
      email: o.email ?? `member${n}-${Date.now()}@example.com`,
      passwordHash: TEST_HASH,
      name: o.name ?? `Member ${n}`,
      isAdmin: o.isAdmin ?? false,
      accountStatus: o.accountStatus ?? 'ACTIVE',
      emailVerifiedAt: new Date(),
      approvedAt: (o.accountStatus ?? 'ACTIVE') === 'ACTIVE' ? new Date() : null,
      lastActiveAt: o.lastActiveAt ?? new Date(),
      charterVersion: o.charterVersion === undefined ? CHARTER_VERSION : o.charterVersion,
      profile: profile
        ? {
            create: {
              ...profile,
              completenessScore: calculateCompleteness(profile),
              onboardingCompletedAt: new Date(),
            },
          }
        : undefined,
      notificationPreference: { create: {} },
    },
    include: { profile: true },
  });
}

/** A profile complete enough to send connection requests. */
export const COMPLETE_FOUNDER = {
  primaryRole: 'FOUNDER' as RoleType,
  headline: 'Founder at Acme',
  professionalBackground: 'Ten years in fintech',
  expertiseAreas: ['fintech', 'payments'],
  currentFocus: 'Raising a seed round',
  needs: 'fundraising advice and investor intros',
  offerings: 'payments product expertise',
  city: 'Austin',
  country: 'US',
  companyName: 'Acme',
  companyStage: 'Seed',
};
