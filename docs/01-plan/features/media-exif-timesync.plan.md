# 갤러리 EXIF 추출 + Time-Sync 매칭 (media-exif-timesync)

> Status: Approved (2026-09-01 — 연속 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 기록(세션/포인트)은 로컬 SQLite에 존재 (`apps/mobile .../recording-db.ts`) — 미디어 연동 없음
- 서버 `media` 테이블은 준비됨 (captured_at, location, trajectory_id nullable — Time-Sync 전 상태 허용)

### 1.2 재사용 가능한 기존 인프라
- 기록 세션의 시간창(started_at~ended_at)과 포인트(M=epoch초) — 매칭의 기준 데이터
- Maestro + simctl 검증 체계 (mobile-gps-logging에서 구축)

### 1.3 관련 데이터/모델 현황
- 갤러리 접근 권한/모듈 없음 — expo-media-library 신규

## 2. 사용자 요구 (원문 요약)
기획 Phase 1: "사진/동영상 EXIF 메타데이터(위경도, 촬영 시각) 추출, GPS 로그와 시간대별 1:1 시공간 동기화(Time-Sync)". 마일스톤 2 기능 5.

## 3. 범위 / 비범위

### 범위 (In scope)
- expo-media-library로 세션 시간창 내 사진 조회 + EXIF(촬영시각·위경도) 추출
- **Time-Sync 매칭**: EXIF 위경도 없으면 촬영시각과 가장 가까운 궤적 포인트의 좌표를 부여 (허용 오차 60s)
- 매칭 결과 로컬 저장 (session_media 테이블) — 업로드 기능의 입력이 됨
- 화면: 완료된 세션 목록 → 세션 상세(매칭된 사진 썸네일 + 좌표 출처 표기)
- 사진 라이브러리 권한 문구 (스토어 심사 대비)

### 비범위 (Out of scope)
- 온디바이스 블러(Laplacian)/중복 연사 필터 → 기획 Phase 1 항목이나 이미지 처리 의존성이 큼 — tech-debt 등록 후 마일스톤 3(Vision AI)과 함께
- 서버 업로드 / 동영상 처리(사진만 우선) / 썸네일 생성·압축

## 4. 요구사항 상세
- 매칭 우선순위: EXIF GPS > Time-Sync 근사(±60s 내 최근접 포인트) > 미매칭(unmatched 표기)
- 촬영시각은 EXIF DateTimeOriginal 기준, 없으면 asset creationTime
- 재스캔 멱등: 같은 세션 재스캔 시 중복 로우 생성 금지 (asset_id 기준 upsert)

## 5. 방어적 AC
- 갤러리 권한 거부: 안내 + 크래시 없음
- 세션 시간창에 사진 0장: 빈 상태 UI
- EXIF 없는 사진: 미매칭으로 표기 (오좌표 부여 금지)
- 수백 장 조회: 페이지네이션(100장 단위)으로 UI 블로킹 없음

## 6. 오픈 이슈 / 결정 대기
- 동영상 메타 추출 시점 (사진 검증 후)
- 블러/중복 필터 알고리즘 선택 → 마일스톤 3
