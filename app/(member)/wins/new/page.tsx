import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { winSources } from '@/lib/services/wins';
import { Card } from '@/components/ui';
import { WinForm } from './win-form';

export const metadata: Metadata = { title: 'Share a win' };

/** Linked from Home, Introductions, past gatherings and connection profiles (?with=, ?introduction=, ?gathering=). */
export default async function NewWinPage({ searchParams }: { searchParams: { with?: string; introduction?: string; gathering?: string } }) {
  const user = await pageActiveMember();
  const [sources, withUser] = await Promise.all([
    winSources(user.id),
    searchParams.with
      ? prisma.user.findFirst({ where: { id: searchParams.with, accountStatus: 'ACTIVE', profile: { isNot: null } }, select: { id: true, name: true } })
      : Promise.resolve(null),
  ]);
  const intro = sources.introductions.find((i) => i.id === searchParams.introduction);
  const gathering = sources.gatherings.find((g) => g.id === searchParams.gathering);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/wins" className="text-sm text-brand-700 underline">← Wins</Link>
      <h1 className="text-2xl font-semibold">Share a win</h1>
      <p className="text-sm text-gray-600">Something came of it? Tell us. It celebrates the people involved and shows the network works.</p>
      <Card className="p-6">
        <WinForm
          thisMonth={new Date().toISOString().slice(0, 7)}
          initialWith={withUser && withUser.id !== user.id ? [withUser] : []}
          sources={sources}
          initialSource={intro ? { source: 'INTRODUCTION', introductionId: intro.id } : gathering ? { source: 'GATHERING', gatheringId: gathering.id } : { source: withUser ? 'CONNECTION' : 'OTHER' }}
        />
      </Card>
    </div>
  );
}
