'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';
import { countryOptions } from '@/lib/countries';

const COUNTRIES = countryOptions();
const ROLES = [
  ['FOUNDER', 'Founder'],
  ['OPERATOR', 'Operator'],
  ['INVESTOR', 'Investor'],
  ['BUILDER', 'Builder'],
] as const;

const EMPTY = { name: '', email: '', linkedInUrl: '', primaryRole: '', city: '', country: '', statement: '', referrer: '', website: '' };

/** The public front door (R3 F3). Used on /request-invite and on the homepage. */
export function RequestInviteForm({
  compact = false,
  waitlist = null,
}: {
  compact?: boolean;
  /** Applications are closed: the form becomes "Join the waitlist" (R3 F21, R2). */
  waitlist?: { nextReview: string | null } | null;
}) {
  const [form, setForm] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const aria = (k: string) => (fe[k] ? { 'aria-invalid': true, 'aria-describedby': `ri-${k}-error` } : {});

  if (sent) {
    return (
      <Notice tone="success">
        {waitlist ? (
          <>Thank you. You&apos;re on the waitlist. {waitlist.nextReview ? `${waitlist.nextReview}. ` : ''}You&apos;ll hear back within three weeks of our next review, either way.</>
        ) : (
          <>Thank you. We&apos;ve received your request. Our team reads every request, and you&apos;ll hear back within three weeks, either way.</>
        )}
      </Notice>
    );
  }

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await api('/api/invite-requests', { body: { ...form, consent } });
        setBusy(false);
        if (!res.ok) return setError(res.error);
        setSent(true);
      }}
    >
      {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
      <div className={compact ? 'grid gap-4 sm:grid-cols-2' : 'space-y-4'}>
        <Field id="ri-name" label="Full name" required error={firstError(fe, 'name')}>
          <Input id="ri-name" autoComplete="name" value={form.name} onChange={set('name')} {...aria('name')} />
        </Field>
        <Field id="ri-email" label="Email" required error={firstError(fe, 'email')}>
          <Input id="ri-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} {...aria('email')} />
        </Field>
        <Field id="ri-primaryRole" label="Your primary role" required error={firstError(fe, 'primaryRole')}>
          <Select id="ri-primaryRole" value={form.primaryRole} onChange={set('primaryRole')} {...aria('primaryRole')}>
            <option value="">Choose…</option>
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field id="ri-linkedin" label="LinkedIn profile" hint="Optional, but it helps us review faster" error={firstError(fe, 'linkedInUrl')}>
          <Input id="ri-linkedin" inputMode="url" placeholder="https://www.linkedin.com/in/your-name" value={form.linkedInUrl} onChange={set('linkedInUrl')} {...aria('linkedInUrl')} />
        </Field>
        <Field id="ri-city" label="City" error={firstError(fe, 'city')}>
          <Input id="ri-city" autoComplete="address-level2" value={form.city} onChange={set('city')} />
        </Field>
        <Field id="ri-country" label="Country" required error={firstError(fe, 'country')}>
          <Select id="ri-country" autoComplete="country" value={form.country} onChange={set('country')} {...aria('country')}>
            <option value="">Choose…</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field id="ri-statement" label="What are you building or working on?" required hint="A few sentences is perfect." error={firstError(fe, 'statement')}>
        <Textarea id="ri-statement" rows={4} maxLength={1000} value={form.statement} onChange={set('statement')} {...aria('statement')} />
      </Field>
      <Field id="ri-referrer" label="Who referred you?" hint="Optional" error={firstError(fe, 'referrer')}>
        <Input id="ri-referrer" value={form.referrer} onChange={set('referrer')} />
      </Field>
      {/* Honeypot for bots: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="ri-website">Website</label>
        <input id="ri-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-describedby={fe.consent ? 'ri-consent-error' : undefined} />
          <span>
            I agree that Women Builders may store these details to review my request. See the{' '}
            <Link href="/privacy" className="underline">privacy policy</Link>.
          </span>
        </label>
        {fe.consent && <p id="ri-consent-error" className="text-xs text-red-600">{firstError(fe, 'consent')}</p>}
      </div>
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? 'Sending…' : waitlist ? 'Join the waitlist' : 'Request an invitation'}</Button>
      <p className="text-xs text-gray-500">No newsletter, no spam. One reply from a human, either way.</p>
    </form>
  );
}
