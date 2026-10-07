import type { Metadata } from 'next';
import { CharterText, CharterVersion } from '@/components/charter/charter-text';
import { PublicFooter, PublicHeader } from '@/components/public/site-chrome';

export const metadata: Metadata = { title: 'Community charter' };

export default function CharterPage() {
  return (
    <>
      <PublicHeader />
      <main id="main" className="mx-auto max-w-[760px] space-y-8 px-[clamp(20px,4vw,48px)] py-[clamp(40px,6vw,80px)]">
        <header className="space-y-4">
          <CharterVersion />
          <h1 className="text-[clamp(44px,6vw,72px)] leading-none tracking-[-0.02em]">Community charter.</h1>
        </header>
        <div className="rounded-[28px] bg-white p-[clamp(24px,4vw,48px)]"><CharterText /></div>
      </main>
      <PublicFooter />
    </>
  );
}
