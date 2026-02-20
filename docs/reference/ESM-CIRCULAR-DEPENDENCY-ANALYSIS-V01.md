# ESM Circular Dependency Analysis Report

**Date**: 2026-01-11
**Author**: Claude Code Investigation
**Status**: ❌ **CRITICAL - Server Startup Blocked**
**Scope**: Platform-Wide TypeORM Entity Issue

---

## Executive Summary

### 🔴 Critical Finding

**API Server cannot start** due to ESM circular dependency in TypeORM entities affecting **all services** in the platform.

```
ReferenceError: Cannot access 'CosmeticsProduct' before initialization
ReferenceError: Cannot access 'YaksaPost' before initialization
```

### Root Cause (Confirmed)

1. ✅ ESM module system (`package.json`: `"type": "module"`)
2. ✅ TypeScript `emitDecoratorMetadata: true` (tsconfig.json line 21)
3. ✅ TypeORM bidirectional relationships (`@OneToMany` ↔ `@ManyToOne`)
4. ✅ Direct class imports in entity files causing initialization race condition

### Impact Scope

| Service | Entity Files | Bidirectional Relations | Status |
|---------|-------------|------------------------|---------|
| **Cosmetics** | 4 | Brand ↔ Line ↔ Product ↔ PricePolicy | ❌ Fixed |
| **Yaksa** | 3 | Category ↔ Post ↔ PostLog | ❌ **BROKEN** |
| **Glycopharm** | 6 | Pharmacy ↔ Product, Order ↔ OrderItem, etc. | ❌ **BROKEN** |
| **GlucoseView** | 9 | Vendor ↔ Connection, Branch ↔ Chapter, etc. | ❌ **BROKEN** |
| **Neture** | 4 | Supplier ↔ Product, Partnership ↔ Product | ❌ **BROKEN** |
| **KPA** | 1 | Organization (self-referencing) | ❌ **BROKEN** |

**Total**: **27+ entity files** require modification across **6 services**.

---

## Technical Analysis

### How the Error Occurs

**Step-by-step breakdown**:

1. TypeORM loads entities from `connection.ts` (line 89-130)
2. ESM module loader imports `cosmetics-brand.entity.ts` first
3. `CosmeticsBrand` imports `CosmeticsProduct`:
   ```typescript
   import { CosmeticsProduct } from './cosmetics-product.entity.js';
   ```
4. `CosmeticsProduct` imports `CosmeticsBrand` back:
   ```typescript
   import { CosmeticsBrand } from './cosmetics-brand.entity.js';
   ```
5. TypeScript's `emitDecoratorMetadata` generates `__metadata("design:type", CosmeticsProduct)`
6. **Circular dependency**: Module loader tries to access `CosmeticsProduct` class before it's initialized
7. **ReferenceError**: Cannot access 'CosmeticsProduct' before initialization

### Why This Is Platform-Wide

**Investigation revealed** that:
- ✅ Index.ts barrel exports do NOT solve the problem
- ✅ All services use the same TypeORM relationship pattern
- ✅ Problem was masked because only Cosmetics was loading first in alphabetical order
- ✅ After fixing Cosmetics, Yaksa failed (next in load order)
- ✅ **All 6 services will fail sequentially**

### File: connection.ts Entity Registration Order

```typescript
// Line 89-130 in apps/api-server/src/database/connection.ts

// Cosmetics (Fixed - but revealed Yaksa problem)
import {
  CosmeticsBrand,
  CosmeticsLine,
  CosmeticsProduct,
  CosmeticsPricePolicy,
  CosmeticsProductLog,
  CosmeticsPriceLog,
} from '../routes/cosmetics/entities/index.js';

// Yaksa (NOW FAILING)
import {
  YaksaCategory,
  YaksaPost,
  YaksaPostLog,
} from '../routes/yaksa/entities/index.js';

// Glycopharm (WILL FAIL NEXT)
import {
  GlycopharmPharmacy,
  GlycopharmProduct,
  GlycopharmProductLog,
  GlycopharmApplication,
  GlycopharmOrder,
  GlycopharmOrderItem,
} from '../routes/glycopharm/entities/index.js';

// ... and so on for all services
```

