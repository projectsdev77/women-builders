import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description:
    'A curated professional community for women founders, operators, investors and builders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the nonce opts every page into dynamic rendering so Next can apply the CSP nonce.
  headers().get('x-nonce');
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
