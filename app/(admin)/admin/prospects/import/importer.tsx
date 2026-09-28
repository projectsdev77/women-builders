'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, Notice } from '@/components/ui';
import type { ImportSummary } from '@/lib/services/admin/import';

const TONE = { ok: 'green', duplicate: 'gray', do_not_contact: 'red', already_member: 'gray', error: 'red' } as const;
const LABEL = { ok: 'Will import', duplicate: 'Duplicate', do_not_contact: 'Do not contact', already_member: 'Member', error: 'Error' } as const;

async function upload(file: File, dryRun: boolean): Promise<{ ok: true; data: ImportSummary } | { ok: false; message: string }> {
  const fd = new FormData();
  fd.set('file', file);
  fd.set('dryRun', String(dryRun));
  const res = await fetch('/api/admin/potential-members/import', { method: 'POST', body: fd, credentials: 'same-origin' });
  const json = await res.json().catch(() => null);
  if (!res.ok) return { ok: false, message: json?.error?.message ?? 'Upload failed.' };
  return { ok: true, data: json };
}

export function Importer() {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(dryRun: boolean) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const res = await upload(file, dryRun);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setSummary(res.data);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label htmlFor="csvFile" className="block text-sm font-medium">CSV file</label>
          <input id="csvFile" name="csvFile" type="file" accept=".csv,text/csv" className="mt-1 text-sm"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setSummary(null); }} />
        </div>
        <Button disabled={!file || busy} onClick={() => run(true)}>Preview</Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {summary && (
        <div className="space-y-3">
          <Notice tone={summary.dryRun ? 'info' : 'success'}>
            {summary.dryRun ? 'Preview: nothing has been saved yet.' : 'Import complete.'}{' '}
            <strong>{summary.successful} {summary.dryRun ? 'to import' : 'imported'}</strong> · {summary.skipped} skipped · {summary.errors} with errors
          </Notice>
          {summary.dryRun && summary.successful > 0 && (
            <Button disabled={busy} onClick={() => run(false)}>Import {summary.successful} {summary.successful === 1 ? 'person' : 'people'}</Button>
          )}
          {!summary.dryRun && <Link href="/admin/prospects" className="text-sm underline">View potential members</Link>}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-2">Row</th><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Result</th><th className="p-2">Details</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {summary.rows.map((r) => (
                  <tr key={r.row}>
                    <td className="p-2">{r.row}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.email ?? '—'}</td>
                    <td className="p-2"><Badge tone={TONE[r.status]}>{summary.dryRun || r.status !== 'ok' ? LABEL[r.status] : 'Imported'}</Badge></td>
                    <td className="p-2 text-gray-600">{r.message ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
