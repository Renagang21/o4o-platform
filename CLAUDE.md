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

---

**Remember: Claude Code must ALWAYS check this file before starting any task and follow ALL guidelines strictly.**