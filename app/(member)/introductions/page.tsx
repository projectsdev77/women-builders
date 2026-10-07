import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { listIntroductions, type IntroTab } from '@/lib/services/introductions';
import { Avatar, Badge, Card, EmptyState } from '@/components/ui';
import { IntroButtons } from './intro-buttons';

export const metadata: Metadata = { title: 'Introductions' };

const TABS: Array<[IntroTab, string]> = [
  ['asked', 'Asked of me'],
  ['for-me', 'For me'],
  ['mine', 'My requests'],
];
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');

type Tone = 'yellow' | 'brand' | 'green' | 'gray';
const MINE_STATUS: Record<string, (b: string) => [string, Tone]> = {
  waiting_introducer: (b) => [`Waiting for ${b}`, 'yellow'],
  waiting_target: (b) => [`${b.charAt(0).toUpperCase()}${b.slice(1)} introduced you, waiting for a reply`, 'brand'],
  connected: () => ['Connected', 'green'],
  no_introduction: () => ['No introduction was made', 'gray'],
  cancelled: () => ['Withdrawn', 'gray'],
};

type Person = { id: string | null; name: string; headline: string | null; photoUrl: string | null };

function PersonLine({ p, label }: { p: Person; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={p.name} size={36} photoUrl={p.photoUrl} />
      <div className="min-w-0">
        {label && <span className="block text-xs text-gray-500">{label}</span>}
        {p.id ? <Link href={`/members/${p.id}`} className="font-medium hover:underline">{p.name}</Link> : <span className="font-medium">{p.name}</span>}
        {p.headline && <span className="block truncate text-xs text-gray-600">{p.headline}</span>}
      </div>
    </div>
  );
}

function Quote({ who, text }: { who: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <figure className="rounded-md bg-gray-50 p-3 text-sm">
      <figcaption className="mb-1 text-xs font-medium text-gray-600">{who}</figcaption>
      <blockquote className="whitespace-pre-line">{text}</blockquote>
    </figure>
  );
}

export default async function IntroductionsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await pageActiveMember();
  const tab: IntroTab = searchParams.tab === 'asked' || searchParams.tab === 'for-me' ? searchParams.tab : searchParams.tab === 'mine' ? 'mine' : 'asked';
  const items = await listIntroductions(user.id, tab);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Introductions</h1>
        <p className="text-sm text-gray-600">Warm introductions through people who know you both. Nobody is ever told who said no.</p>
      </div>
      <nav aria-label="Introductions" className="flex gap-4 border-b border-gray-200">
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/introductions?tab=${t}`} aria-current={t === tab ? 'page' : undefined}
            className={t === tab ? 'border-b-2 border-brand-600 pb-2 font-semibold' : 'pb-2 text-gray-600'}>
            {label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState title={tab === 'asked' ? 'Nobody has asked you for an introduction yet' : tab === 'for-me' ? 'No introductions for you yet' : "You haven't asked for an introduction yet"}>
          {tab === 'mine' && <>Find someone on <Link href="/search" className="underline">Discover</Link> or <Link href="/capital" className="underline">Capital</Link> and choose &ldquo;Ask for an introduction&rdquo;.</>}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="space-y-3">
                {tab === 'asked' && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm"><strong>{i.requester.name}</strong> would like to meet <strong>{i.target.name}</strong></p>
                      {i.actionable ? <Badge tone="yellow">Answer by {day('dueAt' in i ? i.dueAt : null)}</Badge> : <Badge>{i.status === 'introduced' ? 'You introduced them' : i.status === 'passed' ? 'You passed' : 'Expired'}</Badge>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2"><PersonLine p={i.requester} label="Asking" /><PersonLine p={i.target} label="Wants to meet" /></div>
                    <Quote who={`${i.requester.name.split(' ')[0]}'s note to you`} text={'noteToIntroducer' in i ? i.noteToIntroducer : null} />
                    <Quote who={`Note for ${i.target.name.split(' ')[0]} (forwarded if you introduce)`} text={i.noteToTarget} />
                    {i.actionable && <IntroButtons id={i.id} role="introducer" requesterName={i.requester.name} targetName={i.target.name} reportMember={{ id: i.requester.id!, name: i.requester.name }} />}
                  </>
                )}
                {tab === 'for-me' && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm"><strong>{i.introducer?.name}</strong> would like to introduce you to <strong>{i.requester.name}</strong></p>
                      {i.actionable ? <Badge tone="yellow">Answer by {day('dueAt' in i ? i.dueAt : null)}</Badge> : <Badge tone={i.status === 'accepted' ? 'green' : 'gray'}>{i.status === 'accepted' ? 'Connected' : i.status === 'declined' ? 'You said not now' : 'Expired'}</Badge>}
                    </div>
                    <PersonLine p={i.requester} />
                    <Quote who={`From ${i.introducer?.name}`} text={'introducerNote' in i ? i.introducerNote : null} />
                    <Quote who={`From ${i.requester.name.split(' ')[0]}`} text={i.noteToTarget} />
                    {i.actionable && <IntroButtons id={i.id} role="target" requesterName={i.requester.name} targetName={i.target.name} reportMember={{ id: i.requester.id!, name: i.requester.name }} />}
                    {i.status === 'accepted' && (
                      <div className="flex gap-4 text-sm">
                        <Link href={`/messages/${i.requester.id}`} className="underline">Open your conversation</Link>
                        <Link href={`/wins/new?introduction=${i.id}&with=${i.requester.id}`} className="underline">Share a win</Link>
                      </div>
                    )}
                  </>
                )}
                {tab === 'mine' && (() => {
                  const b = i.introducer?.name.split(' ')[0] ?? 'them';
                  const [label, tone] = MINE_STATUS[i.status]!(i.viaTeam ? 'the team' : b);
                  return (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm">To meet <strong>{i.target.name}</strong> via <strong>{i.introducer?.name}</strong></p>
                        <Badge tone={tone}>{label}</Badge>
                      </div>
                      <PersonLine p={i.target} />
                      <p className="text-xs text-gray-500">Asked {day(i.createdAt)}</p>
                      {(i.status === 'waiting_introducer' || i.status === 'waiting_target') && <IntroButtons id={i.id} role="requester" requesterName={i.requester.name} targetName={i.target.name} />}
                      {i.status === 'connected' && (
                        <div className="flex gap-4 text-sm">
                          <Link href={`/messages/${i.target.id}`} className="underline">Open your conversation</Link>
                          <Link href={`/wins/new?introduction=${i.id}&with=${i.target.id}`} className="underline">Share a win</Link>
                        </div>
                      )}
                    </>
                  );
                })()}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
