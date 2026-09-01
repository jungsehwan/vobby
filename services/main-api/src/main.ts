import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // DTO에 없는 필드는 제거(whitelist), 타입 변환 활성화
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // 3000은 apps/web(Next.js) 예약 — 기본값을 .env.example과 일치시킨다
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
