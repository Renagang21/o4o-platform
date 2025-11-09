# P1 Phase D: Admin Productivity & Performance

**Branch**: `feat/user-refactor-p1-rbac/phase-d-admin-productivity`
**Timeline**: 2-3 days
**Status**: 🚧 In Progress

## Overview

Phase D focuses on enhancing admin productivity through advanced UI features, bulk operations, and performance optimizations.

## Features

### 1. Bulk Operations
- [ ] Checkbox selection for list items (enrollments, orders, products)
- [ ] Bulk approve/reject for enrollments
- [ ] Bulk status updates for orders
- [ ] Bulk operations with optimistic UI updates
- [ ] Progress indicators for bulk operations

**API Endpoints**:
- `POST /admin/enrollments/bulk-approve` - Bulk approve enrollments
- `POST /admin/enrollments/bulk-reject` - Bulk reject enrollments
- `POST /orders/bulk-update-status` - Bulk update order statuses

### 2. Advanced Search & Filtering
- [ ] Search filters UI component
- [ ] Multi-field search (name, email, role, status)
- [ ] Date range filters
- [ ] Status filters with chips
- [ ] Sort by multiple columns
- [ ] Search debouncing (300ms)
- [ ] URL query params for shareable filters

**Performance Target**: Search response < 200ms

**API Endpoints**:
- Enhanced query params on existing list endpoints:
  - `GET /admin/enrollments?search=&status=&role=&dateFrom=&dateTo=&sortBy=&sortOrder=`
  - `GET /orders?search=&status=&dateFrom=&dateTo=&sortBy=`

### 3. Keyboard Shortcuts
- [ ] Keyboard shortcut manager
- [ ] Global shortcuts:
  - `Ctrl/Cmd + K` - Command palette
  - `Ctrl/Cmd + /` - Shortcut help modal
  - `Esc` - Close modals/deselect
- [ ] Navigation shortcuts:
  - `G + D` - Go to dashboard
  - `G + E` - Go to enrollments
  - `G + O` - Go to orders
  - `G + P` - Go to products
- [ ] List shortcuts:
  - `J/K` - Navigate up/down
  - `X` - Toggle checkbox
  - `A` - Select all
  - `Shift + A` - Approve selected (enrollments)
  - `Shift + R` - Reject selected (enrollments)

**Implementation**:
- React hook: `useKeyboardShortcuts()`
- Component: `<KeyboardShortcutHelp />`
- Command palette: `<CommandPalette />`

### 4. Quick Actions Menu
- [ ] Right-click context menu on list items
- [ ] Quick actions dropdown button
- [ ] Actions: View, Edit, Approve, Reject, Delete
- [ ] Action availability based on RBAC capabilities
- [ ] Keyboard navigation in menus

**Components**:
- `<ContextMenu />`
- `<QuickActionsDropdown />`

### 5. Virtual Scrolling
- [ ] Implement virtual scrolling for large lists (>100 items)
- [ ] Use `react-window` or `react-virtualized`
- [ ] Lazy load images in virtualized lists
- [ ] Maintain scroll position on navigation back
- [ ] Show loading skeletons for off-screen items

**Performance Target**: Render 1000+ items smoothly (60fps)

### 6. Audit Logs
- [ ] Database schema: `audit_logs` table
- [ ] Log all admin actions (approve, reject, edit, delete)
- [ ] Audit log viewer page
- [ ] Filter by user, action type, date range
- [ ] Export audit logs to CSV

**API Endpoints**:
- `GET /admin/audit-logs` - List audit logs
- `GET /admin/audit-logs/:id` - Get audit log details
- `POST /admin/audit-logs/export` - Export to CSV

**Schema**:
```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string; // 'APPROVE_ENROLLMENT', 'REJECT_ENROLLMENT', etc.
  resourceType: string; // 'enrollment', 'order', 'product'
  resourceId: string;
  changes: Record<string, { before: any; after: any }>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}
```

### 7. CSV Export
- [ ] Export enrollments to CSV
- [ ] Export orders to CSV
- [ ] Export products to CSV
- [ ] Export audit logs to CSV
- [ ] Support filtered/searched results export
- [ ] Stream large exports (avoid memory issues)

**API Endpoints**:
- `POST /admin/enrollments/export` - Export enrollments
- `POST /orders/export` - Export orders
- `POST /products/export` - Export products

## Implementation Plan

### Day 1: Bulk Operations & Search
1. **Backend**: Implement bulk operation endpoints
2. **Frontend**: Checkbox selection UI + bulk action buttons
3. **Backend**: Enhance list endpoints with search/filter query params
4. **Frontend**: Advanced search filter component
5. **Testing**: Test bulk operations with 10+ items
6. **Commit & Deploy**: "feat(p1-d): Implement bulk operations and advanced search"

### Day 2: Keyboard Shortcuts & Quick Actions
1. **Frontend**: Keyboard shortcut manager hook
2. **Frontend**: Command palette component
3. **Frontend**: Keyboard help modal
4. **Frontend**: Context menu & quick actions
5. **Testing**: Test all keyboard shortcuts
6. **Commit & Deploy**: "feat(p1-d): Add keyboard shortcuts and quick actions"

### Day 3: Performance & Audit
1. **Backend**: Audit logs schema and middleware
2. **Backend**: CSV export endpoints with streaming
3. **Frontend**: Virtual scrolling for large lists
4. **Frontend**: Audit log viewer page
5. **Frontend**: CSV export buttons with progress
6. **Testing**: Performance testing with 1000+ items
7. **Commit & Deploy**: "feat(p1-d): Add audit logs and performance optimizations"

## Performance Targets

- Search response time: < 200ms
- Bulk operation (10 items): < 500ms
- List rendering (1000 items): 60fps with virtual scrolling
- CSV export (10,000 rows): Streaming with progress

## Testing Checklist

- [ ] Bulk approve 10+ enrollments
- [ ] Bulk reject with validation errors
- [ ] Search with multiple filters
- [ ] Keyboard shortcuts in Chrome/Firefox/Safari
- [ ] Virtual scrolling with 1000+ items
- [ ] Audit log creation for all admin actions
- [ ] CSV export with 10,000+ rows
- [ ] RBAC enforcement on bulk operations
- [ ] Mobile responsiveness (basic support)

## Deployment

**Branch → Main**: After all features tested and approved
**Deployment**: Auto-deploy to API server, manual deploy for admin dashboard

## Notes

- Phase D is optional for MVP but highly recommended for admin efficiency
- Focus on admin role first, extend to seller/supplier later
- Use optimistic UI updates for better perceived performance
- All bulk operations should be transactional (all-or-nothing or partial with error report)

---

**Last Updated**: 2025-11-09
**Phase Status**: Planning → Implementation
