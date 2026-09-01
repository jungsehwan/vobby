# Design: Redis 작업 큐 + Celery 워커 골격 (queue-worker-foundation)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/queue-worker-foundation.plan.md`

## 0. 핵심 설계 결정

### 0-1. Node→Celery 발행 = 프로토콜 직접 구현 (경량 프로듀서)
| 대안 | 판정 | 사유 |
|------|------|------|
| **A. Celery 메시지 프로토콜 v2 직접 발행 (채택)** | ✅ | 발행만 필요(소비는 Python 전담). 메시지 포맷은 공개 규격이고 ~60줄. 외부 의존 없음, 디버깅 투명 |
| B. celery-node 패키지 | ⛔ | 수년간 미유지보수 — 의존성 리스크가 직접 구현 비용보다 큼 |
| C. BullMQ(+python bullmq) | ⛔ | 기획서가 Celery 확정. Python 생태(beat/retry/canvas)를 버리는 트레이드오프 부당 |

- 프로토콜: 큐 리스트(`celery`)에 LPUSH. body=base64(JSON `[args, kwargs, embed]`), headers.task/id, properties.delivery_info — Python 표준 Celery(json serializer)가 그대로 소비

### 0-2. 진행률 채널 = Redis 키 (Celery result backend 미사용)
- 키: `vobby:progress:{taskId}`, 값: JSON `{status, detail?, updatedAt}`, **TTL 1h**
- Node가 result backend 프로토콜까지 읽는 것보다 단순하고, 기획의 "진행률 캐싱" 규약과 일치. Celery result backend(db2)는 Python 내부용으로 유지
- DB 분리: broker=db1, result=db2(예약), 진행률/캐시=db0

### 0-3. Python 프로젝트 형태
- venv(`.venv`, gitignore됨) + `requirements.txt` **정확 버전 고정** (pip freeze 기반)
- 이번 범위는 Celery 앱 + 태스크만 — FastAPI 없음 (plan §3)

## 1. 데이터 모델
RDB 변경 없음. Redis 키 규약만 신설 (§0-2) → db-schema.md에 "Redis 키 규약" 절 추가.

## 2. 도메인/서비스 구조

### 2.1 Python (services/ai-pipeline)
```
worker.py            # Celery 앱 (broker db1, backend db2), include=['common.tasks']
common/progress.py   # set_progress(task_id, status, detail=None) — db0, TTL 1h
common/tasks.py      # pipeline.ping: 수신 즉시 progress=processing → 처리 → done(+echo)
requirements.txt     # celery/redis/python-dotenv 등 고정 버전
```
- 실행: `.venv/bin/celery -A worker worker --loglevel=info`
- env: `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `REDIS_URL` (.env — python-dotenv 로드)

### 2.2 NestJS (services/main-api)
```
src/queue/celery-producer.ts   # 프로토콜 v2 인코딩 + LPUSH (ioredis)
src/queue/queue.service.ts     # enqueuePing(payload) → taskId / getProgress(taskId)
src/queue/queue.module.ts      # ioredis 프로바이더 (broker용 db1 + 진행률용 db0)
scripts/queue-ping.ts          # 왕복 검증 스크립트 (tsx): 발행 → 진행률 폴링 → 결과 출력
```
- 신규 의존성: ioredis. 앱 종료 시 커넥션 정리 (OnApplicationShutdown)
- DESIGN.md §3에 `src/queue/` 인프라 배치 추가

## 3. UI 구조
해당 없음

## 4. 검증 기준 (Evaluator)
- [ ] D-1: typecheck/build + `python -m compileall` 성공
- [ ] D-2: 워커 기동 — broker 연결, `pipeline.ping` 등록 로그 확인
- [ ] D-3: **왕복** — Node 스크립트 발행 → 워커 처리 → 진행률 done + echo payload 일치
- [ ] D-4: **유실 없음** — 워커 정지 상태 발행 → 큐 길이 1 확인 → 워커 기동 → 처리 완료
- [ ] D-5: 진행률 키 TTL 설정 확인 (1h)
- [ ] D-6: db-schema.md Redis 키 규약, product-specs 갱신

## 5. 비범위 재확인
실제 AI 태스크 / FastAPI / 재시도·DLQ / ShortForm 상태 연동 — 제외.
