# Appearance Tokens Reference

> **Single Source of Truth (SSOT)**: All design tokens are defined in `@o4o/appearance-system`

## Overview

This document provides a complete reference for all design tokens used in the O4O Platform. Design tokens are the single source of truth for all appearance-related values (colors, spacing, typography, etc.).

**Status**: Phase 4 Complete (Legacy Variables Removed)
**Standard**: `--o4o-*` naming convention only

## Import Path

```typescript
import { defaultTokens } from '@o4o/appearance-system';
```

## Token Structure

```typescript
interface DesignTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  typography: TypographyTokens;
}
```

---

## CSS Variables Reference

### Button Variables

| CSS Variable | Default Value | Description | Component |
|-------------|---------------|-------------|-----------|
| `--o4o-button-bg` | `#007bff` | Primary button background | Button |
| `--o4o-button-text` | `#ffffff` | Primary button text color | Button |
| `--o4o-button-border` | `#007bff` | Primary button border color | Button |
| `--o4o-button-radius` | `4px` | Button border radius | Button |
| `--o4o-button-padding-y` | `12px` | Button vertical padding | Button |
| `--o4o-button-padding-x` | `24px` | Button horizontal padding | Button |
| `--o4o-button-bg-hover` | `#0056b3` | Primary button hover background | Button |
| `--o4o-button-bg-active` | `#004085` | Primary button active background | Button |
| `--o4o-button-secondary-bg` | `#6c757d` | Secondary button background | Button |
| `--o4o-button-secondary-text` | `#ffffff` | Secondary button text | Button |
| `--o4o-button-secondary-border` | `#6c757d` | Secondary button border | Button |
| `--o4o-button-success-bg` | `#28a745` | Success button background | Button |
| `--o4o-button-success-text` | `#ffffff` | Success button text | Button |
| `--o4o-button-danger-bg` | `#dc3545` | Danger button background | Button |
| `--o4o-button-danger-text` | `#ffffff` | Danger button text | Button |
| `--o4o-button-ghost-text` | `#6c757d` | Ghost button text color | Button |
| `--o4o-button-ghost-bg-hover` | `rgba(0,0,0,0.05)` | Ghost button hover background | Button |

### Breadcrumb Variables

| CSS Variable | Default Value | Description | Component |
|-------------|---------------|-------------|-----------|
| `--o4o-breadcrumb-text` | `#6c757d` | Breadcrumb current page text | Breadcrumbs |
| `--o4o-breadcrumb-link` | `#007bff` | Breadcrumb link color | Breadcrumbs |
| `--o4o-breadcrumb-link-hover` | `#0056b3` | Breadcrumb link hover color | Breadcrumbs |
| `--o4o-breadcrumb-separator` | `#6c757d` | Breadcrumb separator color | Breadcrumbs |
| `--o4o-breadcrumb-font-size` | `14px` | Breadcrumb font size | Breadcrumbs |

### Scroll-to-Top Variables

| CSS Variable | Default Value | Description | Component |
|-------------|---------------|-------------|-----------|
| `--o4o-scroll-top-bg` | `#007bff` | Scroll-to-top background | ScrollToTop |
| `--o4o-scroll-top-icon` | `#ffffff` | Scroll-to-top icon color | ScrollToTop |
| `--o4o-scroll-top-text` | `#ffffff` | Scroll-to-top text color | ScrollToTop |
| `--o4o-scroll-top-size` | `40px` | Scroll-to-top button size | ScrollToTop |
| `--o4o-scroll-top-border-radius` | `4px` | Scroll-to-top border radius | ScrollToTop |
| `--o4o-scroll-top-position-bottom` | `30px` | Distance from bottom | ScrollToTop |
| `--o4o-scroll-top-position-right` | `30px` | Distance from right | ScrollToTop |
| `--o4o-scroll-top-bg-hover` | `#0056b3` | Hover background color | ScrollToTop |

### Core Colors

| CSS Variable | Default Value | Description |
|-------------|---------------|-------------|
| `--o4o-color-primary` | `#007bff` | Primary brand color |
| `--o4o-color-primary-hover` | `#0056b3` | Primary hover state |
| `--o4o-color-primary-active` | `#004085` | Primary active state |

