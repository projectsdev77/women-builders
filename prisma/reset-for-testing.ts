/**
 * Empties the database and creates three accounts for hands-on testing: one admin and two members.
 * Every table is cleared (members, requests, messages, gatherings, wins, potential members, settings);
 * the schema and migrations stay. Photos already in storage are left behind but no longer referenced.
 *
 *   CONFIRM_WIPE=yes DATABASE_URL=… ADMIN_EMAIL=… ADMIN_PASSWORD=… \
 *   MEMBER1_EMAIL=… MEMBER1_PASSWORD=… MEMBER2_EMAIL=… MEMBER2_PASSWORD=… npx tsx prisma/reset-for-testing.ts
 */
import { PrismaClient, type RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateCompleteness } from '../lib/services/profile-fields';
import { passwordSchema } from '../lib/validation/common';
import { CHARTER_VERSION } from '../content/charter';

const prisma = new PrismaClient();

function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Set ${name}`);
  return v;
}

function account(prefix: string, fallbackName: string) {
  const email = need(`${prefix}_EMAIL`).toLowerCase();
  const password = need(`${prefix}_PASSWORD`);
  const check = passwordSchema.safeParse(password);
  if (!check.success) throw new Error(`${prefix}_PASSWORD: ${check.error.issues[0]?.message}`);
  return { email, password, name: process.env[`${prefix}_NAME`]?.trim() || fallbackName };
}

const MEMBER_PROFILES: Array<{ role: RoleType; fields: Record<string, unknown> }> = [
  {
    role: 'FOUNDER',
    fields: {
      headline: 'Founder, testing the platform',
      city: 'Addis Ababa',
      country: 'ET',
      expertiseAreas: ['product', 'fintech'],
      needs: 'Introductions to seed investors and a first engineering hire',
      offerings: 'Product strategy and early customer research',
      currentFocus: 'Getting our first ten paying customers',
      professionalBackground: 'Product lead turned founder.',
      companyName: 'Test Company',
      companyStage: 'Pre-seed',
      industry: 'Fintech',
      fundingStatus: 'Raising now',
    },
  },
  {
    role: 'INVESTOR',
    fields: {
      headline: 'Angel investor, testing the platform',
      city: 'Nairobi',
      country: 'KE',
      expertiseAreas: ['fundraising', 'fintech'],
      needs: 'Early-stage founders building in fintech',
      offerings: 'Angel checks, pitch feedback and investor introductions',
      currentFocus: 'Backing pre-seed fintech founders',
      professionalBackground: 'Former operator, now investing.',
      investmentStages: ['Pre-seed', 'Seed'],
      checkSizeMin: 25,
      checkSizeMax: 100,
      sectorPreferences: ['fintech'],
      investorType: 'Angel',
      leadsRounds: 'Follows',
      currentlyInvesting: true,
      investingConfirmedAt: new Date(),
    },
  },
];

async function main() {
  if (process.env.CONFIRM_WIPE !== 'yes') throw new Error('This deletes ALL data. Set CONFIRM_WIPE=yes to continue.');
  const host = new URL(need('DATABASE_URL')).host;
  const admin = account('ADMIN', 'Admin');
  const members = [account('MEMBER1', 'Member One'), account('MEMBER2', 'Member Two')];
  const emails = [admin.email, ...members.map((m) => m.email)];
  if (new Set(emails).size !== emails.length) throw new Error('The three accounts need three different emails.');

  console.log(`Wiping every table in ${host} …`);
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"public"."${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }

  const now = new Date();
  await prisma.user.create({
    data: {
      email: admin.email,
      passwordHash: await bcrypt.hash(admin.password, 12),
      name: admin.name,
      isAdmin: true,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: now,
      approvedAt: now,
      charterVersion: CHARTER_VERSION,
      charterAcceptedAt: now,
      notificationPreference: { create: {} },
    },
  });

  for (const [i, m] of members.entries()) {
    const { role, fields } = MEMBER_PROFILES[i]!;
    const profile = { primaryRole: role, secondaryRoles: [] as RoleType[], ...fields };
    await prisma.user.create({
      data: {
        email: m.email,
        passwordHash: await bcrypt.hash(m.password, 12),
        name: m.name,
        accountStatus: 'ACTIVE',
        emailVerifiedAt: now,
        approvedAt: now,
        charterVersion: CHARTER_VERSION,
        charterAcceptedAt: now,
        lastActiveAt: now,
        profile: { create: { ...profile, completenessScore: calculateCompleteness(profile as never), onboardingCompletedAt: now } },
        notificationPreference: { create: {} },
      },
    });
  }

  console.log('Done. The database now holds only:');
  console.log(`  admin   ${admin.email}`);
  for (const [i, m] of members.entries()) console.log(`  member  ${m.email} (${m.name}, ${MEMBER_PROFILES[i]!.role.toLowerCase()})`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
