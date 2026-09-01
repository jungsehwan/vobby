# BGM 비트/온셋 감지 (audio-beat)

> Status: Approved (2026-09-01 — 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 오디오 분석 코드 없음. BGM 자체도 시스템에 없음 — **BGM 라이브러리(템플릿 곡) 도입은 마일스톤 4 EDL 설계에서** 결정
- 큐 왕복·진행률 규약, 파이프라인 태스크 패턴(vision/spatial) 확립됨

### 1.2 관련 데이터/모델 현황
- 분석 결과 저장처 없음 — BGM 엔티티 미존재. 이 기능은 **분석 능력**을 만들고 결과는 반환/진행률로만

## 2. 사용자 요구 (원문 요약)
기획 Phase 2: "선택된 템플릿 BGM의 BPM, 비트 온셋(Onset), 드롭(Drop) 구간을 분석하여 컷 전환 최적 타임스탬프 계산". 마일스톤 3 기능 10.

## 3. 범위 / 비범위

### 범위 (In scope)
- Celery 태스크 `audio.analyze_bgm(uri)`: 오디오 파일(로컬/URL) → `{bpm, beats[], onsets[], climax{start,end}, durationS}`
- 클라이맥스: RMS 에너지 슬라이딩 윈도우 최대 구간 (Drop 근사 — Highlight 컷 배치용)
- 합성 클릭 트랙으로 BPM 정확도 실측, 큐 왕복, 실패 표면화

### 비범위 (Out of scope)
- BGM 라이브러리(엔티티·업로드·선택 UI) → 마일스톤 4 (그때 분석 결과 저장처 신설)
- 장르 분류·음원 저작권 검증, 스트리밍 음원 연동

## 4. 요구사항 상세
- librosa beat_track(BPM·비트), onset_detect — 타임스탬프는 초 단위 float
- climax 윈도우 길이 파라미터화 (기본 10s — Highlight 구간 길이와 상응)
- 반환 크기 절제: beats/onsets는 소수 3자리 반올림

## 5. 방어적 AC
- 미존재/손상 파일: 잡 failed + 사유
- 무음/저에너지 트랙: bpm 0 또는 climax 없음이 아니라 — 검출 실패 시 명시 필드(bpm이 없으면 null)
- 동일 입력 재실행 → 동일 결과 (결정적)

## 6. 오픈 이슈 / 결정 대기
- BGM 저장처·EDL 소비 형식 — director-edl(기능 11)에서 확정
