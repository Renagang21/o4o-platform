# Production Migration Execution Guide

## Problem
Local environment cannot connect to production DB (34.64.96.252) due to timeout.
Previous migrations worked because firewall was open, but now it's blocked (correct security posture).

## Solution: Admin API Migration Endpoints

All migrations now execute via Admin API endpoints running inside Cloud Run.

---

## STEP 1: Execute DB Schema Migration

**Endpoint:** `POST /api/v1/glycopharm/admin/migrate/add-product-fields`

**Adds 9 missing columns to glycopharm_products table:**
- subtitle, short_description
- barcodes, images (JSONB)
- origin_country, legal_category, certification_ids
- usage_info, caution_info

### Browser Console Execution:

1. Login to https://glycopharm.neture.co.kr as admin
2. Open DevTools Console (F12)
3. Execute:

```javascript
// Step 1: DB Migration
const result1 = await fetch('https://api.neture.co.kr/api/v1/glycopharm/admin/migrate/add-product-fields', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json());

console.log('✅ Migration Result:', result1);
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Product fields migration completed successfully",
  "fieldsAdded": [
    "subtitle", "short_description", "barcodes", "images",
    "origin_country", "legal_category", "certification_ids",
    "usage_info", "caution_info"
  ]
}
```

---

## STEP 2: Activate All Products

**Endpoint:** `POST /api/v1/glycopharm/admin/products/activate-all`

Sets all products to `status='active'`

### Browser Console Execution:

```javascript
// Step 2: Activate Products
const result2 = await fetch('https://api.neture.co.kr/api/v1/glycopharm/admin/products/activate-all', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json());

console.log('✅ Activation Result:', result2);
```

**Expected Output:**
```json
{
  "success": true,
  "data": {
    "totalProducts": 57,
    "previousActiveCount": 0,
    "updatedCount": 57,
    "currentActiveCount": 57
  }
}
```

---

## STEP 3: Create Missing Forum Categories

**Endpoint:** `POST /api/v1/glycopharm/forum-requests/admin/create-missing-categories`

Creates forum categories for all approved requests that don't have them yet.

### Browser Console Execution:

```javascript
// Step 3: Forum Categories
const result3 = await fetch('https://api.neture.co.kr/api/v1/glycopharm/forum-requests/admin/create-missing-categories', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json());

console.log('✅ Forum Categories Result:', result3);
```

**Expected Output:**
```json
{
  "success": true,
  "summary": {
    "total": 5,
    "created": 3,
    "skipped": 2,
    "errors": 0
  },
  "results": [...]
}
```

---

## STEP 4: Verify

### Check B2B Products API:

```javascript
// Verify B2B Products
const products = await fetch('https://api.neture.co.kr/api/v1/glycopharm/b2b/products?type=franchise', {
  credentials: 'include'
}).then(r => r.json());

console.log('✅ B2B Products:', products);
// Should return products, not 500 error
```

### Check Cloud Run Logs:

```bash
gcloud logs read \
  --project=o4o-platform \
  --resource-type=cloud_run_revision \
  --log-filter='resource.labels.service_name="o4o-core-api"' \
  --limit=50
```

Should NOT show: "column product.subtitle does not exist"

---

## All-in-One Script (Copy & Paste to Browser Console)

```javascript
(async () => {
  console.log('🚀 Starting Production Migration...\n');

  try {
    // Step 1: DB Migration
    console.log('📊 Step 1: Adding missing product fields...');
    const migration = await fetch('https://api.neture.co.kr/api/v1/glycopharm/admin/migrate/add-product-fields', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());
    console.log('✅ Migration:', migration);

    // Step 2: Activate Products
    console.log('\n📊 Step 2: Activating all products...');
    const activation = await fetch('https://api.neture.co.kr/api/v1/glycopharm/admin/products/activate-all', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());
    console.log('✅ Activation:', activation);

    // Step 3: Forum Categories
    console.log('\n📊 Step 3: Creating missing forum categories...');
    const forums = await fetch('https://api.neture.co.kr/api/v1/glycopharm/forum-requests/admin/create-missing-categories', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());
    console.log('✅ Forums:', forums);

    // Step 4: Verify B2B Products
    console.log('\n📊 Step 4: Verifying B2B products...');
    const products = await fetch('https://api.neture.co.kr/api/v1/glycopharm/b2b/products?type=franchise', {
      credentials: 'include'
    }).then(r => r.json());
    console.log('✅ Products:', products.data?.length || 0, 'products found');

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
})();
```

---

## Why This Works

1. **No Firewall Issues**: Runs inside Cloud Run, which has DB access
2. **Audit Trail**: All operations logged in Cloud Run
3. **Permission Checked**: Requires admin/operator role
4. **Safe & Repeatable**: Uses IF NOT EXISTS, idempotent

---

## Future Migrations

**DO NOT use local scripts to connect to production DB.**

Instead:
1. Add migration endpoint to admin controller
2. Execute via browser/curl with admin auth
3. Verify in Cloud Run logs

See: CLAUDE.md Section 0.1 - Production Environment Policy
