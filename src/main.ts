import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { corsOrigin } from './common/cors';
import { MulterErrorFilter } from './common/filters/multer-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: corsOrigin });

  app.useGlobalFilters(new MulterErrorFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api'); // all REST routes become /api/...

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
