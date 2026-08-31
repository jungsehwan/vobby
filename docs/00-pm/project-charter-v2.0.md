# **취미 궤적 기반 AI 숏폼 자동 생성 플랫폼 개발 기획 및 환경 구성서 (v2.0)**

**프로젝트 명:** 취미생활 궤적 기반 멀티모달 AI 숏폼 자동 생성 및 공유 플랫폼  
**주요 기술 스택:** TypeScript, Python, Next.js, React Native (Expo), Node.js (NestJS), PostgreSQL (PostGIS), Redis, FFmpeg  
**작성 목적:** 멀티 플랫폼(모바일/웹) 확장 아키텍처 수립, GPS 궤적 및 미디어 AI 분석 기반 숏폼 파이프라인 상세 설계, Mac 개발 환경 구축 및 스토어/웹 배포 전략 정의

## **1\. 시스템 아키텍처 및 플랫폼 확장 전략**

모바일 앱(iOS/Android) 출시뿐만 아니라 차후 반응형 웹 서비스(웹 뷰어, SNS 공유 페이지, 랜딩 페이지)로 유연하게 확장할 수 있도록 모노레포(Monorepo) 기반의 멀티 티어 분리 아키텍처를 채택합니다. 연산 부하가 큰 미디어 인코딩 및 AI 분석 작업은 메인 비즈니스 서버와 분리된 비동기 워커로 구성합니다.

\[Client Layer\]  
  ├─ Mobile App (iOS / Android) : React Native (TypeScript) \+ Expo  
  ├─ User Web (사용자 웹 & 뷰어)  : Next.js (TypeScript, SSR/SEO 최적화)  
  └─ Admin Web (관리자 대시보드) : Next.js (TypeScript)  
  ▼  
\[API Gateway & Business Layer\]  
  └─ Main API (Node.js / NestJS) : 회원 인증(OAuth), 결제, 비즈니스 CRUD, 숏폼 메타데이터 관리  
  ▼  
\[AI Analysis & Video Pipeline\] (비동기 큐: Redis / Celery)  
  ├─ Multi-Modal AI Worker (Python) : Vision AI 분석, GPS 궤적 클러스터링, BGM 비트 동기화  
  └─ Video Render Worker (Python)  : 동선 지도 애니메이션 렌더링, FFmpeg 기반 9:16 비디오 합성  
  ▼  
\[Storage & Database\]  
  ├─ PostgreSQL \+ PostGIS : 사용자/게시글 RDBMS 및 GPS 공간(Spatial) 궤적 데이터  
  ├─ Redis                : AI 작업 큐(Task Queue) 관리 및 실시간 렌더링 진행률 캐싱  
  └─ Object Storage (S3)  : 원본 미디어, 타일맵 캐시, 최종 렌더링 숏폼 영상 저장

### **컴포넌트별 역할 분담**

| 구분 | 선택 기술 | 역할 및 주요 기능   |
| :---- | :---- | :---- |
| **Mobile App** | React Native (Expo) | iOS/Android 크로스 플랫폼 앱 개발, 백그라운드 GPS 위치 로깅, 단말 갤러리 미디어 접근 및 메타데이터 추출 |
| **User Web** | Next.js (App Router) | 생성된 숏폼 영상 웹 뷰어, 인터랙티브 동선 맵, SNS 공유용 OpenGraph 메타태그 최적화 및 앱 딥링크 제공 |
| **Admin Web** | Next.js (TypeScript) | 관리자 대시보드, 유저 관리, 비정상 활동/유해 콘텐츠 모니터링, 시스템 통계 |
| **Main API** | Node.js (NestJS) | API 게이트웨이, 사용자 인증(OAuth2/JWT), 비즈니스 로직, 숏폼 생성 요청 큐잉 |
| **AI / Video Worker** | Python (FastAPI \+ Celery) | CLIP/VLM 기반 비전 분석, PostGIS 기반 궤적 분석, FFmpeg 복합 필터 기반 세로형 영상 렌더링 |
| **Database** | PostgreSQL \+ PostGIS | 회원 및 메타데이터 관리, GPS 궤적(GeoJSON / LineString) 공간 인덱싱 및 공간 쿼리 연산 |

