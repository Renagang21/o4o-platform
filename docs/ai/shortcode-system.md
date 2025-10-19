# Shortcode System Architecture

> **AI Editor Reference**: This document explains the shortcode system architecture for AI-powered content generation.

---

## System Overview

The O4O Platform uses a **shortcode-based component system** to embed dynamic content in pages and posts. The system consists of:

1. **Parser**: Extracts shortcodes from content strings
2. **Registry**: Manages shortcode definitions and components
3. **Renderer**: Converts shortcodes to React components
4. **Provider**: Supplies context and authentication

---

## Core Components

### 1. Shortcode Parser

**Location**: `packages/shortcodes/src/parser.ts`

**Functionality**:
- Extracts shortcodes from text using regex
- Parses attributes (key-value pairs)
- Handles both self-closing and paired shortcodes

**Pattern**:
```regex
\[(\w+)([^\]]*)\]        # Self-closing: [shortcode attr="value"]
\[(\w+)([^\]]*)\](.*?)\[/\1\]  # Paired: [shortcode]content[/shortcode]
```

**Output**:
```typescript
interface ParsedShortcode {
  fullMatch: string;
  name: string;
  attributes: Record<string, string | number | boolean>;
  content?: string;
  isSelfClosing: boolean;
}
```

---

### 2. Shortcode Registry

**Location**: `packages/shortcodes/src/registry.ts`

**Functionality**:
- Stores shortcode definitions
- Maps shortcode names to React components
- Validates attributes

**Definition Structure**:
```typescript
interface ShortcodeDefinition {
  name: string;
  component: React.ComponentType;
  description: string;
  attributes: {
    [attrName: string]: {
      type: 'string' | 'number' | 'boolean';
      required?: boolean;
      default?: any;
    }
  };
  defaultAttributes?: Record<string, any>;
}
```

---

### 3. Shortcode Renderer

**Location**: `packages/shortcodes/src/renderer.ts`

**Functionality**:
- Converts parsed shortcodes to React elements
- Passes context (user, auth, theme)
- Handles errors gracefully

**Usage**:
```typescript
import { renderShortcodes } from '@o4o/shortcodes';

const content = '[product id="123"]';
const rendered = renderShortcodes(content, { user, authClient });
```

---

## Shortcode Categories

### 1. Content Shortcodes
- **Purpose**: Display blog posts, authors, etc.
- **Examples**: `[recent_posts]`, `[author]`
- **Location**: Core registry

### 2. Media Shortcodes
- **Purpose**: Embed images, videos, galleries
- **Examples**: `[gallery]`, `[video]`
- **Location**: Core registry

### 3. E-commerce Shortcodes
- **Purpose**: Product display, cart buttons
- **Examples**: `[product]`, `[product_grid]`, `[add_to_cart]`
- **Location**: Core registry

### 4. Form Shortcodes
- **Purpose**: Dynamic forms and data views
- **Examples**: `[form]`, `[view]`
- **Location**: Core registry

### 5. Dropshipping Shortcodes
- **Purpose**: Partner/supplier/seller dashboards
- **Examples**: `[partner_dashboard]`, `[supplier_products]`
- **Location**: `packages/shortcodes/src/dropshipping/`

### 6. Dynamic Shortcodes
- **Purpose**: CPT/ACF field values
- **Examples**: `[cpt_list]`, `[cpt_field]`, `[acf_field]`
- **Location**: `packages/shortcodes/src/dynamic/`

### 7. Auth Shortcodes
- **Purpose**: Social login, authentication
- **Examples**: `[social_login]`
- **Location**: `packages/shortcodes/src/auth/`

---

## Registration Flow

### 1. Automatic Registration (Built-in)

```typescript
// packages/shortcodes/src/dropshipping/index.ts
import { globalRegistry } from '../registry';

export function registerDropshippingShortcodes() {
  globalRegistry.register({
    name: 'partner_dashboard',
    component: PartnerDashboard,
    description: 'Partner main dashboard',
    attributes: {
      tab: {
        type: 'string',
        default: 'overview'
      }
    }
  });
}
```

