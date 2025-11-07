# Phase 9: PR Review Checklist

**PR**: https://github.com/Renagang21/o4o-platform/compare/main...feat/phase9-seller-authorization

---

## ✅ Pre-Merge Validation

### 1. Database Migration Verification

#### Migration Files
- ✅ `apps/api-server/src/migrations/YYYYMMDDHHMMSS-CreateSellerAuthorizationTables.ts`
- ✅ Creates `seller_authorizations` table with proper indexes
- ✅ Creates `seller_authorization_audit_logs` table
- ✅ Rollback migration defined

#### Test Migration (Staging)
```bash
# Run migration
npm run migration:run

# Verify tables created
psql -h staging-db -U postgres -d o4o -c "\dt seller_*"
# Expected output:
#  seller_authorizations
#  seller_authorization_audit_logs

# Verify indexes
psql -h staging-db -U postgres -d o4o -c "\d seller_authorizations"
# Expected indexes:
#  - unique_seller_product (seller_id, product_id)
#  - idx_seller_status (seller_id, status)
#  - idx_product_status (product_id, status)
#  - idx_supplier_status (supplier_id, status)

# Test rollback
npm run migration:revert
# Verify tables dropped
```

**Migration Screenshot Required**:
- [ ] Screenshot 1: Migration success output
- [ ] Screenshot 2: Table structure (`\d seller_authorizations`)
- [ ] Screenshot 3: Rollback success output

---

### 2. Metrics Collection Validation

#### /metrics Endpoint
```bash
# Test metrics endpoint
curl -s http://api-staging.neture.co.kr/metrics | grep seller_auth

# Expected metrics (7 total):
# 1. seller_auth_requests_total
# 2. seller_auth_gate_duration_seconds
# 3. seller_auth_cache_hit_rate
# 4. seller_auth_limit_rejections_total
# 5. seller_auth_cooldown_blocks_total
# 6. seller_auth_gate_denies_total
# 7. seller_auth_inbox_size
```

**Metrics Screenshot Required**:
- [ ] Screenshot 4: `/metrics` output showing all 7 metrics
- [ ] Screenshot 5: Grafana dashboard panels (9 panels visible)
- [ ] Screenshot 6: Prometheus targets showing `o4o-api-server` UP

#### Test Metric Collection
```bash
# 1. Make test request (should return 501 when feature disabled)
curl -X POST http://api-staging.neture.co.kr/api/v1/ds/seller/products/test-123/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"test": true}}'

# Expected response:
# {
#   "success": false,
#   "errorCode": "FEATURE_NOT_ENABLED",
#   "message": "Seller Authorization feature is not enabled yet"
# }

# 2. Check metrics incremented
curl -s http://api-staging.neture.co.kr/metrics | grep 'seller_auth_requests_total{action="request",result="error"}'

# Expected: Counter incremented by 1
```

**P95 Latency & Cache Hit Rate**:
- [ ] P95 latency <15ms (initial, no cache warming)
- [ ] Cache hit rate = 0 (expected, feature disabled)
- [ ] No error logs in application logs

---

### 3. Integration Test Results (Scenario A & B)

#### Scenario A: Request → Approve → Gate OK
```bash
./scripts/phase9-integration-test.sh staging

# Expected output:
# Test A: Request → Approve → Gate OK
# ✓ Test A passed in XXXms
```

**Test Output Required**:
- [ ] JSON result file: `test-results/phase9/integration_test_*.json`
- [ ] Scenario A status: `PASS`
- [ ] Scenario B status: `PASS`
- [ ] All 6 scenarios: `PASS`

#### Example JSON Output
```json
{
  "environment": "staging",
  "timestamp": "2025-01-07T12:00:00Z",
  "tests": [
    {
      "test": "scenario_a_request_approve_gate",
      "status": "PASS",
      "message": "Authorization workflow completed successfully",
      "duration_ms": 487
    },
    {
      "test": "scenario_b_reject_cooldown",
      "status": "PASS",
      "message": "Cooldown enforcement working correctly",
      "duration_ms": 523
    }
  ],
  "summary": {
    "total": 6,
    "passed": 6,
    "failed": 0
  }
}
```

**Integration Test Screenshot Required**:
- [ ] Screenshot 7: Test execution output (all 6 scenarios)
- [ ] Screenshot 8: JSON result file content

---

### 4. Feature Flag Verification

#### Confirm Default: OFF
```bash
# Check environment variables on staging
ssh o4o-api
env | grep ENABLE_SELLER_AUTHORIZATION

# Expected output:
# ENABLE_SELLER_AUTHORIZATION=false
# (or no output, defaults to false)
```

