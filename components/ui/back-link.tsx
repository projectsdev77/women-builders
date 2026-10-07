'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/** "← Back": returns to wherever she came from (Discover, Capital, a conversation…). */
export function BackLink({ fallback = '/dashboard' }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-bold underline-offset-4 hover:underline"
    >
      <ArrowLeft size={16} strokeWidth={2} aria-hidden /> Back
    </button>
  );
}
