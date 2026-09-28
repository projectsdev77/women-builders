import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageActiveMember } from '@/lib/auth/guards';
import { getConversation } from '@/lib/services/messaging';
import { AppError } from '@/lib/errors';
import { Thread } from './thread';

export const metadata: Metadata = { title: 'Conversation' };

export default async function ConversationPage({ params }: { params: { userId: string } }) {
  const user = await pageActiveMember();
  const conversation = await getConversation(user.id, params.userId).catch((e) => {
    if (e instanceof AppError && e.code === 'NOT_FOUND') notFound();
    throw e;
  });
  return <Thread initial={conversation} />;
}
