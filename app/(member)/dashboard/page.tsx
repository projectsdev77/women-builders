import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { getRecommendations } from '@/lib/services/discovery';
import { listConversations } from '@/lib/services/messaging';
import { canSendConnectionRequests, missingRequiredFields, FIELD_LABELS } from '@/lib/services/profile-fields';
import { COMPLETENESS_THRESHOLD } from '@/lib/config';
import { MemberCard } from '@/components/member/member-card';
import { InvestingCheck } from '@/components/member/investing-check';
import { needsInvestingCheck } from '@/lib/services/investing';
import { introductionsAwaiting } from '@/lib/services/introductions';
import { listGatherings } from '@/lib/services/gatherings';
import { formatInZone } from '@/lib/time';
import { pendingWinConfirmations, recentWins } from '@/lib/services/wins';
import { WinCard } from '@/components/wins/win-card';
import { Avatar, Card, EmptyState, Notice } from '@/components/ui';

export const metadata: Metadata = { title: 'Home' };

export default async function DashboardPage() {
  const user = await pageActiveMember();
  const [profile, incoming, recs, conversations, introsWaiting, upcoming, mine, seatUpdates, winsToConfirm, wins] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { userId: user.id } }),
    prisma.connectionRequest.count({ where: { receiverId: user.id, status: 'PENDING', expiresAt: { gt: new Date() } } }),
    getRecommendations(user.id),
    listConversations(user.id),
    introductionsAwaiting(user.id),
    listGatherings(user.id, { view: 'upcoming', city: '' }),
    listGatherings(user.id, { view: 'mine', city: '' }),
    // Seat decisions in the last 14 days (R3 F18 "seat updates").
    prisma.seatRequest.count({
      where: { userId: user.id, status: { in: ['CONFIRMED', 'WAITLISTED', 'DECLINED'] }, decidedAt: { gt: new Date(Date.now() - 14 * 86_400_000) }, gathering: { startsAt: { gt: new Date() } } },
    }),
    pendingWinConfirmations(user.id),
    recentWins(user.id, 3),
  ]);
  const myNext = mine.filter((g) => !g.past && g.status === 'SCHEDULED' && (g.mySeat === 'CONFIRMED' || g.hosts.some((h) => h.id === user.id))).slice(0, 3);
  const nearby = upcoming.filter((g) => !g.mySeat && g.rank < 2 && !myNext.some((m) => m.id === g.id)).slice(0, 3);
  const todo = [
    incoming > 0 && { href: '/connections/requests', text: `${incoming} connection ${incoming === 1 ? 'request' : 'requests'} waiting` },
    introsWaiting > 0 && { href: '/introductions', text: `${introsWaiting} ${introsWaiting === 1 ? 'introduction needs' : 'introductions need'} your answer` },
    winsToConfirm > 0 && { href: '/wins', text: `${winsToConfirm} ${winsToConfirm === 1 ? 'win names' : 'wins name'} you: confirm ${winsToConfirm === 1 ? 'it' : 'them'}` },
    seatUpdates > 0 && { href: '/gatherings?view=mine', text: `${seatUpdates} gathering seat ${seatUpdates === 1 ? 'update' : 'updates'}` },
  ].filter(Boolean) as Array<{ href: string; text: string }>;
  const unread = conversations.filter((c) => c.unreadCount > 0);
  const ready = canSendConnectionRequests(profile);
  const required = missingRequiredFields(profile);

  return (
    <div className="space-y-6">
      <h1>Welcome back, {user.name.split(' ')[0]}</h1>
      {!ready && (
        <Notice tone="warning">
          Your profile is {profile.completenessScore}% complete
          {required.length > 0 && <> (still needed: {required.map((f) => FIELD_LABELS[f]).join(', ')})</>}. Reach {COMPLETENESS_THRESHOLD}% to start sending connection requests.{' '}
          <Link href="/profile/edit" className="underline">Finish your profile</Link>
        </Notice>
      )}
      {!profile.country && (
        <Notice tone="warning">
          Add your country so people near you can find you and you hear about gatherings nearby. <Link href="/profile/edit" className="underline">Add it now</Link>
        </Notice>
      )}
      {needsInvestingCheck(profile) && <InvestingCheck />}
      {todo.length > 0 && (
        <section aria-labelledby="todo" className="space-y-2">
          <h2 id="todo" className="text-lg font-semibold">To do</h2>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {todo.map((t) => (
              <li key={t.href}><Link href={t.href} className="flex min-h-[44px] items-center justify-between p-3 hover:bg-gray-50">{t.text}<span aria-hidden>→</span></Link></li>
            ))}
          </ul>
        </section>
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
                  <Avatar name={c.member.name} size={36} photoUrl={c.member.photoUrl} ghost={c.member.deleted} />
                  <span className="min-w-0 flex-1"><span className="block font-medium">{c.member.name}</span><span className="block truncate text-sm text-gray-600">{c.lastMessage?.content}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(myNext.length > 0 || nearby.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[['Your next gatherings', myNext], ['Gatherings near you', nearby]].map(([title, list]) =>
            (list as typeof myNext).length > 0 ? (
              <section key={title as string} className="space-y-2">
                <h2 className="text-lg font-semibold">{title as string}</h2>
                <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
                  {(list as typeof myNext).map((g) => (
                    <li key={g.id}>
                      <Link href={`/gatherings/${g.id}`} className="block p-3 hover:bg-gray-50">
                        <span className="block font-medium">{g.title}</span>
                        <span className="block text-sm text-gray-600">{formatInZone(g.startsAt, g.timeZone)} · {g.location}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
      <section aria-labelledby="wins" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="wins" className="text-lg font-semibold">Recent wins</h2>
          <div className="flex gap-3 text-sm">
            <Link href="/wins" className="underline">Your wins</Link>
            <Link href="/wins/new" className="font-medium text-brand-700 underline">Share a win</Link>
          </div>
        </div>
        {wins.length === 0 ? (
          <p className="text-sm text-gray-600">When something comes of an introduction or a gathering, share it here.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-3">{wins.map((w) => <li key={w.id}><WinCard win={w} /></li>)}</ul>
        )}
      </section>
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
