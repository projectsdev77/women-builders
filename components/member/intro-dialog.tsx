'use client';

import { useState } from 'react';
import { Avatar, Button, Notice, Textarea } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api, firstError, type ApiError } from '@/lib/client/api';

export interface IntroOptions {
  preferIntroductions: boolean;
  introducers: Array<{ id: string; name: string; headline: string | null; photoUrl: string | null }>;
  teamAvailable: boolean;
  teamRemainingThisMonth: number;
  hasOpenRequest: boolean;
  canAsk: boolean;
}

/** Ask a mutual connection, or the team, to introduce you (R3 F12). */
export function IntroDialog({
  open,
  onClose,
  onDone,
  memberId,
  memberName,
  options,
  viaTeam,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  memberId: string;
  memberName: string;
  options: IntroOptions;
  viaTeam: boolean;
}) {
  const first = memberName.split(' ')[0];
  const [introducerId, setIntroducerId] = useState(options.introducers[0]?.id ?? '');
  const [noteToIntroducer, setNoteB] = useState('');
  const [noteToTarget, setNoteC] = useState('');
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const chosen = options.introducers.find((i) => i.id === introducerId);
  const bName = viaTeam ? 'the team' : chosen?.name.split(' ')[0] ?? 'them';

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await api('/api/introductions', {
      body: { targetId: memberId, introducerId: viaTeam ? 'team' : introducerId, noteToIntroducer, noteToTarget: noteToTarget || undefined },
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone();
  }

  return (
    <Dialog open={open} onClose={onClose} title={viaTeam ? `Ask the team to introduce you to ${first}` : `Ask for an introduction to ${first}`}>
      {error && !Object.keys(fe).length && <Notice tone="error">{error.message}</Notice>}
      {viaTeam ? (
        <p className="text-sm text-gray-700">
          Nobody in your network knows {first} yet, so the Women Builders team can introduce you. You can ask the team {options.teamRemainingThisMonth} more{' '}
          {options.teamRemainingThisMonth === 1 ? 'time' : 'times'} this month.
        </p>
      ) : (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Who should introduce you?</legend>
          {options.introducers.map((i) => (
            <label key={i.id} className="flex min-h-[44px] items-center gap-3 rounded-md border border-gray-200 p-2 text-sm">
              <input type="radio" name="introducer" value={i.id} checked={introducerId === i.id} onChange={() => setIntroducerId(i.id)} />
              <Avatar name={i.name} size={32} photoUrl={i.photoUrl} />
              <span className="min-w-0"><span className="block font-medium">{i.name}</span>{i.headline && <span className="block truncate text-xs text-gray-600">{i.headline}</span>}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div>
        <label htmlFor="intro-note-b" className="block text-sm font-medium">Your note to {bName} <span className="text-red-700">*</span></label>
        <p className="text-xs text-gray-600">Why {first}, and what you hope for. Only {bName} sees this.</p>
        <Textarea id="intro-note-b" rows={4} maxLength={1000} value={noteToIntroducer} onChange={(e) => setNoteB(e.target.value)}
          aria-invalid={!!fe.noteToIntroducer} aria-describedby={fe.noteToIntroducer ? 'intro-note-b-error' : undefined} />
        <p className="text-right text-xs text-gray-500">{noteToIntroducer.length}/1000</p>
        {fe.noteToIntroducer && <p id="intro-note-b-error" className="text-xs text-red-700">{firstError(fe, 'noteToIntroducer')}</p>}
      </div>
      <div>
        <label htmlFor="intro-note-c" className="block text-sm font-medium">A note for {first} (optional)</label>
        <p className="text-xs text-gray-600">Forwarded only if {bName} makes the introduction.</p>
        <Textarea id="intro-note-c" rows={3} maxLength={500} value={noteToTarget} onChange={(e) => setNoteC(e.target.value)} />
        <p className="text-right text-xs text-gray-500">{noteToTarget.length}/500</p>
        {fe.noteToTarget && <p className="text-xs text-red-700">{firstError(fe, 'noteToTarget')}</p>}
      </div>
      <p className="text-xs text-gray-600">If nobody can make the introduction, you&apos;ll see &ldquo;No introduction was made&rdquo; after 14 days. Nobody is told who said no.</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={busy || (!viaTeam && !introducerId)} onClick={submit}>Send request</Button>
      </div>
    </Dialog>
  );
}
