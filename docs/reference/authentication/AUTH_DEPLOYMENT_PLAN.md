# Authorization System Deployment Plan
**Phase 9 - Seller Authorization System**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document outlines the deployment strategy for the Phase 9 seller authorization system, including staging validation, production rollout, rollback procedures, and success criteria.

---

## Deployment Timeline

**Total Estimated Time**: ~3 days

### Day 1: Implementation & Staging (8 hours)
- Implement database migration
- Implement API endpoints (7 endpoints)
- Implement authorization middleware
- Implement notification service
- Write unit tests (25 scenarios)
- Deploy to staging

### Day 2: Staging Validation (6 hours)
- Execute test matrix
- Validate UI flows
- Performance testing
- Security testing
- Fix any issues

### Day 3: Production Rollout (4 hours)
- Deploy to production (feature flag OFF)
- Run migration
- Enable feature flag (0% → 10% → 100%)
- Monitor metrics continuously

### Day 4+: Post-Deployment Monitoring (48 hours)
- Monitor authorization metrics
- Monitor notifications
- Address any issues
- Gather feedback

---

## Prerequisites

### Code Readiness
- [ ] All API endpoints implemented
- [ ] Authorization middleware implemented
- [ ] Notification service implemented
- [ ] UI components implemented (seller & supplier)
- [ ] Unit tests pass (25/25)
- [ ] Integration tests pass
- [ ] Code review approved
- [ ] TypeScript compilation successful
- [ ] No console.log or debug code

### Database Readiness
- [ ] Migration script tested locally
- [ ] Migration script tested on staging
- [ ] Migration is reversible (down script)
- [ ] Backup strategy confirmed
- [ ] Indexes created correctly
- [ ] Foreign keys configured correctly

### Infrastructure Readiness
- [ ] Feature flag configured (`.env` files)
- [ ] Email service configured
- [ ] In-app notification service configured
- [ ] Prometheus metrics endpoint exposed
- [ ] Log aggregation configured
- [ ] Rate limiting configured

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

# Checkout feature branch (or merge to main)
git fetch origin
git checkout feat/phase9-seller-authorization

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

# Verify table created
psql -h localhost -U postgres -d o4o_staging -c "\d seller_authorizations"

# Check indexes
psql -h localhost -U postgres -d o4o_staging -c "\di seller_authorizations*"
```

---

### Step 2: Configure Environment Variables (Staging)

**File**: `/home/ubuntu/o4o-platform/.env`

**Add**:
```bash
# Phase 9 Feature Flags
ENABLE_SELLER_AUTHORIZATION=true      # Enabled on staging
SELLER_AUTHORIZATION_LIMIT=10         # Max sellers per product
SELLER_REAPPLY_COOLOFF_DAYS=30       # Days before reapplying

# Notifications
EMAIL_SERVICE_ENABLED=true
NOTIFICATION_SERVICE_ENABLED=true

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

**Execute Test Matrix** (from AUTH_TEST_MATRIX.md):

#### Test 1: Submit Authorization Request
```bash
curl -X POST https://staging-api.neture.co.kr/api/v1/ds/products/prod_test_available/authorization-request \
  -H "Authorization: Bearer $STAGING_SELLER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Interested in selling this product"
  }'
```

**Expected**: 201 Created with authorization ID

#### Test 2: Approve Request
```bash
curl -X POST https://staging-api.neture.co.kr/api/supplier/authorization-requests/auth_req_abc123/approve \
  -H "Authorization: Bearer $STAGING_SUPPLIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "welcomeMessage": "Welcome!"
  }'
```

**Expected**: 200 OK, status = APPROVED

#### Test 3: Seller Limit Enforcement
```bash
# Submit 11th request when product has 10 sellers
curl -X POST https://staging-api.neture.co.kr/api/v1/ds/products/prod_test_full/authorization-request \
  -H "Authorization: Bearer $STAGING_SELLER_TOKEN"
```

**Expected**: 403 Forbidden, SELLER_LIMIT_REACHED

