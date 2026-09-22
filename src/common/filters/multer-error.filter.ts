import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';

// Multer throws native MulterError instances (not Nest HttpExceptions) for
// e.g. LIMIT_FILE_SIZE / LIMIT_UNEXPECTED_FILE. Untouched they'd surface as a
// generic 500; map them to proper 4xx responses instead.
@Catch(MulterError)
export class MulterErrorFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    const body =
      exception.code === 'LIMIT_FILE_SIZE'
        ? { statusCode: 413, message: 'File too large', error: 'Payload Too Large' }
        : { statusCode: 400, message: exception.message, error: 'Bad Request' };

    response.status(body.statusCode).json(body);
  }
}