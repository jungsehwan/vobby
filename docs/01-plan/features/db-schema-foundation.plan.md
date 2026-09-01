# DB 스키마 설계 — 기반 도메인 모델 (db-schema-foundation)

> Status: Approved (2026-09-01)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 코드 없음 — 저장소는 하네스 문서 + 모노레포 골격만 존재 (커밋 `9806105` 기준)
- `services/main-api/`는 `.gitkeep`만 있는 빈 디렉토리 — NestJS 프로젝트 생성부터 필요

### 1.2 재사용 가능한 기존 인프라
- `docker-compose.yml`: `vobby-db` (PostgreSQL 18 + PostGIS 3.6, `:5433`, 계정 vobby/vobby) — 구동·검증 완료
- `vobby-redis` (`:6380`) — 이 기능에서는 미사용 (기능 3 `queue-worker-foundation` 범위)
- `.env.example`의 `DATABASE_URL=postgresql://vobby:vobby@localhost:5433/vobby`

### 1.3 관련 데이터/모델 현황
- DB에 테이블 없음 (postgis 확장만 활성화된 상태)
- 도메인 모델 정의는 `ARCHITECTURE.md` §3 표가 유일 (User/Trajectory/Media/ShortForm/RenderJob)

## 2. 사용자 요구 (원문 요약)

기획서(`docs/00-pm/project-charter-v2.0.md`) §5 마일스톤 1:
"PostgreSQL + PostGIS 스키마(User, Trajectory, Media, ShortForm) 설계 및 작업 대기열용 Redis 셋업"
+ 2026-09-01 결정: ORM=TypeORM, OAuth 제공자=Google·Kakao (MVP)

## 3. 범위 / 비범위

### 범위 (In scope)
- `services/main-api`에 NestJS 프로젝트 생성 (워크스페이스 편입, 빌드/typecheck 스크립트)
- TypeORM 설정 + **마이그레이션 체계** (synchronize 금지 — AGENTS.md Data agent 규칙)
- 엔티티 4종 + 마이그레이션: User, Trajectory(PostGIS), Media, ShortForm
- 공간 컬럼 GIST 인덱스, 조회 패턴에 필요한 기본 인덱스
- `docs/references/db-schema.md` 신설 (스키마 참조 문서 — push 문서 규칙 연결)

### 비범위 (Out of scope, 이번 개발에서 다루지 않음)
- 인증/OAuth 구현 로직 → 기능 2 `api-auth-foundation` (이번엔 User에 provider 컬럼 설계만)
- Redis 큐/Celery 연동 → 기능 3 `queue-worker-foundation`
- 비즈니스 API 엔드포인트 (CRUD 컨트롤러)
- S3/Object Storage 연동 (Media는 스토리지 키 컬럼만 설계)
- RenderJob — Redis 휘발성 데이터라 RDB 스키마 비대상 (ARCHITECTURE §3)

## 4. 요구사항 상세

### 4.1 User
- OAuth 계정: provider(`google`|`kakao` — **확장 가능한 설계**, iOS 출시 시 `apple` 추가 예정), provider_uid, 복합 유니크
- 프로필: 닉네임, 아바타 URL. 이메일은 nullable (Kakao는 이메일 미제공 케이스 존재)

### 4.2 Trajectory (PostGIS 핵심)
- 사용자별 활동 1회의 GPS 궤적: `geography(LineString, 4326)` 또는 포인트 시퀀스 — 저장 방식은 Design에서 확정
- 타임스탬프·고도를 포함해야 함 (HUD/통계 요구 — 기획서 Phase 2·3)
- 통계 파생값(총거리·소요시간·고도차) 컬럼 — Outro 인포그래픽 요구
- GIST 공간 인덱스 + (user, 활동일) 조회 인덱스

### 4.3 Media
- EXIF 메타(위경도 `geography(Point)`, 촬영시각, 해상도), 원본/썸네일 스토리지 키
- Trajectory와 N:1 (Time-Sync 매칭 결과), AI 스코어 필드(Vision 분석 결과 저장처)

### 4.4 ShortForm
- Trajectory 1:N, 렌더링 상태 머신(요청→분석→렌더링→완료/실패), EDL(jsonb), 결과 영상 스토리지 키, 공유 URL slug(`/v/:id`)

## 5. 방어적 AC (수용 기준 — 실패 모드 선반영)

- 오프라인/네트워크 실패 시: 마이그레이션은 트랜잭션 단위 — 중간 실패 시 부분 적용 없음
- 중복 실행/재시도 시: 마이그레이션 재실행 멱등 (`migration:run` 2회 실행해도 오류·중복 없음)
- 대량 데이터 시: 궤적 포인트 수천 개(수 시간 활동) 기준으로 저장 방식 선택 근거를 Design에 명시
- 검증: 마이그레이션 적용 후 실제 LineString insert + `ST_Length` 공간 쿼리로 왕복 확인 (실행 검증)

## 6. 오픈 이슈 / 결정 대기

- 궤적 저장 방식: 단일 LineString 컬럼 vs 포인트 개별 로우(+시각/고도) vs 병행 — Design에서 트레이드오프 비교 후 확정
- Apple 로그인: iOS 스토어 심사 시 소셜 로그인 존재하면 필수 — provider enum 확장으로 대응 예정 (기능 2 이후)
- ID 전략(uuid v7 vs bigint) — Design에서 확정
