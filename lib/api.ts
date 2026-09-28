import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { log } from '@/lib/log';

type Ctx = { params: Record<string, string>; requestId: string };

/**
 * Wraps an API route: consistent error shape, request IDs, no leaked internals (Req 17.4).
 * Error body: { error: { code, message, details?, requestId } }
 */
export function route<T>(fn: (req: NextRequest, ctx: Ctx) => Promise<T | Response>) {
  return async (req: NextRequest, context: { params?: Record<string, string> } = {}) => {
    const requestId = crypto.randomUUID();
    try {
      const result = await fn(req, { params: context.params ?? {}, requestId });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return errorResponse(err, requestId, req);
    }
  };
}

export function errorResponse(err: unknown, requestId: string, req?: NextRequest) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message, details: err.details, requestId } },
      { status: err.status },
    );
  }
  if (err instanceof ZodError) {
    const flat = err.flatten();
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields.',
          details: { fieldErrors: flat.fieldErrors, formErrors: flat.formErrors },
          requestId,
        },
      },
      { status: 400 },
    );
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Not found.', requestId } },
      { status: 404 },
    );
  }
  log.error('unhandled API error', err, { requestId, path: req?.nextUrl.pathname });
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: `Something went wrong on our side. Please try again. (Reference: ${requestId.slice(0, 8)})`,
        requestId,
      },
    },
    { status: 500 },
  );
}

export async function parseBody<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Request body must be JSON.', 400);
  }
  return schema.parse(json);
}

export function parseQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.output<S> {
  const obj: Record<string, string | string[]> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    const prev = obj[key];
    if (prev === undefined) obj[key] = value;
    else obj[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
  });
  return schema.parse(obj);
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? req.ip ?? 'unknown';
}
