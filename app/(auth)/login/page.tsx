import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { homeFor } from '@/lib/auth/guards';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: { reset?: string } }) {
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  return <LoginForm passwordReset={searchParams.reset === '1'} />;
}
