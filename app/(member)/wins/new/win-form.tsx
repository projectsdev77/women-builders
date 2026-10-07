'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { api, firstError, type ApiError } from '@/lib/client/api';

type Picked = { id: string; name: string };
const TYPES = [
  ['INVESTMENT', 'Investment'],
  ['HIRE', 'Hire'],
  ['ADVISOR', 'Advisor or mentor'],
  ['CUSTOMER', 'Customer or partnership'],
  ['COFOUNDER', 'Co-founder'],
  ['SPEAKING', 'Speaking or press'],
  ['OTHER', 'Other'],
] as const;

export function WinForm({
  thisMonth,
  initialWith,
  sources,
  initialSource,
}: {
  thisMonth: string;
  initialWith: Picked[];
  sources: { introductions: Array<{ id: string; label: string }>; gatherings: Array<{ id: string; label: string }> };
  initialSource: { source: 'INTRODUCTION' | 'CONNECTION' | 'GATHERING' | 'OTHER'; introductionId?: string; gatheringId?: string };
}) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number][0]>('INVESTMENT');
  const [people, setPeople] = useState<Picked[]>(initialWith);
  const [outside, setOutside] = useState(false);
  const [source, setSource] = useState(initialSource.source);
  const [introductionId, setIntro] = useState(initialSource.introductionId ?? sources.introductions[0]?.id ?? '');
  const [gatheringId, setGathering] = useState(initialSource.gatheringId ?? sources.gatherings[0]?.id ?? '');
  const [month, setMonth] = useState(thisMonth);
  const [amount, setAmount] = useState('');
  const [story, setStory] = useState('');
  const [visibility, setVisibility] = useState<'ANONYMOUS' | 'MEMBERS' | 'QUOTABLE'>('ANONYMOUS');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Picked[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const fe = error?.fieldErrors ?? {};

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(async () => {
      const res = await api<{ results: Array<{ member: Picked }> }>(`/api/members?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) setResults(res.data.results.map((r) => ({ id: r.member.id, name: r.member.name })).filter((m) => !people.some((p) => p.id === m.id)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, people]);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api('/api/wins', {
      body: {
        type,
        participantIds: people.map((p) => p.id),
        outsideNetwork: outside,
        source,
        introductionId: source === 'INTRODUCTION' ? introductionId : undefined,
        gatheringId: source === 'GATHERING' ? gatheringId : undefined,
        month,
        amountK: type === 'INVESTMENT' && amount ? Number(amount) : undefined,
        story: story || undefined,
        visibility,
      },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push('/wins');
    router.refresh();
  }

  return (
    <form className="space-y-5" noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
      <fieldset>
        <legend className="text-sm font-medium">What happened?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TYPES.map(([v, label]) => (
            <label key={v} className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 text-sm ${type === v ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300'}`}>
              <input type="radio" name="type" value={v} className="sr-only" checked={type === v} onChange={() => setType(v)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="win-with" className="block text-sm font-medium">With whom (optional)</label>
        {people.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {people.map((p) => (
              <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm">
                {p.name}
                <button type="button" aria-label={`Remove ${p.name}`} className="px-1 text-gray-600" onClick={() => setPeople(people.filter((x) => x.id !== p.id))}>×</button>
              </li>
            ))}
          </ul>
        )}
        <Input id="win-with" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a member's name…" autoComplete="off" />
        {results.length > 0 && (
          <ul className="rounded-md border border-gray-200 bg-white">
            {results.map((m) => (
              <li key={m.id}><button type="button" className="block min-h-[44px] w-full px-3 text-left text-sm hover:bg-gray-50" onClick={() => { setPeople([...people, m]); setQ(''); }}>{m.name}</button></li>
            ))}
          </ul>
        )}
        <p className="text-xs text-gray-600">Everyone you name is asked to confirm. Confirmed wins are marked verified.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={outside} onChange={(e) => setOutside(e.target.checked)} /> Someone outside the network was involved</label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="win-source" label="How did it happen?">
          <Select id="win-source" value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
            <option value="INTRODUCTION" disabled={!sources.introductions.length}>Through an introduction</option>
            <option value="CONNECTION">Through a connection</option>
            <option value="GATHERING" disabled={!sources.gatherings.length}>At a gathering</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        {source === 'INTRODUCTION' && (
          <Field id="win-intro" label="Which introduction?" error={firstError(fe, 'introductionId')}>
            <Select id="win-intro" value={introductionId} onChange={(e) => setIntro(e.target.value)}>
              {sources.introductions.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </Select>
          </Field>
        )}
        {source === 'GATHERING' && (
          <Field id="win-gathering" label="Which gathering?" error={firstError(fe, 'gatheringId')}>
            <Select id="win-gathering" value={gatheringId} onChange={(e) => setGathering(e.target.value)}>
              {sources.gatherings.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </Select>
          </Field>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="win-month" label="Month" required error={firstError(fe, 'month')}>
          <Input id="win-month" type="month" max={thisMonth} value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        {type === 'INVESTMENT' && (
          <Field id="win-amount" label="Amount in $K (optional)" hint="Always private. Used only in team totals." error={firstError(fe, 'amountK')}>
            <Input id="win-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="250" />
          </Field>
        )}
      </div>

      <Field id="win-story" label="The story (optional)" error={firstError(fe, 'story')}>
        <Textarea id="win-story" rows={3} maxLength={500} value={story} onChange={(e) => setStory(e.target.value)} placeholder="What happened, in a sentence or two" />
      </Field>
      <p className="-mt-3 text-right text-xs text-gray-500">{story.length}/500</p>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Who can see it?</legend>
        {([
          ['ANONYMOUS', 'Count it anonymously', 'Only adds to the totals. Nobody sees the details.'],
          ['MEMBERS', 'Members can see it', 'Shown on your profile and in "Recent wins" for members.'],
          ['QUOTABLE', 'May be quoted on the public site', 'Members can see it, and the team may quote it publicly.'],
        ] as const).map(([v, label, hint]) => (
          <label key={v} className="flex min-h-[44px] items-start gap-2 text-sm">
            <input type="radio" name="visibility" className="mt-1" checked={visibility === v} onChange={() => setVisibility(v)} />
            <span><span className="block font-medium">{label}</span><span className="block text-xs text-gray-600">{hint}</span></span>
          </label>
        ))}
      </fieldset>

      <Button type="submit" disabled={busy}>{busy ? 'Sharing…' : 'Share the win'}</Button>
    </form>
  );
}
