# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 중요 프로젝트 방침 (IMPORTANT PROJECT POLICIES)

### ⚠️ 환경 설정 방침
- **Docker 사용 안 함**: AWS Lightsail을 사용하고 있어서 MVP 제작 과정에서는 Docker를 사용하지 않습니다
- **개발 환경**: WSL Ubuntu + Node.js 직접 설치 방식 사용
- **배포 환경**: AWS Lightsail (neture.co.kr)
- **프로세스 관리**: 컨테이너화 없이 PM2로 직접 관리

### ⚠️ 현재 환경 이슈
- WSL 환경에서 포트 바인딩 문제 존재
- Node.js 18.19.1 → 20 업그레이드 필요
- 개발 서버 실행 시 네트워크 설정 확인 필요

**중요**: Docker나 컨테이너 관련 솔루션을 제안하지 마세요. 현재 프로젝트는 직접 Node.js를 실행하는 방식으로 진행합니다.

## 🚀 Quick Start Commands

### Development
```bash
# Start all services (API + Web)
npm run dev:all

# Start individual services
npm run dev:api        # API server only (port 4000)
npm run dev:web        # React app only (port 3000)

# Smart development start (with health checks)
npm run dev:smart

# Install all dependencies
npm run install:all
```

### Build & Deploy
```bash
# Build all services
npm run build:all

# Build individual services
npm run build:api      # API server build
npm run build:web      # React app build

# Production deployment (GitHub Actions)
git push origin main   # Triggers automatic deployment
```

### Testing & Quality
```bash
# Type checking
npm run type-check:all # All services
npm run type-check     # API server only

# Linting
npm run lint:all       # All services
npm run lint:fix       # Auto-fix issues

# Testing
npm run test           # API server tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests
npm run test:coverage  # With coverage report
```

### Database Operations
```bash
# Database setup (Local PostgreSQL - Docker 사용 안 함)
cd services/api-server
# PostgreSQL은 로컬에 직접 설치하거나 AWS Lightsail에서 실행
# 개발 환경에서는 로컬 PostgreSQL 사용
# 프로덕션은 AWS Lightsail PostgreSQL 사용

# TypeORM migrations
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert last migration
```

## 🏗️ Architecture Overview

### Project Structure
This is a **monorepo workspace** with microservices architecture:

```
o4o-platform/
├── services/
│   ├── api-server/          # Express.js + TypeORM + PostgreSQL
│   ├── main-site/           # React 19 + Vite + TailwindCSS  
│   ├── ecommerce/           # E-commerce modules
│   └── [other-services]/    # Future microservices
├── scripts/                 # Automation scripts
├── docs/                    # Comprehensive documentation
└── .github/workflows/       # CI/CD automation
```

### Core Technologies
- **Backend**: Node.js 20, TypeScript 5.8, Express.js, TypeORM
- **Frontend**: React 19, Vite, TailwindCSS, TypeScript
- **Database**: PostgreSQL 15+ (with connection pooling)
- **Authentication**: JWT with role-based access control
- **Infrastructure**: AWS Lightsail (production), Local Node.js + PostgreSQL (development)

## 🛍️ E-commerce System Design

### Role-Based Unified System
The platform uses a **revolutionary unified approach** instead of separate B2B/B2C systems:

- **CUSTOMER**: Standard retail prices
- **BUSINESS**: Wholesale prices (bulk discounts)
- **AFFILIATE**: Special affiliate pricing
- **ADMIN**: Full management access

### Price Logic Implementation
```typescript
// Core pricing logic in Product entity
getPriceForUser(userRole: string): number {
  switch (userRole) {
    case 'business':   return this.wholesalePrice || this.retailPrice;
    case 'affiliate':  return this.affiliatePrice || this.retailPrice;
    default:          return this.retailPrice;
  }
}
```

### Transaction Safety
All order operations use **ACID transactions**:
1. Create order
2. Deduct inventory
3. Clear cart
4. Commit or rollback all changes atomically

## 📊 Database Architecture

### Key Entities (TypeORM)
- **User**: Role-based authentication (`services/api-server/src/entities/User.ts`)
- **Product**: Multi-tier pricing system (`services/api-server/src/entities/Product.ts`)
- **Cart/CartItem**: Shopping cart management
- **Order/OrderItem**: Transaction processing with snapshots
- **Category**: Product categorization
- **CustomPost/CustomPostType**: Content management system

