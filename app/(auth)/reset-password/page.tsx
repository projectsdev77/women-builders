'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Field, Input, Notice } from '@/components/ui';
import { AuthShell, AuthTitle } from '@/components/public/auth-shell';
import { api, firstError, type ApiError } from '@/lib/client/api';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api('/api/auth/reset-password', { body: { token, password } });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.replace('/login?reset=1');
  }

  if (!token) return <Notice tone="error">This reset link is missing its token. Request a new link.</Notice>;
  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {error && <Notice tone="error">{error.message}</Notice>}
      <Field
        id="password"
        label="New password"
        hint="At least 8 characters with an uppercase letter, a lowercase letter and a number."
        error={firstError(error?.fieldErrors ?? {}, 'password')}
      >
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>Set new password</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell art="lavender" kicker="Almost there" line="Choose something only you would guess.">
      <AuthTitle title="Choose a new password." />
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
