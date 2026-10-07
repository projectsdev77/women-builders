'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Native <dialog> modal: focus trap, Esc to close, and focus returns on close. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className="w-[calc(100%-2rem)] max-w-[560px] rounded-[28px] bg-cream p-0 text-forest shadow-dialog backdrop:bg-forest-deep/45"
    >
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="dialog-title" className="text-[28px] leading-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="min-h-[44px] min-w-[44px] rounded-full text-2xl text-ink-subtle hover:bg-wash">
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
