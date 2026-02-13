# IR-GLYCOPHARM-DATA-MODEL-V1

## GlycoPharm + GlucoseView Entity/Migration Inventory

> **Step 1-2**: Entity/Migration Inventory
> **Date**: 2026-02-13
> **Type**: Investigation Report (Read-Only)

---

## 1. GlycoPharm Entities (14 total)

### 1-A. Registered Entities (9) - in connection.ts

| # | Entity Class | Table Name | Key Columns | Migration |
|---|--------------|------------|-------------|-----------|
| 1 | `GlycopharmPharmacy` | `glycopharm_pharmacies` | id (uuid), code (unique), enabled_services (jsonb) | ADD COLUMN only |
| 2 | `GlycopharmProduct` | `glycopharm_products` | id (uuid), sku (unique), pharmacy_id, is_partner_recruiting | ADD COLUMN only |
| 3 | `GlycopharmProductLog` | `glycopharm_product_logs` | id (uuid), product_id, action, before_data, after_data | None |
| 4 | `GlycopharmApplication` | `glycopharm_applications` | id (uuid), user_id, status, service_types (jsonb) | CREATE TABLE |
| 5 | `GlycopharmFeaturedProduct` | `glycopharm_featured_products` | id (uuid), product_id, service, context, position | None |
| 6 | `GlycopharmCustomerRequest` | `glycopharm_customer_requests` | id (uuid), pharmacy_id, purpose, source_type, status | CREATE TABLE |
| 7 | `GlycopharmEvent` | `glycopharm_events` | id (uuid), pharmacy_id, event_type, promoted_to_request_id | CREATE TABLE |
| 8 | `GlycopharmRequestActionLog` | `glycopharm_request_action_logs` | id (uuid), request_id, action_type, status | CREATE TABLE |
| 9 | `GlycopharmBillingInvoice` | `glycopharm_billing_invoices` | id (uuid), pharmacy_id, period_from/to, status, dispatch_status | None |

### 1-B. Unregistered Entities (5) - NOT in connection.ts

| # | Entity Class | Table Name | Key Columns | Migration | Issue |
|---|--------------|------------|-------------|-----------|-------|
| 10 | `DisplayPlaylist` | `glycopharm_display_playlists` | id (uuid), pharmacy_id, status, total_duration | None | Orphan |
| 11 | `DisplayMedia` | `glycopharm_display_media` | id (uuid), pharmacy_id, source_type, embed_id | None | Orphan |
| 12 | `DisplayPlaylistItem` | `glycopharm_display_playlist_items` | id (uuid), playlist_id, media_id, sort_order | None | Orphan |
| 13 | `DisplaySchedule` | `glycopharm_display_schedules` | id (uuid), pharmacy_id, playlist_id, days_of_week | None | Orphan |
| 14 | `GlycopharmForumCategoryRequest` | `glycopharm_forum_category_requests` | id (uuid), requester_id, status, created_category_id | CREATE TABLE | Has migration but NOT registered |

---

## 2. GlucoseView Entities (9 total)

### All Registered in connection.ts

| # | Entity Class | Table Name | Key Columns | Migration |
|---|--------------|------------|-------------|-----------|
| 1 | `GlucoseViewVendor` | `glucoseview_vendors` | id (uuid), code (unique), status, supported_devices (jsonb) | None |
| 2 | `GlucoseViewViewProfile` | `glucoseview_view_profiles` | id (uuid), code (unique), summary_level, chart_type | None |
| 3 | `GlucoseViewConnection` | `glucoseview_connections` | id (uuid), pharmacy_id, vendor_id, status | None |
| 4 | `GlucoseViewCustomer` | `glucoseview_customers` | id (uuid), pharmacist_id, phone, email, sync_status | None |
| 5 | `GlucoseViewBranch` | `glucoseview_branches` | id (uuid), name (unique), code (unique), is_active | None |
| 6 | `GlucoseViewChapter` | `glucoseview_chapters` | id (uuid), branch_id, name, code (unique) | None |
| 7 | `GlucoseViewPharmacist` | `glucoseview_pharmacists` | id (uuid), user_id (unique), license_number (unique), chapter_id | None |
| 8 | `GlucoseViewApplication` | `glucoseview_applications` | id (uuid), user_id, pharmacy_id, status | None |
| 9 | `GlucoseViewPharmacy` | `glucoseview_pharmacies` | id (uuid), glycopharm_pharmacy_id, user_id, enabled_services | None |

---

## 3. Migration Inventory

### 3-A. GlycoPharm Migrations (9 files)

| # | File | Type | Tables Affected |
|---|------|------|----------------|
| 1 | `1736400000000-AddEnabledServicesToPharmacy.ts` | ADD COLUMN | `glycopharm_pharmacies` |
| 2 | `1736800000000-CreateGlycopharmApplications.ts` | CREATE TABLE | `glycopharm_applications` |
| 3 | `1737100600000-CreateGlycopharmForumCategoryRequests.ts` | CREATE TABLE | `glycopharm_forum_category_requests` |
| 4 | `1738300000000-AddPartnerRecruitingToGlycopharmProducts.ts` | ADD COLUMN | `glycopharm_products` |
| 5 | `20260209000001-CreateGlycopharmCustomerRequests.ts` | CREATE TABLE | `glycopharm_customer_requests` |
| 6 | `20260209000002-CreateGlycopharmEvents.ts` | CREATE TABLE | `glycopharm_events` |
| 7 | `20260210000002-CreateGlycopharmRequestActionLogs.ts` | CREATE TABLE | `glycopharm_request_action_logs` |
| 8 | `1739700000000-NormalizePhoneNumbers.ts` | DATA UPDATE | Multiple tables (phone normalization) |
| 9 | `20260205070000-Phase4MultiServiceRolePrefixMigration.ts` | DATA UPDATE | Multiple tables (role prefix migration) |

