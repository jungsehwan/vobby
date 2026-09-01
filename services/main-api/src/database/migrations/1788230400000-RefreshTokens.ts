import type { MigrationInterface, QueryRunner } from 'typeorm';

/** api-auth-foundation — refresh 토큰 저장소 (해시만, design §1.1) */
export class RefreshTokens1788230400000 implements MigrationInterface {
  name = 'RefreshTokens1788230400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id          uuid PRIMARY KEY DEFAULT uuidv7(),
        user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  text NOT NULL CONSTRAINT uq_refresh_tokens_hash UNIQUE,
        expires_at  timestamptz NOT NULL,
        revoked_at  timestamptz,
        created_at  timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_refresh_tokens_user ON refresh_tokens (user_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
  }
}
