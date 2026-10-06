'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/config';
import { api } from '@/lib/client/api';
import { cx } from '@/components/ui';

const ITEMS = [
  { href: '/dashboard', label: 'Home' },
  { href: '/search', label: 'Discover' },
  { href: '/capital', label: 'Capital' },
  { href: '/recommendations', label: 'For you' },
  { href: '/connections', label: 'Connections' },
  { href: '/messages', label: 'Messages', badge: 'messages' as const },
  { href: '/profile', label: 'Profile' },
  { href: '/settings', label: 'Settings' },
];

/** Polls the unread-message count every 30s while the tab is visible (G12). */
function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let stopped = false;
    async function load() {
      if (document.visibilityState !== 'visible') return;
      const res = await api<{ unread: number; pendingRequests: number }>('/api/me/counts');
      if (!stopped && res.ok) setCount(res.data.unread);
    }
    void load();
    const t = setInterval(load, 30_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);
  return count;
}

export function MemberNav({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const unread = useUnreadCount();

  async function logout() {
    await api('/api/auth/logout', { body: {} });
    router.replace('/');
    router.refresh();
  }

  const items = isAdmin ? [...ITEMS, { href: '/admin', label: 'Admin' }] : ITEMS;
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="mr-2 font-bold text-brand-700">
          {APP_NAME}
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'inline-flex min-h-[44px] items-center rounded-md px-3 text-sm',
                  active ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {item.label}
                {item.badge === 'messages' && unread > 0 && (
                  <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs text-white">
                    {unread > 99 ? '99+' : unread}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-gray-600 sm:inline">{name}</span>
          <button onClick={logout} className="min-h-[44px] rounded-md px-3 text-gray-700 hover:bg-gray-100">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
