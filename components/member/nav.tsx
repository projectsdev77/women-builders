'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CalendarHeart,
  CircleDollarSign,
  Ellipsis,
  Handshake,
  Heart,
  House,
  Mail,
  Search,
  Settings,
  Shield,
  ClipboardCheck,
  Star,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/client/api';
import { Avatar, CountBadge, cx } from '@/components/ui';
import type { RoleType } from '@prisma/client';

type Counts = { unread: number; pendingRequests: number; introductions: number };
type Badge = keyof Counts;
interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: Badge;
  /** Tint for the tile in the mobile More sheet. */
  tint: string;
}

const MAIN: Item[] = [
  { href: '/dashboard', label: 'Home', icon: House, tint: '#FBE3EA' },
  { href: '/search', label: 'Discover', icon: Search, tint: '#EFE9FB' },
  { href: '/capital', label: 'Capital', icon: CircleDollarSign, tint: '#F9EDBE' },
  { href: '/gatherings', label: 'Gatherings', icon: CalendarHeart, tint: '#FBE3EA' },
  { href: '/recommendations', label: 'For you', icon: Heart, tint: '#E6EED6' },
  { href: '/connections', label: 'Connections', icon: Users, badge: 'pendingRequests', tint: '#EFE9FB' },
  { href: '/introductions', label: 'Introductions', icon: Handshake, badge: 'introductions', tint: '#F9EDBE' },
  { href: '/messages', label: 'Messages', icon: Mail, badge: 'unread', tint: '#E6EED6' },
];
const WINS: Item = { href: '/wins', label: 'Wins', icon: Star, tint: '#F9EDBE' };
const SETTINGS: Item = { href: '/settings', label: 'Settings', icon: Settings, tint: '#F3EADF' };
const PROFILE: Item = { href: '/profile', label: 'My profile', icon: UserRound, tint: '#FBE3EA' };

