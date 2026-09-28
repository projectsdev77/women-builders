'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Button, Notice, Textarea, cx } from '@/components/ui';
import { ReportDialog } from '@/components/member/report-dialog';
import { api } from '@/lib/client/api';
import type { getConversation, MessageItem } from '@/lib/services/messaging';

type Conversation = Awaited<ReturnType<typeof getConversation>>;
type Pending = MessageItem & { status: 'sending' | 'failed' };

const POLL_MS = 3000; // G12: meets the 5-second delivery target while the thread is open

export function Thread({ initial }: { initial: Conversation }) {
  const other = initial.other;
  const [messages, setMessages] = useState<MessageItem[]>(initial.messages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [state, setState] = useState(initial.state);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;

  const markRead = useCallback(() => api(`/api/messages/conversations/${other.id}/read`, { body: {} }), [other.id]);

  useEffect(() => {
    void markRead();
  }, [markRead]);

  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const res = await api<Conversation>(`/api/messages/conversations/${other.id}${lastId ? `?after=${lastId}` : ''}`);
      if (!res.ok) return;
      setState(res.data.state);
      if (res.data.messages.length) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...res.data.messages.filter((m) => !seen.has(m.id))];
        });
        if (res.data.messages.some((m) => !m.fromMe)) void markRead();
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [other.id, lastId, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pending.length]);

  async function send(content: string, retryOf?: string) {
    const tempId = retryOf ?? `tmp-${Date.now()}`;
    const optimistic: Pending = { id: tempId, fromMe: true, content, createdAt: new Date().toISOString(), readAt: null, status: 'sending' };
    setPending((p) => [...p.filter((x) => x.id !== tempId), optimistic]);
    setError(null);
    const res = await api<{ message: MessageItem }>('/api/messages', { body: { receiverId: other.id, content } });
    if (!res.ok) {
      setPending((p) => p.map((x) => (x.id === tempId ? { ...x, status: 'failed' } : x)));
      setError(res.error.message);
      return;
    }
    setPending((p) => p.filter((x) => x.id !== tempId));
    setMessages((prev) => (prev.some((m) => m.id === res.data.message.id) ? prev : [...prev, res.data.message]));
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-3xl flex-col rounded-lg border border-gray-200 bg-white">
      <header className="flex items-center gap-3 border-b border-gray-200 p-4">
        <Link href="/messages" className="text-sm text-brand-700 underline sm:hidden">Back</Link>
        <Avatar name={other.name} />
        <div className="min-w-0">
          <h1 className="truncate font-semibold">
            {other.active ? <Link href={`/members/${other.id}`} className="hover:underline">{other.name}</Link> : other.name}
          </h1>
          {other.headline && <p className="truncate text-sm text-gray-600">{other.headline}</p>}
        </div>
      </header>

      <ol className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite" aria-label={`Conversation with ${other.name}`}>
        {messages.length === 0 && pending.length === 0 && (
          <li className="py-8 text-center text-sm text-gray-500">This is the start of your conversation with {other.name.split(' ')[0]}.</li>
        )}
        {[...messages, ...pending].map((m) => (
          <li key={m.id} className={cx('group flex flex-col', m.fromMe ? 'items-end' : 'items-start')}>
            <div className={cx('max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm', m.fromMe ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900')}>
              {m.content}
            </div>
            <div className="mt-0.5 flex gap-2 text-xs text-gray-500">
              <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
              {'status' in m && m.status === 'sending' && <span>Sending…</span>}
              {'status' in m && m.status === 'failed' && (
                <button className="text-red-700 underline" onClick={() => send(m.content, m.id)}>Failed. Retry</button>
              )}
              {m.fromMe && !('status' in m) && m.readAt && <span>Read</span>}
              {!m.fromMe && (
                <button className="underline opacity-0 focus:opacity-100 group-hover:opacity-100" onClick={() => setReportId(m.id)}>
                  Report
                </button>
              )}
            </div>
          </li>
        ))}
        <div ref={endRef} />
      </ol>

      <footer className="border-t border-gray-200 p-3">
        {!state.canSend ? (
          <Notice tone="info">{'message' in state ? state.message : 'This conversation is read-only.'}</Notice>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const content = draft.trim();
              if (!content) return;
              setDraft('');
              void send(content);
            }}
          >
            <div className="flex-1">
              {error && <p role="alert" className="mb-1 text-sm text-red-700">{error}</p>}
              <label htmlFor="composer" className="sr-only">Message {other.name}</label>
              <Textarea
                id="composer"
                rows={2}
                maxLength={5000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
              />
            </div>
            <Button type="submit" disabled={!draft.trim()}>Send</Button>
          </form>
        )}
      </footer>
      {reportId && (
        <ReportDialog open onClose={() => setReportId(null)} memberId={other.id} memberName={other.name} messageId={reportId} />
      )}
    </div>
  );
}
