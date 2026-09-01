# Design: 여행 타임라인 — 갤러리 EXIF 역구성 (trip-timeline)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/trip-timeline.plan.md`

## 0. 핵심 설계 결정

### 0-1. 2단 구조: asset_meta 캐시 → trips/trip_media 파생 재계산
- **asset_meta**: 갤러리 스캔 결과 캐시 (asset당 1회 `getAssetInfoAsync` — 재스캔 시 신규 asset만 조회)
- **trips/trip_media**: asset_meta에서 클러스터링으로 **전량 파생 재계산** (truncate+rebuild) — 클러스터 경계 이동을 자연 처리, 멱등이 자명
- 로컬 trips는 파생 데이터 — 사용자 편집(이름/병합)이 생기는 시점에 보존 전략 재설계 (plan §6)

### 0-2. 클러스터링 = 시간 간격 기반 (plan §4.1)
- 시각 오름차순 정렬 → 연속 간격 > **8h** 분리 → **3장 이상** 그룹만 여행 승격
- 좌표 매칭은 여행 내에서: EXIF GPS > timesync(±60s → 여행 내 GPS 사진 최근접, **완화 오차 30분**) > none
  - 기록 포인트(5s 간격)가 없어졌으므로 사진 간 근사는 오차 허용을 30분으로 — Design 결정, 오매칭 방지 위해 여행 내로 한정
- path: GPS 사진 시간순 `[lon,lat,alt??0,epoch]` 시퀀스 (2장 이상일 때), distance는 하버사인 합

### 0-3. 폐기 일괄 수행
- `features/recording/` 전체, sessions/session 화면, expo-location·expo-task-manager 의존성, app.json 위치 플러그인·권한 제거 (사진 권한만 잔존) → **네이티브 재빌드 1회 필요**

## 1. 데이터 모델 (expo-sqlite — vobby-recording.db → vobby.db로 개명)

```sql
CREATE TABLE asset_meta (
  asset_id TEXT PRIMARY KEY,
  captured_at INTEGER NOT NULL,      -- epoch초 (EXIF DateTimeOriginal ?? creationTime)
  lon REAL, lat REAL,                -- EXIF GPS (없으면 NULL)
  width INTEGER, height INTEGER,
  uri TEXT NOT NULL
);
CREATE TABLE trips (
  id TEXT PRIMARY KEY,               -- uuid (재계산 시 재발급)
  started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL,
  media_count INTEGER NOT NULL,
  distance_m REAL                    -- NULL = GPS 부족
);
CREATE TABLE trip_media (
  trip_id TEXT NOT NULL, asset_id TEXT NOT NULL,
  captured_at INTEGER NOT NULL,
  lon REAL, lat REAL,
  source TEXT NOT NULL,              -- exif | timesync | none (@vobby/shared-types 규약)
  uri TEXT NOT NULL,
  PRIMARY KEY (trip_id, asset_id)
);
```

## 2. 구조 (apps/mobile)

```
src/features/trips/
├── trips-db.ts            # 스키마 + 쿼리 (asset_meta upsert, trips 재작성, 조회)
├── gallery-scan.service.ts# 갤러리 페이지 순회 → asset_meta 캐시 (신규만 info 조회, 진행 콜백)
├── clustering.ts          # 순수 함수: asset_meta[] → { trips, tripMedia } (8h/3장/30분 파라미터 상수)
├── trip-timeline.service.ts # scanAndRebuild(): 스캔 → 클러스터링 → 재작성
└── use-trips.ts / use-trip-detail.ts
src/app/index.tsx          # 홈 = 여행 목록 (스캔 버튼 + 진행 상태 + 카드)
src/app/trip/[id].tsx      # 여행 상세 — 시간순 타임라인 (사진·시각·출처 배지)
```
- clustering.ts는 **순수 함수** — 유닛 테스트 대상 (경계·최소 장수·매칭)
- 삭제: recording/, media/(승계 개작 후), sessions.tsx, session/

## 3. UI 구조
- 홈: 권한 안내/스캔 버튼/스캔 중 표시 → 여행 카드(날짜 범위, N장, ~km) → 상세
- 상세: 시간순 리스트(썸네일, HH:mm, 좌표 출처 배지)
- 빈 상태: "사진을 스캔하면 여행이 자동으로 만들어져요"

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 루트 typecheck + clustering 유닛 테스트(간격 분리·3장 미만 배제·timesync 30분 한계)
- [ ] D-2: 위치 관련 권한·의존성 제거 확인 (Info.plist에 location 문구 없음) + 재빌드·부팅
- [ ] D-3: **실검증** — 서로 다른 날짜 사진 세트(어제 4장 / 5일 전 3장 / 10일 전 1장) 주입 → 스캔 → **여행 2개** (1장짜리 제외)
- [ ] D-4: 상세 타임라인 — exif/timesync/none 분류 표시, GPS 시퀀스 distance 근사값
- [ ] D-5: 재스캔 멱등 — 여행 수·구성 불변, asset_meta 캐시로 신규만 조회
- [ ] D-6: 사진 권한 거부 → 안내, 크래시 없음
- [ ] D-7: 문서 동기화 (index 4a Impl, media-exif-timesync 승계 완료 표기)

## 5. 비범위 재확인
구글 타임라인/GPX(4b), 업로드, 지도 표시, 여행 편집 — 제외.
