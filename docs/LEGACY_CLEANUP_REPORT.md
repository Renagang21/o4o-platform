# Legacy Cleanup Report - Phase 6

**Date**: 2025-11-06
**Phase**: Phase 6 - Legacy Code & Disconnected Cleanup
**Scope**: Complete removal of legacy CSS variables and deprecated code

---

## Executive Summary

### Findings

- **Legacy Variables Found**: 5 files with legacy CSS variable references
- **Deprecated Files**: 3 CSS generator files still in use (should have been removed in Phase 2)
- **Import Connections**: 5 files importing deprecated css-generator files
- **Test File**: 1 test file expecting legacy variables (needs update)

### Phase 2 Scope Clarification

**Reality**: The local `css-generator.ts` files were NEVER meant to be fully deleted.

**Reason**: The `@o4o/appearance-system` package (created in Phase 2) only handles **core component CSS** (Button, Breadcrumb, ScrollToTop). The local css-generator files provide **comprehensive CSS generation** for:
- Header CSS (navigation, logo, etc.)
- Footer CSS (widgets, bottom bar, etc.)
- Typography CSS (body font, headings, responsive)
- Blog CSS (archive layout, cards, meta)
- Container CSS (boxed, full-width, fluid)
- Sidebar CSS (layout, width, gap)

**Impact**: These files are still needed, but they generate BOTH legacy and standard variables. Phase 6 cleanup should:
- ✅ Remove legacy variable generation (`--button-primary-*` → `--o4o-button-*`)
- ✅ Keep the files (still needed for full customizer functionality)
- ✅ Mark for future refactoring (Phase 7: Full migration to appearance-system)

---

## Detailed Findings

### 1. Legacy CSS Variables in Active Code

#### ✅ **Keep (Intentional Backward Compatibility)**

**File**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/sections/advanced/CustomCSSSection.tsx`

- **Reason**: Autocomplete feature for Custom CSS editor
- **Legacy Variables**: Listed for user convenience (deprecated markers added)
- **Action**: No action required (already updated in Phase 4)
- **Lines**: 84-121 (CSS_VARIABLES array)

```typescript
// Example (Phase 4 - updated)
const CSS_VARIABLES = [
  // Standard variables (listed first)
  '--o4o-button-bg', '--o4o-button-text', ...
  // Legacy variables (deprecated, for backward compatibility)
  '--button-primary-bg', '--button-primary-text', ...
];
```

---

#### ❌ **Delete (Deprecated - Never Migrated from Phase 2)**

### 2. Deprecated CSS Generator Files

#### **File 1**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/css-generator.ts`

- **Size**: ~700 lines
- **Imported by**:
  - `SimpleCustomizer.tsx` (line 4)
  - `CustomizerContext.tsx` (line 13)
  - `usePreviewInjection.ts` (line 3)
- **Legacy Variables Generated**:
  - `--button-primary-bg`, `--button-primary-text`, `--button-primary-border-radius`
  - `--button-primary-padding-v`, `--button-primary-padding-h`, `--button-primary-bg-hover`
  - `--button-secondary-bg`, `--button-secondary-text`
  - `--button-outline-border`, `--button-outline-text`
  - `--breadcrumb-text-color`, `--breadcrumb-link-color`, `--breadcrumb-separator-color`
  - `--scroll-top-bg`, `--scroll-top-icon-color`, `--scroll-top-size`, `--scroll-top-border-radius`

**Functions**:
```typescript
generateCSS(settings: AstraCustomizerSettings): string
generateButtonCSS(settings: AstraCustomizerSettings): string[]
generateBreadcrumbCSS(settings: AstraCustomizerSettings): string[]
generateScrollToTopCSS(settings: AstraCustomizerSettings): string[]
```

**Replacement**: Use `generateAllCSS()` from `@o4o/appearance-system`

**Action Required**:
1. Update 3 import statements to use `@o4o/appearance-system`
2. Delete this file

---

#### **File 2**: `apps/main-site/src/utils/css-generator.ts`

- **Size**: ~760 lines
- **Imported by**:
  - `GlobalStyleInjector.tsx` (line 11) — ⚠️ **Conflict**: Also imports from `@o4o/appearance-system` (line 20)
- **Legacy Variables Generated**: Same as File 1 (Button, Breadcrumb, ScrollToTop)

