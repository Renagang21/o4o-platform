# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository..

## Project Overview

O4O Platform is a comprehensive multi-tenant e-commerce platform built with a monorepo architecture. It combines content management, digital signage, community features, and business partnerships with role-based access control.

### Technology Stack

**Frontend:**
- React 19.1.0 with TypeScript 5.8.3, Vite 6.3.5, TailwindCSS 4.1.11
- State: Zustand 5.0.5, Server State: @tanstack/react-query 5.0.0
- Forms: react-hook-form 7.49.3, Routing: react-router-dom 7.6.0
- Real-time: socket.io-client 4.7.4, Animation: motion 12.19.2
- Rich Text: Tiptap 2.22.x suite

**Backend:**
- Node.js 20.x with Express 4.x and TypeScript 5.8.3
- Database: PostgreSQL with TypeORM 0.3.20
- Caching: Redis with ioredis
- Authentication: JWT with jsonwebtoken
- Real-time: socket.io 4.6.1
- Security: helmet, cors, express-rate-limit

**Testing & Tools:**
- Testing: Vitest 2.1.8, Playwright 1.43.0, MSW 2.10.2
- Linting: ESLint 9.29.0 (flat config)
- Process: nodemon, concurrently

## Development Commands
### Quick Start
```bash
# Install all dependencies (from root)
npm install

# Start all services concurrently
npm run dev

# Or run individual services
npm run dev:api    # API server (port 4000)
npm run dev:web    # Main site (port 3000)
npm run dev:admin  # Admin dashboard (port 3001)
```

### Build Commands
```bash
# Build all workspaces
npm run build

# Build specific apps
npm run build:api
npm run build:web
npm run build:admin

# Clean and reinstall everything
npm run clean        # Remove all node_modules and dist
npm run install:all  # Install and build everything
```

### Code Quality
```bash
# Type checking (all workspaces)
npm run type-check

# Linting
npm run lint      # Check all TS/TSX files
npm run lint:fix  # Auto-fix issues

# Testing
npm run test              # Run all tests
npm run test:e2e         # E2E tests
npm run test:coverage    # With coverage

# Run single test file (from app directory)
npm run test -- path/to/test.spec.ts
```

### API Server Specific
```bash
# From apps/api-server directory
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
npm run create-admin      # Create admin user
npm run db:test          # Test database connection
npm run prettier         # Check formatting
npm run prettier:fix     # Fix formatting
```

## Architecture Overview

### Monorepo Structure
```
/apps
  /api-server         - Express backend with TypeORM
  /main-site         - Customer-facing React app
  /admin-dashboard   - WordPress-style admin interface

/packages
  /auth-client       - Authentication client library
  /auth-context      - React auth context providers
  /types            - Shared TypeScript definitions
  /ui               - Shared UI components
  /utils            - Shared utilities

/scripts             - Build and utility scripts
/.github/workflows   - CI/CD pipelines

/docs               - Project documentation
  /api              - API documentation
  /deployment       - Deployment guides
  /development      - Development guides
```

### Key Architectural Patterns

1. **Authentication Flow**: JWT-based with refresh tokens, managed through auth-client package
2. **API Communication**: RESTful endpoints at `/api/v1/*` with axios interceptors
3. **Real-time Updates**: Socket.io for live notifications and updates
4. **Role-Based Access**: Four main roles - Admin, Business, Affiliate, Customer
5. **Database Schema**: TypeORM entities with soft deletes and audit fields
6. **Frontend Patterns**: Custom hooks for API calls, context providers for global state
7. **Error Handling**: Error boundaries in frontend, circuit breakers in backend

### Core Features by Module

1. **User Management**: Multi-role system with approval workflows
2. **Content Management**: Posts, pages, custom post types (CPT), media library
3. **E-commerce**: Products with role-based pricing, orders, inventory
4. **Digital Signage**: Display management with playlists and scheduling
5. **Community/Forum**: Categories, posts, comments with moderation
6. **Analytics**: Dashboard with real-time metrics and reporting
7. **Beta Management**: Feature flagging and beta feedback system
8. **Operations**: Performance monitoring, auto-recovery, health checks

## Environment Setup

1. Copy `apps/api-server/env.example` to `apps/api-server/.env`
2. Configure PostgreSQL and Redis connections
3. Set JWT secrets and API keys

Key environment variables:
- `DB_*`: PostgreSQL connection
- `REDIS_*`: Redis connection
- `JWT_*`: Authentication tokens
- `AWS_*`: S3 storage (optional)
- `SMTP_*`: Email service
- `STRIPE_*`: Payment processing (optional)
- `KCP_*`: Korean payment gateway (optional)

## Testing Strategy

### Unit/Integration Tests (Vitest)
```bash
# Run from specific app directory
npm run test              # Run all tests
npm run test:unit        # Unit tests only
npm run test:coverage    # With coverage report
npm run test:watch       # Watch mode
```

### E2E Tests (Playwright)
```bash
# From app directory
npm run test:e2e         # Headless
npm run test:e2e:headed  # With browser
npm run test:e2e:ui      # Interactive UI
```

### Test Structure
- Unit tests: Alongside source files as `*.test.ts(x)`
- Integration tests: In `src/test/integration/`
- E2E tests: In `e2e/` or `tests/` directory
- Test utilities: Custom render with providers in `src/test/test-utils.tsx`
- API Mocks: MSW handlers in `src/test/mocks/`

## Common Development Tasks

### Adding a New Feature
1. Check existing patterns in similar features
2. Follow the established file structure
3. Use shared components from packages/ui
4. Add TypeScript types to packages/types if shared
5. Follow existing API endpoint patterns
6. Use existing custom hooks pattern (useProducts, useOrders, etc.)

