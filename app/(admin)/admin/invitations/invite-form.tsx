'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Notice } from '@/components/ui';
import { api } from '@/lib/client/api';

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 bg-white p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await api('/api/admin/invitations', { body: { email } });
        if (!res.ok) return setMsg({ tone: 'error', text: res.error.fieldErrors.email?.[0] ?? res.error.message });
        setMsg({ tone: 'success', text: `Invitation sent to ${email}.` });
        setEmail('');
        router.refresh();
      }}
    >
      <div className="min-w-[16rem] flex-1">
        <label htmlFor="invite-email" className="block text-sm font-medium">Invite by email</label>
        <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      </div>
      <Button type="submit" disabled={!email}>Send invitation</Button>
      {msg && <div className="w-full"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
    </form>
  );
}
