import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { searchMembers, searchQuerySchema } from '@/lib/services/discovery';
import { MemberCard } from '@/components/member/member-card';
import { Button, EmptyState, Input } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/services/profile-fields';

export const metadata: Metadata = { title: 'Discover members' };

const ROLES = ['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER'] as const;

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | string[]> }) {
  const user = await pageActiveMember();
  const parsed = searchQuerySchema.safeParse(searchParams);
  const query = parsed.success ? parsed.data : searchQuerySchema.parse({});
  const { results, pagination } = await searchMembers(user.id, query);

  const pageHref = (page: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === 'page') continue;
      for (const item of Array.isArray(v) ? v : [v]) sp.append(k, item);
    }
    sp.set('page', String(page));
    return `/search?${sp.toString()}`;
  };
  const hasFilters = !!(query.q || query.primaryRole.length || query.expertise.length || query.location || query.secondaryRole.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside>
        <form method="get" action="/search" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4" role="search">
          <div>
            <label htmlFor="q" className="block text-sm font-medium">Search</label>
            <Input id="q" name="q" defaultValue={query.q} placeholder="Name, company, keyword…" />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Primary role</legend>
            {ROLES.map((r) => (
              <label key={r} className="flex min-h-[36px] items-center gap-2 text-sm">
                <input type="checkbox" name="primaryRole" value={r} defaultChecked={query.primaryRole.includes(r)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Also holds role</legend>
            {ROLES.map((r) => (
              <label key={r} className="flex min-h-[36px] items-center gap-2 text-sm">
                <input type="checkbox" name="secondaryRole" value={r} defaultChecked={query.secondaryRole.includes(r)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <div>
            <label htmlFor="expertise" className="block text-sm font-medium">Expertise</label>
            <Input id="expertise" name="expertise" defaultValue={query.expertise.join(', ')} placeholder="e.g. fintech" />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium">Location</label>
            <Input id="location" name="location" defaultValue={query.location} placeholder="City or country" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Search</Button>
            {hasFilters && (
              <Link href="/search" className="inline-flex min-h-[44px] items-center px-3 text-sm text-gray-700 underline">Clear</Link>
            )}
          </div>
        </form>
      </aside>
      <section aria-labelledby="results-heading" className="space-y-4">
        <h1 id="results-heading" className="text-2xl font-semibold">
          Discover members
          <span className="ml-2 text-base font-normal text-gray-500">
            {pagination.total} {pagination.total === 1 ? 'result' : 'results'}
          </span>
        </h1>
        {results.length === 0 ? (
          <EmptyState title={hasFilters ? 'No members match your search' : 'No members yet'}>
            {hasFilters ? 'Try fewer filters or a different keyword.' : 'Check back soon as the community grows.'}
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((r) => (
              <li key={r.member.id}>
                <MemberCard member={r.member}>{r.reasons[0]?.description}</MemberCard>
              </li>
            ))}
          </ul>
        )}
        {pagination.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between">
            {pagination.page > 1 ? <Link className="underline" href={pageHref(pagination.page - 1)}>← Previous</Link> : <span />}
            <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
            {pagination.page < pagination.totalPages ? <Link className="underline" href={pageHref(pagination.page + 1)}>Next →</Link> : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
