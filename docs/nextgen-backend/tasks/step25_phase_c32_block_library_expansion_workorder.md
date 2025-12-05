# Step 25 — Phase C-3.2: Block Library Expansion Work Order

**Status**: 🟡 Ready to Start
**Phase**: C-3.2 (Visual Designer — Block Library)
**Priority**: P0 (Critical Path)
**Estimated Duration**: 4-6 hours
**Target**: Transform Designer into Production-Grade No-Code Builder

---

## Executive Summary

Expand the Visual Designer from a layout engine to a **complete no-code web builder** by adding 40 essential UI blocks across 4 categories. This phase elevates the Designer to **Webflow/Framer-level** functionality, enabling admins to create:

- Landing pages
- Marketing pages
- Blog/CMS pages
- Product pages
- Event pages
- Educational content

...all through drag-and-drop, without writing code.

**Current State**: Designer has robust D&D engine, layout system, and core infrastructure (100% complete from Phase C-3.1)

**Target State**: Designer has comprehensive block library enabling real-world page creation

---

## Strategic Context

### Why This Matters

Phase C-3.2 is the **product completion phase**. Without a rich block library, the Designer is just an engine. With 40 blocks, it becomes a **production tool** that:

1. Replaces manual HTML/CSS coding
2. Empowers non-technical staff
3. Accelerates page creation by 10x
4. Ensures brand consistency
5. Reduces developer dependency

### Success Criteria

- ✅ 40 blocks available in Palette
- ✅ All blocks render correctly in Canvas
- ✅ All block props editable in Inspector
- ✅ JSON Adapter handles all blocks
- ✅ ViewRenderer displays all blocks on frontend
- ✅ Zero TypeScript errors
- ✅ Production deployment ready

---

## Block Library Overview (40 Blocks)

### A. Basic Blocks (9 blocks)

**Purpose**: Core content elements
**Location**: `designer/blocks/basic/`

| # | Block Name | Description | Props |
|---|------------|-------------|-------|
| 1 | Text | Simple text paragraph | text, align, color, size |
| 2 | Heading | H1-H6 headings | text, level, align, color |
| 3 | RichText | Formatted text (bold, italic, links) | html, maxWidth |
| 4 | Button | CTA button | text, href, variant, size |
| 5 | Divider | Horizontal line | width, color, spacing |
| 6 | Spacer | Vertical spacing | height |
| 7 | IconText | Icon + text row | icon, text, align |
| 8 | Badge | Label/tag | text, color, size |
| 9 | Quote | Blockquote | text, author, cite |

**Priority**: P0 (Required for all pages)

---

### B. Layout Blocks (10 blocks)

**Purpose**: Page structure and containers
**Location**: `designer/blocks/layout/`

| # | Block Name | Description | Props |
|---|------------|-------------|-------|
| 10 | Section | Full-width container | bgColor, padding, maxWidth |
| 11 | Container | Centered content wrapper | maxWidth, padding |
| 12 | Hero | Simple hero section | title, subtitle, cta |
| 13 | HeroImage | Hero with background image | title, subtitle, image, cta |
| 14 | TwoColumn | Text + Image side-by-side | textLeft, image, reverse |
| 15 | ThreeColumn | 3-column grid | items[], align |
| 16 | BulletList | Icon + text list | items[], icon |
| 17 | CenteredColumn | Centered narrow column | maxWidth, content |
| 18 | SidebarLayout | Main + sidebar | mainContent, sidebar, position |
| 19 | Card | Bordered card container | padding, shadow, rounded |

**Priority**: P0 (Essential for structure)

---

### C. Marketing Blocks (12 blocks)

**Purpose**: Conversion-focused components
**Location**: `designer/blocks/marketing/`

| # | Block Name | Description | Props |
|---|------------|-------------|-------|
| 20 | FeatureGrid | Multi-item feature showcase | items[], columns |
| 21 | Testimonial | Single testimonial | quote, author, avatar |
| 22 | TestimonialGrid | Multiple testimonials | items[], columns |
| 23 | PricingCard | Single pricing tier | title, price, features[], cta |
| 24 | PricingGrid | Multiple pricing tiers | items[], highlight |
| 25 | FAQ | Accordion FAQ | items[] |
| 26 | CTA | Call-to-action section | title, text, cta |
| 27 | StatsCounter | Metric display | items[] |
| 28 | ImageCaption | Image with caption | image, caption |
| 29 | TeamMember | Profile card | name, role, avatar, bio |
| 30 | Timeline | Event timeline | items[] |
| 31 | StepGuide | Step-by-step guide | steps[] |

