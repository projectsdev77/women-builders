import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { pageUser, homeFor } from '@/lib/auth/guards';
import { Card, Notice } from '@/components/ui';
import { PendingActions } from './pending-actions';

export const metadata: Metadata = { title: 'Application status' };

export default async function PendingPage() {
  const user = await pageUser();
  if (user.accountStatus === 'ACTIVE') redirect(homeFor(user));
  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Your application is under review</h1>
      <p className="text-gray-700">
        Thanks for applying, {user.name}. Our team reviews every application personally. We&apos;ll
        email you at <strong>{user.email}</strong> as soon as there&apos;s a decision.
      </p>
      {!user.emailVerifiedAt ? (
        <Notice tone="warning">
          Please confirm your email address. We can only review your application once it&apos;s confirmed.
        </Notice>
      ) : (
        <Notice tone="success">Email confirmed. Your application is in the review queue.</Notice>
      )}
      <PendingActions needsVerification={!user.emailVerifiedAt} />
    </Card>
  );
}
