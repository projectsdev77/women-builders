import type { Metadata } from 'next';
import Link from 'next/link';
import { pageActiveMember } from '@/lib/auth/guards';
import { listConversations } from '@/lib/services/messaging';
import { Avatar, EmptyState, cx } from '@/components/ui';

export const metadata: Metadata = { title: 'Messages' };

function when(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default async function MessagesPage() {
  const user = await pageActiveMember();
  const conversations = await listConversations(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Messages</h1>
      {conversations.length === 0 ? (
        <EmptyState title="No conversations yet">
          You can message anyone you&apos;re connected with. <Link href="/connections" className="underline">See your connections</Link>
        </EmptyState>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {conversations.map((c) => (
            <li key={c.member.id}>
              <Link href={`/messages/${c.member.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <Avatar name={c.member.name} photoUrl={c.member.photoUrl} ghost={c.member.deleted} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cx('truncate', c.unreadCount > 0 ? 'font-semibold' : 'font-medium')}>
                      {c.member.name}
                      {c.readOnly && <span className="ml-2 text-xs font-normal text-gray-500">(read-only)</span>}
                    </span>
                    {c.lastMessage && <span className="shrink-0 text-xs text-gray-500">{when(c.lastMessage.createdAt)}</span>}
                  </div>
                  <p className={cx('truncate text-sm', c.unreadCount > 0 ? 'text-gray-900' : 'text-gray-500')}>
                    {c.lastMessage ? `${c.lastMessage.fromMe ? 'You: ' : ''}${c.lastMessage.content}` : 'Say hello 👋'}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="rounded-full bg-brand-600 px-2 text-xs text-white">
                    {c.unreadCount}<span className="sr-only"> unread</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
