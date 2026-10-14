import { expect, test, type Browser, type Page } from '@playwright/test';
import { ADMIN, DEMO_PASSWORD, latestEmail, login, logout, unique, watchForBreakage } from './helpers';
import { addMessage, connectMembers, freshMember, prisma } from './fixtures';

/** A second, independent browser session (another person). */
async function asOther(browser: Browser, baseURL: string | undefined, viewport: ReturnType<Page['viewportSize']>, email: string) {
  const ctx = await browser.newContext({ baseURL, viewport: viewport ?? undefined });
  const p = await ctx.newPage();
  await login(p, email, DEMO_PASSWORD);
  return { p, close: () => ctx.close() };
}

test.describe('community', () => {
  test('warm introduction: ask a mutual connection, she introduces, the other accepts, a conversation starts', async ({ page, browser, baseURL }) => {
    const w = watchForBreakage(page);
    const asker = await freshMember('asker', 'FOUNDER');
    const mutual = await freshMember('mutual', 'BUILDER');
    const target = await freshMember('target', 'INVESTOR');
    await connectMembers(asker.id, mutual.id);
    await connectMembers(mutual.id, target.id);

    await login(page, asker.email, DEMO_PASSWORD);
    await page.goto(`/members/${target.id}`);
    await page.getByRole('button', { name: 'Ask for an introduction' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText(mutual.name).click();
    await dialog.locator('#intro-note-b').fill('Could you introduce me? I am raising pre-seed in fintech.');
    await dialog.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText(/introduction requested/i)).toBeVisible();

    const b = await asOther(browser, baseURL, page.viewportSize(), mutual.email);
    await b.p.goto('/introductions?tab=asked');
    await b.p.locator('article, li', { hasText: asker.name }).first().getByRole('button', { name: 'Introduce' }).click();
    await b.p.getByRole('dialog').getByRole('button', { name: 'Send introduction' }).click();
    await expect(b.p.getByText(/introduced/i).first()).toBeVisible();
    await b.close();

    const c = await asOther(browser, baseURL, page.viewportSize(), target.email);
    await c.p.goto('/introductions?tab=for-me');
    // On desktop the sidebar shows the badge; on phones Introductions sits in the More sheet.
    const desktop = (c.p.viewportSize()?.width ?? 0) >= 1024;
    const waiting = c.p.getByRole('link', { name: /introductions.*waiting for your answer|waiting for your answer.*introductions/i });
    if (desktop) await expect(waiting.first()).toBeVisible();
    await c.p.getByRole('button', { name: 'Accept' }).first().click();
    await expect(c.p.getByText('✓ Connected')).toBeVisible();
    // The badge clears right away, without waiting for the 30-second refresh.
    if (desktop) await expect(waiting).toHaveCount(0, { timeout: 5_000 });
    expect((await (await c.p.request.get('/api/me/counts')).json()).introductions).toBe(0);
    await c.close();

    await page.goto(`/messages/${target.id}`);
    await expect(page.getByText(/introduced by/i)).toBeVisible();
    w.assertClean();
  });

  test('a member who prefers introductions cannot be sent a cold connection request', async ({ page }) => {
    const me = await freshMember('cold', 'FOUNDER');
    const shy = await freshMember('shy', 'INVESTOR', { preferIntroductions: true });
    await login(page, me.email, DEMO_PASSWORD);
    await page.goto(`/members/${shy.id}`);
    await expect(page.getByText(/prefers introductions/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect', exact: true })).toHaveCount(0);
  });

  test('hidden details: non-connections see a lock note, connections see the field', async ({ page, browser, baseURL }) => {
    const owner = await freshMember('private', 'FOUNDER', { profile: { city: 'Hiddenville' } });
    await prisma.profile.update({ where: { userId: owner.id }, data: { hiddenFields: ['location'] } });
    const stranger = await freshMember('stranger', 'BUILDER');
    const friend = await freshMember('friend', 'OPERATOR');
    await connectMembers(owner.id, friend.id);

    await login(page, stranger.email, DEMO_PASSWORD);
    await page.goto(`/members/${owner.id}`);
    await expect(page.getByText(/shares some details only with connections/i)).toBeVisible();
    await expect(page.getByText('Hiddenville')).toHaveCount(0);

    const f = await asOther(browser, baseURL, page.viewportSize(), friend.email);
    await f.p.goto(`/members/${owner.id}`);
    await expect(f.p.getByText(/Hiddenville/).first()).toBeVisible();
    await f.close();
  });

  test('sharing a win that names a connection, who confirms it, marks it verified', async ({ page, browser, baseURL }) => {
    const author = await freshMember('winner', 'FOUNDER');
    const named = await freshMember('named', 'INVESTOR');
    await connectMembers(author.id, named.id);
    const story = unique('E2E verified win');

    await login(page, author.email, DEMO_PASSWORD);
    await page.goto(`/wins/new?with=${named.id}`);
    await page.getByRole('radio', { name: 'Investment' }).check({ force: true });
    await page.getByLabel(/the story/i).fill(story);
    await page.getByRole('radio', { name: /^Members can see it/ }).check({ force: true });
    await page.getByRole('button', { name: 'Share the win' }).click();
    await page.waitForURL(/\/wins$/);

    const n = await asOther(browser, baseURL, page.viewportSize(), named.email);
    await n.p.goto('/wins');
    await n.p.locator('article', { hasText: story }).getByRole('button', { name: 'Yes, confirm' }).click();
    await expect(n.p.locator('article', { hasText: story })).toHaveCount(0);
    await n.close();

    await page.reload();
    await expect(page.locator('article', { hasText: story }).getByText('Verified', { exact: true })).toBeVisible();
  });

  test('"Not now" hides a suggestion and Undo brings it back', async ({ page }) => {
    const me = await freshMember('picky', 'FOUNDER');
    await login(page, me.email, DEMO_PASSWORD);
    await page.goto('/recommendations');
    const dismiss = page.getByRole('button', { name: /^Not now: hide/ });
    await expect(dismiss.first()).toBeVisible();
    // The list refills up to its limit, so follow the one person rather than the count.
    const label = (await dismiss.first().getAttribute('aria-label'))!;
    await dismiss.first().click();
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  });
});

test.describe('safety and privacy', () => {
  test('blocking: the two members disappear from each other', async ({ page, browser, baseURL }) => {
    const me = await freshMember('blocker', 'FOUNDER');
    const them = await freshMember('blocked', 'INVESTOR');
    await login(page, me.email, DEMO_PASSWORD);
    await page.goto(`/members/${them.id}`);
    await page.getByText('More options').click();
    await page.getByRole('button', { name: `Block ${them.name.split(' ')[0]}` }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Block' }).click();
    await page.waitForURL(/dashboard/);

    await page.goto(`/search?q=${encodeURIComponent(them.name)}`);
    await expect(page.getByRole('link', { name: new RegExp(them.name) })).toHaveCount(0);
    expect((await page.goto(`/members/${them.id}`))?.status()).toBe(404);

    const t = await asOther(browser, baseURL, page.viewportSize(), them.email);
    await t.p.goto(`/search?q=${encodeURIComponent(me.name)}`);
    await expect(t.p.getByRole('link', { name: new RegExp(me.name) })).toHaveCount(0);
    await t.close();
  });

  test('reporting a member reaches the admin, and the report form is confidential', async ({ page, browser, baseURL }) => {
    const me = await freshMember('reporter', 'FOUNDER');
    const them = await freshMember('reported', 'BUILDER');
    await login(page, me.email, DEMO_PASSWORD);
    await page.goto(`/members/${them.id}`);
    await page.getByText('More options').click();
    await page.getByRole('button', { name: `Report ${them.name.split(' ')[0]}` }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel(/what's wrong/i).selectOption('SPAM');
    await d.getByRole('button', { name: 'Submit report' }).click();
    await expect(d.getByText(/won.t be told who reported/i)).toBeVisible();

    const a = await asOther(browser, baseURL, page.viewportSize(), ADMIN.email);
    await a.p.goto('/admin/reports');
    await expect(a.p.getByText(them.name).first()).toBeVisible();
    await a.close();
  });

  test('deleting an account keeps the conversation for the other person as "Deleted account"', async ({ page, browser, baseURL }) => {
    const leaver = await freshMember('leaver', 'OPERATOR');
    const stayer = await freshMember('stayer', 'FOUNDER');
    await addMessage(leaver.id, stayer.id, 'Thanks for the chat, good luck with the raise!');

    await login(page, leaver.email, DEMO_PASSWORD);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Confirm your password').fill(DEMO_PASSWORD);
    await d.getByLabel(/type "delete"/i).fill('DELETE');
    await d.getByRole('button', { name: 'Delete forever' }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/settings'));

    const s = await asOther(browser, baseURL, page.viewportSize(), stayer.email);
    await s.p.goto('/messages');
    await expect(s.p.getByText('Deleted account').first()).toBeVisible();
    await s.p.goto(`/messages/${leaver.id}`);
    await expect(s.p.getByRole('list', { name: /conversation with/i }).getByText('Thanks for the chat, good luck with the raise!')).toBeVisible();
    await expect(s.p.getByRole('textbox', { name: /message/i })).toHaveCount(0); // read-only
    await s.close();
    await prisma.user.delete({ where: { id: leaver.id } }); // the placeholder no longer has an e2e- email
  });

  test('"Download my data" returns my own profile and messages', async ({ page }) => {
    const me = await freshMember('exporter', 'FOUNDER');
    const pal = await freshMember('pal', 'BUILDER');
    await addMessage(me.id, pal.id, 'Export me please');
    await login(page, me.email, DEMO_PASSWORD);
    const res = await page.request.get('/api/me/export');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain(me.email);
    expect(body).toContain('Export me please');
  });

  test('after logging out, the back button does not show private pages', async ({ page }) => {
    const me = await freshMember('backer', 'FOUNDER');
    await login(page, me.email, DEMO_PASSWORD);
    await page.goto('/settings');
    await logout(page);
    await page.goBack();
    await page.reload();
    await expect(page).toHaveURL(/login|\/$/);
  });
});

test.describe('admin decisions', () => {
  test('waitlist switch changes the public form, then switches back', async ({ page, browser, baseURL }) => {
    const before = await prisma.siteSetting.findUnique({ where: { key: 'applicationsOpen' } });
    try {
      await login(page, ADMIN.email, ADMIN.password);
      await page.goto('/admin/settings');
      await page.getByLabel(/waitlist: the public form/i).check();
      await page.getByRole('button', { name: 'Save settings' }).click();
      await expect(page.getByText(/saved/i).first()).toBeVisible();
      const anon = await browser.newContext({ baseURL });
      const v = await anon.newPage();
      await v.goto('/request-invite');
      await expect(v.getByRole('heading', { level: 1 })).toContainText(/join the waitlist/i);
      await anon.close();
      await page.getByLabel(/open: requests are reviewed/i).check();
      await page.getByRole('button', { name: 'Save settings' }).click();
      await expect(page.getByText(/saved/i).first()).toBeVisible();
    } finally {
      // Put the setting back exactly as it was, whatever happened above.
      if (before) await prisma.siteSetting.update({ where: { key: 'applicationsOpen' }, data: { value: before.value as never } });
      else await prisma.siteSetting.deleteMany({ where: { key: 'applicationsOpen' } });
    }
  });

  test('declining a request asks for confirmation and sends a kind email', async ({ page }, info) => {
    const email = `${unique('e2e-decline', info)}@example.com`;
    await prisma.publicSubmission.deleteMany({ where: { kind: 'invite_request', email: { startsWith: 'e2e-' } } });
    await page.goto('/request-invite');
    await page.getByLabel('Full name').fill('Decline Test');
    await page.locator('#ri-email').fill(email);
    await page.getByRole('radio', { name: 'Builder' }).check({ force: true });
    await page.getByLabel('Country').selectOption({ label: 'Ghana' });
    await page.getByLabel(/what are you building/i).fill('Testing the decline path of the invitation review queue.');
    await page.locator('input[type=checkbox]').last().check({ force: true });
    await page.getByRole('button', { name: /request an invitation|join the waitlist/i }).click();
    await expect(page.getByText(/we.ve got your request|thank you|received/i).first()).toBeVisible();

    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/requests');
    const card = page.locator('li', { hasText: email }).first();
    await card.getByRole('button', { name: 'Decline' }).last().click();
    const d = page.getByRole('dialog');
    await expect(d).toContainText(/kind email/i);
    await d.getByRole('button', { name: 'Decline and email' }).click();
    await expect(page.locator('li', { hasText: email })).toHaveCount(0);
    const mail = await latestEmail(email, 'request_declined');
    expect(mail.subject.length).toBeGreaterThan(3);
  });
});
