# Header Builder Module Specifications

## Overview
This document defines the standard functionality for each module in the Header Builder's "Select a Module" feature. Each module specification includes required (MVP) and optional (extended) features that should be available in the Inspector panel when a module is selected.

## Common Options (All Modules)

All modules should expose these common configuration options:

- **Alignment**: Left/Center/Right alignment → `block.data.alignment`
- **Visibility**: Desktop/Tablet/Mobile display toggles → `block.data.visibility`
- **Spacing**: Margin/Padding (top/right/bottom/left) → `block.data.spacing`
- **Advanced**: CSS class, ARIA label → `block.data.className`, `block.data.ariaLabel`

## Module Specifications

### 1. Logo Module

**Required Options:**
- **Logo Image**: Upload/select image → `siteIdentity.logo.url`
- **Link URL**: Click destination (default "/") → `block.data.href`

**Optional Options:**
- Retina/Mobile alternative images → `block.data.retinaUrl`
- Width in pixels → `block.data.width`

### 2. Site Title Module

**Required Options:**
- **Display Toggle**: Show/hide → `block.data.enabled`

**Optional Options:**
- **Show Tagline**: Display site tagline → `block.data.showTagline`
- Typography settings (size/weight/text-transform) → `block.data.typography`

### 3. Primary Menu Module

**Required Options:**
- **Menu Selection**: Primary menu → `block.data.menuId='primary'`

**Optional Options:**
- Dropdown styles → `block.data.style`
- Hover/Active colors → `block.data.colors`
- Mobile breakpoint → `block.data.breakpoint`

### 4. Secondary Menu Module

**Required Options:**
- **Menu Selection**: Secondary menu → `block.data.menuId='secondary'`

**Optional Options:**
- Style settings → `block.data.style`
- Item spacing → `block.data.itemGap`

### 5. Search Module

**Required Options:**
- **Display Type**: Icon only/Full input → `block.data.variant`

**Optional Options:**
- Placeholder text → `block.data.placeholder`
- Autocomplete on/off → `block.data.autocomplete`

### 6. Account Module

**Required Options:**
- **Login URL**: Path for non-logged users → `block.data.loginUrl` (default `/login`)

**Optional Options:**
- Show avatar → `block.data.showAvatar`
- Show display name → `block.data.showName`
- Dropdown alignment → `block.data.dropdownAlignment`

### 7. Role Switcher Module

**Required Options:**
- **Display Condition**: Show only for multi-role users → `block.data.condition='multi-role'`

**Optional Options:**
- Display variant (label/icon only) → `block.data.variant`

### 8. Cart Module

**Required Options:**
- **Icon Display**: Enable/disable → `block.data.enabled`

**Optional Options:**
- **Quantity Badge**: Show/hide → `block.data.showCount`
- Badge position → `block.data.badgePosition`
- Click action: Mini-cart/Cart page → `block.data.action='mini-cart'|'/cart'`

### 9. Button Module

**Required Options:**
- **Label Text** → `block.data.label`
- **Link URL** → `block.data.href`

**Optional Options:**
- Style variant: Primary/Secondary/Outline → `block.data.variant`
- Border radius → `block.data.radius`
- Padding → `block.data.padding`

### 10. HTML Module

**Required Options:**
- **HTML Code** → `block.data.html` (XSS sanitization required)

**Optional Options:**
- Wrapper CSS class → `block.data.className`

### 11. Widget Module

**Required Options:**
- **Widget Area Selection** → `block.data.widgetAreaId`

**Optional Options:**
- Show title → `block.data.showTitle`
- Item gap → `block.data.gap`

### 12. Social Icons Module

**Required Options:**
- **Network List**: Icons + URLs → `block.data.links=[{type:'facebook',url:''},...]`

**Optional Options:**
- Shape: Circle/Square → `block.data.shape`
- Size: 16-32px → `block.data.size`
- Color mode: Brand/Monochrome → `block.data.colorMode`

## Implementation Validation Matrix

Each module must pass through the following checkpoints:

1. **Admin UI (Inspector)**: Required fields exposed in UI
2. **Save Payload**: Values saved to `block.data` on customizer save
3. **Converter**: Module type correctly transformed to block structure
4. **API Response**: Block data present in `/api/v1/template-parts/area/header/active`
5. **Renderer Mapping**: Block type mapped in `TemplatePartRenderer.blockComponents`
6. **DOM/Styling**: Elements rendered with proper CSS variables/classes

## Acceptance Criteria

- All required options must be available in the UI
- Data flow must be complete: UI → Save → Convert → API → Render → DOM
- Each FAIL point requires:
  - Root cause identification
  - Specific fix recommendation (single line)

## Known Issues & Quick Fixes

### Type Mismatches
- **Issue**: `secondary-menu`, `social`, `button`, `html`, `widget` have had type/key mismatches
- **Fix**: Ensure exact match between converter type and renderer mapping key

### Missing UI Fields
- **Issue**: Required fields like Account `loginUrl`, Social Icons links not exposed
- **Fix**: Add minimum required input fields to Inspector

### Empty Data Handling
- **Issue**: Social Icons with 0 links, Logo without image
- **Fix**: Create block but apply consistent display policy (hide if no data or show placeholder)

### Visibility Not Applied
- **Issue**: `visibility` values saved but not interpreted on frontend
- **Fix**: Implement conditional rendering or class toggling at render stage

---

*Last Updated: 2025-11-05*