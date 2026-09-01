# Vobby — 취미 궤적 기반 AI 숏폼 자동 생성 플랫폼

GPS 궤적 + 촬영 미디어를 멀티모달 AI로 융합 분석해 9:16 숏폼 영상을 자동 생성·공유하는
모노레포 프로젝트 (모바일 앱 + 웹 + API + AI 파이프라인). 기획 원본: `docs/00-pm/project-charter-v2.0.md`

## 🚫 작업 시작 전 하네스 부트스트랩 — 절대 규칙

**코드를 단 한 줄이라도 수정하기 전에, 반드시 아래 파일들을 먼저 읽어라.**
**이 파일들을 읽지 않았으면 어떤 작업도 시작하지 마라. 예외 없음.**

이 규칙을 어기면 잘못된 컨벤션, 잘못된 도메인 모델을 사용하게 된다.
"간단한 수정"이라도 컨텍스트 없이 하면 반드시 실수한다.

### STEP 1: 필수 하네스 (매 세션, 매 작업 시작 전)

아래 3개를 반드시 Read 툴로 읽는다. 건너뛰기 금지:

1. `ARCHITECTURE.md` — 시스템 아키텍처, 기술 스택, 도메인 모델
2. `docs/DESIGN.md` — 코드 작성 컨벤션
3. `AGENTS.md` — 에이전트 역할, 워크플로우, 핸드오프 프로토콜

### STEP 2: 작업 유형별 추가 문서 (해당 시 반드시 읽음)

- 도메인/비즈니스 로직·파이프라인 이해 → `docs/00-pm/project-charter-v2.0.md` (기획 원본)
- 새 기능 구현 → `docs/product-specs/index.md` (현황 파악) + 해당 기능의 plan/design 문서
- 실행 중인 작업 → `docs/exec-plans/active/` 내 해당 실행계획
- 코드 품질 검증 → `docs/QUALITY.md`
- 보안 관련 → `docs/SECURITY.md`
<!-- 프로젝트 성장에 따라 항목 추가: 데이터 스키마, 플랫폼별 가이드 등 -->

**⚠️ plan/design 문서 신뢰 규칙**: 문서는 완료 후에도 보존된다(이력·재구현 베이스). 참조 전 반드시:
1. `docs/product-specs/index.md`에서 해당 기능의 **현재 상태**(Impl/제외/부분구현)를 먼저 확인 — 인덱스가 진실 소스
2. 문서 **최상단 Status/⚠️배너**를 확인 — `⛔ 제외`·`부분 무효` 배너가 있으면 해당 범위는 참조 금지
3. 문서와 현행 코드가 다르면 **코드가 우선**
4. 작업이 기존 문서의 전제를 무효화하면(모델 제거, 범위 취소 등) **그 문서 최상단에 배너를 추가**할 것

### STEP 3: 하네스를 읽은 후에만 코드 작업을 시작한다

**하네스 변경 이력:** (하네스 자체를 바꿀 때마다 여기에 기록 — 변경 사유가 곧 재발 방지 지식이다)

| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-08-31 | Stack 하네스 프로세스 층 이관 (초기 커밋) | 전체 | 검증 규율·문서 신뢰 규칙·워크플로우를 프로젝트 첫날부터 적용 |
| 2026-08-31 | 기획서 v2.0 기반 placeholder 확정 | CLAUDE/ARCHITECTURE/DESIGN/QUALITY/commit스킬 | 스택 확정(RN+Next+NestJS+Python)에 따른 빌드·검증 명령 구체화 |
| 2026-08-31 | 로컬 인프라를 brew 네이티브 → Docker Compose로 전환 | CLAUDE §인프라, ARCHITECTURE, .env.example | brew redis가 기존 Colima Docker redis(:6379)와 바인딩 충돌 — 접속 경로 따라 다른 인스턴스에 붙는 위험. 전용 컨테이너(:5433/:6380)로 격리 |
| 2026-08-31 | 커밋 규칙을 `docs/guide/git-convention.md`로 단일화 | CLAUDE §커밋, commit 스킬 | 규칙이 CLAUDE.md·스킬 두 곳에 분산 — 단일 소스로 모으고 상호 참조 (wikidocs 332862 타입 체계 반영) |
| 2026-09-01 | 제품 방향 정정: 직접 GPS 기록 폐기 → 기존 위치 이력 소싱 | ARCHITECTURE, index(기능 4 ⛔·4a/4b 신설), 기능 4·5 문서 배너 | 기획서의 "백그라운드 로깅" 문구를 그대로 구현했으나 실의도는 갤러리 EXIF·구글 타임라인·GPX 활용 — **마일스톤 착수 전 핵심 플로우 사용자 재확인 필수** |

