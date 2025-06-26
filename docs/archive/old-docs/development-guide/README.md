# 🛠️ O4O Platform - 개발 가이드

> **Phase 1 구현 완료** - E-commerce 백엔드 100% 완료, 프론트엔드 연동 준비
> 
> **기준일**: 2025-06-22  
> **상태**: 백엔드 완료, 프론트엔드 연동 대기

---

## 🎯 **개발 환경 현황**

### **현재 구현 완료 상태**

| 구분 | 상태 | 완료율 | 설명 |
|------|------|--------|------|
| **백엔드 API** | ✅ 완료 | 100% | 14개 엔드포인트 구현 |
| **데이터 모델** | ✅ 완료 | 100% | 9개 엔티티 완전 구현 |
| **비즈니스 로직** | ✅ 완료 | 100% | 역할별 가격, 재고관리 |
| **트랜잭션 처리** | ✅ 완료 | 100% | ACID 보장 |
| **문서화** | ✅ 완료 | 100% | API 명세, DB 스키마 |
| **CI/CD** | ✅ 완료 | 100% | 자동 테스트 및 검증 |
| **DB 연결** | ⏳ 대기 | 0% | AWS Lightsail 연결 필요 |
| **프론트엔드 연동** | ⏳ 대기 | 0% | React 앱 연결 필요 |

### **기술 스택 현황**

```yaml
백엔드:
  언어: TypeScript 5.8+
  프레임워크: Express.js 4.18+
  ORM: TypeORM 0.3+
  데이터베이스: PostgreSQL 15+ (AWS Lightsail)
  인증: JWT
  CI/CD: GitHub Actions

프론트엔드:
  프레임워크: React 19
  라우팅: React Router
  상태관리: Context API
  UI: Tailwind CSS
  빌드: Vite

인프라:
  API 서버: AWS Lightsail (o4o-apiserver)
  웹 서버: AWS Lightsail (o4o-webserver)
  도메인: neture.co.kr
```

---

## 🚀 **개발 시작하기**

### **1. 환경 설정**

```bash
# 프로젝트 클론
git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform

# 루트 의존성 설치
npm install

# API 서버 의존성 설치
cd services/api-server
npm install

# 메인 사이트 의존성 설치
cd ../main-site
npm install
```

### **2. 환경 변수 설정**

#### **API 서버 (.env)**

```env
# 데이터베이스 연결
DATABASE_URL=postgresql://username:password@localhost:5432/o4o_platform
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=secure_password
DB_DATABASE=o4o_platform

# JWT 인증
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# 서버 설정
PORT=4000
NODE_ENV=development

# CORS 설정
CORS_ORIGIN=http://localhost:3000
```

#### **프론트엔드 (.env)**

```env
# API 서버 연결
VITE_API_BASE_URL=http://localhost:4000/api
VITE_API_TIMEOUT=10000

# 앱 설정
VITE_APP_NAME=O4O Platform
VITE_APP_VERSION=1.0.0
```

### **3. 개발 서버 실행**

```bash
# 모든 서비스 동시 시작
npm run dev:all

# 개별 서비스 시작
npm run dev:api      # API 서버 (포트 4000)
npm run dev:main     # 메인 사이트 (포트 3000)
```

### **4. 개발 환경 확인**

```bash
# API 서버 헬스 체크
curl http://localhost:4000/api/health

# 프론트엔드 접속
open http://localhost:3000
```

---

## 📁 **프로젝트 구조**

### **전체 폴더 구조**

