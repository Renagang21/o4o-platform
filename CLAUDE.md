# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Critical Development Rules

### Code Quality Enforcement
1. **ALWAYS run lint and type-check before any code submission**
   ```bash
   npm run type-check --workspace=@o4o/[workspace-name]
   npm run lint --workspace=@o4o/[workspace-name]
   ```

2. **Zero-tolerance policy for CI/CD**
   - NO ESLint warnings (not even one!)
   - NO TypeScript errors
   - NO unused imports
   - NO implicit any without explicit annotation
   - NO moderate+ security vulnerabilities

3. **Before committing any code changes**
   - Run full validation suite: `npm run type-check && npm run lint && npm audit --audit-level=moderate`
   - Fix ALL issues before proceeding
   - Use `npm run lint:fix` for automatic fixes

### Development Workflow
1. **Start of each task**: Review this CLAUDE.md file
2. **During development**: Follow existing patterns, no new dependencies without justification
3. **Before completion**: Run all quality checks
4. **Use checklist approach** for complex tasks - create TODO lists with TodoWrite tool

### Structured Logging
- **ALWAYS use structured logging** - No console.log/console.error
- Use winston for backend, proper error boundaries for frontend
- Log levels: error, warn, info, debug

## Project Overview

O4O Platform is a comprehensive multi-tenant e-commerce platform built with a monorepo architecture.

### Technology Stack

**Frontend:**
- React 19.1.0 with TypeScript 5.8.3, Vite 6.3.5, TailwindCSS 4.1.11
- State: Zustand 5.0.5, Server State: @tanstack/react-query 5.0.0
- Forms: react-hook-form 7.49.3, Routing: react-router-dom 7.6.0
- Real-time: socket.io-client 4.7.4, Animation: motion 12.19.2

**Backend:**
- Node.js 20.x with Express 4.x and TypeScript 5.8.3
- Database: PostgreSQL with TypeORM 0.3.20
- Caching: Redis with ioredis
- Authentication: JWT with jsonwebtoken
- Real-time: socket.io 4.6.1

## Quick Start Commands

```bash
# Install dependencies
npm install

# Build packages first (CRITICAL!)
npm run build:packages

# Start development
npm run dev              # All services
npm run dev:api         # API only (port 4000)
npm run dev:web         # Main site only (port 3000)
npm run dev:admin       # Admin only (port 3001)

# Code quality
npm run type-check      # Type check all
npm run lint           # Lint check
npm run lint:fix       # Auto-fix issues
```

## 🚨 Critical TypeScript & Lint Rules

### Import Management
```typescript
// ❌ WRONG
import React from 'react';  // Don't import React namespace in React 17+
import { cn } from '@o4o/ui/lib/utils';  // Wrong path

// ✅ CORRECT
import { useState } from 'react';  // Import only what you need
import { cn } from '@/lib/utils';  // Use local alias
```

### Type Annotations
```typescript
// ❌ WRONG - Will fail CI/CD
products.map(item => item.name)
} catch (error) {

// ✅ CORRECT
products.map((item: Product) => item.name)
} catch (error: any) {
```

### Unused Variables
```typescript
// ❌ WRONG
const [selected, setSelected] = useState();  // unused selected

// ✅ CORRECT
const [_selected, setSelected] = useState();  // prefix with _
```

## Build Order & Dependencies

### Critical Build Order
```
1. npm install
2. npm run build:packages  # MUST run before anything else!
3. npm run build:apps or type-check
```

### Package Build Order
```
types → utils → ui → auth-client → auth-context → other packages
```

### Common Issues & Solutions

**"Cannot find module '@o4o/types'"**
- Solution: Run `npm run build:packages` first

**ESLint warnings in CI/CD**
- Solution: Run `npm run lint:fix` and fix remaining manually

**TypeScript implicit any errors**
- Solution: Add explicit type annotations to all parameters

## Pre-Push Checklist

