'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cx } from '@/components/ui';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/applications', label: 'Applications', badge: 'applications' as const },
  { href: '/admin/members', label: 'Members' },
  { href: '/admin/prospects', label: 'Potential members' },
  { href: '/admin/follow-ups', label: 'Follow-ups', badge: 'followUps' as const },
  { href: '/admin/invitations', label: 'Invitations' },
  { href: '/admin/reports', label: 'Reports', badge: 'reports' as const },
  { href: '/admin/audit', label: 'Audit log' },
];

export function AdminNav({ counts }: { counts: { applications: number; followUps: number; reports: number } }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const count = item.badge ? counts[item.badge] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex min-h-[44px] shrink-0 items-center justify-between gap-2 rounded-md px-3 text-sm',
              active ? 'bg-brand-50 font-medium text-brand-700' : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            {item.label}
            {count > 0 && <span className="rounded-full bg-brand-600 px-2 text-xs text-white">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
