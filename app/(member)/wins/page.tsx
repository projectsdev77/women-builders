import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { myWins } from '@/lib/services/wins';
import { EmptyState, buttonClass } from '@/components/ui';
import { WinCard } from '@/components/wins/win-card';
import { formatThousands } from '@/components/profile/member-profile';
import { ConfirmWin, DeleteWin } from './win-actions';

export const metadata: Metadata = { title: 'Wins' };

const VISIBILITY = { ANONYMOUS: 'Counted anonymously', MEMBERS: 'Members can see it', QUOTABLE: 'May be quoted on the public site' } as const;

export default async function WinsPage() {
  const user = await pageActiveMember();
  const { logged, toConfirm } = await myWins(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-4">
        <h1>Wins</h1>
        <p className="max-w-xl text-[16px] text-ink-muted">What came of the network: investments, hires, advisors, customers. You choose who sees each one.</p>
        <Link href="/wins/new" className={buttonClass('primary', 'md')}>Share a win</Link>
      </div>

      {toConfirm.length > 0 && (
        <section aria-labelledby="confirm" className="space-y-4 rounded-[32px] bg-founder-tint p-6 sm:p-8">
          <h2 id="confirm" className="text-[28px]">Waiting for you to confirm</h2>
          {toConfirm.map((w) => (
            <WinCard key={w.id} win={w} showAuthor={false}><ConfirmWin id={w.id} authorName={w.author.name} /></WinCard>
          ))}
        </section>
      )}

      <section aria-labelledby="mine" className="space-y-4">
        <h2 id="mine" className="text-[28px]">Wins you shared</h2>
        {logged.length === 0 ? (
          <EmptyState title="No wins yet">When something comes of an introduction, a gathering or a connection, <Link href="/wins/new" className="font-semibold underline">share it</Link>.</EmptyState>
        ) : (
          logged.map((w, i) => (
            <WinCard key={w.id} win={w} showAuthor={false} tilt={i % 2 ? 'right' : 'left'}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3 text-[13px] text-ink-muted">
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
