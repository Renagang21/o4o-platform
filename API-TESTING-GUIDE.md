# 🧪 O4O Platform API 테스트 가이드

## 📖 **개요**
O4O Platform의 API 테스트 전략, 도구, 베스트 프랙티스를 제공하는 종합 가이드입니다.

## 🎯 **테스트 전략**

### **테스트 피라미드**
```
        🔺 E2E Tests (10%)
      🔺🔺 Integration Tests (20%)
    🔺🔺🔺 Unit Tests (70%)
```

- **Unit Tests**: 개별 함수/컴포넌트 테스트
- **Integration Tests**: API 엔드포인트 테스트
- **E2E Tests**: 전체 사용자 플로우 테스트

### **테스트 범위**
- **기능 테스트**: 요구사항 충족 여부
- **성능 테스트**: 응답 시간, 처리량
- **보안 테스트**: 인증, 권한, 입력 검증
- **신뢰성 테스트**: 오류 처리, 복구 능력

## 🛠️ **테스트 도구 스택**

### **프론트엔드 테스트**
```typescript
// 테스트 프레임워크
import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// 모킹 도구
import { server } from './test-utils/mocks/server';
import { rest } from 'msw';

// 테스트 유틸리티
import { createTestWrapper } from './test-utils/wrapper';
import { createMockProduct } from './test-utils/factories/product';
```

### **백엔드 테스트**
```typescript
// 테스트 프레임워크
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// 데이터베이스 테스트
import { DataSource } from 'typeorm';
import { createTestDatabase } from './test-utils/database';

// 모킹
import { vi } from 'vitest';
```

## 🎯 **API 훅 테스트 패턴**

### **React Query 훅 테스트**
```typescript
// useProducts.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useProducts } from '../hooks/useProducts';

// 테스트 래퍼 생성
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
      mutations: { retry: false },
    },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return TestWrapper;
};

describe('useProducts Hook', () => {
  test('상품 목록을 성공적으로 조회한다', async () => {
    // API 모킹
    vi.mocked(EcommerceApi.getProducts).mockResolvedValue({
      data: [createMockProduct()],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    // 훅 렌더링
    const { result } = renderHook(
      () => useProducts(1, 20), 
      { wrapper: createTestWrapper() }
    );

    // 비동기 결과 대기
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 결과 검증
    expect(result.current.data?.data).toHaveLength(1);
    expect(EcommerceApi.getProducts).toHaveBeenCalledWith(1, 20, {});
  });
});
```

### **뮤테이션 훅 테스트**
```typescript
// useCreateProduct.test.tsx
describe('useCreateProduct Hook', () => {
  test('상품을 성공적으로 생성한다', async () => {
    const newProduct = createMockProducts.draft();
    const mockResponse = {
      success: true,
      data: { ...newProduct, status: 'published' as const },
    };

    vi.mocked(EcommerceApi.createProduct).mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useCreateProduct(), 
      { wrapper: createTestWrapper() }
    );

    // 뮤테이션 실행
    result.current.mutate(newProduct);

    // 성공 상태 확인
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data.status).toBe('published');
  });

  test('생성 실패 시 에러를 처리한다', async () => {
    const errorResponse = {
      response: { data: { message: 'Validation failed' } }
    };
    
    vi.mocked(EcommerceApi.createProduct).mockRejectedValue(errorResponse);

    const { result } = renderHook(
      () => useCreateProduct(), 
      { wrapper: createTestWrapper() }
    );

    result.current.mutate(createMockProducts.draft());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(errorResponse);
  });
});
```

## 🎭 **MSW (Mock Service Worker) 활용**

### **MSW 서버 설정**
```typescript
// test-utils/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// test-setup.ts
import { server } from './src/test-utils/mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
```

### **API 핸들러 정의**
```typescript
// test-utils/mocks/handlers.ts
import { rest } from 'msw';
import { createMockProduct, createMockOrder } from '../factories';

export const handlers = [
  // 상품 목록 조회
  rest.get('/api/ecommerce/products', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1;
    const limit = Number(req.url.searchParams.get('limit')) || 20;
    
    return res(
      ctx.json({
        data: [
          createMockProduct({ name: 'Product 1' }),
          createMockProduct({ name: 'Product 2' }),
        ],
        total: 2,
        page,
        limit,
        totalPages: 1,
      })
    );
  }),

  // 상품 생성
  rest.post('/api/ecommerce/products', async (req, res, ctx) => {
    const productData = await req.json();
    
    return res(
      ctx.json({
        success: true,
        data: createMockProduct(productData),
      })
    );
  }),

  // 에러 시뮬레이션
  rest.get('/api/ecommerce/products/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        message: 'Internal Server Error'
      })
    );
  }),
];
```

## 🏭 **팩토리 패턴 활용**

