# Main API 엔드포인트 참조

> 진실 소스: `services/main-api/src/domain/*/**.controller.ts` — 이 문서는 요약본.
> 엔드포인트 추가·변경 시 이 문서를 함께 갱신한다 (CLAUDE.md §push 시 문서 업데이트 규칙).
> 최종 갱신: 2026-09-01 (web-viewer-base)

기본 URL: 로컬 `http://localhost:4000`. 에러 바디는 `ApiErrorBody { code, message }` (@vobby/shared-types).

## 인증 (api-auth-foundation)

| 메서드/경로 | 인증 | 요청 | 응답 | 주요 에러 |
|---|---|---|---|---|
| POST `/auth/login` | 없음 | `{ provider: 'google'\|'kakao', token }` — Google=idToken, Kakao=accessToken | `LoginResponse` (access JWT + refresh + PublicUser) | 401 `AUTH_INVALID_PROVIDER_TOKEN`, 502 `AUTH_PROVIDER_UNAVAILABLE` |
| POST `/auth/refresh` | refresh 토큰 | `{ refreshToken }` | `TokenPair` — **회전**: 이전 토큰 즉시 무효 | 401 `AUTH_INVALID_REFRESH_TOKEN` (재사용 포함) |
| POST `/auth/logout` | refresh 토큰 | `{ refreshToken }` | 204 (멱등) | — |
| GET `/me` | Bearer JWT | — | `PublicUser` | 401 (무토큰/위조), 401 `AUTH_USER_NOT_FOUND` |

## 숏폼 (web-viewer-base)

| 메서드/경로 | 인증 | 응답 | 주요 에러 |
|---|---|---|---|
| GET `/v1/short-forms/by-slug/:slug` | **없음 (공개)** — 공유 뷰어용 | `ShortFormPublicView` (title·status·videoKey·stats{distanceM?, durationS, mediaCount}) | 404 `SHORTFORM_NOT_FOUND` |

## 규약
- 공개 경로는 위 명시된 것만 — 신규 엔드포인트는 기본 JWT 가드 대상
- DTO 검증 실패는 400 (전역 ValidationPipe, whitelist)
