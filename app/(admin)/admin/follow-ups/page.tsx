import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { followUpQueue } from '@/lib/services/admin/prospects';
import { Badge, EmptyState } from '@/components/ui';
import { STATUS_LABELS, STATUS_TONE, fmtDay } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Follow-ups' };

export default async function FollowUpsPage({ searchParams }: { searchParams: { week?: string } }) {
  await pageAdmin();
  const week = searchParams.week === '1';
  const queue = await followUpQueue({ withinDays: week ? 7 : 0 });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1>Follow-ups</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/follow-ups" aria-current={!week ? 'page' : undefined} className={!week ? 'font-semibold underline' : 'underline'}>Due now</Link>
          <Link href="/admin/follow-ups?week=1" aria-current={week ? 'page' : undefined} className={week ? 'font-semibold underline' : 'underline'}>Next 7 days</Link>
        </div>
      </div>
      {queue.length === 0 ? (
        <EmptyState title={week ? 'Nothing due in the next 7 days' : 'All caught up'}>No follow-ups are due.</EmptyState>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {queue.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <Link href={`/admin/prospects/${f.id}`} className="font-medium underline">{f.name}</Link>
                <p className="text-xs text-gray-500">{[f.role, f.company].filter(Boolean).join(' · ')}{f.assignedAdmin ? ` · Owner: ${f.assignedAdmin.name}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge tone={STATUS_TONE[f.outreachStatus]}>{STATUS_LABELS[f.outreachStatus]}</Badge>
                <span className={f.overdue ? 'font-medium text-red-700' : f.dueToday ? 'font-medium' : 'text-gray-600'}>
                  {f.overdue ? 'Overdue: ' : f.dueToday ? 'Today: ' : ''}{fmtDay(f.nextFollowUpDate)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
