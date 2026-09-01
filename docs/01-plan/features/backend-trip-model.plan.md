# 백엔드 재구성 — Trip 도메인 모델 (backend-trip-model)

> Status: Approved (2026-09-01 — "백엔드부터 다시 구성" 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- `trajectories` 테이블/엔티티는 **직접 GPS 기록 전제**로 설계됨 (연속 LineString NOT NULL, point_count, elevation_gain NOT NULL) — 방향 정정으로 전제 무효
- 마이그레이션 2개(InitialSchema, RefreshTokens) 적용 상태, **실데이터 없음·배포 전**
- 미커밋 상태의 short-form 공개 조회 모듈(web-viewer 작업분)이 trajectory를 참조 중

### 1.2 재사용 가능한 기존 인프라
- users/refresh_tokens (인증) — 방향과 무관, 유지
- PostGIS·uuidv7·text+CHECK 규약, 마이그레이션 러너, 검증 체계 전부 유지

## 2. 사용자 요구 (원문 요약)
"초기로 돌아가서 백엔드부터 다시 구성 — 불필요한 사항 제거, 최적화를 위한 파이프라인 구성부터 다시" (2026-09-01).

## 3. 범위 / 비범위

### 범위 (In scope)
- 도메인 재설계: `trajectories` 폐기 → **`trips`** (사진 기반 여행 — path nullable, 근사 통계)
- `media`·`short_forms`를 trip 참조로 재정의, media에 좌표 출처(source) 규약 반영
- **마이그레이션 스쿼시**: 기존 2개 → 새 InitialSchema 1개 (배포 전이므로 히스토리 재작성 허용 — 이 결정 자체를 기록)
- shared-types(ShortFormPublicView 등)·short-form 공개 조회 모듈을 trip 기반으로 수정
- db-schema.md·ARCHITECTURE §3 동기화

### 비범위 (Out of scope)
- 업로드/트립 생성 API (모바일 trip-timeline 후 별도 기능)
- ai-pipeline 코드 변경 (골격뿐 — 입력 정의는 ARCHITECTURE에 반영됨)
- web-viewer 완성 (재구성 후 재개)

## 4. 요구사항 상세
- trips.path: `geography(LineStringZM) NULL` — GPS 사진 0장 여행 허용 (Z=고도 or 0, M=epoch초 규약 유지)
- 통계는 근사값: distance_m nullable, media_count 유지. elevation_gain 제거 (사진 기반에서 신뢰 불가한 값을 스키마에 남기지 않음)
- media.source: `exif|timesync|none` CHECK — 모바일 로컬 규약과 동일 (AI 신뢰도 가중치용)

## 5. 방어적 AC
- 마이그레이션 스쿼시 후에도 run 멱등·revert 가역
- path NULL 트립 insert 가능 + GIST 인덱스 정상 (partial 아님 — NULL 허용 확인)
- 기존 검증(auth 실호출, 큐 왕복)이 재구성 후에도 통과 (회귀 없음)

## 6. 오픈 이슈 / 결정 대기
- 트립 업로드 API 계약 — trip-timeline(모바일) 산출물 확정 후 설계
