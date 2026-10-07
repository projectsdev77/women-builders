'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/client/api';

/** "Not now": hides her for 30 days, with a toast and an Undo. */
export function DismissButton({ memberId, name }: { memberId: string; name: string }) {
  const router = useRouter();
  const toast = useToast();
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
        if (!res.ok) return;
        toast({
          message: `${name.split(' ')[0]} is hidden for 30 days.`,
          undo: async () => {
            await api(`/api/recommendations/${memberId}/dismiss`, { method: 'DELETE' });
            router.refresh();
          },
        });
        router.refresh();
      }}
    >
      Not now
    </Button>
  );
}
