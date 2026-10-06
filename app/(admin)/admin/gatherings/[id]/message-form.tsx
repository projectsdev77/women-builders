'use client';

import { useState } from 'react';
import { Button, Input, Notice, Textarea } from '@/components/ui';
import { api } from '@/lib/client/api';

export function MessageAttendees({ gatheringId }: { gatheringId: string }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-2" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      const res = await api<{ sent: number }>(`/api/admin/gatherings/${gatheringId}/message`, { body: { subject, body } });
      setBusy(false);
      if (!res.ok) return setStatus({ tone: 'error', text: res.error.message });
      setStatus({ tone: 'success', text: `Sent to ${res.data.sent} confirmed ${res.data.sent === 1 ? 'guest' : 'guests'}.` });
      setSubject('');
      setBody('');
    }}>
      {status && <Notice tone={status.tone}>{status.text}</Notice>}
      <label htmlFor="msg-subject" className="block text-sm font-medium">Subject</label>
      <Input id="msg-subject" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Parking details" />
      <label htmlFor="msg-body" className="block text-sm font-medium">Message</label>
      <Textarea id="msg-body" rows={4} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" variant="secondary" disabled={busy || !subject || !body}>Email confirmed guests</Button>
    </form>
  );
}
