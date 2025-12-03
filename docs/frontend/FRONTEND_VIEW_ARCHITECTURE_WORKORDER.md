# Frontend Complete Re-Architecture: View-Based Structure Work Order

**Status**: 🚀 Ready to Execute (API Foundation Complete)
**Start Date**: 2025-12-03
**Target Completion**: 2025-02-01 (2 months)
**Priority**: 🔥 Critical - Foundation for AI-Native Platform

---

## 🎯 Strategic Context

With Phase B-3 (Commerce + Dropshipping NextGen V2 API) now merged to `develop`, we have established the API foundation required for a complete frontend architectural transformation.

### Why This Re-Architecture is Critical

**Current State (Legacy)**:
- ❌ Page-based structure (복잡한 Page entity, metadata, revision system)
- ❌ Theme system (multiple themes, theme switching logic)
- ❌ Block Editor (Gutenberg-like 복잡한 block 편집 시스템)
- ❌ Shortcode dependency (PHP-style shortcode parsing)
- ❌ Tight coupling between content and presentation

**Target State (NextGen AI-Native)**:
- ✅ View-based structure (단순하고 명확한 View Schema)
- ✅ AI Page Generator first (AI가 View JSON을 직접 생성)
- ✅ Component Registry (명확한 컴포넌트 카탈로그)
- ✅ Functional Components (shortcode → 재사용 가능한 React 컴포넌트)
- ✅ Separation of concerns (data, layout, components)
- ✅ Type-safe View rendering
- ✅ Simplified Header/Footer (불필요한 복잡도 제거)

---

## 📋 Work Order Overview

### Phase 1: View Schema & Renderer (Week 1-2)
- Step 1: Define View Schema
- Step 2: Implement ViewRenderer
- Step 3: Create View validation & type safety

### Phase 2: Component Migration (Week 3-4)
- Step 4: Build Component Registry
- Step 5: Migrate Shortcodes to Functional Components
- Step 6: Create Component Catalog UI

### Phase 3: AI Page Generator Integration (Week 5-6)
- Step 7: Connect AI Page Generator to View Schema
- Step 8: Implement View preview system
- Step 9: Add View editing capabilities

### Phase 4: Legacy Removal (Week 7-8)
- Step 10: Remove Page entity and routes
- Step 11: Remove Theme system
- Step 12: Remove Block Editor
- Step 13: Refactor Header/Footer to simple components
- Step 14: Clean up unused code and dependencies

---

## 📐 Step 1: Define View Schema (Week 1 - Day 1-2)

### Objective
Create a TypeScript-first View Schema that defines the structure of all pages/views in the platform.

### Tasks

**1.1 Create View Schema Types**

**File**: `apps/main-site/src/types/view.ts`

```typescript
/**
 * View Schema - Core Definition
 * AI Page Generator will generate JSON conforming to this schema
 */

export type ViewType =
  | 'landing'      // Landing page with hero + sections
  | 'article'      // Article/blog post view
  | 'product'      // Product detail page
  | 'dashboard'    // User dashboard
  | 'custom';      // Custom layout

export type ComponentType =
  | 'hero'
  | 'feature-grid'
  | 'cta'
  | 'testimonial'
  | 'pricing'
  | 'product-list'
  | 'article-content'
  | 'contact-form'
  | 'image-gallery'
  | 'video-embed'
  | 'custom';

export interface ViewComponent {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  children?: ViewComponent[];
  style?: ComponentStyle;
}

export interface ComponentStyle {
  layout?: 'full' | 'contained' | 'narrow';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: string;
  padding?: string;
  margin?: string;
}

export interface ViewMeta {
  title: string;
  description?: string;
  ogImage?: string;
  keywords?: string[];
  robots?: 'index' | 'noindex';
}

export interface View {
  id: string;
  type: ViewType;
  slug: string;
  meta: ViewMeta;
  layout: {
    header?: 'default' | 'minimal' | 'none';
    footer?: 'default' | 'minimal' | 'none';
  };
  components: ViewComponent[];
  createdAt: Date;
  updatedAt: Date;
  generatedBy?: 'ai' | 'manual';
  version: number;
}
```

