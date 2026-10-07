import Link from 'next/link';
import { pageStaff } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { AdminNav } from '@/components/admin/admin-nav';
import { LogoutButton } from '@/components/logout-button';
import { followUpQueue } from '@/lib/services/admin/prospects';
import { openRequestCounts } from '@/lib/services/invite-requests';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await pageStaff();
  const [requests, reports, followUps, introductions] = await Promise.all([
    openRequestCounts(),
    prisma.report.count({ where: { status: 'OPEN' } }),
    followUpQueue(),
    prisma.introduction.count({ where: { viaTeam: true, status: 'ASKED', introducerDueAt: { gt: new Date() } } }),
  ]);
  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex flex-wrap items-center justify-between gap-4 bg-forest px-4 py-3 text-cream sm:px-6">
        <Link href={admin.isAdmin ? '/admin' : '/admin/requests'} className="font-display text-[20px] leading-none">
          women builders<span className="text-founder">.</span>
          <span className="ml-2 rounded-[6px] bg-founder px-2 py-[3px] align-middle font-mono text-[12px] uppercase text-forest">{admin.isAdmin ? 'Admin' : 'Reviewer'}</span>
        </Link>
        <div className="flex items-center gap-5 text-[14px] font-semibold">
          {admin.profile && <Link href="/dashboard" className="underline underline-offset-4 hover:text-founder">Member view</Link>}
          <span>{admin.name}</span>
          <LogoutButton className="min-h-[44px] underline-offset-4 hover:underline" />
        </div>
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="border-b border-line px-3 py-3 lg:w-[232px] lg:shrink-0 lg:border-b-0 lg:border-r lg:px-3.5 lg:py-5">
          <AdminNav reviewerOnly={!admin.isAdmin} counts={{ requests: requests.open, requestsOverdue: requests.overdue, reports, followUps: followUps.length, introductions }} />
        </div>
        <main id="main" className="min-w-0 flex-1 px-4 pb-20 pt-7 sm:px-[clamp(16px,3vw,36px)]">{children}</main>
      </div>
    </div>
  );
}
