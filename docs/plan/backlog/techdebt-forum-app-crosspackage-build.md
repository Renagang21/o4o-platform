# TechDebt: forum-app ↔ api-server cross-package build dependency

## Issue Summary
`forum-app` cannot be built with TypeScript due to cross-package import dependencies on `api-server` entities.

## Current State
- **Problem**: Forum entity files import `User` type from `api-server/src/entities/User.ts`
- **Impact**: TypeScript compilation fails with `rootDir` errors
- **Workaround**: Dist files are manually maintained on the server

## Affected Files
```
packages/forum-app/src/backend/entities/ForumPost.ts
packages/forum-app/src/backend/entities/ForumCategory.ts
packages/forum-app/src/backend/entities/ForumComment.ts
```

## Error Example
```
error TS6059: File '.../api-server/src/entities/User.ts' is not under 'rootDir'
```

## Proposed Solutions

### Option A: Use Type-Only Imports (Recommended)
Replace direct imports with type-only imports and resolve at runtime:
```typescript
// Before
import type { User } from '../../../../../apps/api-server/src/entities/User.js';

// After
// No import - use 'any' or create a shared types package
```

### Option B: Create Shared Types Package
Create `@o4o/shared-types` package that both `forum-app` and `api-server` can import from.

### Option C: Move Forum Entities to api-server
Move all forum entities to `api-server` and have `forum-app` only contain business logic and frontend.

## Priority
- **Priority**: Low (workaround in place)
- **Effort**: Medium
- **Risk if not fixed**: Manual dist management required for each deployment

## Related
- Work Order: Forum DB Migration Alignment (completed 2025-12-13)
- Branch: `feature/forum-db-migration-alignment-final`

---
Created: 2025-12-13
Status: Backlog
