import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { getRecommendations } from '@/lib/services/discovery';
import { MemberCard } from '@/components/member/member-card';
import { EmptyState, Notice } from '@/components/ui';
import { DismissButton } from './dismiss-button';

export const metadata: Metadata = { title: 'Recommended for you' };

export default async function RecommendationsPage() {
  const user = await pageActiveMember();
  const { recommendations, fewerThanMinimum } = await getRecommendations(user.id);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Recommended for you</h1>
        <p className="text-gray-600">Members matched to your roles, needs, offerings and expertise.</p>
      </div>
      {recommendations.length === 0 ? (
        <EmptyState title="No recommendations right now">
          Add more detail to <Link className="underline" href="/profile/edit">what you need and offer</Link>, or{' '}
          <Link className="underline" href="/search">search the directory</Link>.
        </EmptyState>
      ) : (
        <>
          {fewerThanMinimum && (
            <Notice tone="info">
              We only found a few strong matches. A more detailed profile helps us find more.{' '}
              <Link className="underline" href="/profile/edit">Update your profile</Link>
            </Notice>
          )}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((r) => (
              <li key={r.member.id}>
                <MemberCard
                  member={r.member}
                  footer={
                    <>
                      <Link href={`/members/${r.member.id}`} className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md bg-brand-600 px-3 text-sm font-medium text-white">
                        View profile
                      </Link>
                      <DismissButton memberId={r.member.id} name={r.member.name} />
                    </>
                  }
                >
                  <ul className="space-y-1">
                    {r.reasons.slice(0, 3).map((reason) => (
                      <li key={reason.type}>• {reason.description}</li>
                    ))}
                  </ul>
                </MemberCard>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
