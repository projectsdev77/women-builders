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
import { MemberCard } from '@/components/member/member-card';
import { ReachAction } from '@/components/member/reach-action';
import { InvestingBadge, formatCheckSize, formatMonth, formatThousands } from '@/components/profile/member-profile';
import { Badge, Button, EmptyState, Input, Select } from '@/components/ui';

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

function Checks({ name, options, selected }: { name: string; options: readonly string[]; selected: string[] }) {
  return (
    <>
      {options.map((o) => (
        <label key={o} className="flex min-h-[36px] items-center gap-2 text-sm">
          <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} />
          {o}
        </label>
      ))}
    </>
  );
}

function Pager({ pagination, href }: { pagination: { page: number; totalPages: number }; href: (p: number) => string }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      {pagination.page > 1 ? <Link className="underline" href={href(pagination.page - 1)}>← Previous</Link> : <span />}
      <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
      {pagination.page < pagination.totalPages ? <Link className="underline" href={href(pagination.page + 1)}>Next →</Link> : <span />}
    </nav>
  );
}

function InvestorDetails({ m }: { m: InvestorCard }) {
  const i = m.investor;
  const check = formatCheckSize(i.checkSizeMin, i.checkSizeMax);
  return (
    <div className="space-y-1">
      <p className="text-gray-900">{[i.firmName, i.investorType, i.leadsRounds && (i.leadsRounds === 'Both' ? 'Leads or follows' : i.leadsRounds)].filter(Boolean).join(' · ')}</p>
      {i.investmentStages.length > 0 && <p>Stages: {i.investmentStages.join(', ')}</p>}
      {check && <p>Checks: {check}</p>}
      {i.sectorPreferences.length > 0 && <p className="line-clamp-1">Sectors: {i.sectorPreferences.join(', ')}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <InvestingBadge status={i.investing} />
        {i.lastCheckMonth && <span className="text-xs text-gray-600">Last check: {formatMonth(i.lastCheckMonth)}</span>}
      </div>
      {m.reasons[0] && <p className="text-xs text-brand-700">{m.reasons[0].description}</p>}
    </div>
  );
}

function FounderDetails({ m }: { m: FounderCard }) {
  const f = m.founder;
  return (
    <div className="space-y-1">
      <p className="text-gray-900">{[f.companyStage, f.industry].filter(Boolean).join(' · ')}</p>
      <div className="flex flex-wrap items-center gap-2">
        {f.fundingStatus && <Badge tone={f.fundingStatus === 'Raising now' ? 'green' : 'yellow'}>{f.fundingStatus}</Badge>}
        {f.raiseAmount != null && <span className="text-sm">Raising {formatThousands(f.raiseAmount)}</span>}
      </div>
      {m.reasons[0] && <p className="text-xs text-brand-700">{m.reasons[0].description}</p>}
    </div>
  );
}

export default async function CapitalPage({ searchParams }: { searchParams: SP }) {
  const user = await pageActiveMember();
  const tab = searchParams.tab === 'founders' ? 'founders' : 'investors';
  const countries = countryOptions();

  const tabs = (
    <nav aria-label="Capital view" className="flex gap-4 border-b border-gray-200">
      {(['investors', 'founders'] as const).map((t) => (
        <Link
          key={t}
          href={`/capital?tab=${t}`}
          aria-current={t === tab ? 'page' : undefined}
          className={t === tab ? 'border-b-2 border-brand-600 pb-2 font-semibold' : 'pb-2 text-gray-600'}
        >
          {t === 'investors' ? 'Investors' : 'Founders raising'}
        </Link>
      ))}
    </nav>
  );
  const intro = (
    <div className="space-y-1">
      <h1>Capital</h1>
      <p className="text-sm text-gray-600">A view of the same community, for raising and investing. Every role matters equally here, and Discover shows everyone.</p>
    </div>
  );

  if (tab === 'investors') {
    const parsed = investorsQuerySchema.safeParse(searchParams);
    const q = parsed.success ? parsed.data : investorsQuerySchema.parse({});
    const { results, pagination } = await listInvestors(user.id, q);
    return (
      <div className="space-y-4">
        {intro}
        {tabs}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside>
            <form method="get" action="/capital" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
              <input type="hidden" name="tab" value="investors" />
              <div>
                <label htmlFor="amount" className="block text-sm font-medium">I&apos;m raising checks of</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">$</span>
                  <Input id="amount" name="amount" inputMode="numeric" defaultValue={q.amount ?? ''} placeholder="250" aria-describedby="amount-hint" />
                  <span className="text-sm text-gray-600">K</span>
                </div>
                <p id="amount-hint" className="text-xs text-gray-500">In thousands of US dollars</p>
              </div>
              <fieldset><legend className="text-sm font-medium">Stage</legend><Checks name="stage" options={OPTIONS.investmentStages} selected={q.stage} /></fieldset>
              <div>
                <label htmlFor="sector" className="block text-sm font-medium">Sector</label>
                <Input id="sector" name="sector" defaultValue={q.sector.join(', ')} placeholder="e.g. fintech" />
              </div>
              <fieldset><legend className="text-sm font-medium">Investor type</legend><Checks name="investorType" options={OPTIONS.investorType} selected={q.investorType} /></fieldset>
              <div>
                <label htmlFor="leads" className="block text-sm font-medium">Leads or follows</label>
                <Select id="leads" name="leads" defaultValue={q.leads ?? ''}>
                  <option value="">Either</option>
                  <option value="Leads">Leads rounds</option>
                  <option value="Follows">Follows</option>
                </Select>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium">Country</label>
                <Select id="country" name="country" defaultValue={q.country}>
                  <option value="">Any country</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </Select>
              </div>
              <div>
                <label htmlFor="investing" className="block text-sm font-medium">Status</label>
                <Select id="investing" name="investing" defaultValue={q.investing}>
                  <option value="1">Currently investing</option>
                  <option value="all">All investors</option>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Show investors</Button>
                <Link href="/capital?tab=investors" className="inline-flex min-h-[44px] items-center px-3 text-sm text-gray-700 underline">Reset</Link>
              </div>
            </form>
          </aside>
          <section aria-labelledby="results" className="space-y-4">
            <h2 id="results" className="text-lg font-semibold">
              {pagination.total} {pagination.total === 1 ? 'investor' : 'investors'}
            </h2>
            {results.length === 0 ? (
              <EmptyState title="No investors match">Try fewer filters, or include investors who haven&apos;t confirmed recently.</EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((m) => (
                  <li key={m.id}>
                    <MemberCard member={m} footer={<ReachAction member={m} />}>
                      <InvestorDetails m={m} />
                    </MemberCard>
                  </li>
                ))}
              </ul>
            )}
            <Pager pagination={pagination} href={(p) => hrefWith('/capital', searchParams, p)} />
          </section>
        </div>
      </div>
    );
  }

  const parsed = foundersQuerySchema.safeParse(searchParams);
  const q = parsed.success ? parsed.data : foundersQuerySchema.parse({});
  const { results, pagination } = await listRaisingFounders(user.id, q);
  return (
    <div className="space-y-4">
      {intro}
      {tabs}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <form method="get" action="/capital" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
            <input type="hidden" name="tab" value="founders" />
            <fieldset><legend className="text-sm font-medium">Company stage</legend><Checks name="stage" options={OPTIONS.companyStage} selected={q.stage} /></fieldset>
            <div>
              <label htmlFor="industry" className="block text-sm font-medium">Industry</label>
              <Input id="industry" name="industry" defaultValue={q.industry} placeholder="e.g. Climate" />
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium">Country</label>
              <Select id="country" name="country" defaultValue={q.country}>
                <option value="">Any country</option>
                {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Raise amount ($K)</legend>
              <div className="flex items-center gap-2">
                <Input aria-label="Minimum raise, thousands of US dollars" name="raiseMin" inputMode="numeric" defaultValue={q.raiseMin ?? ''} placeholder="Min" />
                <span aria-hidden>–</span>
                <Input aria-label="Maximum raise, thousands of US dollars" name="raiseMax" inputMode="numeric" defaultValue={q.raiseMax ?? ''} placeholder="Max" />
              </div>
            </fieldset>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Show founders</Button>
              <Link href="/capital?tab=founders" className="inline-flex min-h-[44px] items-center px-3 text-sm text-gray-700 underline">Reset</Link>
            </div>
          </form>
        </aside>
        <section aria-labelledby="results" className="space-y-4">
          <h2 id="results" className="text-lg font-semibold">
            {pagination.total} {pagination.total === 1 ? 'founder raising' : 'founders raising'}
          </h2>
          {results.length === 0 ? (
            <EmptyState title="No founders match">Founders appear here when they set their funding status to raising now or in the next 6 months.</EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((m) => (
                <li key={m.id}>
                  <MemberCard member={m} footer={<ReachAction member={m} />}>
                    <FounderDetails m={m} />
                  </MemberCard>
                </li>
              ))}
            </ul>
          )}
          <Pager pagination={pagination} href={(p) => hrefWith('/capital', searchParams, p)} />
        </section>
      </div>
    </div>
  );
}
