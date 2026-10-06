/** Time zone helpers built on Intl, so gatherings keep their local time (R3 F14). */

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function parts(date: Date, tz: string) {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out as { year: string; month: string; day: string; hour: string; minute: string; second: string };
}

/** Offset of `tz` from UTC at `date`, in milliseconds. */
function offsetMs(date: Date, tz: string): number {
  const p = parts(date, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-11-12T19:00" in `tz` → the UTC instant. Handles DST by re-checking the offset. */
export function zonedTimeToUtc(local: string, tz: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error('Expected YYYY-MM-DDTHH:mm');
  const guess = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  let utc = guess - offsetMs(new Date(guess), tz);
  utc = guess - offsetMs(new Date(utc), tz);
  return new Date(utc);
}

/** The UTC instant as "YYYY-MM-DDTHH:mm" in `tz` (for datetime-local inputs). */
export function utcToZonedInput(date: Date, tz: string): string {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Calendar date "YYYY-MM-DD" of `date` in `tz`. */
export function localDate(date: Date, tz: string): string {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function localHour(date: Date, tz: string): number {
  return +parts(date, tz).hour;
}

/** e.g. "Thu, Nov 12, 2026, 7:00 PM GMT+1". Fixed locale so server and client agree. */
export function formatInZone(date: Date | string, tz: string, withZone = true): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(withZone ? { timeZoneName: 'short' } : {}),
  }).format(new Date(date));
}

export function addDaysToYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
