# Phase 3.5: Component Variable Migration - Execution Directive

**Goal**: Eliminate hardcoded/inline styles → Migrate to `--o4o-*` CSS variables
**Scope**: Button (57 instances) → Breadcrumb (62 instances)
**Date**: 2025-11-06
**Previous**: Phase 3 Mini (CSS injection standardized)

---

## Execution Steps

### 1. Component Inventory Finalization

**Create**: `/docs/APPEARANCE_COMPONENT_MAP.md`

Document all hardcoded instances with:
- File path
- Line numbers
- Current implementation (hardcoded values)
- Target CSS variable replacement

**Example format**:
```markdown
## Button Components (57 instances)

| File | Lines | Current | Target Variable |
|------|-------|---------|----------------|
| apps/main-site/src/components/common/Button.tsx | 15-20 | `bg-blue-600` | `var(--o4o-button-bg)` |
| apps/main-site/src/components/cart/AddToCart.tsx | 42 | `backgroundColor: '#007bff'` | `var(--o4o-button-bg)` |
```

**Search patterns**:
```bash
# Button hardcoding
grep -r "bg-blue\|bg-primary\|backgroundColor.*#" apps/main-site/src --include="*Button*.tsx"
grep -r "style={{.*background" apps/main-site/src --include="*.tsx"

# Breadcrumb hardcoding
grep -r "text-gray\|color.*#" apps/main-site/src --include="*Breadcrumb*.tsx"
grep -r "breadcrumb.*style" apps/main-site/src --include="*.tsx" -A 5
```

---

### 2. Replacement Principles

**CSS Variable Mapping**:

| Component | Property | Legacy Variable | Standard Variable | Fallback |
|-----------|----------|----------------|-------------------|----------|
| Button | Background | `--button-primary-bg` | `--o4o-button-bg` | `#007bff` |
| Button | Text | `--button-primary-text` | `--o4o-button-text` | `#ffffff` |
| Button | Border | `--button-primary-border` | `--o4o-button-border` | `#007bff` |
| Button | Hover BG | `--button-primary-bg-hover` | `--o4o-button-bg-hover` | `#0056b3` |
| Breadcrumb | Text | `--breadcrumb-text-color` | `--o4o-breadcrumb-text` | `#6c757d` |
| Breadcrumb | Link | `--breadcrumb-link-color` | `--o4o-breadcrumb-link` | `#007bff` |
| Breadcrumb | Separator | `--breadcrumb-separator-color` | `--o4o-breadcrumb-separator` | `#6c757d` |

**Replacement Strategy**:

**Before** (hardcoded):
```tsx
// Tailwind hardcoding
<button className="bg-blue-600 hover:bg-blue-700 text-white">

// Inline style hardcoding
<button style={{ backgroundColor: '#007bff', color: '#fff' }}>

// Mixed
<button className="px-4 py-2" style={{ background: colors.primary }}>
```

**After** (CSS variables):
```tsx
// Use CSS variables with fallback
<button
  className="px-4 py-2"
  style={{
    backgroundColor: 'var(--o4o-button-bg, #007bff)',
    color: 'var(--o4o-button-text, #ffffff)'
  }}
>

// Or create utility class (preferred)
<button className="btn-primary">
```

**Utility CSS** (add to `apps/main-site/src/index.css` or component CSS):
```css
.btn-primary {
  background-color: var(--o4o-button-bg, #007bff);
  color: var(--o4o-button-text, #ffffff);
  border: 1px solid var(--o4o-button-border, #007bff);
}

.btn-primary:hover {
  background-color: var(--o4o-button-bg-hover, #0056b3);
}

.breadcrumb-link {
  color: var(--o4o-breadcrumb-link, #007bff);
}

.breadcrumb-separator {
  color: var(--o4o-breadcrumb-separator, #6c757d);
}
```

**Legacy Compatibility**:
- Keep legacy variables (`--button-*`, `--breadcrumb-*`) for **fallback only**
- Phase 4 will remove legacy aliases
- Use `@deprecated` comments on legacy variable usage

---

### 3. Injection Path Verification

**Ensure no direct style injection**:
```tsx
// ❌ BAD - Direct DOM manipulation
document.head.appendChild(styleEl);

// ❌ BAD - Component-level style injection
<style>{`.btn { background: ${color} }`}</style>

// ✅ GOOD - Use existing GlobalStyleInjector
// All CSS variables injected via:
// - injectCSS(coreCSS, STYLE_IDS.APPEARANCE_SYSTEM)
// - Legacy: document.getElementById('customizer-global-css')
```

**If found, mark as deprecated**:
```tsx
/**
 * @deprecated Phase 3.5 - Use GlobalStyleInjector with CSS variables instead
 * This component-level style injection will be removed in Phase 4
 */
```

---

### 4. Validation

**Build & Type Check**:
```bash
pnpm run build:packages
pnpm run type-check:frontend
pnpm run build:main-site
```

**Manual Testing** (3 pages):
1. **Home**: Button hover/active states
2. **Category**: Breadcrumb navigation + button consistency
3. **Product Detail**: Add-to-cart button + breadcrumbs

**Visual Regression Check**:
- Take screenshots BEFORE migration
- Compare AFTER migration
- No color/spacing/hover state changes

