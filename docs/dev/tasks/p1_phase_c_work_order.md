# P1 Phase C Work Order: Dashboard Widgets System

**Project:** O4O Platform - User & Role System Enhancement (P1)
**Phase:** P1-C (Dashboard Widgets System)
**Created:** 2025-11-09
**Status:** 📋 Ready for Implementation
**Estimated Duration:** 3-4 days
**Prerequisites:** P1-A (Permission-Based RBAC) Complete, P1-B (Notifications) Complete

---

## 🎯 Objective

Build a **flexible, permission-aware widget system** for role-specific dashboards that:
1. Allows each role (supplier, seller, partner, admin) to have **customized dashboard layouts**
2. Renders widgets based on user's **capabilities** (from P1-A)
3. Supports **drag-and-drop customization** (future) with persistent layout
4. Provides **extensible widget architecture** for easy addition of new widgets
5. Enables **real-time data updates** for key metrics

---

## 🧱 Scope

### In Scope

| Component | Description |
|-----------|-------------|
| **Widget System Architecture** | Base widget interface, registry, renderer |
| **Role-Specific Dashboards** | Supplier, Seller, Partner, Admin dashboard pages |
| **Core Widgets (12+)** | Stats cards, charts, tables, action buttons |
| **Permission Integration** | Widget visibility based on `capabilities[]` |
| **Layout Persistence** | Save user's widget arrangement (basic) |
| **Responsive Design** | Mobile-friendly widget grid system |

### Out of Scope

- Advanced drag-and-drop (Phase 2)
- Widget marketplace (future)
- Third-party widget integrations (future)
- Real-time WebSocket updates (future - use polling)
- Widget sharing between users (future)

---

## 📋 Widget System Design

### Widget Types

| Category | Widgets | Purpose |
|----------|---------|---------|
| **Stats** | Revenue, Orders, Products, Users | Key metrics overview |
| **Charts** | Line, Bar, Pie, Area | Trend visualization |
| **Tables** | Recent orders, Pending approvals, Top products | Detailed data lists |
| **Actions** | Quick create, Upload, Export | Common actions |
| **Alerts** | Notifications, Warnings, Tips | Important messages |

### Widget Architecture

```typescript
interface Widget {
  id: string;                          // Unique widget identifier
  type: 'stat' | 'chart' | 'table' | 'action' | 'alert';
  title: string;                       // Display title
  description?: string;                // Widget description
  requiredPermissions?: string[];      // Capabilities needed to view
  defaultSize: WidgetSize;             // Default grid size
  component: React.ComponentType<WidgetProps>;
  fetchData?: () => Promise<any>;      // Data loading function
  refreshInterval?: number;            // Auto-refresh interval (ms)
}

interface WidgetSize {
  w: number;  // Width (grid units)
  h: number;  // Height (grid units)
}

interface DashboardLayout {
  userId: string;
  role: string;
  widgets: WidgetPlacement[];
  createdAt: Date;
  updatedAt: Date;
}

interface WidgetPlacement {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}
```

---

## 🎨 Role-Specific Widget Sets

### Supplier Dashboard

**Focus:** Product management, order fulfillment, inventory

**Default Widgets:**
1. **Total Products** (stat) - Count of active products
2. **Pending Orders** (stat) - Orders awaiting approval
3. **Monthly Revenue** (stat) - Current month sales
4. **Revenue Trend** (chart) - 30-day revenue line chart
5. **Recent Orders** (table) - Last 10 orders with status
6. **Low Stock Alert** (alert) - Products below threshold
7. **Quick Create Product** (action) - Fast product creation
8. **Top Selling Products** (chart) - Top 10 by sales

**Required Permissions:**
- `product.create`, `product.edit` - Product management widgets
- `order.view`, `order.approve` - Order widgets
- `dashboard.supplier` - Access supplier dashboard

### Seller Dashboard

**Focus:** Sales tracking, product listings, commission

