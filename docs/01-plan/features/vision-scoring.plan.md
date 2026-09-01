# Vision AI 미디어 스코어링 (vision-scoring)

> Status: Approved (2026-09-01 — 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- ai-pipeline은 Celery 골격 + `pipeline.ping`뿐 — 실분석 태스크 없음
- 서버 `media.vision_score jsonb`는 기록처만 존재 (backend-trip-model), 값은 전부 NULL
- **원본 이미지 파일이 서버에 없음** — S3 업로드는 미구현 (trip-upload는 메타만)

### 1.2 재사용 가능한 기존 인프라
- 큐 왕복 체계 (Node 발행 → Celery → 진행률 키), DATABASE_URL, media.source 신뢰도 규약
- tech-debt의 "블러 필터(마일스톤 3와 함께)" — 이 기능에서 흡수

## 2. 사용자 요구 (원문 요약)
기획 Phase 2: "경치, 인물 미소, 역동적인 활동을 인식하고 심미적 완성도가 높은 컷을 자동 점수화(CLIP/VLM)". 마일스톤 3 기능 8.

## 3. 범위 / 비범위

### 범위 (In scope)
- Celery 태스크 `vision.score_media`: 이미지 참조 목록(로컬 경로 또는 URL) 입력 → 항목별 점수 산출
- 스코어 구성: CLIP 제로샷 **심미 점수** + **카테고리**(경치/인물/활동/음식/문서·스크린샷) + **블러**(Laplacian variance — 기획 Phase 1 필터 흡수) + 종합 score
- `mediaId`가 주어진 항목은 서버 `media.vision_score`에 기록 (Python 워커의 허용된 쓰기 — DESIGN §5)
- 항목 단위 실패 격리 (손상 파일이 잡 전체를 죽이지 않음)
- 큐 왕복 + 실이미지 차등 검증

### 비범위 (Out of scope)
- 원본 업로드(S3)·모바일 연동 트리거 → 별도 기능 (그때 uri가 S3 URL로 대체됨)
- 인물 표정(미소) 세부 인식 — CLIP 카테고리 수준까지만, 세분화는 EDL 설계 시
- 모델 서빙 최적화(배치/GPU 서버) — 로컬 MPS/CPU

## 4. 요구사항 상세
- 모델: OpenCLIP ViT-B-32 (사전학습 laion2b) — 로컬 캐시, 워커 프로세스당 1회 로드
- 점수 재현성: 동일 입력 → 동일 점수 (온도/랜덤성 없음)
- 진행률: 항목 N개 처리 시 진행 상황을 progress 키에 갱신

## 5. 방어적 AC
- 존재하지 않는/손상 파일: 해당 항목 `{error}` 표기, 나머지 정상 처리
- mediaId가 DB에 없음: 항목 error, 잡은 계속
- 모델 미다운로드 상태 첫 실행: 자동 다운로드 후 정상 (허용), 실패 시 잡 failed + 사유
- 블러 이미지의 blur 점수가 선명본보다 유의하게 낮아야 함 (실측)

## 6. 오픈 이슈 / 결정 대기
- 심미 프롬프트 세트 튜닝 — 실사용 데이터로 조정 (파라미터 상수화)
- S3 도입 시 uri 서명 URL 처리
