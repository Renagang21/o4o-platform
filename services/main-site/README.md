# 🎨 Main Site - React Frontend

> **Phase 2 진행 중** - API 연동 및 E-commerce UI 구현
> 
> **React 19** | **Vite** | **TypeScript** | **Tailwind CSS**

O4O Platform의 메인 웹 애플리케이션입니다. React 19와 최신 기술 스택으로 구축되었습니다.

---

## 🎯 **현재 상태**

### **✅ 완료된 부분**
- **React 19 앱**: 최신 React 버전 적용
- **Vite 빌드 시스템**: 빠른 개발 서버 및 HMR
- **TypeScript 설정**: 100% 타입 안전성
- **Tailwind CSS**: 모던 스타일링 시스템
- **기본 컴포넌트**: 레이아웃 및 네비게이션

### **⏳ 개발 중 (Phase 2)**
- **API 연동**: 백엔드 API와 통신
- **E-commerce UI**: 상품, 장바구니, 주문 인터페이스
- **사용자 인증**: 로그인/회원가입 UI
- **반응형 디자인**: 모바일 최적화

---

## ⚡ **빠른 시작**

### **1. 의존성 설치**
```bash
cd services/main-site
npm install
```

### **2. 환경 설정**
```bash
cp .env.example .env
```

**환경 변수:**
```env
# API 서버 연결
VITE_API_BASE_URL=http://localhost:4000
VITE_API_PREFIX=/api

# 개발 설정
VITE_PORT=3000
VITE_OPEN_BROWSER=true

# 기능 플래그
VITE_ENABLE_ECOMMERCE=true
VITE_ENABLE_AUTH=true
```

### **3. 개발 서버 시작**
```bash
npm run dev
```

**접속 확인:**
- 🌐 **메인 사이트**: http://localhost:3000
- ⚡ **Vite HMR**: 자동 리로드 지원

---

## 📁 **프로젝트 구조**

```
src/
├── 🎯 main.tsx                 # React 앱 진입점
├── 🎨 App.tsx                  # 메인 앱 컴포넌트
├── 📁 components/              # 재사용 컴포넌트
│   ├── 🧭 layout/              # 레이아웃 컴포넌트
│   │   ├── Header.tsx          # 헤더 (네비게이션)
│   │   ├── Footer.tsx          # 푸터
│   │   └── Layout.tsx          # 전체 레이아웃
│   ├── 🛍️ ecommerce/           # E-commerce 컴포넌트
│   │   ├── ProductCard.tsx     # 상품 카드
│   │   ├── CartItem.tsx        # 장바구니 아이템
│   │   └── OrderSummary.tsx    # 주문 요약
│   ├── 🔐 auth/                # 인증 컴포넌트
│   │   ├── LoginForm.tsx       # 로그인 폼
│   │   ├── RegisterForm.tsx    # 회원가입 폼
│   │   └── UserProfile.tsx     # 사용자 프로필
│   └── 🎛️ ui/                  # UI 컴포넌트
│       ├── Button.tsx          # 버튼
│       ├── Input.tsx           # 입력 필드
│       └── Modal.tsx           # 모달
├── 📁 pages/                   # 페이지 컴포넌트
│   ├── HomePage.tsx            # 홈페이지
│   ├── ProductsPage.tsx        # 상품 목록
│   ├── ProductDetailPage.tsx   # 상품 상세
│   ├── CartPage.tsx            # 장바구니
│   └── CheckoutPage.tsx        # 결제
├── 📁 hooks/                   # 커스텀 훅
│   ├── useApi.ts               # API 통신 훅
│   ├── useAuth.ts              # 인증 상태 관리
│   └── useCart.ts              # 장바구니 상태
├── 📁 services/                # API 서비스
│   ├── api.ts                  # API 클라이언트 설정
│   ├── authService.ts          # 인증 API
│   ├── productService.ts       # 상품 API  
│   └── orderService.ts         # 주문 API
├── 📁 types/                   # TypeScript 타입
│   ├── api.ts                  # API 응답 타입
│   ├── user.ts                 # 사용자 타입
│   └── product.ts              # 상품 타입
└── 📁 utils/                   # 유틸리티
    ├── constants.ts            # 상수
    ├── helpers.ts              # 헬퍼 함수
    └── formatters.ts           # 포맷터
```

---

## 🛠️ **기술 스택**

### **🏗️ 핵심 기술**
- **React**: 19.0+ (최신 기능 사용)
- **TypeScript**: 5.8+ (100% 타입 적용)
- **Vite**: 6.0+ (빠른 빌드 시스템)
- **React Router**: 7.0+ (라우팅)

### **🎨 스타일링**
- **Tailwind CSS**: 유틸리티 기반 CSS
- **CSS Modules**: 컴포넌트별 스타일 (선택적)
- **PostCSS**: CSS 후처리

### **📡 데이터 관리**
- **Axios**: HTTP 클라이언트
- **React Query**: 서버 상태 관리 (구현 예정)
- **Zustand**: 클라이언트 상태 관리 (구현 예정)

### **🛠️ 개발 도구**
- **ESLint**: 코드 품질
- **Prettier**: 코드 포맷팅
- **Vite DevTools**: 개발 도구

---

## 🚀 **개발 스크립트**

### **📦 기본 명령어**
```bash
npm run dev          # 개발 서버 시작
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
npm run type-check   # TypeScript 검사
npm run lint         # ESLint 검사
npm run lint:fix     # 자동 수정
```

### **🧪 테스트** (구현 예정)
```bash
npm run test         # 테스트 실행
npm run test:ui      # 테스트 UI
npm run test:coverage # 커버리지 리포트
```