**Default Widgets:**
1. **Total Sales** (stat) - Current month sales
2. **Commission Earned** (stat) - Pending + received commission
3. **Active Listings** (stat) - Products currently listed
4. **Sales Trend** (chart) - 30-day sales line chart
5. **Top Products** (table) - Best performing products
6. **Recent Orders** (table) - Customer orders
7. **Quick List Product** (action) - Fast product listing
8. **Approval Status** (alert) - Pending authorization requests

**Required Permissions:**
- `order.view` - Sales and order widgets
- `dashboard.seller` - Access seller dashboard

### Partner Dashboard

**Focus:** Referral tracking, commission, content performance

**Default Widgets:**
1. **Total Referrals** (stat) - All-time referral count
2. **Commission This Month** (stat) - Current month earnings
3. **Active Links** (stat) - Active referral links
4. **Referral Trend** (chart) - 30-day referral chart
5. **Top Performing Links** (table) - Best referral sources
6. **Recent Conversions** (table) - Latest successful referrals
7. **Generate Link** (action) - Create new referral link
8. **Performance Tips** (alert) - Optimization suggestions

**Required Permissions:**
- `dashboard.partner` - Access partner dashboard

### Admin Dashboard

**Focus:** Platform overview, user management, approvals

**Default Widgets:**
1. **Total Users** (stat) - Platform user count
2. **Pending Enrollments** (stat) - Applications awaiting review
3. **Active Orders** (stat) - Current active orders
4. **Revenue Overview** (chart) - Platform-wide revenue
5. **Recent Enrollments** (table) - Latest applications
6. **System Health** (alert) - API status, database, errors
7. **Quick Approve** (action) - Bulk approval interface
8. **User Growth** (chart) - User registration trend

**Required Permissions:**
- `enrollment.list`, `enrollment.approve` - Enrollment widgets
- `admin.all` - All admin widgets

---

## ⚙️ Execution Steps

### C-1: Widget System Architecture

**Goal:** Build the foundation for widget system

**Tasks:**
1. Create widget interface and types
   - `types/dashboard.types.ts` - Widget, DashboardLayout interfaces
   - `types/widget.types.ts` - WidgetProps, WidgetSize
2. Implement widget registry
   - `services/WidgetRegistry.ts` - Register and retrieve widgets
   - Support for dynamic widget loading
3. Create base widget components
   - `components/widgets/BaseWidget.tsx` - Common wrapper
   - `components/widgets/WidgetContainer.tsx` - Container with loading/error states
4. Implement permission-based rendering
   - `hooks/useWidgetPermissions.ts` - Check if user can view widget
   - Filter widgets based on `capabilities[]` from `/me`

**Deliverables:**
- Widget type definitions
- Widget registry service
- Base widget components
- Permission checking logic

### C-2: Grid Layout System

**Goal:** Create responsive grid for widget placement

**Tasks:**
1. Choose grid library
   - Evaluate: react-grid-layout, react-mosaic
   - Recommendation: react-grid-layout (mature, flexible)
2. Implement dashboard grid
   - `components/dashboard/DashboardGrid.tsx`
   - 12-column responsive grid
   - Breakpoints: xs, sm, md, lg, xl
3. Create layout persistence
   - `services/LayoutService.ts` - Save/load user layouts
   - API: `GET/PUT /api/dashboard/layout`
   - Store in `user_dashboard_layouts` table
4. Add reset to default
   - "Reset Layout" button
   - Restore role-specific default arrangement

**Deliverables:**
- Dashboard grid component
- Layout persistence API
- Reset functionality

### C-3: Core Widget Library (Stats)

**Goal:** Create essential stat widgets

**Widgets to Build:**
1. **StatWidget** (generic)
   - Props: `title`, `value`, `icon`, `trend`, `color`
   - Displays single metric with optional trend indicator
   - Example: "1,234 Products" with +12% trend
2. **TotalProducts** (supplier)
   - Fetches product count from API
   - Shows active/inactive breakdown
3. **PendingOrders** (supplier)
   - Fetches pending order count
   - Click to navigate to orders page
