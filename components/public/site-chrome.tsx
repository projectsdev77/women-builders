import Link from 'next/link';
import { APP_NAME, CONTACT_EMAIL } from '@/lib/config';

export function PublicHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-bold text-brand-700">{APP_NAME}</Link>
        <nav aria-label="Site" className="flex items-center gap-2 text-sm">
          <Link href="/charter" className="hidden min-h-[44px] items-center px-2 text-gray-700 sm:inline-flex">Charter</Link>
          <Link href="/login" className="inline-flex min-h-[44px] items-center px-2 text-gray-700">Log in</Link>
          <Link href="/request-invite" className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-forest px-5 text-[15px] font-bold text-cream shadow-press-sm hover:bg-[#2E5A40]">Request an invitation</Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-gray-600">
        <p>© {new Date().getUTCFullYear()} {APP_NAME}</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-4">
          <Link href="/charter" className="underline">Community charter</Link>
          <Link href="/privacy" className="underline">Privacy</Link>
          <Link href="/terms" className="underline">Terms</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          <Link href="/login" className="underline">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
