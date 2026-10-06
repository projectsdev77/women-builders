import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME } from '@/lib/config';
import { CharterText } from '@/components/charter/charter-text';

export const metadata: Metadata = { title: 'Community charter' };

export default function CharterPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="text-xl font-bold text-brand-700">{APP_NAME}</Link>
      <main id="main" className="mt-8 space-y-6">
        <h1 className="text-3xl font-semibold">Community charter</h1>
        <CharterText />
      </main>
    </div>
  );
}
