import type { Metadata } from 'next';
import { pageActiveMember } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Home' };

export default async function DashboardPage() {
  const user = await pageActiveMember();
  return <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(' ')[0]}</h1>;
}