### Working with Database
1. Create entity in `apps/api-server/src/entities/`
2. Generate migration: `npm run migration:generate -- -n FeatureName`
3. Review generated migration in `src/migrations/`
4. Run migration: `npm run migration:run`
5. Follow existing repository patterns in `src/repositories/`

### API Development
1. Routes in `apps/api-server/src/routes/`
2. Controllers handle request/response
3. Services contain business logic
4. Use existing middleware for auth/validation
5. Follow RESTful conventions
6. Add API documentation comments

### Frontend Development
1. Use existing UI components from packages/ui
2. Follow the established folder structure
3. Use Zustand for global state
4. React Query for server state
5. Follow existing styling patterns with TailwindCSS
6. Use lazy loading for code splitting
7. Implement error boundaries for sections

### Working with Themes
The platform supports multiple themes based on time of day:
- noon, afternoon, dusk, evening, twilight
- Themes are managed via ThemeContext
- CSS variables are defined in globals.css

## Package Version Compatibility

### Critical Version Requirements
The project uses React 19 and requires strict version compatibility. All packages have been verified for React 19 compatibility.

#### Core Dependencies
- **React**: ^19.1.0 (NOT 18.x)
- **React DOM**: ^19.1.0
- **Node.js**: Must be >=20.0.0 <21.0.0 (strict requirement)
- **TypeScript**: ~5.8.3
- **Vite**: ^6.3.5

#### Key Package Versions
**Tiptap Editor** (all v2.22.x):
- @tiptap/react: ^2.22.0
- @tiptap/starter-kit: ^2.22.0
- All extensions: ^2.22.0

**UI/Animation**:
- motion: ^12.19.2 (framer-motion replacement for React 19)
- tailwindcss: ^4.1.11 (v4 with new architecture)
- lucide-react: ^0.523.0

**React Ecosystem**:
- react-router-dom: ^7.6.0
- @tanstack/react-query: ^5.0.0
- zustand: ^5.0.5
- react-hook-form: ^7.49.3

**Development Tools**:
- eslint: ^9.29.0 (flat config)
- vitest: ^2.1.8
- @playwright/test: ^1.43.0

### Version Update Notes
- All packages verified for React 19 compatibility
- Motion library (12.19.2) replaces framer-motion
- TailwindCSS v4 with new PostCSS architecture
- ESLint 9.x with flat config system

## Dependency Management Process

### 🚨 CRITICAL: Dependency problems cause the most issues in development

**Development Process:**
1. **Before Development**: Always check and maintain dependency consistency
2. **During Development**: Follow existing package versions, avoid adding new dependencies
3. **After Development**: Perform comprehensive dependency audit
4. **During Debugging**: If dependency issues are found, resolve them AFTER debugging is complete

**Dependency Audit Checklist:**
- [ ] Check version consistency across all workspaces
- [ ] Verify no invalid or missing packages
- [ ] Remove extraneous/unused dependencies
- [ ] Ensure ESLint, TypeScript, and React versions are aligned
- [ ] Update shared libraries to consistent versions
- [ ] Run `npm ls --depth=0` to identify conflicts

**Common Dependency Issues:**
- ESLint version mismatches between root and workspaces
- Missing shared packages (@o4o/lib, @o4o/utils)
- Inconsistent versions of axios, date-fns, zustand, react-router-dom
- Extraneous packages causing conflicts

## NPM Scripts Reference

### Script Execution Hierarchy
The monorepo uses npm workspaces with scripts at two levels:
1. **Root scripts** - Orchestrate builds across all packages/apps
2. **Workspace scripts** - Individual package/app specific scripts

### Essential Scripts

#### Development
```bash
npm run dev              # Start all services (API:4000, Web:3000, Admin:3001)
npm run dev:api          # API server only
npm run dev:web          # Main site only
npm run dev:admin        # Admin dashboard only
```

#### Building
```bash
npm run build            # Build all (packages → apps)
npm run build:packages   # Build shared packages in dependency order
npm run build:apps       # Build all applications
npm run build:[app]      # Build specific app with packages
```

#### Code Quality & Testing
```bash
npm run type-check       # Type check all workspaces
npm run lint             # Lint all TS/TSX files
npm run lint:fix         # Auto-fix linting issues
npm run test             # Run all tests
npm run test:e2e         # Run E2E tests
npm run test:coverage    # With coverage report
```

#### Maintenance
```bash
npm run clean            # Remove all node_modules and dist
npm run install:all      # Clean install and build everything
```

### CI/CD Script Patterns

#### Standard Build Flow
```bash
npm ci                   # Clean install
npm run build:packages   # Build dependencies
npm run build            # Build applications
```

#### Package Build Order
```
types → utils → ui → auth-client → auth-context
```

#### Workspace Commands
```bash
# Run script in specific workspace
npm run build --workspace=@o4o/main-site

# Run from app directory
cd apps/main-site && npm run build
```

### Troubleshooting Scripts

1. **Script Not Found**: Check execution location (root vs app directory)
2. **Build Order Issues**: Always `build:packages` before `build:apps`
3. **Missing Scripts**: Check case sensitivity and workspace flag
4. **Bundle Analysis**: Use `build:analyze` for size optimization

## Important Notes

- No Docker usage for development
- Node.js version must be >=20.0.0 <21.0.0
- Always run lint and type-check before committing
- Follow existing code conventions and patterns
- Use existing utilities and libraries rather than adding new ones
- Maintain strict version compatibility for React 19
- Check for MSW handlers before implementing new API endpoints
- **DEPENDENCY MANAGEMENT IS CRITICAL** - follow the process above religiously
- **ALWAYS CHECK BROWSER CONSOLE** - Most white screen issues show errors there
- **BUILD ORDER MATTERS** - Always build packages before apps
- **SSH KEYS** - Use OpenSSH, RSA, or PKCS8 format without passphrase
- **KNOWN_HOSTS** - Always configure before SSH operations in CI/CD

