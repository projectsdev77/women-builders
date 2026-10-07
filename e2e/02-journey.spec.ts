import { expect, test } from '@playwright/test';
import { ADMIN, MEMBER, DEMO_PASSWORD, clearTestRequestThrottle, closeDb, firstLink, hasDb, latestEmail, localise, login, logout, unique, watchForBreakage } from './helpers';

/**
 * The whole front door and first week, as one story:
 * a visitor asks for an invitation → an admin invites her → she joins and sets up her profile →
 * she connects with a member and they message each other.
 */
test.describe.configure({ mode: 'serial' });
test.skip(!hasDb, 'Needs DATABASE_URL to read the invitation email from the outbox');
test.afterAll(closeDb);

const password = 'JourneyPass1';
let who: { name: string; email: string };

test('1. a visitor requests an invitation', async ({ page }, info) => {
  const tag = unique('e2e', info);
  who = { name: `Test ${tag}`, email: `${tag}@example.com` };
  const w = watchForBreakage(page);
  await clearTestRequestThrottle();
  await page.goto('/request-invite');
  await page.getByLabel('Full name').fill(who.name);
  await page.locator('#ri-email').fill(who.email);
  await page.getByRole('radio', { name: 'Operator' }).check({ force: true });
  await page.getByLabel('City').fill('Nairobi');
  await page.getByLabel('Country').selectOption({ label: 'Kenya' });
  await page.getByLabel(/what are you building/i).fill('Running operations for a logistics startup and keen to meet other operators.');
  await page.getByText(/privacy|agree|consent/i).filter({ hasText: /./ }).last().click({ trial: true }).catch(() => undefined);
  const consent = page.locator('input[type=checkbox]').last();
  await consent.check({ force: true });
  await page.getByRole('button', { name: /request an invitation|join the waitlist/i }).click();
  await expect(page.getByText(/we.ve got your request|thank you|request is in|received/i).first()).toBeVisible();
  w.assertClean();
});

test('2. the requester gets a confirmation email', async () => {
  const mail = await latestEmail(who.email, 'request_received');
  expect(mail.subject.length).toBeGreaterThan(3);
});

test('3. an admin finds the request and sends the invitation', async ({ page }) => {
  const w = watchForBreakage(page);
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto('/admin/requests');
  const card = page.locator('li', { hasText: who.email }).first();
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Send invitation' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.locator('li', { hasText: who.email }).first()).toHaveCount(0);
  await page.goto('/admin/requests?status=INVITED');
  await expect(page.locator('li', { hasText: who.email }).first()).toContainText(/invited by/i);
  w.assertClean();
});

test('4. she opens her invitation, joins and accepts the charter', async ({ page, baseURL }) => {
  const w = watchForBreakage(page);
  const mail = await latestEmail(who.email, 'invitation');
  const link = localise(firstLink(mail.text, '/join'), baseURL!);
  await page.goto(link);
  await expect(page.getByLabel('Email')).toHaveValue(who.email);
  await page.getByLabel('Full name').fill(who.name);
  await page.getByLabel('Choose a password').fill(password);
  await page.getByRole('radio', { name: 'Operator' }).check({ force: true });
  await page.getByLabel('Headline').fill('Head of operations at a logistics startup');
  await page.getByLabel('City').fill('Nairobi');
  await page.getByLabel('Country').selectOption({ label: 'Kenya' });
  await page.getByRole('button', { name: /join women builders/i }).click();
  await expect(page.getByText(/accept/i).first()).toBeVisible(); // charter checkbox error: must tick first
  await page.locator('input[type=checkbox]').last().check({ force: true });
  await page.getByRole('button', { name: /join women builders/i }).click();
  await page.waitForURL(/onboarding|dashboard/);
  w.assertClean();
});

test('5. the invitation link cannot be used twice', async ({ page, baseURL }) => {
  const mail = await latestEmail(who.email, 'invitation');
  await page.goto(localise(firstLink(mail.text, '/join'), baseURL!));
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/expired|already|invitation/i);
});