### Spacing

| CSS Variable | Default Value | Description |
|-------------|---------------|-------------|
| `--o4o-space-xs` | `0.25rem` (4px) | Extra small spacing |
| `--o4o-space-sm` | `0.5rem` (8px) | Small spacing |
| `--o4o-space-md` | `1rem` (16px) | Medium spacing |
| `--o4o-space-lg` | `1.5rem` (24px) | Large spacing |
| `--o4o-space-xl` | `2rem` (32px) | Extra large spacing |

### Border Radius

| CSS Variable | Default Value | Description |
|-------------|---------------|-------------|
| `--o4o-radius-sm` | `0.125rem` (2px) | Small radius |
| `--o4o-radius-md` | `0.25rem` (4px) | Medium radius |
| `--o4o-radius-lg` | `0.5rem` (8px) | Large radius |

---

## Usage Examples

### Example 1: Customize Button Colors

```css
/* In Admin Dashboard Custom CSS section */
:root {
  --o4o-button-bg: #28a745;           /* Green background */
  --o4o-button-bg-hover: #218838;     /* Darker green on hover */
  --o4o-button-text: #ffffff;         /* White text */
}
```

**Result**: All primary buttons become green.

### Example 2: Customize Breadcrumb Style

```css
:root {
  --o4o-breadcrumb-link: #6f42c1;        /* Purple links */
  --o4o-breadcrumb-link-hover: #5a32a3;  /* Darker purple on hover */
  --o4o-breadcrumb-separator: #dee2e6;   /* Light gray separator */
  --o4o-breadcrumb-font-size: 16px;      /* Larger font */
}
```

**Result**: Breadcrumbs use purple color scheme with larger text.

### Example 3: Customize Scroll-to-Top Button

```css
:root {
  --o4o-scroll-top-bg: #dc3545;              /* Red background */
  --o4o-scroll-top-size: 50px;               /* Larger button */
  --o4o-scroll-top-border-radius: 25px;      /* Fully rounded */
  --o4o-scroll-top-position-bottom: 20px;    /* Closer to bottom */
  --o4o-scroll-top-position-right: 20px;     /* Closer to right */
}
```

**Result**: Scroll-to-top button becomes a large red circle in the bottom-right corner.

### Example 4: Using Variables in TypeScript

```typescript
import { defaultTokens } from '@o4o/appearance-system';

// Access a specific token
const primaryColor = defaultTokens.colors.primary;

// Override tokens for custom theme
const customTokens = {
  ...defaultTokens,
  colors: {
    ...defaultTokens.colors,
    buttonBg: '#28a745',      // Green buttons
    buttonText: '#ffffff',
  },
};
```

### Example 5: Using CSS Variables in React Components

```tsx
// React component using CSS variables
function CustomButton() {
  return (
    <button
      style={{
        backgroundColor: 'var(--o4o-button-bg)',
        color: 'var(--o4o-button-text)',
        padding: 'var(--o4o-button-padding-y) var(--o4o-button-padding-x)',
        borderRadius: 'var(--o4o-button-radius)',
        border: '1px solid var(--o4o-button-border)',
      }}
    >
      Click me
    </button>
  );
}
```

### Example 6: Using Utility Classes

```tsx
// Using pre-built utility classes (recommended)
<button className="btn-primary">Primary Button</button>
<button className="btn-secondary">Secondary Button</button>
<button className="btn-success">Success Button</button>
<button className="btn-danger">Danger Button</button>
```

Utility classes automatically use `--o4o-*` variables and support theme customization.

---

## Legacy Variables (Deprecated - Phase 4 Complete)

### Migration Mapping Table

