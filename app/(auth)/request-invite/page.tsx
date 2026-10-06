import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { ELIGIBILITY_STATEMENT } from '@/lib/config';
import { RequestInviteForm } from '@/components/public/request-invite-form';

export const metadata: Metadata = { title: 'Request an invitation' };

export default function RequestInvitePage() {
  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Request an invitation</h1>
      <p className="text-sm text-gray-600">{ELIGIBILITY_STATEMENT} Membership is by invitation. Our team reads every request.</p>
      <RequestInviteForm />
      <p className="text-sm">
        Already a member? <Link href="/login" className="text-brand-700 underline">Log in</Link>
      </p>
    </Card>
  );
}
