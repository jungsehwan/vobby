// 큐 왕복 검증 스크립트 (design §4 D-3)
// 사용: tsx scripts/queue-ping.ts  — 발행 → 진행률 폴링 → 결과 출력, 실패 시 exit 1
import 'dotenv/config';
import { Redis } from 'ioredis';
import { CeleryProducer } from '../src/queue/celery-producer.js';

const POLL_INTERVAL_MS = 500;
const TIMEOUT_MS = 15_000;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} 환경변수가 필요합니다`);
  return value;
}

const broker = new Redis(requireEnv('CELERY_BROKER_URL'));
const progress = new Redis(requireEnv('REDIS_URL'));

const payload = { hello: 'vobby', at: new Date().toISOString() };
const taskId = await new CeleryProducer(broker).sendTask('pipeline.ping', [payload]);
console.log(`발행됨 taskId=${taskId}`);

const deadline = Date.now() + TIMEOUT_MS;
let final: string | null = null;
while (Date.now() < deadline) {
  const raw = await progress.get(`vobby:progress:${taskId}`);
  if (raw) {
    const state = JSON.parse(raw) as { status: string; detail?: { echo?: unknown } };
    console.log(`진행률: ${state.status}`);
    if (state.status === 'done') {
      const echoed = JSON.stringify(state.detail?.echo);
      if (echoed !== JSON.stringify(payload)) {
        console.error(`echo 불일치: ${echoed}`);
        process.exitCode = 1;
      } else {
        const ttl = await progress.ttl(`vobby:progress:${taskId}`);
        console.log(`왕복 성공 — echo 일치, 진행률 TTL=${ttl}s`);
      }
      final = state.status;
      break;
    }
  }
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
}

if (final !== 'done') {
  console.error(`타임아웃 ${TIMEOUT_MS}ms — 워커가 처리하지 못함`);
  process.exitCode = 1;
}
await Promise.all([broker.quit(), progress.quit()]);
