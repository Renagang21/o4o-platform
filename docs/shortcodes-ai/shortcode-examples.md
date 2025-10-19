# Shortcode Usage Examples

> **AI Editor Reference**: Real-world examples of shortcode usage patterns.

---

## User Request → Shortcode Mapping

### Content Requests

#### "Show recent blog posts"
```
[recent_posts limit="5"]
```

#### "Display latest 10 articles from news category"
```
[recent_posts limit="10" category="news"]
```

#### "Add author bio for John"
```
[author id="john" show_posts="true"]
```

---

### Media Requests

#### "Insert YouTube video"
```
User provides: https://youtube.com/watch?v=dQw4w9WgXcQ

[video url="https://youtube.com/watch?v=dQw4w9WgXcQ"]
```

#### "Create photo gallery from images 1,2,3,4,5"
```
[gallery ids="1,2,3,4,5" columns="3"]
```

#### "Add image gallery with 4 columns"
```
[gallery ids="10,11,12,13,14,15" columns="4"]
```

---

### E-commerce Requests

#### "Show product with ID 123"
```
[product id="123"]
```

#### "Add buy button for product 456"
```
[add_to_cart id="456"]
```

#### "Display all electronics products"
```
[product_grid category="electronics"]
```

#### "Show 12 products from clothing category, sorted by price"
```
[product_grid category="clothing" limit="12" orderby="price" order="asc"]
```

#### "Add featured products section"
```
<h2>Featured Products</h2>
[featured_products limit="8"]
```

---

### Form Requests

#### "Add contact form"
```
[form id="contact-form"]
```

#### "Insert newsletter signup"
```
[form id="newsletter" layout="inline"]
```

#### "Show survey results"
```
[view id="survey-results" layout="table"]
```

---

### Dropshipping Requests

#### "Create partner dashboard page"
```html
<h1>Partner Portal</h1>
[partner_dashboard]

<h2>Products to Promote</h2>
[partner_products featured="true" limit="8"]

<h2>Your Earnings</h2>
[partner_commissions period="30d"]
```

#### "Show supplier product management"
```
<h1>Manage Your Products</h1>
[supplier_products]
```

---

## Page Templates

### Homepage Template

```html
<!-- Hero Section -->
<h1>Welcome to Our Store</h1>
<p>Discover amazing products at great prices!</p>

<!-- Featured Products -->
<h2>Featured Products</h2>
[featured_products limit="8" columns="4"]

<!-- All Products -->
<h2>Browse All Products</h2>
[product_grid limit="12"]

<!-- Newsletter Signup -->
<h2>Stay Updated</h2>
[form id="newsletter" layout="inline"]
```

---

### Product Category Page

```html
<h1>Electronics</h1>
<p>Browse our latest electronics and gadgets.</p>

[product_grid category="electronics" limit="20" orderby="popularity"]
```

---

### Blog Homepage

```html
<h1>Latest Articles</h1>

[recent_posts limit="10" show_excerpt="true" show_thumbnail="true"]

<!-- Sidebar -->
<aside>
  <h3>Recent Posts</h3>
  [recent_posts limit="5" show_thumbnail="false"]
</aside>
```

---

### Partner Portal

```html
<h1>Welcome to Your Partner Dashboard</h1>

<!-- Main Dashboard -->
[partner_dashboard tab="overview"]

<!-- Promotional Products -->
<h2>Top Performing Products This Month</h2>
[partner_products sortBy="performance" limit="8"]

<!-- Commission History -->
<h2>Recent Commissions</h2>
[partner_commissions period="30d" showSummary="true"]
```

---

### Supplier Portal

```html
<h1>Supplier Dashboard</h1>

<!-- Product Management -->
<h2>Your Products</h2>
[supplier_products]

<!-- Add New Product -->
<h2>Add New Product</h2>
[supplier_product_editor]
```

---

### Seller Portal

