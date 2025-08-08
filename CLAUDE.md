# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

⚠️ **DEVELOPMENT ENVIRONMENT WARNING** ⚠️
- Development environment may have npm command issues (mysterious "2" appended to commands)
- Careful synchronization required to avoid conflicts and data loss
- Always verify git status before major operations

## 🔄 Safe Migration Guidelines

### Pre-Migration Checklist
```bash
# 1. Check current git status
git status
git log --oneline -5

# 2. Ensure all changes are committed
git add .
git commit -m "Pre-migration commit"

# 3. Push to remote repository
git push origin main

# 4. Backup current .env files
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
cp apps/api-server/.env apps/api-server/.env.backup.$(date +%Y%m%d_%H%M%S)
```

### VS Code Environment Setup
```bash
# 1. Fresh clone in local environment
git clone <repository-url> o4o-platform-local
cd o4o-platform-local

# 2. Verify Node.js version
node --version  # Must be v22.18.0

# 3. Install dependencies
npm install

# 4. Restore environment files
# Copy .env files from previous environment or recreate them

# 5. Build packages
./scripts/dev.sh build:packages

# 6. Test development environment
./scripts/dev.sh start
```

### Migration Safety Rules
1. **Never force push** during migration period
2. **Always backup environment files** before switching
3. **Verify builds work** in both environments
4. **Test critical paths** after each sync
5. **Keep previous environment accessible** until new setup is confirmed working

## 🔌 MCP (Model Context Protocol) Integration

### Available MCP Servers
- **Context7**: ✅ Connected - Library documentation and code examples
- **Sequential Thinking**: ✅ Connected - Complex problem-solving and planning
- **IDE Integration**: ✅ Connected - VS Code diagnostics and code execution
- **GitHub**: ✅ Connected - Repository management, PR/issue handling, code search

### Context7 Usage Guidelines
```bash
# Library documentation lookup workflow
1. Use mcp__context7__resolve-library-id to find library ID
2. Use mcp__context7__get-library-docs to get up-to-date docs
3. Focus on specific topics when needed (e.g., 'hooks', 'routing')
```

### Sequential Thinking Best Practices
```bash
# When to use Sequential Thinking:
- Complex multi-step problems requiring analysis
- Planning and design with room for revision
- Problems where scope isn't clear initially
- Breaking down architectural decisions
- Tool recommendation and execution order
```

### GitHub MCP Usage Guidelines
```bash
# Repository management workflow
1. Search repositories: mcp__github__search_repositories
2. Get file contents: mcp__github__get_file_contents
3. Create/update files: mcp__github__create_or_update_file
4. Push multiple files: mcp__github__push_files

# Issue and PR management
1. List/search issues: mcp__github__list_issues / mcp__github__search_issues
2. Create issues: mcp__github__create_issue
3. Create PRs: mcp__github__create_pull_request
4. Review PRs: mcp__github__create_pull_request_review

# Code collaboration workflow
1. Fork repository: mcp__github__fork_repository
2. Create branch: mcp__github__create_branch
3. Search code: mcp__github__search_code
4. Merge PR: mcp__github__merge_pull_request
```

### MCP-Enhanced Development Workflow
```bash
# Typical workflow combining MCP servers:
1. Sequential Thinking: Plan approach and identify needed tools
2. Context7: Get latest documentation for libraries
3. GitHub: Search existing code patterns and create branches
4. IDE Integration: Execute code and check diagnostics
5. GitHub: Create PRs and manage issues
6. Regular development tools: Implement and test
```

### MCP-Specific Development Rules
1. **Always use Context7** for library documentation - never guess API details
2. **Use Sequential Thinking** for problems with 3+ steps or unclear scope
3. **Leverage IDE diagnostics** before manual code review
4. **Use GitHub MCP** for repository operations instead of local git commands when appropriate
5. **Combine MCP insights** with existing development practices
6. **Document MCP usage patterns** for team consistency

### MCP Server Selection Guide
| Task Type | Primary MCP | Secondary MCP | Traditional Tools |
|-----------|-------------|---------------|-------------------|
| Library Research | Context7 | - | WebSearch |
| Complex Planning | Sequential Thinking | - | TodoWrite |
| Code Diagnostics | IDE Integration | - | Bash, Read |
| Architecture Design | Sequential Thinking | Context7 | - |
| API Integration | Context7 | IDE Integration | - |
| Repository Management | GitHub | - | Bash (git) |
| Code Search | GitHub | - | Grep, Glob |
| Issue/PR Management | GitHub | - | gh CLI |
| Code Collaboration | GitHub | Sequential Thinking | - |

