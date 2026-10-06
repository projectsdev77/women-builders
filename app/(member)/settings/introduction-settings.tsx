'use client';

import { useState } from 'react';
import { api } from '@/lib/client/api';

type Settings = { allowIntroRequests: boolean; preferIntroductions: boolean };
const LABELS: Array<[keyof Settings, string, string]> = [
  ['allowIntroRequests', 'Let members ask me for introductions', 'When off, you are never listed as someone who can introduce two members.'],
  ['preferIntroductions', 'Prefer introductions', 'Nobody can send you a direct connection request. Members ask a mutual connection, or the team, to introduce them. Requests already pending are not affected.'],
];

export function IntroductionSettings({ initial }: { initial: Settings }) {
  const [settings, setSettings] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);

  async function toggle(key: keyof Settings, value: boolean) {
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    const res = await api<Settings>('/api/me/introduction-settings', { method: 'PATCH', body: { [key]: value } });
    if (!res.ok) {
      setSettings(previous);
      setStatus(res.error.message);
    } else setStatus('Saved');
  }

  return (
    <div className="space-y-2">
      {LABELS.map(([key, label, hint]) => (
        <label key={key} className="flex min-h-[44px] items-start gap-3">
          <input type="checkbox" className="mt-1" checked={settings[key]} onChange={(e) => toggle(key, e.target.checked)} />
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
