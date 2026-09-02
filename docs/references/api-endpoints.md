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

## 여행 (trip-upload)

| 메서드/경로 | 인증 | 요청/응답 | 주요 에러 |
|---|---|---|---|
| POST `/v1/trips` | Bearer JWT | `TripUploadRequest` → `TripUploadResponse` (= TripSummary + **mediaIds** — 요청 media 순서, 파일 업로드 키). **(user, clientKey) 멱등 upsert** — 재업로드 시 여행 갱신 + 미디어 전량 교체(id 재발급 — 파일도 재업로드). path는 LineStringZM | 400 `TRIP_INVALID_PATH`, 401 |
| GET `/v1/trips` | Bearer JWT | `TripSummary[]` (started_at DESC) | 401 |

## 미디어 원본 (e2e-integration)

| 메서드/경로 | 인증 | 요청/응답 | 주요 에러 |
|---|---|---|---|
| PUT `/v1/media/:id/file` | Bearer JWT | multipart `file` (jpeg/png, ≤20MB) → 204. `MEDIA_STORAGE_ROOT/media/{id}.{ext}` 저장 + storage_key. 재업로드 덮어쓰기 멱등 | 404 `MEDIA_NOT_FOUND`(타인 포함), 400 `MEDIA_UNSUPPORTED_TYPE`/`MEDIA_FILE_REQUIRED` |

## 숏폼 (web-viewer-base · e2e-integration)

| 메서드/경로 | 인증 | 응답 | 주요 에러 |
|---|---|---|---|
| GET `/v1/short-forms/by-slug/:slug` | **없음 (공개)** — 공유 뷰어용 | `ShortFormPublicView` (+videoUrl/thumbnailUrl 절대 URL) | 404 `SHORTFORM_NOT_FOUND` |
| POST `/v1/trips/:tripId/short-form` | Bearer JWT | `ShortFormSummary`. **멱등**: 진행 중/done은 기존 행 반환, failed만 재큐잉. `pipeline.generate_short_form` 발행 | 404 `TRIP_NOT_FOUND` |
| GET `/v1/short-forms/:id` | Bearer JWT (소유자) | `ShortFormSummary` (status 폴링용) | 404 `SHORTFORM_NOT_FOUND` |

## 파일 서빙 (e2e-integration)

| 메서드/경로 | 인증 | 응답 |
|---|---|---|
| GET `/files/renders/:name` | **없음 (공개)** | mp4/jpg 스트림(Range 지원). 파일명 `uuid.(mp4\|jpg)` 화이트리스트 — 그 외/경로조작 404. media/ 원본은 비서빙 |

## 규약
- 공개 경로는 위 명시된 것만 — 신규 엔드포인트는 기본 JWT 가드 대상
- DTO 검증 실패는 400 (전역 ValidationPipe, whitelist)
- 절대 URL(videoUrl 등)은 `PUBLIC_API_BASE_URL` env로 조립
