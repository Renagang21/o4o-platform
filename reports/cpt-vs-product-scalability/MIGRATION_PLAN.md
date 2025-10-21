# Migration Plan: CustomPost + Materialized View Implementation

**Project**: O4O Platform Product Scalability
**Approach**: Hybrid (CustomPost JSONB + Materialized View)
**Target**: Support 100K-1M products with < 200ms p95 latency
**Timeline**: 2-3 weeks
**Risk Level**: Medium

---

## Overview

This migration plan implements the recommended **Option C (Hybrid)** approach:
- Keep `custom_posts` table for writes and admin operations
- Create `mv_product_search` materialized view for read-heavy queries
- Automate MV refresh every 10 minutes
- Migrate API endpoints gradually

---

## Phase 1: Pre-Deployment Validation (Days 1-3)

### Day 1: Database Preparation

**Tasks**:
1. Verify JSONB indexes are created (already done in benchmark)
2. Test index performance on production-like data
3. Run ANALYZE to update statistics

**SQL Commands**:
```sql
-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'custom_posts'
  AND indexname LIKE 'idx_custom_posts_%';

-- Update statistics
ANALYZE custom_posts;

-- Check table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'custom_posts';
```

**Validation Checklist**:
- [ ] All 16 JSONB indexes present
- [ ] Index sizes are reasonable (< 2x table size)
- [ ] No bloat issues (VACUUM if needed)
- [ ] Statistics up to date

### Day 2: Deploy Materialized View (Staging)

**Tasks**:
1. Deploy MV creation script to staging environment
2. Measure initial refresh time
3. Test CONCURRENT refresh (requires unique index)

**SQL Commands**:
```sql
-- Deploy to staging
\i /path/to/04-create-materialized-views.sql

-- Measure refresh time
\timing on
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_search;

-- Check MV size
SELECT
    pg_size_pretty(pg_total_relation_size('mv_product_search')) AS total_size,
    pg_size_pretty(pg_relation_size('mv_product_search')) AS table_size,
    pg_size_pretty(pg_indexes_size('mv_product_search')) AS index_size;
```

**Success Criteria**:
- [ ] MV created successfully
- [ ] Refresh time < 30 seconds (at current data volume)
- [ ] All 17 indexes created
- [ ] CONCURRENT refresh works without errors

**Rollback Procedure**:
```sql
DROP MATERIALIZED VIEW IF EXISTS mv_product_search CASCADE;
```

### Day 3: Setup Refresh Automation (Staging)

**Option 1: PostgreSQL pg_cron Extension**

```sql
-- Install pg_cron (if not already installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule refresh every 10 minutes
SELECT cron.schedule(
    'refresh-product-search',
    '*/10 * * * *',
    'SELECT refresh_product_search_with_logging();'
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Monitor job runs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

**Option 2: Application-Level Scheduler (Node.js)**

```typescript
// apps/api-server/src/jobs/refresh-product-search.ts
import cron from 'node-cron';
import { AppDataSource } from '../config/database';

export function scheduleProductSearchRefresh() {
  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      const startTime = Date.now();

      await AppDataSource.query(
        'SELECT refresh_product_search_with_logging();'
      );

      const duration = Date.now() - startTime;
      console.log(`[ProductSearch] MV refreshed in ${duration}ms`);

      // Log to monitoring (Prometheus, DataDog, etc.)
      metrics.recordRefreshDuration(duration);

    } catch (error) {
      console.error('[ProductSearch] MV refresh failed:', error);
      // Alert on-call engineer
      alerting.sendError('ProductSearch MV refresh failed', error);
    }
  });
}
```

**Validation Checklist**:
- [ ] Refresh job scheduled and running
- [ ] Refresh completes successfully every 10 minutes
- [ ] Logs are visible (check `mv_refresh_log` table)
- [ ] Alerts configured for refresh failures

---

## Phase 2: API Migration (Days 4-10)

### Day 4-5: Create Repository Layer

**Create abstraction for product queries**:

```typescript
// apps/api-server/src/repositories/ProductSearchRepository.ts
import { AppDataSource } from '../config/database';

export interface ProductSearchFilters {
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  brand?: string;
  search?: string;
  status?: 'publish' | 'draft';
}