### 3-B. GlucoseView Migrations

**NO dedicated CREATE TABLE migrations exist for any GlucoseView entity.**

Only shared migrations touch glucoseview data:
- `1739700000000-NormalizePhoneNumbers.ts` (phone data normalization)
- `20260205070000-Phase4MultiServiceRolePrefixMigration.ts` (role prefix)

---

## 4. Critical Findings

### 4-A. Tables Created by TypeORM `synchronize: true`

The following tables were created during early development by TypeORM auto-sync, NOT by migrations:

**GlycoPharm (9 tables without CREATE TABLE migration):**
1. `glycopharm_pharmacies` (core table)
2. `glycopharm_products` (core table)
3. `glycopharm_product_logs`
4. `glycopharm_featured_products`
5. `glycopharm_display_playlists`
6. `glycopharm_display_media`
7. `glycopharm_display_playlist_items`
8. `glycopharm_display_schedules`
9. `glycopharm_billing_invoices`

**GlucoseView (ALL 9 tables):**
1. `glucoseview_vendors`
2. `glucoseview_view_profiles`
3. `glucoseview_connections`
4. `glucoseview_customers`
5. `glucoseview_branches`
6. `glucoseview_chapters`
7. `glucoseview_pharmacists`
8. `glucoseview_applications`
9. `glucoseview_pharmacies`

### 4-B. Entity Registration Issues

| Entity | Has File | In connection.ts | Has Migration | Has Table | Status |
|--------|----------|-------------------|---------------|-----------|--------|
| DisplayPlaylist | Yes | **NO** | No | Unknown | ORPHAN |
| DisplayMedia | Yes | **NO** | No | Unknown | ORPHAN |
| DisplayPlaylistItem | Yes | **NO** | No | Unknown | ORPHAN |
| DisplaySchedule | Yes | **NO** | No | Unknown | ORPHAN |
| GlycopharmForumCategoryRequest | Yes | **NO** | **YES** | Yes | REGISTRATION MISSING |

### 4-C. Ghost Tables (Referenced but No Entity/Migration)

Mentioned in `IR-GLYCOPHARM-ARCH-BASELINE-V1.md`:

| Table | Referenced In | Entity | Migration |
|-------|--------------|--------|-----------|
| `cgm_patients` | glucoseview.repository.ts (raw SQL) | None | None |
| `cgm_patient_summaries` | glucoseview.repository.ts (raw SQL) | None | None |
| `cgm_glucose_insights` | glucoseview.repository.ts (raw SQL) | None | None |

---

## 5. Registration Detail (connection.ts)

### GlycoPharm Import Block (~line 144-156)

```typescript
import {
  GlycopharmPharmacy,         // line 529
  GlycopharmProduct,          // line 530
  GlycopharmProductLog,       // line 531
  GlycopharmApplication,      // line 532
  GlycopharmFeaturedProduct,  // line 533
  GlycopharmCustomerRequest,  // line 534
  GlycopharmEvent,            // line 535
  GlycopharmRequestActionLog, // line 536
  GlycopharmBillingInvoice,   // line 537
} from '../routes/glycopharm/entities/index.js';
```

### GlucoseView Import Block (~line 159-171)

```typescript
import {
  GlucoseViewVendor,          // line 541
  GlucoseViewViewProfile,     // line 542
  GlucoseViewConnection,      // line 543
  GlucoseViewCustomer,        // line 544
  GlucoseViewBranch,          // line 545
  GlucoseViewChapter,         // line 546
  GlucoseViewPharmacist,      // line 547
  GlucoseViewApplication,     // line 548
  GlucoseViewPharmacy,        // line 549
} from '../routes/glucoseview/entities/index.js';
```

---

## 6. Summary

| Metric | GlycoPharm | GlucoseView | Total |
|--------|------------|-------------|-------|
| Total Entities | 14 | 9 | 23 |
| Registered in connection.ts | 9 | 9 | 18 |
| NOT Registered | 5 | 0 | 5 |
| With CREATE TABLE Migration | 4 | 0 | 4 |
| Without Migration (synchronize) | 9 | 9 | 18 |
| Ghost Tables (no entity) | 0 | 3 | 3 |

### Risk Assessment

| Issue | Severity | Impact |
|-------|----------|--------|
| 5 unregistered entities (4 Display + 1 ForumCategoryRequest) | MEDIUM | TypeORM queries may fail silently |
| 18 tables without migration | HIGH | Schema drift risk, no rollback capability |
| 3 ghost tables referenced in raw SQL | CRITICAL | Runtime query failures if tables don't exist |
| All GlucoseView tables migration-less | HIGH | Violates CLAUDE.md Section 0.1 |

---

*Investigation Report - Read-Only, No Code Changes*
*Version: 1.0*
*Status: Complete*
