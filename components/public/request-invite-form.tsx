'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { CheckRow, RolePicker } from '@/components/ui/choice';
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
  waitlist = null,
}: {
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
      <div role="status" className="flex flex-col items-start gap-4 rounded-[28px] bg-builder-tint p-[clamp(28px,4vw,48px)]">
        <span aria-hidden className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-forest text-[30px] text-cream">✓</span>
        <h3 className="text-[36px] leading-[1.05]">{waitlist ? "You're on the waitlist." : 'Thank you.'}</h3>
        <p className="text-[17px] leading-relaxed">
          {waitlist
            ? `${waitlist.nextReview ? `${waitlist.nextReview}. ` : ''}We review requests in rounds, and you'll hear back within three weeks of our next review, either way.`
            : "We've received your request. Our team reads every request, and you'll hear back within three weeks, either way."}
        </p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-[18px] sm:grid-cols-2"
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
      {error && !Object.keys(fe).length && <div className="sm:col-span-2"><Notice tone="error">{error.message}</Notice></div>}
      <Field id="ri-name" label="Full name" required error={firstError(fe, 'name')}>
        <Input id="ri-name" autoComplete="name" value={form.name} onChange={set('name')} {...aria('name')} />
      </Field>
      <Field id="ri-email" label="Email" required error={firstError(fe, 'email')}>
        <Input id="ri-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} {...aria('email')} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2.5 text-[15px] font-semibold">Your primary role <span aria-hidden className="text-danger">*</span></legend>
        <RolePicker value={form.primaryRole} onChange={(v) => setForm((f) => ({ ...f, primaryRole: v }))} name="ri-primaryRole" describedBy={fe.primaryRole ? 'ri-primaryRole-error' : undefined} invalid={!!fe.primaryRole} />
        {fe.primaryRole && <p id="ri-primaryRole-error" className="mt-1.5 text-[13px] font-medium text-danger">{firstError(fe, 'primaryRole')}</p>}
      </fieldset>
      <Field id="ri-city" label="City" error={firstError(fe, 'city')}>
        <Input id="ri-city" autoComplete="address-level2" value={form.city} onChange={set('city')} />
      </Field>
      <Field id="ri-country" label="Country" required error={firstError(fe, 'country')}>
        <Select id="ri-country" autoComplete="country" value={form.country} onChange={set('country')} {...aria('country')}>
          <option value="">Choose…</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="ri-linkedin" label="LinkedIn profile · optional, helps us review faster" error={firstError(fe, 'linkedInUrl')}>
          <Input id="ri-linkedin" inputMode="url" placeholder="https://www.linkedin.com/in/your-name" value={form.linkedInUrl} onChange={set('linkedInUrl')} {...aria('linkedInUrl')} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field id="ri-statement" label="What are you building or working on?" required hint="A few sentences is perfect." error={firstError(fe, 'statement')}>
          <Textarea id="ri-statement" rows={4} maxLength={1000} value={form.statement} onChange={set('statement')} {...aria('statement')} />
        </Field>
        <p className="mt-1 text-right font-mono text-[12px] text-ink-subtle" aria-live="off">{form.statement.length}/1,000</p>
      </div>
      <div className="sm:col-span-2">
        <Field id="ri-referrer" label="Who referred you? · optional" error={firstError(fe, 'referrer')}>
          <Input id="ri-referrer" value={form.referrer} onChange={set('referrer')} />
        </Field>
      </div>
      {/* Honeypot for bots: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="ri-website">Website</label>
        <input id="ri-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>
      <div className="sm:col-span-2">
        <CheckRow checked={consent} onChange={setConsent} describedBy={fe.consent ? 'ri-consent-error' : undefined}>
          I agree that Women Builders may store these details to review my request. See the{' '}
          <Link href="/privacy" className="underline">privacy policy</Link>.
        </CheckRow>
        {fe.consent && <p id="ri-consent-error" className="mt-1.5 text-[13px] font-medium text-danger">{firstError(fe, 'consent')}</p>}
      </div>
      <Button type="submit" size="lg" disabled={busy} className="sm:col-span-2">{busy ? 'Sending…' : waitlist ? 'Join the waitlist' : 'Request an invitation'}</Button>
    </form>
  );
}
