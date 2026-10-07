import type { Metadata } from 'next';
import Link from 'next/link';
import { CornerUpRight } from 'lucide-react';
import { pageActiveMember } from '@/lib/auth/guards';
import { introductionTabCounts, listIntroductions, type IntroTab } from '@/lib/services/introductions';
import { Avatar, EmptyState, PageHeader, SegmentedTabs, buttonClass, cx } from '@/components/ui';
import { IntroButtons } from './intro-buttons';

export const metadata: Metadata = { title: 'Introductions' };

const TABS: Array<[IntroTab, string]> = [
  ['asked', 'Asked of me'],
  ['for-me', 'For me'],
  ['mine', 'My requests'],
];
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');

type Tone = 'success' | 'neutral' | 'warning' | 'brand';
const TONE: Record<Tone, string> = {
  success: 'bg-success-bg text-success',
  neutral: 'bg-cream text-ink-muted border border-line',
  warning: 'bg-warning-bg text-warning',
  brand: 'bg-founder-tint text-forest',
};
const Status = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => (
  <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-bold', TONE[tone])}>{children}</span>
);

const MINE_STATUS: Record<string, (b: string) => [string, Tone]> = {
  waiting_introducer: (b) => [`Waiting for ${b}`, 'warning'],
  waiting_target: (b) => [`${b.charAt(0).toUpperCase()}${b.slice(1)} introduced you`, 'brand'],
  connected: () => ['✓ Connected', 'success'],
  no_introduction: () => ['No introduction was made', 'neutral'],
  cancelled: () => ['Withdrawn', 'neutral'],
};

type Person = { id: string | null; name: string; headline: string | null; photoUrl: string | null };

function PersonPill({ p }: { p: Person }) {
  const body = (
    <span className="flex items-center gap-2.5 rounded-full bg-cream py-1.5 pl-1.5 pr-5">
      <Avatar name={p.name} size={36} photoUrl={p.photoUrl} ghost={!p.id && p.name !== 'The Women Builders team'} />
      <span className="min-w-0 text-left">
        <span className="block text-[14px] font-bold leading-tight">{p.name}</span>
        {p.headline && <span className="block truncate text-[12.5px] text-ink-subtle">{p.headline}</span>}
      </span>
    </span>
  );
  return p.id ? <Link href={`/members/${p.id}`}>{body}</Link> : body;
}

const NOTE = { cream: 'bg-cream', butter: 'bg-butter-tint', lavender: 'bg-operator-tint' } as const;
function Note({ label, text, tone = 'cream' }: { label: string; text: string | null | undefined; tone?: keyof typeof NOTE }) {
  if (!text) return null;
  return (
    <figure className={cx('rounded-2xl p-4', NOTE[tone])}>
      <figcaption className="mb-1 font-mono text-[11px] uppercase tracking-[.1em] text-ink-muted">{label}</figcaption>
      <blockquote className="whitespace-pre-line text-[15px] leading-relaxed">{text}</blockquote>
    </figure>
  );
}

const Card = ({ children }: { children: React.ReactNode }) => <article className="space-y-4 rounded-[28px] bg-white p-[clamp(18px,2.5vw,28px)]">{children}</article>;

