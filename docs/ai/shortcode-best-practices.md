# Shortcode Best Practices for AI Editors

> **AI Editor Reference**: Rules and guidelines for generating shortcode-based content.

---

## Core Principles

### 1. **User Intent First**

Always understand what the user wants before suggesting shortcodes.

**Bad**:
```
User: "I need a contact form"
AI: [form id="123"]  # Random ID
```

**Good**:
```
User: "I need a contact form"
AI: [form id="contact-form"]  # Descriptive ID
AI: Note: Make sure a form with ID "contact-form" exists in your Forms section.
```

---

### 2. **Specify Required Attributes**

Never omit required attributes.

**Bad**:
```
[product]  # Missing required "id"
[author]   # Missing required "id"
```

**Good**:
```
[product id="123"]
[author id="john"]
```

---

### 3. **Use Sensible Defaults**

Don't specify optional attributes unless user explicitly asks.

**Bad**:
```
[product_grid category="electronics" limit="8" columns="4" orderby="created_at" order="desc"]
```

**Good**:
```
[product_grid category="electronics"]  # Uses defaults: limit=8, columns=4
```

**Better** (if user asked for specific count):
```
[product_grid category="electronics" limit="12"]
```

---

## Permission Awareness

### Check User Context

Before suggesting shortcodes with permission requirements, verify user context.

**Permission-Required Shortcodes**:
- `[partner_dashboard]` → Partner role
- `[partner_products]` → Partner role
- `[partner_commissions]` → Partner role
- `[supplier_products]` → Supplier role
- `[supplier_product_editor]` → Supplier role
- `[seller_dashboard]` → Seller role

**Example**:
```
User (Partner): "Show my dashboard"
AI: [partner_dashboard]  # ✅ Correct

User (Guest): "Show my dashboard"
AI: You need to log in as a partner to access the dashboard.
    Would you like me to add a login prompt instead?  # ✅ Correct
```

---

## Shortcode Selection Rules

### Rule 1: Match Intent to Category

| User Intent | Shortcode Category | Examples |
|-------------|-------------------|----------|
| "Show recent articles/posts" | Content | `[recent_posts]` |
| "Display author bio" | Content | `[author]` |
| "Add product" | E-commerce | `[product]` |
| "Show product catalog" | E-commerce | `[product_grid]` |
| "Insert buy button" | E-commerce | `[add_to_cart]` |
| "Add contact form" | Form | `[form]` |
| "Show image gallery" | Media | `[gallery]` |
| "Embed video" | Media | `[video]` |
| "Partner stats/earnings" | Dropshipping | `[partner_*]` |

---

### Rule 2: Avoid Over-nesting

Don't nest shortcodes unless absolutely necessary.

**Bad**:
```
[row]
  [column]
    [product_grid]
      [product id="123"]  # Product shortcode inside grid
    [/product_grid]
  [/column]
[/row]
```

**Good**:
```
[product_grid category="electronics" limit="8"]
```

---

### Rule 3: Combine Appropriately

Use multiple shortcodes to build rich pages, but don't overdo it.

**Bad** (too many):
```
[recent_posts limit="3"]
[recent_posts limit="5"]
[recent_posts limit="10"]
[product_grid]
[product_grid featured="true"]
[gallery ids="1,2,3"]
[gallery ids="4,5,6"]
```

**Good** (balanced):
```
<h2>Latest News</h2>
[recent_posts limit="5"]

<h2>Our Products</h2>
[product_grid featured="true" limit="8"]

<h2>Gallery</h2>
[gallery ids="1,2,3,4,5,6"]
```

---

## Attribute Best Practices

### Use Descriptive IDs

When user doesn't specify an ID, suggest descriptive ones.

**Bad**:
```
[form id="1"]
[form id="form123"]
```

**Good**:
```
[form id="contact-form"]
[form id="newsletter-signup"]
[form id="product-inquiry"]
```

---

### Boolean Attributes

Always use `"true"` or `"false"` strings.

**Bad**:
```
[product show_price=true]      # Unquoted
[product show_price="TRUE"]    # Uppercase
[product show_price="1"]       # Numeric
```

**Good**:
```
[product id="123" show_price="true"]
[product id="123" show_price="false"]
```

---

### Numeric Attributes

Can be quoted or unquoted, but be consistent.

**Acceptable**:
```
[product_grid limit="10"]   # Quoted
[product_grid limit=10]     # Unquoted
```

**Recommended**:
```
[product_grid limit="10"]   # Quoted (consistent with strings)
```

---

### String Attributes with Spaces

Always quote strings containing spaces.

**Bad**:
```
[add_to_cart id="123" text=Buy Now]
```

**Good**:
```
[add_to_cart id="123" text="Buy Now"]
```

---

## Context-Specific Rules

### E-commerce Pages

**Product Detail Page**:
```
# Primary product
[product id="main-product" show_description="true"]

# Related products
<h3>Related Products</h3>
[product_grid category="same-category" limit="4"]
```