### VS Code + MCP Benefits
- **Real-time documentation**: No more outdated examples via Context7
- **Structured thinking**: Complex problems broken down systematically
- **Instant diagnostics**: VS Code integration for immediate feedback
- **GitHub integration**: Direct repository operations without leaving development environment
- **Tool coordination**: MCP servers work together seamlessly

### GitHub MCP Best Practices
```bash
# Repository operations
- Use GitHub MCP for cross-repository work and collaboration
- Prefer local git commands for simple commits and pushes
- Use GitHub MCP for creating branches and PRs across repositories

# Issue management
- Create issues via GitHub MCP to maintain proper formatting
- Use GitHub search for finding existing issues and patterns
- Link PRs to issues automatically via GitHub MCP

# Code review workflow
- Search existing code patterns before implementing
- Create detailed PR descriptions via GitHub MCP
- Use GitHub MCP for collaborative reviews
```

## 🎯 Critical Development Rules

### Code Quality Standards
- **Zero-tolerance** for CI/CD failures: NO warnings, NO TypeScript errors
- **Never** use `console.log` - use structured logging with winston
  - API Server: Use winston logger from `src/utils/logger.ts`
  - Frontend Apps: Use appropriate logging library or remove console statements
  - Scripts: Console usage is acceptable for CLI output
- **Always** commit `package-lock.json` when dependencies change
- **IMPORTANT**: Never create commits - user will handle all git commits manually

### Code Change Checklist
When modifying any code, ALWAYS check:
1. **ESLint**: Run `npm run lint` to ensure no warnings/errors
2. **TypeScript**: Run `npm run type-check` to verify type safety
3. **Dependencies**: Check React Hook dependencies are complete
4. **Build**: Run `npm run build` to ensure successful compilation
5. **Tests**: Run relevant tests if available

**특히 React Hooks 사용 시**:
- useEffect, useCallback, useMemo의 dependency array 확인
- 누락된 의존성이 있으면 추가
- 함수를 의존성에 포함할 때는 해당 함수도 useCallback으로 감싸기

### 🔄 Build Error Resolution Process (중요!)
**빌드 에러 수정 후 반드시 따라야 할 프로세스:**

1. **에러 수정 후 즉시 재빌드**
   ```bash
   # 수정한 앱 개별 빌드
   npm run build --workspace=@o4o/[app-name]
   ```

2. **연관된 모든 앱 순차 빌드**
   ```bash
   # 패키지 먼저 빌드
   ./scripts/dev.sh build:packages
   
   # 각 앱 개별 빌드 (에러 발생 시 즉시 수정)
   npm run build --workspace=@o4o/api-server
   npm run build --workspace=@o4o/admin-dashboard  
   npm run build --workspace=@o4o/main-site
   ```

3. **전체 빌드 검증**
   ```bash
   # 모든 수정 완료 후 전체 빌드
   npm run build
   ```

4. **빌드 에러가 더 이상 없을 때까지 1-3 반복**

**⚠️ 주의사항:**
- 한 개의 에러를 수정했다고 끝이 아님
- 반드시 모든 앱이 성공적으로 빌드될 때까지 반복
- 새로운 에러가 나타날 수 있으므로 항상 재빌드 필수

### 🎯 Smart Build System (권장)

**서비스가 많아진 현재, 변경된 부분만 빌드하는 것이 효율적입니다.**

#### 1. **가장 자주 사용하는 명령어**
```bash
# 🔥 핵심 명령어 - 이것만 기억하세요!
npm run build:changed       # 현재 변경된 파일만 감지해서 빌드
npm run build:after-pull    # git pull 후 변경된 것만 빌드

# 예시 워크플로우
git pull origin main        # 최신 코드 받기
npm run build:after-pull    # 변경된 것만 자동 빌드
```

#### 2. **스마트 빌드 (고급 옵션)**
```bash
# 자동 감지 모드
npm run build:smart         # 변경사항 자동 감지 후 필요한 것만 빌드
npm run build:smart:check   # 무엇이 빌드될지 미리보기 (실제 빌드 X)
npm run build:smart:sync    # 마지막 git pull 이후 변경사항 빌드

# 전체 빌드 (필요시)
npm run build:smart:full    # 모든 것을 강제로 빌드
```

