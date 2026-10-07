import { expect, test } from '@playwright/test';
import { watchForBreakage } from './helpers';

test.describe('public site', () => {
  test('homepage renders its story, roles and a way in', async ({ page }) => {
    const w = watchForBreakage(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Where women who build find each other');
    await expect(page.getByRole('link', { name: /request an invitation/i }).first()).toBeVisible();
    for (const role of ['Founder', 'Operator', 'Investor', 'Builder']) {
      await expect(page.getByText(role, { exact: false }).first()).toBeVisible();
    }
    await expect(page.getByRole('link', { name: /log in/i }).first()).toBeVisible();
    w.assertClean();
  });

  for (const [path, heading] of [
    ['/login', /welcome back|log in/i],
    ['/request-invite', /invitation|waitlist/i],
    ['/charter', /charter/i],
    ['/privacy', /privacy/i],
    ['/terms', /terms/i],
    ['/forgot-password', /password/i],
  ] as const) {
    test(`${path} loads`, async ({ page }) => {
      const w = watchForBreakage(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
      w.assertClean();
    });
  }

  test('unknown pages show the friendly 404', async ({ page }) => {
    const res = await page.goto('/no-such-page-here');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText("couldn't find that page");
  });

  test('security headers are present', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['content-security-policy']).toContain("default-src 'self'");
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['strict-transport-security']).toBeTruthy();
  });

  test('private pages send anonymous visitors to log in', async ({ page }) => {
    for (const path of ['/dashboard', '/search', '/messages', '/wins', '/settings', '/admin']) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/login|\/$/);
    }
  });

  test('an invalid invitation link explains itself instead of crashing', async ({ page }) => {
    await page.goto('/join?invite=not-a-real-token');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/expired|invalid|invitation/i);
    await expect(page.getByRole('link', { name: /request a new invitation/i })).toBeVisible();
  });

  test('request-invite form validates before sending', async ({ page }) => {
    await page.goto('/request-invite');
    await page.getByRole('button', { name: /request an invitation|join the waitlist/i }).click();
    await expect(page.getByText(/required|enter|choose|tell us|please/i).first()).toBeVisible();
    await expect(page).toHaveURL(/request-invite/);
  });
});
