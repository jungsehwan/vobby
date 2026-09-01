# Design: 공통 패키지 — shared-types / ui-tokens (shared-packages)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/shared-packages.plan.md`

## 0. 핵심 설계 결정

### 0-1. 배포 형태 = tsc dist 빌드 (소스 직배포 아님)
- Nest(tsc)는 node_modules의 TS 소스를 컴파일하지 않음 — dist(js+d.ts)가 세 소비자(Nest/Next/Metro) 공통분모
- `exports` 필드로 ESM 진입점 명시, `type: module`

### 0-2. shared-types 수록 기준 = "두 개 이상 워크스페이스가 소비하는 실재 계약"
- 이번 이전분: geo(좌표 규약), AuthProvider/PublicUser/LoginResponse/TokenPair, ShortFormStatus/TaskProgress, ApiErrorBody
- 엔티티(TypeORM) 자체는 이전하지 않음 — DB 매핑은 main-api 전용, 공유는 **와이어 계약(DTO)만**

### 0-3. 빌드 순서 = workspaces 배열 순서로 보장
- 루트 workspaces를 `["packages/*", "services/main-api", "apps/*"]`로 재배열 (npm은 배열 순서대로 순회)

### 0-4. ui-tokens = 플랫폼 중립 원시값 + 시맨틱 레이어
- 원시 팔레트(gray/brand 스케일) → 시맨틱(text/bg/border/status) 2층 구조 — 브랜드 확정 시 원시값만 교체
- 단위 없는 숫자(spacing/radius/fontSize) — RN은 그대로, 웹은 px 변환 소비

## 1. 데이터 모델
RDB/Redis 변경 없음.

## 2. 구조

### 2.1 @vobby/shared-types
```
src/geo.ts       # GeoPoint, GeoLineStringZM (main-api geo.types.ts 이전 — 좌표 규약 주석 포함)
src/auth.ts      # AuthProvider, PublicUser, TokenPair, LoginResponse
src/pipeline.ts  # ShortFormStatus, TaskProgress (Redis 진행률 계약)
src/api.ts       # ApiErrorBody { code, message }
src/index.ts     # 배럴
```

### 2.2 @vobby/ui-tokens
```
src/index.ts     # palette(원시) / color(시맨틱) / spacing / radius / typography
```

### 2.3 main-api 소비 전환
- `src/domain/geo.types.ts` 삭제 → `@vobby/shared-types` import로 교체 (trajectory/media entity)
- user.entity의 `AuthProvider`, short-form.entity의 `ShortFormStatus` → shared에서 import 후 re-export (기존 import 경로 호환)
- auth.service `LoginResult`·`TokenPair`, queue.service `TaskProgress` → shared 타입 사용
- main-api package.json에 `"@vobby/shared-types": "*"` 의존 추가

## 3. UI 구조
해당 없음 (토큰 소비는 앱/웹 생성 시)

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 두 패키지 tsc 빌드 성공 (dist + d.ts 생성)
- [ ] D-2: main-api typecheck/build 성공 — shared-types 실소비 상태에서
- [ ] D-3: 루트 `npm run build` 순서 검증 — packages가 main-api보다 먼저 빌드
- [ ] D-4: 실행 검증 — main-api 부팅 + 유닛 테스트 통과 (교체가 동작 불변임을 확인)
- [ ] D-5: 문서 동기화 (ARCHITECTURE §2, product-specs)

## 5. 비범위 재확인
미래 DTO 선정의 / 앱·웹 토큰 소비 / 유틸 패키지 — 제외.
