import { z } from 'zod';
import { route, parseBody } from '@/lib/api';
import { register } from '@/lib/services/accounts';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { kickOutbox } from '@/lib/email/outbox';
import { emailSchema, nameSchema, passwordSchema, roleSchema } from '@/lib/validation/common';

const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  primaryRole: roleSchema,
  headline: z.string().trim().min(2, 'Add a short headline').max(120, 'Headline must be at most 120 characters'),
  applicationStatement: z
    .string()
    .trim()
    .min(20, 'Tell us a bit more (at least 20 characters)')
    .max(2000, 'Keep it under 2,000 characters'),
  invitationToken: z.string().max(200).optional(),
});

export const POST = route(async (req) => {
  const input = await parseBody(req, schema);
  const result = await register(input);
  kickOutbox();
  const token = await createSession(result.userId, req.headers.get('user-agent'));
  setSessionCookie(token);
  return { status: result.status, redirectTo: result.status === 'ACTIVE' ? '/onboarding' : '/pending' };
});
