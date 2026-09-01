# 공통 패키지 구성 — shared-types / ui-tokens (shared-packages)

> Status: Approved (2026-09-01 — 기능 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- `packages/shared-types`, `packages/ui-tokens`는 .gitkeep만 존재
- 공유 대상 타입이 main-api에 산재: `src/domain/geo.types.ts`(GeoJSON 규약), `user.entity.ts`의 AuthProvider, `short-form.entity.ts`의 ShortFormStatus, `queue.service.ts`의 TaskProgress — 모바일·웹이 곧 소비할 계약들
- DESIGN.md §1 "공유 타입은 반드시 packages/shared-types에" 규칙은 있으나 실체 없음

### 1.2 재사용 가능한 기존 인프라
- npm workspaces (루트 package.json) — `packages/*` 이미 포함
- 루트 `typecheck`/`build` 스크립트가 워크스페이스 순회

### 1.3 관련 데이터/모델 현황
- API 응답 계약: LoginResult(auth.service), 에러 형태 `{code, message}`(exceptions), 진행률 `{status, detail, updatedAt}`(Redis 규약)

## 2. 사용자 요구 (원문 요약)
기획서 §1: "packages/shared-types, packages/ui-tokens를 공용 모듈화하여 모바일·웹 간 비즈니스 로직 및 스타일 일관성 유지" — 마일스톤 2 기능 7.

## 3. 범위 / 비범위

### 범위 (In scope)
- `@vobby/shared-types`: **현재 실재하는 계약만** 이전 — geo(GeoJSON ZM 규약), auth(provider/공개 유저/로그인 응답), pipeline(진행률/숏폼 상태), api(에러 바디)
- `@vobby/ui-tokens`: 중립 기본 팔레트 + 시맨틱 색/간격/radius/타이포 스케일 (브랜드 확정 전 골격)
- main-api의 중복 타입을 shared-types 소비로 교체 (소비자 1호 = 실검증)
- 워크스페이스 빌드 순서 조정 (packages 먼저)

### 비범위 (Out of scope)
- 미래 추측 타입 선정의 (Trajectory 업로드 DTO 등 — 해당 기능에서 추가)
- 앱/웹의 토큰 소비 코드 (Expo/Next 앱 생성 시)
- 공용 유틸 함수 패키지 (필요 시 별도)

## 4. 요구사항 상세
- 패키지는 tsc로 dist 빌드 (Nest tsc가 node_modules TS 소스를 컴파일하지 않으므로)
- ui-tokens는 플랫폼 중립 원시값 (RN StyleSheet·웹 CSS 양쪽 소비 가능)

## 5. 방어적 AC
- shared 타입 변경 시 소비자(main-api) typecheck가 깨져서 감지되는 구조
- 빌드 순서: packages → services (역순이면 루트 빌드 실패해야 정상 — 조용한 성공 금지)

## 6. 오픈 이슈 / 결정 대기
- 브랜드 팔레트 — 디자인 확정 시 ui-tokens 값 교체 (구조는 유지)
