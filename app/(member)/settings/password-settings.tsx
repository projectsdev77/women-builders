'use client';

import { useState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';

export function PasswordSettings() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await api('/api/auth/change-password', { body: { currentPassword, newPassword } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(true);
    setCurrent('');
    setNew('');
  }

  const fe = error?.fieldErrors ?? {};
  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {done && <Notice tone="success">Password changed. You&apos;ve been logged out of your other devices.</Notice>}
      {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
      <Field id="currentPassword" label="Current password" error={firstError(fe, 'currentPassword')}>
        <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
      </Field>
      <Field id="newPassword" label="New password" hint="At least 8 characters with an uppercase letter, a lowercase letter and a number." error={firstError(fe, 'newPassword')}>
        <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>Change password</Button>
    </form>
  );
}
