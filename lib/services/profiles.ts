import { z } from 'zod';
import { prisma } from '@/lib/db';
import { Errors } from '@/lib/errors';
import {
  linkedInUrlSchema,
  nameSchema,
  roleSchema,
  websiteUrlSchema,
} from '@/lib/validation/common';
import { calculateCompleteness, normalizeTags } from './profile-fields';
import { sanitizeHiddenFields, toMemberView, type MemberView } from './privacy';
import { connectionStatus, isBlockedEitherWay } from './relationships';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max.toLocaleString()} characters`)
    .transform((v) => (v === '' ? null : v));

const tags = (maxItems = 20) =>
  z.array(z.string().max(60)).max(maxItems * 2).transform((t) => normalizeTags(t, maxItems));

const plainList = (maxItems = 20) =>
  z
    .array(z.string().trim().max(60))
    .max(maxItems)
    .transform((l) => [...new Set(l.filter(Boolean))]);

const checkSize = z
  .union([z.number().int().min(0).max(1_000_000), z.null()])
  .optional();

/** Everything a member can edit on their own profile. All fields optional (partial update). */
export const profileUpdateSchema = z
  .object({
    name: nameSchema,
    primaryRole: roleSchema,
    secondaryRoles: z.array(roleSchema).max(3),
    headline: text(120),
    professionalBackground: text(5000),
    expertiseAreas: tags(20),
    currentFocus: text(1000),
    needs: text(2000),
    offerings: text(2000),
    location: text(100),
    linkedInUrl: linkedInUrlSchema,
    websiteUrl: websiteUrlSchema,
    companyName: text(120),
    companyStage: text(60),
    industry: text(80),
    fundingStatus: text(60),
    functionalExpertise: text(60),
    seniorityLevel: text(60),
    operationalFocus: plainList(),
    investmentStages: plainList(10),
    checkSizeMin: checkSize,
    checkSizeMax: checkSize,
    sectorPreferences: tags(20),
    technicalSkills: tags(30),
    projectTypes: plainList(),
    collaborationInterests: text(1000),
    hiddenFields: z.array(z.string()).max(20).transform(sanitizeHiddenFields),
  })
  .partial()
  .superRefine((v, ctx) => {
    if (v.checkSizeMin != null && v.checkSizeMax != null && v.checkSizeMin > v.checkSizeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkSizeMax'],
        message: 'Maximum check size must be at least the minimum',
      });
    }
  });

export type ProfileUpdate = z.output<typeof profileUpdateSchema>;

export async function getOwnProfile(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, email: true, approvedAt: true, createdAt: true } } },
  });
  if (!profile) throw Errors.notFound('Profile');
  return profile;
}

/** Updates the caller's own profile; the actor comes from the session only (G2). */
export async function updateOwnProfile(userId: string, input: ProfileUpdate) {
  const current = await getOwnProfile(userId);
  const { name, ...profileInput } = input;
  const primaryRole = profileInput.primaryRole ?? current.primaryRole;
  const secondaryRoles = [...new Set(profileInput.secondaryRoles ?? current.secondaryRoles)].filter(
    (r) => r !== primaryRole,
  );
  const merged = { ...current, ...profileInput, primaryRole, secondaryRoles };
  const completenessScore = calculateCompleteness(merged);

  return prisma.$transaction(async (tx) => {
    if (name) await tx.user.update({ where: { id: userId }, data: { name } });
    return tx.profile.update({
      where: { userId },
      data: { ...profileInput, primaryRole, secondaryRoles, completenessScore },
    });
  });
}

export async function completeOnboarding(userId: string) {
  await prisma.profile.update({
    where: { userId },
    data: { onboardingCompletedAt: new Date() },
  });
}

/**
 * Loads another member's profile as `viewerId` sees it. Returns 404 for members who
 * are not ACTIVE, have no profile, or are blocked in either direction (G9, G2).
 */
export async function getMemberProfile(viewerId: string, memberId: string): Promise<MemberView> {
  const profile = await prisma.profile.findFirst({
    where: { userId: memberId, user: { accountStatus: 'ACTIVE' } },
    include: { user: { select: { id: true, name: true, approvedAt: true, createdAt: true } } },
  });
  if (!profile) throw Errors.notFound('Member');
  if (viewerId === memberId) return toMemberView(profile, { isSelf: true, connected: false }, 'self');
  if (await isBlockedEitherWay(prisma, viewerId, memberId)) throw Errors.notFound('Member');
  const status = await connectionStatus(prisma, viewerId, memberId);
  return toMemberView(profile, { isSelf: false, connected: status === 'connected' }, status);
}
