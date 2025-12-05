# CMS V2 Integration Library

This library connects the **main-site** frontend to the **CMS V2** backend API, enabling dynamic page rendering from CMS-managed content.

---

## 📁 Files

| File | Purpose |
|------|---------|
| `client.ts` | CMS V2 API client (fetch pages, views, CPTs) |
| `adapter.ts` | CMS View Schema → ViewRenderer Schema converter |
| `loader.ts` | CMS-integrated view loader with caching |
| `index.ts` | Public exports |
| `README.md` | This documentation |

---

## 🚀 Quick Start

### 1. CMS Page Rendering is Automatic

The ViewRenderer automatically tries to load pages from CMS before falling back to static JSON files.

**Priority order**:
1. CMS V2 API (dynamic pages)
2. Static JSON files (legacy views)
3. Not found page

### 2. Create a CMS Page

```bash
# Using the CMS API test runner
cd /home/dev/o4o-platform/docs/api-server/tests
./cms_api_test_runner.sh admin@neture.co.kr PASSWORD
```

**Or manually** (see API test matrix):
```bash
# Create CPT, View, and Page via CMS API
# Then publish the page
curl -X PUT https://api.neture.co.kr/api/v1/cms/pages/:id/publish \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 3. Access the Page

Once a page is published with slug `about-us`:
```
https://neture.co.kr/about-us
```

The ViewRenderer will automatically:
1. Fetch page from CMS API
2. Adapt CMS View Schema to ViewRenderer format
3. Render the page with registered components

---

## 📖 Usage Examples

### Checking if a Slug is a CMS Page

```typescript
import { isCMSPage } from '@/lib/cms';

const isCMS = await isCMSPage('about-us');
if (isCMS) {
  console.log('This page is managed by CMS');
}
```

### Manually Loading a CMS Page

```typescript
import { loadCMSView } from '@/lib/cms';

const view = await loadCMSView('about-us');
if (view) {
  // ViewSchema ready for ViewRenderer
  console.log(view.viewId, view.components);
}
```

### Fetching Page SEO

```typescript
import { getPageSEO } from '@/lib/cms';

const seo = await getPageSEO('about-us');
if (seo) {
  document.title = seo.title || 'Default Title';
  // Set meta tags...
}
```

### Clearing Cache (Development)

```typescript
import { clearCMSCache } from '@/lib/cms';

// Clear CMS page cache (useful in dev mode)
clearCMSCache();
```

---

## 🔄 How It Works

### 1. User Visits `/about-us`

```
Browser → main-site Router → ViewRenderer
```

### 2. ViewRenderer calls `loadView('/about-us')`

```typescript
// view/loader.ts
export async function loadView(url: string): Promise<ViewSchema> {
  // Priority 1: Try CMS
  const cmsView = await loadCMSView('about-us');
  if (cmsView) return cmsView;

  // Priority 2: Try static JSON
  return loadStaticView('about-us');
}
```

### 3. CMS Loader fetches from API

```typescript
// lib/cms/loader.ts
export async function loadCMSView(slug: string): Promise<ViewSchema | null> {
  const page = await fetchPageBySlug(slug); // GET /api/v1/cms/public/page/about-us
  if (!page) return null;

  return adaptCMSViewToViewSchema(page.view, page);
}
```

### 4. Adapter converts CMS Schema

```typescript
// lib/cms/adapter.ts
export function adaptCMSViewToViewSchema(cmsView, page): ViewSchema {
  return {
    viewId: cmsView.slug,
    layout: { type: extractLayoutType(cmsView.schema) },
    components: adaptComponents(cmsView.schema.components, page.content),
  };
}
```

### 5. ViewRenderer renders the page

```typescript
// view/renderer.tsx
<ViewContent view={view} />
  → Layout
    → Component 1
    → Component 2
    → ...
