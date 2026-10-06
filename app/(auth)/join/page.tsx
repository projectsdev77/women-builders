import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { previewInvitation } from '@/lib/services/accounts';
import { Card } from '@/components/ui';
import { JoinForm } from './join-form';

export const metadata: Metadata = { title: 'Join Women Builders' };

export default async function JoinPage({ searchParams }: { searchParams: { invite?: string } }) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  const token = searchParams.invite ?? '';
  const preview = token ? await previewInvitation(token) : null;

  if (!token) {
    return (
      <Card className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">Women Builders is invitation-only</h1>
        <p className="text-gray-700">To join, ask for an invitation. Our team reads every request, and you&apos;ll hear back within three weeks.</p>
        <Link href="/request-invite" className="inline-flex min-h-[44px] items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white">
          Request an invitation
        </Link>
      </Card>
    );
  }
  if (!preview) {
    return (
      <Card className="space-y-4 p-6">
        <h1 className="text-2xl font-semibold">This invitation has expired</h1>
        <p className="text-gray-700">
          Invitation links work once and expire after 14 days. If you still want to join, ask for a new one and we&apos;ll match it to your earlier request.
        </p>
        <Link href="/request-invite" className="inline-flex min-h-[44px] items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white">
          Request a new invitation
        </Link>
      </Card>
    );
  }
  return <JoinForm token={token} preview={preview} />;
}
