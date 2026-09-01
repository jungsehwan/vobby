# 궤적 클러스터링·POI 추출 (spatial-poi)

> Status: Approved (2026-09-01 — 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 서버에 여행 데이터 존재: `trips.path`(사진 GPS 시퀀스 근사, nullable) + `media`(captured_at, location, source) — trip-upload로 유입
- POI 분석 코드·저장처 없음. 기획 원문은 "이동 속도·고도 변화율·체류 시간" 기반이나, **방향 정정으로 입력이 사진 좌표 시퀀스**(불규칙 간격)라 속도/고도 기반은 부적합 — 체류(시공간 밀집) 중심으로 재정의

### 1.2 재사용 가능한 기존 인프라
- Celery 큐 왕복·진행률 규약, psycopg 연결(vision-scoring), media.source 신뢰도

## 2. 사용자 요구 (원문 요약)
기획 Phase 2: "주요 관심 지점(POI: 출발지, 쉼터, 뷰포인트, 도착지) 추출" — EDL(Intro/Body/Highlight/Outro) 구성의 입력. 마일스톤 3 기능 9.

## 3. 범위 / 비범위

### 범위 (In scope)
- Celery 태스크 `spatial.extract_pois(trip_id)`: 여행의 GPS 미디어 시퀀스 → POI 목록
- POI 규칙(사진 기반): **start/end**(시퀀스 양끝) + **spot**(시공간 밀집 — 근접 반경 내 다수 사진 또는 체류시간 충족)
- `trips.pois jsonb` 컬럼 신설(마이그레이션 append) — 분석 결과 기록처 (vision_score 패턴)
- 클러스터링은 순수 함수로 분리(유닛 테스트), 큐 왕복·DB 기록 실검증

### 비범위 (Out of scope)
- 고도/속도 기반 분석 (사진 EXIF 고도 희소 — location-import로 연속 궤적이 오면 재검토)
- 역지오코딩(장소명) — 외부 API 의존, EDL 자막 설계 시
- vision_score와의 결합 랭킹 — 디렉터(기능 11)에서

## 4. 요구사항 상세
- 입력: trip의 media 중 location 있는 것, captured_at 오름차순
- 파라미터(상수화): 스팟 반경 150m, 최소 사진 2장 또는 체류 10분
- GPS 미디어 0~1장인 여행: POI 없음/양끝만 — 오류 아님

## 5. 방어적 AC
- 존재하지 않는 trip_id: 잡 failed + 명확한 사유 (조용한 성공 금지)
- 재실행 멱등: pois 재계산·덮어쓰기 (동일 입력 → 동일 결과)
- GPS 0장: pois=[] 기록, 정상 종료

## 6. 오픈 이슈 / 결정 대기
- 반경·체류 파라미터 튜닝 (실데이터), 연속 궤적(4b) 유입 시 속도 기반 보강
