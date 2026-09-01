# Exec Plan: trip-upload

## 개요
- **기능**: 여행 메타 업로드 (모바일→서버 멱등 upsert)
- **Plan/Design**: `docs/01-plan|02-design/features/trip-upload.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] shared-types: TripUploadRequest/TripMediaUpload/TripSummary
- [x] 마이그레이션 AddTripClientKey (append) + Trip 엔티티 clientKey
- [x] trip.module/controller/service + DTO (중첩 검증)
- [x] 모바일 api-client·auth-store(dev 시드)·trip-upload.service·상세 화면 버튼
- [x] typecheck (D-1)
- [x] 마이그레이션 검증 (D-2), API 실호출 멱등 (D-3), 401/400 (D-4)
- [x] 시뮬레이터 E2E (D-5)
- [x] 문서 동기화 + 그레이딩 (D-6)

## 기술 노트
- dev JWT는 콘솔 앱 등록 전 임시 (EXPO_PUBLIC_DEV_JWT, __DEV__ 전용)

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 100/100
빌드: 성공 (typecheck 0, api·mobile)
갭: 없음 — D-1~D-6 통과. 실로그인은 콘솔 등록 대기(설계된 비범위) — dev JWT로 E2E 대체
지적: 구현 중 수정 2건 — (1) PassportModule.register 누락 DI 실패(2회째 — DESIGN §3 규칙화),
      (2) GeoJSON에는 M 차원이 없어 ST_GeomFromGeoJSON이 epoch를 버림 → WKT(LINESTRING ZM) 전달로 교체
```

### 검증 실측 기록
- D-2: AddTripClientKey append 적용·재실행 no-op
- D-3(API): POST 201 → 재POST 후 trip 1개·media 전량 교체, 서버 ST_Length=8,738m(클라 근사 8,727m 일치), GET 반영
- D-4: 무토큰 401, 불량 body 400
- D-5(E2E): dev JWT 주입 앱에서 부산 여행 업로드 탭 → "서버에 저장됨 ✓" → 서버 trips/media 생성 확인
- 테스트 유저 CASCADE 정리

### 검증 도구 함정 (추가)
- **EXPO_PUBLIC_* env는 Metro 시작 시점에 번들에 인라인** — .env 변경 후 Metro 재시작 필수 (옛 Metro가 살아있으면 버튼/설정이 반영 안 된 번들 서빙)
- **Maestro의 SpringBoard 크래시는 재현성 있음** (iOS 26.5 시뮬, XCTAutomationSession init) — 세션 초기화 시 간헐 발생,
  앱이 홈으로 밀려 탭 실패 가능. SpringBoard 자동 복구 후 재시도하면 성공. 판정은 항상 DB/스크린샷으로
