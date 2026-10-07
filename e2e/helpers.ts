import { expect, type Page, type TestInfo } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? 'DemoPass123';
export const MEMBER = { email: process.env.E2E_MEMBER_EMAIL ?? 'adaeze@demo.womenbuilders.test', name: 'Adaeze Nwosu' };
export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com', password: process.env.E2E_ADMIN_PASSWORD ?? 'ChangeMe123' };

export const hasDb = !!(process.env.E2E_DATABASE_URL || process.env.DATABASE_URL);
let prisma: PrismaClient | undefined;
function db() {
  prisma ??= new PrismaClient({ datasourceUrl: process.env.E2E_DATABASE_URL || process.env.DATABASE_URL });
  return prisma;
}

export function unique(prefix: string, info?: TestInfo) {
  const tag = info ? info.project.name : 'x';
  return `${prefix}-${tag}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Fails the test on uncaught page errors and on responses that mean the app broke. */
export function watchForBreakage(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    const url = new URL(r.url());
    if (r.status() >= 500 && url.origin === new URL(page.url() || r.url()).origin) problems.push(`${r.status()} ${url.pathname}`);
  });
  return { assertClean: () => expect(problems, 'uncaught errors or 5xx responses').toEqual([]) };
}

export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(/\/(dashboard|admin|onboarding|charter)/);
}

export async function logout(page: Page) {
  const direct = page.getByRole('button', { name: 'Log out' }).first();
  if (!(await direct.isVisible().catch(() => false))) {
    // Mobile: Log out lives in the More sheet.
    await page.getByRole('button', { name: /more/i }).click();
  }
  await page.getByRole('button', { name: 'Log out' }).first().click();
  await page.waitForURL((u) => u.pathname === '/' || u.pathname === '/login');
}

/** Latest email to an address (from the outbox table), polled while the app writes it. */
export async function latestEmail(to: string, kind?: string) {
  for (let i = 0; i < 30; i++) {
    const row = await db().emailOutbox.findFirst({ where: { to, ...(kind ? { kind } : {}) }, orderBy: { createdAt: 'desc' } });
    if (row) return row;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No ${kind ?? ''} email to ${to} found in the outbox`);
}

export function firstLink(text: string, pathFragment: string) {
  const m = text.match(new RegExp(`https?://[^\\s"'<>)]+${pathFragment}[^\\s"'<>)]*`));
  if (!m) throw new Error(`No link containing ${pathFragment} in email:\n${text}`);
  return m[0];
}

/** Rewrites an emailed absolute link onto the origin under test (APP_URL may differ). */
export function localise(link: string, baseURL: string) {
  const u = new URL(link);
  return new URL(u.pathname + u.search, baseURL).toString();
}

/** The request form allows a few submissions per IP per hour; a test run would trip it, so drop the test rows. */
export async function clearTestRequestThrottle() {
  await db().publicSubmission.deleteMany({ where: { kind: 'invite_request', email: { startsWith: 'e2e-' } } });
}

export async function closeDb() {
  await prisma?.$disconnect();
}

// A small valid PNG (red square) for photo uploads, built without extra dependencies.
export function tinyPng(size = 64): Buffer {
  const zlib = require('node:zlib') as typeof import('node:zlib');
  const crc = (buf: Buffer) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0).map((_, i) => (i % 3 === 0 ? 200 : i % 3 === 1 ? 80 : 120))]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
