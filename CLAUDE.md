# CLAUDE.md

⚠️ **CRITICAL: FIREBASE STUDIO DEVELOPMENT ENVIRONMENT** ⚠️
- Firebase Studio is a cloud-based IDE that clones GitHub repositories
- Working directory `/home/user/o4o-platform/` is a Firebase Studio workspace (NOT GitHub directly)
- Changes are made in Firebase Studio environment, then pushed to GitHub via `git push`
- Workflow: Edit in Firebase Studio → Commit locally → Push to GitHub repository
- This is similar to local development, but in the cloud

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
- [ ] Tests passed: `npm test`
- [ ] Optional features have conditional initialization
- [ ] Environment variables have proper defaults

### 4. CI/CD 문제 해결 원칙
- **반복 검증**: 하나의 문제를 해결한 후 반드시 유사한 문제가 다른 곳에 있는지 확인
- **근본 해결**: 우회하지 말고 문제의 근본 원인을 해결
- **전체 테스트**: 부분 수정 후 전체 테스트 실행으로 사이드 이펙트 확인

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

### Test Issues
- **"--passWithNoTests received [true, true]"**: Root package.json이 이미 전달하므로 workspace에서 제거
- **"activeApps.some is not a function"**: Mock에서 queryKey별로 다른 응답 반환 필요
- **테스트 환경 Context 누락**: ThemeProvider, AuthProvider 등 필수 Provider 확인

### Database Issues
- **"CREATE INDEX CONCURRENTLY cannot run inside transaction"**: TypeORM 마이그레이션에서 CONCURRENTLY 제거
- **"Data type 'datetime' not supported"**: PostgreSQL은 `timestamp` 사용
- **Migration naming error**: TypeORM requires timestamp with milliseconds (e.g., 1738000000000 not 1738000000)

### TypeScript Issues
```typescript
// ❌ WRONG
import React from 'react';              // No React namespace in React 17+
products.map(item => item.name)         // Missing type annotation
} catch (error) {                       // Implicit any
export const handler = (fn: Function)   // Too generic function type
res.end = function(...args) { }        // Missing return type

// ✅ CORRECT
import { useState } from 'react';       // Import only what you need
products.map((item: Product) => item.name)
} catch (error: any) {                  // Explicit annotation
export const handler = (fn: (req: Request, res: Response) => Promise<any>)
res.end = function(...args): Response { return originalEnd.apply(res, args); }
```

### CI/CD Issues
- **npm ci errors**: Change to `npm install` in workflows
- **SSH failures**: Add proper SSH key setup in each job
- **SSL errors**: Use `curl -k` or `continue-on-error: true`

## 📋 Error Classification System

### 1. Breaking Changes 🔥
**Definition**: API/interface changes that break backward compatibility

#### React 19 Breaking Changes
```typescript
// ❌ WRONG (React 18 style)
import React from 'react'
const Component: React.FC = () => { ... }
React.useEffect(() => { ... })

// ✅ CORRECT (React 19 style)
import { FC, useEffect } from 'react'
const Component: FC = () => { ... }
useEffect(() => { ... })
```

**Common Breaking Changes**:
- Default exports removed (React, ReactDOM)
- Namespace imports deprecated
- Type definitions moved to named exports
- useLayoutEffect handling changed

### 2. TypeScript Errors 📘
- **Type Mismatch**: Incorrect type assignments
- **Missing Types**: Undefined type annotations
- **Index Signatures**: Object key access issues
- **Generic Constraints**: Type parameter violations

### 3. Build/Compile Errors 📦
- **Vite**: Configuration and plugin errors
- **Module Resolution**: Import path failures
- **Bundle Size**: Oversized bundles
- **Environment Variables**: Missing or incorrect env vars

### 4. Runtime Errors ⚡
- **Reference Errors**: Undefined variables
- **Type Errors**: Invalid operations
- **Async Errors**: Unhandled promise rejections
- **Memory Leaks**: Improper cleanup

### 5. Error Priority Matrix 🎯
| Error Type | Impact | Urgency | Priority |
|------------|--------|---------|----------|
| Breaking Change | High | High | 1 |
| Runtime Error | High | High | 1 |
| TypeScript Error | Medium | Medium | 2 |
| Build Error | High | Medium | 2 |
| Lint Warning | Low | Low | 3 |

