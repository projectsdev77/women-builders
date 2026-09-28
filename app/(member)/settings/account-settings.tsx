'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/client/api';

export function AccountSettings() {
  const router = useRouter();
  const [dialog, setDialog] = useState<null | 'deactivate' | 'delete'>(null);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setDialog(null);
    setPassword('');
    setConfirmText('');
    setError(null);
  }

  async function run(kind: 'deactivate' | 'delete') {
    setBusy(true);
    setError(null);
    const res = kind === 'deactivate'
      ? await api('/api/me/deactivate', { body: { password } })
      : await api('/api/me', { method: 'DELETE', body: { password } });
    setBusy(false);
    if (!res.ok) return setError(res.error.fieldErrors.password?.[0] ?? res.error.message);
    router.replace(kind === 'delete' ? '/?deleted=1' : '/?deactivated=1');
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Download your data</p>
          <p className="text-xs text-gray-500">A JSON file with your profile, connections, requests and messages.</p>
        </div>
        <a href="/api/me/export" className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium">Download</a>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Deactivate account</p>
          <p className="text-xs text-gray-500">Hide your profile and pause everything. Log in again any time to reactivate.</p>
        </div>
        <Button variant="secondary" onClick={() => setDialog('deactivate')}>Deactivate</Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-red-700">Delete account</p>
          <p className="text-xs text-gray-500">Permanently delete your account, profile, connections and conversations.</p>
        </div>
        <Button variant="danger" onClick={() => setDialog('delete')}>Delete</Button>
      </div>

      <Dialog open={dialog === 'deactivate'} onClose={close} title="Deactivate your account?">
        <p className="text-sm text-gray-700">Members won&apos;t be able to find, message or connect with you. Your data is kept, and you can reactivate by logging in.</p>
        {error && <Notice tone="error">{error}</Notice>}
        <Field id="deact-pw" label="Confirm your password"><Input id="deact-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button disabled={!password || busy} onClick={() => run('deactivate')}>Deactivate</Button>
        </div>
      </Dialog>

      <Dialog open={dialog === 'delete'} onClose={close} title="Delete your account permanently?">
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>Your profile, connections and requests are deleted.</li>
          <li>Your conversations are deleted for you and the people you talked to.</li>
          <li>This can&apos;t be undone. Consider downloading your data first.</li>
        </ul>
        {error && <Notice tone="error">{error}</Notice>}
        <Field id="del-pw" label="Confirm your password"><Input id="del-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field id="del-confirm" label='Type "DELETE" to confirm'><Input id="del-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button variant="danger" disabled={!password || confirmText !== 'DELETE' || busy} onClick={() => run('delete')}>Delete forever</Button>
        </div>
      </Dialog>
    </div>
  );
}