---

## Git 커밋 규칙
**단일 소스: `docs/guide/git-convention.md`** — 형식(`type(scope): 한글 요약`), 타입 표, 커밋 단위 원칙.
핵심 절대 규칙 (요약):
- 커밋 메시지에 `Co-Authored-By: Claude` 등 AI 작성 표기를 절대 포함하지 않는다
- 커밋 메시지는 순수하게 변경 내용만 기술한다
- 커밋·push는 사용자가 명령할 때만 수행한다 (자동 커밋 금지)

## 프로젝트 구조 (모노레포 — npm workspaces)

- `apps/mobile/` — React Native (Expo) iOS/Android 앱 — GPS 로깅, 갤러리/EXIF
- `apps/web/` — Next.js 사용자 웹 & SNS 공유 뷰어 (`/v/:id`)
- `apps/admin/` — Next.js 관리자 대시보드
- `services/main-api/` — NestJS 메인 API (인증, CRUD, 큐잉)
- `services/ai-pipeline/` — Python FastAPI+Celery 워커 (vision/spatial/director/renderer)
- `packages/shared-types/` — TS 공통 인터페이스/DTO
- `packages/ui-tokens/` — 공통 디자인 토큰

의존 방향: apps → main-api → Redis 큐 → ai-pipeline. 상세는 `ARCHITECTURE.md` §2.

## 빌드 & 실행

### ⚠️ 빌드/실행 전 중복 프로세스 정리 원칙

빌드나 실행 전에 기존 빌드 데몬·에뮬레이터·개발 서버 프로세스의 중복 여부를 확인하고 정리한다.
방치하면 프로세스가 누적되어 PC 리소스가 고갈된다.

```bash
# 잔여 dev 서버/워커/시뮬레이터 프로세스 확인
ps aux | grep -E 'next dev|expo start|nest start|celery|Simulator' | grep -v grep
# Metro/watchman 정리 (Expo)
watchman shutdown-server 2>/dev/null; pkill -f "expo start" 2>/dev/null
# Next/Nest dev 서버 정리
pkill -f "next dev" 2>/dev/null; pkill -f "nest start" 2>/dev/null
```

### 빌드 명령

```bash
# ── TypeScript 워크스페이스 (루트에서) ──
# 컴파일/타입체크만 (가장 빠른 검증 — packages 빌드 선행 포함)
npm run typecheck

# 전체 빌드 (web/admin/main-api)
npm run build --workspaces --if-present

# 개별 실행
npm run dev -w apps/web            # 사용자 웹 (localhost:3000)
npm run dev -w apps/admin          # 관리자 웹
npm run start:dev -w services/main-api  # NestJS API
npx expo start -c                  # 모바일 (apps/mobile에서) — iOS 시뮬레이터: i / Android: a

# ── Python 워커 (services/ai-pipeline에서) ──
source .venv/bin/activate
python -m compileall .             # 문법 검증
pytest                             # 테스트
celery -A worker worker --loglevel=info  # 워커 실행

# ── 인프라 (Colima Docker — docker-compose.yml) ──
# vobby 전용 컨테이너: vobby-db(:5433, PG18+PostGIS), vobby-redis(:6380)
# 주의: 5432(brew PG15)·6379(타 프로젝트 Docker redis)는 다른 프로젝트용 — 절대 사용 금지
docker-compose up -d
docker ps --filter name=vobby            # 상태 확인 (healthy 확인)
psql "postgresql://vobby:vobby@localhost:5433/vobby"   # DB 접속
redis-cli -p 6380 ping                    # Redis 확인
```

### 🚨 의존성 버전 고정 규칙 (Stack 실사고 2회 이관 — 원인 동일)

