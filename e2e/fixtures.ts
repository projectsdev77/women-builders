import { PrismaClient, type RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CHARTER_VERSION } from '../content/charter';

// Talks to the database directly (no app modules), so it runs under Playwright's loader as-is.
export const prisma = new PrismaClient();

/**
 * Test accounts the suite creates for itself and deletes afterwards, so it runs against any database
 * (including an empty one) and leaves nothing behind. Everything it makes uses an "e2e-" email or an
 * "E2E " title, which is what cleanup() removes.
 */
export const PASSWORD = 'E2eTestPass1';
export const FIX = {
  admin: { email: 'e2e-admin@example.com', name: 'E2E Admin' },
  founder: { email: 'e2e-founder@example.com', name: 'Eden Testfounder' },
  investor: { email: 'e2e-investor@example.com', name: 'Iris Testinvestor' },
  builder: { email: 'e2e-builder@example.com', name: 'Bina Testbuilder' },
} as const;

const PROFILES: Record<RoleType, Record<string, unknown>> = {
  FOUNDER: {
    headline: 'Founder of a payments startup', city: 'Lagos', country: 'NG', expertiseAreas: ['fintech', 'payments'],
    needs: 'Introductions to seed investors', offerings: 'Payments product advice', currentFocus: 'Raising a pre-seed round',
    professionalBackground: 'Ten years in payments.', companyName: 'E2E Payments', companyStage: 'Pre-seed', industry: 'Fintech', fundingStatus: 'Raising now',
  },
  INVESTOR: {
    headline: 'Angel investor in fintech', city: 'Nairobi', country: 'KE', expertiseAreas: ['fintech', 'fundraising'],
    needs: 'Fintech founders at pre-seed', offerings: 'Angel checks and pitch feedback', currentFocus: 'Backing pre-seed fintech',
    professionalBackground: 'Former operator.', investmentStages: ['Pre-seed', 'Seed'], checkSizeMin: 25, checkSizeMax: 100,
    sectorPreferences: ['fintech'], investorType: 'Angel', leadsRounds: 'Follows', currentlyInvesting: true, investingConfirmedAt: new Date(),
  },
  BUILDER: {
    headline: 'Machine learning engineer', city: 'Accra', country: 'GH', expertiseAreas: ['machine-learning', 'python'],
    needs: 'Founders who need an AI advisor', offerings: 'Machine learning architecture reviews', currentFocus: 'Open-source evaluation tools',
    professionalBackground: 'Staff engineer.', technicalSkills: ['python', 'pytorch'], projectTypes: ['AI products'],
  },
  OPERATOR: {
    headline: 'Head of operations', city: 'Kigali', country: 'RW', expertiseAreas: ['operations', 'hiring'],
    needs: 'Peers scaling operations', offerings: 'Operations playbooks', currentFocus: 'Scaling a support team',
    professionalBackground: 'Operations lead.', functionalExpertise: 'Operations', seniorityLevel: 'Director',
  },
};

export async function createMember(opts: { email: string; name: string; role: RoleType; profile?: Record<string, unknown>; preferIntroductions?: boolean }) {
  const now = new Date();
  const profile = { primaryRole: opts.role, secondaryRoles: [] as RoleType[], ...PROFILES[opts.role], ...opts.profile };
  return prisma.user.create({
    data: {
      email: opts.email,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      name: opts.name,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: now,
      approvedAt: now,
      lastActiveAt: now,
      charterVersion: CHARTER_VERSION,
      charterAcceptedAt: now,
      preferIntroductions: opts.preferIntroductions ?? false,
      // Every fixture profile fills all fields, so it is complete; the app recomputes the score on save.
      profile: { create: { ...profile, completenessScore: 100, onboardingCompletedAt: now } },
      notificationPreference: { create: {} },
    },
  });
}

export async function connectMembers(a: string, b: string) {
  const key = a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
  return prisma.connection.upsert({ where: { userAId_userBId: key }, create: key, update: { removedAt: null } });
}

export async function addMessage(from: string, to: string, content: string) {
  const c = await connectMembers(from, to);
  return prisma.message.create({ data: { connectionId: c.id, senderId: from, receiverId: to, content } });
}

/** A throwaway member for tests that change relationships (blocking, deleting…). */
export async function freshMember(tag: string, role: RoleType = 'OPERATOR', extra: Partial<Parameters<typeof createMember>[0]> = {}) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const first = tag.charAt(0).toUpperCase() + tag.slice(1);
  return createMember({ email: `e2e-${tag}-${id}@example.com`, name: `${first} Test${id.slice(-4)}`, role, ...extra });
}

export async function setupFixtures() {
  await cleanup();
  const now = new Date();
  await prisma.user.create({
    data: {
      email: FIX.admin.email, passwordHash: await bcrypt.hash(PASSWORD, 4), name: FIX.admin.name, isAdmin: true, accountStatus: 'ACTIVE',
      emailVerifiedAt: now, approvedAt: now, charterVersion: CHARTER_VERSION, charterAcceptedAt: now, notificationPreference: { create: {} },
    },
  });
  const founder = await createMember({ ...FIX.founder, role: 'FOUNDER' });
  const investor = await createMember({ ...FIX.investor, role: 'INVESTOR' });
  const builder = await createMember({ ...FIX.builder, role: 'BUILDER' });
  await connectMembers(founder.id, builder.id);
  await connectMembers(builder.id, investor.id);
  await addMessage(builder.id, founder.id, 'Welcome to the network! Happy to help with anything ML.');
}

/** Removes everything the suite created. Deleting the users removes their profiles, connections, messages and so on. */
export async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: { startsWith: 'e2e-' } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.report.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { reportedUserId: { in: ids } }, { reportedUserName: { startsWith: 'E2E' } }] } });
  await prisma.gathering.deleteMany({ where: { title: { startsWith: 'E2E ' } } });
  await prisma.win.deleteMany({ where: { OR: [{ authorId: { in: ids } }, { story: { startsWith: 'E2E' } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  // Accounts deleted through the app keep a placeholder row; their e2e conversations go with the other side.
  await prisma.invitation.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
  await prisma.potentialMember.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
  await prisma.publicSubmission.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
  await prisma.emailOutbox.deleteMany({ where: { to: { startsWith: 'e2e-' } } });
  await prisma.loginAttempt.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
}

export async function disconnect() {
  await prisma.$disconnect();
}
