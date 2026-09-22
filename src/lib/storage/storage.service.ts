import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private client: S3Client | null = null;

  private getConfig() {
    return {
      endpoint: process.env.R2_ENDPOINT,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET_NAME,
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
    };
  }

  private getClient(config: ReturnType<StorageService['getConfig']>): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto' as any,
        endpoint: config.endpoint,
        credentials: { accessKeyId: config.accessKeyId!, secretAccessKey: config.secretAccessKey! },
      });
    }
    return this.client;
  }

  async uploadImage(file: Express.Multer.File, folder = 'messages'): Promise<string> {
    const config = this.getConfig();
    if (!config.endpoint || !config.accessKeyId || !config.secretAccessKey || !config.bucket || !config.publicBaseUrl) {
      throw new ServiceUnavailableException(
        'R2 storage is not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL)',
      );
    }

    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `${folder}/${randomUUID()}.${ext}`;

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
}