4. **MonthlyRevenue** (supplier/seller)
   - Fetches current month revenue
   - Shows comparison to last month
5. **CommissionEarned** (seller/partner)
   - Fetches commission data
   - Shows pending vs. received breakdown

**Deliverables:**
- Generic StatWidget component
- 5+ role-specific stat widgets
- API endpoints for stat data

### C-4: Core Widget Library (Charts)

**Goal:** Create chart widgets for trend visualization

**Widgets to Build:**
1. **ChartWidget** (generic)
   - Props: `title`, `data`, `chartType`, `config`
   - Uses recharts or chart.js
   - Supports: line, bar, pie, area
2. **RevenueTrend** (supplier/admin)
   - 30-day revenue line chart
   - Grouped by day
   - Tooltip with exact values
3. **SalesTrend** (seller)
   - 30-day sales line chart
   - Shows units sold per day
4. **UserGrowth** (admin)
   - User registration trend
   - Stacked area chart (by role)
5. **TopProducts** (supplier/seller)
   - Top 10 products bar chart
   - Sorted by revenue or units

**Deliverables:**
- Generic ChartWidget component
- Chart library integration (recharts)
- 4+ chart widgets with real data

### C-5: Core Widget Library (Tables)

**Goal:** Create table widgets for detailed data lists

**Widgets to Build:**
1. **TableWidget** (generic)
   - Props: `title`, `columns`, `data`, `onRowClick`
   - Pagination support
   - Sorting and filtering
2. **RecentOrders** (supplier/seller)
   - Last 10 orders
   - Columns: ID, Customer, Amount, Status, Date
   - Click to view order details
3. **PendingEnrollments** (admin)
   - Applications awaiting review
   - Columns: User, Role, Date, Quick Actions
   - Click to review application
4. **TopPerformingLinks** (partner)
   - Best referral sources
   - Columns: Link, Clicks, Conversions, Commission
5. **LowStockProducts** (supplier)
   - Products below stock threshold
   - Columns: Product, Current Stock, Threshold, Action

**Deliverables:**
- Generic TableWidget component
- 5+ table widgets with pagination
- Row click handlers for navigation

### C-6: Core Widget Library (Actions & Alerts)

**Goal:** Create action buttons and alert widgets

**Widgets to Build:**

**Action Widgets:**
1. **QuickCreateProduct** (supplier)
   - Large button "Create New Product"
   - Opens product creation modal/page
2. **GenerateReferralLink** (partner)
   - Button "Generate New Link"
   - Shows generated link with copy button
3. **BulkApprove** (admin)
   - Button "Review Pending Enrollments"
   - Opens bulk approval interface

**Alert Widgets:**
1. **AlertWidget** (generic)
   - Props: `type`, `title`, `message`, `actions`
   - Types: info, warning, error, success
2. **LowStockAlert** (supplier)
   - Warning when products below threshold
   - Action: "Restock Now"
3. **SystemHealthAlert** (admin)
   - Shows API status, error rate
   - Warning if degraded performance
4. **PerformanceTips** (partner)
   - Helpful suggestions for better conversions
   - "Try sharing on social media"

**Deliverables:**
- 3 action widgets
- Generic AlertWidget + 3 specific alerts
- Modal/page integrations

### C-7: Dashboard Pages

**Goal:** Create role-specific dashboard pages

**Pages to Build:**
1. **SupplierDashboard** (`/dashboard/supplier`)
   - Import and arrange supplier widgets
   - Default 3-column layout
   - Permission check: `hasRole('supplier')`
2. **SellerDashboard** (`/dashboard/seller`)
   - Import and arrange seller widgets
   - Default 3-column layout
   - Permission check: `hasRole('seller')`
3. **PartnerDashboard** (`/dashboard/partner`)
   - Import and arrange partner widgets
   - Default 3-column layout
   - Permission check: `hasRole('partner')`
4. **AdminDashboard** (`/dashboard/admin`)
   - Import and arrange admin widgets
   - Default 4-column layout (more space)
   - Permission check: `hasRole('admin')`

