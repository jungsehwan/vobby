# Design: 갤러리 EXIF 추출 + Time-Sync 매칭 (media-exif-timesync)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/media-exif-timesync.plan.md`

## 0. 핵심 설계 결정

### 0-1. 좌표 출처 우선순위 = EXIF GPS > Time-Sync > 미매칭
- `source` 컬럼('exif'|'timesync'|'none')으로 출처를 보존 — AI 분석(마일스톤 3)에서 신뢰도 가중치로 사용 가능
- Time-Sync는 |촬영시각 − 포인트시각| 최소인 포인트, **60초 초과 시 미매칭** (오좌표 부여 금지 — plan §5)

### 0-2. 스캔은 명시적 동작 (자동 백그라운드 스캔 아님)
- 세션 상세 진입 시 "사진 불러오기" — 갤러리 전수 감시는 배터리/권한 부담, MVP는 pull 방식
- 재스캔 멱등: `INSERT OR REPLACE` (session_id, asset_id) 기준

### 0-3. EXIF 접근 = MediaLibrary.getAssetInfoAsync
- 목록은 `getAssetsAsync(createdAfter/Before, mediaType=photo, 100장 페이지)` — 시간창 필터를 OS에 위임
- 위경도는 assetInfo.location, 촬영시각은 exif DateTimeOriginal ?? creationTime

## 1. 데이터 모델 (expo-sqlite 확장)

```sql
CREATE TABLE session_media (
  session_id  TEXT NOT NULL,
  asset_id    TEXT NOT NULL,        -- MediaLibrary asset id
  captured_at INTEGER NOT NULL,     -- epoch초
  lon REAL, lat REAL,               -- NULL = 미매칭
  source TEXT NOT NULL,             -- exif | timesync | none
  width INTEGER, height INTEGER,
  uri TEXT NOT NULL,                -- 썸네일 표시용 로컬 URI
  PRIMARY KEY (session_id, asset_id)
);
```

## 2. 구조 (apps/mobile)

```
src/features/media/
├── media-db.ts          # session_media 쿼리 (recording-db의 db 인스턴스 공유)
├── media-scan.service.ts# scanSession(session): 권한→시간창 조회→EXIF→Time-Sync→upsert
└── use-session-media.ts # 화면 훅 (스캔 트리거·로딩/빈/에러 상태)
src/app/sessions.tsx     # 완료 세션 목록 (거리·시간 요약)
src/app/session/[id].tsx # 세션 상세 — 스캔 버튼 + 사진 그리드(좌표 출처 배지)
```
- recording-db.ts에 세션 목록 조회(`listFinishedSessions`)·마이그레이션(테이블 추가) 보강
- app.json: expo-media-library 플러그인 + 사진 접근 문구 "활동 중 촬영한 사진을 경로와 함께 영상으로 만들기 위해 사진 보관함을 읽습니다"
- Time-Sync 알고리즘: 포인트 배열은 recorded_at 오름차순 — 이진 탐색으로 최근접 포인트 (O(log n))

## 3. UI 구조
- 기록 화면 하단에 "지난 기록" 링크 → sessions 목록 → 상세
- 상세: 스캔 전(버튼) / 로딩 / 빈 상태("이 시간대 사진 없음") / 그리드(사진 + EXIF·근사·미매칭 배지)

## 4. 검증 기준 (Evaluator)
- [ ] D-1: 루트 typecheck 통과
- [ ] D-2: **EXIF 주입 사진으로 실검증** — 세션 시간창 내 촬영시각+GPS를 가진 JPEG을 simctl addmedia로 갤러리에 주입 → 스캔 → source='exif' 좌표 일치
- [ ] D-3: GPS 없는(시각만) 사진 → source='timesync', 최근접 포인트 좌표 부여 확인
- [ ] D-4: 시간창 밖 사진은 목록 제외, 60s 초과는 'none'
- [ ] D-5: 재스캔 시 로우 수 불변 (멱등)
- [ ] D-6: 갤러리 권한 거부 시 안내, 사진 0장 시 빈 상태
- [ ] D-7: 문서 동기화 (index, tech-debt 블러 필터)

## 5. 비범위 재확인
블러/중복 필터, 업로드, 동영상, 썸네일 압축 — 제외.
