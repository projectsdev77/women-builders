'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-md space-y-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-gray-600">Please try again. If it keeps happening, contact us{error.digest ? ` and mention reference ${error.digest}` : ''}.</p>
      <button onClick={reset} className="min-h-[44px] rounded-md bg-brand-600 px-4 text-white">Try again</button>
    </main>
  );
}
