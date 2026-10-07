import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageActiveMember } from '@/lib/auth/guards';
import { getConversation, listConversations } from '@/lib/services/messaging';
import { AppError } from '@/lib/errors';
import { ConversationList } from '../conversation-list';
import { Thread } from './thread';

export const metadata: Metadata = { title: 'Conversation' };

export default async function ConversationPage({ params }: { params: { userId: string } }) {
  const user = await pageActiveMember();
  const [conversation, conversations] = await Promise.all([
    getConversation(user.id, params.userId).catch((e) => {
      if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
      throw e;
    }),
    listConversations(user.id),
  ]);
  return (
    <div className="mx-auto grid max-w-[1100px] gap-5 lg:grid-cols-[360px_1fr]">
      <div className="hidden lg:block">
        <h1 className="mb-5">Messages</h1>
        <ConversationList conversations={conversations} activeId={params.userId} />
      </div>
      <Thread initial={conversation} />
    </div>
  );
}