#### Test 4: Cooling-Off Period
```bash
# Reapply within 30 days of rejection
curl -X POST https://staging-api.neture.co.kr/api/v1/ds/products/prod_test_available/authorization-request \
  -H "Authorization: Bearer $STAGING_REJECTED_SELLER_TOKEN"
```

**Expected**: 400 Bad Request, COOLING_OFF_PERIOD

---

### Step 4: UI Validation (Staging)

**Seller UI**:
1. Navigate to https://staging-seller.neture.co.kr/products
2. Find locked product (authorization required)
3. Click "Request Access"
4. Submit request with message
5. Verify confirmation modal
6. Navigate to "My Requests"
7. Verify request shows as PENDING

**Supplier UI**:
1. Navigate to https://staging-supplier.neture.co.kr/authorizations
2. Verify pending request shown
3. Review seller stats
4. Approve request
5. Verify confirmation
6. Check "Authorized Sellers" tab
7. Verify seller appears in list

---

### Step 5: Performance Testing (Staging)

**Authorization Check Latency**:
```bash
# Generate 1000 concurrent authorization checks
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  https://staging-api.neture.co.kr/api/v1/ds/products/prod_test_available
```

**Target**: P95 < 5ms

**Request List Query**:
```bash
# Query pending requests with pagination
ab -n 100 -c 5 \
  -H "Authorization: Bearer $SUPPLIER_TOKEN" \
  https://staging-api.neture.co.kr/api/supplier/authorization-requests?status=PENDING&page=1&limit=20
```

**Target**: P95 < 20ms

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Staging validation complete
- [ ] All tests pass (25/25)
- [ ] Performance targets met
- [ ] Security tests pass
- [ ] UI flows validated
- [ ] Database backup created
- [ ] Rollback plan ready
- [ ] Team notified
- [ ] Support team briefed

---

### Step 1: Create Production Backup

```bash
# SSH to database server
ssh o4o-api

# Backup database
pg_dump -h localhost -U postgres -d o4o_production > /tmp/o4o_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh /tmp/o4o_backup_*.sql
```

---

### Step 2: Deploy Code to Production

**Merge to Main**:
```bash
# Local machine
git checkout main
git pull origin main
git merge feat/phase9-seller-authorization
git push origin main
```

**GitHub Actions** will trigger deployment automatically.

**Manual Verification**:
```bash
# SSH to API server
ssh o4o-api
cd /home/ubuntu/o4o-platform

# Verify code updated
git log --oneline -3

# Verify build
ls -la apps/api-server/dist/
```

---

### Step 3: Run Production Migration

**Commands**:
```bash
ssh o4o-api
cd /home/ubuntu/o4o-platform

# Run migration
NODE_ENV=production pnpm run migration:run

# Verify migration
NODE_ENV=production pnpm run migration:show
```

**Verification**:
```sql
-- Check table created
SELECT COUNT(*) FROM seller_authorizations;

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename = 'seller_authorizations';

-- Check foreign keys
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'seller_authorizations' AND constraint_type = 'FOREIGN KEY';
```

**Expected**:
- Table created with 0 rows
- 5 indexes created
- 3 foreign keys created

---

### Step 4: Deploy with Feature Flag OFF

**Initial State**: Feature disabled (safe default)

**File**: `/home/ubuntu/o4o-platform/.env`

**Configuration**:
```bash
# Phase 9 Feature Flags
ENABLE_SELLER_AUTHORIZATION=false     # DISABLED initially
SELLER_AUTHORIZATION_LIMIT=10
SELLER_REAPPLY_COOLOFF_DAYS=30

# Notifications
EMAIL_SERVICE_ENABLED=true
NOTIFICATION_SERVICE_ENABLED=true

# Logging
LOG_LEVEL=info                        # Standard logging
```

**Restart API**:
```bash
pm2 restart o4o-api-server
pm2 logs o4o-api-server --lines 50
```

**Verification**:
- API starts successfully
- No errors in logs
- Health check passes: `curl https://api.neture.co.kr/health`
- Existing functionality unaffected

