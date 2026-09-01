# Exec Plan: map-animation

## 개요
- **기능**: OSM 타일 + 궤적 점진 드로잉 인트로 (렌더러 intro 교체)
- **Plan/Design**: `docs/01-plan|02-design/features/map-animation.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] mercator.py(순수)·maptiles.py(캐시)·map_animation.py
- [x] renderer 통합 (db path 조회 + intro 분기·폴백)
- [x] mercator 유닛 (D-1), 프레임 육안 (D-2)
- [x] 렌더 통합 ffprobe·육안 (D-3), 폴백 (D-4), 캐시 (D-5)
- [x] 그레이딩 + index 마일스톤 4 종료 (D-6)

## 기술 노트
- ST_NPoints 등 일부 PostGIS 함수는 geography 미지원 — `path::geometry` 캐스트 필요 (기존 규약과 동일)
- BGM URI는 워커 기준 절대 경로 — storage_key 상대 경로를 넘기면 analyze_audio가 열지 못함 (기능 14에서 resolve_media_path 경유로 통일 예정)
- 검증 시드의 media.source는 CHECK(`exif|timesync|none`) — 'gallery'는 불허

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100
빌드: 성공 (compileall + mercator 유닛)
갭: 없음 — D-1~D-6 통과. Mapbox 벡터 스타일은 계획된 비범위(토큰 확보 후 TILE_URL_TEMPLATE 교체)
지적: 타일 어트리뷰션(© OpenStreetMap contributors)을 프레임에 상시 표기 — 배포 전 정책 재확인 항목 유지
```

### 검증 실측 기록
- D-1 유닛: 원점/부산 z12 타일 좌표, 경도 단조·위도 반전, fit_zoom 최대성(z13, +1이면 초과), 미세 bbox 상한 z17 — PASS
- D-2 프레임: 부산 7점 궤적 90프레임 — frame000 시작 마커만, frame045 부분 라인+진행 헤드, frame089 전체 궤적. 타이틀 밴드·어트리뷰션 표기. 1차 7.7s(다운로드 40타일)/2차 6.1s(캐시)
- D-3 풀체인: 시드 → director.generate_edl(click120 BGM, 4세그먼트) → renderer → ffprobe 30.0s 정각 1080x1920 h264+aac 30fps.
  t=1.5s 부분 라인, t=2.9s 전체 궤적(영상 내 애니메이션 실증), outro 통계 카드("이동 12.1km/180분의 기록/사진 4장") 정상
- D-4 폴백: path NULL 여행 → intro 텍스트 카드("궤적 없는 여행"), status done — 실패 아님
- D-5 캐시: 재렌더 전후 tilecache 40개 동일(신규 다운로드 0), 재실행 멱등(status done, 산출물 덮어쓰기)
- D-6: index 기능 12 Impl(A)·마일스톤 4 종료, .env.example TILE_URL_TEMPLATE 추가
