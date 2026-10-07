import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { myWins } from '@/lib/services/wins';
import { EmptyState } from '@/components/ui';
import { WinCard } from '@/components/wins/win-card';
import { formatThousands } from '@/components/profile/member-profile';
import { ConfirmWin, DeleteWin } from './win-actions';

export const metadata: Metadata = { title: 'Wins' };

const VISIBILITY = { ANONYMOUS: 'Counted anonymously', MEMBERS: 'Members can see it', QUOTABLE: 'May be quoted on the public site' } as const;

export default async function WinsPage() {
  const user = await pageActiveMember();
  const { logged, toConfirm } = await myWins(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Wins</h1>
          <p className="text-sm text-gray-600">What came of the network: investments, hires, advisors, customers. You choose who sees each one.</p>
        </div>
        <Link href="/wins/new" className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-forest px-5 text-[15px] font-bold text-cream shadow-press-sm hover:bg-[#2E5A40]">Share a win</Link>
      </div>

      {toConfirm.length > 0 && (
        <section aria-labelledby="confirm" className="space-y-3">
          <h2 id="confirm" className="text-lg font-semibold">Waiting for you to confirm</h2>
          {toConfirm.map((w) => (
            <WinCard key={w.id} win={w}><ConfirmWin id={w.id} authorName={w.author.name} /></WinCard>
          ))}
        </section>
      )}

      <section aria-labelledby="mine" className="space-y-3">
        <h2 id="mine" className="text-lg font-semibold">Wins you shared</h2>
        {logged.length === 0 ? (
          <EmptyState title="No wins yet">When something comes of an introduction, a gathering or a connection, <Link href="/wins/new" className="underline">share it</Link>.</EmptyState>
        ) : (
          logged.map((w) => (
            <WinCard key={w.id} win={w} showAuthor={false}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                <span>
                  {VISIBILITY[w.visibility]}
                  {w.amountK != null && <> · amount {formatThousands(w.amountK)} (private, team totals only)</>}
                  {w.with.some((x) => x.pending) && <> · waiting for confirmation</>}
                </span>
                <DeleteWin id={w.id} />
              </div>
            </WinCard>
          ))
        )}
      </section>
    </div>
  );
}
