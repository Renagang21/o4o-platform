# Deployment Plan for Phase 8
**Phase 8 - Supplier Policy Integration**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document outlines the complete deployment strategy for the Phase 8 supplier policy resolution system, including staging validation, production rollout, rollback procedures, and success criteria.

---

## Deployment Timeline

**Total Estimated Time**: ~2.5 days (per original specification)

### Phase 1: Implementation & Local Testing (Day 1)
- **Duration**: 8 hours
- **Tasks**:
  - Implement database migration
  - Implement PolicyResolutionService
  - Integrate with SettlementService
  - Add feature flags and environment variables
  - Add structured logging and metrics
  - Write unit tests (6 core scenarios)
  - Write integration tests
- **Deliverable**: Code ready for review

### Phase 2: Code Review & Staging Deployment (Day 1-2)
- **Duration**: 4 hours
- **Tasks**:
  - Code review
  - Address feedback
  - Deploy to staging environment
  - Run migration on staging database
- **Deliverable**: Staging environment ready for testing

### Phase 3: Staging Validation (Day 2)
- **Duration**: 6 hours
- **Tasks**:
  - Execute test matrix (6 scenarios + edge cases)
  - Validate API contracts
  - Monitor metrics and logs
  - Performance testing
- **Deliverable**: Staging validation report

### Phase 4: Production Rollout (Day 2-3)
- **Duration**: 4 hours (gradual rollout)
- **Tasks**:
  - Deploy to production (feature flag OFF)
  - Run migration on production database
  - Enable feature flag for 0% → 10% → 100%
  - Monitor metrics continuously
- **Deliverable**: Production deployment complete

### Phase 5: Post-Deployment Monitoring (Day 3+)
- **Duration**: 48 hours
- **Tasks**:
  - Monitor policy resolution metrics
  - Monitor commission calculations
  - Address any issues immediately
- **Deliverable**: Stable production system

---

## Pre-Deployment Checklist

### Code Readiness
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Code review approved
- [ ] Documentation complete (7 docs)
- [ ] TypeScript compilation successful
- [ ] ESLint/Prettier checks pass
- [ ] No console.log or debug code

### Database Readiness
- [ ] Migration script tested locally
- [ ] Migration script tested on staging
- [ ] Migration is reversible (down script)
- [ ] Backup strategy confirmed
- [ ] No NOT NULL constraints (zero-data safe)

### Infrastructure Readiness
- [ ] Feature flags configured (`.env` files)
- [ ] Environment variables set (staging & production)
- [ ] Prometheus metrics endpoint exposed
- [ ] Grafana dashboards created
- [ ] Alertmanager rules configured
- [ ] Log aggregation configured

### Testing Readiness
- [ ] Test matrix documented (6 scenarios)
- [ ] Test data prepared (policies, suppliers, products)
- [ ] Edge cases identified
- [ ] Performance benchmarks defined (P95 < 10ms)

---

## Staging Deployment

### Step 1: Deploy Code to Staging

**Server**: `o4o-api` (43.202.242.215)

**Commands**:
```bash
# SSH to API server
ssh o4o-api

# Navigate to project
cd /home/ubuntu/o4o-platform

# Checkout feature branch
git fetch origin
git checkout feat/phase8-supplier-policy

# Install dependencies
pnpm install

# Build API
pnpm run build:api

# Run migration
NODE_ENV=staging pnpm run migration:run
```

**Verification**:
```bash
# Check migration status
NODE_ENV=staging pnpm run migration:show

# Verify build
ls -la apps/api-server/dist/

# Check feature flag
grep ENABLE_SUPPLIER_POLICY .env
```

---

### Step 2: Configure Environment Variables (Staging)

**File**: `/home/ubuntu/o4o-platform/.env`

**Add**:
```bash
# Phase 8 Feature Flags
ENABLE_SUPPLIER_POLICY=true           # Enabled on staging
ENABLE_TIER_POLICY=false              # Future feature
POLICY_RESOLUTION_TIMEOUT_MS=100      # 100ms timeout

# Logging
LOG_LEVEL=debug                       # Verbose logging on staging
```

**Restart API Server**:
```bash
pm2 restart o4o-api-server
pm2 logs o4o-api-server --lines 100
```

---

### Step 3: Staging Validation

