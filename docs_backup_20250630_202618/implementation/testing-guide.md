# 테스트 가이드

## 📋 개요

O4O 플랫폼의 종합적인 테스트 전략과 실행 가이드입니다. 단위 테스트부터 E2E 테스트까지 전체 테스트 프로세스를 다룹니다.

## 🧪 테스트 전략

### 테스트 피라미드
```
        /\
       /  \
      / E2E \ (10%)
     /______\
    /        \
   /Integration\ (20%)
  /__________\
 /            \
/  Unit Tests  \ (70%)
\______________/
```

### 테스트 분류
1. **단위 테스트 (Unit Tests)**: 개별 함수, 컴포넌트 테스트
2. **통합 테스트 (Integration Tests)**: 컴포넌트 간 상호작용 테스트
3. **E2E 테스트 (End-to-End Tests)**: 전체 사용자 플로우 테스트

## 🛠️ 테스트 환경 설정

### 테스트 도구 스택
- **Jest**: 테스트 러너 및 어설션 라이브러리
- **React Testing Library**: React 컴포넌트 테스트
- **MSW (Mock Service Worker)**: API 모킹
- **Playwright**: E2E 테스트
- **Testing Utilities**: 커스텀 테스트 유틸리티

### 설치 및 설정

```bash
# 테스트 의존성 설치
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
npm install -D msw
npm install -D @playwright/test
npm install -D jest-environment-jsdom
```

**jest.config.js:**
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
};
```

**setupTests.ts:**
```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// MSW 서버 설정
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Zustand 스토어 초기화
afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
```

## 🧩 단위 테스트

### 컴포넌트 테스트

**Button 컴포넌트 테스트:**
```typescript
// src/components/common/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles correctly', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Store 테스트:**
```typescript
// src/stores/__tests__/authStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('initial state should be unauthenticated', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should login successfully with valid credentials', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    await act(async () => {
      await result.current.login({
        email: 'admin@o4o.com',
        password: 'admin123',
        userType: 'admin'
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.userType).toBe('admin');
  });

  it('should logout successfully', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    // 먼저 로그인
    await act(async () => {
      await result.current.login({
        email: 'admin@o4o.com',
        password: 'admin123',
        userType: 'admin'
      });
    });

    // 로그아웃
    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

### 유틸리티 함수 테스트

```typescript
// src/utils/__tests__/formatters.test.ts
import { formatPrice, formatDate } from '../formatters';

describe('formatters', () => {
  describe('formatPrice', () => {
    it('formats Korean currency correctly', () => {
      expect(formatPrice(1000000)).toBe('1,000,000');
      expect(formatPrice(1234567)).toBe('1,234,567');
      expect(formatPrice(0)).toBe('0');
    });
  });

  describe('formatDate', () => {
    it('formats date in Korean locale', () => {
      const date = '2024-06-24T10:30:00Z';
      const formatted = formatDate(date);
      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/6/);
      expect(formatted).toMatch(/24/);
    });
  });
});
```

## 🔗 통합 테스트

### 페이지 컴포넌트 테스트

```typescript
// src/pages/__tests__/Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from '../auth/Login';

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  const user = userEvent.setup();

  it('renders login form correctly', () => {
    renderLogin();
    
    expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/사용자 타입/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    renderLogin();
    
    await user.click(screen.getByRole('button', { name: /로그인/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/이메일을 입력해주세요/i)).toBeInTheDocument();
      expect(screen.getByText(/비밀번호를 입력해주세요/i)).toBeInTheDocument();
    });
  });

  it('logs in successfully with valid credentials', async () => {
    renderLogin();
    
    await user.type(screen.getByLabelText(/이메일/i), 'admin@o4o.com');
    await user.type(screen.getByLabelText(/비밀번호/i), 'admin123');
    await user.selectOptions(screen.getByLabelText(/사용자 타입/i), 'admin');
    
    await user.click(screen.getByRole('button', { name: /로그인/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/로그인 성공/i)).toBeInTheDocument();
    });
  });
});
```

### API 통합 테스트

```typescript
// src/stores/__tests__/productStore.integration.test.ts
import { renderHook, act } from '@testing-library/react';
import { useProductStore } from '../productStore';
import { server } from '../../mocks/server';
import { rest } from 'msw';

