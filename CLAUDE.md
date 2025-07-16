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