# Vobby

Stack(웹서비스) 프로젝트의 Claude Code 하네스에서 **플랫폼 비종속 프로세스 층만 추출**한 템플릿 위에서 시작하는 프로젝트.
하네스 이관일: 2026-08-31. 프로젝트 목적·스택 확정 후 `{placeholder}`를 채운다 (아래 체크리스트 참조).

## 사용법

1. 이 디렉토리 내용물을 새 앱 프로젝트 루트에 복사
2. `CLAUDE.md` / `ARCHITECTURE.md` / `docs/DESIGN.md` / `docs/QUALITY.md` / `.claude/skills/commit/SKILL.md` 의 `{placeholder}`를 앱 스택 확정 후 채움 (안내 주석 `<!-- -->` 블록은 채운 뒤 삭제)
3. 첫 기능부터 `AGENTS.md` 워크플로우(Plan→Design→ExecPlan→Implement→Evaluate→Complete) 적용 — 템플릿은 `docs/templates/`
4. `.claude/`를 저장소에 **추적**할 것 권장 — Stack에서는 `.gitignore` 처리되어 머신 간 하네스 유실이 실제로 발생했다

## 이관 매핑 (원본 → 이 팩)

| 원본 (stack-temp) | 이관본 | 상태 |
|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` | **골격 이관** — 부트스트랩 STEP1~3, 문서 신뢰 규칙, 검증 3단계, 커밋 규칙, push 문서 규칙, 하네스 이력 표. 빌드 명령·검증 도구는 placeholder |
| `AGENTS.md` | `AGENTS.md` | **거의 그대로** — Generator를 플랫폼 중립화(BE/FE → 계층 분할 선택), 브라우저 검증 → 실행 검증 |
| `docs/QUALITY.md` | `docs/QUALITY.md` | **프레임 이관** — 등급 체계·빌드 필수 유지, 점수 항목을 웹 계층 → 앱 계층으로 재구성 + Stack 견고성 6차원 요약 반영 |
| `docs/SECURITY.md` | `docs/SECURITY.md` | **원본 그대로 복사** — KISA 기반 언어 중립 체크리스트라 수정 불요 |
| `docs/product-specs/index.md` | 동일 경로 | **빈 틀** — "인덱스=진실 소스" 규칙 유지 |
| `docs/exec-plans/{active,completed}` + `tech-debt-tracker.md` | 동일 구조 | **빈 틀** |
| plan/design/exec-plan 실문서 구조 | `docs/templates/*.md` | **구조 역추출** — 실제 사용 중인 문서들(saas-support-calendar 등)의 섹션 구조를 템플릿화 |
| `.claude/skills/commit/SKILL.md` | 동일 경로 | **절차 이관** — 검증 명령 placeholder, "빌드 통과만으로 커밋 금지" 원칙 유지 |
| `ARCHITECTURE.md`, `docs/DESIGN.md` | 동일 경로 | **목차 골격만** — 내용이 Spring/React 종속이라 미이관, 스택 확정 후 작성 |
| 의존성 버전 고정 규칙 (CI 실사고 2회) | `CLAUDE.md` §빌드 | **교훈만 일반화** 이관 |
| 시크릿 평문 금지 규칙 | `docs/DESIGN.md` §7 | **원칙만** 이관 |

## 의도적으로 제외한 것 (웹서비스/Stack 종속)

- `docs/FRONTEND.md`, `DEPLOYMENT.md`, `docs/references/*` (db-schema, api-endpoints 등), `docs/guide/*` — 전부 Stack 도메인·웹 스택 종속
- CLAUDE.md의 엔티티 목록, env 키 목록, gradle/npm 빌드 명령, hbm2ddl·yml 가드 — 웹 구현 층
- 기능별 plan/design/analysis 실문서 51+26+20건 — Stack 기능 이력
- `stack-harness` 오케스트레이터 스킬, 에이전트 5종 정의, `loop-gate.js` Stop hook, pre-push hook — **원본이 이 mac 작업본에 존재하지 않아 추출 불가** (Windows 머신에만 존재). 필요하면 해당 머신에서 확보 후 같은 방식으로 일반화
- Chrome MCP 브라우저 검증 절차 — 앱에서는 "실행 검증(시뮬레이터/실기기)"으로 치환됨

## 새 프로젝트에서 추가로 정해야 할 것

- [ ] 앱 플랫폼/스택 → `ARCHITECTURE.md` §1
- [ ] 빌드·실행·검증 명령 → `CLAUDE.md` §빌드, commit 스킬 §1, `QUALITY.md` §1
- [ ] 실행 검증 수단 (시뮬레이터 자동화? 스크린샷 도구?) → `CLAUDE.md` 검증 §3
- [ ] 스키마 관리 방식 (마이그레이션 도구 유무) → `AGENTS.md` Data agent
- [ ] lock 파일 커밋 여부 (권장: 커밋 + lock 기반 CI 설치) → `CLAUDE.md` §의존성
- [ ] (웹서버 붙일 때) 인터페이스 참조 문서 신설 + push 문서 규칙에 연결
