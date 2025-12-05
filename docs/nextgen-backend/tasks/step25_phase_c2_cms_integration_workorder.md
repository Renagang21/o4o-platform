# Step 25 Phase C-2: CMS Integration & Database Migration - Work Order

**Date Created**: 2025-12-04
**Phase**: Step 25 Phase C-2 - CMS System Integration
**Priority**: HIGH (System Integration & Database Setup)
**Estimated Duration**: 3-5 hours
**Status**: 🔴 READY TO START

---

## 🎯 Executive Summary

**Mission**: Integrate the completed CMS Module V2 into the o4o-platform system, create database migrations for CMS entities, and establish connections with NextGen frontend (ViewRenderer) and Admin Dashboard.

**Context**: Phase C-1 (CMS Module V2 Migration) is complete with all entities, services, controllers, and routes implemented. The CMS engine is ready but not yet connected to the live system.

**Impact**:
- ✅ Enables CMS functionality across the entire platform
- ✅ Database tables created for CustomPostType, CustomField, View, Page
- ✅ Admin Dashboard can manage CMS content
- ✅ NextGen frontend can render CMS pages
- ✅ Site Builder integration enabled

---

## 📊 Current State (Phase C-1 Complete)

### ✅ What We Have

**CMS Module V2 (100% Complete)**:
```
src/modules/cms/
├── entities/          ✅ 4 entities (CustomPostType, CustomField, View, Page)
├── services/          ✅ 5 services (all extending BaseService)
├── controllers/       ✅ 4 controllers (all extending BaseController)
├── dto/              ✅ DTO layer with validation
├── routes/           ✅ cms.routes.ts with 40+ endpoints
└── index.ts          ❌ Not created yet
```

**Build Status**: ✅ 0 TypeScript errors (BUILD PASS)

**Code Quality**: ✅ All V2 patterns followed

### ❌ What We DON'T Have Yet

1. **CMS routes not mounted** - `/api/v1/cms/*` endpoints not accessible
2. **Database tables missing** - CMS entities not in database
3. **ViewRenderer not connected** - Frontend can't load CMS pages
4. **Admin Dashboard not integrated** - Can't manage CMS content
5. **No migration files** - TypeORM migrations not generated

---

## 🎯 Target State (Phase C-2 Goals)

### After Phase C-2 Completion:

1. ✅ **API Endpoints Live**
   - `GET /api/v1/cms/cpts` - List Custom Post Types
   - `GET /api/v1/cms/views` - List Views
   - `GET /api/v1/cms/pages` - List Pages
   - `GET /api/v1/cms/public/page/:slug` - Render published page

2. ✅ **Database Tables Created**
   - `custom_post_types` table with indexes
   - `custom_fields` table with relations
   - `views` table with JSONB schema
   - `pages` table with versioning

3. ✅ **Frontend Integration**
   - ViewRenderer can load pages from CMS
   - PageService.renderPage() working end-to-end
   - Public pages accessible

4. ✅ **Admin Dashboard Ready**
   - CMS API endpoints accessible from admin
   - Foundation for CMS UI (next phase)

5. ✅ **System Health**
   - All tests passing
   - Build passing
   - No regression in existing features

---

## 📝 Task Breakdown

### Phase C-2.1: CMS Module Registration (30-45 min)

**Goal**: Make CMS module accessible from main app

#### Task 2.1.1: Create CMS Module Index
**File**: `src/modules/cms/index.ts`

**Implementation**:
```typescript
// CMS Module - NextGen V2
// Central export point for CMS functionality

export * from './entities/index.js';
export * from './services/index.js';
export * from './controllers/index.js';
export * from './dto/index.js';
export { default as cmsRoutes } from './routes/cms.routes.js';
```

**Verification**:
```bash
# Test import works
npx tsc --noEmit
```

---

#### Task 2.1.2: Mount CMS Routes to Main App
**File**: `src/index.ts` (or `src/app.ts` if exists)

**Current State** (need to verify):
```typescript
// Existing routes
app.use('/api/v1/dropshipping', dropshippingRoutes);
app.use('/api/v1/commerce', commerceRoutes);
// ... other routes
```

**Add CMS Routes**:
```typescript
import cmsRoutes from './modules/cms/routes/cms.routes.js';

// Mount CMS routes
app.use('/api/v1/cms', cmsRoutes);

logger.info('✅ CMS routes mounted at /api/v1/cms');
```

