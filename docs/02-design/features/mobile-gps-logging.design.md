# Design: 모바일 백그라운드 GPS 로깅 (mobile-gps-logging)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/mobile-gps-logging.plan.md`

## 0. 핵심 설계 결정

### 0-1. 백그라운드 수집 = expo-location `startLocationUpdatesAsync` + expo-task-manager
- TaskManager 태스크는 **모듈 최상위에서 정의** (앱 UI 미기동 상태에서도 OS가 깨울 수 있어야 함)
- 수집 옵션: `Accuracy.High`, `timeInterval 5000ms`, `distanceInterval 10m`, iOS `showsBackgroundLocationIndicator: true`(투명성)

### 0-2. 로컬 저장 = expo-sqlite (세션/포인트 2테이블)
| 대안 | 판정 | 사유 |
|------|------|------|
| **expo-sqlite (채택)** | ✅ | 백그라운드 태스크에서 포인트 단위 append — 수천 건에도 안정, 크래시 시 유실 없음 |
| AsyncStorage JSON | ⛔ | 매 포인트마다 전체 배열 직렬화 — 장시간 기록 시 성능 붕괴 |
| 메모리 + 종료 시 저장 | ⛔ | 강제 종료 시 전체 유실 (plan §5 위반) |

### 0-3. 포인트 좌표 규약 = 서버 LineStringZM과 1:1
- `[경도, 위도, 고도m, epoch초]` — 업로드 기능에서 `GeoLineStringZM.coordinates`로 무변환 매핑

### 0-4. 검증 전략 = dev build + `simctl location` 시나리오
- Expo Go는 백그라운드 위치 미지원 → `npx expo run:ios` (prebuild + CocoaPods)
- 위치 주입: `xcrun simctl location <udid> start --speed=...` 경로 시뮬레이션
- 백그라운드 전환: 다른 앱(설정) 실행으로 홈 이탈 → 포인트 증가 확인 → 복귀

## 1. 데이터 모델 (expo-sqlite — 단말 로컬)

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,            -- uuid
  started_at INTEGER NOT NULL,    -- epoch초
  ended_at INTEGER,               -- NULL = 기록 중
  status TEXT NOT NULL DEFAULT 'recording'  -- recording | done
);
CREATE TABLE points (
  session_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  lon REAL NOT NULL, lat REAL NOT NULL,
  altitude REAL NOT NULL,         -- m (없으면 0)
  recorded_at INTEGER NOT NULL,   -- epoch초
  PRIMARY KEY (session_id, seq)
);
```

## 2. 구조 (apps/mobile)

```
app/index.tsx                    # 기록 화면 (권한→시작/중지, 통계)
src/features/recording/
├── location-task.ts             # TaskManager 태스크 정의 (모듈 최상위) — 포인트를 DB에 append
├── recording.service.ts         # start/stop/현재 세션 조회 — expo-location 제어 + 세션 상태
├── recording.db.ts              # sqlite 초기화·쿼리 (sessions/points)
└── use-recording.ts             # 화면 훅 — 상태 폴링(2s), 통계 계산(하버사인 거리)
```
- 앱 이름/식별자: `Vobby` / `com.vobby.app` (app.json)
- 권한 문구(iOS infoPlist): 위치 상시 접근 사유 — "이동 경로를 기록해 활동 영상을 자동 생성하기 위해 백그라운드에서도 위치를 사용합니다" (스토어 심사 요건)
- `UIBackgroundModes: ["location"]`, Android: `ACCESS_BACKGROUND_LOCATION` + foregroundService
- 화면 스타일은 `@vobby/ui-tokens`만 사용 (하드코딩 색 금지 — 첫 소비 사례)

## 3. UI 구조
단일 화면: 권한 미허용 → 안내+요청 버튼 / 허용 → 시작·중지 버튼 + 실시간 통계(포인트 수, 경과, 거리 km).
로딩/에러 상태 처리 (QUALITY §3).

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 루트 typecheck 통과 (mobile 포함)
- [ ] D-2: dev build 성공 + 시뮬레이터 설치·기동
- [ ] D-3: 권한 플로우 — 허용 후 기록 시작, 포인트 축적(화면 통계 증가) 스크린샷
- [ ] D-4: **백그라운드 로깅** — 홈 이탈 상태에서 simctl 위치 이동 → 복귀 시 포인트 증가 확인
- [ ] D-5: 중지 후 세션 status=done, 재시작 시 새 세션. 기록 중 앱 재실행 시 세션 이어짐 인지
- [ ] D-6: 권한 거부 시 안내 표시·크래시 없음
- [ ] D-7: 문서 동기화 (index, ARCHITECTURE 필요 시)

## 5. 비범위 재확인
서버 업로드 / Android 실검증 / 지도 표시 / EXIF — 제외.
