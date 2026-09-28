import { appTimezone } from '@/lib/config';

/** Today's date in the platform timezone as a UTC-midnight Date for @db.Date comparisons (G16). */
export function todayInAppTz(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: appTimezone(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** Parses YYYY-MM-DD into a UTC-midnight Date, or null. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateOnly(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
