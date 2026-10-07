// Minimal, accessible primitives. Placeholder visuals pending the designer handoff.
import { forwardRef } from 'react';
import type { RoleType } from '@prisma/client';
import { ROLE_COLOR } from './roles';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'muted';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-forest text-cream shadow-press hover:bg-[#2E5A40] active:translate-y-[3px] active:shadow-[0_1px_0_#0E2418] disabled:translate-y-0 disabled:bg-[#B9C2BB] disabled:text-white disabled:shadow-none',
  secondary: 'border-[1.5px] border-forest bg-white text-forest hover:bg-wash disabled:border-field disabled:text-gray-400',
  danger: 'bg-danger text-white shadow-[0_4px_0_#6E160C] active:translate-y-[3px] active:shadow-[0_1px_0_#6E160C] disabled:bg-[#B9C2BB] disabled:shadow-none',
  ghost: 'text-forest hover:bg-wash disabled:text-gray-400',
  // "Request sent", "Introduction requested", and the profile gate.
  muted: 'border-[1.5px] border-[#A99F90] bg-transparent text-ink-subtle',
};
const sizes: Record<Size, string> = {
  sm: 'min-h-[44px] px-4 text-sm',
  md: 'min-h-[44px] px-5 text-[15px]',
  lg: 'min-h-[52px] px-7 text-[17px]',
};

/** Class string for anything that should look like a button (links included). */
export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-[background,box-shadow,transform] duration-150 ease-out disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    extra,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = 'primary', size = 'md', className, ...props }, ref) {
  return <button ref={ref} className={buttonClass(variant, size, className)} {...props} />;
});

const fieldBase =
  'block w-full rounded-field border-[1.5px] border-field bg-[#FFFDFB] px-4 text-[16px] text-forest transition-[border-color,box-shadow] aria-[invalid=true]:border-danger disabled:bg-wash disabled:text-ink-subtle';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(fieldBase, 'min-h-[52px]', className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cx(fieldBase, 'py-3 leading-relaxed', className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cx(fieldBase, 'min-h-[52px]', className)} {...props} />;
  },
);

export function Field({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[15px] font-semibold text-forest">
        {label}
        {required && <span aria-hidden="true" className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[13px] text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-card border border-line-soft bg-white p-5 sm:p-6', className)}>{children}</div>;
}

type BadgeTone = 'gray' | 'brand' | 'green' | 'yellow' | 'red';
export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    gray: 'bg-cream text-ink-muted border border-line',
    brand: 'bg-founder-tint text-forest border border-founder',
    green: 'bg-success-bg text-success',
    yellow: 'bg-warning-bg text-warning',
    red: 'bg-danger-bg text-danger',
  };
  return (
    <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-bold', tones[tone])}>
      {children}
    </span>
  );
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error';
  children: ReactNode;
}) {
  const tones = {
    info: 'bg-info-bg text-info',
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning-body',
    error: 'bg-danger-bg text-danger',
  };
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('rounded-2xl px-4 py-3 text-[15px] font-medium', tones[tone])}>
      {children}
    </div>
  );
}

/**
 * Member photo, or initials in Young Serif on the primary role's colour. `ghost` is the
 * neutral striped avatar for deleted accounts: no initials, no photo.
 */
export function Avatar({
  name,
  size = 40,
  photoUrl,
  ghost = false,
  role,
  ring = false,
}: {
  name: string;
  size?: number;
  photoUrl?: string | null;
  ghost?: boolean;
  role?: RoleType | null;
  /** Double ring in the role colour (cards 56px, profile 128px). */
  ring?: boolean;
}) {
  const color = role ? ROLE_COLOR[role].solid : '#EADCCB';
  const ringWidth = size >= 100 ? [6, 8] : [3, 4.5];
  const box = {
    width: size,
    height: size,
    ...(ring && !ghost ? { boxShadow: `0 0 0 ${ringWidth[0]}px #fff, 0 0 0 ${ringWidth[1]}px ${color}` } : {}),
  };
  if (ghost) {
    return (
      <span
        aria-hidden="true"
        style={{
          ...box,
          background: 'repeating-linear-gradient(135deg,#EFE9E0 0 5px,#E4DDD2 5px 10px)',
          border: '1.5px dashed #A99F90',
        }}
        className="inline-flex shrink-0 rounded-full"
      />
    );
  }
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- served by our access-checked media route
    return <img src={photoUrl} alt="" width={size} height={size} style={box} className="shrink-0 rounded-full bg-wash object-cover" />;
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden="true"
      style={{ ...box, background: color, fontSize: size * 0.4 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display text-forest"
    >
      {initials || '?'}
    </span>
  );
}

/** Rose count badge (nav, tabs). */
export function CountBadge({ count, label }: { count: number; label?: string }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose px-1.5 text-[11.5px] font-extrabold leading-5 text-white">
      {count > 99 ? '99+' : count}
      {label && <span className="sr-only"> {label}</span>}
    </span>
  );
}

/** Geist Mono uppercase kicker above titles. */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('font-mono text-[12px] uppercase tracking-[.1em] text-ink-subtle', className)}>{children}</p>;
}

/** Page header: serif title and a lede (app screens). */
export function PageHeader({ title, lede, kicker, children }: { title: string; lede?: ReactNode; kicker?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        {kicker && <Kicker>{kicker}</Kicker>}
        <h1 className="text-[clamp(36px,4.6vw,56px)] leading-none tracking-[-0.02em]">{title}</h1>
        {lede && <p className="max-w-2xl text-[16px] text-ink-muted">{lede}</p>}
      </div>
      {children}
    </header>
  );
}

/** Segmented tabs: a white pill track with a forest selected tab. Pass links for server pages. */
export function SegmentedTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: Array<{ href: string; label: string; active: boolean; count?: number }>;
}) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-full bg-white p-1">
      {tabs.map((t) => (
        <a
          key={t.href}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cx(
            'inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-5 text-[15px] font-bold',
            t.active ? 'bg-forest text-cream' : 'text-forest hover:bg-wash',
          )}
        >
          {t.label}
          {!!t.count && <CountBadge count={t.count} />}
        </a>
      ))}
    </nav>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border-[1.5px] border-dashed border-field bg-white/60 p-8 text-center">
      <p className="font-display text-[22px] text-forest">{title}</p>
      {children && <div className="mt-2 text-[15px] text-ink-muted">{children}</div>}
    </div>
  );
}
