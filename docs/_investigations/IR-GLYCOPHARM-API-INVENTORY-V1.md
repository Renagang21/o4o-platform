# IR-GLYCOPHARM-API-INVENTORY-V1

## GlycoPharm + GlucoseView API Route/Controller Inventory

> **Step 1-1**: Route/Controller Inventory
> **Date**: 2026-02-13
> **Type**: Investigation Report (Read-Only)

---

## 1. Route Mounting (main.ts)

| Service | Mount Point | Line |
|---------|-------------|------|
| GlycoPharm | `/api/v1/glycopharm` | ~874 |
| GlucoseView | `/api/v1/glucoseview` | ~883 |

---

## 2. GlycoPharm API Routes

### 2-1. glycopharm.controller.ts (Main CRUD)

**Mount**: `/` (direct under `/api/v1/glycopharm`)
**Endpoints**: 19

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/pharmacies` | List pharmacies | Public |
| GET | `/products` | List products | Public |
| GET | `/products/:id` | Get product detail | Public |
| GET | `/admin/pharmacies` | List all pharmacies (admin) | requireAuth + requireScope |
| POST | `/admin/pharmacies` | Create pharmacy (admin) | requireAuth + requireScope |
| GET | `/admin/pharmacies/:id` | Get pharmacy detail (admin) | requireAuth + requireScope |
| PUT | `/admin/pharmacies/:id` | Update pharmacy (admin) | requireAuth + requireScope |
| PATCH | `/admin/pharmacies/:id/status` | Update pharmacy status (admin) | requireAuth + requireScope |
| GET | `/admin/products` | List all products (admin) | requireAuth + requireScope |
| POST | `/admin/products` | Create product (admin) | requireAuth + requireScope |
| GET | `/admin/products/:id` | Get product detail (admin) | requireAuth + requireScope |
| PUT | `/admin/products/:id` | Update product (admin) | requireAuth + requireScope |
| PATCH | `/admin/products/:id/status` | Update product status (admin) | requireAuth + requireScope |
| PATCH | `/operator/products/:id/partner-recruiting` | Toggle partner recruiting | requireAuth + requireScope |
| GET | `/operator/featured-products` | List featured products | requireAuth + requireScope |
| POST | `/operator/featured-products` | Add featured product | requireAuth + requireScope |
| PATCH | `/operator/featured-products/order` | Reorder featured products | requireAuth + requireScope |
| PATCH | `/operator/featured-products/:id` | Update featured product | requireAuth + requireScope |
| DELETE | `/operator/featured-products/:id` | Remove featured product | requireAuth + requireScope |

### 2-2. admin.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 6

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/applications/admin/all` | Get all applications (admin) | requireAuth |
| PATCH | `/applications/:id/review` | Approve/reject application | requireAuth |
| GET | `/applications/:id/admin` | Get application detail (admin) | requireAuth |
| POST | `/admin/products/activate-all` | Activate all products | requireAuth |
| GET | `/admin/products/stats` | Get product statistics | requireAuth |
| POST | `/admin/migrate/add-product-fields` | Migration endpoint | requireAuth |

### 2-3. application.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 4

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/applications` | Submit new application | requireAuth |
| GET | `/applications/mine` | Get current user's applications | requireAuth |
| GET | `/applications/:id` | Get application by ID | requireAuth |
| GET | `/pharmacies/me` | Get current user's pharmacy info | requireAuth |

### 2-4. customer-request.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 5

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/requests` | Create customer request | Public |
| GET | `/requests` | List customer requests | requireAuth |
| GET | `/requests/pending-count` | Get pending request count | requireAuth |
| PATCH | `/requests/:id/approve` | Approve request | requireAuth |
| PATCH | `/requests/:id/reject` | Reject request | requireAuth |

### 2-5. event.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 2

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/events` | Record event | Public |
| GET | `/events` | List events | requireAuth |

### 2-6. display.controller.ts

**Mount**: `/display`
**Endpoints**: 17

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/playlists` | List playlists | requireAuth |
| POST | `/playlists` | Create playlist | requireAuth |
| GET | `/playlists/:id` | Get playlist detail | requireAuth |
| PUT | `/playlists/:id` | Update playlist | requireAuth |
| DELETE | `/playlists/:id` | Delete playlist | requireAuth |
| GET | `/media` | List media | requireAuth |
| POST | `/media` | Create media | requireAuth |
| DELETE | `/media/:id` | Delete media | requireAuth |
| POST | `/playlists/:id/items` | Add playlist item | requireAuth |
| DELETE | `/playlists/:playlistId/items/:itemId` | Delete playlist item | requireAuth |
| GET | `/schedules` | List schedules | requireAuth |
| POST | `/schedules` | Create schedule | requireAuth |
| PUT | `/schedules/:id` | Update schedule | requireAuth |
| DELETE | `/schedules/:id` | Delete schedule | requireAuth |
| GET | `/shared-playlists` | List shared playlists | Public |
| POST | `/shared-playlists/:id/like` | Like playlist | requireAuth |
| POST | `/shared-playlists/:id/import` | Import playlist | requireAuth |

