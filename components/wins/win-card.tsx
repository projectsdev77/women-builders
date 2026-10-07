import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import type { WinView } from '@/lib/services/wins';
import { Avatar, cx } from '@/components/ui';
import { formatMonth } from '@/components/profile/member-profile';

const TYPE_TINT: Record<string, string> = {
  INVESTMENT: 'bg-butter-tint',
  HIRE: 'bg-builder-tint',
  ADVISOR: 'bg-operator-tint',
  CUSTOMER: 'bg-founder-tint',
  COFOUNDER: 'bg-founder-tint',
  SPEAKING: 'bg-butter-tint',
  OTHER: 'bg-wash',
};

function joinNodes(nodes: React.ReactNode[]) {
  return nodes.reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ', ', el] : [el]), []);
}

/** One win. There is no feed: these appear on profiles, Home and the member's own Wins page. */
export function WinCard({ win, children, showAuthor = true, tilt }: { win: WinView; children?: React.ReactNode; showAuthor?: boolean; tilt?: 'left' | 'right' }) {
  const others = win.with.map((w) => (w.id ? <Link key={w.id} href={`/members/${w.id}`} className="font-semibold underline underline-offset-2">{w.name}</Link> : <span key={w.name}>{w.name}</span>));
  const from = win.gathering ? `from ${win.gathering.title}` : win.source === 'INTRODUCTION' ? 'from an introduction' : null;
  return (
    <article className={cx('space-y-3 rounded-[24px] border border-line-soft bg-white p-5', tilt === 'left' && '-rotate-[0.6deg]', tilt === 'right' && 'rotate-[0.6deg]')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cx('rounded-full px-3 py-1 text-[12.5px] font-bold', TYPE_TINT[win.type] ?? 'bg-wash')}>{win.typeLabel}</span>
        <span className="font-mono text-[12px] uppercase tracking-[.06em] text-ink-subtle">
          {formatMonth(win.month)}
          {from && <> · {from}</>}
        </span>
        {win.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1 text-[12px] font-bold text-success"><BadgeCheck size={13} strokeWidth={2.25} aria-hidden /> Verified</span>
        )}
      </div>
      {win.story && <p className="whitespace-pre-line font-display text-[20px] leading-snug">“{win.story}”</p>}
      {showAuthor && (
        <div className="flex items-center gap-2 text-[14px]">
          <Avatar name={win.author.name} size={32} photoUrl={win.author.photoUrl} ghost={!win.author.id} />
          <span>
            {win.author.id ? <Link href={`/members/${win.author.id}`} className="font-bold hover:underline">{win.author.name}</Link> : win.author.name}
            {others.length > 0 && <> with {joinNodes(others)}</>}
            {win.outsideNetwork && <> and someone outside the network</>}
          </span>
        </div>
      )}
      {!showAuthor && others.length > 0 && <p className="text-[14px]">With {joinNodes(others)}</p>}
      {children}
    </article>
  );
}