---

## Attempted Solutions (All Failed for Platform-Wide Fix)

### ❌ Solution 1: Index.js Barrel Export

**Attempted**: Changed `connection.ts` to import from `index.js` instead of direct files

**Result**: FAILED - Index.js doesn't prevent entities from importing each other directly

**Evidence**:
```typescript
// connection.ts (line 89-96)
import {
  CosmeticsBrand,
  CosmeticsLine,
  CosmeticsProduct,
  // ...
} from '../routes/cosmetics/entities/index.js';  // ← Still fails
```

**Root cause**: Entities internally still do:
```typescript
// cosmetics-brand.entity.ts
import { CosmeticsProduct } from './cosmetics-product.entity.js';  // ← Direct import
```

### ❌ Solution 2: emitDecoratorMetadata: false

**Attempted**: Disabled decorator metadata in tsconfig.json

**Result**: FAILED - TypeORM cannot infer column types

**Error**:
```
ColumnTypeUndefinedError: Column type for DeploymentInstance#domain is not defined
Make sure you have turned on "emitDecoratorMetadata": true
```

**Conclusion**: `emitDecoratorMetadata: true` is **mandatory** for TypeORM.

### ✅ Solution 3: Type-only Import + String Decorator (WORKING)

**Implemented for Cosmetics ONLY** (4 files):

**Pattern**:
```typescript
// Before (BROKEN)
import { CosmeticsProduct } from './cosmetics-product.entity.js';

@OneToMany(() => CosmeticsProduct, (product) => product.brand)
products?: CosmeticsProduct[];

// After (FIXED)
import type { CosmeticsProduct } from './cosmetics-product.entity.js';

@OneToMany('CosmeticsProduct', 'brand')
products?: CosmeticsProduct[];
```

**Result**:
- ✅ Cosmetics entities fixed
- ❌ Yaksa now fails (next in load order)
- ❌ **All other services still broken**

---

## Complete Entity Inventory (Requiring Fix)

### 1. Cosmetics (✅ FIXED - 4 files)

**Files Modified**:
1. `apps/api-server/src/routes/cosmetics/entities/cosmetics-brand.entity.ts`
2. `apps/api-server/src/routes/cosmetics/entities/cosmetics-line.entity.ts`
3. `apps/api-server/src/routes/cosmetics/entities/cosmetics-product.entity.ts`
4. `apps/api-server/src/routes/cosmetics/entities/cosmetics-price-policy.entity.ts`

**Changes Applied**:
- All cross-entity imports changed to `import type`
- All relation decorators changed from arrow function to string:
  - `@OneToMany(() => Class, ...)` → `@OneToMany('Class', 'property')`
  - `@ManyToOne(() => Class, ...)` → `@ManyToOne('Class', 'property')`
  - `@OneToOne(() => Class, ...)` → `@OneToOne('Class', 'property')`

### 2. Yaksa (❌ NEEDS FIX - 3 files)

**Files**:
1. `apps/api-server/src/routes/yaksa/entities/yaksa-category.entity.ts`
2. `apps/api-server/src/routes/yaksa/entities/yaksa-post.entity.ts`
3. `apps/api-server/src/routes/yaksa/entities/yaksa-post-log.entity.ts`

**Circular Dependencies**:
```
YaksaCategory ↔ YaksaPost
YaksaPost ↔ YaksaPostLog
```

**Current Error**:
```
ReferenceError: Cannot access 'YaksaPost' before initialization
at yaksa-post-log.entity.js:59:31
```

### 3. Glycopharm (❌ NEEDS FIX - 6 files)

**Files**:
1. `apps/api-server/src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts`
2. `apps/api-server/src/routes/glycopharm/entities/glycopharm-product.entity.ts`
3. `apps/api-server/src/routes/glycopharm/entities/glycopharm-product-log.entity.ts`
4. `apps/api-server/src/routes/glycopharm/entities/glycopharm-application.entity.ts`
5. `apps/api-server/src/routes/glycopharm/entities/glycopharm-order.entity.ts`
6. `apps/api-server/src/routes/glycopharm/entities/glycopharm-order-item.entity.ts`