## Recent Updates (2025-07)

### Deployment Issues Resolved
1. **SSH Connection**: Fixed "Host key verification failed" by adding known_hosts
2. **NPM CI Error**: Changed `npm ci` to `npm install` for production deployments
3. **Database Password**: Fixed "password must be a string" error with proper quoting

### Database Configuration
- **Database Name**: `o4o_platform` (confirmed in all environments)
- **Password Issues**: Always quote numeric passwords in GitHub Secrets
- **Connection String**: Environment variables must be sourced before migrations

### Deployment Debugging
Added diagnostic steps to deployment workflow:
```yaml
# Check existing configuration
- name: Check existing configuration
  run: |
    pm2 env ${{ env.PM2_APP_NAME }} | grep DB_
    ls -la .env*

# Test database connection
- name: Test database connection
  run: |
    export $(cat .env.production | grep -v '^#' | xargs)
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -c '\conninfo'
```

### Quick Fixes
```bash
# SSH Issues: Regenerate on server
ssh ubuntu@server "cd ~/.ssh && ssh-keygen -t rsa -b 4096 -f github_actions_key -N ''"
cat github_actions_key  # Copy to GitHub Secrets

# NPM Issues: Use install instead of ci
npm install --production  # Works without package-lock.json

# DB Password Issues: Check actual password on server
ssh ubuntu@api.neture.co.kr "cd /home/ubuntu/o4o-platform/apps/api-server && cat .env*"

# Git Divergent Branches: Set merge strategy
git config pull.rebase false
git pull origin main
# Or force reset to GitHub version
git fetch origin
git reset --hard origin/main

# Vite Host Blocking Issues
# Edit vite.config.ts and set:
server: {
  host: true  // Allow all hosts
}
```

## CI/CD Critical Guidelines

### 🚨 Prevent CI/CD Failures

