# Agent Roles & Workflow

## 에이전트 역할 정의

### Planner Agent
- **역할**: 요구사항 분석, Plan/Design 문서 생성
- **입력**: 사용자 요구사항, 기존 시스템 분석
- **출력**: `docs/01-plan/features/{feature}.plan.md`, `docs/02-design/features/{feature}.design.md`
- **참조**: `ARCHITECTURE.md`, 데이터 스키마 문서, 기존 코드 패턴

### Generator Agent (플랫폼별 분할 가능)
- **역할**: 코드 구현
- **입력**: Design 문서, 실행계획
- **출력**: 워크스페이스별 산출물 — Mobile(화면/훅/서비스), Web(페이지/컴포넌트), API(NestJS 모듈: controller/service/entity/dto), Pipeline(Celery 태스크/분석 모듈), Shared(공통 타입)
- **참조**: `docs/DESIGN.md` (컨벤션), 기존 유사 기능 코드
- 규모가 커지면 워크스페이스 단위로 분할 (예: Generator-Client / Generator-API / Generator-Pipeline). 분할 시 `packages/shared-types`의 경계 인터페이스를 먼저 합의하고 병렬 진행.

### Evaluator Agent
- **역할**: 구현 결과 검증 (maker ≠ checker — 구현자가 스스로 검증만 하고 끝내지 않는다)
- **검증 항목**:
  - 빌드 성공 여부 (`npm run typecheck/build --workspaces --if-present`, Python은 `compileall`+`pytest`)
  - 로직 검증 (테스트/실호출)
  - 실행 검증 (모바일=시뮬레이터/Expo Go, 웹=브라우저, API=실호출, 워커=샘플 태스크)
  - Design 문서 대비 구현 완성도 (갭 분석)
- **참조**: `docs/QUALITY.md`

### Data/Migration Agent (데이터 계층이 생기면 활성화)
- **역할**: 스키마 변경, 마이그레이션 스크립트 작성
- **주의**: 스키마 변경의 단일 소스는 `services/main-api`의 마이그레이션 (ORM 마이그레이션 도구 — 마일스톤 1에서 TypeORM/Prisma 확정). **자동 스키마 동기화(synchronize/hbm2ddl류) 금지** — 반드시 마이그레이션 파일로. Python 워커는 스키마를 변경하지 않는다.
- **참조**: `docs/references/db-schema.md` (마일스톤 1에서 신설 예정)

---

## 실행 워크플로우

```
1. Plan      → docs/01-plan/features/{feature}.plan.md
2. Design    → docs/02-design/features/{feature}.design.md
3. Exec Plan → docs/exec-plans/active/{feature}.md
4. Implement → 코드 구현
5. Evaluate  → 빌드/로직/실행 검증
6. Complete  → exec-plan을 completed/로 이동, 인덱스 업데이트
```

### 단계별 상세

**Step 1-2: Plan & Design**
- Planner가 요구사항을 분석하여 Plan 문서 작성 (배경/현행 동작은 **코드 근거**로 기술)
- 승인 후 Design 문서 작성 (데이터 모델, 인터페이스, UI 설계, 검증 기준)
- `docs/product-specs/index.md`에 상태 업데이트

**Step 3: Exec Plan (실행계획)**
- Design을 구현 단위로 분해한 체크리스트 (`docs/templates/exec-plan.md` 사용)
- 각 항목: `[ ]` 미완료, `[x]` 완료
- 구현 중 사용자 피드백/추가 개발은 "추가 개발 — 날짜 (사유)" 섹션으로 append (이력 보존)

**Step 4: Implement**
- Generator가 exec-plan의 미완료 항목을 순서대로 구현
- 각 항목 완료 시 `[x]`로 업데이트, 컴파일 검증 필수

**Step 5: Evaluate**
- Evaluator가 전체 구현 검증, QUALITY.md 기준 그레이딩
- 미달 시 Generator에게 피드백 → 재구현 (Build↔Evaluate 반복)

**Step 6: Complete**
- `docs/exec-plans/active/{feature}.md` → `docs/exec-plans/completed/`로 이동
- `docs/product-specs/index.md` 상태를 "Impl"로 업데이트

---

## 컨텍스트 핸드오프 프로토콜

새 에이전트(또는 새 세션)가 작업을 시작할 때 읽는 순서:

```
1. CLAUDE.md          → 빌드 규칙, 참조 테이블
2. ARCHITECTURE.md    → 시스템 구조, 기술 스택, 도메인 모델
3. docs/DESIGN.md     → 코드 컨벤션
4. exec-plan          → 현재 진행 중인 실행계획
```

이 4-file bootstrap로 에이전트는 프로젝트 컨텍스트를 확보한다.

---

## 실행계획 템플릿

→ `docs/templates/exec-plan.md` 참조 (단일 소스, 여기 복제 금지 — drift 방지)
