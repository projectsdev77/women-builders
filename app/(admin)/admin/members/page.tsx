import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { listMembers } from '@/lib/services/admin/members';
import { ROLE_LABELS } from '@/lib/services/profile-fields';
import { Badge, Button, EmptyState, Input, Select } from '@/components/ui';
import { ACCOUNT_TONE, fmtDate } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Members' };

const STATUSES = ['ALL', 'ACTIVE', 'DEACTIVATED', 'DELETED'] as const;

export default async function AdminMembersPage({ searchParams }: { searchParams: { q?: string; status?: string; page?: string } }) {
  await pageAdmin();
  const status = (STATUSES as readonly string[]).includes(searchParams.status ?? '') ? (searchParams.status as (typeof STATUSES)[number]) : 'ALL';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { members, pagination } = await listMembers({ q: searchParams.q, status, page });
  const href = (p: number) => `/admin/members?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), status, page: String(p) })}`;
  return (
    <div className="space-y-4">
      <h1>Members <span className="text-base font-normal text-gray-500">({pagination.total})</span></h1>
      <form method="get" className="flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search</label>
        <Input id="q" name="q" defaultValue={searchParams.q} placeholder="Name, email, company…" className="max-w-xs" />
        <label htmlFor="status" className="sr-only">Status</label>
        <Select id="status" name="status" defaultValue={status} className="max-w-[12rem]">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </Select>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      {members.length === 0 ? (
        <EmptyState title="No members match" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr><th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3">Last active</th><th className="p-3">Reports</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="p-3">
                    <Link href={`/admin/members/${m.id}`} className="font-medium underline">{m.name}</Link>
                    {m.isAdmin && <span className="ml-2"><Badge tone="brand">Admin</Badge></span>}
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </td>
                  <td className="p-3">{m.primaryRole ? ROLE_LABELS[m.primaryRole] : '—'}</td>
                  <td className="p-3"><Badge tone={ACCOUNT_TONE[m.accountStatus]}>{m.accountStatus.toLowerCase()}</Badge></td>
                  <td className="p-3">{fmtDate(m.approvedAt ?? m.createdAt)}</td>
                  <td className="p-3">{fmtDate(m.lastActiveAt)}</td>
                  <td className="p-3">{m.openReports > 0 ? <Badge tone="red">{m.openReports} open</Badge> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex justify-between text-sm">
          {page > 1 ? <Link className="underline" href={href(page - 1)}>← Previous</Link> : <span />}
          <span>Page {page} of {pagination.totalPages}</span>
          {page < pagination.totalPages ? <Link className="underline" href={href(page + 1)}>Next →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