- [ ] Run `npm run build:packages`
- [ ] Run `npm run type-check`
- [ ] Run `npm run lint` - MUST show 0 warnings
- [ ] Run `npm audit --audit-level=moderate`
- [ ] Remove ALL unused imports
- [ ] Add type annotations to ALL parameters
- [ ] No console.log statements
- [ ] Test critical paths

## Monorepo Structure

```
/apps
  /api-server         - Express backend
  /main-site         - Customer React app
  /admin-dashboard   - Admin interface

/packages
  /types            - Shared TypeScript types
  /ui               - Shared UI components
  /utils            - Shared utilities
  /auth-client      - Auth client library
  /auth-context     - React auth providers
```

## TypeScript Configuration

### tsconfig.json Requirements
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true
  }
}
```

### Common Type Patterns
```typescript
// Query parameters are ALWAYS strings
const { limit = '20' } = req.query as { limit?: string };
const limitNum = parseInt(limit) || 20;

// Proper error handling
try {
  // code
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error(error.message);
  }
}

// Type guards
function isUser(obj: unknown): obj is User {
  return obj !== null && 
    typeof obj === 'object' &&
    'id' in obj;
}
```

## Environment Setup

### Required Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD="your_password"  # Quote if numeric!
DB_NAME=o4o_platform

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## CI/CD Guidelines

### GitHub Actions Requirements
1. Always build packages before apps
2. Use workspace commands from root
3. Zero tolerance for warnings

### Common CI/CD Fixes
```bash
# Instead of npm ci (requires package-lock.json)
npm install --production

# Workspace commands (from root)
npm run type-check --workspace=@o4o/api-server
npm run build --workspace=@o4o/main-site

# Never do this in CI
cd apps/api-server && npm run build  # Breaks module resolution
```

## Security Requirements

1. **No hardcoded secrets** - Use environment variables
2. **No console.log in production** - Use proper logging
3. **Validate all inputs** - Use validation libraries
4. **Use TypeORM query builder** - Prevent SQL injection
5. **Run security audit** - `npm audit --audit-level=moderate`

## Performance Guidelines

1. **Lazy load routes** - Use React.lazy()
2. **Memoize expensive operations** - useMemo, useCallback
3. **Code split by route** - Dynamic imports
4. **Bundle size < 500KB** - Run build:analyze
5. **Implement error boundaries** - Graceful failures

## Database Conventions

1. **Soft deletes** - Use deletedAt field
2. **Audit fields** - createdAt, updatedAt, createdBy
3. **UUID primary keys** - For all entities
4. **Repository pattern** - One repository per entity
5. **Migration naming** - YYYYMMDDHHMMSS-DescriptiveName

## Quick Fixes for Common Errors

```bash
# Rebuild everything clean
npm run clean && npm install && npm run build:packages

# Fix all auto-fixable issues
npm run lint:fix

# Check specific workspace
npm run type-check --workspace=@o4o/admin-dashboard

# Find unused imports
grep -r "^import.*React" --include="*.tsx" src/

