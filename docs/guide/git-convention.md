# Git 커밋 규칙

> 커밋 규칙의 단일 소스. CLAUDE.md §Git 커밋 규칙과 `.claude/skills/commit/SKILL.md`는 이 문서를 참조한다.
> 참고: [깃 활용 가이드 07.02 Commit 메시지 규칙](https://wikidocs.net/332862) (2026-08-31 반영)

## 1. 메시지 형식

```
type(scope): 한글 요약
```

- **type**: 아래 표에서 선택
- **scope**(선택): 기능 slug 또는 워크스페이스명 (예: `mobile-gps-logging`, `main-api`)
- **요약**: 한글로 변경 내용을 명확하게. `update code`, `fix bug` 같은 모호한 표현 금지
- **본문**(선택): 변경 이유·주의점을 불릿으로

```
feat(mobile-gps-logging): 백그라운드 GPS 로깅 추가
fix(main-api): 로그인 토큰 만료 오류 수정
docs: 커밋 규칙 문서 추가
```

## 2. 커밋 타입

| 타입 | 용도 |
|------|------|
| feat | 새로운 기능 추가 |
| fix | 버그 수정 |
| docs | 문서 수정 |
| style | 코드 스타일 수정 (기능 변경 없음) |
| refactor | 코드 구조 개선 (동작 동일) |
| test | 테스트 코드 추가/수정 |
| perf | 성능 개선 |
| chore | 기타 작업 (빌드 설정, 의존성 등) |

## 3. 커밋 단위 원칙

- **한 커밋에 하나의 작업** — 기능 추가와 리팩토링을 한 커밋에 섞지 않는다
- 이번 작업분만 stage — 경로를 명시해 `git add` (`git add -A` 금지)
- 관련 없는 파일·미완성 변경은 커밋에 포함하지 않는다

## 4. 절대 규칙

- 커밋 전 검증 필수 — 빌드 통과만으로 커밋 금지, 실행 검증까지 (CLAUDE.md §개발 후 검증 절차)
- AI 작성 표기(`Co-Authored-By: Claude` 등) **절대 금지** — 메시지는 순수하게 변경 내용만
- 커밋·push는 사용자가 명령할 때만 (자동 커밋 금지)
- 코드 변경이 문서에 영향을 주면 해당 문서도 같은 커밋에 (CLAUDE.md §push 시 문서 업데이트 규칙)

## 5. 실행 절차

1. **`/readycommit`** — 커밋 전 코드 정리·검토: 불필요 주석 제거, 버그 중심 리뷰, DESIGN.md 컨벤션 검증 (`.claude/skills/readycommit/SKILL.md`)
2. **`/commit`** — 빌드·실행 검증 → 메시지 정리 → 커밋 (`.claude/skills/commit/SKILL.md`)

코드 변경 커밋은 1→2 순서를 기본으로 한다. 문서만 변경 시 `/commit` 단독 가능.