**Circular Dependencies**:
```
GlycopharmPharmacy ↔ GlycopharmProduct
GlycopharmProduct ↔ GlycopharmProductLog
GlycopharmOrder ↔ GlycopharmOrderItem
```

### 4. GlucoseView (❌ NEEDS FIX - 9 files)

**Files**:
1. `apps/api-server/src/routes/glucoseview/entities/glucoseview-vendor.entity.ts`
2. `apps/api-server/src/routes/glucoseview/entities/glucoseview-connection.entity.ts`
3. `apps/api-server/src/routes/glucoseview/entities/glucoseview-customer.entity.ts`
4. `apps/api-server/src/routes/glucoseview/entities/glucoseview-branch.entity.ts`
5. `apps/api-server/src/routes/glucoseview/entities/glucoseview-chapter.entity.ts`
6. `apps/api-server/src/routes/glucoseview/entities/glucoseview-pharmacist.entity.ts`
7. `apps/api-server/src/routes/glucoseview/entities/glucoseview-application.entity.ts`
8. `apps/api-server/src/routes/glucoseview/entities/glucoseview-pharmacy.entity.ts`
9. `apps/api-server/src/routes/glucoseview/entities/glucoseview-view-profile.entity.ts`

**Circular Dependencies**:
```
GlucoseViewVendor ↔ GlucoseViewConnection
GlucoseViewBranch ↔ GlucoseViewChapter
GlucoseViewVendor ↔ GlucoseViewViewProfile
```

### 5. Neture (❌ NEEDS FIX - 4 files)

**Files**:
1. `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts`
2. `apps/api-server/src/modules/neture/entities/NetureSupplierProduct.entity.ts`
3. `apps/api-server/src/modules/neture/entities/NeturePartnershipRequest.entity.ts`
4. `apps/api-server/src/modules/neture/entities/NeturePartnershipProduct.entity.ts`

**Circular Dependencies**:
```
NetureSupplier ↔ NetureSupplierProduct
NeturePartnershipRequest ↔ NeturePartnershipProduct
```

### 6. KPA (❌ NEEDS FIX - 1 file)

**Files**:
1. `apps/api-server/src/routes/kpa/entities/kpa-organization.entity.ts`

**Circular Dependencies**:
```
KpaOrganization ↔ KpaOrganization (self-referencing tree)
```

---

## Recommended Solution

### Option A: Automated Fix (RECOMMENDED)

**Create a migration script** to automatically apply type-only import pattern to all affected entities.

**Script approach**:
1. Parse all entity files in `apps/api-server/src/{routes,modules}/*/entities/*.entity.ts`
2. Identify bidirectional relationships (`@OneToMany`, `@ManyToOne`, `@OneToOne`)
3. Convert to type-only imports + string decorators
4. Test each service incrementally

**Estimated Time**: 2-3 hours to write and test script

**Risk**: Low (pattern is mechanical and consistent)

### Option B: Manual Fix Service-by-Service (CURRENT)

**Approach**:
1. Fix Yaksa (3 files) → Test → Commit
2. Fix Glycopharm (6 files) → Test → Commit
3. Fix GlucoseView (9 files) → Test → Commit
4. Fix Neture (4 files) → Test → Commit
5. Fix KPA (1 file) → Test → Commit

**Estimated Time**: 3-4 hours total

**Risk**: Medium (manual error possible, tedious)

### Option C: Remove Bidirectional Relations (NOT RECOMMENDED)

**Convert all to unidirectional** (remove reverse side of relations).

**Impact**:
- Service code must change to manual joins
- Lose TypeORM lazy loading
- Repository logic becomes more complex

**Estimated Time**: 1-2 weeks (code + testing)

**Risk**: High (breaks existing service logic)

---

## Standard Fix Pattern (Template)

### Step 1: Identify Circular Imports

**Example from yaksa-post.entity.ts**:
```typescript
import { YaksaCategory } from './yaksa-category.entity.js';
import { YaksaPostLog } from './yaksa-post-log.entity.js';
```

