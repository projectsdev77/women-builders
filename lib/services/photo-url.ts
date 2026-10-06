// Kept separate from photos.ts so pages and the privacy layer don't load the image library.
export const PHOTO_SIZES = [512, 128] as const;
export type PhotoSize = (typeof PHOTO_SIZES)[number];

/** The URL members use; access is checked by the media route (R3 F6). */
export function photoUrl(userId: string, p: { photoKey: string | null; photoVersion: number }, size: PhotoSize = 128) {
  return p.photoKey ? `/api/media/avatar/${userId}/${size}?v=${p.photoVersion}` : null;
}