```
o4o-platform/
├── 📁 services/                 # 마이크로서비스들
│   ├── 📁 api-server/           # 백엔드 API 서버
│   │   ├── 📁 src/
│   │   │   ├── 📁 controllers/  # API 컨트롤러
│   │   │   ├── 📁 entities/     # TypeORM 엔티티
│   │   │   ├── 📁 routes/       # 라우트 정의
│   │   │   ├── 📁 middleware/   # 미들웨어
│   │   │   ├── 📁 database/     # DB 연결 설정
│   │   │   └── 📁 utils/        # 유틸리티 함수
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   ├── 📁 main-site/            # 메인 웹사이트
│   ├── 📁 crowdfunding/         # 크라우드펀딩 (예정)
│   ├── 📁 ecommerce/            # E-commerce (예정)
│   ├── 📁 forum/                # 포럼 (예정)
│   └── 📁 signage/              # 디지털 사이니지 (예정)
├── 📁 docs/                     # 문서
│   ├── 📁 01-setup/             # 환경 설정 가이드
│   ├── 📁 02-operations/        # 운영 가이드
│   ├── 📁 03-reference/         # 기술 참조 문서
│   └── 📁 development-guide/    # 개발 가이드
├── 📁 .github/                  # GitHub Actions
│   └── 📁 workflows/            # CI/CD 워크플로우
├── 📄 package.json              # 루트 패키지 설정
└── 📄 README.md                 # 프로젝트 소개
```

### **API 서버 상세 구조**

```
services/api-server/src/
├── 📁 controllers/              # 비즈니스 로직 컨트롤러
│   ├── 📄 authController.ts     # 인증 관리
│   ├── 📄 productsController.ts # 상품 관리
│   ├── 📄 cartController.ts     # 장바구니 관리
│   ├── 📄 ordersController.ts   # 주문 관리
│   └── 📄 cptController.ts      # 커스텀 포스트 타입
├── 📁 entities/                 # TypeORM 엔티티
│   ├── 📄 User.ts               # 사용자 모델
│   ├── 📄 Product.ts            # 상품 모델
│   ├── 📄 Category.ts           # 카테고리 모델
│   ├── 📄 Cart.ts               # 장바구니 모델
│   ├── 📄 CartItem.ts           # 장바구니 아이템
│   ├── 📄 Order.ts              # 주문 모델
│   ├── 📄 OrderItem.ts          # 주문 아이템
│   ├── 📄 CustomPostType.ts     # 커스텀 포스트 타입
│   └── 📄 CustomPost.ts         # 커스텀 포스트
├── 📁 routes/                   # 라우트 정의
│   ├── 📄 auth.ts               # 인증 라우트
│   ├── 📄 ecommerce.ts          # E-commerce 라우트
│   └── 📄 index.ts              # 라우트 통합
├── 📁 middleware/               # Express 미들웨어
│   ├── 📄 auth.ts               # JWT 인증 미들웨어
│   ├── 📄 validation.ts         # 입력 검증 미들웨어
│   └── 📄 cors.ts               # CORS 설정
├── 📁 database/                 # 데이터베이스 설정
│   ├── 📄 connection.ts         # TypeORM 연결 설정
│   └── 📄 migrations/           # 마이그레이션 파일들
└── 📁 utils/                    # 유틸리티 함수
    ├── 📄 jwt.ts                # JWT 헬퍼 함수
    ├── 📄 bcrypt.ts             # 비밀번호 해싱
    └── 📄 validators.ts         # 유효성 검증 함수
```

---

## 🔧 **개발 도구 및 명령어**

### **API 서버 명령어**

```bash
# 개발 서버 시작 (핫 리로드)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm run start

# TypeScript 컴파일 확인
npm run type-check

# 코드 포맷팅
npm run format

# 린트 검사
npm run lint

# 테스트 실행
npm run test

# 데이터베이스 마이그레이션
npm run typeorm:migration:run
npm run typeorm:migration:revert
npm run typeorm:migration:generate -- -n MigrationName
```

### **프론트엔드 명령어**

```bash
# 개발 서버 시작
npm run dev

# 빌드 (프로덕션)
npm run build

# 빌드 결과 미리보기
npm run preview

# 타입 체크
npm run type-check

# 린트 검사
npm run lint

# 테스트 실행
npm run test
```

### **전체 프로젝트 명령어**

