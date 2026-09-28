import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10">
      <Link href="/" className="mb-8 text-xl font-bold text-brand-700">
        {APP_NAME}
      </Link>
      <main id="main" className="w-full max-w-md">
        {children}
      </main>
    </div>
  );
}
