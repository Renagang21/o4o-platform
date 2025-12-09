# Database Index Execution Guide

**Created:** 2025-11-06
**Purpose:** Phase 2 - CPT/ACF Performance Optimization via GIN Indexes
**Target:** Production Database (Low-traffic hours)

---

## Overview

This guide documents the execution of GIN (Generalized Inverted Index) indexes on the `post_meta` table to optimize JSONB queries and prevent N+1 query problems.

### Indexes to be Created

1. **GIN Index on meta_value (JSONB)**
   - Enables fast containment queries (`@>`, `?`, `?&`, `?|`)
   - Uses `jsonb_path_ops` for optimal performance

2. **Composite Index on (post_id, meta_key)**
   - Optimizes the most common query pattern
   - Speeds up meta field lookups for specific posts

3. **Index on meta_key**
   - Enables efficient queries across all posts by field name

---

## Pre-Execution Checklist

### 1. Environment Verification

- [ ] Confirm current database connection details
- [ ] Verify database backup exists
- [ ] Check available disk space (need ~20-30% of table size per index)
- [ ] Confirm low-traffic time window (recommended: 2-4 AM)

### 2. Table Analysis

Run these queries before execution:

```sql
-- Check current table size
SELECT
  pg_size_pretty(pg_total_relation_size('post_meta')) as total_size,
  pg_size_pretty(pg_relation_size('post_meta')) as table_size,
  pg_size_pretty(pg_indexes_size('post_meta')) as indexes_size;

-- Check row count
SELECT COUNT(*) FROM post_meta;

-- Check existing indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'post_meta';
```

**Record results:**
```
Table Size: _____________
Row Count: _____________
Existing Indexes: _____________
```

---

## Execution Steps

### Step 1: Connect to Production Database

```bash
# SSH to database server
ssh o4o-api

# Or connect directly if remote access is configured
psql -h <DB_HOST> -U <DB_USER> -d o4o_platform
```

### Step 2: Run Index Creation Script

**Location:** `/home/sohae21/o4o-platform/apps/api-server/migrations/20251106_add_gin_indexes.sql`

```bash
# Execute the migration script
psql -h <DB_HOST> -U <DB_USER> -d o4o_platform -f apps/api-server/migrations/20251106_add_gin_indexes.sql
```

**OR** run commands manually:

```sql
-- GIN Index for JSONB containment queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_meta_value_gin
  ON post_meta USING gin (meta_value jsonb_path_ops);

-- Composite Index for post_id + meta_key lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_meta_post_key
  ON post_meta (post_id, meta_key);

-- Index for meta_key alone
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_meta_key
  ON post_meta (meta_key);
```

### Step 3: Monitor Progress

In a separate terminal, monitor index creation:

```sql
-- Check progress of index creation
SELECT
  phase,
  round(100.0 * blocks_done / nullif(blocks_total, 0), 1) AS "% complete",
  blocks_done,
  blocks_total,
  tuples_done,
  tuples_total
FROM pg_stat_progress_create_index;
```

**Expected Duration:**
- Small table (< 100K rows): 1-2 minutes per index
- Medium table (100K - 1M rows): 5-10 minutes per index
- Large table (> 1M rows): 10-30 minutes per index

---

## Post-Execution Verification

### 1. Verify Indexes Created

```sql
-- List all indexes on post_meta
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'post_meta'
ORDER BY indexname;
```

**Expected Output:**
```
idx_post_meta_value_gin    - GIN index on meta_value
idx_post_meta_post_key     - Composite index on (post_id, meta_key)
idx_post_meta_key          - Index on meta_key
```

### 2. Update Statistics

```sql
-- Analyze the table to update statistics
ANALYZE post_meta;
```

### 3. Verify Index Usage

Run representative queries with EXPLAIN ANALYZE:

```sql
-- Test JSONB containment query
EXPLAIN ANALYZE
SELECT * FROM post_meta
WHERE meta_value @> '{"acf_field": "value"}';

-- Expected: "Bitmap Index Scan on idx_post_meta_value_gin"
```

```sql
-- Test post_id + meta_key query
EXPLAIN ANALYZE
SELECT * FROM post_meta
WHERE post_id = 'some-uuid' AND meta_key = 'acf_field_name';

-- Expected: "Index Scan using idx_post_meta_post_key"
```

```sql
-- Test meta_key query
EXPLAIN ANALYZE
SELECT * FROM post_meta
WHERE meta_key = 'acf_field_name';

-- Expected: "Index Scan using idx_post_meta_key"
```

### 4. Performance Comparison

Before/After comparison template:

| Query Type | Before (ms) | After (ms) | Improvement |
|-----------|-------------|------------|-------------|
| JSONB containment | _____ | _____ | _____ |
| post_id + meta_key | _____ | _____ | _____ |
| meta_key only | _____ | _____ | _____ |

---

## Execution Log

### Execution Details

**Date:** __________
**Time:** __________
**Executed By:** __________
**Database:** __________
**Row Count:** __________

### Index Creation Times

```
idx_post_meta_value_gin: _____ minutes
idx_post_meta_post_key: _____ minutes
idx_post_meta_key: _____ minutes
Total: _____ minutes
```

### Disk Space Used

```
Before: _____
After: _____
Additional: _____
```

### Performance Results

```
[Paste EXPLAIN ANALYZE results here]
```

### Issues Encountered

```
[Document any errors, warnings, or unexpected behavior]
```

---

## Rollback Procedure

If indexes need to be removed:

```sql
-- Drop indexes concurrently (no table lock)
DROP INDEX CONCURRENTLY IF EXISTS idx_post_meta_value_gin;
DROP INDEX CONCURRENTLY IF EXISTS idx_post_meta_post_key;
DROP INDEX CONCURRENTLY IF EXISTS idx_post_meta_key;
```

**When to rollback:**
- Indexes cause performance degradation (rare)
- Disk space becomes critical
- Blocking issues on writes (shouldn't happen with CONCURRENTLY)

---

## Post-Deployment Monitoring

### Week 1: Daily Checks

Monitor query performance and index usage:

```sql
-- Check index usage stats
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'post_meta'
ORDER BY idx_scan DESC;
```

### Week 2-4: Weekly Checks

- Monitor application logs for slow queries
- Check database metrics (CPU, I/O, memory)
- Verify no regressions in write performance

---

## Notes

- **CONCURRENTLY option:** Allows reads/writes during index creation
- **jsonb_path_ops:** More efficient than `jsonb_ops` but only supports `@>` and `@?` operators
- **IF NOT EXISTS:** Prevents errors if indexes already exist

---

## Related Documentation

- [CPT/ACF Investigation Report](./CPT_ACF_INVESTIGATION.md)
- [Migration Script](../apps/api-server/migrations/20251106_add_gin_indexes.sql)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
- [JSONB Indexing Best Practices](https://www.postgresql.org/docs/current/datatype-json.html#JSON-INDEXING)

---

*Document Version: 1.0*
*Last Updated: 2025-11-06*