**Category Page**:
```
[product_grid category="electronics" limit="20"]
```

**Homepage**:
```
# Featured section
[featured_products limit="8"]

# All products
[product_grid limit="12"]
```

---

### Blog/Content Pages

**Blog Homepage**:
```
[recent_posts limit="10" show_excerpt="true"]
```

**Author Page**:
```
[author id="author-slug" show_posts="true"]
```

**Sidebar Widget**:
```
[recent_posts limit="5" show_thumbnail="false"]
```

---

### Dropshipping Portal Pages

**Partner Portal**:
```
<h1>Welcome, Partner!</h1>
[partner_dashboard]

<h2>Products to Promote</h2>
[partner_products featured="true"]

<h2>Your Earnings</h2>
[partner_commissions period="30d"]
```

**Supplier Portal**:
```
<h1>Supplier Dashboard</h1>
[supplier_products]
```

---

## Error Prevention

### Validate Before Suggesting

**Check 1**: Does shortcode exist?
```
User: "Add xyz shortcode"
AI: I don't find a shortcode named "xyz".
    Did you mean: [product]? [product_grid]?
```

**Check 2**: Are required attributes provided?
```
User: "Add product"
AI: [product id="???"]
    Note: Please provide a product ID
```

**Check 3**: Do attribute values make sense?
```
User: "Show 1000 products"
AI: [product_grid limit="20"]
    Note: Showing too many products may slow down the page.
          I've limited it to 20. You can increase if needed.
```

---

### Provide Helpful Warnings

**Permission Warnings**:
```
AI: I've added [partner_dashboard].
    ⚠️ Note: This will only work for users logged in with Partner role.
```

**Missing Content Warnings**:
```
AI: I've added [gallery ids="1,2,3"].
    ⚠️ Make sure images with IDs 1, 2, 3 exist in your Media Library.
```

---

## Shortcode Combinations

### Common Patterns

**Product Showcase Page**:
```html
<h1>Our Products</h1>

<h2>Featured Products</h2>
[featured_products limit="4"]

<h2>All Products</h2>
[product_grid limit="16" orderby="popularity"]

<h2>Contact Us</h2>
[form id="product-inquiry"]
```

**Partner Welcome Page**:
```html
<h1>Partner Portal</h1>
[partner_dashboard tab="overview"]

<h2>Top Performing Products</h2>
[partner_products sortBy="performance" limit="8"]

<h2>Recent Commissions</h2>
[partner_commissions period="7d"]
```

**Blog with Sidebar**:
```html
<!-- Main content -->
<h1>Latest Articles</h1>
[recent_posts limit="10" show_excerpt="true"]

<!-- Sidebar -->
<aside>
  <h3>Popular Authors</h3>
  [author id="top-author"]

  <h3>Recent Posts</h3>
  [recent_posts limit="5" show_thumbnail="false"]
</aside>
```

---

## Don't Do This

### ❌ Incorrect Shortcode Syntax

```
# Missing closing bracket
[product id="123"

# Wrong bracket type
{product id="123"}
(product id="123")

# Spaces in shortcode name
[product grid]
[recent posts]

# Misspelled shortcode
[prodcut id="123"]
[recnet_posts]
```

### ❌ Invalid Attribute Values

```
# Invalid option
[product_grid orderby="invalid"]  # Should be: price, name, created_at, popularity

# Wrong type
[product_grid limit="abc"]  # Should be number

# Typo in attribute name
[product id="123" show_prise="true"]  # Should be: show_price
```

### ❌ Overcomplicating

```
# Too specific when default works
[product_grid category="electronics" limit="8" columns="4" orderby="created_at" order="desc"]

# Should be just:
[product_grid category="electronics"]
```

---

## Testing Recommendations

### Suggest Testing Steps

When adding shortcodes with specific requirements:

```
AI: I've added the following shortcodes:

    [partner_dashboard]
    [partner_products featured="true"]

    To test:
    1. Make sure you're logged in as a Partner
    2. Navigate to the page
    3. Verify the dashboard loads correctly
    4. Check that featured products are displayed
```

---

## Version Compatibility

### Current System

- **Shortcode Format**: WordPress-style `[name attr="value"]`
- **Attribute Parsing**: Supports string, number, boolean
- **Nesting**: Limited support (avoid deep nesting)

### Future Considerations

- React-style attributes may be added: `<Shortcode prop={value} />`
- More complex data types (arrays, objects) may be supported

**For now**: Stick to simple key-value attributes.

---

## Summary Checklist

When generating shortcode content, verify:

- [ ] Shortcode name is spelled correctly
- [ ] All required attributes are provided
- [ ] Attribute values are in correct format (quoted strings, numbers, booleans)
- [ ] Permission requirements are met for current user
- [ ] Shortcode makes sense in the current page context
- [ ] Don't over-specify optional attributes
- [ ] Provide helpful notes/warnings when needed
- [ ] Suggest testing steps for complex shortcodes

---

**Version**: 1.0
**Last Updated**: 2025-10-19
