'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice, Textarea } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/client/api';

/**
 * Calls an admin API endpoint and refreshes the page. Optionally confirms first and
 * collects a note (sent as `noteField`).
 */
export function ActionButton({
  label,
  path,
  method = 'POST',
  body = {},
  variant = 'secondary',
  confirm,
  noteField,
  noteLabel = 'Note (optional, visible to admins only)',
  redirectTo,
}: {
  label: string;
  path: string;
  method?: string;
  body?: Record<string, unknown>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  confirm?: { title: string; description: string; confirmLabel?: string };
  noteField?: string;
  noteLabel?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await api(path, { method, body: noteField && note ? { ...body, [noteField]: note } : body });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      <Button variant={variant} disabled={busy} onClick={() => (confirm ? setOpen(true) : run())}>
        {label}
      </Button>
      {error && !open && <span role="alert" className="text-sm text-red-700">{error}</span>}
      {confirm && (
        <Dialog open={open} onClose={() => setOpen(false)} title={confirm.title}>
          <p className="text-sm text-gray-700">{confirm.description}</p>
          {error && <Notice tone="error">{error}</Notice>}
          {noteField && (
            <div>
              <label htmlFor={`note-${path}`} className="block text-sm font-medium">{noteLabel}</label>
              <Textarea id={`note-${path}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant={variant === 'danger' ? 'danger' : 'primary'} disabled={busy} onClick={run}>
              {confirm.confirmLabel ?? label}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
