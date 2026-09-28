'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/client/api';

export function DismissButton({ memberId, name }: { memberId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      aria-label={`Not now: hide ${name} for 30 days`}
      onClick={async () => {
        setBusy(true);
        const res = await api(`/api/recommendations/${memberId}/dismiss`, { body: {} });
        setBusy(false);
        if (res.ok) router.refresh();
      }}
    >
      Not now
    </Button>
  );
}
