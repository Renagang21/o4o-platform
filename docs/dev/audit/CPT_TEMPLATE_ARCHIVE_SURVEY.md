# CPT/Template/Archive System Survey

**O4O Platform - Custom Post Type & Template Architecture Documentation**

---

## Table of Contents

1. [CPT Structure](#1-cpt-structure)
2. [Template & Preset System](#2-template--preset-system)
3. [Archive & Single Page Rendering](#3-archive--single-page-rendering)
4. [URL Routing Patterns](#4-url-routing-patterns)
5. [Data Flow](#5-data-flow)
6. [Shortcode Integration](#6-shortcode-integration)

---

## 1. CPT Structure

### 1.1 CPT Type Definitions

The platform uses a WordPress-inspired Custom Post Type system with enhanced preset capabilities.

| Entity | Database Table | Key Fields | Purpose |
|--------|----------------|------------|---------|
| **CustomPostType** | `custom_post_types` | `id`, `slug`, `name`, `description`, `hasArchive`, `defaultViewPresetId`, `defaultTemplatePresetId` | Defines post type configuration |
| **CustomPost** | `custom_posts` | `id`, `title`, `slug`, `cptSlug`, `status`, `fields`, `content`, `meta` | Individual post instances |
| **ViewPreset** | `view_presets` | `id`, `name`, `cptSlug`, `config`, `isActive` | Archive/list view configuration |
| **TemplatePreset** | `template_presets` | `id`, `name`, `cptSlug`, `config`, `isActive` | Single post template configuration |
| **FormPreset** | `form_presets` | `id`, `name`, `cptSlug`, `config`, `isActive` | Form configuration for post editing |

### 1.2 CPT Data Structure

**CustomPostType Entity** (`/apps/api-server/src/entities/CustomPostType.ts`):
```typescript
{
  id: string;                          // UUID
  slug: string;                        // URL-friendly identifier (e.g., 'ds_product', 'post', 'page')
  name: string;                        // Display name
  description?: string;
  icon: string;                        // Menu icon
  active: boolean;                     // Enable/disable
  public: boolean;                     // Public visibility
  hasArchive: boolean;                 // Enable archive pages
  showInMenu: boolean;                 // Show in admin menu
  supports: string[];                  // ['title', 'editor', 'thumbnail', etc.]
  taxonomies: string[];                // Associated taxonomies
  labels: {                            // WordPress-style labels
    all_items?: string;
    menu_name?: string;
    // ... more labels
  };
  defaultViewPresetId?: string;        // Default preset for archive pages
  defaultTemplatePresetId?: string;    // Default preset for single pages
  menuPosition?: number;
  capabilityType: string;
  rewrite?: any;
  createdAt: Date;
  updatedAt: Date;
}
```

**CustomPost Entity** (`/apps/api-server/src/entities/CustomPost.ts`):
```typescript
{
  id: string;                          // UUID
  title: string;                       // Post title
  slug: string;                        // URL slug (unique)
  cptSlug: string;                     // Parent CPT reference
  status: 'draft' | 'publish' | 'private' | 'trash';
  fields: Record<string, any>;         // JSON storage for custom fields
  content?: string;                    // Rich text content
  meta?: {                             // SEO and metadata
    seoTitle?: string;
    seoDescription?: string;
    featured?: boolean;
    thumbnail?: string;
    tags?: string[];
  };
  authorId?: string;
  viewCount: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.3 Product CPT Examples

**SupplierProduct** (`/apps/main-site/src/types/supplier-product.ts`):
```typescript
{
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;                       // Supply price
  costPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued';
  images: string[];
  tags: string[];
  specifications: Record<string, string>;
  is_open_for_applications?: boolean;  // Seller recruitment flag
  max_approved_sellers?: number | null;
  approved_seller_count?: number;
}
```

**SellerProduct** (`/apps/main-site/src/types/seller-product.ts`):
```typescript
{
  id: string;
  seller_id: string;
  supplier_product_id: string;
  title: string;
  sku: string;
  sale_price: number;
  margin_amount: number;
  margin_rate?: number;
  is_published: boolean;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 2. Template & Preset System

### 2.1 Preset Types

The platform uses three types of presets for CPT management:

| Preset Type | Purpose | Configuration |
|-------------|---------|---------------|
| **ViewPreset** | Archive/listing pages | Render mode, fields, pagination, filters, sorting, cache |
| **TemplatePreset** | Single post pages | Layout, blocks, SEO metadata, schema.org |
| **FormPreset** | Post editing forms | Fields, validation, sections, submit behavior |

### 2.2 ViewPreset Structure

**ViewPresetConfig** (`/apps/main-site/node_modules/@o4o/types/src/preset.ts`):
```typescript
{
  renderMode: 'list' | 'grid' | 'card' | 'table';
  fields: [
    {
      fieldKey: string;                // Field to display
      label?: string;                  // Display label
      format: 'text' | 'html' | 'image' | 'date' | 'number' | 'badge';
      formatter?: {                    // Formatting options
        type: 'date' | 'number' | 'badge';
        pattern?: string;              // e.g., 'YYYY-MM-DD'
        currency?: string;             // e.g., 'KRW'
        colorMap?: Record<string, string>;
      };
      sortable: boolean;
      order: number;
    }
  ];
  defaultSort: {
    field: string;
    order: 'ASC' | 'DESC';
  };
  pagination: {
    pageSize: number;                  // Items per page (default: 12)
    showPagination: boolean;
    showPageSizeSelector: boolean;
    pageSizeOptions: number[];         // e.g., [12, 24, 48]
  };
  filters?: [
    {
      id: string;
      label: string;
      field: string;
      type: 'select' | 'date-range' | 'number-range' | 'checkbox';
      options?: { label: string; value: any }[];
      defaultValue?: any;
    }
  ];
  search?: {
    enabled: boolean;
    fields: string[];                  // Fields to search
    placeholder?: string;
  };
  cache?: {
    ttl: number;                       // Cache duration (seconds)
    strategy: 'stale-while-revalidate' | 'cache-first' | 'no-cache';
    revalidateOnFocus: boolean;
  };
  // ViewPreset-specific (archive pages)
  columns?: number;                    // Grid columns (2, 3, 4)
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}
```

### 2.3 TemplatePreset Structure

**TemplatePresetConfig** (`/apps/main-site/node_modules/@o4o/types/src/preset.ts`):
```typescript
{
  layout: {
    type: '1-column' | '2-column-left' | '2-column-right' | '3-column';
    header?: {                         // Optional header slot
      blocks: [
        {
          blockName: string;           // e.g., 'PostTitle', 'FeaturedImage'
          props: Record<string, any>;  // Block-specific props
          presetId?: string;           // Nested preset reference
          order: number;
        }
      ];
    };
    main: {                            // Required main content slot
      blocks: BlockReference[];
    };
    sidebar?: {                        // Optional sidebar slot
      blocks: BlockReference[];
    };
    footer?: {                         // Optional footer slot
      blocks: BlockReference[];
    };
  };
  seoMeta: {
    titleTemplate: string;             // e.g., "{title} | My Site"
    descriptionField?: string;         // ACF field key
    ogImageField?: string;             // ACF field key
    keywords?: string[];               // Static keywords
    keywordsField?: string;            // Dynamic keywords field
  };
  schemaOrg?: {
    type: 'Product' | 'Article' | 'Event' | 'Organization';
    fieldMapping: Record<string, any>; // Map CPT fields to schema.org properties
  };
}
```

### 2.4 Block System

**Block Structure** (`/packages/block-renderer/src/types/block.types.ts`):
```typescript
{
  id?: string;
  clientId?: string;
  type: string;                        // Block type identifier
  name?: string;                       // WordPress uses 'name'
  data?: Record<string, any>;
  attributes?: Record<string, any>;
  content?: any;                       // Block content
  innerBlocks?: Block[];               // Nested blocks
  innerHTML?: string;                  // Raw HTML
  innerContent?: (string | null)[];
}
```

**Common Block Types**:
- `PostTitle` - Display post title
- `PostContent` - Render main content
- `FeaturedImage` - Show featured image
- `PostMeta` - Display metadata
- `RelatedPosts` - Show related content
- `ProductCard` - Product display (e-commerce)
- `Custom blocks` - Registered via block-renderer

---

## 3. Archive & Single Page Rendering

### 3.1 Archive Page Flow

**CPTArchive Component** (`/apps/main-site/src/pages/archive/CPTArchive.tsx`):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Route: /cpt/:cptSlug?page=N                              │
│    Example: /cpt/ds_product?page=1                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch CPT Type Info                                      │
│    GET /api/cpt/types/:cptSlug                              │
│    → Returns: CustomPostType (with defaultViewPresetId)     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Load ViewPreset (if configured)                          │
│    GET /api/presets/views/:presetId                         │
│    → Returns: ViewPreset config (pagination, fields, etc.)  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Apply ViewPreset to Archive Config                       │
│    - pageSize: preset.config.pageSize || default (12)       │
│    - orderBy: preset.config.sort.field || 'date'            │
│    - order: preset.config.sort.direction || 'DESC'          │
│    - columns: preset.config.columns || 4                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Fetch Posts with Applied Config                          │
│    GET /api/cpt/:cptSlug/posts?page=N&limit=12&...          │
│    → Returns: Array of CustomPost + pagination metadata     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Batch Fetch Metadata (for specific CPTs)                 │
│    POST /api/meta/batch (for ds_product: price, etc.)       │
│    → Returns: Map<postId, MetaItem[]>                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Render Posts Grid                                        │
│    - For ds_product: Use ProductCardBlock                   │
│    - For other CPTs: Use default card layout                │
│    - Apply grid columns from ViewPreset config              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Render Pagination                                        │
│    - Show page numbers, prev/next buttons                   │
│    - Update URL with ?page=N on navigation                  │
└─────────────────────────────────────────────────────────────┘
```

**Archive Configuration Fallback**:
```typescript
// Default if no ViewPreset is configured
const defaultConfig = {
  pageSize: 12,
  orderBy: 'date',
  order: 'DESC',
  status: 'publish',
  columns: 4
};

// Applied from ViewPreset if available
const archiveConfig = {
  pageSize: viewPreset.config.pageSize || defaultConfig.pageSize,
  orderBy: viewPreset.config.sort?.field || defaultConfig.orderBy,
  order: viewPreset.config.sort?.direction?.toUpperCase() || defaultConfig.order,
  columns: viewPreset.config.columns || defaultConfig.columns
};
```

### 3.2 Single Post Page Flow

**CPTSingle Component** (`/apps/main-site/src/pages/CPTSingle.tsx`):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Route: /cpt/:cptSlug/:slug                               │
│    Example: /cpt/ds_product/my-product-slug                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Fetch CPT Type Info                                      │
│    GET /api/cpt/types/:cptSlug                              │
│    → Returns: CustomPostType (with defaultTemplatePresetId) │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Load TemplatePreset (if configured)                      │
│    GET /api/presets/templates/:presetId                     │
│    → Returns: TemplatePreset config (layout, blocks, SEO)   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Fetch Post Data                                          │
│    GET /api/cpt/:cptSlug/posts/:slug                        │
│    → Returns: CustomPost with content, meta, customFields   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Render Template Layout                                   │
│    If TemplatePreset exists:                                │
│      - Apply layout type (1-col, 2-col-left, etc.)          │
│      - Render blocks in slots (header, main, sidebar, footer)│
│      - Inject post data into blocks via _postData           │
│    Else:                                                    │
│      - Fallback to BlockRenderer with post.content          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Render Blocks with BlockRenderer                         │
│    - Each block receives post data as context               │
│    - Blocks can access customFields, meta, content          │
│    - Supports nested blocks (innerBlocks)                   │
└─────────────────────────────────────────────────────────────┘
```

**Template Layout Rendering**:
```typescript
// Example: 2-column-right layout
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  {/* Main Content (3 columns) */}
  <main className="lg:col-span-3">
    {renderSlot(layout.main.blocks, post)}
    {layout.footer && renderSlot(layout.footer.blocks, post)}
  </main>

  {/* Sidebar Right (1 column) */}
  <aside className="lg:col-span-1">
    {layout.sidebar && renderSlot(layout.sidebar.blocks, post)}
  </aside>
</div>
```

**Block Slot Rendering**:
```typescript
function renderSlot(blocks: BlockReference[], post: CPTPost) {
  const sortedBlocks = blocks.sort((a, b) => a.order - b.order);

  return sortedBlocks.map((blockRef) => {
    const block = {
      type: blockRef.blockName,
      ...blockRef.props,
      _postData: post  // Inject post data for block access
    };

    return <BlockRenderer blocks={[block]} />;
  });
}
```

### 3.3 Template Archive (Legacy)

**TemplateArchive Component** (`/apps/main-site/src/pages/archive/TemplateArchive.tsx`):

This component fetches template-based archive layouts with shortcode support:

```typescript
// Fetch archive template
GET /api/templates?type=archive&postType=:cptSlug

// Render template blocks with shortcodes
template.content.blocks.map(block => {
  if (block.type === 'shortcode') {
    return renderShortcodes(block.content, {
      postType: cptSlug,
      posts: posts,
      pagination: { currentPage, postsPerPage, totalPosts }
    });
  }
  // ... other block types
});
```

---

## 4. URL Routing Patterns

### 4.1 Archive URLs

| Pattern | Component | Description | Example |
|---------|-----------|-------------|---------|
| `/cpt/:cptSlug` | `CPTArchive` | Custom post type archive | `/cpt/ds_product` |
| `/cpt/:cptSlug?page=N` | `CPTArchive` | Paginated archive | `/cpt/ds_product?page=2` |
| `/archive/:postType` | `CPTArchive` | Legacy archive pattern | `/archive/product` |
| `/blog` | `BlogArchive` | Blog post archive | `/blog` |
| `/blog/:slugOrId` | `PostDetail` | Single blog post | `/blog/my-post` |

### 4.2 Single Post URLs

| Pattern | Component | Description | Example |
|---------|-----------|-------------|---------|
| `/cpt/:cptSlug/:slug` | `CPTSingle` | Custom post single page | `/cpt/ds_product/my-product` |
| `/posts/:slugOrId` | `PostDetail` | Standard post detail | `/posts/my-article` |
| `/pages/:slug` | `PageViewer` | Page detail | `/pages/about-us` |
| `/:slug` | `PublicPage` | Catch-all for pages/posts | `/contact` |
| `/:section/:subsection` | `PublicPage` | Multi-level pages | `/my-account/orders` |

### 4.3 Routing Configuration

**App.tsx Route Definitions** (`/apps/main-site/src/App.tsx`):
```typescript
<Routes>
  {/* Archive Routes */}
  <Route path="/blog" element={<BlogArchivePage />} />
  <Route path="/archive/:postType" element={<CPTArchive />} />
  <Route path="/cpt/:cptSlug" element={<CPTArchive />} />

  {/* Single Post Routes */}
  <Route path="/cpt/:cptSlug/:slug" element={<CPTSingle />} />
  <Route path="/posts/:slugOrId" element={<PostDetail />} />
  <Route path="/pages/:slug" element={<PageViewer />} />

  {/* WordPress-style catch-all */}
  <Route path="/:section/:subsection" element={<PublicPage />} />
  <Route path="/:slug" element={<PublicPage />} />
</Routes>
```

### 4.4 API Endpoints

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/cpt/types/:slug` | GET | Fetch CPT configuration | `CustomPostType` |
| `/api/cpt/:slug/posts` | GET | List posts (archive) | `{ data: Post[], total: number }` |
| `/api/cpt/:slug/posts/:postSlug` | GET | Single post detail | `{ data: Post }` |
| `/api/presets/views/:id` | GET | Fetch ViewPreset | `{ data: ViewPreset }` |
| `/api/presets/templates/:id` | GET | Fetch TemplatePreset | `{ data: TemplatePreset }` |
| `/api/meta/batch` | POST | Batch fetch metadata | `Map<postId, MetaItem[]>` |
| `/api/public/content/slug/:slug` | GET | Unified content fetch | `PageData` (Page/Post/CPT) |

---

## 5. Data Flow

### 5.1 Archive Page Data Flow

```
┌──────────────────┐
│   User Request   │
│  /cpt/ds_product │
└────────┬─────────┘
         │
         ├──[1]──► GET /api/cpt/types/ds_product
         │         Returns: { defaultViewPresetId: "view_123" }
         │
         ├──[2]──► GET /api/presets/views/view_123
         │         Returns: { config: { pageSize: 12, columns: 4, ... } }
         │
         ├──[3]──► GET /api/cpt/ds_product/posts?page=1&limit=12&orderby=date&order=DESC
         │         Returns: { data: [Post, Post, ...], total: 48 }
         │
         ├──[4]──► POST /api/meta/batch
         │         Body: { postIds: [...], metaKey: "price" }
         │         Returns: Map<postId, [{ meta_key: "price", meta_value: 29900 }]>
         │
         └──[5]──► Render Grid
                   - ProductCardBlock (for ds_product)
                   - Default Card (for other CPTs)
                   - Pagination Controls
```

### 5.2 Single Page Data Flow

```
┌───────────────────────┐
│    User Request       │
│ /cpt/ds_product/      │
│   my-product-slug     │
└──────────┬────────────┘
           │
           ├──[1]──► GET /api/cpt/types/ds_product
           │         Returns: { defaultTemplatePresetId: "template_456" }
           │
           ├──[2]──► GET /api/presets/templates/template_456
           │         Returns: {
           │           config: {
           │             layout: {
           │               type: "2-column-right",
           │               main: { blocks: [...] },
           │               sidebar: { blocks: [...] }
           │             },
           │             seoMeta: { titleTemplate: "{title} | Store" }
           │           }
           │         }
           │
           ├──[3]──► GET /api/cpt/ds_product/posts/my-product-slug
           │         Returns: {
           │           data: {
           │             id: "post_789",
           │             title: "My Product",
           │             content: [...blocks...],
           │             customFields: { price: 29900, ... },
           │             meta: { ... }
           │           }
           │         }
           │
           └──[4]──► Render Template
                     - Apply layout (2-column-right)
                     - Render main slot blocks with post data
                     - Render sidebar slot blocks
                     - Apply SEO meta (title, description, OG tags)
```

### 5.3 PublicPage Unified Content Fetch

```
┌──────────────────┐
│  User Request    │
│    /contact      │
└────────┬─────────┘
         │
         └──[1]──► GET /api/public/content/slug/contact
                   Searches: Pages → Posts → Custom Posts
                   Returns: {
                     contentType: "page",
                     id: "page_123",
                     title: "Contact Us",
                     content: [...blocks...],
                     metadata: { ... }
                   }
                   ↓
                   PageRenderer renders blocks
```

---

## 6. Shortcode Integration

### 6.1 Shortcode System

**Shortcode Registry** (`/packages/shortcodes/src/index.ts`):

The platform provides a flexible shortcode system for dynamic content insertion:

```typescript
// Available shortcode types
- [cpt_list]          // List posts from CPT
- [cpt_field]         // Display specific CPT field
- [acf_field]         // Display ACF field value
- [meta_field]        // Display post metadata
- [preset]            // Embed ViewPreset
- [login_form]        // Social login component
- [seller_dashboard]  // Role-specific dashboard
- [supplier_dashboard]
- [affiliate_dashboard]
```

### 6.2 Dynamic Shortcodes

**CPT List Shortcode**:
```
[cpt_list type="ds_product" limit="6" orderby="date" order="DESC"]
```

Renders:
- Fetches posts from specified CPT
- Applies limit and ordering
- Uses ViewPreset if available
- Displays in grid/list format

**CPT Field Shortcode**:
```
[cpt_field field="price" format="currency"]
```

Renders:
- Extracts field value from current post context
- Applies formatting (currency, date, etc.)
- Falls back to customFields or meta

### 6.3 Shortcode Rendering Flow

```
┌─────────────────────────────────────┐
│  Content with Shortcode             │
│  "Product: [cpt_field field=price]" │
└──────────────┬──────────────────────┘
               │
               ├──[1]──► Parse shortcode
               │         Pattern: \[(\w+)([^\]]*)\]
               │         Extracts: name="cpt_field", attrs="field=price"
               │
               ├──[2]──► Get shortcode definition
               │         From globalRegistry
               │         Returns: { name, render, attributes }
               │
               ├──[3]──► Parse attributes
               │         "field=price" → { field: "price" }
               │
               ├──[4]──► Execute render function
               │         render({ field: "price" }, context)
               │         Context includes: post, user, global settings
               │
               └──[5]──► Replace shortcode with output
                         "Product: $299.00"
```

### 6.4 Block vs Shortcode

| Feature | Blocks | Shortcodes |
|---------|--------|------------|
| **Editor** | Visual block editor | Text-based |
| **Structure** | Structured JSON | String parsing |
| **Nesting** | Native support (innerBlocks) | Manual parsing |
| **Rendering** | React components | String replacement or React |
| **Use Case** | Page builder, layouts | Dynamic content insertion |
| **Performance** | Better (pre-parsed) | Slower (runtime parsing) |
| **Example** | `{ type: "ProductCard", props: {...} }` | `[product_card id="123"]` |

---

## 7. Template/Archive Flow Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER VISITS ARCHIVE                       │
│                      /cpt/ds_product?page=2                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  CPTArchive.tsx  │
                   └────────┬─────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ▼                                   ▼
  ┌────────────────┐                ┌─────────────────┐
  │  Fetch CPT     │                │ Extract URL     │
  │  Type Info     │                │ Params          │
  │  /cpt/types/   │                │ page = 2        │
  │  ds_product    │                └─────────────────┘
  └───────┬────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  CustomPostType            │
  │  - slug: ds_product        │
  │  - hasArchive: true        │
  │  - defaultViewPresetId     │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Fetch ViewPreset          │
  │  /presets/views/:id        │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  ViewPresetConfig          │
  │  - pageSize: 12            │
  │  - columns: 4              │
  │  - sort: { field: "date" } │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Apply Config to Archive   │
  │  archiveConfig = {         │
  │    pageSize: 12,           │
  │    orderBy: "date",        │
  │    order: "DESC",          │
  │    columns: 4              │
  │  }                         │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Fetch Posts               │
  │  GET /cpt/ds_product/posts │
  │  ?page=2&limit=12&         │
  │  orderby=date&order=DESC   │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Response:                 │
  │  {                         │
  │    data: [Post[], ...],    │
  │    total: 48,              │
  │    page: 2,                │
  │    totalPages: 4           │
  │  }                         │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Batch Fetch Metadata      │
  │  (For ds_product: price)   │
  │  POST /meta/batch          │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Merge Post + Meta Data    │
  │  posts.map(post => ({      │
  │    ...post,                │
  │    price: metaMap.get(id)  │
  │  }))                       │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Render Grid               │
  │  <div className=           │
  │   "grid lg:grid-cols-4">   │
  │    {posts.map(post =>      │
  │      <ProductCardBlock />  │
  │    )}                      │
  │  </div>                    │
  └───────┬────────────────────┘
          │
          ▼
  ┌────────────────────────────┐
  │  Render Pagination         │
  │  << 1 [2] 3 4 >>           │
  │  (page 2 of 4)             │
  └────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    USER VISITS SINGLE POST                      │
│               /cpt/ds_product/my-product-slug                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  CPTSingle.tsx  │
                    └────────┬────────┘
                             │
           ┌─────────────────┴─────────────────┐
           │                                   │
           ▼                                   ▼
   ┌────────────────┐                ┌─────────────────┐
   │  Fetch CPT     │                │ Extract URL     │
   │  Type Info     │                │ Params          │
   │  /cpt/types/   │                │ slug = ...      │
   │  ds_product    │                └─────────────────┘
   └───────┬────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  CustomPostType            │
   │  - slug: ds_product        │
   │  - defaultTemplatePresetId │
   └───────┬────────────────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  Fetch TemplatePreset      │
   │  /presets/templates/:id    │
   └───────┬────────────────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  TemplatePresetConfig      │
   │  - layout: "2-column-right"│
   │  - main: { blocks: [...] } │
   │  - sidebar: { blocks: [...]}│
   │  - seoMeta: {...}          │
   └───────┬────────────────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  Fetch Post Data           │
   │  GET /cpt/ds_product/posts/│
   │       my-product-slug      │
   └───────┬────────────────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  CustomPost                │
   │  {                         │
   │    id: "abc123",           │
   │    title: "My Product",    │
   │    content: [...blocks],   │
   │    customFields: {         │
   │      price: 29900,         │
   │      sku: "PROD-001"       │
   │    }                       │
   │  }                         │
   └───────┬────────────────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  Render Template Layout    │
   │  <Grid cols="4">           │
   │    <Main cols="3">         │
   │      {renderSlot(          │
   │        main.blocks, post)} │
   │    </Main>                 │
   │    <Sidebar cols="1">      │
   │      {renderSlot(          │
   │        sidebar.blocks)}    │
   │    </Sidebar>              │
   │  </Grid>                   │
   └───────┬────────────────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  Render Blocks             │
   │  sortedBlocks.map(block => │
   │    <BlockRenderer          │
   │      blocks={[{            │
   │        type: block.name,   │
   │        ...block.props,     │
   │        _postData: post     │
   │      }]}                   │
   │    />                      │
   │  )                         │
   └───────┬────────────────────┘
           │
           ▼
   ┌────────────────────────────┐
   │  Apply SEO Metadata        │
   │  - Title: "{title} | Site" │
   │  - OG Image from field     │
   │  - Schema.org markup       │
   └────────────────────────────┘
```

---

## 8. Summary Tables

### 8.1 CPT Types in Platform

| CPT Slug | Name | Has Archive | Default View | Default Template | Use Case |
|----------|------|-------------|--------------|------------------|----------|
| `post` | Post | Yes | Blog list | Article layout | Blog posts |
| `page` | Page | No | - | Page layout | Static pages |
| `ds_product` | Product | Yes | Product grid (4 cols) | Product detail | E-commerce products |
| `ds_supplier_product` | Supplier Product | Yes | Product list | Supplier product | Dropshipping supplier |
| `ds_seller_product` | Seller Product | Yes | Product grid | Seller product | Dropshipping seller |

### 8.2 Preset Purpose Matrix

| Preset Type | Used In | Configures | Example |
|-------------|---------|------------|---------|
| **ViewPreset** | Archive pages | Listing layout, pagination, filters, sorting | Product grid with 12 items/page |
| **TemplatePreset** | Single pages | Page layout, content blocks, SEO | 2-column product detail with sidebar |
| **FormPreset** | Edit forms | Form fields, validation, sections | Product creation form |

### 8.3 Component Responsibility

| Component | File | Responsibility |
|-----------|------|----------------|
| `CPTArchive` | `/apps/main-site/src/pages/archive/CPTArchive.tsx` | Render CPT archive with ViewPreset |
| `CPTSingle` | `/apps/main-site/src/pages/CPTSingle.tsx` | Render single CPT post with TemplatePreset |
| `TemplateArchive` | `/apps/main-site/src/pages/archive/TemplateArchive.tsx` | Legacy template-based archive (shortcode support) |
| `PublicPage` | `/apps/main-site/src/pages/PublicPage.tsx` | Unified content fetch (Page/Post/CPT by slug) |
| `BlockRenderer` | `/packages/block-renderer` | Render blocks (WordPress Gutenberg compatible) |
| `ShortcodeRenderer` | `/packages/shortcodes` | Parse and render shortcodes |

---

## 9. Key Insights

### 9.1 Architecture Patterns

1. **WordPress Compatibility**: The system maintains WordPress-style concepts (CPT, taxonomies, archive pages) while adding modern preset-based configuration.

2. **Preset-Driven Design**: Instead of hardcoding layouts, the platform uses three preset types (Form, View, Template) to configure all aspects of CPT management.

3. **Graceful Degradation**: All components have fallback behavior when presets are not configured (default pagination, simple block renderer).

4. **Block-First Rendering**: Content is primarily rendered as structured blocks (not raw HTML), enabling flexible layouts and reusable components.

5. **Shortcode Bridge**: Shortcodes provide a migration path from traditional CMS systems and enable dynamic content insertion in text-based fields.

### 9.2 Data Storage Philosophy

- **CPT Structure**: Stored in database with TypeORM entities
- **CPT Content**: Stored as JSON in `customFields` or structured `blocks`
- **Metadata**: Separate `meta` table for searchable/filterable fields
- **Presets**: Stored as JSONB in PostgreSQL for flexibility

### 9.3 URL Design

```
Archive Pages:
  /cpt/:cptSlug              → CPTArchive component
  /cpt/:cptSlug?page=N       → Paginated archive

Single Pages:
  /cpt/:cptSlug/:slug        → CPTSingle component

Unified Access:
  /:slug                     → PublicPage (searches all content types)
  /:section/:subsection      → PublicPage (multi-level pages)
```

---

## 10. Future Considerations

### 10.1 Performance Optimizations

- **ViewPreset Caching**: Archive configs could be cached with configurable TTL
- **Block Lazy Loading**: Large block libraries could use dynamic imports
- **Metadata Batching**: Already implemented for `ds_product` price display
- **Static Generation**: CPT archives could be pre-rendered for better performance

### 10.2 Feature Enhancements

- **Faceted Search**: Add advanced filtering to ViewPreset config
- **Custom Taxonomies**: Extend CPT system with category/tag support
- **Revision History**: Track changes to posts and presets
- **Multi-language**: I18n support for CPT content
- **A/B Testing**: Multiple TemplatePresets for same CPT with analytics

---

**Document Version**: 1.0
**Last Updated**: 2025-01-21
**Maintained By**: O4O Platform Team
