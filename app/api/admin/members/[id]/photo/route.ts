import { route } from '@/lib/api';
import { apiAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { removeProfilePhoto } from '@/lib/services/photos';
import { audit } from '@/lib/services/audit';
import { enqueueEmail, kickOutbox } from '@/lib/email/outbox';
import { templates } from '@/lib/email/templates';
import { Errors } from '@/lib/errors';

/** Admin removes a photo that doesn't meet the charter (R3 F6, F17). The member is told why. */
export const DELETE = route(async (_req, { params }) => {
  const admin = await apiAdmin();
  const user = await prisma.user.findUnique({ where: { id: params.id! }, include: { profile: { select: { photoKey: true } } } });
  if (!user?.profile?.photoKey) throw Errors.notFound('Photo');
  await removeProfilePhoto(user.id);
  await prisma.$transaction(async (tx) => {
    await audit(tx, { actorId: admin.id, action: 'photo.remove', targetType: 'user', targetId: user.id });
    if (user.accountStatus === 'ACTIVE') {
      await enqueueEmail(tx, { to: user.email, kind: 'photo_removed', content: templates.photoRemoved(user.name) });
    }
  });
  kickOutbox();
  return { ok: true };
});