**Current Import Situation**:
```typescript
// apps/main-site/src/components/GlobalStyleInjector.tsx
import { generateCSS } from '../utils/css-generator';  // ❌ Legacy (line 11)
import {
  GlobalStyleInjector as AppearanceSystemInjector,
  generateAllCSS,
  defaultTokens,
} from '@o4o/appearance-system';  // ✅ Standard (line 20)
```

**Issue**: Component imports from BOTH sources, causing confusion and potential CSS conflicts.

**Action Required**:
1. Remove import from `../utils/css-generator` in GlobalStyleInjector.tsx
2. Use only `generateAllCSS()` from `@o4o/appearance-system`
3. Delete this file

---

#### **File 3**: `apps/api-server/src/utils/customizer/css-generator.ts`

- **Size**: ~456 lines
- **Imported by**:
  - `settings.routes.ts` (line 10) - Used for `/api/v1/settings/global-css` endpoint
- **Variables Generated**: Mostly `--wp-*` and `--ast-*` (WordPress compatibility)
- **Legacy Variables**: None directly, but has similar button/breadcrumb/scroll-top generation logic

**Unique Characteristics**:
- API-specific use case (server-side CSS generation)
- Returns CSS string for HTTP response
- Uses different settings structure (looser types)

**Decision**:
- **Option A**: Keep but refactor to use `@o4o/appearance-system` generators
- **Option B**: Delete and make `/api/v1/settings/global-css` call `generateAllCSS()` directly

**Recommended Action**: Option A (refactor to use appearance-system)

**Reason**: API server needs custom handling for HTTP responses, but should use centralized CSS generation logic.

**Refactor Example**:
```typescript
// Before
import { generateGlobalCSS } from '../../utils/customizer/css-generator.js';

// After
import { generateAllCSS } from '@o4o/appearance-system';

// In route handler
const css = generateAllCSS(tokensFromSettings);
```

---

### 3. Test File with Legacy Expectations

#### **File**: `packages/appearance-system/__tests__/generators.test.ts`

**Issue**: Test expectations still check for BOTH legacy and standard variables

**Examples**:
```typescript
// Line 22-23 (Button test)
expect(css).toContain('--button-primary-bg');  // ❌ Legacy (removed in Phase 4)
expect(css).toContain('--o4o-button-bg');      // ✅ Standard

// Line 56-57 (Breadcrumb test)
expect(css).toContain('--breadcrumb-text-color');  // ❌ Legacy (removed in Phase 4)
expect(css).toContain('--o4o-breadcrumb-text');    // ✅ Standard

// Line 89-90 (ScrollToTop test)
expect(css).toContain('--scroll-top-bg');      // ❌ Legacy (removed in Phase 4)
expect(css).toContain('--o4o-scroll-top-bg');  // ✅ Standard

// Line 140-142 (Integration test)
expect(css).toContain('--button-primary-bg');      // ❌ Legacy
expect(css).toContain('--breadcrumb-text-color');  // ❌ Legacy
expect(css).toContain('--scroll-top-bg');          // ❌ Legacy
```

**Action Required**: Remove all legacy variable expectations, keep only `--o4o-*`

**Test Updates**:
```diff
- expect(css).toContain('--button-primary-bg');
+ // Legacy variables removed in Phase 4
- expect(css).toContain('--breadcrumb-text-color');
+ // Legacy variables removed in Phase 4
- expect(css).toContain('--scroll-top-bg');
+ // Legacy variables removed in Phase 4
```

---

### 4. Documentation Files (Keep)

#### **File**: `apps/admin-dashboard/src/docs/phase-1-implementation-complete.md`

- **Contains**: Historical references to legacy variables
- **Action**: Keep (historical documentation)
- **Reason**: Preserves project history and decision-making context

---

## Migration Plan (Revised Scope)

### Step 1: Remove Legacy Variable Generation (Admin Dashboard)

**File**: `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/css-generator.ts`

**Functions to update**:
- `generateButtonCSS()` - Remove `--button-primary-*`, `--button-secondary-*`, `--button-outline-*`
- `generateBreadcrumbCSS()` - Remove `--breadcrumb-text-color`, `--breadcrumb-link-color`, `--breadcrumb-separator-color`
- `generateScrollToTopCSS()` - Remove `--scroll-top-bg`, `--scroll-top-icon-color`, `--scroll-top-size`

**Note**: Keep ALL other functions (header, footer, typography, blog, etc.) - they're still needed

---

### Step 2: Remove Legacy Variable Generation (Main Site)

**File**: `apps/main-site/src/utils/css-generator.ts`

