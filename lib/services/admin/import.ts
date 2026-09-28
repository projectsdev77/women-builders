import { prisma } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { LIMITS } from '@/lib/config';
import { canonicalLinkedInUrl, neutralizeFormula, normalizeEmail } from '@/lib/validation/common';
import { z } from 'zod';
import { audit } from '../audit';
import { parseCsv } from './csv';

const HEADER_ALIASES: Record<string, string> = {
  name: 'name',
  'full name': 'name',
  email: 'email',
  'email address': 'email',
  company: 'company',
  role: 'role',
  linkedinurl: 'linkedInUrl',
  'linkedin url': 'linkedInUrl',
  linkedin: 'linkedInUrl',
  discoverysource: 'discoverySource',
  'discovery source': 'discoverySource',
  source: 'discoverySource',
  referrername: 'referrerName',
  'referrer name': 'referrerName',
  referreremail: 'referrerEmail',
  'referrer email': 'referrerEmail',
};

const ROLE_MAP: Record<string, string> = { founder: 'Founder', operator: 'Operator', investor: 'Investor', builder: 'Builder' };

export type RowStatus = 'ok' | 'duplicate' | 'do_not_contact' | 'already_member' | 'error';
export interface RowResult {
  row: number; // 1-based line number in the file, header = 1
  name: string;
  email: string | null;
  status: RowStatus;
  message?: string;
}

export interface ImportSummary {
  dryRun: boolean;
  successful: number;
  skipped: number;
  errors: number;
  rows: RowResult[];
}

/**
 * CSV import (Req 19, G16): preview with dryRun, then commit. Valid rows import even if
 * others fail. Duplicates are checked within the file, against prospects (email + LinkedIn,
 * archived included) and members. Formula prefixes are neutralized.
 */
export async function importProspects(actorId: string, csv: string, dryRun: boolean): Promise<ImportSummary> {
  if (Buffer.byteLength(csv, 'utf8') > LIMITS.csvMaxBytes) {
    throw new AppError('FILE_TOO_LARGE', 'The file is larger than 1 MB. Split it into smaller files.', 413);
  }
  const table = parseCsv(csv);
  if (table.length < 2) throw new AppError('EMPTY_FILE', 'The file has no data rows.', 400);
  if (table.length - 1 > LIMITS.csvMaxRows) {
    throw new AppError('TOO_MANY_ROWS', `The file has more than ${LIMITS.csvMaxRows.toLocaleString()} rows. Split it into smaller files.`, 400);
  }
  const header = table[0]!.map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? null);
  if (!header.includes('name')) {
    throw new AppError('BAD_HEADER', 'The first row must be a header with at least a "name" column, plus "email" or "linkedInUrl".', 400);
  }

  type Parsed = { row: number; data: Record<string, string | null> };
  const parsed: Parsed[] = table.slice(1).map((cells, i) => {
    const data: Record<string, string | null> = {};
    header.forEach((key, idx) => {
      if (key) data[key] = cells[idx]?.trim() || null;
    });
    return { row: i + 2, data };
  });

  const results: RowResult[] = [];
  const valid: Array<{ row: number; record: Record<string, string | null> }> = [];
  const emails: string[] = [];
  const linkedins: string[] = [];

  for (const { row, data } of parsed) {
    const name = data.name ? neutralizeFormula(data.name.slice(0, 120)) : '';
    const rawEmail = data.email;
    const email = rawEmail ? normalizeEmail(rawEmail) : null;
    const linkedInUrl = data.linkedInUrl ? canonicalLinkedInUrl(data.linkedInUrl) : null;
    const problems: string[] = [];
    if (!name) problems.push('Name is missing');
    if (email && !z.string().email().safeParse(email).success) problems.push(`"${rawEmail}" is not a valid email`);
    if (data.linkedInUrl && !linkedInUrl) problems.push(`"${data.linkedInUrl}" is not a LinkedIn profile URL`);
    if (!email && !linkedInUrl && !problems.length) problems.push('Add an email or a LinkedIn URL');
    if (problems.length) {
      results.push({ row, name: name || '(no name)', email, status: 'error', message: problems.join('; ') });
      continue;
    }
    const rawRole = data.role?.trim() ?? null;
    const record = {
      name,
      email,
      linkedInUrl,
      company: data.company ? neutralizeFormula(data.company.slice(0, 120)) : null,
      role: rawRole ? (ROLE_MAP[rawRole.toLowerCase()] ?? neutralizeFormula(rawRole.slice(0, 80))) : null,
      discoverySource: data.discoverySource ? neutralizeFormula(data.discoverySource.slice(0, 80)) : null,
      referrerName: data.referrerName ? neutralizeFormula(data.referrerName.slice(0, 120)) : null,
      referrerEmail: data.referrerEmail ? normalizeEmail(data.referrerEmail) : null,
    };
    valid.push({ row, record });
    if (email) emails.push(email);
    if (linkedInUrl) linkedins.push(linkedInUrl);
  }

  const [existingProspects, existingUsers] = await Promise.all([
    prisma.potentialMember.findMany({
      where: { OR: [{ email: { in: emails } }, { linkedInUrl: { in: linkedins } }] },
      select: { email: true, linkedInUrl: true, outreachStatus: true },
    }),
    prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true, accountStatus: true } }),
  ]);
  const dnc = new Set<string>();
  const known = new Set<string>();
  for (const p of existingProspects) {
    for (const key of [p.email, p.linkedInUrl]) {
      if (!key) continue;
      known.add(key);
      if (p.outreachStatus === 'DO_NOT_CONTACT') dnc.add(key);
    }
  }
  const members = new Set(existingUsers.filter((u) => u.accountStatus !== 'REJECTED').map((u) => u.email));

  const seenInFile = new Set<string>();
  const toCreate: Array<(typeof valid)[number]['record']> = [];
  for (const { row, record } of valid) {
    const keys = [record.email, record.linkedInUrl].filter(Boolean) as string[];
    const base = { row, name: record.name!, email: record.email };
    if (keys.some((k) => dnc.has(k))) results.push({ ...base, status: 'do_not_contact', message: 'On the do-not-contact list' });
    else if (record.email && members.has(record.email)) results.push({ ...base, status: 'already_member', message: 'Already a member' });
    else if (keys.some((k) => known.has(k))) results.push({ ...base, status: 'duplicate', message: 'Already tracked' });
    else if (keys.some((k) => seenInFile.has(k))) results.push({ ...base, status: 'duplicate', message: 'Appears earlier in this file' });
    else {
      results.push({ ...base, status: 'ok' });
      toCreate.push(record);
    }
    keys.forEach((k) => seenInFile.add(k));
  }
  results.sort((a, b) => a.row - b.row);

  if (!dryRun && toCreate.length) {
    await prisma.$transaction(async (tx) => {
      for (const record of toCreate) {
        const p = await tx.potentialMember.create({ data: { ...record, name: record.name!, discoverySource: record.discoverySource ?? 'CSV import' } });
        await tx.potentialMemberStatusChange.create({ data: { potentialMemberId: p.id, fromStatus: null, toStatus: 'IDENTIFIED', changedById: actorId } });
      }
      await audit(tx, { actorId, action: 'prospects.import', targetType: 'potential_member', details: { count: toCreate.length } });
    });
  }

  const count = (s: RowStatus[]) => results.filter((r) => s.includes(r.status)).length;
  return {
    dryRun,
    successful: count(['ok']),
    skipped: count(['duplicate', 'do_not_contact', 'already_member']),
    errors: count(['error']),
    rows: results,
  };
}
