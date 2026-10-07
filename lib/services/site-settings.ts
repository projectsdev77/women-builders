import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma, type Tx } from '@/lib/db';
import { PUBLIC_NUMBER_THRESHOLDS } from '@/lib/config';
import { audit } from './audit';

/**
 * Admin-editable site settings (R3 F26). Stored as one JSON row per key and merged over
 * defaults, so a missing row always means "the default".
 */

export const PUBLIC_NUMBER_KEYS = ['members', 'countries', 'introductions', 'gatherings', 'wins'] as const;
export type PublicNumberKey = (typeof PUBLIC_NUMBER_KEYS)[number];

export const DEFAULT_SETTINGS = {
  /** Open: requests are reviewed within 21 days. Closed: requests join the waitlist. */
  applicationsOpen: true,
  /** Shown while on waitlist, e.g. "Next review: March". */
  nextReview: null as string | null,
  /** Votes needed to invite or decline automatically (1–3). */
  requiredApprovals: 2,
  publicNumbers: {
    thresholds: { ...PUBLIC_NUMBER_THRESHOLDS, wins: 10 } as Record<PublicNumberKey, number>,
    hidden: [] as PublicNumberKey[],
  },
  /** Showcase on the public homepage (up to 6 opted-in members), in order (R3 F16). */
  showcase: [] as string[],
};
export type SiteSettings = typeof DEFAULT_SETTINGS;
type Key = keyof SiteSettings;

export const settingsPatchSchema = z
  .object({
    applicationsOpen: z.boolean(),
    nextReview: z
      .string()
      .trim()
      .max(80)
      .nullable()
      .transform((v) => v || null),
    requiredApprovals: z.number().int().min(1).max(3),
    publicNumbers: z.object({
      thresholds: z.object(Object.fromEntries(PUBLIC_NUMBER_KEYS.map((k) => [k, z.number().int().min(0).max(1_000_000)])) as Record<PublicNumberKey, z.ZodNumber>),
      hidden: z.array(z.enum(PUBLIC_NUMBER_KEYS)),
    }),
    showcase: z.array(z.string()).max(6),
  })
  .partial();
export type SettingsPatch = z.output<typeof settingsPatchSchema>;

export async function getSiteSettings(db: Pick<Tx, 'siteSetting'> = prisma): Promise<SiteSettings> {
  const rows = await db.siteSetting.findMany();
  const out = structuredClone(DEFAULT_SETTINGS) as SiteSettings;
  for (const r of rows) {
    if (r.key in out) (out as Record<string, unknown>)[r.key] = r.value;
  }
  // Fill thresholds added after a row was saved.
  out.publicNumbers = {
    thresholds: { ...DEFAULT_SETTINGS.publicNumbers.thresholds, ...out.publicNumbers.thresholds },
    hidden: out.publicNumbers.hidden ?? [],
  };
  return out;
}

export async function updateSiteSettings(adminId: string, patch: SettingsPatch) {
  return prisma.$transaction(async (tx) => {
    const before = await getSiteSettings(tx);
    for (const [key, value] of Object.entries(patch) as Array<[Key, unknown]>) {
      if (value === undefined) continue;
      await tx.siteSetting.upsert({
        where: { key },
        create: { key, value: value as Prisma.InputJsonValue, updatedById: adminId },
        update: { value: value as Prisma.InputJsonValue, updatedById: adminId },
      });
    }
    // Reopening applications starts the 21-day clock for everyone on the waitlist.
    let reopened = 0;
    if (patch.applicationsOpen === true && !before.applicationsOpen) {
      const res = await tx.invitationRequest.updateMany({
        where: { status: 'OPEN', waitlisted: true },
        data: { waitlisted: false, slaStartsAt: new Date() },
      });
      reopened = res.count;
    }
    await audit(tx, { actorId: adminId, action: 'settings.update', targetType: 'site_settings', details: { changed: Object.keys(patch), reopenedRequests: reopened } });
    return { settings: await getSiteSettings(tx), reopened };
  });
}
