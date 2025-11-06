# Appearance System Migration Guide

Complete guide for migrating from legacy CSS variables to the standardized `--o4o-*` naming convention.

**Status**: Phase 4 Complete - Legacy Variables Removed
**Last Updated**: 2025-11-06

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Migration Overview](#migration-overview)
3. [Legacy → Standard Mapping](#legacy--standard-mapping)
4. [Component Migration Recipes](#component-migration-recipes)
5. [GlobalStyleInjector Usage](#globalstyleinjector-usage)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### For New Code

```css
/* ✅ DO: Use --o4o-* variables */
.my-button {
  background-color: var(--o4o-button-bg);
  color: var(--o4o-button-text);
}
```

```css
/* ❌ DON'T: Use legacy variables */
.my-button {
  background-color: var(--button-primary-bg);  /* Will fail ESLint */
  color: var(--button-primary-text);           /* Will fail ESLint */
}
```

### For Existing Code

1. Find legacy variable usage: `grep -r "--button-" apps/`
2. Replace with standard variables using the [mapping table](#legacy--standard-mapping)
3. Run `pnpm -w lint` to verify
4. Test visual output

---

## Migration Overview

### Timeline

| Phase | Date | Description | Status |
|-------|------|-------------|--------|
| Phase 1 | 2025-11-05 | Package creation (`@o4o/appearance-system`) | ✅ Complete |
| Phase 2 | 2025-11-05 | CSS generator consolidation | ✅ Complete |
| Phase 3 Mini | 2025-11-05 | CSS injection standardization | ✅ Complete |
| Phase 3.5 | 2025-11-06 | Component variable migration (Button, Breadcrumbs) | ✅ Complete |
| Phase 4 | 2025-11-06 | Legacy variable removal | ✅ Complete |
| Phase 5 | 2025-11-06 | Documentation & quality rules | 🔄 In Progress |
| Phase 6 | Planned | Legacy code cleanup | 📋 Planned |

### What Changed

**Before Phase 4**:
- Mixed naming: `--button-primary-bg`, `--breadcrumb-link-color`, `--scroll-top-bg`
- 3-tier fallback chains
- Legacy variables coexisted with new variables

**After Phase 4**:
- Unified naming: `--o4o-button-bg`, `--o4o-breadcrumb-link`, `--o4o-scroll-top-bg`
- 1-tier fallbacks (CSS variables only)
- Legacy variables completely removed
- ESLint enforcement

---

## Legacy → Standard Mapping

### Complete Mapping Table

#### Button Variables

| Legacy Variable (❌ Removed) | Standard Variable (✅ Use) | Default Value |
|------------------------------|---------------------------|---------------|
| `--button-primary-bg` | `--o4o-button-bg` | `#007bff` |
| `--button-primary-text` | `--o4o-button-text` | `#ffffff` |
| `--button-primary-border` | `--o4o-button-border` | `#007bff` |
| `--button-primary-border-radius` | `--o4o-button-radius` | `4px` |
| `--button-primary-padding-v` | `--o4o-button-padding-y` | `12px` |
| `--button-primary-padding-h` | `--o4o-button-padding-x` | `24px` |
| `--button-primary-bg-hover` | `--o4o-button-bg-hover` | `#0056b3` |
| `--button-primary-bg-active` | `--o4o-button-bg-active` | `#004085` |
| `--button-secondary-bg` | `--o4o-button-secondary-bg` | `#6c757d` |
| `--button-secondary-text` | `--o4o-button-secondary-text` | `#ffffff` |
| `--button-secondary-border` | `--o4o-button-secondary-border` | `#6c757d` |
| `--button-outline-border` | `--o4o-button-outline-border` | `#007bff` |
| `--button-outline-text` | `--o4o-button-outline-text` | `#007bff` |

#### Breadcrumb Variables

| Legacy Variable (❌ Removed) | Standard Variable (✅ Use) | Default Value |
|------------------------------|---------------------------|---------------|
| `--breadcrumb-text-color` | `--o4o-breadcrumb-text` | `#6c757d` |
| `--breadcrumb-link-color` | `--o4o-breadcrumb-link` | `#007bff` |
| `--breadcrumb-link-color-hover` | `--o4o-breadcrumb-link-hover` | `#0056b3` |
| `--breadcrumb-separator-color` | `--o4o-breadcrumb-separator` | `#6c757d` |
| `--breadcrumb-font-size` | `--o4o-breadcrumb-font-size` | `14px` |

#### Scroll-to-Top Variables

| Legacy Variable (❌ Removed) | Standard Variable (✅ Use) | Default Value |
|------------------------------|---------------------------|---------------|
| `--scroll-top-bg` | `--o4o-scroll-top-bg` | `#007bff` |
| `--scroll-top-icon-color` | `--o4o-scroll-top-icon` | `#ffffff` |
| `--scroll-top-text` | `--o4o-scroll-top-text` | `#ffffff` |
| `--scroll-top-size` | `--o4o-scroll-top-size` | `40px` |
| `--scroll-top-border-radius` | `--o4o-scroll-top-border-radius` | `4px` |
| `--scroll-top-position-bottom` | `--o4o-scroll-top-position-bottom` | `30px` |
| `--scroll-top-position-right` | `--o4o-scroll-top-position-right` | `30px` |

### Search and Replace Patterns

```bash
# Find all legacy variable usages
grep -rn "--button-primary-" apps/ packages/
grep -rn "--breadcrumb-.*-color" apps/ packages/
grep -rn "--scroll-top-" apps/ packages/

# Replace using sed (example)
sed -i 's/--button-primary-bg/--o4o-button-bg/g' apps/main-site/src/**/*.{css,tsx,ts}
sed -i 's/--breadcrumb-link-color/--o4o-breadcrumb-link/g' apps/main-site/src/**/*.{css,tsx,ts}
```

---

## Component Migration Recipes

### Recipe 1: Migrate Button Styles

**Before**:
```css
.my-button {
  background-color: var(--button-primary-bg, #007bff);
  color: var(--button-primary-text, #ffffff);
  border-radius: var(--button-primary-border-radius, 4px);
  padding: var(--button-primary-padding-v, 12px) var(--button-primary-padding-h, 24px);
}

.my-button:hover {
  background-color: var(--button-primary-bg-hover, #0056b3);
}
```

**After**:
```css
.my-button {
  background-color: var(--o4o-button-bg);
  color: var(--o4o-button-text);
  border-radius: var(--o4o-button-radius);
  padding: var(--o4o-button-padding-y) var(--o4o-button-padding-x);
}

.my-button:hover {
  background-color: var(--o4o-button-bg-hover);
}
```

**Changes**:
- Removed fallback values (handled by GlobalStyleInjector)
- Updated variable names to `--o4o-*` convention
- Simplified padding syntax

---

### Recipe 2: Migrate Breadcrumb Styles

**Before**:
```tsx
<Link
  className="breadcrumb-link"
  style={{ color: settings.linkColor }}  // ❌ Inline style
>
  Home
</Link>
```

**After**:
```tsx
<Link className="breadcrumb-link">
  Home
</Link>
```

```css
/* In CSS file */
.breadcrumb-link {
  color: var(--o4o-breadcrumb-link);
}

.breadcrumb-link:hover {
  color: var(--o4o-breadcrumb-link-hover);
}
```

**Changes**:
- Removed inline styles
- Use CSS variables in stylesheet
- Leverage utility classes

---

### Recipe 3: Migrate Scroll-to-Top Button

**Before**:
```css
.scroll-to-top {
  background-color: var(--scroll-top-bg, var(--wp-color-primary-500, #2563eb));
  color: var(--scroll-top-icon-color, #ffffff);
  width: var(--scroll-top-size, 40px);
  height: var(--scroll-top-size, 40px);
  border-radius: var(--scroll-top-border-radius, 4px);
}
```

**After**:
```css
.scroll-to-top {
  background-color: var(--o4o-scroll-top-bg, var(--wp-color-primary-500, #2563eb));
  color: var(--o4o-scroll-top-icon);
  width: var(--o4o-scroll-top-size);
  height: var(--o4o-scroll-top-size);
  border-radius: var(--o4o-scroll-top-border-radius);
}
```

**Changes**:
- Updated all `--scroll-top-*` to `--o4o-scroll-top-*`
- Keep WordPress fallback for compatibility
- Simplified nested fallbacks

---

### Recipe 4: Use Utility Classes (Recommended)

**Before**:
```tsx
<button
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
>
  Submit
</button>
```

**After**:
```tsx
<button className="btn-primary">
  Submit
</button>
```

**Benefits**:
- Automatically uses `--o4o-*` variables
- Theme-aware (responds to Admin Dashboard changes)
- Less code
- Consistent styling

Available utility classes:
- `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`, `.btn-ghost`
- `.breadcrumb-link`, `.breadcrumb-current`, `.breadcrumb-separator`
- `.scroll-to-top`

---

## GlobalStyleInjector Usage

### What is GlobalStyleInjector?

GlobalStyleInjector is a React component that injects CSS variables from the appearance system into the page `<style>` tag.

### Basic Usage

```tsx
// apps/main-site/src/App.tsx
import { GlobalStyleInjector } from '@o4o/appearance-system';

function App() {
  return (
    <>
      <GlobalStyleInjector />
      {/* Your app content */}
    </>
  );
}
```

### With Custom Tokens

```tsx
import { GlobalStyleInjector, defaultTokens } from '@o4o/appearance-system';

const customTokens = {
  ...defaultTokens,
  colors: {
    ...defaultTokens.colors,
    buttonBg: '#28a745',  // Green buttons
  },
};

function App() {
  return (
    <>
      <GlobalStyleInjector tokens={customTokens} />
      {/* Your app content */}
    </>
  );
}
```

### How It Works

1. **Token Definition**: Design tokens defined in `@o4o/appearance-system/src/tokens.ts`
2. **CSS Generation**: `generateAllCSS()` converts tokens to CSS string
3. **Injection**: GlobalStyleInjector injects `<style>` tag with CSS variables
4. **Components**: Components reference CSS variables via `var(--o4o-*)`
5. **Customization**: Admin Dashboard overrides CSS variables via Custom CSS

### Rules

✅ **DO**:
- Place GlobalStyleInjector at app root (before any styled components)
- Override tokens at app level (not component level)
- Use `var(--o4o-*)` in components

❌ **DON'T**:
- Inject GlobalStyleInjector multiple times
- Override CSS variables in component files
- Mix legacy and standard variables

---

## Troubleshooting

### Issue 1: ESLint Error "Use --o4o-* variables only"

**Error**:
```
Literal[value=/--(button|breadcrumb|scroll-top)-[a-z0-9-]+/i] - Use --o4o-* variables only.
```

**Cause**: Legacy variable detected in code

**Solution**: Replace with standard variable using [mapping table](#legacy--standard-mapping)

```diff
- background-color: var(--button-primary-bg);
+ background-color: var(--o4o-button-bg);
```

---

### Issue 2: Styles Not Applying

**Symptoms**: CSS variables not taking effect

**Possible Causes**:
1. GlobalStyleInjector not mounted
2. CSS variable name typo
3. CSS specificity conflict

**Solutions**:
```tsx
// 1. Verify GlobalStyleInjector is mounted
<GlobalStyleInjector />

// 2. Check variable name
// ✅ Correct: var(--o4o-button-bg)
// ❌ Wrong: var(--o4o-button-background)

// 3. Check CSS specificity
// Use !important as last resort
.my-button {
  background-color: var(--o4o-button-bg) !important;
}
```

---

### Issue 3: Variables Not Updating from Admin Dashboard

**Symptoms**: Custom CSS changes in Admin Dashboard don't reflect on site

**Possible Causes**:
1. Cache not cleared
2. Custom CSS not saved
3. postMessage communication failure

**Solutions**:
```bash
# 1. Hard refresh browser (Ctrl+Shift+R)

# 2. Verify Custom CSS is saved in Admin Dashboard

# 3. Check browser console for errors
# Look for: "CustomCSS update failed"

# 4. Verify GlobalStyleInjector is using latest tokens
# Check <style id="o4o-appearance-css"> in page <head>
```

---

### Issue 4: Build Fails After Migration

**Error**: `Cannot find variable --button-primary-bg`

**Cause**: Legacy variable reference not migrated

**Solution**:
```bash
# Search for all legacy references
grep -rn "--button-" apps/ packages/
grep -rn "--breadcrumb-.*-color" apps/ packages/
grep -rn "--scroll-top-" apps/ packages/

# Replace all matches using mapping table

# Verify no legacy variables remain
pnpm -w lint
```

---

## Migration Checklist

Use this checklist when migrating a component:

- [ ] Search for legacy variables in component files
- [ ] Replace with standard variables using mapping table
- [ ] Remove inline styles (use CSS classes instead)
- [ ] Add utility classes where appropriate
- [ ] Remove hardcoded fallback values
- [ ] Run `pnpm -w lint` (should pass with no errors)
- [ ] Run `pnpm -w typecheck` (should pass)
- [ ] Visual test: Compare before/after screenshots
- [ ] Test theme customization from Admin Dashboard
- [ ] Verify responsive behavior (mobile/tablet/desktop)

---

## Additional Resources

- [APPEARANCE_TOKENS.md](./APPEARANCE_TOKENS.md) - Complete variable reference with examples
- [APPEARANCE_CLEANUP_PLAN.md](./APPEARANCE_CLEANUP_PLAN.md) - Overall migration strategy
- [APPEARANCE_COMPONENT_MAP.md](./APPEARANCE_COMPONENT_MAP.md) - Component usage tracking
- [packages/appearance-system/README.md](../packages/appearance-system/README.md) - Package API documentation

---

**Need Help?**

- Check examples in [APPEARANCE_TOKENS.md](./APPEARANCE_TOKENS.md#usage-examples)
- Search existing code: `grep -r "var(--o4o-" apps/main-site/src`
- Reference utility classes: `apps/main-site/src/styles/appearance-utilities.css`
- Ask in team chat with `#appearance-system` tag

---

**Last Updated**: 2025-11-06
**Phase**: Phase 5 (Documentation & Quality Rules)
**Next Phase**: Phase 6 (Legacy Cleanup)
