import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageActiveMember } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors';
import { getGathering, peopleYouMet, whosComing } from '@/lib/services/gatherings';
import { formatInZone } from '@/lib/time';
import { Avatar, Badge, Card, Notice } from '@/components/ui';
import { ROLE_LABEL, SEAT_LABEL, TYPE_LABEL } from '@/components/gatherings/labels';
import { MetConnect } from '@/components/gatherings/met-connect';
import { YourTime } from '@/components/gatherings/your-time';
import { SeatActions } from './seat-actions';

export const metadata: Metadata = { title: 'Gathering' };

function hours(min: number) {
  return min % 60 === 0 ? `${min / 60} hour${min === 60 ? '' : 's'}` : `${Math.floor(min / 60)}h ${min % 60}m`;
}

export default async function GatheringPage({ params }: { params: { id: string } }) {
  const user = await pageActiveMember();
  const g = await getGathering(user.id, params.id).catch((e) => {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  });
  const [coming, met] = await Promise.all([
    g.insider ? whosComing(user.id, g.id) : Promise.resolve(null),
    g.ended && g.insider ? peopleYouMet(user.id) : Promise.resolve([]),
  ]);
  const metHere = met.filter((p) => p.metAt.gatheringId === g.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/gatherings" className="text-sm text-brand-700 underline">← Gatherings</Link>
      {g.status === 'CANCELLED' && <Notice tone="error">This gathering was cancelled. {g.cancelReason}</Notice>}
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{TYPE_LABEL[g.type]}</Badge>
          {g.mySeat && <Badge tone={SEAT_LABEL[g.mySeat.status][1]}>{SEAT_LABEL[g.mySeat.status][0]}</Badge>}
          {g.isHost && <Badge tone="green">You&apos;re hosting</Badge>}
        </div>
        <h1>{g.title}</h1>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">When</dt>
            <dd className="text-sm">
              {formatInZone(g.startsAt, g.timeZone)} · {hours(g.durationMinutes)}
              {g.online && <YourTime startsAt={g.startsAt} timeZone={g.timeZone} />}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Where</dt>
            <dd className="text-sm">
              {g.venue ? <span className="whitespace-pre-line">{g.venue}</span> : g.location}
              {!g.insider && !g.online && <span className="block text-xs text-gray-500">The address is shared with confirmed guests.</span>}
              {!g.insider && g.online && <span className="block text-xs text-gray-500">The link is shared with confirmed guests.</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Seats</dt>
            <dd className="text-sm">
              {g.seatMode === 'OPEN' ? `${g.seatsLeft} of ${g.capacity} left${g.seatsLeft === 0 ? ' · waitlist open' : ''}` : `${g.capacity} seats, chosen by the team to make a good mix`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Hosts</dt>
            <dd className="text-sm">{g.hosts.map((h) => h.name).join(', ')}</dd>
          </div>
        </dl>
        <p className="whitespace-pre-line text-gray-800">{g.description}</p>
        {g.mySeat?.status === 'DECLINED' && <p className="text-sm text-gray-700">We couldn&apos;t fit you at this one. We&apos;d love to see you at the next.</p>}
        {!g.ended && g.status === 'SCHEDULED' && !g.canRequest && !g.mySeat && !g.isHost && <p className="text-sm text-gray-600">Requests for this gathering have closed.</p>}
        {!g.ended && g.status === 'SCHEDULED' && g.canRequest && (
          <p className="text-xs text-gray-500">Requests close {formatInZone(g.requestsCloseAt, g.timeZone)}.</p>
        )}
        <div className="flex flex-wrap items-start gap-3">
          <SeatActions id={g.id} mode={g.seatMode} canRequest={g.canRequest} canCancel={g.canCancel} startsAt={g.startsAt} seatStatus={g.mySeat?.status ?? null} />
          {g.ended && g.insider && g.status === 'SCHEDULED' && (
            <Link href={`/wins/new?gathering=${g.id}`} className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-4 text-sm">Share a win from this gathering</Link>
          )}
          {g.calendarUrl && !g.ended && (
            <a href={g.calendarUrl} className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-4 text-sm">Add to calendar</a>
          )}
        </div>
      </Card>

      {coming && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{g.ended ? 'Who came' : "Who's coming"}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {coming.hosts.map((h) => (
              <li key={`host-${h.id ?? 'team'}`} className="flex items-center gap-3">
                <Avatar name={h.name} size={40} photoUrl={h.photoUrl} />
                <div className="min-w-0">
                  {h.id ? <Link href={`/members/${h.id}`} className="font-medium hover:underline">{h.name}</Link> : <span className="font-medium">{h.name}</span>}
                  <span className="block text-xs text-gray-600">Host{h.headline ? ` · ${h.headline}` : ''}</span>
                </div>
              </li>
            ))}
            {coming.attendees.map((a) => (
              <li key={a.id} className="flex items-center gap-3">
                <Avatar name={a.name} size={40} photoUrl={a.photoUrl} />
                <div className="min-w-0">
                  {a.isMe ? <span className="font-medium">{a.name} (you)</span> : <Link href={`/members/${a.id}`} className="font-medium hover:underline">{a.name}</Link>}
                  <span className="block truncate text-xs text-gray-600">{[a.primaryRole && ROLE_LABEL[a.primaryRole], a.headline].filter(Boolean).join(' · ')}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {metHere.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">People you met</h2>
          <p className="text-sm text-gray-600">For 30 days you can connect directly with people from this gathering, even those who prefer introductions.</p>
          <ul className="space-y-2">
            {metHere.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar name={p.name} size={40} photoUrl={p.photoUrl} />
                <div className="min-w-0 flex-1">
                  <Link href={`/members/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  {p.headline && <span className="block truncate text-xs text-gray-600">{p.headline}</span>}
                </div>
                <MetConnect memberId={p.id} title={g.title} status={p.connectionStatus} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