**Verification**:
```bash
# Start server
npm run dev

# Test endpoint
curl http://localhost:4000/api/v1/cms/cpts
# Expected: 401 Unauthorized (auth required) or empty array
```

---

#### Task 2.1.3: Add CMS Entities to TypeORM Config
**File**: `src/database/data-source.ts` (or similar)

**Find entities array**:
```typescript
entities: [
  // Commerce entities
  Product,
  Order,
  // Dropshipping entities
  Seller,
  Supplier,
  Partner,
  // ... existing entities
]
```

**Add CMS entities**:
```typescript
import {
  CustomPostType,
  CustomField,
  View,
  Page
} from './modules/cms/entities/index.js';

entities: [
  // ... existing entities

  // CMS entities (Phase C-2)
  CustomPostType,
  CustomField,
  View,
  Page,
]
```

**Verification**:
```bash
# Check TypeORM can see entities
npx typeorm entity:show
# Should list CustomPostType, CustomField, View, Page
```

---

### Phase C-2.2: Database Migration Generation (45-60 min)

**Goal**: Create and run migrations for CMS tables

#### Task 2.2.1: Generate Migration
**Command**:
```bash
# Generate migration from entities
npm run typeorm -- migration:generate src/database/migrations/CMSModuleV2 -d src/database/data-source.ts

# Alternative if above fails:
npx typeorm-ts-node-commonjs migration:generate src/database/migrations/CMSModuleV2 -d src/database/data-source.ts
```

**Expected Output**:
```
Migration /path/to/migrations/1733308800000-CMSModuleV2.ts has been generated successfully.
```

**Verify Migration File**:
```typescript
// Should contain:
// - CREATE TABLE custom_post_types
// - CREATE TABLE custom_fields
// - CREATE TABLE views
// - CREATE TABLE pages
// - CREATE INDEX statements
// - Foreign key constraints
```

---

#### Task 2.2.2: Review Migration File

**Check for**:
1. ✅ All 4 tables created
2. ✅ JSONB columns for schema/content
3. ✅ ENUM types for status fields
4. ✅ Indexes on slug, status, etc.
5. ✅ Foreign keys (CustomField → CustomPostType, Page → View)
6. ✅ Timestamps (createdAt, updatedAt)

**Common Issues & Fixes**:

**Issue 1**: Missing JSONB type
```sql
-- If migration shows:
"schema" text

-- Should be:
"schema" jsonb
```

**Fix**: Manually edit migration file or entity definition.

**Issue 2**: ENUM not created
```sql
-- If migration shows:
"status" varchar

-- Should be:
"status" cpt_status_enum
CREATE TYPE cpt_status_enum AS ENUM ('draft', 'active', 'archived');
```

**Fix**: Check entity `@Column({ type: 'enum', enum: CPTStatus })`.

---

#### Task 2.2.3: Run Migration

**Development Database**:
```bash
# Run migration
npm run typeorm -- migration:run -d src/database/data-source.ts

# Verify tables created
psql -d o4o_platform_dev -c "\dt" | grep custom
# Should show: custom_post_types, custom_fields

psql -d o4o_platform_dev -c "\dt" | grep views
# Should show: views

psql -d o4o_platform_dev -c "\dt" | grep pages
# Should show: pages
```

**Check table structure**:
```bash
psql -d o4o_platform_dev -c "\d custom_post_types"
# Should show all columns, indexes, constraints
```

**Rollback Plan** (if issues):
```bash
# Revert migration
npm run typeorm -- migration:revert -d src/database/data-source.ts
```

---

#### Task 2.2.4: Verify Database Schema

**Run verification queries**:
```sql
-- Check all CMS tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('custom_post_types', 'custom_fields', 'views', 'pages');

-- Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename LIKE 'custom_%' OR tablename IN ('views', 'pages');

-- Check foreign keys
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('custom_fields', 'pages');
```

**Expected Results**:
- 4 tables exist
- Indexes on slug (unique), status, etc.
- Foreign keys: custom_fields.postTypeId → custom_post_types.id, pages.viewId → views.id

---

### Phase C-2.3: API Endpoint Testing (30-45 min)

**Goal**: Verify all CMS endpoints work correctly

#### Task 2.3.1: Test CustomPostType Endpoints

**Start API Server**:
```bash
npm run dev
# Should see: ✅ CMS routes mounted at /api/v1/cms
```

