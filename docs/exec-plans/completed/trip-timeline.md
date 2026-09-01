# Exec Plan: trip-timeline

## 개요
- **기능**: 기록 기능 폐기 + 갤러리 EXIF 역구성 여행 타임라인
- **Plan/Design**: `docs/01-plan|02-design/features/trip-timeline.*`
- **시작일**: 2026-09-01

## 체크리스트

### 폐기 (Design §0-3)
- [x] recording/·media/(구) 기능, sessions·session 화면 삭제
- [x] expo-location·expo-task-manager 제거, app.json 위치 플러그인·권한 제거

### 구현 (Design §1~3)
- [x] trips-db.ts (asset_meta/trips/trip_media)
- [x] clustering.ts (순수 함수) + 유닛 테스트
- [x] gallery-scan.service.ts (캐시·신규만 조회·진행 콜백)
- [x] trip-timeline.service.ts + 훅 2종
- [x] 홈(여행 목록)·상세 화면
- [x] typecheck (D-1)

### 검증 (Design §4)
- [x] D-2: 위치 흔적 제거 + 재빌드 부팅
- [x] D-3: 다중 날짜 사진 → 여행 2개 (1장 세트 제외)
- [x] D-4: 타임라인 분류·거리 근사
- [x] D-5: 재스캔 멱등·캐시 동작
- [x] D-6: 권한 거부
- [x] 그레이딩 + 문서 동기화 (D-7)

## 기술 노트
- 모바일 유닛 테스트 러너 부재 — clustering 테스트는 tsx 스크립트(assert) 방식으로 시작

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 100/100
빌드: 성공 (typecheck 0 — 라우트 타입 재생성 후, clustering 유닛 5/5)
갭: 없음 — D-1~D-7 통과 (D-4는 Maestro 텍스트 노드 병합 한계로 스크린샷 증빙)
지적: expo run:ios는 ios/ 존재 시 prebuild를 재실행하지 않음 — 플러그인/권한 변경 시 prebuild --clean 필수
```

### 검증 실측 기록 (iPhone 17 시뮬레이터)
- D-1: clustering 순수 함수 유닛 5/5 (8h 분리·3장 미만 배제·30분 timesync 한계·거리 근사·결정적 id)
- D-2: prebuild --clean 후 Info.plist location 항목 0, ExpoLocation pod 0 — 위치 흔적 완전 제거, 재빌드 부팅 확인
- D-3: 갤러리(시뮬레이터 기본 사진 포함 14장) 스캔 → **여행 3개** — 2012 샘플 3장(450km), 부산 3장(8.7km),
  어제 4장(GPS 1장→거리 null). 단독 1장 승격 제외. source: exif 7 / timesync 2(25분 근사 포함) / none 1(75분 초과)
- D-4: 상세 타임라인 — 시간순 사진 + EXIF 좌표 표시 (스크린샷)
- D-5: 재스캔 후 trips 3·asset_meta 14 불변 (파생 재계산 멱등, 신규만 상세 조회)
- D-6: photos 권한 거부 → 안내 문구, 크래시 없음

### 추가 기록 — Maestro가 SpringBoard를 크래시시킬 수 있음
- 검증 중 시뮬레이터 SpringBoard가 SIGSEGV (스레드: XCTAutomationSession init — Maestro의 XCTest 자동화 세션).
  **앱 크래시 아님** — launchd_sim이 SpringBoard를 자동 재시작하며 앱·데이터 무영향. 판정 증빙을 Maestro 단언이 아닌
  SQLite 직접 조회·스크린샷으로 남기는 기존 방침이 유효했음.
