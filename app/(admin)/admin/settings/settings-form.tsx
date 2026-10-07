'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Notice, Select } from '@/components/ui';
import { api } from '@/lib/client/api';
import type { PublicNumberKey, SiteSettings } from '@/lib/services/site-settings';

const NUMBER_LABELS: Record<PublicNumberKey, string> = {
  members: 'Members',
  countries: 'Countries',
  introductions: 'Introductions made',
  gatherings: 'Gatherings held',
  wins: 'Wins',
};

export function SettingsForm({ initial, current }: { initial: SiteSettings; current: Record<PublicNumberKey, number> }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const { showcase: _showcase, ...patch } = s;
    const res = await api<{ reopened: number }>('/api/admin/settings', { method: 'PATCH', body: patch });
    setBusy(false);
    if (!res.ok) return setMsg({ tone: 'error', text: res.error.message });
    setMsg({ tone: 'success', text: res.data.reopened ? `Saved. ${res.data.reopened} waitlisted requests moved to the queue; their 21-day clock starts today.` : 'Saved.' });
    router.refresh();
  }

  const setThreshold = (k: PublicNumberKey, v: number) => setS((x) => ({ ...x, publicNumbers: { ...x.publicNumbers, thresholds: { ...x.publicNumbers.thresholds, [k]: v } } }));
  const toggleHidden = (k: PublicNumberKey, hidden: boolean) =>
    setS((x) => ({ ...x, publicNumbers: { ...x.publicNumbers, hidden: hidden ? [...x.publicNumbers.hidden, k] : x.publicNumbers.hidden.filter((h) => h !== k) } }));

  return (
    <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">Applications</legend>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="apps" checked={s.applicationsOpen} onChange={() => setS({ ...s, applicationsOpen: true })} /> Open: requests are reviewed within 21 days</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" name="apps" checked={!s.applicationsOpen} onChange={() => setS({ ...s, applicationsOpen: false })} /> Waitlist: the public form says &ldquo;Join the waitlist&rdquo;</label>
        <div>
          <label htmlFor="next-review" className="block text-sm font-medium">Next review line (shown while on waitlist)</label>
          <Input id="next-review" maxLength={80} value={s.nextReview ?? ''} onChange={(e) => setS({ ...s, nextReview: e.target.value || null })} placeholder="e.g. Next review: March" />
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-lg font-semibold">Review rules</legend>
        <label htmlFor="approvals" className="block text-sm font-medium">Matching votes needed to invite or decline automatically</label>
        <Select id="approvals" value={s.requiredApprovals} onChange={(e) => setS({ ...s, requiredApprovals: Number(e.target.value) })}>
          {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
        </Select>
        <p className="text-xs text-gray-600">Admins and member reviewers vote. Split votes are flagged &ldquo;Needs decision&rdquo;, and any admin can decide directly.</p>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-lg font-semibold">Public numbers</legend>
        <p className="text-sm text-gray-600">A number appears on the homepage only once it reaches its threshold, unless you hide it.</p>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600"><tr><th className="py-2">Number</th><th>Today</th><th>Show from</th><th>Hide</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {(Object.keys(NUMBER_LABELS) as PublicNumberKey[]).map((k) => (
              <tr key={k}>
                <td className="py-2">{NUMBER_LABELS[k]}</td>
                <td>{current[k].toLocaleString('en-US')}</td>
                <td><Input aria-label={`${NUMBER_LABELS[k]} threshold`} type="number" min={0} className="w-28" value={s.publicNumbers.thresholds[k]} onChange={(e) => setThreshold(k, Number(e.target.value))} /></td>
                <td><input type="checkbox" aria-label={`Hide ${NUMBER_LABELS[k]}`} checked={s.publicNumbers.hidden.includes(k)} onChange={(e) => toggleHidden(k, e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
      <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</Button>
    </form>
  );
}
