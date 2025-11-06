-- Phase 6: Add tenant_id columns for multi-tenant support
-- Migration: 20251107_add_tenant_id.sql
-- Run with: psql $DATABASE_URL -f apps/api-server/migrations/20251107_add_tenant_id.sql

-- Add tenant_id to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);

-- Add tenant_id to post_meta table
ALTER TABLE post_meta
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64);

-- Create indexes for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_posts_tenant
ON posts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_posts_tenant_type
ON posts(tenant_id, post_type);

CREATE INDEX IF NOT EXISTS idx_post_meta_tenant
ON post_meta(tenant_id, post_id, meta_key);

-- Add comments
COMMENT ON COLUMN posts.tenant_id IS 'Tenant identifier for multi-tenant isolation (NULL = global)';
COMMENT ON COLUMN post_meta.tenant_id IS 'Tenant identifier for multi-tenant isolation (NULL = global)';

-- Verify the changes
SELECT
  'posts' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'posts' AND column_name = 'tenant_id'
UNION ALL
SELECT
  'post_meta' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'post_meta' AND column_name = 'tenant_id';

-- Verify indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE '%tenant%'
ORDER BY tablename, indexname;
