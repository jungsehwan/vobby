# Design: 웹 공유 뷰어 기본 구조 (web-viewer-base)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/web-viewer-base.plan.md`

## 0. 핵심 설계 결정

### 0-1. 뷰어 데이터는 서버사이드 fetch (RSC)
- `/v/[slug]`는 React Server Component에서 main-api 호출 — OG 크롤러 대응(SSR 필수) + API 주소 비노출
- `generateMetadata`가 같은 조회를 사용 (Next fetch 캐시로 중복 호출 제거, `no-store` 아님 — 60s revalidate)

### 0-2. 공개 조회 응답 = 와이어 계약 (shared-types `ShortFormPublicView`)
- **2026-09-01 갱신**: backend-trip-model 재구성으로 stats가 Trip 기준으로 확정 —
  `{ distanceM: number | null; durationS: number; mediaCount: number }` (구현·검증 완료, `b04741f`)

### 0-3. Next.js 구성 = App Router + CSS 변수로 ui-tokens 소비
- Tailwind 미사용 — 토큰 체계 이중화 방지. `tokens.css`를 빌드타임 생성 대신 **런타임 import한 값으로 인라인 스타일/CSS 변수 주입** (globals.css에서 :root 변수 정의는 layout에서 생성)
- 간단화: layout.tsx에서 `<style>`로 :root 변수 출력 (ui-tokens 값 → `--color-primary` 등)

## 1. 데이터 모델
RDB 변경 없음. shared-types에 ShortFormPublicView 추가.

## 2. 구조

### 2.1 main-api — short-form 도메인 모듈 신설
```
src/domain/short-form/
├── short-form.module.ts / short-form.service.ts / short-form.controller.ts
```
- `GET /v1/short-forms/by-slug/:slug` — done이 아니어도 조회 가능(상태 노출), 미존재 404 `{code:'SHORTFORM_NOT_FOUND'}`
- 서비스: shareSlug로 조회 + trajectory 조인(통계) → ShortFormPublicView 매핑

### 2.2 apps/web (Next.js App Router)
```
src/app/layout.tsx        # ui-tokens → CSS 변수 주입
src/app/page.tsx          # 랜딩 (서비스 소개 1화면)
src/app/v/[slug]/page.tsx # 뷰어 — generateMetadata(OG) + RSC fetch
src/lib/api.ts            # fetchShortForm(slug): API_BASE_URL 서버 fetch, 404/오류 구분
```
- env: `API_BASE_URL` (서버 전용 — NEXT_PUBLIC 아님), .env.example 갱신
- 상태별 UI: done=영상 자리+통계 / requested·analyzing·rendering=진행 안내 / failed=실패 안내

## 3. UI 구조
- 뷰어: 타이틀, 활동 통계 3종(거리 km·시간·고도), 상태 영역, "Vobby로 만들기" 랜딩 링크
- 404: notFound() → 전용 not-found.tsx

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 루트 typecheck + build (web 포함)
- [ ] D-2: **실호출** — 시드 숏폼(user/trajectory/short_form SQL) 후 API `by-slug` 200 + 필드 검증, 미존재 404 코드
- [ ] D-3: 웹 `/v/:slug` SSR 렌더 — 통계 텍스트 + **OG 메타 태그**(og:title/description) curl로 확인
- [ ] D-4: 미존재 slug → 404 상태코드, API 다운 → 오류 페이지(500 아님 명확 안내)
- [ ] D-5: 랜딩 렌더 + ui-tokens 색 반영
- [ ] D-6: 문서 동기화 — api-endpoints.md 신설(auth 포함), index 갱신

## 5. 비범위 재확인
영상 재생·동선 맵·admin·배포 — 제외.