### Step 2: Convert to Type-Only

```typescript
import type { YaksaCategory } from './yaksa-category.entity.js';
import type { YaksaPostLog } from './yaksa-post-log.entity.js';
```

### Step 3: Update Decorators

**Before**:
```typescript
@ManyToOne(() => YaksaCategory, (category) => category.posts)
@JoinColumn({ name: 'category_id' })
category?: YaksaCategory;

@OneToMany(() => YaksaPostLog, (log) => log.post)
logs?: YaksaPostLog[];
```

**After**:
```typescript
@ManyToOne('YaksaCategory', 'posts')
@JoinColumn({ name: 'category_id' })
category?: YaksaCategory;

@OneToMany('YaksaPostLog', 'post')
logs?: YaksaPostLog[];
```

### Step 4: Test

```bash
cd apps/api-server
pnpm run build
node test-typeorm-init.mjs  # Should succeed for that service
```

---

## Verification Checklist

### Per-Service Validation

- [ ] **Cosmetics**: ✅ Fixed (4/4 files)
- [ ] **Yaksa**: ❌ Pending (0/3 files)
- [ ] **Glycopharm**: ❌ Pending (0/6 files)
- [ ] **GlucoseView**: ❌ Pending (0/9 files)
- [ ] **Neture**: ❌ Pending (0/4 files)
- [ ] **KPA**: ❌ Pending (0/1 file)

### Final Validation

- [ ] TypeScript build succeeds: `pnpm run build`
- [ ] TypeORM initialization succeeds: `node test-typeorm-init.mjs`
- [ ] API server starts: `npx tsx src/main.ts`
- [ ] Health endpoint responds: `curl http://localhost:4000/health`
- [ ] No console errors during startup
- [ ] All entity relations work (test with sample queries)

---

## Current Status

### What Works
- ✅ TypeScript compilation
- ✅ PostgreSQL connection (34.64.96.252:5432)
- ✅ Migration system
- ✅ Cosmetics entities (fixed as proof-of-concept)

### What's Broken
- ❌ API server startup (Entity initialization fails)
- ❌ TypeORM AppDataSource.initialize()
- ❌ All entity lazy loading
- ❌ Any API endpoint call

### Blocking Issue
**Server cannot start** until all 23 remaining entity files are fixed.

---

## Next Steps (Immediate Action Required)

### Priority 1: Fix Yaksa (Unblock Server Startup)

**Files to fix** (3):
1. `yaksa-category.entity.ts`
2. `yaksa-post.entity.ts`
3. `yaksa-post-log.entity.ts`

**Estimated time**: 15 minutes

**Test**: `pnpm run build && node test-typeorm-init.mjs`

### Priority 2: Fix Remaining Services

**Order** (by load sequence in connection.ts):
1. Glycopharm (6 files) - 30 min
2. GlucoseView (9 files) - 45 min
3. Neture (4 files) - 20 min
4. KPA (1 file) - 5 min

**Total remaining time**: ~2 hours

### Priority 3: Update CLAUDE.md

Add mandatory rule:

```markdown
## TypeORM Entity ESM Compatibility Rules (Mandatory)

All TypeORM entities with bidirectional relationships MUST use:

1. **Type-only imports** for related entities:
   ```typescript
   import type { RelatedEntity } from './related.entity.js';
   ```

2. **String-based decorators**:
   ```typescript
   @OneToMany('RelatedEntity', 'propertyName')
   @ManyToOne('RelatedEntity', 'propertyName')
   @OneToOne('RelatedEntity', 'propertyName')
   ```

**Reason**: ESM + emitDecoratorMetadata causes circular dependency ReferenceError.

**Violation**: Server startup failure.
```

---

## Technical Deep Dive (For Reference)

### Why Index.js Doesn't Help

**Common misconception**: Barrel exports solve circular dependencies.

**Reality in ESM**:
```typescript
// index.ts
export * from './entity-a.entity.js';
export * from './entity-b.entity.js';

// entity-a.entity.ts
import { EntityB } from './entity-b.entity.js';  // ← STILL direct import

// entity-b.entity.ts
import { EntityA } from './entity-a.entity.js';  // ← STILL direct import
```

