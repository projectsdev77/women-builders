import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { pageActiveMember } from '@/lib/auth/guards';
import { getMemberProfile } from '@/lib/services/profiles';
import { AppError } from '@/lib/errors';
import { MemberProfile } from '@/components/profile/member-profile';
import { MemberActions } from '@/components/member/member-actions';
import { prisma } from '@/lib/db';
import { canSendConnectionRequests } from '@/lib/services/profile-fields';
import { pendingRequestBetween } from '@/lib/services/connections';
import { introductionOptions } from '@/lib/services/introductions';
import { memberWins } from '@/lib/services/wins';
import { WinCard } from '@/components/wins/win-card';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Member' };

export default async function MemberPage({ params }: { params: { id: string } }) {
  const user = await pageActiveMember();
  if (params.id === user.id) redirect('/profile');
  const member = await getMemberProfile(user.id, params.id).catch((e) => {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  });
  const [own, pending, intro, wins] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }),
    pendingRequestBetween(user.id, member.id),
    introductionOptions(user.id, member.id),
    memberWins(user.id, member.id),
  ]);
  return (
    <div className="space-y-6">
    <MemberProfile
      member={member}
      actions={
        <MemberActions
          memberId={member.id}
          memberName={member.name}
          status={member.connectionStatus === 'self' ? 'none' : member.connectionStatus}
          canRequest={canSendConnectionRequests(own)}
          requestId={pending?.id}
          requestMessage={pending?.message}
          intro={intro}
        />
      }
    />
      {(wins.length > 0 || member.connectionStatus === 'connected') && (
        <section aria-labelledby="wins" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="wins" className="text-lg font-semibold">Wins</h2>
            {member.connectionStatus === 'connected' && (
              <Link href={`/wins/new?with=${member.id}`} className="text-sm font-medium text-brand-700 underline">Share a win with {member.name.split(' ')[0]}</Link>
            )}
          </div>
          {wins.length === 0 ? <p className="text-sm text-gray-600">No shared wins yet.</p> : (
            <ul className="grid gap-3 md:grid-cols-2">{wins.map((w) => <li key={w.id}><WinCard win={w} /></li>)}</ul>
          )}
        </section>
      )}
    </div>
  );
}
