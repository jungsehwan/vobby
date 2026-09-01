# Product Specs Index

기능별 Plan/Design/Implementation 상태를 추적한다. **이 인덱스가 기능 현황의 진실 소스다** — plan/design 문서를 참조하기 전에 반드시 여기서 현재 상태를 먼저 확인한다.

## 상태 범례
- **Plan**: Plan 문서 작성 완료
- **Design**: Design 문서 작성 완료
- **Impl**: 구현 완료
- **-**: 미작성/미구현
- **⛔**: 제외/취소 (해당 문서 최상단에도 배너 필수)

## 기능 상태 추적

> 기획 원본: `docs/00-pm/project-charter-v2.0.md` §5 마일스톤을 기능 단위로 분해 (2026-08-31).
> MVP 순서 = 마일스톤 순서. slug는 plan/design/exec-plan 파일명으로 사용.

### 마일스톤 1 — 기반 인프라 & 공간 데이터베이스

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 1 | DB 스키마 설계 — User/Trajectory/Media/ShortForm (`db-schema-foundation`) | Plan | Design | Impl | TypeORM+uuidv7+LineStringZM. 2026-09-01 완료 (A등급) |
| 2 | Main API 골격 + 인증(OAuth2/JWT) (`api-auth-foundation`) | - | - | - | NestJS 부트스트랩 포함 |
| 3 | Redis 작업 큐 + Celery 워커 골격 (`queue-worker-foundation`) | - | - | - | API→큐→워커 왕복 검증까지 |

### 마일스톤 2 — 클라이언트 & 미디어 인제스트

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 4 | 모바일 백그라운드 GPS 로깅 (`mobile-gps-logging`) | - | - | - | Expo, iOS/Android 권한 사유 포함 |
| 5 | 갤러리 EXIF 추출 + Time-Sync 매칭 (`media-exif-timesync`) | - | - | - | 온디바이스 블러/중복 필터 포함 |
| 6 | 웹 공유 뷰어 기본 구조 (`web-viewer-base`) | - | - | - | `/v/:id`, OpenGraph |
| 7 | 공통 패키지 구성 (`shared-packages`) | - | - | - | shared-types, ui-tokens |

### 마일스톤 3 — 멀티모달 AI 분석 엔진

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 8 | Vision AI 미디어 스코어링 (`vision-scoring`) | - | - | - | CLIP/VLM |
| 9 | 궤적 클러스터링·POI 추출 (`spatial-poi`) | - | - | - | PostGIS |
| 10 | BGM 비트/온셋 감지 (`audio-beat`) | - | - | - | BPM, Drop 구간 |

### 마일스톤 4 — 시나리오 디렉팅 & 렌더러

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 11 | 스토리 엔진 — EDL 타임라인 생성 (`director-edl`) | - | - | - | Intro/Body/Highlight/Outro |
| 12 | 지도 궤적 애니메이션 렌더링 (`map-animation`) | - | - | - | Mapbox/Headless Chromium |
| 13 | FFmpeg 숏폼 합성 파이프라인 (`ffmpeg-render`) | - | - | - | 9:16, Ken-Burns, HUD, 믹싱 |

### 마일스톤 5 — E2E 통합 & 배포

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 14 | E2E 통합 — 업로드→생성→재생 (`e2e-integration`) | - | - | - | Push 알림 포함 |
| 15 | 스토어 제출 & 웹 배포 (`release-deploy`) | - | - | - | EAS Build, Vercel/AWS, CI/CD |
