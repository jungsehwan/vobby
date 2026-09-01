# Design: 스토리 엔진 — EDL 생성 (director-edl)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/director-edl.plan.md`

## 0. 핵심 설계 결정

### 0-1. EDL v1 스키마 = 렌더러(기능 13) 입력 계약
```json
{
  "version": 1,
  "durationS": 30,
  "bgm": {"uri": "...", "bpm": 117.5, "climax": {"start": 20, "end": 30}} | null,
  "title": "8.27 여행" ,
  "segments": [
    {"slot": "intro", "start": 0, "end": 3, "kind": "map_overview",
     "bbox": [minLon, minLat, maxLon, maxLat] | null},
    {"slot": "body", "start": 3, "end": 15, "kind": "cuts",
     "cuts": [{"mediaId", "start", "end", "effect": "kenburns"}]},
    {"slot": "highlight", "start": 15, "end": 25, "kind": "cuts",
     "cuts": [{"mediaId", "start", "end", "effect": "kenburns"}]},
    {"slot": "outro", "start": 25, "end": 30, "kind": "stats",
     "stats": {"distanceM": ..., "durationS": ..., "mediaCount": ...}}
  ]
}
```

### 0-2. 소재 선정 규칙 (순수 함수 `build_edl`)
- 점수: `vision_score.score` (NULL→0). screenshot 카테고리는 선정 제외(있으면)
- **Highlight**: 점수 내림차순(동점 시 시간순) 상위 → climax 구간(BGM 있으면 그 타이밍이 highlight 슬롯과 일치하도록 슬롯 시각은 고정, 컷만 배치) — 컷 수 = min(비트 수 허용, 3)
- **Body**: 나머지 중 시간순 — POI spot당 최고점 1장 우선, 부족 시 시간순 보충 — 컷 수 최대 4
- 컷 경계 비트 스냅: 슬롯 내 균등 분할점 → 가장 가까운 비트(±0.4s), BGM 없으면 그대로

### 0-3. 상태 전이·기록
- 시작 시 `status='analyzing'`, 성공 시 `edl` 기록 + `status='rendering'` (단일 UPDATE 2회 — 실패 시 status='failed'+error_message)
- trip 통계·bbox는 SQL로: `ST_Extent(path::geometry)` 또는 media 좌표 min/max (path NULL 대비 media 기준)

## 1. 데이터 모델
변경 없음 (short_forms.edl/status/error_message 활용).

## 2. 구조 (services/ai-pipeline)
```
director/
├── __init__.py
├── edl.py       # build_edl(trip, media, pois, bgm) 순수 함수 + 슬롯/컷 파라미터 상수
├── db.py        # fetch_short_form_context(short_form_id) / save_edl / mark_failed
└── tasks.py     # director.generate_edl(short_form_id, bgm_uri)
worker.py        # include 추가
```
- BGM 분석은 `audio.analysis.analyze_audio` 직접 함수 호출 (태스크 체인 불필요)

## 3. UI 구조
해당 없음

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 유닛 — 4슬롯 구조, 컷 경계가 비트 배열 원소와 일치(±0.4s), highlight에 최고점 미디어, screenshot 제외, BGM 없음 케이스, 결정성
- [ ] D-2: 통합 체인 — 시드(트립+미디어+vision_score) → spatial.extract_pois → director.generate_edl(click120.wav)
  → short_forms.edl 기록 + status=rendering
- [ ] D-3: 미존재 short_form → failed, 미디어 0장 → failed("소재 없음"), 손상 BGM → failed
- [ ] D-4: 재실행 멱등 (동일 EDL md5)
- [ ] D-5: 문서 동기화 (index, db-schema edl 계약 참조)

## 5. 비범위 재확인
렌더링/지도 이미지/BGM 라이브러리/가변 길이 — 제외.
