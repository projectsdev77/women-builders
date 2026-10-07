import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { listRequests } from '@/lib/services/connections';
import { MemberCard } from '@/components/member/member-card';
import { EmptyState, PageHeader } from '@/components/ui';
import { RequestButtons } from './request-buttons';

export const metadata: Metadata = { title: 'Connection requests' };

const date = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default async function RequestsPage() {
  const user = await pageActiveMember();
  const { incoming, outgoing } = await listRequests(user.id);
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link href="/connections" className="text-[15px] font-bold underline underline-offset-4">← Connections</Link>
        <PageHeader title="Connection requests" lede="Declining is silent: they are never told." />
      </div>
      <section aria-labelledby="incoming" className="space-y-3">
        <h2 id="incoming" className="font-display text-[28px]">Received ({incoming.length})</h2>
        {incoming.length === 0 ? (
          <EmptyState title="No new requests" />
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {incoming.map((r) => (
              <li key={r.id}>
                <MemberCard member={r.member} footer={<RequestButtons kind="incoming" requestId={r.id} />}>
                  {r.message && <blockquote className="rounded-2xl bg-cream p-3 font-display text-[17px] leading-snug">“{r.message}”</blockquote>}
                  <p className="mt-2 font-mono text-[12px] text-ink-subtle">Received {date(r.createdAt)} · expires {date(r.expiresAt)}</p>
                </MemberCard>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="outgoing" className="space-y-3">
        <h2 id="outgoing" className="font-display text-[28px]">Sent ({outgoing.length})</h2>
        {outgoing.length === 0 ? (
          <EmptyState title="No pending sent requests" />
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {outgoing.map((r) => (
              <li key={r.id}>
                <MemberCard member={r.member} footer={<RequestButtons kind="outgoing" requestId={r.id} />}>
                  <p className="font-mono text-[12px] text-ink-subtle">Sent {date(r.createdAt)} · expires {date(r.expiresAt)}</p>
                </MemberCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
