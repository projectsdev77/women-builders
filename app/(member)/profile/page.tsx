import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { getMemberProfile } from '@/lib/services/profiles';
import { MemberProfile } from '@/components/profile/member-profile';
import { Notice } from '@/components/ui';
import { COMPLETENESS_THRESHOLD } from '@/lib/config';

export const metadata: Metadata = { title: 'My profile' };

export default async function MyProfilePage() {
  const user = await pageActiveMember();
  const me = await getMemberProfile(user.id, user.id);
  return (
    <div className="space-y-4">
      {me.completenessScore < COMPLETENESS_THRESHOLD && (
        <Notice tone="warning">
          Your profile is {me.completenessScore}% complete. Reach {COMPLETENESS_THRESHOLD}% to send connection requests.{' '}
          <Link href="/profile/edit" className="underline">Complete your profile</Link>
        </Notice>
      )}
      <MemberProfile
        member={me}
        actions={
          <Link href="/profile/edit" className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-forest px-5 text-[15px] font-bold text-cream shadow-press-sm hover:bg-[#2E5A40]">
            Edit profile
          </Link>
        }
      />
    </div>
  );
}
