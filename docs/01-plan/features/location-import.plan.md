# 외부 위치 이력 import (location-import)

> Status: Approved (2026-09-01 — 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 타임라인은 갤러리 EXIF만으로 재구성 (`trips/clustering.ts`) — GPS 없는 사진은 여행 내 GPS 사진과 ±30분 timesync, 그래도 없으면 `source='none'`
- 여행 path는 **사진 GPS 좌표만**으로 구성 (`trip-upload.service.ts buildPath`) — 사진이 드문 구간은 궤적이 끊긴 직선 (기능 12 지도 애니메이션의 라인 품질 직결)
- 서버는 path 좌표 수 제한 없이 `LINESTRING ZM` 수용 (`trip.service.ts`) — 단 Nest JSON 바디 기본 100kb

### 1.2 방향 정정과의 관계
2026-09-01 방향 정정의 3대 소스 중 갤러리 EXIF(4a)만 구현됨. 이 기능이 나머지 둘(구글 타임라인·GPX)을 담당 — **타임라인 보강**이 목적 (여행 생성의 1차 소스는 여전히 사진).

## 2. 사용자 요구 (원문 요약)
"이미 구글 맵이나 이미 위치정보를 저장했던 라이브러리에서 받고, 해당 일자와 시간, 위치정보를 토대로 갤러리내 사진으로 여행 타임라인과 숏폼을 자동으로 만드는거다" (2026-09-01). index 4b: 구글 타임라인 JSON·GPX 파일 — 타임라인 보강.

## 3. 범위 / 비범위

### 범위 (In scope)
- 파일 포맷 파서 (순수 함수): **GPX**(trkpt), **구글 타임라인** — 신형 기기 내보내기(semanticSegments/timelinePath·visit)와 구형 Takeout(`locations[].latitudeE7`) 모두
- 로컬 저장: `location_points` 테이블 (파일 단위 재import 멱등 — 같은 파일명은 전량 교체)
- 클러스터링 보강: `source='none'` 사진을 외부 포인트와 ±30분 timesync (→ `source='timesync'` — 와이어 계약 불변), 거리 재계산
- 업로드 path 조밀화: 여행 시간 범위의 외부 포인트를 사진 GPS와 병합, **최대 500점 다운샘플**(바디 100kb 안전)
- import 화면: 파일 선택(expo-document-picker) → 파싱 결과 요약 → 재클러스터링. `__DEV__` 한정 번들 샘플 import(시뮬레이터 검증 경로 — DEV_JWT 시드와 동일 선례)

### 비범위 (Out of scope)
- 사진 없는 여행 생성 (숏폼은 사진이 필수 — 외부 포인트 단독은 여행으로 승격하지 않음)
- 초대형 Takeout Records.json 스트리밍 파싱 (수백 MB — 파일 크기 상한으로 방어, 후속)
- 서버 스키마·API 변경 (없음 — 기존 path/source 계약 그대로)

## 4. 요구사항 상세
- 파서는 관대하게: 개별 불량 엔트리는 건너뛰고 집계, **0점 파싱 시에만 실패** ("지원하지 않는 형식")
- 시각은 epoch 초 정규화 (timestamp/timestampMs/ISO/offset-minutes 모두)
- 신형 타임라인 좌표 문자열 `geo:lat,lng` — **lat이 먼저** (GPX 속성도 lat/lon — 내부 규약은 lon,lat 순서이므로 변환 주의)

## 5. 방어적 AC
- 같은 파일 재import → 포인트 수 불변 (파일 단위 교체 멱등)
- 파싱 실패/0점 → 에러 표면화 (조용한 무시 금지), 기존 데이터 무손상
- 외부 포인트가 여행 시간 범위 밖 → path·timesync에 미사용
- 파일 크기 상한(50MB) 초과 → 안내 후 중단
- import 없이 기존 플로우 무영향 (포인트 0개 = 현행과 동일 산출)

## 6. 오픈 이슈 / 결정 대기
- expo-document-picker는 네이티브 모듈 — dev 빌드 재빌드 필요 (`expo run:ios`)
- 구글 타임라인 신형 포맷은 OS·버전별 변형 존재 — 실사용 파일 확보 시 파서 보강
