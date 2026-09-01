# 모바일 백그라운드 GPS 로깅 (mobile-gps-logging)

> **⛔ 폐기 (2026-09-01)** — 제품 방향 정정: 앱의 핵심은 직접 기록이 아니라 기존 위치 이력(갤러리 EXIF·구글 타임라인·GPX) 소싱.
> 이 문서 전체는 참조 금지. 대체: `trip-timeline` (갤러리 EXIF 역구성). 코드 제거는 trip-timeline exec-plan에 포함.
> Status: ⛔ 제외
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- `apps/mobile`은 .gitkeep만 존재 — Expo 앱 생성부터 필요
- 서버 측 수신처는 준비됨: `trajectories.path`가 `geography(LineStringZM)` (Z=고도, M=epoch초) — 로깅 포인트가 이 좌표 규약을 따라야 함 (`@vobby/shared-types` GeoLineStringZM)

### 1.2 재사용 가능한 기존 인프라
- `@vobby/shared-types` (좌표 규약), `@vobby/ui-tokens` (화면 토큰 — 첫 소비자)
- Xcode 26.6 + iOS 26.5 시뮬레이터 (부팅 검증 완료), watchman

### 1.3 관련 데이터/모델 현황
- 서버 업로드 API 없음 — 이 기능은 **단말 로컬 기록까지**

## 2. 사용자 요구 (원문 요약)
기획서 §1 "백그라운드 GPS 위치 로깅" + §2 Phase 1 "GPS 로그(위도, 경도, 고도, 타임스탬프) 기록". 마일스톤 2 기능 4.

## 3. 범위 / 비범위

### 범위 (In scope)
- Expo 앱 생성 (`apps/mobile`, expo-router, 워크스페이스 편입)
- 백그라운드 위치 로깅: expo-location + expo-task-manager — 앱이 백그라운드여도 포인트 축적
- 로컬 저장: expo-sqlite — 세션(기록 1회) 단위 포인트 영속화
- 기록 화면 1개: 권한 요청 → 시작/중지, 진행 통계(포인트 수·경과시간·거리)
- iOS 백그라운드 위치 권한 문구·UIBackgroundModes (스토어 심사 대비 문구 포함)
- iOS 시뮬레이터 dev build 실검증 (Expo Go는 백그라운드 위치 미지원)

### 비범위 (Out of scope)
- 서버 업로드 / Trajectory 생성 API 연동 → 후속 기능
- Android 실검증 (Android Studio 미설치 — 설정만 반영, 검증은 추후)
- 지도 표시, 갤러리/EXIF (기능 5), 배터리 최적화 튜닝
- 로그인 연동 (기록은 로컬 익명 — 업로드 기능에서 연결)

## 4. 요구사항 상세
- 포인트: 경도/위도/고도(m)/타임스탬프(epoch초) — 서버 LineStringZM 규약과 1:1
- 수집 주기: 시간 5s 또는 이동 10m 기준 (활동 기록 용도 — 정확도 High)
- 세션 상태가 앱 재시작을 견뎌야 함 (기록 중 크래시/종료 후 재진입 시 이어짐 인지)

## 5. 방어적 AC (실패 모드 선반영)
- 권한 거부 시: 명확한 안내 + 기록 시작 차단 (크래시 금지)
- 백그라운드 전환 시: 로깅 지속 (핵심 AC — 시뮬레이터에서 실측)
- 기록 중 앱 강제 종료: 저장된 포인트 유실 없음 (SQLite 영속)
- 중복 시작 방지: 이미 기록 중이면 시작 버튼 무효

## 6. 오픈 이슈 / 결정 대기
- Android 백그라운드 검증 시점 (Android Studio 설치 후)
- 업로드 시 세션→Trajectory 변환 API 설계 → 후속 기능 plan
