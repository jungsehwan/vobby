# Exec Plan: db-schema-foundation

## 개요
- **기능**: NestJS 골격 + TypeORM 마이그레이션 체계 + 기반 도메인 스키마 4종 (PostGIS)
- **Plan**: `docs/01-plan/features/db-schema-foundation.plan.md`
- **Design**: `docs/02-design/features/db-schema-foundation.design.md`
- **시작일**: 2026-09-01

## 체크리스트

### 도메인/데이터 (Design §1~2)
- [x] NestJS 프로젝트 생성 (`services/main-api`, 워크스페이스 편입, typecheck/build 스크립트)
- [x] TypeORM + pg 의존성 추가, DataSource 설정 (synchronize:false, DATABASE_URL)
- [x] 엔티티 4종 작성 (User/Trajectory/Media/ShortForm — Design §1 스펙)
- [x] InitialSchema 마이그레이션 작성 (postgis 확장 + 테이블 + CHECK + 인덱스)
- [x] `migration:run` 적용
- [x] `docs/references/db-schema.md` 신설 + ARCHITECTURE §3 동기화
- [x] 컴파일 검증 (typecheck + build)

### UI (Design §3)
- 해당 없음 (데이터 계층 전용)

### 검증 (Design §4)
- [x] D-2: 테이블·인덱스·확장 존재 확인
- [x] D-3: 마이그레이션 멱등성 (재실행 no-op, revert→재적용)
- [x] D-4: LineStringZM insert → ST_Length/ST_LocateAlong 왕복
- [x] D-5: CHECK 제약 거부 동작
- [x] Design 대비 갭 분석 + QUALITY.md 그레이딩
- [x] 문서 업데이트 (product-specs index)

## 기술 노트
- Node 25 로컬이지만 engines >=22 — CI/배포는 LTS 기준 예정
- uuidv7()는 PG18 내장 — 마이그레이션에서 default로 직접 사용 (uuid-ossp 불필요)

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100 (UI 계층 30점은 범위 외 — 데이터 계층 전용 기능)
빌드: 성공 (typecheck + nest build)
갭: 없음 — Design §4 D-1~D-6 전수 통과
지적: 없음
```

### 검증 실측 기록
- D-2: 도메인 테이블 4종 + GIST 2종 포함 인덱스 5종 생성 확인
- D-3: 재실행 no-op → revert 시 테이블 0 → 재적용 시 4 (멱등·가역)
- D-4: 북한산 샘플 LineStringZM insert → ST_Length=1,170m, ST_LocateAlong(M=epoch)이 정확한 시점 좌표(고도 240m 포함) 반환, ST_Z=605
- D-5: provider CHECK·status CHECK·(provider,uid) UNIQUE 전부 거부 확인, uuidv7 기본값 동작(시간 정렬 프리픽스), CASCADE 정리 확인
- 실행 검증: dist 빌드 후 부팅 — TypeOrmCoreModule 초기화(실제 DB 연결) + HTTP 404 응답(컨트롤러 없음, 정상)
