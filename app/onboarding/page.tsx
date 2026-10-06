import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { pageActiveMember } from '@/lib/auth/guards';
import { getOwnProfile } from '@/lib/services/profiles';
import { toEditable } from '@/components/profile/to-editable';
import { APP_NAME } from '@/lib/config';
import { OnboardingWizard } from './wizard';
import { prisma } from '@/lib/db';

export const metadata: Metadata = { title: 'Set up your profile' };

export default async function OnboardingPage() {
  const user = await pageActiveMember({ allowOnboarding: true });
  if (user.profile.onboardingCompletedAt) redirect('/dashboard');
  const [profile, introSettings] = await Promise.all([
    getOwnProfile(user.id),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { allowIntroRequests: true, preferIntroductions: true } }),
  ]);
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-2 font-bold text-brand-700">{APP_NAME}</p>
      <OnboardingWizard initial={toEditable(profile.user.name, profile)} introSettings={introSettings} />
    </main>
  );
}