**Package Dependencies**:
- All apps MUST explicitly declare @o4o/* package dependencies in their package.json
- Use `"@o4o/types": "file:../../packages/types"` format
- Never rely on implicit workspace resolution

**Build Order**:
1. Always run `npm run build:packages` BEFORE building apps
2. In CI, packages must be built before running type-check
3. Order: npm ci → build:packages → app-specific commands

**NPM CI Issues & Solutions**:
```bash
# Problem 1: "npm ci can only install with an existing package-lock.json"
# Solution: Use npm install for production deployments
- run: npm ci --only=production    # Old (fails on server)
- run: npm install --production     # New (works without package-lock.json)

# Problem 2: Workspace errors in CI/CD
# Solution: Clean install from root
rm -rf node_modules package-lock.json
rm -rf apps/*/node_modules packages/*/node_modules
npm install

# Problem 3: CI/CD performance
# Use these flags for faster installs:
npm install --prefer-offline --no-audit --no-fund
```

**TypeScript Configuration**:
- Do NOT use path mappings for @o4o packages in tsconfig.json
- Let npm workspaces handle module resolution
- Ensure all imports use proper package names (@o4o/types, not relative paths)

**Workspace Commands**:
- Use `npm run command --workspace=@o4o/app-name` from root
- Avoid `cd apps/xxx && npm run` in CI - it breaks module resolution
- Examples:
  ```bash
  # Good
  npm run type-check --workspace=@o4o/api-server
  npm run build --workspace=@o4o/main-site
  
  # Bad (breaks in CI)
  cd apps/api-server && npm run type-check
  ```

**PM2 Configuration**:
- Always use environment variables for paths
- Avoid hardcoded paths in ecosystem.config.js
```javascript
// Good
cwd: process.env.PM2_APP_PATH || '/home/ubuntu/o4o-platform/apps/admin-dashboard'

// Bad
cwd: '/home/sohae21/Coding/o4o-platform/apps/admin-dashboard'
```

**Development vs Production Servers**:
- Development: Use Vite dev server for hot reload
- Production: Use `serve` package for static files
```bash
# Development (with PM2)
pm2 start npm --name "admin-dashboard-dev" -- run dev -- --port 3001

# Production (requires serve package)
npm install serve
pm2 start npx --name "o4o-admin-dashboard" -- serve -s dist -l 3001
```

**SSH Deployment Setup**:
### 🔑 SSH Key Configuration (Simplified)

#### Standard Setup for All Workflows:
```yaml
- name: Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.API_SSH_KEY }}" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh-keyscan -H ${{ secrets.API_HOST }} >> ~/.ssh/known_hosts
    ssh-keyscan -H api.neture.co.kr >> ~/.ssh/known_hosts
```

#### Manual SSH Key Generation on Server:
When SSH issues persist, regenerate keys directly on the server:

```bash
# 1. On API Server
ssh ubuntu@api.neture.co.kr
cd ~/.ssh
ssh-keygen -t rsa -b 4096 -f github_actions_key -N ""
cat github_actions_key.pub >> authorized_keys
cat github_actions_key  # Copy this to GitHub Secrets as API_SSH_KEY

# 2. On Web Server  
ssh ubuntu@neture.co.kr
cd ~/.ssh
ssh-keygen -t rsa -b 4096 -f github_actions_key -N ""
cat github_actions_key.pub >> authorized_keys
cat github_actions_key  # Copy this to GitHub Secrets as WEB_SSH_KEY

# 3. Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_actions_key
```

#### Common SSH Issues:
- "Host key verification failed": Always add known_hosts before SSH commands
- "Permission denied (publickey)": Regenerate keys on server (see above)
- "Invalid key format": Ensure complete key including BEGIN/END lines

**Environment Differences**:
- CI starts with clean environment (no dist folders)
- Local development may have cached builds
- Always test with `npm run clean && npm run build` locally

**Common CI/CD Errors and Solutions**:
1. "Cannot find module '@o4o/types'": Missing package dependency or build order issue
2. "Permission denied (publickey)": Missing SSH key setup in job
3. "implicit any error": Missing type annotations - CI uses strict TypeScript
4. "Script not found": Using wrong script names (build:api vs build:api-server)
5. "Host key verification failed": Add known_hosts configuration before SSH commands

## TypeScript & Import Management Best Practices

### 🚨 Critical Rules to Prevent CI/CD Failures

**Import Management**:
1. **NEVER import React as a namespace in React 17+**
   ```typescript
   // ❌ WRONG - Will cause unused import warnings
   import React from 'react';
   
   // ✅ CORRECT - Import only what you need
   import { useState, useEffect } from 'react';
   ```

2. **Remove ALL unused imports before committing**
   - CI/CD will fail on ANY unused import warning
   - Use ESLint auto-fix: `npm run lint:fix`
   - Common unused imports to check:
     - React (when using new JSX transform)
     - Unused icon imports from lucide-react
     - Unused UI components (Badge, CardHeader, CardTitle)
     - Unused type imports

3. **Socket.io-client Import Pattern**
   ```typescript
   // ✅ CORRECT - Default import
   import io from 'socket.io-client';
   
   // For TypeScript, use 'any' type for socket refs if needed
   const socketRef = useRef<any>(null);
   ```

4. **Handle Missing Components Gracefully**
   ```typescript
   // If a component doesn't exist yet, comment it out
   // import { Navbar } from '../components/Navbar'; // TODO: Create Navbar component
   ```

**TypeScript Strict Mode Compliance**:
1. **Always add type annotations for parameters**
   ```typescript
   // ❌ WRONG
   products.map(item => item.name)
   
   // ✅ CORRECT
   products.map((item: any) => item.name)
   // Or better with proper types
   products.map((item: Product) => item.name)
   ```

2. **Avoid unused variable warnings**
   ```typescript
   // ❌ WRONG - Will fail CI/CD
   const [selectedMetric, setSelectedMetric] = useState('sales');
   // If only using selectedMetric
   
   // ✅ CORRECT - Prefix with underscore
   const [selectedMetric] = useState('sales');
   // Or if not using at all
   const [_selectedMetric, setSelectedMetric] = useState('sales');
   ```

3. **Type assertion when needed**
   ```typescript
   // When TypeScript can't infer types correctly
   setEditingProduct(baseProduct as BaseProduct);
   ```

**Pre-commit Checklist**:
- [ ] Run `npm run type-check` for your workspace
- [ ] Run `npm run lint` and fix ALL warnings
- [ ] Run `npm audit` and resolve security issues
- [ ] Remove all unused imports
- [ ] Add type annotations for all parameters
- [ ] Ensure no unused variables (prefix with _ if needed)
- [ ] Test with `npm run build` locally

**Quick Commands to Check Before Push**:
```bash
# Check specific workspace
npm run type-check --workspace=@o4o/digital-signage
npm run type-check --workspace=@o4o/ecommerce

# Fix imports automatically
npm run lint:fix --workspace=@o4o/digital-signage

# Check all workspaces
npm run type-check
```

## 🚨 Complete CI/CD Failure Prevention Guide

### NPM Security Audit Issues

**Common Security Vulnerabilities and Fixes**:

1. **form-data vulnerability**
   ```bash
   # Update to latest version
   npm update form-data
   # Or use audit fix
   npm audit fix
   ```

2. **on-headers vulnerability in serve package**
   ```bash
   # May require major version update
   npm audit fix --force
   # Or update serve manually
   npm install serve@latest
   ```

**Security Audit Best Practices**:
- Run `npm audit` before every commit
- Fix all moderate and above vulnerabilities
- Document any accepted low-risk vulnerabilities
- Keep dependencies updated regularly

### ESLint 'any' Type Warnings

**🔴 CRITICAL: CI/CD will fail on ANY ESLint warning!**

**Common Patterns to Fix**:

1. **Unexpected any type**
   ```typescript
   // ❌ WRONG - Will fail CI/CD
   products.map(item => item.name)
   
   // ✅ CORRECT - Add type annotation
   products.map((item: Product) => item.name)
   // Or if type is unknown
   products.map((item: any) => item.name)
   ```

2. **MSW Handler Types**
   ```typescript
   // ❌ WRONG
   http.post('/api/users', async ({ request }) => {
   
   // ✅ CORRECT
   http.post('/api/users', async ({ request }: any) => {
   ```

3. **Event Handler Types**
   ```typescript
   // ❌ WRONG
   onChange={(e) => setValue(e.target.value)}
   
   // ✅ CORRECT
   onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
   // Or simpler
   onChange={(e: any) => setValue(e.target.value)}
   ```

4. **Catch Block Types**
   ```typescript
   // ❌ WRONG
   } catch (error) {
   
   // ✅ CORRECT
   } catch (error: any) {
   // Or better
   } catch (error: unknown) {
   ```

### Other Common ESLint Issues

1. **Empty Pattern Destructuring**
   ```typescript
   // ❌ WRONG - no-empty-pattern
   export default function SignageDetail({}: SignageDetailProps) {
   
   // ✅ CORRECT
   export default function SignageDetail(_props: SignageDetailProps) {
   // Or use the props
   export default function SignageDetail(props: SignageDetailProps) {
   ```

2. **Constant Binary Expression**
   ```typescript
   // ❌ WRONG - no-constant-binary-expression
   {true && content.url && (
   
   // ✅ CORRECT
   {content.url && (
   ```

3. **Useless Escape**
   ```typescript
   // ❌ WRONG - no-useless-escape
   const regex = /\@/g;
   
   // ✅ CORRECT
   const regex = /@/g;
   ```

### Complete Pre-Push Validation

```bash
# 1. Check TypeScript
npm run type-check

# 2. Check ESLint (MUST have 0 warnings)
npm run lint

# 3. Check security vulnerabilities
npm audit --audit-level=moderate

# 4. Build everything
npm run build

# 5. Run tests
npm run test

# If any step fails, fix before pushing!
```

### Quick Fix Commands

```bash
# Auto-fix most lint issues
npm run lint:fix

# Fix security issues
npm audit fix

# Fix specific workspace
npm run lint:fix --workspace=@o4o/admin-dashboard

# Update all dependencies
npm update
```

### CI/CD Failure Checklist

When CI/CD fails, check in this order:
1. ❌ **TypeScript errors** → Run `npm run type-check`
2. ❌ **ESLint warnings** → Run `npm run lint` (MUST be 0 warnings)
3. ❌ **Security vulnerabilities** → Run `npm audit`
4. ❌ **Missing dependencies** → Run `npm install`
5. ❌ **Build order** → Run `npm run build:packages` first

### Zero-Tolerance Rules for CI/CD

1. **NO any types without annotation** - Every `any` must be explicit
2. **NO unused imports** - Remove immediately
3. **NO ESLint warnings** - Not even one!
4. **NO moderate+ security vulnerabilities** - Fix or document
5. **NO empty destructuring patterns** - Use underscore prefix
6. **NO implicit any errors** - Add type annotations

Remember: **CI/CD has ZERO tolerance for warnings!**

## Troubleshooting Guide

### Common Issues and Solutions

#### 🔴 White Screen Errors
**Always check browser console first!** Most issues show clear error messages.

Common causes:
1. **Missing dependencies**: Run `npm install` from root
2. **Build order issues**: Run `npm run build:packages` first
3. **Environment variables**: Check `.env` files exist
4. **API connection**: Verify API server is running

Debug steps:
```bash
# Clean rebuild
npm run clean
npm install
npm run build:packages
npm run dev
```

#### 🟡 Dependency Resolution Issues
- Always configure Vite aliases for @o4o/* packages pointing to /src
- Include proper ESM exports in all package.json files
- Maintain consistent versions across workspaces
- Build packages before apps: types → utils → ui → auth-client → auth-context

Common fixes:
```bash
# Check for version conflicts
npm ls --depth=0

# Find duplicate packages
npm dedupe

# Clear all caches
rm -rf node_modules package-lock.json
npm install
```

#### 🟢 Runtime Error Prevention
1. Always run `npm run type-check` before committing
2. Build packages in correct order before apps
3. Handle loading and error states in components
4. Implement error boundaries for graceful failures
5. Use proper null checks and optional chaining

#### 🔵 Mock Mode Development
- Set `USE_MOCK=true` in `.env` for DB-less development
- Test credentials: admin@example.com / password123
- Mock mode auto-creates default templates
- MSW intercepts API calls automatically

#### ⚡ Build Performance Best Practices
- Lazy load heavy components and routes
- Use dynamic imports for optional features
- Keep chunks under 500KB with code splitting
- Minimize dependencies in packages
- Run build:analyze regularly to monitor bundle size

### Debugging Tips

#### 1. TypeScript Errors
```bash
# Check specific workspace
npm run type-check --workspace=@o4o/api-server

# Generate tsconfig paths
npx tsc --showConfig > tsconfig.debug.json
```

#### 2. Module Not Found
```bash
# Verify package is built
ls packages/*/dist