**1.2 Create Zod Schema for Validation**

**File**: `apps/main-site/src/schemas/view.schema.ts`

```typescript
import { z } from 'zod';

export const ComponentStyleSchema = z.object({
  layout: z.enum(['full', 'contained', 'narrow']).optional(),
  spacing: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
  background: z.string().optional(),
  padding: z.string().optional(),
  margin: z.string().optional(),
});

export const ViewComponentSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum([
      'hero',
      'feature-grid',
      'cta',
      'testimonial',
      'pricing',
      'product-list',
      'article-content',
      'contact-form',
      'image-gallery',
      'video-embed',
      'custom',
    ]),
    props: z.record(z.any()),
    children: z.array(ViewComponentSchema).optional(),
    style: ComponentStyleSchema.optional(),
  })
);

export const ViewSchema = z.object({
  id: z.string(),
  type: z.enum(['landing', 'article', 'product', 'dashboard', 'custom']),
  slug: z.string(),
  meta: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    robots: z.enum(['index', 'noindex']).optional(),
  }),
  layout: z.object({
    header: z.enum(['default', 'minimal', 'none']).optional(),
    footer: z.enum(['default', 'minimal', 'none']).optional(),
  }),
  components: z.array(ViewComponentSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  generatedBy: z.enum(['ai', 'manual']).optional(),
  version: z.number(),
});
```

**1.3 Create View API Service**

**File**: `apps/main-site/src/services/view.service.ts`

```typescript
import { View, ViewSchema } from '../types/view';
import { authClient } from './auth-client';

export const viewService = {
  /**
   * Get view by slug
   */
  async getViewBySlug(slug: string): Promise<View | null> {
    try {
      const response = await authClient.api.get(`/api/v1/views/${slug}`);
      const view = ViewSchema.parse(response.data);
      return view;
    } catch (error) {
      console.error('[viewService.getViewBySlug] Error:', error);
      return null;
    }
  },

  /**
   * List all views
   */
  async listViews(filters?: {
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ views: View[]; total: number }> {
    try {
      const response = await authClient.api.get('/api/v1/views', {
        params: filters,
      });
      return {
        views: response.data.views.map((v: any) => ViewSchema.parse(v)),
        total: response.data.total,
      };
    } catch (error) {
      console.error('[viewService.listViews] Error:', error);
      return { views: [], total: 0 };
    }
  },

  /**
   * Create new view
   */
  async createView(view: Omit<View, 'id' | 'createdAt' | 'updatedAt'>): Promise<View> {
    const response = await authClient.api.post('/api/v1/views', view);
    return ViewSchema.parse(response.data);
  },

  /**
   * Update view
   */
  async updateView(id: string, updates: Partial<View>): Promise<View> {
    const response = await authClient.api.put(`/api/v1/views/${id}`, updates);
    return ViewSchema.parse(response.data);
  },

  /**
   * Delete view
   */
  async deleteView(id: string): Promise<void> {
    await authClient.api.delete(`/api/v1/views/${id}`);
  },
};
```

### Acceptance Criteria
- ✅ View TypeScript types defined
- ✅ Zod validation schemas created
- ✅ View service with API integration
- ✅ Type-safe View creation and retrieval

---

## 🎨 Step 2: Implement ViewRenderer (Week 1 - Day 3-5)

### Objective
Create a ViewRenderer component that renders View JSON into React components.

### Tasks

**2.1 Create ViewRenderer Component**

**File**: `apps/main-site/src/components/ViewRenderer/ViewRenderer.tsx`

