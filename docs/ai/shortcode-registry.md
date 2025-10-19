# Shortcode Registry

> **AI Editor Reference**: Complete list of all available shortcodes with structured metadata.

---

## How to Use This Document

**Purpose**: This is a **machine-readable reference** for AI to understand available shortcodes.

**Format**: Each shortcode entry includes:
- Name
- Description
- Required/optional attributes with types and defaults
- Permission requirements
- Usage examples

---

## Content Shortcodes

### recent_posts

**Description**: Display list of recent blog posts

**Attributes**:
- `limit` (number, default: 5) - Number of posts to show
- `category` (string, optional) - Filter by specific category slug
- `show_date` (boolean, default: true) - Display publication date
- `show_excerpt` (boolean, default: false) - Display post excerpt
- `show_thumbnail` (boolean, default: true) - Display featured image

**Permissions**: None

**Examples**:
```
[recent_posts limit="10"]
[recent_posts category="news" show_excerpt="true"]
```

---

### author

**Description**: Display author profile information

**Attributes**:
- `id` (string, REQUIRED) - Author ID or username
- `show_avatar` (boolean, default: true) - Display author avatar
- `show_bio` (boolean, default: true) - Display bio/description
- `show_posts` (boolean, default: false) - Display list of author's posts

**Permissions**: None

**Examples**:
```
[author id="john"]
[author id="admin" show_posts="true"]
```

---

## Media Shortcodes

### gallery

**Description**: Display image gallery in grid layout

**Attributes**:
- `ids` (string, REQUIRED) - Comma-separated list of image IDs
- `columns` (number, default: 3) - Number of columns (1-6)
- `size` (string, default: "medium") - Image size: thumbnail, medium, large, full
- `link` (string, default: "file") - Click behavior: file, none

**Permissions**: None

**Examples**:
```
[gallery ids="1,2,3,4,5,6"]
[gallery ids="10,11,12" columns="4" size="large"]
```

---

### video

**Description**: Embed YouTube/Vimeo/local video

**Attributes**:
- `url` (string, REQUIRED) - Video URL
- `width` (string, default: "100%") - Video width
- `height` (string, default: "auto") - Video height
- `autoplay` (boolean, default: false) - Auto-play on load
- `controls` (boolean, default: true) - Show video controls
- `loop` (boolean, default: false) - Loop playback
- `muted` (boolean, default: false) - Start muted

**Permissions**: None

**Examples**:
```
[video url="https://youtube.com/watch?v=xxx"]
[video url="/uploads/demo.mp4" autoplay="true"]
```

---

## E-commerce Shortcodes

### product

**Description**: Display single product with details

**Attributes**:
- `id` (string, REQUIRED) - Product ID or slug
- `show_price` (boolean, default: true) - Display price
- `show_cart` (boolean, default: true) - Display add-to-cart button
- `show_description` (boolean, default: false) - Display product description
- `variant` (string, default: "card") - Display style: card, list, compact

**Permissions**: None

**Examples**:
```
[product id="123"]
[product id="awesome-product" variant="list"]
```

---

### product_grid

**Description**: Display products in grid layout

**Attributes**:
- `category` (string, optional) - Filter by category slug
- `limit` (number, default: 8) - Number of products to show
- `columns` (number, default: 4) - Grid columns (2-6)
- `featured` (boolean, default: false) - Show only featured products
- `on_sale` (boolean, default: false) - Show only discounted products
- `orderby` (string, default: "created_at") - Sort field: price, name, created_at, popularity
- `order` (string, default: "desc") - Sort order: asc, desc

**Permissions**: None

**Examples**:
```
[product_grid category="electronics" limit="12"]
[product_grid featured="true" columns="3"]
[product_grid on_sale="true" orderby="price" order="asc"]
```

---

### add_to_cart

**Description**: Add-to-cart button for specific product

**Attributes**:
- `id` (string, REQUIRED) - Product ID
- `text` (string, default: "장바구니에 담기") - Button text
- `show_price` (boolean, default: true) - Display price near button
- `quantity` (number, default: 1) - Default quantity
- `style` (string, default: "primary") - Button style: primary, secondary, outline
- `size` (string, default: "medium") - Button size: small, medium, large

**Permissions**: None

**Examples**:
```
[add_to_cart id="123"]
[add_to_cart id="456" text="지금 구매하기" style="secondary"]
```

---

### featured_products

**Description**: Display featured/recommended products

**Attributes**:
- `limit` (number, default: 4) - Number of products
- `columns` (number, default: 4) - Grid columns
- `title` (string, default: "추천 상품") - Section title
- `show_rating` (boolean, default: true) - Display product ratings
- `show_badge` (boolean, default: true) - Display badges (NEW, SALE)

**Permissions**: None

**Examples**:
```
[featured_products]
[featured_products limit="6" columns="3" title="이달의 추천"]
```

---

## Form Shortcodes

### form

**Description**: Display custom form

**Attributes**:
- `id` (string, REQUIRED) - Form ID
- `name` (string, optional) - Form name (alternative to ID)
- `show_title` (boolean, default: true) - Display form title
- `show_description` (boolean, default: true) - Display form description
- `theme` (string, default: "default") - Form theme: default, minimal, modern, classic
- `layout` (string, default: "vertical") - Form layout: vertical, horizontal, inline
- `ajax` (boolean, default: true) - Use AJAX submission

