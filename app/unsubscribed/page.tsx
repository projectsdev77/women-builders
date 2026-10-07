import Link from 'next/link';
import { buttonClass } from '@/components/ui';
import { StatusPage } from '@/components/public/status-page';

const LABELS: Record<string, string> = {
  connection_request: 'new connection requests',
  connection_accepted: 'accepted connection requests',
  new_message: 'new messages',
};

export default function UnsubscribedPage({ searchParams }: { searchParams: { type?: string; invalid?: string } }) {
  const label = searchParams.type ? LABELS[searchParams.type] : undefined;
  return (
    <StatusPage
      title={label ? "You're unsubscribed" : "This link didn't work"}
      actions={<Link href="/settings" className={buttonClass('secondary', 'md')}>Manage email settings</Link>}
    >
      <p>{label ? `You won't get emails about ${label} anymore.` : 'You can manage all email settings after logging in.'}</p>
    </StatusPage>
  );
}
