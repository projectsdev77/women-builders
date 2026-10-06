import { beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';
import { investingStatus } from '@/lib/services/profile-fields';
import { profileUpdateSchema, updateOwnProfile, getMemberProfile } from '@/lib/services/profiles';
import { processPhoto, readProfilePhoto, removeProfilePhoto, setProfilePhoto } from '@/lib/services/photos';
import { photoObjectKey } from '@/lib/services/photos';
import { searchMembers, searchQuerySchema } from '@/lib/services/discovery';
import { deleteAccount } from '@/lib/services/data-rights';
import { resetDb } from './helpers';
import { createMember, TEST_PASSWORD } from './factories';

beforeEach(resetDb);
const q = (o: Record<string, unknown>) => searchQuerySchema.parse(o);

async function jpegWithGps(width = 800, height = 600) {
  return sharp({ create: { width, height, channels: 3, background: '#a0522d' } })
    .jpeg()
    .withExif({ IFD0: { Make: 'SpyCam', Model: 'X1' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '51/1 30/1 0/1' } })
    .toBuffer();
}

describe('photos (R3 F6)', () => {
  it('re-encodes to square WebP at two sizes and strips EXIF, including location', async () => {
    const input = await jpegWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const out = await processPhoto(input);
    for (const size of [512, 128] as const) {
      const meta = await sharp(out[size]).metadata();
      expect(meta).toMatchObject({ format: 'webp', width: size, height: size });
      expect(meta.exif).toBeUndefined();
    }
  });

  it('rejects non-images, tiny images and files over 5 MB', async () => {
    await expect(processPhoto(Buffer.from('not an image'))).rejects.toMatchObject({ code: 'INVALID_IMAGE' });
    const tiny = await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000' } }).png().toBuffer();
    await expect(processPhoto(tiny)).rejects.toMatchObject({ code: 'IMAGE_TOO_SMALL' });
    await expect(processPhoto(Buffer.alloc(5 * 1024 * 1024 + 1))).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('stores, serves only to allowed viewers, counts for completeness, and deletes files', async () => {
    const owner = await createMember();
    const viewer = await createMember();
    const before = (await prisma.profile.findUniqueOrThrow({ where: { userId: owner.id } })).completenessScore;
    const p = await setProfilePhoto(owner.id, await jpegWithGps());
    expect(p.completenessScore).toBeGreaterThan(before);
    expect(await readProfilePhoto({ id: viewer.id, isAdmin: false }, owner.id, 128)).toBeInstanceOf(Buffer);

    const view = await getMemberProfile(viewer.id, owner.id);
    expect(view.photoUrl).toBe(`/api/media/avatar/${owner.id}/128?v=1`);

    await prisma.block.create({ data: { blockerId: owner.id, blockedId: viewer.id } });
    expect(await readProfilePhoto({ id: viewer.id, isAdmin: false }, owner.id, 128)).toBeNull();
    const admin = await createMember({ isAdmin: true, profile: null });
    expect(await readProfilePhoto({ id: admin.id, isAdmin: true }, owner.id, 512)).toBeInstanceOf(Buffer);

    // Replacing a photo removes the old files.
    const firstKey = p.photoKey!;
    const p2 = await setProfilePhoto(owner.id, await jpegWithGps(400, 900));
    expect(await storage().get(photoObjectKey(firstKey, 128))).toBeNull();
    await removeProfilePhoto(owner.id);
    expect(await storage().get(photoObjectKey(p2.photoKey!, 512))).toBeNull();
  });

  it('account deletion deletes the photo files', async () => {
    const u = await createMember();
    const p = await setProfilePhoto(u.id, await jpegWithGps());
    await deleteAccount(u.id, TEST_PASSWORD);
    expect(await storage().get(photoObjectKey(p.photoKey!, 128))).toBeNull();
  });
});

describe('profile fields (R3 F6)', () => {
  it('validates country, Open to, investor fields and month', () => {
    expect(profileUpdateSchema.safeParse({ country: 'ZZ' }).success).toBe(false);
    expect(profileUpdateSchema.parse({ country: 'ng' }).country).toBe('NG');
    expect(profileUpdateSchema.safeParse({ openTo: ['Napping'] }).success).toBe(false);
    expect(profileUpdateSchema.parse({ openTo: ['Advising', 'Advising', 'Hiring'] }).openTo).toEqual(['Advising', 'Hiring']);
    expect(profileUpdateSchema.safeParse({ investorType: 'Unicorn' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ lastCheckMonth: '2999-01' }).success).toBe(false);
    expect(profileUpdateSchema.parse({ lastCheckMonth: '2026-08' }).lastCheckMonth).toBe('2026-08');
  });

  it('saving "currently investing" confirms it; freshness expires after 120 days', async () => {
    const u = await createMember({ profile: { primaryRole: 'INVESTOR' } });
    const p = await updateOwnProfile(u.id, profileUpdateSchema.parse({ currentlyInvesting: true }));
    expect(p.investingConfirmedAt).not.toBeNull();
    expect(investingStatus(p)).toBe('active');
    expect(investingStatus({ currentlyInvesting: true, investingConfirmedAt: new Date(Date.now() - 121 * 86400000) })).toBe('unconfirmed');
    expect(investingStatus({ currentlyInvesting: false, investingConfirmedAt: new Date() })).toBe('paused');
    expect(investingStatus({ currentlyInvesting: null })).toBeNull();
  });

  it('hides raise amount and city+country together from non-connections', async () => {
    const owner = await createMember({
      profile: { primaryRole: 'FOUNDER', fundingStatus: 'Raising now', raiseAmount: 1500, city: 'Lagos', country: 'NG', hiddenFields: ['raiseAmount', 'location'] },
    });
    const viewer = await createMember();
    const v = await getMemberProfile(viewer.id, owner.id);
    expect(v.founder?.raiseAmount).toBeNull();
    expect(v.founder?.fundingStatus).toBe('Raising now');
    expect([v.location, v.city, v.country]).toEqual([null, null, null]);
  });
});

describe('Discover filters (R3 F8)', () => {
  it('filters by Open to, fresh "currently investing", and visible "raising"', async () => {
    const viewer = await createMember();
    const advisor = await createMember({ name: 'Ada Advisor', profile: { openTo: ['Advising'] } });
    const fresh = await createMember({ name: 'Fresh Investor', profile: { primaryRole: 'INVESTOR', currentlyInvesting: true, investingConfirmedAt: new Date() } });
    await createMember({ name: 'Stale Investor', profile: { primaryRole: 'INVESTOR', currentlyInvesting: true, investingConfirmedAt: new Date(Date.now() - 200 * 86400000) } });
    const raising = await createMember({ name: 'Raising Rae', profile: { primaryRole: 'FOUNDER', fundingStatus: 'Raising now' } });
    await createMember({ name: 'Secret Raiser', profile: { primaryRole: 'FOUNDER', fundingStatus: 'Raising now', hiddenFields: ['fundingStatus'] } });

    const ids = async (o: Record<string, unknown>) => (await searchMembers(viewer.id, q(o))).results.map((r) => r.member.id);
    expect(await ids({ openTo: 'Advising' })).toEqual([advisor.id]);
    expect(await ids({ investing: '1' })).toEqual([fresh.id]);
    expect(await ids({ raising: '1' })).toEqual([raising.id]);
  });

  it('shows mutual connection counts on result cards', async () => {
    const viewer = await createMember();
    const friend = await createMember();
    const target = await createMember({ name: 'Target Tia' });
    const { pair } = await import('@/lib/services/relationships');
    await prisma.connection.create({ data: pair(viewer.id, friend.id) });
    await prisma.connection.create({ data: pair(friend.id, target.id) });
    const res = await searchMembers(viewer.id, q({ q: 'Tia' }));
    expect(res.results[0]?.member.mutualConnections).toBe(1);
  });
});