```bash
# 모든 서비스 개발 서버 시작
npm run dev:all

# 모든 서비스 빌드
npm run build:all

# 모든 서비스 린트 검사
npm run lint:all

# 모든 서비스 테스트 실행
npm run test:all

# 의존성 설치 (모든 서비스)
npm run install:all
```

---

## 🗄️ **데이터베이스 연결**

### **로컬 개발 환경 설정**

#### **1. PostgreSQL 설치 및 설정**

```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Windows (Chocolatey)
choco install postgresql
```

#### **2. 데이터베이스 생성**

```sql
-- PostgreSQL 콘솔 접속
psql postgres

-- 데이터베이스 및 사용자 생성
CREATE DATABASE o4o_platform;
CREATE USER o4o_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;

-- 확장 기능 활성화
\c o4o_platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### **3. 연결 테스트**

```bash
# API 서버에서 DB 연결 테스트
cd services/api-server
npm run typeorm:check

# 마이그레이션 실행
npm run typeorm:migration:run
```

### **AWS Lightsail 연결**

#### **1. VPN 연결 (필요 시)**

```bash
# SSH 터널링을 통한 DB 접근
ssh -L 5432:localhost:5432 user@o4o-apiserver-ip
```

#### **2. 환경 변수 설정**

```env
# 프로덕션 환경 변수
DATABASE_URL=postgresql://username:password@o4o-apiserver-ip:5432/o4o_platform
DB_HOST=o4o-apiserver-ip
DB_PORT=5432
DB_SSL=true
```

---

## 🧪 **테스트 전략**

### **테스트 구조**

```
tests/
├── 📁 unit/                     # 단위 테스트
│   ├── 📁 entities/             # 엔티티 테스트
│   ├── 📁 controllers/          # 컨트롤러 테스트
│   └── 📁 utils/                # 유틸리티 테스트
├── 📁 integration/              # 통합 테스트
│   ├── 📁 api/                  # API 통합 테스트
│   └── 📁 database/             # DB 통합 테스트
└── 📁 e2e/                      # E2E 테스트
    ├── 📁 user-flows/           # 사용자 플로우 테스트
    └── 📁 scenarios/            # 시나리오 테스트
```

### **테스트 작성 예시**

#### **단위 테스트 (Product Entity)**

```typescript
// tests/unit/entities/Product.test.ts
import { Product } from '../../../src/entities/Product';

describe('Product Entity', () => {
  let product: Product;

  beforeEach(() => {
    product = new Product();
    product.retailPrice = 10000;
    product.wholesalePrice = 8000;
    product.affiliatePrice = 9000;
  });

  describe('getPriceForUser', () => {
    it('should return retail price for customer', () => {
      expect(product.getPriceForUser('customer')).toBe(10000);
    });

    it('should return wholesale price for business', () => {
      expect(product.getPriceForUser('business')).toBe(8000);
    });

    it('should return affiliate price for affiliate', () => {
      expect(product.getPriceForUser('affiliate')).toBe(9000);
    });

    it('should fall back to retail price when wholesale price is null', () => {
      product.wholesalePrice = null;
      expect(product.getPriceForUser('business')).toBe(10000);
    });
  });

  describe('isInStock', () => {
    it('should return true when stock management is disabled', () => {
      product.manageStock = false;
      product.stockQuantity = 0;
      expect(product.isInStock()).toBe(true);
    });

    it('should return false when stock is 0 and management is enabled', () => {
      product.manageStock = true;
      product.stockQuantity = 0;
      expect(product.isInStock()).toBe(false);
    });

    it('should return true when stock is positive', () => {
      product.manageStock = true;
      product.stockQuantity = 10;
      expect(product.isInStock()).toBe(true);
    });
  });
});
```

#### **통합 테스트 (API)**

```typescript
// tests/integration/api/products.test.ts
import request from 'supertest';
import { app } from '../../../src/app';
import { AppDataSource } from '../../../src/database/connection';

