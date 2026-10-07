'use client';

import type { ReactNode } from 'react';
import type { RoleType } from '@prisma/client';
import { ROLE_COLOR } from './roles';
import { cx } from './index';

export const ROLE_OPTIONS: ReadonlyArray<readonly [RoleType, string]> = [
  ['FOUNDER', 'Founder'],
  ['OPERATOR', 'Operator'],
  ['INVESTOR', 'Investor'],
  ['BUILDER', 'Builder'],
];

/**
 * Role choice as radio pills: off = white with a border; on = the role colour, a forest
 * border and a "✓ " prefix. The role is always written out (colour never carries meaning alone).
 */
export function RolePicker({
  value,
  onChange,
  name = 'primaryRole',
  describedBy,
  invalid,
}: {
  value: string;
  onChange: (v: RoleType) => void;
  name?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" aria-describedby={describedBy} aria-invalid={invalid || undefined} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ROLE_OPTIONS.map(([v, label]) => {
        const on = value === v;
        return (
          <label
            key={v}
            className={cx(
              'flex min-h-[52px] cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-field border-[1.5px] px-3 text-[15px] font-bold transition-colors',
              on ? `${ROLE_COLOR[v].solidClass} border-forest` : 'border-field bg-white hover:bg-wash',
              'focus-within:shadow-focus-field',
            )}
          >
            <input type="radio" name={name} value={v} checked={on} onChange={() => onChange(v)} className="sr-only" />
            {on && <span aria-hidden>✓</span>}
            {label}
          </label>
        );
      })}
    </div>
  );
}

/** A checkbox drawn the designer's way: a 24px rounded square with a forest check. */
export function CheckRow({
  checked,
  onChange,
  children,
  describedBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  describedBy?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={describedBy} className="peer sr-only" />
      <span
        aria-hidden
        className={cx(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-[1.5px] border-forest text-[15px] font-bold text-cream peer-focus-visible:shadow-focus',
          checked ? 'bg-forest' : 'bg-white',
        )}
      >
        {checked ? '✓' : ''}
      </span>
      <span>{children}</span>
    </label>
  );
}
