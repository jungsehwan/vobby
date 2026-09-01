# Design: 외부 위치 이력 import (location-import)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/location-import.plan.md`

## 0. 핵심 설계 결정

### 0-1. 외부 포인트는 원천 데이터, 여행은 파생 — 기존 2층 구조 유지
- `location_points`는 `asset_meta`와 같은 층(원천). 클러스터링은 여전히 **사진이 여행을 만들고**, 외부 포인트는 보강만:
  1) `source='none'` 사진의 timesync 후보 (±30분, 결과 source는 기존 규약대로 `timesync`)
  2) 거리 재계산 (사진 GPS + 범위 내 외부 포인트 병합 시퀀스)
  3) 업로드 path 조밀화 (buildPath에서 병합)
- `clusterTrips(assets, extPoints=[])` 순수 함수 확장 — 기본값 []로 기존 호출·테스트 무영향

### 0-2. 파일 단위 교체 멱등
- PK `(source_file, t)`. import = 해당 source_file 포인트 전량 DELETE 후 INSERT (트랜잭션)
- 재클러스터링은 기존 `rewriteTrips` 전량 재작성과 동일 패턴

### 0-3. 업로드 path 다운샘플
- 병합 좌표 > 500점이면 균등 인덱스 추출(시작·끝 보존) — `MAX_PATH_POINTS=500` (Nest 바디 100kb 방어)

### 0-4. `__DEV__` 번들 샘플 (시뮬레이터 검증 경로)
- `dev-fixtures.ts`의 GPX/타임라인 문자열 상수 — 프로덕션 번들엔 데드코드 제거로 미포함 (DEV_JWT 시드 선례)

## 1. 데이터 모델 (모바일 SQLite만 — 서버 변경 없음)

```sql
CREATE TABLE IF NOT EXISTS location_points (
  source_file TEXT NOT NULL,   -- 파일명 (교체 멱등 단위)
  t INTEGER NOT NULL,          -- epoch 초
  lon REAL NOT NULL, lat REAL NOT NULL,
  PRIMARY KEY (source_file, t)
);
```

## 2. 구조 (apps/mobile)

```
src/features/trips/
├── location-parsers.ts        # 순수: parseGpx / parseGoogleTimeline / parseLocationFile(이름+내용 → 포인트)
├── location-import.service.ts # 파일 선택(document-picker)→읽기(file-system)→파싱→저장→재클러스터
├── dev-fixtures.ts            # __DEV__ 샘플 GPX·타임라인 문자열
├── clustering.ts              # clusterTrips(assets, extPoints) 확장
├── trips-db.ts                # location_points CRUD + listImportedFiles
└── trip-upload.service.ts     # buildPath(media, extPoints) + 다운샘플
app/import.tsx                 # import 화면 (index 헤더에서 진입)
```

파서 계약: `LocationPoint { t: number; lon: number; lat: number }`
- GPX: `<trkpt lat=".." lon=".."><time>ISO</time>` — time 없는 점은 skip
- 타임라인 신형: 루트 배열 또는 `.semanticSegments[]` — `timelinePath[].point("geo:lat,lng")+offset분`, `visit.topCandidate.placeLocation`+startTime
- 타임라인 구형: `.locations[]` — latitudeE7/longitudeE7 + timestamp(ISO)|timestampMs
- 확장자 .gpx → GPX, .json → 타임라인 (두 형태 자동 판별). 0점 파싱 → throw

## 3. UI 구조
- `app/import.tsx`: [파일 선택] 버튼 → 결과 요약(파일명·포인트 수·기간), import된 파일 목록, 재클러스터 결과(여행 수)
- `app/index.tsx` 헤더에 "위치 이력" 진입 링크
- 실패는 Alert로 표면화 (DESIGN §6)

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 파서 유닛 — GPX·신형(timelinePath/visit)·구형(E7) 각 포맷, 불량 엔트리 skip, 0점 throw, geo:lat,lng 순서 변환
- [ ] D-2: 클러스터링 보강 유닛 — none→timesync 매칭(±30분 한계), 범위 밖 포인트 무시, 거리 재계산, extPoints=[] 시 기존 결과 불변
- [ ] D-3: buildPath 유닛 — 병합·시간순·500점 다운샘플(시작·끝 보존)
- [ ] D-4: 시뮬레이터 E2E — import 화면 진입, __DEV__ 샘플 import → 포인트 수·여행 목록 갱신 확인 (스크린샷)
- [ ] D-5: 멱등 — 같은 샘플 재import 후 포인트 수 불변
- [ ] D-6: 업로드 통합 — 보강된 여행 업로드 → 서버 trips.path 포인트 수 증가 확인 (DB 실측)
- [ ] D-7: 문서 동기화 (index 4b Impl)

## 5. 비범위 재확인
사진 없는 여행 생성 ✗, Records.json 스트리밍 ✗, 서버 변경 ✗