### **차후 웹(Web) 서비스 확장 방안**

> * **공유용 웹 뷰어 및 바이럴 루프 구축:** 사용자가 생성한 숏폼 영상마다 고유 URL(예: domain.com/v/:id)을 부여하여 모바일 앱이 없는 사용자도 웹 브라우저에서 동선 지도와 영상을 함께 감상할 수 있는 반응형 뷰어를 제공합니다.  
> * **SEO 및 OpenGraph 동적 생성:** Next.js SSR을 활용해 소셜 미디어(카카오톡, 인스타그램 등) 공유 시 썸네일, 이동 경로 통계(거리, 고도), 활동 요약이 포함된 리치 미리보기를 지원합니다.  
> * **모노레포 코드 재사용:** packages/shared-types, packages/shared-utils, packages/ui-tokens를 공용 모듈화하여 모바일 앱과 웹 프론트엔드 간의 비즈니스 로직 및 스타일 일관성을 유지하고 개발 공수를 최소화합니다.

## **2\. 미디어 \+ GPS 궤적 AI 분석 및 숏폼 제작 파이프라인**

스마트폰에 기록된 이동 동선(GPS 로그)과 촬영된 사진/동영상을 멀티모달 AI가 융합 분석하여 30초\~1분 분량의 세로형(9:16) 스토리텔링 숏폼 영상으로 자동 가공하는 핵심 엔진 프로세스입니다.

\[Step 1\. 단말 데이터 수집 & 1차 필터링\]  
  \- 사진/동영상 EXIF 메타데이터(위경도, 촬영 시각, 해상도) 추출  
  \- GPS 로그(GPX/GeoJSON)와 시간대별 1:1 시공간 동기화 (Time-Sync)  
  \- (On-Device) 흔들린 사진/중복 연사 1차 필터링 및 썸네일/메타데이터 선별 업로드  
         │  
         ▼  
\[Step 2\. 멀티모달 AI 분석 (Vision \+ Spatial \+ Audio)\]  
  \- \[Vision AI\]  구도/배경/인물 표정/활동성 스코어링 (CLIP, VLM)  
  \- \[Spatial AI\] 이동 구간 vs 주요 체류지(POI: 출발/정상/뷰포인트/도착) 클러스터링  
  \- \[Audio AI\]   선택 BGM의 BPM, 비트 온셋(Onset), 클라이맥스 구간 감지  
         │  
         ▼  
\[Step 3\. AI 시나리오 디렉팅 (Story Engine)\]  
  \- 숏폼 구성: 인트로(3D 조감도) ➔ 이동 ➔ 하이라이트 스팟 ➔ 아웃트로(통계 요약)  
  \- BGM 비트 타이밍에 맞춘 자동 컷 편집 타임라인(EDL) 생성  
         │  
         ▼  
\[Step 4\. 지도 애니메이션 & 영상 합성 (Rendering Engine)\]  
  \- Mapbox / Deck.gl 기반 실시간 궤적 라인 드로잉 모션 생성  
  \- FFmpeg 기반 9:16 스마트 크롭, Ken-Burns(줌인/패닝) 모션, 속도/고도 HUD 오버레이 합성  
         │  
         ▼  
\[Step 5\. 배포 및 멀티 플랫폼 스트리밍\]  
  \- HLS / MP4 렌더링 완료 알림 (Push)  
  \- 모바일 앱 및 웹 공유 뷰어에서 실시간 재생 및 SNS 내보내기 지원

### **파이프라인 세부 단계별 기술 명세**

#### **Phase 1: 데이터 수집 및 시공간(Spatio-Temporal) 동기화**

> * **Time-Sync Matching:** 백그라운드 GPS 로거에서 기록된 위치 좌표 데이터(위도, 경도, 고도, 타임스탬프)와 단말 갤러리 미디어의 EXIF 촬영 시각을 1:1로 매핑하여 각 미디어가 촬영된 동선 상의 위치를 특정합니다.  
> * **온디바이스 최적화 및 업로드 효율화:** 고용량 원본 미디어를 전체 업로드하지 않고, 단말에서 1차 블러 검출(Laplacian Variance) 및 중복 연사 필터링을 거친 후 경량 썸네일과 메타데이터를 우선 전송하여 AI가 선별한 핵심 미디어만 선택 업로드합니다.

