# 여행 업로드 — 모바일→서버 연결 (trip-upload)

> Status: Approved (2026-09-01 — 권장사항 진행 지시)
> 작성일: 2026-09-01

## 1. 배경 / 현재 동작 (코드 근거)

### 1.1 기존 프로세스
- 모바일은 여행을 **로컬에만** 보유 (trips/trip_media SQLite) — 서버 전송 경로 없음
- 서버 trips/media 테이블·인증(JWT)·큐는 준비됨 — 그러나 **여행 생성 API 없음** (마일스톤 3 AI 분석의 대상이 서버에 올라올 수 없음)
- 모바일 trip id는 결정적(`trip-{시작epoch}-{장수}`) — 재계산 시에도 같은 내용이면 같은 id

### 1.2 재사용 가능한 기존 인프라
- JWT 가드(`JwtAuthGuard`), GeoLineStringZM 규약, media.source 규약 (전부 shared-types)
- 모바일 검증 체계 (Maestro + 시드 사진, host SQL 조회)

## 2. 사용자 요구 (원문 요약)
마일스톤 3 진입 전 "모바일→서버 연결 고리" 개통 (2026-09-01 권장사항 승인). 기획 §2 Step 1의 "썸네일/메타데이터 선별 업로드" 중 **메타 업로드**에 해당.

## 3. 범위 / 비범위

### 범위 (In scope)
- 서버: `POST /v1/trips` (JWT) — 여행+미디어 메타 일괄 upsert, `GET /v1/trips` (내 여행 목록)
- **멱등 upsert**: `trips.client_key`(모바일 결정적 id) + (user_id, client_key) UNIQUE — 재업로드 시 교체
- 마이그레이션 1건 **append** (스쿼시 금지 준수)
- 모바일: API 클라이언트(베이스 URL env), 토큰 저장소(expo-secure-store — 실로그인 화면의 자리), 여행 상세 "서버에 올리기" 버튼 + 업로드 상태 표시
- 시뮬레이터 E2E: 업로드 → 서버 DB 확인 → 재업로드 멱등

### 비범위 (Out of scope)
- 원본/썸네일 파일 업로드(S3) → 별도 기능 (이번엔 메타만, storage_key null)
- 소셜 로그인 화면 — **Google/Kakao 콘솔 미등록**으로 실토큰 불가. 검증은 dev JWT 주입(시드 유저 서명)으로 수행하고, 로그인 UI는 콘솔 등록 후
- 숏폼 생성 요청 트리거 (마일스톤 3~4에서 파이프라인과 함께)

## 4. 요구사항 상세
- path: GPS 사진 2장 이상일 때 LineStringZM 시퀀스 전송, 아니면 null
- media 교체 전략: 재업로드 시 해당 trip의 media 전량 delete→insert (부분 병합 없음 — 단순·멱등)
- 모바일 인증 부재 시: 업로드 버튼이 명확한 안내 (크래시·조용한 실패 금지)

## 5. 방어적 AC
- 같은 여행 2회 업로드: 서버 trip 1개 유지, media 중복 없음
- 다른 유저의 같은 client_key: 서로 침범 없음 (user_id 스코프)
- 잘못된 body(음수 좌표 범위 밖 등): 400, 유효한 400/401에 앱이 안내 표시
- 업로드 중 네트워크 실패: 에러 표면화, 재시도 시 멱등

## 6. 오픈 이슈 / 결정 대기
- 소셜 로그인 UI — 콘솔 앱 등록(사용자 외부 작업) 후
- 원본 미디어 업로드 전략(S3 presigned) — 별도 plan