```html
<h1>Seller Dashboard</h1>

<!-- Dashboard -->
[seller_dashboard]

<!-- Product Management -->
<h2>Manage Products</h2>
[seller_products]

<!-- Settlement -->
<h2>Settlement History</h2>
[seller_settlement]
```

---

## Contextual Variations

### Same Intent, Different Contexts

#### User: "Show products"

**Context: Homepage**
```
[featured_products limit="8"]
```

**Context: Category Page**
```
[product_grid category="{{current_category}}" limit="20"]
```

**Context: Search Results Page**
```
[product_grid search="{{search_query}}" limit="30"]
```

**Context: Partner Portal**
```
[partner_products sortBy="commission" limit="12"]
```

---

#### User: "Add contact form"

**Context: Contact Page**
```
[form id="contact-form" theme="modern"]
```

**Context: Product Page**
```
[form id="product-inquiry" layout="compact"]
```

**Context: Sidebar**
```
[form id="quick-contact" layout="inline"]
```

---

## Combining Shortcodes

### Product Page with Reviews

```html
<!-- Product Details -->
<h1>Product Name</h1>
[product id="123" show_description="true"]

<!-- Add to Cart -->
[add_to_cart id="123" text="Buy Now" size="large"]

<!-- Product Gallery -->
<h2>Product Images</h2>
[gallery ids="201,202,203,204" columns="2"]

<!-- Related Products -->
<h2>You May Also Like</h2>
[product_grid category="same-category" limit="4"]

<!-- Contact Form -->
<h2>Questions? Contact Us</h2>
[form id="product-inquiry"]
```

---

### Landing Page

```html
<!-- Hero -->
<h1>Welcome to Our Platform</h1>
<p>Join thousands of successful partners!</p>

<!-- Benefits Section -->
<h2>Why Partner With Us?</h2>
<ul>
  <li>High commission rates</li>
  <li>Quality products</li>
  <li>Marketing support</li>
</ul>

<!-- Featured Products -->
<h2>Our Top Products</h2>
[product_grid featured="true" limit="6" columns="3"]

<!-- Testimonials (using dynamic CPT) -->
<h2>Success Stories</h2>
[cpt_list type="testimonial" limit="3" template="card"]

<!-- Call to Action -->
<h2>Ready to Get Started?</h2>
[form id="partner-registration" theme="modern"]
```

---

### Blog Post with Embedded Content

```html
<h1>10 Best Products for 2025</h1>

<p>Introduction paragraph...</p>

<!-- Product #1 -->
<h2>1. Product Name</h2>
<p>Description of why this product is great...</p>
[product id="product-1"]

<!-- Product #2 -->
<h2>2. Another Product</h2>
<p>More details...</p>
[product id="product-2"]

<!-- Video Review -->
<h2>Watch Our Video Review</h2>
[video url="https://youtube.com/watch?v=xxx"]

<!-- CTA -->
<h2>Shop All Products</h2>
[product_grid category="featured-2025" limit="8"]

<!-- Author Bio -->
<h2>About the Author</h2>
[author id="current-author" show_posts="true"]
```

---

## Dynamic Content Examples

### Using CPT Shortcodes

#### Display Supplier List
```
[cpt_list type="ds_supplier" limit="10" template="grid"]
```

#### Show Product Details
```
[cpt_field post_id="supplier-123" field="company_name"]
[cpt_field post_id="supplier-123" field="contact_email"]
```

#### Display ACF Fields
```
<h3>Contact Information</h3>
Email: [acf_field field="contact_email"]
Phone: [acf_field field="contact_phone"]
Address: [acf_field field="company_address"]
```

---

### Partner Commission Page

```html
<h1>Your Commission Dashboard</h1>

<!-- Summary -->
[partner_commissions period="30d" showSummary="true"]

<!-- Detailed History -->
<h2>Commission History</h2>
[partner_commissions period="90d" compact="false"]

<!-- Filters -->
<h3>Filter by Status</h3>
<ul>
  <li><a href="?status=pending">Pending</a></li>
  <li><a href="?status=approved">Approved</a></li>
  <li><a href="?status=paid">Paid</a></li>
</ul>
```