| Legacy Variable (❌ Removed) | New Variable (✅ Standard) | Migration Date |
|------------------------------|---------------------------|----------------|
| `--button-primary-bg` | `--o4o-button-bg` | 2025-11-06 (Phase 4) |
| `--button-primary-text` | `--o4o-button-text` | 2025-11-06 (Phase 4) |
| `--button-primary-border-radius` | `--o4o-button-radius` | 2025-11-06 (Phase 4) |
| `--button-primary-padding-v` | `--o4o-button-padding-y` | 2025-11-06 (Phase 4) |
| `--button-primary-padding-h` | `--o4o-button-padding-x` | 2025-11-06 (Phase 4) |
| `--button-primary-bg-hover` | `--o4o-button-bg-hover` | 2025-11-06 (Phase 4) |
| `--button-secondary-bg` | `--o4o-button-secondary-bg` | 2025-11-06 (Phase 4) |
| `--breadcrumb-text-color` | `--o4o-breadcrumb-text` | 2025-11-06 (Phase 4) |
| `--breadcrumb-link-color` | `--o4o-breadcrumb-link` | 2025-11-06 (Phase 4) |
| `--breadcrumb-separator-color` | `--o4o-breadcrumb-separator` | 2025-11-06 (Phase 4) |
| `--scroll-top-bg` | `--o4o-scroll-top-bg` | 2025-11-06 (Phase 4) |
| `--scroll-top-icon-color` | `--o4o-scroll-top-icon` | 2025-11-06 (Phase 4) |
| `--scroll-top-size` | `--o4o-scroll-top-size` | 2025-11-06 (Phase 4) |
| `--scroll-top-border-radius` | `--o4o-scroll-top-border-radius` | 2025-11-06 (Phase 4) |

**⚠️ Warning**: Legacy variables have been completely removed in Phase 4. Do not use them in any code.

**Auto-Detection**: ESLint will raise **errors** if legacy variables are detected in code.

---

## Best Practices

### ✅ DO

- Use `--o4o-*` variables for all styling
- Customize theme by overriding CSS variables in Admin Dashboard
- Use utility classes (`.btn-primary`, `.breadcrumb-link`) for components
- Reference tokens through CSS variables in custom CSS
- Keep token names semantic (e.g., `--o4o-button-bg` not `--o4o-blue-500`)

### ❌ DON'T

- Hardcode color values (e.g., `#007bff`, `rgb(0, 123, 255)`)
- Hardcode spacing values (e.g., `16px`, `1rem`)
- Use legacy variables (`--button-*`, `--breadcrumb-*`, `--scroll-top-*`)
- Create component-specific tokens without consulting the team
- Override CSS variables in component files (use Admin Dashboard only)

### Quick Start Checklist

New to theming? Follow these steps:

1. ✅ Go to Admin Dashboard → Appearance → Custom CSS
2. ✅ Copy one of the examples above (Button, Breadcrumb, or ScrollToTop)
3. ✅ Paste into Custom CSS editor
4. ✅ Modify color/size values to match your brand
5. ✅ Save and preview changes in real-time
6. ✅ Test on 3 pages: Home, Category, Product Detail

**Time to theme**: < 5 minutes

---

## Roadmap

### ✅ Phase 1 (Complete)
- Package structure created
- Token system established

### ✅ Phase 2 (Complete)
- CSS generators consolidated
- GlobalStyleInjector implemented

### ✅ Phase 3 Mini & 3.5 (Complete)
- Button and Breadcrumb components migrated
- CSS variable injection standardized

### ✅ Phase 4 (Complete - 2025-11-06)
- Legacy variables completely removed
- `--o4o-*` naming convention enforced
- ESLint rules added for legacy variable detection

### 🔄 Phase 5 (In Progress)
- Documentation finalization
- Quality rules enforcement
- Admin UI help tooltips

### 📋 Phase 6 (Planned)
- Legacy code cleanup
- Unused file removal
- Final optimization

---

## Related Documentation

- [APPEARANCE_CLEANUP_PLAN.md](/docs/APPEARANCE_CLEANUP_PLAN.md) - Overall migration strategy
- [APPEARANCE_MIGRATION_GUIDE.md](/docs/APPEARANCE_MIGRATION_GUIDE.md) - Step-by-step migration guide
- [APPEARANCE_COMPONENT_MAP.md](/docs/APPEARANCE_COMPONENT_MAP.md) - Component usage tracking
- [packages/appearance-system/README.md](/packages/appearance-system/README.md) - Package documentation

---

**Last Updated**: 2025-11-06
**Status**: Phase 4 Complete, Phase 5 In Progress
**Next Review**: Phase 5 Completion
