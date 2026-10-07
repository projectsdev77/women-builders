'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Notice, Select, Textarea, cx } from '@/components/ui';
import { CheckRow } from '@/components/ui/choice';
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
        <legend className="text-[15px] font-semibold">What happened?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TYPES.map(([v, label]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="type" value={v} className="peer sr-only" checked={type === v} onChange={() => setType(v)} />
              <span className="inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-line bg-white px-4 text-[14px] font-bold transition-colors hover:bg-wash peer-checked:border-forest peer-checked:bg-butter peer-focus-visible:shadow-focus-field">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="win-with" className="block text-[15px] font-semibold">With whom (optional)</label>
        {people.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {people.map((p) => (
              <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-builder-tint px-3 py-1 text-[14px] font-semibold">
                {p.name}
                <button type="button" aria-label={`Remove ${p.name}`} className="px-1 text-ink-muted" onClick={() => setPeople(people.filter((x) => x.id !== p.id))}>×</button>
              </li>
            ))}
          </ul>
        )}
        <Input id="win-with" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a member's name…" autoComplete="off" />
        {results.length > 0 && (
          <ul className="overflow-hidden rounded-field border border-line bg-white shadow-lift">
            {results.map((m) => (
              <li key={m.id}><button type="button" className="block min-h-[44px] w-full px-4 text-left text-[15px] hover:bg-cream" onClick={() => { setPeople([...people, m]); setQ(''); }}>{m.name}</button></li>
            ))}
          </ul>
        )}
        <p className="text-[13px] text-ink-subtle">Everyone you name is asked to confirm. Confirmed wins are marked verified.</p>
        <CheckRow checked={outside} onChange={setOutside}>Someone outside the network was involved</CheckRow>
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
      <p className="-mt-3 text-right font-mono text-[12px] text-ink-subtle">{story.length}/500</p>

      <fieldset className="space-y-2">
        <legend className="text-[15px] font-semibold">Who can see it?</legend>
        {([
          ['ANONYMOUS', 'Count it anonymously', 'Only adds to the totals. Nobody sees the details.'],
          ['MEMBERS', 'Members can see it', 'Shown on your profile and in "Recent wins" for members.'],
          ['QUOTABLE', 'May be quoted on the public site', 'Members can see it, and the team may quote it publicly.'],
        ] as const).map(([v, label, hint]) => (
          <label key={v} className="block cursor-pointer">
            <input type="radio" name="visibility" className="peer sr-only" checked={visibility === v} onChange={() => setVisibility(v)} />
            <span className="flex items-start gap-3 rounded-field border-[1.5px] border-line bg-white p-4 transition-colors peer-checked:border-forest peer-checked:bg-cream peer-focus-visible:shadow-focus-field">
              <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-forest bg-white">
                {visibility === v && <span className="h-2.5 w-2.5 rounded-full bg-forest" />}
              </span>
              <span><span className="block text-[15px] font-bold">{label}</span><span className="block text-[13px] text-ink-muted">{hint}</span></span>
            </span>
          </label>
        ))}
      </fieldset>

      <Button type="submit" size="lg" disabled={busy}>{busy ? 'Sharing…' : 'Share the win'}</Button>
    </form>
  );
}
