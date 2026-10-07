'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { CheckRow, RolePicker } from '@/components/ui/choice';
import { api, firstError, type ApiError } from '@/lib/client/api';
import { countryOptions } from '@/lib/countries';

const COUNTRIES = countryOptions();

export function JoinForm({
  token,
  preview,
  lockIcon,
}: {
  lockIcon: ReactNode;
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
    <>
      {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
      <form
        className="space-y-5"
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
          <div className="relative">
            <Input id="email" value={preview.email} readOnly disabled className="pr-12" />
            <span aria-hidden className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-subtle">{lockIcon}</span>
          </div>
        </Field>
        <Field id="name" label="Full name" required error={firstError(fe, 'name')}>
          <Input id="name" autoComplete="name" value={form.name} onChange={set('name')} {...aria('name')} />
        </Field>
        <Field id="password" label="Choose a password" required hint="At least 8 characters with an uppercase letter, a lowercase letter and a number." error={firstError(fe, 'password')}>
          <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} {...aria('password')} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold">Your primary role <span aria-hidden className="text-danger">*</span></legend>
          <RolePicker value={form.primaryRole} onChange={(v) => setForm((f) => ({ ...f, primaryRole: v }))} describedBy={fe.primaryRole ? 'primaryRole-error' : undefined} invalid={!!fe.primaryRole} />
          {fe.primaryRole && <p id="primaryRole-error" className="mt-1.5 text-[13px] font-medium text-danger">{firstError(fe, 'primaryRole')}</p>}
        </fieldset>
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
        <div className="rounded-2xl bg-white p-4">
          <CheckRow checked={acceptCharter} onChange={setAccept} describedBy={fe.acceptCharter ? 'acceptCharter-error' : undefined}>
            I&apos;ve read and accept the <Link href="/charter" target="_blank" className="underline">community charter</Link>.
          </CheckRow>
          {fe.acceptCharter && <p id="acceptCharter-error" className="mt-1.5 text-[13px] font-medium text-danger">{firstError(fe, 'acceptCharter')}</p>}
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Creating your account…' : 'Join Women Builders'}</Button>
      </form>
    </>
  );
}
