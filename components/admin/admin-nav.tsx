'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/requests', label: 'Requests', badge: 'requests' as const },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/prospects', label: 'Potential members' },
  { href: '/admin/follow-ups', label: 'Follow-ups', badge: 'followUps' as const },
  { href: '/admin/gatherings', label: 'Gatherings' },
  { href: '/admin/invitations', label: 'Invitations' },
  { href: '/admin/introductions', label: 'Introduction requests', badge: 'introductions' as const },
  { href: '/admin/reports', label: 'Reports', badge: 'reports' as const },
  { href: '/admin/settings', label: 'Site settings' },
  { href: '/admin/audit', label: 'Audit log' },
];

export function AdminNav({ counts, reviewerOnly = false }: {
  reviewerOnly?: boolean; counts: { requests: number; requestsOverdue: number; followUps: number; reports: number; introductions: number } }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
      {ITEMS.filter((i) => !reviewerOnly || i.href === '/admin/requests').map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const count = item.badge ? counts[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex min-h-[44px] shrink-0 items-center justify-between gap-3 rounded-[12px] px-3.5 text-[15px] transition-colors',
              active ? 'bg-forest font-bold text-cream' : 'font-medium hover:bg-wash',
            )}
          >
            {item.label}
            {count > 0 && (
              <span className={cx('inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 font-mono text-[12px] font-medium text-white', item.badge === 'requests' && counts.requestsOverdue > 0 ? 'bg-danger' : 'bg-rose')}>
                {count}
                {item.badge === 'requests' && counts.requestsOverdue > 0 && <span className="sr-only"> ({counts.requestsOverdue} overdue)</span>}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
