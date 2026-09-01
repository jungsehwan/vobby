# Exec Plan: api-auth-foundation

## 개요
- **기능**: OAuth(Google·Kakao) 재검증 + JWT/refresh 회전 인증
- **Plan**: `docs/01-plan/features/api-auth-foundation.plan.md`
- **Design**: `docs/02-design/features/api-auth-foundation.design.md`
- **시작일**: 2026-09-01

## 체크리스트

### 도메인/데이터 (Design §1~2)
- [x] 의존성 추가 (@nestjs/jwt·passport·passport-jwt·google-auth-library·class-validator 등)
- [x] RefreshToken 엔티티 + 마이그레이션
- [x] provider 검증기 (인터페이스 + Google/Kakao 구현, 타임아웃·에러 매핑)
- [x] UsersService.upsertByProvider
- [x] AuthService (login/refresh 회전/logout) + 컨트롤러 + DTO 검증
- [x] JWT 전략·가드 + GET /me
- [x] 컴파일 검증

### 검증 (Design §4)
- [x] D-2: 마이그레이션 적용·멱등
- [x] D-3: 유닛 테스트 (스텁 검증기)
- [x] D-4: 실호출 401/에러 코드
- [x] D-5: DB에 refresh 해시만 저장 확인
- [x] 그레이딩 + 문서 동기화 (db-schema.md, index)

## 기술 노트
- 실토큰 E2E는 Google/Kakao 콘솔 앱 등록(사용자 외부 작업) 후 별도 수행

## 완료 보고 — 2026-09-01

### Evaluator 그레이딩 (QUALITY.md)
```
등급: A
점수: 해당 항목 100/100 (UI 계층은 범위 외 — API 전용)
빌드: 성공 (typecheck 에러 0 + nest build)
갭: 없음 — Design §4 D-1~D-6 전수 통과. 단, 실토큰 E2E는 설계대로 콘솔 앱 등록 후 별도 수행
지적: 구현 중 수정 2건 — @nestjs/passport v12는 PassportModule.register() 필수(부팅 DI 실패),
      jsonwebtoken v9 expiresIn 타입 좁힘 필요
```

### 검증 실측 기록
- 유닛 6/6: 가입/재로그인 upsert, 위조 토큰 401, 회전 후 재사용 거부, 존재하지 않는 토큰 거부, logout 멱등
- 실호출(HTTP): 무토큰·위조JWT /me=401, 빈 바디=400, 위조 kakao 토큰=401(실 카카오 서버 재검증 경유),
  google 클라이언트 ID 미설정=502(AUTH_PROVIDER_UNAVAILABLE), 위조 refresh=401
- 성공 경로(HTTP+실DB): 심은 refresh로 회전 200 → 이전 토큰 재사용 401 → 발급 JWT로 /me 200 → logout 204
- D-5: DB에 sha256 해시만 존재, 회전·로그아웃 후 전부 revoked 확인. 테스트 데이터 CASCADE 정리