**Test Create CPT** (requires admin auth):
```bash
# Get auth token first
TOKEN="your_admin_jwt_token"

# Create CPT
curl -X POST http://localhost:4000/api/v1/cms/cpts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "blog",
    "name": "Blog Posts",
    "icon": "article",
    "description": "Blog post management",
    "schema": {
      "fields": [
        {
          "name": "title",
          "type": "text",
          "required": true
        },
        {
          "name": "content",
          "type": "text",
          "required": true
        }
      ]
    },
    "isPublic": true,
    "isHierarchical": false,
    "supportedFeatures": ["comments", "featured_image"]
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "cpt": {
#       "id": "uuid...",
#       "slug": "blog",
#       "name": "Blog Posts",
#       "status": "draft",
#       ...
#     }
#   }
# }
```

**Test List CPTs**:
```bash
curl -X GET http://localhost:4000/api/v1/cms/cpts \
  -H "Authorization: Bearer $TOKEN"

# Should return array of CPTs
```

**Test Get CPT by ID**:
```bash
CPT_ID="uuid_from_create_response"

curl -X GET http://localhost:4000/api/v1/cms/cpts/$CPT_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Test Activate CPT**:
```bash
curl -X POST http://localhost:4000/api/v1/cms/cpts/$CPT_ID/activate \
  -H "Authorization: Bearer $TOKEN"

# Status should change to "active"
```

---

#### Task 2.3.2: Test View Endpoints

**Create View**:
```bash
curl -X POST http://localhost:4000/api/v1/cms/views \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "blog-list",
    "name": "Blog List View",
    "type": "page",
    "schema": {
      "version": "2.0",
      "type": "page",
      "components": [
        {
          "id": "hero_1",
          "type": "Hero",
          "props": {
            "title": "Blog",
            "subtitle": "Latest posts"
          }
        },
        {
          "id": "post_grid_1",
          "type": "PostGrid",
          "props": {
            "columns": 3
          }
        }
      ]
    },
    "postTypeSlug": "blog",
    "tags": ["blog", "listing"]
  }'
```

**Test View Activation**:
```bash
VIEW_ID="uuid_from_create_response"

curl -X POST http://localhost:4000/api/v1/cms/views/$VIEW_ID/activate \
  -H "Authorization: Bearer $TOKEN"
```

---

#### Task 2.3.3: Test Page Endpoints

**Create Page**:
```bash
curl -X POST http://localhost:4000/api/v1/cms/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "blog",
    "title": "Blog",
    "viewId": "'$VIEW_ID'",
    "content": {
      "posts": [],
      "featured": null
    },
    "seo": {
      "title": "Blog - Latest Posts",
      "description": "Read our latest blog posts",
      "keywords": ["blog", "articles", "news"]
    }
  }'
```

**Test Publish Page**:
```bash
PAGE_ID="uuid_from_create_response"

curl -X POST http://localhost:4000/api/v1/cms/pages/$PAGE_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

**Test Public Page Rendering** (no auth required):
```bash
curl -X GET http://localhost:4000/api/v1/cms/public/page/blog

# Expected response:
# {
#   "success": true,
#   "data": {
#     "page": { ... },
#     "view": { ... },
#     "renderData": {
#       "viewSchema": { ... },
#       "pageMeta": { ... }
#     }
#   }
# }
```

---

#### Task 2.3.4: Test CustomField Endpoints

**Create Field for CPT**:
```bash
curl -X POST http://localhost:4000/api/v1/cms/fields \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "postTypeId": "'$CPT_ID'",
    "key": "blog_author",
    "label": "Author Name",
    "type": "text",
    "description": "The author of this blog post",
    "placeholder": "John Doe",
    "validation": {
      "required": true,
      "min": 3,
      "max": 100
    },
    "order": 0,
    "group": "Basic Info"
  }'
```

**Get Fields for CPT**:
```bash
curl -X GET http://localhost:4000/api/v1/cms/fields/cpt/$CPT_ID \
  -H "Authorization: Bearer $TOKEN"

# Should return array of fields
```

**Get Fields Grouped**:
```bash
curl -X GET http://localhost:4000/api/v1/cms/fields/cpt/$CPT_ID/grouped \
  -H "Authorization: Bearer $TOKEN"

# Should return:
# {
#   "success": true,
#   "data": {
#     "groups": {
#       "Basic Info": [ ... fields ... ],
#       "Advanced": [ ... ]
#     }
#   }
# }
```