### **Product 팩토리**
```typescript
// test-utils/factories/product.ts
import { Product } from '@/types/ecommerce';

export const createMockProduct = (overrides?: Partial<Product>): Product => {
  const baseProduct: Product = {
    id: 'prod_' + Math.random().toString(36).substr(2, 9),
    name: 'Test Product',
    description: 'Test product description',
    retailPrice: 10000,
    wholesalePrice: 8000,
    affiliatePrice: 9000,
    stock: 100,
    status: 'published',
    images: ['https://example.com/image.jpg'],
    category: 'electronics',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  return baseProduct;
};

export const createMockProducts = {
  published: (count = 3) => 
    Array.from({ length: count }, (_, i) => 
      createMockProduct({ 
        name: `Published Product ${i + 1}`,
        status: 'published' 
      })
    ),
    
  draft: (overrides?: Partial<Product>) =>
    createMockProduct({
      status: 'draft',
      stock: 0,
      ...overrides,
    }),
    
  outOfStock: (overrides?: Partial<Product>) =>
    createMockProduct({
      stock: 0,
      status: 'published',
      ...overrides,
    }),
};
```

### **Order 팩토리**
```typescript
// test-utils/factories/order.ts
import { Order, OrderItem } from '@/types/ecommerce';

export const createMockOrderItem = (overrides?: Partial<OrderItem>): OrderItem => ({
  id: 'item_' + Math.random().toString(36).substr(2, 9),
  productId: 'prod_123',
  productName: 'Test Product',
  quantity: 1,
  price: 10000,
  total: 10000,
  ...overrides,
});

export const createMockOrder = (overrides?: Partial<Order>): Order => ({
  id: 'order_' + Math.random().toString(36).substr(2, 9),
  customerId: 'customer_123',
  customerName: 'Test Customer',
  customerEmail: 'test@example.com',
  status: 'pending',
  items: [createMockOrderItem()],
  subtotal: 10000,
  shipping: 2500,
  tax: 1000,
  total: 13500,
  paymentMethod: 'card',
  shippingAddress: {
    name: 'Test Customer',
    phone: '010-1234-5678',
    address: '서울시 강남구',
    detailAddress: '테스트동 123-456',
    zipCode: '12345',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockOrders = {
  pending: (count = 3) => 
    Array.from({ length: count }, (_, i) => 
      createMockOrder({ 
        id: `order_pending_${i + 1}`,
        status: 'pending' 
      })
    ),
    
  completed: (count = 3) =>
    Array.from({ length: count }, (_, i) => 
      createMockOrder({ 
        id: `order_completed_${i + 1}`,
        status: 'completed' 
      })
    ),
};
```

## 🧪 **컴포넌트 테스트 패턴**

### **기본 컴포넌트 테스트**
```typescript
// ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '../ProductCard';
import { createMockProduct } from '../../test-utils/factories/product';

describe('ProductCard Component', () => {
  test('상품 정보를 올바르게 렌더링한다', () => {
    const mockProduct = createMockProduct({
      name: 'Test Product',
      retailPrice: 15000,
      stock: 50,
    });

    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('₩15,000')).toBeInTheDocument();
    expect(screen.getByText('재고: 50개')).toBeInTheDocument();
  });

  test('편집 버튼 클릭 시 콜백이 호출된다', async () => {
    const user = userEvent.setup();
    const mockProduct = createMockProduct();
    const onEdit = vi.fn();

    render(<ProductCard product={mockProduct} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /편집/i });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockProduct);
  });

  test('재고 부족 시 경고 메시지를 표시한다', () => {
    const outOfStockProduct = createMockProducts.outOfStock();

    render(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText('품절')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /장바구니/ })).toBeDisabled();
  });
});
```

### **복잡한 컴포넌트 테스트**
```typescript
// ProductList.test.tsx
describe('ProductList Component', () => {
  test('로딩 상태를 올바르게 표시한다', () => {
    // MSW로 지연된 응답 시뮬레이션
    server.use(
      rest.get('/api/ecommerce/products', (req, res, ctx) => {
        return res(ctx.delay(1000), ctx.json({ data: [] }));
      })
    );

    render(<ProductList />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('에러 상태를 올바르게 처리한다', async () => {
    // MSW로 에러 응답 시뮬레이션
    server.use(
      rest.get('/api/ecommerce/products', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'Server Error' }));
      })
    );

    render(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText(/오류가 발생했습니다/i)).toBeInTheDocument();
    });
  });

  test('필터링이 올바르게 작동한다', async () => {
    const user = userEvent.setup();
    render(<ProductList />);

    // 카테고리 필터 선택
    const categoryFilter = screen.getByLabelText('카테고리');
    await user.selectOptions(categoryFilter, 'electronics');

    // API 호출 확인
    await waitFor(() => {
      expect(screen.getByText('전자제품')).toBeInTheDocument();
    });
  });
});
```

## 🔄 **비동기 테스트 패턴**

### **Promise 기반 테스트**
```typescript
test('비동기 데이터 로딩을 테스트한다', async () => {
  const mockData = [createMockProduct()];
  
  vi.mocked(EcommerceApi.getProducts).mockResolvedValue({
    data: mockData,
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const { result } = renderHook(() => useProducts(), { 
    wrapper: createTestWrapper() 
  });

  // 초기 로딩 상태 확인
  expect(result.current.isLoading).toBe(true);
  expect(result.current.data).toBeUndefined();

  // 데이터 로딩 완료 대기
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });

  // 최종 상태 확인
  expect(result.current.isLoading).toBe(false);
  expect(result.current.data?.data).toEqual(mockData);
});
```

