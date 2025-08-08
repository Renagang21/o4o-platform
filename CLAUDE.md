# CLAUDE.md

This file provides essential guidance to Claude Code (claude.ai/code) when working with the O4O Platform repository.

## 🚀 Quick Reference

### Essential Commands
```bash
# Development workflow
git pull origin main            # Get latest code
npm run build:after-pull        # Build only changed parts
./scripts/dev.sh lint           # Check code quality
./scripts/dev.sh type-check     # Verify types

# After completing work
git add -A
git commit -m "feat: description"
git push origin main
# Then request server deployment (see below)
```

## 📁 Project Structure

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
    ├── utils/             # Shared utilities
    ├── ui/                # Shared UI components
    ├── auth-client/       # Authentication client
    ├── auth-context/      # Auth context and providers
    ├── crowdfunding-types/# Crowdfunding type definitions
    ├── forum-types/       # Forum type definitions
    └── shortcodes/        # Shortcode parser and renderer
```

## 🎯 Critical Development Rules

### 1. Code Quality Standards
- **Zero-tolerance** for CI/CD failures: NO warnings, NO TypeScript errors
- **Never** use `console.log` - use structured logging
  - API Server: Use winston logger from `src/utils/logger.ts`
  - Frontend Apps: Remove console statements or use proper logging
  - Scripts: Console usage is acceptable for CLI output
- **Always** commit `package-lock.json` when dependencies change
- **Never** create commits without user's explicit request

### 2. Build Order (CRITICAL!)
Packages MUST be built in this exact order:
```
types → utils → ui → auth-client → auth-context → crowdfunding-types → forum-types → shortcodes
```

### 3. React 19 Conventions
```typescript
// ❌ WRONG
import React from 'react'
const Component: React.FC = () => { ... }

