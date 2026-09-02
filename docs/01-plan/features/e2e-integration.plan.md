# E2E 통합 — 업로드→생성→재생 (e2e-integration)

> Status: Approved (2026-09-02 — 진행 지시)
> 작성일: 2026-09-02

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 조각은 모두 있으나 이어져 있지 않다
- 파이프라인 태스크(vision/spatial/director/renderer)는 **수동 스크립트**(`scripts/queue-task.ts`)로만 발행 — 생성 요청 API 없음
- `media.storage_key`가 항상 NULL — trip 업로드는 메타만 전송(설계 주석 "원본 파일은 별도 기능"), 렌더러는 storage_key 없으면 "원본 누락" 실패
- 웹 뷰어는 status만 표시, 재생은 자리 표시자("영상 플레이어 준비 중") — 영상 파일 서빙 경로 없음
- 모바일은 여행 업로드까지만 — 숏폼 요청/진행/완료 UI 없음
- short_forms 행 생성 경로 없음(검증 시드로만 존재), share_slug 발급 규칙 없음

### 1.2 재사용 인프라
- QueueService(CeleryProducer·progress Redis), status 전이(analyzing→rendering→done/failed)와 by-slug 공개 조회, 진행률 키 규약

## 2. 사용자 요구 (원문 요약)
기획 §5 마일스톤 5: "E2E 통합 — 업로드→생성→재생, Push 알림 포함". 렌더링 완료 알림(§2 [5] 배포 단계).

## 3. 범위 / 비범위

### 범위 (In scope)
1. **미디어 원본 업로드**: 여행 업로드 응답에 mediaIds 추가 → `PUT /v1/media/:id/file`(multipart) → `MEDIA_STORAGE_ROOT/media/{id}.{ext}` 저장 + storage_key 기록. 모바일 업로드 플로우에 파일 전송 통합
2. **생성 요청 API**: `POST /v1/trips/:tripId/short-form` — short_forms 행 생성(share_slug 발급) + `pipeline.generate_short_form` 큐잉. **멱등**: 기존 행 있으면 재사용(진행 중=그대로, failed=재큐잉)
3. **파이프라인 오케스트레이터**(Python): vision 미채점 미디어 스코어링 → spatial.extract_pois → director.generate_edl → renderer.render_short_form 순차 실행(태스크 로컬 apply), 단계별 진행률 기록
4. **상태 조회**: `GET /v1/short-forms/:id`(소유자) — status·shareUrl·videoUrl
5. **영상 서빙**: `GET /files/renders/:name` 공개 스트리밍(renders만 — media 원본 비공개) + 공개 뷰어 응답에 절대 videoUrl/thumbnailUrl
6. **웹 재생**: done이면 `<video>` 재생 (9:16 플레이어)
7. **모바일**: 여행 상세 "숏폼 만들기" → 진행 폴링 훅 → 완료 시 **로컬 알림**(expo-notifications) + 공유 링크 열기

### 비범위 (Out of scope)
- **원격 Push**(Expo Push/EAS·실기기 토큰) — 기능 15 release-deploy에서 (시뮬레이터 검증 불가). 이번엔 앱 폴링+로컬 알림
- HLS 스트리밍(§72) — MP4 직행, HLS는 배포 시
- BGM 선택 UI — 기본 BGM env(`DEFAULT_BGM_PATH`) 있으면 사용, 없으면 무음
- 업로드 재개/병렬화·이미지 리사이즈

## 4. 요구사항 상세
- share_slug: URL-safe 랜덤(중복 시 재시도), 공개 조회 유일 키 — 추측 불가
- 파일 업로드: jpeg/png만, 20MB 상한, 소유자 검증, 재업로드는 덮어쓰기(멱등)
- 오케스트레이터: 단계 실패 시 short_forms.failed + error_message (기존 단계별 규약 유지), vision 실패는 개별 미디어 격리(기존 score_media 규약)
- 웹 videoUrl: 서버 `PUBLIC_API_BASE_URL` env로 절대 URL 조립 (SSR·브라우저 양쪽 접근 가능해야 함)

## 5. 방어적 AC
- storage_key 없는 미디어가 남은 상태로 생성 요청 → 렌더 단계에서 failed + 사유 노출 (조용한 스킵 금지)
- 파일 업로드: 타인 미디어 → 404, 비이미지/초과 크기 → 400
- 생성 요청 멱등: 진행 중 재요청이 중복 잡을 만들지 않음
- 웹 뷰어: videoUrl 접근 불가 시에도 페이지는 렌더 (플레이어만 실패)
- files 서빙: 경로 조작(../) 차단 — 화이트리스트 파일명 패턴

## 6. 오픈 이슈 / 결정 대기
- 원격 Push·HLS·S3 전환은 기능 15에서 일괄 (로컬 스토리지 규약 유지)
- 대용량 갤러리 업로드 UX(진행률·재시도)는 사용 데이터 후 개선