---

### Phase C-2.4: ViewRenderer Integration (45-60 min)

**Goal**: Connect PageService with NextGen frontend ViewRenderer

#### Task 2.4.1: Create ViewRenderer API Service (Frontend)

**File**: `apps/main-site-nextgen/src/services/cms.service.ts`

**Implementation**:
```typescript
import { authClient } from '@/lib/auth-client';

export interface RenderedPage {
  page: {
    id: string;
    slug: string;
    title: string;
    status: string;
    seo: {
      title?: string;
      description?: string;
      keywords?: string[];
      ogImage?: string;
    };
  };
  view: {
    id: string;
    slug: string;
    name: string;
    type: string;
    schema: {
      version: string;
      type: string;
      components: Array<any>;
      bindings?: Array<any>;
      styles?: any;
      seo?: any;
    };
  };
  renderData: {
    viewSchema: any;
    pageMeta: {
      title: string;
      description?: string;
      keywords?: string[];
      ogImage?: string;
    };
  };
}

export class CMSService {
  /**
   * Get published page by slug
   * This uses the public endpoint (no auth required)
   */
  static async getPublishedPage(slug: string): Promise<RenderedPage | null> {
    try {
      const response = await authClient.api.get(`/cms/public/page/${slug}`);

      if (response.success && response.data) {
        return response.data as RenderedPage;
      }

      return null;
    } catch (error) {
      console.error('[CMSService] Error fetching page:', error);
      return null;
    }
  }

  /**
   * Get all published pages (for sitemap, navigation)
   */
  static async getPublishedPages(siteId?: string): Promise<any[]> {
    try {
      const url = siteId
        ? `/cms/public/pages?siteId=${siteId}`
        : '/cms/public/pages';

      const response = await authClient.api.get(url);

      if (response.success && response.data?.pages) {
        return response.data.pages;
      }

      return [];
    } catch (error) {
      console.error('[CMSService] Error fetching pages:', error);
      return [];
    }
  }
}
```

---

#### Task 2.4.2: Create Dynamic CMS Page Route (Frontend)

**File**: `apps/main-site-nextgen/src/app/[...slug]/page.tsx`

**Implementation**:
```typescript
import { CMSService } from '@/services/cms.service';
import { ViewRenderer } from '@/components/ViewRenderer';
import { notFound } from 'next/navigation';

interface CMSPageProps {
  params: {
    slug: string[];
  };
}

export default async function CMSPage({ params }: CMSPageProps) {
  // Convert slug array to string
  const slug = params.slug.join('/');

  // Fetch page from CMS
  const pageData = await CMSService.getPublishedPage(slug);

  if (!pageData) {
    notFound();
  }

  const { page, view, renderData } = pageData;

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>{renderData.pageMeta.title}</title>
        {renderData.pageMeta.description && (
          <meta name="description" content={renderData.pageMeta.description} />
        )}
        {renderData.pageMeta.keywords && (
          <meta name="keywords" content={renderData.pageMeta.keywords.join(', ')} />
        )}
        {renderData.pageMeta.ogImage && (
          <meta property="og:image" content={renderData.pageMeta.ogImage} />
        )}
      </head>

      {/* Render page using ViewRenderer */}
      <ViewRenderer
        schema={renderData.viewSchema}
        data={page.content}
      />
    </>
  );
}

// Generate static params for published pages (optional, for SSG)
export async function generateStaticParams() {
  const pages = await CMSService.getPublishedPages();

  return pages.map((page) => ({
    slug: page.slug.split('/'),
  }));
}
```

---

#### Task 2.4.3: Test ViewRenderer Integration

**Create Test Page**:
```bash
# 1. Create simple view
curl -X POST http://localhost:4000/api/v1/cms/views \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-view",
    "name": "Test View",
    "type": "page",
    "schema": {
      "version": "2.0",
      "type": "page",
      "components": [
        {
          "id": "heading_1",
          "type": "Heading",
          "props": {
            "level": 1,
            "text": "CMS Test Page"
          }
        },
        {
          "id": "text_1",
          "type": "Text",
          "props": {
            "content": "This page is rendered by CMS V2 + ViewRenderer!"
          }
        }
      ]
    }
  }'

# 2. Activate view
curl -X POST http://localhost:4000/api/v1/cms/views/$VIEW_ID/activate \
  -H "Authorization: Bearer $TOKEN"

# 3. Create page
curl -X POST http://localhost:4000/api/v1/cms/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-cms-page",
    "title": "Test CMS Page",
    "viewId": "'$VIEW_ID'",
    "content": {},
    "seo": {
      "title": "Test CMS Page",
      "description": "Testing CMS V2 integration"
    }
  }'

# 4. Publish page
curl -X POST http://localhost:4000/api/v1/cms/pages/$PAGE_ID/publish \
  -H "Authorization: Bearer $TOKEN"
```

