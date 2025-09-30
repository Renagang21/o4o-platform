# O4O Admin Dashboard

WordPress-style Admin Dashboard for O4O Platform built with React 18, TypeScript, and Vite.

## Features

- **WordPress-inspired UI/UX**: Familiar admin interface for content management
- **Role-based Access Control**: Admin, Business, Affiliate user management
- **E-commerce Management**: Products, orders, inventory control
- **Content Management**: Posts, pages, Custom Post Types (CPT)
- **Analytics & Reports**: Platform performance insights
- **Responsive Design**: Mobile-friendly admin interface

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS with WordPress-inspired components
- **State Management**: Zustand
- **API Client**: Axios with interceptors
- **Routing**: React Router 6
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Notifications**: React Hot Toast

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Type check
pnpm run type-check

# Lint code
pnpm run lint
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_APP_NAME=O4O Admin Dashboard
VITE_APP_VERSION=1.0.0
VITE_DEV_PORT=3012
```

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Sidebar, Header)
│   ├── ui/             # Reusable UI components
│   ├── forms/          # Form components
│   ├── tables/         # Table components
│   ├── charts/         # Chart components
│   └── media/          # Media components
├── pages/
│   ├── dashboard/      # Dashboard pages
│   ├── users/          # User management
│   ├── content/        # Content management
│   ├── ecommerce/      # E-commerce management
│   ├── analytics/      # Analytics pages
│   ├── settings/       # Settings pages
│   └── auth/           # Authentication
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── api/                # API client and stores
└── styles/             # Global styles
```

## Key Features

### WordPress-Style Interface
- Familiar sidebar navigation
- Card-based layout system
- WordPress-inspired color scheme
- Responsive design patterns

### User Management
- Role-based user listing (Admin, Business, Affiliate, Customer)
- User approval workflow
- Business user verification
- Affiliate partner management

### Content Management
- Post and page creation/editing
- Custom Post Types (CPT) support
- Media library integration
- SEO-friendly content structure

### E-commerce Features
- Product management with role-based pricing
- Order processing and tracking
- Inventory management
- Category and tag organization

### Analytics Dashboard
- Real-time statistics
- Sales performance charts
- User behavior insights
- Custom report generation

## Integration with O4O Platform

This admin dashboard integrates with the O4O Platform API server:

- **Authentication**: JWT-based authentication with automatic token refresh
- **API Integration**: RESTful API calls to services/api-server
- **Real-time Updates**: Live data synchronization
- **Permission-based Access**: Role-based feature access control

## Development Guidelines

### Component Standards
- Use TypeScript for all components
- Follow WordPress-style naming conventions
- Implement responsive design patterns
- Use Tailwind CSS utility classes

### State Management
- Use Zustand for global state
- Implement persistent storage for user session
- Handle loading and error states consistently

### API Integration
- Use axios interceptors for authentication
- Implement proper error handling
- Cache API responses when appropriate
- Handle offline scenarios gracefully

## Contributing

1. Follow TypeScript strict mode
2. Use ESLint and Prettier for code formatting
3. Write meaningful commit messages
4. Test components before submitting
5. Update documentation for new features

## Build and Deployment

```bash
# Production build
pnpm run build

# Preview production build
pnpm run preview

# Deploy to production
# (Build artifacts in dist/ directory)
```

The dashboard is designed to be deployed alongside the O4O Platform services and integrates seamlessly with the existing infrastructure.# Trigger deployment