/** Polls the badge counts every 30s while the tab is visible (G12). */
function useCounts() {
  const [counts, setCounts] = useState<Counts>({ unread: 0, pendingRequests: 0, introductions: 0 });
  useEffect(() => {
    let stopped = false;
    async function load() {
      if (document.visibilityState !== 'visible') return;
      const res = await api<Counts>('/api/me/counts');
      if (!stopped && res.ok) setCounts(res.data);
    }
    void load();
    const t = setInterval(load, 30_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, []);
  return counts;
}

export function Wordmark({ size = 23 }: { size?: number }) {
  return (
    <span className="font-display tracking-[-0.01em]" style={{ fontSize: size }}>
      women builders<span className="text-rose">.</span>
    </span>
  );
}

const BADGE_LABEL: Record<Badge, string> = { unread: 'unread', pendingRequests: 'requests waiting', introductions: 'waiting for your answer' };

export function MemberNav({
  name,
  isAdmin,
  isReviewer = false,
  role,
  photoUrl,
}: {
  name: string;
  isAdmin: boolean;
  isReviewer?: boolean;
  role: RoleType | null;
  photoUrl: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const counts = useCounts();
  const [sheet, setSheet] = useState(false);
  useEffect(() => setSheet(false), [pathname]);

  async function logout() {
    await api('/api/auth/logout', { body: {} });
    router.replace('/');
    router.refresh();
  }

  const staff: Item[] = isAdmin
    ? [{ href: '/admin', label: 'Admin', icon: Shield, tint: '#F3EADF' }]
    : isReviewer
      ? [{ href: '/admin/requests', label: 'Review requests', icon: ClipboardCheck, tint: '#F3EADF' }]
      : [];
  const bottom = [WINS, SETTINGS, ...staff];
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const row = (item: Item) => {
    const active = isActive(item.href);
    const n = item.badge ? counts[item.badge] : 0;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'flex min-h-[44px] items-center gap-3 rounded-[14px] px-2 text-[15px] font-semibold transition-colors duration-150',
          active ? 'bg-forest text-cream' : 'text-forest hover:bg-wash',
        )}
      >
        <span className={cx('flex h-7 w-7 items-center justify-center rounded-[10px]', active ? 'bg-founder text-forest' : '')}>
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <span className="flex-1">{item.label}</span>
        {item.badge && <CountBadge count={n} label={BADGE_LABEL[item.badge]} />}
      </Link>
    );
  };

  const sheetTotal = counts.pendingRequests + counts.introductions;
  const tabs: Array<Item & { n?: number }> = [MAIN[0]!, MAIN[1]!, MAIN[3]!, MAIN[7]!];
  const moreItems = [MAIN[2]!, MAIN[6]!, MAIN[5]!, MAIN[4]!, WINS, PROFILE, SETTINGS, ...staff];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-cream lg:flex">
        <div className="px-5 pb-4 pt-6">
          <Link href="/dashboard" aria-label="Women Builders, home"><Wordmark /></Link>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3">
          {MAIN.map(row)}
        </nav>
        <div className="space-y-1 border-t border-line px-3 py-3">
          {bottom.map(row)}
          <Link href="/profile" className="mt-2 flex items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-wash" aria-label="View my profile">
            <Avatar name={name} size={40} photoUrl={photoUrl} role={role} />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-bold">{name}</span>
              <span className="block text-[12.5px] text-ink-subtle">View my profile</span>
            </span>
          </Link>
          <button onClick={logout} className="min-h-[44px] w-full rounded-[14px] px-2 text-left text-[13.5px] font-semibold text-ink-subtle hover:bg-wash">Log out</button>
        </div>
      </aside>

      {/* Mobile and tablet top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-cream/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" aria-label="Women Builders, home"><Wordmark size={21} /></Link>
        <Link href="/profile" aria-label="My profile"><Avatar name={name} size={40} photoUrl={photoUrl} role={role} /></Link>
      </header>

      {/* Mobile and tablet bottom tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white px-1 pb-[22px] pt-1 lg:hidden">
        {tabs.map((t) => {
          const active = isActive(t.href);
          const Icon = t.icon;
          const n = t.badge ? counts[t.badge] : 0;
          return (
            <Link key={t.href} href={t.href} aria-current={active ? 'page' : undefined} className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11.5px] font-bold text-forest">
              <span className={cx('relative flex h-7 w-12 items-center justify-center rounded-full', active && 'bg-founder')}>
                <Icon size={20} strokeWidth={1.75} />
                {n > 0 && <span className="absolute -right-0.5 -top-1.5"><CountBadge count={n} label={BADGE_LABEL[t.badge!]} /></span>}
              </span>
              {t.label}
            </Link>
          );
        })}
        <button onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet} className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11.5px] font-bold text-forest">
          <span className="relative flex h-7 w-12 items-center justify-center rounded-full">
            <Ellipsis size={20} strokeWidth={1.75} />
            {sheetTotal > 0 && <span className="absolute -right-0.5 -top-1.5"><CountBadge count={sheetTotal} label="in More" /></span>}
          </span>
          More
        </button>
      </nav>

      {sheet && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button aria-label="Close" className="absolute inset-0 bg-forest-deep/45" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-cream px-4 pb-8 pt-4 shadow-dialog">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-[24px]">More</p>
              <button aria-label="Close" onClick={() => setSheet(false)} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full hover:bg-wash"><X size={22} /></button>
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const n = item.badge ? counts[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className="relative flex min-h-[72px] items-center gap-3 rounded-[20px] px-4 text-[15px] font-bold text-forest" style={{ background: item.tint }}>
                      <Icon size={22} strokeWidth={1.75} />
                      {item.label}
                      {n > 0 && <span className="absolute right-3 top-3"><CountBadge count={n} label={BADGE_LABEL[item.badge!]} /></span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <button onClick={logout} className="mt-4 min-h-[44px] w-full rounded-full text-[15px] font-semibold text-ink-subtle hover:bg-wash">Log out</button>
          </div>
        </div>
      )}
    </>
  );
}
