/**
 * Minimal object storage (R3 F6). Development and tests use the local disk. On Vercel, use a private
 * Vercel Blob store (picked automatically when Vercel adds BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN by connecting a
 * store to the project; or set STORAGE_DRIVER=blob). Any S3-compatible service also works:
 *   STORAGE_DRIVER=s3, S3_BUCKET, S3_REGION, S3_ENDPOINT (optional), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 * Objects are never public: the app reads them and serves them through access-checked routes.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

function safeKey(key: string): string {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..')) throw new Error(`Invalid storage key: ${key}`);
  return key;
}

class LocalStorage implements Storage {
  constructor(private root: string) {}
  private file(key: string) {
    return path.join(this.root, safeKey(key));
  }
  async put(key: string, body: Buffer) {
    const f = this.file(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    await fs.writeFile(f, body);
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.file(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }
  async delete(key: string) {
    await fs.rm(this.file(key), { force: true });
  }
}

class S3Storage implements Storage {
  private clientPromise: Promise<{
    client: import('@aws-sdk/client-s3').S3Client;
    sdk: typeof import('@aws-sdk/client-s3');
  }>;
  constructor(private bucket: string) {
    this.clientPromise = import('@aws-sdk/client-s3').then((sdk) => ({
      sdk,
      client: new sdk.S3Client({
        region: process.env.S3_REGION ?? 'auto',
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
        },
      }),
    }));
  }
  async put(key: string, body: Buffer, contentType: string) {
    const { client, sdk } = await this.clientPromise;
    await client.send(new sdk.PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: body, ContentType: contentType }));
  }
  async get(key: string) {
    const { client, sdk } = await this.clientPromise;
    try {
      const res = await client.send(new sdk.GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    } catch (err) {
      if ((err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }
  async delete(key: string) {
    const { client, sdk } = await this.clientPromise;
    await client.send(new sdk.DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
  }
}

/** Private Vercel Blob store: nothing is public; the app streams objects through its access-checked routes. */
class BlobStorage implements Storage {
  private sdk = import('@vercel/blob');
  async put(key: string, body: Buffer, contentType: string) {
    const { put } = await this.sdk;
    await put(safeKey(key), body, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true });
  }
  async get(key: string) {
    const { get } = await this.sdk;
    const res = await get(safeKey(key), { access: 'private', useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  async delete(key: string) {
    const { del } = await this.sdk;
    await del(safeKey(key));
  }
}

let instance: Storage | undefined;
export function storage(): Storage {
  if (instance) return instance;
  const driver = process.env.STORAGE_DRIVER || (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID ? 'blob' : 'local');
  if (driver === 'blob') {
    instance = new BlobStorage();
  } else if (driver === 's3') {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) throw new Error('S3_BUCKET is not set');
    instance = new S3Storage(bucket);
  } else {
    instance = new LocalStorage(path.resolve(process.env.STORAGE_DIR ?? '.data/storage'));
  }
  return instance;
}
