'use client';

import { useEffect, useState } from 'react';

/** Online sessions also show the viewer's own time. Rendered after mount to avoid a hydration mismatch. */
export function YourTime({ startsAt, timeZone }: { startsAt: string; timeZone: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (mine === timeZone) return;
    setText(
      new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(startsAt)),
    );
  }, [startsAt, timeZone]);
  return text ? <span className="block text-sm text-gray-600">Your time: {text}</span> : null;
}
