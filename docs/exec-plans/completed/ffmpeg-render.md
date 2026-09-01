# Exec Plan: ffmpeg-render

## 개요
- **기능**: EDL → 9:16 mp4 합성 (Ken Burns·BGM 먹싱), 로컬 스토리지 규약
- **Plan/Design**: `docs/01-plan|02-design/features/ffmpeg-render.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] MEDIA_STORAGE_ROOT/RENDER_FONT_PATH env 규약
- [x] renderer/commands.py(순수)·db.py·tasks.py + worker include
- [x] commands 유닛 (D-1)
- [x] 풀체인 렌더 + ffprobe (D-2), 프레임 육안 (D-3)
- [x] 원본 누락·FFmpeg 오류 표면화 (D-4), 재실행 (D-5)
- [x] 그레이딩 + 문서 동기화 (D-6)

## 기술 노트

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100
빌드: 성공 (compileall + commands 유닛)
갭: 없음 — D-1~D-6 통과. Intro 지도는 설계대로 자리 표시자 (기능 12 교체 지점)
지적: 구현 중 수정 1건 — brew FFmpeg 9에 drawtext 필터 없음 → 텍스트는 Pillow 카드(PNG)+정적 클립으로 교체
      (플랫폼 독립적 — 배포 환경 FFmpeg 빌드 옵션 비의존)
```

### 검증 실측 기록
- D-2 풀체인: 시드(실사진 storage_key) → spatial → director → renderer →
  ffprobe: 30.0s 정각, 1080x1920 h264 + aac(BGM 먹싱), status=done + video_key/duration_s (mp4 699KB)
- D-3 프레임 육안: 실사진 9:16 풀프레임 Ken Burns(23s), outro 한글 통계 카드("이동 8.7km/60분의 기록/사진 4장") 정상
- D-4: storage_key 누락 컷 → failed "원본 누락: media ..." + error_message DB 기록 (컷 무단 스킵 없음)
- D-5: 재실행 → 산출물 덮어쓰기(mtime 갱신)·status done
