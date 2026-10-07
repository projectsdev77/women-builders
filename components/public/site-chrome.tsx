import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/config';
import { buttonClass } from '@/components/ui';
import { Wordmark } from '@/components/member/nav';

/** Sticky public nav (cream 92% + blur). The primary label becomes "Join the waitlist" while applications are closed. */
export function PublicHeader({ waitlist = false }: { waitlist?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-[8px]">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[clamp(20px,4vw,48px)] py-3">
        <Link href="/" aria-label="Women Builders, home"><Wordmark size={24} /></Link>
        <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
          <Link href="/charter" className={buttonClass('ghost', 'sm', 'hidden sm:inline-flex')}>Charter</Link>
          <Link href="/login" className={buttonClass('ghost', 'sm')}>Log in</Link>
          <Link href="/request-invite" className={buttonClass('primary', 'sm')}>{waitlist ? 'Join the waitlist' : 'Request an invitation'}</Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t-[1.5px] border-forest">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-6 px-[clamp(20px,4vw,48px)] py-10">
        <div className="space-y-2">
          <Wordmark size={40} />
          <p className="text-[14px] text-ink-subtle">© {new Date().getUTCFullYear()} Women Builders</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-semibold">
          <Link href="/charter" className="underline underline-offset-4">Community charter</Link>
          <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
          <Link href="/terms" className="underline underline-offset-4">Terms</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">{CONTACT_EMAIL}</a>
          <Link href="/login" className="underline underline-offset-4">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
