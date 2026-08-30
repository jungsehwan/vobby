# Exec Plan: {feature-slug}

## 개요
- **기능**: {간단 설명}
- **Plan**: `docs/01-plan/features/{feature-slug}.plan.md`
- **Design**: `docs/02-design/features/{feature-slug}.design.md`
- **시작일**: YYYY-MM-DD

## 체크리스트

### 도메인/데이터 (Design §1~2)
- [ ] 데이터 모델 생성/수정
- [ ] 저장소/데이터 접근 구현
- [ ] 서비스/비즈니스 로직 구현
- [ ] 마이그레이션·스키마 문서 동기화
- [ ] 컴파일 검증

### UI (Design §3)
- [ ] 화면/라우트 생성
- [ ] 상태관리·데이터 바인딩
- [ ] UI 컴포넌트 구현
- [ ] 빌드 검증

### 검증 (Design §4)
- [ ] 로직 테스트 (유닛/통합 또는 실호출)
- [ ] 실행 검증 (실기기/시뮬레이터 화면·동작 확인)
- [ ] Design 대비 갭 분석
- [ ] 문서 업데이트 (product-specs index, 참조 문서)

## 기술 노트
{구현 중 결정사항, 주의점 기록}

<!-- 구현 중 사용자 피드백은 아래처럼 섹션 append로 이력 보존:
### 추가 개발 — YYYY-MM-DD (사유)
- [ ] ...
-->
