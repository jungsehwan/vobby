// 마이그레이션 러너 — ESM 환경에서 typeorm CLI 대신 프로그래매틱 실행.
// 사용: tsx src/database/migrate.ts <run|revert|show>
import { AppDataSource } from './data-source.js';

const command = process.argv[2] ?? 'run';

await AppDataSource.initialize();
try {
  switch (command) {
    case 'run': {
      const applied = await AppDataSource.runMigrations({ transaction: 'each' });
      console.log(
        applied.length === 0
          ? '적용할 마이그레이션 없음 (최신 상태)'
          : `적용됨: ${applied.map((m) => m.name).join(', ')}`,
      );
      break;
    }
    case 'revert':
      await AppDataSource.undoLastMigration({ transaction: 'each' });
      console.log('마지막 마이그레이션 되돌림');
      break;
    case 'show': {
      const pending = await AppDataSource.showMigrations();
      console.log(pending ? '미적용 마이그레이션 있음' : '모두 적용됨');
      break;
    }
    default:
      throw new Error(`알 수 없는 명령: ${command} (run|revert|show)`);
  }
} finally {
  await AppDataSource.destroy();
}