```

---

## 🎨 CMS View Schema Format

CMS V2 uses **ViewRenderer 2.0** compatible schema:

```json
{
  "version": "2.0",
  "type": "page",
  "components": [
    {
      "id": "hero-1",
      "type": "Hero",
      "props": {
        "title": "{{binding:page.heroTitle}}",
        "subtitle": "{{binding:page.heroSubtitle}}"
      }
    },
    {
      "id": "content-1",
      "type": "RichText",
      "props": {
        "content": "{{binding:page.mainContent}}"
      }
    }
  ],
  "bindings": [
    {
      "source": "cpt",
      "target": "blog-grid-1.props.posts",
      "query": { "type": "blog_post", "status": "published" }
    }
  ],
  "styles": {
    "theme": "default",
    "variables": {
      "--primary-color": "#3b82f6"
    }
  }
}
```

### Binding Syntax

| Binding | Resolves To |
|---------|-------------|
| `{{binding:page.fieldName}}` | Page content field |
| `{{binding:cpt.typeName.list}}` | CPT data (fetched via API) |

---

## 🔧 Adapter Logic

### Component Type Mapping

CMS component types map directly to ViewRenderer component registry:

| CMS Component | ViewRenderer Component |
|---------------|------------------------|
| `Hero` | `UIComponentRegistry['Hero']` |
| `RichText` | `UIComponentRegistry['RichText']` |
| `BlogGrid` | `UIComponentRegistry['BlogGrid']` |

If a component is not found, ViewRenderer shows an error message.

### Layout Extraction

```typescript
function extractLayoutType(schema: CMSViewSchema): string {
  if (schema.type === 'layout') return 'CMSCustomLayout';
  if (schema.styles?.theme) return `${schema.styles.theme}Layout`;
  return 'DefaultLayout'; // Fallback
}
```

### Props Resolution

```typescript
function resolvePropValue(value: any, pageContent?: Record<string, any>): any {
  // {{binding:page.fieldName}} → pageContent.fieldName
  const match = value.match(/\{\{binding:page\.(\w+)\}\}/);
  if (match && pageContent) {
    return pageContent[match[1]] || value;
  }
  return value;
}
```

---

## 🧪 Testing

### Manual Test

1. **Create a test page in CMS**:
```bash
cd /home/dev/o4o-platform/docs/api-server/tests
./cms_api_test_runner.sh admin@neture.co.kr PASSWORD
```

2. **Publish the page**:
```bash
curl -X PUT https://api.neture.co.kr/api/v1/cms/pages/:id/publish \
  -H "Authorization: Bearer $JWT_TOKEN"
```

3. **Visit the page**:
```
https://neture.co.kr/test-page
```

4. **Check console**:
```
✅ Loaded CMS page: test-page
```

### Automated Test

```typescript
import { loadCMSView, checkPageExists } from '@/lib/cms';

describe('CMS Integration', () => {
  it('should load CMS page', async () => {
    const view = await loadCMSView('test-page');
    expect(view).not.toBeNull();
    expect(view?.viewId).toBe('test-page');
  });

  it('should return null for non-existent page', async () => {
    const view = await loadCMSView('non-existent-404');
    expect(view).toBeNull();
  });

  it('should check page existence', async () => {
    const exists = await checkPageExists('test-page');
    expect(exists).toBe(true);
  });
});
```

---

## 🚨 Troubleshooting

### Issue: "View not found" error

**Possible causes**:
1. Page is not published (status !== 'published')
2. Page slug doesn't match URL
3. CMS API is down
4. View schema is incompatible

**Solution**:
```typescript
import { checkPageExists, isCMSPage } from '@/lib/cms';

const exists = await checkPageExists('my-page');
console.log('Page exists:', exists);

const isCMS = await isCMSPage('my-page');
console.log('Is CMS page:', isCMS);
```

### Issue: Components not rendering

**Possible causes**:
1. Component type not registered in ComponentRegistry
2. Props binding syntax incorrect
3. Page content missing required fields

**Solution**:
```typescript
import { UIComponentRegistry } from '@/components/registry';

// Check if component is registered
console.log('Hero registered:', 'Hero' in UIComponentRegistry);

// Check component props
console.log('View components:', view.components);
```

### Issue: Cache not clearing

**Solution**:
```typescript
import { clearCMSCache } from '@/lib/cms';

// In development mode
if (import.meta.env.DEV) {
  clearCMSCache();
}
```

---

## 🎯 Next Steps

### Phase C-2.5: Admin Dashboard CMS UI

Build admin interface for:
- CPT management
- Field configuration
- View designer
- Page editor
- Publishing workflow

### Phase C-3: Advanced Features

- Real-time preview
- Version comparison
- A/B testing
- Analytics integration

---

## 📚 Related Documentation

- **CMS V2 API**: `/docs/api-server/tests/cms_v2_test_matrix.md`
- **ViewRenderer**: `/apps/main-site/src/view/README.md`
- **Component Registry**: `/apps/main-site/src/components/registry/README.md`

---

*Last Updated: 2025-12-04*
*Phase: C-2.4 - ViewRenderer Integration*