### **📊 분석**
```bash
npm run analyze      # 번들 분석
npm run lighthouse   # 성능 측정
```

---

## 🎨 **컴포넌트 가이드**

### **🧭 레이아웃 컴포넌트**
```tsx
// Layout.tsx - 전체 페이지 레이아웃
<Layout>
  <Header /> 
  <main>{children}</main>
  <Footer />
</Layout>
```

### **🛍️ E-commerce 컴포넌트**
```tsx
// ProductCard.tsx - 상품 카드
<ProductCard
  product={product}
  userRole={userRole}
  onAddToCart={handleAddToCart}
  showPrice={true}
/>

// CartItem.tsx - 장바구니 아이템
<CartItem
  item={cartItem}
  onUpdateQuantity={handleUpdateQuantity}
  onRemove={handleRemove}
/>
```

### **🔐 인증 컴포넌트**
```tsx
// LoginForm.tsx - 로그인 폼
<LoginForm
  onLogin={handleLogin}
  redirectTo="/dashboard"
  showRegisterLink={true}
/>
```

---

## 📡 **API 연동 패턴**

### **🔌 API 클라이언트 설정**
```typescript
// services/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 인증 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### **🛍️ 상품 API 연동**
```typescript
// services/productService.ts
export const productService = {
  // 상품 목록 조회
  async getProducts(params?: ProductFilters) {
    const response = await api.get('/ecommerce/products', { params });
    return response.data;
  },
  
  // 상품 상세 조회  
  async getProduct(id: string) {
    const response = await api.get(`/ecommerce/products/${id}`);
    return response.data;
  }
};
```

### **🪝 커스텀 훅 사용**
```typescript
// hooks/useProducts.ts
export const useProducts = (filters?: ProductFilters) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getProducts(filters);
        setProducts(data.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [filters]);
  
  return { products, loading };
};
```

---

## 🎯 **Phase 2 개발 계획**

### **🚀 즉시 착수 (1주일)**
1. **API 클라이언트 구축**
   - Axios 설정 및 인터셉터
   - 에러 처리 및 로딩 상태
   - 타입 안전한 API 호출

2. **인증 시스템 UI**
   - 로그인/회원가입 폼
   - JWT 토큰 관리
   - 사용자 상태 관리

3. **상품 페이지 구현**
   - 상품 목록 (필터링/검색)
   - 상품 상세 페이지
   - 역할별 가격 표시

### **📱 단기 목표 (2주일)**
1. **장바구니 기능**
   - 장바구니 추가/제거
   - 수량 변경
   - 실시간 업데이트

2. **주문 프로세스**
   - 체크아웃 페이지
   - 주문 요약 및 결제
   - 주문 내역 조회

3. **반응형 디자인**
   - 모바일 최적화
   - 태블릿 지원
   - 다크 모드 (선택적)

---

## 🎨 **디자인 시스템**

### **🎨 컬러 팔레트**
```css
/* tailwind.config.js */
theme: {
  colors: {
    primary: '#2563eb',    // 메인 블루
    secondary: '#64748b',  // 그레이
    success: '#10b981',    // 그린
    warning: '#f59e0b',    // 오렌지
    error: '#ef4444',      // 레드
  }
}
```

### **📝 타이포그래피**
```css
/* 헤딩 */
.text-h1 { @apply text-4xl font-bold }
.text-h2 { @apply text-3xl font-semibold }
.text-h3 { @apply text-2xl font-medium }

/* 본문 */
.text-body { @apply text-base font-normal }
.text-small { @apply text-sm font-normal }
```

### **🎛️ 컴포넌트 스타일**
```tsx
// Button 컴포넌트 예시
const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary-dark',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  outline: 'border border-primary text-primary hover:bg-primary hover:text-white'
};
```

---

## 🔧 **환경 설정**

### **🧪 개발 환경**
```env
VITE_NODE_ENV=development
VITE_API_BASE_URL=http://localhost:4000
VITE_DEBUG=true
```

### **🚀 프로덕션 환경**
```env
VITE_NODE_ENV=production  
VITE_API_BASE_URL=https://api.neture.co.kr
VITE_DEBUG=false
```

---

## 🆘 **문제 해결**

### **🔧 일반적인 문제**

#### **포트 충돌**
```bash
# 포트 3000 사용 확인
lsof -i :3000
kill -9 <PID>

# 다른 포트 사용
npm run dev -- --port 3001
```

#### **TypeScript 오류**
```bash
# 타입 체크
npm run type-check

# Vite 캐시 클리어
rm -rf node_modules/.vite
```

#### **빌드 실패**
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 클리어
npm run build -- --force
```

---

## 📈 **성능 최적화**

### **⚡ 로딩 최적화**
- **코드 스플리팅**: 페이지별 lazy loading
- **이미지 최적화**: WebP, lazy loading
- **API 캐싱**: React Query 사용 (예정)

### **🔄 번들 최적화**
- **Tree Shaking**: 사용하지 않는 코드 제거
- **Chunk 분할**: 벤더 코드 분리
- **압축**: Gzip/Brotli 압축

---

## 🔗 **관련 문서**

- **🔗 [API 서버 문서](../api-server/README.md)**
- **📚 [전체 문서](../../docs/README.md)**
- **🏗️ [아키텍처](../../docs/02-architecture/overview.md)**
- **🚀 [빠른 시작](../../docs/01-getting-started/quick-start.md)**

---

<div align="center">

**🎨 Modern React App with Phase 2 Development! 🎨**

[🚀 시작하기](../../docs/01-getting-started/quick-start.md) • [🔗 API 연동](../api-server/README.md) • [📚 전체 문서](../../docs/README.md)

**React 19 • Vite • TypeScript • API 연동 준비 완료 ✨**

</div>
