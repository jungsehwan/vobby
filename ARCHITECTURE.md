# Architecture

> 근거 문서: `docs/00-pm/project-charter-v2.0.md` (취미 궤적 기반 AI 숏폼 자동 생성 플랫폼 개발 기획서 v2.0)
> 이 문서는 4-file bootstrap의 2번 — "현재 사실"만 기술한다. 계획 단계 항목은 상태를 명시한다.

## 0. 프로젝트 개요

**Vobby** — **이미 존재하는 위치 이력**(갤러리 사진 EXIF 1순위, 구글 타임라인·GPX import)과 촬영 미디어를
멀티모달 AI가 융합 분석하여 여행 타임라인과 30초~1분 세로형(9:16) 숏폼 영상을 자동 생성·공유하는 멀티 플랫폼(모바일/웹) 서비스.
(2026-09-01 방향 정정: 앱이 직접 GPS를 기록하지 않는다 — 소싱이 핵심)

## 1. 기술 스택

| 계층 | 선택 | 버전 | 비고 |
|------|------|------|------|
| Mobile App | React Native (Expo) + TypeScript | Expo SDK 최신 안정판 | iOS/Android 크로스플랫폼, 백그라운드 GPS 로깅, 갤러리 EXIF 추출 |
| User Web / Admin Web | Next.js (App Router) + TypeScript | Next 15.x | 숏폼 웹 뷰어, SNS OpenGraph, 관리자 대시보드 |
| Main API | Node.js (NestJS) + TypeScript | Node 25.x | OAuth2/JWT 인증(Google·Kakao — 2026-09-01 확정), 비즈니스 CRUD, 숏폼 생성 요청 큐잉 |
| ORM | TypeORM | — | PostGIS geometry/geography 직접 매핑 (2026-09-01 확정). 마이그레이션만 사용, synchronize 금지 |
| AI/Video Worker | Python (FastAPI + Celery) | Python 3.11 | Vision AI(CLIP/VLM), PostGIS 궤적 분석, FFmpeg 렌더링 |
| Database | PostgreSQL + PostGIS | 18 + PostGIS 3.6 | 회원/메타데이터 + GPS 궤적(LineString) 공간 인덱싱. 로컬은 Docker `vobby-db` **:5433** |
| Queue/Cache | Redis | 8.x | Celery 작업 큐, 렌더링 진행률 캐싱. 로컬은 Docker `vobby-redis` **:6380** |
| Media 처리 | FFmpeg | 최신 안정판 | 9:16 크롭, Ken-Burns, HUD 오버레이, BGM 믹싱 |
| Object Storage | S3 호환 | — | 원본 미디어·타일맵 캐시·렌더링 결과 (로컬 개발: 미정, MinIO 후보) |
| 지도 렌더링 | Mapbox / Deck.gl | — | 궤적 라인 드로잉 애니메이션 (계획) |

## 2. 모듈 구조 (모노레포)

```
vobby/
├── apps/
│   ├── mobile/             # React Native (Expo) — iOS/Android 앱
│   ├── web/                # Next.js — 사용자 웹 & SNS 공유 뷰어 (/v/:id)
│   └── admin/              # Next.js — 관리자 대시보드
├── services/
│   ├── main-api/           # NestJS — 메인 비즈니스 서버 (API Gateway)
│   └── ai-pipeline/        # Python (FastAPI + Celery)
│       ├── vision/         #   Vision AI (CLIP/VLM) 미디어 스코어링
│       ├── spatial/        #   GPS 궤적 클러스터링·POI 추출 (PostGIS)
│       ├── director/       #   스토리 엔진 — EDL(컷 편집 타임라인) 생성
│       └── renderer/       #   지도 애니메이션 + FFmpeg 영상 합성
└── packages/
    ├── shared-types/       # 와이어 계약(DTO/타입) — geo·auth·pipeline·api. 엔티티는 공유하지 않음
    └── ui-tokens/          # 디자인 토큰 2층 (palette 원시 → color 시맨틱), 플랫폼 중립 원시값
```

