# Shortcode AI Documentation

> **Purpose**: Reference documentation for AI-powered content editors to understand and use O4O Platform shortcodes.

---

## 📚 Documentation Structure

| Document | Purpose | Use When |
|----------|---------|----------|
| [shortcode-system.md](./shortcode-system.md) | System architecture & technical overview | Understanding how shortcodes work |
| [shortcode-registry.md](./shortcode-registry.md) | Complete list of all shortcodes with attributes | Looking up available shortcodes |
| [shortcode-best-practices.md](./shortcode-best-practices.md) | Rules and guidelines for AI | Generating shortcode content |
| [shortcode-examples.md](./shortcode-examples.md) | Real-world usage examples | Finding patterns and combinations |

---

## 🎯 Quick Start for AI

### Step 1: Understand User Intent

Parse user request to determine what type of content they need:

```
User: "Show recent blog posts"
→ Intent: Display content
→ Category: Content shortcodes
→ Best match: [recent_posts]
```

### Step 2: Look Up Shortcode

Refer to `shortcode-registry.md` to find:
- Shortcode name
- Required attributes
- Optional attributes with defaults
- Permission requirements

### Step 3: Generate Shortcode

Follow rules in `shortcode-best-practices.md`:
- Include all required attributes
- Use sensible defaults for optional attributes
- Respect permission requirements
- Provide helpful notes

### Step 4: Verify Pattern

Check `shortcode-examples.md` for similar use cases to ensure your output matches established patterns.

---

## 🔍 Finding the Right Shortcode

### By Category

**Content**: `[recent_posts]`, `[author]`
**Media**: `[gallery]`, `[video]`
**E-commerce**: `[product]`, `[product_grid]`, `[add_to_cart]`, `[featured_products]`
**Forms**: `[form]`, `[view]`
**Dropshipping**: `[partner_*]`, `[supplier_*]`, `[seller_*]`
**Dynamic**: `[cpt_list]`, `[cpt_field]`, `[acf_field]`

### By User Role

**Public** (no login): Content, Media, E-commerce, Forms
**Partner**: Partner shortcodes
**Supplier**: Supplier shortcodes
**Seller**: Seller shortcodes
**Admin**: Admin shortcodes

---

## ✅ Validation Checklist

Before outputting shortcode content:

- [ ] Shortcode exists in registry
- [ ] All required attributes are provided
- [ ] Attribute values are in correct format
- [ ] Permission requirements are met
- [ ] Shortcode makes sense in context
- [ ] Examples show similar usage patterns

---

## 🚀 Common Patterns

### Product Page
```
[product id="123" show_description="true"]
[product_grid category="related" limit="4"]
```

### Blog Homepage
```
[recent_posts limit="10" show_excerpt="true"]
```

### Partner Portal
```
[partner_dashboard]
[partner_products featured="true"]
[partner_commissions period="30d"]
```

### Contact Page
```
[form id="contact-form"]
```

---

## 🎓 Training Recommendations

### Priority 1: Learn These First
1. `[product_grid]` - Most versatile e-commerce shortcode
2. `[recent_posts]` - Essential content shortcode
3. `[form]` - Required for user interaction
4. `[partner_dashboard]` - Complex but frequently used

### Priority 2: Common Variants
1. `[product]` - Single product display
2. `[gallery]` - Image galleries
3. `[video]` - Video embeds
4. `[author]` - Author profiles

### Priority 3: Advanced
1. `[cpt_list]` - Dynamic CPT display
2. `[partner_products]` - Partner-specific features
3. `[supplier_products]` - Supplier management

---

## 📊 Statistics

- **Total Shortcodes**: 19+
- **Categories**: 7
- **Permission Levels**: 4 (Public, Partner, Supplier, Seller/Admin)
- **Most Used**: `[product_grid]`, `[recent_posts]`, `[partner_dashboard]`

---

## 🔗 Related Documentation

- **User Manual**: `/SHORTCODES.md` - End-user documentation
- **Developer Guide**: `/docs/guide/ADD_NEW_SHORTCODE.md` - How to add new shortcodes
- **Package Source**: `/packages/shortcodes/` - Implementation code

---

## 📞 Support

For questions or updates to this documentation:
- File an issue in the repository
- Contact the development team
- Refer to package source code for implementation details

---

**Version**: 1.0
**Last Updated**: 2025-10-19
**Maintained By**: O4O Platform Team
