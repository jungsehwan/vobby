import type { MigrationInterface, QueryRunner } from 'typeorm';

/** spatial-poi — 파이프라인 분석 결과 기록처 (vision_score 패턴). append-only */
export class AddTripPois1788260000000 implements MigrationInterface {
  name = 'AddTripPois1788260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trips ADD COLUMN pois jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trips DROP COLUMN IF EXISTS pois`);
  }
}
