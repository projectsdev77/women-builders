import { CHARTER_INTRO, CHARTER_SECTIONS, CHARTER_UPDATED, CHARTER_VERSION } from '@/content/charter';

const NUMBER_COLORS = ['#F4B8C8', '#D9CCF5', '#F2D774', '#C9D9A8'];

export function CharterVersion() {
  return (
    <span className="inline-flex rounded-full bg-butter px-3 py-1 font-mono text-[12px] font-medium">
      Version {CHARTER_VERSION} · updated {CHARTER_UPDATED}
    </span>
  );
}

/** The charter: a serif intro, then numbered sections with role-colour number circles. */
export function CharterText() {
  return (
    <div className="space-y-8">
      <p className="font-display text-[clamp(22px,2.6vw,30px)] leading-[1.25]">{CHARTER_INTRO}</p>
      <ol className="space-y-7">
        {CHARTER_SECTIONS.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[44px_1fr] gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full font-display text-[20px]" style={{ background: NUMBER_COLORS[i % 4] }}>{i + 1}</span>
            <section aria-labelledby={`charter-${i}`} className="space-y-2">
              <h2 id={`charter-${i}`} className="text-[24px] leading-tight">{s.title}</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed text-ink-muted marker:text-ink-subtle">
                {s.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </section>
          </li>
        ))}
      </ol>
    </div>
  );
}
