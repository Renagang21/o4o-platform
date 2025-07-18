# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**SSH Deployment Setup**:
### 🔑 SSH Key Configuration
1. **Key Format Requirements**:
   - Supports RSA, PKCS8, and OpenSSH formats
   - No passphrase allowed
   - Unix line endings (LF) required

2. **GitHub Actions SSH Setup**:
   ```yaml
   # Method 1: Using shimataro/ssh-key-action (Recommended)
   - name: Setup SSH key
     uses: shimataro/ssh-key-action@v2
     with:
       key: ${{ secrets.API_SSH_KEY }}
       known_hosts: unnecessary
       if_key_exists: replace
   
   # Method 2: Using webfactory/ssh-agent
   - name: Setup SSH Agent
     uses: webfactory/ssh-agent@v0.9.0
     with:
       ssh-private-key: ${{ secrets.API_SSH_KEY }}
   ```

3. **Known Hosts Configuration** (REQUIRED):
   ```yaml
   - name: Add SSH known hosts
     run: |
       mkdir -p ~/.ssh
       ssh-keyscan -H ${{ secrets.HOST }} >> ~/.ssh/known_hosts
       ssh-keyscan -H domain.com >> ~/.ssh/known_hosts
       chmod 644 ~/.ssh/known_hosts
   ```

4. **Common SSH Issues**:
   - "Host key verification failed": Missing known_hosts setup
   - "Permission denied (publickey)": Wrong key format or missing key
   - "ssh-keygen -p interactive mode": Use shimataro/ssh-key-action instead

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

## Troubleshooting Guide

### Common Issues and Solutions

#### Prevent Dependency Resolution Issues
- Always configure Vite aliases for @o4o/* packages pointing to /src
- Include proper ESM exports in all package.json files
- Maintain consistent versions across workspaces
- Build packages before apps: types → utils → ui → auth-client → auth-context

#### Prevent Runtime Errors
1. Always run `npm run type-check` before committing
2. Build packages in correct order before apps
3. Handle loading and error states in components
4. Implement error boundaries for graceful failures
5. Use proper null checks and optional chaining

#### Mock Mode Development
- Set `USE_MOCK=true` in `.env` for DB-less development
- Test credentials: admin@example.com / password123
- Mock mode auto-creates default templates

#### Build Performance Best Practices
- Lazy load heavy components and routes
- Use dynamic imports for optional features
- Keep chunks under 500KB with code splitting
- Minimize dependencies in packages
- Run build:analyze regularly to monitor bundle size

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

### SSH Key Mapping
- API Deploy: Uses SSH_API_PRIVATE_KEY
- Web Deploy: Uses SSH_WEB_PRIVATE_KEY
- Both keys registered on respective servers

### GitHub Secrets Required
- API_SSH_KEY (SSH private key for API server)
- WEB_SSH_KEY (SSH private key for web servers)
- API_HOST (API server hostname)
- WEB_HOST (Web server hostname)
- API_USER (API server username)
- WEB_USER (Web server username)
- DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME
- JWT_SECRET, JWT_EXPIRES_IN
- CORS_ORIGIN
- LOG_LEVEL
- HEALTH_CHECK_KEY

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