**Priority**: P1 (High-value for marketing pages)

---

### D. CMS-Driven Blocks (9 blocks)

**Purpose**: Dynamic content from CMS
**Location**: `designer/blocks/cms/`

| # | Block Name | Description | Props |
|---|------------|-------------|-------|
| 32 | CPTList | List of posts/items | cptType, limit, layout |
| 33 | CPTItem | Single item detail | cptType, slug, layout |
| 34 | CategoryList | Category navigation | cptType, style |
| 35 | RelatedItems | Related content | cptType, limit |
| 36 | RecentItems | Latest posts | cptType, limit |
| 37 | Pagination | Page navigation | totalPages, current |
| 38 | SearchBar | Search input | placeholder, cptType |
| 39 | Breadcrumb | Navigation breadcrumb | items[] |
| 40 | DynamicHero | CMS-based hero | cptType, field |

**Priority**: P1 (Critical for CMS-driven pages)

---

## Technical Specification

### Block Structure Standard

Every block must follow this JSON schema:

```typescript
interface Block {
  id: string;              // Auto-generated UUID
  type: string;            // Block type name
  props: Record<string, any>; // Serializable props
  children?: Block[];      // Optional nested blocks
}
```

**Example**:
```json
{
  "id": "block_abc123",
  "type": "Hero",
  "props": {
    "title": "Welcome to O4O",
    "subtitle": "Transform your business",
    "ctaText": "Get Started",
    "ctaHref": "/signup",
    "bgColor": "#1a202c"
  },
  "children": []
}
```

---

### Implementation Requirements

Each block requires **2 files**:

#### 1. Component File

**Path**: `apps/admin-dashboard/src/pages/cms/designer/blocks/<category>/<BlockName>.tsx`

**Purpose**: Canvas rendering (preview)

**Template**:
```typescript
import React from 'react';

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
  bgColor?: string;
}

export default function Hero({
  title,
  subtitle,
  ctaText,
  ctaHref,
  bgColor = '#1a202c',
}: HeroProps) {
  return (
    <div
      className="py-20 px-6 text-center"
      style={{ backgroundColor: bgColor }}
    >
      <h1 className="text-4xl font-bold text-white mb-4">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xl text-gray-300 mb-8">
          {subtitle}
        </p>
      )}
      {ctaText && (
        <a
          href={ctaHref}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {ctaText}
        </a>
      )}
    </div>
  );
}
```

#### 2. Schema File

**Path**: `apps/admin-dashboard/src/pages/cms/designer/blocks/<category>/<BlockName>.schema.ts`

**Purpose**: Palette + Inspector configuration

**Template**:
```typescript
import { ComponentDefinition } from '../../types/designer.types';

export const HeroSchema: ComponentDefinition = {
  type: 'Hero',
  category: 'layout',
  label: 'Hero Section',
  icon: 'Sparkles', // lucide-react icon name
  description: 'Simple hero section with title, subtitle, and CTA',

  defaultProps: {
    title: 'Welcome to Our Site',
    subtitle: 'Discover amazing features',
    ctaText: 'Get Started',
    ctaHref: '#',
    bgColor: '#1a202c',
  },

  inspectorConfig: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'text',
    },
    {
      name: 'ctaText',
      label: 'CTA Text',
      type: 'text',
    },
    {
      name: 'ctaHref',
      label: 'CTA Link',
      type: 'text',
    },
    {
      name: 'bgColor',
      label: 'Background Color',
      type: 'color',
    },
  ],

  allowsChildren: false,
  maxChildren: 0,
};
```

---

## Integration Work

### 1. Palette Update

**File**: `apps/admin-dashboard/src/pages/cms/designer/components/Palette.tsx`

**Add 4 Sections**:
```typescript
const BLOCK_CATEGORIES = [
  {
    id: 'basic',
    label: 'Basic',
    icon: 'Type',
    blocks: [
      'Text',
      'Heading',
      'RichText',
      'Button',
      // ... 9 blocks
    ],
  },
  {
    id: 'layout',
    label: 'Layout',
    icon: 'Layout',
    blocks: [
      'Section',
      'Container',
      'Hero',
      // ... 10 blocks
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'TrendingUp',
    blocks: [
      'FeatureGrid',
      'PricingCard',
      'FAQ',
      // ... 12 blocks
    ],
  },
  {
    id: 'cms',
    label: 'CMS',
    icon: 'Database',
    blocks: [
      'CPTList',
      'CPTItem',
      'CategoryList',
      // ... 9 blocks
    ],
  },
];
```

