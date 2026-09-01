import type { MigrationInterface, QueryRunner } from 'typeorm';

/** trip-upload — 모바일 결정적 id를 멱등키로 (design §0-1). append-only 원칙 준수 */
export class AddTripClientKey1788250000000 implements MigrationInterface {
  name = 'AddTripClientKey1788250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE trips ADD COLUMN client_key text NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_trips_user_client ON trips (user_id, client_key)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_trips_user_client`);
    await queryRunner.query(`ALTER TABLE trips DROP COLUMN IF EXISTS client_key`);
  }
}
