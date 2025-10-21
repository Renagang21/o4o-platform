# CPT vs Product Scalability Investigation - Quick Reference

**Investigation Date**: 2025-10-21
**Status**: ✅ Complete
**Recommendation**: Hybrid Approach (CustomPost + Materialized View)

---

## Executive Summary

This investigation evaluated three product storage approaches for scaling the O4O Platform to 100K-1M products:

| Option | Description | Performance @ 10K | Projected @ 1M | Recommendation |
|--------|-------------|-------------------|----------------|----------------|
| **A** | Dedicated Product Table | 0.216ms avg | 50-100ms | ✅ Viable |
| **B** | CustomPost JSONB (alone) | 1.013ms avg | 500-1000ms | ❌ Not viable |
| **C** | **CustomPost + Materialized View** | **0.141ms avg** | **20-50ms** | ✅ **RECOMMENDED** |

**Key Finding**: JSONB performs well for simple queries but struggles with complex multi-filters (6.7x slower). Materialized View solves this while maintaining WordPress-like flexibility.

---

## Files in This Report

```
reports/cpt-vs-product-scalability/
├── README.md                              # This file (quick reference)
├── MIGRATION_PLAN.md                      # Detailed implementation plan
├── scripts/
│   ├── 01-setup-benchmark-tables.sql     # Create benchmark tables
│   ├── 02-generate-sample-data.sql       # Data generation functions
│   ├── 03-create-jsonb-indexes.sql       # JSONB index optimization
│   ├── 04-create-materialized-views.sql  # Materialized view creation
│   ├── 05-benchmark-queries.sql          # Full benchmark scenarios
│   ├── 06-quick-benchmark.sql            # Quick validation queries
│   └── run-benchmark.sh                  # Automated benchmark runner
└── results/
    └── quick-benchmark-10k.txt           # Benchmark results (10K products)

Main Report:
../cpt-vs-product-scalability-20251021.md # Comprehensive analysis report
```

---

## Quick Decision Matrix

### Choose Option A (Dedicated Table) if:
- Real-time consistency is critical (< 1 sec freshness)
- You need < 50ms p95 latency guaranteed
- Team is uncomfortable with Materialized View refresh management
- Long-term plan is to move away from WordPress paradigm

### Choose Option C (Hybrid) if:
- WordPress/CustomPost flexibility is valuable
- 10-minute staleness is acceptable (typical for e-commerce)
- You want best read performance (0.141ms avg vs 0.216ms)
- Team can manage automated refresh jobs

### Avoid Option B (JSONB alone) if:
- You expect > 50K products
- Complex filters are common (price + category + brand + stock)
- Sub-200ms p95 latency is required

---

## Performance Summary (10K Products)

### Scenario 1: SKU Lookup
```
Option A: 0.067 ms
Option B: 0.077 ms
Option C: 0.036 ms ✅ WINNER
```

### Scenario 2: Price Range + In-Stock
```
Option A: 0.436 ms
Option B: 2.900 ms ⚠️ 6.7x SLOWER
Option C: 0.294 ms ✅ WINNER
```

### Scenario 3: Category Pagination
```
Option A: 0.145 ms
Option B: 0.062 ms ✅ WINNER
Option C: 0.093 ms
```

### Storage (10K Products)
```
Option A: 23 MB total (15 MB table + 7.5 MB indexes)
Option B: 26 MB total (10 MB table + 16 MB indexes)
Option C: 16 MB total (12 MB table + 4.7 MB indexes) ✅ MOST EFFICIENT
```

---

## Recommended Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: Pre-Deploy** | 3 days | Setup staging, test MV, configure refresh |
| **Phase 2: API Migration** | 7 days | Create repo layer, migrate endpoints, test |
| **Phase 3: Production** | 5 days | Deploy with feature flag, gradual rollout |
| **Phase 4: Tuning** | 6 days | Optimize refresh, tune queries |
| **TOTAL** | **21 days** | |

---

## Critical Implementation Steps

### 1. Create JSONB Indexes (if not exists)
```bash
psql -h localhost -U o4o_user -d o4o_platform \
  -f scripts/03-create-jsonb-indexes.sql
```

### 2. Create Materialized View
```bash
psql -h localhost -U o4o_user -d o4o_platform \
  -f scripts/04-create-materialized-views.sql
```

### 3. Setup Automated Refresh
```sql
-- Using pg_cron
SELECT cron.schedule(
    'refresh-product-search',
    '*/10 * * * *',
    'SELECT refresh_product_search_with_logging();'
);
```

