# 🧪 테스트 가이드

> **O4O Platform의 포괄적인 테스트 전략 및 구현 가이드**
> 
> **기준일**: 2025-06-25  
> **적용**: 백엔드 API + React 프론트엔드

---

## 🎯 **테스트 전략 개요**

### **테스트 피라미드**
```
        🔺 E2E 테스트
       ────────────────
      🔷 통합 테스트
     ──────────────────────
    🔹 단위 테스트 (기반)
   ────────────────────────────
```

### **커버리지 목표**
- **단위 테스트**: 80% 이상
- **통합 테스트**: 주요 API 엔드포인트 100%
- **E2E 테스트**: 핵심 사용자 플로우 100%

---

## 🔧 **테스트 환경 설정**

### **필수 의존성**
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "cypress": "^13.6.1"
  }
}
```

### **설정 스크립트**
```bash
# 테스트 의존성 설치
npm install --save-dev jest supertest @testing-library/react @testing-library/jest-dom cypress

# Jest 설정 파일 생성
echo '{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src", "<rootDir>/tests"],
  "testMatch": ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
  "collectCoverageFrom": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts"
  ]
}' > jest.config.json
```

---

## 🔹 **단위 테스트 (Unit Tests)**

### **백엔드 단위 테스트**

#### **서비스 클래스 테스트**
```typescript
// tests/services/user.service.test.ts
import { UserService } from '../../src/services/user.service';
import { UserRepository } from '../../src/repositories/user.repository';

jest.mock('../../src/repositories/user.repository');
const mockUserRepo = UserRepository as jest.Mocked<typeof UserRepository>;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  test('사용자 생성 성공', async () => {
    // Given
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.CUSTOMER
    };
    
    const expectedUser = { id: 1, ...userData };
    mockUserRepo.prototype.create.mockResolvedValue(expectedUser);

    // When
    const result = await userService.createUser(userData);

    // Then
    expect(result).toEqual(expectedUser);
    expect(mockUserRepo.prototype.create).toHaveBeenCalledWith(userData);
  });

  test('중복 이메일 에러 처리', async () => {
    // Given
    const userData = { email: 'duplicate@example.com', password: 'test', role: UserRole.CUSTOMER };
    mockUserRepo.prototype.create.mockRejectedValue(new Error('Email already exists'));

    // When & Then
    await expect(userService.createUser(userData))
      .rejects.toThrow('Email already exists');
  });
});
```

#### **유틸리티 함수 테스트**
```typescript
// tests/utils/pricing.util.test.ts
import { calculatePrice } from '../../src/utils/pricing.util';
import { UserRole } from '../../src/entities/user.entity';

describe('calculatePrice', () => {
  const product = {
    retailPrice: 100,
    wholesalePrice: 80,
    affiliatePrice: 70
  };

  test.each([
    [UserRole.CUSTOMER, 100],
    [UserRole.BUSINESS, 80], 
    [UserRole.AFFILIATE, 70],
    [UserRole.ADMIN, 100]
  ])('역할 %s에 대해 가격 %d 반환', (role, expectedPrice) => {
    expect(calculatePrice(product, role)).toBe(expectedPrice);
  });
});
```

### **프론트엔드 단위 테스트**

#### **React 컴포넌트 테스트**
```typescript
// tests/components/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../../src/components/ProductCard';

const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 100,
  stock: 5
};

