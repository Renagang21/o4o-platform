# Admin Menu System Guide

## Overview
The admin menu system is now simplified and centralized for better maintainability.

## Architecture

### 1. Menu Configuration
- **Location**: `/src/config/wordpressMenuFinal.tsx`
- **Purpose**: Defines all static menu items in WordPress-style structure
- **Structure**: Each app is a top-level menu with its own submenus

### 2. Menu Hook
- **Location**: `/src/hooks/useAdminMenu.ts`
- **Purpose**: Centralized menu logic with role-based filtering
- **Behavior**:
  - Admin users see ALL menus without filtering
  - Non-admin users get filtered menus based on role permissions

### 3. Role Permissions
- **Location**: `/src/config/rolePermissions.ts`
- **Purpose**: Defines which roles can access which menu items
- **Important**: Must include permissions for ALL menu items and their children

### 4. Sidebar Component
- **Location**: `/src/components/layout/AdminSidebar.tsx`
- **Purpose**: Renders the menu using `useAdminMenu` hook

## How to Add a New App Menu

### Step 1: Add to Menu Configuration
Edit `/src/config/wordpressMenuFinal.tsx`:

```tsx
{
  id: 'your-app',
  label: 'Your App Name',
  icon: <YourIcon className="w-5 h-5" />,
  children: [
    { 
      id: 'your-app-dashboard', 
      label: 'Dashboard', 
      icon: <Icon className="w-4 h-4" />, 
      path: '/your-app' 
    },
    // Add more submenus...
  ]
}
```

### Step 2: Add Role Permissions
Edit `/src/config/rolePermissions.ts`:

```typescript
// Add parent menu permission
{
  menuId: 'your-app',
  roles: ['admin', 'manager'], // Which roles can see this
  permissions: ['your-app:read']
},
// Add permissions for each submenu
{
  menuId: 'your-app-dashboard',
  roles: ['admin', 'manager'],
  permissions: ['your-app:read']
},
```

### Step 3: Create Page Components
Create your page components in `/src/pages/your-app/`

### Step 4: Add Routes
Edit `/src/App.tsx` to add routes for your pages:

```tsx
const YourAppRouter = lazy(() => import('./pages/your-app/YourAppRouter'))

// In routes array:
{
  path: '/your-app/*',
  element: <YourAppRouter />
}
```

## Current Apps in Menu

1. **Forum** (`/forum/*`)
   - Boards, Categories, Posts, Comments, Reports, Settings

2. **Digital Signage** (`/signage/*`)
   - Screens, Content, Playlists, Schedule, Devices, Analytics

3. **Crowdfunding** (`/crowdfunding/*`)
   - Projects, Backers, Rewards, Payments, Reports, Settings

4. **E-commerce** (`/ecommerce/*`)
   - Products, Categories, Orders, Inventory, Coupons, etc.

5. **Vendors** (`/vendors/*`)
   - All Vendors, Pending, Commission, Reports

6. **Affiliate Marketing** (`/affiliate/*`)
   - Partners, Links, Commission, Analytics

## Troubleshooting

### Menu Not Showing
1. Check if menu ID is added to `rolePermissions.ts`
2. Verify user role has permission to see the menu
3. For admin users, menu should always show
4. Check browser console for errors
5. Clear browser cache and rebuild

### Menu Shows But Routes Don't Work
1. Verify routes are added to `App.tsx`
2. Check that page components exist
3. Ensure paths in menu config match routes

### Changes Not Reflecting
1. Run `npm run build:admin`
2. Clear browser cache
3. Check that `useAdminMenu` hook is being used
4. Verify no old code is overriding the menu

## Important Notes

- **Admin users** bypass all permission checks and see everything
- **Non-admin users** are filtered based on role and permissions
- Always add permissions for both parent and child menu items
- Menu IDs must be unique across the entire menu structure
- When removing an app, clean up:
  - Menu configuration
  - Role permissions
  - Routes
  - Page components

## Build and Deploy

```bash
# Build admin dashboard
npm run build:admin

# Deploy
./scripts/sync-local.sh
```

## File Structure
```
apps/admin-dashboard/
├── src/
│   ├── config/
│   │   ├── wordpressMenuFinal.tsx  # Menu structure
│   │   └── rolePermissions.ts      # Role-based access
│   ├── hooks/
│   │   ├── useAdminMenu.ts        # Main menu hook
│   │   ├── useDynamicCPTMenu.ts   # CPT menu injection
│   │   └── useSimpleMenu.ts       # Deprecated - use useAdminMenu
│   ├── components/
│   │   └── layout/
│   │       └── AdminSidebar.tsx   # Sidebar component
│   └── pages/
│       ├── forum/                 # Forum pages
│       ├── signage/               # Signage pages
│       └── crowdfunding/          # Crowdfunding pages
```