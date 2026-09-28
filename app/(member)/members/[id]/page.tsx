import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { pageActiveMember } from '@/lib/auth/guards';
import { getMemberProfile } from '@/lib/services/profiles';
import { AppError } from '@/lib/errors';
import { MemberProfile } from '@/components/profile/member-profile';
import { MemberActions } from '@/components/member/member-actions';
import { prisma } from '@/lib/db';
import { canSendConnectionRequests } from '@/lib/services/profile-fields';

export const metadata: Metadata = { title: 'Member' };

export default async function MemberPage({ params }: { params: { id: string } }) {
  const user = await pageActiveMember();
  if (params.id === user.id) redirect('/profile');
  const member = await getMemberProfile(user.id, params.id).catch((e) => {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  });
  const own = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });
  return (
    <MemberProfile
      member={member}
      actions={
        <MemberActions
          memberId={member.id}
          memberName={member.name}
          status={member.connectionStatus === 'self' ? 'none' : member.connectionStatus}
          canRequest={canSendConnectionRequests(own)}
        />
      }
    />
  );
}
