import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { dashboardMetrics, defaultRange } from '@/lib/services/admin/dashboard';
import { addDays, formatDateOnly, parseDateOnly } from '@/lib/services/admin/dates';
import { Badge, Button, Card, Input } from '@/components/ui';
import { STATUS_LABELS, STATUS_TONE, fmtDay } from '@/components/admin/labels';

export const metadata: Metadata = { title: 'Admin dashboard' };

function Stat({ label, value, href, sub }: { label: string; value: number; href?: string; sub?: string }) {
  const body = (
    <Card className="h-full">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-semibold">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </Card>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{body}</Link> : body;
}

export default async function AdminDashboard({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  await pageAdmin();
  const d = defaultRange();
  const from = parseDateOnly(searchParams.from) ?? d.from;
  const toInclusive = parseDateOnly(searchParams.to) ?? addDays(d.to, -1);
  const m = await dashboardMetrics({ from, to: addDays(toInclusive, 1) });
  const maxGrowth = Math.max(1, ...m.memberGrowth.map((g) => g.newMembers));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="from" className="block text-xs text-gray-600">From</label>
            <Input id="from" name="from" type="date" defaultValue={formatDateOnly(from)!} />
          </div>
          <div>
            <label htmlFor="to" className="block text-xs text-gray-600">To</label>
            <Input id="to" name="to" type="date" defaultValue={formatDateOnly(toInclusive)!} />
          </div>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active members" value={m.activeMembers} href="/admin/members?status=ACTIVE" sub={`${m.newMembersInRange} new in range`} />
        <Stat label="Invitation requests to review" value={m.requests.open} href="/admin/requests" sub={m.requests.overdue ? `${m.requests.overdue} waiting over 3 weeks` : 'None overdue'} />
        <Stat label="Open reports" value={m.openReports} href="/admin/reports" />
        <Stat label="Follow-ups in next 7 days" value={m.upcomingFollowUps.length} href="/admin/follow-ups" />
        <Stat label="Introductions made in range" value={m.introductions.made} sub={`${m.introductions.accepted} accepted`} />
        <Stat label="Team introductions in range" value={m.introductions.teamMade} href="/admin/introductions?status=HANDLED" sub={`${m.introductions.teamAccepted} accepted · ${m.introductions.teamWaiting} waiting`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">New members by month</h2>
          <div className="flex h-40 items-end gap-2" role="img" aria-label={`New members per month: ${m.memberGrowth.map((g) => `${g.month} ${g.newMembers}`).join(', ')}`}>
            {m.memberGrowth.map((g) => (
              <div key={g.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-gray-600">{g.newMembers || ''}</span>
                <div className="flex h-28 w-full items-end">
                  <div className="w-full rounded-t bg-brand-500" style={{ height: `${(g.newMembers / maxGrowth) * 100}%`, minHeight: g.newMembers ? 4 : 1 }} />
                </div>
                <span className="text-[10px] text-gray-500">{g.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Potential members by status</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(m.potentialMembersByStatus).map(([s, n]) => (
              <li key={s}>
                <Link href={`/admin/prospects?status=${s}`} className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50">
                  <Badge tone={STATUS_TONE[s]}>{STATUS_LABELS[s]}</Badge>
                  <span className="font-medium">{n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">Outreach conversion ({fmtDay(m.range.from)} – {fmtDay(m.range.to)})</h2>
        <p className="text-sm text-gray-600">For each status: how many potential members entered it in this period, and how many of them later became members.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr><th className="py-2">Status</th><th>Entered</th><th>Became members</th><th>Conversion</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {m.conversion.map((c) => (
                <tr key={c.status}>
                  <td className="py-2"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABELS[c.status]}</Badge></td>
                  <td>{c.entered}</td>
                  <td>{c.reachedApproved}</td>
                  <td>{c.rate === null ? '—' : `${c.rate}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Upcoming follow-ups</h2>
          <Link href="/admin/follow-ups" className="text-sm underline">Open queue</Link>
        </div>
        {m.upcomingFollowUps.length === 0 ? (
          <p className="text-sm text-gray-600">Nothing due in the next 7 days.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {m.upcomingFollowUps.slice(0, 10).map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2">
                <Link href={`/admin/prospects/${f.id}`} className="font-medium underline">{f.name}</Link>
                <span className={f.overdue ? 'text-red-700' : 'text-gray-600'}>
                  {f.overdue ? 'Overdue · ' : f.dueToday ? 'Today · ' : ''}{fmtDay(f.nextFollowUpDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
