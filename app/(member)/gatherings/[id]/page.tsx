import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageActiveMember } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors';
import { getGathering, peopleYouMet, whosComing } from '@/lib/services/gatherings';
import { formatInZone } from '@/lib/time';
import { Avatar, Notice, buttonClass } from '@/components/ui';
import { DateStamp, SeatPill, TypePill, stripes } from '@/components/gatherings/cover';
import { ROLE_LABEL } from '@/components/gatherings/labels';
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
    <div className="mx-auto max-w-[900px] space-y-5">
      <Link href="/gatherings" className="inline-flex min-h-[44px] items-center text-[15px] font-bold underline-offset-4 hover:underline">← Gatherings</Link>
      {g.status === 'CANCELLED' && <Notice tone="error">This gathering was cancelled. {g.cancelReason}</Notice>}
      <article className="overflow-hidden rounded-[32px] bg-white">
        <header className="relative flex min-h-[200px] flex-col justify-end gap-3 p-[clamp(20px,3vw,32px)]" style={{ background: stripes(g.type) }}>
          <span className="absolute right-6 top-6"><DateStamp startsAt={g.startsAt} timeZone={g.timeZone} size={96} /></span>
          <div className="flex flex-wrap gap-1.5">
            <TypePill type={g.type} />
            {g.mySeat && <SeatPill status={g.mySeat.status} />}
            {g.isHost && <span className="rounded-full bg-success-bg px-3 py-1 text-[12.5px] font-bold text-success">You&apos;re hosting</span>}
          </div>
          <h1 className="max-w-[80%] !text-[clamp(36px,5vw,60px)]">{g.title}</h1>
        </header>
        <div className="space-y-6 p-[clamp(20px,3vw,32px)]">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {[
              ['When', <>{formatInZone(g.startsAt, g.timeZone)} · {hours(g.durationMinutes)}{g.online && <YourTime startsAt={g.startsAt} timeZone={g.timeZone} />}</>],
              [
                'Where',
                <>
                  {g.venue ? <span className="whitespace-pre-line">{g.venue}</span> : g.location}
                  {!g.insider && <span className="mt-0.5 block text-[13px] font-normal text-ink-subtle">{g.online ? 'The link' : 'The address'} is shared with confirmed guests.</span>}
                </>,
              ],
              ['Seats', g.seatMode === 'OPEN' ? `${g.seatsLeft} of ${g.capacity} left${g.seatsLeft === 0 ? ' · waitlist open' : ''}` : `${g.capacity} seats, chosen by the team to make a good mix`],
              ['Hosts', g.hosts.map((h) => h.name).join(', ')],
            ].map(([label, value]) => (
              <div key={label as string} className="border-t-[1.5px] border-forest pt-2.5">
                <dt className="font-mono text-[11px] uppercase tracking-[.1em] text-ink-subtle">{label as string}</dt>
                <dd className="mt-1 text-[16px] font-semibold leading-snug">{value as React.ReactNode}</dd>
              </div>
            ))}
          </dl>
          <p className="whitespace-pre-line text-[17px] leading-relaxed">{g.description}</p>
          {g.mySeat?.status === 'DECLINED' && <p className="rounded-2xl bg-cream p-4 text-[15px]">We couldn&apos;t fit you at this one. We&apos;d love to see you at the next.</p>}
          {!g.ended && g.status === 'SCHEDULED' && !g.canRequest && !g.mySeat && !g.isHost && <p className="text-[15px] text-ink-subtle">Requests for this gathering have closed.</p>}
          {!g.ended && g.status === 'SCHEDULED' && g.canRequest && <p className="font-mono text-[12px] text-ink-subtle">Requests close {formatInZone(g.requestsCloseAt, g.timeZone)}.</p>}
          <div className="flex flex-wrap items-start gap-3">
            <SeatActions id={g.id} mode={g.seatMode} canRequest={g.canRequest} canCancel={g.canCancel} startsAt={g.startsAt} seatStatus={g.mySeat?.status ?? null} />
            {g.ended && g.insider && g.status === 'SCHEDULED' && (
              <Link href={`/wins/new?gathering=${g.id}`} className={buttonClass('secondary')}>Share a win from this gathering</Link>
            )}
            {g.calendarUrl && !g.ended && <a href={g.calendarUrl} className={buttonClass('secondary')}>Add to calendar</a>}
          </div>
        </div>
      </article>

      {coming && (
        <section aria-labelledby="coming" className="space-y-4 rounded-[28px] bg-white p-[clamp(20px,3vw,32px)]">
          <h2 id="coming" className="text-[28px]">{g.ended ? 'Who came' : "Who's coming"}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {coming.hosts.map((h) => (
              <li key={`host-${h.id ?? 'team'}`} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                <Avatar name={h.name} size={44} photoUrl={h.photoUrl} />
                <div className="min-w-0">
                  {h.id ? <Link href={`/members/${h.id}`} className="font-bold hover:underline">{h.name}</Link> : <span className="font-bold">{h.name}</span>}
                  <span className="block text-[13px] text-ink-subtle">Host{h.headline ? ` · ${h.headline}` : ''}</span>
                </div>
              </li>
            ))}
            {coming.attendees.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                <Avatar name={a.name} size={44} photoUrl={a.photoUrl} role={a.primaryRole} />
                <div className="min-w-0">
                  {a.isMe ? <span className="font-bold">{a.name} (you)</span> : <Link href={`/members/${a.id}`} className="font-bold hover:underline">{a.name}</Link>}
                  <span className="block truncate text-[13px] text-ink-subtle">{[a.primaryRole && ROLE_LABEL[a.primaryRole], a.headline].filter(Boolean).join(' · ')}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-ink-subtle">What&apos;s shared at a gathering stays there, as our charter says.</p>
        </section>
      )}

      {metHere.length > 0 && (
        <section aria-labelledby="met" className="space-y-4 rounded-[28px] bg-operator p-[clamp(20px,3vw,32px)]">
          <h2 id="met" className="text-[28px]">People you met</h2>
          <p className="text-[15px]">For 30 days you can connect directly with people from this gathering, even those who prefer introductions.</p>
          <ul className="space-y-2.5">
            {metHere.map((p) => (
              <li key={p.id} className="flex items-center gap-3.5 rounded-[18px] bg-white p-3.5">
                <Avatar name={p.name} size={44} photoUrl={p.photoUrl} role={p.primaryRole} />
                <div className="min-w-0 flex-1">
                  <Link href={`/members/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
                  {p.headline && <span className="block truncate text-[13px] text-ink-subtle">{p.headline}</span>}
                </div>
                <MetConnect memberId={p.id} title={g.title} status={p.connectionStatus} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
