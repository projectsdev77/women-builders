import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { getRecommendations } from '@/lib/services/discovery';
import { listConversations } from '@/lib/services/messaging';
import { canSendConnectionRequests, missingRequiredFields, FIELD_LABELS } from '@/lib/services/profile-fields';
import { COMPLETENESS_THRESHOLD } from '@/lib/config';
import { MemberCard } from '@/components/member/member-card';
import { Avatar, Card, EmptyState, Notice } from '@/components/ui';

export const metadata: Metadata = { title: 'Home' };

export default async function DashboardPage() {
  const user = await pageActiveMember();
  const [profile, incoming, recs, conversations] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }),
    prisma.connectionRequest.count({ where: { receiverId: user.id, status: 'PENDING', expiresAt: { gt: new Date() } } }),
    getRecommendations(user.id),
    listConversations(user.id),
  ]);
  const unread = conversations.filter((c) => c.unreadCount > 0);
  const ready = canSendConnectionRequests(profile);
  const required = missingRequiredFields(profile);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(' ')[0]}</h1>
      {!ready && (
        <Notice tone="warning">
          Your profile is {profile.completenessScore}% complete
          {required.length > 0 && <> (still needed: {required.map((f) => FIELD_LABELS[f]).join(', ')})</>}. Reach {COMPLETENESS_THRESHOLD}% to start sending connection requests.{' '}
          <Link href="/profile/edit" className="underline">Finish your profile</Link>
        </Notice>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/connections/requests"><Card className="h-full hover:bg-gray-50"><p className="text-sm text-gray-600">Connection requests</p><p className="text-3xl font-semibold">{incoming}</p></Card></Link>
        <Link href="/messages"><Card className="h-full hover:bg-gray-50"><p className="text-sm text-gray-600">Unread conversations</p><p className="text-3xl font-semibold">{unread.length}</p></Card></Link>
        <Link href="/profile"><Card className="h-full hover:bg-gray-50"><p className="text-sm text-gray-600">Profile completeness</p><p className="text-3xl font-semibold">{profile.completenessScore}%</p></Card></Link>
      </div>
      {unread.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">New messages</h2>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {unread.slice(0, 3).map((c) => (
              <li key={c.member.id}>
                <Link href={`/messages/${c.member.id}`} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                  <Avatar name={c.member.name} size={36} />
                  <span className="min-w-0 flex-1"><span className="block font-medium">{c.member.name}</span><span className="block truncate text-sm text-gray-600">{c.lastMessage?.content}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <Link href="/recommendations" className="text-sm underline">See all</Link>
        </div>
        {recs.recommendations.length === 0 ? (
          <EmptyState title="No recommendations yet">Tell us <Link className="underline" href="/profile/edit">what you need and offer</Link> to get matched.</EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recs.recommendations.slice(0, 3).map((r) => (
              <li key={r.member.id}><MemberCard member={r.member}>{r.explanation}</MemberCard></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
