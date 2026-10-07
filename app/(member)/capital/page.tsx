import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import {
  foundersQuerySchema,
  investorsQuerySchema,
  listInvestors,
  listRaisingFounders,
  type FounderCard,
  type InvestorCard,
} from '@/lib/services/capital';
import { OPTIONS } from '@/lib/services/profile-fields';
import { countryOptions } from '@/lib/countries';
import { DetailRows, MemberCard, pill } from '@/components/member/member-card';
import { ReachAction } from '@/components/member/reach-action';
import { InvestingBadge, formatCheckSize, formatMonth, formatThousands } from '@/components/profile/member-profile';
import { Button, EmptyState, Input, SegmentedTabs, Select, buttonClass } from '@/components/ui';
import { FilterChip } from '@/components/ui/choice';

export const metadata: Metadata = { title: 'Capital' };
type SP = Record<string, string | string[]>;

function hrefWith(base: string, sp: SP, page: number) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === 'page') continue;
    for (const item of Array.isArray(v) ? v : [v]) out.append(k, item);
  }
  out.set('page', String(page));
  return `${base}?${out.toString()}`;
}

function Pager({ pagination, href }: { pagination: { page: number; totalPages: number }; href: (p: number) => string }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      {pagination.page > 1 ? <Link className={buttonClass('secondary')} href={href(pagination.page - 1)}>← Previous</Link> : <span />}
      <span className="font-mono text-[12px] text-ink-subtle">Page {pagination.page} of {pagination.totalPages}</span>
      {pagination.page < pagination.totalPages ? <Link className={buttonClass('secondary')} href={href(pagination.page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}

function investorExtras(m: InvestorCard) {
  const i = m.investor;
  const check = formatCheckSize(i.checkSizeMin, i.checkSizeMax);
  return {
    badges: (
      <>
        <InvestingBadge status={i.investing} />
        {i.lastCheckMonth && <span className={`${pill} bg-cream`}>Last check: {formatMonth(i.lastCheckMonth)}</span>}
      </>
    ),
    details: (
      <DetailRows
        rows={[
          ['Firm', [i.firmName, i.investorType].filter(Boolean).join(' · ') || null],
          ['Stages', i.investmentStages.join(', ') || null],
          ['Checks', check],
          ['Sectors', i.sectorPreferences.join(', ') || null],
        ]}
      />
    ),
  };
}

function founderExtras(m: FounderCard) {
  const f = m.founder;
  const now = f.fundingStatus === 'Raising now';
  return {
    badges: f.fundingStatus ? <span className={`${pill} ${now ? 'bg-founder' : 'bg-butter-tint'}`}>{f.fundingStatus}</span> : null,
    details: (
      <DetailRows
        rows={[
          ['Company', [f.companyStage, f.industry].filter(Boolean).join(' · ') || null],
          ['Raising', f.raiseAmount != null ? formatThousands(f.raiseAmount) : null],
        ]}
      />
    ),
  };
}

/** Stripes in the Capital header: white at 45% over butter (designer). */
const STRIPES = 'repeating-linear-gradient(90deg, rgba(255,255,255,.45) 0 14px, transparent 14px 28px)';

export default async function CapitalPage({ searchParams }: { searchParams: SP }) {
  const user = await pageActiveMember();
  const tab = searchParams.tab === 'founders' ? 'founders' : 'investors';
  const countries = countryOptions();

  const header = (
    <header className="relative overflow-hidden rounded-[32px] bg-butter p-[clamp(24px,4vw,44px)]">
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[28%] sm:block" style={{ background: STRIPES }} />
      <div className="relative space-y-4">
        <h1>Capital</h1>
        <p className="max-w-2xl text-[17px] leading-relaxed text-ink-muted">A view of the same community, for raising and investing. Every role matters equally here, and Discover shows everyone.</p>
        <SegmentedTabs
          label="Capital view"
          tabs={[
            { href: '/capital?tab=investors', label: 'Investors', active: tab === 'investors' },
            { href: '/capital?tab=founders', label: 'Founders raising', active: tab === 'founders' },
          ]}
        />
      </div>
    </header>
  );

  if (tab === 'investors') {
    const parsed = investorsQuerySchema.safeParse(searchParams);
    const q = parsed.success ? parsed.data : investorsQuerySchema.parse({});
    const { results, pagination } = await listInvestors(user.id, q);
    const toggled = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (k !== 'investing' && k !== 'page') for (const item of Array.isArray(v) ? v : [v]) toggled.append(k, item);
    toggled.set('tab', 'investors');
    toggled.set('investing', q.investing === '1' ? 'all' : '1');
    return (
      <div className="space-y-6">
        {header}
        <form method="get" action="/capital" className="space-y-4 rounded-[24px] bg-white p-5">
          <input type="hidden" name="tab" value="investors" />
          <input type="hidden" name="investing" value={q.investing} />
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="amount" className="text-[15px] font-bold">I&apos;m raising checks of</label>
            <div className="flex items-center gap-1.5">
              <span aria-hidden className="text-[16px] font-semibold">$</span>
              <Input id="amount" name="amount" inputMode="numeric" defaultValue={q.amount ?? ''} placeholder="250" className="!w-28 !min-h-[44px]" aria-describedby="amount-hint" />
              <span aria-hidden className="text-[16px] font-semibold">K</span>
            </div>
            <span id="amount-hint" className="sr-only">In thousands of US dollars</span>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Stage</legend>
              {OPTIONS.investmentStages.map((st) => <FilterChip key={st} name="stage" value={st} defaultChecked={q.stage.includes(st)}>{st}</FilterChip>)}
            </fieldset>
            <Link
              href={`/capital?${toggled.toString()}`}
              aria-pressed={q.investing === '1'}
              className={`ml-auto inline-flex min-h-[40px] items-center gap-2 rounded-full border-[1.5px] px-4 text-[14px] font-bold ${q.investing === '1' ? 'border-forest bg-success-bg' : 'border-line bg-white'}`}
            >
              {q.investing === '1' ? <><span aria-hidden className="h-2 w-2 rounded-full bg-success" />Currently investing only</> : 'Showing all investors'}
            </Link>
          </div>
          <details open={!!(q.sector.length || q.investorType.length || q.leads || q.country)}>
            <summary className="flex min-h-[44px] cursor-pointer items-center text-[15px] font-bold">More filters</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="sector" className="mb-1.5 block text-[15px] font-semibold">Sector</label>
                <Input id="sector" name="sector" defaultValue={q.sector.join(', ')} placeholder="e.g. fintech" />
              </div>
              <div>
                <label htmlFor="leads" className="mb-1.5 block text-[15px] font-semibold">Leads or follows</label>
                <Select id="leads" name="leads" defaultValue={q.leads ?? ''}>
                  <option value="">Either</option>
                  <option value="Leads">Leads rounds</option>
                  <option value="Follows">Follows</option>
                </Select>
              </div>
              <div>
                <label htmlFor="country" className="mb-1.5 block text-[15px] font-semibold">Country</label>
                <Select id="country" name="country" defaultValue={q.country}>
                  <option value="">Any country</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </Select>
              </div>
              <fieldset>
                <legend className="mb-1.5 text-[15px] font-semibold">Investor type</legend>
                <div className="flex flex-wrap gap-2">
                  {OPTIONS.investorType.map((t) => <FilterChip key={t} name="investorType" value={t} defaultChecked={q.investorType.includes(t)}>{t}</FilterChip>)}
                </div>
              </fieldset>
            </div>
          </details>
          <div className="flex items-center gap-3">
            <Button type="submit">Show investors</Button>
            <Link href="/capital?tab=investors" className="min-h-[44px] content-center text-[15px] font-bold underline underline-offset-4">Reset</Link>
          </div>
        </form>
        <p className="text-[14px] text-ink-subtle">Investors who confirmed they&apos;re still investing in the last 90 days come first.</p>
        <section aria-labelledby="results" className="space-y-4">
          <h2 id="results" className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-subtle !font-sans !text-[12px]">
            {pagination.total} {pagination.total === 1 ? 'investor' : 'investors'}
          </h2>
          {results.length === 0 ? (
            <EmptyState title="No investors match">Try fewer filters, or include investors who haven&apos;t confirmed recently.</EmptyState>
          ) : (
            <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
              {results.map((m) => {
                const x = investorExtras(m);
                return (
                  <li key={m.id}>
                    <MemberCard member={m} badges={x.badges} details={x.details} reasons={m.reasons} footer={<ReachAction member={m} />} />
                  </li>
                );
              })}
            </ul>
          )}
          <Pager pagination={pagination} href={(p) => hrefWith('/capital', searchParams, p)} />
        </section>
      </div>
    );
  }

  const parsed = foundersQuerySchema.safeParse(searchParams);
  const q = parsed.success ? parsed.data : foundersQuerySchema.parse({});
  const { results, pagination } = await listRaisingFounders(user.id, q);
  return (
    <div className="space-y-6">
      {header}
      <form method="get" action="/capital" className="space-y-4 rounded-[24px] bg-white p-5">
        <input type="hidden" name="tab" value="founders" />
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">Company stage</legend>
          <span className="mr-1 text-[15px] font-bold">Stage</span>
          {OPTIONS.companyStage.map((st) => <FilterChip key={st} name="stage" value={st} defaultChecked={q.stage.includes(st)}>{st}</FilterChip>)}
        </fieldset>
        <details open={!!(q.industry || q.country || q.raiseMin != null || q.raiseMax != null)}>
          <summary className="flex min-h-[44px] cursor-pointer items-center text-[15px] font-bold">More filters</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="industry" className="mb-1.5 block text-[15px] font-semibold">Industry</label>
              <Input id="industry" name="industry" defaultValue={q.industry} placeholder="e.g. Climate" />
            </div>
            <div>
              <label htmlFor="country" className="mb-1.5 block text-[15px] font-semibold">Country</label>
              <Select id="country" name="country" defaultValue={q.country}>
                <option value="">Any country</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-[15px] font-semibold">Raise amount ($K)</legend>
              <div className="flex items-center gap-2">
                <Input aria-label="Minimum raise, thousands of US dollars" name="raiseMin" inputMode="numeric" defaultValue={q.raiseMin ?? ''} placeholder="Min" />
                <span aria-hidden>–</span>
                <Input aria-label="Maximum raise, thousands of US dollars" name="raiseMax" inputMode="numeric" defaultValue={q.raiseMax ?? ''} placeholder="Max" />
              </div>
            </fieldset>
          </div>
        </details>
        <div className="flex items-center gap-3">
          <Button type="submit">Show founders</Button>
          <Link href="/capital?tab=founders" className="min-h-[44px] content-center text-[15px] font-bold underline underline-offset-4">Reset</Link>
        </div>
      </form>
      <section aria-labelledby="results" className="space-y-4">
        <h2 id="results" className="font-mono text-[12px] uppercase tracking-[.1em] text-ink-subtle !font-sans !text-[12px]">
          {pagination.total} {pagination.total === 1 ? 'founder raising' : 'founders raising'}
        </h2>
        {results.length === 0 ? (
          <EmptyState title="No founders match">Founders appear here when they set their funding status to raising now or in the next 6 months.</EmptyState>
        ) : (
          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
            {results.map((m) => {
              const x = founderExtras(m);
              return (
                <li key={m.id}>
                  <MemberCard member={m} badges={x.badges} details={x.details} reasons={m.reasons} footer={<ReachAction member={m} />} />
                </li>
              );
            })}
          </ul>
        )}
        <Pager pagination={pagination} href={(p) => hrefWith('/capital', searchParams, p)} />
      </section>
    </div>
  );
}
