// vision.score_media 큐 왕복 검증 (vision-scoring design §4 D-3~D-5)
// 사용: tsx scripts/queue-vision-score.ts <이미지경로> [mediaId]
import 'dotenv/config';
import { Redis } from 'ioredis';
import { CeleryProducer } from '../src/queue/celery-producer.js';

const [imagePath, mediaId] = [process.argv[2], process.argv[3] ?? null];
if (!imagePath) {
  console.error('사용법: tsx scripts/queue-vision-score.ts <이미지경로> [mediaId]');
  process.exit(1);
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} 환경변수가 필요합니다`);
  return value;
}

const broker = new Redis(requireEnv('CELERY_BROKER_URL'));
const progress = new Redis(requireEnv('REDIS_URL'));

const items = [
  { uri: imagePath, mediaId },
  // 실패 격리 검증 — 존재하지 않는 파일 1건 혼입
  { uri: `${imagePath}.does-not-exist`, mediaId: null },
];
const taskId = await new CeleryProducer(broker).sendTask('vision.score_media', [items]);
console.log(`발행 taskId=${taskId}`);

const deadline = Date.now() + 180_000;
let ok = false;
while (Date.now() < deadline) {
  const raw = await progress.get(`vobby:progress:${taskId}`);
  if (raw) {
    const state = JSON.parse(raw) as {
      status: string;
      detail: { scored?: number; failed?: number; results?: Array<Record<string, unknown>> };
    };
    if (state.status === 'done') {
      const d = state.detail;
      console.log(`done — scored=${d.scored} failed=${d.failed}`);
      for (const r of d.results ?? []) {
        console.log(
          r.error
            ? `  ERROR ${r.uri}: ${r.error}`
            : `  OK ${r.uri} score=${r.score} cat=${r.category} media=${r.mediaId}`,
        );
      }
      ok = d.scored === 1 && d.failed === 1;
      break;
    }
    console.log(`progress: ${JSON.stringify(state.detail)}`);
  }
  await new Promise((r) => setTimeout(r, 2000));
}
if (!ok) {
  console.error('검증 실패 (기대: scored=1, failed=1)');
  process.exitCode = 1;
}
await Promise.all([broker.quit(), progress.quit()]);
