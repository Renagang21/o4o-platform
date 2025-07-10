# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🌐 GitHub 저장소 정보 및 아키텍처

### 📁 Multi-Repo + Shared Core 아키텍처

**전체 저장소 구조:**
- **o4o-platform**: 메인 플랫폼 (프론트엔드, 전자상거래, 메인 서비스) - https://github.com/Renagang21/o4o-platform
- **common-core**: 공통 기능 모듈 (인증, 결제, 유틸리티) - https://github.com/Renagang21/common-core
- **ai-services**: AI 관련 서비스 (향후 계획)
- **rpa-services**: RPA 관련 서비스 (향후 계획)

### 🏗️ 아키텍처 패턴: Multi-Repo + Shared Core

**핵심 설계 원칙:**
1. **도메인별 독립 저장소**: 각 주요 서비스(o4o-platform 등)는 별도의 독립 저장소로 운영
2. **중앙 집중형 공통 모듈**: 인증, 결제, 공통 라이브러리는 common-core 저장소에서 중앙 관리
3. **패키지 기반 재사용**: 다양한 서비스/언어에서 공통 코어를 NPM 패키지 형태로 재사용
4. **Cross-domain 호환성**: 여러 도메인 서비스 간 일관된 공통 기능 제공

**현재 개발 상태:**
- **o4o-platform**: 🔥 **주력 개발 중** (React 19, Node.js 20, TypeScript 5.8)
- **common-core**: 📦 필요 시 연동/확장 (인증, 결제 모듈 포함)
- **기타 서비스**: 📋 향후 확장 계획

**협업 및 용어:**
- "Multi-Repo + Shared Core" 또는 "Cross-domain Shared Core" 구조로 명명
- 각 개별 서비스는 monorepo/mini-monorepo 구조 가능
- 공통 모듈은 common-core에서 버전 관리 및 배포

### 주요 저장소 링크
- **메인 플랫폼**: https://github.com/Renagang21/o4o-platform
- **문서**: https://github.com/Renagang21/o4o-platform/tree/main/docs  
- **공통 코어**: https://github.com/Renagang21/common-core

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

### o4o-platform 내부 구조 (Mini-Monorepo)
현재 **o4o-platform**은 **monorepo workspace** 구조로 여러 마이크로서비스를 포함:

```
o4o-platform/
├── 📁 services/                 # 마이크로서비스들
│   ├── api-server/              # Express.js + TypeORM + PostgreSQL (활성)
│   ├── main-site/               # React 19 + Vite + TailwindCSS (활성)
│   ├── admin-dashboard/         # 관리자 대시보드 (활성)
│   ├── crowdfunding/            # 크라우드펀딩 서비스 (부분 구현)
│   ├── ecommerce/               # 이커머스 서비스 (레거시)
│   ├── forum/                   # 포럼 서비스 (플레이스홀더)
│   └── signage/                 # 사이니지 서비스 (플레이스홀더)
├── 📁 packages/                 # 공통 패키지 (Phase 2에서 추가됨)
│   ├── ui/                      # UI 컴포넌트 라이브러리
│   ├── lib/                     # 공통 라이브러리
│   ├── types/                   # TypeScript 타입 정의
│   └── config/                  # 설정 파일들
├── 📁 scripts/                  # 자동화 스크립트
├── 📁 docs/                     # 종합 문서
├── 📁 .github/workflows/        # CI/CD 자동화
└── 📄 설정 파일들                # package.json, tsconfig.json 등
```

**Multi-Repo + Shared Core와의 관계:**
- **o4o-platform**: 메인 플랫폼의 모든 서비스를 하나의 저장소에서 관리 (Mini-Monorepo)
- **common-core**: 여러 저장소에서 공유할 수 있는 핵심 기능 (Cross-Repo 공유)
- 향후 **ai-services**, **rpa-services** 등이 별도 저장소로 생성될 때 common-core를 공유 사용

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

## 🚨 반복되는 코딩 실수 패턴 및 해결방안

### 1. Import 경로 오류 (가장 빈번한 실수)
**문제 패턴:**
```typescript
// ❌ 잘못된 import - components 경로 누락
import { DropshippingRouter } from '@shared/dropshipping';

// ✅ 올바른 import
import { DropshippingRouter } from '@shared/components/dropshipping';
// 또는 직접 경로 사용 (더 안전)
import { DropshippingRouter } from '../../shared/components/dropshipping';
```

**필수 확인사항:**
- shared 폴더 구조: `shared/components/[module-name]`
- vite.config.ts의 alias 설정 확인
- 실제 파일 위치와 import 경로 일치 여부

### 2. 빌드 검증 없는 배포
**문제:** 로컬에서 `npm run build` 없이 바로 커밋&푸시

**필수 작업 절차:**
```bash
# 1. 수정 전 빌드 상태 확인
npm run build

# 2. 코드 수정

# 3. 수정 후 반드시 빌드 테스트
npm run build

# 4. 빌드 성공 시에만 커밋
git add .
git commit -m "fix: [구체적 수정 내용]"
```

### 3. Error Boundary 남용
**문제:** 근본 원인(import 에러) 해결 대신 Error Boundary로 감싸기만 함

