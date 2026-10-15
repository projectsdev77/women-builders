import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { emailTestMode } from '@/lib/email/outbox';
import { Badge, Button, EmptyState, Input } from '@/components/ui';

export const metadata: Metadata = { title: 'Emails (test mode)' };
export const dynamic = 'force-dynamic';

const URL_RE = /(https?:\/\/[^\s<>"')]+)/g;

/** Plain email text with its links made clickable. */
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all font-semibold underline">{part}</a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/**
 * While real email is off (no RESEND_API_KEY), nothing leaves the site: this page shows what would
 * have been sent, so invitation and reset links can be tested. It disappears once email is on.
 */
export default async function TestEmailsPage({ searchParams }: { searchParams: { to?: string } }) {
  await pageAdmin();
  if (!emailTestMode()) notFound();
  const to = searchParams.to?.trim().toLowerCase();
  const emails = await prisma.emailOutbox.findMany({
    where: to ? { to: { contains: to } } : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return (
    <div className="space-y-4">
      <h1>Emails (test mode)</h1>
      <p className="max-w-3xl text-sm text-gray-600">
        Real email is off (no <code>RESEND_API_KEY</code>), so nothing is delivered. These are the emails the site would have sent, newest first, with their links. This page disappears once email is switched on.
      </p>
      <form method="get" className="flex flex-wrap gap-2" role="search">
        <label htmlFor="to" className="sr-only">Recipient</label>
        <Input id="to" name="to" defaultValue={searchParams.to} placeholder="Filter by recipient email" className="max-w-xs" />
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      {emails.length === 0 ? (
        <EmptyState title="No emails yet" />
      ) : (
        <ul className="space-y-3">
          {emails.map((e) => (
            <li key={e.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{e.subject}</span>
                  <Badge>{e.kind.replace(/_/g, ' ')}</Badge>
                  <span className="text-sm text-gray-600">to {e.to}</span>
                  <span className="ml-auto font-mono text-xs text-gray-500">{new Date(e.createdAt).toLocaleString()}</span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed"><Linkified text={e.text} /></p>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