### 2-7. forum-request.controller.ts

**Mount**: `/forum-requests`
**Endpoints**: 7

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Submit forum category request | requireAuth |
| GET | `/my` | Get my forum requests | requireAuth |
| GET | `/:id` | Get forum request detail | requireAuth |
| GET | `/admin/all` | Get all forum requests (admin) | requireAuth + requireScope |
| GET | `/admin/pending-count` | Get pending count (admin) | requireAuth + requireScope |
| PATCH | `/:id/review` | Review forum request (admin) | requireAuth + requireScope |
| POST | `/admin/create-missing-categories` | Create missing categories | requireAuth + requireScope |

### 2-8. invoice.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 4

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/invoices` | Create draft invoice | requireAuth |
| POST | `/invoices/:id/confirm` | Confirm invoice | requireAuth |
| GET | `/invoices/:id` | Get invoice detail | requireAuth |
| GET | `/invoices` | List invoices | requireAuth |

### 2-9. invoice-dispatch.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 3

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/invoices/:id/send` | Send invoice email | requireAuth |
| POST | `/invoices/:id/received` | Mark invoice received | requireAuth |
| GET | `/invoices/:id/dispatch-log` | Get dispatch status | requireAuth |

### 2-10. billing-preview.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 1

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/billing/preview/consultation` | Consultation billing preview | requireAuth |

### 2-11. funnel.controller.ts

**Mount**: `/` (direct)
**Endpoints**: 1

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/funnel/consultation` | Get consultation funnel | requireAuth |

### 2-12. report.controller.ts

**Mount**: `/` (direct)
**Endpoints**: ~2

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/reports/consultation` | Get consultation billing report | requireAuth |
| GET | `/reports/pharmacies` | Get pharmacy list (for dropdown) | requireAuth |

### 2-13. operator.controller.ts

**Mount**: `/operator`
**Endpoints**: ~1

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/dashboard` | Get operator dashboard data | requireAuth |

### 2-14. pharmacy.controller.ts

**Mount**: `/pharmacy`
**Endpoints**: ~8

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/products` | Get pharmacy products | requireAuth |
| POST | `/products` | Create pharmacy product | requireAuth |
| GET | `/products/:id` | Get pharmacy product detail | requireAuth |
| PUT | `/products/:id` | Update pharmacy product | requireAuth |
| DELETE | `/products/:id` | Delete pharmacy product | requireAuth |
| GET | `/categories` | Get product categories | requireAuth |
| GET | `/orders` | Get pharmacy orders | requireAuth |
| GET | `/customers` | Get pharmacy customers | requireAuth |

### 2-15. cockpit.controller.ts

**Mount**: `/pharmacy/cockpit`
**Endpoints**: ~6

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/status` | Get pharmacy status | requireAuth |
| GET | `/today-actions` | Get today's actions | requireAuth |
| GET | `/franchise-services` | Get franchise services | requireAuth |
| GET | `/content-workspace` | Get content workspace | requireAuth |
| GET | `/store-kpi` | Get store KPI summary | requireAuth |
| GET | `/store-insights` | Get AI insights | requireAuth |

### 2-16. public.controller.ts

**Mount**: `/public`
**Endpoints**: 2

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/now-running` | Get running trials/events | Public |
| GET | `/notices` | Get operator notices | Public |

### 2-17. signage.controller.ts

**Mount**: `/signage`
**Endpoints**: ~5

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/channels` | Get signage channels | requireAuth |
| GET | `/my-signage` | Get my signage items | requireAuth |
| POST | `/my-signage` | Add signage item | requireAuth |
| PUT | `/my-signage/:id` | Update signage item | requireAuth |
| DELETE | `/my-signage/:id` | Delete signage item | requireAuth |

### 2-18. checkout.controller.ts

