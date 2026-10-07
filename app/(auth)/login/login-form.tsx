'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice } from '@/components/ui';
import { AuthShell, AuthTitle } from '@/components/public/auth-shell';
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
    <AuthShell art="pink" kicker="Welcome back" line="Pick up where the last introduction left off.">
      <AuthTitle title="Welcome back." />
      {passwordReset && <Notice tone="success">Your password was changed. Log in with your new password.</Notice>}
      {error && <Notice tone="error">{error.message}</Notice>}
      {offerReactivation ? (
        <div className="space-y-4 rounded-card bg-white p-6">
          <h2 className="text-[28px] leading-tight">You deactivated your account.</h2>
          <p className="text-[16px] text-ink-muted">Reactivate it to show your profile to members again.</p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => submit(true)}>Reactivate my account</Button>
            <Button variant="secondary" onClick={() => setOfferReactivation(false)}>Cancel</Button>
          </div>
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
          <Button type="submit" size="lg" className="w-full" disabled={busy} aria-busy={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      )}
      <div className="flex flex-wrap justify-between gap-2 text-[15px] font-semibold">
        <Link href="/forgot-password" className="underline underline-offset-4">Forgot password?</Link>
        <span className="text-ink-muted">Not a member yet? <Link href="/request-invite" className="underline underline-offset-4">Request an invitation</Link></span>
      </div>
    </AuthShell>
  );
}
