'use client';

import { buttonClass } from '@/components/ui';
import { StatusPage } from '@/components/public/status-page';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPage
      title="Something went wrong"
      actions={<button onClick={reset} className={buttonClass('primary', 'md')}>Try again</button>}
    >
      <p>Please try again. If it keeps happening, contact us{error.digest ? ` and mention reference ${error.digest}` : ''}.</p>
    </StatusPage>
  );
}
