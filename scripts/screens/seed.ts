/**
 * Screen-review data (local only). Wipes the database and fills it at one of four levels so every
 * screen can be photographed empty, with a few items, a medium amount and a lot:
 *   SCREENS_LEVEL=empty|few|medium|lots tsx scripts/screens/seed.ts
 * The same named personas exist at every level; everything around them scales. Writes the ids the
 * screenshot script needs to .data/screens/ids.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PrismaClient, type Prisma, type RoleType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateCompleteness } from '../../lib/services/profile-fields';
import { CHARTER_VERSION } from '../../content/charter';

const prisma = new PrismaClient();
const LEVELS = ['empty', 'few', 'medium', 'lots'] as const;
type Level = (typeof LEVELS)[number];
const level = (process.env.SCREENS_LEVEL ?? 'medium') as Level;
if (!LEVELS.includes(level)) throw new Error(`SCREENS_LEVEL must be one of ${LEVELS.join(', ')}`);
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('Refusing to run: screen data is for a local database only (DATABASE_URL must point at localhost).');
}

export const PASSWORD = 'ScreenPass1';
const DAY = 86_400_000;
const now = Date.now();
const ago = (days: number) => new Date(now - days * DAY);
const ahead = (days: number) => new Date(now + days * DAY);
const month = (d: Date) => d.toISOString().slice(0, 7);

/** How much of everything each level has. */
const N = {
  empty: { members: 0, connections: 0, incoming: 0, outgoing: 0, convos: 0, longThread: 0, gatherings: 0, wins: 0, requests: 0, prospects: 0, reports: 0, intros: 0, quotes: 0, invites: 0, audit: 0 },
  few: { members: 6, connections: 2, incoming: 1, outgoing: 1, convos: 1, longThread: 4, gatherings: 1, wins: 1, requests: 2, prospects: 3, reports: 1, intros: 1, quotes: 1, invites: 1, audit: 5 },
  medium: { members: 30, connections: 8, incoming: 3, outgoing: 2, convos: 5, longThread: 14, gatherings: 4, wins: 8, requests: 8, prospects: 20, reports: 4, intros: 4, quotes: 3, invites: 5, audit: 40 },
  lots: { members: 140, connections: 45, incoming: 14, outgoing: 8, convos: 25, longThread: 90, gatherings: 14, wins: 45, requests: 40, prospects: 180, reports: 18, intros: 16, quotes: 6, invites: 30, audit: 300 },
}[level];

const FIRST = ['Amina', 'Beatriz', 'Chiara', 'Dalia', 'Elif', 'Farah', 'Gabriela', 'Hiba', 'Ingrid', 'Jasmine', 'Kemi', 'Lucia', 'Mariam', 'Nkechi', 'Oksana', 'Priya', 'Qiana', 'Rania', 'Selam', 'Tamar', 'Uma', 'Valentina', 'Wanjiru', 'Ximena', 'Yasmin', 'Zara', 'Abebech', 'Bethlehem', 'Hanna', 'Liya'];
const LAST = ['Okonkwo', 'Silva', 'Romano', 'Haddad', 'Yilmaz', 'Khan', 'Moreno', 'Tesfaye', 'Larsen', 'Chen', 'Adeyemi', 'Fernández', 'Mensah', 'Mwangi', 'Kovalenko', 'Sharma', 'Brooks', 'Nasser', 'Bekele', 'Levi', 'Patel', 'Rossi', 'Kamau', 'Ortega', 'Rahman', 'Ali', 'Girma', 'Alemu', 'Tadesse', 'Van der Westhuizen-Ramaswamy'];
const PLACES: Array<[string, string]> = [['Lagos', 'NG'], ['Nairobi', 'KE'], ['Addis Ababa', 'ET'], ['London', 'GB'], ['Berlin', 'DE'], ['Madrid', 'ES'], ['São Paulo', 'BR'], ['Toronto', 'CA'], ['New York', 'US'], ['Dubai', 'AE'], ['Singapore', 'SG'], ['Accra', 'GH'], ['Cape Town', 'ZA'], ['Paris', 'FR'], ['Mexico City', 'MX']];
const TAGS = ['fintech', 'payments', 'climate', 'health', 'ai', 'saas', 'b2b', 'marketplaces', 'hiring', 'growth', 'design', 'data', 'fundraising', 'devtools', 'edtech', 'logistics'];
const ROLES: RoleType[] = ['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER'];
const LONG = 'We are building the operating system for small clinics across East Africa: scheduling, payments, records and supplier ordering in one place, offline-first because connectivity is patchy. ';

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)]!;
const some = <T,>(a: readonly T[], n: number) => [...a].sort(() => rand() - 0.5).slice(0, n);

