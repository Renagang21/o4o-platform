# CPT Registry Developer Guide

**Phase 5: Central CPT Schema Registration System**

## Overview

The CPT Registry provides a centralized, type-safe system for registering and validating Custom Post Type (CPT) schemas across the O4O platform. It enforces schema consistency, validates field structures, and provides runtime access to CPT definitions.

## Key Benefits

1. **Single Source of Truth (SSOT)**: All CPT schemas defined in one location
2. **Type Safety**: Full TypeScript support for schema definitions
3. **Validation**: Automatic validation of schema structure, field names, and meta keys
4. **Minimal Boilerplate**: Add new CPTs with just one schema file
5. **Runtime Access**: Query registered schemas at runtime

## Quick Start

### 1. Create a New CPT Schema

Create a file in `apps/api-server/src/schemas/your_cpt.schema.ts`:

```typescript
import type { CPTSchema } from '@o4o/cpt-registry';

export const yourCptSchema: CPTSchema = {
  name: 'your_cpt',
  label: 'Your CPT',
  label_plural: 'Your CPTs',
  description: 'Description of your CPT',

  fields: [
    {
      name: 'field_name',
      label: 'Field Label',
      type: 'text',
      required: true,
    },
    // More fields...
  ],

  meta: {
    allowed: ['field_name'], // Whitelist meta keys
    allow_dynamic: false, // Strict mode
  },

  taxonomies: ['category', 'tag'],
  supports_featured_image: true,
  has_archive: true,
  public: true,
};
```

### 2. Register the Schema

Add your schema to `apps/api-server/src/init/cpt.init.ts`:

```typescript
import { yourCptSchema } from '../schemas/your_cpt.schema.js';

// In the schemas array:
const schemas = [
  dsProductSchema,
  yourCptSchema, // Add your schema here
];
```

### 3. Build and Test

```bash
pnpm run build
# Server will auto-register on startup
```

That's it! Your CPT is now registered and validated.

## Field Types

The registry supports 25+ ACF-style field types:

### Basic Fields
- `text`, `textarea`, `number`, `email`, `url`, `password`
- `wysiwyg` (rich text editor)

### Media Fields
- `image`, `file`, `gallery`

### Choice Fields
- `select`, `checkbox`, `radio`, `true_false`

### Date/Time Fields
- `date_picker`, `date_time_picker`, `time_picker`

### Advanced Fields
- `color_picker`, `link`, `google_map`

### Relational Fields
- `post_object`, `page_link`, `relationship`
- `taxonomy`, `user`

### Layout Fields
- `repeater` (arrays with sub_fields)
- `group` (objects with sub_fields)
- `clone`

## Field Examples

### Basic Text Field

```typescript
{
  name: 'title',
  label: 'Title',
  type: 'text',
  required: true,
  default_value: '',
  instructions: 'Enter the title',
}
```

### Number Field with Validation

```typescript
{
  name: 'price',
  label: 'Price',
  type: 'number',
  required: true,
  instructions: 'Product price in KRW',
}
```

### Select Field with Options

```typescript
{
  name: 'status',
  label: 'Status',
  type: 'select',
  choices: {
    active: 'Active',
    inactive: 'Inactive',
    archived: 'Archived',
  },
  default_value: 'active',
}
```

### Repeater Field (Nested Array)

```typescript
{
  name: 'specifications',
  label: 'Product Specifications',
  type: 'repeater',
  sub_fields: [
    {
      name: 'spec_name',
      label: 'Spec Name',
      type: 'text',
      required: true,
    },
    {
      name: 'spec_value',
      label: 'Spec Value',
      type: 'text',
      required: true,
    },
  ],
  min: 0,
  max: 20,
  layout: 'table',
  button_label: 'Add Specification',
}
```

### Group Field (Nested Object)

```typescript
{
  name: 'shipping_info',
  label: 'Shipping Information',
  type: 'group',
  sub_fields: [
    {
      name: 'weight',
      label: 'Weight (kg)',
      type: 'number',
    },
    {
      name: 'dimensions',
      label: 'Dimensions',
      type: 'text',
      instructions: 'Format: L x W x H (cm)',
    },
    {
      name: 'free_shipping',
      label: 'Free Shipping',
      type: 'true_false',
      default_value: false,
    },
  ],
  layout: 'block',
}
```

## Meta Key Validation

Control which meta keys are allowed in `post_meta` table:

### Whitelist Mode (Recommended)

