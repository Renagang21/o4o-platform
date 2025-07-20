# O4O E-commerce App

통합된 이커머스 프론트엔드 애플리케이션입니다.

## 특징

### 역할 기반 가격 시스템
- Customer: 일반 고객 가격
- Retailer: 등급별 할인 (Gold 0%, Premium 3%, VIP 5%)
- Business: 사업자 가격
- Affiliate: 제휴사 가격

### 주요 기능
- 🛍️ 상품 브라우징 (검색, 필터링, 정렬)
- 🛒 장바구니 관리 (실시간 가격 계산)
- 💳 주문 및 결제 (한국형 결제 지원)
- 📦 주문 추적 및 관리
- ❤️ 위시리스트
- ⭐ 상품 리뷰
- 🏷️ 쿠폰 및 할인

## 프로젝트 구조

```
apps/ecommerce/
├── src/
│   ├── components/       # 재사용 가능한 컴포넌트
│   │   ├── product/     # 상품 관련 컴포넌트
│   │   ├── cart/        # 장바구니 관련 컴포넌트
│   │   ├── order/       # 주문 관련 컴포넌트
│   │   └── common/      # 공통 컴포넌트
│   ├── pages/           # 페이지 컴포넌트
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # Zustand 상태 관리
│   ├── lib/
│   │   └── api/         # API 서비스 레이어
│   └── styles/          # 글로벌 스타일
```

## 시작하기

### 개발 서버 실행
```bash
# Root에서
npm run dev:ecommerce

# 또는 apps/ecommerce에서
npm run dev
```

### 빌드
```bash
# Root에서
npm run build:ecommerce

# 또는 apps/ecommerce에서
npm run build
```

## 환경 변수

`.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=O4O Ecommerce
VITE_APP_URL=http://localhost:3002
```

## 상태 관리

### Zustand Stores

#### useCartStore
- 장바구니 상태 관리
- 로컬 스토리지 지속성
- Optimistic updates

```typescript
const { cart, addToCart, updateQuantity, removeFromCart } = useCartStore();
```

#### useWishlistStore
- 위시리스트 상태 관리
- 로컬 스토리지 지속성

```typescript
const { items, addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
```

#### useProductFiltersStore
- 상품 필터 상태 관리
- URL 파라미터와 동기화

```typescript
const { search, category, setSearch, setCategory, getQueryParams } = useProductFiltersStore();
```

## API 레이어

### 구조화된 API 서비스

```typescript
import { api } from '@/lib/api';

// 상품 API
const products = await api.products.getProducts(filters);
const product = await api.products.getProduct(id);

// 장바구니 API
const cart = await api.cart.getCart();
await api.cart.addToCart(productId, quantity);

// 주문 API
const orders = await api.orders.getOrders();
const order = await api.orders.createOrderFromCart(data);
```

## Custom Hooks

### 상품 관련
- `useProducts`: 상품 목록 조회
- `useProduct`: 개별 상품 조회
- `useAddToCart`: 장바구니 추가
- `useFeaturedProducts`: 추천 상품

### 장바구니 관련
- `useCart`: 장바구니 상태
- `useUpdateCartQuantity`: 수량 변경
- `useRemoveFromCart`: 아이템 제거

### 주문 관련
- `useOrders`: 주문 목록
- `useOrder`: 개별 주문
- `useCreateOrder`: 주문 생성
- `useCancelOrder`: 주문 취소

## 컴포넌트

### Product Components
- `ProductCard`: 상품 카드 (customer/admin 모드)
- `ProductGrid`: 상품 그리드 레이아웃
- `ProductCarousel`: 상품 캐러셀
- `ProductFilters`: 상품 필터 UI

### Cart Components
- `CartItem`: 장바구니 아이템
- `CartSummary`: 주문 요약 (가격 계산)

### Order Components
- `OrderItem`: 주문 목록 아이템
- 주문 상태 타임라인

### Common Components
- `PriceDisplay`: 가격 표시 (역할별 가격)
- `StockStatus`: 재고 상태 표시

## 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e
```

## 배포

1. 환경 변수 설정
2. 빌드 실행: `npm run build`
3. `dist` 폴더 배포

## 주의사항

- API 서버가 실행 중이어야 합니다 (포트 4000)
- 인증은 `@o4o/auth-context`를 통해 처리됩니다
- 모든 가격은 한국 원화(KRW) 기준입니다