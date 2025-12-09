# Site Templates

Pre-built site templates for multi-instance deployment.

## Overview

Site templates provide a complete starting point for new O4O Platform instances, including:

- **Pages**: Pre-configured view definitions (home, login, dashboard, shop, contact)
- **Layout**: Header and footer components
- **CMS**: Theme and navigation configuration
- **Apps**: Default app installations

## Directory Structure

```
site-template/
├── pages/              # View JSON definitions
│   ├── home.json
│   ├── login.json
│   ├── dashboard.json
│   ├── shop.json
│   └── contact.json
├── layout/             # Layout components
│   ├── header.json
│   └── footer.json
├── cms/                # CMS configuration
│   ├── theme.json
│   └── navigation.json
├── apps.json           # App installation presets
├── index.ts            # Template loader
└── README.md           # This file
```

## Available Templates

### Default Template
- **Apps**: commerce, customer, admin
- **Use Case**: Standard e-commerce site
- **Features**: Product catalog, user dashboard, basic pages

### E-commerce Template
- **Apps**: commerce, customer, admin, cart, wishlist
- **Use Case**: Full-featured online store
- **Features**: Advanced shopping features, wishlist, cart management

### Forum Template
- **Apps**: forum, customer, admin
- **Use Case**: Community forum
- **Features**: Discussion boards, user profiles, community features

### Pharmacy Template
- **Apps**: commerce, customer, admin, forum-yaksa
- **Use Case**: Pharmacy site with community
- **Features**: Product catalog + Yaksa community forum

### Signage Template
- **Apps**: signage, admin
- **Use Case**: Digital signage system
- **Features**: Content management for digital displays

## Usage

### Load a Template

```typescript
import { loadTemplate } from './site-template';

const template = loadTemplate('ecommerce');
console.log(template.pages);      // All page definitions
console.log(template.layout);     // Header & footer
console.log(template.cms);        // Theme & navigation
console.log(template.apps);       // Apps to install
```

### List Available Templates

```typescript
import { listTemplates } from './site-template';

const templates = listTemplates();
// [
//   { name: 'default', description: 'Standard e-commerce site...' },
//   { name: 'ecommerce', description: 'Full-featured...' },
//   ...
// ]
```

### Hydrate Template with Variables

Templates use `{{variable}}` syntax for placeholders:

```typescript
import { loadTemplate, hydrateTemplate } from './site-template';

const template = loadTemplate('default');
const hydrated = hydrateTemplate(template, {
  siteName: 'My Store',
  siteDescription: 'Welcome to our store',
  contactEmail: 'support@mystore.com',
  logoUrl: '/media/my-logo.png',
});
```

## Template Variables

Common variables used across templates:

- `{{siteName}}` - Site name
- `{{siteDescription}}` - Site description
- `{{contactEmail}}` - Contact email
- `{{contactPhone}}` - Contact phone
- `{{contactAddress}}` - Contact address
- `{{logoUrl}}` - Logo URL
- `{{userName}}` - Current user name (runtime)
- `{{userOrders}}` - User order count (runtime)
- `{{theme.colors.*}}` - Theme color values

## Page Definitions

### Home Page (`home.json`)
- Hero banner with CTA
- Featured products grid
- About section

### Login Page (`login.json`)
- Login form
- Social login options
- Register link

### Dashboard Page (`dashboard.json`)
- User welcome message
- Stats overview
- Recent orders

### Shop Page (`shop.json`)
- Product filters
- Product grid
- Pagination

### Contact Page (`contact.json`)
- Contact information
- Contact form

## Customization

To create a new template:

1. Add new entry to `apps.json`
2. Optionally override page definitions
3. Customize theme colors in `cms/theme.json`
4. Update navigation in `cms/navigation.json`

Example:

```json
// apps.json
{
  "mytemplate": ["commerce", "customer", "admin", "blog"]
}
```

## Integration

Templates integrate with:

- **CMS Builder**: Pages are created as Views
- **AppStore**: Apps are automatically installed
- **Deployment Manager**: Templates used during site creation
- **Theme System**: Theme configuration applied

## Notes

- All templates are version controlled
- Templates can be extended or customized
- Variable substitution happens at deployment time
- Templates are reusable across multiple sites

## License

Proprietary - O4O Platform