**Same changes as Step 1** (same functions to update)

---

### Step 3: Remove Legacy Variable Generation (API Server)

**File**: `apps/api-server/src/utils/customizer/css-generator.ts`

**Note**: This file has different structure (looser types, no Button/Breadcrumb/ScrollToTop functions). May not need changes if it doesn't generate legacy variables.

**Action**: Verify it doesn't generate legacy variables. If it does, update similar to Steps 1-2.

---

### Step 4: Update Tests

**File**: `packages/appearance-system/__tests__/generators.test.ts`

**Changes**: Remove 6 legacy variable expectations

---

### Step 5: Mark Deprecated Files for Future Refactoring

**Files to mark with @deprecated comments**:
1. `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/css-generator.ts`
2. `apps/main-site/src/utils/css-generator.ts`
3. `apps/api-server/src/utils/customizer/css-generator.ts`

**Comment template**:
```typescript
/**
 * @deprecated Phase 7: This file should be migrated to @o4o/appearance-system
 *
 * Current status: Phase 6 cleanup complete (legacy variables removed)
 * Next step: Expand appearance-system to handle header, footer, typography, blog CSS
 *
 * Until then, this file is still needed for full customizer functionality.
 */
```

**Total lines removed**: ~50 lines (legacy variable generation only)
**Total lines kept**: ~1,866 lines (still needed for comprehensive CSS generation)

---

## Risk Assessment

### Low Risk

- Import updates (straightforward replacements)
- Test updates (remove expectations)
- File deletions (after import updates)

### Medium Risk

- Settings → Tokens conversion (may need mapping function)
- API server integration (may need dependency addition)

### Mitigation

- Test each app independently after changes
- Run full build and test suite
- Deploy incrementally (admin → main-site → api-server)

---

## Verification Checklist

### Build Verification

- [ ] `pnpm -w build` - All apps build successfully
- [ ] `pnpm -w type-check` - No TypeScript errors
- [ ] `pnpm -w test` - All tests pass (including updated appearance-system tests)

### Runtime Verification

- [ ] Admin Dashboard: Customizer preview works (CSS injection)
- [ ] Main Site: GlobalStyleInjector works (CSS variables applied)
- [ ] API Server: `/api/v1/settings/global-css` endpoint returns valid CSS

### Legacy Variable Search

- [ ] `grep -rn "--button-primary-" apps/ packages/` → 0 results (except docs)
- [ ] `grep -rn "--breadcrumb-.*-color" apps/ packages/` → 0 results (except docs)
- [ ] `grep -rn "--scroll-top-bg" apps/ packages/` → 0 results (except docs)

### Import Search

- [ ] `grep -rn "from.*utils/css-generator" apps/` → 0 results

---

## Expected Outcomes

### Code Metrics (Revised)

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| CSS Generator Files | 4 | 4 | 0 files (kept) |
| Total Lines of Code | ~2,600 | ~2,550 | -50 lines (-2%) |
| Legacy Variable Generation | 3 files | 0 files | -100% |
| Legacy Variables (active code) | 60+ instances | 0 instances | -100% |
| Test Legacy Expectations | 6 | 0 | -100% |
| @deprecated Markers | 0 | 3 files | +3 markers |

### Bundle Size Impact (Revised)

- **Admin Dashboard**: -0.2 KB (legacy variable generation removed)
- **Main Site**: -0.2 KB (legacy variable generation removed)
- **API Server**: -0.1 KB (minimal/no changes)
- **Total**: -0.5 KB (minimal impact, as expected)

---

## Success Criteria

### Phase 6 Complete When (Revised):

1. ✅ All legacy variable generation removed from css-generator files
2. ✅ All css-generator files marked with @deprecated comments
3. ✅ All tests pass with updated expectations (no legacy variables expected)
4. ✅ Legacy variable search returns 0 results in active code (docs allowed)
5. ✅ Build and type-check successful (all apps)
6. ✅ Runtime verification passes (admin dashboard, main-site, api-server)

---

## Git Tag Recommendation

After Phase 6 completion, create archive tag for historical reference:

```bash
git tag -a archive/appearance-legacy-phase6 -m "Phase 6: Legacy cleanup complete - deprecated css-generator files removed"
git push origin archive/appearance-legacy-phase6
```

---

**Next Steps**: Execute migration plan (Step 1-5)

**Estimated Time**: 2-3 hours (including testing)

**Last Updated**: 2025-11-06 (Phase 6 Scan Complete)
