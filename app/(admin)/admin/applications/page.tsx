import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { listApplications } from '@/lib/services/admin/members';
import { ROLE_LABELS } from '@/lib/services/profile-fields';
import { Badge, Card, EmptyState } from '@/components/ui';
import { ActionButton } from '@/components/admin/action-button';
import { STATUS_LABELS, fmtDate } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Applications' };

export default async function ApplicationsPage() {
  await pageAdmin();
  const apps = await listApplications();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Applications <span className="text-base font-normal text-gray-500">({apps.length})</span></h1>
      {apps.length === 0 ? (
        <EmptyState title="No applications waiting" />
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => (
            <li key={a.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold"><Link className="underline" href={`/admin/members/${a.id}`}>{a.name}</Link></h2>
                    <p className="text-sm text-gray-600">{a.email} · applied {fmtDate(a.appliedAt)}</p>
                    {a.headline && <p className="text-sm">{a.headline}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {a.primaryRole && <Badge tone="brand">{ROLE_LABELS[a.primaryRole]}</Badge>}
                    {a.emailVerified ? <Badge tone="green">Email confirmed</Badge> : <Badge tone="yellow">Email not confirmed</Badge>}
                    {a.prospect && <Badge>Prospect: {STATUS_LABELS[a.prospect.outreachStatus]}</Badge>}
                  </div>
                </div>
                {a.applicationStatement && (
                  <blockquote className="whitespace-pre-line rounded-md bg-gray-50 p-3 text-sm text-gray-800">{a.applicationStatement}</blockquote>
                )}
                {a.prospect?.referrerName && <p className="text-xs text-gray-600">Referred by {a.prospect.referrerName}</p>}
                <div className="flex flex-wrap gap-2">
                  {a.emailVerified ? (
                    <ActionButton
                      label="Approve"
                      variant="primary"
                      path={`/api/admin/applications/${a.id}/approve`}
                      confirm={{ title: `Approve ${a.name}?`, description: 'Their account becomes active and they get a welcome email.', confirmLabel: 'Approve' }}
                      noteField="note"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">Can be approved once they confirm their email.</p>
                  )}
                  <ActionButton
                    label="Reject"
                    variant="danger"
                    path={`/api/admin/applications/${a.id}/reject`}
                    confirm={{ title: `Reject ${a.name}?`, description: 'They receive a neutral email and may apply again after 90 days.', confirmLabel: 'Reject' }}
                    noteField="note"
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
