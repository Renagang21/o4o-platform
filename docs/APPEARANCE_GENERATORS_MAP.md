# CSS Generators Mapping

> Inventory of CSS generators across the codebase for Phase 2 migration

## Overview

This document maps all CSS generation functions currently duplicated across three applications into a unified `@o4o/appearance-system` package.

## Current State

### Duplicate Locations

| Location | File | Functions | Lines | Status |
|----------|------|-----------|-------|--------|
| **Admin Dashboard** | `apps/admin-dashboard/src/pages/appearance/astra-customizer/utils/css-generator.ts` | 9 functions | 706 lines | Phase 2 Target |
| **Main Site** | `apps/main-site/src/utils/css-generator.ts` | 8 functions | 757 lines | Phase 2 Target |
| **API Server** | `apps/api-server/src/utils/customizer/css-generator.ts` | 6 functions | 457 lines | Phase 2 Target |

**Total Duplication**: ~1,920 lines of duplicated code

## Function Inventory

### Core Generators (Phase 2 Priority)

| Function | Admin | Main Site | API Server | Signature | Migration Status |
|----------|-------|-----------|------------|-----------|------------------|
| `generateButtonCSS` | ✅ (573:625) | ✅ (613:675) | ❌ | `(settings) => string[]` | ✅ **Migrated** |
| `generateBreadcrumbCSS` | ✅ (627:661) | ✅ (677:711) | ❌ | `(settings) => string[]` | ✅ **Migrated** |
| `generateScrollToTopCSS` | ✅ (663:706) | ✅ (713:756) | ❌ | `(settings) => string[]` | ✅ **Migrated** |

### Complex Generators (Phase 2.5 - Future)

| Function | Admin | Main Site | API Server | Migration Status |
|----------|-------|-----------|------------|------------------|
| `generateHeaderCSS` | ✅ (191:231) | ✅ (290:350) | ✅ (283:343) | 🔜 **Phase 2.5** |
| `generateFooterCSS` | ✅ (233:278) | ✅ (352:411) | ✅ (345:404) | 🔜 **Phase 2.5** |
| `generateContainerCSS` | ✅ (280:320) | ✅ (413:463) | ✅ (406:456) | 🔜 **Phase 2.5** |
| `generateBlogCSS` | ✅ (360:558) | ✅ (468:611) | ❌ | 🔜 **Phase 2.5** |
| `generateResponsiveCSS` | ✅ (118:189) | ✅ (194:288) | ✅ (187:281) | 🔜 **Phase 2.5** |
| `generateSidebarCSS` | ✅ (322:358) | ❌ | ❌ | 🔜 **Phase 2.5** |

### Variable Generators (Foundation)

| Function | Admin | Main Site | API Server | Note |
|----------|-------|-----------|------------|------|
| `generateColorVariables` | ✅ | ✅ | ✅ | CSS Custom Properties |
| `generateTypographyVariables` | ✅ | ✅ | ✅ | Font settings |
| `generateSpacingVariables` | ✅ | ✅ | ✅ | Layout spacing |

## Implementation Differences

### Type Signatures

```typescript
// Admin Dashboard
function generateButtonCSS(settings: AstraCustomizerSettings): string[]

// Main Site
function generateButtonCSS(settings: CustomizerSettings): string[]

// API Server
function generateGlobalCSS(settings: any): string
```

### CSS Variable Naming

| Component | Legacy Naming | Standard Naming |
|-----------|---------------|-----------------|
| Button BG | `--button-primary-bg` | `--o4o-button-primary-bg` |
| Button Text | `--button-primary-text` | `--o4o-button-primary-text` |
| Breadcrumb Text | `--breadcrumb-text-color` | `--o4o-breadcrumb-text` |
| Breadcrumb Link | `--breadcrumb-link-color` | `--o4o-breadcrumb-link` |
| Scroll BG | `--scroll-top-bg` | `--o4o-scroll-top-bg` |

## Migration Strategy

### Phase 2 (Current)

**Focus**: Core UI components with high duplication

1. ✅ **generateButtonCSS** - Buttons across site
2. ✅ **generateBreadcrumbCSS** - Navigation breadcrumbs
3. ✅ **generateScrollToTopCSS** - Scroll-to-top button