```typescript
import React from 'react';
import { View, ViewComponent } from '../../types/view';
import { ComponentRegistry } from './ComponentRegistry';

interface ViewRendererProps {
  view: View;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({ view }) => {
  return (
    <div className="view-renderer" data-view-id={view.id} data-view-type={view.type}>
      {/* Render meta tags */}
      <ViewMeta meta={view.meta} />

      {/* Render components */}
      <div className="view-content">
        {view.components.map((component) => (
          <ComponentRenderer key={component.id} component={component} />
        ))}
      </div>
    </div>
  );
};

interface ComponentRendererProps {
  component: ViewComponent;
}

const ComponentRenderer: React.FC<ComponentRendererProps> = ({ component }) => {
  const Component = ComponentRegistry.get(component.type);

  if (!Component) {
    console.warn(`Component type "${component.type}" not found in registry`);
    return null;
  }

  const style = component.style ? buildComponentStyle(component.style) : {};

  return (
    <div className={`component component-${component.type}`} style={style}>
      <Component {...component.props}>
        {component.children?.map((child) => (
          <ComponentRenderer key={child.id} component={child} />
        ))}
      </Component>
    </div>
  );
};

function buildComponentStyle(style: ViewComponent['style']) {
  // Convert View style config to CSS properties
  return {
    padding: style?.padding,
    margin: style?.margin,
    background: style?.background,
  };
}

interface ViewMetaProps {
  meta: View['meta'];
}

const ViewMeta: React.FC<ViewMetaProps> = ({ meta }) => {
  return (
    <>
      <title>{meta.title}</title>
      {meta.description && <meta name="description" content={meta.description} />}
      {meta.ogImage && <meta property="og:image" content={meta.ogImage} />}
      {meta.keywords && <meta name="keywords" content={meta.keywords.join(', ')} />}
      {meta.robots && <meta name="robots" content={meta.robots} />}
    </>
  );
};
```

**2.2 Create Component Registry**

**File**: `apps/main-site/src/components/ViewRenderer/ComponentRegistry.tsx`

```typescript
import React from 'react';
import { ComponentType } from '../../types/view';

/**
 * Component Registry
 * Maps component types to React components
 */

type ComponentMap = Record<ComponentType, React.ComponentType<any>>;

class Registry {
  private components: Partial<ComponentMap> = {};

  register(type: ComponentType, component: React.ComponentType<any>) {
    this.components[type] = component;
  }

  get(type: ComponentType): React.ComponentType<any> | undefined {
    return this.components[type];
  }

  list(): Array<{ type: ComponentType; component: React.ComponentType<any> }> {
    return Object.entries(this.components).map(([type, component]) => ({
      type: type as ComponentType,
      component: component!,
    }));
  }
}

export const ComponentRegistry = new Registry();

// Register core components (will be populated in Step 5)
// ComponentRegistry.register('hero', HeroComponent);
// ComponentRegistry.register('feature-grid', FeatureGridComponent);
// etc.
```

**2.3 Create Dynamic View Page**

**File**: `apps/main-site/src/app/[...slug]/page.tsx`

```typescript
import { ViewRenderer } from '@/components/ViewRenderer/ViewRenderer';
import { viewService } from '@/services/view.service';
import { notFound } from 'next/navigation';

interface ViewPageProps {
  params: {
    slug: string[];
  };
}

export default async function ViewPage({ params }: ViewPageProps) {
  const slug = params.slug?.join('/') || '/';

  // Fetch view by slug
  const view = await viewService.getViewBySlug(slug);

  if (!view) {
    notFound();
  }

  return <ViewRenderer view={view} />;
}

export async function generateStaticParams() {
  // TODO: Generate static params for all views
  // const views = await viewService.listViews();
  // return views.views.map((view) => ({
  //   slug: view.slug.split('/').filter(Boolean),
  // }));
  return [];
}
```

### Acceptance Criteria
- ✅ ViewRenderer component renders View JSON
- ✅ Component Registry system works
- ✅ Dynamic routing via [...slug] works
- ✅ Meta tags rendered correctly

---

## 🧩 Step 4: Build Component Registry (Week 3 - Day 1-3)

### Objective
Create a catalog of reusable components that can be used in Views and by AI Page Generator.

### Tasks

**4.1 Create Core Layout Components**

**File**: `apps/main-site/src/components/view-components/Hero.tsx`

