import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { MulterErrorFilter } from './common/filters/multer-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.FRONTEND_URL ?? '*' });

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
