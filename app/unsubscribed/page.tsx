import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

const LABELS: Record<string, string> = {
  connection_request: 'new connection requests',
  connection_accepted: 'accepted connection requests',
  new_message: 'new messages',
};

export default function UnsubscribedPage({ searchParams }: { searchParams: { type?: string; invalid?: string } }) {
  const label = searchParams.type ? LABELS[searchParams.type] : undefined;
  return (
    <main id="main" className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <p className="font-bold text-brand-700">{APP_NAME}</p>
      {label ? (
        <>
          <h1 className="text-2xl font-semibold">You&apos;re unsubscribed</h1>
          <p className="text-gray-700">You won&apos;t get emails about {label} anymore.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">This link didn&apos;t work</h1>
          <p className="text-gray-700">You can manage all email settings after logging in.</p>
        </>
      )}
      <Link href="/settings" className="inline-block text-brand-700 underline">Manage email settings</Link>
    </main>
  );
}
