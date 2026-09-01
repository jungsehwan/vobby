# Exec Plan: media-exif-timesync

## 개요
- **기능**: 갤러리 EXIF 추출 + 세션 Time-Sync 매칭 + 세션 상세 화면
- **Plan/Design**: `docs/01-plan|02-design/features/media-exif-timesync.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] expo-media-library 설치 + app.json 권한 문구
- [x] session_media 테이블 + media-db.ts
- [x] media-scan.service.ts (시간창 조회→EXIF→Time-Sync 이진탐색→upsert)
- [x] 세션 목록/상세 화면 + 훅
- [x] typecheck (D-1)
- [x] EXIF 주입 사진 실검증 (D-2~D-5)
- [x] 권한 거부·빈 상태 (D-6)
- [x] 그레이딩 + 문서 동기화 (D-7)

## 기술 노트
- 검증용 EXIF 사진은 Python(piexif, scratchpad venv)으로 생성 후 simctl addmedia 주입

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 100/100
빌드: 성공 (typecheck 0 — expo-media-library는 v57 신규 API 대신 legacy 경로 사용)
갭: 없음 — D-1~D-6 실측 통과 (빈 상태는 Maestro 단언 대신 스크린샷 증빙 — 텍스트 매칭 타이밍 이슈)
지적: 네이티브 모듈 추가 후 재빌드 필수 (Cannot find native module — expo run:ios 재실행으로 해결)
```

### 검증 실측 기록 (EXIF 주입 사진 4장, piexif 생성 → simctl addmedia)
- D-2: GPS 포함 사진 → source='exif', 좌표 126.99,37.665 (EXIF 그대로)
- D-3: GPS 없는 13:21 사진 → source='timesync', 13:20 포인트 좌표(126.986,37.661) 부여
- D-4: 최근접 포인트와 900s 차이 → 'none'(오좌표 금지), 시간창 밖 사진은 스캔 제외 (총 3/4장)
- D-5: 재스캔 후 로우 수 3 불변 (INSERT OR REPLACE 멱등)
- D-6: 사진 0장 세션 → "0장 스캔" + 빈 상태 문구(스크린샷), photos 권한 revoke(TCC — 위치와 달리 simctl 동작) → 안내 문구, 크래시 없음