**UI Enhancements**:
- Collapsible sections
- Search/filter blocks
- Icon + label display
- Drag handle on each block

---

### 2. Inspector Enhancement

**File**: `apps/admin-dashboard/src/pages/cms/designer/components/Inspector.tsx`

**Add Field Types**:
```typescript
const FIELD_TYPES = {
  text: TextInput,
  number: NumberInput,
  boolean: Switch,
  select: Dropdown,
  color: ColorPicker,
  image: ImagePicker,
  textarea: Textarea,
  richtext: RichTextEditor,
  array: ArrayEditor, // For items[]
};
```

**Array Editor** (for FeatureGrid.items, FAQ.items, etc):
```typescript
function ArrayEditor({ value, onChange, itemSchema }) {
  return (
    <div>
      {value.map((item, index) => (
        <div key={index} className="border p-4 mb-2 rounded">
          {itemSchema.map(field => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={item[field.name]}
              onChange={(newValue) => {
                const newItems = [...value];
                newItems[index][field.name] = newValue;
                onChange(newItems);
              }}
            />
          ))}
          <button onClick={() => removeItem(index)}>Remove</button>
        </div>
      ))}
      <button onClick={addItem}>Add Item</button>
    </div>
  );
}
```

---

### 3. Component Registry

**File**: `apps/admin-dashboard/src/pages/cms/designer/config/componentRegistry.ts`

**Update Registry**:
```typescript
import { HeroSchema } from '../blocks/layout/Hero.schema';
import { FeatureGridSchema } from '../blocks/marketing/FeatureGrid.schema';
// ... import all 40 schemas

export const COMPONENT_REGISTRY: Record<string, ComponentDefinition> = {
  // Basic
  Text: TextSchema,
  Heading: HeadingSchema,
  // ... 9 basic blocks

  // Layout
  Section: SectionSchema,
  Hero: HeroSchema,
  // ... 10 layout blocks

  // Marketing
  FeatureGrid: FeatureGridSchema,
  PricingCard: PricingCardSchema,
  // ... 12 marketing blocks

  // CMS
  CPTList: CPTListSchema,
  CPTItem: CPTItemSchema,
  // ... 9 CMS blocks
};

export function getComponentDefinition(type: string): ComponentDefinition | null {
  return COMPONENT_REGISTRY[type] || null;
}

export function getAllComponents(): ComponentDefinition[] {
  return Object.values(COMPONENT_REGISTRY);
}

export function getComponentsByCategory(category: string): ComponentDefinition[] {
  return getAllComponents().filter(comp => comp.category === category);
}
```

---

### 4. Canvas Renderer

**File**: `apps/admin-dashboard/src/pages/cms/designer/components/Canvas.tsx`

**Dynamic Component Loading**:
```typescript
import Hero from '../blocks/layout/Hero';
import FeatureGrid from '../blocks/marketing/FeatureGrid';
// ... import all 40 components

const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  Hero,
  FeatureGrid,
  // ... 40 components
};

function renderNode(node: DesignerNode) {
  const Component = COMPONENT_MAP[node.type];
  if (!Component) {
    return <div>Unknown component: {node.type}</div>;
  }

  return (
    <Component {...node.props}>
      {node.children?.map(child => renderNode(child))}
    </Component>
  );
}
```

---

### 5. JSON Adapter Enhancement

**File**: `apps/admin-dashboard/src/pages/cms/designer/core/jsonAdapter.ts`

**No changes needed** — already handles arbitrary block types through generic conversion.

**Verify**: Test with all 40 block types to ensure proper serialization.

---

### 6. Frontend ViewRenderer Integration

**File**: `apps/main-site/src/components/registry/ui.ts`

**Add Block Components**:
```typescript
// Import all blocks
import Hero from '../blocks/layout/Hero';
import FeatureGrid from '../blocks/marketing/FeatureGrid';
// ... all 40

export const UI_REGISTRY = {
  Hero,
  FeatureGrid,
  CPTList,
  // ... 40 blocks
};
```

