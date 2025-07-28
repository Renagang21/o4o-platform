# NPM Scripts Guide

## 📚 Overview

This guide documents all npm scripts used in the O4O Platform monorepo, their purposes, and how they're used in CI/CD workflows.

## 🏗️ Architecture

The monorepo uses npm workspaces with scripts at two levels:
1. **Root scripts** - Orchestrate builds across all packages/apps
2. **Workspace scripts** - Individual package/app specific scripts

## 📦 Root Level Scripts

Located in `/package.json`:

### Development
- `npm run dev` - Start all services concurrently (API, Web, Admin)
- `npm run dev:api` - Start API server only
- `npm run dev:web` - Start main site only  
- `npm run dev:admin` - Start admin dashboard only

### Building
- `npm run build` - Build all packages then all apps
- `npm run build:packages` - Build all packages in dependency order
- `npm run build:apps` - Build all applications
- `npm run build:api` - Build packages + API server
- `npm run build:web` - Build packages + main site
- `npm run build:admin` - Build packages + admin dashboard

### Code Quality
- `npm run type-check` - Type check all workspaces
- `npm run lint` - Lint all TypeScript files
- `npm run lint:fix` - Auto-fix linting issues
- `npm run test` - Run all tests
- `npm run test:e2e` - Run E2E tests

### Maintenance
- `npm run clean` - Remove all node_modules and dist folders
- `npm run install:all` - Clean install and build everything

## 📱 Application Scripts

### API Server (`apps/api-server`)
- `npm run dev` - Start development server with nodemon
- `npm run build` - TypeScript compilation
- `npm run start` - Start production server
- `npm run migration:generate` - Generate TypeORM migration
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration

### Main Site (`apps/main-site`)
- `npm run dev` - Start Vite dev server
- `npm run build` - Production build
- `npm run build:analyze` - Build with bundle analysis
- `npm run preview` - Preview production build

### Admin Dashboard (`apps/admin-dashboard`)
- `npm run dev` - Start Vite dev server (port 3001)
- `npm run build` - Production build
- `npm run build:analyze` - Build with bundle analysis
- `npm run preview` - Preview production build

## 🚀 CI/CD Usage Patterns

### Workflow Script Execution

#### From Root Directory
Most workflows execute scripts from the root:
```bash
npm ci                    # Install dependencies
npm run type-check        # Type check all
npm run lint             # Lint all
npm run build:packages   # Build packages first
```

#### From App Directory
Some workflows change to app directory:
```bash
cd apps/main-site
npm run build            # Build specific app
npm run build:analyze    # Analyze bundle
```

### Common Patterns

1. **Package Build Order**
   ```
   types → utils → ui → auth-client → auth-context
   ```

2. **Full Build Sequence**
   ```bash
   npm run build:packages  # Build shared packages
   npm run build          # Build application
   ```

3. **Quality Checks**
   ```bash
   npm run type-check
   npm run lint
   npm audit --audit-level=high
   ```

## 🔧 Troubleshooting

### Script Not Found Errors

1. **Check execution location**
   - Root scripts: Run from project root
   - App scripts: Run from app directory or use `--workspace`

2. **Use workspace flag**
   ```bash
   npm run build --workspace=@o4o/main-site
   ```

3. **Verify script exists**
   - Check appropriate package.json
   - Scripts are case-sensitive

### Build Order Issues

Always build packages before apps:
```bash
npm run build:packages && npm run build:apps
```

### Missing Scripts Added

The following scripts were added to fix workflow issues:
- `build:analyze` in admin-dashboard
- `build:analyze` in main-site

These scripts provide bundle analysis with graceful fallback.

## 📋 Script Naming Conventions

### Patterns
- `dev` - Development server
- `build` - Production build
- `build:[target]` - Build specific target
- `test` - Run tests
- `test:[type]` - Run specific test type
- `lint` - Check code style
- `lint:fix` - Fix code style
- `type-check` - TypeScript type checking

### Consistency Rules
1. All apps have core scripts: `dev`, `build`, `test`, `lint`, `type-check`
2. Root scripts orchestrate workspace scripts
3. Use `:[modifier]` for variations (e.g., `test:e2e`)

## 🎯 Best Practices

1. **Always run from root** when possible
2. **Use workspace commands** for targeted operations
3. **Build packages first** before building apps
4. **Include error handling** with `|| true` for non-critical scripts
5. **Document new scripts** in this guide

## 🔄 Workflow Integration

### GitHub Actions Usage

#### Standard Build Flow
```yaml
- run: npm ci
- run: npm run build:packages
- run: npm run build
```

#### Quality Checks
```yaml
- run: npm run type-check
- run: npm run lint
- run: npm audit --audit-level=high
```

#### App-Specific Build
```yaml
- run: |
    cd apps/main-site
    npm run build
    npm run build:analyze || true
```

### PM2 Development Mode

For running applications with PM2 in development mode:

```bash
# Admin Dashboard Development
pm2 start npm --name "o4o-admin-dashboard" -- run dev -- --port 3001

# API Server Development
pm2 start npm --name "api-server" -- run dev

# Main Site Development
pm2 start npm --name "o4o-main-site" -- run dev -- --port 3000
```

### Production Build and Serve

```bash
# Build for production
npm run build

# Serve with static server (requires serve package)
npm install -g serve
pm2 start serve --name "admin-prod" -- -s dist -l 3001
```

### Common Script Issues

1. **package-lock.json out of sync**
   ```bash
   # Solution: Use npm install instead of npm ci
   npm install
   ```

2. **Vite host blocking in development**
   - Add `host: true` to vite.config.ts server configuration

3. **Build order matters**
   - Always run `npm run build:packages` before building apps

This documentation ensures consistency across all workflows and helps prevent script-related CI/CD failures.