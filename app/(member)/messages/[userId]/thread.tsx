'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, CornerUpRight, Flag, MoreHorizontal, Send } from 'lucide-react';
import { Avatar, Notice, cx } from '@/components/ui';
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
  const [menuId, setMenuId] = useState<string | null>(null);
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
    <div className="flex h-[calc(100dvh-14rem)] min-h-[420px] flex-col overflow-hidden rounded-[32px] bg-white lg:h-[calc(100dvh-7rem)]">
      <header className="flex items-center gap-3 border-b border-line p-4">
        <Link href="/messages" aria-label="Back to messages" className="-ml-1 rounded-full p-1.5 hover:bg-cream lg:hidden">
          <ChevronLeft size={22} strokeWidth={1.75} />
        </Link>
        <Avatar name={other.name} size={44} photoUrl={other.photoUrl} ghost={other.deleted} role={other.role} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold">
            {other.deleted ? <span className="italic">Deleted account</span> : other.active ? <Link href={`/members/${other.id}`} className="hover:underline">{other.name}</Link> : other.name}
          </p>
          {other.headline && <p className="truncate text-[14px] text-ink-muted">{other.headline}</p>}
        </div>
      </header>

      <ol className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6" aria-live="polite" aria-label={`Conversation with ${other.name}`}>
        {initial.introduction && (
          <li className="mx-auto mb-4 max-w-lg space-y-3 rounded-[24px] bg-operator-tint p-5">
            <p className="flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[.1em]">
              <CornerUpRight size={13} strokeWidth={2} aria-hidden /> Introduced by {initial.introduction.by}
            </p>
            {initial.introduction.introducerNote && <blockquote className="whitespace-pre-line font-display text-[20px] leading-snug">“{initial.introduction.introducerNote}”</blockquote>}
            {initial.introduction.requesterNote && (
              <blockquote className="whitespace-pre-line text-[14.5px] text-ink-muted">
                <span className="block font-mono text-[11.5px] uppercase tracking-[.08em]">{initial.introduction.requesterName.split(' ')[0]} wrote</span>“{initial.introduction.requesterNote}”
              </blockquote>
            )}
          </li>
        )}
        {messages.length === 0 && pending.length === 0 && (
          <li className="py-8 text-center text-[14px] text-ink-subtle">This is the start of your conversation with {other.name.split(' ')[0]}.</li>
        )}
        {[...messages, ...pending].map((m) => (
          <li key={m.id} className={cx('group relative flex flex-col', m.fromMe ? 'items-end' : 'items-start')}>
            <div className={cx('flex max-w-[82%] items-start gap-1', m.fromMe && 'flex-row-reverse')}>
              <div
                className={cx(
                  'whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-snug',
                  m.fromMe ? 'rounded-[18px_18px_6px_18px] bg-forest text-cream' : 'rounded-[18px_18px_18px_6px] border border-line bg-cream',
                )}
              >
                {m.content}
              </div>
              {!m.fromMe && (
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Message options"
                    aria-expanded={menuId === m.id}
                    onClick={() => setMenuId(menuId === m.id ? null : m.id)}
                    className="rounded-full p-1.5 text-ink-subtle hover:bg-cream focus:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuId === m.id && (
                    <div role="menu" className="absolute left-0 top-full z-10 mt-1 w-40 rounded-field border border-line bg-white p-1 shadow-lift">
                      <button
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded-chip px-3 py-2 text-left text-[14px] font-semibold hover:bg-cream"
                        onClick={() => { setMenuId(null); setReportId(m.id); }}
                      >
                        <Flag size={15} aria-hidden /> Report message
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-1 flex gap-2 font-mono text-[11.5px] text-ink-subtle">
              <time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</time>
              {'status' in m && m.status === 'sending' && <span>Sending…</span>}
              {'status' in m && m.status === 'failed' && (
                <button className="font-sans font-semibold text-danger underline" onClick={() => send(m.content, m.id)}>Failed. Retry</button>
              )}
              {m.fromMe && !('status' in m) && m.readAt && <span>Read</span>}
            </div>
          </li>
        ))}
        <div ref={endRef} />
      </ol>

      <footer className="border-t border-line p-3 sm:p-4">
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
              {error && <p role="alert" className="mb-1 px-2 text-[14px] text-danger">{error}</p>}
              <label htmlFor="composer" className="sr-only">Message {other.name}</label>
              <textarea
                id="composer"
                rows={1}
                maxLength={5000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Write a message…"
                className="block max-h-32 min-h-[48px] w-full resize-none rounded-[24px] border-[1.5px] border-field bg-white px-5 py-3 text-[15px] focus:border-forest focus:shadow-focus-field focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest text-cream shadow-press-sm transition-transform active:translate-y-0.5 disabled:opacity-40"
            >
              <Send size={18} strokeWidth={2} />
            </button>
          </form>
        )}
      </footer>
      {reportId && (
        <ReportDialog open onClose={() => setReportId(null)} memberId={other.id} memberName={other.name} messageId={reportId} />
      )}
    </div>
  );
}
