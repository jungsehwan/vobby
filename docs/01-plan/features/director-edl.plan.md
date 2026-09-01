# 스토리 엔진 — EDL 타임라인 생성 (director-edl)

> Status: Approved (2026-09-01 — 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 마일스톤 3 산출물 준비됨: `media.vision_score`(컷 선별), `trips.pois`(start/spot/end), 오디오 분석 계약(bpm/beats/climax — audio-beat)
- `short_forms.edl jsonb`·status 상태 머신은 스키마만 존재 — 생성 로직 없음

### 1.2 재사용 가능한 기존 인프라
- 파이프라인 태스크 패턴, psycopg 기록 경로, queue-task.ts 검증기, click120.wav(합성 BGM)

## 2. 사용자 요구 (원문 요약)
기획 Phase 3: "Intro(3D 조감)→Body(이동)→Highlight(최고점 컷·클라이맥스 매핑)→Outro(통계), BGM 비트 타이밍에 맞춘 자동 컷 편집 타임라인(EDL) 생성". 마일스톤 4 기능 11.

## 3. 범위 / 비범위

### 범위 (In scope)
- Celery 태스크 `director.generate_edl(short_form_id, bgm_uri|null)`:
  trip(pois·path·통계) + media(vision_score) + BGM 분석(내부 호출) → **EDL v1** 생성
- 30초 고정 4슬롯: Intro(0-3 조감+타이틀) / Body(3-15 시간순 컷, 비트 스냅) / Highlight(15-25 vision 상위컷↔climax) / Outro(25-30 통계)
- `short_forms.edl` 기록 + status 전이(analyzing→**rendering**) — 렌더러(기능 13) 대기 상태
- EDL 스키마를 렌더러 입력 계약으로 문서화, 파이프라인 체인 검증(spatial→director)

### 비범위 (Out of scope)
- 실제 렌더링(기능 13), 지도 조감 이미지 생성(기능 12 — EDL엔 bbox만)
- BGM 라이브러리/선택 — bgm_uri 직접 입력 (없으면 비트 스냅 없이 균등 컷)
- 가변 길이(30~60s)·타이틀 AI 생성 — 파라미터/후속

## 4. 요구사항 상세
- 컷 경계는 가장 가까운 비트로 스냅(±0.4s 한도), BGM 없으면 균등 분할
- Highlight 소재: vision_score 상위(동점 시 시간순), 부족하면 Body 소재 재사용 없이 축소
- vision_score 전부 NULL이어도 동작 (점수 0 취급 — 시간순 선정)
- 멱등: 재실행 시 동일 입력 → 동일 EDL, edl 덮어쓰기

## 5. 방어적 AC
- 미존재 short_form: failed + 사유
- 미디어 0장 여행: failed ("소재 없음") — 빈 EDL 생성 금지
- BGM 분석 실패(손상 파일): failed + 사유 (조용히 무음 진행 금지 — 사용자가 고른 BGM이 무시되면 안 됨)
- status가 이미 done인 숏폼: 재생성 허용 (edl 갱신, status는 rendering으로 롤백 — 재제작 흐름)

## 6. 오픈 이슈 / 결정 대기
- 슬롯 길이·컷 최소 길이 튜닝, 타이틀 생성(LLM/규칙) — 렌더러 검증 후
