import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CeleryProducer } from './celery-producer.js';
import { PROGRESS_REDIS } from './queue.tokens.js';

/** 워커(common/progress.py)와 공유하는 키 규약 */
const PROGRESS_KEY_PREFIX = 'vobby:progress:';

export interface TaskProgress {
  status: string;
  detail: unknown;
  updatedAt: string;
}

@Injectable()
export class QueueService {
  constructor(
    private readonly producer: CeleryProducer,
    @Inject(PROGRESS_REDIS) private readonly progressRedis: Redis,
  ) {}

  /** 큐 왕복 검증용 — 실태스크(마일스톤 3·4)도 같은 발행 경로를 쓴다 */
  enqueuePing(payload: unknown): Promise<string> {
    return this.producer.sendTask('pipeline.ping', [payload]);
  }

  async getProgress(taskId: string): Promise<TaskProgress | null> {
    const raw = await this.progressRedis.get(`${PROGRESS_KEY_PREFIX}${taskId}`);
    return raw ? (JSON.parse(raw) as TaskProgress) : null;
  }
}
