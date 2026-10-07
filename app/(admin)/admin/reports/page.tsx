import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { listReports } from '@/lib/services/admin/reports';
import { Badge, Card, EmptyState } from '@/components/ui';
import { ActionButton } from '@/components/admin/action-button';
import { REPORT_REASON_LABELS, fmtDate } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Reports' };
const TABS = ['OPEN', 'RESOLVED', 'DISMISSED', 'ALL'] as const;

export default async function ReportsPage({ searchParams }: { searchParams: { status?: string } }) {
  await pageAdmin();
  const status = (TABS as readonly string[]).includes(searchParams.status ?? '') ? (searchParams.status as (typeof TABS)[number]) : 'OPEN';
  const reports = await listReports(status);
  return (
    <div className="space-y-4">
      <h1>Reports</h1>
      <nav aria-label="Report status" className="flex gap-3 text-sm">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/reports?status=${t}`} aria-current={t === status ? 'page' : undefined} className={t === status ? 'font-semibold underline' : 'underline'}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>
      {reports.length === 0 ? <EmptyState title={status === 'OPEN' ? 'No open reports' : 'Nothing here'} /> : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.status === 'OPEN' ? 'red' : 'gray'}>{r.status.toLowerCase()}</Badge>
                    <strong>{REPORT_REASON_LABELS[r.reason]}</strong>
                    <span className="text-sm text-gray-600">· {fmtDate(r.createdAt)}</span>
                  </div>
                  <span className="text-sm">
                    {r.reportedUser.id ? <Link className="underline" href={`/admin/members/${r.reportedUser.id}`}>{r.reportedUser.name}</Link> : r.reportedUser.name}
                    {r.reportedUser.totalReports > 1 && <Badge tone="red">{r.reportedUser.totalReports} reports total</Badge>}
                    {r.reportedUser.accountStatus && r.reportedUser.accountStatus !== 'ACTIVE' && <Badge>{r.reportedUser.accountStatus.toLowerCase()}</Badge>}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Reported by {r.reporter ? <Link className="underline" href={`/admin/members/${r.reporter.id}`}>{r.reporter.name}</Link> : 'a deleted account'}</p>
                {r.details && <p className="whitespace-pre-line text-sm">{r.details}</p>}
                {r.messageExcerpt && <blockquote className="rounded-md bg-gray-50 p-2 text-sm italic">Reported message: “{r.messageExcerpt}”</blockquote>}
                {r.status === 'OPEN' ? (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="Mark resolved" variant="primary" path={`/api/admin/reports/${r.id}/resolve`} body={{ status: 'RESOLVED' }} noteField="note"
                      confirm={{ title: 'Resolve report', description: 'Record what action was taken (for example: warned the member, or deactivated them from their member page).' }} />
                    <ActionButton label="Dismiss" path={`/api/admin/reports/${r.id}/resolve`} body={{ status: 'DISMISSED' }} noteField="note"
                      confirm={{ title: 'Dismiss report', description: 'Use this when no action is needed.' }} />
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">{r.status === 'RESOLVED' ? 'Resolved' : 'Dismissed'} by {r.resolvedBy ?? '—'} on {fmtDate(r.resolvedAt)}{r.resolutionNote ? `: ${r.resolutionNote}` : ''}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
