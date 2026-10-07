import { expect, test } from '@playwright/test';
import { DEMO_PASSWORD, MEMBER, login } from './helpers';

test.describe('API access control', () => {
  test('anonymous API calls are refused', async ({ request }) => {
    for (const [method, path] of [['get', '/api/notifications'], ['get', '/api/members?q=a'], ['get', '/api/messages/conversations/x'], ['get', '/api/admin/members']] as const) {
      const res = await request[method](path);
      expect([401, 403, 404], `${method} ${path}`).toContain(res.status());
    }
  });

  test('cross-origin writes are rejected even with a valid session', async ({ page, baseURL }) => {
    await login(page, MEMBER.email, DEMO_PASSWORD);
    const res = await page.request.post('/api/messages', {
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      data: { receiverId: 'x', content: 'hi' },
    });
    expect([400, 403]).toContain(res.status());
    expect(baseURL).toBeTruthy();
  });

  test('cron routes need the secret', async ({ request }) => {
    for (const p of ['outbox', 'daily', 'hourly', 'expire-requests', 'archive', 'requests-digest']) {
      expect((await request.get(`/api/cron/${p}`)).status(), p).toBe(401);
      expect((await request.get(`/api/cron/${p}`, { headers: { authorization: 'Bearer wrong' } })).status(), p).toBe(401);
    }
  });

  test('cron routes run with the right secret', async ({ request }) => {
    test.skip(!process.env.CRON_SECRET, 'Set CRON_SECRET to test the authorised path');
    const res = await request.get('/api/cron/outbox', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(res.status()).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  test('login is throttled after repeated wrong passwords', async ({ page }) => {
    const email = `nobody-${Date.now()}@example.com`;
    let throttled = false;
    for (let i = 0; i < 12 && !throttled; i++) {
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('WrongPass123');
      await page.getByRole('button', { name: /log in/i }).click();
      await expect(page.getByText(/incorrect|too many/i).first()).toBeVisible();
      throttled = await page.getByText(/too many attempts/i).isVisible();
    }
    expect(throttled).toBe(true);
  });

  test('a wrong password gives the same message as an unknown email', async ({ page }) => {
    const message = async (email: string) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('WrongPass123');
      await page.getByRole('button', { name: /log in/i }).click();
      const msg = page.getByText(/incorrect|too many/i).first();
      await expect(msg).toBeVisible();
      return (await msg.textContent())?.trim();
    };
    expect(await message(MEMBER.email)).toBe(await message(`ghost-${Date.now()}@example.com`));
  });
});
