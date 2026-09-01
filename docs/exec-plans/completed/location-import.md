# Exec Plan: location-import

## 개요
- **기능**: 구글 타임라인·GPX import → 타임라인 보강 (timesync 확대·거리·dense path)
- **Plan/Design**: `docs/01-plan|02-design/features/location-import.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] location-parsers.ts (GPX·타임라인 신/구형, 순수)
- [x] trips-db.ts location_points + clustering extPoints 확장
- [x] trip-upload buildPath 병합·다운샘플 (trip-path.ts 순수 분리 — tsx 유닛 실행용)
- [x] location-import.service + app/import.tsx + dev-fixtures
- [x] expo-document-picker/expo-file-system 설치 + expo run:ios 재빌드
- [x] D-1~D-3 유닛, D-4~D-5 시뮬레이터 E2E, D-6 업로드 통합
- [x] 그레이딩 + index 동기화 (D-7)

## 기술 노트
- dev 샘플은 **최신 여행 기간에 맞춰 생성** (`sampleGpx(startS, endS)`) — 시뮬레이터 갤러리 사진 날짜와 무관하게 보강 검증 가능
- 같은 초의 중복 포인트는 PK(source_file, t) INSERT OR REPLACE로 흡수 — 파싱 수와 저장 수가 다를 수 있음(타임라인 visit이 timelinePath 첫 점과 동시각)
- Metro는 반드시 apps/mobile에서 기동 — 루트에서 띄우면 entry를 expo/AppEntry.js로 잘못 해석 (cwd 리셋 주의)
- dotenvx가 stdout에 배너를 찍음 — node -e로 토큰 생성 시 stdout 캡처에 섞이지 않게 주의
- DEV_JWT 만료(2h) 재발급 절차: 서버 JWT_SECRET으로 sign 후 apps/mobile/.env 갱신 + Metro 재시작
- Maestro SpringBoard 크래시(XCTAutomationSession, iOS 26.5) 1회 재발 — 기지 도구 버그, 재시도로 통과 (3번째 발생)

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100
빌드: 성공 (root typecheck + mobile tsc 0 + 유닛 8/8 + 기존 clustering 회귀 5/5)
갭: 없음 — D-1~D-7 통과. Records.json 스트리밍은 계획된 비범위(50MB 상한으로 방어)
지적: 실제 구글 타임라인 내보내기 파일 확보 시 파서 필드 변형 보강 필요 (plan §6 오픈 이슈 유지)
```

### 검증 실측 기록
- D-1~D-3 유닛 8/8: GPX 속성 역순·time 누락 skip / 신형(offset분·visit·geo:lat,lng 순서)·구형(E7·timestampMs) / 0점 throw /
  timesync 한계(±30분)·범위 밖 무시·거리 재계산·tripId 결정성 / buildPath 병합·1+1점 생성·500점 다운샘플 시작끝 보존
- D-4 E2E(Maestro): 목록 헤더 → import 화면 → [DEV] 샘플 import → "sample-timeline.json: 포인트 10개 → 여행 3개로 재구성" +
  파일 목록(gpx 9점·timeline 9점) 스크린샷 확인
- D-5 멱등: 같은 샘플 재import → 포인트 수 불변 (화면 실측)
- D-6 업로드 통합: 보강된 여행 업로드 → 서버 trips.path **22포인트** (import 전 기준 GPS 사진 1장 → path NULL이었을 데이터),
  media source exif 1·timesync 3 (none→timesync 보강 실증). ※distance 375km는 부산 샘플×타지역 사진 EXIF 혼합 픽스처 특성
- D-7: index 4b Impl(A) 표기
