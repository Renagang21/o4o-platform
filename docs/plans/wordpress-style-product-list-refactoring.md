# WordPress-Style Product List Refactoring Plan

## Executive Summary

**Problem:** Product lists in glycopharm have high code duplication (2,442 lines across 5 pages) with inconsistent UI patterns. One page (PharmacyB2BProducts, 943 lines) uses mock data instead of real APIs.

**Solution:**
1. **Code Cleanup First** - Extract shared components/hooks to eliminate duplication
2. **WordPress-Style Tables** - Apply consistent WordPress admin table UI across all product lists
3. **API Integration** - Remove all mock data, ensure real API connections

**Expected Impact:** Reduce code by 36% (2,442 → 1,570 lines) while improving consistency and maintainability.

---

## Current State Analysis

### 5 Product List Pages Found

| Page | Lines | Layout | Issue |
|------|-------|--------|-------|
| ProductsPage.tsx (operator) | 486 | Table | Custom implementation |
| PharmacyB2BProducts.tsx (B2B) | 943 | WordPress-style | **MOCK DATA, too complex** |
| PharmacyProducts.tsx (pharmacy) | 316 | Card Grid | Not WordPress-style |
| StoreProducts.tsx (store) | 282 | Card Grid | Not WordPress-style |
| FeaturedProductsTab.tsx (featured) | 415 | Special List | Mock data |

### Code Duplication Identified

- Empty states: 4x implementations
- Loading spinners: 5x implementations
- Search + debounce: 2x implementations
- Status badges: 2x implementations
- Pagination logic: 2x different implementations
- Filter UI patterns: Multiple variations

### Existing Reusable Components (admin-dashboard)

✅ **WordPressTable** - Complete WordPress-style table with sorting, selection, row actions
✅ **RowActions** - Hover-based action links (Edit, Delete, etc.)
✅ **AGTablePagination** - Pagination component

**Strategy:** Copy these to glycopharm service (avoid cross-service dependencies per CLAUDE.md)

---

## Implementation Plan

### Phase 1: Shared Infrastructure (4-5 hours)

**Goal:** Create reusable foundation to eliminate code duplication.

#### 1.1 Copy Components from admin-dashboard

**Files to copy:**

1. `apps/admin-dashboard/src/components/common/WordPressTable.tsx`
   → `services/web-glycopharm/src/components/common/WordPressTable.tsx`

2. `apps/admin-dashboard/src/components/common/RowActions.tsx`
   → `services/web-glycopharm/src/components/common/RowActions.tsx`

3. `apps/admin-dashboard/src/components/ui/checkbox.tsx`
   → `services/web-glycopharm/src/components/ui/checkbox.tsx`

4. `apps/admin-dashboard/src/utils/cn.ts`
   → `services/web-glycopharm/src/utils/cn.ts`

**Adaptations needed:**
- Update all `@/` imports to relative paths
- Replace MUI dependencies with lucide-react icons
- Add Korean language labels where needed
- Test component renders correctly in glycopharm

#### 1.2 Create Shared Components

**New files:**

1. **`services/web-glycopharm/src/components/common/StatusBadge.tsx`**
   - Reusable badge for product status (active, draft, out_of_stock)
   - Props: `status`, `size`, `customLabels`

2. **`services/web-glycopharm/src/components/common/ProductImage.tsx`**
   - Standardized product image with fallback icon
   - Props: `src`, `alt`, `size`, `fallbackIcon`

3. **`services/web-glycopharm/src/utils/formatters.ts`**
   - Price formatting: `formatPrice(price: number) => "10,000원"`
   - Date formatting: `formatDate(date: string) => "2024.01.30"`

#### 1.3 Create Shared Hooks

**New files:**

1. **`services/web-glycopharm/src/hooks/useDebounce.ts`**
   ```typescript
   function useDebounce<T>(value: T, delay: number = 300): T
   ```