**File**: `apps/main-site/src/view/renderer.tsx`

**Ensure Dynamic Rendering**:
```typescript
export function renderViewComponent(component: ViewComponent) {
  const Component = UI_REGISTRY[component.type];
  if (!Component) {
    console.warn(`Unknown component type: ${component.type}`);
    return null;
  }

  return <Component {...component.props} />;
}
```

---

## Development Plan

### Phase 1: Basic Blocks (1 hour)

**Priority**: P0 (Required first)

**Tasks**:
1. Create `designer/blocks/basic/` directory
2. Implement 9 basic blocks:
   - Text
   - Heading
   - RichText
   - Button
   - Divider
   - Spacer
   - IconText
   - Badge
   - Quote
3. Create `.schema.ts` for each
4. Test in Canvas + Inspector

**Deliverable**: 9 basic blocks working in Designer

---

### Phase 2: Layout Blocks (1.5 hours)

**Priority**: P0 (Essential structure)

**Tasks**:
1. Create `designer/blocks/layout/` directory
2. Implement 10 layout blocks:
   - Section
   - Container
   - Hero
   - HeroImage
   - TwoColumn
   - ThreeColumn
   - BulletList
   - CenteredColumn
   - SidebarLayout
   - Card
3. Create `.schema.ts` for each
4. Test complex layouts (nested sections)

**Deliverable**: 10 layout blocks working in Designer

---

### Phase 3: Marketing Blocks (1.5 hours)

**Priority**: P1 (High value)

**Tasks**:
1. Create `designer/blocks/marketing/` directory
2. Implement 12 marketing blocks:
   - FeatureGrid
   - Testimonial
   - TestimonialGrid
   - PricingCard
   - PricingGrid
   - FAQ
   - CTA
   - StatsCounter
   - ImageCaption
   - TeamMember
   - Timeline
   - StepGuide
3. Create `.schema.ts` for each
4. Handle array props (items[])

**Deliverable**: 12 marketing blocks working in Designer

---

### Phase 4: CMS Blocks (1 hour)

**Priority**: P1 (CMS integration)

**Tasks**:
1. Create `designer/blocks/cms/` directory
2. Implement 9 CMS blocks:
   - CPTList
   - CPTItem
   - CategoryList
   - RelatedItems
   - RecentItems
   - Pagination
   - SearchBar
   - Breadcrumb
   - DynamicHero
3. Integrate with CMS API
4. Test with real data

**Deliverable**: 9 CMS blocks working with API

---

### Phase 5: Integration & Polish (1 hour)

**Tasks**:
1. Update Palette with all 40 blocks
2. Add search/filter to Palette
3. Enhance Inspector for array fields
4. Update component registry
5. Test end-to-end workflow:
   - Create page with mix of blocks
   - Edit props
   - Save to CMS
   - Preview on frontend
6. Fix bugs
7. Write tests

**Deliverable**: Fully integrated Designer with 40 blocks

---

## Testing Checklist

### Unit Tests (Per Block)
- [ ] Block renders in Canvas
- [ ] Props are editable in Inspector
- [ ] Default props load correctly
- [ ] Changes trigger state update
- [ ] JSON serialization works

### Integration Tests
- [ ] All 40 blocks appear in Palette
- [ ] Search/filter in Palette works
- [ ] Drag-and-drop from Palette to Canvas
- [ ] Nested blocks work (Section > Row > Column > Text)
- [ ] Array props (items[]) editable
- [ ] Save to CMS creates valid JSON
- [ ] Preview renders all blocks
- [ ] Frontend ViewRenderer displays all blocks

### Edge Cases
- [ ] Empty props handled
- [ ] Missing images handled
- [ ] Invalid URLs handled
- [ ] Large arrays (100+ items)
- [ ] Deep nesting (5+ levels)

### Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Definition of Done (DoD)

### Functionality
- [ ] 40 blocks implemented and working
- [ ] All blocks in Palette with correct icons
- [ ] All blocks render in Canvas
- [ ] All props editable in Inspector
- [ ] Array props (items[]) fully functional
- [ ] Save creates valid CMS View JSON
- [ ] Preview shows correct rendering
- [ ] Frontend ViewRenderer displays all blocks

### Code Quality
- [ ] Zero TypeScript errors
- [ ] Zero console warnings
- [ ] Consistent code style
- [ ] All blocks have schema files
- [ ] Comments on complex logic

