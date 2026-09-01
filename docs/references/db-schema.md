# DB 스키마 참조

> 진실 소스: `services/main-api/src/database/migrations/` — 이 문서는 요약본.
> 스키마 변경 시 이 문서를 함께 갱신한다 (CLAUDE.md §push 시 문서 업데이트 규칙).
> 최종 갱신: 2026-09-01 (InitialSchema)

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

### trajectories — GPS 궤적 (활동 1회)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK→users | ON DELETE CASCADE |
| title | text NULL | AI 생성 활동 타이틀 |
| path | **geography(LineStringZM, 4326)** | X=경도 Y=위도 **Z=고도m M=epoch초** |
| started_at / ended_at | timestamptz | |
| distance_m / elevation_gain_m | double precision | 저장 시 계산 확정 (Outro 통계) |
| duration_s / point_count | integer | |

- `ix_trajectories_path` GIST(path), `ix_trajectories_user_started` (user_id, started_at DESC)
- 시각→위치: `ST_LocateAlong(path::geometry, epoch초)` / 포인트 분해: `ST_DumpPoints`

### media — 사진/영상 메타데이터 (원본은 S3)
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid FK→users | CASCADE |
| trajectory_id | uuid FK NULL | Time-Sync 매칭 전 NULL, ON DELETE SET NULL |
| type | text | CHECK: `photo`·`video` |
| captured_at | timestamptz | EXIF 촬영 시각 |
| location | geography(Point,4326) NULL | EXIF 위경도 없을 수 있음 |
| width / height | integer NULL | |
| storage_key / thumbnail_key | text NULL | 선별 업로드 전 NULL |
| vision_score | jsonb NULL | Vision AI 결과 (마일스톤 3) |

- `ix_media_location` GIST, `ix_media_trajectory_captured` (trajectory_id, captured_at)

### short_forms — 생성된 숏폼
| 컬럼 | 타입 | 비고 |
|------|------|------|
| id | uuid PK | |
| user_id / trajectory_id | uuid FK | 둘 다 CASCADE |
| status | text | CHECK: `requested`→`analyzing`→`rendering`→`done`/`failed` |
| edl | jsonb NULL | 스토리 엔진 타임라인 |
| video_key / thumbnail_key | text NULL | |
| duration_s | integer NULL | |
| share_slug | text NULL UNIQUE | `/v/:slug` 공유 URL |
| error_message | text NULL | failed 사유 |

- `ix_short_forms_user_created` (user_id, created_at DESC)

## RDB 비대상

- **RenderJob** (작업 진행률): Redis 휘발성 — ARCHITECTURE §3
