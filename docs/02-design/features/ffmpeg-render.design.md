# Design: FFmpeg 숏폼 합성 (ffmpeg-render)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/ffmpeg-render.plan.md`

## 0. 핵심 설계 결정

### 0-1. 세그먼트별 클립 → concat → BGM 먹싱 (3단계)
- 단일 filter_complex 초대형 그래프 대신 **컷/슬롯별 개별 mp4 생성 후 concat demuxer** — 디버깅 가능, 세그먼트 진행률 자연 산출, 실패 지점 명확
- 모든 클립 동일 규격(1080x1920, 30fps, h264 yuv420p)으로 생성 → concat copy 안전

### 0-2. 소재 리졸버 = 로컬 스토리지 규약
- `resolve_media_path(storage_key) = MEDIA_STORAGE_ROOT/storage_key` — S3 도입 시 이 함수만 교체
- 산출도 동일 루트: `renders/{short_form_id}.mp4`, `renders/{short_form_id}.jpg` → video_key/thumbnail_key는 상대경로

### 0-3. 슬롯별 FFmpeg 레시피
- **intro** (자리 표시자 — 기능 12 교체 지점): `color=c=0x1a1a1e` + drawtext(타이틀, 중앙)
- **cuts**: `zoompan`(1.0→1.12 줌인, 컷 길이만큼) + scale/crop 9:16 중앙 — Ken Burns
- **outro**: 단색 + drawtext 3줄(거리/시간/사진)
- **오디오**: concat 결과에 BGM `-t 30 afade=out` 먹싱, 없으면 `anullsrc`
- 텍스트는 textfile= 로 전달 (이스케이프 사고 방지), 폰트는 `RENDER_FONT_PATH`

### 0-4. 명령 조립은 순수 함수로 분리
- `commands.py`: EDL 세그먼트 → ffmpeg argv 리스트 (유닛 테스트 — 실행 없이 인자 검증)
- `tasks.py`: subprocess 실행·진행률·DB 기록

## 1. 데이터 모델
변경 없음 (video_key/thumbnail_key/duration_s/status 활용).

## 2. 구조 (services/ai-pipeline)
```
renderer/
├── __init__.py
├── commands.py   # 순수: intro/cut/outro/concat/mux argv 조립 + 해상도·fps 상수
├── db.py         # fetch_edl_context / save_render_result / mark_failed (단일 연결)
└── tasks.py      # renderer.render_short_form — 임시 작업 디렉토리, stderr 요약
worker.py         # include 추가
```
- env: `MEDIA_STORAGE_ROOT`(ai-pipeline .env + .env.example), `RENDER_FONT_PATH`(기본 AppleSDGothicNeo)

## 3. UI 구조
해당 없음 (웹 뷰어의 video_key 소비는 배포/스트리밍 기능에서)

## 4. 검증 기준 (Evaluator)
- [ ] D-1: compileall + commands 유닛 (컷 argv에 zoompan·타이밍 반영, 원본 누락 시 예외)
- [ ] D-2: **풀체인** — 시드(이미지 파일+storage_key) → spatial→director→renderer →
  ffprobe: duration 30±0.5s, 1080x1920, h264+aac 스트림, status=done + video_key/duration_s
- [ ] D-3: 프레임 추출(1s/10s/27s) 육안 확인 — 타이틀/사진 Ken Burns/통계
- [ ] D-4: 원본 storage_key 누락 컷 → failed("원본 누락"), FFmpeg 오류 시 stderr 요약 기록
- [ ] D-5: 재실행 — 산출물 덮어쓰기·status done 유지
- [ ] D-6: 문서 동기화 (index, db-schema 스토리지 규약)

## 5. 비범위 재확인
지도 애니메이션(12)·HUD·HLS·S3 — 제외.
