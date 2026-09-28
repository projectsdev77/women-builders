import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { listInvitations } from '@/lib/services/admin/invitations';
import { Badge, EmptyState } from '@/components/ui';
import { ActionButton } from '@/components/admin/action-button';
import { fmtDate } from '@/components/admin/labels';
import { InviteForm } from './invite-form';

export const metadata: Metadata = { title: 'Invitations' };

const TONE = { pending: 'yellow', accepted: 'green', revoked: 'gray', expired: 'gray' } as const;

export default async function InvitationsPage() {
  await pageAdmin();
  const invitations = await listInvitations();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Invitations</h1>
      <p className="text-sm text-gray-600">Invited people skip the approval queue. Links expire after 14 days and work only for the invited email.</p>
      <InviteForm />
      {invitations.length === 0 ? <EmptyState title="No invitations sent yet" /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">Email</th><th className="p-3">Status</th><th className="p-3">Sent</th><th className="p-3">Expires</th><th className="p-3">By</th><th className="p-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {invitations.map((i) => (
                <tr key={i.id}>
                  <td className="p-3">{i.email}{i.prospect && <div className="text-xs"><Link className="underline" href={`/admin/prospects/${i.prospect.id}`}>{i.prospect.name}</Link></div>}</td>
                  <td className="p-3"><Badge tone={TONE[i.status as keyof typeof TONE]}>{i.status}</Badge></td>
                  <td className="p-3">{fmtDate(i.createdAt)}</td>
                  <td className="p-3">{fmtDate(i.expiresAt)}</td>
                  <td className="p-3">{i.invitedBy ?? '—'}</td>
                  <td className="p-3">{i.status === 'pending' && <ActionButton label="Revoke" variant="ghost" method="DELETE" path={`/api/admin/invitations/${i.id}`} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