---

## Responsive Patterns

### Desktop: 4 columns, Mobile: 2 columns

```
<!-- Grid adjusts automatically -->
[product_grid limit="12" columns="4"]
```
→ Renders as 4 columns on desktop, 2 on mobile (handled by CSS)

---

### Compact Layout for Sidebar

```
<!-- Main content -->
[product_grid category="electronics" limit="20"]

<!-- Sidebar -->
<aside>
  [recent_posts limit="5" show_thumbnail="false"]
  [featured_products limit="3" columns="1"]
</aside>
```

---

## Multi-Language Considerations

### Category Names
```
<!-- English site -->
[product_grid category="electronics"]

<!-- Korean site -->
[product_grid category="전자제품"]
```

### Form IDs
```
<!-- English -->
[form id="contact-form"]

<!-- Korean -->
[form id="문의-폼"]
```

---

## Advanced Patterns

### Conditional Display (Handled by Shortcode Component)

```
<!-- Partner-only content -->
[partner_dashboard]
→ Shows dashboard if user is partner
→ Shows "Login as partner" prompt otherwise
```

---

### Nested Layouts (Limited Support)

```html
<!-- Simple nesting works -->
<div class="two-column-layout">
  <div class="column">
    [recent_posts limit="5"]
  </div>
  <div class="column">
    [featured_products limit="4"]
  </div>
</div>
```

**Note**: Avoid nesting shortcodes inside other shortcodes.

---

## Error Handling Examples

### Missing Required Attribute

```
❌ [product]
→ Error: Missing required attribute "id"

✅ [product id="123"]
→ Displays product correctly
```

---

### Invalid Attribute Value

```
❌ [product_grid orderby="invalid"]
→ Falls back to default: orderby="created_at"

✅ [product_grid orderby="price"]
→ Sorts by price correctly
```

---

### Permission Denied

```
User (not logged in): Views page with [partner_dashboard]
→ Displays: "Please log in as a partner to view this content"

User (logged in as partner): Views same page
→ Displays: Full partner dashboard
```

---

## Testing Scenarios

### Test Case 1: Product Grid

**Input**:
```
[product_grid category="electronics" limit="8"]
```

**Expected Output**:
- Grid with 8 products
- Only electronics category
- 4 columns (default)
- Default sorting (created_at desc)

---

### Test Case 2: Partner Dashboard

**Input**:
```
[partner_dashboard tab="commissions"]
```

**Expected Output** (Partner user):
- Dashboard loads
- Commissions tab is active
- Shows commission data

**Expected Output** (Non-partner user):
- Shows login prompt
- Explains partner role needed

---

### Test Case 3: Form with Custom Theme

**Input**:
```
[form id="contact-form" theme="modern" layout="horizontal"]
```

**Expected Output**:
- Contact form with modern theme applied
- Horizontal layout (labels beside inputs)
- Form submits via AJAX (default)

---

## Common Mistakes to Avoid

### ❌ Wrong: Using undefined shortcode
```
[custom_widget]
```
→ If not registered, shows nothing

### ✅ Correct: Use registered shortcode
```
[product_grid]
```

---

### ❌ Wrong: Forgetting quotes on multi-word values
```
[add_to_cart id="123" text=Buy Now Please]
```

### ✅ Correct: Quote the entire value
```
[add_to_cart id="123" text="Buy Now Please"]
```

---

### ❌ Wrong: Mixing attribute styles
```
[product id=123 show_price="true" variant="card"]
```

### ✅ Correct: Be consistent
```
[product id="123" show_price="true" variant="card"]
```

---

## Summary

**Key Takeaways**:
1. Match user intent to appropriate shortcode
2. Always provide required attributes
3. Use defaults when possible
4. Respect permission requirements
5. Combine shortcodes thoughtfully
6. Test output in target context

---

**Version**: 1.0
**Last Updated**: 2025-10-19
**Total Examples**: 50+