**Visit Page**:
```
http://localhost:3000/test-cms-page
```

**Expected Result**:
- Page renders with "CMS Test Page" heading
- Text "This page is rendered by CMS V2 + ViewRenderer!" displays
- SEO meta tags present in HTML

---

### Phase C-2.5: Admin Dashboard Integration Prep (30 min)

**Goal**: Prepare Admin Dashboard to manage CMS content

#### Task 2.5.1: Create CMS API Client (Admin)

**File**: `apps/admin-dashboard/src/services/cms-api.service.ts`

**Implementation**:
```typescript
import { authClient } from '@/lib/auth-client';

export interface CustomPostType {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description?: string;
  status: 'draft' | 'active' | 'archived';
  isPublic: boolean;
  schema: any;
  createdAt: string;
  updatedAt: string;
}

export interface View {
  id: string;
  slug: string;
  name: string;
  type: 'page' | 'section' | 'component' | 'layout';
  status: 'draft' | 'active' | 'archived';
  schema: any;
  postTypeSlug?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  viewId?: string;
  content: any;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  publishedAt?: string;
  seo?: any;
  createdAt: string;
  updatedAt: string;
}

export class CMSAPIService {
  // ========================================
  // Custom Post Types
  // ========================================

  static async listCPTs(filters?: any): Promise<CustomPostType[]> {
    const response = await authClient.api.get('/cms/cpts', { params: filters });
    return response.data?.cpts || [];
  }

  static async getCPT(id: string): Promise<CustomPostType | null> {
    const response = await authClient.api.get(`/cms/cpts/${id}`);
    return response.data?.cpt || null;
  }

  static async createCPT(data: any): Promise<CustomPostType> {
    const response = await authClient.api.post('/cms/cpts', data);
    return response.data.cpt;
  }

  static async updateCPT(id: string, data: any): Promise<CustomPostType> {
    const response = await authClient.api.put(`/cms/cpts/${id}`, data);
    return response.data.cpt;
  }

  static async deleteCPT(id: string): Promise<boolean> {
    await authClient.api.delete(`/cms/cpts/${id}`);
    return true;
  }

  static async activateCPT(id: string): Promise<CustomPostType> {
    const response = await authClient.api.post(`/cms/cpts/${id}/activate`);
    return response.data.cpt;
  }

  // ========================================
  // Views
  // ========================================

  static async listViews(filters?: any): Promise<View[]> {
    const response = await authClient.api.get('/cms/views', { params: filters });
    return response.data?.views || [];
  }

  static async getView(id: string): Promise<View | null> {
    const response = await authClient.api.get(`/cms/views/${id}`);
    return response.data?.view || null;
  }

  static async createView(data: any): Promise<View> {
    const response = await authClient.api.post('/cms/views', data);
    return response.data.view;
  }

  static async updateView(id: string, data: any): Promise<View> {
    const response = await authClient.api.put(`/cms/views/${id}`, data);
    return response.data.view;
  }

  static async deleteView(id: string): Promise<boolean> {
    await authClient.api.delete(`/cms/views/${id}`);
    return true;
  }

  static async cloneView(id: string, newSlug: string, newName?: string): Promise<View> {
    const response = await authClient.api.post(`/cms/views/${id}/clone`, { slug: newSlug, name: newName });
    return response.data.view;
  }

  // ========================================
  // Pages
  // ========================================

  static async listPages(filters?: any): Promise<Page[]> {
    const response = await authClient.api.get('/cms/pages', { params: filters });
    return response.data?.pages || [];
  }

  static async getPage(id: string): Promise<Page | null> {
    const response = await authClient.api.get(`/cms/pages/${id}`);
    return response.data?.page || null;
  }

  static async createPage(data: any): Promise<Page> {
    const response = await authClient.api.post('/cms/pages', data);
    return response.data.page;
  }

  static async updatePage(id: string, data: any): Promise<Page> {
    const response = await authClient.api.put(`/cms/pages/${id}`, data);
    return response.data.page;
  }

  static async deletePage(id: string): Promise<boolean> {
    await authClient.api.delete(`/cms/pages/${id}`);
    return true;
  }

  static async publishPage(id: string): Promise<Page> {
    const response = await authClient.api.post(`/cms/pages/${id}/publish`);
    return response.data.page;
  }

  static async schedulePage(id: string, scheduledAt: Date): Promise<Page> {
    const response = await authClient.api.post(`/cms/pages/${id}/schedule`, { scheduledAt });
    return response.data.page;
  }
}
```

