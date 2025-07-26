# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Critical Development Rules

### 1. Code Quality Standards
- **ALWAYS** run `npm run type-check` and `npm run lint` before any commit
- **Zero-tolerance** for CI/CD failures: NO warnings, NO TypeScript errors
- **Never** use `console.log` - use structured logging with winston
- **Always** commit `package-lock.json` when dependencies change

### 2. Development Workflow
1. Review this CLAUDE.md file at task start
2. Use TodoWrite tool for complex tasks
3. Run all quality checks before completion
4. Follow existing patterns - no new dependencies without justification

### 3. CI/CD Pre-Push Checklist
- [ ] Dependencies installed with `npm install` (NOT `npm ci`)
- [ ] Build tested: `npm run build`
- [ ] TypeScript passed: `npm run type-check`
- [ ] Lint passed: `npm run lint` (0 warnings)
- [ ] Optional features have conditional initialization
- [ ] Environment variables have proper defaults

## 📁 Project Structure

```
o4o-platform/
├── apps/
│   ├── api-server/        # Express backend (port 4000)
│   ├── main-site/         # Customer React app (port 3000)
│   └── admin-dashboard/   # Admin interface (port 3001)
└── packages/
    ├── types/             # Shared TypeScript types
    ├── ui/                # Shared UI components
    └── utils/             # Shared utilities
```

## 🚀 Quick Start

```bash
# Install and build packages first (CRITICAL!)
npm install
npm run build:packages

# Development
npm run dev              # All services
npm run dev:api         # API only
npm run dev:web         # Main site only
npm run dev:admin       # Admin only

# Quality checks
npm run type-check      # Type check all
npm run lint           # Lint check
npm run lint:fix       # Auto-fix issues
```

## 🛠️ Common Issues & Solutions

### Build Issues
- **"Cannot find module '@o4o/types'"**: Run `npm run build:packages` first
- **Package build order**: types → utils → ui → auth-client → auth-context

### TypeScript Issues
```typescript
// ❌ WRONG
import React from 'react';              // No React namespace in React 17+
products.map(item => item.name)         // Missing type annotation
} catch (error) {                       // Implicit any

// ✅ CORRECT
import { useState } from 'react';       // Import only what you need
products.map((item: Product) => item.name)
} catch (error: any) {                  // Explicit annotation
```

### CI/CD Issues
- **npm ci errors**: Change to `npm install` in workflows
- **SSH failures**: Add proper SSH key setup in each job
- **SSL errors**: Use `curl -k` or `continue-on-error: true`

## 🔐 Environment Variables

### Required for API Server
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

# Optional OAuth (conditional initialization)
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
```

## 📊 Deployment Notes

### Two-Server Architecture
**o4o-apiserver** (43.202.242.215)
- Hosts: API backend, PostgreSQL, Medusa
- Domain: api.neture.co.kr
- Apps: `apps/api-server`
- PM2 app name: `o4o-api-server`
- Path: `/home/ubuntu/o4o-platform`

**o4o-webserver** (13.125.144.8)
- Hosts: Frontend web/mobile interfaces
- Domains: www.neture.co.kr, admin.neture.co.kr
- Apps: `apps/main-site`, `apps/admin-dashboard`, `apps/ecommerce`
- Static files served by Nginx from `/var/www/[domain]/`

### Deployment Considerations
- API server: No `packages/` directory - use local type definitions
- Web server: Only needs built static files (dist/)
- Never deploy API code to web server or vice versa
- OAuth strategies initialize conditionally on API server

## 🚨 Never Do These
1. Never import React namespace in React 17+
2. Never use 'any' without annotation
3. Never skip `npm run build:packages`
4. Never ignore ESLint warnings
5. Never hardcode secrets
6. Never assume packages exist on deployed server
7. Never deploy API code to web server or frontend code to API server
8. Never run database migrations on web server

## 📝 Recent Updates (2025-07)
- Fixed OAuth conditional initialization
- Changed all `npm ci` to `npm install` in CI/CD
- Added local type definitions for API server deployment
- Resolved 83 TypeScript errors → 0

---

**Remember: Claude Code must ALWAYS check this file before starting any task and follow ALL guidelines strictly.**