#### 3. **안전한 빌드 (빌드 멈춤 방지)**
```bash
# 빌드가 자주 멈추는 경우 사용
npm run build:safe          # 타임아웃과 재시도로 안전하게 전체 빌드
npm run build:safe:web      # 웹 앱들만 안전하게 빌드
npm run build:safe:api      # API 서버만 안전하게 빌드

# 실시간 모니터링하며 빌드
npm run build:monitor       # 진행 상황을 보면서 빌드
```

#### 4. **기존 빌드 명령어 (레거시)**
```bash
# 전체 빌드 (모든 패키지와 앱)
npm run build:all           # 순차적 빌드
npm run build:all:fast      # 병렬 빌드 (빠르지만 메모리 많이 사용)
npm run build:production    # 프로덕션용 클린 빌드

# 개별 앱 빌드 (패키지 포함)
npm run build:api           # API 서버
npm run build:admin         # 관리자 대시보드
npm run build:web           # 메인 사이트
npm run build:ecommerce     # 이커머스
```

### 📋 빌드 시나리오별 가이드

| 상황 | 추천 명령어 | 설명 |
|------|------------|------|
| **코드 수정 후** | `npm run build:changed` | 수정한 파일 자동 감지하여 빌드 |
| **git pull 후** | `npm run build:after-pull` | pull로 받은 변경사항만 빌드 |
| **빌드 전 확인** | `npm run build:smart:check` | 무엇이 빌드될지 미리보기 |
| **전체 빌드 필요** | `npm run build:smart:full` | 모든 것을 강제 빌드 |
| **빌드가 멈출 때** | `npm run build:safe` | 타임아웃/재시도로 안전하게 빌드 |
| **CI/CD 환경** | `npm run build:production` | 클린 상태에서 전체 빌드 |

### 🔄 빌드 동작 원리

1. **변경 감지**: Git diff를 사용해 변경된 파일 감지
2. **의존성 분석**: 
   - `types`나 `utils` 변경 시 → 모든 앱 재빌드
   - 개별 앱 변경 시 → 해당 앱만 빌드
3. **빌드 순서**: 패키지 먼저, 그 다음 앱 (의존성 순서 준수)

### Quick Commands (기타)
```bash
# 개발 명령어
./scripts/dev.sh lint          # ESLint 검사
./scripts/dev.sh type-check    # TypeScript 검사
./scripts/dev.sh start         # 모든 개발 서버 시작
./scripts/dev.sh stop          # 모든 개발 서버 중지
./scripts/dev.sh test          # 테스트 실행
```

## 📁 Project Architecture

```
o4o-platform/
├── apps/
│   ├── api-server/        # Express backend (port 4000)
│   ├── main-site/         # Customer React app (port 3000)
│   ├── admin-dashboard/   # Admin interface (port 3001)
│   ├── ecommerce/         # E-commerce React app
│   ├── crowdfunding/      # Crowdfunding platform
│   ├── forum/             # Forum application
│   ├── digital-signage/   # Digital signage management
│   └── api-gateway/       # API Gateway service
└── packages/
    ├── types/             # Shared TypeScript types
    ├── ui/                # Shared UI components
    ├── utils/             # Shared utilities
    ├── auth-client/       # Authentication client
    ├── auth-context/      # Auth context and providers
    ├── crowdfunding-types/# Crowdfunding type definitions
    ├── forum-types/       # Forum type definitions
    └── shortcodes/        # Shortcode parser and renderer
```

### Package Build Order (CRITICAL!)
Always build packages in this exact order:
`types → utils → ui → auth-client → auth-context → crowdfunding-types → forum-types → shortcodes`

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build packages first (CRITICAL!)
./scripts/dev.sh build:packages

# Start development
./scripts/dev.sh start

