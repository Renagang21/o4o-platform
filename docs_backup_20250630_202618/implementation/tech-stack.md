# 기술 스택 가이드

## 🛠️ 프론트엔드 기술 스택

### 핵심 프레임워크
- **React 18**: 최신 React 버전, Concurrent Features 활용
- **TypeScript 4.9+**: 강타입 언어로 코드 안정성 확보
- **Vite**: 빠른 개발 서버 및 빌드 도구

### 상태 관리
- **Zustand 4.4+**: 경량 상태 관리 라이브러리
  - Redux보다 간단한 API
  - TypeScript 완벽 지원
  - 자동 영속성 (localStorage)
  - 개발자 도구 지원

```typescript
// Store 예시
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: async (credentials) => {
        // 로그인 로직
      },
    }),
    { name: 'auth-storage' }
  )
);
```

### 라우팅
- **React Router v6**: 선언적 라우팅
  - Nested Routes 활용
  - 역할 기반 Protected Routes
  - 동적 라우팅 매개변수

```typescript
// 보호된 라우트 예시
<Route path="/admin/*" element={
  <ProtectedRoute requiredRole="admin">
    <AdminDashboard />
  </ProtectedRoute>
} />
```

### 스타일링
- **Tailwind CSS 3.3+**: 유틸리티 우선 CSS 프레임워크
  - 일관된 디자인 시스템
  - 반응형 디자인 내장
  - 커스텀 테마 설정
  - JIT 컴파일러로 최적화

```typescript
// 설정 예시 (tailwind.config.js)
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    }
  }
}
```

### 폼 처리
- **React Hook Form 7.45+**: 성능 최적화된 폼 라이브러리
  - 최소한의 리렌더링
  - 내장 유효성 검증
  - TypeScript 지원

```typescript
// 사용 예시
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>();
```

### UI 라이브러리
- **Heroicons**: SVG 아이콘 라이브러리
- **React Hot Toast**: 알림 메시지 시스템
- **Headless UI**: 접근성을 고려한 UI 컴포넌트

## 📁 프로젝트 구조

```
src/
├── components/              # 재사용 가능한 컴포넌트
│   ├── common/             # 공통 UI 컴포넌트
│   ├── auth/               # 인증 관련 컴포넌트
│   └── ProductReviews.tsx  # 리뷰 컴포넌트
├── pages/                  # 페이지 컴포넌트
│   ├── admin/              # 관리자 페이지
│   ├── customer/           # 고객 페이지
│   ├── retailer/           # 리테일러 페이지
│   ├── supplier/           # 공급업체 페이지
│   └── auth/               # 인증 페이지
├── stores/                 # Zustand 상태 관리
│   ├── authStore.ts        # 인증 상태
│   ├── productStore.ts     # 상품 상태
│   ├── orderStore.ts       # 주문 상태
│   └── reviewStore.ts      # 리뷰 상태
├── types/                  # TypeScript 타입 정의
│   ├── user.ts            # 사용자 타입
│   ├── product.ts         # 상품 타입
│   ├── order.ts           # 주문 타입
│   └── review.ts          # 리뷰 타입
├── mocks/                  # Mock 데이터
│   ├── users.ts           # 사용자 데이터
│   ├── products.ts        # 상품 데이터
│   ├── orders.ts          # 주문 데이터
│   ├── categories.ts      # 카테고리 데이터
│   └── reviews.ts         # 리뷰 데이터
├── utils/                  # 유틸리티 함수
├── hooks/                  # 커스텀 훅
├── services/              # API 서비스
├── constants/             # 상수 정의
└── styles/                # 전역 스타일
```

## 🏗️ 아키텍처 패턴

### 1. 컴포넌트 아키텍처
- **단일 책임 원칙**: 각 컴포넌트는 하나의 기능만 담당
- **합성 패턴**: 작은 컴포넌트들을 조합하여 복잡한 UI 구성
- **Props Drilling 방지**: Context API와 Zustand로 상태 관리

### 2. 상태 관리 패턴
- **도메인별 Store 분리**: 기능별로 상태 관리 분리
- **액션 기반 업데이트**: 명확한 액션 함수로 상태 변경
- **영속성 관리**: 중요한 상태는 localStorage에 자동 저장

### 3. 타입 시스템
- **엄격한 타이핑**: any 타입 사용 금지
- **인터페이스 우선**: type보다 interface 선호
- **제네릭 활용**: 재사용 가능한 타입 정의

## 🔧 개발 도구

### 빌드 도구
- **Vite**: 빠른 개발 서버 및 HMR
- **TypeScript Compiler**: 타입 체크 및 트랜스파일링
- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅

### 테스트 도구
- **Jest**: 단위 테스트 프레임워크
- **React Testing Library**: 컴포넌트 테스트
- **MSW**: API 모킹

### 개발 환경
- **VS Code**: 권장 에디터
- **Chrome DevTools**: 디버깅
- **React Developer Tools**: React 컴포넌트 디버깅
- **Zustand DevTools**: 상태 관리 디버깅

## 📦 의존성 관리

### 주요 의존성
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "zustand": "^4.4.1",
    "react-hook-form": "^7.45.4",
    "react-hot-toast": "^2.4.1",
    "@heroicons/react": "^2.0.18"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
```

### 설치 명령어
```bash
# 프로젝트 초기화
npm create vite@latest o4o-platform -- --template react-ts

# 의존성 설치
npm install react-router-dom zustand react-hook-form react-hot-toast
npm install @heroicons/react @headlessui/react
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/node

# Tailwind CSS 초기화
npx tailwindcss init -p
```

## ⚡ 성능 최적화

### 번들 최적화
- **Code Splitting**: React.lazy를 이용한 라우트별 분할
- **Tree Shaking**: 사용하지 않는 코드 제거
- **Asset Optimization**: 이미지 최적화 및 압축

### 렌더링 최적화
- **React.memo**: 불필요한 리렌더링 방지
- **useMemo/useCallback**: 값과 함수 메모이제이션
- **Virtual Scrolling**: 대용량 리스트 최적화

### 상태 관리 최적화
- **선택적 구독**: 필요한 상태만 구독
- **배치 업데이트**: 여러 상태 변경을 한 번에 처리
- **메모리 관리**: 불필요한 상태 정리

## 🔒 보안 고려사항

### 클라이언트 보안
- **XSS 방지**: 사용자 입력 검증 및 이스케이프
- **CSRF 보호**: 토큰 기반 인증
- **민감 정보 보호**: 로컬 저장소 암호화

### 코드 보안
- **의존성 검사**: npm audit으로 취약점 점검
- **타입 안전성**: TypeScript로 런타임 오류 방지
- **환경 변수**: 민감한 설정 정보 분리

## 📊 모니터링 및 분석

### 성능 모니터링
- **Web Vitals**: 사용자 경험 지표 측정
- **Bundle Analyzer**: 번들 크기 분석
- **Lighthouse**: 성능 점수 측정

### 오류 추적
- **Error Boundaries**: React 컴포넌트 오류 처리
- **Console Logging**: 개발 환경 디버그 로그
- **User Feedback**: 사용자 오류 보고 시스템

## 🚀 배포 전략

### 빌드 최적화
```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 확인
npm run preview
```

### 환경별 설정
- **개발 환경**: 개발자 도구 활성화, 소스맵 제공
- **스테이징 환경**: 프로덕션과 동일한 설정으로 테스트
- **프로덕션 환경**: 최적화된 빌드, 압축 및 캐싱

---

이 기술 스택은 현대적인 React 애플리케이션의 모범 사례를 따르며, 확장성과 유지보수성을 고려하여 설계되었습니다.