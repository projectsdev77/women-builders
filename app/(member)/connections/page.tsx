import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { listConnections } from '@/lib/services/connections';
import { prisma } from '@/lib/db';
import { MemberCard } from '@/components/member/member-card';
import { Button, EmptyState, Input } from '@/components/ui';

export const metadata: Metadata = { title: 'Connections' };

export default async function ConnectionsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await pageActiveMember();
  const q = (searchParams.q ?? '').slice(0, 100);
  const [connections, incoming] = await Promise.all([
    listConnections(user.id, q),
    prisma.connectionRequest.count({ where: { receiverId: user.id, status: 'PENDING', expiresAt: { gt: new Date() } } }),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Connections</h1>
          <p className="text-gray-600">{connections.length} {q ? 'matching' : 'total'}</p>
        </div>
        <Link href="/connections/requests" className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium">
          Requests{incoming > 0 && <span className="ml-2 rounded-full bg-brand-600 px-2 text-xs text-white">{incoming}</span>}
        </Link>
      </div>
      <form method="get" className="flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search connections</label>
        <Input id="q" name="q" defaultValue={q} placeholder="Search by name or keyword" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      {connections.length === 0 ? (
        <EmptyState title={q ? 'No connections match' : 'No connections yet'}>
          {q ? 'Try another name or keyword.' : <>Find people in <Link className="underline" href="/recommendations">your recommendations</Link> or <Link className="underline" href="/search">Discover</Link>.</>}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {connections.map((c) => (
            <li key={c.member.id}>
              <MemberCard
                member={c.member}
                footer={
                  <>
                    <Link href={`/messages/${c.member.id}`} className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-forest px-5 text-[15px] font-bold text-cream shadow-press-sm hover:bg-[#2E5A40] flex-1">Message</Link>
                    <Link href={`/members/${c.member.id}`} className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-300 px-3 text-sm">Profile</Link>
                  </>
                }
              >
                <span className="text-xs text-gray-500">Connected {new Date(c.connectedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </MemberCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
