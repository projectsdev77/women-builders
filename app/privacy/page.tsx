import type { Metadata } from 'next';
import { PublicFooter, PublicHeader } from '@/components/public/site-chrome';
import { CONTACT_EMAIL } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy policy' };

/** PLACEHOLDER: the client or their lawyer must supply this text before launch (R3 F1). */
export default function Page() {
  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto max-w-2xl space-y-4 px-4 py-12">
        <h1 className="text-3xl font-semibold">Privacy policy</h1>
        <p role="note" className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
          Placeholder. The final text is being prepared and will be published before launch.
        </p>
        <p className="text-gray-700">Questions in the meantime: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </main>
      <PublicFooter />
    </>
  );
}