```typescript
import React from 'react';

export interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  alignment?: 'left' | 'center' | 'right';
}

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  ctaText,
  ctaLink,
  backgroundImage,
  alignment = 'center',
}) => {
  return (
    <section
      className={`hero hero-${alignment}`}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      }}
    >
      <div className="hero-content">
        <h1>{title}</h1>
        {subtitle && <p className="hero-subtitle">{subtitle}</p>}
        {ctaText && ctaLink && (
          <a href={ctaLink} className="hero-cta">
            {ctaText}
          </a>
        )}
      </div>
    </section>
  );
};
```

**File**: `apps/main-site/src/components/view-components/FeatureGrid.tsx`
**File**: `apps/main-site/src/components/view-components/CTA.tsx`
**File**: `apps/main-site/src/components/view-components/Testimonial.tsx`
... (Create all core components)

**4.2 Register All Components**

**File**: `apps/main-site/src/components/ViewRenderer/registry-setup.ts`

```typescript
import { ComponentRegistry } from './ComponentRegistry';
import { Hero } from '../view-components/Hero';
import { FeatureGrid } from '../view-components/FeatureGrid';
import { CTA } from '../view-components/CTA';
// ... import all components

// Register all components
ComponentRegistry.register('hero', Hero);
ComponentRegistry.register('feature-grid', FeatureGrid);
ComponentRegistry.register('cta', CTA);
// ... register all
```

**4.3 Create Component Documentation**

**File**: `docs/frontend/COMPONENT_CATALOG.md`

Document each component with:
- Component name and type
- Props interface
- Usage example
- Screenshot/preview
- AI Page Generator usage hints

### Acceptance Criteria
- ✅ 10+ core components created
- ✅ All components registered
- ✅ Component catalog documentation
- ✅ Components work in ViewRenderer

---

## 🤖 Step 7: Connect AI Page Generator to View Schema (Week 5)

### Objective
Integrate AI Page Generator to generate View JSON directly.

### Tasks

**7.1 Update AI Prompt to Generate View JSON**

**File**: `packages/ai-page-generator/src/prompts/view-generator.prompt.ts`

```typescript
export const VIEW_GENERATOR_PROMPT = `
You are an AI that generates View JSON for a modern web platform.

The View Schema is:
{VIEW_SCHEMA_DEFINITION}

Available components:
{COMPONENT_CATALOG}

User request: {USER_REQUEST}

Generate a valid View JSON that fulfills the user's request. Ensure:
1. Type-safe according to the schema
2. Use appropriate components from the catalog
3. Include proper meta tags
4. Structure components logically
5. Include sensible default styling

Return ONLY valid JSON, no explanation.
`;
```

**7.2 Create View Generator Service**

**File**: `packages/ai-page-generator/src/services/view-generator.service.ts`

```typescript
import { openai } from './openai-client';
import { ViewSchema } from '@/types/view';

export async function generateViewFromPrompt(
  userPrompt: string
): Promise<View> {
  const prompt = VIEW_GENERATOR_PROMPT
    .replace('{VIEW_SCHEMA_DEFINITION}', JSON.stringify(ViewSchema))
    .replace('{COMPONENT_CATALOG}', getComponentCatalog())
    .replace('{USER_REQUEST}', userPrompt);

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const viewJson = JSON.parse(response.choices[0].message.content);
  const view = ViewSchema.parse(viewJson); // Validate

  return view;
}

function getComponentCatalog(): string {
  // Return component catalog as text
  return ComponentRegistry.list()
    .map(({ type, component }) => `- ${type}: ${component.name}`)
    .join('\n');
}
```

### Acceptance Criteria
- ✅ AI generates valid View JSON
- ✅ Generated views render correctly
- ✅ Component selection is appropriate
- ✅ Meta tags are sensible

---

## 🗑️ Step 10-12: Remove Legacy Systems (Week 7-8)

### Objective
Remove Page, Theme, and Block Editor systems completely.

### Tasks

**10.1 Remove Page Entity and Routes**
- Delete `apps/api-server/src/entities/Page.ts`
- Delete page-related routes
- Remove page service
- Remove page controllers

