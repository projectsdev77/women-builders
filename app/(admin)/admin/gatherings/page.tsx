import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { listAdminGatherings } from '@/lib/services/admin/gatherings';
import { formatInZone } from '@/lib/time';
import { Badge, EmptyState } from '@/components/ui';
import { TYPE_LABEL } from '@/components/gatherings/labels';

export const metadata: Metadata = { title: 'Gatherings' };

export default async function AdminGatheringsPage({ searchParams }: { searchParams: { view?: string } }) {
  await pageAdmin();
  const view = searchParams.view === 'past' ? 'past' : 'upcoming';
  const rows = await listAdminGatherings(view);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Gatherings</h1>
        <Link href="/admin/gatherings/new" className="inline-flex min-h-[44px] items-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white">New gathering</Link>
      </div>
      <nav aria-label="View" className="flex gap-3 text-sm">
        {(['upcoming', 'past'] as const).map((v) => (
          <Link key={v} href={`/admin/gatherings?view=${v}`} aria-current={v === view ? 'page' : undefined} className={v === view ? 'font-semibold underline' : 'underline'}>
            {v === 'upcoming' ? 'Upcoming' : 'Past'}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <EmptyState title={view === 'upcoming' ? 'No upcoming gatherings' : 'No past gatherings'} /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="p-3">Gathering</th><th className="p-3">When</th><th className="p-3">Where</th><th className="p-3">Seats</th><th className="p-3">Requests</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((g) => (
                <tr key={g.id}>
                  <td className="p-3">
                    <Link className="font-medium underline" href={`/admin/gatherings/${g.id}`}>{g.title}</Link>
                    <div className="mt-1 flex gap-1"><Badge>{TYPE_LABEL[g.type]}</Badge><Badge>{g.seatMode === 'OPEN' ? 'Open' : 'Curated'}</Badge>{g.status === 'CANCELLED' && <Badge tone="red">Cancelled</Badge>}</div>
                  </td>
                  <td className="p-3">{formatInZone(g.startsAt, g.timeZone)}</td>
                  <td className="p-3">{g.location}</td>
                  <td className="p-3">{g.confirmed} / {g.capacity}</td>
                  <td className="p-3">{g.pending > 0 ? <Badge tone="yellow">{g.pending} to review</Badge> : '—'}{g.waitlisted > 0 && <span className="ml-1 text-xs text-gray-600">{g.waitlisted} waitlisted</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