**패키지 소비**: tsc dist 빌드 산출물을 소비 (`@vobby/shared-types` 등). 빌드 순서는 workspaces 배열(packages → services → apps)로 보장.

**의존 방향**: Client(apps/*) → Main API(services/main-api) → Queue(Redis) → AI Pipeline(services/ai-pipeline) → Storage.
Client는 AI Pipeline을 직접 호출하지 않는다. TS 계층 간 공유는 packages/* 를 통해서만.

**패키지 매니저**: npm workspaces (루트 `package.json`). lock 파일 커밋 + CI는 `npm ci` (CLAUDE.md §의존성).
Python 워커는 `services/ai-pipeline/` 자체 venv + 버전 고정 `requirements.txt`.

**로컬 인프라**: Colima Docker + 루트 `docker-compose.yml` (`vobby-db` :5433, `vobby-redis` :6380 — 기존 타 프로젝트가 5432/6379를 점유 중이라 포트 격리).

## 3. 도메인 모델

<!-- 모델 추가 시 이 표를 갱신한다 (CLAUDE.md push 규칙). 스키마 설계는 마일스톤 1 작업. -->

| 모델 | 저장 위치 | 도메인 | 비고 |
|------|-----------|--------|------|
| User | PostgreSQL | 회원 | OAuth 계정, 프로필 |
| Trajectory | PostgreSQL (PostGIS) | 궤적 | GPS 로그 — LineString + 타임스탬프, 공간 인덱스 |
| Media | PostgreSQL + S3 | 미디어 | 사진/영상 메타데이터(EXIF 위경도·시각), 원본은 S3 |
| ShortForm | PostgreSQL + S3 | 숏폼 | 생성된 영상 메타데이터, EDL, 렌더링 상태, 공유 URL |
| RenderJob | Redis | 파이프라인 | Celery 작업 상태·진행률 (휘발성) |

상세 스키마: `docs/references/db-schema.md` (2026-09-01 신설). 궤적은 `geography(LineStringZM)` 단일 컬럼 — Z=고도, M=epoch초.

## 4. 숏폼 생성 파이프라인 (핵심 엔진)

```
[1] 위치·미디어 소싱: 갤러리 EXIF(시각·GPS) 역구성 → 일자별 여행 타임라인 + (보강) 구글 타임라인/GPX import
[2] AI 분석       : Vision(구도/표정/활동성 스코어링) + Spatial(POI 클러스터링) + Audio(BGM 비트 온셋)
[3] 시나리오      : Intro(3D 조감도)→Body(동선 드로잉)→Highlight(최고점 컷)→Outro(통계) EDL 생성
[4] 렌더링        : Mapbox 궤적 애니메이션 레이어 + FFmpeg 복합 필터(9:16, Ken-Burns, HUD, 믹싱)
[5] 배포          : HLS/MP4 + Push 알림, 앱/웹 뷰어 재생, SNS 공유
```

상세 명세: `docs/00-pm/project-charter-v2.0.md` §2.

## 5. 횡단 관심사

| 관심사 | 방식 | 상태 |
|--------|------|------|
| 인증 | OAuth2 + JWT (Main API 게이트웨이에서 일괄) | 계획 |
| 비동기 작업 | Redis 큐 + Celery 워커, 진행률은 Redis 캐시로 폴링/푸시 | 계획 |
| 시크릿 관리 | 평문 금지 — `.env`(gitignore) + `.env.example` 틀 커밋 (DESIGN.md §7) | 적용 |
| 위치 권한 | iOS/Android 백그라운드 위치 — 스토어 심사용 사유 명시 필수 (기획서 §4) | 계획 |
| 에러/로깅 | 서비스별 구조화 로깅, 파이프라인 단계별 실패 격리·재시도(멱등) | 계획 |
