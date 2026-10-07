import type { Metadata } from 'next';
import Link from 'next/link';
import { pageAdmin } from '@/lib/auth/guards';
import { Importer } from './importer';

export const metadata: Metadata = { title: 'Import potential members' };

export default async function ImportPage() {
  await pageAdmin();
  return (
    <div className="space-y-4">
      <Link href="/admin/prospects" className="text-sm underline">← Potential members</Link>
      <h1>Import potential members from CSV</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p>The first row must be a header. Recognized columns (any order, case-insensitive):</p>
        <p className="mt-1 font-mono text-xs">name, email, company, role, linkedInUrl, discoverySource, referrerName, referrerEmail</p>
        <ul className="mt-2 list-disc pl-5">
          <li>Each row needs a <strong>name</strong> and an <strong>email</strong> or <strong>LinkedIn URL</strong>.</li>
          <li>Up to 2,000 rows and 1 MB per file.</li>
          <li>Duplicates (in the file, already tracked, or already members) and do-not-contact people are skipped.</li>
          <li>You&apos;ll see a preview before anything is saved. Valid rows import even if others have errors.</li>
        </ul>
      </div>
      <Importer />
    </div>
  );
}
