import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-md space-y-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-gray-600">The page may have moved, or this member&apos;s profile isn&apos;t available.</p>
      <Link href="/dashboard" className="text-brand-700 underline">Go home</Link>
    </main>
  );
}
