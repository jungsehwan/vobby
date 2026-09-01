# DB 스키마 참조

> 진실 소스: `services/main-api/src/database/migrations/` — 이 문서는 요약본.
> 스키마 변경 시 이 문서를 함께 갱신한다 (CLAUDE.md §push 시 문서 업데이트 규칙).
> 최종 갱신: 2026-09-01 (backend-trip-model — Trajectory→Trip 재구성, 마이그레이션 스쿼시)

## 공통 규약

- PK: `uuid` DEFAULT `uuidv7()` (PG18 내장 — 시간 정렬)
- 시각: 전부 `timestamptz` (naive timestamp 금지)
- 열거값: Postgres enum 대신 `text` + CHECK 제약 (확장 시 제약만 교체)
- 스키마 변경: TypeORM 마이그레이션만 (`npm run migration:run -w services/main-api`), synchronize 금지
- 공간 데이터: `geography` 타입 (SRID 4326, 미터 단위 연산)

## 테이블

### users
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| provider | text | CHECK: `google`·`kakao` (Apple은 iOS 출시 시 추가) |
| provider_uid | text | UNIQUE(provider, provider_uid) |
| email | text NULL | Kakao 미제공 케이스 |
| nickname | text | |
| avatar_url | text NULL | |

### trips — 사진·외부 이력으로 재구성된 여행 (구 trajectories 대체)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK→users | ON DELETE CASCADE |
| client_key | text | UNIQUE(user_id, client_key) — 모바일 결정적 id, 업로드 멱등키 (trip-upload) |
| title | text NULL | AI 생성 여행 타이틀 |
| started_at / ended_at | timestamptz | 사진 시각 범위 |
| path | geography(LineStringZM, 4326) **NULL** | GPS 사진 시간순 시퀀스 근사 — GPS 사진 0장이면 NULL |
| distance_m | double precision NULL | path 있을 때만 (근사) |
| media_count | integer | 비정규화 — 업로드 API가 관리 |
| pois | jsonb NULL | POI 분석 결과 — spatial.extract_pois가 기록 (start/spot/end) |

- `ix_trips_path` GIST(path), `ix_trips_user_started` (user_id, started_at DESC)

### media — 사진/영상 메타데이터 (원본은 S3)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK→users | CASCADE |
| trip_id | uuid FK→trips | **NOT NULL, CASCADE** — 여행 소속으로만 업로드 |
| type | text | CHECK: `photo`·`video` |
| captured_at | timestamptz | EXIF 촬영 시각 |
| location | geography(Point,4326) NULL | EXIF 위경도 없을 수 있음 |
| source | text | CHECK: `exif`·`timesync`·`none` — 좌표 출처 (모바일 규약 공유) |
| width / height | integer NULL | |
| storage_key / thumbnail_key | text NULL | **MEDIA_STORAGE_ROOT 기준 상대경로** (로컬 규약 — S3 교체 지점: renderer/db.py resolve_media_path) |
| vision_score | jsonb NULL | Vision AI 결과 (마일스톤 3) |

- `ix_media_location` GIST, `ix_media_trip_captured` (trip_id, captured_at)

### short_forms — 생성된 숏폼
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| user_id / trip_id | uuid FK | 둘 다 CASCADE |
| status | text | CHECK: `requested`→`analyzing`→`rendering`→`done`/`failed` |
| edl | jsonb NULL | EDL v1 (director.generate_edl 기록 — 계약: director-edl design §0-1) |
| video_key / thumbnail_key | text NULL | |
| duration_s | integer NULL | |
| share_slug | text NULL UNIQUE | `/v/:slug` 공유 URL |
| error_message | text NULL | failed 사유 |

- `ix_short_forms_user_created` (user_id, created_at DESC)

### refresh_tokens — 인증 refresh 토큰 (해시만)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK→users | CASCADE |
| token_hash | text UNIQUE | **sha256 해시만 — 평문 저장 금지** |
| expires_at | timestamptz | 30d (env REFRESH_TTL_DAYS) |
| revoked_at | timestamptz NULL | 회전/로그아웃 시각, NULL=유효 후보 |

- `ix_refresh_tokens_user` (user_id). 회전(rotation): refresh 시 기존 revoke 후 신규 발급

## RDB 비대상

- **RenderJob** (작업 진행률): Redis 휘발성 — ARCHITECTURE §3

## Redis 키/큐 규약 (vobby-redis :6380)

| DB | 용도 | 규약 |
|----|------|------|
| 0 | 앱 캐시·진행률 (`REDIS_URL`) | `vobby:progress:{taskId}` = JSON `{status, detail, updatedAt}`, **TTL 1h** |
| 1 | Celery 브로커 (`CELERY_BROKER_URL`) | 큐 리스트 `celery` — Node는 프로토콜 v2로 발행, Python Celery가 소비 |
| 2 | Celery result backend | Python 내부용 (Node 미접근) |

- 발행: `src/queue/celery-producer.ts` / 진행률 기록: `common/progress.py` — 규약 변경 시 양쪽 동시 수정