---

### Step 5: Gradual Rollout

#### Phase A: 0% Rollout (Feature OFF) - Duration: 30 minutes

**Configuration**: `ENABLE_SELLER_AUTHORIZATION=false`

**Monitoring**:
- Baseline metrics
- No authorization checks performed
- Existing flows work normally

**Validation**:
- [ ] API healthy
- [ ] No errors
- [ ] Existing orders work

---

#### Phase B: 10% Rollout (Pilot Suppliers) - Duration: 4 hours

**Configuration**: `ENABLE_SELLER_AUTHORIZATION=true`

**But**: Only 2-3 pilot suppliers use authorization

**Create Pilot Authorization**:
```sql
-- Enable for pilot supplier
UPDATE suppliers
SET authorizationEnabled = true
WHERE code IN ('SUP-PILOT-001', 'SUP-PILOT-002');
```

**Monitoring**:
- Watch Prometheus metrics:
  - `o4o_authorization_requests_total`
  - `o4o_authorization_approvals_total`
  - `o4o_authorization_review_duration_seconds`
- Watch logs for authorization events
- Monitor notification delivery

**Success Criteria**:
- No errors
- Authorization flow works correctly
- Notifications delivered
- Performance targets met (P95 < 5ms)

---

#### Phase C: 50% Rollout - Duration: 8 hours

**Enable for 50% of Suppliers**:
```sql
-- Enable authorization for 50% of suppliers
UPDATE suppliers
SET authorizationEnabled = true
WHERE id IN (
  SELECT id FROM suppliers
  ORDER BY RANDOM()
  LIMIT (SELECT COUNT(*) / 2 FROM suppliers)
);
```

**Monitoring**:
- Increased traffic on authorization endpoints
- Monitor approval/rejection rates
- Monitor seller limit enforcement
- Check notification delivery rate

**Success Criteria**:
- No increase in errors
- P95 latency < 5ms
- Approval rate > 80%
- Notifications delivered (> 95%)

---

#### Phase D: 100% Rollout - Duration: Permanent

**Enable for All Suppliers**:
```sql
-- Enable authorization for all suppliers
UPDATE suppliers
SET authorizationEnabled = true
WHERE authorizationEnabled = false;
```

**Monitoring**:
- Full production traffic
- Watch for any anomalies
- Monitor seller feedback
- Track approval patterns

**Success Criteria**:
- No errors
- P95 latency < 5ms
- All flows working correctly
- No rollback needed

---

### Step 6: Post-Deployment Monitoring (48 hours)

**Metrics to Watch**:

**1. Authorization Request Volume**:
```promql
sum(rate(o4o_authorization_requests_total[5m])) by (status)
```
**Target**: Steady growth

**2. Approval Rate**:
```promql
sum(rate(o4o_authorization_approvals_total[5m]))
/ sum(rate(o4o_authorization_requests_total[5m]))
* 100
```
**Target**: > 80%

**3. Review Duration**:
```promql
histogram_quantile(0.95, sum by (le) (
  rate(o4o_authorization_review_duration_seconds_bucket[5m])
))
```
**Target**: < 24 hours

**4. Seller Limit Utilization**:
```promql
avg(o4o_product_seller_count / 10) * 100
```
**Target**: < 80% (not hitting limits often)

**5. Notification Delivery Rate**:
```promql
sum(rate(o4o_notification_sent_total{type="authorization"}[5m]))
/ sum(rate(o4o_authorization_events_total[5m]))
* 100
```
**Target**: > 95%

---

## Rollback Procedures

### Rollback Level 1: Feature Flag (Instant)

**When**: Minor issues, performance degradation

**Action**: Disable feature flag

**Steps**:
```bash
ssh o4o-api
nano /home/ubuntu/o4o-platform/.env

# Change flag
ENABLE_SELLER_AUTHORIZATION=false

pm2 restart o4o-api-server
```

**Effect**:
- Authorization checks disabled
- All sellers can access all products (legacy behavior)
- No code changes needed
- Reversible instantly
- Data preserved

