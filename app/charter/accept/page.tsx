import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { APP_NAME } from '@/lib/config';
import { CHARTER_VERSION } from '@/content/charter';
import { CharterText, CharterVersion } from '@/components/charter/charter-text';
import { Wordmark } from '@/components/member/nav';
import { AccountSettings } from '@/app/(member)/settings/account-settings';
import { AcceptCharterButton } from './accept-button';

export const metadata: Metadata = { title: 'Updated community charter' };

/** Interstitial shown when the charter changed since the member last accepted it (R3 F2). */
export default async function AcceptCharterPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.accountStatus !== 'ACTIVE' || (user.charterVersion ?? 0) >= CHARTER_VERSION) redirect(homeFor(user));

  return (
    <div className="mx-auto max-w-[760px] px-[clamp(20px,4vw,48px)] py-[clamp(32px,5vw,64px)]">
      <Wordmark size={24} />
      <main id="main" className="mt-8 space-y-6">
        <header className="space-y-4">
          <CharterVersion />
          <h1 className="text-[clamp(40px,5vw,60px)] leading-none tracking-[-0.02em]">We&apos;ve updated our community charter.</h1>
          <p className="text-[17px] text-ink-muted">Please read it and accept it to keep using {APP_NAME}.</p>
        </header>
        <div className="rounded-[28px] bg-white p-[clamp(24px,4vw,48px)]"><CharterText /></div>
        <AcceptCharterButton />
        <details className="rounded-card border-[1.5px] border-line bg-white p-5">
          <summary className="min-h-[44px] cursor-pointer text-[15px] font-bold">I don&apos;t accept. What are my options?</summary>
          <p className="my-3 text-[15px] text-ink-muted">You can download your data, deactivate your account, or delete it.</p>
          <AccountSettings />
        </details>
      </main>
    </div>
  );
}
