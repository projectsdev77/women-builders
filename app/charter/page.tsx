import type { Metadata } from 'next';
import { CharterText } from '@/components/charter/charter-text';
import { PublicFooter, PublicHeader } from '@/components/public/site-chrome';

export const metadata: Metadata = { title: 'Community charter' };

export default function CharterPage() {
  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <h1 className="text-3xl font-semibold">Community charter</h1>
        <CharterText />
      </main>
      <PublicFooter />
    </>
  );
}