describe('Products API', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('GET /api/ecommerce/products', () => {
    it('should return products list', async () => {
      const response = await request(app)
        .get('/api/ecommerce/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should apply role-based pricing', async () => {
      // 비즈니스 사용자 로그인
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'business@example.com',
          password: 'password'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/api/ecommerce/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 비즈니스 사용자에게는 도매가가 적용되어야 함
      const product = response.body.data.products[0];
      expect(product.price).toBeLessThan(product.retailPrice);
    });
  });
});
```

### **테스트 실행**

```bash
# 모든 테스트 실행
npm run test

# 특정 테스트 파일 실행
npm run test -- Product.test.ts

# 커버리지 포함 테스트
npm run test:coverage

# 테스트 감시 모드
npm run test:watch
```

---

## 🚀 **배포 가이드**

### **빌드 프로세스**

```bash
# API 서버 빌드
cd services/api-server
npm run build

# 프론트엔드 빌드
cd services/main-site
npm run build
```

### **환경별 배포**

#### **개발 환경**

```bash
# 로컬 개발 서버
npm run dev:all
```

#### **스테이징 환경**

```bash
# 스테이징 서버 배포
npm run deploy:staging
```

#### **프로덕션 환경**

```bash
# 프로덕션 배포 (GitHub Actions 자동화)
git push origin main
```

### **AWS Lightsail 배포**

#### **API 서버 배포**

```bash
# 서버 접속
ssh user@o4o-apiserver-ip

# 코드 업데이트
git pull origin main
cd services/api-server

# 의존성 설치 및 빌드
npm install
npm run build

# 서버 재시작
pm2 restart api-server
```

#### **웹 서버 배포**

```bash
# 서버 접속
ssh user@o4o-webserver-ip

# 코드 업데이트
git pull origin main
cd services/main-site

# 빌드 및 배포
npm install
npm run build

# nginx 설정 업데이트
sudo cp dist/* /var/www/html/
sudo systemctl reload nginx
```

---

## 🐛 **디버깅 가이드**

### **일반적인 문제 해결**

#### **1. TypeORM 연결 오류**

```bash
# 연결 상태 확인
npm run typeorm:check

# 마이그레이션 상태 확인
npm run typeorm:migration:show
```

#### **2. CORS 오류**

```typescript
// cors.ts 미들웨어 확인
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

#### **3. JWT 인증 오류**

```typescript
// JWT 토큰 디버깅
console.log('JWT Secret:', process.env.JWT_SECRET);
console.log('Token:', req.headers.authorization);
```

### **로그 확인**

```bash
# API 서버 로그
tail -f services/api-server/logs/app.log

# PM2 로그 (프로덕션)
pm2 logs api-server

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 **성능 모니터링**

### **지표 수집**

```typescript
// 성능 메트릭 미들웨어
import { performance } from 'perf_hooks';

app.use((req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const end = performance.now();
    console.log(`${req.method} ${req.path}: ${end - start}ms`);
  });
  
  next();
});
```

### **데이터베이스 쿼리 최적화**

```typescript
// 쿼리 로깅 활성화
const connection = new DataSource({
  logging: ['query', 'error', 'schema'],
  logger: 'advanced-console',
  // ...
});
```

---

## 🔗 **다음 단계: 프론트엔드 연동**

### **API 클라이언트 생성**

```typescript
// src/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 인증 토큰 자동 추가
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### **React 훅 구현**

```typescript
// src/hooks/useProducts.ts
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiClient.get('/ecommerce/products');
        setProducts(response.data.data.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading };
};
```

---

**📅 최종 업데이트**: 2025-06-22  
**🏆 구현 상태**: Phase 1 백엔드 완료, 프론트엔드 연동 준비  
**🔗 관련 문서**: [API 명세서](../03-reference/ecommerce-api-specification.md), [환경 설정](../01-setup/environment-setup.md)
