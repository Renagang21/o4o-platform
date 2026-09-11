# CPT Engine Documentation

Custom Post Type (CPT) & Advanced Custom Fields (ACF) Engine - Complete documentation for O4O Admin Dashboard.

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Field Types Reference](#field-types-reference)
3. [API Reference](#api-reference)
4. [Architecture Overview](#architecture-overview)
5. [Components Reference](#components-reference)

---

## Quick Start Guide

> Form Builder (FormBuilder / FormsManager / `/cpt/forms/*`) 는
> WO-O4O-UNPROVISIONED-FORM-AND-LEGACY-APP-AXIS-FINAL-DISPOSITION-V1 에서 제거됐다
> (운영 DB 에 forms 테이블 부재 · 메뉴·소비자 0). 본 문서는 CPT · Field Group · Taxonomy 만 다룬다.

Get started with CPT Engine in 5 minutes.

### Creating a Custom Post Type

```typescript
import { useCustomPostTypes } from '@/features/cpt-acf/hooks/useCustomPostTypes';

function MyComponent() {
  const { createCPT } = useCustomPostTypes();

  const handleCreate = async () => {
    await createCPT({
      name: 'Product',
      slug: 'product',
      description: 'E-commerce products',
      menuIcon: 'ShoppingCart',
      public: true,
      hasArchive: true,
      supports: ['title', 'editor', 'thumbnail'],
    });
  };
}
```

### Creating a Field Group

```typescript
import { useFieldGroups } from '@/features/cpt-acf/hooks/useFieldGroups';

function MyComponent() {
  const { createFieldGroup } = useFieldGroups();

  const handleCreate = async () => {
    await createFieldGroup({
      title: 'Product Details',
      location: [
        [{ param: 'post_type', operator: '==', value: 'product' }]
      ],
      fields: [
        {
          name: 'price',
          label: 'Price',
          type: 'number',
          required: true,
        },
        {
          name: 'description',
          label: 'Description',
          type: 'wysiwyg',
        }
      ]
    });
  };
}
```

---

## Field Types Reference

Complete reference for all 17+ supported field types.

### Basic Fields

#### Text
Simple text input field.

```typescript
{
  type: 'text',
  name: 'username',
  label: 'Username',
  placeholder: 'Enter username',
  required: true,
  validation: {
    minLength: 3,
    maxLength: 50,
    pattern: '^[a-zA-Z0-9_]+$',
  }
}
```

#### Textarea
Multi-line text input.

```typescript
{
  type: 'textarea',
  name: 'description',
  label: 'Description',
  rows: 5,
  placeholder: 'Enter description',
}
```

#### Number
Numeric input with validation.

```typescript
{
  type: 'number',
  name: 'price',
  label: 'Price',
  required: true,
  validation: {
    min: 0,
    max: 10000,
  }
}
```

#### Email
Email input with validation.

```typescript
{
  type: 'email',
  name: 'contact_email',
  label: 'Email Address',
  required: true,
}
```

#### URL
URL input with validation.

```typescript
{
  type: 'url',
  name: 'website',
  label: 'Website URL',
  placeholder: 'https://example.com',
}
```

### Choice Fields

#### Select
Dropdown selection.

```typescript
{
  type: 'select',
  name: 'category',
  label: 'Category',
  choices: [
    { value: 'tech', label: 'Technology' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'food', label: 'Food' },
  ],
  required: true,
}
```

#### Radio
Radio button selection.

```typescript
{
  type: 'radio',
  name: 'size',
  label: 'Size',
  choices: [
    { value: 's', label: 'Small' },
    { value: 'm', label: 'Medium' },
    { value: 'l', label: 'Large' },
  ],
  layout: 'horizontal', // or 'vertical'
}
```

#### Checkbox
Multiple choice checkboxes.

```typescript
{
  type: 'checkbox',
  name: 'features',
  label: 'Features',
  choices: [
    { value: 'wifi', label: 'WiFi' },
    { value: 'parking', label: 'Parking' },
    { value: 'pool', label: 'Swimming Pool' },
  ],
}
```

#### True/False
Boolean toggle.

```typescript
{
  type: 'true_false',
  name: 'featured',
  label: 'Featured Product',
  message: 'Mark this product as featured',
  defaultValue: false,
}
```

### Content Fields

#### WYSIWYG
Rich text editor (WordPress-style).

```typescript
{
  type: 'wysiwyg',
  name: 'content',
  label: 'Content',
  toolbar: 'full', // 'basic', 'full'
  mediaUpload: true,
}
```

#### Image
Image upload and selection.

```typescript
{
  type: 'image',
  name: 'thumbnail',
  label: 'Product Image',
  returnFormat: 'url', // 'id', 'url', 'object'
  previewSize: 'medium',
  required: true,
}
```

#### File
File upload.

```typescript
{
  type: 'file',
  name: 'document',
  label: 'Upload Document',
  mimeTypes: ['pdf', 'doc', 'docx'],
  returnFormat: 'url',
}
```

#### Gallery
Multiple image upload.

```typescript
{
  type: 'gallery',
  name: 'product_images',
  label: 'Product Gallery',
  min: 1,
  max: 10,
  previewSize: 'thumbnail',
}
```

### Relational Fields

#### Link
URL with title and target.

```typescript
{
  type: 'link',
  name: 'cta_link',
  label: 'Call to Action Link',
}

// Value format:
{
  url: 'https://example.com',
  title: 'Learn More',
  target: '_blank',
}
```

#### Post Object
Select a single post.

```typescript
{
  type: 'post_object',
  name: 'related_post',
  label: 'Related Post',
  postType: ['post', 'page'],
  allowNull: true,
  multiple: false,
}
```

#### Relationship
Select multiple posts.

```typescript
{
  type: 'relationship',
  name: 'related_products',
  label: 'Related Products',
  postType: ['product'],
  min: 0,
  max: 5,
  returnFormat: 'id', // 'id', 'object'
}
```

### Layout Fields

#### Repeater
Repeatable sub-fields.

```typescript
{
  type: 'repeater',
  name: 'team_members',
  label: 'Team Members',
  min: 1,
  max: 10,
  layout: 'table', // 'table', 'block', 'row'
  buttonLabel: 'Add Member',
  subFields: [
    {
      name: 'name',
      label: 'Name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      label: 'Role',
      type: 'text',
    },
    {
      name: 'bio',
      label: 'Bio',
      type: 'textarea',
    }
  ],
}

// Value format:
[
  { _id: '1', name: 'John Doe', role: 'Developer', bio: '...' },
  { _id: '2', name: 'Jane Smith', role: 'Designer', bio: '...' }
]
```

#### Group
Organize sub-fields.

```typescript
{
  type: 'group',
  name: 'contact_info',
  label: 'Contact Information',
  layout: 'block', // 'block', 'table', 'row'
  subFields: [
    {
      name: 'phone',
      label: 'Phone',
      type: 'tel',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
    }
  ],
}

// Value format:
{
  phone: '+1234567890',
  email: 'contact@example.com'
}
```

### Date/Time Fields

#### Date Picker
Date selection.

```typescript
{
  type: 'date',
  name: 'event_date',
  label: 'Event Date',
  displayFormat: 'YYYY-MM-DD',
  required: true,
}
```

#### Time Picker
Time selection.

```typescript
{
  type: 'time',
  name: 'event_time',
  label: 'Event Time',
  displayFormat: 'HH:mm',
}
```

#### Date Time Picker
Combined date and time.

```typescript
{
  type: 'datetime',
  name: 'published_at',
  label: 'Publish Date & Time',
  displayFormat: 'YYYY-MM-DD HH:mm',
}
```

## API Reference

### Custom Post Types API

#### Create CPT
Create a new custom post type.

**Endpoint:**
```
POST /api/cpt-engine/post-types
```

**Request Body:**
```typescript
{
  name: string;
  slug: string;
  description?: string;
  menuIcon?: string;
  public?: boolean;
  hasArchive?: boolean;
  supports?: string[];
  taxonomies?: string[];
}
```

#### Get CPTs
List all custom post types.

**Endpoint:**
```
GET /api/cpt-engine/post-types
```

### Field Groups API

#### Create Field Group
Create a new field group.

**Endpoint:**
```
POST /api/cpt-engine/field-groups
```

**Request Body:**
```typescript
{
  title: string;
  key?: string;
  location: FieldLocation[][];
  fields: CustomField[];
  active?: boolean;
  position?: 'normal' | 'side' | 'acf_after_title';
  style?: 'default' | 'seamless';
}
```

#### Get Field Groups
List all field groups.

**Endpoint:**
```
GET /api/cpt-engine/field-groups
```

---

## Architecture Overview

### Component Structure

```
src/features/cpt-acf/
├── components/
│   ├── fields/
│   │   ├── TextFieldInput.tsx
│   │   ├── RepeaterFieldInput.tsx
│   │   ├── GroupFieldInput.tsx
│   │   └── ... (other field types)
│   └── location-rules/
│       └── ... (location rule components)
├── hooks/
│   ├── useCustomPostTypes.ts     # CPT management
│   ├── useFieldGroups.ts          # Field group management
│   └── useLocationEvaluation.ts   # Location rule evaluation
└── types/
    └── acf.types.ts               # TypeScript definitions
```

### Location Rules

Field groups can be conditionally displayed based on location rules:

```typescript
[
  [
    { param: 'post_type', operator: '==', value: 'product' },
    { param: 'post_category', operator: '==', value: 'electronics' }
  ],
  [
    { param: 'page_template', operator: '==', value: 'template-custom.php' }
  ]
]
```

**Operators:**
- `==`: Equals
- `!=`: Not equals
- `contains`: Contains (for arrays)
- `!contains`: Does not contain

**Parameters:**
- `post_type`: Post type slug
- `post_category`: Category ID/slug
- `post_taxonomy`: Taxonomy term
- `page_template`: Template file
- `user_role`: User role

---

## Components Reference

### RepeaterFieldInput

Repeater field with dynamic rows.

**Props:**
```typescript
interface RepeaterFieldInputProps {
  field: CustomField;
  value?: RepeaterRow[];
  onChange?: (value: RepeaterRow[] | null) => void;
  disabled?: boolean;
  renderSubField?: (subField, value, onChange, disabled) => ReactNode;
}
```

**Features:**
- Add/remove rows
- Drag-and-drop reordering
- Three layout modes: table, block, row
- Collapsible rows
- Nested repeaters support

### GroupFieldInput

Group field for organizing sub-fields.

**Props:**
```typescript
interface GroupFieldInputProps {
  field: CustomField;
  value?: GroupValue;
  onChange?: (value: GroupValue | null) => void;
  disabled?: boolean;
  renderSubField?: (subField, value, onChange, disabled) => ReactNode;
}
```

**Layouts:**
- **Block**: Vertical layout with full-width labels
- **Table**: 2-column grid layout
- **Row**: Compact horizontal layout

---

## Best Practices

### 1. Field Naming

Use snake_case for field names:
```typescript
// Good
{ name: 'product_price', label: 'Product Price' }

// Avoid
{ name: 'productPrice', label: 'Product Price' }
{ name: 'product-price', label: 'Product Price' }
```

### 2. Validation

Always validate required fields and add appropriate validation rules:
```typescript
{
  type: 'email',
  name: 'contact_email',
  required: true,
  validation: {
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
  }
}
```

### 3. Default Values

Provide sensible defaults for better UX:
```typescript
{
  type: 'true_false',
  name: 'accept_terms',
  defaultValue: false,
}
```

### 4. Security

- Always sanitize WYSIWYG content on the server
- Validate file uploads (MIME types, size limits)
- Use CSRF tokens for form submissions
- Never trust client-side validation alone

### 5. Performance

- Use `React.memo()` for field components
- Debounce search/autocomplete inputs
- Lazy load heavy field types (Gallery, WYSIWYG)
- Virtual scrolling for large repeater fields

---

## Troubleshooting

### Field values not saving

**Check:**
1. Field group is assigned to correct location
2. Post type supports custom fields
3. User has permission to edit fields
4. No validation errors on save

### Type errors

**Check:**
1. Run `npm run type-check`
2. Ensure all field types match TypeScript definitions
3. Import types from `@/features/cpt-acf/types/acf.types`

---

## Migration Guide

### From WordPress ACF

If migrating from WordPress ACF:

1. **Field Types**: Most ACF field types are supported with same names
2. **Field Groups**: Export as JSON, convert to our format
3. **Location Rules**: Similar syntax, minor adjustments needed

### From Custom Implementation

If migrating from custom field implementation:

1. Map your field types to our supported types
2. Convert field configurations to our format
3. Update form submissions to use our API
4. Replace custom rendering with our components

---

## Support

For issues, questions, or feature requests:

1. Check this documentation
2. Review TypeScript types in `types/acf.types.ts`
3. Check example usage in components
4. Contact development team

---

**Last Updated**: 2025-10-11
**Version**: 1.0.0
**Stage**: 6 (Complete)
