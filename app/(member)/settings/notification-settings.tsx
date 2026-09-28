'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';

type Prefs = { connectionRequest: boolean; connectionAccepted: boolean; newMessage: boolean };
const LABELS: Array<[keyof Prefs, string, string]> = [
  ['connectionRequest', 'Connection requests', 'When someone asks to connect with you'],
  ['connectionAccepted', 'Accepted requests', 'When someone accepts your request'],
  ['newMessage', 'New messages', 'At most one email per conversation every 30 minutes'],
];

export function NotificationSettings({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);

  async function toggle(key: keyof Prefs, value: boolean) {
    const previous = prefs;
    setPrefs({ ...prefs, [key]: value });
    const res = await api<Prefs>('/api/notifications/preferences', { method: 'PATCH', body: { [key]: value } });
    if (!res.ok) {
      setPrefs(previous);
      setStatus(res.error.message);
    } else setStatus('Saved');
  }

  return (
    <div className="space-y-2">
      {LABELS.map(([key, label, hint]) => (
        <label key={key} className="flex min-h-[44px] items-start gap-3">
          <input type="checkbox" className="mt-1" checked={prefs[key]} onChange={(e) => toggle(key, e.target.checked)} />
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="block text-xs text-gray-500">{hint}</span>
          </span>
        </label>
      ))}
      <p className="text-sm text-gray-500" aria-live="polite">{status}</p>
    </div>
  );
}
