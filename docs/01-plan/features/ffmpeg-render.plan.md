# FFmpeg 숏폼 합성 파이프라인 (ffmpeg-render)

> Status: Approved (2026-09-01 — 권장안 1 진행 지시: 기능 12보다 선행)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- EDL v1이 short_forms.edl에 생성됨(status=rendering 대기) — 소비자 없음
- **원본 이미지가 서버에 없음**: media.storage_key 전부 NULL (S3 미구현) — 렌더 소재 해석 규약 필요
- FFmpeg 9.0.1 로컬 설치됨 (환경 구성 시)

### 1.2 재사용 가능한 기존 인프라
- EDL v1 계약(컷 mediaId·타이밍·effect), BGM uri, 파이프라인 태스크·DB 패턴, click120.wav·테스트 이미지

## 2. 사용자 요구 (원문 요약)
기획 Phase 4: "9:16 스마트 크롭, Ken-Burns(줌인/패닝), BGM 오디오 믹싱을 단일 파이프라인으로 처리". 마일스톤 4 기능 13.

## 3. 범위 / 비범위

### 범위 (In scope)
- **로컬 스토리지 규약** 신설: `MEDIA_STORAGE_ROOT` env — storage_key는 루트 기준 상대경로 (S3 도입 시 리졸버만 교체)
- Celery 태스크 `renderer.render_short_form(short_form_id)`: EDL → 1080x1920 30fps mp4(h264+aac)
  - Intro: 단색+타이틀 drawtext (**지도 조감은 기능 12에서 교체** — 자리 표시자)
  - Body/Highlight 컷: 9:16 중앙 크롭 + Ken Burns(zoompan), EDL 타이밍 준수
  - Outro: 통계 텍스트
  - BGM: 30s 트림 + 페이드아웃 먹싱 (EDL.bgm 없으면 무음)
- 산출: `renders/{id}.mp4` + 썸네일 jpg → video_key/thumbnail_key/duration_s 기록, status **rendering→done**
- ffprobe 실측(길이·해상도·오디오) + 프레임 추출 육안 확인

### 비범위 (Out of scope)
- 지도 궤적 애니메이션(기능 12), 속도/고도 HUD(연속 궤적 데이터 필요 — 4b 이후), HLS 스트리밍
- S3 업로드·서명 URL (로컬 규약으로 대체, 교체 지점 명시)

## 4. 요구사항 상세
- EDL 세그먼트 타이밍(비트 스냅 결과)을 프레임 단위로 준수
- 한글 텍스트 렌더 — 폰트 경로 env(`RENDER_FONT_PATH`, 기본 macOS AppleSDGothicNeo)
- 진행률: 세그먼트 단위 갱신

## 5. 방어적 AC
- 컷의 원본(storage_key) 누락: failed("원본 누락: mediaId") — 컷 무단 스킵 금지
- status가 rendering이 아닌 숏폼도 렌더 허용(재렌더) — 완료 시 done으로
- FFmpeg 실패: stderr 요약을 error_message로
- 재실행: 동일 산출물 덮어쓰기 (파일명 고정)

## 6. 오픈 이슈 / 결정 대기
- Intro 지도 교체(기능 12), HLS·해상도 프로파일(배포 시), 렌더 시간 최적화
