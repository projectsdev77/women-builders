import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageAdmin } from '@/lib/auth/guards';
import { getProspect } from '@/lib/services/admin/prospects';
import { listAdmins } from '@/lib/services/admin/members';
import { formatDateOnly, todayInAppTz } from '@/lib/services/admin/dates';
import { AppError } from '@/lib/errors';
import { Badge, Card } from '@/components/ui';
import { STATUS_LABELS, STATUS_TONE, fmtDate, fmtDay } from '@/components/admin/labels';
import { ActionButton } from '@/components/admin/action-button';
import { ProspectEditor, OutreachForm, NoteForm } from './forms';

export const metadata: Metadata = { title: 'Potential member' };

export default async function ProspectPage({ params }: { params: { id: string } }) {
  await pageAdmin();
  const [p, admins] = await Promise.all([
    getProspect(params.id).catch((e) => {
      if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
      throw e;
    }),
    listAdmins(),
  ]);
  const dnc = p.outreachStatus === 'DO_NOT_CONTACT';
  const openInvite = p.invitations.find((i) => !i.usedAt && !i.revokedAt && i.expiresAt > new Date());

  // One chronological timeline: status changes, outreach attempts, notes.
  type Item = { at: Date; kind: string; text: string; by: string | null };
  const timeline: Item[] = [
    ...p.statusChanges.map((s) => ({ at: s.createdAt, kind: 'Status', text: `${s.fromStatus ? `${STATUS_LABELS[s.fromStatus]} → ` : ''}${STATUS_LABELS[s.toStatus]}`, by: s.changedById })),
    ...p.attempts.map((a) => ({ at: a.attemptDate, kind: `Outreach · ${a.method}`, text: a.outcome ?? '', by: a.createdById })),
    ...p.notes.map((n) => ({ at: n.createdAt, kind: 'Note', text: n.content, by: n.createdById })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-4">
      <Link href="/admin/prospects" className="text-sm underline">← Potential members</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="text-gray-600">{[p.role, p.company].filter(Boolean).join(' at ') || 'No role or company yet'}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={STATUS_TONE[p.outreachStatus]}>{STATUS_LABELS[p.outreachStatus]}</Badge>
            {p.archivedAt && <Badge>Archived</Badge>}
            {p.user && <Link href={`/admin/members/${p.user.id}`}><Badge tone="green">Member account: {p.user.accountStatus.toLowerCase()}</Badge></Link>}
          </div>
        </div>
        {!dnc && !p.user && p.email && (
          openInvite ? (
            <p className="text-sm text-gray-600">Invitation sent {fmtDate(openInvite.createdAt)}, expires {fmtDate(openInvite.expiresAt)}</p>
          ) : (
            <ActionButton label="Send invitation" variant="primary" path="/api/admin/invitations" body={{ potentialMemberId: p.id }}
              confirm={{ title: `Invite ${p.name}?`, description: `We'll email ${p.email} a link to join. It skips the approval queue and expires in 14 days.`, confirmLabel: 'Send invitation' }} />
          )
        )}
      </div>
      {dnc && <p role="status" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">This person asked not to be contacted. The record is kept permanently so they are never contacted again.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {!dnc && (
            <Card>
              <h2 className="mb-3 font-semibold">Log outreach</h2>
              <OutreachForm key={`o-${p.attempts.length}-${p.statusChanges.length}`} prospectId={p.id} today={formatDateOnly(todayInAppTz())!} currentStatus={p.outreachStatus} />
            </Card>
          )}
          <Card>
            <h2 className="mb-3 font-semibold">History</h2>
            {timeline.length === 0 ? <p className="text-sm text-gray-600">No activity yet.</p> : (
              <ol className="space-y-3 border-l-2 border-gray-200 pl-4">
                {timeline.map((t, i) => (
                  <li key={i} className="text-sm">
                    <p className="text-xs text-gray-500">{fmtDate(t.at)} · {t.kind}{t.by ? ` · ${p.adminNames[t.by] ?? 'Former admin'}` : ''}</p>
                    {t.text && <p className="whitespace-pre-line">{t.text}</p>}
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4"><NoteForm prospectId={p.id} /></div>
          </Card>
        </div>
        <Card>
          <h2 className="mb-3 font-semibold">Details</h2>
          <p className="mb-3 text-xs text-gray-500">Next follow-up: {fmtDay(formatDateOnly(p.nextFollowUpDate))}</p>
          <ProspectEditor
            // Remount after outreach/status changes so the form never holds a stale status.
            key={`e-${p.attempts.length}-${p.statusChanges.length}`}
            admins={admins}
            prospect={{
              id: p.id,
              name: p.name,
              email: p.email ?? '',
              linkedInUrl: p.linkedInUrl ?? '',
              company: p.company ?? '',
              role: p.role ?? '',
              discoverySource: p.discoverySource ?? '',
              referrerName: p.referrerName ?? '',
              referrerEmail: p.referrerEmail ?? '',
              lawfulBasisNote: p.lawfulBasisNote ?? '',
              nextFollowUpDate: formatDateOnly(p.nextFollowUpDate) ?? '',
              assignedAdminId: p.assignedAdminId ?? '',
              outreachStatus: p.outreachStatus,
              archived: !!p.archivedAt,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
