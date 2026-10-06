/**
 * Seeds an admin account and, unless SEED_DEMO=0, a set of demo members.
 * The admin has no member profile, so it never appears in the directory (G10).
 */
import { PrismaClient, type RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateCompleteness } from '../lib/services/profile-fields';
import { CHARTER_VERSION } from '../content/charter';

const prisma = new PrismaClient();

const DEMO: Array<{
  name: string;
  role: RoleType;
  secondary?: RoleType[];
  headline: string;
  city: string;
  country: string;
  expertise: string[];
  needs: string;
  offerings: string;
  focus: string;
  extra: Record<string, unknown>;
}> = [
  { name: 'Amara Okafor', role: 'FOUNDER', headline: 'Founder & CEO, Ledgerly (B2B payments)', city: 'Lagos', country: 'NG', expertise: ['fintech', 'payments', 'b2b-saas'], needs: 'Intros to seed fintech investors and a fractional CFO', offerings: 'Payments infrastructure advice and African market expansion', focus: 'Raising our seed round', extra: { companyName: 'Ledgerly', companyStage: 'Pre-seed', industry: 'Fintech', fundingStatus: 'Raising now', raiseAmount: 1500, openTo: ['Mentoring'] } },
  { name: 'Priya Raman', role: 'INVESTOR', headline: 'Partner at Northlight Ventures', city: 'San Francisco', country: 'US', expertise: ['fintech', 'saas', 'fundraising'], needs: 'Deal flow from technical women founders in fintech', offerings: 'Seed fintech investor intros, fundraising strategy and pitch feedback', focus: 'Leading seed rounds in fintech and B2B SaaS', extra: { investmentStages: ['Pre-seed', 'Seed'], checkSizeMin: 250, checkSizeMax: 1500, sectorPreferences: ['fintech', 'b2b-saas'], firmName: 'Northlight Ventures', investorType: 'VC fund', leadsRounds: 'Leads', currentlyInvesting: true, investingConfirmedAt: new Date(), lastCheckMonth: '2026-08', openTo: ['Investing', 'Advising'] } },
  { name: 'Sofia Martínez', role: 'OPERATOR', headline: 'VP Growth at Brightpath', city: 'Madrid', country: 'ES', expertise: ['growth', 'marketing', 'plg'], needs: 'Peers scaling PLG motions in Europe', offerings: 'Growth marketing, PLG funnels and hiring growth teams', focus: 'Scaling self-serve revenue', extra: { functionalExpertise: 'Marketing', seniorityLevel: 'VP', operationalFocus: ['growth', 'hiring'] } },
  { name: 'Mei Chen', role: 'BUILDER', headline: 'Staff ML engineer, open-source maintainer', city: 'Toronto', country: 'CA', expertise: ['machine-learning', 'python', 'ai'], needs: 'Founders who need an AI technical advisor', offerings: 'Machine learning architecture reviews and AI prototyping', focus: 'Building open-source evaluation tooling for LLMs', extra: { technicalSkills: ['python', 'pytorch', 'machine-learning'], projectTypes: ['Open source', 'AI products'], collaborationInterests: 'Advising early-stage AI startups', openTo: ['Advising', 'Freelance or project work'] } },
  { name: 'Hannah Schmidt', role: 'FOUNDER', secondary: ['INVESTOR'], headline: 'Founder at Greenloop, angel in climate', city: 'Berlin', country: 'DE', expertise: ['climate', 'hardware', 'supply-chain'], needs: 'Manufacturing partners and a technical co-founder', offerings: 'Angel investment in climate startups and hardware supply chain advice', focus: 'Pilot deployments of our battery recycling line', extra: { companyName: 'Greenloop', companyStage: 'Seed', industry: 'Climate', investmentStages: ['Pre-seed'], checkSizeMin: 10, checkSizeMax: 50, sectorPreferences: ['climate'], investorType: 'Angel', leadsRounds: 'Follows', currentlyInvesting: false, investingConfirmedAt: new Date() } },
  { name: 'Li Wei', role: 'BUILDER', headline: 'Product designer, ex-fintech', city: 'Singapore', country: 'SG', expertise: ['design', 'ux', 'fintech'], needs: 'Early-stage fintech teams that need a design partner', offerings: 'Product design, UX research and design systems', focus: 'Freelance design for seed-stage startups', extra: { technicalSkills: ['figma', 'design-systems', 'ux-research'], projectTypes: ['Mobile apps', 'SaaS'] } },
  { name: 'Grace Mensah', role: 'OPERATOR', headline: 'Head of People at Kora', city: 'Accra', country: 'GH', expertise: ['hiring', 'people-ops', 'culture'], needs: 'Advice on equity compensation for remote teams', offerings: 'Hiring plans, people operations and first-100-employee culture', focus: 'Building a remote-first hiring engine', extra: { functionalExpertise: 'People / HR', seniorityLevel: 'Director', operationalFocus: ['hiring'] } },
  { name: 'Olivia Brooks', role: 'INVESTOR', headline: 'Angel investor & former CTO', city: 'London', country: 'GB', expertise: ['ai', 'devtools', 'saas'], needs: 'Technical founders building developer tools', offerings: 'Angel checks, technical due diligence and CTO mentorship', focus: 'Backing AI and devtools founders', extra: { investmentStages: ['Pre-seed', 'Seed'], checkSizeMin: 25, checkSizeMax: 100, sectorPreferences: ['ai', 'devtools'], investorType: 'Angel', leadsRounds: 'Follows', currentlyInvesting: true, investingConfirmedAt: new Date(), lastCheckMonth: '2026-06', openTo: ['Investing', 'Mentoring'] } },
  { name: 'Fatima Al-Sayed', role: 'FOUNDER', headline: 'Co-founder, Nurture Health', city: 'Dubai', country: 'AE', expertise: ['healthtech', 'b2c', 'regulatory'], needs: 'Healthtech investors and a growth marketing lead', offerings: 'Navigating health regulation in the Gulf region', focus: 'Launching our maternal health app', extra: { companyName: 'Nurture Health', companyStage: 'Seed', industry: 'Health', fundingStatus: 'Raising in 6 months' } },
  { name: 'Ana Gomez', role: 'OPERATOR', secondary: ['BUILDER'], headline: 'Engineering manager at Stackwise', city: 'Mexico City', country: 'MX', expertise: ['engineering-management', 'devops', 'hiring'], needs: 'Mentorship on moving from manager to director', offerings: 'Engineering hiring, DevOps practices and mentoring new managers', focus: 'Growing a 20-person platform team', extra: { functionalExpertise: 'Engineering', seniorityLevel: 'Manager', technicalSkills: ['kubernetes', 'go'] } },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!adminPassword) throw new Error('Set ADMIN_INITIAL_PASSWORD to seed the admin account');

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      name: 'Community Admin',
      isAdmin: true,
      accountStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      approvedAt: new Date(),
      charterVersion: CHARTER_VERSION,
      charterAcceptedAt: new Date(),
      notificationPreference: { create: {} },
    },
  });
  console.log(`Admin: ${adminEmail}`);

  if (process.env.SEED_DEMO === '0') return;
  const demoHash = await bcrypt.hash('DemoPass123', 10);
  for (const [i, m] of DEMO.entries()) {
    const email = `${m.name.split(' ')[0]!.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}@demo.womenbuilders.test`;
    const profile = {
      primaryRole: m.role,
      secondaryRoles: m.secondary ?? [],
      headline: m.headline,
      city: m.city,
      country: m.country,
      expertiseAreas: m.expertise,
      needs: m.needs,
      offerings: m.offerings,
      currentFocus: m.focus,
      professionalBackground: `${m.name.split(' ')[0]} has spent over a decade building in ${m.expertise[0]}.`,
      ...m.extra,
    };
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: demoHash,
        name: m.name,
        accountStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
        approvedAt: new Date(Date.now() - (DEMO.length - i) * 20 * 86400000),
        charterVersion: CHARTER_VERSION,
        charterAcceptedAt: new Date(),
        lastActiveAt: new Date(Date.now() - i * 3 * 86400000),
        profile: {
          create: {
            ...profile,
            completenessScore: calculateCompleteness(profile as never),
            onboardingCompletedAt: new Date(),
          },
        },
        notificationPreference: { create: {} },
      },
    });
  }
  // A couple of invitation requests waiting for review (R3 F3).
  const requests = [
    { name: 'Nadia Petrova', role: 'FOUNDER' as const, city: 'Berlin', country: 'DE', daysAgo: 3, referrer: 'Amara Okafor',
      statement: 'I am building a marketplace for independent women-owned design studios and want to meet other founders.' },
    { name: 'Chloe Dubois', role: 'OPERATOR' as const, city: 'Lyon', country: 'FR', daysAgo: 23, referrer: null,
      statement: 'Head of operations at a climate hardware startup. I would love to swap notes on scaling teams across countries.' },
  ];
  for (const r of requests) {
    const email = `${r.name.split(' ')[0]!.toLowerCase()}@request.womenbuilders.test`;
    if (await prisma.potentialMember.findUnique({ where: { email } })) continue;
    const at = new Date(Date.now() - r.daysAgo * 86400000);
    await prisma.potentialMember.create({
      data: {
        name: r.name,
        email,
        role: r.role.charAt(0) + r.role.slice(1).toLowerCase(),
        discoverySource: 'Website request',
        outreachStatus: 'REQUESTED',
        statusChanges: { create: { fromStatus: null, toStatus: 'REQUESTED' } },
        requests: {
          create: {
            name: r.name, email, primaryRole: r.role, city: r.city, country: r.country, statement: r.statement,
            referrer: r.referrer, consentAt: at, slaStartsAt: at, createdAt: at,
          },
        },
      },
    });
  }
  const prospects = [
    { name: 'Rachel Kim', email: 'rachel.kim@example.org', company: 'Atlas Capital', role: 'Investor', discoverySource: 'Event', outreachStatus: 'CONTACTED' as const },
    { name: 'Zainab Yusuf', email: 'zainab@example.org', company: 'Tinker Labs', role: 'Founder', discoverySource: 'Referral', outreachStatus: 'INTERESTED' as const },
    { name: 'Emma Larsen', email: null, linkedInUrl: 'https://www.linkedin.com/in/emma-larsen-demo', company: 'Nordic Health', role: 'Operator', discoverySource: 'Research', outreachStatus: 'IDENTIFIED' as const },
  ];
  for (const p of prospects) {
    const existing = await prisma.potentialMember.findFirst({ where: { name: p.name } });
    if (!existing) {
      const created = await prisma.potentialMember.create({
        data: { ...p, nextFollowUpDate: new Date(Date.now() + 2 * 86400000) },
      });
      await prisma.potentialMemberStatusChange.create({
        data: { potentialMemberId: created.id, fromStatus: null, toStatus: p.outreachStatus },
      });
    }
  }
  console.log(`Demo members seeded (password: DemoPass123)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
