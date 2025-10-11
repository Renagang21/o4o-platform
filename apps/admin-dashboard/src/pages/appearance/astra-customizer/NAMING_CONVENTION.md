# CSS Variable Naming Convention

## Overview

This document defines the **unified CSS variable naming system** for the O4O Platform.
All systems (Customizer, CSS Generator, Tailwind, Components) **MUST** follow this convention.

---

## ✅ Naming Rule

```
--wp-{category}-{element}-{variant}-{state}
```

### Components:
- **Prefix**: `--wp-` (WordPress-style, required)
- **Category**: Type of token (color, btn, header, sidebar, etc.)
- **Element**: Specific element (primary, secondary, bg, text, etc.)
- **Variant**: Optional variant (50, 100, 500, desktop, tablet, mobile)
- **State**: Optional state (hover, active, focus)

---

## 📋 Examples

### ✅ Correct Naming

```css
/* Colors */
--wp-color-primary-500
--wp-color-secondary-50
--wp-text-primary
--wp-text-secondary
--wp-bg-body
--wp-bg-content
--wp-border-primary

/* Buttons */
--wp-btn-primary-bg
--wp-btn-primary-bg-hover
--wp-btn-primary-text
--wp-btn-secondary-border

/* Layout */
--wp-header-bg
--wp-header-height-desktop
--wp-footer-text
--wp-sidebar-active

/* Typography */
--wp-font-body
--wp-font-size-body-desktop
--wp-line-height-body-mobile

/* Links */
--wp-link-color
--wp-link-color-hover

/* Admin */
--wp-admin-blue
--wp-admin-blue-dark
```

### ❌ Incorrect Naming (DO NOT USE)

```css
/* Old Astra naming - DEPRECATED */
--ast-primary-color  ❌
--ast-secondary-color  ❌
--ast-text-color  ❌

/* Inconsistent naming - WRONG */
--primary-500  ❌
--btn-primary-bg  ❌ (missing --wp- prefix)
--wp-primaryColor  ❌ (camelCase)
--wp-primary_color  ❌ (snake_case)

/* Unclear naming - AVOID */
--wp-color1  ❌ (use semantic names)
--wp-blue  ❌ (too generic)
```

---

## 🎨 Color System

### Primary/Secondary Colors

Use **5-shade scale** (50, 100, 500, 700, 900):

```css
--wp-color-primary-50    /* Lightest */
--wp-color-primary-100   /* Very light */
--wp-color-primary-500   /* Main brand color */
--wp-color-primary-700   /* Dark */
--wp-color-primary-900   /* Darkest */

--wp-color-secondary-50
--wp-color-secondary-500
--wp-color-secondary-900
```

### Semantic Colors

Use **semantic names**, not color names:

```css
/* ✅ Good - Semantic */
--wp-text-primary
--wp-text-secondary
--wp-bg-body
--wp-bg-content

/* ❌ Bad - Color names */
--wp-text-black
--wp-bg-white
--wp-color-blue
```

---

## 🖱️ Component States

### State Suffixes

```css
/* Default (no suffix) */
--wp-btn-primary-bg

/* Hover state */
--wp-btn-primary-bg-hover

/* Active/Focus state */
--wp-btn-primary-bg-active
--wp-border-focus
```

---

## 📱 Responsive Variants

### Device Suffixes

```css
/* Desktop (largest) */
--wp-header-height-desktop
--wp-font-size-body-desktop

/* Tablet (medium) */
--wp-header-height-tablet
--wp-font-size-body-tablet

/* Mobile (smallest) */
--wp-header-height-mobile
--wp-font-size-body-mobile
```

---

## 🏗️ Layout Components

### Header

```css
--wp-header-bg
--wp-header-text
--wp-header-border
--wp-header-height-desktop
--wp-header-height-tablet
--wp-header-height-mobile
```

### Footer

```css
--wp-footer-bg
--wp-footer-text
--wp-footer-link-color
--wp-footer-link-hover
```

### Sidebar

```css
--wp-sidebar-bg
--wp-sidebar-text
--wp-sidebar-hover
--wp-sidebar-active
--wp-sidebar-active-text
--wp-sidebar-border
```

### Container

```css
--wp-container-width-desktop
--wp-container-width-tablet
--wp-container-width-mobile
```

---

