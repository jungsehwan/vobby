# Design: 궤적 클러스터링·POI 추출 (spatial-poi)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/spatial-poi.plan.md`

## 0. 핵심 설계 결정

### 0-1. 시공간 그리디 클러스터링 (순수 함수)
- 시간순 GPS 사진을 순회하며 **직전 클러스터 중심과 거리 ≤ SPOT_RADIUS_M(150m)**이면 같은 스팟에 편입, 초과 시 새 클러스터
- 스팟 승격: `사진 ≥ MIN_SPOT_PHOTOS(2)` **또는** `체류시간 ≥ MIN_DWELL_S(600)`
- DBSCAN 대신 그리디 채택: 사진 수십 장 규모에 충분, 의존성 없음, 시간 순서 보존(EDL 배치에 필요)

### 0-2. POI 스키마 (trips.pois jsonb)
```json
[{ "type": "start|spot|end", "lon": ..., "lat": ..., "startedAt": iso, "endedAt": iso,
   "mediaIds": [...], "mediaCount": n, "dwellS": n }]
```
- start/end는 GPS 시퀀스 양끝 사진 (스팟과 좌표가 겹쳐도 별도 항목 — EDL의 Intro/Outro 슬롯)
- 기록: `UPDATE trips SET pois=... WHERE id=...` — vision_score와 동일한 허용 쓰기 패턴

### 0-3. 데이터 조회는 psycopg + PostGIS 함수
- `SELECT id, extract(epoch from captured_at), ST_X(location::geometry), ST_Y(location::geometry) FROM media WHERE trip_id=%s AND location IS NOT NULL ORDER BY captured_at`

## 1. 데이터 모델
- 마이그레이션 `AddTripPois` (append): `ALTER TABLE trips ADD COLUMN pois jsonb`

## 2. 구조 (services/ai-pipeline)
```
spatial/
├── __init__.py
├── clustering.py   # 순수 함수: cluster_pois(points, params) — 유닛 대상
├── db.py           # fetch_trip_media_points(trip_id) / update_trip_pois(trip_id, pois)
└── tasks.py        # spatial.extract_pois(trip_id) — 미존재 trip 실패, 멱등
worker.py           # include에 spatial.tasks 추가
```
- main-api: Trip 엔티티에 pois 컬럼 반영 (jsonb nullable)

## 3. UI 구조
해당 없음

## 4. 검증 기준 (Evaluator)
- [ ] D-1: compileall + clustering 유닛 (두 스팟+이동 사진 합성 시퀀스 → start/spot×2/end, 반경 경계·승격 조건)
- [ ] D-2: 마이그레이션 append 적용·멱등
- [ ] D-3: 실검증 — 시드 여행(밀집 2곳 + 이동 3장) 큐 왕복 → trips.pois 기록 확인
- [ ] D-4: 재실행 멱등 (동일 pois), GPS 0장 여행 → pois=[]
- [ ] D-5: 미존재 trip_id → 잡 failed + 사유 (진행률 키로 확인)
- [ ] D-6: 문서 동기화 (db-schema pois, index)

## 5. 비범위 재확인
고도/속도 분석·역지오코딩·vision 결합 랭킹 — 제외.