**Common Features:**
- Page title with role badge
- "Customize Dashboard" button (future)
- "Refresh All" button
- Loading states for each widget
- Empty state if no widgets available

**Deliverables:**
- 4 dashboard pages with default layouts
- Responsive grid configurations
- Permission-based routing

### C-8: API Endpoints for Widget Data

**Goal:** Create backend endpoints for widget data

**Endpoints to Build:**

1. **GET /api/dashboard/stats/products**
   - Returns product count stats
   - Filters: active, inactive, total
   - Permission: `product.edit`

2. **GET /api/dashboard/stats/orders**
   - Returns order stats
   - Filters: pending, completed, revenue
   - Permission: `order.view`

3. **GET /api/dashboard/stats/enrollments**
   - Returns enrollment stats
   - Filters: pending, approved, rejected
   - Permission: `enrollment.list`

4. **GET /api/dashboard/charts/revenue-trend**
   - Returns 30-day revenue data
   - Grouped by day
   - Permission: `order.view`

5. **GET /api/dashboard/charts/user-growth**
   - Returns user registration trend
   - Grouped by day and role
   - Permission: `admin.all`

6. **GET /api/dashboard/tables/recent-orders**
   - Returns paginated recent orders
   - Query: `?page=1&limit=10`
   - Permission: `order.view`

7. **GET /api/dashboard/tables/pending-enrollments**
   - Returns pending applications
   - Query: `?role=supplier&limit=10`
   - Permission: `enrollment.list`

8. **GET/PUT /api/dashboard/layout**
   - GET: Retrieve user's saved layout
   - PUT: Save custom widget arrangement
   - Permission: Authenticated user

**Deliverables:**
- 8+ dashboard API endpoints
- Permission-based access control
- Optimized queries with caching

### C-9: Testing & Documentation

**Goal:** Validate widget system and document usage

**Tasks:**
1. Widget rendering tests
   - Each widget renders without errors
   - Permission filtering works correctly
   - Data fetching and error handling
2. Layout persistence tests
   - Save layout API works
   - Load layout API returns correct data
   - Reset to default works
3. Performance tests
   - Dashboard loads in <2 seconds
   - Widgets load data asynchronously
   - No blocking renders
4. Documentation
   - Widget development guide
   - Adding new widgets tutorial
   - Dashboard customization guide

**Deliverables:**
- Widget test suite (Jest + React Testing Library)
- Performance benchmarks
- Developer documentation

---

## 📋 Definition of Done

- [ ] Widget registry system implemented
- [ ] 12+ widgets created (stats, charts, tables, actions, alerts)
- [ ] 4 role-specific dashboard pages functional
- [ ] Widget visibility based on `capabilities[]`
- [ ] Layout persistence API working (save/load)
- [ ] Responsive grid system (mobile-friendly)
- [ ] 8+ dashboard API endpoints with permission checks
- [ ] All widgets load data without blocking UI
- [ ] Widget tests pass (>80% coverage)
- [ ] Documentation complete:
  - [ ] `p1_dashboard_widgets_spec.md` (architecture)
  - [ ] `p1_widget_development_guide.md` (how to add widgets)
  - [ ] `p1_phase_c_report.md` (implementation report)

---

## 🕓 Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| C-1: Architecture | 0.5 day | None |
| C-2: Grid System | 0.5 day | C-1 |
| C-3: Stat Widgets | 0.5 day | C-1, C-2 |
| C-4: Chart Widgets | 0.5 day | C-1, C-2 |
| C-5: Table Widgets | 0.5 day | C-1, C-2 |
| C-6: Actions & Alerts | 0.5 day | C-1, C-2 |
| C-7: Dashboard Pages | 0.5 day | C-3, C-4, C-5, C-6 |
| C-8: API Endpoints | 1 day | Parallel |
| C-9: Testing & Docs | 0.5 day | All above |

**Total:** ~3.5-4 days

---

## 📦 Git Workflow