describe('ProductStore Integration', () => {
  it('fetches products successfully', async () => {
    const { result } = renderHook(() => useProductStore());
    
    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(result.current.products.length).toBeGreaterThan(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles fetch products error', async () => {
    // API 에러 시뮬레이션
    server.use(
      rest.get('/api/products', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
      })
    );

    const { result } = renderHook(() => useProductStore());
    
    await act(async () => {
      await result.current.fetchProducts();
    });

    expect(result.current.products.length).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });
});
```

## 🎭 MSW를 이용한 API 모킹

### MSW 핸들러 설정

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';
import { mockProducts } from './data/products';
import { mockUsers } from './data/users';
import { mockOrders } from './data/orders';

export const handlers = [
  // 인증 API
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password, userType } = req.body as any;
    
    const user = mockUsers.find(u => 
      u.email === email && u.userType === userType
    );
    
    if (!user || password !== 'admin123') {
      return res(
        ctx.status(401),
        ctx.json({ error: 'Invalid credentials' })
      );
    }
    
    return res(
      ctx.json({
        user,
        token: 'mock-jwt-token'
      })
    );
  }),

  // 상품 API
  rest.get('/api/products', (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';
    const limit = req.url.searchParams.get('limit') || '20';
    
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    
    return res(
      ctx.json({
        products: mockProducts.slice(startIndex, endIndex),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(mockProducts.length / parseInt(limit)),
          totalItems: mockProducts.length,
          itemsPerPage: parseInt(limit)
        }
      })
    );
  }),

  rest.get('/api/products/:id', (req, res, ctx) => {
    const { id } = req.params;
    const product = mockProducts.find(p => p.id === id);
    
    if (!product) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Product not found' })
      );
    }
    
    return res(ctx.json({ product }));
  }),

  // 주문 API
  rest.get('/api/orders', (req, res, ctx) => {
    return res(ctx.json({ orders: mockOrders }));
  }),

  rest.post('/api/orders', (req, res, ctx) => {
    const orderData = req.body as any;
    
    const newOrder = {
      id: Date.now().toString(),
      orderNumber: `ORD-${Date.now()}`,
      ...orderData,
      status: 'pending',
      orderDate: new Date().toISOString()
    };
    
    return res(
      ctx.status(201),
      ctx.json({ order: newOrder })
    );
  }),
];
```

### MSW 서버 설정

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## 🎯 E2E 테스트

### Playwright 설정

**playwright.config.ts:**
```typescript
import { PlaywrightTestConfig, devices } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
};

export default config;
```

### E2E 테스트 예시

**로그인 플로우 테스트:**
```typescript
// e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('admin login successfully', async ({ page }) => {
    await page.goto('/login');
    
    // 로그인 폼 확인
    await expect(page.locator('h1')).toContainText('로그인');
    
    // 폼 입력
    await page.fill('input[name="email"]', 'admin@o4o.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.selectOption('select[name="userType"]', 'admin');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 대시보드로 리다이렉트 확인
    await expect(page).toHaveURL('/admin/dashboard');
    await expect(page.locator('h1')).toContainText('관리자 대시보드');
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'invalid@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.selectOption('select[name="userType"]', 'admin');
    
    await page.click('button[type="submit"]');
    
    // 에러 메시지 확인
    await expect(page.locator('.error-message')).toContainText('로그인 정보가 올바르지 않습니다');
  });
});
```

**쇼핑 플로우 테스트:**
```typescript
// e2e/shopping/purchase.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Shopping Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 고객으로 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'customer@o4o.com');
    await page.fill('input[name="password"]', 'customer123');
    await page.selectOption('select[name="userType"]', 'customer');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/customer/dashboard');
  });

  test('complete purchase flow', async ({ page }) => {
    // 상품 검색
    await page.click('text=쇼핑몰');
    await page.fill('input[placeholder*="검색"]', '노트북');
    await page.press('input[placeholder*="검색"]', 'Enter');
    
    // 상품 선택
    await page.click('.product-card').first();
    await expect(page.locator('h1')).toContainText('노트북');
    
    // 장바구니에 추가
    await page.click('button:has-text("장바구니 담기")');
    await expect(page.locator('.toast')).toContainText('장바구니에 추가되었습니다');
    
    // 장바구니로 이동
    await page.click('text=장바구니');
    await expect(page.locator('.cart-item')).toHaveCount(1);
    
    // 주문하기
    await page.click('button:has-text("주문하기")');
    
    // 배송 정보 입력
    await page.fill('input[name="name"]', '홍길동');
    await page.fill('input[name="phone"]', '010-1234-5678');
    await page.fill('input[name="address"]', '서울시 강남구');
    await page.fill('input[name="zipCode"]', '12345');
    
    // 주문 완료
    await page.click('button:has-text("주문 완료")');
    await expect(page.locator('h1')).toContainText('주문이 완료되었습니다');
  });
});
```

