-- Add partner/referral tracking fields to orders table
-- Migration: 20251107_add_partner_fields_to_orders.sql
-- Run with: psql $DATABASE_URL -f apps/api-server/migrations/20251107_add_partner_fields_to_orders.sql

-- Add partner tracking columns
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS partner_id UUID,
ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(50);

-- Create indexes for partner queries
CREATE INDEX IF NOT EXISTS idx_orders_partner_id
ON orders(partner_id)
WHERE partner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_referral_code
ON orders(referral_code)
WHERE referral_code IS NOT NULL;

-- Add comments
COMMENT ON COLUMN orders.partner_id IS 'Partner user ID who referred this order (NULL if no partner referral)';
COMMENT ON COLUMN orders.partner_name IS 'Partner name at time of order (denormalized for reporting)';
COMMENT ON COLUMN orders.referral_code IS 'Referral code used for this order';

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('partner_id', 'partner_name', 'referral_code')
ORDER BY column_name;

-- Verify indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'orders'
  AND (indexname LIKE '%partner%' OR indexname LIKE '%referral%')
ORDER BY indexname;
