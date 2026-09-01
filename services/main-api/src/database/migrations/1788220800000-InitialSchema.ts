import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 기반 스키마 — users / trajectories / media / short_forms (design §1)
 * - PK: uuid v7 (PostgreSQL 18 내장 uuidv7())
 * - 궤적: geography(LineStringZM) — Z=고도m, M=epoch초
 * - enum 대신 text + CHECK (provider 확장 시 제약만 교체)
 */
export class InitialSchema1788220800000 implements MigrationInterface {
  name = 'InitialSchema1788220800000';

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
      CREATE TABLE trajectories (
        id                uuid PRIMARY KEY DEFAULT uuidv7(),
        user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title             text,
        path              geography(LineStringZM, 4326) NOT NULL,
        started_at        timestamptz NOT NULL,
        ended_at          timestamptz NOT NULL,
        distance_m        double precision NOT NULL,
        elevation_gain_m  double precision NOT NULL,
        duration_s        integer NOT NULL,
        point_count       integer NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX ix_trajectories_path ON trajectories USING GIST (path)`,
    );
    await queryRunner.query(
      `CREATE INDEX ix_trajectories_user_started ON trajectories (user_id, started_at DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE media (
        id             uuid PRIMARY KEY DEFAULT uuidv7(),
        user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trajectory_id  uuid REFERENCES trajectories(id) ON DELETE SET NULL,
        type           text NOT NULL CONSTRAINT ck_media_type CHECK (type IN ('photo', 'video')),
        captured_at    timestamptz NOT NULL,
        location       geography(Point, 4326),
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
      `CREATE INDEX ix_media_trajectory_captured ON media (trajectory_id, captured_at)`,
    );

    await queryRunner.query(`
      CREATE TABLE short_forms (
        id             uuid PRIMARY KEY DEFAULT uuidv7(),
        user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trajectory_id  uuid NOT NULL REFERENCES trajectories(id) ON DELETE CASCADE,
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
    await queryRunner.query(`DROP TABLE IF EXISTS trajectories`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    // postgis 확장은 공용 인프라 성격이라 down에서 제거하지 않는다
  }
}
