'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { api } from '@/lib/client/api';

/** "Are you still investing?" prompt on Home, every 90 days (R3 F9). */
export function InvestingCheck() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function answer(investing: boolean) {
    setBusy(true);
    const res = await api('/api/me/investing-status', { body: { investing } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }
  return (
    <section aria-labelledby="investing" className="space-y-3 rounded-[24px] bg-butter-tint p-6">
      <h2 id="investing" className="text-[24px] leading-tight">Are you still investing?</h2>
      <p className="text-[15px] text-ink-muted">
        Founders in the Capital view see investors who confirmed recently first. If you&apos;ve paused, say so, and you can switch back any time.
      </p>
      {error && <p role="alert" className="text-[14px] font-medium text-danger">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => answer(true)}>Yes, still investing</Button>
        <Button variant="secondary" disabled={busy} onClick={() => answer(false)}>Paused for now</Button>
      </div>
    </section>
  );
}