**Mount**: `/checkout`
**Endpoints**: ~3

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/create-order` | Create glycopharm order | requireAuth |
| GET | `/orders` | List orders | requireAuth |
| GET | `/orders/:id` | Get order detail | requireAuth |

### 2-19. Forum Routes (glycopharm.routes.ts embedded)

**Mount**: `/forum`
**Endpoints**: 17

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check | Public |
| GET | `/stats` | Get forum stats | optionalAuth |
| GET | `/posts` | List posts | optionalAuth |
| GET | `/posts/:id` | Get post detail | optionalAuth |
| POST | `/posts` | Create post | authenticate |
| PUT | `/posts/:id` | Update post | authenticate |
| DELETE | `/posts/:id` | Delete post | authenticate |
| POST | `/posts/:id/like` | Toggle like | authenticate |
| GET | `/posts/:postId/comments` | List comments | Public |
| POST | `/comments` | Create comment | authenticate |
| GET | `/categories` | List categories | Public |
| GET | `/categories/:id` | Get category | Public |
| POST | `/categories` | Create category | authenticate |
| PUT | `/categories/:id` | Update category | authenticate |
| DELETE | `/categories/:id` | Delete category | authenticate |
| GET | `/moderation` | Get moderation queue | authenticate |
| POST | `/moderation/:type/:id` | Moderate content | authenticate |

### GlycoPharm Total: ~107 endpoints

---

## 3. GlucoseView API Routes

### 3-1. glucoseview.controller.ts (Main)

**Mount**: `/` (direct under `/api/v1/glucoseview`)
**Endpoints**: ~16

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/vendors` | List active vendors | Public |
| GET | `/view-profiles` | List active view profiles | Public |
| GET | `/patients` | List patients with summaries | Public |
| GET | `/admin/vendors` | List all vendors (admin) | requireAuth + requireScope |
| POST | `/admin/vendors` | Create vendor (admin) | requireAuth + requireScope |
| GET | `/admin/vendors/:id` | Get vendor detail (admin) | requireAuth + requireScope |
| PUT | `/admin/vendors/:id` | Update vendor (admin) | requireAuth + requireScope |
| PATCH | `/admin/vendors/:id/status` | Update vendor status (admin) | requireAuth + requireScope |
| GET | `/admin/view-profiles` | List all view profiles (admin) | requireAuth + requireScope |
| POST | `/admin/view-profiles` | Create view profile (admin) | requireAuth + requireScope |
| GET | `/admin/view-profiles/:id` | Get view profile detail (admin) | requireAuth + requireScope |
| PUT | `/admin/view-profiles/:id` | Update view profile (admin) | requireAuth + requireScope |
| PATCH | `/admin/view-profiles/:id/status` | Update view profile status (admin) | requireAuth + requireScope |
| GET | `/admin/connections` | List all connections (admin) | requireAuth + requireScope |
| POST | `/admin/connections` | Create connection (admin) | requireAuth + requireScope |
| GET | `/admin/connections/:id` | Get connection detail (admin) | requireAuth + requireScope |

### 3-2. customer.controller.ts

**Mount**: `/customers`
**Endpoints**: ~5

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/` | List customers | requireAuth |
| POST | `/` | Create customer | requireAuth |
| GET | `/:id` | Get customer detail | requireAuth |
| PUT | `/:id` | Update customer | requireAuth |
| DELETE | `/:id` | Delete customer | requireAuth |

### 3-3. branch.controller.ts

**Mount**: `/` (direct)
**Endpoints**: ~3

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/branches` | List branches | Public |
| GET | `/branches/:id` | Get branch detail | Public |
| GET | `/chapters` | List chapters | Public |

### 3-4. pharmacist.controller.ts

**Mount**: `/pharmacists`
**Endpoints**: ~6

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/register` | Register pharmacist | Public |
| GET | `/me` | Get my pharmacist profile | requireAuth |
| PUT | `/me` | Update my profile | requireAuth |
| GET | `/admin/all` | List all pharmacists (admin) | requireAuth + requireAdmin |
| PATCH | `/admin/:id/approve` | Approve pharmacist (admin) | requireAuth + requireAdmin |
| PATCH | `/admin/:id/reject` | Reject pharmacist (admin) | requireAuth + requireAdmin |

### 3-5. application.controller.ts

**Mount**: `/applications`
**Endpoints**: ~5

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/` | Submit CGM View application | requireAuth |
| GET | `/mine` | Get my applications | requireAuth |
| GET | `/:id` | Get application detail | requireAuth |
| GET | `/admin/all` | List all applications (admin) | requireAuth |
| PATCH | `/:id/review` | Review application (admin) | requireAuth |

### 3-6. pharmacy.controller.ts

**Mount**: `/pharmacies`
**Endpoints**: ~1

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/me` | Get my pharmacy info | requireAuth |

### GlucoseView Total: ~36 endpoints

---

## 4. Summary

| Service | Controllers | Endpoints | Key Areas |
|---------|------------|-----------|-----------|
| GlycoPharm | 19 | ~107 | Pharmacy/Product CRUD, Cockpit, Customer Requests, Events, Billing, Forum, Display, Signage, Checkout |
| GlucoseView | 6 | ~36 | Vendor/ViewProfile/Connection Admin, Customer CRUD, Branch/Chapter, Pharmacist Registration, Applications |
| **Total** | **25** | **~143** | |

### Functional Domain Map

| Domain | GlycoPharm | GlucoseView |
|--------|------------|-------------|
| **Store Operations** | glycopharm.controller (19), pharmacy.controller (8) | - |
| **CRM** | customer-request (5), event (2) | customer (5) |
| **Billing** | invoice (4), invoice-dispatch (3), billing-preview (1), report (2) | - |
| **Content** | display (17), signage (5), forum (17) | - |
| **Analytics** | funnel (1), cockpit (6), operator (1) | - |
| **Onboarding** | admin (6), application (4) | pharmacist (6), application (5) |
| **Infrastructure** | checkout (3), public (2) | branch (3), pharmacy (1) |
| **CGM Data** | - | vendors/view-profiles/connections (16) |

---

*Investigation Report - Read-Only, No Code Changes*
*Version: 1.0*
*Status: Complete*
