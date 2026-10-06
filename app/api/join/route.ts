import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { joinWithInvitation } from '@/lib/services/accounts';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { kickOutbox } from '@/lib/email/outbox';
import { isCountryCode } from '@/lib/countries';
import { nameSchema, passwordSchema, roleSchema } from '@/lib/validation/common';

const schema = z.object({
  invitationToken: z.string().min(1).max(200),
  name: nameSchema,
  password: passwordSchema,
  primaryRole: roleSchema,
  headline: z.string().trim().min(2, 'Add a short headline').max(120, 'Headline must be at most 120 characters'),
  city: z.string().trim().max(100).optional().transform((v) => v || null),
  country: z
    .string({ required_error: 'Choose your country' })
    .transform((v, ctx) => {
      const code = v.trim().toUpperCase();
      if (!isCountryCode(code)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Choose your country' });
        return z.NEVER;
      }
      return code;
    }),
  acceptCharter: z.literal(true, { errorMap: () => ({ message: 'Please read and accept the community charter' }) }),
});

export const POST = route(async (req) => {
  const input = await parseBody(req, schema);
  const { userId } = await joinWithInvitation(input);
  kickOutbox();
  setSessionCookie(await createSession(userId, req.headers.get('user-agent')));
  return { ok: true, redirectTo: '/onboarding' };
});