# Check import paths
grep -r "from '@o4o" src/

# Rebuild specific package
npm run build --workspace=@o4o/types
```

#### 3. API Connection Issues
```bash
# Test API health
curl http://localhost:4000/health

# Check CORS headers
curl -H "Origin: http://localhost:3000" \
     -I http://localhost:4000/api/auth/health
```

#### 4. PM2 Process Issues
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs o4o-api-server --lines 100

# Restart with clean state
pm2 delete all
pm2 start ecosystem.config.js
```

#### 5. Database Connection Issues
```bash
# Error: "password authentication failed"
# 1. Check GitHub Secrets match actual DB password
# 2. Verify password is quoted in GitHub Secrets

# Error: "password must be a string"
# Solution in connection.ts:
const DB_PASSWORD = String(process.env.DB_PASSWORD || '');

# Test connection manually:
PGPASSWORD='your_password' psql -h localhost -U postgres -d o4o_platform

# Check existing config on server:
ssh ubuntu@api.neture.co.kr "pm2 env o4o-api-server | grep DB_"
```

## Code Quality Standards

### Critical Metrics to Maintain
- **Console statements**: 0 - Use proper logging (winston/pino)
- **Any types**: 0 - Use unknown, generics, or specific types
- **File size**: <300 lines - Split large files into modules
- **Circular dependencies**: 0 - Use dependency injection
- **Security issues**: 0 - No dangerouslySetInnerHTML, eval, or hardcoded secrets

### TypeScript Standards
- Always enable strict mode in all tsconfig.json files
- Use unknown instead of any for unknown types
- Implement proper type guards for runtime validation
- Add discriminated unions for complex types
- Follow patterns in TYPESCRIPT_GUIDELINES.md

### Performance Requirements
- Implement React.memo for expensive components
- Use useMemo/useCallback for optimization
- Lazy load all page components
- Code split by route
- Keep bundle chunks <500KB

## Development Best Practices

### Prevent Common Errors

#### TypeScript Configuration
- Always enable `strict: true` in tsconfig.json
- Use `strictNullChecks` to catch null/undefined errors
- Set `noImplicitAny: true` to force explicit typing
- Enable `esModuleInterop` for proper module imports

#### Query Parameter Type Safety
```typescript
// BAD: Assuming req.query values are numbers
const { limit = 20 } = req.query as { limit?: number };

// GOOD: req.query values are always strings
const { limit = '20' } = req.query as { limit?: string };
const limitNum = parseInt(limit) || 20;

// BETTER: Use validation library
import { z } from 'zod';
const querySchema = z.object({
  limit: z.string().optional().transform(v => parseInt(v || '20'))
});
const { limit } = querySchema.parse(req.query);
```