### 4. Monitor Refresh Health
```sql
-- Check last refresh time and duration
SELECT * FROM mv_refresh_log;

-- Check MV staleness
SELECT
    'mv_product_search' AS view_name,
    (EXTRACT(EPOCH FROM (NOW() - last_refresh_at)) / 60)::INT AS staleness_minutes
FROM mv_refresh_log
WHERE view_name = 'mv_product_search';
```

---

## Monitoring Checklist

**Query Performance**:
- [ ] p50 latency < 50ms
- [ ] p95 latency < 200ms
- [ ] p99 latency < 500ms

**MV Health**:
- [ ] Refresh time < 30 seconds
- [ ] Refresh success rate > 99.9%
- [ ] Staleness < 15 minutes

**Database**:
- [ ] Index hit ratio > 95%
- [ ] Disk usage < 80%
- [ ] No long-running queries (> 1 min)

---

## Rollback Procedures

### Quick Rollback (5 min)
```typescript
// Disable MV usage via feature flag
process.env.FEATURE_MV_PRODUCT_SEARCH = 'false';
pm2 restart o4o-api-server
```

### Full Rollback (30 min)
```sql
-- Stop refresh job
SELECT cron.unschedule('refresh-product-search');

-- Drop MV
DROP MATERIALIZED VIEW IF EXISTS mv_product_search CASCADE;
```

---

## Key Metrics to Track

**Before Deployment (Baseline)**:
```
Product listing p95: ___ ms
Search p95: ___ ms
Category page p95: ___ ms
Database CPU: ___% avg
```

**After Deployment (Target)**:
```
Product listing p95: < 200 ms
Search p95: < 200 ms
Category page p95: < 100 ms
Database CPU: < 70% avg
MV refresh duration: < 30 sec
```

---

## Common Issues and Solutions

### Issue 1: MV Refresh Fails
**Symptoms**: Alert fired, staleness > 15 min
**Solution**:
1. Check logs: `SELECT * FROM mv_refresh_log`
2. Manual refresh: `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_product_search`
3. Check locks: `SELECT * FROM pg_stat_activity`

### Issue 2: Slow Queries After Deployment
**Symptoms**: p95 > 200ms
**Solution**:
1. Run `ANALYZE mv_product_search`
2. Check index usage: `SELECT * FROM pg_stat_user_indexes WHERE relname = 'mv_product_search'`
3. Add missing indexes if needed

### Issue 3: MV Too Stale
**Symptoms**: Users report outdated product data
**Solution**:
1. Reduce refresh interval to 5 minutes:
   ```sql
   SELECT cron.schedule('refresh-product-search', '*/5 * * * *', 'SELECT refresh_product_search_with_logging()');
   ```
2. Add application-layer cache invalidation
3. Show "last updated" timestamp to users

---

## Scalability Projections

### 100K Products (1 year from now)
```
Expected Performance:
- SKU lookup: < 1 ms
- Filtered search: 5-20 ms ✅
- MV refresh: 3-10 seconds
- Storage: ~160 MB total

Recommendation: ✅ No action needed
```

### 1M Products (3 years from now)
```
Expected Performance:
- SKU lookup: < 2 ms
- Filtered search: 20-50 ms ✅
- MV refresh: 30-60 seconds ⚠️
- Storage: ~1.6 GB total

Recommendation: ⚠️ Consider partitioning or incremental refresh
```

### 10M Products (future)
```
Expected Performance:
- SKU lookup: < 5 ms
- Filtered search: 100-500 ms ⚠️
- MV refresh: 5-15 minutes ❌
- Storage: ~16 GB total

Recommendation: ❌ Migrate to dedicated table OR implement partitioning + sharding
```

---

## Next Steps

### Immediate (This Week)
1. [ ] Review report with stakeholders
2. [ ] Get approval for recommended approach
3. [ ] Schedule deployment window

### Short-Term (Next 2-3 Weeks)
1. [ ] Execute migration plan (see MIGRATION_PLAN.md)
2. [ ] Deploy to staging
3. [ ] Production rollout with feature flag
4. [ ] Monitor and tune

### Long-Term (Next 6-12 Months)
1. [ ] Monitor scalability metrics
2. [ ] Plan for 100K-1M products
3. [ ] Consider partitioning strategy (if needed)

---

## References

- **Full Report**: `/home/dev/o4o-platform/reports/cpt-vs-product-scalability-20251021.md`
- **Migration Plan**: `/home/dev/o4o-platform/reports/cpt-vs-product-scalability/MIGRATION_PLAN.md`
- **Benchmark Scripts**: `/home/dev/o4o-platform/reports/cpt-vs-product-scalability/scripts/`

---

## Contact

For questions about this investigation:
- Technical: Review main report for detailed analysis
- Implementation: Follow migration plan step-by-step
- Issues: Check common issues section above

**Report Status**: ✅ Ready for decision-making
**Last Updated**: 2025-10-21
