# O4O Platform Dependency Issues Report

## 🔍 Identified Issues

### 1. Version Inconsistencies

#### React Type Definitions
- **main-site**: `@types/react@^19.1.8`, `@types/react-dom@^19.1.6`
- **admin-dashboard**: `@types/react@^19.1.8`, `@types/react-dom@^19.1.6`
- **ui package**: `@types/react@^19.1.8`, `@types/react-dom@^19.1.6`
- **Status Table**: `@types/react@^19.1.2`, `@types/react-dom@^19.1.2` ❌

#### Tiptap Versions
- **Status Table**: All Tiptap packages at `^2.22.x`
- **admin-dashboard**: Tiptap packages at `^2.23.x` ❌

#### TailwindCSS
- **Status Table**: `tailwindcss@^4.1.11`
- **admin-dashboard**: `tailwindcss@^3.4.17` ❌ (Major version difference!)

#### Testing Libraries
- **main-site**: `vitest@^3.2.4`, `@playwright/test@^1.53.1`
- **admin-dashboard**: `vitest@^3.2.4`, `@playwright/test@^1.53.2`

#### Development Dependencies
- **Root**: `concurrently@^9.1.0`
- **Status Table**: `concurrently@^7.6.0` ❌

### 2. Missing Dependencies

#### socket.io-client Versions
- **main-site**: `socket.io-client@^4.8.1`
- **admin-dashboard**: `socket.io-client@^4.8.1`
- **Status Table**: `socket.io-client@^4.7.4` ❌

#### TypeScript-ESLint
- **Root**: `@typescript-eslint/eslint-plugin@^8.18.2`, `@typescript-eslint/parser@^8.18.2`
- **main-site**: `typescript-eslint@^8.36.0`
- **admin-dashboard**: `@typescript-eslint/eslint-plugin@^8.36.0`, `@typescript-eslint/parser@^8.36.0`

### 3. Unique Dependencies in admin-dashboard

The admin-dashboard has many Radix UI components that aren't shared:
- `@radix-ui/react-*` packages (15+ components)
- `@dnd-kit/*` packages for drag-and-drop
- `react-dnd` and `react-dnd-html5-backend`
- `recharts` for charts
- `lowlight` for code highlighting
- `zod` for validation

### 4. Shared Package Dependencies

All apps correctly reference local packages:
- `@o4o/types: "file:../../packages/types"`
- `@o4o/ui: "file:../../packages/ui"`
- `@o4o/utils: "file:../../packages/utils"`

## 🚨 Critical Issues to Fix

1. **TailwindCSS Major Version Mismatch**
   - admin-dashboard is using v3 while others use v4
   - This could cause significant styling differences

2. **Tiptap Version Mismatch**
   - admin-dashboard uses newer version (2.23.x vs 2.22.x)
   - Could cause compatibility issues

3. **Type Definition Versions**
   - Minor version differences in React types

## 📋 Recommended Actions

1. Standardize all Tiptap packages to `^2.23.0`
2. Upgrade admin-dashboard TailwindCSS to v4
3. Align all React type definitions to `^19.1.8`
4. Update socket.io-client to `^4.8.1` across all apps
5. Standardize TypeScript-ESLint versions
6. Update root concurrently to match status table