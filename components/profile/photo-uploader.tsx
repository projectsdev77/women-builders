'use client';

import { useRef, useState } from 'react';
import { Avatar, Button } from '@/components/ui';

/**
 * Uploads on its own, separate from the profile form (R3 F6). The server crops to a square
 * around the most interesting area and strips location/camera metadata.
 */
export function PhotoUploader({
  name,
  photoUrl,
  onChange,
}: {
  name: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    if (file.size > 4 * 1024 * 1024) return setError('Photos can be at most 4 MB.');
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('photo', file);
    const res = await fetch('/api/me/photo', { method: 'POST', body: fd, credentials: 'same-origin' }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(json?.error?.message ?? 'Upload failed. Please try again.');
    onChange(json.photoUrl);
  }

  async function remove() {
    setBusy(true);
    const res = await fetch('/api/me/photo', { method: 'DELETE', credentials: 'same-origin' }).catch(() => null);
    setBusy(false);
    if (res?.ok) onChange(null);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || '?'} size={88} photoUrl={photoUrl} />
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-800">Photo</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
          </Button>
          {photoUrl && (
            <Button type="button" variant="ghost" disabled={busy} onClick={remove}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">JPEG, PNG or WebP, up to 4 MB. Only members can see it. We remove location data from photos.</p>
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose a profile photo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void upload(f);
          }}
        />
      </div>
    </div>
  );
}
