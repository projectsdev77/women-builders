import type { ReactNode } from 'react';
import { Wordmark } from '@/components/member/nav';

/** Centred card for 404, errors and the unsubscribed page: wordmark, a striped rose rule, a serif heading. */
export function StatusPage({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <p><Wordmark size={26} /></p>
        <div
          aria-hidden
          className="mx-auto h-3 w-24 rounded-full"
          style={{ background: 'repeating-linear-gradient(90deg,#F4B8C8 0 8px,#FBE3EA 8px 16px)' }}
        />
        <h1 className="!text-[clamp(36px,6vw,52px)]">{title}</h1>
        {children && <div className="space-y-2 text-[16px] text-ink-muted">{children}</div>}
        {actions && <div className="flex flex-wrap justify-center gap-3 pt-2">{actions}</div>}
      </div>
    </main>
  );
}