---

#### Task 2.5.2: Test Admin API Client

**Create Test Script** (temporary):
```typescript
// apps/admin-dashboard/src/test/cms-api.test.ts
import { CMSAPIService } from '@/services/cms-api.service';

async function testCMSAPI() {
  console.log('Testing CMS API...');

  try {
    // Test list CPTs
    const cpts = await CMSAPIService.listCPTs();
    console.log('✅ List CPTs:', cpts.length);

    // Test list views
    const views = await CMSAPIService.listViews();
    console.log('✅ List Views:', views.length);

    // Test list pages
    const pages = await CMSAPIService.listPages();
    console.log('✅ List Pages:', pages.length);

    console.log('All API tests passed!');
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run test
testCMSAPI();
```

---

### Phase C-2.6: System Health Verification (15-30 min)

**Goal**: Ensure no regressions and all systems operational

#### Task 2.6.1: Run Full Build

```bash
# API Server
cd apps/api-server
npm run build

# Admin Dashboard
cd apps/admin-dashboard
npm run build

# Main Site
cd apps/main-site-nextgen
npm run build
```

**Expected**: All builds pass with 0 errors.

---

#### Task 2.6.2: Run Tests

```bash
# API Server tests
cd apps/api-server
npm test

# Check for CMS-related test failures
# (May need to update tests or skip for now)
```

---

#### Task 2.6.3: Verify No Regressions

**Test Existing Endpoints**:
```bash
# Commerce endpoints still work
curl http://localhost:4000/api/v1/commerce/products

# Dropshipping endpoints still work
curl http://localhost:4000/api/v1/dropshipping/sellers
```

**Expected**: All existing endpoints still functional.

---

## ✅ Success Criteria

### Phase C-2 Complete When:

**Database**:
- ✅ All 4 CMS tables created (custom_post_types, custom_fields, views, pages)
- ✅ Indexes and foreign keys working
- ✅ JSONB columns functioning
- ✅ Migration reversible

**API Endpoints**:
- ✅ All `/api/v1/cms/*` endpoints accessible
- ✅ CRUD operations working for all entities
- ✅ Public page rendering endpoint working
- ✅ Authentication/authorization enforced

**Integration**:
- ✅ ViewRenderer can load CMS pages
- ✅ Admin API client can manage CMS content
- ✅ No regressions in existing features

**Code Quality**:
- ✅ TypeScript build passing
- ✅ All services using singleton pattern
- ✅ Proper error handling

---

## ⏱️ Time Estimation

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **C-2.1: Module Registration** | 3 tasks | 30-45 min |
| **C-2.2: Database Migration** | 4 tasks | 45-60 min |
| **C-2.3: API Testing** | 4 tasks | 30-45 min |
| **C-2.4: ViewRenderer Integration** | 3 tasks | 45-60 min |
| **C-2.5: Admin Dashboard Prep** | 2 tasks | 30 min |
| **C-2.6: Health Verification** | 3 tasks | 15-30 min |
| **TOTAL** | **19 tasks** | **3-5 hours** |

---

## 🔴 Risk Management

### High Priority Risks

**Risk 1: Migration Fails**
- **Impact**: Database not updated, CMS non-functional
- **Mitigation**:
  - Test migration on development database first
  - Keep backup before migration
  - Have rollback command ready
  - Manually review migration file before running

**Risk 2: TypeORM Entity Discovery Issues**
- **Impact**: Entities not found, migration generation fails
- **Mitigation**:
  - Verify data-source.ts imports all entities
  - Check entity decorators are correct
  - Use `npx typeorm entity:show` to verify

**Risk 3: Route Conflicts**
- **Impact**: CMS routes conflict with existing routes
- **Mitigation**:
  - Use unique `/api/v1/cms` prefix
  - Test route precedence
  - Check for slug/param conflicts

### Medium Priority Risks

