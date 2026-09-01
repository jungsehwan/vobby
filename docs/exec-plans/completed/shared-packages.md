# Exec Plan: shared-packages

## 개요
- **기능**: @vobby/shared-types + @vobby/ui-tokens 신설, main-api 소비 전환
- **Plan**: `docs/01-plan/features/shared-packages.plan.md`
- **Design**: `docs/02-design/features/shared-packages.design.md`
- **시작일**: 2026-09-01

## 체크리스트

### 패키지 (Design §2.1~2.2)
- [x] shared-types: package.json/tsconfig + geo/auth/pipeline/api/index
- [x] ui-tokens: package.json/tsconfig + 토큰 2층 구조
- [x] 루트 workspaces 순서 재배열 (packages 먼저)
- [x] 두 패키지 빌드 검증 (D-1)

### main-api 소비 전환 (Design §2.3)
- [x] geo.types.ts 삭제 → shared import 교체
- [x] AuthProvider/ShortFormStatus/TokenPair/LoginResponse/TaskProgress 교체
- [x] typecheck/build (D-2) + 루트 빌드 순서 (D-3)

### 검증 (Design §4)
- [x] D-4: 부팅 + 유닛 테스트 (동작 불변)
- [x] D-5: 문서 동기화 + 그레이딩

## 기술 노트

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100 (UI 계층 범위 외 — 토큰 소비는 앱/웹 생성 시)
빌드: 성공 (packages→main-api 순서로 루트 빌드, typecheck 0)
갭: 없음 — D-1~D-5 전수 통과
지적: 없음
```

### 검증 실측 기록
- D-1: 두 패키지 dist(js+d.ts) 생성
- D-2: main-api가 geo/AuthProvider/ShortFormStatus/TokenPair/LoginResponse/TaskProgress를 shared에서 소비, typecheck 0
- D-3: dist 전체 삭제 후 루트 빌드 — shared-types → ui-tokens → main-api 순서 확인
- D-4: 유닛 6/6 + 부팅 /me 401 (동작 불변)