# Quality checks
./scripts/dev.sh lint
./scripts/dev.sh type-check
```

## 🛠️ Common Issues & Solutions

### Build Issues
- **"Cannot find module '@o4o/types'"**: Run `./scripts/dev.sh build:packages` first
- **"Module not found" errors**: Ensure packages are built before apps
- **Package build order**: Follow exact order above

### TypeScript Issues
```typescript
// ❌ WRONG (React 18 style)
import React from 'react'
const Component: React.FC = () => { ... }
products.map(item => item.name)         // Missing type annotation
} catch (error) {                       // Implicit any
export const handler = (fn: Function)   // Too generic function type

// ✅ CORRECT (React 19 style)
import { FC, useState } from 'react'
const Component: FC = () => { ... }
products.map((item: Product) => item.name)
} catch (error: any) {                  // Explicit annotation
export const handler = (fn: (req: Request, res: Response) => Promise<any>)
```

### Database Issues
- **"CREATE INDEX CONCURRENTLY cannot run inside transaction"**: Remove CONCURRENTLY from TypeORM migrations
- **"Data type 'datetime' not supported"**: PostgreSQL uses `timestamp`
- **Migration naming error**: TypeORM requires timestamp with milliseconds (e.g., 1738000000000 not 1738000000)

### Test Issues
- **"--passWithNoTests received [true, true]"**: Root package.json already passes flag, remove from workspace
- **테스트 환경 Context 누락**: Ensure ThemeProvider, AuthProvider etc. are present

## ⚠️ Current Tech Stack (Node.js 22 LTS)

### Core Versions
- **Node.js**: 22.18.0 LTS (REQUIRED - check with `node --version`)
- **npm**: 10.9.3 (included with Node.js 22)
- **TypeScript**: 5.9.2
- **React**: 19.1.0
- **Vite**: 7.0.6

### Version Requirements
All environments MUST use Node.js 22.18.0. Common errors:
- `npm error Invalid Version:` → Check Node.js version first
- npm commands ending with "2" → Environment issue, use dev.sh scripts instead

## 🔐 Environment Variables

### API Server (.env)
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

### Testing Mode (Temporary)
```bash
# Admin Dashboard & Main Site
VITE_USE_MOCK=true  # Auto-login for testing
```
**⚠️ REMOVE before production deployment!**

## 📊 Deployment Architecture

### Two-Server Setup
**API Server** (43.202.242.215)
- Hosts: API backend, PostgreSQL
- Domain: api.neture.co.kr
- Apps: `apps/api-server`
- PM2 app: `api-server`

**Web Server** (13.125.144.8)  
- Hosts: Frontend applications
- Domains: www.neture.co.kr, admin.neture.co.kr
- Apps: `apps/main-site`, `apps/admin-dashboard`, `apps/ecommerce`
- Static files: `/var/www/[domain]/`

### Post-CI/CD Server Work
After CI/CD completion:

```bash
# API Server (43.202.242.215)
ssh ubuntu@43.202.242.215
cd /home/ubuntu/o4o-platform
git fetch origin main
git checkout origin/main -- apps/api-server/ scripts/
pm2 restart api-server
curl http://localhost:4000/api/health

# Web Server (13.125.144.8)
ssh ubuntu@13.125.144.8
ls -la /var/www/neture.co.kr/
sudo chown -R www-data:www-data /var/www/
```

## 🧪 Testing & ESLint

### Testing Architecture
- **Vitest**: Unit/integration tests (most apps)
- **Playwright**: E2E testing (admin-dashboard)
- **Jest**: Legacy test runner (api-server)

### ESLint Configuration
- Uses `.eslintrc.js` (NOT `eslint.config.js`)
- Relaxed rules for development productivity
- TypeScript parser with disabled unused vars/explicit any

## 🚨 Never Do These
1. Never import React namespace in React 19
2. Never use 'any' without annotation
3. Never skip `./scripts/dev.sh build:packages`
4. Never ignore ESLint warnings
5. Never hardcode secrets
6. Never deploy API code to web server or vice versa
7. Never use generic `Function` type - specify exact signature
8. Never create migration files without milliseconds in timestamp

## 🔄 Multi-App Architecture

The platform consists of 7 main applications:
1. **api-server**: Core backend (Express, TypeORM, PostgreSQL)
2. **main-site**: Customer-facing website
3. **admin-dashboard**: WordPress-style admin interface
4. **ecommerce**: E-commerce storefront
5. **crowdfunding**: Crowdfunding platform
6. **forum**: Community forum
7. **digital-signage**: Digital signage management

All apps share common packages for types, UI components, and utilities.

## 🏗️ WordPress Block Development (Gutenberg)

### Core Principles
- **Exact WordPress replication**: Match default block UI/UX precisely
- **Technology**: React + Tailwind CSS only, no external UI libraries
- **Independence**: Each block operates completely independently
- **Priority**: Functionality > Design, WordPress standards > Custom features

### Requirements
- WordPress 5.8+ support
- All major browser compatibility
- Mobile responsive design
- Accessibility (ARIA) compliance

---

**Remember: Claude Code must ALWAYS check this file before starting any task and follow ALL guidelines strictly.**