// ✅ CORRECT
import { FC } from 'react'
const Component: FC = () => { ... }
```

### 4. TypeScript Best Practices
```typescript
// Always annotate types explicitly
products.map((item: Product) => item.name)  // ✅
} catch (error: any) {                      // ✅ Explicit any
export const handler = (fn: (req: Request, res: Response) => Promise<any>)  // ✅ Specific function type
```

## 🏗️ Build System

### Smart Build (Recommended)
```bash
# Most common commands
npm run build:changed       # Build only changed files
npm run build:after-pull    # Build after git pull

# Advanced options
npm run build:smart         # Auto-detect and build changes
npm run build:smart:check   # Preview what will be built
npm run build:safe          # Build with timeout/retry protection
```

### Build Scenarios
| Situation | Command | Description |
|-----------|---------|-------------|
| After code changes | `npm run build:changed` | Builds only modified files |
| After git pull | `npm run build:after-pull` | Builds pulled changes |
| Check before build | `npm run build:smart:check` | Preview build targets |
| Full rebuild needed | `npm run build:smart:full` | Force rebuild everything |
| Build hangs | `npm run build:safe` | Build with timeout protection |

## 🚢 Server Deployment Process

### After Local Development

When you complete local development and push to GitHub, create deployment requests for both servers:

#### 1. Generate Deployment Requests
After pushing changes, Claude Code should automatically generate two deployment request templates:

**For Web Server (o4o-webserver):**
```markdown
## Web Server Deployment Request

Please deploy the latest changes to the web server.

### Commands to Execute:
\`\`\`bash
cd /home/ubuntu/o4o-platform
git pull origin main
npm install (if package.json changed)
npm run build:after-pull
# Copy built files to web directories
sudo cp -r apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/
sudo cp -r apps/main-site/dist/* /var/www/neture.co.kr/
sudo chown -R www-data:www-data /var/www/
\`\`\`

### Changed Files:
[List of changed frontend files]

### Testing:
- Check https://admin.neture.co.kr
- Check https://www.neture.co.kr
```

**For API Server (o4o-apiserver):**
```markdown
## API Server Deployment Request

Please deploy the latest changes to the API server.

### Commands to Execute:
\`\`\`bash
cd /home/ubuntu/o4o-platform
git pull origin main
npm install (if package.json changed)
npm run build:api
pm2 restart api-server
pm2 logs api-server --lines 50
curl http://localhost:4000/api/health
\`\`\`

### Changed Files:
[List of changed backend files]

### Environment Variables:
[Any new env vars needed]

### Database Migrations:
[If any migrations need to run]
```

#### 2. Server Architecture

**Web Server (13.125.144.8)**
- Domains: www.neture.co.kr, admin.neture.co.kr
- Hosts: Frontend applications
- Static files: `/var/www/[domain]/`

**API Server (43.202.242.215)**
- Domain: api.neture.co.kr
- Hosts: Backend API, PostgreSQL
- PM2 process: `api-server`

## ⚠️ Environment-Specific Issues

### Monospace/Claude Code npm "2" Bug
**Issue**: npm commands get "2" appended automatically
```bash
npm run test  # Actually runs as: npm run test 2
```

**Solution**:
- Use `./scripts/dev.sh` commands (auto-filters "2")
- Or wrap in `bash -c`: `"build": "bash -c 'tsc && vite build'"`
- Only affects `MONOSPACE_ENV=true` environments

## 🔌 MCP Integration (if available)

### Available MCP Servers
- **Context7**: Library documentation
- **Sequential Thinking**: Complex problem solving
- **IDE Integration**: VS Code diagnostics
- **GitHub**: Repository management

### Usage Priority
1. Use Context7 for library docs (never guess APIs)
2. Use Sequential Thinking for 3+ step problems
3. Use GitHub MCP for cross-repo operations
4. Combine MCP insights with traditional tools

## 🛠️ Common Issues & Quick Fixes

### Build Errors
| Error | Solution |
|-------|----------|
| "Cannot find module '@o4o/types'" | Run `./scripts/dev.sh build:packages` |
| "Module not found" | Ensure packages built before apps |
| React.Children undefined | Check React 19 compatibility |
| TypeScript errors | Run `npm run type-check` |

### Database Issues
- **CONCURRENTLY error**: Remove from TypeORM migrations
- **datetime not supported**: Use `timestamp` in PostgreSQL
- **Migration naming**: Use milliseconds (e.g., 1738000000000)

### Test Issues
- **--passWithNoTests duplicate**: Remove from workspace package.json
- **Missing context**: Add required providers in test setup

## 📋 Development Workflow

### Starting New Task
1. Check this CLAUDE.md file
2. Pull latest code: `git pull origin main`
3. Build changes: `npm run build:after-pull`
4. Create todo list for complex tasks
5. Start development

### Before Committing
1. **Lint**: `./scripts/dev.sh lint`
2. **Type Check**: `./scripts/dev.sh type-check`
3. **Build**: `npm run build:changed`
4. **Test**: `npm test` (if applicable)

### After Pushing
1. Wait for user to request deployment
2. Generate deployment requests for both servers
3. Include specific commands and changed files
4. Specify any environment or migration needs

## 🔐 Environment Variables

### API Server
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD="your_password"
DB_NAME=o4o_platform
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
ENABLE_GEO_LOCATION=true  # Optional
```

### Frontend Apps
```bash
VITE_API_URL=https://api.neture.co.kr/api/v1
VITE_USE_MOCK=false  # Set true for testing only
```

## ⚡ Tech Stack

- **Node.js**: 22.18.0 LTS (REQUIRED)
- **npm**: 10.9.3
- **TypeScript**: 5.9.2
- **React**: 19.1.0
- **Vite**: 7.0.6
- **PostgreSQL**: 15+
- **Express**: 4.18+

## 🚨 Never Do These

1. Never import React namespace in React 19
2. Never use 'any' without explicit annotation
3. Never skip package build order
4. Never ignore ESLint warnings
5. Never hardcode secrets
6. Never deploy API code to web server or vice versa
7. Never use generic `Function` type
8. Never create commits without user request
9. Never use console.log in production code
10. Never force push to main branch

## 📝 Deployment Request Template

When user completes work and pushes, automatically generate:

```markdown
## 🚀 Server Deployment Required

Your changes have been pushed to GitHub. Please deploy to:

### 1. Web Server (o4o-webserver)
[Generated deployment commands for frontend changes]

### 2. API Server (o4o-apiserver)  
[Generated deployment commands for backend changes]

### Changed Components:
- Frontend: [List changed apps]
- Backend: [List changed APIs]
- Packages: [List changed packages]

### Notes:
[Any special deployment considerations]
```

---

**Remember: Always check this file before starting any task and follow ALL guidelines strictly.**
**After pushing changes, always generate deployment request templates for the servers.**