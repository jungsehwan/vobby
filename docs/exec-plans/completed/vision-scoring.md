# Exec Plan: vision-scoring

## 개요
- **기능**: CLIP 제로샷 + 블러 기반 미디어 스코어링 Celery 태스크
- **Plan/Design**: `docs/01-plan|02-design/features/vision-scoring.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] deps 설치·고정 (torch/open_clip/pillow/opencv/psycopg) + .env DATABASE_URL
- [x] scoring_params.py / scoring.py / db.py / tasks.py + worker include
- [x] compileall + blur 유닛 (D-1)
- [x] 실이미지 차등 검증 (D-2)
- [x] 큐 왕복 (D-3) + DB 기록 (D-4) + 실패 격리 (D-5)
- [x] 그레이딩 + 문서 동기화 (D-6)

## 기술 노트
- 모델 첫 로드 시 laion2b 가중치 다운로드 (~600MB) — 로컬 캐시

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100 (UI 범위 외)
빌드: 성공 (compileall + blur 유닛)
갭: 없음 — D-1~D-6 통과. 입력 소스는 로컬 경로/URL (S3 도입 시 서명 URL로 대체 — 설계된 비범위)
지적: 없음
```

### 검증 실측 기록
- D-1: blur 유닛 — 노이즈 이미지 1.0 vs 가우시안 블러본 0.0
- D-2: 실이미지 차등 — 산 풍경 81점(scenery, aes 0.68) / 블러본 22점 / 앱 스크린샷 15점(screenshot, aes 0.08)
- D-3: 큐 왕복 — Node 발행 → 워커 처리 → 진행률 done, scripts/queue-vision-score.ts로 재현 가능
- D-4: media.vision_score DB 기록 {score:81, category:scenery, model:ViT-B-32/laion2b}
- D-5: 없는 파일 혼입 → 해당 항목만 error(scored=1, failed=1), 잡 성공

### 기술 노트
- **macOS에서 torch(MPS) 태스크는 Celery `--pool=solo`로 기동** — prefork(fork) 후 MPS 사용은 불안정.
  프로덕션(리눅스/CUDA·CPU)에서는 prefork 재검토
- CLIP 가중치 첫 로드 시 HuggingFace에서 ~600MB 다운로드 (로컬 캐시)
