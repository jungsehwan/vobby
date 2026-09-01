# Main API 인증 기반 — OAuth 검증 + JWT 발급 (api-auth-foundation)

> Status: Approved (2026-09-01 — 기능 진행 지시에 따라 Plan~구현 일괄 승인)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 인증 코드 없음 — `services/main-api`는 컨트롤러 없는 부팅 골격 (커밋 `a56df6c`)
- `users` 테이블 존재: provider(text CHECK google|kakao) + provider_uid UNIQUE — OAuth 계정 매핑 준비됨

### 1.2 재사용 가능한 기존 인프라
- TypeORM DataSource + 마이그레이션 러너 (`src/database/migrate.ts`)
- `@nestjs/config` 전역 등록, `.env` 주입 체계
- User 엔티티 (`src/domain/user/user.entity.ts`)

### 1.3 관련 데이터/모델 현황
- refresh token 저장처 없음 — 스키마 추가 필요 (이 기능의 마이그레이션 범위)

## 2. 사용자 요구 (원문 요약)

기획서 §1 "Main API: 회원 인증(OAuth)" + 2026-09-01 결정: 제공자는 Google·Kakao (MVP).

## 3. 범위 / 비범위

### 범위 (In scope)
- POST `/auth/login` — provider 토큰 검증 → 유저 upsert → 자체 JWT 발급
- POST `/auth/refresh` — refresh 회전(rotate), POST `/auth/logout` — refresh 무효화
- GET `/me` — JWT 가드 동작 확인용 최소 프로필 조회
- `refresh_tokens` 테이블 마이그레이션 (해시 저장)
- provider 검증기 추상화 (Google idToken / Kakao accessToken)

### 비범위 (Out of scope)
- Apple 로그인 (iOS 출시 전 확장 — provider CHECK 교체로 대응)
- 클라이언트(앱/웹) 로그인 UI — 마일스톤 2
- **실제 Google/Kakao 개발자 콘솔 앱 등록** — 외부 작업, 사용자 수행 필요 (§6)
- 권한/역할(RBAC), 회원 탈퇴·프로필 수정

## 4. 요구사항 상세
- 모바일 클라이언트가 네이티브 SDK로 획득한 provider 토큰을 서버가 재검증하는 구조 (서버 리다이렉트 방식 아님 — RN 표준 패턴)
- access token은 단기 JWT, refresh는 불투명 토큰을 DB에 해시로만 저장
- Kakao 이메일 미제공 시에도 가입 가능해야 함 (users.email nullable 활용)

## 5. 방어적 AC (실패 모드 선반영)
- 위조/만료 provider 토큰: 401 + 명확한 에러 코드 (500 금지)
- refresh 재사용(탈취 시나리오): 이미 회전된 토큰 제시 → 거부
- 동일 계정 동시 로그인: 각자 refresh 발급 — 서로 무효화하지 않음
- provider 응답 지연/실패: 타임아웃 후 502류 명시 응답, 무한 대기 금지

## 6. 오픈 이슈 / 결정 대기
- Google/Kakao 콘솔 앱 등록 및 클라이언트 ID 발급 — **사용자 외부 작업**. 발급 전까지 실토큰 E2E 불가 → 검증기 스텁으로 로직 검증 + 실토큰 검증은 등록 후 수행
- access TTL 기본 1h / refresh 30d — 운영 조정은 env로
