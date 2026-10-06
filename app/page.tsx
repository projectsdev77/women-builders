import Link from 'next/link';
import { APP_NAME, ELIGIBILITY_STATEMENT } from '@/lib/config';

export default function LandingPage({ searchParams }: { searchParams: { deleted?: string; deactivated?: string } }) {
  return (
    <main id="main" className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-20">
      {searchParams.deleted && <p role="status" className="rounded-md bg-green-50 p-3 text-green-900">Your account has been deleted.</p>}
      {searchParams.deactivated && <p role="status" className="rounded-md bg-green-50 p-3 text-green-900">Your account is deactivated. Log in any time to reactivate it.</p>}
      <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
      <p className="text-lg text-gray-700">
        Find the people who matter to what you&apos;re building: by what they do, what they
        need, and what they can offer.
      </p>
      <p className="text-gray-600">{ELIGIBILITY_STATEMENT}</p>
      <div className="flex gap-3">
        <Link href="/request-invite" className="rounded-md bg-brand-600 px-4 py-2 font-medium text-white">
          Request an invitation
        </Link>
        <Link href="/login" className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium">
          Log in
        </Link>
      </div>
    </main>
  );
}