#### Import Management
- Always use absolute imports with @ aliases
- Ensure all entities are properly imported before use
- Avoid circular dependencies - use dependency injection pattern
- Use barrel exports (index.ts) for cleaner imports
- Group imports: external → @o4o packages → relative imports

#### Type Safety Patterns
```typescript
// BAD: Using any
const processData = (data: any) => data.value;

// GOOD: Using generics or unknown
const processData = <T extends { value: string }>(data: T) => data.value;
const handleUnknown = (data: unknown) => {
  if (isValidData(data)) return data.value;
};

// Type Guards
function isUser(obj: unknown): obj is User {
  return obj !== null && 
    typeof obj === 'object' &&
    'id' in obj &&
    'email' in obj;
}

// Discriminated Unions
type ApiResponse<T> = 
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
```

#### Environment Variables
```typescript
// BAD: Hardcoding secrets
const JWT_SECRET = "my-secret-key";

// GOOD: Using env with validation
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

// BETTER: Centralized config with validation
export const config = {
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  db: {
    host: requireEnv('DB_HOST'),
    port: parseInt(process.env.DB_PORT || '5432')
  }
};
```

#### Error Handling Patterns
```typescript
// Always use try-catch with proper error types
try {
  const result = await apiCall();
  return { success: true, data: result };
} catch (error) {
  // Type-safe error handling
  if (error instanceof ValidationError) {
    return { success: false, error: error.message };
  }
  // Log unexpected errors
  logger.error('Unexpected error:', error);
  return { success: false, error: 'Internal server error' };
}
```

#### Database Query Safety
```typescript
// BAD: SQL injection risk
const query = `SELECT * FROM users WHERE email = '${email}'`;

// GOOD: Using TypeORM query builder
const user = await userRepository
  .createQueryBuilder('user')
  .where('user.email = :email', { email })
  .getOne();

// GOOD: Using repository methods
const user = await userRepository.findOne({ 
  where: { email } 
});
```

## Deployment & Infrastructure

### Server Architecture
- **API Server**: api.neture.co.kr
  - PM2 Process: o4o-api-server
  - Path: /home/ubuntu/o4o-platform
  - Port: 4000
  
- **Web Servers**:
  - admin.neture.co.kr - Admin Dashboard
  - neture.co.kr - Main Site
  - Static files via PM2 + serve
  - Path: /var/www/{domain}/

### GitHub Actions Workflows

#### Deployment Workflows
1. **deploy-api-server.yml**
   - Triggers: Push to `apps/api-server/**`
   - Stages: Build → Test → Deploy → Health Check
   - Uses: shimataro/ssh-key-action for SSH setup

2. **deploy-admin-dashboard.yml**
   - Triggers: Push to `apps/admin-dashboard/**`
   - Stages: Build → Security Check → Deploy → Health Check
   - Special: Enhanced security validations for admin panel

3. **deploy-main-site.yml**
   - Triggers: Push to `apps/main-site/**`
   - Stages: Build → Optimize → Deploy → Performance Check
   - Features: Lighthouse CI integration

#### CI/CD Workflows
1. **ci.yml** - Main CI pipeline (build, test, lint)
2. **pr-checks.yml** - Pull request validations
3. **codeql.yml** - Security analysis
4. **server-health-check.yml** - Periodic health monitoring

### SSH Key Mapping
- API Deploy: Uses API_SSH_KEY
- Web Deploy: Uses WEB_SSH_KEY
- Both keys registered on respective servers

### GitHub Secrets Required

⚠️ **IMPORTANT**: All values with numbers must be added as strings to prevent type conversion issues!

#### SSH Keys:
- `API_SSH_KEY` - SSH private key for API server
- `WEB_SSH_KEY` - SSH private key for web servers

#### Server Configuration:
- `API_HOST` - API server hostname (e.g., `api.neture.co.kr`)
- `WEB_HOST` - Web server hostname (e.g., `neture.co.kr`)
- `API_USER` - API server username (e.g., `ubuntu`)
- `WEB_USER` - Web server username (e.g., `ubuntu`)

#### Database (CRITICAL - Must be strings!):
- `DB_HOST` - Database hostname (e.g., `localhost` or RDS endpoint)
- `DB_PORT` - Database port (e.g., `"5432"` not `5432`)
- `DB_USERNAME` - Database username (e.g., `"postgres"`)
- `DB_PASSWORD` - Database password (⚠️ MUST be quoted if numeric!)
- `DB_NAME` - Database name (`"o4o_platform"`)

#### Application:
- `JWT_SECRET` - JWT secret key (generate with `openssl rand -base64 32`)
- `JWT_EXPIRES_IN` - JWT expiration (e.g., `'7d'`)
- `CORS_ORIGIN` - Allowed origins (e.g., `'https://neture.co.kr'`)
- `LOG_LEVEL` - Logging level (e.g., `'info'`)
- `HEALTH_CHECK_KEY` - Health check auth key

#### Example for numeric password:
```
# Wrong: Will cause "password must be a string" error
DB_PASSWORD: 12345678

# Correct: Always add as string in GitHub Secrets
DB_PASSWORD: "12345678"
```

## Security Guidelines

### Security Best Practices
1. **Environment Variables** - All secrets must be in .env, never in code
2. **Safe HTML Rendering** - Use DOMPurify if HTML rendering needed
3. **Input Validation** - Validate and sanitize all user inputs
4. **Database Queries** - Always use TypeORM query builder or parameterized queries
5. **Rate Limiting** - Configure express-rate-limit for all endpoints
6. **Authentication** - Use JWT with proper expiration and refresh tokens
7. **CORS** - Configure strict CORS policies for production

### Environment Variables
- Store all secrets in .env files
- Never commit .env files
- Use different secrets for development/production
- Rotate keys regularly

