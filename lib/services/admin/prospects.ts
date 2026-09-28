import type { OutreachStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { canonicalLinkedInUrl, normalizeEmail, neutralizeFormula } from '@/lib/validation/common';
import { audit } from '../audit';
import { changeProspectStatus } from '../prospect-status';
import { addDays, formatDateOnly, parseDateOnly, todayInAppTz } from './dates';

export const OUTREACH_STATUSES = [
  'IDENTIFIED', 'REVIEWED', 'CONTACTED', 'FOLLOW_UP_NEEDED', 'INTERESTED', 'INVITED',
  'APPLIED', 'APPROVED', 'NOT_INTERESTED', 'NOT_A_FIT', 'DO_NOT_CONTACT',
] as const satisfies readonly OutreachStatus[];

/** Statuses that never show up in the follow-up queue (Req 7.3 R2). */
export const CLOSED_STATUSES: OutreachStatus[] = ['APPROVED', 'NOT_INTERESTED', 'NOT_A_FIT', 'DO_NOT_CONTACT'];

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? neutralizeFormula(v) : null));

const dateOnly = z
  .string()
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseDateOnly(v);
    if (!d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use a date like 2026-10-15' });
      return z.NEVER;
    }
    return d;
  });

const emailOpt = z
  .string()
  .trim()
  .max(254)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const parsed = z.string().email().safeParse(v);
    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address' });
      return z.NEVER;
    }
    return normalizeEmail(v);
  });

const linkedInOpt = z
  .string()
  .trim()
  .max(300)
  .optional()
  .nullable()
  .transform((v, ctx) => {
    if (!v) return null;
    const c = canonicalLinkedInUrl(v);
    if (!c) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a LinkedIn profile URL, like https://www.linkedin.com/in/name' });
      return z.NEVER;
    }
    return c;
  });

export const prospectFieldsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120).transform(neutralizeFormula),
  email: emailOpt,
  linkedInUrl: linkedInOpt,
  company: optText(120),
  role: optText(80),
  discoverySource: optText(80),
  referrerName: optText(120),
  referrerEmail: emailOpt,
  lawfulBasisNote: optText(1000),
  nextFollowUpDate: dateOnly,
  assignedAdminId: z.string().max(50).optional().nullable(),
});

export const prospectCreateSchema = prospectFieldsSchema.refine((v) => v.email || v.linkedInUrl, {
  message: 'Add an email or a LinkedIn URL so we can check for duplicates',
  path: ['email'],
});

export const prospectUpdateSchema = prospectFieldsSchema
  .partial()
  .extend({ outreachStatus: z.enum(OUTREACH_STATUSES).optional(), archived: z.boolean().optional() });

/** Existing prospects (including archived) and members that match an email or LinkedIn URL. */
export async function findDuplicates(db: Tx, email: string | null, linkedInUrl: string | null, excludeId?: string) {
  const or: Prisma.PotentialMemberWhereInput[] = [];
  if (email) or.push({ email });
  if (linkedInUrl) or.push({ linkedInUrl });
  const [prospects, member] = await Promise.all([
    or.length
      ? db.potentialMember.findMany({
          where: { OR: or, ...(excludeId ? { id: { not: excludeId } } : {}) },
          select: { id: true, name: true, email: true, linkedInUrl: true, outreachStatus: true, archivedAt: true },
        })
      : Promise.resolve([]),
    email ? db.user.findUnique({ where: { email }, select: { id: true, name: true, accountStatus: true } }) : Promise.resolve(null),
  ]);
  return { prospects, member };
}

function assertNotDuplicate(d: Awaited<ReturnType<typeof findDuplicates>>) {
  // Do-not-contact always wins, even for archived records (G8).
  const dnc = d.prospects.find((p) => p.outreachStatus === 'DO_NOT_CONTACT');
  if (dnc) throw new AppError('DO_NOT_CONTACT', `${dnc.name} asked not to be contacted. This record can't be added again.`, 409, { existingId: dnc.id });
  if (d.prospects[0]) {
    throw new AppError('DUPLICATE', `${d.prospects[0].name} is already tracked as a potential member.`, 409, { existingId: d.prospects[0].id });
  }
  if (d.member && d.member.accountStatus !== 'REJECTED') {
    throw new AppError('ALREADY_MEMBER', `${d.member.name} already has a Women Builders account.`, 409, { memberId: d.member.id });
  }
}

