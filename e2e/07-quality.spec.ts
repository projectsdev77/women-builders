import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, DEMO_PASSWORD, MEMBER, OTHER, login } from './helpers';

const PUBLIC = ['/', '/login', '/request-invite', '/charter', '/forgot-password', '/privacy', '/terms'];
const MEMBER_PAGES = ['/dashboard', '/search', '/capital', '/recommendations', '/connections', '/introductions', '/gatherings', '/messages', '/wins', '/wins/new', '/profile', '/profile/edit', '/settings'];
const ADMIN_PAGES = ['/admin', '/admin/requests', '/admin/members', '/admin/prospects', '/admin/gatherings', '/admin/gatherings/new', '/admin/invitations', '/admin/introductions', '/admin/reports', '/admin/settings', '/admin/audit'];

async function overflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    if (doc.scrollWidth <= doc.clientWidth + 1) return null;
    // Name the culprit: the widest element past the right edge that no scroll box or clip contains.
    const clipped = (el: Element) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(a).overflowX)) return true;
      }
      return false;
    };
    let worst = '', w = 0;
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > w && getComputedStyle(el).position !== 'fixed' && !clipped(el)) {
        w = r.width;
        worst = `<${el.tagName.toLowerCase()} class="${String((el as HTMLElement).className).slice(0, 80)}"> “${(el.textContent ?? '').trim().slice(0, 40)}”`;
      }
    }
    return `${doc.scrollWidth}px wide on a ${doc.clientWidth}px screen; culprit: ${worst}`;
  });
}

async function serious(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} place(s), e.g. ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} [${(n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 160)}]`).join(' | ')}`);
}

test.describe('fits small screens and 200% zoom (nothing wider than the screen)', () => {
  // 320px is a small phone, and also what a 640px window looks like at 200% zoom.
  test.use({ viewport: { width: 320, height: 720 } });

  test('public pages', async ({ page }) => {
    const bad: string[] = [];
    for (const p of PUBLIC) {
      await page.goto(p);
      const o = await overflow(page);
      if (o) bad.push(`${p}: ${o}`);
    }
    expect(bad).toEqual([]);
  });
  test('member pages', async ({ page }) => {
    await login(page, MEMBER.email, DEMO_PASSWORD);
    const bad: string[] = [];
    for (const p of MEMBER_PAGES) {
      await page.goto(p);
      const o = await overflow(page);
      if (o) bad.push(`${p}: ${o}`);
    }
    expect(bad).toEqual([]);
  });
  test('admin pages', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    const bad: string[] = [];
    for (const p of ADMIN_PAGES) {
      await page.goto(p);
      const o = await overflow(page);
      if (o) bad.push(`${p}: ${o}`);
    }
    expect(bad).toEqual([]);
  });
});

test.describe('accessibility scan (no serious or critical WCAG A/AA problems)', () => {
  test('public pages', async ({ page }) => {
    const found: string[] = [];
    for (const p of PUBLIC) {
      await page.goto(p);
      found.push(...(await serious(page)).map((v) => `${p}: ${v}`));
    }
    expect(found).toEqual([]);
  });
  test('member pages', async ({ page }) => {
    await login(page, MEMBER.email, DEMO_PASSWORD);
    const found: string[] = [];
    for (const p of MEMBER_PAGES) {
      await page.goto(p);
      found.push(...(await serious(page)).map((v) => `${p}: ${v}`));
    }
    expect(found).toEqual([]);
  });
  test('admin pages', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    const found: string[] = [];
    for (const p of ADMIN_PAGES) {
      await page.goto(p);
      found.push(...(await serious(page)).map((v) => `${p}: ${v}`));
    }
    expect(found).toEqual([]);
  });
});

test.describe('keyboard', () => {
  test('login works with the keyboard alone, and focus is always visible', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium' && !!process.env.CI, 'focus styles checked in Chromium');
    await page.goto('/login');
    const visibleFocus = () => page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const s = getComputedStyle(el);
      return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
    });
    await page.locator('#email').focus();
    await page.keyboard.type(MEMBER.email);
    expect(await visibleFocus()).toBe(true);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('password');
    expect(await visibleFocus()).toBe(true);
    await page.keyboard.type(DEMO_PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForURL(/dashboard/);
  });

  test('Escape closes a dialog', async ({ page }) => {
    await login(page, MEMBER.email, DEMO_PASSWORD);
    await page.goto(`/search?q=${encodeURIComponent(OTHER.name)}`);
    await page.getByRole('link', { name: new RegExp(OTHER.name) }).first().click();
    await page.getByText('More options').click();
    await page.getByRole('button', { name: /^Report/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test('with "reduce motion" on, the homepage stops its animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const running = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.animate-marquee, .animate-spin-slow')).map((el) => getComputedStyle(el).animationName),
  );
  expect(running.length).toBeGreaterThan(0);
  expect(running.every((n) => n === 'none')).toBe(true);
});
