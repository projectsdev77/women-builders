import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { ELIGIBILITY_STATEMENT } from '@/lib/config';
import { RequestInviteForm } from '@/components/public/request-invite-form';
import { getSiteSettings } from '@/lib/services/site-settings';

export const metadata: Metadata = { title: 'Request an invitation' };

export const dynamic = 'force-dynamic';

export default async function RequestInvitePage() {
  const settings = await getSiteSettings();
  const waitlist = settings.applicationsOpen ? null : { nextReview: settings.nextReview };
  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{waitlist ? 'Join the waitlist' : 'Request an invitation'}</h1>
      {waitlist && (
        <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-900">
          We review requests in rounds and are not reviewing right now.{waitlist.nextReview ? ` ${waitlist.nextReview}.` : ''} Join the waitlist and we&apos;ll answer every request after the next review.
        </p>
      )}
      <p className="text-sm text-gray-600">{ELIGIBILITY_STATEMENT} Membership is by invitation. Our team reads every request.</p>
      <RequestInviteForm waitlist={waitlist} />
      <p className="text-sm">
        Already a member? <Link href="/login" className="text-brand-700 underline">Log in</Link>
      </p>
    </Card>
  );
}
