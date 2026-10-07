import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { getRecommendations } from '@/lib/services/discovery';
import { MemberCard } from '@/components/member/member-card';
import { EmptyState, Notice, PageHeader, buttonClass } from '@/components/ui';
import { DismissButton } from './dismiss-button';

export const metadata: Metadata = { title: 'For you' };

export default async function RecommendationsPage() {
  const user = await pageActiveMember();
  const { recommendations, fewerThanMinimum } = await getRecommendations(user.id);
  return (
    <div className="space-y-7">
      <PageHeader title="For you" lede="Members matched to your roles, needs, offerings and expertise." />
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
              <Link className="font-bold underline" href="/profile/edit">Update your profile</Link>
            </Notice>
          )}
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {recommendations.map((r) => (
              <li key={r.member.id}>
                <MemberCard
                  member={r.member}
                  reasons={r.reasons}
                  reasonLimit={3}
                  footer={
                    <>
                      <Link href={`/members/${r.member.id}`} className={buttonClass('primary', 'md', 'flex-1')}>View profile</Link>
                      <DismissButton memberId={r.member.id} name={r.member.name} />
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
