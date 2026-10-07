import { expect, test } from '@playwright/test';
import { ADMIN, DEMO_PASSWORD, MEMBER, login, unique, watchForBreakage } from './helpers';

test.describe('admin', () => {
  test('every admin page loads for an admin', async ({ page }) => {
    const w = watchForBreakage(page);
    await login(page, ADMIN.email, ADMIN.password);
    for (const path of ['/admin', '/admin/requests', '/admin/members', '/admin/prospects', '/admin/follow-ups', '/admin/gatherings', '/admin/gatherings/new', '/admin/invitations', '/admin/introductions', '/admin/reports', '/admin/settings', '/admin/audit']) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }).first(), path).toBeVisible();
      await expect(page.getByText('Something went wrong'), path).toHaveCount(0);
    }
    w.assertClean();
  });

  test('the dashboard shows its tiles', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin');
    for (const t of ['Active members', 'Open reports', /Invitation requests to review/, 'Potential members by status']) {
      await expect(page.getByText(t).first()).toBeVisible();
    }
  });

  test('members can be searched and opened', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/members');
    await page.getByPlaceholder(/name, email/i).fill('adaeze');
    await page.getByRole('button', { name: 'Filter' }).click();
    await page.getByRole('link', { name: 'Adaeze Nwosu' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Adaeze Nwosu');
  });

  test('site settings can be saved and the audit log records it', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/settings');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();
    await page.goto('/admin/audit');
    await expect(page.getByText(/settings/i).first()).toBeVisible();
  });

  test('members cannot reach admin pages or admin APIs', async ({ page }) => {
    await login(page, MEMBER.email, DEMO_PASSWORD);
    const res = await page.goto('/admin');
    expect(res?.status() === 404 || /\/dashboard|\/login/.test(page.url())).toBe(true);
    const api = await page.request.get('/api/admin/members');
    expect([401, 403, 404]).toContain(api.status());
  });

  test('an admin creates a gathering; a member sees it and requests a seat; the admin sees the request', async ({ page, browser, baseURL }, info) => {
    const w = watchForBreakage(page);
    const title = unique('E2E dinner', info);
    const pad = (n: number) => String(n).padStart(2, '0');
    const at = (days: number) => {
      const d = new Date(Date.now() + days * 86_400_000);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
    };
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/gatherings/new');
    await page.locator('#g-title').fill(title);
    await page.getByLabel(/topic and description/i).fill('A test dinner created by the end-to-end suite.');
    await page.getByLabel(/starts \(local time\)/i).fill(at(30));
    await page.getByLabel(/requests close/i).fill(at(20));
    await page.getByLabel('Online', { exact: true }).check();
    await page.getByLabel('Seat mode').selectOption('CURATED');
    await page.getByLabel('Selected roles').check();
    await page.getByLabel('Founders', { exact: true }).check();
    await page.getByLabel(/hosted by the women builders team/i).check();
    await page.getByRole('button', { name: /create and announce/i }).click();
    await page.waitForURL(/\/admin\/gatherings\/(?!new)[^/]+$/, { timeout: 20_000 });
    const adminUrl = page.url();

    const ctx = await browser.newContext({ baseURL, viewport: page.viewportSize() ?? undefined });
    const m = await ctx.newPage();
    await login(m, MEMBER.email, DEMO_PASSWORD);
    await m.goto('/gatherings');
    await m.getByRole('link', { name: new RegExp(title) }).first().click();
    await m.getByRole('button', { name: /request a seat/i }).click();
    await m.getByRole('dialog').getByRole('button', { name: /send request|take my seat/i }).click();
    await expect(m.getByText(/requested|pending|waiting/i).first()).toBeVisible();
    await ctx.close();

    await page.goto(adminUrl);
    await expect(page.getByText(MEMBER.name).first()).toBeVisible();
    await page.getByRole('button', { name: 'Confirm', exact: true }).first().click();
    await expect(page.getByText(/confirmed/i).first()).toBeVisible();

    await page.getByRole('button', { name: 'Cancel this gathering' }).click();
    await page.getByRole('dialog').getByRole('textbox').fill('End-to-end test cleanup').catch(() => undefined);
    await page.getByRole('dialog').getByRole('button').last().click();
    w.assertClean();
  });
});
