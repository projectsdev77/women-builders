'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, Input, Notice, Select } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';
import { countryOptions } from '@/lib/countries';

const COUNTRIES = countryOptions();
const ROLES = [
  { value: 'FOUNDER', label: 'Founder' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'INVESTOR', label: 'Investor' },
  { value: 'BUILDER', label: 'Builder' },
];

export function JoinForm({
  token,
  preview,
}: {
  token: string;
  preview: { email: string; name: string; primaryRole: string | null; city: string | null; country: string | null };
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: preview.name,
    password: '',
    primaryRole: preview.primaryRole ?? '',
    headline: '',
    city: preview.city ?? '',
    country: preview.country ?? '',
  });
  const [acceptCharter, setAccept] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const aria = (k: string) => (fe[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-error` } : {});

  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Welcome to Women Builders</h1>
      <p className="text-sm text-gray-600">You were invited, so your account is active as soon as you finish this page.</p>
      {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await api<{ redirectTo: string }>('/api/join', { body: { ...form, invitationToken: token, acceptCharter } });
          setBusy(false);
          if (!res.ok) return setError(res.error);
          router.replace(res.data.redirectTo);
          router.refresh();
        }}
      >
        <Field id="email" label="Email">
          <Input id="email" value={preview.email} readOnly disabled />
        </Field>
        <Field id="name" label="Full name" required error={firstError(fe, 'name')}>
          <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} {...aria('name')} />
        </Field>
        <Field id="password" label="Choose a password" required hint="At least 8 characters with an uppercase letter, a lowercase letter and a number." error={firstError(fe, 'password')}>
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} {...aria('password')} />
        </Field>
        <Field id="primaryRole" label="Your primary role" required error={firstError(fe, 'primaryRole')}>
          <Select id="primaryRole" value={form.primaryRole} onChange={set('primaryRole')} {...aria('primaryRole')}>
            <option value="">Choose one…</option>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
        </Field>
        <Field id="headline" label="Headline" required hint='One line about you, e.g. "Founder of Loop, a B2B payments startup"' error={firstError(fe, 'headline')}>
          <Input id="headline" maxLength={120} value={form.headline} onChange={set('headline')} {...aria('headline')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="city" label="City" error={firstError(fe, 'city')}>
            <Input id="city" autoComplete="address-level2" value={form.city} onChange={set('city')} />
          </Field>
          <Field id="country" label="Country" required error={firstError(fe, 'country')}>
            <Select id="country" autoComplete="country" value={form.country} onChange={set('country')} {...aria('country')}>
              <option value="">Choose…</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={acceptCharter} onChange={(e) => setAccept(e.target.checked)} aria-describedby={fe.acceptCharter ? 'acceptCharter-error' : undefined} />
            <span>
              I&apos;ve read and accept the <Link href="/charter" target="_blank" className="underline">community charter</Link>.
            </span>
          </label>
          {fe.acceptCharter && <p id="acceptCharter-error" className="text-xs text-red-600">{firstError(fe, 'acceptCharter')}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating your account…' : 'Join Women Builders'}</Button>
      </form>
    </Card>
  );
}
