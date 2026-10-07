'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-md space-y-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-gray-600">Please try again. If it keeps happening, contact us{error.digest ? ` and mention reference ${error.digest}` : ''}.</p>
      <button onClick={reset} className="inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full bg-forest px-5 text-[15px] font-bold text-cream shadow-press-sm hover:bg-[#2E5A40]">Try again</button>
    </main>
  );
}
