# Exec Plan: backend-trip-model

## 개요
- **기능**: Trajectory→Trip 도메인 재구성 + 마이그레이션 스쿼시 (방향 정정 반영)
- **Plan/Design**: `docs/01-plan|02-design/features/backend-trip-model.*`
- **시작일**: 2026-09-01

## 체크리스트
- [x] shared-types: MediaCoordSource 공용화, ShortFormPublicView.stats 재정의
- [x] trip.entity 신설, trajectory 삭제, media/short_forms trip 참조
- [x] 마이그레이션 스쿼시 (신 InitialSchema 1개) + data-source 교체
- [x] DB drop→재적용, 멱등·가역 (D-2)
- [x] 공간 왕복 + path NULL (D-3)
- [x] 회귀: 부팅·auth 401·by-slug 404 (D-4)
- [x] db-schema.md·ARCHITECTURE·AGENTS(스쿼시 금지 조항) 동기화 (D-5)
- [x] 그레이딩

## 기술 노트
- 스쿼시는 배포 전 1회 한정 — 이후 금지 (AGENTS.md 명시)

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100 (UI 범위 외)
빌드: 성공 (typecheck 0, shared-types 재빌드 포함)
갭: 없음 — D-1~D-5 전수 통과
지적: 없음
```

### 검증 실측 기록
- D-2: DB drop→재적용 5테이블, 재실행 no-op, revert 0테이블→재적용 복원
- D-3: 제주 3점 경로 근사 ST_Length=80,773m, path NULL 트립 insert 정상, media.source CHECK 'oops' 거부
- D-4 회귀: 유닛 6/6, /me 401, 위조 kakao 401(실서버 경유), by-slug 200(trip 조인 stats: mediaCount·durationS) + 404 코드
- 시드 정리(CASCADE) 완료. 스쿼시는 배포 전 1회 — AGENTS.md에 금지 조항 명문화
