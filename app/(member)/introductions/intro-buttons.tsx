'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, Textarea } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/client/api';
import { ReportDialog } from '@/components/member/report-dialog';

export function IntroButtons({
  id,
  role,
  requesterName,
  targetName,
  reportMember,
}: {
  id: string;
  role: 'introducer' | 'target' | 'requester';
  requesterName: string;
  targetName: string;
  reportMember?: { id: string; name: string } | null;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | 'introduce' | 'report'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function call(path: string, method = 'POST', body: unknown = {}, message?: string) {
    setBusy(true);
    setError(null);
    const res = await api(path, { method, body });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setDialog(null);
    if (message) setDone(message);
    router.refresh();
  }

  if (done) return <Notice tone="success">{done}</Notice>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && !dialog && <Notice tone="error">{error}</Notice>}
      {role === 'introducer' && (
        <>
          <Button disabled={busy} onClick={() => setDialog('introduce')}>Introduce</Button>
          <Button variant="secondary" disabled={busy} onClick={() => call(`/api/introductions/${id}/pass`, 'POST', {}, "Done. Nobody is told you passed.")}>
            Not this time
          </Button>
        </>
      )}
      {role === 'target' && (
        <>
          <Button disabled={busy} onClick={() => call(`/api/introductions/${id}/accept`, 'POST', {}, `You're now connected with ${requesterName}.`)}>
            Accept
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => call(`/api/introductions/${id}/decline`, 'POST', {}, 'Done. Nobody is told.')}>
            Not now
          </Button>
        </>
      )}
      {role === 'requester' && (
        <Button variant="ghost" disabled={busy} onClick={() => call(`/api/introductions/${id}`, 'DELETE', {}, 'Request withdrawn.')}>
          Withdraw request
        </Button>
      )}
      {reportMember && (
        <button type="button" className="min-h-[44px] px-2 text-[14px] font-semibold text-ink-subtle underline underline-offset-4" onClick={() => setDialog('report')}>Report</button>
      )}

      <Dialog open={dialog === 'introduce'} onClose={() => setDialog(null)} title={`Introduce ${requesterName} to ${targetName}`}>
        {error && <Notice tone="error">{error}</Notice>}
        <p className="text-[15px] text-ink-muted">
          {targetName.split(' ')[0]} will see your note and {requesterName.split(' ')[0]}&apos;s note, and decides within 14 days.
        </p>
        <label htmlFor={`note-${id}`} className="block text-[15px] font-semibold">Your note to {targetName.split(' ')[0]} (optional)</label>
        <Textarea id={`note-${id}`} rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you think they should meet" />
        <p className="text-right font-mono text-[12px] text-ink-subtle">{note.length}/500</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
          <Button disabled={busy} onClick={() => call(`/api/introductions/${id}/introduce`, 'POST', { note: note || undefined }, `Introduced. ${targetName.split(' ')[0]} has 14 days to respond.`)}>
            Send introduction
          </Button>
        </div>
      </Dialog>
      {reportMember && (
        <ReportDialog open={dialog === 'report'} onClose={() => setDialog(null)} memberId={reportMember.id} memberName={reportMember.name} />
      )}
    </div>
  );
}
