'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api, firstError, type ApiError } from '@/lib/client/api';

type Dupes = {
  prospects: Array<{ id: string; name: string; outreachStatus: string; archivedAt: string | null }>;
  member: { id: string; name: string; accountStatus: string } | null;
};

const EMPTY = { name: '', email: '', linkedInUrl: '', company: '', role: '', discoverySource: '', referrerName: '', referrerEmail: '', lawfulBasisNote: '', nextFollowUpDate: '', assignedAdminId: '' };

export function AddProspect({ admins }: { admins: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<ApiError | null>(null);
  const [dupes, setDupes] = useState<Dupes | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = error?.fieldErrors ?? {};

  // Live duplicate check (Req 6.4).
  useEffect(() => {
    if (!form.email && !form.linkedInUrl) return setDupes(null);
    const t = setTimeout(async () => {
      const sp = new URLSearchParams();
      if (form.email.includes('@')) sp.set('email', form.email);
      if (form.linkedInUrl.includes('linkedin')) sp.set('linkedInUrl', form.linkedInUrl);
      if (![...sp.keys()].length) return;
      const res = await api<Dupes>(`/api/admin/potential-members/duplicates?${sp}`);
      if (res.ok) setDupes(res.data);
    }, 400);
    return () => clearTimeout(t);
  }, [form.email, form.linkedInUrl]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || null]));
    const res = await api<{ id: string }>('/api/admin/potential-members', { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setOpen(false);
    setForm(EMPTY);
    router.push(`/admin/prospects/${res.data.id}`);
  }

  const hasDupes = dupes && (dupes.prospects.length > 0 || dupes.member);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Add potential member</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add potential member">
        <form className="max-h-[70vh] space-y-3 overflow-y-auto" onSubmit={submit} noValidate>
          {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
          {hasDupes && (
            <Notice tone="warning">
              {dupes!.prospects.map((p) => (
                <span key={p.id} className="block">
                  Already tracked: <Link className="underline" href={`/admin/prospects/${p.id}`}>{p.name}</Link> ({p.outreachStatus.replace(/_/g, ' ').toLowerCase()}{p.archivedAt ? ', archived' : ''})
                </span>
              ))}
              {dupes!.member && <span className="block">Already has an account: <Link className="underline" href={`/admin/members/${dupes!.member.id}`}>{dupes!.member.name}</Link></span>}
            </Notice>
          )}
          <Field id="pm-name" label="Name" required error={firstError(fe, 'name')}><Input id="pm-name" value={form.name} onChange={set('name')} /></Field>
          <p className="text-xs text-gray-600">Add an email, a LinkedIn URL, or both. We use them to prevent duplicate outreach.</p>
          <Field id="pm-email" label="Email" error={firstError(fe, 'email')}><Input id="pm-email" type="email" value={form.email} onChange={set('email')} /></Field>
          <Field id="pm-linkedin" label="LinkedIn URL" error={firstError(fe, 'linkedInUrl')}><Input id="pm-linkedin" value={form.linkedInUrl} onChange={set('linkedInUrl')} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="pm-company" label="Company"><Input id="pm-company" value={form.company} onChange={set('company')} /></Field>
            <Field id="pm-role" label="Role"><Input id="pm-role" value={form.role} onChange={set('role')} placeholder="Founder, Investor…" /></Field>
            <Field id="pm-source" label="Where did we find them?"><Input id="pm-source" value={form.discoverySource} onChange={set('discoverySource')} placeholder="Event, referral, research…" /></Field>
            <Field id="pm-follow" label="Next follow-up" error={firstError(fe, 'nextFollowUpDate')}><Input id="pm-follow" type="date" value={form.nextFollowUpDate} onChange={set('nextFollowUpDate')} /></Field>
            <Field id="pm-ref" label="Referred by"><Input id="pm-ref" value={form.referrerName} onChange={set('referrerName')} /></Field>
            <Field id="pm-refemail" label="Referrer email" error={firstError(fe, 'referrerEmail')}><Input id="pm-refemail" value={form.referrerEmail} onChange={set('referrerEmail')} /></Field>
          </div>
          <Field id="pm-owner" label="Owner">
            <Select id="pm-owner" value={form.assignedAdminId} onChange={set('assignedAdminId')}>
              <option value="">Unassigned</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field id="pm-basis" label="Why are we storing this person's details?" hint="e.g. Met at SaaStr, asked us to reach out">
            <Textarea id="pm-basis" rows={2} value={form.lawfulBasisNote} onChange={set('lawfulBasisNote')} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>Save</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
