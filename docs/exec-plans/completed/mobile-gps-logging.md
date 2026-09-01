# Exec Plan: mobile-gps-logging

## 개요
- **기능**: Expo 앱 + 백그라운드 GPS 로깅 (SQLite 영속, 시뮬레이터 실검증)
- **Plan**: `docs/01-plan/features/mobile-gps-logging.plan.md`
- **Design**: `docs/02-design/features/mobile-gps-logging.design.md`
- **시작일**: 2026-09-01

## 체크리스트

### 앱 생성/설정 (Design §2)
- [x] create-expo-app (apps/mobile) + 워크스페이스 편입 + typecheck 스크립트
- [x] expo-location/task-manager/sqlite 설치
- [x] app.json: 식별자, iOS 권한 문구·UIBackgroundModes, Android 권한

### 구현 (Design §1~3)
- [x] recording.db.ts (sessions/points)
- [x] location-task.ts (모듈 최상위 TaskManager)
- [x] recording.service.ts (start/stop/현재 세션)
- [x] use-recording.ts + app/index.tsx (ui-tokens 소비)
- [x] 루트 typecheck (D-1)

### 검증 (Design §4)
- [x] D-2: dev build + 시뮬레이터 기동
- [x] D-3: 기록 시작·포인트 축적 (스크린샷)
- [x] D-4: 백그라운드 로깅 실측
- [x] D-5: 중지/재시작 세션 상태
- [x] D-6: 권한 거부 경로
- [x] 그레이딩 + 문서 동기화

## 기술 노트
- Expo Go 미사용 — 백그라운드 위치는 dev build 필수 (CocoaPods 신규 설치)

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 100/100 (전 계층 해당 — UI 포함 첫 기능)
빌드: 성공 (typecheck 0, expo run:ios 네이티브 빌드)
갭: 없음 — D-1~D-6 전수 실측 통과. Android 실검증은 plan 비범위(설정만 반영)
지적: 구현 중 수정 2건 — (1) Metro가 .db를 asset 확장자로 취급해 recording.db.ts 해석 실패
      → recording-db.ts로 개명 + Metro 캐시 클리어 필요했음. (2) TaskManager 실행자 async 시그니처
```

### 검증 실측 기록 (iPhone 17 시뮬레이터, iOS 26.5)
- D-2: expo run:ios 빌드·설치·기동, ui-tokens 적용 화면 렌더링
- D-3: Maestro로 기록 시작 탭 → simctl location 경로 주입 → **앱 SQLite 직접 조회**로 포인트 5→10 증가, 좌표가 주입 경로 추종, M=epoch초 규약 확인
- D-4(핵심): 설정 앱으로 백그라운드 전환 → **포인트 24→28 계속 증가** — 백그라운드 로깅 실증
- D-5: 복귀 시 "기록 중" 세션 이어짐 → 중지 → sessions.status=done + ended_at 기록 (총 50포인트)
- D-6: locationd 거부 상태에서 "위치 권한 허용하기" 안내 표시, 크래시 없음

### 검증 도구 함정 (재발 방지)
- **Maestro launchApp은 기본으로 모든 권한 자동 허용** — 권한 거부 테스트는 `permissions: {location: deny}`로도 locationd에 안 먹힘
- **simctl privacy grant/revoke/reset은 위치 권한(locationd 소관)에 비신뢰** — 확실한 방법: 시뮬레이터 shutdown 후
  `data/Library/Caches/locationd/clients.plist`의 Authorization 직접 수정(PlistBuddy, 키 콜론 이스케이프) 후 boot
