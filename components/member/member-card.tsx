import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, CornerUpRight } from 'lucide-react';
import type { MemberCard as Card } from '@/lib/services/privacy';
import type { Reason } from '@/lib/services/relevance';
import { Avatar, cx } from '@/components/ui';
import { RoleBadges } from '@/components/profile/member-profile';
import { ReasonRows } from './reasons';

export const pill = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-bold';

/** Rows of "Firm / Stages / Checks" used by Capital cards: a 72px label column. */
export function DetailRows({ rows }: { rows: Array<[string, ReactNode]> }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!shown.length) return null;
  return (
    <dl className="space-y-1 text-[14px]">
      {shown.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[72px_1fr] gap-2">
          <dt className="text-ink-subtle">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The member card (designer: one component with slots, used in Home, Discover, For you,
 * Capital and Connections): header, role badges and tags, status pills, optional detail rows,
 * a "reasons" well and a footer with the primary action.
 */
export function MemberCard({
  member,
  reasons,
  reasonLimit = 1,
  badges,
  details,
  children,
  footer,
}: {
  member: Card;
  reasons?: Reason[];
  reasonLimit?: number;
  /** Extra status pills (Capital: currently investing, last check, funding status). */
  badges?: ReactNode;
  details?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const connected = member.connectionStatus === 'connected';
  const tags = member.expertiseAreas.slice(0, 3);
  return (
    <article className="flex h-full flex-col gap-3.5 rounded-card border border-line-soft bg-white p-5 transition-shadow duration-150 hover:shadow-lift">
      <div className="flex gap-3.5">
        <Avatar name={member.name} size={56} photoUrl={member.photoUrl} role={member.primaryRole} ring />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-sans text-[18px] font-bold leading-tight">
            <Link href={`/members/${member.id}`} className="hover:underline">{member.name}</Link>
          </h3>
          {member.headline && <p className="line-clamp-2 text-[15px] leading-snug text-ink-muted">{member.headline}</p>}
          {(member.location || member.companyName) && (
            <p className="mt-0.5 truncate text-[13px] text-ink-subtle">{[member.companyName, member.location].filter(Boolean).join(' · ')}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <RoleBadges primary={member.primaryRole} secondary={member.secondaryRoles} />
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((t) => <li key={t} className="rounded-chip bg-cream px-2.5 py-1 text-[13px]">{t}</li>)}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 empty:hidden">
        {connected && <span className={cx(pill, 'bg-success-bg text-success')}><Check size={13} strokeWidth={2.5} /> Connected</span>}
        {member.connectionStatus === 'pending_received' && <span className={cx(pill, 'bg-warning-bg text-warning')}>Wants to connect</span>}
        {member.preferIntroductions && !connected && (
          <span className={cx(pill, 'border border-dashed border-forest bg-white')}><CornerUpRight size={13} strokeWidth={2.25} /> Prefers introductions</span>
        )}
        {!!member.mutualConnections && !connected && (
          <span className={cx(pill, 'bg-cream')}>{member.mutualConnections} mutual connection{member.mutualConnections === 1 ? '' : 's'}</span>
        )}
        {badges}
      </div>
      {details}
      {reasons && <ReasonRows reasons={reasons} limit={reasonLimit} />}
      {children && <div className="text-[14px] text-ink-muted">{children}</div>}
      {footer && <div className="mt-auto flex flex-wrap gap-2 pt-1">{footer}</div>}
    </article>
  );
}
