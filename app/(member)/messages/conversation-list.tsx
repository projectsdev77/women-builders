import Link from 'next/link';
import { Avatar, EmptyState, cx } from '@/components/ui';
import type { listConversations } from '@/lib/services/messaging';

type Conversations = Awaited<ReturnType<typeof listConversations>>;

function when(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ConversationList({ conversations, activeId }: { conversations: Conversations; activeId?: string }) {
  if (conversations.length === 0) {
    return (
      <EmptyState title="No conversations yet">
        You can message anyone you&apos;re connected with. <Link href="/connections" className="font-semibold underline">See your connections</Link>
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-1 rounded-[32px] bg-white p-2">
      {conversations.map((c) => {
        const unread = c.unreadCount > 0;
        return (
          <li key={c.member.id}>
            <Link
              href={`/messages/${c.member.id}`}
              aria-current={c.member.id === activeId ? 'page' : undefined}
              className={cx('flex items-center gap-3 rounded-[24px] p-3 transition-colors hover:bg-cream', c.member.id === activeId && 'bg-wash')}
            >
              <Avatar name={c.member.name} size={48} photoUrl={c.member.photoUrl} ghost={c.member.deleted} role={c.member.role} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cx('truncate text-[15.5px]', unread ? 'font-bold' : 'font-medium', c.member.deleted && 'italic')}>
                    {c.member.deleted ? 'Deleted account' : c.member.name}
                  </span>
                  {c.lastMessage && <span className="shrink-0 font-mono text-[12px] text-ink-subtle">{when(c.lastMessage.createdAt)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className={cx('truncate text-[14px]', unread ? 'font-bold text-forest' : 'text-ink-muted')}>
                    {c.lastMessage ? `${c.lastMessage.fromMe ? 'You: ' : ''}${c.lastMessage.content}` : 'Say hello 👋'}
                  </p>
                  {unread && (
                    <span className="inline-flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-rose px-1.5 text-[12px] font-bold text-white">
                      {c.unreadCount}<span className="sr-only"> unread</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