function roleFields(role: RoleType, i: number): Record<string, unknown> {
  switch (role) {
    case 'FOUNDER':
      return { companyName: pick(['Paystride', 'Greenloop', 'Kliniq', 'Shamba Labs', 'Nurture Health', 'Freightly']), companyStage: pick(['Idea', 'Pre-seed', 'Seed', 'Series A']), industry: pick(['Fintech', 'Climate', 'Health', 'Logistics']), fundingStatus: pick(['Raising now', 'Raising in 6 months', 'Not raising']), raiseAmount: pick([250, 800, 1500, 3000]) };
    case 'OPERATOR':
      return { functionalExpertise: pick(['Engineering', 'Marketing', 'Operations', 'People / HR', 'Finance']), seniorityLevel: pick(['Manager', 'Director', 'VP', 'C-level']), operationalFocus: some(['hiring', 'growth', 'pricing', 'process'], 2) };
    case 'INVESTOR':
      return { investorType: pick(['Angel', 'VC fund', 'Syndicate lead']), firmName: i % 2 ? 'Harbor Lane Capital' : null, leadsRounds: pick(['Leads', 'Follows', 'Both']), investmentStages: some(['Pre-seed', 'Seed', 'Series A'], 2), checkSizeMin: 25, checkSizeMax: pick([100, 500, 1500]), sectorPreferences: some(TAGS, 2), currentlyInvesting: i % 5 !== 0, investingConfirmedAt: ago(i % 7 === 0 ? 200 : 10), lastCheckMonth: month(ago(40)) };
    case 'BUILDER':
      return { technicalSkills: some(['python', 'react', 'figma', 'kubernetes', 'ml'], 3), projectTypes: some(['Mobile apps', 'SaaS', 'Open source', 'AI products'], 2), collaborationInterests: 'Advising early-stage teams on their first technical hires' };
  }
}

const hash = bcrypt.hashSync(PASSWORD, 4);

async function makeMember(opts: {
  email: string; name: string; role: RoleType; secondary?: RoleType[]; i: number; profile?: Record<string, unknown>;
  user?: Partial<Prisma.UserCreateInput>; complete?: boolean; joinedDaysAgo?: number;
}) {
  const [city, country] = PLACES[opts.i % PLACES.length]!;
  const complete = opts.complete !== false;
  const roles = [opts.role, ...(opts.secondary ?? [])];
  const profile: Record<string, unknown> = complete
    ? {
        primaryRole: opts.role, secondaryRoles: opts.secondary ?? [],
        headline: opts.i % 9 === 4 ? `${pick(['Founder', 'Operator', 'Investor'])} building something long-named across three markets and two continents` : `${roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase()).join(' & ')} · ${pick(TAGS)}`,
        city, country, expertiseAreas: some(TAGS, opts.i % 4 === 0 ? 7 : 3),
        needs: opts.i % 6 === 0 ? LONG + LONG : `Introductions to ${pick(['seed investors', 'a fractional CFO', 'design partners', 'enterprise buyers'])}`,
        offerings: `Advice on ${pick(TAGS)} and ${pick(TAGS)}`,
        currentFocus: opts.i % 6 === 0 ? LONG : 'Getting to our next milestone',
        professionalBackground: 'Ten years across product and operations roles in high-growth startups.',
        openTo: some(['Advising', 'Investing', 'Hiring', 'Mentoring', 'Speaking'], 2),
        linkedInUrl: `https://www.linkedin.com/in/screens-${opts.i}`,
        websiteUrl: opts.i % 3 ? null : 'https://example.org',
        hiddenFields: opts.i % 4 === 1 ? ['location', 'websiteUrl'] : [],
        onboardingCompletedAt: ago(30),
        ...Object.assign({}, ...roles.map((r) => roleFields(r, opts.i))),
        ...opts.profile,
      }
    : { primaryRole: opts.role, secondaryRoles: [], city, country, ...opts.profile };
  return prisma.user.create({
    data: {
      email: opts.email, passwordHash: hash, name: opts.name, accountStatus: 'ACTIVE',
      emailVerifiedAt: ago(60), approvedAt: ago(opts.joinedDaysAgo ?? 60), charterVersion: CHARTER_VERSION,
      charterAcceptedAt: ago(60), charterNoticeVersion: CHARTER_VERSION, lastActiveAt: ago(opts.i % 20),
      notificationPreference: { create: {} },
      profile: { create: { ...(profile as Prisma.ProfileCreateWithoutUserInput), completenessScore: calculateCompleteness(profile as never) } },
      ...opts.user,
    },
  });
}

