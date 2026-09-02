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
| 2 | Main API 골격 + 인증(OAuth2/JWT) (`api-auth-foundation`) | Plan | Design | Impl | Google·Kakao 재검증 + refresh 회전. 2026-09-01 완료 (A등급). 실토큰 E2E는 콘솔 앱 등록 후 |
| 3 | Redis 작업 큐 + Celery 워커 골격 (`queue-worker-foundation`) | Plan | Design | Impl | Node 직접 발행(프로토콜 v2) + 진행률 키 규약. 2026-09-01 완료 (A등급) — **마일스톤 1 종료** |
| 1a | 백엔드 재구성 — Trip 도메인 (`backend-trip-model`) | Plan | Design | Impl | 방향 정정 반영: Trajectory→Trip(path nullable), media.source, 마이그레이션 스쿼시(배포 전 1회). by-slug 공개 조회 포함. 2026-09-01 (A등급) |

### 마일스톤 2 — 클라이언트 & 미디어 인제스트

> **⚠️ 2026-09-01 방향 정정**: 핵심은 직접 기록이 아니라 기존 위치 이력 소싱 — 기능 4 폐기, 4a·4b로 재편.

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 4 | ~~모바일 백그라운드 GPS 로깅~~ (`mobile-gps-logging`) | ⛔ | ⛔ | ⛔ | **폐기** — 방향 정정(기록→소싱). Expo 앱 골격·검증 체계는 4a가 승계 |
| 4a | 여행 타임라인 — 갤러리 EXIF 역구성 (`trip-timeline`) | Plan | Design | Impl | **신규 핵심** — 8h 간격/3장 클러스터링, 여행 목록·타임라인 화면, 기록 코드 폐기 완료. 2026-09-01 (A등급) |
| 4b | 외부 위치 이력 import (`location-import`) | Plan | Design | Impl | 구글 타임라인(신형 semanticSegments·구형 Takeout)·GPX 파서 + timesync 확대·dense path(≤500점) 업로드, 파일 단위 교체 멱등. 2026-09-01 (A등급) — **마일스톤 2 잔여분 종료** |
| 5 | 갤러리 EXIF 추출 + Time-Sync 매칭 (`media-exif-timesync`) | Plan | Design | Impl | ⚠️ 부분 무효 — 세션 전제 폐기, EXIF·매칭 로직은 **4a로 승계 완료** (코드는 trips 기능으로 대체됨). 2026-09-01 (A등급) |
| 6 | 웹 공유 뷰어 기본 구조 (`web-viewer-base`) | Plan | Design | Impl | Next.js `/v/:slug` SSR + OG 동적 메타, 상태별 표시, ui-tokens 웹 소비. 2026-09-01 (A등급) — **마일스톤 2 종료** |
| 4c | 여행 업로드 — 모바일→서버 (`trip-upload`) | Plan | Design | Impl | (user,clientKey) 멱등 upsert + 모바일 업로드 버튼·auth-store 골격. E2E 실증. 2026-09-01 (A등급). 실로그인 UI는 콘솔 등록 후 |
| 7 | 공통 패키지 구성 (`shared-packages`) | Plan | Design | Impl | @vobby/shared-types(와이어 계약)·ui-tokens(토큰 2층). main-api 소비 전환 완료. 2026-09-01 (A등급) |

### 마일스톤 3 — 멀티모달 AI 분석 엔진

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 8 | Vision AI 미디어 스코어링 (`vision-scoring`) | Plan | Design | Impl | CLIP 제로샷(심미·카테고리)+Laplacian 블러, media.vision_score 기록, 실패 격리. 2026-09-01 (A등급) |
| 9 | 궤적 클러스터링·POI 추출 (`spatial-poi`) | Plan | Design | Impl | 사진 좌표 시공간 클러스터링(start/spot/end)→trips.pois. 2026-09-01 (A등급) |
| 10 | BGM 비트/온셋 감지 (`audio-beat`) | Plan | Design | Impl | librosa BPM·비트·온셋 + RMS 클라이맥스(EDL 입력 계약 확정). 2026-09-01 (A등급) — **마일스톤 3 종료** |

### 마일스톤 4 — 시나리오 디렉팅 & 렌더러

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 11 | 스토리 엔진 — EDL 타임라인 생성 (`director-edl`) | Plan | Design | Impl | vision·POI·BGM 결합 → EDL v1(4슬롯·비트 스냅), status 전이 analyzing→rendering. 2026-09-01 (A등급) |
| 12 | 지도 궤적 애니메이션 렌더링 (`map-animation`) | Plan | Design | Impl | OSM 타일(토큰 불필요, 소스 추상화)+궤적 점진 드로잉 90프레임 intro, path NULL 폴백. 2026-09-01 (A등급) — **마일스톤 4 종료**. Mapbox 스타일은 토큰 확보 후 |
| 13 | FFmpeg 숏폼 합성 파이프라인 (`ffmpeg-render`) | Plan | Design | Impl | EDL→30s 9:16 mp4(Ken Burns·BGM 먹싱), 로컬 스토리지 규약. 2026-09-01 (A등급) |

### 마일스톤 5 — E2E 통합 & 배포

| # | 기능명 (slug) | Plan | Design | Impl | 비고 |
|---|--------|------|--------|------|------|
| 14 | E2E 통합 — 업로드→생성→재생 (`e2e-integration`) | Plan | Design | Impl | 미디어 원본 업로드·생성 요청 API(멱등)·파이프라인 오케스트레이터·renders 공개 서빙·웹 video 재생·모바일 요청/폴링/로컬 알림. 원격 Push·HLS는 15로. 2026-09-02 (A등급) |
| 15 | 스토어 제출 & 웹 배포 (`release-deploy`) | - | - | - | EAS Build, Vercel/AWS, CI/CD |
