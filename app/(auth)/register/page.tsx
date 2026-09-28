import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { ELIGIBILITY_STATEMENT } from '@/lib/config';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Apply to join' };

export default async function RegisterPage({ searchParams }: { searchParams: { invite?: string; email?: string } }) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  return (
    <RegisterForm
      invitationToken={searchParams.invite}
      defaultEmail={searchParams.email}
      eligibility={ELIGIBILITY_STATEMENT}
    />
  );
}