**Risk 4: JSONB Column Type Issues**
- **Impact**: Schema/content columns not working
- **Mitigation**:
  - Use PostgreSQL (supports JSONB)
  - Manually verify JSONB type in migration
  - Test JSONB queries

**Risk 5: Frontend Build Errors**
- **Impact**: ViewRenderer integration breaks frontend build
- **Mitigation**:
  - Test incrementally
  - Use proper TypeScript types
  - Isolate CMS service in separate file

---

## 📚 Reference Documents

**Phase C-1 Completion**:
- Phase C-1 Work Order: `docs/nextgen-backend/tasks/step25_phase_c1_cms_migration_workorder.md`
- Phase C-1 entities: `src/modules/cms/entities/`

**Database**:
- TypeORM Data Source: `src/database/data-source.ts`
- Migration Guide: `docs/api-server/specs/database_migrations.md`

**Frontend**:
- ViewRenderer: `apps/main-site-nextgen/src/components/ViewRenderer/`
- Auth Client: `packages/auth-client/`

**API**:
- CMS Routes: `src/modules/cms/routes/cms.routes.ts`
- CMS Controllers: `src/modules/cms/controllers/`

---

## 🚀 Getting Started

### Recommended Workflow

1. **Module Registration** (Quick wins first)
   - Create module index
   - Mount routes
   - Add entities to TypeORM config

2. **Database Migration** (Core functionality)
   - Generate migration
   - Review carefully
   - Run on dev database
   - Verify tables

3. **API Testing** (Validation)
   - Test each endpoint
   - Verify data persistence
   - Check error handling

4. **Frontend Integration** (User-facing)
   - Add ViewRenderer support
   - Test page rendering
   - Verify SEO

5. **Final Verification** (Quality assurance)
   - Run all tests
   - Check for regressions
   - Document any issues

### First Commands

```bash
# 1. Create module index
touch apps/api-server/src/modules/cms/index.ts

# 2. Verify TypeORM config location
find apps/api-server/src -name "data-source.ts"

# 3. Check current migrations
npm run typeorm -- migration:show

# 4. Start development server
npm run dev
```

---

## 📝 Progress Tracking

Use this checklist to track progress through Phase C-2:

### Overall Progress

- [ ] **Phase C-2.1**: Module Registration (0/3 tasks)
- [ ] **Phase C-2.2**: Database Migration (0/4 tasks)
- [ ] **Phase C-2.3**: API Testing (0/4 tasks)
- [ ] **Phase C-2.4**: ViewRenderer Integration (0/3 tasks)
- [ ] **Phase C-2.5**: Admin Dashboard Prep (0/2 tasks)
- [ ] **Phase C-2.6**: Health Verification (0/3 tasks)

**Total**: 0/19 tasks (0%)

---

## 🎉 Completion Report Template

When Phase C-2 is complete, generate a report using this template:

```markdown
# Phase C-2: CMS Integration & Database Migration - Completion Report

**Date Completed**: [DATE]
**Duration**: [ACTUAL HOURS]
**Tasks Completed**: 19/19 (100%)

## Achievements
- ✅ CMS routes mounted at /api/v1/cms
- ✅ Database tables created (4 tables, X indexes, Y foreign keys)
- ✅ All API endpoints tested and working
- ✅ ViewRenderer integration complete
- ✅ Admin Dashboard can access CMS API
- ✅ Build PASS (0 errors)

## Database Tables Created
1. custom_post_types
2. custom_fields
3. views
4. pages

## API Endpoints Verified
- /api/v1/cms/cpts/* (8 endpoints)
- /api/v1/cms/fields/* (10 endpoints)
- /api/v1/cms/views/* (11 endpoints)
- /api/v1/cms/pages/* (15 endpoints)
- /api/v1/cms/public/* (2 endpoints)

## Test Results
- Migration: [SUCCESS/FAILED]
- API Tests: [X] passing
- Build: [PASS/FAIL]
- Regression Tests: [X] passing

## Next Steps
- Phase C-3: CMS UI Development (Admin Dashboard)
- Phase C-4: Site Builder Integration
- Phase D: Multi-Site CMS Features
```

---

**Work Order Created**: 2025-12-04
**Created By**: Claude (Rena)
**Status**: 🔴 READY TO START
**Depends On**: ✅ Phase C-1 Complete

🚀 **Phase C-2: CMS Integration & Migration - Ready to Begin!** 🚀
