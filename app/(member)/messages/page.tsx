import type { Metadata } from 'next';
import { MessageCircle } from 'lucide-react';
import { pageActiveMember } from '@/lib/auth/guards';
import { listConversations } from '@/lib/services/messaging';
import { ConversationList } from './conversation-list';

export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage() {
  const user = await pageActiveMember();
  const conversations = await listConversations(user.id);
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <h1>Messages</h1>
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <ConversationList conversations={conversations} />
        {conversations.length > 0 && (
          <div className="hidden min-h-[360px] flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-field p-8 text-center lg:flex">
            <MessageCircle size={32} strokeWidth={1.5} aria-hidden />
            <p className="font-display text-[22px]">Pick a conversation</p>
            <p className="text-[14px] text-ink-muted">Your messages appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
