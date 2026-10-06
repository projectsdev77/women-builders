'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';

export function LoginForm({ passwordReset }: { passwordReset: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [offerReactivation, setOfferReactivation] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(reactivate = false) {
    setBusy(true);
    setError(null);
    const res = await api<{ status: string; redirectTo?: string }>('/api/auth/login', {
      body: { email, password, reactivate },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (res.data.status === 'REACTIVATION_AVAILABLE') return setOfferReactivation(true);
    router.replace(res.data.redirectTo ?? '/dashboard');
    router.refresh();
  }

  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      {passwordReset && <Notice tone="success">Your password was changed. Log in with your new password.</Notice>}
      {error && <Notice tone="error">{error.message}</Notice>}
      {offerReactivation ? (
        <div className="space-y-3">
          <Notice tone="info">
            You deactivated your account. Reactivate it to show your profile to members again.
          </Notice>
          <Button className="w-full" disabled={busy} onClick={() => submit(true)}>
            Reactivate my account
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setOfferReactivation(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          <Field id="email" label="Email" error={firstError(error?.fieldErrors ?? {}, 'email')}>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field id="password" label="Password" error={firstError(error?.fieldErrors ?? {}, 'password')}>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy} aria-busy={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      )}
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 underline">Forgot password?</Link>
        <Link href="/request-invite" className="text-brand-700 underline">Request an invitation</Link>
      </div>
    </Card>
  );
}