**Execute Test Matrix** (from TEST_MATRIX.md):

#### Test 1: Product Policy Override
```bash
curl -X POST https://staging-api.neture.co.kr/api/v1/ds/settlements/calc \
  -H "Authorization: Bearer $STAGING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": "ptr_test",
    "startDate": "2025-11-01T00:00:00Z",
    "endDate": "2025-11-07T23:59:59Z",
    "includeDetails": true
  }'
```

**Expected**:
- Response includes `appliedPolicy` with `resolutionLevel: "product"`
- Commission calculated with product policy rate

#### Test 2: Supplier Policy
```bash
# (Same API call with different product/supplier)
```

**Expected**:
- Response includes `appliedPolicy` with `resolutionLevel: "supplier"`

#### Test 3: Default Policy Fallback
**Expected**:
- Response includes `appliedPolicy` with `resolutionLevel: "default"`

#### Test 4: Expired Policy Fallback
**Expected**:
- Response falls back to next valid policy

#### Test 5: Safe Mode
**Expected**:
- Response shows `appliedPolicy: null`, `resolutionLevel: "safe_mode"`, `commission: 0`

#### Test 6: Min/Max Caps
**Expected**:
- Commission capped at `maxCommission` or raised to `minCommission`

---

### Step 4: Monitor Staging Metrics

**Prometheus Queries**:
```promql
# Policy resolution success rate
(1 - (sum(rate(o4o_policy_resolution_failures_total[5m]))
/ sum(rate(o4o_policy_resolution_total[5m])))) * 100

# P95 resolution latency
histogram_quantile(0.95, sum by (le) (
  rate(o4o_policy_resolution_duration_ms_bucket[5m])
))

# Resolution distribution by level
sum by (resolution_level) (rate(o4o_policy_resolution_total[5m]))
```

**Target Metrics**:
- Success rate: > 99%
- P95 latency: < 10ms
- P99 latency: < 20ms
- No `safe_mode` triggers (if policies configured)

---

### Step 5: Staging Validation Report

**Document**:
- [ ] All 6 test scenarios pass
- [ ] All edge cases handled correctly
- [ ] API contracts validated
- [ ] Performance targets met
- [ ] Metrics collecting correctly
- [ ] Logs structured correctly
- [ ] No errors in logs
- [ ] No alerts triggered

**Sign-off**: Required before production deployment

---

## Production Deployment

### Pre-Deployment Steps

#### 1. Create Production Backup

**Database Backup**:
```bash
# SSH to database server (or API server if co-located)
ssh o4o-api

# Backup database
pg_dump -h localhost -U postgres -d o4o_production > /tmp/o4o_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh /tmp/o4o_backup_*.sql
```

**Code Backup**:
```bash
# Tag current production version
git tag production-pre-phase8 main
git push origin production-pre-phase8
```

---

#### 2. Merge to Main Branch

**Commands**:
```bash
# Checkout main
git checkout main
git pull origin main

# Merge feature branch
git merge feat/phase8-supplier-policy

# Push to main
git push origin main
```

**Automated Deployment**: GitHub Actions will trigger deployment to production

---

#### 3. Monitor GitHub Actions

**Workflow**: `.github/workflows/deploy-api.yml`

**Steps**:
1. Checkout code
2. Install dependencies
3. Build API
4. SSH to production server
5. Pull latest code
6. Run `pnpm install`
7. Run `pnpm run build:api`
8. Run migration (if configured)
9. Restart PM2

**Monitor**:
```bash
# Watch workflow
gh workflow view deploy-api --web

# Check run status
gh run list --workflow=deploy-api
```

---

#### 4. Manual Verification (if GitHub Actions fails)

**Fallback**: Manual deployment

```bash
# SSH to API server
ssh o4o-api

# Navigate to project
cd /home/ubuntu/o4o-platform

# Pull latest code
git fetch origin
git checkout main
git pull origin main

# Install dependencies
pnpm install

# Build API
pnpm run build:api

# Check build
ls -la apps/api-server/dist/

# Run migration
NODE_ENV=production pnpm run migration:run

# Restart API
pm2 restart o4o-api-server
```

---

### Step 1: Deploy with Feature Flag OFF

**Initial State**: Feature flag disabled (safe default)

