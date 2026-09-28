'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/client/api';

export function PendingActions({ needsVerification }: { needsVerification: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function resend() {
    const res = await api('/api/auth/resend-verification', { body: {} });
    setMessage(res.ok ? { tone: 'success', text: 'We sent a new confirmation link.' } : { tone: 'error', text: res.error.message });
  }

  async function logout() {
    await api('/api/auth/logout', { body: {} });
    router.replace('/');
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="flex flex-wrap gap-3">
        {needsVerification && <Button onClick={resend}>Resend confirmation email</Button>}
        <Button variant="secondary" onClick={logout}>Log out</Button>
      </div>
    </div>
  );
}
