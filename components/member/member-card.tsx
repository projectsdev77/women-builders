import Link from 'next/link';
import type { ReactNode } from 'react';
import type { MemberCard as Card } from '@/lib/services/privacy';
import { Avatar, Badge } from '@/components/ui';
import { RoleBadges } from '@/components/profile/member-profile';

const STATUS_LABEL = {
  none: null,
  pending_sent: 'Request sent',
  pending_received: 'Wants to connect',
  connected: 'Connected',
} as const;

export function MemberCard({ member, children, footer }: { member: Card; children?: ReactNode; footer?: ReactNode }) {
  const status = STATUS_LABEL[member.connectionStatus];
  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar name={member.name} size={48} photoUrl={member.photoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            <Link href={`/members/${member.id}`} className="hover:underline">
              {member.name}
            </Link>
          </h3>
          {member.headline && <p className="line-clamp-2 text-sm text-gray-700">{member.headline}</p>}
          <p className="truncate text-xs text-gray-500">
            {[member.companyName, member.location].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <RoleBadges primary={member.primaryRole} secondary={member.secondaryRoles} />
        {member.expertiseAreas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {member.expertiseAreas.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        )}
        {status && <Badge tone={member.connectionStatus === 'connected' ? 'green' : 'yellow'}>{status}</Badge>}
        {!!member.mutualConnections && member.connectionStatus !== 'connected' && (
          <p className="text-xs text-gray-600">
            {member.mutualConnections} mutual connection{member.mutualConnections === 1 ? '' : 's'}
          </p>
        )}
      </div>
      {children && <div className="mt-3 text-sm text-gray-700">{children}</div>}
      {footer && <div className="mt-auto flex gap-2 pt-3">{footer}</div>}
    </article>
  );
}
