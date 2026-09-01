# Redis 작업 큐 + Celery 워커 골격 (queue-worker-foundation)

> Status: Approved (2026-09-01 — 기능 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 비동기 처리 코드 없음. `services/ai-pipeline/`은 디렉토리 골격만 (vision/spatial/director/renderer/common — 전부 .gitkeep)
- Main API(NestJS)는 인증까지 구현됨 (커밋 `67b64d1`) — 큐 발행 능력 없음

### 1.2 재사용 가능한 기존 인프라
- `vobby-redis` 컨테이너 (:6380, healthy) — `.env.example`에 broker(db1)/result(db2) URL 정의됨
- Python 3.11.16 설치됨 (venv 미생성)

### 1.3 관련 데이터/모델 현황
- ShortForm.status 상태 머신(requested→analyzing→rendering→done/failed)이 파이프라인 단계와 1:1 — 이후 기능에서 워커가 갱신할 대상
- RenderJob(진행률)은 Redis 휘발성으로 설계됨 (ARCHITECTURE §3)

## 2. 사용자 요구 (원문 요약)
기획서 §5 마일스톤 1: "작업 대기열용 Redis 셋업" + §1 "비동기 큐: Redis / Celery" — API가 큐잉하고 Python 워커가 소비하는 골격.

## 3. 범위 / 비범위

### 범위 (In scope)
- `services/ai-pipeline` Python 프로젝트 생성: venv + **고정 버전** requirements.txt + Celery 앱
- 검증용 태스크 1개 (`pipeline.ping`) + Redis 진행률 키 기록 (기획 "실시간 진행률 캐싱" 규약의 골격)
- Main API에 큐 발행 모듈 (`src/queue/`) — Celery 호환 메시지 발행
- API→큐→워커→진행률 **왕복 검증** + 워커 다운 시 큐 대기(유실 없음) 검증

### 비범위 (Out of scope)
- 실제 AI/렌더링 태스크 (마일스톤 3·4)
- FastAPI HTTP 서버 — 워커에 API가 필요해지는 시점에 추가
- ShortForm 상태 갱신 연동, 재시도/DLQ 정책 (실태스크 도입 시 설계)
- refresh_tokens 정리 잡 — DB 소유권이 main-api라 Nest 스케줄러 소관 (tech-debt 유지)

## 4. 요구사항 상세
- 브로커: `redis://localhost:6380/1`, 진행률: db0 (`REDIS_URL`) — 키 `vobby:progress:{taskId}`, TTL 1h
- Node→Celery 발행은 Celery 메시지 프로토콜 v2 준수 (Python 워커가 표준 Celery로 소비)
- Python 의존성은 정확한 버전 고정 (CLAUDE.md §의존성 — lock 부재 언어)

## 5. 방어적 AC (실패 모드 선반영)
- 워커 미기동 상태 발행: 태스크 유실 없이 큐 대기 → 워커 기동 시 처리
- Redis 연결 실패 시 발행: 명시적 에러 (조용한 실패 금지)
- 중복 발행: taskId(uuid)로 구분 — ping은 멱등
- 진행률 키 TTL — 완료 후 무한 잔존 금지

## 6. 오픈 이슈 / 결정 대기
- Node의 Celery 발행 방식 (celery-node vs 직접 구현) → Design §0에서 확정
