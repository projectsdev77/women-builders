import { afterEach, describe, expect, it, vi } from 'vitest';

const put = vi.fn(async () => ({}));
const get = vi.fn();
const del = vi.fn(async () => undefined);
vi.mock('@vercel/blob', () => ({ put, get, del }));

async function freshStorage(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (await import('@/lib/storage')).storage();
}

afterEach(() => {
  delete process.env.STORAGE_DRIVER;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  vi.clearAllMocks();
});

describe('Vercel Blob storage driver', () => {
  it('is picked automatically when a blob token is present and stores privately', async () => {
    const s = await freshStorage({ STORAGE_DRIVER: undefined, BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_test' });
    await s.put('avatars/u1/512-1.jpg', Buffer.from('x'), 'image/jpeg');
    expect(put).toHaveBeenCalledWith('avatars/u1/512-1.jpg', expect.any(Buffer), {
      access: 'private',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  });

  it('reads an object back and returns null when it is missing', async () => {
    const s = await freshStorage({ STORAGE_DRIVER: 'blob' });
    get.mockResolvedValueOnce({ statusCode: 200, stream: new Response('hello').body });
    expect((await s.get('a/b.jpg'))?.toString()).toBe('hello');
    get.mockResolvedValueOnce(null);
    expect(await s.get('a/missing.jpg')).toBeNull();
    expect(get).toHaveBeenCalledWith('a/b.jpg', { access: 'private', useCache: false });
  });

  it('deletes by pathname and rejects unsafe keys', async () => {
    const s = await freshStorage({ STORAGE_DRIVER: 'blob' });
    await s.delete('a/b.jpg');
    expect(del).toHaveBeenCalledWith('a/b.jpg');
    await expect(s.put('../etc/passwd', Buffer.from('x'), 'image/jpeg')).rejects.toThrow('Invalid storage key');
  });

  it('falls back to local disk without a token', async () => {
    const s = await freshStorage({ STORAGE_DRIVER: undefined, BLOB_READ_WRITE_TOKEN: undefined });
    await s.put('tests/storage-probe.txt', Buffer.from('ok'), 'text/plain');
    expect((await s.get('tests/storage-probe.txt'))?.toString()).toBe('ok');
    await s.delete('tests/storage-probe.txt');
    expect(put).not.toHaveBeenCalled();
  });
});