## 🔤 Typography

### Font Families

```css
--wp-font-body
--wp-font-heading
--wp-font-button
```

### Font Sizes

```css
--wp-font-size-body-desktop
--wp-font-size-body-tablet
--wp-font-size-body-mobile

--wp-font-size-h1-desktop
--wp-font-size-h2-desktop
```

### Line Heights

```css
--wp-line-height-body-desktop
--wp-line-height-body-tablet
--wp-line-height-body-mobile
```

---

## 🔘 Button System

### Primary Button

```css
--wp-btn-primary-bg
--wp-btn-primary-bg-hover
--wp-btn-primary-text
--wp-btn-primary-text-hover
--wp-btn-primary-border
```

### Secondary Button

```css
--wp-btn-secondary-bg
--wp-btn-secondary-bg-hover
--wp-btn-secondary-text
--wp-btn-secondary-text-hover
--wp-btn-secondary-border
```

---

## 🔗 Links

```css
--wp-link-color           /* Normal state */
--wp-link-color-hover     /* Hover state */
--wp-link-decoration      /* underline, none */
```

---

## 🎨 Border System

```css
--wp-border-primary       /* Main border color */
--wp-border-secondary     /* Secondary borders */
--wp-border-focus         /* Focus state */
--wp-border-radius        /* Border radius value */
```

---

## 🛡️ Admin UI Colors

WordPress-style admin colors:

```css
--wp-admin-blue
--wp-admin-blue-dark
--wp-admin-blue-light
--wp-admin-green
--wp-admin-red
--wp-admin-orange
--wp-admin-purple
--wp-admin-gray
--wp-admin-gray-light
--wp-admin-gray-dark
```

---

## 📦 Migration Guide

### From Old Astra Naming

```css
/* Before (OLD) */
--ast-primary-color

/* After (NEW) */
--wp-color-primary-500

/* Before (OLD) */
--ast-text-color

/* After (NEW) */
--wp-text-primary

/* Before (OLD) */
--ast-body-bg

/* After (NEW) */
--wp-bg-body
```

### From Generic Naming

```css
/* Before (OLD) */
--primary-500

/* After (NEW) */
--wp-color-primary-500

/* Before (OLD) */
--btn-primary-bg

/* After (NEW) */
--wp-btn-primary-bg
```

---

## 🚀 Usage in Code

### In CSS Files

```css
:root {
  --wp-color-primary-500: #3b82f6;
  --wp-btn-primary-bg: var(--wp-color-primary-500);
}

.button-primary {
  background: var(--wp-btn-primary-bg);
  color: var(--wp-btn-primary-text);
}

.button-primary:hover {
  background: var(--wp-btn-primary-bg-hover);
}
```

### In Tailwind Config

```js
// tailwind.config.cjs
module.exports = {
  theme: {
    extend: {
      colors: {
        'wp-primary': 'var(--wp-color-primary-500)',
        'wp-secondary': 'var(--wp-color-secondary-500)',
      }
    }
  }
}
```

### In CSS Generator

```ts
// css-generator.ts
function generateColorVariables(settings) {
  return [
    `--wp-color-primary-500: ${settings.colors.primaryColor};`,
    `--wp-color-secondary-500: ${settings.colors.secondaryColor};`,
    `--wp-text-primary: ${settings.colors.textColor};`,
  ];
}
```

### In Components

```tsx
// React component
<button
  style={{
    background: 'var(--wp-btn-primary-bg)',
    color: 'var(--wp-btn-primary-text)',
  }}
>
  Click me
</button>
```

---

## ✅ Validation Checklist

When creating new CSS variables, ask:

- [ ] Does it start with `--wp-`?
- [ ] Does it use kebab-case (lowercase with hyphens)?
- [ ] Does it follow the category-element-variant-state pattern?
- [ ] Is the name semantic (describes purpose, not appearance)?
- [ ] Is it documented in token-map.ts?
- [ ] Does it have a default value?

---

## 📚 References

- **Token Map**: `utils/token-map.ts` (Master reference)
- **CSS Variables**: `styles/globals.css`
- **CSS Generator**: `utils/css-generator.ts`
- **Tailwind Config**: `tailwind.config.cjs`

---

**Last Updated**: 2025-10-11
**Version**: 1.0.0
**Phase**: 1 - Token Integration