**File**: `/home/ubuntu/o4o-platform/.env`

**Configuration**:
```bash
# Phase 8 Feature Flags
ENABLE_SUPPLIER_POLICY=false          # DISABLED initially
ENABLE_TIER_POLICY=false
POLICY_RESOLUTION_TIMEOUT_MS=100

# Logging
LOG_LEVEL=info                        # Standard logging
```

**Restart API**:
```bash
pm2 restart o4o-api-server
pm2 logs o4o-api-server --lines 50
```

**Verification**:
- API server restarts successfully
- No errors in logs
- Health check passes: `curl https://api.neture.co.kr/health`
- Existing orders continue to work (fallback to default policy)

---

### Step 2: Run Production Migration

**Commands**:
```bash
ssh o4o-api
cd /home/ubuntu/o4o-platform

# Run migration
NODE_ENV=production pnpm run migration:run

# Verify migration
NODE_ENV=production pnpm run migration:show
```

**Expected Output**:
```
AddSupplierProductPolicyLinks1699344000000 - completed
```

**Verification**:
```sql
-- Check columns added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('suppliers', 'products')
  AND column_name IN ('policyId', 'settlementCycleDays');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('suppliers', 'products')
  AND indexname LIKE '%policy%';
```

**Expected**:
- `suppliers.policyId` (UUID, nullable)
- `suppliers.settlementCycleDays` (integer, nullable)
- `products.policyId` (UUID, nullable)
- Indexes: `idx_suppliers_policy_id`, `idx_products_policy_id`

---

### Step 3: Enable Feature Flag (Gradual Rollout)

#### Phase 3A: 0% Rollout (Feature Flag OFF)

**Duration**: 30 minutes

**Configuration**:
```bash
ENABLE_SUPPLIER_POLICY=false
```

**Monitoring**:
- Baseline metrics
- Existing commission calculations work
- No policy resolution failures

---

#### Phase 3B: 10% Rollout (Canary)

**Duration**: 2 hours

**Configuration**:
```bash
ENABLE_SUPPLIER_POLICY=true
```

**But**: No policies linked yet (falls back to default)

**Create Test Policy**:
```sql
-- Create default policy (if not exists)
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status)
VALUES (gen_random_uuid(), 'DEFAULT-2025', 'DEFAULT', 'PERCENTAGE', 10.00, 'active')
ON CONFLICT (policyCode) DO NOTHING;

-- Create one supplier policy for testing
INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status, startDate, endDate)
VALUES (gen_random_uuid(), 'SUPPLIER-TEST-2025', 'SUPPLIER', 'PERCENTAGE', 15.00, 'active', '2025-01-01', '2025-12-31')
RETURNING id;

-- Link to ONE supplier (canary)
UPDATE suppliers
SET policyId = '<policy_id_from_above>'
WHERE code = 'SUP-CANARY-001'
LIMIT 1;
```

**Restart API**:
```bash
pm2 restart o4o-api-server
```

**Monitoring**:
- Watch Prometheus metrics:
  - `o4o_policy_resolution_total{resolution_level="supplier"}`
  - `o4o_policy_resolution_failures_total`
  - `o4o_policy_resolution_duration_ms`
- Watch logs for `policy_resolution` events
- Check for any errors or warnings

**Success Criteria**:
- No increase in errors
- P95 latency < 10ms
- Success rate > 99%
- Supplier policy applied correctly for canary supplier
- Other suppliers fall back to default

---

#### Phase 3C: 50% Rollout

**Duration**: 4 hours

**Link Policies to 50% of Suppliers**:
```sql
-- Link policies to top 50% of suppliers by order volume
UPDATE suppliers
SET policyId = (
  SELECT id FROM commission_policies
  WHERE policyType = 'SUPPLIER' AND status = 'active'
  LIMIT 1
)
WHERE id IN (
  SELECT s.id
  FROM suppliers s
  LEFT JOIN orders o ON o.supplierId = s.id
  GROUP BY s.id
  ORDER BY COUNT(o.id) DESC
  LIMIT (SELECT COUNT(*) / 2 FROM suppliers)
);
```

**Monitoring**:
- Watch for increased `supplier` resolution level
- Check commission calculations are correct
- Monitor for safe mode triggers
- Watch for performance degradation

