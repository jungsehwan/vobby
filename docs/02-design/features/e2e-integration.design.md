# Design: E2E 통합 — 업로드→생성→재생 (e2e-integration)

> Status: Approved (2026-09-02)
> Plan: `docs/01-plan/features/e2e-integration.plan.md`

## 0. 핵심 설계 결정

### 0-1. 오케스트레이션은 Python 단일 태스크 — Node는 발행만
- `pipeline.generate_short_form(short_form_id)` 하나만 큐잉. 내부에서 vision→spatial→director→renderer를
  **로컬 실행**(각 태스크 `.apply()` — 동일 워커 프로세스, 재사용·격리 규약 유지)
- Node가 단계별 폴링·재발행을 하지 않는다(서버가 잡을 붙잡지 않음). 모바일은 DB status만 폴링

### 0-2. 파일 업로드는 media id 기준 — 업로드 응답에 mediaIds
- `TripUploadResponse = TripSummary & { mediaIds: string[] }` (요청 media 배열과 같은 순서)
- 모바일: 여행 업로드 → 순서대로 `PUT /v1/media/:id/file` (multipart 'file') → 서버가
  `media/{id}.{jpg|png}` 저장 + storage_key 갱신. 재업로드 = 덮어쓰기 멱등
- media 전량 교체 upsert 특성상 재업로드 시 id가 바뀜 → 파일도 다시 올린다 (MVP 허용)

### 0-3. 영상 서빙은 renders만 공개
- `GET /files/renders/:name` — 파일명 `^[0-9a-f-]+\.(mp4|jpg)$` 화이트리스트, 그 외 404. media/ 원본 비서빙
- 공개 뷰어·상태 응답에 `videoUrl`/`thumbnailUrl` 절대 URL — `PUBLIC_API_BASE_URL` env로 조립

### 0-4. share_slug = 10자 URL-safe 랜덤 (crypto), 유니크 충돌 시 재시도 3회
### 0-5. 알림은 로컬(expo-notifications) — 폴링이 done 감지 시 1회. 원격 Push는 기능 15

## 1. 데이터 모델
변경 없음 (storage_key·share_slug 기존 컬럼 활용).

## 2. 인터페이스 (shared-types 추가)
```ts
TripUploadResponse = TripSummary & { mediaIds: string[] }
ShortFormSummary { id, tripId, status: ShortFormStatus, shareSlug, videoUrl: string|null, thumbnailUrl: string|null, errorMessage: string|null }
ShortFormPublicView += { videoUrl: string|null, thumbnailUrl: string|null }
```

| 메서드/경로 | 인증 | 동작 |
|---|---|---|
| PUT `/v1/media/:id/file` | JWT | multipart 'file'(jpeg/png, ≤20MB) 저장 + storage_key. 204 |
| POST `/v1/trips/:tripId/short-form` | JWT | 행 생성/재사용 + 큐잉 → `ShortFormSummary` (멱등) |
| GET `/v1/short-forms/:id` | JWT(소유자) | `ShortFormSummary` |
| GET `/files/renders/:name` | 공개 | mp4/jpg 스트림 (화이트리스트) |

## 3. 구조
```
services/main-api/src/domain/media/   # media.module/controller/service — 파일 저장 (storage.ts: MEDIA_STORAGE_ROOT 규약)
services/main-api/src/domain/short-form/  # +request/status (QueueService 발행), slug.ts
services/main-api/src/domain/files/   # 공개 renders 스트림 컨트롤러
services/ai-pipeline/pipeline_tasks.py # generate_short_form 오케스트레이터 (worker include 추가)
apps/web/src/app/v/[slug]/page.tsx    # <video> 재생
apps/mobile/src/features/trips/short-form.service.ts + use-short-form.ts  # 요청·폴링·알림
apps/mobile/src/app/trip/[id].tsx     # 숏폼 만들기 버튼·진행·링크
```
- trip 업로드 서비스: media INSERT에 `RETURNING id` → mediaIds 응답
- 오케스트레이터 진행률: set_progress(자기 task_id, stage: scoring/pois/edl/render)

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 파일 업로드 API — 저장·storage_key·덮어쓰기 멱등 / 타인 404·비이미지 400 (실호출)
- [ ] D-2: 생성 요청 → 오케스트레이터 완주 → status done (모바일 업로드 실사진 기준, 실행)
- [ ] D-3: 멱등 — 진행 중/완료 재요청이 기존 행 반환, failed 재요청은 재큐잉
- [ ] D-4: 원본 누락 시 failed + error_message 노출 (방어 AC)
- [ ] D-5: files 서빙 — mp4 200/range, `../` 등 비정상 404
- [ ] D-6: 웹 뷰어 재생 — 브라우저에서 video 렌더 확인 (스크린샷)
- [ ] D-7: 모바일 E2E — 숏폼 만들기 → 폴링 done → 알림 + 공유 링크 (시뮬레이터)
- [ ] D-8: 문서 동기화 — api-endpoints·index·.env.example(PUBLIC_API_BASE_URL, DEFAULT_BGM_PATH)

## 5. 비범위 재확인
원격 Push·HLS·S3·BGM 선택 UI ✗ (plan §3)
