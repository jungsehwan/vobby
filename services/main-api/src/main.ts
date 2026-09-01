import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 3000은 apps/web(Next.js) 예약 — 기본값을 .env.example과 일치시킨다
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
