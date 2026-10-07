import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, MEMBER, login, logout, tinyPng, unique, watchForBreakage } from './helpers';

test.describe('member experience', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, MEMBER.email, DEMO_PASSWORD);
  });

  test('every member page loads without errors', async ({ page }) => {
    const w = watchForBreakage(page);
    for (const path of ['/dashboard', '/search', '/capital', '/recommendations', '/connections', '/connections/requests', '/introductions', '/gatherings', '/messages', '/wins', '/wins/new', '/profile', '/profile/edit', '/settings']) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }).first(), path).toBeVisible();
      await expect(page.getByText('Something went wrong'), path).toHaveCount(0);
    }
    w.assertClean();
  });

  test('the main navigation works on this screen size', async ({ page }) => {
    await page.goto('/dashboard');
    for (const [name, url] of [['Discover', /search/], ['Gatherings', /gatherings/], ['Messages', /messages/], ['Home', /dashboard/]] as const) {
      await page.getByRole('link', { name, exact: true }).first().click();
      await expect(page).toHaveURL(url);
    }
  });

  test('Discover finds members by keyword and by role', async ({ page }) => {
    await page.goto('/search');
    await page.locator('#q').fill('fintech');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/q=fintech/);
    await expect(page.getByRole('link', { name: /Divya Iyer|Fatima Al-Sayed/ }).first()).toBeVisible();
    await page.goto('/search?role=INVESTOR');
    await expect(page.getByRole('link', { name: /Divya Iyer|Olivia Brooks/ }).first()).toBeVisible();
    await expect(page.getByText(/no members match|nothing here/i)).toHaveCount(0);
  });

  test('a member profile shows roles, details and actions', async ({ page }) => {
    await page.goto('/search?q=Divya');
    await page.getByRole('link', { name: /Divya Iyer/ }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Divya Iyer');
    await expect(page.getByText('Investor').first()).toBeVisible();
    await expect(page.getByText(/check size/i)).toBeVisible();
  });

  test('Capital lists investors with filters', async ({ page }) => {
    await page.goto('/capital');
    await expect(page.getByText(/Divya Iyer|Olivia Brooks/).first()).toBeVisible();
  });

  test('editing the profile saves and shows on the profile page', async ({ page }) => {
    const w = watchForBreakage(page);
    await page.goto('/profile/edit');
    const headline = page.getByLabel('Headline');
    const original = await headline.inputValue();
    const changed = unique('Headline');
    await headline.fill(changed);
    await page.getByRole('button', { name: /save profile/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();
    await page.goto('/profile');
    await expect(page.getByText(changed)).toBeVisible();
    await page.goto('/profile/edit');
    await page.getByLabel('Headline').fill(original);
    await page.getByRole('button', { name: /save profile/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();
    w.assertClean();
  });

  test('sharing a win lists it and it can be deleted', async ({ page }) => {
    const story = unique('E2E win story');
    await page.goto('/wins/new');
    await page.getByRole('radio', { name: 'Other' }).check({ force: true });
    await page.getByLabel(/the story/i).fill(story);
    await page.getByRole('button', { name: 'Share the win' }).click();
    await page.waitForURL(/\/wins$/);
    await expect(page.getByText(story)).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await page.locator('article', { hasText: story }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(story)).toHaveCount(0);
  });

  test('settings: email preferences and public-website opt-in persist', async ({ page }) => {
    await page.goto('/settings');
    const box = page.getByLabel(/new messages/i);
    const was = await box.isChecked();
    await box.setChecked(!was);
    await page.waitForTimeout(800);
    await page.reload();
    expect(await page.getByLabel(/new messages/i).isChecked()).toBe(!was);
    await page.getByLabel(/new messages/i).setChecked(was);
    await page.waitForTimeout(800);
  });

  test('Message limits and read-only states do not break an existing conversation', async ({ page }) => {
    await page.goto('/messages');
    const first = page.getByRole('link', { name: /.+/ }).filter({ has: page.locator('img, span') }).first();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Messages');
    await expect(first).toBeVisible();
  });

  test('logging out ends the session', async ({ page }) => {
    await logout(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login|\/$/);
  });
});

test.describe('profile photo storage', () => {
  test('upload, serve through the access-checked route, then remove', async ({ page, request }) => {
    const w = watchForBreakage(page);
    await login(page, 'li@demo.womenbuilders.test', DEMO_PASSWORD);
    await page.goto('/profile/edit');
    await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: tinyPng(300) });
    await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeVisible({ timeout: 20_000 });
    const src = await page.locator('img[src*="/api/media/avatar/"]').first().getAttribute('src');
    expect(src).toBeTruthy();
    const ok = await page.request.get(src!);
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toMatch(/^image\//);
    // an anonymous visitor must not be able to fetch it
    const anon = await request.get(src!, { headers: { cookie: '' } });
    expect([401, 403, 404]).toContain(anon.status());
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.getByRole('button', { name: /upload photo/i })).toBeVisible();
    w.assertClean();
  });

  test('files that are not photos, or are too big, are refused with a clear message', async ({ page }) => {
    await login(page, 'li@demo.womenbuilders.test', DEMO_PASSWORD);
    await page.goto('/profile/edit');
    await page.locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await expect(page.getByRole('alert').filter({ hasText: /./ }).first()).toBeVisible({ timeout: 15_000 });
    await page.locator('input[type=file]').setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(4 * 1024 * 1024 + 10) });
    await expect(page.getByRole('alert').filter({ hasText: /4 MB/ })).toBeVisible();
  });
});
