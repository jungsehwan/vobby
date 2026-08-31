---
name: commit
description: >-
  Vobby 전용 — 변경사항을 최종 검증한 뒤 커밋 히스토리 양식(Conventional Commits + 한글)에 맞춰
  메시지를 정리하고 커밋한다(push 제외). 매번 검증·커밋 절차를 재입력하지 않기 위한 스킬.
  Triggers: /commit, 커밋, 커밋해, 검증 후 커밋, 최종검증 커밋, 양식대로 커밋, 커밋 정리, 커밋 진행.
---

# commit — 최종 검증 + 규칙 기반 커밋

이 저장소에 한해 "변경 검증 → 커밋 메시지 정리 → 커밋"을 반복 입력 없이 수행한다.
**커밋만 하고 push는 하지 않는다** (push는 사용자가 명령할 때만).
사용자가 인자를 주면(타입/스코프/메시지 힌트) 참고하고, 없으면 diff에서 스스로 추론한다.

## 0. 변경 범위 파악
- `git status --short` + `git diff --stat` 로 변경 파일과 성격을 분류.
- **이번 작업분만** 커밋. 관련 없는 파일·미완 변경은 stage 하지 않는다.

## 1. 최종 검증 (CLAUDE.md 검증 절차 준수 — 생략 불가)
> 빌드 통과만으로 커밋 금지. 코드 → 빌드 → 실행 검증 순서를 지킨다.

- 컴파일/타입체크: `npm run typecheck --workspaces --if-present` (+ Python 변경 시 `python -m compileall .`)
- 전체 빌드 (해당 시): `npm run build --workspaces --if-present`
- 실행 검증: 변경 대상별 수단으로 화면·동작 확인 — 모바일=시뮬레이터/Expo Go, 웹=브라우저, API=실호출, 워커=샘플 태스크 실행 (CLAUDE.md §개발 후 검증 절차)
- 실행 환경을 못 띄우는 상황이면 **커밋 보류**하고 사용자에게 알린다.

## 2. 커밋 메시지 규칙
**단일 소스: `docs/guide/git-convention.md`** — 반드시 읽고 그 형식을 따른다.
- 형식: `type(scope): 한글 요약` / type: feat·fix·docs·style·refactor·test·perf·chore
- 한 커밋에 하나의 작업. 모호한 요약(`update code` 류) 금지.
- **AI 작성 표기(`Co-Authored-By: Claude` 등) 절대 금지.**

## 3. 커밋 실행
- 이번 작업분만 `git add` (경로 명시, `git add -A` 금지)
- 커밋 후 `git log -1 --stat` 로 결과 확인·보고
- push는 하지 않는다
