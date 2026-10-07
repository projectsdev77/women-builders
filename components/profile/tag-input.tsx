'use client';

import { useState } from 'react';

/** Chips input: Enter or comma adds a tag, Backspace on empty removes the last. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  max = 20,
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((t) => t.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p);
    onChange(next);
    setDraft('');
  }

  return (
    <div className="flex min-h-[44px] flex-wrap items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-wash px-2.5 py-0.5 text-[13px] font-semibold">
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            className="rounded-full px-1 hover:bg-line"
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        aria-describedby={describedBy}
        className="min-w-[8rem] flex-1 border-none px-1 py-1 text-sm outline-none focus:ring-0"
        value={draft}
        placeholder={value.length >= max ? `Maximum ${max}` : placeholder}
        disabled={value.length >= max}
        onChange={(e) => {
          if (e.target.value.includes(',')) add(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add(draft);
          } else if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
      />
    </div>
  );
}
