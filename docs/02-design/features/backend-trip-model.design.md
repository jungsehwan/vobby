# Design: 백엔드 재구성 — Trip 도메인 (backend-trip-model)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/backend-trip-model.plan.md`

## 0. 핵심 설계 결정

### 0-1. 마이그레이션 스쿼시 (배포 전 1회 한정)
- 기존 2개 마이그레이션 삭제 → 새 `InitialSchema` 1개 (users/refresh_tokens/trips/media/short_forms)
- 허용 근거: 실데이터 0·배포 전. **배포 이후에는 절대 금지** — AGENTS.md Data agent에 명시 추가
- 로컬 DB는 drop 후 재적용으로 재현성 검증

### 0-2. Trip = "사진으로 재구성된 여행" (기록 아님)
- path nullable — 소싱 데이터가 없을 수 있음이 도메인의 본질
- elevation_gain 제거 — 사진 EXIF 고도는 희소·부정확, 신뢰 불가 값을 스키마에 두지 않는다
- media_count는 비정규화 컬럼 (목록 조회 최적화) — 업로드 API에서 관리

### 0-3. media.source 규약을 서버까지 관통
- 모바일 로컬(session_media→trip_media)과 동일한 `exif|timesync|none` — 파이프라인(마일스톤 3)이 신뢰도 가중치로 사용

## 1. 데이터 모델 (신 InitialSchema)

### users / refresh_tokens — 기존과 동일 (변경 없음)

### trips (구 trajectories 대체)
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | uuid | PK default uuidv7() |
| user_id | uuid | FK users CASCADE, NOT NULL |
| title | text | NULL — AI 자동 생성 |
| started_at / ended_at | timestamptz | NOT NULL — 사진 시각 범위 |
| path | geography(LineStringZM,4326) | **NULL** — GPS 사진 시간순 시퀀스 근사 |
| distance_m | double precision | NULL — path 있을 때만 |
| media_count | integer | NOT NULL default 0 |
| created_at / updated_at | timestamptz | NOT NULL |

- GIST(path), INDEX(user_id, started_at DESC)

### media
- trip_id: uuid FK trips **CASCADE, NOT NULL** (여행 소속으로만 업로드)
- source: text NOT NULL CHECK IN ('exif','timesync','none')
- 나머지 기존과 동일 (captured_at, location Point NULL, width/height, storage_key/thumbnail_key, vision_score)
- GIST(location), INDEX(trip_id, captured_at)

### short_forms
- trajectory_id → **trip_id** (FK trips CASCADE). 나머지 동일 (status CHECK, edl, share_slug UNIQUE 등)

## 2. 코드 변경

### 2.1 main-api
- `domain/trajectory/` 삭제 → `domain/trip/trip.entity.ts`
- media/short-form 엔티티 trip 참조로 수정, short-form 서비스의 stats → `{distanceM: number|null, durationS(기간), mediaCount}`
- data-source 엔티티/마이그레이션 목록 교체

### 2.2 shared-types
- `ShortFormPublicView.stats` 재정의: `{ distanceM: number | null; durationS: number; mediaCount: number }`
- `MediaCoordSource`('exif'|'timesync'|'none') 추가 — 모바일 로컬 타입을 공용화

## 3. UI 구조
해당 없음

## 4. 검증 기준 (Evaluator)
- [ ] D-1: typecheck/build (shared-types 재빌드 포함)
- [ ] D-2: DB drop → migration:run — 5개 테이블+인덱스, 재실행 no-op, revert 가역
- [ ] D-3: 공간 왕복 — path 있는 트립(ST_Length) + **path NULL 트립** insert 정상
- [ ] D-4: 회귀 — 앱 부팅, /me 401, 위조 kakao 401 (auth 경로), by-slug 404 코드
- [ ] D-5: db-schema.md·ARCHITECTURE §3 동기화, AGENTS.md 스쿼시 금지 조항

## 5. 비범위 재확인
업로드 API / ai-pipeline 코드 / web-viewer 완성 — 제외.
