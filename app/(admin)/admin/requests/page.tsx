import type { Metadata } from 'next';
import Link from 'next/link';
import { pageStaff } from '@/lib/auth/guards';
import { getSiteSettings } from '@/lib/services/site-settings';
import { VoteButtons } from './vote-buttons';
import { listInviteRequests, REQUEST_ANSWER_DAYS } from '@/lib/services/invite-requests';
import { formatLocation } from '@/lib/countries';
import { Badge, Card, EmptyState } from '@/components/ui';
import { ActionButton } from '@/components/admin/action-button';
import { STATUS_LABELS, fmtDate } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Invitation requests' };
const TABS = ['OPEN', 'WAITLIST', 'INVITED', 'DECLINED', 'SPAM', 'ALL'] as const;
const ROLE: Record<string, string> = { FOUNDER: 'Founder', OPERATOR: 'Operator', INVESTOR: 'Investor', BUILDER: 'Builder' };

export default async function RequestsPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await pageStaff();
  const status = (TABS as readonly string[]).includes(searchParams.status ?? '') ? (searchParams.status as (typeof TABS)[number]) : 'OPEN';
  const [requests, settings] = await Promise.all([listInviteRequests(status, { id: user.id, isAdmin: user.isAdmin }), getSiteSettings()]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Invitation requests</h1>
        <p className="text-sm text-gray-600">
          Every request gets an answer within {REQUEST_ANSWER_DAYS} days. Oldest first. {settings.requiredApprovals} {settings.requiredApprovals === 1 ? 'vote decides' : 'matching votes decide'} automatically
          {user.isAdmin ? '; any admin can decide directly.' : '.'}
        </p>
        {!settings.applicationsOpen && (
          <p className="mt-1 text-sm font-medium text-yellow-800">Applications are closed: new requests join the waitlist{settings.nextReview ? ` (${settings.nextReview})` : ''}.</p>
        )}
        {!user.isAdmin && <p className="mt-1 text-sm text-gray-600">You&apos;re a member reviewer: you see the tally and your own vote. Admins see every vote.</p>}
      </div>
      <nav aria-label="Request status" className="flex flex-wrap gap-3 text-sm">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/requests?status=${t}`} aria-current={t === status ? 'page' : undefined} className={t === status ? 'font-semibold underline' : 'underline'}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>
      {requests.length === 0 ? <EmptyState title={status === 'OPEN' ? 'No requests waiting' : 'Nothing here'} /> : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const pm = r.potentialMember;
            return (
              <li key={r.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{r.name} <span className="font-normal text-gray-600">· {ROLE[r.primaryRole]}</span></p>
                      <p className="text-sm text-gray-600">
                        {r.email} · {formatLocation(r.city, r.country) || 'No location'}
                        {r.linkedInUrl && <> · <a className="underline" href={r.linkedInUrl} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {r.needsDecision && <Badge tone="red">Needs decision</Badge>}
                      {r.status === 'OPEN' && (r.tally.approvals > 0 || r.tally.declines > 0) && (
                        <Badge>{r.tally.approvals} approve · {r.tally.declines} decline · {r.tally.required} needed</Badge>
                      )}
                      {r.status === 'OPEN' && r.waitlisted ? (
                        <Badge>Waitlist</Badge>
                      ) : r.status === 'OPEN' ? (
                        r.overdue ? <Badge tone="red">Overdue · {r.daysWaiting} days</Badge> : <Badge tone="yellow">Waiting {r.daysWaiting} {r.daysWaiting === 1 ? 'day' : 'days'}</Badge>
                      ) : <Badge>{r.status.toLowerCase()}</Badge>}
                      {r.previousRequests > 0 && <Badge tone="brand">Asked {r.previousRequests} time{r.previousRequests > 1 ? 's' : ''} before</Badge>}
                    </div>
                  </div>
                  <blockquote className="whitespace-pre-line rounded-md bg-gray-50 p-3 text-sm">{r.statement}</blockquote>
                  {r.referrer && <p className="text-sm"><span className="text-gray-600">Referred by:</span> {r.referrer}</p>}
                  <p className="text-sm text-gray-600">
                    Requested {fmtDate(r.createdAt)} · Prospect record: {user.isAdmin ? <Link className="underline" href={`/admin/prospects/${pm.id}`}>{STATUS_LABELS[pm.outreachStatus] ?? pm.outreachStatus}</Link> : STATUS_LABELS[pm.outreachStatus] ?? pm.outreachStatus}
                  </p>
                  {pm.notes.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer">Prospect notes ({pm.notes.length})</summary>
                      <ul className="mt-2 space-y-1">
                        {pm.notes.map((n) => <li key={n.id} className="whitespace-pre-line"><span className="text-gray-500">{fmtDate(n.createdAt)}:</span> {n.content}</li>)}
                      </ul>
                    </details>
                  )}
                  {r.votes.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {r.votes.map((v) => (
                        <li key={v.voter}><strong>{v.voter}</strong>: {v.choice === 'APPROVE' ? 'Approve' : 'Decline'}{v.note ? ` · “${v.note}”` : ''}</li>
                      ))}
                    </ul>
                  )}
                  {r.status === 'OPEN' && !r.waitlisted && <VoteButtons requestId={r.id} myVote={r.myVote} />}
                  {r.status === 'OPEN' && user.isAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      <ActionButton label="Send invitation" variant="primary" path={`/api/admin/requests/${r.id}/invite`} noteField="note"
                        confirm={{ title: `Invite ${r.name}`, description: `We'll email ${r.email} an invitation link that works for 14 days.`, confirmLabel: 'Send invitation' }} />
                      <ActionButton label="Decline" path={`/api/admin/requests/${r.id}/decline`} noteField="note"
                        confirm={{ title: `Decline ${r.name}`, description: 'We send a short, kind email. The note stays internal. She can ask again after 90 days.', confirmLabel: 'Decline and email' }} />
                      <ActionButton label="Spam" variant="ghost" path={`/api/admin/requests/${r.id}/spam`}
                        confirm={{ title: 'Mark as spam', description: 'Archives the request without sending any email.', confirmLabel: 'Mark as spam' }} />
                    </div>
                  ) : r.status === 'OPEN' ? null : (
                    <p className="text-sm text-gray-600">
                      {r.status === 'INVITED' ? 'Invited' : r.status === 'DECLINED' ? 'Declined' : 'Marked as spam'} by {r.decidedByName ?? '—'} on {fmtDate(r.decidedAt)}
                      {r.decisionNote ? `: ${r.decisionNote}` : ''}
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
