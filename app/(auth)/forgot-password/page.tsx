'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Field, Input, Notice } from '@/components/ui';
import { AuthShell, AuthTitle } from '@/components/public/auth-shell';
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
    <AuthShell art="lavender" kicker="It happens" line="We'll send you a link. It works for one hour.">
      <AuthTitle title="Forgot your password?" lede="Enter your email and we'll send a reset link." />
      {sent ? (
        <div role="status" className="rounded-card bg-builder-tint p-6 text-[16px]">
          If an account exists for <b>{email}</b>, we&apos;ve sent a link to reset your password. It expires in 1 hour.
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          {error && <Notice tone="error">{error.message}</Notice>}
          <Field id="email" label="Email" error={firstError(error?.fieldErrors ?? {}, 'email')}>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>Send reset link</Button>
        </form>
      )}
      <Link href="/login" className="text-[15px] font-semibold underline underline-offset-4">Back to log in</Link>
    </AuthShell>
  );
}