### Database Connection
- Configuration: `services/api-server/src/database/connection.ts`
- Connection pooling configured (min: 5, max: 20)
- Auto-migration in development mode
- Environment variables: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`

## 🔗 API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration with role assignment
- `POST /login` - JWT token generation
- `GET /profile` - User profile (requires auth)
- `PUT /profile` - Profile updates (requires auth)

### E-commerce (`/api/ecommerce`)
**Products** (`/products`):
- `GET /` - List with filtering, pagination, role-based pricing
- `GET /:id` - Product details with user-specific pricing
- `POST /` - Create product (admin only)
- `PUT /:id` - Update product (admin only)
- `DELETE /:id` - Delete product (admin only)
- `GET /featured` - Featured products

**Cart** (`/cart`):
- `GET /` - User's cart with calculated totals
- `POST /items` - Add item to cart
- `PUT /items/:id` - Update quantity
- `DELETE /items/:id` - Remove item
- `DELETE /` - Clear entire cart

**Orders** (`/orders`):
- `GET /` - User's order history
- `GET /:id` - Order details
- `POST /` - Create order (with transaction processing)
- `POST /:id/cancel` - Cancel order

## 🚀 Development Workflows

### Adding New Features
1. **Backend API**: Add to `services/api-server/src/`
   - Controllers in `controllers/`
   - Routes in `routes/`
   - Entities in `entities/`
   - Business logic with proper TypeScript types

2. **Frontend**: Add to `services/main-site/src/`
   - Components in `components/`
   - Pages in `pages/`
   - API integration with type-safe Axios calls

### Code Standards
- **TypeScript**: Strict mode enabled, 100% type safety required
- **ESLint**: Shared configuration in root `eslint.config.js`
- **Prettier**: Consistent formatting across all services
- **Commit messages**: Follow conventional commits pattern

### Testing Approach
- **Unit tests**: Individual function/component testing
- **Integration tests**: API endpoint testing with database
- **E2E tests**: Full workflow testing (planned)
- Always run `npm run type-check` before commits

## 🌐 Deployment Architecture

### Production Environment
- **Domain**: neture.co.kr
- **Web Server**: AWS Lightsail (13.125.144.8)
- **API Server**: AWS Lightsail (separate instance)
- **Database**: PostgreSQL on API server
- **Process Manager**: PM2 for both services

### CI/CD Pipeline
- **Trigger**: Push to `main` branch
- **Actions**: TypeScript compilation, entity validation, build verification
- **Deployment**: SSH-based deployment to AWS Lightsail
- **File**: `.github/workflows/deploy-web.yml`

### Environment Variables
**API Server** (`.env` in `services/api-server/`):
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=o4o_platform
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

## 🔧 Common Tasks

### Adding New Entity
1. Create entity in `services/api-server/src/entities/`
2. Add to `connection.ts` entities array
3. Generate migration: `npm run migration:generate`
4. Create controller and routes
5. Update API documentation

### Frontend-Backend Integration
1. Define TypeScript interfaces for API responses
2. Create API client functions with proper error handling
3. Implement React components with loading/error states
4. Test with actual backend endpoints

### Database Schema Changes
1. Modify entity files
2. Generate migration: `npm run migration:generate`
3. Review generated migration SQL
4. Run migration: `npm run migration:run`
5. Update documentation if needed

## 📚 Documentation References

- **API Specification**: `docs/03-reference/ecommerce-api-specification.md`
- **Database Schema**: `docs/03-reference/database-schema.md`
- **Business Logic**: `docs/03-reference/business-logic-guide.md`
- **Architecture**: `docs/architecture.md`
- **Development Guide**: `docs/development-guide/README.md`

## ⚠️ Important Notes

### Current Status (Phase 1 Complete)
- ✅ **Backend API**: 100% implemented (14 endpoints)
- ✅ **Database Models**: 100% complete (9 entities)
- ✅ **Business Logic**: Role-based pricing, inventory, transactions
- ✅ **Documentation**: Comprehensive API specs and guides
- ⏳ **Database Connection**: Needs AWS Lightsail PostgreSQL setup
- ⏳ **Frontend Integration**: React app needs API connection

### When Working on This Project
1. **Always run type checking** before making changes
2. **Database changes require migrations** - never modify production schema directly
3. **API responses follow standard format** - maintain consistency
4. **Role-based access control** is critical - test with different user roles
5. **Transaction integrity** must be maintained in all order operations
6. **NO Docker** - 직접 Node.js와 PostgreSQL을 로컬에 설치하여 사용
7. **환경 이슈 대응** - WSL 포트 바인딩 문제 시 네트워크 설정 확인
8. **Node.js 버전** - 20.x 버전 필수 (18.x에서는 일부 패키지 호환성 문제)

### Code Style Preferences
- Use TypeScript strict mode features
- Prefer async/await over promises
- Use TypeORM query builders for complex queries
- Follow RESTful API conventions
- Implement proper error handling with meaningful messages

This platform emphasizes **simplicity over complexity** while maintaining enterprise-grade reliability and performance.