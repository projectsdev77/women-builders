import Link from 'next/link';
import type { MemberCard } from '@/lib/services/privacy';
import { buttonClass } from '@/components/ui';

/**
 * "How to reach her" on Capital cards (designer table). The introduction itself is asked
 * from her profile; nothing here ever implies a decline.
 */
export function ReachAction({ member }: { member: MemberCard }) {
  const first = member.name.split(' ')[0];
  const mutuals = member.mutualConnections ?? 0;
  const profile = `/members/${member.id}`;
  if (member.connectionStatus === 'connected') {
    return <Link href={`/messages/${member.id}`} className={buttonClass('primary', 'md', 'flex-1')}>Message</Link>;
  }
  if (member.connectionStatus === 'pending_sent') return <span className={buttonClass('muted', 'md', 'flex-1')}>Request sent</span>;
  if (member.connectionStatus === 'pending_received') {
    return <Link href={profile} className={buttonClass('primary', 'md', 'flex-1')}>Respond to request</Link>;
  }
  if (member.preferIntroductions) {
    return mutuals > 0 ? (
      <Link href={profile} className={buttonClass('primary', 'md', 'flex-1')}>Ask for an introduction</Link>
    ) : (
      <div className="w-full space-y-2">
        <Link href={profile} className={buttonClass('secondary', 'md', 'w-full')}>Ask the team to introduce you</Link>
        <p className="text-[13px] text-ink-subtle">No one in your network knows {first} yet.</p>
      </div>
    );
  }
  return (
    <div className="flex w-full flex-wrap gap-2">
      <Link href={profile} className={buttonClass('primary', 'md', 'flex-1')}>View and connect</Link>
      {mutuals > 0 && <Link href={profile} className={buttonClass('secondary')}>Ask for an introduction</Link>}
    </div>
  );
}
