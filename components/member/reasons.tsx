import { ArrowDownRight, ArrowLeftRight, CircleDollarSign, CircleDot, Hash, Infinity as InfinityIcon, MapPin, Sparkles, type LucideIcon } from 'lucide-react';
import type { Reason, ReasonType } from '@/lib/services/relevance';

const TILE: Record<ReasonType, { bg: string; icon: LucideIcon }> = {
  needs_offering: { bg: '#F4B8C8', icon: ArrowDownRight },
  offers_what_they_need: { bg: '#F2D774', icon: ArrowLeftRight },
  stage_fit: { bg: '#F2D774', icon: CircleDollarSign },
  role_match: { bg: '#D9CCF5', icon: CircleDot },
  expertise: { bg: '#C9D9A8', icon: Hash },
  mutual_connection: { bg: '#EADCCB', icon: InfinityIcon },
  same_gathering: { bg: '#D9CCF5', icon: Sparkles },
  same_city: { bg: '#C9D9A8', icon: MapPin },
};

/** "Why this match": a cream well, each reason with a 24px rounded-square icon tile (designer, member card). */
export function ReasonRows({ reasons, limit = 1 }: { reasons: Reason[]; limit?: number }) {
  const shown = reasons.slice(0, limit);
  if (!shown.length) return null;
  return (
    <ul className="space-y-2 rounded-2xl bg-cream p-3.5" aria-label="Why this match">
      {shown.map((r) => {
        const t = TILE[r.type];
        const Icon = t.icon;
        return (
          <li key={`${r.type}-${r.description}`} className="flex items-start gap-2.5 text-[14px] leading-snug">
            <span aria-hidden className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: t.bg }}>
              <Icon size={14} strokeWidth={2} />
            </span>
            <span>{r.description}</span>
          </li>
        );
      })}
    </ul>
  );
}
