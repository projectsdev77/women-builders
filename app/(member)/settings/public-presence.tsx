'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, Button, Notice, Textarea } from '@/components/ui';
import { api } from '@/lib/client/api';

type Presence = {
  showcaseOptIn: boolean;
  featured: boolean;
  quotes: Array<{ id: string; text: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; winId: string | null }>;
};
const STATUS = { PENDING: ['Waiting for approval', 'yellow'], APPROVED: ['On the website', 'green'], REJECTED: ['Not used', 'gray'] } as const;

/** "Public website" settings: showcase opt-in and quotes (R3 F16). */
export function PublicPresence({ initial }: { initial: Presence }) {
  const router = useRouter();
  const [optIn, setOptIn] = useState(initial.showcaseOptIn);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle(value: boolean) {
    setOptIn(value);
    const res = await api('/api/me/public-presence', { method: 'PATCH', body: { showcaseOptIn: value } });
    if (!res.ok) {
      setOptIn(!value);
      return setMsg({ tone: 'error', text: res.error.message });
    }
    setMsg({ tone: 'success', text: value ? 'Saved. The team may now feature you on the homepage.' : 'Saved. You are no longer featured on the website.' });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <label className="flex min-h-[44px] items-start gap-3">
        <input type="checkbox" className="mt-1" checked={optIn} onChange={(e) => toggle(e.target.checked)} />
        <span>
          <span className="block text-sm font-medium">Feature me on the public website</span>
          <span className="block text-xs text-gray-500">
            The team may show your name, photo, headline, role and city on the homepage. Off by default; switching it off removes you straight away.
          </span>
          {initial.featured && optIn && <Badge tone="green">You&apos;re featured right now</Badge>}
        </span>
      </label>
      <div className="space-y-2">
        <label htmlFor="quote" className="block text-sm font-medium">A quote about Women Builders (optional)</label>
        <Textarea id="quote" rows={3} maxLength={280} value={text} onChange={(e) => setText(e.target.value)} placeholder="What has the network meant for you?" />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{text.length}/280 · The team approves quotes before they appear, shown with your name and role.</p>
          <Button variant="secondary" disabled={busy || text.trim().length < 10} onClick={async () => {
            setBusy(true);
            const res = await api('/api/me/quotes', { body: { text } });
            setBusy(false);
            if (!res.ok) return setMsg({ tone: 'error', text: res.error.message });
            setText('');
            setMsg({ tone: 'success', text: 'Thank you. Your quote is waiting for approval.' });
            router.refresh();
          }}>Submit quote</Button>
        </div>
      </div>
      {initial.quotes.length > 0 && (
        <ul className="space-y-2">
          {initial.quotes.map((q) => (
            <li key={q.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md bg-gray-50 p-3 text-sm">
              <span className="min-w-0 flex-1">“{q.text}” {q.winId && <span className="text-xs text-gray-500">(from a win)</span>}</span>
              <span className="flex items-center gap-2">
                <Badge tone={STATUS[q.status][1]}>{STATUS[q.status][0]}</Badge>
                <Button variant="ghost" onClick={async () => { const res = await api(`/api/me/quotes/${q.id}`, { method: 'DELETE' }); if (res.ok) router.refresh(); }}>Withdraw</Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
