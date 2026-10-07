import type { ReactNode } from 'react';
import { Check, Clock } from 'lucide-react';
import { cx } from '@/components/ui';

/** Dinner = Founder pink, Working session = Operator lavender, other = Builder sage (designer). */
const COVER: Record<string, [string, string]> = {
  DINNER: ['#F4B8C8', '#FBE3EA'],
  WORKING_SESSION: ['#D9CCF5', '#EFE9FB'],
  OTHER: ['#C9D9A8', '#E6EED6'],
};
const TYPE_TEXT: Record<string, string> = { DINNER: 'Dinner', WORKING_SESSION: 'Working session', OTHER: 'Gathering' };

export function stripes(type: string, w = 14) {
  const [a, b] = COVER[type] ?? COVER.OTHER!;
  return `repeating-linear-gradient(90deg, ${a} 0 ${w}px, ${b} ${w}px ${w * 2}px)`;
}

/** White circle date stamp, rotated -8°: Geist Mono month over a Young Serif day. */
export function DateStamp({ startsAt, timeZone, size = 88 }: { startsAt: string; timeZone: string; size?: number }) {
  const d = new Date(startsAt);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone }).format(d).toUpperCase();
  const day = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone }).format(d);
  return (
    <span aria-hidden className="flex -rotate-[8deg] flex-col items-center justify-center rounded-full bg-white shadow-lift" style={{ width: size, height: size }}>
      <span className="font-mono text-[11px] tracking-[.1em]">{month}</span>
      <span className="font-display leading-none" style={{ fontSize: size * 0.36 }}>{day}</span>
    </span>
  );
}

export function TypePill({ type }: { type: string }) {
  return <span className="rounded-full bg-white px-3 py-1 text-[12.5px] font-bold">{TYPE_TEXT[type] ?? 'Gathering'}</span>;
}

const SEAT: Record<string, { text: string; cls: string; icon?: ReactNode }> = {
  CONFIRMED: { text: 'Confirmed', cls: 'bg-success-bg text-success', icon: <Check size={13} strokeWidth={2.5} /> },
  REQUESTED: { text: 'Requested', cls: 'bg-cream text-ink-muted border border-line', icon: <Clock size={13} strokeWidth={2.25} /> },
  WAITLISTED: { text: 'Waitlisted', cls: 'bg-warning-bg text-warning', icon: <span aria-hidden>…</span> },
  DECLINED: { text: 'Not this time', cls: 'bg-cream text-ink-muted border border-line' },
  CANCELLED: { text: 'Cancelled', cls: 'bg-cream text-ink-muted border border-line' },
};
export function SeatPill({ status }: { status: string }) {
  const s = SEAT[status];
  if (!s) return null;
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-bold', s.cls)}>{s.icon}{s.text}</span>;
}
