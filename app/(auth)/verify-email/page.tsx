'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Notice } from '@/components/ui';
import { api } from '@/lib/client/api';

function Verify() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This link is missing its token.');
      return;
    }
    api('/api/auth/verify-email', { body: { token } }).then((res) => {
      if (res.ok) setState('done');
      else {
        setState('error');
        setMessage(res.error.message);
      }
    });
  }, [token]);

  if (state === 'working') return <p>Confirming your email…</p>;
  if (state === 'error')
    return (
      <Notice tone="error">
        {message} You can request a new link from your <Link href="/pending" className="underline">application page</Link>.
      </Notice>
    );
  return (
    <Notice tone="success">
      Your email is confirmed. Our team will review your application.{' '}
      <Link href="/pending" className="underline">View application status</Link>
    </Notice>
  );
}

export default function VerifyEmailPage() {
  return (
    <Card className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Confirm your email</h1>
      <Suspense>
        <Verify />
      </Suspense>
    </Card>
  );
}
