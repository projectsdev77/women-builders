import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { APP_NAME } from '@/lib/config';
import { AdminNav } from '@/components/admin/admin-nav';
import { LogoutButton } from '@/components/logout-button';
import { followUpQueue } from '@/lib/services/admin/prospects';
import { openRequestCounts } from '@/lib/services/invite-requests';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await pageAdmin();
  const [requests, reports, followUps] = await Promise.all([
    openRequestCounts(),
    prisma.report.count({ where: { status: 'OPEN' } }),
    followUpQueue(),
  ]);
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-bold text-brand-700">{APP_NAME} · Admin</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">{admin.name}</span>
            {admin.profile && <Link href="/dashboard" className="underline">Member view</Link>}
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[220px_1fr]">
        <AdminNav counts={{ requests: requests.open, requestsOverdue: requests.overdue, reports, followUps: followUps.length }} />
        <main id="main" className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
