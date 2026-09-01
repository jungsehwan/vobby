import {
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { CeleryProducer } from './celery-producer.js';
import { QueueService } from './queue.service.js';
import { BROKER_REDIS, PROGRESS_REDIS } from './queue.tokens.js';

function createRedis(config: ConfigService, envKey: string): Redis {
  const url = config.get<string>(envKey);
  if (!url) {
    // 기본값(localhost:6379 — 타 프로젝트 redis)으로 조용히 붙는 사고 방지
    throw new Error(`${envKey} 환경변수가 설정되지 않았습니다 (.env.example 참조)`);
  }
  return new Redis(url);
}

@Module({
  providers: [
    {
      provide: BROKER_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createRedis(config, 'CELERY_BROKER_URL'),
    },
    {
      provide: PROGRESS_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createRedis(config, 'REDIS_URL'),
    },
    {
      provide: CeleryProducer,
      inject: [BROKER_REDIS],
      useFactory: (broker: Redis) => new CeleryProducer(broker),
    },
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(
    @Inject(BROKER_REDIS) private readonly broker: Redis,
    @Inject(PROGRESS_REDIS) private readonly progress: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([this.broker.quit(), this.progress.quit()]);
  }
}
