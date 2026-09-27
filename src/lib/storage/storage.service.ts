import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// Whitelist of image MIME types -> safe file extension. The extension written to
// R2 is derived from this map, never from the client-provided filename (which can
// be empty, `photo.exe`, or contain a path). This prevents arbitrary file uploads
// and stored XSS from serving e.g. HTML/JS from the public bucket URL.
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

@Injectable()
export class StorageService {
  private client: S3Client | null = null;

  private getConfig() {
    return {
      endpoint: process.env.R2_ENDPOINT,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET_NAME,
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, ''),
    };
  }

  private getClient(config: ReturnType<StorageService['getConfig']>): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: config.endpoint,
        forcePathStyle: true, // R2 / S3-compatible buckets use path-style addressing
        credentials: { accessKeyId: config.accessKeyId!, secretAccessKey: config.secretAccessKey! },
      });
    }
    return this.client;
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
    const config = this.getConfig();
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucket || !config.publicBaseUrl) {
      throw new ServiceUnavailableException(
        'R2 storage is not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL)',
      );
    }

    const ext = this.assertImage(file);
    const key = `${sanitizeFolder(folder)}/${randomUUID()}${ext}`;

    await this.getClient(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `${config.publicBaseUrl}/${key}`;
  }

  // True only for URLs of the exact shape uploadImage() produces:
  // `<R2_PUBLIC_BASE_URL>/<folder>/<uuid>.<whitelisted ext>`. Lets callers reject
  // arbitrary links (other hosts, `javascript:` URLs, ...) that skipped the upload.
  isStoredImageUrl(url: string, folder = 'messages'): boolean {
    const base = this.getConfig().publicBaseUrl;
    if (!base || !url.startsWith(`${base}/`)) return false;

    const match = KEY_PATTERN.exec(url.slice(base.length + 1));
    return match?.[1] === sanitizeFolder(folder);
  }
}