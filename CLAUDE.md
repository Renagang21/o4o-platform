# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

O4O Platform is a comprehensive multi-tenant e-commerce platform built with a monorepo architecture. It combines content management, digital signage, community features, and business partnerships with role-based access control.

### Technology Stack

**Frontend:**
- React 19 with TypeScript, Vite, TailwindCSS
- Zustand (state), React Query (server state), React Hook Form
- Socket.io-client for real-time features

**Backend:**
- Node.js 20 with Express and TypeScript
- TypeORM with PostgreSQL, Redis for caching
- JWT authentication, Socket.io for WebSockets

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
```

### API Server Specific
```bash
# From apps/api-server directory
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run create-admin      # Create admin user
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
```

### Key Architectural Patterns

1. **Authentication Flow**: JWT-based with refresh tokens, managed through auth-client package
2. **API Communication**: RESTful endpoints at `/api/v1/*` with axios interceptors
3. **Real-time Updates**: Socket.io for live notifications and updates
4. **Role-Based Access**: Four main roles - Admin, Business, Affiliate, Customer
5. **Database Schema**: TypeORM entities with soft deletes and audit fields

### Core Features by Module

1. **User Management**: Multi-role system with approval workflows
2. **Content Management**: Posts, pages, custom post types, media library
3. **E-commerce**: Products with role-based pricing, orders, inventory
4. **Digital Signage**: Display management system
5. **Community/Forum**: User-generated content and discussions
6. **Analytics**: Dashboard with real-time metrics
7. **Beta Management**: Feature flagging for beta users

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

## Testing Strategy

### Unit/Integration Tests (Vitest)
```bash
# Run from specific app directory
npm run test              # Run all tests
npm run test:unit        # Unit tests only
npm run test:coverage    # With coverage report
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
- Mocks: Using MSW for API mocking

## Common Development Tasks

### Adding a New Feature
1. Check existing patterns in similar features
2. Follow the established file structure
3. Use shared components from packages/ui
4. Add TypeScript types to packages/types if shared
5. Follow existing API endpoint patterns

### Working with Database
1. Create entity in `apps/api-server/src/entities/`
2. Generate migration: `npm run migration:generate -- -n FeatureName`
3. Run migration: `npm run migration:run`
4. Follow existing repository patterns

### API Development
1. Routes in `apps/api-server/src/routes/`
2. Controllers handle request/response
3. Services contain business logic
4. Use existing middleware for auth/validation
5. Follow RESTful conventions

### Frontend Development
1. Use existing UI components from packages/ui
2. Follow the established folder structure
3. Use Zustand for global state
4. React Query for server state
5. Follow existing styling patterns with TailwindCSS

## Package Version Compatibility

### Critical Version Requirements
The project uses React 19 and requires strict version compatibility. All packages have been verified for React 19 compatibility as of 2025-06-28.

#### Core Dependencies
- **React**: ^19.1.0 (NOT 18.x)
- **React DOM**: ^19.1.0
- **Node.js**: 20.18.0 (must be >=20.0.0 <21.0.0)
- **TypeScript**: ~5.8.3
- **Vite**: ^6.3.5

#### Key Package Versions
**Tiptap Editor** (all v2.22.x):
- @tiptap/react: ^2.22.0
- @tiptap/starter-kit: ^2.22.0
- All extensions: ^2.22.0

**UI/Animation**:
- motion: ^12.19.2 (framer-motion replacement)
- tailwindcss: ^4.1.11
- lucide-react: ^0.523.0

**React Ecosystem**:
- react-router-dom: ^7.6.0
- @tanstack/react-query: ^5.0.0
- zustand: ^5.0.5
- react-hook-form: ^7.49.3

**Development Tools**:
- eslint: ^9.29.0
- vitest: ^2.1.8
- @playwright/test: ^1.43.0

### Version Update Notes
- All packages verified for React 19 compatibility
- Motion library (12.19.2) replaces framer-motion
- TailwindCSS v4 with new PostCSS architecture
- ESLint 9.x with flat config system

## Important Notes

- No Docker usage for development (as per user requirement)
- Node.js version must be >=20.0.0 <21.0.0
- Always run lint and type-check before committing
- Follow existing code conventions and patterns
- Use existing utilities and libraries rather than adding new ones
- Maintain strict version compatibility for React 19