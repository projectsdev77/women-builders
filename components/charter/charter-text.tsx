import { CHARTER_INTRO, CHARTER_SECTIONS, CHARTER_UPDATED, CHARTER_VERSION } from '@/content/charter';

export function CharterText() {
  return (
    <div className="space-y-6">
      <p className="text-gray-700">{CHARTER_INTRO}</p>
      {CHARTER_SECTIONS.map((s) => (
        <section key={s.title} className="space-y-2">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          <ul className="list-disc space-y-1 pl-5 text-gray-700">
            {s.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>
      ))}
      <p className="text-xs text-gray-500">Version {CHARTER_VERSION}, updated {CHARTER_UPDATED}.</p>
    </div>
  );
}
