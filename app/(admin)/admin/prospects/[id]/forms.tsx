'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';
import { STATUS_LABELS } from '@/components/admin/labels';

const STATUSES = Object.keys(STATUS_LABELS);

export function OutreachForm({ prospectId, today, currentStatus }: { prospectId: string; today: string; currentStatus: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ attemptDate: today, method: 'Email', outcome: '', newStatus: currentStatus, nextFollowUpDate: '' });
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = error?.fieldErrors ?? {};

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await api(`/api/admin/potential-members/${prospectId}/outreach`, {
      body: { ...form, outcome: form.outcome || null, nextFollowUpDate: form.nextFollowUpDate || null, newStatus: form.newStatus === currentStatus ? undefined : form.newStatus },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setForm((f) => ({ ...f, outcome: '', nextFollowUpDate: '' }));
    router.refresh();
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit} noValidate>
      {error && !Object.keys(fe).length && <div className="sm:col-span-2"><Notice tone="error">{error.message}</Notice></div>}
      <Field id="o-date" label="Date" error={firstError(fe, 'attemptDate')}><Input id="o-date" type="date" value={form.attemptDate} onChange={set('attemptDate')} /></Field>
      <Field id="o-method" label="Method" error={firstError(fe, 'method')}>
        <Select id="o-method" value={form.method} onChange={set('method')}>
          {['Email', 'LinkedIn', 'Phone', 'Event', 'Intro', 'Other'].map((m) => <option key={m}>{m}</option>)}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="o-outcome" label="Outcome"><Textarea id="o-outcome" rows={2} value={form.outcome} onChange={set('outcome')} placeholder="What happened?" /></Field>
      </div>
      <Field id="o-status" label="Status after this">
        <Select id="o-status" value={form.newStatus} onChange={set('newStatus')}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      </Field>
      <Field id="o-next" label="Next follow-up" error={firstError(fe, 'nextFollowUpDate')}><Input id="o-next" type="date" value={form.nextFollowUpDate} onChange={set('nextFollowUpDate')} /></Field>
      <div className="sm:col-span-2"><Button type="submit" disabled={busy}>Log outreach</Button></div>
    </form>
  );
}

export function NoteForm({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await api(`/api/admin/potential-members/${prospectId}/notes`, { body: { content } });
        if (!res.ok) return setError(res.error.message);
        setContent('');
        setError(null);
        router.refresh();
      }}
    >
      <label htmlFor="note" className="block text-sm font-medium">Add a note</label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Textarea id="note" rows={2} value={content} onChange={(e) => setContent(e.target.value)} />
      <Button type="submit" variant="secondary" disabled={!content.trim()}>Add note</Button>
    </form>
  );
}

type Editable = {
  id: string; name: string; email: string; linkedInUrl: string; company: string; role: string; discoverySource: string;
  referrerName: string; referrerEmail: string; lawfulBasisNote: string; nextFollowUpDate: string; assignedAdminId: string;
  outreachStatus: string; archived: boolean;
};

export function ProspectEditor({ prospect, admins }: { prospect: Editable; admins: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState(prospect);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Editable) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = error?.fieldErrors ?? {};

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    // Send only fields changed in this form, so it can never overwrite a status or
    // follow-up date that was just changed elsewhere (e.g. by logging outreach).
    const { id: _id, archived: _archived, ...rest } = form;
    const changed = Object.entries(rest).filter(([k, v]) => v !== prospect[k as keyof Editable]);
    if (changed.length === 0) return setSaved(true);
    const body = Object.fromEntries(changed.map(([k, v]) => [k, v === '' ? null : v]));
    const res = await api(`/api/admin/potential-members/${prospect.id}`, { method: 'PATCH', body });
    if (!res.ok) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  async function toggleArchive() {
    const res = await api(`/api/admin/potential-members/${prospect.id}`, { method: 'PATCH', body: { archived: !prospect.archived } });
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <form className="space-y-3" onSubmit={save} noValidate>
      {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
      {saved && <Notice tone="success">Saved</Notice>}
      <Field id="e-status" label="Status">
        <Select id="e-status" value={form.outreachStatus} onChange={set('outreachStatus')}>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </Select>
      </Field>
      <Field id="e-owner" label="Owner">
        <Select id="e-owner" value={form.assignedAdminId} onChange={set('assignedAdminId')}>
          <option value="">Unassigned</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </Field>
      <Field id="e-next" label="Next follow-up" error={firstError(fe, 'nextFollowUpDate')}><Input id="e-next" type="date" value={form.nextFollowUpDate} onChange={set('nextFollowUpDate')} /></Field>
      <Field id="e-name" label="Name" error={firstError(fe, 'name')}><Input id="e-name" value={form.name} onChange={set('name')} /></Field>
      <Field id="e-email" label="Email" error={firstError(fe, 'email')}><Input id="e-email" value={form.email} onChange={set('email')} /></Field>
      <Field id="e-li" label="LinkedIn URL" error={firstError(fe, 'linkedInUrl')}><Input id="e-li" value={form.linkedInUrl} onChange={set('linkedInUrl')} /></Field>
      <Field id="e-company" label="Company"><Input id="e-company" value={form.company} onChange={set('company')} /></Field>
      <Field id="e-role" label="Role"><Input id="e-role" value={form.role} onChange={set('role')} /></Field>
      <Field id="e-source" label="Discovery source"><Input id="e-source" value={form.discoverySource} onChange={set('discoverySource')} /></Field>
      <Field id="e-ref" label="Referred by"><Input id="e-ref" value={form.referrerName} onChange={set('referrerName')} /></Field>
      <Field id="e-refemail" label="Referrer email" error={firstError(fe, 'referrerEmail')}><Input id="e-refemail" value={form.referrerEmail} onChange={set('referrerEmail')} /></Field>
      <Field id="e-basis" label="Why we hold this record"><Textarea id="e-basis" rows={2} value={form.lawfulBasisNote} onChange={set('lawfulBasisNote')} /></Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save details</Button>
        {prospect.outreachStatus !== 'DO_NOT_CONTACT' && (
          <Button type="button" variant="ghost" onClick={toggleArchive}>{prospect.archived ? 'Unarchive' : 'Archive'}</Button>
        )}
      </div>
    </form>
  );
}