### Integration
- [ ] Component Registry updated
- [ ] Palette organized by category
- [ ] Inspector handles all field types
- [ ] JSON Adapter validates all blocks
- [ ] ViewRenderer renders all blocks

### Documentation
- [ ] Block library documentation
- [ ] Usage examples for each category
- [ ] API documentation updated
- [ ] Completion report written

### Deployment
- [ ] Admin dashboard builds successfully
- [ ] Main site builds successfully
- [ ] No production errors
- [ ] Performance acceptable (<3s load)

---

## File Structure

```
apps/admin-dashboard/src/pages/cms/designer/
├── blocks/
│   ├── basic/
│   │   ├── Text.tsx
│   │   ├── Text.schema.ts
│   │   ├── Heading.tsx
│   │   ├── Heading.schema.ts
│   │   └── ... (9 blocks)
│   ├── layout/
│   │   ├── Hero.tsx
│   │   ├── Hero.schema.ts
│   │   ├── Section.tsx
│   │   ├── Section.schema.ts
│   │   └── ... (10 blocks)
│   ├── marketing/
│   │   ├── FeatureGrid.tsx
│   │   ├── FeatureGrid.schema.ts
│   │   ├── PricingCard.tsx
│   │   ├── PricingCard.schema.ts
│   │   └── ... (12 blocks)
│   └── cms/
│       ├── CPTList.tsx
│       ├── CPTList.schema.ts
│       ├── CPTItem.tsx
│       ├── CPTItem.schema.ts
│       └── ... (9 blocks)
├── components/
│   ├── Palette.tsx (updated)
│   ├── Inspector.tsx (updated)
│   └── Canvas.tsx (updated)
├── config/
│   └── componentRegistry.ts (updated)
└── core/
    └── jsonAdapter.ts (verified)

apps/main-site/src/
├── components/
│   ├── blocks/
│   │   ├── basic/ (9 blocks)
│   │   ├── layout/ (10 blocks)
│   │   ├── marketing/ (12 blocks)
│   │   └── cms/ (9 blocks)
│   └── registry/
│       └── ui.ts (updated)
└── view/
    └── renderer.tsx (verified)
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Too many blocks overwhelm Palette UI | Medium | Medium | Add search, categories, collapse |
| Array editor complex | Medium | High | Use tested pattern from existing code |
| Performance issues with 40 blocks | Low | Medium | Lazy load, virtualization if needed |
| CMS blocks depend on API availability | Low | High | Mock data for testing, fallback UI |
| TypeScript errors from complex props | Medium | Medium | Strict typing, validation |

**Overall Risk**: 🟡 Medium (manageable with proper planning)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Blocks implemented | 40 | Count in Palette |
| TypeScript errors | 0 | Build output |
| Test coverage | >70% | Jest report |
| Page load time | <3s | Lighthouse |
| Designer UX rating | >4/5 | User feedback |
| Bug count | <5 | Issue tracker |

---

## Timeline

| Phase | Tasks | Duration | Cumulative |
|-------|-------|----------|------------|
| Phase 1 | Basic Blocks (9) | 1h | 1h |
| Phase 2 | Layout Blocks (10) | 1.5h | 2.5h |
| Phase 3 | Marketing Blocks (12) | 1.5h | 4h |
| Phase 4 | CMS Blocks (9) | 1h | 5h |
| Phase 5 | Integration & Polish | 1h | 6h |

**Total Estimate**: 4-6 hours

**Buffer**: Add 2h for unforeseen issues → **Total: 6-8 hours**

---

## Next Actions

### Immediate (Ready to Start)
1. Create directory structure for blocks
2. Start with Phase 1: Basic Blocks (highest priority)
3. Implement Text, Heading, Button first (most commonly used)

### After Completion
1. Phase C-3.3: Advanced Features (templates, presets, bulk operations)
2. Phase C-3.4: Mobile responsive preview
3. Phase C-3.5: A/B testing integration

---

## Appendix: Example Block Implementations

### A. Simple Block (Text)

**Text.tsx**:
```typescript
interface TextProps {
  text: string;
  align?: 'left' | 'center' | 'right';
  color?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl';
}

