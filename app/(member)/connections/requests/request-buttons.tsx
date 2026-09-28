'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/client/api';

export function RequestButtons({ kind, requestId }: { kind: 'incoming' | 'outgoing'; requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go(path: string, method = 'POST') {
    setBusy(true);
    const res = await api(path, { method, body: {} });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }
  if (error) return <p role="alert" className="text-sm text-red-700">{error}</p>;
  if (kind === 'outgoing') {
    return <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => go(`/api/connections/requests/${requestId}`, 'DELETE')}>Withdraw</Button>;
  }
  return (
    <>
      <Button className="flex-1" disabled={busy} onClick={() => go(`/api/connections/requests/${requestId}/accept`)}>Accept</Button>
      <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => go(`/api/connections/requests/${requestId}/decline`)}>Decline</Button>
    </>
  );
}
