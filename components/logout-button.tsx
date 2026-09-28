'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/client/api';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={className ?? 'min-h-[44px] rounded-md px-3 text-gray-700 hover:bg-gray-100'}
      onClick={async () => {
        await api('/api/auth/logout', { body: {} });
        router.replace('/');
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
