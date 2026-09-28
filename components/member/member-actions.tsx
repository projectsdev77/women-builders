'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, Textarea } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/client/api';
import { ReportDialog } from './report-dialog';

type Status = 'none' | 'pending_sent' | 'pending_received' | 'connected';

export function MemberActions({
  memberId,
  memberName,
  status,
  canRequest,
  requestId,
  requestMessage,
}: {
  memberId: string;
  memberName: string;
  status: Status;
  canRequest: boolean;
  requestId?: string | null;
  requestMessage?: string | null;
}) {
  const router = useRouter();
  const first = memberName.split(' ')[0];
  const [dialog, setDialog] = useState<null | 'connect' | 'block' | 'report' | 'remove'>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function call(path: string, method = 'POST', body: unknown = {}) {
    setBusy(true);
    setError(null);
    const res = await api<{ status?: string }>(path, { method, body });
    setBusy(false);
    if (!res.ok) {
      setError(res.error.message);
      return null;
    }
    return res.data;
  }

  async function sendRequest() {
    const data = await call('/api/connections/requests', 'POST', { receiverId: memberId, message: note || undefined });
    if (!data) return;
    setDialog(null);
    setFlash(data.status === 'connected' ? `You're now connected with ${first}.` : 'Connection request sent.');
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-64">
      {flash && <Notice tone="success">{flash}</Notice>}
      {error && !dialog && <Notice tone="error">{error}</Notice>}

      {status === 'none' &&
        (canRequest ? (
          <Button onClick={() => setDialog('connect')}>Connect</Button>
        ) : (
          <>
            <Button disabled aria-describedby="connect-help">Connect</Button>
            <p id="connect-help" className="text-xs text-gray-600">
              <Link href="/profile/edit" className="underline">Complete your profile</Link> to send connection requests.
            </p>
          </>
        ))}

      {status === 'pending_sent' && (
        <>
          <Button disabled variant="secondary">Request pending</Button>
          {requestId && (
            <Button variant="ghost" disabled={busy} onClick={async () => { if (await call(`/api/connections/requests/${requestId}`, 'DELETE')) router.refresh(); }}>
              Withdraw request
            </Button>
          )}
        </>
      )}

      {status === 'pending_received' && requestId && (
        <>
          {requestMessage && <blockquote className="rounded-md bg-gray-50 p-3 text-sm italic text-gray-700">“{requestMessage}”</blockquote>}
          <Button disabled={busy} onClick={async () => { if (await call(`/api/connections/requests/${requestId}/accept`)) router.refresh(); }}>
            Accept
          </Button>
          <Button variant="secondary" disabled={busy} onClick={async () => { if (await call(`/api/connections/requests/${requestId}/decline`)) router.refresh(); }}>
            Decline
          </Button>
          <p className="text-xs text-gray-500">{first} won&apos;t be notified if you decline.</p>
        </>
      )}

      {status === 'connected' && (
        <>
          <Link href={`/messages/${memberId}`} className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-brand-600 px-4 text-sm font-medium text-white">
            Message
          </Link>
          <Button variant="ghost" onClick={() => setDialog('remove')}>Remove connection</Button>
        </>
      )}

      <details className="text-sm">
        <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-gray-600">More options</summary>
        <div className="mt-1 flex flex-col gap-1">
          <Button variant="ghost" className="justify-start" onClick={() => setDialog('report')}>Report {first}</Button>
          <Button variant="ghost" className="justify-start text-red-700" onClick={() => setDialog('block')}>Block {first}</Button>
        </div>
      </details>

      <Dialog open={dialog === 'connect'} onClose={() => setDialog(null)} title={`Connect with ${first}`}>
        {error && <Notice tone="error">{error}</Notice>}
        <label htmlFor="note" className="block text-sm font-medium">Add a note (optional)</label>
        <Textarea id="note" rows={4} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Say why you'd like to connect with ${first}…`} />
        <p className="text-right text-xs text-gray-500" aria-live="polite">{note.length}/500</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
          <Button disabled={busy} onClick={sendRequest}>Send request</Button>
        </div>
      </Dialog>

      <Dialog open={dialog === 'remove'} onClose={() => setDialog(null)} title={`Remove ${first} from your connections?`}>
        <p className="text-sm text-gray-700">You won&apos;t be able to message each other. Your conversation history stays visible to both of you. {first} won&apos;t be notified.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={async () => { if (await call(`/api/connections/${memberId}`, 'DELETE')) { setDialog(null); router.refresh(); } }}>
            Remove
          </Button>
        </div>
      </Dialog>

      <Dialog open={dialog === 'block'} onClose={() => setDialog(null)} title={`Block ${first}?`}>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>You won&apos;t see each other in search, recommendations or profiles.</li>
          <li>Any connection is removed and pending requests are cancelled.</li>
          <li>{first} can&apos;t message you, and won&apos;t be told you blocked them.</li>
        </ul>
        <p className="text-sm text-gray-600">You can unblock people in Settings.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="danger" disabled={busy} onClick={async () => { if (await call(`/api/members/${memberId}/block`)) { router.replace('/dashboard'); router.refresh(); } }}>
            Block
          </Button>
        </div>
      </Dialog>

      <ReportDialog open={dialog === 'report'} onClose={() => setDialog(null)} memberId={memberId} memberName={memberName} />
    </div>
  );
}