**Deliverables**:
- Unified implementations in `@o4o/appearance-system`
- Deprecated wrappers in app code
- Snapshot tests for 3 generators

### Phase 2.5 (Future)

**Focus**: Complex layout generators

1. `generateHeaderCSS` - Header component
2. `generateFooterCSS` - Footer component
3. `generateContainerCSS` - Container layout
4. `generateBlogCSS` - Blog archive styling
5. `generateResponsiveCSS` - Media queries
6. Variable generators (colors, typography, spacing)

## Usage Patterns

### Before (Duplicated)

```typescript
// In admin-dashboard/utils/css-generator.ts
function generateButtonCSS(settings: AstraCustomizerSettings): string[] {
  const css: string[] = [];
  // ... 52 lines of duplicated code
  return css;
}

// In main-site/utils/css-generator.ts
function generateButtonCSS(settings: CustomizerSettings): string[] {
  const css: string[] = [];
  // ... 62 lines of duplicated code
  return css;
}
```

### After (Unified)

```typescript
// In @o4o/appearance-system
import { generateButtonCSS } from '@o4o/appearance-system';

const css = generateButtonCSS(tokens, options);
```

## Call Sites

### Admin Dashboard

- `apps/admin-dashboard/src/pages/appearance/astra-customizer/context/CustomizerContext.tsx:47`
- `apps/admin-dashboard/src/pages/appearance/astra-customizer/SimpleCustomizer.tsx:32`

### Main Site

- `apps/main-site/src/components/GlobalStyleInjector.tsx:15`
- `apps/main-site/src/utils/css-generator.ts:12` (internal)

### API Server

- `apps/api-server/src/routes/v1/settings.routes.ts:89`
- `apps/api-server/src/routes/preview.ts:45`

## Legacy CSS Variables (Deprecated)

### Button Variables

```css
/* Legacy (Phase 3 removal) */
--button-primary-bg
--button-primary-text
--button-primary-border-radius
--button-primary-padding-v
--button-primary-padding-h

/* Standard (Phase 4) */
--o4o-button-primary-bg
--o4o-button-primary-text
--o4o-button-radius
--o4o-button-padding-y
--o4o-button-padding-x
```

### Breadcrumb Variables

```css
/* Legacy */
--breadcrumb-text-color
--breadcrumb-link-color
--breadcrumb-separator-color
--breadcrumb-font-size

/* Standard */
--o4o-breadcrumb-text
--o4o-breadcrumb-link
--o4o-breadcrumb-separator
--o4o-font-size-sm
```

### Scroll-to-Top Variables

```css
/* Legacy */
--scroll-top-bg
--scroll-top-icon-color
--scroll-top-size
--scroll-top-border-radius

/* Standard */
--o4o-scroll-top-bg
--o4o-scroll-top-icon
--o4o-scroll-top-size
--o4o-radius-md
```

## Code Reduction Goals

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Total Lines** | 1,920 | 640 | 67% |
| **Duplicate Functions** | 24 | 0 | 100% |
| **Maintenance Files** | 3 | 1 | 67% |

## Testing Strategy

### Snapshot Tests

```typescript
describe('generateButtonCSS', () => {
  it('generates default button styles', () => {
    const css = generateButtonCSS(defaultTokens);
    expect(css).toMatchSnapshot();
  });

  it('generates primary button with custom color', () => {
    const tokens = { ...defaultTokens, colors: { primary: '#ff0000' } };
    const css = generateButtonCSS(tokens);
    expect(css).toMatchSnapshot();
  });

  it('generates outline button variant', () => {
    const css = generateButtonCSS(defaultTokens, { variant: 'outline' });
    expect(css).toMatchSnapshot();
  });
});
```

## Rollback Plan

1. App-level deprecated wrappers remain in place
2. Revert to legacy imports if standard API has issues
3. No breaking changes until Phase 3

## Next Steps

- [x] Phase 2 Core generators (Button, Breadcrumb, ScrollToTop)
- [ ] Phase 2.5 Complex generators (Header, Footer, Container, Blog)
- [ ] Phase 3 Remove legacy implementations
- [ ] Phase 4 CSS variable naming standardization

---

**Last Updated**: 2024-11-06
**Status**: Phase 2 In Progress
**Next Review**: Phase 2 Complete
