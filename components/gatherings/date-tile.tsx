const TILE_BG: Record<string, string> = { DINNER: '#F4B8C8', WORKING_SESSION: '#D9CCF5', OTHER: '#C9D9A8' };

/** A striped date tile: month in Geist Mono and the day in Young Serif, coloured by gathering type. */
export function DateTile({ startsAt, timeZone, type, size = 64 }: { startsAt: string; timeZone: string; type: string; size?: number }) {
  const d = new Date(startsAt);
  const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone }).format(d).toUpperCase();
  const day = new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone }).format(d);
  return (
    <span
      aria-hidden
      className="flex shrink-0 flex-col items-center justify-center rounded-[18px]"
      style={{ width: size, height: size, background: `repeating-linear-gradient(90deg, ${TILE_BG[type] ?? TILE_BG.OTHER} 0 8px, rgba(255,255,255,.45) 8px 16px)` }}
    >
      <span className="rounded-md bg-white/85 px-1.5 text-center leading-tight">
        <span className="block font-mono text-[10px] tracking-[.1em]">{month}</span>
        <span className="block font-display text-[22px] leading-none">{day}</span>
      </span>
    </span>
  );
}
