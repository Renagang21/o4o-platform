# CPT/ACF Loop Block Development Plan

## 🎯 Project Overview

Building a WordPress-style Query Loop block that supports Custom Post Types (CPT) and Advanced Custom Fields (ACF) for the Gutenberg editor.

## 📊 Current Status Analysis

### ✅ What's Already Implemented
1. **Custom Post Types (CPT)**
   - Full CRUD API (`/api/v1/cpt/*`)
   - Dynamic field groups
   - Admin UI for management
   - Database entities and relations

2. **Advanced Custom Fields (ACF)**
   - Complete field type support (20+ types)
   - Complex fields (repeater, flexible content)
   - Conditional logic and validation
   - Field values storage system

3. **Gutenberg Editor**
   - Core block support
   - Block inserter and drag-drop
   - Template renderer for frontend

### ❌ What's Missing
- Post Loop / Query Loop block
- Dynamic content querying interface
- Template-based post rendering
- Pagination and filtering UI

## 🏗️ Architecture Design

### Block Structure
```
CPTLoopBlock/
├── index.tsx           # Block registration
├── edit.tsx            # Editor component
├── save.tsx            # Frontend save
├── inspector.tsx       # Block settings panel
├── components/
│   ├── QueryBuilder.tsx      # Query configuration
│   ├── TemplateSelector.tsx  # Display template selection
│   ├── PostPreview.tsx       # Live preview
│   └── PaginationControls.tsx
└── templates/
    ├── default.tsx
    ├── grid.tsx
    ├── list.tsx
    └── custom/
```

### Data Flow
```
Block Settings → Query Builder → API Request → Post Data
                                                    ↓
Frontend Display ← Template Renderer ← ACF Fields
```

## 🔧 Implementation Plan

### Phase 1: Core Block Structure (Week 1)
1. **Block Registration**
   - Register `o4o/cpt-loop` block
   - Define block attributes
   - Set up editor and save components

2. **Query Builder Interface**
   - Post type selector
   - Filter by categories/tags
   - Order by options
   - Posts per page
   - Offset settings

3. **Basic Preview**
   - Fetch posts via API
   - Display post titles/excerpts
   - Loading states

### Phase 2: ACF Integration (Week 2)
1. **Field Mapping**
   - Detect available ACF fields
   - Field selection interface
   - Map fields to template slots

2. **Dynamic Field Rendering**
   - Text/textarea fields
   - Image/gallery fields
   - Relationship fields
   - Repeater field support

3. **Conditional Display**
   - Show/hide based on field values
   - Empty state handling

### Phase 3: Template System (Week 3)
1. **Built-in Templates**
   - Default list view
   - Grid layout (2, 3, 4 columns)
   - Card layout
   - Table view

2. **Template Customization**
   - Template part selection
   - Custom CSS classes
   - Responsive settings

3. **Loop Settings**
   - Pagination type (numbers, prev/next, infinite)
   - Loading animations
   - No results message

### Phase 4: Advanced Features (Week 4)
1. **Filtering & Sorting**
   - Frontend filter controls
   - AJAX refresh
   - URL parameter sync

2. **Performance**
   - Query caching
   - Lazy loading
   - Image optimization

3. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

## 🔌 API Endpoints Needed

### Existing (Can Use)
- `GET /api/v1/cpt/types` - List CPTs
- `GET /api/v1/cpt/:slug/posts` - Get posts by CPT
- `GET /api/v1/cpt/:slug/fields` - Get ACF fields

### New Endpoints Required
- `POST /api/v1/blocks/cpt-loop/query` - Complex query builder
- `GET /api/v1/blocks/cpt-loop/templates` - Available templates
- `POST /api/v1/blocks/cpt-loop/preview` - Editor preview data

## 📦 Block Attributes Schema

```typescript
interface CPTLoopBlockAttributes {
  // Query Settings
  postType: string;
  postsPerPage: number;
  orderBy: 'date' | 'title' | 'menu_order' | 'rand';
  order: 'asc' | 'desc';
  offset: number;
  
  // Filters
  categories: string[];
  tags: string[];
  customTaxonomies: Record<string, string[]>;
  metaQuery: MetaQuery[];
  
  // Display Settings
  template: 'default' | 'grid' | 'list' | 'custom';
  columns: number;
  showPagination: boolean;
  paginationType: 'numbers' | 'prev_next' | 'infinite';
  
  // Field Mapping
  fieldMap: {
    title: string;
    excerpt: string;
    image: string;
    customFields: Record<string, string>;
  };
  
  // Advanced
  className: string;
  anchor: string;
  align: 'none' | 'wide' | 'full';
}
```

## 🎨 UI/UX Mockups

### Inspector Panel Structure
```
┌─ CPT Loop Settings ─────────┐
│ Query                       │
│ ├─ Post Type: [Dropdown]    │
│ ├─ Posts/Page: [Number]     │
│ ├─ Order By: [Select]       │
│ └─ Order: [ASC/DESC]        │
│                             │
│ Filters                     │
│ ├─ Categories: [Multi]      │
│ ├─ Tags: [Multi]           │
│ └─ [+ Add Filter]          │
│                             │
│ Display                     │
│ ├─ Template: [Select]       │
│ ├─ Columns: [1-6]          │
│ └─ Pagination: [Toggle]     │
│                             │
│ Field Mapping              │
│ ├─ Title: [ACF Field]      │
│ ├─ Image: [ACF Field]      │
│ └─ [+ Map Field]           │
└─────────────────────────────┘
```

## 🚀 Development Milestones

### MVP (2 weeks)
- Basic query builder
- Default template
- Simple ACF field display

### Beta (4 weeks)
- Multiple templates
- Complex field support
- Frontend filtering

### Production (6 weeks)
- Performance optimization
- Full accessibility
- Custom template API

## 🧪 Testing Strategy

### Unit Tests
- Query builder logic
- Field mapping functions
- Template rendering

### Integration Tests
- API communication
- ACF field retrieval
- Pagination logic

### E2E Tests
- Block insertion
- Settings configuration
- Frontend display

## 📚 Documentation Needs

1. **User Guide**
   - How to add CPT Loop block
   - Query configuration
   - Template selection
   - Field mapping

2. **Developer Docs**
   - Custom template creation
   - Filter/action hooks
   - REST API reference

3. **Video Tutorials**
   - Basic setup
   - Advanced queries
   - Custom styling

## 🎯 Success Metrics

- Support all CPT types
- Handle all ACF field types
- < 200ms query response
- Mobile responsive
- WCAG 2.1 AA compliant

## 🔄 Future Enhancements

1. **Saved Queries** - Reusable query presets
2. **Visual Query Builder** - Drag-drop interface
3. **Live Search** - Frontend search integration
4. **Export/Import** - Block configuration portability
5. **Multi-language** - WPML/Polylang support