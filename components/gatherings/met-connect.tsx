'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/client/api';

/** One-tap Connect for "People you met", pre-filled with "We met at <title>" (R3 F14). */
export function MetConnect({ memberId, title, status }: { memberId: string; title: string; status: string }) {
  const [state, setState] = useState<string | null>(status === 'connected' ? 'Connected' : status === 'pending_sent' ? 'Request sent' : null);
  const [busy, setBusy] = useState(false);
  if (state) return <span className="text-[14px] font-semibold text-ink-subtle">{state}</span>;
  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await api<{ status: string }>('/api/connections/requests', { body: { receiverId: memberId, message: `We met at ${title}.` } });
        setBusy(false);
        setState(res.ok ? (res.data.status === 'connected' ? 'Connected' : 'Request sent') : res.error.message);
      }}
    >
      Connect
    </Button>
  );
}