const pairKey = (a: string, b: string) => (a < b ? [a, b] : [b, a]) as [string, string];
const connected = new Set<string>();
async function connect(a: string, b: string, daysAgo = 20) {
  const [userAId, userBId] = pairKey(a, b);
  if (a === b || connected.has(userAId + userBId)) return null;
  connected.add(userAId + userBId);
  return prisma.connection.create({ data: { userAId, userBId, createdAt: ago(daysAgo) } });
}

const MESSAGES = ['Lovely to meet you at the dinner!', 'Would you have 20 minutes next week to talk about your raise?', 'Sharing the deck here, curious what you think.', 'Thank you, this is really helpful.', 'Absolutely. Tuesday at 3pm works for me.', LONG];
async function thread(a: string, b: string, count: number, unread: number) {
  const c = (await connect(a, b, count + 2)) ?? (await prisma.connection.findFirstOrThrow({ where: { userAId: pairKey(a, b)[0], userBId: pairKey(a, b)[1] } }));
  await prisma.message.createMany({
    data: Array.from({ length: count }, (_, k) => {
      const fromA = k % 2 === 0;
      const isUnreadForA = k >= count - unread && !fromA;
      return {
        connectionId: c.id, senderId: fromA ? a : b, receiverId: fromA ? b : a,
        content: k === 3 ? MESSAGES[5]! : MESSAGES[k % 5]!,
        createdAt: new Date(now - (count - k) * 3_600_000 * 5), readAt: isUnreadForA ? null : new Date(),
      };
    }),
  });
}

