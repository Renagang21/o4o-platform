/**
 * Update Glycopharm Product Status to Active
 *
 * WO-GLYCOPHARM-B2B-PRODUCT-SEED-LINKING-V1 (Task T3)
 * - Update all glycopharm_products to status='active'
 * - This ensures products appear in B2B order pages
 */

-- Update all glycopharm_products to active status
UPDATE glycopharm_products
SET status = 'active',
    updated_at = NOW()
WHERE status != 'active';

-- Verify update
SELECT
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE status = 'active') as active_products,
    COUNT(*) FILTER (WHERE status != 'active') as inactive_products
FROM glycopharm_products;

-- List updated products
SELECT
    id,
    name,
    sku,
    category,
    status,
    price,
    stock_quantity,
    manufacturer
FROM glycopharm_products
ORDER BY created_at DESC
LIMIT 20;
