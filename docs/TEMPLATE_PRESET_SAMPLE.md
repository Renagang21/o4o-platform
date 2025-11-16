# TemplatePreset Sample for Product Detail Page

This document shows a sample TemplatePreset configuration for displaying product detail pages using the new TemplatePreset system.

## Sample TemplatePreset JSON for `ds_product` CPT

```json
{
  "name": "Product Detail - Two Column Layout",
  "description": "Standard product detail page with image gallery on left, product info on right",
  "cptSlug": "ds_product",
  "config": {
    "layout": {
      "type": "2-column-left",
      "header": {
        "blocks": []
      },
      "main": {
        "blocks": [
          {
            "blockName": "product-title",
            "props": {
              "level": 1,
              "align": "left"
            },
            "order": 1
          },
          {
            "blockName": "product-price",
            "props": {
              "align": "left",
              "showDiscount": true
            },
            "order": 2
          },
          {
            "blockName": "product-description",
            "props": {
              "showTitle": true,
              "title": "상품 설명"
            },
            "order": 3
          }
        ]
      },
      "sidebar": {
        "blocks": [
          {
            "blockName": "product-gallery",
            "props": {
              "showThumbnails": true
            },
            "order": 1
          }
        ]
      },
      "footer": {
        "blocks": [
          {
            "blockName": "add-to-cart-panel",
            "props": {
              "showStock": true
            },
            "order": 1
          }
        ]
      }
    },
    "seoMeta": {
      "titleTemplate": "{title} | O4O Store",
      "descriptionField": "description",
      "ogImageField": "featured_image"
    },
    "schemaOrg": {
      "type": "Product",
      "fieldMapping": {
        "name": "title",
        "description": "description",
        "image": "featured_image",
        "offers": {
          "price": "price",
          "priceCurrency": "currency"
        }
      }
    }
  },
  "roles": [],
  "isActive": true
}
```

## Alternative Layout: Single Column

```json
{
  "name": "Product Detail - Single Column Layout",
  "description": "Simple single column layout for product details",
  "cptSlug": "ds_product",
  "config": {
    "layout": {
      "type": "1-column",
      "header": {
        "blocks": [
          {
            "blockName": "product-gallery",
            "props": {
              "showThumbnails": true
            },
            "order": 1
          }
        ]
      },
      "main": {
        "blocks": [
          {
            "blockName": "product-title",
            "props": {
              "level": 1,
              "align": "left"
            },
            "order": 1
          },
          {
            "blockName": "product-price",
            "props": {
              "align": "left",
              "showDiscount": true
            },
            "order": 2
          },
          {
            "blockName": "add-to-cart-panel",
            "props": {
              "showStock": true
            },
            "order": 3
          },
          {
            "blockName": "product-description",
            "props": {
              "showTitle": true,
              "title": "상품 설명"
            },
            "order": 4
          }
        ]
      },
      "footer": {
        "blocks": []
      }
    },
    "seoMeta": {
      "titleTemplate": "{title} | O4O Store"
    }
  },
  "isActive": true
}
```

## How to Use

### 1. Create the TemplatePreset via Admin API

```bash
curl -X POST 'https://api.neture.co.kr/api/v1/presets/templates' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "name": "Product Detail - Two Column Layout",
    "description": "Standard product detail page with image gallery on left, product info on right",
    "cptSlug": "ds_product",
    "config": {
      "layout": {
        "type": "2-column-left",
        ...
      },
      ...
    }
  }'
```

### 2. Get the TemplatePreset ID from the response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Product Detail - Two Column Layout",
    ...
  }
}
```

### 3. Set the TemplatePreset ID in the CPT configuration

Go to Admin Dashboard → CPT Builder → Edit `ds_product` CPT → Advanced Settings:

- **Default Template Preset ID**: `550e8400-e29b-41d4-a716-446655440000`

Save the CPT configuration.

### 4. Test the Product Detail Page

Navigate to any product detail page:
- URL pattern: `/cpt/ds_product/{product-slug}`
- Example: `/cpt/ds_product/sample-product`

The page should now render using the TemplatePreset layout with the product blocks.

## Available Product Blocks

### 1. `product-title`
Displays the product title.

**Props:**
- `level` (number, default: 1): Heading level (1-6)
- `align` (string, default: 'left'): Text alignment

### 2. `product-price`
Displays the product price with optional discount information.

**Props:**
- `align` (string, default: 'left'): Text alignment
- `showDiscount` (boolean, default: true): Show discount badge and original price

**Required Custom Fields:**
- `price` (number): Current price
- `original_price` (number, optional): Original price before discount
- `currency` (string, default: 'KRW'): Currency code

### 3. `product-gallery`
Displays product images with thumbnail navigation.

**Props:**
- `showThumbnails` (boolean, default: true): Show thumbnail grid

**Required Custom Fields:**
- `images` (string[]): Array of image URLs
- Falls back to `featuredImage` if no gallery images

### 4. `product-description`
Displays the product description.

**Props:**
- `showTitle` (boolean, default: true): Show section title
- `title` (string, default: '상품 설명'): Section title text

**Required Custom Fields:**
- `description` (string): Product description text
- Falls back to `excerpt` if no description

### 5. `add-to-cart-panel`
Displays quantity selector and purchase buttons.

**Props:**
- `showStock` (boolean, default: true): Show stock information

**Required Custom Fields:**
- `price` (number): Product price
- `stock_quantity` (number): Available stock
- `is_available` (boolean): Product availability status
- `currency` (string, default: 'KRW'): Currency code

**Events:**
- Dispatches `addToCart` custom event on "장바구니 담기" button click
- Dispatches `buyNow` custom event on "바로 구매" button click

## Layout Types

- `1-column`: Single column layout (main content area)
- `2-column-left`: Two columns with sidebar on left (sidebar | main)
- `2-column-right`: Two columns with sidebar on right (main | sidebar)
- `3-column`: Three columns (sidebar | main | footer as right sidebar)

## Integration with Product Data

Product blocks automatically access post data through the `_postData` context injected by CPTSingle component. The data structure includes:

```typescript
{
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  customFields?: {
    price?: number;
    original_price?: number;
    currency?: string;
    stock_quantity?: number;
    is_available?: boolean;
    description?: string;
    images?: string[];
    // ... other custom fields
  };
  meta?: Record<string, any>;
}
```

## Testing Checklist

- [ ] Create TemplatePreset via API or Admin
- [ ] Get TemplatePreset ID from response
- [ ] Update CPT `ds_product` with `defaultTemplatePresetId`
- [ ] Navigate to `/cpt/ds_product/{slug}`
- [ ] Verify layout renders correctly
- [ ] Test all product blocks display proper information
- [ ] Test add to cart functionality (event dispatch)
- [ ] Test with products that have missing fields (graceful fallback)
- [ ] Test different layout types (1-column, 2-column-left, 2-column-right, 3-column)
