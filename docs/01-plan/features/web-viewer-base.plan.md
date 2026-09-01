# 웹 공유 뷰어 기본 구조 (web-viewer-base)

> Status: Approved (2026-09-01 — push 후 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- `apps/web`은 .gitkeep만 존재
- `short_forms` 테이블에 `share_slug`(UNIQUE)·상태·통계 원천(trajectory FK) 준비됨 — 그러나 **조회 API 없음** (main-api엔 auth 엔드포인트만)

### 1.2 재사용 가능한 기존 인프라
- `@vobby/shared-types` (ShortFormStatus, ApiErrorBody), `@vobby/ui-tokens` (웹 첫 소비)
- main-api 도메인 모듈 패턴 (auth와 동일 구조)

### 1.3 관련 데이터/모델 현황
- 실제 숏폼 데이터 없음 — 검증은 SQL 시드로

## 2. 사용자 요구 (원문 요약)
기획 §1: "숏폼마다 고유 URL(domain.com/v/:id) — 앱 없는 사용자도 웹에서 감상", "Next.js SSR로 SNS 공유 시 썸네일·이동 통계 리치 미리보기". 마일스톤 2 기능 6.

## 3. 범위 / 비범위

### 범위 (In scope)
- main-api: 숏폼 **공개 조회** `GET /v1/short-forms/by-slug/:slug` (short-form 도메인 모듈 신설 — 뷰어의 최소 의존)
- Next.js 앱 생성 (`apps/web`, App Router) + 워크스페이스 편입
- `/v/[slug]` SSR 페이지: 제목·활동 통계(거리/시간)·상태별 표시(완료=영상 자리, 처리중/실패 안내), 미존재 404
- **OpenGraph 동적 메타** (og:title/description에 통계 포함)
- 랜딩(`/`) 최소 페이지, ui-tokens 웹 소비(CSS 변수 변환)
- `docs/references/api-endpoints.md` 신설 (README 체크리스트 이행 — auth 포함 전 엔드포인트)

### 비범위 (Out of scope)
- 실제 영상 재생(video_key 산출은 마일스톤 4) — 자리 표시자까지
- 인터랙티브 동선 맵, admin 웹, 배포(Vercel)
- 숏폼 생성/목록 API (조회 1개만)

## 4. 요구사항 상세
- 뷰어는 로그인 없이 접근 (공개 URL) — done 상태만 통계 노출, 그 외 상태는 진행 안내
- 웹→API는 서버사이드 fetch (`API_BASE_URL` env), 클라이언트에 API 주소 비노출

## 5. 방어적 AC
- 미존재 slug: 404 페이지 (500 금지)
- API 다운: 명확한 오류 페이지 (조용한 빈 화면 금지)
- OG 크롤러(JS 미실행)에도 메타 제공 — SSR 필수 경로

## 6. 오픈 이슈 / 결정 대기
- 도메인·배포 환경 (마일스톤 5), 동선 맵 임베드 방식 (마일스톤 4 렌더러와 함께)
