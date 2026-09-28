import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { AppError } from '@/lib/errors';
import { LIMITS } from '@/lib/config';
import { importProspects } from '@/lib/services/admin/import';

/** multipart/form-data: file=<csv>, dryRun=true|false (G16: not a JSON string). */
export const POST = route(async (req) => {
  const admin = await apiAdmin();
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!form || !(file instanceof File)) throw new AppError('VALIDATION_ERROR', 'Choose a CSV file to upload.', 400);
  if (file.size > LIMITS.csvMaxBytes) throw new AppError('FILE_TOO_LARGE', 'The file is larger than 1 MB. Split it into smaller files.', 413);
  const dryRun = form.get('dryRun') !== 'false';
  return importProspects(admin.id, await file.text(), dryRun);
});
