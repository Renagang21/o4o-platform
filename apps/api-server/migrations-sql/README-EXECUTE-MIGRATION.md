# Glycopharm Products Migration - Execution Guide

## Problem
The B2B products API is returning 500 errors because the database schema is missing columns that exist in the TypeORM Entity.

**Missing columns:**
- subtitle, short_description
- barcodes, images (JSONB)
- origin_country, legal_category, certification_ids
- usage_info, caution_info

## Migration File
`glycopharm-products-complete-migration.sql`

This migration will:
1. Add 9 missing columns to `glycopharm_products` table
2. Activate all products (set status='active')
3. Verify the changes

## Execution Options

### Option 1: Google Cloud Console SQL Editor (Recommended)
1. Go to: https://console.cloud.google.com/sql/instances/o4o-platform-db/sql-studio
2. Open SQL Editor
3. Copy entire contents of `glycopharm-products-complete-migration.sql`
4. Paste and click "Run"
5. Verify output shows:
   - 9 columns added
   - Product counts (active products)

### Option 2: Using migration script (requires DB_PASSWORD)
```bash
cd apps/api-server
DB_PASSWORD=<your-password> npx tsx src/scripts/add-product-fields.ts
```

### Option 3: gcloud CLI (requires gcloud installed)
```bash
gcloud sql connect o4o-platform-db --user=o4o_api --database=o4o_platform < migrations-sql/glycopharm-products-complete-migration.sql
```

## Verification After Execution

### 1. Check API directly:
```bash
curl https://api.neture.co.kr/api/v1/glycopharm/b2b/products?type=franchise
```

Should return products, not 500 error.

### 2. Check Cloud Run logs:
```bash
gcloud logs read --project=o4o-platform --resource-type=cloud_run_revision --log-filter='resource.labels.service_name="o4o-core-api"' --limit=20
```

Should NOT show "column product.subtitle does not exist" error.

### 3. Check product count in DB:
```sql
SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active
FROM glycopharm_products;
```

## Expected Results
- All 9 columns should exist in `glycopharm_products` table
- All products should have status='active'
- B2B products API should return HTTP 200 with product data
- GlycoPharm B2B order page should display products

## Related Work Orders
- WO-PRODUCT-DB-CLEANUP-FOR-SITE-V1
- WO-PRODUCT-IMAGES-AND-BARCODE-UNBLOCK-V1
- WO-GLYCOPHARM-B2B-PRODUCT-SEED-LINKING-V1
