import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 기반 스키마 — users / refresh_tokens / trips / media / short_forms
 * 2026-09-01 방향 정정 반영판 (backend-trip-model design §1):
 * - Trip = 사진·외부 이력으로 재구성된 여행 (path nullable)
 * - 이전 마이그레이션 2개를 스쿼시 (배포 전 1회 한정 — AGENTS.md Data agent)
 * 규약: PK=uuidv7(PG18), 시각=timestamptz, 열거=text+CHECK, 공간=geography(4326)
 */
export class InitialSchema1788240000000 implements MigrationInterface {
  name = 'InitialSchema1788240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await queryRunner.query(`
      CREATE TABLE users (
        id            uuid PRIMARY KEY DEFAULT uuidv7(),
        provider      text NOT NULL CONSTRAINT ck_users_provider CHECK (provider IN ('google', 'kakao')),
        provider_uid  text NOT NULL,
        email         text,
        nickname      text NOT NULL,
        avatar_url    text,
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_users_provider_uid UNIQUE (provider, provider_uid)
      )
    `);

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

    await queryRunner.query(`
      CREATE TABLE trips (
        id           uuid PRIMARY KEY DEFAULT uuidv7(),
        user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title        text,
        started_at   timestamptz NOT NULL,
        ended_at     timestamptz NOT NULL,
        path         geography(LineStringZM, 4326),
        distance_m   double precision,
        media_count  integer NOT NULL DEFAULT 0,
        created_at   timestamptz NOT NULL DEFAULT now(),
        updated_at   timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_trips_path ON trips USING GIST (path)`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_trips_user_started ON trips (user_id, started_at DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE media (
        id             uuid PRIMARY KEY DEFAULT uuidv7(),
        user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trip_id        uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        type           text NOT NULL CONSTRAINT ck_media_type CHECK (type IN ('photo', 'video')),
        captured_at    timestamptz NOT NULL,
        location       geography(Point, 4326),
        source         text NOT NULL CONSTRAINT ck_media_source CHECK (source IN ('exif', 'timesync', 'none')),
        width          integer,
        height         integer,
        storage_key    text,
        thumbnail_key  text,
        vision_score   jsonb,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_media_location ON media USING GIST (location)`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_media_trip_captured ON media (trip_id, captured_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE short_forms (
        id             uuid PRIMARY KEY DEFAULT uuidv7(),
        user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trip_id        uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        status         text NOT NULL DEFAULT 'requested'
                       CONSTRAINT ck_short_forms_status
                       CHECK (status IN ('requested', 'analyzing', 'rendering', 'done', 'failed')),
        edl            jsonb,
        video_key      text,
        thumbnail_key  text,
        duration_s     integer,
        share_slug     text CONSTRAINT uq_short_forms_share_slug UNIQUE,
        error_message  text,
        created_at     timestamptz NOT NULL DEFAULT now(),
        updated_at     timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_short_forms_user_created ON short_forms (user_id, created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS short_forms`);
    await queryRunner.query(`DROP TABLE IF EXISTS media`);
    await queryRunner.query(`DROP TABLE IF EXISTS trips`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    // postgis 확장은 공용 인프라 성격이라 down에서 제거하지 않는다
  }
}
