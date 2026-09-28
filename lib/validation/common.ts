import { z } from 'zod';

/** Emails are trimmed and lowercased at every entry point (G11). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address, like name@example.com')
  .transform(normalizeEmail);

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

export const ROLE_VALUES = ['FOUNDER', 'OPERATOR', 'INVESTOR', 'BUILDER'] as const;
export const roleSchema = z.enum(ROLE_VALUES, {
  errorMap: () => ({ message: 'Choose Founder, Operator, Investor or Builder' }),
});

/**
 * Canonicalizes LinkedIn profile URLs (G18). Accepts http/https, with or without
 * www or a country subdomain, trailing slashes and query strings.
 * Returns null when the URL is not a LinkedIn /in/ profile.
 */
export function canonicalLinkedInUrl(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (!(host === 'linkedin.com' || host.endsWith('.linkedin.com'))) return null;
  const match = url.pathname.match(/^\/(in|pub)\/([^/]+)\/?/i);
  if (!match) return null;
  const slug = decodeURIComponent(match[2]!).toLowerCase();
  if (!/^[\p{L}\p{N}\-_%.]{2,100}$/u.test(slug)) return null;
  return `https://www.linkedin.com/in/${slug}`;
}

export const linkedInUrlSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === '') return null;
    const c = canonicalLinkedInUrl(v);
    if (!c) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a LinkedIn profile URL, like https://www.linkedin.com/in/your-name',
      });
      return z.NEVER;
    }
    return c;
  });

export const websiteUrlSchema = z
  .string()
  .trim()
  .max(300)
  .transform((v, ctx) => {
    if (v === '') return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(withScheme);
      if (!u.hostname.includes('.')) throw new Error('no tld');
      return u.toString();
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid website URL, like https://example.com',
      });
      return z.NEVER;
    }
  });

/** Neutralizes spreadsheet formula prefixes in imported/exported cells (G16). */
export function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
