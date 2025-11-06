# Appearance Tokens Reference

> **Single Source of Truth (SSOT)**: All design tokens are defined in `@o4o/appearance-system`

## Overview

This document provides a complete reference for all design tokens used in the O4O Platform. Design tokens are the single source of truth for all appearance-related values (colors, spacing, typography, etc.).

## Import Path

```typescript
import { defaultTokens } from '@o4o/appearance';
// or
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

## Color Tokens

### Primary Colors

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `colors.primary` | `--o4o-color-primary` | `#007bff` | Primary brand color |
| `colors.primaryHover` | `--o4o-color-primary-hover` | `#0056b3` | Primary hover state |
| `colors.primaryActive` | `--o4o-color-primary-active` | `#004085` | Primary active state |

### Button Colors

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `colors.buttonBg` | `--o4o-button-bg` | `#007bff` | Button background |
| `colors.buttonText` | `--o4o-button-text` | `#ffffff` | Button text color |
| `colors.buttonBorder` | `--o4o-button-border` | `#007bff` | Button border color |

### Breadcrumb Colors

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `colors.breadcrumbText` | `--o4o-breadcrumb-text` | `#6c757d` | Breadcrumb text |
| `colors.breadcrumbLink` | `--o4o-breadcrumb-link` | `#007bff` | Breadcrumb link |
| `colors.breadcrumbSeparator` | `--o4o-breadcrumb-separator` | `#6c757d` | Breadcrumb separator |

## Spacing Tokens

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `spacing.xs` | `--o4o-space-xs` | `0.25rem` | Extra small spacing (4px) |
| `spacing.sm` | `--o4o-space-sm` | `0.5rem` | Small spacing (8px) |
| `spacing.md` | `--o4o-space-md` | `1rem` | Medium spacing (16px) |
| `spacing.lg` | `--o4o-space-lg` | `1.5rem` | Large spacing (24px) |
| `spacing.xl` | `--o4o-space-xl` | `2rem` | Extra large spacing (32px) |

## Border Radius Tokens

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `radius.sm` | `--o4o-radius-sm` | `0.125rem` | Small radius (2px) |
| `radius.md` | `--o4o-radius-md` | `0.25rem` | Medium radius (4px) |
| `radius.lg` | `--o4o-radius-lg` | `0.5rem` | Large radius (8px) |

## Typography Tokens

### Font Family

| Token | CSS Variable | Default Value |
|-------|-------------|---------------|
| `typography.fontFamily` | `--o4o-font-family` | System font stack |

### Font Size

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `typography.fontSize.sm` | `--o4o-font-size-sm` | `0.875rem` | Small text (14px) |
| `typography.fontSize.md` | `--o4o-font-size-md` | `1rem` | Medium text (16px) |
| `typography.fontSize.lg` | `--o4o-font-size-lg` | `1.25rem` | Large text (20px) |

### Font Weight

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `typography.fontWeight.normal` | `--o4o-font-weight-normal` | `400` | Normal weight |
| `typography.fontWeight.medium` | `--o4o-font-weight-medium` | `500` | Medium weight |
| `typography.fontWeight.bold` | `--o4o-font-weight-bold` | `700` | Bold weight |

### Line Height

| Token | CSS Variable | Default Value | Description |
|-------|-------------|---------------|-------------|
| `typography.lineHeight.tight` | `--o4o-line-height-tight` | `1.25` | Tight line height |
| `typography.lineHeight.normal` | `--o4o-line-height-normal` | `1.5` | Normal line height |
| `typography.lineHeight.relaxed` | `--o4o-line-height-relaxed` | `1.75` | Relaxed line height |

## Usage Examples

### Using Tokens in TypeScript

```typescript
import { defaultTokens } from '@o4o/appearance';

// Access a specific token
const primaryColor = defaultTokens.colors.primary;

// Override tokens
const customTokens = {
  ...defaultTokens,
  colors: {
    ...defaultTokens.colors,
    primary: '#ff0000',
  },
};
```

