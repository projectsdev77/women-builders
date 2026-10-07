'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastOptions {
  message: string;
  /** Label and handler for the optional Undo pill. */
  undo?: () => void | Promise<void>;
}
const ToastContext = createContext<(t: ToastOptions) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/** A forest pill, bottom centre, auto-dismissing after ~4.2s (designer: Toast). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((t: ToastOptions) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[100px] z-50 flex justify-center px-4 lg:bottom-7" role="status" aria-live="polite">
        {toast && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-forest py-2.5 pl-5 pr-3 text-[15px] font-semibold text-cream shadow-dialog">
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                onClick={async () => {
                  const undo = toast.undo;
                  setToast(null);
                  await undo?.();
                }}
                className="min-h-[36px] rounded-full bg-founder px-4 text-[14px] font-bold text-forest"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