### **타이머 기반 테스트**
```typescript
test('디바운스된 검색을 테스트한다', async () => {
  vi.useFakeTimers();
  
  const { result } = renderHook(() => useProductSearch());
  
  // 연속된 검색어 입력 시뮬레이션
  result.current.setSearchTerm('te');
  result.current.setSearchTerm('tes');
  result.current.setSearchTerm('test');
  
  // 디바운스 시간 경과
  vi.advanceTimersByTime(500);
  
  await waitFor(() => {
    expect(EcommerceApi.searchProducts).toHaveBeenCalledTimes(1);
    expect(EcommerceApi.searchProducts).toHaveBeenCalledWith('test');
  });
  
  vi.useRealTimers();
});
```

## 📊 **테스트 커버리지**

### **커버리지 목표**
- **전체 코드**: 80% 이상
- **비즈니스 로직**: 90% 이상
- **API 엔드포인트**: 100%
- **유틸리티 함수**: 95% 이상

### **커버리지 확인**
```bash
# 전체 테스트 실행 및 커버리지 확인
npm run test:coverage

# 특정 파일 커버리지 확인
npm run test -- --coverage src/hooks/useProducts.ts

# 커버리지 리포트 생성
npm run test:coverage:html
```

### **커버리지 설정**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-utils/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/main.tsx',
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
        'src/hooks/': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});
```

## 🚀 **성능 테스트**

### **API 응답 시간 테스트**
```typescript
test('API 응답 시간이 허용 범위 내에 있다', async () => {
  const startTime = Date.now();
  
  const { result } = renderHook(() => useProducts(), {
    wrapper: createTestWrapper()
  });
  
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  
  const responseTime = Date.now() - startTime;
  expect(responseTime).toBeLessThan(1000); // 1초 이내
});
```

### **메모리 누수 테스트**
```typescript
test('컴포넌트 언마운트 시 메모리 누수가 없다', async () => {
  const { unmount } = render(<ProductList />);
  
  // 컴포넌트 언마운트
  unmount();
  
  // 타이머나 구독이 정리되었는지 확인
  expect(vi.getTimerCount()).toBe(0);
});
```

## 🔒 **보안 테스트**

### **인증/권한 테스트**
```typescript
test('인증되지 않은 사용자는 관리자 API에 접근할 수 없다', async () => {
  server.use(
    rest.post('/api/admin/products', (req, res, ctx) => {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader) {
        return res(ctx.status(401), ctx.json({ message: 'Unauthorized' }));
      }
      
      return res(ctx.json({ success: true }));
    })
  );

  const { result } = renderHook(() => useCreateProduct(), {
    wrapper: createTestWrapper()
  });

  result.current.mutate(createMockProduct());

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(result.current.error?.response?.status).toBe(401);
});
```

### **입력 검증 테스트**
```typescript
test('유효하지 않은 입력을 거부한다', async () => {
  const invalidProduct = {
    name: '', // 빈 이름
    price: -100, // 음수 가격
    stock: 'invalid', // 잘못된 타입
  };

  const { result } = renderHook(() => useCreateProduct(), {
    wrapper: createTestWrapper()
  });

  result.current.mutate(invalidProduct);

  await waitFor(() => {
    expect(result.current.isError).toBe(true);
  });

  expect(result.current.error?.response?.data?.message).toContain('validation');
});
```

## 📋 **테스트 체크리스트**

### **새 기능 개발 시**
- [ ] 단위 테스트 작성 (함수/컴포넌트별)
- [ ] 통합 테스트 작성 (API 엔드포인트)
- [ ] 에러 시나리오 테스트
- [ ] 경계 조건 테스트
- [ ] 성능 테스트 (필요 시)

### **리팩토링 시**
- [ ] 기존 테스트 실행 및 통과 확인
- [ ] 변경된 부분의 테스트 업데이트
- [ ] 커버리지 유지 또는 개선
- [ ] 회귀 테스트 실행

### **배포 전**
- [ ] 전체 테스트 스위트 실행
- [ ] 커버리지 임계값 충족
- [ ] E2E 테스트 실행
- [ ] 성능 테스트 실행
- [ ] 보안 테스트 실행

## 🛠️ **테스트 도구 설정**

### **package.json 스크립트**
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:coverage:html": "vitest run --coverage --reporter=html",
    "test:unit": "vitest run src/**/*.test.{ts,tsx}",
    "test:integration": "vitest run src/**/*.integration.test.{ts,tsx}",
    "test:e2e": "playwright test"
  }
}
```

### **CI/CD 통합**
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:run
      - name: Run integration tests
        run: npm run test:integration
      - name: Check coverage
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

**💡 이 가이드는 O4O Platform의 품질 보증을 위한 핵심 도구입니다. 테스트 작성 시 이 가이드를 참고하여 일관성 있고 효과적인 테스트를 작성해주세요!**