## TypeScript Migration Strategy

### File-by-File Approach
1. Add `// @ts-strict` to top of file
2. Fix all type errors in that file
3. Replace any with unknown or specific types
4. Add proper return types to all functions
5. Implement type guards for runtime checks

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run type-check && npm run lint"
    }
  }
}
```

## Performance Optimization Patterns

### React Optimization
```typescript
// Memoize expensive components
export default React.memo(ExpensiveComponent);

// Memoize expensive calculations
const expensiveValue = useMemo(() => calculateExpensive(data), [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Code Splitting
```typescript
// Lazy load routes
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Lazy load heavy components
const RichTextEditor = lazy(() => import('./components/RichTextEditor'));
```

### Bundle Optimization
- Use build:analyze to identify large dependencies
- Consider alternatives to heavy libraries
- Implement tree shaking
- Use dynamic imports for optional features

## 🐛 Common TypeScript Bug Patterns & Solutions

### 개발 시 주의할 TypeScript 버그 패턴들

이 섹션은 2025-07-20 admin-dashboard TypeScript 오류 수정 경험을 바탕으로 정리된 것입니다.

#### 🔴 HIGH PRIORITY - Critical Type Issues

**1. Interface Extension with Property Conflicts**
```typescript
// ❌ WRONG: Properties conflict between base and extended interfaces
export interface Product extends BaseProduct {
  status: ProductStatus  // Conflicts with BaseProduct.status
}

// ✅ CORRECT: Use Omit to exclude conflicting properties
export interface Product extends Omit<BaseProduct, 'status' | 'pricing' | 'inventory'> {
  status: ProductStatus  // Now safe to override
  // Add admin-specific fields
  retailPrice: number
  stockQuantity: number
}
```

**2. Date vs String Type Mismatches**
```typescript
// ❌ WRONG: Mixing Date and string types
const mockData = {
  createdAt: new Date().toISOString(),  // String
  updatedAt: new Date('2024-01-01'),    // Date object
}

// ✅ CORRECT: Check interface requirements first
// If interface expects Date:
interface Entity {
  createdAt: Date
  updatedAt: Date
}
const mockData: Entity = {
  createdAt: new Date(),
  updatedAt: new Date('2024-01-01'),
}

// If interface expects string:
interface EntityAPI {
  createdAt: string
  updatedAt: string
}
const apiData: EntityAPI = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
}
```

**3. Missing Required Properties in Extended Interfaces**
```typescript
// ❌ WRONG: Missing required properties
interface AdminCategory extends Category {
  postCount: number  // Added but base Category doesn't have this
}

// ✅ CORRECT: Create proper admin interface
interface AdminCategory {
  id: string
  name: string
  slug: string
  postCount: number  // Admin-specific field
  // All other required fields...
}
```

#### 🟡 MEDIUM PRIORITY - Import & Module Issues

**4. Wrong Import Sources**
```typescript
// ❌ WRONG: Importing from wrong source
import type { Category } from '@o4o/types'  // This might be ecommerce Category

// ✅ CORRECT: Import the right type for your context
import type { PostCategory } from '@o4o/types'  // For post-related contexts
// OR create admin-specific interface
interface AdminCategory extends Category {
  postCount?: number
}
```

**5. Type Assertion Overuse**
```typescript
// ❌ WRONG: Overusing type assertions
const category = mockCategories[0] as Category
<Badge>{(category as any).postCount}</Badge>

// ✅ CORRECT: Proper typing
interface AdminCategory extends Category {
  postCount?: number
}
const category: AdminCategory = mockCategories[0]
<Badge>{category.postCount || 0}</Badge>
```

#### 🟢 LOW PRIORITY - Chart & UI Component Issues

**6. Third-party Library Type Issues**
```typescript
// ❌ WRONG: Complex generic types for chart tooltips
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {

// ✅ TEMPORARY FIX: Use 'any' for problematic third-party types
const CustomTooltip = ({ active, payload, label }: any) => {
  // This is acceptable for UI components where type safety is less critical
}
```

### 🔧 TypeScript Error Prevention Checklist

#### Before Development:
- [ ] Check base interfaces in `packages/types/src/` before extending
- [ ] Verify Date vs string requirements for timestamp fields
- [ ] Confirm which Category/Tag interface to use (post vs ecommerce vs common)
- [ ] Check existing mock data patterns in the workspace

#### During Development:
- [ ] Use `Omit<BaseInterface, 'conflictingField'>` for interface extensions
- [ ] Create admin-specific interfaces when base types don't fit
- [ ] Use proper imports: PostCategory for posts, Category for ecommerce
- [ ] Keep Date objects as Date, strings as strings consistently

#### After Development:
- [ ] Run `npm run type-check --workspace=@o4o/admin-dashboard` 
- [ ] Fix all explicit errors before using type assertions
- [ ] Document any necessary type assertions with comments
- [ ] Update mock data to match new interface requirements

### 🚨 Critical Patterns to Avoid

**Never do these:**
1. **Mixed Date Types**: Don't mix `new Date()` and `new Date().toISOString()` in same interface
2. **Any Type Overuse**: Don't use `any` except for problematic third-party libraries
3. **Wrong Category Import**: Always verify which Category interface you need
4. **Missing Omit**: Don't extend interfaces without excluding conflicting properties
5. **Type Assertion Shortcuts**: Don't use `as any` to bypass type checking

### 📋 Quick Fix Commands

```bash
# Find all Date/string mismatches
grep -r "new Date.*toISOString" src/

# Find type assertion usage
grep -r " as " src/ --include="*.ts" --include="*.tsx"

# Check interface conflicts
npm run type-check --workspace=@o4o/admin-dashboard 2>&1 | grep "Property.*missing\|not assignable"

# Fix bulk text replacements (example)
sed -i 's/published/active/g' src/**/*.ts
```

### 📚 Additional Resources

- **Interface Design**: Follow existing patterns in `packages/types/src/`
- **Mock Data**: Check `src/test/mocks/` for examples
- **Date Handling**: Verify requirements in base interfaces first
- **Chart Types**: Use `any` temporarily for complex third-party generics

> **Note**: This guide is based on real debugging session from 2025-07-20 where we fixed 46+ TypeScript errors systematically. The patterns here are proven solutions that work in the O4O Platform codebase.

이 섹션은 2025-07-20 admin-dashboard TypeScript 오류 수정 경험을 바탕으로 정리된 것입니다.

#### 🔴 HIGH PRIORITY - Critical Type Issues

**1. Interface Extension with Property Conflicts**
```typescript
// ❌ WRONG: Properties conflict between base and extended interfaces
export interface Product extends BaseProduct {
  status: ProductStatus  // Conflicts with BaseProduct.status
}

// ✅ CORRECT: Use Omit to exclude conflicting properties
export interface Product extends Omit<BaseProduct, 'status' | 'pricing' | 'inventory'> {
  status: ProductStatus  // Now safe to override
  // Add admin-specific fields
  retailPrice: number
  stockQuantity: number
}
```

**2. Date vs String Type Mismatches**
```typescript
// ❌ WRONG: Mixing Date and string types
const mockData = {
  createdAt: new Date().toISOString(),  // String
  updatedAt: new Date('2024-01-01'),    // Date object
}

// ✅ CORRECT: Check interface requirements first
// If interface expects Date:
interface Entity {
  createdAt: Date
  updatedAt: Date
}
const mockData: Entity = {
  createdAt: new Date(),
  updatedAt: new Date('2024-01-01'),
}

// If interface expects string:
interface EntityAPI {
  createdAt: string
  updatedAt: string
}
const apiData: EntityAPI = {
  createdAt: new Date().toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
}
```

**3. Missing Required Properties in Extended Interfaces**
```typescript
// ❌ WRONG: Missing required properties
interface AdminCategory extends Category {
  postCount: number  // Added but base Category doesn't have this
}

// ✅ CORRECT: Create proper admin interface
interface AdminCategory {
  id: string
  name: string
  slug: string
  postCount: number  // Admin-specific field
  // All other required fields...
}
```

#### 🟡 MEDIUM PRIORITY - Import & Module Issues

**4. Wrong Import Sources**
```typescript
// ❌ WRONG: Importing from wrong source
import type { Category } from '@o4o/types'  // This might be ecommerce Category

// ✅ CORRECT: Import the right type for your context
import type { PostCategory } from '@o4o/types'  // For post-related contexts
// OR create admin-specific interface
interface AdminCategory extends Category {
  postCount?: number
}
```

**5. Type Assertion Overuse**
```typescript
// ❌ WRONG: Overusing type assertions
const category = mockCategories[0] as Category
<Badge>{(category as any).postCount}</Badge>

// ✅ CORRECT: Proper typing
interface AdminCategory extends Category {
  postCount?: number
}
const category: AdminCategory = mockCategories[0]
<Badge>{category.postCount || 0}</Badge>
```

#### 🟢 LOW PRIORITY - Chart & UI Component Issues

**6. Third-party Library Type Issues**
```typescript
// ❌ WRONG: Complex generic types for chart tooltips
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {

// ✅ TEMPORARY FIX: Use 'any' for problematic third-party types
const CustomTooltip = ({ active, payload, label }: any) => {
  // This is acceptable for UI components where type safety is less critical
}
```

### 🔧 TypeScript Error Prevention Checklist

#### Before Development:
- [ ] Check base interfaces in `packages/types/src/` before extending
- [ ] Verify Date vs string requirements for timestamp fields
- [ ] Confirm which Category/Tag interface to use (post vs ecommerce vs common)
- [ ] Check existing mock data patterns in the workspace

#### During Development:
- [ ] Use `Omit<BaseInterface, 'conflictingField'>` for interface extensions
- [ ] Create admin-specific interfaces when base types don't fit
- [ ] Use proper imports: PostCategory for posts, Category for ecommerce
- [ ] Keep Date objects as Date, strings as strings consistently

#### After Development:
- [ ] Run `npm run type-check --workspace=@o4o/admin-dashboard` 
- [ ] Fix all explicit errors before using type assertions
- [ ] Document any necessary type assertions with comments
- [ ] Update mock data to match new interface requirements

### 🚨 Critical Patterns to Avoid

**Never do these:**
1. **Mixed Date Types**: Don't mix `new Date()` and `new Date().toISOString()` in same interface
2. **Any Type Overuse**: Don't use `any` except for problematic third-party libraries
3. **Wrong Category Import**: Always verify which Category interface you need
4. **Missing Omit**: Don't extend interfaces without excluding conflicting properties
5. **Type Assertion Shortcuts**: Don't use `as any` to bypass type checking

### 📋 Quick Fix Commands

```bash
# Find all Date/string mismatches
grep -r "new Date.*toISOString" src/

# Find type assertion usage
grep -r " as " src/ --include="*.ts" --include="*.tsx"

# Check interface conflicts
npm run type-check --workspace=@o4o/admin-dashboard 2>&1 | grep "Property.*missing\|not assignable"

# Fix bulk text replacements (example)
sed -i 's/published/active/g' src/**/*.ts
```

### 📚 Additional Resources

- **Interface Design**: Follow existing patterns in `packages/types/src/`
- **Mock Data**: Check `src/test/mocks/` for examples
- **Date Handling**: Verify requirements in base interfaces first
- **Chart Types**: Use `any` temporarily for complex third-party generics

> **Note**: This guide is based on real debugging session from 2025-07-20 where we fixed 28+ TypeScript errors systematically. The patterns here are proven solutions that work in the O4O Platform codebase.