'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';

const ROLES = [
  { value: 'FOUNDER', label: 'Founder', hint: 'You started or are starting a company' },
  { value: 'OPERATOR', label: 'Operator', hint: 'You run a function inside a company' },
  { value: 'INVESTOR', label: 'Investor', hint: 'You write checks: angel, VC, or fund' },
  { value: 'BUILDER', label: 'Builder', hint: 'You build products: engineer, designer, maker' },
];

export function RegisterForm({
  invitationToken,
  defaultEmail,
  eligibility,
}: {
  invitationToken?: string;
  defaultEmail?: string;
  eligibility: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: defaultEmail ?? '',
    password: '',
    primaryRole: '',
    headline: '',
    applicationStatement: '',
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api<{ redirectTo: string }>('/api/auth/register', {
      body: { ...form, invitationToken },
    });
    setBusy(false);
    // Form values stay in state on error so nothing is lost (Req 17.5).
    if (!res.ok) return setError(res.error);
    router.replace(res.data.redirectTo);
    router.refresh();
  }

  const invalid = (k: string) => (fe[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-error` } : {});

  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{invitationToken ? 'Accept your invitation' : 'Apply to join'}</h1>
      <p className="text-sm text-gray-600">{eligibility}</p>
      {invitationToken && (
        <Notice tone="info">You were invited, so your account will be active right away.</Notice>
      )}
      {error && <Notice tone="error">{error.message}</Notice>}
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="name" label="Full name" required error={firstError(fe, 'name')}>
          <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} {...invalid('name')} />
        </Field>
        <Field id="email" label="Email" required error={firstError(fe, 'email')}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} {...invalid('email')} />
        </Field>
        <Field
          id="password"
          label="Password"
          required
          hint="At least 8 characters with an uppercase letter, a lowercase letter and a number."
          error={firstError(fe, 'password')}
        >
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} {...invalid('password')} />
        </Field>
        <Field id="primaryRole" label="Your primary role" required error={firstError(fe, 'primaryRole')}>
          <Select id="primaryRole" value={form.primaryRole} onChange={set('primaryRole')} {...invalid('primaryRole')}>
            <option value="">Choose one…</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}: {r.hint}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="headline"
          label="Headline"
          required
          hint='One line about you, e.g. "Founder of Loop, a B2B payments startup"'
          error={firstError(fe, 'headline')}
        >
          <Input id="headline" maxLength={120} value={form.headline} onChange={set('headline')} {...invalid('headline')} />
        </Field>
        <Field
          id="applicationStatement"
          label="What are you building, and why do you want to join?"
          required
          hint="Our team reads every application."
          error={firstError(fe, 'applicationStatement')}
        >
          <Textarea id="applicationStatement" rows={5} maxLength={2000} value={form.applicationStatement} onChange={set('applicationStatement')} {...invalid('applicationStatement')} />
        </Field>
        <Button type="submit" className="w-full" disabled={busy} aria-busy={busy}>
          {busy ? 'Submitting…' : invitationToken ? 'Create account' : 'Submit application'}
        </Button>
      </form>
      <p className="text-sm">
        Already a member? <Link href="/login" className="text-brand-700 underline">Log in</Link>
      </p>
    </Card>
  );
}
