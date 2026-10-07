import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { listConnections } from '@/lib/services/connections';
import { prisma } from '@/lib/db';
import { MemberCard } from '@/components/member/member-card';
import { Button, CountBadge, EmptyState, Input, PageHeader, buttonClass } from '@/components/ui';

export const metadata: Metadata = { title: 'Connections' };

export default async function ConnectionsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await pageActiveMember();
  const q = (searchParams.q ?? '').slice(0, 100);
  const [connections, incoming] = await Promise.all([
    listConnections(user.id, q),
    prisma.connectionRequest.count({ where: { receiverId: user.id, status: 'PENDING', expiresAt: { gt: new Date() } } }),
  ]);
  return (
    <div className="space-y-7">
      <PageHeader title="Connections" lede={`${connections.length} ${q ? 'matching' : 'total'}`}>
        <Link href="/connections/requests" className={buttonClass('secondary')}>
          Requests <CountBadge count={incoming} label="waiting" />
        </Link>
      </PageHeader>
      <form method="get" className="flex max-w-lg gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search connections</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Search by name or keyword" className="rounded-full" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {connections.length === 0 ? (
        <EmptyState title={q ? 'No connections match' : 'No connections yet'}>
          {q ? 'Try another name or keyword.' : <>Find people in <Link className="underline" href="/recommendations">your recommendations</Link> or <Link className="underline" href="/search">Discover</Link>.</>}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
          {connections.map((c) => (
            <li key={c.member.id}>
              <MemberCard
                member={c.member}
                footer={
                  <>
                    <Link href={`/messages/${c.member.id}`} className={buttonClass('primary', 'md', 'flex-1')}>Message</Link>
                    <Link href={`/members/${c.member.id}`} className={buttonClass('secondary')}>Profile</Link>
                  </>
                }
              >
                <span className="text-[13px] text-ink-subtle">Connected {new Date(c.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </MemberCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