**Branch:** `feat/user-refactor-p1-rbac/phase-c-dashboard-widgets`

**Commit Message Template:**
```
feat(p1-rbac): phase-c - {component}

{Description of changes}

Implements:
- {Feature 1}
- {Feature 2}

See: docs/dev/tasks/p1_phase_c_work_order.md
```

**PR Title:** `feat(p1-rbac): Phase C - Dashboard Widgets System`

---

## 🚦 Dependencies & Prerequisites

| Item | Status | Notes |
|------|--------|-------|
| P1-A Complete | ✅ Ready | Permission system in place |
| P1-B Complete | ⏸️ In Progress | Not blocking Phase C |
| Chart Library | ⏸️ To Install | recharts or chart.js |
| Grid Library | ⏸️ To Install | react-grid-layout |
| Dashboard APIs | ⏸️ To Build | Backend data endpoints |

---

## ⚠️ Risks & Mitigation

### Performance Issues

**Risk:** Too many widgets loading simultaneously
**Impact:** Slow dashboard, poor UX
**Mitigation:**
- Lazy load widgets (only visible ones)
- Asynchronous data fetching per widget
- Caching API responses (5-minute TTL)
- Loading skeletons for better perceived performance

### Permission Complexity

**Risk:** Widget visibility logic becomes complex
**Impact:** Bugs, incorrect widget display
**Mitigation:**
- Centralized permission checking (`useWidgetPermissions`)
- Clear documentation of required permissions
- Unit tests for all permission combinations

### Layout Persistence Edge Cases

**Risk:** User moves to different role, old layout incompatible
**Impact:** Dashboard breaks or shows wrong widgets
**Mitigation:**
- Store layouts per role (separate keys)
- Validate layout on load (remove invalid widgets)
- Always have fallback to default layout

### API Data Inconsistency

**Risk:** Different widgets show conflicting data
**Impact:** User confusion, trust issues
**Mitigation:**
- Shared data fetching layer with cache
- Consistent timestamp for all dashboard data
- "Last updated" indicator on dashboard

---

## 🎨 Widget Examples

### StatWidget

```tsx
<StatWidget
  title="Total Products"
  value={1234}
  icon={<PackageIcon />}
  trend={{ value: 12, direction: 'up' }}
  color="blue"
  onClick={() => navigate('/products')}
/>
```

### ChartWidget

```tsx
<ChartWidget
  title="Revenue Trend"
  type="line"
  data={revenueTrendData}
  xAxis="date"
  yAxis="revenue"
  height={300}
/>
```

### TableWidget

```tsx
<TableWidget
  title="Recent Orders"
  columns={[
    { key: 'id', label: 'Order ID' },
    { key: 'customer', label: 'Customer' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
  ]}
  data={recentOrders}
  onRowClick={(order) => navigate(`/orders/${order.id}`)}
  pagination={{ page: 1, limit: 10, total: 100 }}
/>
```

---

## 🔗 Related Documents

- [P1 Kickoff Plan](../planning/p1_kickoff_task_order.md)
- [P1 RBAC Enhancement Spec](../specs/p1_rbac_enhancement.md)
- [P1 Phase A Report](../investigations/user-refactor_2025-11/p1_phase_a_implementation_report.md)
- [P1 Phase B Work Order](./p1_phase_b_work_order.md)

---

## 📚 Future Enhancements (Out of Scope)

- **Advanced Drag-and-Drop** - Full customization with saved preferences
- **Widget Marketplace** - Community-contributed widgets
- **Third-Party Integrations** - Google Analytics, Stripe, etc.
- **Real-Time Updates** - WebSocket for live data streaming
- **Widget Sharing** - Share custom dashboards with team
- **Mobile App** - Native mobile dashboard app
- **Widget Templates** - Pre-configured dashboard templates
- **A/B Testing** - Test different widget arrangements

---

**Document Owner:** Platform Team
**Review Required:** Tech Lead approval before implementation
**Implementation Start:** After P1-B completion (2025-11-15+)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
