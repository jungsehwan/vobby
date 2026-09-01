# Design: 여행 업로드 (trip-upload)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/trip-upload.plan.md`

## 0. 핵심 설계 결정

### 0-1. 멱등키 = 모바일의 결정적 trip id (`client_key`)
- `trips.client_key text NOT NULL` + `UNIQUE (user_id, client_key)` — 재업로드는 UPDATE + media 전량 교체
- 모바일 id가 결정적(`trip-{epoch}-{count}`)이므로 별도 멱등 토큰 불필요

### 0-2. 업로드 계약 (shared-types `TripUploadRequest`)
```ts
interface TripMediaUpload {
  type: 'photo' | 'video';
  capturedAt: string;            // ISO
  lon: number | null; lat: number | null;
  source: MediaCoordSource;
  width: number | null; height: number | null;
}
interface TripUploadRequest {
  clientKey: string;
  title: string | null;
  startedAt: string; endedAt: string;   // ISO
  path: GeoLineStringZM | null;
  distanceM: number | null;
  media: TripMediaUpload[];             // 1장 이상
}
```
- 응답: `TripSummary { id, clientKey, title, startedAt, endedAt, distanceM, mediaCount }` (GET 목록도 동일)

### 0-3. 트랜잭션 upsert
- 단일 트랜잭션: trip upsert → 기존 media delete → 신규 insert → media_count 갱신
- path 저장: `ST_GeomFromGeoJSON` 경유 (TypeORM geography 파라미터 — QueryBuilder raw로 명시 캐스팅)

### 0-4. 모바일 인증 골격 = expo-secure-store
- `auth-store.ts`: 토큰 get/set — 실로그인 화면이 붙을 자리. **dev 검증**: `EXPO_PUBLIC_DEV_JWT` env가 있으면 시드 (콘솔 등록 전 임시, __DEV__ 전용)
- `api-client.ts`: `EXPO_PUBLIC_API_URL` + Bearer 주입, 에러 바디(code) 파싱

## 1. 데이터 모델
- 마이그레이션 `AddTripClientKey` (**append**): `ALTER TABLE trips ADD client_key text NOT NULL DEFAULT ''` 후 UNIQUE INDEX (user_id, client_key)?
  → 기존 로우 0건이므로 `ADD COLUMN client_key text NOT NULL` + `CREATE UNIQUE INDEX uq_trips_user_client ON trips(user_id, client_key)` (DEFAULT 불필요 — 빈 테이블)

## 2. 구조

### 2.1 main-api
```
src/domain/trip/
├── trip.module.ts / trip.controller.ts / trip.service.ts
├── dto/upload-trip.dto.ts     # class-validator (중첩 media 배열 검증)
```
- POST /v1/trips, GET /v1/trips — 둘 다 JwtAuthGuard
- 서비스: DataSource 트랜잭션, 공간값은 파라미터라이즈드 raw (인젝션 금지)

### 2.2 apps/mobile
```
src/lib/api-client.ts          # fetch 래퍼 (API_URL, Bearer, ApiErrorBody 파싱)
src/features/auth/auth-store.ts# expo-secure-store 토큰 보관 (+ dev 시드)
src/features/trips/trip-upload.service.ts # 로컬 trip+media → TripUploadRequest 변환·전송
app/trip/[id].tsx              # "서버에 올리기" 버튼 + 업로드 상태(성공/에러)
```
- 좌표→path 변환: GPS 사진 2장 이상 시 시간순 [lon,lat,0,epoch] (클러스터링과 동일 규약)

## 3. UI 구조
여행 상세 상단에 업로드 버튼 — 로딩/성공("서버에 저장됨")/에러(코드별 안내: 401=로그인 필요) 상태.

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 루트 typecheck + 서버 유닛(upsert 멱등 — 스텁 불가한 트랜잭션은 실DB 검증으로 대체 명시)
- [ ] D-2: 마이그레이션 append 적용·멱등, 기존 테이블 무손상
- [ ] D-3: **API 실호출** — 시드 유저 JWT로 POST 201 → DB trip+media 확인(공간값 포함) → 같은 body 재POST → trip 1개·media 교체 확인, GET 목록 반영
- [ ] D-4: 무토큰 401, 잘못된 body 400
- [ ] D-5: **시뮬레이터 E2E** — dev JWT 주입 앱에서 여행 상세 → 업로드 탭 → 성공 표시 + 서버 DB에 로컬과 동일 media 수
- [ ] D-6: 문서 동기화 (api-endpoints, db-schema, index)

## 5. 비범위 재확인
S3 원본 업로드 / 로그인 UI / 숏폼 생성 트리거 — 제외.
