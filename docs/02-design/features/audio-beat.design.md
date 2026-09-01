# Design: BGM 비트/온셋 감지 (audio-beat)

> Status: Approved (2026-09-01)
> Plan: `docs/01-plan/features/audio-beat.plan.md`

## 0. 핵심 설계 결정

### 0-1. librosa 3종 분석 (순수 함수 `analyze_audio`)
- **bpm/beats**: `librosa.beat.beat_track` — 검출 불가(무음 등) 시 bpm=null, beats=[]
- **onsets**: `librosa.onset.onset_detect(units='time')`
- **climax**: RMS 에너지의 이동 평균(윈도우 `CLIMAX_WINDOW_S=10s`)이 최대인 구간 `{start, end}` — Drop 근사, Highlight 컷 배치용. 전체 길이 < 윈도우면 전곡

### 0-2. 결과는 반환/진행률로만 (저장처 없음 — plan §3)
- EDL(기능 11)이 소비할 형식을 여기서 확정:
```json
{"bpm": 120.0|null, "beats": [0.5, 1.0, ...], "onsets": [...], 
 "climax": {"start": 20.0, "end": 30.0}, "durationS": 30.0}
```

### 0-3. URL 입력은 임시 파일 경유
- librosa.load는 경로 필요 — http(s)면 tempfile로 다운로드 후 로드, 처리 후 삭제

## 1. 데이터 모델
변경 없음.

## 2. 구조 (services/ai-pipeline)
```
audio/
├── __init__.py
├── analysis.py   # analyze_audio(path) 순수 함수 + CLIMAX_WINDOW_S 상수
└── tasks.py      # audio.analyze_bgm(uri) — URL 처리·실패 표면화
worker.py         # include 추가
```
- deps 고정: librosa==0.11.0, soundfile==0.14.0

## 3. UI 구조
해당 없음

## 4. 검증 기준 (Evaluator)
- [ ] D-1: compileall + 유닛 — **합성 120BPM 클릭 트랙**(30s, 후반 10s 진폭 3배):
  bpm 120±3, beats 간격 ~0.5s, climax가 후반 증폭 구간과 겹침, 재실행 결정성
- [ ] D-2: 큐 왕복 — wav 파일 발행 → done + 결과 형식 확인
- [ ] D-3: 미존재 파일 → 잡 failed + 사유
- [ ] D-4: 문서 동기화 (index — 마일스톤 3 종료 표기)

## 5. 비범위 재확인
BGM 라이브러리/저장처/선택 UI — 마일스톤 4.