export interface ProductSearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'price' | 'name';
  sortOrder?: 'ASC' | 'DESC';
}

export class ProductSearchRepository {
  /**
   * Search products using Materialized View
   * (Falls back to custom_posts if MV is not available)
   */
  async searchProducts(
    filters: ProductSearchFilters,
    options: ProductSearchOptions = {}
  ) {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;

    // Try MV first
    try {
      return await this.searchFromMV(filters, options);
    } catch (error) {
      console.warn('[ProductSearch] MV query failed, falling back to custom_posts', error);
      return await this.searchFromCustomPosts(filters, options);
    }
  }

  private async searchFromMV(
    filters: ProductSearchFilters,
    options: ProductSearchOptions
  ) {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = options;
    const offset = (page - 1) * limit;

    let query = AppDataSource.createQueryBuilder()
      .select([
        'id',
        'slug',
        'name',
        'sku',
        'recommended_price',
        'inventory',
        'brand',
        'in_stock',
        'created_at'
      ])
      .from('mv_product_search', 'p')
      .where('status = :status', { status: filters.status || 'publish' });

    if (filters.categoryId) {
      query = query.andWhere('category_id = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.priceMin !== undefined) {
      query = query.andWhere('recommended_price >= :priceMin', { priceMin: filters.priceMin });
    }

    if (filters.priceMax !== undefined) {
      query = query.andWhere('recommended_price <= :priceMax', { priceMax: filters.priceMax });
    }

    if (filters.inStock) {
      query = query.andWhere('in_stock = true');
    }

    if (filters.brand) {
      query = query.andWhere('brand = :brand', { brand: filters.brand });
    }

    if (filters.search) {
      query = query.andWhere(
        'search_vector @@ to_tsquery(:search)',
        { search: filters.search }
      );
    }

    // Sorting
    const sortColumn = sortBy === 'price' ? 'recommended_price' : sortBy;
    query = query.orderBy(sortColumn, sortOrder);

    // Pagination
    query = query.limit(limit).offset(offset);

    const [products, total] = await Promise.all([
      query.getRawMany(),
      query.getCount()
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  private async searchFromCustomPosts(
    filters: ProductSearchFilters,
    options: ProductSearchOptions
  ) {
    // Fallback to custom_posts JSONB queries
    // (existing implementation)
    // ...
  }
}
```

**Validation**:
- [ ] Repository layer created
- [ ] Unit tests pass
- [ ] Fallback to custom_posts works

### Day 6-7: Migrate Product Listing Endpoints

**Update Controllers**:

```typescript
// apps/api-server/src/controllers/ProductController.ts
import { ProductSearchRepository } from '../repositories/ProductSearchRepository';

export class ProductController {
  private productSearchRepo = new ProductSearchRepository();

  /**
   * GET /api/products
   * List products with filters
   */
  async listProducts(req: Request, res: Response) {
    const filters = {
      categoryId: req.query.categoryId as string,
      priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
      priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
      inStock: req.query.inStock === 'true',
      brand: req.query.brand as string,
      search: req.query.search as string,
      status: 'publish'
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as any) || 'created_at',
      sortOrder: (req.query.sortOrder as any) || 'DESC'
    };

    try {
      const result = await this.productSearchRepo.searchProducts(filters, options);

      res.json({
        success: true,
        data: result.products,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      console.error('[ProductController] listProducts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch products'
      });
    }
  }

  /**
   * GET /api/products/:slug
   * Get single product (still uses custom_posts)
   */
  async getProduct(req: Request, res: Response) {
    // Single product reads can stay on custom_posts
    // (MV is for search/listing only)
    const { slug } = req.params;

    const product = await AppDataSource.getRepository(CustomPost)
      .findOne({ where: { slug } });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  }
}
```

**Endpoints to Migrate**:
- [ ] `GET /api/products` (list with filters)
- [ ] `GET /api/products/search` (full-text search)
- [ ] `GET /api/categories/:id/products` (category page)
- [ ] `GET /api/brands/:brand/products` (brand page)

**Do NOT Migrate**:
- `GET /api/products/:slug` (single product - keep on custom_posts)
- `POST /api/products` (create - writes to custom_posts)
- `PUT /api/products/:id` (update - writes to custom_posts)
- `DELETE /api/products/:id` (delete - writes to custom_posts)

### Day 8-9: Testing and Validation

**Load Testing**:

```bash
# Install k6 (load testing tool)
# https://k6.io/

# Create load test script
cat > load-test-products.js <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'], // 95% of requests < 200ms
  }
};

export default function() {
  // Test 1: Product listing
  let res1 = http.get('https://api.example.com/api/products?page=1&limit=20');
  check(res1, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // Test 2: Filtered search
  let res2 = http.get('https://api.example.com/api/products?priceMin=50000&priceMax=150000&inStock=true');
  check(res2, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
EOF

# Run load test
k6 run load-test-products.js
```

**Validation Checklist**:
- [ ] p95 latency < 200ms under load
- [ ] No errors during concurrent requests
- [ ] MV refresh does not block queries
- [ ] Fallback to custom_posts works if MV unavailable

### Day 10: Monitoring and Alerting

**Setup Prometheus Metrics**:

```typescript
// apps/api-server/src/metrics/product-search-metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const productSearchMetrics = {
  // Query duration
  queryDuration: new Histogram({
    name: 'product_search_query_duration_ms',
    help: 'Product search query duration in milliseconds',
    labelNames: ['source'], // 'mv' or 'custom_posts'
    buckets: [10, 25, 50, 100, 200, 500, 1000, 2000]
  }),

  // MV refresh duration
  mvRefreshDuration: new Histogram({
    name: 'product_search_mv_refresh_duration_ms',
    help: 'Materialized view refresh duration in milliseconds',
    buckets: [1000, 5000, 10000, 30000, 60000]
  }),

  // MV staleness
  mvStaleness: new Gauge({
    name: 'product_search_mv_staleness_seconds',
    help: 'Seconds since last MV refresh'
  }),

  // Query errors
  queryErrors: new Counter({
    name: 'product_search_query_errors_total',
    help: 'Total number of product search query errors',
    labelNames: ['source', 'error_type']
  }),

  // Fallback usage
  fallbackUsage: new Counter({
    name: 'product_search_fallback_total',
    help: 'Number of times fallback to custom_posts was used'
  })
};

// Export metrics endpoint
export async function getMetrics() {
  return register.metrics();
}
```

**Grafana Dashboard**:

Create dashboard with panels for:
- Product search query duration (p50, p95, p99)
- MV refresh duration over time
- MV staleness gauge
- Query error rate
- Fallback usage rate

**Alerts**:

```yaml
# AlertManager configuration
groups:
  - name: product_search
    interval: 30s
    rules:
      - alert: ProductSearchSlowQueries
        expr: histogram_quantile(0.95, product_search_query_duration_ms) > 200
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Product search queries are slow"
          description: "p95 query duration is {{ $value }}ms (threshold: 200ms)"

      - alert: ProductSearchMVRefreshFailed
        expr: increase(product_search_query_errors_total{error_type="refresh_failed"}[10m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Materialized view refresh failed"
          description: "MV refresh has failed in the last 10 minutes"

      - alert: ProductSearchMVStale
        expr: product_search_mv_staleness_seconds > 900
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Materialized view is stale"
          description: "MV has not been refreshed in {{ $value }} seconds (threshold: 15 min)"
```

---

## Phase 3: Production Deployment (Days 11-15)

### Day 11: Production Deployment (Staging Final Check)

**Pre-Deployment Checklist**:
- [ ] All staging tests pass
- [ ] MV refresh working reliably (10+ successful refreshes)
- [ ] Load tests show acceptable performance
- [ ] Monitoring dashboards configured
- [ ] Alerts tested and working
- [ ] Rollback procedure documented and tested

**Deployment Steps**:

1. **Backup Production Database**:
```bash
# SSH to database server
ssh o4o-api

# Create backup
pg_dump -h localhost -U o4o_user -d o4o_platform \
  -F c -b -v -f /backup/o4o_platform_pre_mv_$(date +%Y%m%d).dump

# Verify backup
ls -lh /backup/
```

2. **Deploy MV Creation Script** (Off-Peak Hours):
```bash
# On production database
PGPASSWORD=xxx psql -h localhost -U o4o_user -d o4o_platform \
  -f /path/to/04-create-materialized-views.sql
```

3. **Verify MV Created**:
```sql
SELECT COUNT(*) FROM mv_product_search;
SELECT pg_size_pretty(pg_total_relation_size('mv_product_search'));
```

4. **Setup Refresh Job**:
```sql
SELECT cron.schedule(
    'refresh-product-search',
    '*/10 * * * *',
    'SELECT refresh_product_search_with_logging();'
);
```

**Validation**:
- [ ] MV created with correct row count
- [ ] Initial refresh completes < 30 seconds
- [ ] Refresh job scheduled and running

### Day 12-13: API Deployment with Feature Flag

**Feature Flag Configuration**:

```typescript
// apps/api-server/src/config/feature-flags.ts
export const featureFlags = {
  USE_MATERIALIZED_VIEW_FOR_PRODUCT_SEARCH: {
    enabled: process.env.FEATURE_MV_PRODUCT_SEARCH === 'true',
    rolloutPercentage: parseInt(process.env.FEATURE_MV_ROLLOUT_PERCENT || '0')
  }
};

// In ProductSearchRepository
async searchProducts(filters, options) {
  const useMV = featureFlags.USE_MATERIALIZED_VIEW_FOR_PRODUCT_SEARCH.enabled &&
    Math.random() * 100 < featureFlags.USE_MATERIALIZED_VIEW_FOR_PRODUCT_SEARCH.rolloutPercentage;

  if (useMV) {
    return await this.searchFromMV(filters, options);
  } else {
    return await this.searchFromCustomPosts(filters, options);
  }
}
```

**Gradual Rollout**:

Day 12:
```bash
# 10% traffic to MV
export FEATURE_MV_PRODUCT_SEARCH=true
export FEATURE_MV_ROLLOUT_PERCENT=10

# Deploy API
pm2 restart o4o-api-server
```

Day 13 (if metrics look good):
```bash
# 50% traffic to MV
export FEATURE_MV_ROLLOUT_PERCENT=50
pm2 restart o4o-api-server
```

### Day 14: Full Rollout

```bash
# 100% traffic to MV
export FEATURE_MV_ROLLOUT_PERCENT=100
pm2 restart o4o-api-server
```

**Validation**:
- [ ] Monitor error rates (should be < 0.1%)
- [ ] Monitor p95 latency (should be < 200ms)
- [ ] Monitor MV staleness (should be < 10 min)
- [ ] Check user-facing metrics (page load times, bounce rates)

### Day 15: Cleanup and Documentation

**Tasks**:
- [ ] Remove feature flag code (if rollout successful)
- [ ] Update API documentation
- [ ] Create runbook for MV refresh failures
- [ ] Archive old code (fallback to custom_posts can remain)

---

## Phase 4: Optimization and Tuning (Days 16-21)

### Week 3: Performance Tuning

**Tune Refresh Frequency**:

Based on write patterns, adjust refresh interval:
- High write load: 5 minutes
- Normal load: 10 minutes (current)
- Low write load: 15-30 minutes

**Add Partial Indexes** (if needed):

```sql
-- If certain queries are still slow, add specific indexes
CREATE INDEX CONCURRENTLY idx_mv_product_low_stock
ON mv_product_search (inventory, recommended_price)
WHERE inventory < 20 AND inventory > 0;
```

**Optimize Refresh Query**:

```sql
-- If refresh is slow, investigate with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM custom_posts
WHERE "postTypeId" IN (SELECT id FROM custom_post_types WHERE slug = 'benchmark-product');

-- Add indexes to custom_posts if missing
```

**Cache Warming**:

```typescript
// Warm cache after MV refresh
async function warmCacheAfterRefresh() {
  await redisClient.del('product:list:*'); // Clear old cache

  // Pre-fetch popular queries
  await productSearchRepo.searchProducts({ status: 'publish' }, { limit: 20 }); // Homepage
  await productSearchRepo.searchProducts({ inStock: true }, { limit: 50 }); // Available products

  // Pre-fetch popular categories
  const popularCategories = await getPopularCategoryIds();
  for (const catId of popularCategories) {
    await productSearchRepo.searchProducts({ categoryId: catId }, { limit: 20 });
  }
}
```

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

**If API is serving errors**:

1. Disable feature flag:
```bash
export FEATURE_MV_PRODUCT_SEARCH=false
pm2 restart o4o-api-server
```

2. Verify fallback to custom_posts is working:
```bash
curl https://api.neture.co.kr/api/products | jq
```

### Database Rollback (< 30 minutes)

**If MV is corrupted or causing database issues**:

1. Stop refresh job:
```sql
SELECT cron.unschedule('refresh-product-search');
```

2. Drop MV:
```sql
DROP MATERIALIZED VIEW IF EXISTS mv_product_search CASCADE;
```

3. Restore from backup (if needed):
```bash
pg_restore -h localhost -U o4o_user -d o4o_platform \
  -c /backup/o4o_platform_pre_mv_20251021.dump
```

### Full Rollback to Custom Posts (< 1 day)

If MV approach is not working:

1. Remove all MV-related code from API
2. Revert to custom_posts queries only
3. Add aggressive Redis caching:
```typescript
// 5-minute cache for product listings
await redis.setex(`product:list:${cacheKey}`, 300, JSON.stringify(products));
```

---

## Success Criteria

### Performance Targets
- [ ] p50 query latency < 50ms
- [ ] p95 query latency < 200ms
- [ ] p99 query latency < 500ms
- [ ] MV refresh time < 30 seconds

### Reliability Targets
- [ ] MV refresh success rate > 99.9%
- [ ] API error rate < 0.1%
- [ ] Zero downtime during deployment
- [ ] Fallback mechanism tested and working

### Operational Targets
- [ ] Monitoring dashboards live
- [ ] Alerts configured and tested
- [ ] Runbooks documented
- [ ] Team trained on MV management

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MV refresh fails | Medium | High | Automated alerts + fallback to custom_posts |
| MV refresh too slow | Low | Medium | Tune refresh query + add indexes |
| Query planner chooses wrong index | Low | Medium | Use index hints or rewrite query |
| Disk space exhaustion | Low | High | Monitor disk usage + set up alerts |
| Production deployment errors | Medium | High | Blue-green deployment + rollback plan |
| User-visible staleness | Medium | Low | Acceptable for e-commerce (10 min) |

---

## Appendix: Runbooks

### Runbook: MV Refresh Failure

**Symptoms**:
- Alert: "ProductSearchMVRefreshFailed"
- Logs show refresh errors
- MV staleness > 15 minutes

**Investigation**:
1. Check refresh logs:
```sql
SELECT * FROM mv_refresh_log ORDER BY last_refresh_at DESC LIMIT 10;
```

2. Check database locks:
```sql
SELECT * FROM pg_stat_activity WHERE state != 'idle';
```

3. Check disk space:
```bash
df -h
```

**Resolution**:
1. If lock contention: Kill blocking queries
2. If disk space: Expand disk or cleanup old data
3. If query timeout: Increase statement_timeout
4. Manual refresh:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_search;
```

### Runbook: Slow Query Performance

**Symptoms**:
- Alert: "ProductSearchSlowQueries"
- p95 latency > 200ms

**Investigation**:
1. Check slow query log:
```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%mv_product_search%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

2. Run EXPLAIN ANALYZE on slow query
3. Check index usage:
```sql
SELECT * FROM pg_stat_user_indexes WHERE relname = 'mv_product_search';
```

**Resolution**:
1. Add missing indexes
2. Tune query (avoid OR, use UNION instead)
3. Increase cache (work_mem, effective_cache_size)
4. Consider query rewrite

---

## Conclusion

This migration plan provides a structured, low-risk approach to implementing the Materialized View solution. Key features:

- **Gradual rollout** with feature flags
- **Fallback mechanism** to custom_posts
- **Comprehensive monitoring** and alerting
- **Clear rollback procedures**
- **Realistic timeline** (2-3 weeks)

**Estimated Effort**:
- Development: 5-7 days
- Testing: 3-4 days
- Deployment: 2-3 days
- Tuning: 3-5 days
- **Total: 13-19 days**

**Next Steps**:
1. Get stakeholder approval
2. Schedule deployment window (off-peak hours)
3. Assign team members to tasks
4. Begin Phase 1 (Pre-Deployment Validation)
