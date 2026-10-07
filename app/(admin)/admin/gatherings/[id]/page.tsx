import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageAdmin } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors';
import { gatheringQueue, getGatheringForEdit, NO_SHOW_FLAG_AT } from '@/lib/services/admin/gatherings';
import { countryOptions } from '@/lib/countries';
import { formatInZone } from '@/lib/time';
import { Badge, Card, Notice } from '@/components/ui';
import { ActionButton } from '@/components/admin/action-button';
import { GatheringForm } from '@/components/admin/gathering-form';
import { SeatQueue } from './queue';
import { MessageAttendees } from './message-form';

export const metadata: Metadata = { title: 'Gathering' };

export default async function AdminGatheringPage({ params }: { params: { id: string } }) {
  await pageAdmin();
  const g = await getGatheringForEdit(params.id).catch((e) => {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  });
  const queue = await gatheringQueue(params.id);
  const upcoming = new Date(g.startsAt) > new Date();
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/admin/gatherings" className="text-sm underline">← Gatherings</Link>
        <h1>{g.values.title}</h1>
        <p className="text-sm text-gray-700">{formatInZone(g.startsAt, g.values.timeZone)} · <Link className="underline" href={`/gatherings/${g.id}`}>Member view</Link></p>
        {g.status === 'CANCELLED' && <Notice tone="error">Cancelled: {g.cancelReason}</Notice>}
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">Requests and seats {queue.seatMode === 'OPEN' && <Badge>Open mode: seats are taken automatically</Badge>}</h2>
        <SeatQueue gatheringId={g.id} queue={queue} noShowFlagAt={NO_SHOW_FLAG_AT} />
        {queue.started && <p className="text-xs text-gray-600">Mark attendance after the gathering. Members with {NO_SHOW_FLAG_AT} or more no-shows are flagged in future queues.</p>}
      </Card>

      {g.status === 'SCHEDULED' && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Message confirmed guests</h2>
          <MessageAttendees gatheringId={g.id} />
        </Card>
      )}

      {g.status === 'SCHEDULED' && upcoming && (
        <details className="rounded-lg border border-gray-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">Edit details</summary>
          <div className="mt-4">
            <GatheringForm gatheringId={g.id} initial={g.values} timeZones={Intl.supportedValuesOf('timeZone')} countries={countryOptions()} />
          </div>
        </details>
      )}

      {g.status === 'SCHEDULED' && upcoming && (
        <div>
          <ActionButton label="Cancel this gathering" variant="danger" path={`/api/admin/gatherings/${g.id}/cancel`} noteField="reason" noteLabel="Reason (sent to everyone with a request)"
            confirm={{ title: 'Cancel this gathering?', description: 'Everyone who requested or holds a seat gets an email with your reason. This cannot be undone.', confirmLabel: 'Cancel gathering' }} />
        </div>
      )}
    </div>
  );
}
