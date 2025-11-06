# Appearance Component Migration Map

**Phase 3.5**: Button & Breadcrumb CSS Variable Migration
**Date**: 2025-11-06
**Status**: Core components migrated

---

## Overview

This document maps hardcoded styles in Button and Breadcrumb components and tracks migration to CSS variables from `@o4o/appearance-system`.

### Migration Status

| Component | Total Instances | Migrated | Remaining | Status |
|-----------|----------------|----------|-----------|---------|
| Button (core) | 1 | 1 | 0 | ✅ Complete |
| Button (usage) | ~72 | 0 | ~72 | ⏸️ Deferred |
| Breadcrumb (core) | 2 | 2 | 0 | ✅ Complete |
| Breadcrumb (usage) | ~10 | 0 | ~10 | ⏸️ Deferred |

**Note**: Usage instances defer to core components, so migration propagates automatically.

---

## Core Component Migrations

### 1. Button Component

**File**: `/apps/main-site/src/components/common/Button.tsx`

**Lines 39-46**: Variant styles

**Before** (hardcoded Tailwind):
```tsx
const variantStyles = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};
```

**After** (CSS variables):
```tsx
const variantStyles = {
  primary: 'btn-primary focus:ring-blue-500',
  secondary: 'btn-secondary focus:ring-gray-500',
  success: 'btn-success focus:ring-green-500',
  danger: 'btn-danger focus:ring-red-500',
};
```

**CSS Variables Used**:
- `--o4o-button-bg` → primary background
- `--o4o-button-text` → primary text
- `--o4o-button-bg-hover` → hover state
- `--o4o-button-secondary-bg` → secondary variant
- `--o4o-button-success-bg` → success variant
- `--o4o-button-danger-bg` → danger variant

**Fallback Chain**:
```css
var(--o4o-button-bg, var(--button-primary-bg, #007bff))
```

---

### 2. Breadcrumbs Component

**File**: `/apps/main-site/src/components/common/Breadcrumbs.tsx`

**Lines 108-138**: Link and current page rendering

**Before** (inline styles):
```tsx
<Link className="breadcrumb-link" style={{ color: settings.linkColor }}>
<span className="breadcrumb-current" style={{ color: settings.currentPageColor }}>
<span className="breadcrumb-separator" style={{ color: settings.separatorColor }}>
```

**After** (CSS classes):
```tsx
<Link className="breadcrumb-link">
<span className="breadcrumb-current">
<span className="breadcrumb-separator">
```

**Lines 179-278**: Inline `<style>` block

**Before** (hardcoded colors):
```css
.breadcrumb-link:hover {
  color: ${settings.hoverColor} !important;
}
.breadcrumb-link:focus-visible {
  outline: 2px solid ${settings.linkColor};
}
```

**After** (CSS variables with fallback):
```css
.breadcrumb-link:hover {
  color: var(--o4o-breadcrumb-link-hover, ${settings.hoverColor}) !important;
}
.breadcrumb-link:focus-visible {
  outline: 2px solid var(--o4o-breadcrumb-link, ${settings.linkColor});
}
```

**CSS Variables Used**:
- `--o4o-breadcrumb-link` → link color
- `--o4o-breadcrumb-link-hover` → link hover color
- `--o4o-breadcrumb-text` → current page text color
- `--o4o-breadcrumb-separator` → separator color

**Note**: Inline `<style>` block marked as `@deprecated Phase 3.5` but retained for backward compatibility with customizer settings.

---

## Utility CSS Classes

**File**: `/apps/main-site/src/styles/appearance-utilities.css`

**Imported in**: `/apps/main-site/src/index.css` (line 5)

### Button Utilities

```css
.btn-primary       /* Primary button (blue) */
.btn-secondary     /* Secondary button (gray) */
.btn-success       /* Success button (green) */
.btn-danger        /* Danger button (red) */
.btn-ghost         /* Ghost button (transparent) */
```

