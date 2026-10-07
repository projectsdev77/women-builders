'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/client/api';

type Candidate = { id: string; name: string; headline: string | null; hasPhoto: boolean };

/** Pick up to 6 opted-in members, in the order they should appear (R3 F16, F26). */
export function ShowcasePicker({ candidates, selected }: { candidates: Candidate[]; selected: string[] }) {
  const router = useRouter();
  const [ids, setIds] = useState(selected.filter((id) => candidates.some((c) => c.id === id)));
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const toggle = (id: string, on: boolean) => setIds(on ? [...ids, id] : ids.filter((x) => x !== id));
  if (!candidates.length) return <p className="text-sm text-gray-600">No members have opted in yet. Members opt in from Settings → Public website.</p>;
  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {candidates.map((c) => {
          const pos = ids.indexOf(c.id);
          return (
            <li key={c.id}>
              <label className="flex min-h-[44px] items-center gap-3 text-sm">
                <input type="checkbox" checked={pos >= 0} disabled={pos < 0 && ids.length >= 6} onChange={(e) => toggle(c.id, e.target.checked)} />
                <span className="w-6 text-right text-xs text-gray-500">{pos >= 0 ? `#${pos + 1}` : ''}</span>
                <span><span className="font-medium">{c.name}</span>{c.headline && <span className="text-gray-600"> · {c.headline}</span>}{!c.hasPhoto && <span className="text-xs text-gray-500"> · no photo</span>}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-gray-600">{ids.length}/6 selected. They appear in the order you tick them.</p>
      <Button variant="secondary" onClick={async () => {
        const res = await api('/api/admin/showcase', { method: 'PUT', body: { ids } });
        setMsg(res.ok ? { tone: 'success', text: 'Showcase saved.' } : { tone: 'error', text: res.error.message });
        if (res.ok) router.refresh();
      }}>Save showcase</Button>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
    </div>
  );
}