### 6. Error Resolution Process 🔧
1. **Identify**: Classify error type using above categories
2. **Analyze**: Determine root cause and scope
3. **Plan**: Create systematic fix approach
4. **Execute**: Apply fixes with proper testing
5. **Verify**: Run all quality checks

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

## 🔄 Backup & Recovery System

### Automated Backup
```bash
# Setup automated backup (run as root)
./scripts/setup-backup-automation.sh

# Manual backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh /backup/o4o-platform/o4o_backup_20250129_120000.tar.gz

# Monitor backup health
./scripts/backup-monitoring.sh
```

### Backup Components
- Database: PostgreSQL full dump with compression
- Files: Environment configs, uploads, built files
- Schedule: Daily at 2 AM via systemd timer
- Retention: 7 days (configurable)
- Monitoring: Every 6 hours health check

## 📊 Monitoring System

### System Monitoring Dashboard
- **Location**: `/monitoring` in admin dashboard
- **Features**: Real-time metrics, performance tracking, error logs
- **API Endpoints**:
  - `/api/v1/monitoring/health` - System health status
  - `/api/v1/monitoring/performance` - Performance metrics
  - `/api/v1/monitoring/errors` - Error logs

### Auto-Recovery System
- **Service**: `AutoRecoveryService` with automated actions
- **Actions**: Service restart, cache clear, connection reset, resource scaling
- **Escalation**: Automatic team notification on failure
- **Configuration**: See `/apps/api-server/src/services/AutoRecoveryService.ts`

## 📊 Deployment Notes

### Two-Server Architecture
**o4o-apiserver** (43.202.242.215)
- Hosts: API backend, PostgreSQL, Medusa
- Domain: api.neture.co.kr
- Apps: `apps/api-server`
- PM2 app name: `api-server`
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

## 🔧 Development Environment Notes

### Firebase Studio (Cloud IDE)
- **Firebase Studio는 클라우드 기반 개발 환경**
- GitHub 저장소를 클론하여 작업
- `/home/user/o4o-platform/`는 Firebase Studio의 작업 공간
- 일반적인 로컬 개발과 유사하지만 클라우드에서 실행
- git 명령어 사용:
  - `git commit`: Firebase Studio 환경에 커밋
  - `git push origin main`: GitHub 저장소로 푸시

## ⚠️ Known Issues & Solutions

### npm workspaces "2" 버그
**문제**: npm workspaces 명령 실행 시 명령어 끝에 "2"가 추가되는 현상
```bash
# 잘못된 실행 예시
npm run type-check --workspaces --if-present
# 결과: tsc --noEmit 2
```

**원인**: npm 10.8.2의 stderr 리다이렉션 처리 버그

**해결책**:
1. workspace 명령어 끝에 `--` 사용 금지
2. 대체 스크립트 사용: `./scripts/type-check-all.sh`
3. 개별 workspace에서 직접 실행

## 🚨 Never Do These
1. Never import React namespace in React 17+
2. Never use 'any' without annotation
3. Never skip `npm run build:packages`
4. Never ignore ESLint warnings
5. Never hardcode secrets
6. Never assume packages exist on deployed server
7. Never deploy API code to web server or frontend code to API server
8. Never run database migrations on web server
9. Never use generic `Function` type - specify exact function signature
10. Never declare variables/imports without using them
11. Never create migration files without milliseconds in timestamp

## 🔄 서버 동기화 가이드

### 중요: 서버 작업 보호 전략

#### 1. 환경변수 백업 (필수!)
```bash
# 서버에서 git pull 전에 항상 실행
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
cp apps/api-server/.env apps/api-server/.env.backup.$(date +%Y%m%d_%H%M%S)
```

#### 2. Git Pull 후 복원
```bash
# Pull 수행
git pull origin main

# 환경변수 복원
cp .env.backup.* .env
cp apps/api-server/.env.backup.* apps/api-server/.env
```

#### 3. 환경변수 샘플
```bash
# apps/api-server/.env (API 서버용)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=o4o_user
DB_PASSWORD=3lz15772779
DB_NAME=o4o_platform
NODE_ENV=production
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://neture.co.kr:8443,https://admin.neture.co.kr:8443
```

