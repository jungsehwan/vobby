# 코드 작성 컨벤션

> 스택: TypeScript (Expo RN / Next.js / NestJS) + Python 3.11 (FastAPI + Celery).
> 원칙: 컨벤션은 "예시 코드"와 함께 기술해야 에이전트가 흉내낼 수 있다 (규칙 나열만으로는 drift 발생 — Stack 운영 경험).
> 코드베이스가 커지면서 실제 패턴이 확정되면 예시를 실코드 발췌로 교체할 것.

## 1. 공통 원칙
- 기존 코드 패턴 우선 — 새 패턴 도입은 이 문서 갱신과 함께만
- 계층 분리: UI에 비즈니스 로직 금지 (화면 → 훅/서비스 → API 클라이언트)
- 실패는 조용히 삼키지 않는다 — catch 후 무시 금지, 로깅+사용자 피드백 또는 재던지기
- 앱↔웹↔API 간 공유 타입은 반드시 `packages/shared-types`에 정의 (중복 선언 금지)

## 2. 명명 규칙

### TypeScript (apps/*, services/main-api, packages/*)

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 (컴포넌트) | PascalCase.tsx | `TrajectoryMap.tsx` |
| 파일 (그 외) | kebab-case.ts | `render-job.service.ts` |
| 화면(Expo Router/Next App Router) | 라우트 디렉토리 + `page.tsx`/`index.tsx` | `app/v/[id]/page.tsx` |
| NestJS 계층 | `*.controller.ts` / `*.service.ts` / `*.module.ts` / `*.entity.ts` | `short-form.service.ts` |
| DTO | `*.dto.ts`, 클래스 접미사 Dto | `CreateShortFormDto` |
| 훅 | `use` 접두사 | `useRenderProgress` |
| (mobile) 모듈 파일명 | Metro asset 확장자(.db·.json 등)와 겹치는 접미사 금지 | `recording-db.ts` (O) / `recording.db.ts` (X — asset으로 해석됨) |

### Python (services/ai-pipeline)

| 대상 | 규칙 | 예시 |
|------|------|------|
| 모듈/파일 | snake_case.py | `poi_clustering.py` |
| 클래스 | PascalCase | `BeatOnsetDetector` |
| Celery 태스크 | 동사_목적어, 모듈 경로 명시 | `analyze_trajectory`, `render_shortform` |
| 함수/변수 | snake_case, 타입 힌트 필수 | `def score_media(path: Path) -> MediaScore:` |

## 3. 디렉토리/모듈 배치 규칙
- 기능 코드는 해당 워크스페이스 내부에만 — 워크스페이스 간 직접 상대경로 import 금지, `packages/*` 경유
- `apps/mobile`: 화면은 `app/`(expo-router), 로직은 `src/features/{도메인}/` (hooks/services/components)
- `services/main-api`: 도메인은 `src/domain/{도메인}/` (entity/service/controller/dto), 인프라는 `src/database/`(DataSource·마이그레이션)·`src/queue/`(Celery 발행) — 실구조 기준
- ESM 주의: 모듈↔서비스 상호 참조 금지 — 공유 DI 토큰은 `*.tokens.ts`로 분리 (순환 import TDZ 사고, queue-worker-foundation)
- 검증/운영 스크립트는 `scripts/` (tsconfig.build 제외 영역) — npm 스크립트로 진입점 노출
- `services/ai-pipeline`: 파이프라인 단계별 패키지 고정 — `vision/`, `spatial/`, `director/`, `renderer/` + 공용은 `common/`

## 4. 상태관리 패턴
- 서버 상태: TanStack Query (앱/웹 공통) — 수동 fetch+useState 금지
- 클라이언트 전역 상태: 최소화. 필요 시 Zustand (Redux 도입 금지)
- 렌더링 진행률 등 실시간 값: 폴링 훅으로 캡슐화 (`useRenderProgress`) — 화면에서 직접 인터벌 관리 금지

## 5. 데이터 접근 패턴
- Main API: TypeORM(2026-09-01 확정) 리포지토리를 서비스 계층에서만 사용, 컨트롤러에서 직접 쿼리 금지
- 공간 쿼리(PostGIS)는 전용 리포지토리 메서드로 격리 (`trajectory.repository.ts`) — raw SQL 산재 금지
- Python 워커의 DB 접근은 읽기 전용을 기본으로, 쓰기는 상태 갱신 테이블에 한정 (소유권: 스키마 변경은 Main API 쪽 마이그레이션이 단일 소스)

## 6. 에러 처리·로깅 규약
- Main API: NestJS ExceptionFilter로 일관된 에러 응답 `{ code, message }`. 도메인 에러는 커스텀 예외 클래스
- 파이프라인: 태스크 단계별 실패 격리 — 한 미디어 분석 실패가 전체 잡을 죽이지 않게 하고, 잡 상태(Redis)에 실패 사유 기록
- 재시도가 있는 태스크는 **멱등**하게 작성 (같은 입력 재실행 시 중복 산출물 금지)
- 클라이언트: 사용자에게 보이는 실패는 토스트/에러 화면으로 표면화, console.log 방치 금지

## 7. 설정값 관리
- **시크릿(토큰/키/DB 비밀번호)은 코드·설정파일에 평문 금지** — `.env`(gitignore됨)로만 주입, `.env.example`에 키 이름만 커밋
- 비-시크릿(URL, 경로, 모드)은 평문 OK
- 워크스페이스별 `.env` 분리 (main-api / ai-pipeline / web). 모바일 공개 설정은 `app.config.ts`의 `extra`로