export default async function IntroductionsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await pageActiveMember();
  const tab: IntroTab = searchParams.tab === 'for-me' ? 'for-me' : searchParams.tab === 'mine' ? 'mine' : 'asked';
  const [items, counts] = await Promise.all([listIntroductions(user.id, tab), introductionTabCounts(user.id)]);

  return (
    <div className="mx-auto max-w-[880px] space-y-7">
      <PageHeader title="Introductions" lede="Warm introductions through people who know you both. Nobody is ever told who said no." />
      <SegmentedTabs label="Introductions" tabs={TABS.map(([t, label]) => ({ href: `/introductions?tab=${t}`, label, active: t === tab, count: counts[t] }))} />

      {items.length === 0 ? (
        <EmptyState title={tab === 'asked' ? 'Nobody has asked you for an introduction yet' : tab === 'for-me' ? 'No introductions for you yet' : "You haven't asked for an introduction yet"}>
          {tab === 'mine' && <>Find someone on <Link href="/search" className="underline">Discover</Link> or <Link href="/capital" className="underline">Capital</Link> and choose &ldquo;Ask for an introduction&rdquo;.</>}
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.id}>
              {tab === 'asked' && (
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="font-sans text-[18px] font-bold leading-snug">
                      {i.requester.name.split(' ')[0]} would like to meet {i.target.name.split(' ')[0]}.{i.actionable && ' Would you introduce them?'}
                    </h2>
                    {i.actionable ? <Status tone="warning">Answer by {day('dueAt' in i ? i.dueAt : null)}</Status> : <Status tone="neutral">{i.status === 'introduced' ? 'You introduced them' : i.status === 'passed' ? 'You passed' : 'Expired'}</Status>}
                  </div>
                  <div className="flex flex-wrap gap-3"><PersonPill p={i.requester} /><PersonPill p={i.target} /></div>
                  <Note label={`${i.requester.name.split(' ')[0]}'s note to you`} text={'noteToIntroducer' in i ? i.noteToIntroducer : null} />
                  <Note label={`For ${i.target.name.split(' ')[0]} · forwarded if you introduce`} text={i.noteToTarget} tone="butter" />
                  {i.actionable && <IntroButtons id={i.id} role="introducer" requesterName={i.requester.name} targetName={i.target.name} reportMember={{ id: i.requester.id!, name: i.requester.name }} />}
                </Card>
              )}
              {tab === 'for-me' && (
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="font-sans text-[18px] font-bold leading-snug">{i.introducer?.name} would like to introduce you to {i.requester.name}.</h2>
                    {i.actionable ? <Status tone="warning">Answer by {day('dueAt' in i ? i.dueAt : null)}</Status> : <Status tone={i.status === 'accepted' ? 'success' : 'neutral'}>{i.status === 'accepted' ? '✓ Connected' : i.status === 'declined' ? 'You said not now' : 'Expired'}</Status>}
                  </div>
                  <div className="flex flex-wrap gap-3"><PersonPill p={i.requester} /></div>
                  <Note label={`From ${i.introducer?.name}`} text={'introducerNote' in i ? i.introducerNote : null} tone="lavender" />
                  <Note label={`From ${i.requester.name.split(' ')[0]}`} text={i.noteToTarget} />
                  {i.actionable && <IntroButtons id={i.id} role="target" requesterName={i.requester.name} targetName={i.target.name} reportMember={{ id: i.requester.id!, name: i.requester.name }} />}
                  {i.status === 'accepted' && (
                    <div className="flex flex-wrap gap-4 text-[15px] font-bold">
                      <Link href={`/messages/${i.requester.id}`} className={buttonClass('primary', 'sm')}>Open your conversation</Link>
                      <Link href={`/wins/new?introduction=${i.id}&with=${i.requester.id}`} className="min-h-[44px] content-center underline underline-offset-4">Share a win</Link>
                    </div>
                  )}
                </Card>
              )}
              {tab === 'mine' && (() => {
                const b = i.introducer?.name.split(' ')[0] ?? 'them';
                const [label, tone] = MINE_STATUS[i.status]!(i.viaTeam ? 'the team' : b);
                return (
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="font-sans text-[18px] font-bold leading-snug">To meet {i.target.name} via {i.introducer?.name}</h2>
                      <Status tone={tone}>{label}</Status>
                    </div>
                    <div className="flex flex-wrap gap-3"><PersonPill p={i.target} /></div>
                    <p className="font-mono text-[12px] text-ink-subtle">Asked {day(i.createdAt)}</p>
                    {(i.status === 'waiting_introducer' || i.status === 'waiting_target') && <IntroButtons id={i.id} role="requester" requesterName={i.requester.name} targetName={i.target.name} />}
                    {i.status === 'connected' && (
                      <div className="flex flex-wrap gap-4 text-[15px] font-bold">
                        <Link href={`/messages/${i.target.id}`} className={buttonClass('primary', 'sm')}>Open your conversation</Link>
                        <Link href={`/wins/new?introduction=${i.id}&with=${i.target.id}`} className="min-h-[44px] content-center underline underline-offset-4">Share a win</Link>
                      </div>
                    )}
                  </Card>
                );
              })()}
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-1.5 text-[13px] text-ink-subtle"><CornerUpRight size={14} aria-hidden /> Declines and expiries are never announced.</p>
    </div>
  );
}
