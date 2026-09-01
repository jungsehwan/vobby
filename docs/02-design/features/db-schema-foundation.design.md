# Design: DB 스키마 설계 — 기반 도메인 모델 (db-schema-foundation)

> Status: Approved (Plan 승인에 따른 연속 작업, 2026-09-01)
> Plan: `docs/01-plan/features/db-schema-foundation.plan.md`

## 0. 핵심 설계 결정

### 0-1. 궤적 저장 방식 = 단일 `geography(LineStringZM, 4326)` 컬럼

| 대안 | 판정 | 사유 |
|------|------|------|
| **A. LineStringZM 단일 컬럼 (채택)** | ✅ | X=경도, Y=위도, Z=고도, M=epoch초 — 포인트별 시각·고도를 좌표 차원에 내장. 수천 포인트가 1로우(TOAST), GIST 인덱스 1개. Time-Sync는 `ST_LocateAlong`(M 기준), POI 분석은 `ST_DumpPoints`로 커버 |
| B. trajectory_points 개별 로우 | ⛔ | 4시간 활동(1초 간격) = 1.4만 로우 × 사용자 — 인덱스·VACUUM 비용 과다. 조인 편의는 있으나 MVP 쿼리 패턴(전체 궤적 로드·렌더링)에 이점 없음 |
| C. LineString + points jsonb 병행 | ⛔ | 동일 데이터 이중 저장 — 정합성 관리 비용. 필요해지면 그때 파생 테이블 추가 (tech-debt로 관리) |

### 0-2. ID 전략 = UUID v7 (DB 기본값 `uuidv7()`)
- PostgreSQL 18 내장 함수 — 시간 정렬성으로 B-tree 지역성 확보, 분산 클라이언트(모바일) 사전 생성 가능
- bigserial 대비: 공유 URL/API에 ID 노출 시 열거 공격 방지

### 0-3. provider = `text` + CHECK 제약 (Postgres enum 미사용)
- `CHECK (provider IN ('google','kakao'))` — Apple 로그인 추가 시 constraint 교체 1문장 (enum은 ALTER TYPE 잠금·번거로움)

### 0-4. 마이그레이션 체계
- TypeORM 0.3 DataSource + `src/database/migrations/` — `synchronize: false` 고정 (AGENTS.md Data agent 규칙)
- 첫 마이그레이션에 `CREATE EXTENSION IF NOT EXISTS postgis` 포함 (신규 환경 재현성)
- timestamptz 통일 (naive timestamp 금지), created_at/updated_at 전 테이블 공통

## 1. 데이터 모델

### 1.1 users
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | uuid | PK, default uuidv7() |
| provider | text | NOT NULL, CHECK IN ('google','kakao') |
| provider_uid | text | NOT NULL |
| email | text | NULL — Kakao 이메일 미제공 케이스 |
| nickname | text | NOT NULL |
| avatar_url | text | NULL |
| created_at / updated_at | timestamptz | NOT NULL default now() |

- UNIQUE (provider, provider_uid)

### 1.2 trajectories
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | uuid | PK, default uuidv7() |
| user_id | uuid | FK users(id) ON DELETE CASCADE, NOT NULL |
| title | text | NULL — AI 자동 생성 타이틀(Intro 요구) |
| path | geography(LineStringZM, 4326) | NOT NULL |
| started_at / ended_at | timestamptz | NOT NULL |
| distance_m / elevation_gain_m | double precision | NOT NULL — Outro 통계 (저장 시 계산) |
| duration_s / point_count | integer | NOT NULL |
| created_at / updated_at | timestamptz | NOT NULL |

- GIST (path), INDEX (user_id, started_at DESC)

### 1.3 media
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | uuid | PK, default uuidv7() |
| user_id | uuid | FK users, NOT NULL |
| trajectory_id | uuid | FK trajectories ON DELETE SET NULL, **NULL** — Time-Sync 매칭 전 상태 존재 |
| type | text | NOT NULL, CHECK IN ('photo','video') |
| captured_at | timestamptz | NOT NULL — EXIF 촬영 시각 |
| location | geography(Point, 4326) | NULL — EXIF 위경도 없을 수 있음 |
| width / height | integer | NULL |
| storage_key / thumbnail_key | text | NULL — 선별 업로드 전 NULL (기획 Phase 1) |
| vision_score | jsonb | NULL — Vision AI 스코어링 결과 (마일스톤 3에서 기록) |
| created_at / updated_at | timestamptz | NOT NULL |

- GIST (location), INDEX (trajectory_id, captured_at)

### 1.4 short_forms
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | uuid | PK, default uuidv7() |
| user_id / trajectory_id | uuid | FK NOT NULL (trajectory ON DELETE CASCADE) |
| status | text | NOT NULL default 'requested', CHECK IN ('requested','analyzing','rendering','done','failed') |
| edl | jsonb | NULL — 스토리 엔진 산출 타임라인 |
| video_key / thumbnail_key | text | NULL |
| duration_s | integer | NULL |
| share_slug | text | NULL, UNIQUE — `/v/:slug` 공유 URL |
| error_message | text | NULL — failed 시 사유 |
| created_at / updated_at | timestamptz | NOT NULL |

- INDEX (user_id, created_at DESC)

## 2. 도메인/서비스 구조

### 2.1 services/main-api 구성 (이번 범위 = 골격 + 데이터 계층만)
```
services/main-api/
├── src/
│   ├── app.module.ts            # TypeOrmModule.forRootAsync (ConfigService 주입)
│   ├── config/typeorm.config.ts # DataSource 옵션 단일 소스 (앱·CLI 공용)
│   ├── database/
│   │   ├── data-source.ts       # 마이그레이션 CLI 진입점
│   │   └── migrations/          # 1737...-InitialSchema.ts
│   └── domain/
│       ├── user/user.entity.ts
│       ├── trajectory/trajectory.entity.ts
│       ├── media/media.entity.ts
│       └── short-form/short-form.entity.ts
```
- 엔티티의 공간 컬럼: `@Column({ type: 'geography', spatialFeatureType: 'LineStringZM', srid: 4326 })`
- npm scripts: `typecheck`(tsc --noEmit), `build`, `migration:generate/run/revert`
- `DATABASE_URL` 환경변수 사용 (`.env.example`과 일치)

## 3. UI 구조

해당 없음 (데이터 계층 전용 — Plan §3 비범위)

## 4. 검증 기준 (Evaluator)

- [ ] D-1: `npm run build -w services/main-api` + `typecheck` 성공
- [ ] D-2: `migration:run` 성공 → 4개 테이블 + postgis 확장 + GIST 인덱스 2개 존재 (`\d` 확인)
- [ ] D-3: **멱등성** — `migration:run` 재실행 시 no-op (오류·중복 없음), `migration:revert` 후 재적용 성공
- [ ] D-4: **실행 검증(공간 왕복)** — LineStringZM 실데이터 insert → `ST_Length(path)` 거리 산출, `ST_LocateAlong` M(시각) 기반 위치 조회 정상
- [ ] D-5: CHECK 제약 동작 — provider='apple' insert 거부, status 오타 insert 거부
- [ ] D-6: `docs/references/db-schema.md` 신설 + ARCHITECTURE §3 표와 정합

## 5. 비범위 재확인

OAuth 로직(기능 2), Redis 큐(기능 3), CRUD API, S3 연동 — 이번 구현에 포함하지 않음.
NestJS 앱은 부팅 가능한 골격까지만 (컨트롤러 없음, TypeORM 연결 확인용).