describe('ProductCard', () => {
  test('상품 정보가 올바르게 렌더링됨', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('재고: 5개')).toBeInTheDocument();
  });

  test('장바구니 추가 버튼 클릭 시 콜백 호출', () => {
    const mockOnAddToCart = jest.fn();
    render(<ProductCard product={mockProduct} onAddToCart={mockOnAddToCart} />);
    
    const addButton = screen.getByText('장바구니 추가');
    fireEvent.click(addButton);
    
    expect(mockOnAddToCart).toHaveBeenCalledWith(mockProduct.id);
  });
});
```

---

## 🔷 **통합 테스트 (Integration Tests)**

### **API 엔드포인트 테스트**

#### **Express 앱 테스트 설정**
```typescript
// tests/integration/app.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { initializeTestDB, cleanupTestDB } from '../helpers/test-db';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    await initializeTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  afterEach(async () => {
    // 각 테스트 후 DB 정리
    await cleanupTestData();
  });
});
```

#### **E-commerce API 테스트**
```typescript
describe('POST /api/ecommerce/products', () => {
  test('상품 생성 성공', async () => {
    const productData = {
      name: 'Test Product',
      retailPrice: 100,
      wholesalePrice: 80,
      affiliatePrice: 70,
      stock: 10
    };

    const response = await request(app)
      .post('/api/ecommerce/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(productData)
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Test Product',
      retailPrice: 100
    });
  });

  test('인증 없이 상품 생성 시 401 에러', async () => {
    const productData = {
      name: 'Test Product',
      retailPrice: 100
    };

    await request(app)
      .post('/api/ecommerce/products')
      .send(productData)
      .expect(401);
  });
});

describe('GET /api/ecommerce/products', () => {
  test('역할별 가격 적용 확인', async () => {
    // Given: 상품 생성
    const product = await createTestProduct();
    
    // When: BUSINESS 사용자로 조회
    const response = await request(app)
      .get('/api/ecommerce/products')
      .set('Authorization', `Bearer ${businessToken}`)
      .expect(200);

    // Then: wholesale 가격 적용됨
    const returnedProduct = response.body.find(p => p.id === product.id);
    expect(returnedProduct.price).toBe(product.wholesalePrice);
  });
});
```

### **데이터베이스 통합 테스트**
```typescript
// tests/integration/database.test.ts
import { UserRepository } from '../../src/repositories/user.repository';
import { ProductRepository } from '../../src/repositories/product.repository';

describe('Database Integration', () => {
  test('사용자와 주문 관계 테스트', async () => {
    // Given
    const user = await UserRepository.create({
      email: 'test@example.com',
      role: UserRole.CUSTOMER
    });

    const product = await ProductRepository.create({
      name: 'Test Product',
      retailPrice: 100,
      stock: 10
    });

    // When: 주문 생성
    const order = await OrderRepository.create({
      userId: user.id,
      items: [{ productId: product.id, quantity: 2 }]
    });

    // Then: 관계 확인
    const orderWithUser = await OrderRepository.findWithUser(order.id);
    expect(orderWithUser.user.email).toBe('test@example.com');
  });
});
```

---

## 🔺 **E2E 테스트 (End-to-End)**

### **Cypress 설정**
```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    video: false,
    screenshotOnRunFailure: true
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    }
  }
});
```

### **핵심 사용자 플로우 테스트**
```typescript
// cypress/e2e/user-flow.cy.ts
describe('사용자 주요 플로우', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.seedDatabase(); // 테스트 데이터 준비
  });

  it('회원가입부터 상품 구매까지 전체 플로우', () => {
    // 회원가입
    cy.get('[data-cy=signup-button]').click();
    cy.get('[data-cy=email-input]').type('test@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=role-select]').select('business');
    cy.get('[data-cy=submit-button]').click();

    // 로그인
    cy.get('[data-cy=login-button]').click();
    cy.get('[data-cy=email-input]').type('test@example.com');
    cy.get('[data-cy=password-input]').type('password123');
    cy.get('[data-cy=login-submit]').click();

    // 상품 페이지 이동
    cy.get('[data-cy=products-menu]').click();
    cy.url().should('include', '/products');

    // 상품을 장바구니에 추가
    cy.get('[data-cy=product-card]').first().within(() => {
      cy.get('[data-cy=add-to-cart]').click();
    });

    // 장바구니 확인
    cy.get('[data-cy=cart-icon]').click();
    cy.get('[data-cy=cart-item]').should('have.length', 1);

    // 주문 완료
    cy.get('[data-cy=checkout-button]').click();
    cy.get('[data-cy=order-confirm]').click();
    cy.get('[data-cy=success-message]').should('be.visible');
  });

  it('역할별 가격 차이 확인', () => {
    // Business 사용자 로그인
    cy.loginAs('business');
    cy.visit('/products');
    
    // 첫 번째 상품의 가격 확인 (wholesale 가격)
    cy.get('[data-cy=product-price]').first().then(($price) => {
      const businessPrice = $price.text();
      
      // 로그아웃 후 Customer로 로그인
      cy.logout();
      cy.loginAs('customer');
      cy.visit('/products');
      
      // 같은 상품의 가격이 다른지 확인 (retail 가격)
      cy.get('[data-cy=product-price]').first().should('not.contain', businessPrice);
    });
  });
});
```

---

## 📊 **테스트 실행 및 커버리지**

### **NPM 스크립트 설정**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:all": "npm run test && npm run test:integration && npm run test:e2e"
  }
}
```