**Result**: Index.js is just a re-export. Internal imports remain circular.

### Why emitDecoratorMetadata Matters

**With `emitDecoratorMetadata: true`**, TypeScript generates:

```javascript
// Before
@ManyToOne(() => CosmeticsBrand, (brand) => brand.products)
brand?: CosmeticsBrand;

// After compilation
__decorate([
    ManyToOne(() => CosmeticsBrand, (brand) => brand.products),
    __metadata("design:type", CosmeticsBrand)  // ← Direct class reference
], CosmeticsProduct.prototype, "brand", void 0);
```

**The `__metadata("design:type", CosmeticsBrand)`** line requires `CosmeticsBrand` class to exist at **evaluation time**, not **declaration time**.

In ESM, this causes:
```
ReferenceError: Cannot access 'CosmeticsBrand' before initialization
```

**With `import type`**, TypeScript strips the import at runtime:
```typescript
import type { CosmeticsBrand } from './cosmetics-brand.entity.js';
// ↓ Compiles to nothing at runtime
```

**With string decorator**, no class reference in metadata:
```typescript
@ManyToOne('CosmeticsBrand', 'products')  // ← String, not class
// No __metadata("design:type", ...) generated
```

---

## Files Changed (Current)

### Modified Files (Cosmetics - Fixed)
1. `apps/api-server/src/database/connection.ts` (line 88-96)
2. `apps/api-server/src/routes/cosmetics/entities/cosmetics-brand.entity.ts`
3. `apps/api-server/src/routes/cosmetics/entities/cosmetics-line.entity.ts`
4. `apps/api-server/src/routes/cosmetics/entities/cosmetics-product.entity.ts`
5. `apps/api-server/src/routes/cosmetics/entities/cosmetics-price-policy.entity.ts`

### Test Files Created
1. `apps/api-server/test-typeorm-init.mjs` (ESM TypeORM initialization test)

---

## Appendix: Example Fixes

### Example 1: Yaksa Category ↔ Post

**File**: `yaksa-category.entity.ts`

**Before**:
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { YaksaPost } from './yaksa-post.entity.js';

@Entity()
export class YaksaCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @OneToMany(() => YaksaPost, (post) => post.category)
  posts?: YaksaPost[];
}
```

**After**:
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import type { YaksaPost } from './yaksa-post.entity.js';

@Entity()
export class YaksaCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @OneToMany('YaksaPost', 'category')
  posts?: YaksaPost[];
}
```

### Example 2: Self-Referencing (KPA Organization)

**File**: `kpa-organization.entity.ts`

**Before**:
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { KpaOrganization } from './kpa-organization.entity.js';

@Entity()
export class KpaOrganization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @ManyToOne(() => KpaOrganization, (org) => org.children)
  @JoinColumn({ name: 'parent_id' })
  parent?: KpaOrganization;

  @OneToMany(() => KpaOrganization, (org) => org.parent)
  children?: KpaOrganization[];
}
```

**After**:
```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { KpaOrganization as KpaOrganizationType } from './kpa-organization.entity.js';

@Entity()
export class KpaOrganization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @ManyToOne('KpaOrganization', 'children')
  @JoinColumn({ name: 'parent_id' })
  parent?: KpaOrganizationType;

  @OneToMany('KpaOrganization', 'parent')
  children?: KpaOrganizationType[];
}
```

---

## Conclusion

**This is a platform-wide architectural issue** that requires systematic fix across all services.

**Recommended Action**:
1. ✅ Fix Yaksa immediately (3 files, 15 min) to unblock server startup
2. ✅ Fix remaining services sequentially (23 files, ~2 hours)
3. ✅ Update CLAUDE.md with mandatory pattern
4. ✅ Add linting rule to prevent future violations

**Risk if not fixed**: **API server cannot start, platform is down.**

---

**Report Version**: 1.0
**Last Updated**: 2026-01-11 16:30 KST
**Investigation Agent ID**: af14fff (for continuation)
