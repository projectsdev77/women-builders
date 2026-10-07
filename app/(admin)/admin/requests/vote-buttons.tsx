'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, Textarea } from '@/components/ui';
import { api } from '@/lib/client/api';

/** Approve / Decline vote with a private note; can be changed until the request is decided. */
export function VoteButtons({ requestId, myVote }: { requestId: string; myVote: { choice: 'APPROVE' | 'DECLINE'; note: string | null } | null }) {
  const router = useRouter();
  const [note, setNote] = useState(myVote?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function vote(choice: 'APPROVE' | 'DECLINE') {
    setBusy(true);
    setMsg(null);
    const res = await api<{ outcome: 'recorded' | 'invited' | 'declined' }>(`/api/admin/requests/${requestId}/vote`, { body: { choice, note: note || undefined } });
    setBusy(false);
    if (!res.ok) return setMsg({ tone: 'error', text: res.error.message });
    setMsg({
      tone: 'success',
      text: res.data.outcome === 'invited' ? 'Enough approvals: the invitation was sent.' : res.data.outcome === 'declined' ? 'Enough declines: the decline email was sent.' : 'Vote saved. You can change it until the request is decided.',
    });
    router.refresh();
  }

  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3">
      <label htmlFor={`vote-note-${requestId}`} className="block text-sm font-medium">Your vote {myVote && <span className="font-normal text-gray-600">(currently {myVote.choice === 'APPROVE' ? 'Approve' : 'Decline'})</span>}</label>
      <Textarea id={`vote-note-${requestId}`} rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private note (optional, visible to admins)" />
      <div className="flex flex-wrap gap-2">
        <Button variant={myVote?.choice === 'APPROVE' ? 'primary' : 'secondary'} disabled={busy} onClick={() => vote('APPROVE')}>Approve</Button>
        <Button variant={myVote?.choice === 'DECLINE' ? 'danger' : 'secondary'} disabled={busy} onClick={() => vote('DECLINE')}>Decline</Button>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
