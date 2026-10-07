import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { listAuditLog } from '@/lib/services/admin/dashboard';
import { EmptyState } from '@/components/ui';

export const metadata: Metadata = { title: 'Audit log' };

export default async function AuditPage({ searchParams }: { searchParams: { page?: string } }) {
  await pageAdmin();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { entries, pagination } = await listAuditLog(page);
  return (
    <div className="space-y-4">
      <h1>Audit log</h1>
      {entries.length === 0 ? <EmptyState title="No admin actions yet" /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-3">When</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Target</th><th className="p-3">Details</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap p-3">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="p-3">{e.actor}</td>
                  <td className="p-3 font-mono text-xs">{e.action}</td>
                  <td className="p-3">
                    {e.targetType === 'user' && e.targetId ? <Link className="underline" href={`/admin/members/${e.targetId}`}>member</Link> : e.targetType}
                  </td>
                  <td className="p-3 text-xs text-gray-600">{e.details ? JSON.stringify(e.details) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pagination.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex justify-between text-sm">
          {page > 1 ? <Link className="underline" href={`/admin/audit?page=${page - 1}`}>← Newer</Link> : <span />}
          <span>Page {page} of {pagination.totalPages}</span>
          {page < pagination.totalPages ? <Link className="underline" href={`/admin/audit?page=${page + 1}`}>Older →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
