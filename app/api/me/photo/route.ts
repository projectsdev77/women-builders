import { route } from '@/lib/api';
import { apiActiveUser } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors';
import { PHOTO_MAX_BYTES, removeProfilePhoto, setProfilePhoto } from '@/lib/services/photos';
import { photoUrl } from '@/lib/services/photo-url';

/** multipart/form-data with a `photo` file (R3 F6). */
export const POST = route(async (req) => {
  const user = await apiActiveUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get('photo');
  if (!(file instanceof File)) throw new AppError('VALIDATION_ERROR', 'Choose a photo to upload.', 400);
  if (file.size > PHOTO_MAX_BYTES) throw new AppError('FILE_TOO_LARGE', 'Photos can be at most 5 MB.', 413);
  const profile = await setProfilePhoto(user.id, Buffer.from(await file.arrayBuffer()));
  return { photoUrl: photoUrl(user.id, profile, 512), completenessScore: profile.completenessScore };
});

export const DELETE = route(async () => {
  const user = await apiActiveUser();
  await removeProfilePhoto(user.id);
  return { ok: true };
});