**Test Behavior**:
```bash
# 1. Test with feature disabled (default)
curl http://api-staging.neture.co.kr/api/v1/ds/seller/authorizations \
  -H "Authorization: Bearer $TOKEN"

# Expected: 501 Not Implemented
# {
#   "success": false,
#   "errorCode": "FEATURE_NOT_ENABLED",
#   "message": "Seller Authorization feature is not enabled yet"
# }

# 2. Enable feature flag temporarily
export ENABLE_SELLER_AUTHORIZATION=true
pm2 restart o4o-api-server

# 3. Test with feature enabled
curl http://api-staging.neture.co.kr/api/v1/ds/seller/authorizations \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# {
#   "success": true,
#   "data": {
#     "authorizations": []
#   }
# }

# 4. Disable feature flag again
export ENABLE_SELLER_AUTHORIZATION=false
pm2 restart o4o-api-server
```

**Feature Flag Screenshot Required**:
- [ ] Screenshot 9: Feature disabled response (501)
- [ ] Screenshot 10: Feature enabled response (200)

---

### 5. Security & Safety Validation

#### Fail-Open Behavior
```typescript
// Verify AuthorizationGateService.isSellerApprovedForProduct()
// When feature disabled:
if (!this.isFeatureEnabled()) {
  return true; // Fail-open: All gates pass
}
```

**Test**:
```bash
# With feature disabled, all gate checks should pass
curl http://api-staging.neture.co.kr/api/v1/ds/seller/gate/any-product-id \
  -H "Authorization: Bearer $TOKEN"

# Expected:
# {
#   "success": true,
#   "data": {
#     "isAuthorized": true,  // <-- Fail-open
#     "status": "NONE",
#     "canRequest": true
#   }
# }
```

#### Error Handling (Fail-Closed)
```bash
# Simulate Redis failure
# Stop Redis temporarily
ssh o4o-api
systemctl stop redis

# Test gate check (should fail-closed)
curl http://api-staging.neture.co.kr/api/v1/ds/seller/gate/product-123 \
  -H "Authorization: Bearer $TOKEN"

# Expected:
# {
#   "success": true,
#   "data": {
#     "isAuthorized": false,  // <-- Fail-closed on error
#     "errorCode": "ERR_CACHE_UNAVAILABLE"
#   }
# }

# Restart Redis
systemctl start redis
```

---

## 📋 Review Checklist

### Backend Review
- [ ] Entity design review
  - [ ] Status lifecycle (REQUESTED → APPROVED/REJECTED/CANCELLED/REVOKED)
  - [ ] Cooldown logic (`cooldownUntil` calculation)
  - [ ] Audit trail completeness (all state changes logged)
- [ ] Service architecture review
  - [ ] Caching strategy (30s TTL, invalidation on state change)
  - [ ] Performance targets (P95 <5ms cache hit, <15ms cache miss)
  - [ ] Error handling (fail-open when disabled, fail-closed on errors)
- [ ] Business rules validation
  - [ ] 10-product limit enforced
  - [ ] 30-day cooldown enforced
  - [ ] Permanent revocation (no re-request)
  - [ ] Self-seller bypass working
- [ ] Database migration review
  - [ ] Indexes optimize common queries
  - [ ] Constraints prevent invalid states
  - [ ] Rollback migration defined
- [ ] API endpoint review
  - [ ] 12 endpoints properly documented
  - [ ] Error responses consistent (400/401/403/404/501)
  - [ ] Input validation (rejection reason length, etc.)

### Frontend Review
- [ ] UI/UX consistency
  - [ ] Status badges color-coded (APPROVED=green, REJECTED=red, etc.)
  - [ ] Error messages user-friendly
  - [ ] Loading states shown
- [ ] Authorization flow validation
  - [ ] Partner can request authorization
  - [ ] Supplier can approve/reject with reason
  - [ ] Admin can revoke with reason
  - [ ] Audit log displays complete history
- [ ] Error handling
  - [ ] 501 response shows appropriate message ("Feature not enabled yet")
  - [ ] Network errors handled gracefully
  - [ ] Form validation (rejection reason ≥10 chars)
- [ ] Filter and pagination
  - [ ] Status filter works (all/requested/approved/rejected)
  - [ ] Product filter works (supplier inbox)
  - [ ] Pagination (if needed for >50 items)

### Operations Review
- [ ] Monitoring dashboard review
  - [ ] 9 panels display correct data
  - [ ] Prometheus queries optimized
  - [ ] Time range selector works
- [ ] Alert rules validation
  - [ ] Critical alerts page on-call (high error rate, service down)
  - [ ] Warning alerts notify Slack (slow performance, low cache hit)
  - [ ] Thresholds appropriate (error rate >0.1%, P95 >15ms, etc.)
- [ ] Rollout strategy approval
  - [ ] Phase 0 (Shadow mode) 3-5 days
  - [ ] Phase 1 (10% rollout) 1-2 days
  - [ ] Phase 2 (50% rollout) 2-3 days
  - [ ] Phase 3 (100% rollout) 1-2 days
  - [ ] Gate criteria defined (cache hit rate >70%, P95 <15ms)
