/**
 * Photographs every screen for the personas seeded by scripts/screens/seed.ts, at desktop and phone
 * size, and appends them to .data/screens/out/manifest.json. Needs the app running locally:
 *   SCREENS_LEVEL=medium tsx scripts/screens/shoot.ts   (BASE_URL defaults to http://localhost:3000)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext } from 'playwright';

type Ids = { level: string; password: string; users: Record<string, string>; ids: Record<string, string | null> };
const data = JSON.parse(readFileSync('.data/screens/ids.json', 'utf8')) as Ids;
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = '.data/screens/out';
const level = data.level;
const id = data.ids;

/** [page name, url] per persona. Entries whose url needs a missing id are skipped. */
const member = (extra: Array<[string, string | null]> = []): Array<[string, string | null]> => extra;
const PLAN: Record<string, Array<[string, string | null]>> = {
  public: [
    ['Homepage', '/'],
    ...(level === 'medium'
      ? ([
          ['Request an invitation', '/request-invite'], ['Log in', '/login'], ['Forgot password', '/forgot-password'],
          ['Reset password (bad link)', '/reset-password?token=nope'], ['Join (no invitation)', '/join'], ['Join (expired invitation)', '/join?invite=nope'],
          ['Privacy', '/privacy'], ['Terms', '/terms'], ['Charter', '/charter'], ['Unsubscribed', '/unsubscribed'], ['Page not found', '/no-such-page'],
        ] as Array<[string, string]>)
      : []),
  ],
  founder: member([
    ['Home', '/dashboard'], ['Discover', '/search'], ['For you', '/recommendations'], ['Capital', '/capital'], ['Connections', '/connections'],
    ['Connection requests', '/connections/requests'], ['Introductions', '/introductions'], ['Messages', '/messages'],
    ['Conversation', id.chatWith && `/messages/${id.chatWith}`], ['Gatherings', '/gatherings'], ['Gathering', id.gathering && `/gatherings/${id.gathering}`],
    ['Wins', '/wins'], ['Share a win', '/wins/new'], ['My profile', '/profile'], ['Edit profile', '/profile/edit'], ['Settings', '/settings'],
    ['Member: investor', `/members/${id.investor}`], ['Member: multi-role', `/members/${id.multi}`],
  ]),
  investor: member([
    ['Home', '/dashboard'], ['Capital', '/capital'], ['Introductions', '/introductions'], ['Connection requests', '/connections/requests'],
    ['My profile', '/profile'], ['Member: founder', `/members/${id.founder}`], ['Member: prefers introductions', `/members/${id.operator}`],
  ]),
  operator: member([['Home', '/dashboard'], ['My profile', '/profile'], ['Discover', '/search']]),
  builder: member([['Home', '/dashboard'], ['My profile', '/profile'], ['For you', '/recommendations']]),
  multi: member([['Home', '/dashboard'], ['My profile', '/profile'], ['Edit profile', '/profile/edit']]),
  // Until onboarding is finished every member page redirects there, so one screen covers a brand-new member.
  newbie: member([['Onboarding', '/onboarding']]),
  admin: member([
    ['Admin home', '/admin'], ['Requests', '/admin/requests'], ['Invitations', '/admin/invitations'], ['Potential members', '/admin/prospects'],
    ['Potential member', id.prospect && `/admin/prospects/${id.prospect}`], ['Potential member (requested)', id.requestedProspect && `/admin/prospects/${id.requestedProspect}`],
    ['Import CSV', '/admin/prospects/import'], ['Follow-ups', '/admin/follow-ups'], ['Members', '/admin/members'], ['Member', `/admin/members/${id.founder}`],
    ['Gatherings', '/admin/gatherings'], ['New gathering', '/admin/gatherings/new'], ['Gathering', id.gathering && `/admin/gatherings/${id.gathering}`],
    ['Introductions', '/admin/introductions'], ['Reports', '/admin/reports'], ['Audit log', '/admin/audit'], ['Site settings', '/admin/settings'], ['Emails (test mode)', '/admin/emails'],
  ]),
};

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, cap: 5000 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, cap: 6000, isMobile: true, hasTouch: true },
} as const;

type Shot = { level: string; viewport: string; persona: string; page: string; url: string; file: string; cut: boolean };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function login(ctx: BrowserContext, email: string) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(data.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(/\/(dashboard|admin|onboarding|charter)/, { timeout: 30_000 });
  await page.close();
}

async function shoot(browser: Browser, persona: string, vpName: keyof typeof VIEWPORTS, shots: Shot[]) {
  const { cap, ...vp } = VIEWPORTS[vpName];
  const ctx = await browser.newContext({ ...vp, reducedMotion: 'reduce' });
  if (persona !== 'public') await login(ctx, data.users[persona]!);
  const page = await ctx.newPage();
  for (const [name, url] of PLAN[persona]!) {
    if (!url) continue;
    await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const file = path.join(level, vpName, `${persona}--${slug(name)}.jpg`);
    mkdirSync(path.dirname(path.join(OUT, file)), { recursive: true });
    await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 62, fullPage: true, clip: { x: 0, y: 0, width: vp.viewport.width, height: Math.min(height, cap) } });
    shots.push({ level, viewport: vpName, persona, page: name, url, file, cut: height > cap });
    process.stdout.write('.');
  }
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ executablePath: existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  const manifestPath = path.join(OUT, 'manifest.json');
  const previous: Shot[] = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
  const shots: Shot[] = [];
  for (const persona of Object.keys(PLAN)) {
    for (const vp of Object.keys(VIEWPORTS) as Array<keyof typeof VIEWPORTS>) await shoot(browser, persona, vp, shots);
  }
  await browser.close();
  writeFileSync(manifestPath, JSON.stringify([...previous.filter((s) => s.level !== level), ...shots], null, 1));
  console.log(`\n${level}: ${shots.length} screenshots`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
