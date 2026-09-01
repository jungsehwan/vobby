# Design: Main API 인증 기반 (api-auth-foundation)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/api-auth-foundation.plan.md`

## 0. 핵심 설계 결정

### 0-1. 인증 플로우 = "클라이언트 획득 토큰의 서버 재검증"
```
[모바일] 네이티브 SDK 로그인 → provider 토큰 획득
   → POST /auth/login { provider, token }
[서버] 검증기로 provider에 재검증 → users upsert → { accessToken(JWT), refreshToken } 응답
```
- 대안(서버 리다이렉트/authorization code)은 웹엔 맞지만 RN에선 커스텀 스킴·브라우저 왕복이 필요해 MVP 마찰 큼. 웹 로그인이 생기면 그때 code 플로우 추가 (비범위)

### 0-2. 토큰 전략
| 토큰 | 형식 | TTL | 저장 |
|------|------|-----|------|
| access | JWT (HS256, `JWT_SECRET`) | 1h (`JWT_ACCESS_TTL`) | 클라이언트만 |
| refresh | 불투명 랜덤 32B hex | 30d (`REFRESH_TTL_DAYS`) | DB에 **sha256 해시만** (평문 저장 금지) |

- refresh **회전(rotation)**: `/auth/refresh` 시 기존 토큰 revoke + 신규 발급. 이미 revoke된 토큰 제시 = 탈취 신호 → 401
- JWT payload: `{ sub: userId }` 최소화

### 0-3. provider 검증기 추상화
```ts
interface ProviderVerifier {
  verify(token: string): Promise<{ providerUid: string; email: string | null; nickname: string; avatarUrl: string | null }>;
}
```
- GoogleVerifier: `google-auth-library`로 idToken 서명·aud(`OAUTH_GOOGLE_CLIENT_ID`) 검증
- KakaoVerifier: accessToken으로 `kapi.kakao.com/v2/user/me` 조회 (5s 타임아웃)
- DI 토큰으로 주입 → 테스트에서 스텁 교체 (실 클라이언트 ID 발급 전 로직 검증 가능)

### 0-4. 검증 실패는 도메인 예외로
- `InvalidProviderTokenException` → 401 `AUTH_INVALID_PROVIDER_TOKEN`
- provider 통신 실패 → 502 `AUTH_PROVIDER_UNAVAILABLE` (사용자 잘못 아님을 구분)

## 1. 데이터 모델

### 1.1 refresh_tokens (신규 마이그레이션)
| 컬럼 | 타입 | 제약 |
|------|------|------|
| id | uuid | PK default uuidv7() |
| user_id | uuid | FK users ON DELETE CASCADE, NOT NULL |
| token_hash | text | NOT NULL, UNIQUE — sha256(hex) |
| expires_at | timestamptz | NOT NULL |
| revoked_at | timestamptz | NULL — 회전/로그아웃 시각 |
| created_at | timestamptz | NOT NULL |

- INDEX (user_id). 유효성 판정: `revoked_at IS NULL AND expires_at > now()`

## 2. 도메인/서비스 구조

```
src/domain/auth/
├── auth.module.ts / auth.controller.ts / auth.service.ts
├── dto/login.dto.ts, refresh.dto.ts        # class-validator
├── verifiers/ provider-verifier.interface.ts, google.verifier.ts, kakao.verifier.ts
├── refresh-token.entity.ts
├── jwt.strategy.ts + jwt-auth.guard.ts     # passport-jwt
└── exceptions.ts
src/domain/user/users.module.ts + users.service.ts   # upsertByProvider
```
- 엔드포인트: POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /me(가드)
- 신규 의존성: @nestjs/jwt, @nestjs/passport, passport, passport-jwt, google-auth-library, class-validator, class-transformer
- env 추가: JWT_ACCESS_TTL, REFRESH_TTL_DAYS (.env.example 갱신, APPLE 키 제거)

## 3. UI 구조
해당 없음 (API 전용)

## 4. 검증 기준 (Evaluator)
- [ ] D-1: typecheck + build 성공
- [ ] D-2: 마이그레이션 적용 → refresh_tokens 존재, 멱등(재실행 no-op)
- [ ] D-3: 유닛 테스트 — 검증기 스텁으로 로그인(신규 가입/재로그인 upsert), refresh 회전, revoke 재사용 거부
- [ ] D-4: **실호출** — 서버 기동 후: 무토큰 GET /me=401, 위조 토큰 login=401, 스텁 불가 경로는 에러 코드 확인
- [ ] D-5: refresh 평문이 DB에 없음 (해시만 저장 확인)
- [ ] D-6: db-schema.md에 refresh_tokens 추가, product-specs 갱신

## 5. 비범위 재확인
Apple / 클라이언트 UI / 콘솔 앱 등록 / RBAC — 제외. 실토큰 E2E는 클라이언트 ID 발급 후 별도 수행.
