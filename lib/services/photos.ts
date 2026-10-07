import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { AppError, Errors } from '@/lib/errors';
import { storage } from '@/lib/storage';
import { calculateCompleteness } from './profile-fields';
import { PHOTO_SIZES, type PhotoSize } from './photo-url';

export { PHOTO_SIZES, type PhotoSize };

// 4 MB keeps uploads under Vercel's 4.5 MB request-body limit.
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export function photoObjectKey(prefix: string, size: PhotoSize) {
  return `${prefix}-${size}.webp`;
}


/**
 * Validates by content (not file name), auto-rotates, crops to a square around the most
 * interesting area, and re-encodes to WebP. Re-encoding drops all metadata, including EXIF
 * location and camera data.
 */
export async function processPhoto(input: Buffer): Promise<Record<PhotoSize, Buffer>> {
  if (input.length > PHOTO_MAX_BYTES) throw new AppError('FILE_TOO_LARGE', 'Photos can be at most 4 MB.', 413);
  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new AppError('INVALID_IMAGE', 'That file isn’t an image we can read. Use a JPEG, PNG or WebP photo.', 400);
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new AppError('INVALID_IMAGE', 'Use a JPEG, PNG or WebP photo.', 400);
  }
  if ((meta.width ?? 0) < 128 || (meta.height ?? 0) < 128) {
    throw new AppError('IMAGE_TOO_SMALL', 'That photo is too small. Use one at least 128 × 128 pixels.', 400);
  }
  const out = {} as Record<PhotoSize, Buffer>;
  for (const size of PHOTO_SIZES) {
    out[size] = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(size, size, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 82 })
      .toBuffer();
  }
  return out;
}

async function deleteObjects(prefix: string | null) {
  if (!prefix) return;
  await Promise.all(PHOTO_SIZES.map((s) => storage().delete(photoObjectKey(prefix, s)).catch(() => {})));
}

export async function setProfilePhoto(userId: string, input: Buffer) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw Errors.notFound('Profile');
  const images = await processPhoto(input);
  const prefix = `avatars/${userId}/${randomBytes(8).toString('hex')}`;
  for (const size of PHOTO_SIZES) await storage().put(photoObjectKey(prefix, size), images[size], 'image/webp');
  const next = { ...profile, photoKey: prefix };
  const updated = await prisma.profile.update({
    where: { userId },
    data: { photoKey: prefix, photoVersion: { increment: 1 }, completenessScore: calculateCompleteness(next) },
  });
  await deleteObjects(profile.photoKey);
  return updated;
}

export async function removeProfilePhoto(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile?.photoKey) return;
  await prisma.profile.update({
    where: { userId },
    data: {
      photoKey: null,
      photoVersion: { increment: 1 },
      completenessScore: calculateCompleteness({ ...profile, photoKey: null }),
    },
  });
  await deleteObjects(profile.photoKey);
}

/** Returns the image if `viewerId` may see `ownerId`'s photo: self, admins, or active unblocked members. */
export async function readProfilePhoto(viewer: { id: string; isAdmin: boolean }, ownerId: string, size: PhotoSize) {
  const profile = await prisma.profile.findUnique({
    where: { userId: ownerId },
    select: { photoKey: true, user: { select: { accountStatus: true } } },
  });
  if (!profile?.photoKey) return null;
  if (viewer.id !== ownerId && !viewer.isAdmin) {
    if (profile.user.accountStatus !== 'ACTIVE') return null;
    const blocked = await prisma.block.count({
      where: { OR: [{ blockerId: viewer.id, blockedId: ownerId }, { blockerId: ownerId, blockedId: viewer.id }] },
    });
    if (blocked) return null;
  }
  return storage().get(photoObjectKey(profile.photoKey, size));
}