```typescript
meta: {
  allowed: ['price', 'sku', 'stock_quantity'],
  allow_dynamic: false, // Only whitelisted keys allowed
}
```

### Blacklist Mode

```typescript
meta: {
  forbidden: ['_internal_cache', '_temp_data'],
  allow_dynamic: true, // All keys except blacklisted
}
```

### Open Mode (Not Recommended)

```typescript
meta: {
  allow_dynamic: true, // Any key allowed
}
```

## Validation Rules

### CPT Name Pattern

- Must match: `/^[a-z_][a-z0-9_]*$/`
- Examples: `ds_product`, `event`, `portfolio_item`
- Invalid: `dsProduct`, `DS-Product`, `123event`

### Field Name Pattern

- Must match: `/^[a-z_][a-z0-9_]*$/`
- Examples: `price`, `sale_price`, `product_sku`
- Invalid: `priceUSD`, `sale-price`, `123field`

### Meta Key Pattern

- Must match: `/^[a-zA-Z0-9_:-]{1,255}$/`
- Examples: `price`, `_thumbnail_id`, `acf:field_name`
- Max length: 255 characters

## Runtime API

### Access Registry

```typescript
import { registry } from '@o4o/cpt-registry';

// Get a specific schema
const schema = registry.get('ds_product');

// List all schemas
const allSchemas = registry.list();

// Check if registered
if (registry.has('event')) {
  // ...
}

// Get all CPT names
const names = registry.listNames(); // ['ds_product', 'event', ...]
```

### Validate a Schema

```typescript
import { validateCPTSchema } from '@o4o/cpt-registry';

const result = validateCPTSchema(mySchema);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Validate Meta Keys

```typescript
import { validateMetaKey } from '@o4o/cpt-registry';

const schema = registry.get('ds_product');
const isValid = validateMetaKey(schema!, 'price'); // true
const isInvalid = validateMetaKey(schema!, 'unauthorized_key'); // false
```

## Integration with CPT Service

The registry is automatically initialized on server startup before the CPT service. You can query schemas within your service:

```typescript
import { registry } from '@o4o/cpt-registry';

class CPTService {
  async createPost(cptSlug: string, data: any) {
    // Get schema for validation
    const schema = registry.get(cptSlug);

    if (!schema) {
      throw new Error(`Unknown CPT: ${cptSlug}`);
    }

    // Validate meta keys against schema
    if (data.meta) {
      for (const key of Object.keys(data.meta)) {
        if (!validateMetaKey(schema, key)) {
          throw new Error(`Invalid meta key: ${key}`);
        }
      }
    }

    // Continue with post creation...
  }
}
```

## Example: Complete Schema

See `apps/api-server/src/schemas/ds_product.schema.ts` for a comprehensive example with:

- Multiple field types (text, number, select, gallery)
- Repeater fields for specifications
- Group fields for shipping info
- Meta key whitelist
- Taxonomy support
- RBAC capabilities

## Troubleshooting

### "Cannot find module '@o4o/cpt-registry'"

1. Ensure package is built: `cd packages/cpt-registry && pnpm run build`
2. Check symlink exists: `ls -la apps/api-server/node_modules/@o4o/cpt-registry`
3. Re-run install: `pnpm install`

### Validation Errors on Registration

Check the server logs for detailed validation errors:

```
[CPT Registry] ✗ Failed to register "my_cpt":
  name: CPT name "myCpt" must match pattern: /^[a-z_][a-z0-9_]*$/
  fields.price: Duplicate field name: "price"
  meta.allowed: Invalid meta key "_cache-123"
```

### Schema Not Loading

Verify the schema is imported and added to the array in `cpt.init.ts`:

```typescript
import { mySchema } from '../schemas/my_cpt.schema.js';

const schemas = [
  dsProductSchema,
  mySchema, // Must be added here
];
```

## Future Enhancements

- [ ] GraphQL schema generation from CPT schemas
- [ ] Admin UI for schema management
- [ ] Schema versioning and migrations
- [ ] Field-level validation rules (min, max, pattern)
- [ ] Custom field type plugins
- [ ] Schema export/import (JSON format)

## Related Documentation

- Phase 4-1: Meta API Endpoints (DS_API_CONTRACT_MATRIX.md)
- Phase 4-2: Client Migration (DS_CLEANUP_PLAN.md)
- ACF Field Reference: https://www.advancedcustomfields.com/resources/

---

**Last Updated**: 2025-11-06
**Phase**: 5 - CPT Registry
**Status**: ✅ Complete
