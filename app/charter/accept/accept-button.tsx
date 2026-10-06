'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/client/api';

export function AcceptCharterButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {error && <Notice tone="error">{error}</Notice>}
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await api('/api/me/charter', { method: 'POST' });
          setBusy(false);
          if (!res.ok) return setError(res.error.message);
          router.replace('/dashboard');
          router.refresh();
        }}
      >
        I accept the charter
      </Button>
    </div>
  );
}