### **커버리지 보고서**
```bash
# 커버리지 실행
npm run test:coverage

# 결과 예시
 PASS  tests/services/user.service.test.ts
 PASS  tests/utils/pricing.util.test.ts
 PASS  tests/integration/api.test.ts

=============================== Coverage Summary ===============================
Statements   : 85.4% ( 123/144 )
Branches     : 78.9% ( 45/57 )
Functions    : 92.1% ( 35/38 )
Lines        : 87.2% ( 118/135 )
================================================================================
```

### **CI/CD 통합**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Run integration tests  
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## 🛠️ **테스트 헬퍼 유틸리티**

### **공통 테스트 헬퍼**
```typescript
// tests/helpers/test-db.ts
export const initializeTestDB = async () => {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
};

export const cleanupTestDB = async () => {
  await AppDataSource.destroy();
};

export const cleanupTestData = async () => {
  const entities = AppDataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.clear();
  }
};
```

### **Mock 데이터 팩토리**
```typescript
// tests/helpers/factories.ts
export const createTestUser = (overrides = {}) => ({
  email: 'test@example.com',
  password: 'password123',
  role: UserRole.CUSTOMER,
  status: UserStatus.APPROVED,
  ...overrides
});

export const createTestProduct = (overrides = {}) => ({
  name: 'Test Product',
  retailPrice: 100,
  wholesalePrice: 80,
  affiliatePrice: 70,
  stock: 10,
  ...overrides
});
```

### **Cypress 커스텀 명령어**
```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(role: string): Chainable<void>;
      seedDatabase(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (role: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: `${role}@test.com`,
      password: 'password123'
    }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
  });
});

Cypress.Commands.add('seedDatabase', () => {
  cy.request('POST', '/api/test/seed');
});
```

---

## 🎯 **베스트 프랙티스**

### **테스트 작성 원칙**
- **AAA 패턴**: Arrange, Act, Assert
- **단일 책임**: 하나의 테스트는 하나의 기능만 검증
- **독립성**: 테스트 간 의존성 없음
- **반복 가능**: 언제든 같은 결과

### **네이밍 컨벤션**
```typescript
// ✅ 좋은 예
test('사용자 생성 시 이메일 중복 에러 반환')
test('BUSINESS 사용자에게 wholesale 가격 적용')

// ❌ 피해야 할 것
test('test user creation')
test('price calculation')
```

### **에러 메시지 작성**
```typescript
// ✅ 명확한 에러 메시지
expect(result.price).toBe(80, 
  `BUSINESS 사용자에게는 wholesale 가격(80)이 적용되어야 하는데 ${result.price}가 반환됨`);

// ❌ 불명확한 메시지  
expect(result.price).toBe(80);
```

---

<div align="center">

**🧪 완전한 테스트로 안정적인 코드! 🧪**

[🌿 Git 워크플로우](git-workflow.md) • [📏 코딩 표준](coding-standards.md) • [⚡ 퀵스타트](../01-getting-started/quick-start.md)

</div>
