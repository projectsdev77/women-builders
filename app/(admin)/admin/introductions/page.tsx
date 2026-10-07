import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { listTeamIntroductions, TEAM_LABEL } from '@/lib/services/introductions';
import { Badge, Card, EmptyState } from '@/components/ui';
import { ActionButton } from '@/components/admin/action-button';
import { fmtDate } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Introduction requests' };

const STATUS: Record<string, string> = {
  FORWARDED: 'Introduced, waiting for a reply',
  ACCEPTED: 'Connected',
  DECLINED_BY_INTRODUCER: 'Passed',
  DECLINED_BY_TARGET: 'Introduced, not now',
  EXPIRED: 'Expired',
  CANCELLED: 'Withdrawn',
};

/** "Ask the team" introductions (R3 F12): members with no mutual connection ask the team. */
export default async function TeamIntroductionsPage({ searchParams }: { searchParams: { status?: string } }) {
  await pageAdmin();
  const status = searchParams.status === 'HANDLED' ? 'HANDLED' : 'ASKED';
  const items = await listTeamIntroductions(status);
  return (
    <div className="space-y-4">
      <div>
        <h1>Introduction requests</h1>
        <p className="text-sm text-gray-600">
          Members with no mutual connection can ask the team to introduce them (2 a month). If you introduce, the member sees
          &ldquo;{TEAM_LABEL} would like to introduce you to…&rdquo;. Passing is silent.
        </p>
      </div>
      <nav aria-label="Status" className="flex gap-3 text-sm">
        <Link href="/admin/introductions" aria-current={status === 'ASKED' ? 'page' : undefined} className={status === 'ASKED' ? 'font-semibold underline' : 'underline'}>Waiting</Link>
        <Link href="/admin/introductions?status=HANDLED" aria-current={status === 'HANDLED' ? 'page' : undefined} className={status === 'HANDLED' ? 'font-semibold underline' : 'underline'}>Handled</Link>
      </nav>
      {items.length === 0 ? <EmptyState title={status === 'ASKED' ? 'No introduction requests waiting' : 'Nothing handled yet'} /> : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <Link className="font-semibold underline" href={`/admin/members/${i.requester.id}`}>{i.requester.name}</Link> would like to meet{' '}
                    <Link className="font-semibold underline" href={`/admin/members/${i.target.id}`}>{i.target.name}</Link>
                  </p>
                  {status === 'ASKED' ? <Badge tone="yellow">Answer by {fmtDate(i.dueAt)}</Badge> : <Badge>{STATUS[i.status] ?? i.status}</Badge>}
                </div>
                <p className="text-sm text-gray-600">{[i.requester.headline, i.target.headline].filter(Boolean).join('  →  ')}</p>
                <blockquote className="whitespace-pre-line rounded-md bg-gray-50 p-3 text-sm"><span className="block text-xs text-gray-500">Note to the team</span>{i.noteToIntroducer}</blockquote>
                {i.noteToTarget && <blockquote className="whitespace-pre-line rounded-md bg-gray-50 p-3 text-sm"><span className="block text-xs text-gray-500">Note for {i.target.name.split(' ')[0]}</span>{i.noteToTarget}</blockquote>}
                {i.introducerNote && <p className="text-sm"><span className="text-gray-600">Team note:</span> {i.introducerNote}</p>}
                {status === 'ASKED' && (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="Introduce" variant="primary" path={`/api/admin/introductions/${i.id}/introduce`} noteField="note"
                      noteLabel={`Note to ${i.target.name.split(' ')[0]} (optional, she sees this)`}
                      confirm={{ title: `Introduce ${i.requester.name} to ${i.target.name}`, description: `${i.target.name.split(' ')[0]} gets an email and decides within 14 days.`, confirmLabel: 'Send introduction' }} />
                    <ActionButton label="Pass" path={`/api/admin/introductions/${i.id}/pass`}
                      confirm={{ title: 'Pass on this introduction', description: 'Nobody is told. After 14 days the member sees "No introduction was made".', confirmLabel: 'Pass' }} />
                  </div>
                )}
                <p className="text-xs text-gray-500">Asked {fmtDate(i.createdAt)}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
