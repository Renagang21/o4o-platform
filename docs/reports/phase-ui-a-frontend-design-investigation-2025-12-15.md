# Phase UI-A: Frontend UI/Design Investigation Report

**Date**: 2025-12-15
**Status**: Completed (Phase UI-A1 + UI-A2)
**Purpose**: design-core implementation input data

---

## Executive Summary

This report documents the current frontend UI/design status across the O4O Platform. The investigation focused on understanding existing patterns without evaluation or improvement suggestions.

---

## Phase UI-A1: Technical Configuration Survey

### 1. Tailwind CSS Configuration

#### 1.1 Usage Status
- **All major frontend apps use Tailwind CSS 3.4.x**
- Config approach: **per-app configuration** (not monorepo-wide)

#### 1.2 Configuration Files Found

| App | Config File | Tailwind Version |
|-----|-------------|------------------|
| admin-dashboard | tailwind.config.cjs | 3.4.17 |
| ecommerce | tailwind.config.cjs | 3.4.17 |
| main-site | (devDependency only) | 3.4.0 |

#### 1.3 CSS Variables Systems

**admin-dashboard** uses dual variable systems:
1. **--wp-* variables** (WordPress-style admin tokens)
   - `--wp-color-primary-*`, `--wp-color-secondary-*`
   - `--wp-sidebar-*`, `--wp-bg-*`, `--wp-text-*`
   - `--wp-btn-*`, `--wp-admin-*`

2. **shadcn/ui HSL variables**
   - `--background`, `--foreground`
   - `--primary`, `--secondary`, `--destructive`
   - `--card`, `--popover`, `--muted`, `--accent`
   - `--border`, `--input`, `--ring`, `--radius`

**ecommerce** uses shadcn/ui pattern only:
- Same HSL-based CSS variables
- Dark mode support via `.dark` class

### 2. Shared UI Packages

#### 2.1 @o4o/ui Package

**Location**: `packages/ui/`

**Structure**:
```
packages/ui/src/
├── ag-components/     # Antigravity Design System components
│   ├── AGButton.tsx
│   ├── AGCard.tsx
│   ├── AGInput.tsx
│   ├── AGKPIBlock.tsx
│   ├── AGModal.tsx
│   ├── AGSelect.tsx
│   ├── AGTable.tsx
│   └── AGTag.tsx
├── layout/            # Layout components
│   ├── AGAppLayout.tsx
│   ├── AGBreadcrumb.tsx
│   ├── AGContainer.tsx
│   ├── AGContent.tsx
│   ├── AGHeader.tsx
│   ├── AGPageHeader.tsx
│   ├── AGSection.tsx
│   ├── AGSidebar.tsx
│   └── AGStorefrontLayout.tsx
├── theme/
│   └── tokens.ts      # Design tokens
├── components/        # Legacy components
├── components.tsx     # Backward-compatible exports
└── index.tsx          # Main exports (shadcn-style primitives)
```

**Exported Components** (index.tsx):
- Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription
- Button (with variants: default, destructive, outline, secondary, ghost, link, primary, success)
- Alert, AlertTitle, AlertDescription
- Input, Label, Textarea, Select, Checkbox
- Badge, Tabs, Skeleton, Progress
- Dialog, DialogContent, DialogHeader, DialogTitle
- RadioGroup, RadioGroupItem, Slider
- DropdownMenu components
- ToggleGroup, ToggleGroupItem

#### 2.2 @o4o/design-system-cosmetics Package

**Location**: `packages/design-system-cosmetics/`

**Structure**:
```
packages/design-system-cosmetics/src/
├── components/
├── theme/
└── index.ts
```

**Status**: Newly created, separate from @o4o/ui

### 3. Design Tokens (@o4o/ui/src/theme/tokens.ts)

```typescript
tokens = {
  radius: { none, sm, md, lg, xl, full },
  spacing: { xs, sm, md, lg, xl, 2xl, 3xl },
  typography: { h1, h2, h3, h4, body, bodyLg, bodySm, caption, label },
  colors: { primary, success, warning, danger, neutral },
  shadows: { none, sm, md, lg, xl },
  transitions: { fast, normal, slow },
  breakpoints: { sm, md, lg, xl, 2xl }
}
```

---

## Phase UI-A1: Layout Structure Survey

### 1. Admin Dashboard Layout

#### 1.1 AdminLayout Component
**Location**: `apps/admin-dashboard/src/components/layout/AdminLayout.tsx`

**Structure**:
- WordPress-style admin layout
- Left sidebar (AdminSidebar)
- Top header (AdminHeader)
- Main content area
- Mobile responsive with sidebar backdrop

**CSS Classes**:
- `.wordpress-admin` - Main container
- `.admin-sidebar` - Left navigation
- `.wordpress-admin-content` - Main content wrapper
- `.admin-sidebar-backdrop` - Mobile overlay

