import Link from 'next/link';
import type { MemberCard } from '@/lib/services/privacy';

const btn = 'inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-medium';

/** "How to reach her" on Capital cards (R3 F9). The introduction itself is asked from her profile. */
export function ReachAction({ member }: { member: MemberCard }) {
  const first = member.name.split(' ')[0];
  const mutuals = member.mutualConnections ?? 0;
  if (member.connectionStatus === 'connected') {
    return <Link href={`/messages/${member.id}`} className={`${btn} bg-brand-600 text-white`}>Message</Link>;
  }
  if (member.connectionStatus === 'pending_sent') return <span className="text-sm text-gray-600">Request sent</span>;
  if (member.connectionStatus === 'pending_received') {
    return <Link href={`/members/${member.id}`} className={`${btn} bg-brand-600 text-white`}>Respond to request</Link>;
  }
  if (member.preferIntroductions) {
    return mutuals > 0 ? (
      <Link href={`/members/${member.id}`} className={`${btn} bg-brand-600 text-white`}>Ask for an introduction</Link>
    ) : (
      <p className="text-xs text-gray-600">
        Prefers introductions. No one in your network knows {first} yet.{' '}
        <Link href={`/members/${member.id}`} className="underline">Ask the team</Link>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/members/${member.id}`} className={`${btn} border border-gray-300 bg-white`}>View and connect</Link>
      {mutuals > 0 && <Link href={`/members/${member.id}`} className={`${btn} text-brand-700 underline`}>Ask for an introduction</Link>}
    </div>
  );
}