**올바른 접근:**
1. 먼저 import 에러 해결
2. 빌드 성공 확인
3. 그 다음 Error Boundary는 예외 상황 대비용으로만 사용

### 4. 개발/운영 환경 혼동
**문제:** 운영 서버에서 개발 모드로 실행

**환경 설정 원칙:**
- 개발: NODE_ENV=development
- 운영: NODE_ENV=production
- 절대 운영에서 VITE_DEV_MODE=true 사용 금지

## 📋 Claude Code 필수 체크리스트

### 작업 시작 전
- [ ] 현재 빌드 상태 확인: `npm run build`
- [ ] 프로젝트 구조 파악: `ls -la shared/components/`
- [ ] 최근 커밋 확인: `git log --oneline -5`

### 코드 수정 시
- [ ] Import 경로 정확성 확인 (특히 @shared 사용 시)
- [ ] 각 수정 후 빌드 테스트
- [ ] TypeScript 타입 에러 확인: `npx tsc --noEmit`

### 커밋 전
- [ ] `npm run build` 성공 확인
- [ ] `npm run type-check` 성공 확인
- [ ] 브라우저에서 로컬 테스트
- [ ] 기존 기능 영향도 확인

### 자주 하는 실수 방지
- [ ] @shared/[module] → @shared/components/[module] 경로 확인
- [ ] 새 기능이 기존 기능을 깨트리지 않는지 확인
- [ ] Error Boundary는 마지막 수단으로만 사용
- [ ] 운영 환경에서 개발 모드 설정 금지

## 📚 상세 문서 참조

프론트엔드 개발 및 버그 수정에 대한 더 자세한 내용은 다음 문서를 참고하세요:
- **종합 가이드**: `docs/technical/o4o-platform-comprehensive-guide.md`
- **프론트엔드 버그 수정 가이드**: `docs/technical/frontend-bug-fixing-guide.md`

## 📚 프론트엔드 개발 지침서 참조

**중요**: 모든 프론트엔드 작업 시 `/FRONTEND_GUIDELINES.md` 파일을 반드시 참조해주세요.

### 핵심 원칙:
1. **기존 코드베이스 절대 보호** - 모든 기존 기능 정상 작동 보장
2. **에러 전파 방지** - Error Boundary 의무 적용, 모듈별 격리
3. **점진적 통합** - 독립적 모듈 개발, 기존 구조 보호

### 필수 구현 패턴:
- **Error Boundary 패턴**: 모든 새 모듈 필수 적용
- **Lazy Loading 패턴**: 대용량 모듈 지연 로딩
- **조건부 Import 패턴**: 선택적 의존성으로 안전성 확보

### 안전성 체크리스트:
- [ ] Error Boundary 적용
- [ ] Lazy loading 구현  
- [ ] Fallback UI 제공
- [ ] 기존 페이지 정상 작동 확인
- [ ] TypeScript 타입 체크 통과
- [ ] Build 성공 확인

**이 지침서는 프론트엔드 작업의 모든 기준이 됩니다. 새로운 기능 개발 시 반드시 준수해주세요.**

## 🔹 아키텍처 참고사항 (Architecture Reference)

### Multi-Repo + Shared Core 개념 요약
이 프로젝트는 **Multi-Repo + Shared Core** 아키텍처를 채택하여:
1. **확장성**: 각 도메인별 독립 저장소로 수평 확장 용이
2. **모듈화**: 공통 기능의 중앙 집중 관리로 코드 재사용성 극대화  
3. **유연성**: 다양한 기술 스택과 언어 환경에서의 공통 모듈 활용
4. **협업 효율성**: 팀별 독립 개발과 공통 표준의 균형

### 향후 확장 시 고려사항
- AI/ML 서비스, RPA 서비스 등 신규 도메인 추가 시 별도 저장소 생성
- 인증, 결제, 공통 유틸리티는 common-core에서 NPM 패키지로 제공
- 각 서비스는 독립적 배포/버전 관리하되 공통 모듈은 표준화된 인터페이스 유지

**이 구조는 확장 가능한 마이크로서비스 생태계 구축을 목표로 설계되었습니다.**

## 🗂️ 작업 공간(Workspace) 표준 운영 절차

### ⚠️ 중요: 최상위 작업 공간 변경 (2025년 1월 기준)
**공식 최상위 작업 공간**: `/mnt/c/Users/home/OneDrive/Coding`

### 작업 시작 절차
1. **AI 에이전트는 항상 최상위 작업 공간에서 시작합니다**
2. **o4o-platform 작업 시 반드시 다음 순서를 따라야 합니다:**
   ```bash
   # 1. 현재 위치 확인
   pwd  # /mnt/c/Users/home/OneDrive/Coding 이어야 함
   
   # 2. o4o-platform 디렉토리로 이동
   cd o4o-platform
   
   # 3. 이후 작업 수행
   npm run dev:all  # 예시
   ```

### 작업 공간 원칙
- 모든 새로운 세션은 `/mnt/c/Users/home/OneDrive/Coding`에서 시작
- 프로젝트별 작업은 해당 하위 디렉토리로 이동 후 수행
- 파일 경로 참조 시 최상위 작업 공간 기준으로 상대 경로 사용

**이 표준은 모든 AI 에이전트와의 협업에서 일관성을 보장하기 위한 핵심 프로세스입니다.**
