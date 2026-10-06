'use client';

import { useState } from 'react';
import { Button, Field, Notice, Select, Textarea } from '@/components/ui';
import { Dialog } from '@/components/ui/dialog';
import { api } from '@/lib/client/api';

const REASONS = [
  ['HARASSMENT', 'Harassment or unwanted contact'],
  ['SPAM', 'Spam or unsolicited selling'],
  ['FAKE_PROFILE', 'Fake or impersonating profile'],
  ['INAPPROPRIATE_CONTENT', 'Inappropriate content'],
  ['INAPPROPRIATE_PHOTO', 'Inappropriate profile photo'],
  ['OTHER', 'Something else'],
] as const;

export function ReportDialog({
  open,
  onClose,
  memberId,
  memberName,
  messageId,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  messageId?: string;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState('busy');
    setError(null);
    const res = await api('/api/reports', { body: { memberId, reason, details: details || undefined, messageId } });
    if (!res.ok) {
      setState('idle');
      setError(res.error.fieldErrors.reason?.[0] ?? res.error.message);
      return;
    }
    setState('done');
  }

  return (
    <Dialog open={open} onClose={onClose} title={messageId ? 'Report this message' : `Report ${memberName}`}>
      {state === 'done' ? (
        <div className="space-y-4">
          <Notice tone="success">Thank you. Our team will review your report. {memberName} won&apos;t be told who reported them.</Notice>
          <p className="text-sm text-gray-600">You can also block {memberName} from their profile so they can&apos;t see or contact you.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Reports are confidential and reviewed by the Women Builders team against our <a href="/charter" target="_blank" className="underline">community charter</a>.</p>
          {error && <Notice tone="error">{error}</Notice>}
          <Field id="report-reason" label="What's wrong?" required>
            <Select id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason…</option>
              {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field id="report-details" label="Details (optional)" hint="Up to 2,000 characters">
            <Textarea id="report-details" rows={4} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="danger" disabled={!reason || state === 'busy'} onClick={submit}>Submit report</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