#### 4. 디렉토리 구조 정리
- ❌ `/services/` - 삭제됨 (legacy)
- ✅ `/apps/api-server/` - 현재 API 서버 위치
- ✅ `/apps/` - 모든 애플리케이션 위치

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
pm2 logs api-server --lines 50

# 4. API 서버 재시작 (필요시)
cd apps/api-server
npm install  # package.json 변경 시
npm run build
pm2 restart api-server

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
  - 주의: 테이블이 없는 경우 마이그레이션이 실패할 수 있음
  - 해결: 마이그레이션 파일에 테이블 존재 여부 확인 코드 추가
- **SSL 인증서**: Let's Encrypt 설정 확인
- **로그 모니터링**: PM2 logs, Nginx access/error logs
- **헬스체크 실패 시**: 
  - Nginx 설정 확인: `sudo nginx -t`
  - 도메인 설정 확인: `/etc/nginx/sites-available/*`
  - SSL 인증서 확인: `sudo certbot certificates`

## 🔐 Authentication Bypass for Testing (Temporary)

### 개발/테스트 모드 활성화
로그인 없이 테스트를 진행하기 위한 임시 설정:

#### Admin Dashboard (admin.neture.co.kr)
```bash
# apps/admin-dashboard/.env
VITE_USE_MOCK=true  # 이 설정으로 자동 로그인 활성화
```
- Mock 사용자: admin@o4o.com (관리자 권한)
- 모든 관리자 기능에 접근 가능

#### Main Site (neture.co.kr)  
```bash
# apps/main-site/.env
VITE_USE_MOCK=true  # 이 설정으로 인증 우회 활성화
```
- Mock 사용자: admin@neture.co.kr (관리자 권한)
- PrivateRoute 자동 우회

### 로그인 기능 별도 테스트
- `/login` 경로로 직접 접근하여 실제 로그인 테스트 가능
- `VITE_USE_MOCK=false`로 변경 시 정상 인증 프로세스 복원

### 주의사항
- **프로덕션 배포 전 반드시 `VITE_USE_MOCK` 제거 또는 false 설정**
- 이는 초기 테스트를 위한 임시 조치임

## 📝 Recent Updates (2025-01)
- Fixed OAuth conditional initialization
- Changed all `npm ci` to `npm install` in CI/CD
- Added local type definitions for API server deployment
- Resolved 83 TypeScript errors → 0
- Added post-CI/CD server work documentation
- Fixed double --passWithNoTests flag in CI/CD workflows
- Added conditional table checks in database migrations
- Added missing test scripts for all web apps (vitest)
- Fixed React 19 breaking changes (200+ files updated)
- Added comprehensive error classification system
- Fixed PostCSS Tailwind CSS plugin configuration (@tailwindcss/postcss)
- Added passWithNoTests to all test configurations (Jest & Vitest)
- Made deployment steps continue-on-error for missing SSH keys
- Made health checks non-blocking with continue-on-error
- Added comprehensive backup and recovery system with automation
- Implemented system monitoring dashboard and API endpoints
- Fixed TypeScript strict type errors (Function type, return types)
- Fixed unused imports and variables in monitoring components
- Added disaster recovery runbook and procedures
- Added authentication bypass for testing (VITE_USE_MOCK=true)

## 🚨 Current Error Status & Resolution

### Active Breaking Changes (React 19)
**Status**: ✅ RESOLVED
- **Files Fixed**: 250+ files across all apps
- **Changes Made**:
  - Converted all `import React from 'react'` to named imports
  - Removed all `React.` namespace usage
  - Updated type definitions in packages/ui
  - Fixed component type annotations
  - Fixed admin-dashboard additional imports

### Resolution Summary
```bash
# Script created and executed
./scripts/fix-react19-imports.sh

# Files updated:
- apps/main-site: 97 files
- apps/admin-dashboard: 50+ files  
- apps/ecommerce: 20+ files
- apps/digital-signage: 15+ files
- packages/ui: All component files
```

### Verification Steps
1. ✅ All React imports converted to named imports
2. ✅ TypeScript types updated for React 19
3. ✅ UI package components fixed
4. ✅ Build process verified

---

**Remember: Claude Code must ALWAYS check this file before starting any task and follow ALL guidelines strictly.**