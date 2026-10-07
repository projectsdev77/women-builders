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
import { Avatar, EmptyState, Kicker, buttonClass } from '@/components/ui';
import { DateTile } from '@/components/gatherings/date-tile';

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

  const first = user.name.split(' ')[0];
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  // One profile prompt at a time: the gate first, then country, photo, then the rest.
  const prompt = !ready
    ? {
        title: `Your profile is ${profile.completenessScore}% complete`,
        body: `${required.length > 0 ? `Still needed: ${required.map((f) => FIELD_LABELS[f]).join(', ')}. ` : ''}Reach ${COMPLETENESS_THRESHOLD}% to start sending connection requests.`,
        cta: 'Finish your profile',
      }
    : !profile.country
      ? { title: 'Add your country', body: 'So people near you can find you, and you hear about gatherings nearby.', cta: 'Add it now' }
      : !profile.photoKey
        ? { title: `Your profile is ${profile.completenessScore}% complete`, body: 'Add a photo so people recognise you at gatherings.', cta: 'Add a photo' }
        : profile.completenessScore < 100
          ? { title: `Your profile is ${profile.completenessScore}% complete`, body: 'A fuller profile gets you better matches.', cta: 'Finish your profile' }
          : null;
  const showInvesting = needsInvestingCheck(profile);
  const TODO_DOTS = ['#F4B8C8', '#D9CCF5', '#C9D9A8', '#F2D774'];

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <Kicker>{today}</Kicker>
        <h1>Welcome back, {first}.</h1>
      </header>

      {(prompt || showInvesting || todo.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {(prompt || showInvesting) && (
            <div className="space-y-4">
              {prompt && (
                <section aria-labelledby="prompt" className="relative flex items-center gap-5 overflow-hidden rounded-[28px] bg-founder p-6 pr-[18%]">
                  <div aria-hidden className="absolute inset-y-0 right-0 w-[16%]" style={{ background: 'repeating-linear-gradient(90deg, #FBE3EA 0 10px, transparent 10px 20px)' }} />
                  {!profile.photoKey && (
                    <span aria-hidden className="hidden h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-forest/70 text-[28px] sm:flex">+</span>
                  )}
                  <div className="relative space-y-1.5">
                    <h2 id="prompt" className="font-sans text-[18px] font-bold">{prompt.title}</h2>
                    <p className="text-[15px] text-ink-muted">{prompt.body}</p>
                    <Link href="/profile/edit" className="inline-block min-h-[44px] content-center text-[15px] font-bold underline underline-offset-4">{prompt.cta}</Link>
                  </div>
                </section>
              )}
              {showInvesting && <InvestingCheck />}
            </div>
          )}
          {todo.length > 0 && (
            <section aria-labelledby="todo" className="rounded-[28px] bg-white p-6">
              <Kicker><span id="todo">To do</span></Kicker>
              <ul className="mt-3">
                {todo.map((t, i) => (
                  <li key={t.href}>
                    <Link href={t.href} className="flex min-h-[48px] items-center gap-3 text-[16px] font-semibold hover:underline">
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TODO_DOTS[i % 4] }} />
                      <span className="flex-1">{t.text}</span>
                      <span aria-hidden>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Connection requests', incoming, '/connections/requests'],
          ['Unread conversations', unread.length, '/messages'],
          ['Profile completeness', `${profile.completenessScore}%`, '/profile'],
        ].map(([label, value, href]) => (
          <Link key={label as string} href={href as string} className="rounded-[24px] bg-white p-5 transition-shadow hover:shadow-lift">
            <p className="text-[14px] text-ink-subtle">{label}</p>
            <p className="font-display text-[48px] leading-none">{value}</p>
          </Link>
        ))}
      </div>

      {unread.length > 0 && (
        <section aria-labelledby="new-messages" className="space-y-3">
          <h2 id="new-messages" className="text-[28px]">New messages</h2>
          <ul className="divide-y divide-line-soft overflow-hidden rounded-[24px] bg-white">
            {unread.slice(0, 3).map((c) => (
              <li key={c.member.id}>
                <Link href={`/messages/${c.member.id}`} className="flex items-center gap-3 p-4 hover:bg-cream">
                  <Avatar name={c.member.name} size={44} photoUrl={c.member.photoUrl} ghost={c.member.deleted} />
                  <span className="min-w-0 flex-1"><span className="block font-bold">{c.member.name}</span><span className="block truncate text-[14px] text-ink-muted">{c.lastMessage?.content}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(myNext.length > 0 || nearby.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {([['Your next gatherings', myNext], ['Gatherings near you', nearby]] as const).map(([title, list]) =>
            list.length > 0 ? (
              <section key={title} aria-label={title} className="space-y-3">
                <h2 className="text-[28px]">{title}</h2>
                <ul className="space-y-2.5">
                  {list.map((g) => (
                    <li key={g.id}>
                      <Link href={`/gatherings/${g.id}`} className="flex items-center gap-4 rounded-[20px] bg-white p-4 transition-shadow hover:shadow-lift">
                        <DateTile startsAt={g.startsAt} timeZone={g.timeZone} type={g.type} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold text-ink-subtle">{g.location}</span>
                          <span className="block font-display text-[20px] leading-tight">{g.title}</span>
                          <span className="block text-[13px] text-ink-subtle">{formatInZone(g.startsAt, g.timeZone)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}

      <section aria-labelledby="wins" className="space-y-4 rounded-[32px] bg-builder-tint p-[clamp(20px,3vw,32px)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="wins" className="text-[28px]">Recent wins</h2>
          <div className="flex gap-3">
            <Link href="/wins" className={buttonClass('ghost', 'sm')}>Your wins</Link>
            <Link href="/wins/new" className={buttonClass('primary', 'sm')}>Share a win</Link>
          </div>
        </div>
        {wins.length === 0 ? (
          <p className="text-[15px] text-ink-muted">When something comes of an introduction or a gathering, share it here.</p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-3">{wins.map((w, i) => <li key={w.id} style={{ transform: `rotate(${['-1deg', '0.8deg', '-0.5deg'][i % 3]})` }}><WinCard win={w} /></li>)}</ul>
        )}
      </section>

      <section aria-labelledby="recs" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="recs" className="text-[28px]">Recommended for you</h2>
          <Link href="/recommendations" className="text-[15px] font-bold underline underline-offset-4">See all</Link>
        </div>
        {recs.recommendations.length === 0 ? (
          <EmptyState title="No recommendations yet">Tell us <Link className="underline" href="/profile/edit">what you need and offer</Link> to get matched.</EmptyState>
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {recs.recommendations.slice(0, 3).map((r) => (
              <li key={r.member.id}>
                <MemberCard
                  member={r.member}
                  reasons={r.reasons}
                  footer={<Link href={`/members/${r.member.id}`} className={buttonClass('primary', 'md', 'flex-1')}>View profile</Link>}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