**관리자 상품 승인 테스트:**
```typescript
// e2e/admin/product-approval.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Product Approval', () => {
  test.beforeEach(async ({ page }) => {
    // 관리자로 로그인
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@o4o.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.selectOption('select[name="userType"]', 'admin');
    await page.click('button[type="submit"]');
  });

  test('approve pending product', async ({ page }) => {
    // 상품 승인 페이지로 이동
    await page.click('text=상품 승인 관리');
    await expect(page).toHaveURL('/admin/products/pending');
    
    // 승인 대기 상품 확인
    const productRows = page.locator('.product-row');
    await expect(productRows).toHaveCountGreaterThan(0);
    
    // 첫 번째 상품 승인
    await productRows.first().locator('button:has-text("승인")').click();
    
    // 성공 메시지 확인
    await expect(page.locator('.toast')).toContainText('상품이 승인되었습니다');
  });
});
```

## 📊 테스트 커버리지

### 커버리지 설정

```javascript
// jest.config.js에 추가
module.exports = {
  // ... 기존 설정
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/mocks/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/stores/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
};
```

### 커버리지 실행

```bash
# 커버리지 포함 테스트 실행
npm run test:coverage

# 커버리지 리포트 확인
open coverage/lcov-report/index.html
```

## 🎮 테스트 유틸리티

### 커스텀 렌더 함수

```typescript
// src/test-utils/render.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
      <Toaster />
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### 테스트 데이터 팩토리

```typescript
// src/test-utils/factories.ts
import { User, Product, Order } from '../types';

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: '1',
  email: 'test@example.com',
  name: '테스트 사용자',
  phone: '010-1234-5678',
  userType: 'customer',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockProduct = (overrides?: Partial<Product>): Product => ({
  id: '1',
  name: '테스트 상품',
  brand: '테스트 브랜드',
  model: 'TEST-001',
  description: '테스트용 상품입니다',
  shortDescription: '테스트 상품',
  categories: ['1'],
  images: ['/test-image.jpg'],
  basePrice: 100000,
  pricing: {
    gold: 85000,
    premium: 75000,
    vip: 65000,
  },
  stockQuantity: 100,
  minOrderQuantity: 1,
  maxOrderQuantity: 10,
  approvalStatus: 'approved',
  supplierId: 'supplier1',
  rating: 4.5,
  reviewCount: 10,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
```

## 📋 테스트 실행 명령어

### Package.json 스크립트

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --watchAll=false",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:ci && npm run test:e2e"
  }
}
```

### CI/CD 테스트 파이프라인

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## 🔍 테스트 모범 사례

### 1. 테스트 작성 원칙
- **AAA 패턴**: Arrange, Act, Assert
- **단일 책임**: 하나의 테스트는 하나의 기능만 검증
- **독립성**: 테스트 간 의존성 제거
- **반복 가능**: 언제든 동일한 결과 보장

### 2. 네이밍 컨벤션
```typescript
// Good
describe('UserService', () => {
  describe('login', () => {
    it('should return user data when credentials are valid', () => {
      // 테스트 내용
    });
    
    it('should throw error when credentials are invalid', () => {
      // 테스트 내용
    });
  });
});
```

### 3. 테스트 데이터 관리
- 각 테스트마다 독립적인 데이터 사용
- 팩토리 함수로 테스트 데이터 생성
- 실제 데이터와 유사한 형태 유지

### 4. 비동기 테스트
```typescript
// Good - async/await 사용
it('should fetch user data', async () => {
  const userData = await userService.fetchUser('123');
  expect(userData.name).toBe('John Doe');
});

// Good - waitFor 사용
it('should show loading state', async () => {
  render(<UserProfile userId="123" />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

---

이 테스트 가이드를 통해 O4O 플랫폼의 품질을 보장하고 안정적인 서비스를 제공할 수 있습니다.