### Using CSS Variables in Components

```tsx
// React component using CSS variables
function Button() {
  return (
    <button
      style={{
        backgroundColor: 'var(--o4o-button-bg)',
        color: 'var(--o4o-button-text)',
        padding: 'var(--o4o-space-md)',
        borderRadius: 'var(--o4o-radius-md)',
      }}
    >
      Click me
    </button>
  );
}
```

### Using CSS Variables in Stylesheets

```css
/* CSS file using design tokens */
.btn-primary {
  background-color: var(--o4o-button-bg);
  color: var(--o4o-button-text);
  border: 1px solid var(--o4o-button-border);
  padding: var(--o4o-space-sm) var(--o4o-space-md);
  border-radius: var(--o4o-radius-md);
  font-size: var(--o4o-font-size-md);
  font-weight: var(--o4o-font-weight-medium);
}

.btn-primary:hover {
  background-color: var(--o4o-color-primary-hover);
}
```

## Legacy Variables (Deprecated)

### Migration Mapping

| Legacy Variable | New Variable | Status |
|----------------|--------------|--------|
| `--wp-button-bg` | `--o4o-button-bg` | Phase 4 migration |
| `--ast-button-bg` | `--o4o-button-bg` | Phase 4 migration |
| `--wp-primary-color` | `--o4o-color-primary` | Phase 4 migration |
| `--ast-primary-color` | `--o4o-color-primary` | Phase 4 migration |
| `--wp-spacing-*` | `--o4o-space-*` | Phase 4 migration |
| `--ast-spacing-*` | `--o4o-space-*` | Phase 4 migration |

**⚠️ Warning**: Do not use legacy variables in new code. They will be removed in Phase 4.

## Extending the Token System

### Adding New Tokens (Phase 2+)

When adding new tokens, follow this process:

1. Add the token to the appropriate interface in `packages/appearance-system/src/tokens.ts`
2. Add the default value to `defaultTokens`
3. Update this documentation
4. Update the CSS variable naming convention

Example:

```typescript
// In tokens.ts
export interface ColorTokens {
  // ... existing tokens
  errorBg: string;  // New token
}

export const defaultTokens: DesignTokens = {
  colors: {
    // ... existing values
    errorBg: '#dc3545',  // New value
  },
  // ...
};
```

## Best Practices

### ✅ DO

- Use tokens for all color, spacing, and typography values
- Reference tokens through CSS variables in components
- Override tokens at the theme level, not component level
- Keep token names semantic (e.g., `buttonBg` not `blue500`)

### ❌ DON'T

- Hardcode color values (e.g., `#007bff`, `rgb(0, 123, 255)`)
- Hardcode spacing values (e.g., `16px`, `1rem`)
- Use legacy variables (`--wp-*`, `--ast-*`)
- Create component-specific tokens (use semantic names)

## Roadmap

### Phase 2 (Current → Next)
- Migrate existing token values from apps
- Consolidate duplicate token definitions
- Implement CSS variable generation

### Phase 3
- Update all components to use CSS variables
- Remove hardcoded values from components
- Add visual regression tests

### Phase 4
- Complete migration from legacy variables
- Remove all `--wp-*` and `--ast-*` references
- Finalize `--o4o-*` naming convention

### Phase 5
- Complete documentation
- Add Storybook integration
- Create design token visualization tool

## Related Documentation

- [APPEARANCE_CLEANUP_PLAN.md](/docs/APPEARANCE_CLEANUP_PLAN.md) - Overall migration strategy
- [APPEARANCE_INVESTIGATION.md](/docs/APPEARANCE_INVESTIGATION.md) - Technical analysis
- [packages/appearance-system/README.md](/packages/appearance-system/README.md) - Package documentation

---

**Last Updated**: 2024-11-06
**Status**: Phase 1 Complete
**Next Review**: Phase 2 Start
