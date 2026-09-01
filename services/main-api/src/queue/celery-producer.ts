import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';

/**
 * Celery 메시지 프로토콜 v2 발행자 (design §0-1).
 * 소비는 Python Celery(json serializer)가 전담 — 여기서는 발행 규격만 재현한다.
 * 규격: https://docs.celeryq.dev/en/stable/internals/protocol.html
 */
export class CeleryProducer {
  constructor(
    private readonly broker: Redis,
    private readonly queue = 'celery',
  ) {}

  /** 태스크를 발행하고 taskId를 반환한다 */
  async sendTask(taskName: string, args: unknown[] = []): Promise<string> {
    const taskId = randomUUID();
    const body = Buffer.from(
      JSON.stringify([args, {}, { callbacks: null, errbacks: null, chain: null, chord: null }]),
    ).toString('base64');

    const message = {
      body,
      'content-encoding': 'utf-8',
      'content-type': 'application/json',
      headers: {
        lang: 'js',
        task: taskName,
        id: taskId,
        root_id: taskId,
        parent_id: null,
        group: null,
        retries: 0,
        eta: null,
        expires: null,
        argsrepr: JSON.stringify(args),
        kwargsrepr: '{}',
        origin: `main-api@${process.pid}`,
      },
      properties: {
        correlation_id: taskId,
        reply_to: randomUUID(),
        delivery_mode: 2,
        delivery_info: { exchange: '', routing_key: this.queue },
        priority: 0,
        body_encoding: 'base64',
        delivery_tag: randomUUID(),
      },
    };

    await this.broker.lpush(this.queue, JSON.stringify(message));
    return taskId;
  }
}
