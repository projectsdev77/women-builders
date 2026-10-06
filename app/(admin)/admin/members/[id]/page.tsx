import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageAdmin } from '@/lib/auth/guards';
import { getMemberDetail } from '@/lib/services/admin/members';
import { AppError } from '@/lib/errors';
import { ROLE_LABELS } from '@/lib/services/profile-fields';
import { Avatar, Badge, Card } from '@/components/ui';
import { formatLocation } from '@/lib/countries';
import { photoUrl } from '@/lib/services/photo-url';
import { formatThousands } from '@/components/profile/member-profile';
import { ActionButton } from '@/components/admin/action-button';
import { ACCOUNT_TONE, REPORT_REASON_LABELS, STATUS_LABELS, fmtDate } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Member details' };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="col-span-2 whitespace-pre-line">{value || '—'}</dd>
    </div>
  );
}

export default async function AdminMemberPage({ params }: { params: { id: string } }) {
  const admin = await pageAdmin();
  const detail = await getMemberDetail(params.id).catch((e) => {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  });
  const { user, stats, history } = detail;
  const p = user.profile;
  const self = admin.id === user.id;
  return (
    <div className="space-y-4">
      <Link href="/admin/members" className="text-sm underline">← Members</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <p className="text-gray-600">{user.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone={ACCOUNT_TONE[user.accountStatus]}>{user.accountStatus.toLowerCase()}{user.deactivatedBy ? ` by ${user.deactivatedBy.toLowerCase()}` : ''}</Badge>
            {user.isAdmin && <Badge tone="brand">Admin</Badge>}
            {!user.emailVerifiedAt && <Badge tone="yellow">Email not confirmed</Badge>}
          </div>
        </div>
        {!self && (
          <div className="flex flex-wrap gap-2">
            {user.accountStatus === 'ACTIVE' && (
              <ActionButton label="Deactivate" variant="danger" path={`/api/admin/members/${user.id}/deactivate`} noteField="reason" noteLabel="Reason (internal)"
                confirm={{ title: `Deactivate ${user.name}?`, description: 'They are signed out everywhere immediately, hidden from members, and emailed. Their data is kept and you can reactivate later.' }} />
            )}
            {user.accountStatus === 'DEACTIVATED' && (
              <ActionButton label="Reactivate" path={`/api/admin/members/${user.id}/reactivate`}
                confirm={{ title: `Reactivate ${user.name}?`, description: 'They can log in and appear in the directory again.' }} />
            )}
            {user.accountStatus === 'ACTIVE' && (
              <ActionButton
                label={user.isAdmin ? 'Remove admin access' : 'Make admin'}
                path={`/api/admin/members/${user.id}/admin`}
                method="PUT"
                body={{ isAdmin: !user.isAdmin }}
                confirm={{ title: user.isAdmin ? 'Remove admin access?' : 'Grant admin access?', description: user.isAdmin ? 'They lose access to the admin area immediately.' : 'They can manage members, invitation requests, outreach and reports.' }}
              />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {p && (
            <div className="mb-4 flex items-center gap-4">
              <Avatar name={user.name} size={72} photoUrl={photoUrl(user.id, p, 512)} />
              {p.photoKey && (
                <ActionButton label="Remove photo" variant="ghost" method="DELETE" path={`/api/admin/members/${user.id}/photo`}
                  confirm={{ title: 'Remove this photo?', description: "The member is emailed that it didn't meet the community charter and can upload another." }} />
              )}
            </div>
          )}
          <h2 className="mb-2 font-semibold">Profile <span className="text-xs font-normal text-gray-500">(admins see all fields, including hidden ones)</span></h2>
          {p ? (
            <dl className="divide-y divide-gray-100">
              <Row label="Roles" value={[p.primaryRole, ...p.secondaryRoles].map((r) => ROLE_LABELS[r]).join(', ')} />
              <Row label="Headline" value={p.headline} />
              <Row label="Location" value={formatLocation(p.city, p.country)} />
              <Row label="Open to" value={p.openTo.join(', ')} />
              <Row label="Background" value={p.professionalBackground} />
              <Row label="Current focus" value={p.currentFocus} />
              <Row label="Needs" value={p.needs} />
              <Row label="Offers" value={p.offerings} />
              <Row label="Expertise" value={p.expertiseAreas.join(', ')} />
              <Row label="Company" value={[p.companyName, p.companyStage, p.industry].filter(Boolean).join(' · ')} />
              <Row label="Funding" value={[p.fundingStatus, p.raiseAmount != null ? formatThousands(p.raiseAmount) : null].filter(Boolean).join(' · ')} />
              <Row label="Investor" value={[p.investorType, p.firmName, p.leadsRounds, p.currentlyInvesting == null ? null : p.currentlyInvesting ? 'Currently investing' : 'Paused', p.lastCheckMonth ? `Last check ${p.lastCheckMonth}` : null].filter(Boolean).join(' · ')} />
              <Row label="LinkedIn" value={p.linkedInUrl && <a className="underline" href={p.linkedInUrl} target="_blank" rel="noopener noreferrer">{p.linkedInUrl}</a>} />
              <Row label="Hidden from non-connections" value={p.hiddenFields.join(', ')} />
              <Row label="Completeness" value={`${p.completenessScore}%`} />
            </dl>
          ) : (
            <p className="text-sm text-gray-600">No member profile (admin-only account).</p>
          )}
          {user.applicationStatement && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-600">Application</h3>
              <p className="whitespace-pre-line text-sm">{user.applicationStatement}</p>
            </div>
          )}
          {user.reviewNote && <p className="mt-2 text-sm text-gray-600">Review note: {user.reviewNote}</p>}
        </Card>
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-semibold">Activity</h2>
            <dl>
              <Row label="Applied" value={fmtDate(user.createdAt)} />
              <Row label="Approved" value={fmtDate(user.approvedAt)} />
              <Row label="Last active" value={fmtDate(user.lastActiveAt)} />
              <Row label="Connections" value={stats.connections} />
              <Row label="Messages sent" value={stats.messagesSent} />
              <Row label="Requests sent" value={stats.requestsSent} />
              {user.potentialMember && (
                <Row label="Prospect record" value={<Link className="underline" href={`/admin/prospects/${user.potentialMember.id}`}>{STATUS_LABELS[user.potentialMember.outreachStatus]}</Link>} />
              )}
            </dl>
          </Card>
          <Card>
            <h2 className="mb-2 font-semibold">Reports about this member</h2>
            {user.reportsReceived.length === 0 ? <p className="text-sm text-gray-600">None.</p> : (
              <ul className="space-y-2 text-sm">
                {user.reportsReceived.map((r) => (
                  <li key={r.id}>
                    <Badge tone={r.status === 'OPEN' ? 'red' : 'gray'}>{r.status.toLowerCase()}</Badge> {REPORT_REASON_LABELS[r.reason]} · {fmtDate(r.createdAt)} by {r.reporter?.name ?? 'a deleted account'}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-2 font-semibold">Admin history</h2>
            {history.length === 0 ? <p className="text-sm text-gray-600">No admin actions yet.</p> : (
              <ul className="space-y-1 text-sm">
                {history.map((h) => <li key={h.id}>{fmtDate(h.createdAt)}: {h.action} by {h.actor?.name ?? 'system'}</li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
