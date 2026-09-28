'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api('/api/auth/forgot-password', { body: { email } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSent(true);
  }

  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      {sent ? (
        <Notice tone="success">
          If an account exists for {email}, we&apos;ve sent a link to reset your password. It expires in 1 hour.
        </Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          {error && <Notice tone="error">{error.message}</Notice>}
          <Field id="email" label="Email" error={firstError(error?.fieldErrors ?? {}, 'email')}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>Send reset link</Button>
        </form>
      )}
      <Link href="/login" className="text-sm text-brand-700 underline">Back to log in</Link>
    </Card>
  );
}
