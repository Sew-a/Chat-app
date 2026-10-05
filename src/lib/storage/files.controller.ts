import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { StorageService } from './storage.service';

// Public (no auth): <img> tags can't send a bearer token. Keys contain a random
// UUID, and the bucket itself stays private.
@Controller('files')
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Get(':folder/:name')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  async getFile(@Param('folder') folder: string, @Param('name') name: string) {
    const { stream, contentType, length } = await this.storageService.getImage(`${folder}/${name}`);
    return new StreamableFile(stream, { type: contentType, length });
  }
}
