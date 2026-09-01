// 범용 Celery 태스크 발행 + 진행률 폴링 (파이프라인 검증용)
// 사용: tsx scripts/queue-task.ts <taskName> '<argsJSON배열>'  예) spatial.extract_pois '["<tripId>"]'
import 'dotenv/config';
import { Redis } from 'ioredis';
import { CeleryProducer } from '../src/queue/celery-producer.js';

const [taskName, argsJson] = [process.argv[2], process.argv[3] ?? '[]'];
if (!taskName) {
  console.error("사용법: tsx scripts/queue-task.ts <taskName> '<argsJSON>'");
  process.exit(1);
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} 환경변수가 필요합니다`);
  return value;
}

const broker = new Redis(requireEnv('CELERY_BROKER_URL'));
const progress = new Redis(requireEnv('REDIS_URL'));

const taskId = await new CeleryProducer(broker).sendTask(
  taskName,
  JSON.parse(argsJson) as unknown[],
);
console.log(`발행 ${taskName} taskId=${taskId}`);

const deadline = Date.now() + 180_000;
let finished = false;
while (Date.now() < deadline) {
  const raw = await progress.get(`vobby:progress:${taskId}`);
  if (raw) {
    const state = JSON.parse(raw) as { status: string; detail: unknown };
    if (state.status === 'done' || state.status === 'failed') {
      console.log(`${state.status}: ${JSON.stringify(state.detail)}`);
      finished = true;
      if (state.status === 'failed') process.exitCode = 2;
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 1500));
}
if (!finished) {
  console.error('타임아웃 — 워커 미처리');
  process.exitCode = 1;
}
await Promise.all([broker.quit(), progress.quit()]);