**Permissions**: None

**Examples**:
```
[form id="contact-form"]
[form name="newsletter" layout="inline"]
```

---

### view

**Description**: Display data view (submitted form data, user content)

**Attributes**:
- `id` (string, REQUIRED) - View ID
- `name` (string, optional) - View name (alternative to ID)
- `items_per_page` (number, default: 25) - Pagination size
- `enable_search` (boolean, default: true) - Enable search functionality
- `enable_filters` (boolean, default: true) - Enable filtering
- `layout` (string, default: "table") - Display layout: table, grid, list

**Permissions**: None

**Examples**:
```
[view id="submissions"]
[view name="gallery" layout="grid" items_per_page="12"]
```

---

## Dropshipping Shortcodes

### Partner Shortcodes

#### partner_dashboard

**Description**: Partner main dashboard with stats and quick actions

**Attributes**:
- `tab` (string, optional) - Initial tab: overview, commissions, links

**Permissions**: REQUIRED - Partner role

**Examples**:
```
[partner_dashboard]
[partner_dashboard tab="commissions"]
```

---

#### partner_products

**Description**: List of products partner can promote

**Attributes**:
- `category` (string, optional) - Filter by category
- `featured` (boolean, default: false) - Show only featured products
- `limit` (number, default: 12) - Number of products
- `sortBy` (string, default: "created_at") - Sort by: commission, performance, price, newest

**Permissions**: REQUIRED - Partner role

**Examples**:
```
[partner_products]
[partner_products category="electronics" featured="true"]
```

---

#### partner_commissions

**Description**: Partner commission history and stats

**Attributes**:
- `period` (string, default: "30d") - Time period: 7d, 30d, 90d, 1y
- `status` (string, default: "all") - Filter by status: all, pending, approved, paid, cancelled
- `compact` (boolean, default: false) - Use compact layout
- `showSummary` (boolean, default: true) - Display summary cards

**Permissions**: REQUIRED - Partner role

**Examples**:
```
[partner_commissions]
[partner_commissions period="90d" status="paid"]
```

---

### Supplier Shortcodes

#### supplier_products

**Description**: Supplier product management interface

**Attributes**: None

**Permissions**: REQUIRED - Supplier role

**Examples**:
```
[supplier_products]
```

---

#### supplier_product_editor

**Description**: Product creation and editing interface for suppliers

**Attributes**: None

**Permissions**: REQUIRED - Supplier role

**Examples**:
```
[supplier_product_editor]
```

---

### Seller Shortcodes

#### seller_dashboard

**Description**: Seller dashboard with sales stats and inventory

**Attributes**: None

**Permissions**: REQUIRED - Seller role

**Examples**:
```
[seller_dashboard]
```

---

## Dynamic Field Shortcodes

### cpt_list

**Description**: Display list of Custom Post Type entries

**Attributes**:
- `type` (string, REQUIRED) - CPT type (e.g., ds_supplier, ds_product)
- `limit` (number, default: 10) - Number of items
- `template` (string, optional) - Custom display template
- `fields` (string, optional) - Comma-separated field names to display

**Permissions**: None (depends on CPT visibility)

**Examples**:
```
[cpt_list type="ds_supplier" limit="20"]
[cpt_list type="ds_product" template="grid" fields="title,price,image"]
```

---

### cpt_field

**Description**: Display single field value from CPT

**Attributes**:
- `post_id` (string, REQUIRED) - Post ID
- `field` (string, REQUIRED) - Field name

**Permissions**: None (depends on CPT visibility)

**Examples**:
```
[cpt_field post_id="123" field="company_name"]
[cpt_field post_id="456" field="price"]
```

---

### acf_field

**Description**: Display Advanced Custom Fields value

**Attributes**:
- `field` (string, REQUIRED) - ACF field name
- `post_id` (string, optional) - Post ID (defaults to current post)
- `format` (boolean, default: true) - Apply ACF formatting

**Permissions**: None (depends on field visibility)

**Examples**:
```
[acf_field field="contact_email"]
[acf_field field="company_logo" post_id="123"]
```

---

## Quick Reference Table

| Shortcode | Category | Required Attrs | Permission |
|-----------|----------|----------------|------------|
| `recent_posts` | Content | - | None |
| `author` | Content | `id` | None |
| `gallery` | Media | `ids` | None |
| `video` | Media | `url` | None |
| `product` | E-commerce | `id` | None |
| `product_grid` | E-commerce | - | None |
| `add_to_cart` | E-commerce | `id` | None |
| `featured_products` | E-commerce | - | None |
| `form` | Form | `id` | None |
| `view` | Form | `id` | None |
| `partner_dashboard` | Dropshipping | - | Partner |
| `partner_products` | Dropshipping | - | Partner |
| `partner_commissions` | Dropshipping | - | Partner |
| `supplier_products` | Dropshipping | - | Supplier |
| `supplier_product_editor` | Dropshipping | - | Supplier |
| `seller_dashboard` | Dropshipping | - | Seller |
| `cpt_list` | Dynamic | `type` | Varies |
| `cpt_field` | Dynamic | `post_id`, `field` | Varies |
| `acf_field` | Dynamic | `field` | Varies |

---

**Version**: 1.0
**Last Updated**: 2025-10-19
**Total Shortcodes**: 19
