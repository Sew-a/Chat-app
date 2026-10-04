import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

// Keep in sync with StorageService.MAX_IMAGE_SIZE
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

// `limits.fileSize` caps the payload while busboy is streaming it (this keeps
// the whole file from being buffered in memory → protects against OOM), and
// `fileFilter` rejects non-images early with a clean 400.
export const imageUploadOptions: MulterOptions = {
  limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      return cb(new BadRequestException('Only image files are allowed'), false);
    }
    cb(null, true);
  },
};
