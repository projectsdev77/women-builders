'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, Textarea } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/client/api';

export function SeatActions({
  id,
  mode,
  canRequest,
  canCancel,
  startsAt,
  seatStatus,
}: {
  id: string;
  mode: 'CURATED' | 'OPEN';
  canRequest: boolean;
  canCancel: boolean;
  startsAt: string;
  seatStatus: string | null;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | 'request' | 'cancel'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const late = new Date(startsAt).getTime() - Date.now() < 24 * 3_600_000;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api<{ status: string }>(`/api/gatherings/${id}/seat`, { body: { note: note || undefined } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setDialog(null);
    setFlash(
      res.data.status === 'CONFIRMED' ? "You're in. We've emailed you the details." : res.data.status === 'WAITLISTED' ? "It's full, so you're on the waitlist. We'll email you if a seat opens." : "Request sent. We'll email you when the team has decided.",
    );
    router.refresh();
  }

  async function cancel() {
    setBusy(true);
    const res = await api(`/api/gatherings/${id}/seat`, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setDialog(null);
    setFlash('Your seat is cancelled.');
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {flash && <Notice tone="success">{flash}</Notice>}
      {error && !dialog && <Notice tone="error">{error}</Notice>}
      {canRequest && <Button onClick={() => setDialog('request')}>{mode === 'OPEN' ? 'Take a seat' : 'Request a seat'}</Button>}
      {canCancel && (
        <Button variant="ghost" onClick={() => setDialog('cancel')}>
          {seatStatus === 'CONFIRMED' ? 'Cancel my seat' : 'Withdraw my request'}
        </Button>
      )}

      <Dialog open={dialog === 'request'} onClose={() => setDialog(null)} title={mode === 'OPEN' ? 'Take a seat' : 'Request a seat'}>
        {error && <Notice tone="error">{error}</Notice>}
        <label htmlFor="seat-note" className="block text-sm font-medium">What would you bring, or want from it? (optional)</label>
        <Textarea id="seat-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-right text-xs text-gray-500">{note.length}/300</p>
        <p className="text-xs text-gray-600">What&apos;s shared at a gathering stays there, as our charter says.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
          <Button disabled={busy} onClick={submit}>{mode === 'OPEN' ? 'Take my seat' : 'Send request'}</Button>
        </div>
      </Dialog>

      <Dialog open={dialog === 'cancel'} onClose={() => setDialog(null)} title={seatStatus === 'CONFIRMED' ? 'Cancel your seat?' : 'Withdraw your request?'}>
        {seatStatus === 'CONFIRMED' && late && (
          <Notice tone="warning">It starts in less than 24 hours, so this is recorded as a late cancellation.</Notice>
        )}
        <p className="text-sm text-gray-700">Someone on the waitlist may get your seat.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>Keep it</Button>
          <Button variant="danger" disabled={busy} onClick={cancel}>Yes, cancel</Button>
        </div>
      </Dialog>
    </div>
  );
}
