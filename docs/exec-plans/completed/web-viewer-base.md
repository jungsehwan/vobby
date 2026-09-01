# Exec Plan: web-viewer-base

## 개요
- **기능**: 숏폼 공개 조회 API + Next.js 공유 뷰어(/v/[slug], OG 동적 메타)
- **Plan/Design**: `docs/01-plan|02-design/features/web-viewer-base.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] shared-types에 ShortFormPublicView 추가
- [x] main-api short-form 모듈 (by-slug 공개 조회, 404 코드)
- [x] create-next-app (apps/web) + 워크스페이스 + typecheck 스크립트
- [x] layout(ui-tokens CSS 변수) + 랜딩 + /v/[slug] (generateMetadata + RSC)
- [x] api.ts (API_BASE_URL, 404/오류 구분) + .env.example
- [x] typecheck/build (D-1)
- [x] 시드 데이터 실호출: API 200/404 (D-2), 웹 SSR+OG (D-3), 404/API다운 (D-4), 랜딩 (D-5)
- [x] api-endpoints.md 신설 + index + 그레이딩 (D-6)

## 기술 노트

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 100/100
빌드: 성공 (typecheck 0, next 프로덕션 빌드)
갭: 없음 — D-1~D-6 통과. 중간에 방향 정정(backend-trip-model)으로 stats 계약이 Trip 기준으로 교체됨 (design §0-2 갱신)
지적: 없음
```

### 검증 실측 기록
- D-2: by-slug 200 (Trip 조인 — backend-trip-model에서 선검증) + 404 코드
- D-3: /v/jeju-2026 SSR — 통계(80.8km·여행 시간)·상태 문구 렌더, **OG 메타 확인**:
  og:title "제주 여행 | Vobby", og:description "약 80.8km · 167분 · 사진 3장", og:type video.other
- D-4: 미존재 slug → 404 상태코드(not-found 페이지), main-api 정지 상태 → "일시적으로 불러올 수 없습니다" 오류 문구 (조용한 실패 없음)
- D-5: 랜딩 렌더 + ui-tokens CSS 변수 주입
- 시드 데이터 CASCADE 정리 완료