export default function Text({ text, align = 'left', color = '#000', size = 'base' }: TextProps) {
  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <p
      className={`${sizeClasses[size]}`}
      style={{ textAlign: align, color }}
    >
      {text}
    </p>
  );
}
```

**Text.schema.ts**:
```typescript
export const TextSchema: ComponentDefinition = {
  type: 'Text',
  category: 'basic',
  label: 'Text',
  icon: 'Type',
  defaultProps: {
    text: 'Enter your text here',
    align: 'left',
    color: '#000000',
    size: 'base',
  },
  inspectorConfig: [
    { name: 'text', label: 'Text', type: 'textarea', required: true },
    { name: 'align', label: 'Alignment', type: 'select', options: ['left', 'center', 'right'] },
    { name: 'color', label: 'Color', type: 'color' },
    { name: 'size', label: 'Size', type: 'select', options: ['sm', 'base', 'lg', 'xl'] },
  ],
  allowsChildren: false,
};
```

---

### B. Complex Block (FeatureGrid)

**FeatureGrid.tsx**:
```typescript
interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeatureGridProps {
  items: Feature[];
  columns?: 2 | 3 | 4;
}

export default function FeatureGrid({ items, columns = 3 }: FeatureGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-8`}>
      {items.map((item, index) => (
        <div key={index} className="text-center">
          <div className="text-4xl mb-4">{item.icon}</div>
          <h3 className="text-xl font-bold mb-2">{item.title}</h3>
          <p className="text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
```

**FeatureGrid.schema.ts**:
```typescript
export const FeatureGridSchema: ComponentDefinition = {
  type: 'FeatureGrid',
  category: 'marketing',
  label: 'Feature Grid',
  icon: 'Grid',
  defaultProps: {
    columns: 3,
    items: [
      { icon: '⚡', title: 'Fast', description: 'Lightning fast performance' },
      { icon: '🔒', title: 'Secure', description: 'Enterprise-grade security' },
      { icon: '🎯', title: 'Accurate', description: 'Precision targeting' },
    ],
  },
  inspectorConfig: [
    {
      name: 'columns',
      label: 'Columns',
      type: 'select',
      options: [2, 3, 4],
    },
    {
      name: 'items',
      label: 'Features',
      type: 'array',
      itemSchema: [
        { name: 'icon', label: 'Icon', type: 'text' },
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'description', label: 'Description', type: 'textarea', required: true },
      ],
    },
  ],
  allowsChildren: false,
};
```

---

### C. CMS Block (CPTList)

**CPTList.tsx**:
```typescript
interface CPTListProps {
  cptType: string;
  limit?: number;
  layout?: 'grid' | 'list';
}

export default function CPTList({ cptType, limit = 10, layout = 'grid' }: CPTListProps) {
  // In Canvas, show placeholder
  // In frontend, fetch actual data

  return (
    <div className={layout === 'grid' ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>
      {Array.from({ length: limit }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="h-40 bg-gray-200 rounded mb-2"></div>
          <h3 className="font-bold">Item {i + 1}</h3>
          <p className="text-sm text-gray-600">Preview of {cptType}</p>
        </div>
      ))}
    </div>
  );
}
```

**CPTList.schema.ts**:
```typescript
export const CPTListSchema: ComponentDefinition = {
  type: 'CPTList',
  category: 'cms',
  label: 'Post List',
  icon: 'List',
  defaultProps: {
    cptType: 'blog',
    limit: 10,
    layout: 'grid',
  },
  inspectorConfig: [
    { name: 'cptType', label: 'Content Type', type: 'select', options: ['blog', 'product', 'event'] },
    { name: 'limit', label: 'Limit', type: 'number', min: 1, max: 50 },
    { name: 'layout', label: 'Layout', type: 'select', options: ['grid', 'list'] },
  ],
  allowsChildren: false,
  requiresCMS: true, // Special flag for CMS blocks
};
```

---

## Conclusion

Phase C-3.2 transforms the Visual Designer from a **layout engine** into a **complete no-code builder**. With 40 blocks across 4 categories, users can create:

- Marketing landing pages
- Blog/CMS content pages
- Product showcases
- Event pages
- Educational content

...without writing a single line of code.

**Status**: 🟢 Ready to Start
**Next Step**: Begin Phase 1 (Basic Blocks)

---

**Prepared By**: Claude
**Date**: 2025-12-04
**Phase**: C-3.2 (Block Library Expansion)
**Estimated Completion**: 6-8 hours

---

*Let's build a world-class no-code web builder.*