- [ ] Integration test script review
  - [ ] 6 scenarios cover all workflows
  - [ ] JSON output format correct
  - [ ] CI/CD integration ready
- [ ] Documentation completeness
  - [ ] README comprehensive (architecture, API, business rules)
  - [ ] Runbook covers common issues
  - [ ] FAQ answers key questions

### Security Review
- [ ] Authorization enforcement
  - [ ] Gates check at cart/order/settlement
  - [ ] Seller cannot bypass approval
  - [ ] Admin-only revocation endpoints protected
- [ ] Audit log completeness
  - [ ] All state changes logged (REQUEST, APPROVE, REJECT, REVOKE, CANCEL)
  - [ ] Actor ID and type recorded
  - [ ] Immutable (no updates/deletes)
- [ ] Input validation
  - [ ] Rejection reason ≥10 characters
  - [ ] Revocation reason ≥10 characters
  - [ ] Cooldown days: 1-365
- [ ] SQL injection prevention
  - [ ] All queries use parameterized statements
  - [ ] No string concatenation in WHERE clauses
- [ ] Rate limiting
  - [ ] Consider adding rate limit for request authorization endpoint
  - [ ] Consider adding rate limit for approve/reject endpoints

### Performance Review
- [ ] Cache strategy validation
  - [ ] 30s TTL appropriate for authorization data
  - [ ] Invalidation on state change working
  - [ ] Cache key format unique and deterministic
- [ ] Database query optimization
  - [ ] Indexes cover common queries (seller+product, seller+status, supplier+status)
  - [ ] EXPLAIN ANALYZE shows index usage
  - [ ] No full table scans
- [ ] P95 latency targets
  - [ ] Cache hit: <5ms ✅
  - [ ] Cache miss: <15ms ✅
  - [ ] Request authorization: <100ms ✅
  - [ ] Approve/reject: <100ms ✅
- [ ] Load testing plan
  - [ ] Define target: 1000 req/s for gate checks
  - [ ] Define target: 10 req/s for request authorization
  - [ ] Load test script (optional, can be done post-merge)

---

## 📊 Merge Readiness

### Pre-Merge Checklist
- [ ] All unit tests passing (32 tests)
- [ ] All integration tests passing (7 scenarios)
- [ ] Migration tested on staging (success + rollback)
- [ ] Metrics collection validated (7 metrics visible)
- [ ] Feature flag verified (default: OFF)
- [ ] 501 response verified (feature not enabled)
- [ ] Fail-open behavior confirmed (gates pass when disabled)
- [ ] Grafana dashboard working (9 panels)
- [ ] Prometheus alerts configured (11 rules)
- [ ] Release notes completed ✅
- [ ] Documentation updated ✅

### Reviewer Sign-Off

**Backend Reviewer**: _______________ (Date: _______)
- [ ] Code quality approved
- [ ] Business logic correct
- [ ] Performance acceptable
- [ ] Error handling comprehensive

**Frontend Reviewer**: _______________ (Date: _______)
- [ ] UI/UX approved
- [ ] Integration working
- [ ] Error states handled
- [ ] Responsive design validated

**Operations Reviewer**: _______________ (Date: _______)
- [ ] Monitoring approved
- [ ] Alerting configured
- [ ] Rollout strategy approved
- [ ] Runbook comprehensive

**Security Reviewer** (Optional): _______________ (Date: _______)
- [ ] Authorization enforcement correct
- [ ] Audit trail complete
- [ ] Input validation secure
- [ ] No SQL injection vulnerabilities

---

## 🚀 Post-Merge Actions

### Immediate (Day 0)
- [ ] Verify GitHub Actions deployment successful
- [ ] Run smoke tests (12 API endpoints)
- [ ] Check `/metrics` endpoint
- [ ] Verify feature flag: OFF
- [ ] Confirm no errors in logs

### Shadow Mode Preparation (Day 1)
- [ ] Document shadow mode start date
- [ ] Notify stakeholders (email/Slack)
- [ ] Set up monitoring alerts
- [ ] Prepare rollback runbook

### Shadow Mode Operation (Day 1-5)
- [ ] Daily metrics review
- [ ] Validate no performance degradation
- [ ] Collect baseline data (gate check frequency, latency)
- [ ] Document any anomalies

### Phase 1 Rollout (Day 6-7)
- [ ] Enable feature for test sellers (10%)
- [ ] Run integration tests in production
- [ ] Validate cache hit rate >70%
- [ ] Validate P95 latency <15ms

---

**Last Updated**: 2025-01-07
**PR Status**: ✅ Ready for Review
**Merge Approval**: Pending

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