2. **`services/web-glycopharm/src/hooks/usePagination.ts`**
   ```typescript
   function usePagination(totalItems: number, itemsPerPage: number)
   // Returns: currentPage, totalPages, goToPage, nextPage, prevPage
   ```

3. **`services/web-glycopharm/src/hooks/useSelection.ts`**
   ```typescript
   function useSelection<T>(items: T[])
   // Returns: selectedIds, selectAll, selectOne, clearSelection
   ```

4. **`services/web-glycopharm/src/hooks/useProductList.ts`**
   ```typescript
   function useProductList(apiFunction, options)
   // Generic hook for product pagination, filtering, sorting
   // Returns: products, loading, error, pagination, filters, refetch
   ```

#### 1.4 Add Dependencies

```json
{
  "dependencies": {
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

---

### Phase 2: Refactor Pages (One by One)

**Strategy:** Refactor incrementally, test after each page.

#### 2.1 ProductsPage.tsx (Operator) - FIRST

**Why first:** Already uses table layout, easiest migration.

**Current state:** 486 lines, custom table implementation
**Target state:** ~200 lines, using WordPressTable

**Steps:**
1. Import WordPressTable and shared hooks
2. Define columns configuration:
   ```typescript
   const columns = [
     { id: 'name', label: '상품명', sortable: true },
     { id: 'category', label: '카테고리' },
     { id: 'cost', label: '원가' },
     { id: 'price', label: '판매가', sortable: true },
     { id: 'stock', label: '재고', sortable: true },
     { id: 'status', label: '상태' },
     { id: 'sales', label: '판매량', sortable: true },
   ]
   ```
3. Define row actions: Edit, Delete, View, Duplicate
4. Replace custom `<table>` with `<WordPressTable>`
5. Use `useDebounce` for search
6. Use `usePagination` for page controls
7. Use StatusBadge component
8. Test thoroughly with real API

**File:** `services/web-glycopharm/src/pages/operator/ProductsPage.tsx`

#### 2.2 PharmacyB2BProducts.tsx (B2B) - SECOND

**Why second:** Already WordPress-style, needs cleanup and API integration.

**Current state:** 943 lines, WordPress-style BUT uses MOCK_PRODUCTS
**Target state:** ~300 lines, using WordPressTable with real API

**Critical steps:**
1. **DELETE all mock data** (lines 52-200+ MOCK_PRODUCTS array)
2. Connect to real API: `pharmacyApi.getB2BProducts()`
3. Replace custom WordPress table implementation with shared WordPressTable
4. Extract "screen options" panel to shared component
5. Use shared hooks (useDebounce, usePagination, useSelection)
6. Consolidate filter logic
7. Test with real B2B products API

**File:** `services/web-glycopharm/src/pages/pharmacy/PharmacyB2BProducts.tsx`

#### 2.3 PharmacyProducts.tsx (Pharmacy) - THIRD

**Why third:** Card grid, add table view option.

**Current state:** 316 lines, card grid only
**Target state:** ~220 lines, table + card grid with view toggle

**Steps:**
1. Add view state: `'table' | 'grid'` (default: 'table' on desktop, 'grid' on mobile)
2. Add view toggle button in header
3. Implement table view using WordPressTable:
   - Columns: Image, Name, Category, Price, Stock, Status, Actions
4. Keep existing card grid view for option
5. Use shared components and hooks
6. Test both views

**File:** `services/web-glycopharm/src/pages/pharmacy/PharmacyProducts.tsx`

#### 2.4 StoreProducts.tsx (Store) - FOURTH

**Why fourth:** Similar to PharmacyProducts.

**Current state:** 282 lines, card grid only
**Target state:** ~200 lines, table + card grid with view toggle

**Steps:**
1. Same as PharmacyProducts
2. Add view toggle
3. Implement table view using WordPressTable
4. Keep card grid for customer preference
5. Default to grid on mobile, table on desktop
6. Test both views

**File:** `services/web-glycopharm/src/pages/store/StoreProducts.tsx`

#### 2.5 FeaturedProductsTab.tsx (Operator) - LAST

**Why last:** Special requirements (featured toggle, ordering).

**Current state:** 415 lines, special list with MOCK data
**Target state:** ~250 lines, using WordPressTable with real API

**Critical steps:**
1. **DELETE MOCK_ALL_PRODUCTS**
2. Connect to real API: `operatorApi.getFeaturedProducts()`
3. Use WordPressTable for both product lists
4. Keep ordering controls (up/down buttons)
5. Add featured toggle action
6. Use shared components
7. Test featured logic

**File:** `services/web-glycopharm/src/pages/operator/store-template/tabs/FeaturedProductsTab.tsx`

---

### Phase 3: Mobile Responsiveness

**Strategy:** Different approaches based on user type.

#### Operator/Admin Pages (Table-Only)
- ProductsPage
- PharmacyB2BProducts
- FeaturedProductsTab

**Approach:** Horizontal scroll with responsive columns
- Use `overflow-x-auto` container
- Hide less important columns on mobile (`md:table-cell`)
- Sticky first column (product name)
- Touch-friendly row actions (larger tap targets)

#### User-Facing Pages (View Toggle)
- PharmacyProducts
- StoreProducts

**Approach:** View toggle (table/grid)
- Default: Grid on mobile, Table on desktop
- View toggle button in header
- Preserve user preference in localStorage

---

## Critical Files to Modify

### New Files (Create)

1. `services/web-glycopharm/src/components/common/WordPressTable.tsx` (copy)
2. `services/web-glycopharm/src/components/common/RowActions.tsx` (copy)
3. `services/web-glycopharm/src/components/common/StatusBadge.tsx`
4. `services/web-glycopharm/src/components/common/ProductImage.tsx`
5. `services/web-glycopharm/src/components/ui/checkbox.tsx` (copy)
6. `services/web-glycopharm/src/hooks/useDebounce.ts`
7. `services/web-glycopharm/src/hooks/usePagination.ts`
8. `services/web-glycopharm/src/hooks/useSelection.ts`
9. `services/web-glycopharm/src/hooks/useProductList.ts`
10. `services/web-glycopharm/src/utils/cn.ts` (copy)
11. `services/web-glycopharm/src/utils/formatters.ts`

### Existing Files (Refactor)

1. `services/web-glycopharm/src/pages/operator/ProductsPage.tsx` (486 → 200 lines)
2. `services/web-glycopharm/src/pages/pharmacy/PharmacyB2BProducts.tsx` (943 → 300 lines)
3. `services/web-glycopharm/src/pages/pharmacy/PharmacyProducts.tsx` (316 → 220 lines)
4. `services/web-glycopharm/src/pages/store/StoreProducts.tsx` (282 → 200 lines)
5. `services/web-glycopharm/src/pages/operator/store-template/tabs/FeaturedProductsTab.tsx` (415 → 250 lines)

### Dependencies (Add)

`services/web-glycopharm/package.json`:
- `clsx: ^2.1.0`
- `tailwind-merge: ^2.2.0`

---

## Testing & Verification

### After Each Page Refactor

**Manual Testing Checklist:**
- [ ] Page loads without errors
- [ ] Products display correctly in table
- [ ] Search works and debounces (300ms)
- [ ] Filters work (category, status, etc.)
- [ ] Sorting works (click column headers)
- [ ] Pagination works
- [ ] Row actions work (Edit, Delete, View)
- [ ] Selection works (checkboxes, where applicable)
- [ ] Empty state displays when no results
- [ ] Loading state displays during API calls
- [ ] Error state displays on API failure
- [ ] Mobile view works (responsive or view toggle)

**API Verification:**
- [ ] NO mock data used
- [ ] Real API calls made (check Network tab)
- [ ] Response data matches UI
- [ ] Error handling works

**Performance:**
- [ ] Page load < 2s
- [ ] Search debounce prevents excessive API calls
- [ ] No console errors
- [ ] No memory leaks

### Final Verification

**Code Quality:**
- [ ] No code duplication across pages
- [ ] All pages use shared components
- [ ] All pages use shared hooks
- [ ] TypeScript types correct
- [ ] No linting errors

**Consistency:**
- [ ] WordPress-style tables on all pages
- [ ] Consistent look and feel
- [ ] Same filter/sort/search patterns
- [ ] Same pagination controls

---

## Expected Outcomes

### Code Reduction

| Page | Before | After | Reduction |
|------|--------|-------|-----------|
| ProductsPage | 486 | 200 | -59% |
| PharmacyB2BProducts | 943 | 300 | -68% |
| PharmacyProducts | 316 | 220 | -30% |
| StoreProducts | 282 | 200 | -29% |
| FeaturedProductsTab | 415 | 250 | -40% |
| **Shared Components** | 0 | +400 | N/A |
| **Total** | 2,442 | 1,570 | **-36%** |

### Reusability Gains

**14 shared components/hooks created:**
- 8 Components: WordPressTable, RowActions, Checkbox, StatusBadge, ProductImage, EmptyState, LoadingState, ErrorState
- 4 Hooks: useDebounce, usePagination, useSelection, useProductList
- 2 Utils: cn, formatters

**Before:** 5 different implementations of everything
**After:** 1 shared implementation for each pattern

---

## Implementation Schedule

**Estimated Total Time:** 15-20 hours

**Recommended Schedule:**

**Day 1: Foundation (4-5 hours)**
- Copy WordPressTable and dependencies from admin-dashboard
- Create shared components (StatusBadge, ProductImage)
- Create shared hooks (useDebounce, usePagination, useSelection, useProductList)
- Create utils (cn, formatters)
- Add dependencies to package.json
- Test WordPressTable renders in glycopharm

**Day 2: First Wave (5-7 hours)**
- Refactor ProductsPage (2-3 hours)
- Test ProductsPage thoroughly
- Refactor PharmacyB2BProducts (3-4 hours)
  - **Critical:** Remove all mock data
  - Connect real API
- Test PharmacyB2BProducts thoroughly

**Day 3: Second Wave (4-6 hours)**
- Refactor PharmacyProducts (2-3 hours)
  - Add view toggle
  - Implement table view
- Test PharmacyProducts thoroughly
- Refactor StoreProducts (2-3 hours)
  - Add view toggle
  - Implement table view
- Test StoreProducts thoroughly

**Day 4: Final Wave + Polish (3-4 hours)**
- Refactor FeaturedProductsTab (3-4 hours)
  - **Critical:** Remove mock data
  - Connect real API
- Test FeaturedProductsTab thoroughly
- Final cross-page testing
- Verify no regressions

---

## Risk Mitigation

**Risk:** Breaking existing functionality
**Mitigation:** Refactor one page at a time, test thoroughly, keep git backup, rollback if needed

**Risk:** API endpoints missing
**Mitigation:** Verify APIs exist before refactoring, create if needed, use error states

**Risk:** Design inconsistency
**Mitigation:** Use exact same WordPressTable component, same Tailwind classes, review after each page

**Risk:** Performance issues
**Mitigation:** Test with 100+ products, use pagination (10-20 items/page), debounce search (300ms)

---

## Success Criteria

- ✅ All 5 pages use WordPress-style tables
- ✅ Code reduced by 35%+ (872 lines removed)
- ✅ No code duplication
- ✅ All pages use shared components/hooks
- ✅ All pages use real APIs (no mock data)
- ✅ Consistent UI/UX across all pages
- ✅ Mobile responsive (table or view toggle)
- ✅ All tests pass
- ✅ No console errors
- ✅ Fast loading (<2s per page)