### Breadcrumb Utilities

```css
.breadcrumb-link       /* Breadcrumb link */
.breadcrumb-current    /* Current page text */
.breadcrumb-separator  /* Separator between items */
```

### Scroll-to-Top Utilities

```css
.scroll-to-top         /* Scroll-to-top button */
```

---

## Remaining Hardcoded Instances

### Button Usage (Deferred)

**Total**: ~72 instances across 36 files

These instances use the `<Button>` component, which now uses CSS variables. Migration propagates automatically through the core component.

**Sample files**:
- `/components/features/ProductCard.tsx` (2 instances)
- `/components/account/SessionManager.tsx` (3 instances)
- `/pages/auth/ForgotPassword.tsx` (3 instances)
- `/components/shortcodes/SupplierDashboard.tsx` (6 instances)

**Action**: No immediate action required - core component migration applies.

### Breadcrumb Usage (Deferred)

**Total**: ~10 instances across 5 files

These instances use the `<Breadcrumbs>` component, which now prefers CSS variables.

**Files**:
- `/components/layout/Layout.tsx`
- `/pages/BlogArchive.tsx`
- `/components/common/Breadcrumb.tsx`

**Action**: No immediate action required - core component migration applies.

---

## Hardcoded Styles in Other Components

### Direct `bg-*` Tailwind Classes

**Total**: 72 instances across 36 files (includes buttons and other elements)

**Pattern**: `className="...bg-(blue|red|green|purple|indigo)-\d+..."`

**Examples**:
```tsx
// ProductCard.tsx
className="bg-blue-600"

// ErrorBoundary.tsx
className="bg-red-500"

// SupplierDashboard.tsx
className="bg-green-600"
```

**Migration Strategy** (Future):
1. Identify semantic meaning (primary/secondary/success/danger/info/warning)
2. Replace with utility classes (`.btn-primary`, `.badge-success`, etc.)
3. Or use CSS variables directly: `style={{ backgroundColor: 'var(--o4o-primary-bg)' }}`

**Status**: ⏸️ Deferred to future phases (not blocking Phase 3.5)

---

## Search Patterns Used

### Button Hardcoding
```bash
# Tailwind bg-* classes
grep -r "className=\"[^\"]*bg-(blue|indigo|purple|green|red)-\d+" apps/main-site/src

# Inline background styles
grep -r "style=\{\{[^}]*background" apps/main-site/src
```

### Breadcrumb Hardcoding
```bash
# Breadcrumb files
grep -ri "breadcrumb" apps/main-site/src --include="*.tsx"

# Inline color styles
grep -r "style=\{\{[^}]*color.*#" apps/main-site/src
```

---

## Phase 3.5 DoD Checklist

- [x] **Button Component**: Core component uses CSS variables
- [x] **Breadcrumb Component**: Core component prefers CSS variables
- [x] **Utility Classes**: Created `.btn-*`, `.breadcrumb-*` classes
- [x] **CSS Import**: Added to `index.css`
- [x] **Deprecation**: Marked inline styles as `@deprecated`
- [ ] **Build**: Type check and build pass (pending)
- [ ] **Visual Regression**: Zero visual changes (skipped per user request)

---

## Next Steps

### Phase 3.5 Completion
1. Build and type-check
2. Commit core component migrations
3. Deploy to production

### Phase 4 (Future)
- Remove `@deprecated` inline `<style>` blocks
- Remove legacy CSS variable aliases (`--button-*` → `--o4o-*` only)
- Enforce CSS variable usage via linting

### Phase 5 (Future)
- Migrate remaining 72 hardcoded `bg-*` instances
- Create semantic utility classes for all color usage
- Add visual regression tests

---

**Last Updated**: 2025-11-06
**Migration Coverage**: Core components (2/2), Usage propagation (automatic)
**Next Phase**: Build verification → Commit → Deploy