**Success Criteria**:
- No increase in errors
- P95 latency still < 10ms
- Success rate > 99%
- 50% of orders use supplier policy

---

#### Phase 3D: 100% Rollout

**Duration**: Permanent

**Link Policies to All Suppliers** (via Admin UI or SQL):
```sql
-- Via Admin UI (preferred)
-- Admin creates supplier policies and links via UI

-- Or bulk SQL (if needed)
UPDATE suppliers
SET policyId = (
  SELECT id FROM commission_policies
  WHERE policyType = 'DEFAULT' AND status = 'active'
  LIMIT 1
)
WHERE policyId IS NULL;
```

**Monitoring**:
- Full production traffic using policy resolution
- Watch for any anomalies
- Monitor commission calculations
- Check for safe mode triggers

**Success Criteria**:
- Success rate > 99%
- P95 latency < 10ms
- No increase in safe mode triggers
- Commission calculations correct

---

### Step 4: Post-Deployment Monitoring (48 hours)

**Metrics to Watch**:

1. **Policy Resolution Success Rate**:
   ```promql
   (1 - (sum(rate(o4o_policy_resolution_failures_total[5m]))
   / sum(rate(o4o_policy_resolution_total[5m])))) * 100
   ```
   **Target**: > 99%

2. **Policy Resolution Latency**:
   ```promql
   histogram_quantile(0.95, sum by (le) (
     rate(o4o_policy_resolution_duration_ms_bucket[5m])
   ))
   ```
   **Target**: < 10ms

3. **Resolution Distribution**:
   ```promql
   sum by (resolution_level) (rate(o4o_policy_resolution_total[5m]))
   ```
   **Expected**: Majority `supplier`, some `product`, minimal `default`

4. **Safe Mode Triggers**:
   ```promql
   sum(rate(o4o_policy_resolution_failures_total{reason="no_policy_found"}[5m]))
   ```
   **Target**: 0 (all entities should have policies)

5. **Commission Calculation Time**:
   ```promql
   histogram_quantile(0.95, sum by (le) (
     rate(o4o_commission_calculation_duration_ms_bucket[5m])
   ))
   ```
   **Target**: < 50ms

---

### Step 5: Validate Production Data

**Sample Queries**:

```sql
-- Check policy resolution distribution
SELECT
  metadata->'policySnapshot'->>'resolutionLevel' AS level,
  COUNT(*) AS count,
  ROUND(AVG((metadata->'policySnapshot'->>'commissionRate')::numeric), 2) AS avg_rate
FROM commissions
WHERE createdAt > NOW() - INTERVAL '1 day'
  AND metadata->'policySnapshot' IS NOT NULL
GROUP BY level;
```

**Expected**:
```
level       | count | avg_rate
------------|-------|----------
product     |   150 | 22.50
supplier    |  1200 | 15.00
tier        |   300 | 12.00
default     |    50 | 10.00
```

---

```sql
-- Check for safe mode triggers
SELECT
  orderId,
  orderItemId,
  productId,
  supplierId,
  metadata
FROM commissions
WHERE createdAt > NOW() - INTERVAL '1 day'
  AND metadata->'policySnapshot' IS NULL
LIMIT 10;
```

**Expected**: 0 rows (no safe mode triggers)

---

```sql
-- Check commission snapshot integrity
SELECT
  COUNT(*) AS total_commissions,
  COUNT(metadata->'policySnapshot') AS with_snapshot,
  COUNT(metadata->'policySnapshot'->'policyId') AS with_policy_id
FROM commissions
WHERE createdAt > NOW() - INTERVAL '1 day';
```

**Expected**: `total_commissions = with_snapshot = with_policy_id`

---

## Rollback Procedures

### Rollback Level 1: Feature Flag (Instant)

**When**: Minor issues, high latency, elevated errors (not critical)

**Action**: Disable feature flag

**Steps**:
```bash
# SSH to API server
ssh o4o-api

# Edit .env
nano /home/ubuntu/o4o-platform/.env

# Change flag
ENABLE_SUPPLIER_POLICY=false

# Restart API
pm2 restart o4o-api-server

# Verify
pm2 logs o4o-api-server --lines 50
```

**Effect**:
- Policy resolution bypassed
- Falls back to default policy only
- No code changes needed
- Reversible instantly
- Existing policy links preserved (data not deleted)

