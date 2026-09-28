'use client';

export interface ApiError {
  code: string;
  message: string;
  fieldErrors: Record<string, string[] | undefined>;
  requestId?: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** Same-origin JSON fetch that normalizes the API's error shape. */
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch {
    return {
      ok: false,
      error: { code: 'NETWORK', message: "Can't reach the server. Check your connection and try again.", fieldErrors: {} },
    };
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const e = json?.error ?? {};
    return {
      ok: false,
      error: {
        code: e.code ?? 'UNKNOWN',
        message: e.message ?? 'Something went wrong. Please try again.',
        fieldErrors: e.details?.fieldErrors ?? {},
        requestId: e.requestId,
      },
    };
  }
  return { ok: true, data: json as T };
}

export function firstError(errors: Record<string, string[] | undefined>, field: string) {
  return errors[field]?.[0];
}
