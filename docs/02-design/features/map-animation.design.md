# Design: 지도 궤적 애니메이션 (map-animation)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/map-animation.plan.md`

## 0. 핵심 설계 결정

### 0-1. 지도 배경 = OSM 타일 1회 스티치, 애니메이션 = Pillow 프레임 90장
- bbox(+18% 여백)를 덮는 최대 줌 z를 계산(캔버스 1080x1920 기준) → 필요한 타일만 다운로드·스티치한 **베이스 이미지 1장**
- 프레임 i(0..89): 베이스 복사 + 폴리라인을 진행률 i/89까지 드로잉 + 시작 마커/진행 헤드 + 하단 타이틀 밴드·© OpenStreetMap 어트리뷰션
- PNG 시퀀스 → `ffmpeg -framerate 30 -i frame%03d.png` 클립 — 렌더러 concat 규격(1080x1920/30fps/h264) 동일

### 0-2. 타일 소스 추상화 + 캐시
- `TILE_URL_TEMPLATE` env (기본 `https://tile.openstreetmap.org/{z}/{x}/{y}.png`) — Mapbox 전환 시 템플릿·어트리뷰션만 교체
- 캐시: `MEDIA_STORAGE_ROOT/tilecache/{z}/{x}/{y}.png` — 재실행 네트워크 0, User-Agent "VobbyDev/0.1"

### 0-3. 렌더러 통합
- renderer/db.py fetch에 `ST_AsGeoJSON(t.path)` 추가 — EDL 계약 불변(bbox만), 좌표는 렌더 시 조회
- tasks의 map_overview 분기: path 좌표 ≥2 → 지도 애니메이션 클립, 아니면 기존 텍스트 카드 폴백

## 1. 데이터 모델
변경 없음.

## 2. 구조 (services/ai-pipeline)
```
spatial/
├── mercator.py       # 순수: lonlat→월드픽셀, bbox→줌 계산 (유닛 대상)
├── maptiles.py       # 타일 다운로드·캐시·스티치 → 베이스 이미지 + 픽셀 변환 컨텍스트
└── map_animation.py  # render_map_frames(coords, title, workdir) → 프레임 경로 목록
renderer/tasks.py     # map_overview 분기 교체 (+db.py path 조회)
```

## 3. UI 구조
해당 없음

## 4. 검증 기준 (Evaluator)
- [ ] D-1: mercator 유닛 — 알려진 좌표의 타일/픽셀 값, bbox 줌 산정(캔버스 커버)
- [ ] D-2: 부산 궤적 프레임 생성 — 첫(라인 없음·마커만)/중간(부분 라인)/끝(전체 라인) 프레임 육안
- [ ] D-3: 렌더 통합 — 풀체인 재렌더 → intro 프레임이 지도+라인+타이틀, ffprobe 규격 유지
- [ ] D-4: path NULL 여행 → 텍스트 카드 폴백 (렌더 성공)
- [ ] D-5: 타일 캐시 — 2회차 실행이 캐시로 동작(캐시 파일 존재·오프라인 재실행 성공 여부는 캐시 히트 확인으로 대체)
- [ ] D-6: 문서 동기화 (index — 마일스톤 4 종료 표기)

## 5. 비범위 재확인
Mapbox 스타일·3D·이동 맵 인서트·HUD — 제외.