#### **Phase 2: 멀티모달 AI 분석 엔진 (Vision \+ Spatial \+ Audio)**

> * **비전 하이라이트 선별 (Vision AI):** 경치, 인물 미소, 역동적인 활동(러닝, 점프, 등반 등)을 인식하고 심미적 완성도가 높은 컷을 자동 점수화(Scoring)합니다.  
> * **공간 궤적 분석 (Spatial AI / PostGIS):** 이동 속도, 고도 변화율, 체류 시간을 분석하여 주요 관심 지점(POI: 출발지, 쉼터, 최고 고도 지점, 뷰포인트, 도착지)을 추출합니다.  
> * **오디오 비트 감지 (Audio AI):** 선택된 템플릿 BGM의 BPM, 비트 온셋(Onset), 드롭(Drop) 구간을 분석하여 영상 컷 전환이 이뤄질 최적의 타임스탬프를 계산합니다.

#### **Phase 3: AI 시나리오 디렉팅 및 숏폼 템플릿 구성**

스토리 엔진이 30초\~60초 숏폼의 연출 규칙에 맞춰 자동 타임라인(Edit Decision List)을 생성합니다.

| 구간 | 재생 시간 | 화면 구성 및 연출 | AI 제어 로직   |
| :---- | :---- | :---- | :---- |
| **Intro** | 0 \~ 3초 | 전체 궤적 3D 조감도 \+ 날짜/활동 타이틀 | 전체 동선 바운딩 박스(Bounding Box) 계산 및 타이틀 자동 생성 |
| **Body** | 3 \~ 15초 | 동선 라인 드로잉 \+ 주요 이동 사진 모션 | 이동 속도/경사도 HUD 오버레이, BGM 비트에 동기화된 컷 전환 |
| **Highlight** | 15 \~ 25초 | 정상/체류지 사진 및 액션 비디오 클립 | Vision AI 최고 점수 미디어 배치, 음원 클라이맥스(Drop) 구간 매핑 |
| **Outro** | 25 \~ 30초 | 최종 도착 모션 \+ 총 거리/시간/고도 요약 | PostGIS 누적 통계치 기반 모션 그래픽 인포그래픽 자막 합성 |

#### **Phase 4: FFmpeg & 지도 동선 렌더링 엔진**

> * **동적 궤적 지도 렌더링:** Mapbox Static API 또는 Headless Chromium 기반으로 동선이 순차적으로 그려지는 투명 배경 애니메이션 레이어를 생성합니다.  
> * **FFmpeg Complex Filter:** 사진에 생동감을 부여하는 켄 번스(Ken-Burns: 줌인/팬) 효과, 9:16 세로 화면 스마트 크롭, 속도계/고도계 HUD 오버레이, BGM 오디오 믹싱을 단일 파이프라인으로 고속 처리합니다.

## **3\. 개발 환경 구축 가이드 (Mac \+ IntelliJ)**

### **① 개발용 로컬 패키지 설치 (Homebrew)**

Mac 터미널에서 필요한 런타임, 데이터베이스, 공간 연산 라이브러리 및 미디어 도구를 설치합니다.

\# 1\. Homebrew 패키지 매니저 업데이트  
brew update

\# 2\. Node.js & Python 3.11 설치  
brew install node python@3.11

\# 3\. PostgreSQL 및 PostGIS 확장 모듈 설치  
brew install postgresql@15 postgis  
brew services start postgresql@15

\# 4\. Redis 및 영상 처리를 위한 FFmpeg 설치  
brew install redis ffmpeg  
brew services start redis

### **② 모노레포(Monorepo) 프로젝트 디렉터리 구조**

