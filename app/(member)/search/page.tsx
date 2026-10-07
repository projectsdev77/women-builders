import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { pageActiveMember } from '@/lib/auth/guards';
import { searchMembers, searchQuerySchema } from '@/lib/services/discovery';
import { MemberCard } from '@/components/member/member-card';
import { Button, EmptyState, Input, PageHeader, Select, buttonClass } from '@/components/ui';
import { FilterChip, ROLE_OPTIONS } from '@/components/ui/choice';
import { OPTIONS } from '@/lib/services/profile-fields';
import { countryOptions } from '@/lib/countries';

export const metadata: Metadata = { title: 'Discover' };

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
  const hasFilters = !!(query.q || query.primaryRole.length || query.expertise.length || query.country || query.city || query.openTo.length || query.investing || query.raising || query.secondaryRole.length);
  const moreActive = !!(query.country || query.city || query.expertise.length || query.secondaryRole.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Discover" lede="Search the directory by what people do, where they are and what they are open to." />
      <form method="get" action="/search" role="search" className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search aria-hidden size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <label htmlFor="q" className="sr-only">Search</label>
            <Input id="q" name="q" defaultValue={query.q} placeholder="Name, company, keyword…" className="rounded-full pl-11" />
          </div>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Primary role</legend>
            {ROLE_OPTIONS.map(([r, label]) => (
              <FilterChip key={r} name="primaryRole" value={r} role={r} defaultChecked={query.primaryRole.includes(r)}>{label}</FilterChip>
            ))}
          </fieldset>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Open to</legend>
            <span className="mr-1 self-center text-[14px] font-bold">Open to</span>
            {OPTIONS.openTo.map((o) => <FilterChip key={o} name="openTo" value={o} defaultChecked={query.openTo.includes(o)}>{o}</FilterChip>)}
          </fieldset>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[14px] font-bold">Capital</span>
          <FilterChip name="investing" value="1" defaultChecked={!!query.investing}>$ Investors writing checks</FilterChip>
          <FilterChip name="raising" value="1" defaultChecked={!!query.raising}>Founders raising</FilterChip>
        </div>
        <details open={moreActive} className="rounded-card bg-white p-4">
          <summary className="flex min-h-[44px] cursor-pointer items-center text-[15px] font-bold">More filters</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="country" className="mb-1.5 block text-[15px] font-semibold">Country</label>
              <Select id="country" name="country" defaultValue={query.country}>
                <option value="">Any country</option>
                {countryOptions().map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <label htmlFor="city" className="mb-1.5 block text-[15px] font-semibold">City</label>
              <Input id="city" name="city" defaultValue={query.city} placeholder="e.g. Lagos" />
            </div>
            <div>
              <label htmlFor="expertise" className="mb-1.5 block text-[15px] font-semibold">Expertise</label>
              <Input id="expertise" name="expertise" defaultValue={query.expertise.join(', ')} placeholder="e.g. fintech" />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-[15px] font-semibold">Also holds role</legend>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map(([r, label]) => <FilterChip key={r} name="secondaryRole" value={r} defaultChecked={query.secondaryRole.includes(r)}>{label}</FilterChip>)}
              </div>
            </fieldset>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit">Search</Button>
          {hasFilters && <Link href="/search" className="min-h-[44px] content-center text-[15px] font-bold underline underline-offset-4">Clear all filters</Link>}
          <p className="ml-auto font-mono text-[12px] uppercase tracking-[.1em] text-ink-subtle">
            {pagination.total} {pagination.total === 1 ? 'result' : 'results'}
          </p>
        </div>
      </form>

      {results.length === 0 ? (
        <EmptyState title={hasFilters ? 'No members match your search' : 'No members yet'}>
          {hasFilters ? (
            <>Try fewer filters or a different keyword. <Link href="/search" className={buttonClass('secondary', 'sm', 'mt-3')}>Clear all filters</Link></>
          ) : 'Check back soon as the community grows.'}
        </EmptyState>
      ) : (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr))]">
          {results.map((r) => (
            <li key={r.member.id}>
              <MemberCard
                member={r.member}
                reasons={r.reasons}
                footer={<Link href={`/members/${r.member.id}`} className={buttonClass('primary', 'md', 'flex-1')}>View profile</Link>}
              />
            </li>
          ))}
        </ul>
      )}
      {pagination.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          {pagination.page > 1 ? <Link className={buttonClass('secondary')} href={pageHref(pagination.page - 1)}>← Previous</Link> : <span />}
          <span className="font-mono text-[12px] text-ink-subtle">Page {pagination.page} of {pagination.totalPages}</span>
          {pagination.page < pagination.totalPages ? <Link className={buttonClass('secondary')} href={pageHref(pagination.page + 1)}>Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