export async function createProspect(actorId: string, input: z.output<typeof prospectCreateSchema>) {
  return prisma.$transaction(async (tx) => {
    assertNotDuplicate(await findDuplicates(tx, input.email, input.linkedInUrl));
    const p = await tx.potentialMember.create({ data: { ...input, outreachStatus: 'IDENTIFIED' } });
    await tx.potentialMemberStatusChange.create({ data: { potentialMemberId: p.id, fromStatus: null, toStatus: 'IDENTIFIED', changedById: actorId } });
    return p;
  });
}

export async function updateProspect(actorId: string, id: string, input: z.output<typeof prospectUpdateSchema>) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.potentialMember.findUnique({ where: { id } });
    if (!current) throw Errors.notFound('Potential member');
    const { outreachStatus, archived, ...fields } = input;
    const email = fields.email === undefined ? current.email : fields.email;
    const linkedInUrl = fields.linkedInUrl === undefined ? current.linkedInUrl : fields.linkedInUrl;
    if (!email && !linkedInUrl) throw Errors.validation('Keep at least an email or a LinkedIn URL.');
    if (fields.email !== undefined || fields.linkedInUrl !== undefined) {
      const d = await findDuplicates(tx, fields.email ?? null, fields.linkedInUrl ?? null, id);
      if (d.prospects[0]) throw new AppError('DUPLICATE', `${d.prospects[0].name} already uses that email or LinkedIn URL.`, 409, { existingId: d.prospects[0].id });
    }
    const status = outreachStatus ?? current.outreachStatus;
    if (archived && status === 'DO_NOT_CONTACT') throw Errors.validation('Do-not-contact records are never archived.');
    await tx.potentialMember.update({
      where: { id },
      data: {
        ...fields,
        ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
        // DNC is permanent suppression: un-archive if needed (G8).
        ...(outreachStatus === 'DO_NOT_CONTACT' ? { archivedAt: null, nextFollowUpDate: null } : {}),
      },
    });
    if (outreachStatus) await changeProspectStatus(tx, id, outreachStatus, actorId);
    return tx.potentialMember.findUniqueOrThrow({ where: { id } });
  });
}

