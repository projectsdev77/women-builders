import type { Prisma, WinType } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { Errors } from '@/lib/errors';
import { templates } from '@/lib/email/templates';
import { lock } from './locks';
import { notify } from './notifications';
import { photoUrl } from './photo-url';
import { relationshipSets } from './relationships';
import { endsAt } from './gatherings';

/**
 * Wins (R3 F15): what the network produced. Members choose the visibility; amounts are
 * always private; named members confirm. There is no feed.
 */

const DAY = 86_400_000;
export const WINS_PER_MONTH = 20;
export const WIN_STORY_MAX = 500;
export const WIN_PROMPT_AFTER_INTRO_DAYS = 60;
export const WIN_PROMPT_AFTER_GATHERING_DAYS = 14;

export const WIN_TYPE_LABELS: Record<WinType, string> = {
  INVESTMENT: 'Investment',
  HIRE: 'Hire',
  ADVISOR: 'Advisor or mentor',
  CUSTOMER: 'Customer or partnership',
  COFOUNDER: 'Co-founder',
  SPEAKING: 'Speaking or press',
  OTHER: 'Other',
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export const winSchema = z
  .object({
    type: z.enum(['INVESTMENT', 'HIRE', 'ADVISOR', 'CUSTOMER', 'COFOUNDER', 'SPEAKING', 'OTHER']),
    participantIds: z.array(z.string()).max(10).default([]),
    outsideNetwork: z.boolean().default(false),
    source: z.enum(['INTRODUCTION', 'CONNECTION', 'GATHERING', 'OTHER']).default('OTHER'),
    introductionId: z.string().optional().nullable(),
    gatheringId: z.string().optional().nullable(),
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a month')
      .refine((m) => m <= currentMonth(), 'Choose this month or an earlier one'),
    amountK: z.number().int().min(1).max(10_000_000).optional().nullable(),
    story: z
      .string()
      .trim()
      .max(WIN_STORY_MAX, `Keep it under ${WIN_STORY_MAX} characters`)
      .optional()
      .transform((v) => v || null),
    visibility: z.enum(['ANONYMOUS', 'MEMBERS', 'QUOTABLE']).default('ANONYMOUS'),
  })
  .superRefine((v, ctx) => {
    if (v.amountK != null && v.type !== 'INVESTMENT') ctx.addIssue({ code: 'custom', path: ['amountK'], message: 'Amounts are for investments only' });
    if (v.source === 'INTRODUCTION' && !v.introductionId) ctx.addIssue({ code: 'custom', path: ['introductionId'], message: 'Choose the introduction' });
    if (v.source === 'GATHERING' && !v.gatheringId) ctx.addIssue({ code: 'custom', path: ['gatheringId'], message: 'Choose the gathering' });
  });
export type WinInput = z.output<typeof winSchema>;

export async function logWin(authorId: string, input: WinInput) {
  const participants = [...new Set(input.participantIds)].filter((id) => id !== authorId);
  return prisma.$transaction(async (tx) => {
    await lock(tx, `wins:${authorId}`);
    const monthStart = new Date(`${currentMonth()}-01T00:00:00Z`);
    if ((await tx.win.count({ where: { authorId, createdAt: { gte: monthStart } } })) >= WINS_PER_MONTH) {
      throw Errors.rateLimited(`You can share ${WINS_PER_MONTH} wins a month.`);
    }
    // Named members must be active and not blocked either way.
    if (participants.length) {
      const ok = await tx.user.findMany({
        where: {
          id: { in: participants },
          accountStatus: 'ACTIVE',
          profile: { isNot: null },
          blocksMade: { none: { blockedId: authorId } },
          blocksReceived: { none: { blockerId: authorId } },
        },
        select: { id: true },
      });
      if (ok.length !== participants.length) throw Errors.validation('One of the people you named is not available.');
    }
    let introductionId: string | null = null;
    let gatheringId: string | null = null;
    if (input.source === 'INTRODUCTION') {
      const intro = await tx.introduction.findFirst({
        where: { id: input.introductionId!, status: 'ACCEPTED', OR: [{ requesterId: authorId }, { targetId: authorId }, { introducerId: authorId }] },
      });
      if (!intro) throw Errors.notFound('Introduction');
      introductionId = intro.id;
    }
    if (input.source === 'GATHERING') {
      const g = await tx.gathering.findFirst({
        where: {
          id: input.gatheringId!,
          startsAt: { lt: new Date() },
          OR: [{ seats: { some: { userId: authorId, status: 'CONFIRMED' } } }, { hosts: { some: { userId: authorId } } }],
        },
      });
      if (!g) throw Errors.notFound('Gathering');
      gatheringId = g.id;
    }
    const win = await tx.win.create({
      data: {
        authorId,
        type: input.type,
        source: input.source,
        introductionId,
        gatheringId,
        outsideNetwork: input.outsideNetwork,
        month: input.month,
        amountK: input.type === 'INVESTMENT' ? input.amountK ?? null : null,
        story: input.story,
        visibility: input.visibility,
        participants: { create: participants.map((userId) => ({ userId })) },
      },
    });
    // "May be quoted on the public site": the story goes to the quote approval queue (R3 F16).
    if (input.visibility === 'QUOTABLE' && input.story) {
      await tx.testimonial.create({ data: { authorId, text: input.story, winId: win.id } });
    }
    const author = await tx.user.findUniqueOrThrow({ where: { id: authorId }, select: { name: true } });
    const what = `${WIN_TYPE_LABELS[input.type].toLowerCase()} together (${input.month})`;
    for (const userId of participants) {
      await notify(tx, userId, 'win_confirmation', (u) => templates.winConfirm(author.name, `you shared a win: ${what}`, u));
    }
    return { id: win.id };
  });
}

/** A named member confirms (marks the win verified) or declines (silently removes her). */
export async function respondToWin(userId: string, winId: string, confirm: boolean) {
  await prisma.$transaction(async (tx) => {
    const p = await tx.winParticipant.findUnique({ where: { winId_userId: { winId, userId } }, include: { win: true } });
    if (!p || p.status !== 'PENDING') throw Errors.notFound('Win');
    const now = new Date();
    await tx.winParticipant.update({ where: { winId_userId: { winId, userId } }, data: { status: confirm ? 'CONFIRMED' : 'DECLINED', respondedAt: now } });
    if (!confirm) return;
    if (!p.win.verifiedAt) await tx.win.update({ where: { id: winId }, data: { verifiedAt: now } });
    // A confirmed investment updates the investor's "last check written" (R3 F9).
    if (p.win.type === 'INVESTMENT') await updateLastCheck(tx, [p.win.authorId, userId], p.win.month);
  });
}

async function updateLastCheck(tx: Tx, userIds: string[], month: string) {
  await tx.profile.updateMany({
    where: {
      userId: { in: userIds },
      AND: [
        { OR: [{ primaryRole: 'INVESTOR' }, { secondaryRoles: { has: 'INVESTOR' } }] },
        { OR: [{ lastCheckMonth: null }, { lastCheckMonth: { lt: month } }] },
      ],
    },
    data: { lastCheckMonth: month },
  });
}

export async function deleteWin(authorId: string, winId: string) {
  const res = await prisma.win.deleteMany({ where: { id: winId, authorId } });
  if (!res.count) throw Errors.notFound('Win');
}

// ---------------------------------------------------------------- reading

const winInclude = {
  author: { select: { id: true, name: true, accountStatus: true, profile: { select: { photoKey: true, photoVersion: true } } } },
  participants: { include: { user: { select: { id: true, name: true, accountStatus: true } } } },
  gathering: { select: { id: true, title: true } },
} satisfies Prisma.WinInclude;
type WinRow = Prisma.WinGetPayload<{ include: typeof winInclude }>;

function shownName(u: { name: string; accountStatus: string }) {
  return u.accountStatus === 'DELETED' ? 'Deleted account' : u.name;
}

/** The member-facing shape. Amounts are never included. Only confirmed participants are named. */
function view(w: WinRow, viewerId?: string) {
  return {
    id: w.id,
    type: w.type,
    typeLabel: WIN_TYPE_LABELS[w.type],
    month: w.month,
    story: w.story,
    visibility: w.visibility,
    verified: !!w.verifiedAt,
    outsideNetwork: w.outsideNetwork,
    source: w.source,
    gathering: w.gathering,
    author: {
      id: w.author.accountStatus === 'DELETED' ? null : w.author.id,
      name: shownName(w.author),
      photoUrl: w.author.profile ? photoUrl(w.author.id, w.author.profile) : null,
    },
    with: w.participants
      .filter((p) => p.status === 'CONFIRMED' || (viewerId && w.authorId === viewerId && p.status === 'PENDING'))
      .map((p) => ({ id: p.user.accountStatus === 'DELETED' ? null : p.user.id, name: shownName(p.user), pending: p.status === 'PENDING' })),
  };
}
export type WinView = ReturnType<typeof view>;

/** "Wins" on Settings-like page: what I logged (with my private amount) and what awaits my confirmation. */
export async function myWins(userId: string) {
  const [logged, toConfirm] = await Promise.all([
    prisma.win.findMany({ where: { authorId: userId }, include: winInclude, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.win.findMany({
      where: { participants: { some: { userId, status: 'PENDING' } } },
      include: winInclude,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    logged: logged.map((w) => ({ ...view(w, userId), amountK: w.amountK })),
    toConfirm: toConfirm.map((w) => view(w)),
  };
}

const sharedWhere = (blocked: string[]): Prisma.WinWhereInput => ({
  visibility: { in: ['MEMBERS', 'QUOTABLE'] },
  author: { accountStatus: 'ACTIVE' },
  authorId: { notIn: blocked },
});

/** Shared wins on a member's profile: ones she logged, or confirmed as a participant. */
export async function memberWins(viewerId: string, memberId: string) {
  const sets = await relationshipSets(viewerId);
  if (sets.blocked.has(memberId)) return [];
  const rows = await prisma.win.findMany({
    where: { ...sharedWhere([...sets.blocked]), OR: [{ authorId: memberId }, { participants: { some: { userId: memberId, status: 'CONFIRMED' } } }] },
    include: winInclude,
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });
  return rows.map((w) => view(w));
}

/** The small "Recent wins" module on Home. */
export async function recentWins(viewerId: string, take = 5) {
  const sets = await relationshipSets(viewerId);
  const rows = await prisma.win.findMany({
    where: sharedWhere([...sets.blocked]),
    include: winInclude,
    orderBy: { createdAt: 'desc' },
    take,
  });
  return rows.map((w) => view(w));
}

export async function pendingWinConfirmations(userId: string) {
  return prisma.winParticipant.count({ where: { userId, status: 'PENDING' } });
}

/** Things she could log a win about: accepted introductions and past gatherings she attended. */
export async function winSources(userId: string) {
  const [intros, gatherings] = await Promise.all([
    prisma.introduction.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { targetId: userId }, { introducerId: userId }] },
      include: { requester: { select: { name: true } }, target: { select: { name: true } } },
      orderBy: { respondedAt: 'desc' },
      take: 50,
    }),
    prisma.gathering.findMany({
      where: { startsAt: { lt: new Date() }, OR: [{ seats: { some: { userId, status: 'CONFIRMED' } } }, { hosts: { some: { userId } } }] },
      select: { id: true, title: true, startsAt: true },
      orderBy: { startsAt: 'desc' },
      take: 50,
    }),
  ]);
  return {
    introductions: intros.map((i) => ({ id: i.id, label: `${i.requester.name} met ${i.target.name}` })),
    gatherings: gatherings.map((g) => ({ id: g.id, label: g.title })),
  };
}

// ---------------------------------------------------------------- totals, prompts, deletion

/** Team totals (R3 F24): by type, from introductions and gatherings, and the private investment total. */
export async function winTotals(from: Date, to: Date) {
  const rows = await prisma.win.findMany({ where: { createdAt: { gte: from, lt: to } }, select: { type: true, source: true, amountK: true, month: true } });
  const byType = Object.fromEntries(Object.keys(WIN_TYPE_LABELS).map((k) => [k, 0])) as Record<WinType, number>;
  const byMonth: Record<string, number> = {};
  for (const r of rows) {
    byType[r.type]++;
    byMonth[r.month] = (byMonth[r.month] ?? 0) + 1;
  }
  return {
    total: rows.length,
    byType,
    byMonth,
    fromIntroductions: rows.filter((r) => r.source === 'INTRODUCTION').length,
    fromGatherings: rows.filter((r) => r.source === 'GATHERING').length,
    investmentTotalK: rows.reduce((s, r) => s + (r.amountK ?? 0), 0),
  };
}

/**
 * Daily: "Did anything come of it?" 60 days after an accepted introduction (to the person who
 * asked) and 14 days after a gathering (to attendees). At most one prompt per member per item.
 */
export async function sendWinPrompts(now = new Date()): Promise<number> {
  let sent = 0;
  const introCutoff = new Date(now.getTime() - WIN_PROMPT_AFTER_INTRO_DAYS * DAY);
  const intros = await prisma.introduction.findMany({
    where: { status: 'ACCEPTED', respondedAt: { lte: introCutoff, gt: new Date(introCutoff.getTime() - 30 * DAY) } },
    include: { target: { select: { name: true, accountStatus: true } } },
    take: 500,
  });
  for (const i of intros) {
    if (i.target.accountStatus === 'DELETED') continue;
    sent += await promptOnce(i.requesterId, 'INTRODUCTION', i.id, `Did anything come of meeting ${i.target.name.split(' ')[0]}?`);
  }
  const gatherings = await prisma.gathering.findMany({
    where: { status: 'SCHEDULED', startsAt: { lt: new Date(now.getTime() - WIN_PROMPT_AFTER_GATHERING_DAYS * DAY), gt: new Date(now.getTime() - 45 * DAY) } },
    include: { seats: { where: { status: 'CONFIRMED', OR: [{ attendance: null }, { attendance: 'ATTENDED' }] }, select: { userId: true } } },
  });
  for (const g of gatherings) {
    if (now.getTime() - endsAt(g).getTime() < WIN_PROMPT_AFTER_GATHERING_DAYS * DAY) continue;
    for (const s of g.seats) sent += await promptOnce(s.userId, 'GATHERING', g.id, `Did anything come of ${g.title}?`);
  }
  return sent;
}

async function promptOnce(userId: string, kind: 'INTRODUCTION' | 'GATHERING', refId: string, question: string) {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.winPrompt.create({ data: { userId, kind, refId } });
      await notify(tx, userId, 'win_prompt', (u) => templates.winPrompt(question, u));
    });
    return 1;
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return 0; // already prompted for this item
    throw e;
  }
}

/** Account deletion: her wins keep their counts but lose their story text (R3 F19). */
export async function anonymiseWinsFor(db: Tx, userId: string) {
  await db.win.updateMany({ where: { authorId: userId }, data: { story: null, visibility: 'ANONYMOUS' } });
  await db.testimonial.deleteMany({ where: { authorId: userId } });
  await db.winParticipant.updateMany({ where: { userId, status: 'PENDING' }, data: { status: 'DECLINED', respondedAt: new Date() } });
}
