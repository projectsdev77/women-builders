'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';
import { MemberPicker } from './member-picker';

type Picked = { id: string; name: string };
export interface GatheringFormValues {
  title: string;
  type: 'DINNER' | 'WORKING_SESSION' | 'OTHER';
  description: string;
  startsAtLocal: string;
  timeZone: string;
  durationMinutes: number;
  online: boolean;
  city: string;
  country: string;
  venue: string;
  capacity: number;
  audience: 'ALL' | 'ROLES' | 'INVITE_ONLY';
  audienceRoles: string[];
  seatMode: 'CURATED' | 'OPEN';
  requestsCloseAtLocal: string;
  teamHosted: boolean;
  hosts: Picked[];
  invites: Picked[];
  showOnPublicSite: boolean;
}

const ROLES = [['FOUNDER', 'Founders'], ['OPERATOR', 'Operators'], ['INVESTOR', 'Investors'], ['BUILDER', 'Builders']] as const;
const DEFAULT_SEATS = { DINNER: 12, WORKING_SESSION: 20, OTHER: 12 } as const;

export function GatheringForm({
  initial,
  gatheringId,
  timeZones,
  countries,
}: {
  initial: GatheringFormValues;
  gatheringId?: string;
  timeZones: string[];
  countries: Array<{ code: string; name: string }>;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const set = <K extends keyof GatheringFormValues>(k: K, value: GatheringFormValues[K]) => setV((x) => ({ ...x, [k]: value }));
  const text = (k: 'title' | 'description' | 'startsAtLocal' | 'timeZone' | 'city' | 'country' | 'venue' | 'requestsCloseAtLocal') =>
    (e: { target: { value: string } }) => set(k, e.target.value);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const { hosts, invites, ...rest } = v;
    const body = { ...rest, hostIds: hosts.map((h) => h.id), inviteIds: invites.map((i) => i.id), country: v.country || undefined, city: v.city || undefined, venue: v.venue || undefined };
    const res = gatheringId
      ? await api<{ id: string }>(`/api/admin/gatherings/${gatheringId}`, { method: 'PATCH', body })
      : await api<{ id: string }>('/api/admin/gatherings', { body });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    if (!gatheringId) router.push(`/admin/gatherings/${res.data.id}`);
    else setSaved(true);
    router.refresh();
  }

  return (
    <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {error && <Notice tone="error">{error.message}</Notice>}
      {saved && <Notice tone="success">Saved. If the time or place changed, confirmed guests were emailed.</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="g-title" label="Title" required error={firstError(fe, 'title')}>
          <Input id="g-title" maxLength={120} value={v.title} onChange={text('title')} />
        </Field>
        <Field id="g-type" label="Type" required>
          <Select id="g-type" value={v.type} onChange={(e) => { const t = e.target.value as GatheringFormValues['type']; setV((x) => ({ ...x, type: t, capacity: gatheringId ? x.capacity : DEFAULT_SEATS[t] })); }}>
            <option value="DINNER">Dinner (a table)</option>
            <option value="WORKING_SESSION">Working session (a room)</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
      </div>
      <Field id="g-description" label="Topic and description" required error={firstError(fe, 'description')}>
        <Textarea id="g-description" rows={5} maxLength={3000} value={v.description} onChange={text('description')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="g-start" label="Starts (local time)" required error={firstError(fe, 'startsAtLocal')}>
          <Input id="g-start" type="datetime-local" value={v.startsAtLocal} onChange={text('startsAtLocal')} />
        </Field>
        <Field id="g-tz" label="Time zone" required error={firstError(fe, 'timeZone')}>
          <Select id="g-tz" value={v.timeZone} onChange={text('timeZone')}>
            {timeZones.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
          </Select>
        </Field>
        <Field id="g-duration" label="Duration (minutes)" required error={firstError(fe, 'durationMinutes')}>
          <Input id="g-duration" type="number" min={15} step={15} value={v.durationMinutes} onChange={(e) => set('durationMinutes', Number(e.target.value))} />
        </Field>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Where</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.online} onChange={(e) => set('online', e.target.checked)} /> Online</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="g-city" label={v.online ? 'City (optional, for online)' : 'City'} required={!v.online} error={firstError(fe, 'city')}>
            <Input id="g-city" value={v.city} onChange={text('city')} />
          </Field>
          <Field id="g-country" label="Country" required={!v.online} error={firstError(fe, 'country')}>
            <Select id="g-country" value={v.country} onChange={text('country')}>
              <option value="">{v.online ? 'None' : 'Choose…'}</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field id="g-venue" label={v.online ? 'Online link' : 'Venue address'} hint="Shown only to confirmed guests and hosts." error={firstError(fe, 'venue')}>
          <Textarea id="g-venue" rows={2} maxLength={1000} value={v.venue} onChange={text('venue')} />
        </Field>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="g-capacity" label="Seats" required error={firstError(fe, 'capacity')}>
          <Input id="g-capacity" type="number" min={1} max={500} value={v.capacity} onChange={(e) => set('capacity', Number(e.target.value))} />
        </Field>
        <Field id="g-mode" label="Seat mode" required hint={v.seatMode === 'CURATED' ? 'Members request; the team confirms.' : 'First come, first served, with a waitlist.'}>
          <Select id="g-mode" value={v.seatMode} onChange={(e) => set('seatMode', e.target.value as GatheringFormValues['seatMode'])}>
            <option value="CURATED">Curated</option>
            <option value="OPEN">Open</option>
          </Select>
        </Field>
        <Field id="g-close" label="Requests close (local time)" required error={firstError(fe, 'requestsCloseAtLocal')}>
          <Input id="g-close" type="datetime-local" value={v.requestsCloseAtLocal} onChange={text('requestsCloseAtLocal')} />
        </Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Who it&apos;s for</legend>
        {(['ALL', 'ROLES', 'INVITE_ONLY'] as const).map((a) => (
          <label key={a} className="flex items-center gap-2 text-sm">
            <input type="radio" name="audience" checked={v.audience === a} onChange={() => set('audience', a)} />
            {a === 'ALL' ? 'All members' : a === 'ROLES' ? 'Selected roles' : 'Invite-only (only invited members see it)'}
          </label>
        ))}
        {v.audience === 'ROLES' && (
          <div className="flex flex-wrap gap-3 pl-6">
            {ROLES.map(([r, label]) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={v.audienceRoles.includes(r)} onChange={(e) => set('audienceRoles', e.target.checked ? [...v.audienceRoles, r] : v.audienceRoles.filter((x) => x !== r))} />
                {label}
              </label>
            ))}
            {fe.audienceRoles && <p className="w-full text-xs text-red-700">{firstError(fe, 'audienceRoles')}</p>}
          </div>
        )}
        {v.audience === 'INVITE_ONLY' && <div className="pl-6"><MemberPicker id="g-invites" label="Invited members" value={v.invites} onChange={(x) => set('invites', x)} /></div>}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Hosts</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.teamHosted} onChange={(e) => set('teamHosted', e.target.checked)} /> Hosted by the Women Builders team</label>
        <MemberPicker id="g-hosts" label="Member hosts" value={v.hosts} onChange={(x) => set('hosts', x)} />
        {fe.hostIds && <p className="text-xs text-red-700">{firstError(fe, 'hostIds')}</p>}
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.showOnPublicSite} onChange={(e) => set('showOnPublicSite', e.target.checked)} /> Show on the public website (title, type, city and date only)
      </label>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : gatheringId ? 'Save changes' : 'Create and announce'}</Button>
      {!gatheringId && <p className="text-xs text-gray-600">Creating it emails members in that country (or everyone eligible, for online), or the invitees for invite-only gatherings.</p>}
    </form>
  );
}
