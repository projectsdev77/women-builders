'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { api } from '@/lib/client/api';

export function ConfirmWin({ id, authorName }: { id: string; authorName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go(action: 'confirm' | 'decline') {
    setBusy(true);
    const res = await api(`/api/wins/${id}/${action}`, { body: {} });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }
  return (
    <div className="space-y-3">
      <p className="text-[15px]"><strong>{authorName.split(' ')[0]} named you.</strong> Is this right?</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={busy} onClick={() => go('confirm')}>Yes, confirm</Button>
        <Button variant="secondary" disabled={busy} onClick={() => go('decline')}>That&apos;s not right</Button>
      </div>
      {error && <p role="alert" className="text-[14px] text-danger">{error}</p>}
    </div>
  );
}

export function DeleteWin({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant="ghost" size="sm" disabled={busy} onClick={async () => {
      if (!window.confirm('Delete this win? It will no longer count anywhere.')) return;
      setBusy(true);
      const res = await api(`/api/wins/${id}`, { method: 'DELETE' });
      setBusy(false);
      if (res.ok) router.refresh();
    }}>Delete</Button>
  );
}