hobby-shortform-platform/  
├── apps/  
│   ├── mobile/             \# React Native (Expo) \- iOS/Android 크로스플랫폼 앱  
│   ├── web/                \# Next.js \- 사용자 웹 서비스 및 SNS 공유 뷰어  
│   └── admin/              \# Next.js \- 관리자 대시보드  
├── services/  
│   ├── main-api/           \# Node.js (NestJS) \- 메인 비즈니스 서버  
│   └── ai-pipeline/        \# Python (FastAPI \+ Celery)  
│       ├── vision/         \# Vision AI (CLIP/VLM) 미디어 스코어링  
│       ├── spatial/        \# GPS 궤적 클러스터링 및 지도 애니메이션  
│       ├── director/       \# 스토리라인 및 타임라인 생성기  
│       └── renderer/       \# FFmpeg 비디오 합성 엔진  
└── packages/  
    ├── shared-types/       \# TypeScript 공통 인터페이스 및 DTO 정의  
    └── ui-tokens/          \# 공통 디자인 시스템 토큰

### **③ IntelliJ IDEA 환경 설정**

> * **추천 플러그인:** Python, Node.js/TypeScript, Database Tools and SQL, Prettier, ESLint, GitToolBox  
> * **PostGIS 활성화:** IntelliJ Database Tools 콘솔에서 CREATE EXTENSION postgis; 명령을 실행하여 공간 데이터 인덱싱 기능을 활성화합니다.

### **④ 플랫폼별 로컬 테스트 환경**

> * **iOS:** Mac App Store에서 Xcode 설치 후 Command Line Tools 설정, iOS Simulator로 화면 및 권한 검증.  
> * **Android:** Android Studio 설치 후 SDK 환경변수 등록 및 Android Virtual Device (AVD) 생성.  
> * **Web:** apps/web 디렉터리에서 npm run dev 실행 후 반응형 뷰어 브라우저 테스트.  
> * **Expo 모바일 실기기:** 스마트폰에 Expo Go 앱 설치 후 동일 Wi-Fi 네트워크에서 QR 코드로 실시간 핫 리로딩 테스트.

## **4\. 양대 앱스토어 및 웹 배포 가이드**

| 플랫폼 | 준비 항목 | 비용 및 유의 사항   |
| :---- | :---- | :---- |
| **Apple App Store** | Apple Developer Program 등록 | 연 $99 결제. 백그라운드 위치 추적 및 사진 라이브러리 접근 사유 명시 필수. Mac 빌드 환경 필요. |
| **Google Play Store** | Google Play Console 계정 등록 | $25 (1회성). 신규 개인 개발자 계정 기준 최소 20명의 테스터 대상 14일 비공개 테스트 조건 준수 필요. |
| **Web Service** | Vercel / AWS CloudFront \+ ECS | Next.js SSR 지원 환경 구성, 도메인 연결 및 OpenGraph 메타태그 자동 렌더링 설정. |
| **CI/CD 자동화** | EAS Build & GitHub Actions | 모바일 클라우드 빌드(EAS) 및 웹/백엔드 컨테이너 빌드 자동화 파이프라인 구축. |

## **5\. 단계별 개발 마일스톤 (MVP 기준)**

> 1. **1단계 (기반 인프라 & 공간 데이터베이스):** PostgreSQL \+ PostGIS 스키마(User, Trajectory, Media, ShortForm) 설계 및 작업 대기열용 Redis 셋업.  
> 2. **2단계 (클라이언트 & 미디어 인제스트):** React Native 기반 단말 백그라운드 GPS 로깅 및 사진 EXIF 메타데이터 추출 기능 구현, Next.js 공유 뷰어 기본 구조 및 공통 패키지 구성.  
> 3. **3단계 (멀티모달 AI 분석 엔진 개발):** Python 기반 사진 구도/품질 점수화(Vision AI), 동선 클러스터링(Spatial AI), BGM 비트 감지 알고리즘 구현.  
> 4. **4단계 (지도 애니메이션 & FFmpeg 렌더러):** 궤적 라인 드로잉 렌더링 모듈 및 FFmpeg 복합 필터(9:16 크롭, 켄 번스, HUD 오버레이) 숏폼 자동 믹싱 파이프라인 완성.  
> 5. **5단계 (엔드투엔드 통합 & 정식 배포):** 단말 데이터 업로드부터 AI 숏폼 생성, 웹/앱 뷰어 재생까지 E2E 연동 검증 및 양대 앱스토어 심사 제출과 웹 배포 완료.