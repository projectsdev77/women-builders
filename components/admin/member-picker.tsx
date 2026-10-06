'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui';
import { api } from '@/lib/client/api';

type Picked = { id: string; name: string };

/** Search active members by name and pick several (hosts, invitees). */
export function MemberPicker({ id, label, value, onChange }: { id: string; label: string; value: Picked[]; onChange: (v: Picked[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Array<Picked & { headline: string | null }>>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(async () => {
      const res = await api<{ members: Array<Picked & { headline: string | null }> }>(`/api/admin/members/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(res.data.members.filter((m) => !value.some((v) => v.id === m.id)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, value]);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((m) => (
            <li key={m.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm">
              {m.name}
              <button type="button" aria-label={`Remove ${m.name}`} className="px-1 text-gray-600" onClick={() => onChange(value.filter((v) => v.id !== m.id))}>×</button>
            </li>
          ))}
        </ul>
      )}
      <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name…" autoComplete="off" />
      {results.length > 0 && (
        <ul className="rounded-md border border-gray-200 bg-white">
          {results.map((m) => (
            <li key={m.id}>
              <button type="button" className="block min-h-[44px] w-full px-3 text-left text-sm hover:bg-gray-50" onClick={() => { onChange([...value, { id: m.id, name: m.name }]); setQ(''); }}>
                {m.name} {m.headline && <span className="text-gray-500">· {m.headline}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