**Monitoring**: Watch for return to baseline metrics

---

### Rollback Level 2: Code Rollback (Moderate)

**When**: Critical bugs, data corruption, feature flag rollback insufficient

**Action**: Revert code to previous version

**Steps**:
```bash
# Local machine
git revert <commit_hash>
git push origin main

# Or restore from tag
git checkout production-pre-phase8
git push origin HEAD:main --force  # CAREFUL!

# GitHub Actions will auto-deploy
# Or manual deployment:
ssh o4o-api
cd /home/ubuntu/o4o-platform
git fetch origin
git checkout main
git pull origin main
pnpm install
pnpm run build:api
pm2 restart o4o-api-server
```

**Effect**:
- Code reverted to pre-Phase 8 state
- Policy resolution removed
- Falls back to legacy commission calculation

**Warning**: May require database rollback if migration is incompatible

---

### Rollback Level 3: Database Rollback (Critical)

**When**: Database corruption, migration failure, data integrity issues

**Action**: Rollback migration and restore backup

**Steps**:
```bash
# SSH to API server
ssh o4o-api
cd /home/ubuntu/o4o-platform

# Rollback migration
NODE_ENV=production pnpm run migration:revert

# Verify rollback
NODE_ENV=production pnpm run migration:show

# If data corrupted, restore backup
psql -h localhost -U postgres -d o4o_production < /tmp/o4o_backup_YYYYMMDD_HHMMSS.sql
```

**Effect**:
- Columns removed: `suppliers.policyId`, `suppliers.settlementCycleDays`, `products.policyId`
- Indexes dropped
- Foreign keys removed
- **WARNING**: Policy linkages lost (if columns dropped)

**Alternative (Soft Rollback)**:
- Keep columns, just disable feature flag
- Data preserved for future retry

---

## Success Criteria

### Deployment Success

**Criteria**:
- [ ] Code deployed successfully to production
- [ ] Migration completed successfully
- [ ] API server restarted without errors
- [ ] Health check passes
- [ ] Feature flag enabled
- [ ] No rollback triggered

### Functional Success

**Criteria**:
- [ ] All 6 test scenarios pass in production
- [ ] Policy resolution works correctly
- [ ] Commission calculations accurate
- [ ] API contracts validated
- [ ] Snapshots saved correctly

### Performance Success

**Criteria**:
- [ ] Policy resolution P95 < 10ms
- [ ] Policy resolution P99 < 20ms
- [ ] Commission calculation P95 < 50ms
- [ ] Success rate > 99%
- [ ] No safe mode triggers (or < 0.1%)

### Operational Success

**Criteria**:
- [ ] Metrics collecting correctly
- [ ] Logs structured correctly
- [ ] Alerts configured and working
- [ ] Dashboards displaying data
- [ ] No critical alerts triggered
- [ ] Runbooks tested

---

## Post-Deployment Tasks

### Immediate (Within 24 hours)

- [ ] Monitor metrics continuously
- [ ] Review logs for errors/warnings
- [ ] Validate commission calculations
- [ ] Check for safe mode triggers
- [ ] Verify policy snapshots

### Short-Term (Within 1 week)

- [ ] Analyze policy resolution distribution
- [ ] Optimize slow queries (if needed)
- [ ] Fine-tune alert thresholds
- [ ] Update documentation based on learnings
- [ ] Train admin team on policy management UI

### Long-Term (Within 1 month)

- [ ] Implement Redis caching for policies (if needed)
- [ ] Implement tier policy support (Phase 8B)
- [ ] Add batch policy linkage APIs
- [ ] Add policy analytics dashboard
- [ ] Document lessons learned

---

## Emergency Contacts

**On-Call Engineer**: [Name/Phone]
**DevOps Team**: [Slack Channel]
**Database Admin**: [Name/Phone]
**Product Owner**: [Name/Email]

---

## Deployment Sign-Off

**Date**: ___________

**Signatures**:
- [ ] Engineering Lead: ___________
- [ ] Product Owner: ___________
- [ ] DevOps Lead: ___________

---

## Version History

- **1.0** (2025-11-07): Initial deployment plan for Phase 8

---

*Generated with [Claude Code](https://claude.com/claude-code)*