---

### Rollback Level 2: Code Rollback (Moderate)

**When**: Critical bugs, data corruption

**Action**: Revert code

**Steps**:
```bash
# Local machine
git revert <commit_hash>
git push origin main

# Or restore from tag
git checkout production-pre-phase9
git push origin HEAD:main --force

# GitHub Actions auto-deploys
```

**Effect**:
- Code reverted to pre-Phase 9
- Authorization system removed
- May require migration rollback

---

### Rollback Level 3: Database Rollback (Critical)

**When**: Database corruption, migration failure

**Action**: Rollback migration

**Steps**:
```bash
ssh o4o-api
cd /home/ubuntu/o4o-platform

# Rollback migration
NODE_ENV=production pnpm run migration:revert

# Verify
NODE_ENV=production pnpm run migration:show

# If data corrupted, restore backup
psql -h localhost -U postgres -d o4o_production < /tmp/o4o_backup_YYYYMMDD_HHMMSS.sql
```

**Effect**:
- Table dropped
- Indexes removed
- Authorization data lost (if table dropped)

**Alternative (Soft Rollback)**:
- Keep table
- Disable feature flag
- Data preserved

---

## Success Criteria

### Deployment Success
- [ ] Code deployed successfully
- [ ] Migration completed
- [ ] API restarted without errors
- [ ] Health check passes
- [ ] Feature flag enabled

### Functional Success
- [ ] Sellers can submit requests
- [ ] Suppliers can approve/reject
- [ ] Seller limit enforced (10)
- [ ] Cooling-off period works (30 days)
- [ ] Revocation works correctly
- [ ] Notifications delivered

### Performance Success
- [ ] Authorization check P95 < 5ms
- [ ] Request list query P95 < 20ms
- [ ] No timeouts
- [ ] No rate limit errors

### Operational Success
- [ ] Metrics collecting correctly
- [ ] Logs structured correctly
- [ ] Notifications delivered (> 95%)
- [ ] No critical alerts
- [ ] Zero downtime

---

## Post-Deployment Tasks

### Immediate (Within 24 hours)
- [ ] Monitor metrics continuously
- [ ] Review logs for errors
- [ ] Validate authorization flows
- [ ] Check notification delivery
- [ ] Respond to user feedback

### Short-Term (Within 1 week)
- [ ] Analyze approval patterns
- [ ] Optimize slow queries (if any)
- [ ] Fine-tune alert thresholds
- [ ] Update documentation
- [ ] Train supplier users on UI

### Long-Term (Within 1 month)
- [ ] Implement auto-approval feature
- [ ] Add batch approval APIs
- [ ] Add analytics dashboard
- [ ] Implement tier-based limits (Bronze: 5, Gold: 20)
- [ ] Document lessons learned

---

## Communication Plan

### Internal Notifications

**Engineering Team**:
- Deploy start: Slack notification
- Deploy complete: Slack notification
- Issues: Immediate Slack alert

**Product Team**:
- Deploy schedule shared 24 hours before
- Rollout progress updates every 4 hours
- Post-deployment report within 48 hours

### External Notifications

**Suppliers**:
- Email notification 48 hours before launch
- In-app announcement on launch day
- Help documentation available

**Sellers**:
- In-app announcement on launch day
- Help documentation available
- Support team briefed

---

## Emergency Contacts

**On-Call Engineer**: [Name/Phone]
**DevOps Team**: [Slack Channel]
**Database Admin**: [Name/Phone]
**Product Owner**: [Name/Email]
**Support Lead**: [Name/Email]

---

## Deployment Sign-Off

**Date**: ___________

**Signatures**:
- [ ] Engineering Lead: ___________
- [ ] Product Owner: ___________
- [ ] DevOps Lead: ___________
- [ ] QA Lead: ___________

---

## Version History

- **1.0** (2025-11-07): Initial deployment plan for Phase 9

---

*Generated with [Claude Code](https://claude.com/claude-code)*