# Update all dependencies
npm update
```

## 🔴 Never Do These

1. **Never import React namespace** in React 17+
2. **Never use 'any' without annotation**
3. **Never skip build:packages**
4. **Never ignore ESLint warnings**
5. **Never use console.log** - Use proper logging
6. **Never hardcode secrets**
7. **Never create backup dirs inside project**
8. **Never use req.query values as numbers** - They're strings!
9. **Never assume packages exist on deployed server** - o4o-apiserver may not have packages/
10. **Never skip environment variable setup** - OAuth, DB settings are required

## 📚 Additional Resources

- TypeScript patterns: See packages/types/src/
- Mock data examples: See src/test/mocks/
- API patterns: See apps/api-server/src/controllers/
- React patterns: See apps/admin-dashboard/src/pages/

## Recent Updates (2025-07)

- Fixed SSH deployment issues with known_hosts
- Changed npm ci to npm install for production
- Fixed database password string type issues
- Added crowdfunding-types package
- Updated to React 19 and ESLint 9 flat config
- Fixed API server TypeScript module errors for server deployment
- Added local type definitions for o4o-apiserver deployment

## 🚨 Common Deployment Issues & Solutions

### 1. **NPM Permission Errors (EACCES)**
**Problem**: `EACCES: permission denied` when installing global packages
**Solutions**:
- **NEVER** try to install global packages with npm in CI/CD
- **NEVER** use `npm install -g serve` or similar commands
- Use `npx` instead of global installs
- If PM2 is needed, ensure it's pre-installed on server

### 2. **502 Bad Gateway Errors**
**Problem**: Nginx returns 502 when trying to proxy to backend service
**Solution**: 
- **DO NOT** use PM2 + serve for static sites
- Let Nginx serve static files directly from `/var/www/[domain]/`
- Ensure Nginx config points to correct root directory
- No additional Node.js process needed for static files

### 3. **GitHub Actions YAML Syntax Errors**
**Problem**: heredoc syntax causes YAML parsing errors
**Solutions**:
- **AVOID** complex heredoc in GitHub Actions YAML
- Use `<< 'ENDSSH'` instead of `<< 'EOF'` 
- Keep scripts simple and flat
- Test YAML syntax before committing

### 4. **Vite Host Blocking**
**Problem**: "This host is not allowed" error
**Solution**: Add all domains to `allowedHosts` in vite.config.ts:
```javascript
server: {
  allowedHosts: [
    'localhost',
    'neture.co.kr',
    'admin.neture.co.kr',
    // Add all your domains
  ]
}
```

### 5. **Build Order Issues**
**Problem**: "Cannot find module '@o4o/types'" errors
**Solution**: 
- **ALWAYS** run `npm run build:packages` before any other build
- Package build order: types → utils → ui → auth-client → auth-context
- Never skip the package build step

### 6. **API Server TypeScript Module Errors (o4o-apiserver)**
**Problem**: `Cannot find module '@o4o/crowdfunding-types'` or `@o4o/types` in deployed server
**Context**: o4o-apiserver는 배포 시 packages 디렉토리가 없는 환경일 수 있음
**Solutions**:
- **로컬 개발**: `npm run build:packages` 실행 필수
- **서버 배포 시 모듈 에러 발생하면**:
  1. `apps/api-server/src/types/` 디렉토리 생성
  2. 필요한 타입 파일들 생성:
     - `crowdfunding-types.ts` (FundingStatus, FundingCategory, PaymentMethod 등)
     - `form-builder.ts` (FormField, FormSettings 등)
     - `database-types.ts` (QueryPlan, ConnectionPoolStats 등)
     - `graceful-degradation-types.ts` (DegradationParameters 등)
     - `performance-types.ts` (PerformanceReport, SlowQueryInfo 등)
     - `index.ts` (모든 타입 re-export)
  3. Import 경로 수정: `@o4o/types` → `../types` 또는 `../../types`
- **환경 변수 설정 필수**:
  ```bash
  cp env.example .env
  # OAuth 클라이언트 ID/Secret 설정 필요
  ```
- **타입 호환성 문제**:
  - PostgreSQL EXPLAIN 형식과 MySQL 형식 타입이 혼재
  - 타입에 optional 속성 추가로 호환성 확보
  - 개발 모드(`npm run dev`)는 ts-node로 실행되어 더 관대함

## 🎯 Deployment Best Practices

### Static Site Deployment (Recommended)
1. Build in GitHub Actions
2. rsync dist folder to `/var/www/[domain]/`
3. Let Nginx serve files directly
4. No PM2, no serve, no Node.js process

### Nginx Configuration
- Pre-configure Nginx on server
- Don't try to create Nginx configs in CI/CD
- Use simple static file serving:
```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Permission Management
- Use sudo only when absolutely necessary
- Ensure deployment user owns `/var/www/` directories
- Set proper file permissions after deployment:
  - Directories: 755
  - Files: 644

---

**Remember: Claude Code must ALWAYS check this file before starting any task and follow ALL guidelines strictly.**