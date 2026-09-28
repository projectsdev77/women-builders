'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, Field, Input, Notice } from '@/components/ui';
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
      <Button type="submit" className="w-full" disabled={busy}>Set new password</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <Suspense>
        <ResetForm />
      </Suspense>
    </Card>
  );
}
