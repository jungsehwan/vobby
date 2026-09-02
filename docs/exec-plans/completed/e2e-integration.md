# Exec Plan: e2e-integration

## 개요
- **기능**: 업로드→생성→재생 E2E — 파일 업로드·생성 요청 API·오케스트레이터·서빙·재생·모바일 요청/폴링/알림
- **Plan/Design**: `docs/01-plan|02-design/features/e2e-integration.*`
- **시작일**: 2026-09-02

## 체크리스트
- [x] shared-types: TripUploadResponse·ShortFormSummary·PublicView URL 필드
- [x] main-api: trip 업로드 mediaIds 응답 + media 파일 업로드(멀티파트) + files 서빙
- [x] main-api: short-form 생성 요청(멱등·slug)·상태 조회 + 큐 발행
- [x] ai-pipeline: pipeline.generate_short_form 오케스트레이터 (+worker include)
- [x] web: 뷰어 video 재생
- [x] mobile: short-form.service·use-short-form 훅·trip 상세 UI + expo-notifications
- [x] D-1~D-7 검증 (API 실호출·풀체인·웹·시뮬레이터)
- [x] 그레이딩 + 문서 동기화 (D-8)

## 기술 노트 (구현 중 수정 3건 — 사유가 재발 방지 지식)
- **Celery**: 태스크 내부에서 EagerResult `.get()` 금지 가드에 걸림 → `apply(throw=True).result`로 읽는다 (orchestrator)
- **Expo fetch는 RN식 FormData 파일 파트 미지원** ("Unsupported FormDataPart implementation") →
  expo-file-system `File`(Blob 구현체)을 append. MIME은 확장자에서 유도
- **concat -c copy 산출물은 브라우저 재생 보장 안 됨** → 최종 먹싱에서 재인코딩 + `-movflags +faststart` (renderer/commands)
- 검증 환경 특이: 이 호스트의 Chrome(claude-in-chrome)은 H.264 자체를 재생 못 함(공개 샘플 mp4도 동일) —
  재생 육안 검증은 **시뮬레이터 Safari**(WebKit)로 수행
- 포그라운드 로컬 알림은 `setNotificationHandler` 필수 (없으면 배너 미표시)
- main-api에 MEDIA_STORAGE_ROOT env 신규 필요 (.env) — 없으면 파일 업로드 500

## 완료 보고 — 2026-09-02

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100
빌드: 성공 (root typecheck 0 + compileall)
갭: 없음 — D-1~D-8 통과. 원격 Push·HLS·S3는 계획된 비범위(기능 15)
지적: 기술부채 3건 등록 — HEIC 미지원, EDL 빈 슬롯 길이 불일치, 업로드 순차/무진행률
```

### 검증 실측 기록
- D-1 파일 업로드: 4건 204 + storage_key + 디스크 실존, 재업로드 204(멱등), 부재 uuid 404, text/plain 400
- D-2 풀체인(HTTP): 생성 요청 → scoring(4장 CLIP)→pois→edl→render 18초 완주, status done + videoUrl/thumbnailUrl
- D-3 멱등: done 상태 재요청 → 같은 id 즉시 반환(재큐잉 없음), failed 재요청 → 재큐잉 후 done
- D-4 방어: 원본 없는 여행 → failed + "원본 누락: media …(storage_key 없음)" 표면화
- D-5 서빙: mp4 200(1.3MB)·Range 206·경로조작(..%2F) 404·media 키 패턴 404
- D-6 웹 재생: SSR `<video>`+절대 URL, 시뮬레이터 Safari에서 재생 세션(오디오 아이콘·풀 컨트롤·시킹) 확인,
  ffmpeg 프레임 추출로 지도 인트로(t=1.5s)·통계 outro 콘텐츠 검증. 호스트 Chrome은 H.264 미지원 환경이라 제외
- D-7 모바일 E2E(Maestro): 서버에 올리기(메타+파일 4장) → 숏폼 만들기 → 폴링 → "숏폼 완성 ✓"+"완성된 영상 보기 →" +
  **포그라운드 알림 배너 실측**("여행 영상이 완성됐어요 🎬"). 알림 권한 다이얼로그 → 허용 플로우 포함
- D-8: api-endpoints(미디어/숏폼/파일 서빙 추가)·index 14 Impl(A)·.env.example(PUBLIC_API_BASE_URL·DEFAULT_BGM_PATH)·기술부채 3건
