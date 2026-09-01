# Exec Plan: queue-worker-foundation

## 개요
- **기능**: Redis(Celery) 작업 큐 골격 — Node 발행 → Python 워커 소비 → 진행률 키
- **Plan**: `docs/01-plan/features/queue-worker-foundation.plan.md`
- **Design**: `docs/02-design/features/queue-worker-foundation.design.md`
- **시작일**: 2026-09-01

## 체크리스트

### Python 워커 (Design §2.1)
- [x] venv 생성 + celery/redis/python-dotenv 설치 + requirements.txt 고정
- [x] worker.py (Celery 앱) + common/progress.py + common/tasks.py(pipeline.ping)
- [x] compileall 검증 + 워커 기동 확인 (D-2)

### Nest 발행자 (Design §2.2)
- [x] ioredis 추가, celery-producer.ts (프로토콜 v2)
- [x] queue.service.ts / queue.module.ts (+ 종료 시 커넥션 정리)
- [x] scripts/queue-ping.ts 검증 스크립트
- [x] typecheck/build 검증

### 검증 (Design §4)
- [x] D-3: 왕복 (발행→처리→진행률 done)
- [x] D-4: 워커 다운 중 발행 유실 없음
- [x] D-5: 진행률 TTL 확인
- [x] 그레이딩 + 문서 동기화 (db-schema Redis 규약, index, DESIGN §3)

## 기술 노트
- Celery 프로토콜 v2 직접 발행 채택 (celery-node 미유지보수 — design §0-1)

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100 (UI 계층 범위 외)
빌드: 성공 (typecheck 0 에러 + nest build + python compileall)
갭: 없음 — D-1~D-6 전수 통과
지적: 구현 중 수정 2건 — ioredis ESM default import가 네임스페이스로 해석(named import로 통일),
      queue.module↔service 순환 import TDZ(토큰을 queue.tokens.ts로 분리, DESIGN §3에 규칙화)
```

### 검증 실측 기록
- D-2: 워커 기동 — redis://localhost:6380/1 연결, pipeline.ping 등록
- D-3: 왕복 — Node 발행 → 워커 처리 → 진행률 done + echo payload 일치, TTL=3600s (D-5 동시 확인)
- D-4: 워커 정지 중 발행 → 큐 길이 1 (유실 없음) → 재기동 → 처리 완료, 큐 0
- 앱 부팅: QueueModule 포함 기동 + /me 401 정상
