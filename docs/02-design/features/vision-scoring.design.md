# Design: Vision AI 미디어 스코어링 (vision-scoring)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/vision-scoring.plan.md`

## 0. 핵심 설계 결정

### 0-1. CLIP 제로샷 + Laplacian 블러의 2계층 스코어
- CLIP(OpenCLIP ViT-B-32/laion2b): 프롬프트 그룹과의 유사도 softmax
  - **aesthetic**: "a stunning professional photo" 류 vs "a poorly taken photo" 류 → 0~1
  - **category**: scenery/people/action/food/screenshot-or-document 중 argmax + 확률
- **blur**: OpenCV Laplacian variance (그레이스케일) — 임계 하한으로 정규화 0~1
- 종합 `score = round(100 * (0.6*aesthetic + 0.3*blur + 0.1*category_bonus))`
  - category_bonus: scenery/people/action=1, food=0.6, screenshot=0 (숏폼 소재 적합도)
  - 가중치·프롬프트는 `vision/scoring_params.py` 상수 — 튜닝 지점 명시

### 0-2. 모델은 워커 프로세스당 1회 lazy 로드
- 태스크 첫 호출 시 전역 캐시에 로드 (콜드스타트 수 초) — Celery prefork 워커별 유지
- 디바이스: MPS 가용 시 MPS, 아니면 CPU

### 0-3. DB 기록은 psycopg 직접 (허용된 쓰기 경로)
- `UPDATE media SET vision_score=%s, updated_at=now() WHERE id=%s` — 스키마 변경 없음, 기록만
- vision_score jsonb: `{score, aesthetic, blur, category, categoryProbs, model, scoredAt}`

### 0-4. 태스크 계약
```
vision.score_media(items: [{"uri": str, "mediaId": str|None}]) ->
  {"results": [{"uri", "mediaId", "score", ... } | {"uri", "error"}], "scored": n, "failed": m}
```
- 진행률: `vobby:progress:{taskId}` status=processing, detail={done, total} 갱신 → done

## 1. 데이터 모델
변경 없음 (media.vision_score 활용).

## 2. 구조 (services/ai-pipeline)

```
vision/
├── __init__.py
├── scoring_params.py   # 프롬프트 그룹·가중치·블러 정규화 상수
├── scoring.py          # 순수 로직: load_model(), score_image(img) — 테스트 대상
├── db.py               # update_vision_score(media_id, payload) — DATABASE_URL
└── tasks.py            # vision.score_media (항목 실패 격리, 진행률)
worker.py               # include에 vision.tasks 추가
```
- deps 추가(고정): torch, open_clip_torch, pillow, opencv-python-headless, psycopg[binary]
- .env: DATABASE_URL 추가 (ai-pipeline)

## 3. UI 구조
해당 없음

## 4. 검증 기준 (Evaluator)
- [ ] D-1: compileall + blur 순수 함수 유닛(선명 vs 블러 합성 이미지 차등)
- [ ] D-2: 실이미지 차등 — 풍경 사진의 category=scenery & 스크린샷류의 score가 유의하게 낮음, 블러본 blur 점수 하락 (실행 검증)
- [ ] D-3: 큐 왕복 — Node enqueue → 워커 처리 → 진행률 done + results
- [ ] D-4: mediaId 매핑 항목의 media.vision_score DB 기록 확인
- [ ] D-5: 손상 파일 혼입 시 해당 항목만 error, 잡은 성공 (실패 격리)
- [ ] D-6: 문서 동기화 (index, tech-debt 블러 항목 해소 표기)

## 5. 비범위 재확인
S3 업로드/모바일 트리거/표정 세분화/서빙 최적화 — 제외.