#### 1.2 AG Layout Components (packages/ui/src/layout/)

**AGAppLayout**:
- Composes Header + Sidebar + Content
- Mobile menu state management
- Sidebar collapse support
- Fixed header at top (z-30)
- Fixed sidebar (z-20)

**AGSidebar**:
- Hierarchical menu (groups/sub-items)
- Active path highlighting
- Collapsible groups
- Badge support
- Desktop: w-64 (collapsed: w-16)
- Mobile: overlay mode

### 2. App-Specific Layout Patterns

| App | Left Nav | Header | Main Content |
|-----|----------|--------|--------------|
| admin-dashboard | O (vertical) | O (fixed top) | Card-based |
| ecommerce | - | - | Product-focused |
| storefront | - (consumer) | O (top) | Grid layout |

---

## Phase UI-A2: Dashboard & Icon Survey

### 1. Dashboard Component Patterns

#### 1.1 WordPress Dashboard (`WordPressDashboard.tsx`)

**Structure**:
- Welcome panel (3-column grid)
- Stats widgets (2-column grid)
- Activity feed widget
- Quick draft form widget
- KPI display pattern

**Widget Pattern**:
```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200">
  <div className="border-b border-gray-200 px-4 py-3">
    <h3 className="font-medium">{title}</h3>
  </div>
  <div className="p-4">
    {content}
  </div>
</div>
```

#### 1.2 KPI Display Pattern (AGKPIBlock)

**Features**:
- Title + Value display
- Delta/change indicator
- Color modes: positive/negative/neutral/info
- Icon support
- Trend visualization (up/down/stable)
- Loading skeleton state

**Grid Layout**:
```tsx
<AGKPIGrid columns={4}>
  <AGKPIBlock title="..." value="..." />
</AGKPIGrid>
```

### 2. Icon Usage Survey

#### 2.1 Icon Libraries Used

| Library | Import Count | Primary Usage |
|---------|--------------|---------------|
| lucide-react | ~330 files | Main icon library |
| @heroicons/react | Used in package.json | Backup/legacy |
| @mui/icons-material | Used in package.json | MUI integration |

#### 2.2 Lucide-React Usage Pattern

**Common Icons** (from WordPressDashboard.tsx):
```tsx
import {
  FileText, FileTextIcon, MessageSquare,
  BarChart3, TrendingUp, Users,
  ShoppingCart, Package
} from 'lucide-react';
```

**Icon Styling Pattern**:
```tsx
<Icon className="w-5 h-5 text-gray-600" />
<Icon className="w-4 h-4 text-green-600" />
```

#### 2.3 Icon Style Consistency

- **Primary**: Line icons (lucide-react default)
- **Size classes**: w-4/h-4, w-5/h-5, w-6/h-6
- **Color pattern**: text-{color}-{shade}
- **Fill vs Stroke**: Predominantly stroke-based (line icons)

---

## Findings Summary

### 1. Technology Stack Confirmed

| Layer | Technology |
|-------|------------|
| CSS Framework | Tailwind CSS 3.4.x |
| UI Primitives | shadcn/ui style components |
| Icon Library | lucide-react (primary) |
| State Management | zustand, react-query |
| Routing | react-router-dom v7 |

### 2. De Facto Standards Identified

1. **CSS Variables**: Dual system (--wp-* and shadcn HSL)
2. **Component Pattern**: shadcn/ui style with Tailwind classes
3. **Layout Pattern**: Fixed header + collapsible sidebar + fluid main
4. **Icon Usage**: lucide-react line icons, w-4/w-5 sizes
5. **Card Pattern**: rounded-lg, shadow-sm, border-gray-200
6. **Color Semantic**: gray/blue/green/red/orange for status

### 3. design-core Integration Points

**Can safely depend on**:
- Tailwind CSS 3.4.x
- CSS Variables (HSL pattern)
- lucide-react icons
- React 18.2.x

**Should absorb**:
- AG* components from @o4o/ui
- Design tokens from tokens.ts
- Common layout patterns

**Should not touch**:
- WordPress-style admin themes (--wp-* variables)
- App-specific CSS files
- Existing shadcn component implementations

### 4. Icon Standardization Scope

- lucide-react is already dominant (~330 files)
- Unification is **low risk** (already unified)
- Only need to document standard sizes (w-4, w-5)

---

## Next Steps

Based on this investigation:

1. **@o4o/design-core** can proceed with:
   - Token system based on existing tokens.ts
   - Component patterns matching AG* components
   - Tailwind CSS 3.4.x integration

2. **Dashboard standardization** can use:
   - AGKPIBlock/AGKPIGrid pattern
   - Widget card pattern (border, header, content)
   - lucide-react icon set

3. **No action needed** for:
   - Icon library unification (already standardized)
   - Admin layout structure (already well-defined)

---

*Report generated: 2025-12-15*
*Investigation scope: Phase UI-A1 + UI-A2*
