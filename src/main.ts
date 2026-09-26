import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication, ExpressAdapter } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module.js';
import { ENV } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter()
  );

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  });

  // Serve static assets from public/ folder
  const publicPath = join(process.cwd(), 'public');
  app.useStaticAssets(publicPath);

  const PORT = process.env.PORT || ENV.PORT || 3000;
  console.log(`🚀 BODH AI (বোধ) NestJS server starting on port ${PORT}...`);
  await app.listen(PORT);
  console.log(`✨ BODH AI (বোধ) NestJS ready at http://localhost:${PORT}`);
}

bootstrap();
