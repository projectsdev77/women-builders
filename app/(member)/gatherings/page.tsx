import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { gatheringListSchema, listGatherings, peopleYouMet } from '@/lib/services/gatherings';
import { formatInZone } from '@/lib/time';
import { Avatar, Button, EmptyState, Input, PageHeader, Select, SegmentedTabs } from '@/components/ui';
import { FilterChip } from '@/components/ui/choice';
import { DateStamp, SeatPill, TypePill, stripes } from '@/components/gatherings/cover';
import { MetConnect } from '@/components/gatherings/met-connect';

export const metadata: Metadata = { title: 'Gatherings' };

export default async function GatheringsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const user = await pageActiveMember();
  const parsed = gatheringListSchema.safeParse(searchParams);
  const q = parsed.success ? parsed.data : gatheringListSchema.parse({});
  const [items, met] = await Promise.all([listGatherings(user.id, q), q.view === 'upcoming' ? peopleYouMet(user.id) : Promise.resolve([])]);
  const toConnect = met.filter((p) => p.connectionStatus !== 'connected');

  return (
    <div className="space-y-7">
      <PageHeader title="Gatherings" lede="Small dinners and working sessions, in person and online. Seats are limited so everyone gets to talk." />
      <SegmentedTabs
        label="Gatherings"
        tabs={[
          { href: '/gatherings?view=upcoming', label: 'Upcoming', active: q.view === 'upcoming' },
          { href: '/gatherings?view=mine', label: 'My gatherings', active: q.view === 'mine' },
        ]}
      />

      {toConnect.length > 0 && (
        <section aria-labelledby="met" className="space-y-4 rounded-[28px] bg-operator p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="met" className="text-[28px]">People you met</h2>
            <p className="text-[14px] font-semibold">At {toConnect[0]!.metAt.title} · connect for 30 days</p>
          </div>
          <ul className="space-y-2.5">
            {toConnect.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-3.5 rounded-[18px] bg-white p-3.5">
                <Avatar name={p.name} size={44} photoUrl={p.photoUrl} role={p.primaryRole} />
                <div className="min-w-0 flex-1">
                  <Link href={`/members/${p.id}`} className="font-bold hover:underline">{p.name}</Link>
                  {p.headline && <p className="truncate text-[14px] text-ink-subtle">{p.headline}</p>}
                </div>
                <MetConnect memberId={p.id} title={p.metAt.title} status={p.connectionStatus} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {q.view === 'upcoming' && (
        <form method="get" action="/gatherings" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="upcoming" />
          <div>
            <label htmlFor="type" className="mb-1.5 block text-[14px] font-bold">Type</label>
            <Select id="type" name="type" defaultValue={q.type ?? ''} className="!min-h-[44px] rounded-full">
              <option value="">Any</option>
              <option value="DINNER">Dinners</option>
              <option value="WORKING_SESSION">Working sessions</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <div>
            <label htmlFor="city" className="mb-1.5 block text-[14px] font-bold">City</label>
            <Input id="city" name="city" defaultValue={q.city} placeholder="e.g. Lagos" className="!min-h-[44px] rounded-full" />
          </div>
          <FilterChip name="online" value="1" defaultChecked={!!q.online}>Online only</FilterChip>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState title={q.view === 'mine' ? "You haven't joined a gathering yet" : 'No upcoming gatherings match'}>
          {q.view === 'mine' ? <Link href="/gatherings" className="underline">See upcoming gatherings</Link> : 'New gatherings are announced by email when they are near you.'}
        </EmptyState>
      ) : (
        <ul className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
          {items.map((g) => (
            <li key={g.id}>
              <Link href={`/gatherings/${g.id}`} className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white transition-shadow hover:shadow-lift">
                <div className="relative h-[132px] p-4" style={{ background: stripes(g.type) }}>
                  <div className="flex flex-wrap gap-1.5">
                    <TypePill type={g.type} />
                    {g.status === 'CANCELLED' && <span className="rounded-full bg-danger-bg px-3 py-1 text-[12.5px] font-bold text-danger">Cancelled</span>}
                    {g.past && <span className="rounded-full bg-cream px-3 py-1 text-[12.5px] font-bold">Past</span>}
                    {g.mySeat && <SeatPill status={g.mySeat} />}
                  </div>
                  <span className="absolute -bottom-6 right-5"><DateStamp startsAt={g.startsAt} timeZone={g.timeZone} size={72} /></span>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-5 pt-6">
                  <h2 className="text-[24px] leading-tight">{g.title}</h2>
                  <p className="text-[15px]">{formatInZone(g.startsAt, g.timeZone)}</p>
                  <p className="text-[15px] text-ink-muted">{g.location}</p>
                  {!g.past && g.status === 'SCHEDULED' && (
                    <p className={`text-[14px] font-semibold ${g.seatMode === 'OPEN' && g.seatsLeft === 0 ? 'text-warning' : 'text-ink-muted'}`}>
                      {g.seatMode === 'OPEN' ? (g.seatsLeft > 0 ? `${g.seatsLeft} of ${g.capacity} seats left` : 'Full · waitlist open') : `${g.capacity} seats · request a seat`}
                    </p>
                  )}
                  <p className="mt-auto pt-2 text-[13px] text-ink-subtle">Hosted by {g.hosts.map((h) => h.name).join(', ')}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