**10.2 Remove Theme System**
- Delete theme entities
- Delete theme routes
- Remove theme switcher UI
- Remove theme configuration

**10.3 Remove Block Editor**
- Delete Gutenberg components
- Remove block registry
- Remove block serialization code
- Remove block editor UI

**10.4 Refactor Header/Footer**
- Simplify to basic functional components
- Remove theme-dependent logic
- Remove page-dependent rendering
- Create simple reusable Header/Footer

### Acceptance Criteria
- ✅ Page system completely removed
- ✅ Theme system completely removed
- ✅ Block Editor completely removed
- ✅ Header/Footer simplified
- ✅ Build passes without errors
- ✅ Site functions normally with View-based structure

---

## 📊 Success Metrics

### Technical Metrics
- ✅ View rendering < 50ms
- ✅ Component registry lookup < 1ms
- ✅ AI View generation < 3s
- ✅ Type safety: 100% (no `any` types in View system)
- ✅ Bundle size reduction: > 30% (after legacy removal)

### Architecture Metrics
- ✅ Clear separation of concerns
- ✅ All components reusable
- ✅ Zero hardcoded layouts
- ✅ AI-first design (AI can generate any page structure)

### Developer Experience
- ✅ New component creation < 30 minutes
- ✅ View debugging is straightforward
- ✅ TypeScript autocomplete works everywhere
- ✅ Documentation is clear and complete

---

## 🚀 Execution Strategy

### Week 1: Foundation
- Define View Schema (Step 1)
- Implement ViewRenderer (Step 2)
- Set up validation (Step 3)

### Week 2-3: Components
- Build component registry (Step 4)
- Migrate shortcodes to components (Step 5)
- Create component catalog (Step 6)

### Week 4-5: AI Integration
- Connect AI Page Generator (Step 7)
- Implement View preview (Step 8)
- Add View editing (Step 9)

### Week 6-7: Legacy Removal
- Remove Page entity (Step 10)
- Remove Theme system (Step 11)
- Remove Block Editor (Step 12)
- Refactor Header/Footer (Step 13)

### Week 8: Polish & Testing
- Clean up code (Step 14)
- End-to-end testing
- Performance optimization
- Documentation finalization

---

## 📝 Dependencies

### Prerequisite (✅ COMPLETED)
- Phase B-3 Commerce + Dropshipping NextGen V2 API (merged to develop)

### External Dependencies
- Next.js 14+ (already in use)
- Zod for schema validation
- TypeScript 5+
- TailwindCSS for component styling

### Internal Dependencies
- authClient service (for API calls)
- AI Page Generator package
- Component library

---

## 🎯 End State Vision

After completing this work order, the O4O platform will have:

**Frontend**:
- ✅ View-based architecture (no Pages, no Themes, no Block Editor)
- ✅ AI-native structure (AI generates View JSON directly)
- ✅ Component Registry (clear catalog of reusable components)
- ✅ Type-safe rendering (full TypeScript support)
- ✅ Simplified codebase (30%+ reduction in complexity)

**Backend**:
- ✅ NextGen V2 API (Commerce + Dropshipping modules)
- ✅ Clean module structure (dto/, entities/, services/, controllers/, routes/)
- ✅ Deprecated legacy routes (120-day sunset)

**Developer Experience**:
- ✅ Clear separation of concerns
- ✅ Fast iteration cycles
- ✅ AI-assisted development
- ✅ Excellent TypeScript support

**User Experience**:
- ✅ Faster page loads
- ✅ Consistent UI across all pages
- ✅ AI-generated pages that look professional
- ✅ Better mobile experience

---

## 📞 Support & Questions

For questions or blockers during execution:
1. Review this work order
2. Check component documentation
3. Review View Schema types
4. Ask in development chat

**Document Version**: 1.0
**Last Updated**: 2025-12-03
**Status**: 🟢 Ready for Execution

---

🚀 **Let's build the AI-native future of O4O Platform!**
