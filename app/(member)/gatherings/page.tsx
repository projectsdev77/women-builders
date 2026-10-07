import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { gatheringListSchema, listGatherings, peopleYouMet } from '@/lib/services/gatherings';
import { formatInZone } from '@/lib/time';
import { Avatar, Badge, Button, Card, EmptyState, Input, Select } from '@/components/ui';
import { SEAT_LABEL, TYPE_LABEL } from '@/components/gatherings/labels';
import { MetConnect } from '@/components/gatherings/met-connect';

export const metadata: Metadata = { title: 'Gatherings' };

export default async function GatheringsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const user = await pageActiveMember();
  const parsed = gatheringListSchema.safeParse(searchParams);
  const q = parsed.success ? parsed.data : gatheringListSchema.parse({});
  const [items, met] = await Promise.all([listGatherings(user.id, q), q.view === 'upcoming' ? peopleYouMet(user.id) : Promise.resolve([])]);
  const toConnect = met.filter((p) => p.connectionStatus !== 'connected');

  return (
    <div className="space-y-4">
      <div>
        <h1>Gatherings</h1>
        <p className="text-sm text-gray-600">Small dinners and working sessions, in person and online. Seats are limited so everyone gets to talk.</p>
      </div>
      <nav aria-label="Gatherings" className="flex gap-4 border-b border-gray-200">
        {(['upcoming', 'mine'] as const).map((v) => (
          <Link key={v} href={`/gatherings?view=${v}`} aria-current={q.view === v ? 'page' : undefined}
            className={q.view === v ? 'border-b-2 border-brand-600 pb-2 font-semibold' : 'pb-2 text-gray-600'}>
            {v === 'upcoming' ? 'Upcoming' : 'My gatherings'}
          </Link>
        ))}
      </nav>

      {toConnect.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">People you met</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {toConnect.slice(0, 6).map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Avatar name={p.name} size={40} photoUrl={p.photoUrl} />
                <div className="min-w-0 flex-1">
                  <Link href={`/members/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                  <p className="truncate text-xs text-gray-600">At {p.metAt.title}</p>
                </div>
                <MetConnect memberId={p.id} title={p.metAt.title} status={p.connectionStatus} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {q.view === 'upcoming' && (
        <form method="get" action="/gatherings" className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <input type="hidden" name="view" value="upcoming" />
          <div>
            <label htmlFor="type" className="block text-sm font-medium">Type</label>
            <Select id="type" name="type" defaultValue={q.type ?? ''}>
              <option value="">Any</option>
              <option value="DINNER">Dinners</option>
              <option value="WORKING_SESSION">Working sessions</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium">City</label>
            <Input id="city" name="city" defaultValue={q.city} placeholder="e.g. Lagos" />
          </div>
          <label className="flex min-h-[44px] items-center gap-2 text-sm">
            <input type="checkbox" name="online" value="1" defaultChecked={!!q.online} /> Online only
          </label>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState title={q.view === 'mine' ? "You haven't joined a gathering yet" : 'No upcoming gatherings match'}>
          {q.view === 'mine' ? <Link href="/gatherings" className="underline">See upcoming gatherings</Link> : 'New gatherings are announced by email when they are near you.'}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((g) => (
            <li key={g.id}>
              <Link href={`/gatherings/${g.id}`} className="block h-full">
                <Card className="h-full space-y-2 hover:bg-gray-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{TYPE_LABEL[g.type]}</Badge>
                    {g.status === 'CANCELLED' && <Badge tone="red">Cancelled</Badge>}
                    {g.mySeat && <Badge tone={SEAT_LABEL[g.mySeat][1]}>{SEAT_LABEL[g.mySeat][0]}</Badge>}
                    {g.past && <Badge>Past</Badge>}
                  </div>
                  <h2 className="text-lg font-semibold">{g.title}</h2>
                  <p className="text-sm text-gray-700">{formatInZone(g.startsAt, g.timeZone)}</p>
                  <p className="text-sm text-gray-700">{g.location}</p>
                  {!g.past && g.status === 'SCHEDULED' && (
                    <p className="text-xs text-gray-600">
                      {g.seatMode === 'OPEN' ? (g.seatsLeft > 0 ? `${g.seatsLeft} of ${g.capacity} seats left` : 'Full · waitlist open') : `${g.capacity} seats · request a seat`}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Hosted by {g.hosts.map((h) => h.name).join(', ')}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
