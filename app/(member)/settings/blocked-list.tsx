'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/lib/client/api';

export function BlockedList({ initial }: { initial: Array<{ id: string; name: string; blockedAt: string }> }) {
  const [list, setList] = useState(initial);
  if (list.length === 0) return <p className="text-sm text-gray-600">You haven&apos;t blocked anyone.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {list.map((b) => (
        <li key={b.id} className="flex items-center justify-between py-2">
          <span>
            <span className="text-sm font-medium">{b.name}</span>
            <span className="block text-xs text-gray-500">Blocked {new Date(b.blockedAt).toLocaleDateString()}</span>
          </span>
          <Button
            variant="secondary"
            onClick={async () => {
              const res = await api(`/api/members/${b.id}/block`, { method: 'DELETE', body: {} });
              if (res.ok) setList((l) => l.filter((x) => x.id !== b.id));
            }}
          >
            Unblock
          </Button>
        </li>
      ))}
    </ul>
  );
}
