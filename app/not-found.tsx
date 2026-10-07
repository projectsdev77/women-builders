import Link from 'next/link';
import { buttonClass } from '@/components/ui';
import { StatusPage } from '@/components/public/status-page';

export default function NotFound() {
  return (
    <StatusPage title="We couldn't find that page" actions={<Link href="/dashboard" className={buttonClass('primary', 'md')}>Go home</Link>}>
      <p>The page may have moved, or this member&apos;s profile isn&apos;t available.</p>
    </StatusPage>
  );
}
