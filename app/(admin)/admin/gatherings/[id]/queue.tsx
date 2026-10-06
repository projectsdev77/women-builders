'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Badge, Button, Notice } from '@/components/ui';
import { api } from '@/lib/client/api';
import type { gatheringQueue } from '@/lib/services/admin/gatherings';

type Queue = Awaited<ReturnType<typeof gatheringQueue>>;
const ROLE = { FOUNDER: 'Founders', OPERATOR: 'Operators', INVESTOR: 'Investors', BUILDER: 'Builders' } as const;
const STATUS_TONE = { REQUESTED: 'yellow', CONFIRMED: 'green', WAITLISTED: 'yellow', DECLINED: 'gray', CANCELLED: 'gray' } as const;
const STATUS_TEXT = { REQUESTED: 'Requested', CONFIRMED: 'Confirmed', WAITLISTED: 'Waitlisted', DECLINED: 'Not this time', CANCELLED: 'Cancelled' } as const;

export function SeatQueue({ gatheringId, queue, noShowFlagAt }: { gatheringId: string; queue: Queue; noShowFlagAt: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = queue.seats.filter((s) => s.status === 'CONFIRMED').length;

  async function decide(seatIds: string[], decision: 'CONFIRMED' | 'WAITLISTED' | 'DECLINED') {
    setBusy(true);
    setError(null);
    const res = await api('/api/admin/seats/decide', { body: { seatIds, decision } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setSelected([]);
    router.refresh();
  }

  async function attendance(seatId: string, value: 'ATTENDED' | 'NO_SHOW' | null) {
    const res = await api(`/api/admin/gatherings/${gatheringId}/attendance`, { body: { entries: [{ seatId, attendance: value }] } });
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }

  const open = queue.seats.filter((s) => s.status === 'REQUESTED' || s.status === 'WAITLISTED');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <strong>{confirmed} / {queue.capacity} confirmed</strong>
        <span className="text-gray-700" aria-label="Confirmed seats by role">
          {(Object.keys(ROLE) as Array<keyof typeof ROLE>).map((r) => `${ROLE[r]} ${queue.mix[r]}`).join(' · ')}
        </span>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!queue.started && open.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => setSelected(selected.length === open.length ? [] : open.map((s) => s.id))}>
            {selected.length === open.length ? 'Clear selection' : 'Select all waiting'}
          </Button>
          <Button disabled={busy || !selected.length} onClick={() => decide(selected, 'CONFIRMED')}>Confirm selected ({selected.length})</Button>
        </div>
      )}
      <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {queue.seats.map((s) => (
          <li key={s.id} className="flex flex-wrap items-start gap-3 p-3">
            {!queue.started && (s.status === 'REQUESTED' || s.status === 'WAITLISTED') && (
              <input type="checkbox" aria-label={`Select ${s.member.name}`} className="mt-3" checked={selected.includes(s.id)}
                onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id))} />
            )}
            <Avatar name={s.member.name} size={40} photoUrl={s.member.photoUrl} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <a href={`/admin/members/${s.member.id}`} className="font-medium underline">{s.member.name}</a>
                <Badge tone={STATUS_TONE[s.status]}>{STATUS_TEXT[s.status]}</Badge>
                {s.member.primaryRole && <Badge>{ROLE[s.member.primaryRole].slice(0, -1)}</Badge>}
                {s.conflictsWith.length > 0 && <Badge tone="red">Blocked pair: {s.conflictsWith.join(', ')}</Badge>}
                {s.noShows >= noShowFlagAt && <Badge tone="red">{s.noShows} past no-shows</Badge>}
                {s.lateCancel && <Badge>Late cancellation</Badge>}
                {!s.member.active && <Badge>Inactive</Badge>}
              </div>
              <p className="text-xs text-gray-600">{[s.member.headline, [s.member.city, s.member.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
              {s.note && <p className="text-sm italic">“{s.note}”</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {!queue.started && s.status !== 'CANCELLED' && s.status !== 'CONFIRMED' && s.status !== 'DECLINED' && (
                <Button disabled={busy} onClick={() => decide([s.id], 'CONFIRMED')}>Confirm</Button>
              )}
              {!queue.started && (s.status === 'REQUESTED' || s.status === 'CONFIRMED') && (
                <Button variant="secondary" disabled={busy} onClick={() => decide([s.id], 'WAITLISTED')}>Waitlist</Button>
              )}
              {!queue.started && (s.status === 'REQUESTED' || s.status === 'WAITLISTED') && (
                <Button variant="ghost" disabled={busy} onClick={() => decide([s.id], 'DECLINED')}>Not this time</Button>
              )}
              {queue.started && s.status === 'CONFIRMED' && (
                <div role="group" aria-label={`Attendance for ${s.member.name}`} className="flex gap-1">
                  <Button variant={s.attendance === 'ATTENDED' ? 'primary' : 'secondary'} onClick={() => attendance(s.id, s.attendance === 'ATTENDED' ? null : 'ATTENDED')}>Attended</Button>
                  <Button variant={s.attendance === 'NO_SHOW' ? 'danger' : 'secondary'} onClick={() => attendance(s.id, s.attendance === 'NO_SHOW' ? null : 'NO_SHOW')}>No-show</Button>
                </div>
              )}
            </div>
          </li>
        ))}
        {queue.seats.length === 0 && <li className="p-4 text-sm text-gray-600">No requests yet.</li>}
      </ul>
    </div>
  );
}
