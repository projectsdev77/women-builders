import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { OUTREACH_STATUSES, listProspects, prospectListSchema } from '@/lib/services/admin/prospects';
import { listAdmins } from '@/lib/services/admin/members';
import { Badge, Button, EmptyState, Input, Select } from '@/components/ui';
import { STATUS_LABELS, STATUS_TONE, fmtDay } from '@/components/admin/labels';
import { AddProspect } from './add-prospect';

export const metadata: Metadata = { title: 'Potential members' };

export default async function ProspectsPage({ searchParams }: { searchParams: Record<string, string | string[]> }) {
  const admin = await pageAdmin();
  const parsed = prospectListSchema.safeParse(searchParams);
  const query = parsed.success ? parsed.data : prospectListSchema.parse({});
  const [{ prospects, pagination }, admins] = await Promise.all([listProspects(admin.id, query), listAdmins()]);
  const href = (page: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) for (const x of Array.isArray(v) ? v : [v]) if (k !== 'page') sp.append(k, x);
    sp.set('page', String(page));
    return `/admin/prospects?${sp}`;
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1>Potential members <span className="text-base font-normal text-gray-500">({pagination.total})</span></h1>
        <div className="flex gap-2">
          <Link href="/admin/prospects/import" className="inline-flex min-h-[44px] items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium">Import CSV</Link>
          <AddProspect admins={admins} />
        </div>
      </div>
      <form method="get" className="grid gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="block text-xs text-gray-600">Search</label>
          <Input id="q" name="q" defaultValue={query.q} placeholder="Name, email, company, role" />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs text-gray-600">Status</label>
          <Select id="status" name="status" defaultValue={query.status[0] ?? ''}>
            <option value="">Any status</option>
            {OUTREACH_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="followUpFrom" className="block text-xs text-gray-600">Follow-up from</label>
          <Input id="followUpFrom" name="followUpFrom" type="date" defaultValue={query.followUpFrom} />
        </div>
        <div>
          <label htmlFor="followUpTo" className="block text-xs text-gray-600">Follow-up to</label>
          <Input id="followUpTo" name="followUpTo" type="date" defaultValue={query.followUpTo} />
        </div>
        <div>
          <label htmlFor="assigned" className="block text-xs text-gray-600">Owner</label>
          <Select id="assigned" name="assigned" defaultValue={query.assigned ?? ''}>
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </div>
        <div>
          <label htmlFor="archived" className="block text-xs text-gray-600">Archived</label>
          <Select id="archived" name="archived" defaultValue={query.archived}>
            <option value="exclude">Hide archived</option>
            <option value="include">Include archived</option>
            <option value="only">Only archived</option>
          </Select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-5">
          <Button type="submit" variant="secondary">Apply filters</Button>
          <Link href="/admin/prospects" className="text-sm underline">Reset</Link>
        </div>
      </form>
      {prospects.length === 0 ? (
        <EmptyState title="No potential members match" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="p-3">Name</th><th className="p-3">Company</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Next follow-up</th><th className="p-3">Owner</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prospects.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    <Link href={`/admin/prospects/${p.id}`} className="font-medium underline">{p.name}</Link>
                    {p.archived && <Badge>Archived</Badge>}
                    <div className="text-xs text-gray-500">{p.email ?? p.linkedInUrl}</div>
                  </td>
                  <td className="p-3">{p.company ?? '—'}</td>
                  <td className="p-3">{p.role ?? '—'}</td>
                  <td className="p-3"><Badge tone={STATUS_TONE[p.outreachStatus]}>{STATUS_LABELS[p.outreachStatus]}</Badge></td>
                  <td className="p-3">{fmtDay(p.nextFollowUpDate)}</td>
                  <td className="p-3">{p.assignedAdmin?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex justify-between text-sm">
          {pagination.page > 1 ? <Link className="underline" href={href(pagination.page - 1)}>← Previous</Link> : <span />}
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          {pagination.page < pagination.totalPages ? <Link className="underline" href={href(pagination.page + 1)}>Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