async function main() {
  // Wipe everything except the migrations table.
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);

  const admin = await prisma.user.create({
    data: { email: 'admin@screens.test', passwordHash: hash, name: 'Selam Admin', isAdmin: true, accountStatus: 'ACTIVE', emailVerifiedAt: ago(90), approvedAt: ago(90), charterVersion: CHARTER_VERSION, charterAcceptedAt: ago(90), notificationPreference: { create: {} } },
  });
  // The personas photographed at every level.
  const founder = await makeMember({ email: 'founder@screens.test', name: 'Amara Okafor', role: 'FOUNDER', i: 0, user: { showcaseOptIn: true } });
  const investor = await makeMember({ email: 'investor@screens.test', name: 'Divya Iyer', role: 'INVESTOR', i: 2, user: { isReviewer: true, showcaseOptIn: true }, profile: { investingConfirmedAt: ago(200) } });
  const operator = await makeMember({ email: 'operator@screens.test', name: 'Sofia Martínez', role: 'OPERATOR', i: 3, user: { preferIntroductions: true } });
  const builder = await makeMember({ email: 'builder@screens.test', name: 'Mei Chen', role: 'BUILDER', i: 5 });
  const multi = await makeMember({ email: 'multi@screens.test', name: 'Hannah Wolde-Giorgis Abernathy', role: 'FOUNDER', secondary: ['OPERATOR', 'INVESTOR'], i: 6 });
  const newbie = await makeMember({ email: 'newbie@screens.test', name: 'Zoe Tadesse', role: 'BUILDER', i: 7, complete: false, joinedDaysAgo: 0 });
  const personas = [founder, investor, operator, builder, multi];

  // Everyone else.
  const others = [];
  for (let i = 0; i < N.members; i++) {
    const role = ROLES[i % 4]!;
    others.push(await makeMember({
      email: `member${i}@screens.test`, name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`, role,
      secondary: i % 5 === 0 ? [ROLES[(i + 1) % 4]!] : [], i: i + 10, user: { showcaseOptIn: i < 8, preferIntroductions: i % 11 === 3 },
      joinedDaysAgo: i % 13,
    }));
  }

  // Connections, requests and conversations around each persona.
  for (const [pi, p] of personas.entries()) {
    for (let k = 0; k < N.connections && k < others.length; k++) await connect(p.id, others[(k + pi * 3) % others.length]!.id, k + 1);
    for (let k = 0; k < N.incoming && others.length; k++) {
      const from = others[(others.length - 1 - k - pi) % others.length]!;
      if (connected.has(pairKey(p.id, from.id).join(''))) continue;
      await prisma.connectionRequest.create({ data: { senderId: from.id, receiverId: p.id, message: k % 2 ? 'I loved your talk on hiring your first engineers. Would be great to connect!' : null, expiresAt: ahead(25), createdAt: ago(k) } });
    }
    for (let k = 0; k < N.outgoing && others.length; k++) {
      const to = others[(others.length - 1 - N.incoming - k - pi) % others.length]!;
      if (connected.has(pairKey(p.id, to.id).join(''))) continue;
      await prisma.connectionRequest.create({ data: { senderId: p.id, receiverId: to.id, expiresAt: ahead(28), createdAt: ago(k + 1) } });
    }
    for (let k = 0; k < N.convos && k < others.length; k++) {
      await thread(p.id, others[(k + pi * 3) % others.length]!.id, k === 0 ? N.longThread : 2 + (k % 4), k < 2 ? 1 : 0);
    }
  }
  if (N.connections) {
    await connect(founder.id, investor.id, 3);
    await connect(founder.id, operator.id, 5);
    await thread(founder.id, investor.id, Math.max(3, Math.floor(N.longThread / 3)), 1);
  }

  // Gatherings: past and upcoming, with seats.
  for (let g = 0; g < N.gatherings; g++) {
    const past = g % 3 === 2;
    const startsAt = past ? ago(10 + g * 7) : ahead(5 + g * 6);
    const gathering = await prisma.gathering.create({
      data: {
        title: g % 4 === 1 ? 'Founders & investors working session on raising your first institutional round' : pick(['Founders dinner', 'Climate builders breakfast', 'Investor office hours', 'Operators supper club']),
        type: g % 2 ? 'WORKING_SESSION' : 'DINNER', description: 'A small table of members swapping notes on what is working. Dietary needs are welcome in your note.',
        startsAt, timeZone: 'Africa/Nairobi', durationMinutes: 150, online: g % 5 === 4, city: PLACES[g % PLACES.length]![0], country: PLACES[g % PLACES.length]![1],
        venue: 'The Long Table, 12 Riverside Road', capacity: 8 + (g % 3) * 6, seatMode: g % 2 ? 'OPEN' : 'CURATED',
        requestsCloseAt: new Date(startsAt.getTime() - 2 * DAY), showOnPublicSite: g < 2, createdById: admin.id,
        status: g === 3 ? 'CANCELLED' : 'SCHEDULED', cancelReason: g === 3 ? 'The venue closed for renovations. We will reschedule soon.' : null,
      },
    });
    const pool = [...personas, ...others].slice(0, Math.min(gathering.capacity + 3, 4 + others.length));
    await prisma.seatRequest.createMany({
      data: pool.map((m, k) => ({
        gatheringId: gathering.id, userId: m.id, note: k % 3 ? null : 'Vegetarian, please.',
        status: (k === 0 && g === 0 ? 'REQUESTED' : k % 5 === 4 ? 'WAITLISTED' : k % 4 === 3 ? 'REQUESTED' : 'CONFIRMED') as 'REQUESTED',
        attendance: past ? (k % 6 === 5 ? 'NO_SHOW' : 'ATTENDED') : null, createdAt: ago(3),
      })),
    });
  }

  // Wins, introductions, reports, quotes.
  const winTypes = ['INVESTMENT', 'HIRE', 'ADVISOR', 'CUSTOMER', 'COFOUNDER', 'SPEAKING'] as const;
  for (let w = 0; w < N.wins; w++) {
    const author = w < 3 ? personas[w]! : others[w % others.length]!;
    const partner = w < 3 ? personas[(w + 1) % personas.length]! : others[(w + 3) % others.length]!;
    await prisma.win.create({
      data: {
        authorId: author.id, type: winTypes[w % winTypes.length]!, source: w % 2 ? 'INTRODUCTION' : 'GATHERING', month: month(ago(w * 4)),
        outsideNetwork: w % 4 === 2, amountK: w % 6 === 0 ? 250 : null, story: w % 3 ? null : 'We met at the founders dinner and closed the round six weeks later.',
        visibility: w % 3 === 0 ? 'QUOTABLE' : 'MEMBERS', verifiedAt: w % 2 ? new Date() : null, createdAt: ago(w),
        participants: { create: { userId: partner.id, status: w % 2 ? 'CONFIRMED' : 'PENDING', respondedAt: w % 2 ? new Date() : null } },
      },
    });
  }
  for (let k = 0; k < N.intros && others.length > 2; k++) {
    const team = k % 3 === 2;
    const requester = k % 2 ? founder : others[k % others.length]!;
    await prisma.introduction.create({
      data: {
        requesterId: requester.id, introducerId: team ? null : k % 2 ? investor.id : founder.id, viaTeam: team,
        targetId: others[(k + 5) % others.length]!.id, noteToIntroducer: 'Could you introduce me? We are raising and she leads seed rounds in fintech.',
        noteToTarget: 'Hi! I would love 20 minutes to hear how you think about B2B payments.', status: (['ASKED', 'FORWARDED', 'ACCEPTED', 'ASKED'] as const)[k % 4],
        introducerDueAt: ahead(5), targetDueAt: k % 4 === 1 ? ahead(6) : null, forwardedAt: k % 4 ? ago(1) : null, createdAt: ago(k + 1),
      },
    });
  }
  const reasons = ['HARASSMENT', 'SPAM', 'FAKE_PROFILE', 'INAPPROPRIATE_CONTENT', 'OTHER'] as const;
  for (let r = 0; r < N.reports && others.length; r++) {
    const reported = others[(r * 3) % others.length]!;
    await prisma.report.create({
      data: {
        reporterId: personas[r % personas.length]!.id, reportedUserId: reported.id, reportedUserName: reported.name, reason: reasons[r % reasons.length]!,
        details: r % 2 ? 'Sent the same pitch to several members within an hour.' : null, status: r % 4 === 3 ? 'RESOLVED' : 'OPEN',
        resolvedAt: r % 4 === 3 ? ago(1) : null, resolvedById: r % 4 === 3 ? admin.id : null, resolutionNote: r % 4 === 3 ? 'Spoke with the member.' : null, createdAt: ago(r),
      },
    });
  }
  const quoted = [founder, investor, ...others.slice(0, 6)];
  for (let q = 0; q < N.quotes; q++) {
    await prisma.testimonial.create({ data: { authorId: quoted[q]!.id, text: q % 2 ? 'The introductions here are the warmest I have had anywhere. Two of my angels came from one dinner.' : 'Finally a room where I do not have to explain myself before I can ask for help.', status: q === N.quotes - 1 ? 'PENDING' : 'APPROVED', decidedAt: ago(2) } });
  }
  if (N.quotes) {
    await prisma.siteSetting.create({ data: { key: 'showcase', value: quoted.slice(0, Math.min(6, N.quotes + 2)).map((u) => u.id), updatedById: admin.id } });
  }

  // The front door: invitation requests (with votes), prospects, invitations.
  for (let r = 0; r < N.requests; r++) {
    const name = `${FIRST[(r + 3) % FIRST.length]} ${LAST[(r + 11) % LAST.length]}`;
    const email = `request${r}@screens.test`;
    const [city, country] = PLACES[r % PLACES.length]!;
    const status = r % 5 === 3 ? 'INVITED' : r % 7 === 6 ? 'DECLINED' : 'OPEN';
    const pm = await prisma.potentialMember.create({ data: { name, email, role: ROLES[r % 4]!.toLowerCase(), discoverySource: 'Website request', linkedInUrl: `https://www.linkedin.com/in/request-${r}`, outreachStatus: status === 'INVITED' ? 'INVITED' : status === 'DECLINED' ? 'NOT_A_FIT' : 'REQUESTED' } });
    await prisma.invitationRequest.create({
      data: {
        potentialMemberId: pm.id, name, email, linkedInUrl: `https://www.linkedin.com/in/request-${r}`, primaryRole: ROLES[r % 4]!, city, country,
        statement: r % 4 === 0 ? LONG + LONG : 'I run a 12-person logistics startup and would love to meet other founders raising in East Africa.',
        referrer: r % 3 ? null : 'Amara Okafor', consentAt: ago(r), slaStartsAt: ago(r % 25), createdAt: ago(r % 25), status,
        decidedAt: status === 'OPEN' ? null : ago(1), waitlisted: r % 9 === 8,
        votes: r % 3 === 1 ? { create: [{ voterId: investor.id, choice: 'APPROVE', note: 'Strong founder, great fit.' }] } : undefined,
      },
    });
  }
  const statuses = ['IDENTIFIED', 'REVIEWED', 'CONTACTED', 'FOLLOW_UP_NEEDED', 'INTERESTED', 'NOT_INTERESTED', 'DO_NOT_CONTACT'] as const;
  for (let p = 0; p < N.prospects; p++) {
    const s = statuses[p % statuses.length]!;
    const pm = await prisma.potentialMember.create({
      data: {
        name: `${FIRST[(p + 5) % FIRST.length]} ${LAST[(p * 3) % LAST.length]}${p >= FIRST.length ? ` ${p}` : ''}`, email: `prospect${p}@screens.test`, company: p % 3 ? 'Atlas Capital' : 'Tinker Labs',
        role: pick(['Founder', 'Investor', 'Operator']), discoverySource: pick(['Event', 'Referral', 'Research']), referrerName: p % 4 ? null : 'Divya Iyer',
        outreachStatus: s, nextFollowUpDate: p % 3 === 0 ? ahead((p % 9) - 3) : null, assignedAdminId: p % 2 ? admin.id : null,
        statusChanges: { create: { toStatus: s, changedById: admin.id } },
        notes: p % 4 === 0 ? { create: { content: 'Met at the climate summit; follow up after her product launch.', createdById: admin.id } } : undefined,
      },
    });
    if (p % 5 === 0) await prisma.outreachAttempt.create({ data: { potentialMemberId: pm.id, attemptDate: ago(3), method: 'Email', outcome: 'No reply yet', createdById: admin.id } });
  }
  for (let v = 0; v < N.invites; v++) {
    await prisma.invitation.create({ data: { email: `invitee${v}@screens.test`, tokenHash: `screens-${v}-${now}`, invitedById: admin.id, expiresAt: v % 4 === 3 ? ago(1) : ahead(10), usedAt: v % 3 === 2 ? ago(2) : null, createdAt: ago(v % 14) } });
  }
  const actions = ['member.deactivate', 'request.invite', 'prospect.update', 'gathering.create', 'settings.update', 'report.resolve'];
  await prisma.auditLog.createMany({ data: Array.from({ length: N.audit }, (_, a) => ({ actorId: admin.id, action: actions[a % actions.length]!, targetType: 'User', targetId: personas[a % 5]!.id, details: { note: 'screen data' }, createdAt: ago(a / 10) })) });
  if (N.audit) {
    await prisma.emailOutbox.createMany({ data: Array.from({ length: Math.min(N.audit, 50) }, (_, e) => ({ to: `member${e}@screens.test`, kind: 'connection_request', subject: 'Someone wants to connect', text: `Open https://women-builders.vercel.app/connections/requests to reply.`, html: '<p>Someone wants to connect.</p>', status: 'SENT' as const, createdAt: ago(e / 5) })) });
  }

  const gatherings = await prisma.gathering.findMany({ orderBy: { startsAt: 'asc' }, select: { id: true } });
  const prospect = await prisma.potentialMember.findFirst({ where: { requests: { none: {} } }, select: { id: true } });
  const requested = await prisma.potentialMember.findFirst({ where: { requests: { some: {} } }, select: { id: true } });
  const chat = await prisma.message.findFirst({ where: { OR: [{ senderId: founder.id }, { receiverId: founder.id }] }, select: { senderId: true, receiverId: true } });
  const ids = {
    level, password: PASSWORD,
    users: { admin: admin.email, founder: founder.email, investor: investor.email, operator: operator.email, builder: builder.email, multi: multi.email, newbie: newbie.email },
    ids: {
      founder: founder.id, investor: investor.id, operator: operator.id, multi: multi.id, newbie: newbie.id,
      other: others[0]?.id ?? null, chatWith: chat ? (chat.senderId === founder.id ? chat.receiverId : chat.senderId) : null,
      gathering: gatherings[0]?.id ?? null, prospect: prospect?.id ?? null, requestedProspect: requested?.id ?? null,
    },
  };
  mkdirSync('.data/screens', { recursive: true });
  writeFileSync('.data/screens/ids.json', JSON.stringify(ids, null, 2));
  console.log(`Seeded "${level}": ${others.length + 6} members, ${connected.size} connections, ${N.gatherings} gatherings, ${N.wins} wins, ${N.requests} requests, ${N.prospects} prospects.`);
}

main().finally(() => prisma.$disconnect());
