import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useWebSocketAdapter(new WsAdapter(app));
  app.enableCors({
    origin: process.env['ELECTRON_RUN_AS_NODE']
      ? true  // Allow all origins when running inside Electron
      : (process.env['CORS_ORIGIN'] || 'http://localhost:4200'),
    exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  });

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
}

bootstrap();
