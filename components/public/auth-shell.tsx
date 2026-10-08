import Link from 'next/link';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/member/nav';

const ART = {
  pink: { solid: '#F4B8C8', tint: '#FBE3EA' },
  lavender: { solid: '#D9CCF5', tint: '#EFE9FB' },
  butter: { solid: '#F2D774', tint: '#F9EDBE' },
  sage: { solid: '#C9D9A8', tint: '#E6EED6' },
} as const;
export type AuthArt = keyof typeof ART;

/**
 * Account screens (designer handoff): a role-coloured art panel with white stripes on the
 * left (a thin band on phones), and the form column on the right.
 */
export function AuthShell({
  art,
  kicker,
  line,
  children,
}: {
  art: AuthArt;
  kicker: string;
  line: string;
  children: ReactNode;
}) {
  const c = ART[art];
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(380px,45%)_1fr]">
      <aside
        aria-hidden="false"
        className="relative flex items-start justify-between overflow-hidden px-6 py-5 lg:min-h-screen lg:flex-col lg:px-12 lg:py-10"
        style={{ background: `repeating-linear-gradient(90deg, ${c.solid} 0 28px, ${c.tint} 28px 56px)` }}
      >
        <Link href="/" aria-label="Women Builders, home"><Wordmark size={26} /></Link>
        <div aria-hidden className="hidden w-full max-w-[360px] -rotate-2 rounded-3xl bg-white p-6 shadow-collage lg:block">
          <p className="font-mono text-[11px] uppercase tracking-[.1em] text-ink-subtle">{kicker}</p>
          <p className="mt-2 font-display text-[28px] leading-[1.1]">{line}</p>
        </div>
        <span aria-hidden className="hidden lg:block" />
      </aside>
      <main id="main" className="flex justify-center lg:items-center px-[clamp(20px,4vw,48px)] py-[clamp(32px,6vw,72px)]">
        <div className="w-full max-w-[520px] space-y-6">{children}</div>
      </main>
    </div>
  );
}

/** Title block for account screens. */
export function AuthTitle({ title, lede, pill }: { title: string; lede?: ReactNode; pill?: ReactNode }) {
  return (
    <header className="space-y-3">
      {pill}
      <h1 className="text-[clamp(40px,5vw,60px)] leading-[1] tracking-[-0.02em]">{title}</h1>
      {lede && <p className="text-[17px] leading-relaxed text-ink-muted">{lede}</p>}
    </header>
  );
}