export const prospectListSchema = z.object({
  q: z.string().trim().max(200).optional().default(''),
  status: z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.enum(OUTREACH_STATUSES))),
  followUpFrom: z.string().optional(),
  followUpTo: z.string().optional(),
  assigned: z.string().max(50).optional(),
  archived: z.enum(['exclude', 'include', 'only']).optional().default('exclude'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function listProspects(actorId: string, query: z.output<typeof prospectListSchema>) {
  const where: Prisma.PotentialMemberWhereInput = {};
  const and: Prisma.PotentialMemberWhereInput[] = [];
  if (query.q) {
    const c = { contains: query.q, mode: 'insensitive' as const };
    and.push({ OR: [{ name: c }, { email: c }, { company: c }, { role: c }, { linkedInUrl: c }] });
  }
  if (query.status.length) and.push({ outreachStatus: { in: query.status } });
  const from = parseDateOnly(query.followUpFrom);
  const to = parseDateOnly(query.followUpTo);
  if (from || to) and.push({ nextFollowUpDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } });
  if (query.assigned === 'me') and.push({ assignedAdminId: actorId });
  else if (query.assigned === 'unassigned') and.push({ assignedAdminId: null });
  else if (query.assigned) and.push({ assignedAdminId: query.assigned });
  if (query.archived === 'exclude') and.push({ archivedAt: null });
  if (query.archived === 'only') and.push({ archivedAt: { not: null } });
  if (and.length) where.AND = and;

  const [total, rows] = await Promise.all([
    prisma.potentialMember.count({ where }),
    prisma.potentialMember.findMany({
      where,
      include: { assignedAdmin: { select: { id: true, name: true } } },
      orderBy: [{ nextFollowUpDate: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return {
    prospects: rows.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      linkedInUrl: p.linkedInUrl,
      company: p.company,
      role: p.role,
      outreachStatus: p.outreachStatus,
      nextFollowUpDate: formatDateOnly(p.nextFollowUpDate),
      assignedAdmin: p.assignedAdmin,
      archived: !!p.archivedAt,
      updatedAt: p.updatedAt.toISOString(),
    })),
    pagination: { total, page: query.page, limit: query.limit, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
  };
}

export async function getProspect(id: string) {
  const p = await prisma.potentialMember.findUnique({
    where: { id },
    include: {
      assignedAdmin: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, accountStatus: true } },
      notes: { orderBy: { createdAt: 'asc' } },
      attempts: { orderBy: [{ attemptDate: 'asc' }, { createdAt: 'asc' }] },
      statusChanges: { orderBy: { createdAt: 'asc' } },
      invitations: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!p) throw Errors.notFound('Potential member');
  const adminIds = [...new Set([...p.notes.map((n) => n.createdById), ...p.attempts.map((a) => a.createdById), ...p.statusChanges.map((s) => s.changedById)].filter(Boolean) as string[])];
  const admins = await prisma.user.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } });
  const names = Object.fromEntries(admins.map((a) => [a.id, a.name]));
  return { ...p, adminNames: names };
}

export async function addProspectNote(actorId: string, id: string, content: string) {
  const text = content.trim();
  if (!text) throw Errors.validation('Write a note first.');
  if (text.length > 5000) throw Errors.validation('Notes can be at most 5,000 characters.');
  const exists = await prisma.potentialMember.count({ where: { id } });
  if (!exists) throw Errors.notFound('Potential member');
  return prisma.outreachNote.create({ data: { potentialMemberId: id, content: text, createdById: actorId } });
}

export const outreachAttemptSchema = z.object({
  attemptDate: z.string().transform((v, ctx) => {
    const d = parseDateOnly(v);
    if (!d) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use a date like 2026-10-15' });
      return z.NEVER;
    }
    return d;
  }),
  method: z.string().trim().min(1, 'How did you reach out?').max(60),
  outcome: z.string().trim().max(2000).optional().nullable(),
  newStatus: z.enum(OUTREACH_STATUSES).optional(),
  nextFollowUpDate: dateOnly,
});

/** Logs an outreach attempt and optionally updates status/follow-up in one go (Req 7.1, 7.5). */
export async function logOutreachAttempt(actorId: string, id: string, input: z.output<typeof outreachAttemptSchema>) {
  return prisma.$transaction(async (tx) => {
    const p = await tx.potentialMember.findUnique({ where: { id } });
    if (!p) throw Errors.notFound('Potential member');
    if (p.outreachStatus === 'DO_NOT_CONTACT') throw new AppError('DO_NOT_CONTACT', 'This person asked not to be contacted.', 409);
    const attempt = await tx.outreachAttempt.create({
      data: { potentialMemberId: id, attemptDate: input.attemptDate, method: input.method, outcome: input.outcome ?? null, createdById: actorId },
    });
    await tx.potentialMember.update({
      where: { id },
      data: { nextFollowUpDate: input.newStatus === 'DO_NOT_CONTACT' ? null : input.nextFollowUpDate, updatedAt: new Date() },
    });
    if (input.newStatus) await changeProspectStatus(tx, id, input.newStatus, actorId);
    return attempt;
  });
}

/** Due and overdue follow-ups, overdue first (Req 7.3). */
export async function followUpQueue(opts: { withinDays?: number } = {}) {
  const today = todayInAppTz();
  const until = addDays(today, opts.withinDays ?? 0);
  const rows = await prisma.potentialMember.findMany({
    where: { archivedAt: null, outreachStatus: { notIn: CLOSED_STATUSES }, nextFollowUpDate: { lte: until } },
    include: { assignedAdmin: { select: { id: true, name: true } } },
    orderBy: { nextFollowUpDate: 'asc' },
    take: 500,
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    company: p.company,
    role: p.role,
    outreachStatus: p.outreachStatus,
    nextFollowUpDate: formatDateOnly(p.nextFollowUpDate)!,
    overdue: p.nextFollowUpDate! < today,
    dueToday: p.nextFollowUpDate!.getTime() === today.getTime(),
    assignedAdmin: p.assignedAdmin,
  }));
}

export async function auditImport(actorId: string, count: number) {
  await audit(prisma, { actorId, action: 'prospects.import', targetType: 'potential_member', details: { count } });
}
