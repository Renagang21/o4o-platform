# Main-Site 코드 정비 계획

## 현재 상태 분석
- 총 354개의 TypeScript 파일
- 많은 테스트, 데모, 샘플 파일 존재
- 중복된 컴포넌트와 페이지
- 구조가 복잡하고 정리되지 않음

## 정비 작업 목록

### 1. 제거 대상 파일들

#### 테스트/데모 파일
- [ ] TestApp.tsx
- [ ] main-test.tsx
- [ ] pages/AdminDashboardTest.tsx
- [ ] pages/FullScreenEditorTest.tsx
- [ ] pages/FullScreenEditorSimpleTest.tsx
- [ ] pages/TestPage.tsx
- [ ] pages/SpectraBlocksDemo.tsx
- [ ] pages/editor-demo.tsx
- [ ] features/test-dashboard/*
- [ ] config/testPageData.ts
- [ ] types/testData.ts
- [ ] components/ColorTypographySample.tsx
- [ ] components/healthcare/HealthcareDemo.tsx

#### 중복된 파일
- [ ] App-complex.tsx (App.tsx와 중복)
- [ ] 중복된 Dashboard 컴포넌트들 통합

### 2. 폴더 구조 재정리

```
src/
├── components/
│   ├── common/        # 공통 컴포넌트
│   ├── layout/        # 레이아웃 관련
│   ├── blocks/        # WordPress 블록 컴포넌트
│   └── features/      # 기능별 컴포넌트
├── pages/
│   ├── public/        # 공개 페이지
│   ├── admin/         # 관리자 페이지
│   └── auth/          # 인증 관련
├── hooks/            # Custom hooks
├── services/         # API 서비스
├── stores/           # 상태 관리
├── types/            # TypeScript 타입
└── utils/            # 유틸리티 함수
```

### 3. 코드 정리 작업

#### 컴포넌트 정리
- 사용하지 않는 import 제거
- 중복 코드 제거
- 컴포넌트 통합 및 재사용성 향상

#### 라우팅 정리
- 명확한 라우팅 구조 확립
- 권한별 라우팅 분리

#### API 통합
- API 호출 로직 service 폴더로 통합
- 중복된 API 호출 제거

### 4. 최적화 작업

- 번들 사이즈 최적화
- Lazy loading 적용
- 불필요한 의존성 제거

## 실행 순서

1. 백업 생성
2. 테스트/데모 파일 제거
3. 폴더 구조 재정리
4. 컴포넌트 통합 및 정리
5. 라우팅 시스템 정비
6. API 서비스 통합
7. 최종 테스트 및 검증