import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

// Whitelist of image MIME types -> safe file extension. The extension written to
// the bucket is derived from this map, never from the client-provided filename (which can
// be empty, `photo.exe`, or contain a path). This prevents arbitrary file uploads
// and stored XSS from serving e.g. HTML/JS through GET /api/files.
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

// Object keys are always `<folder>/<uuid><ext>` (see uploadImage). This pattern is
// the single definition used to recognise URLs produced by uploadImage().
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const EXT = Object.values(MIME_TO_EXT).map((ext) => ext.slice(1)).join('|');
const KEY_PATTERN = new RegExp(`^([a-zA-Z0-9_-]+)/${UUID}\\.(${EXT})$`);

// Strip path separators / traversal from a folder name.
const sanitizeFolder = (folder: string) => folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'messages';

// Images live in a private S3-compatible bucket (Railway Bucket). Railway buckets
// can't be public, so the API serves them itself: uploadImage() returns
// `<PUBLIC_URL>/api/files/<folder>/<uuid>.<ext>` and FilesController streams it.
@Injectable()
export class StorageService {
  private client: S3Client | null = null;

  private getConfig() {
    return {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET,
      // Railway buckets use virtual-hosted URLs; older buckets may need path-style.
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    };
  }

  private getConfiguredClient() {
    const config = this.getConfig();
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new ServiceUnavailableException(
        'Storage is not configured (S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET)',
      );
    }
    if (!this.client) {
      this.client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      });
    }
    return { client: this.client, bucket: config.bucket };
  }

  // Public origin of this API, used to build file URLs. On Railway it defaults
  // to the service's public domain; set PUBLIC_URL to override (e.g. custom domain).
  private getFilesBaseUrl(): string {
    const origin =
      process.env.PUBLIC_URL ||
      (process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${process.env.PORT ?? 3000}`);
    return `${origin.replace(/\/+$/, '')}/api/files`;
  }

  private assertImage(file: Express.Multer.File): string {
    const ext = MIME_TO_EXT[(file.mimetype ?? '').toLowerCase()];
    if (!ext) {
      throw new BadRequestException('Only JPEG, PNG, WebP, GIF and AVIF images are allowed');
    }
    if (!file.size || file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(`Image must be no larger than ${MAX_IMAGE_SIZE / (1024 * 1024)} MB`);
    }
    return ext;
  }

  async uploadImage(file: Express.Multer.File, folder = 'messages'): Promise<string> {
    const { client, bucket } = this.getConfiguredClient();
    const ext = this.assertImage(file);
    const key = `${sanitizeFolder(folder)}/${randomUUID()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${this.getFilesBaseUrl()}/${key}`;
  }

  // Streams an uploaded image. Only keys of the shape uploadImage() writes are
  // looked up; the content type comes from the whitelisted extension, not the bucket.
  async getImage(key: string): Promise<{ stream: Readable; contentType: string; length?: number }> {
    const match = KEY_PATTERN.exec(key);
    if (!match) throw new NotFoundException();

    const { client, bucket } = this.getConfiguredClient();
    try {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const contentType = Object.keys(MIME_TO_EXT).find((mime) => MIME_TO_EXT[mime] === `.${match[2]}`)!;
      return { stream: object.Body as Readable, contentType, length: object.ContentLength };
    } catch (err) {
      if (err instanceof NoSuchKey) throw new NotFoundException();
      throw err;
    }
  }

  // True only for URLs of the exact shape uploadImage() produces:
  // `<PUBLIC_URL>/api/files/<folder>/<uuid>.<whitelisted ext>`. Lets callers reject
  // arbitrary links (other hosts, `javascript:` URLs, ...) that skipped the upload.
  isStoredImageUrl(url: string, folder = 'messages'): boolean {
    const base = this.getFilesBaseUrl();
    if (!url.startsWith(`${base}/`)) return false;

    const match = KEY_PATTERN.exec(url.slice(base.length + 1));
    return match?.[1] === sanitizeFolder(folder);
  }
}
