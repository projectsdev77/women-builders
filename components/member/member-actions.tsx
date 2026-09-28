'use client';

// Placeholder until Step 5 (connections) lands.
import { Badge } from '@/components/ui';

export function MemberActions({
  status,
}: {
  memberId: string;
  memberName: string;
  status: 'none' | 'pending_sent' | 'pending_received' | 'connected';
  canRequest: boolean;
}) {
  const label = { none: 'Not connected', pending_sent: 'Request pending', pending_received: 'Wants to connect', connected: 'Connected' }[status];
  return <Badge>{label}</Badge>;
}
