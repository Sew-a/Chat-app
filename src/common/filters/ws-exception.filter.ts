import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

// Nest's default WS filter only understands WsException — every HttpException
// thrown by guards, the ValidationPipe or shared services (401 / 400 / 404 ...)
// reaches the client as a generic "Internal server error" and is logged as a
// crash. Convert them into a structured `exception` event instead:
//   { status: 'error', statusCode: 401, message: 'Invalid or expired token', event: 'send_message' }
// Anything that is not an HttpException still falls through to the base
// handler (generic message to the client + error log on the server).
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'object' && response !== null && 'message' in response
          ? (response as { message: string | string[] }).message
          : exception.message;

      return super.catch(
        new WsException({
          status: 'error',
          statusCode: exception.getStatus(),
          message,
          event: host.switchToWs().getPattern(),
        }),
        host,
      );
    }

    return super.catch(exception, host);
  }
}