lock 파일이 저장소에 없으면 로컬과 CI가 서로 다른 버전을 설치해 "로컬 OK / CI 실패"가 반복된다.
- **원칙 1(권장)**: lock 파일(`package-lock.json`/`Podfile.lock`/`gradle.lockfile` 등)을 저장소에 커밋하고 CI는 lock 기반 설치(`npm ci` 등)를 쓴다.
- **원칙 2(차선)**: lock을 못 올리는 사정이 있으면, 새 의존성은 캐럿(`^`)/범위 지정 없이 **정확한 버전으로 고정**한다.
- CI만 깨지는 의존성 오류가 나면 로컬에서 lock 삭제 후 재설치로 CI 조건을 재현해 확인한다.

---

## 개발 후 검증 절차 (필수)

**⚠️ 모든 구현 작업 완료 후 반드시 아래 3단계를 모두 수행한다. 실행 검증은 생략 불가.**
빌드만 통과하고 실제 실행 검증을 건너뛰는 것은 허용하지 않는다.

### 1. 빌드 검증 (항상)
- 컴파일/타입체크 + 전체 빌드 성공 확인

### 2. 로직 검증 (해당 시)
- 유닛/통합 테스트 실행
- 데이터 계층 수정 시: 마이그레이션/스키마 반영 확인
- 외부 API 연동 수정 시: 실제 호출로 응답 검증

### 3. 실행 검증 (항상)
**실제로 구동해서 확인한다** — 변경 대상별 수단:
- `apps/mobile` → iOS 시뮬레이터/Android 에뮬레이터 또는 Expo Go 실기기
- `apps/web`, `apps/admin` → `npm run dev` 후 브라우저 확인
- `services/main-api` → dev 서버 기동 후 실제 HTTP 호출로 응답 검증
- `services/ai-pipeline` → 샘플 입력으로 해당 태스크 실행, 산출물(스코어/EDL/영상) 확인

공통 절차:
1. 변경된 화면으로 이동, **스크린샷/화면 확인** — UI 렌더링 정상 확인
2. **주요 동작 테스트** — 탭/입력/저장 등 사용자 액션이 화면에 반영되는지 확인
3. **로그/에러 콘솔 확인** — 크래시·에러 로그 없는지 확인
4. 문제 발견 시 수정 후 재검증

**백엔드/데이터 계층만 수정한 경우에도** 그 데이터를 사용하는 화면에서 정상 표시를 확인한다.

---

## 기능별 참조 문서

| 작업 영역 | 참조 문서 |
|-----------|----------|
| 프로젝트 진입점 | `README.md` |
| 시스템 아키텍처 | `ARCHITECTURE.md` |
| 설계 컨벤션 | `docs/DESIGN.md` |
| 에이전트 역할/워크플로우 | `AGENTS.md` |
| 코드 품질 기준 | `docs/QUALITY.md` |
| 보안 체크리스트 | `docs/SECURITY.md` |
| 도메인 개념 / 기획 원본 | `docs/00-pm/project-charter-v2.0.md` |
| Git 커밋 규칙 | `docs/guide/git-convention.md` |
| DB 스키마 | `docs/references/db-schema.md` |
| 기능 명세 목록 (진실 소스) | `docs/product-specs/index.md` |
| 실행 계획 (활성) | `docs/exec-plans/active/` |
| 기술부채 추적 | `docs/exec-plans/tech-debt-tracker.md` |
| 문서 템플릿 (plan/design/exec-plan) | `docs/templates/` |

---

## git push 시 문서 업데이트 규칙

코드 변경 사항이 문서에 반영되어야 할 경우, 해당 참조 문서도 함께 업데이트한다.
- 데이터 모델/스키마 추가·변경 → 스키마 참조 문서 (프로젝트에 맞게 지정)
- 외부 인터페이스(API/딥링크/IPC 등) 추가·변경 → 인터페이스 참조 문서
- 새 기능 추가 → `CLAUDE.md` 참조 테이블 + `docs/product-specs/index.md` 상태 업데이트
- 아키텍처/컨벤션 변경 → `ARCHITECTURE.md`, `docs/DESIGN.md` 등 하네스 문서 갱신
- **연관 없는 파일은 절대 수정하지 않는다**