**Snapshot Tests** (optional, time permitting):
```typescript
// apps/main-site/src/components/__tests__/Button.visual.test.tsx
import { render } from '@testing-library/react';
import { Button } from '../common/Button';

describe('Button Visual Regression', () => {
  it('renders primary button with CSS variables', () => {
    const { container } = render(<Button variant="primary">Click</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

---

### 5. Commit & PR Strategy

**Commits** (separate for clarity):
```bash
# 1. Button migration
git add apps/main-site/src/components/**/*Button*.tsx
git commit -m "refactor(appearance): migrate Button to CSS variables (57 instances)

- Replace hardcoded bg-blue-*, backgroundColor with var(--o4o-button-*)
- Add .btn-primary utility class for consistency
- Maintain legacy variable fallbacks for backward compatibility
- No visual changes (verified manually on 3 pages)

Refs: Phase 3.5 - Component Variable Migration
"

# 2. Breadcrumb migration
git add apps/main-site/src/components/**/*Breadcrumb*.tsx
git commit -m "refactor(appearance): migrate Breadcrumb to CSS variables (62 instances)

- Replace hardcoded text-gray-*, color with var(--o4o-breadcrumb-*)
- Add .breadcrumb-link, .breadcrumb-separator utility classes
- Maintain legacy variable fallbacks
- No visual changes (verified manually)

Refs: Phase 3.5 - Component Variable Migration
"

# 3. Documentation update
git add docs/APPEARANCE_COMPONENT_MAP.md
git commit -m "docs(appearance): update COMPONENT_MAP after Phase 3.5 migration

- Documented 57 Button instances → migrated
- Documented 62 Breadcrumb instances → migrated
- Added utility class reference

Refs: Phase 3.5
"
```

**Pull Request**:
```markdown
## Phase 3.5 – Component Variable Migration (Button, Breadcrumb)

### Summary
- ✅ Migrated 57 Button components to `--o4o-button-*` CSS variables
- ✅ Migrated 62 Breadcrumb components to `--o4o-breadcrumb-*` CSS variables
- ✅ Added utility classes (.btn-primary, .breadcrumb-link, etc.)
- ✅ Zero visual regressions (manually verified on 3 pages)
- ✅ Backward compatible (legacy variables maintained as fallbacks)

### Files Changed
- 119 component files updated
- 1 utility CSS file added/updated
- 1 documentation file created

### Testing
- [x] Build & type check passed
- [x] Manual verification on Home, Category, Product pages
- [x] No console errors/warnings
- [x] Legacy variable fallbacks work correctly

### Screenshots
[Attach before/after comparison if significant changes]

### Related
- Phase 3 Mini: #XXX
- APPEARANCE_CLEANUP_PLAN.md
```

---

## Definition of Done (DoD)

- [ ] **Component Map**: `APPEARANCE_COMPONENT_MAP.md` created with all 119 instances documented
- [ ] **Button Migration**: 57 Button components use `var(--o4o-button-*)` instead of hardcoded values
- [ ] **Breadcrumb Migration**: 62 Breadcrumb components use `var(--o4o-breadcrumb-*)` instead of hardcoded values
- [ ] **Utility Classes**: Created `.btn-primary`, `.breadcrumb-link`, `.breadcrumb-separator` classes
- [ ] **Build Success**: `pnpm run build:main-site` passes without errors
- [ ] **Type Check**: `pnpm run type-check:frontend` passes
- [ ] **Visual Regression**: Zero visual changes confirmed on 3 pages (Home, Category, Product)
- [ ] **Console Clean**: No CSS-related errors/warnings in browser console
- [ ] **Legacy Compat**: Legacy variables work as fallbacks
- [ ] **Documentation**: All changes documented in COMPONENT_MAP
- [ ] **Commits**: 3 clean commits (Button, Breadcrumb, Docs) with proper messages
- [ ] **PR Created**: Pull request with summary, screenshots, testing checklist

---

## Timeline Estimate

- **Inventory**: 30 min (grep + documentation)
- **Button Migration**: 1.5 hours (57 files)
- **Breadcrumb Migration**: 1.5 hours (62 files)
- **Utility CSS**: 15 min
- **Build & Test**: 30 min
- **Documentation**: 15 min
- **Total**: ~4 hours

---

## Rollback Plan

If visual regressions discovered:

1. **Quick Fix**: Revert specific component
   ```tsx
   // Temporarily restore hardcoded value
   backgroundColor: '#007bff' // TODO: Fix CSS variable priority issue
   ```

2. **Full Rollback**: Revert PR merge
   ```bash
   git revert <pr-merge-commit>
   git push origin main
   ./scripts/deploy-main-site.sh
   ```

3. **Debug**: CSS variable not applying
   - Check DevTools → Computed styles → CSS variable value
   - Verify GlobalStyleInjector injected styles
   - Check CSS specificity conflicts

---

## Next Phase Preview

**Phase 4**: Legacy Variable Cleanup
- Remove `--button-*`, `--breadcrumb-*` aliases
- Enforce `--o4o-*` naming standard
- Update linting rules to prevent legacy variable usage

**Phase 5**: Documentation & Testing Formalization
- Comprehensive visual regression test suite
- Storybook integration for component showcase
- Linting rules for hardcoded color prevention

---

**Status**: Ready for execution
**Assignee**: Code Agent
**Priority**: High (completes Appearance System standardization)
