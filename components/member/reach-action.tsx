import Link from 'next/link';
import type { MemberCard } from '@/lib/services/privacy';

const btn = 'inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-medium';

/** "How to reach her" on Capital cards (R3 F9). Introductions are added in the next step. */
export function ReachAction({ member }: { member: MemberCard }) {
  if (member.connectionStatus === 'connected') {
    return <Link href={`/messages/${member.id}`} className={`${btn} bg-brand-600 text-white`}>Message</Link>;
  }
  if (member.connectionStatus === 'pending_sent') return <span className="text-sm text-gray-600">Request sent</span>;
  return (
    <Link href={`/members/${member.id}`} className={`${btn} border border-gray-300 bg-white`}>
      {member.connectionStatus === 'pending_received' ? 'Respond to request' : 'View and connect'}
    </Link>
  );
}
