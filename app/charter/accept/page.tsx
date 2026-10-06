import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { APP_NAME } from '@/lib/config';
import { CHARTER_VERSION } from '@/content/charter';
import { Card } from '@/components/ui';
import { CharterText } from '@/components/charter/charter-text';
import { AccountSettings } from '@/app/(member)/settings/account-settings';
import { AcceptCharterButton } from './accept-button';

export const metadata: Metadata = { title: 'Updated community charter' };

/** Interstitial shown when the charter changed since the member last accepted it (R3 F2). */
export default async function AcceptCharterPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  if (user.accountStatus !== 'ACTIVE' || (user.charterVersion ?? 0) >= CHARTER_VERSION) redirect(homeFor(user));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xl font-bold text-brand-700">{APP_NAME}</p>
      <main id="main" className="mt-8 space-y-6">
        <h1 className="text-3xl font-semibold">We&apos;ve updated our community charter</h1>
        <p className="text-gray-700">Please read it and accept it to keep using {APP_NAME}.</p>
        <Card className="p-6"><CharterText /></Card>
        <AcceptCharterButton />
        <details className="rounded-md border border-gray-200 p-4">
          <summary className="cursor-pointer text-sm font-medium">I don&apos;t accept. What are my options?</summary>
          <p className="my-3 text-sm text-gray-700">You can download your data, deactivate your account, or delete it.</p>
          <AccountSettings />
        </details>
      </main>
    </div>
  );
}