### 2. Manual Registration (Admin)

```typescript
// apps/admin-dashboard/src/utils/register-dynamic-shortcodes.ts
import { registerShortcode } from '@o4o/shortcodes';

registerShortcode('my_shortcode', {
  component: MyComponent,
  description: '...',
  attributes: {...}
});
```

---

## Attribute Types

### Supported Types

| Type | TypeScript | Example Value |
|------|-----------|---------------|
| `string` | `string` | `"hello"` |
| `number` | `number` | `42` |
| `boolean` | `boolean` | `true`, `false` |

### Attribute Parsing

```typescript
// Input
[product id="123" show_cart="true" limit=5]

// Parsed attributes
{
  id: "123",        // string
  show_cart: true,  // boolean (parsed from "true")
  limit: 5          // number (parsed from "5")
}
```

---

## Security & Permissions

### Authentication

Dropshipping shortcodes require authentication:

```typescript
// Shortcode component checks auth
const PartnerDashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginPrompt />;
  }

  if (!user.roles.includes('partner')) {
    return <PermissionDenied />;
  }

  return <Dashboard />;
};
```

### Role-Based Access

| Shortcode Category | Required Role |
|-------------------|---------------|
| Content/Media/E-commerce | None (public) |
| Forms | None |
| Partner | `partner` role |
| Supplier | `supplier` role |
| Seller | `seller` role |
| Admin | `admin` role |

---

## Error Handling

### Graceful Degradation

```typescript
// If shortcode not found
[unknown_shortcode]
→ Displays: (empty) or warning in dev mode

// If attribute validation fails
[product]  // missing required "id"
→ Displays: Error message or fallback UI

// If component throws error
[product id="invalid"]
→ Displays: Error boundary with friendly message
```

---

## Performance Considerations

### Caching

- **Dynamic shortcodes** use React Query for API call caching
- **Static content** renders without API calls

### Lazy Loading

```typescript
// Large components are lazy-loaded
const PartnerDashboard = lazy(() => import('./PartnerDashboard'));
```

### Optimization

- Avoid nesting shortcodes deeply
- Limit number of shortcodes per page
- Use `limit` attributes to control data fetching

---

## AI Editor Integration Points

### 1. Shortcode Detection

AI should recognize when to use shortcodes:

```
User: "Show recent blog posts"
AI: Should use [recent_posts limit="5"]

User: "Add product grid for electronics"
AI: Should use [product_grid category="electronics"]
```

### 2. Attribute Generation

AI should populate attributes based on context:

```
User: "Show 10 products from clothing category"
AI: [product_grid category="clothing" limit="10"]
```

### 3. Context Awareness

AI should know shortcode requirements:

```
User: "Add partner dashboard"
AI: [partner_dashboard] + warns about partner role requirement
```

---

## Reference Implementation

### Complete Example

```typescript
// 1. Define component
const ProductGrid: React.FC<{ category?: string; limit?: number }> = ({
  category,
  limit = 8
}) => {
  const { data } = useQuery(['products', category], () =>
    fetchProducts({ category, limit })
  );

  return <Grid products={data} />;
};

// 2. Register shortcode
registerShortcode('product_grid', {
  component: ProductGrid,
  description: 'Display products in grid layout',
  attributes: {
    category: { type: 'string' },
    limit: { type: 'number', default: 8 }
  }
});

// 3. Use in content
const content = '[product_grid category="electronics" limit="12"]';
const rendered = renderShortcodes(content);
```

---

## Best Practices for AI

1. **Always specify required attributes**
2. **Use sensible defaults** when user doesn't specify
3. **Respect permissions** - don't suggest shortcodes user can't access
4. **Combine shortcodes appropriately** - don't overuse
5. **Validate context** - ensure shortcode makes sense in current page type

---

**Version**: 1.0
**Last Updated**: 2025-10-19