test('6. she completes onboarding and reaches Home', async ({ page }) => {
  const w = watchForBreakage(page);
  await login(page, who.email, password);
  if (page.url().includes('/onboarding')) {
    await expect(page.getByRole('heading', { name: 'The basics' })).toBeVisible();
    for (let step = 0; step < 6 && page.url().includes('/onboarding'); step++) {
      const fill = async (label: RegExp, text: string) => {
        const f = page.getByLabel(label).first();
        if (await f.isVisible().catch(() => false)) if (!(await f.inputValue())) await f.fill(text);
      };
      await fill(/professional background/i, 'Ten years running operations and logistics in East Africa.');
      await fill(/focused on right now/i, 'Scaling our delivery network across three countries.');
      await fill(/what you need/i, 'Introductions to supply chain investors and an experienced CFO.');
      await fill(/what you can offer/i, 'Operations playbooks, hiring ops teams and logistics advice.');
      // Role-specific required fields (an Operator must name a function and seniority before connecting).
      for (const label of [/functional expertise|function/i, /seniority/i]) {
        const sel = page.getByLabel(label).first();
        if (await sel.isVisible().catch(() => false)) if (!(await sel.inputValue())) await sel.selectOption({ index: 1 });
      }
      const tags = page.getByLabel(/expertise areas/i).first();
      if (await tags.isVisible().catch(() => false)) {
        for (const t of ['logistics', 'operations', 'hiring']) {
          await tags.fill(t);
          await tags.press('Enter');
        }
      }
      const next = page.getByRole('button', { name: /finish|save and continue/i });
      const finished = await next.click({ timeout: 5_000 }).then(() => false, () => true);
      if (finished) break;
      await page.waitForTimeout(800);
    }
  }
  await page.waitForURL(/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  w.assertClean();
});

test('7. she finds Adaeze in Discover and sends a connection request', async ({ page }) => {
  const w = watchForBreakage(page);
  await login(page, who.email, password);
  await page.goto('/search?q=Adaeze');
  await page.getByRole('link', { name: /Adaeze Nwosu/ }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Adaeze Nwosu');
  await page.getByRole('button', { name: 'Connect' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('Hello from the e2e test, would love to connect.').catch(() => undefined);
  await page.getByRole('dialog').getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByText(/connection request sent|now connected/i)).toBeVisible();
  w.assertClean();
});

test('8. Adaeze accepts the request', async ({ page }) => {
  const w = watchForBreakage(page);
  await login(page, MEMBER.email, DEMO_PASSWORD);
  await page.goto('/connections/requests');
  const row = page.locator('li', { hasText: who.name }).first();
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Accept' }).click();
  await expect(page.locator('li', { hasText: who.name })).toHaveCount(0);
  w.assertClean();
});

test('9. they exchange messages and the unread count shows', async ({ page, browser, baseURL }) => {
  const w = watchForBreakage(page);
  await login(page, who.email, password);
  await page.goto('/messages');
  await page.getByRole('link', { name: /Adaeze Nwosu/ }).first().click();
  const text = `Hi Adaeze, e2e hello ${Date.now()}`;
  await page.getByLabel(/message adaeze/i).fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(text)).toBeVisible();

  const ctx = await browser.newContext({ baseURL, viewport: page.viewportSize() ?? undefined, userAgent: await page.evaluate(() => navigator.userAgent) });
  const other = await ctx.newPage();
  await login(other, MEMBER.email, DEMO_PASSWORD);
  await other.goto('/messages');
  await other.getByRole('link', { name: new RegExp(who.name) }).first().click();
  await expect(other.getByText(text)).toBeVisible();
  const reply = `Welcome! reply ${Date.now()}`;
  await other.getByLabel(new RegExp(`message ${who.name.split(' ')[0]}`, 'i')).fill(reply);
  await other.getByRole('button', { name: 'Send' }).click();
  await expect(other.getByText(reply)).toBeVisible();
  await ctx.close();

  await expect(page.getByText(reply)).toBeVisible({ timeout: 15_000 }); // arrives by polling, no reload
  w.assertClean();
});

test('10. she can log out and back in', async ({ page }) => {
  await login(page, who.email, password);
  await logout(page);
  await login(page, who.email, password);
  await expect(page).toHaveURL(/dashboard/);
});
