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

## 🔧 Post-CI/CD Server Work

### After CI/CD Completes
When you see "CI/CD Pipeline completed", notify the team:

**"CI/CD 완료! 서버에서 다음 작업이 필요합니다:"**

#### o4o-apiserver (43.202.242.215)
```bash
# 1. SSH 접속
ssh ubuntu@43.202.242.215

# 2. 최신 코드 동기화 (필요시 - 선택적 동기화 권장)
cd /home/ubuntu/o4o-platform
git fetch origin main
# API 서버 관련 파일만 선택적 업데이트
git checkout origin/main -- apps/api-server/
git checkout origin/main -- scripts/

# 3. PM2 프로세스 확인
pm2 list
pm2 logs o4o-api-server --lines 50

# 4. API 서버 재시작 (필요시)
cd apps/api-server
npm install  # package.json 변경 시
npm run build
pm2 restart o4o-api-server

# 5. 헬스체크 확인
curl http://localhost:4000/api/health

# 6. Nginx 설정 확인 (필요시)
sudo nginx -t
sudo systemctl reload nginx
```

#### o4o-webserver (13.125.144.8)
```bash
# 1. SSH 접속
ssh ubuntu@13.125.144.8

# 2. 배포된 파일 확인
ls -la /var/www/neture.co.kr/
ls -la /var/www/admin.neture.co.kr/

# 3. 권한 설정 (필요시)
sudo chown -R www-data:www-data /var/www/
sudo chmod -R 755 /var/www/
```

### Common Server Tasks
- **환경변수 설정**: `.env.production` 파일 수동 생성
- **DB 마이그레이션**: `npm run migration:run` (API 서버에서만)
- **SSL 인증서**: Let's Encrypt 설정 확인
- **로그 모니터링**: PM2 logs, Nginx access/error logs

## 📝 Recent Updates (2025-07)
- Fixed OAuth conditional initialization
- Changed all `npm ci` to `npm install` in CI/CD
- Added local type definitions for API server deployment
- Resolved 83 TypeScript errors → 0
- Added post-CI/CD server work documentation

---

**Remember: Claude Code must ALWAYS check this file before starting any task and follow ALL guidelines strictly.**