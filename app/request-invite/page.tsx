import type { Metadata } from 'next';
import { getSiteSettings } from '@/lib/services/site-settings';
import { PublicFooter, PublicHeader } from '@/components/public/site-chrome';
import { RequestPanel } from '@/components/public/request-panel';

export const metadata: Metadata = { title: 'Request an invitation' };
export const dynamic = 'force-dynamic';

export default async function RequestInvitePage() {
  const settings = await getSiteSettings();
  const waitlist = settings.applicationsOpen ? null : { nextReview: settings.nextReview };
  return (
    <>
      <PublicHeader waitlist={!!waitlist} />
      <main id="main" className="mx-auto max-w-[1240px] px-[clamp(20px,4vw,48px)] py-[clamp(32px,5vw,64px)]">
        <RequestPanel waitlist={waitlist} />
      </main>
      <PublicFooter />
    </>
  );
}
