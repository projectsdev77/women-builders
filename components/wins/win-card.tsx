import Link from 'next/link';
import type { WinView } from '@/lib/services/wins';
import { Avatar, Badge } from '@/components/ui';
import { formatMonth } from '@/components/profile/member-profile';

/** One win. There is no feed: these appear on profiles, Home and the member's own Wins page. */
export function WinCard({ win, children, showAuthor = true }: { win: WinView; children?: React.ReactNode; showAuthor?: boolean }) {
  const others = win.with.map((w) => (w.id ? <Link key={w.id} href={`/members/${w.id}`} className="underline">{w.name}</Link> : <span key={w.name}>{w.name}</span>));
  return (
    <article className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{win.typeLabel}</Badge>
        <span className="text-xs text-gray-600">{formatMonth(win.month)}</span>
        {win.verified && <Badge tone="green">Verified</Badge>}
        {win.gathering && <span className="text-xs text-gray-600">· from {win.gathering.title}</span>}
        {win.source === 'INTRODUCTION' && <span className="text-xs text-gray-600">· from an introduction</span>}
      </div>
      {showAuthor && (
        <div className="flex items-center gap-2 text-sm">
          <Avatar name={win.author.name} size={32} photoUrl={win.author.photoUrl} ghost={!win.author.id} />
          <span>
            {win.author.id ? <Link href={`/members/${win.author.id}`} className="font-medium hover:underline">{win.author.name}</Link> : win.author.name}
            {others.length > 0 && <> with {others.reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ', ', el] : [el]), [])}</>}
            {win.outsideNetwork && <> and someone outside the network</>}
          </span>
        </div>
      )}
      {!showAuthor && others.length > 0 && <p className="text-sm">With {others.reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, ', ', el] : [el]), [])}</p>}
      {win.story && <p className="whitespace-pre-line text-sm text-gray-800">{win.story}</p>}
      {children}
    </article>
  );
}
