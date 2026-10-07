import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { listRequests } from '@/lib/services/connections';
import { MemberCard } from '@/components/member/member-card';
import { EmptyState } from '@/components/ui';
import { RequestButtons } from './request-buttons';

export const metadata: Metadata = { title: 'Connection requests' };

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default async function RequestsPage() {
  const user = await pageActiveMember();
  const { incoming, outgoing } = await listRequests(user.id);
  return (
    <div className="space-y-8">
      <div>
        <Link href="/connections" className="text-sm text-brand-700 underline">← Connections</Link>
        <h1>Connection requests</h1>
      </div>
      <section aria-labelledby="incoming" className="space-y-3">
        <h2 id="incoming" className="text-lg font-semibold">Received ({incoming.length})</h2>
        {incoming.length === 0 ? (
          <EmptyState title="No new requests" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {incoming.map((r) => (
              <li key={r.id}>
                <MemberCard member={r.member} footer={<RequestButtons kind="incoming" requestId={r.id} />}>
                  {r.message && <blockquote className="rounded-md bg-gray-50 p-2 italic">“{r.message}”</blockquote>}
                  <p className="mt-1 text-xs text-gray-500">Received {date(r.createdAt)} · expires {date(r.expiresAt)}</p>
                </MemberCard>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="outgoing" className="space-y-3">
        <h2 id="outgoing" className="text-lg font-semibold">Sent ({outgoing.length})</h2>
        {outgoing.length === 0 ? (
          <EmptyState title="No pending sent requests" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {outgoing.map((r) => (
              <li key={r.id}>
                <MemberCard member={r.member} footer={<RequestButtons kind="outgoing" requestId={r.id} />}>
                  <p className="text-xs text-gray-500">Sent {date(r.createdAt)} · expires {date(r.expiresAt)}</p>
                </MemberCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
