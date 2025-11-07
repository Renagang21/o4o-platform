# Phase 9: Seller Authorization System - Rollout Plan

## Rollout Strategy

Phase 9 uses a **4-phase gradual rollout** with feature flags, canary testing, and performance monitoring to ensure zero-downtime deployment and easy rollback.

---

## Rollout Phases

### Phase 0: Shadow Mode (3-5 Days)

**Goal**: Validate logic without impacting production behavior

**Configuration**:
```bash
ENABLE_SELLER_AUTHORIZATION=false  # Feature OFF
SELLER_PRODUCT_LIMIT=10
SELLER_REJECT_COOLDOWN_DAYS=30
```

**Behavior**:
- All authorization endpoints return 501 Not Implemented
- Authorization gates are SKIPPED (no checks)
- Logging ONLY: Log what decision WOULD have been made
- Metrics collected: `seller_auth_gate_denies_total{shadow=true}`

**Shadow Logic Example**:
```typescript
if (!FeatureFlags.isSellerAuthorizationEnabled()) {
  // Shadow mode: Log decision but don't enforce
  const wouldBeAuthorized = await AuthorizationGateService.isSellerApprovedForProduct(sellerId, productId);
  logger.info('Shadow mode: Authorization check', {
    sellerId,
    productId,
    decision: wouldBeAuthorized ? 'ALLOW' : 'DENY'
  });
  return true; // Always allow in shadow mode
}
```

**Monitoring**:
- Dashboards: Shadow mode metrics
- Alerts: None (observation only)
- Log analysis: Compare shadow decisions vs. actual behavior

**Success Criteria**:
- [ ] Migration runs successfully (no errors)
- [ ] Shadow logs show expected decisions
- [ ] No performance degradation (P95 latency stable)
- [ ] Zero production errors

**Duration**: 3-5 days

---

### Phase 1: Canary Rollout (10% Products, 7 Days)

**Goal**: Test with real enforcement on a small subset

**Configuration**:
```bash
ENABLE_SELLER_AUTHORIZATION=true  # Feature ON
SELLER_PRODUCT_LIMIT=10
SELLER_REJECT_COOLDOWN_DAYS=30
PHASE9_CANARY_PRODUCTS="product-uuid-1,product-uuid-2,..."  # Whitelist
```

**Behavior**:
- Authorization endpoints ACTIVE (return real responses)
- Gates enforced for whitelisted products ONLY
- Non-whitelisted products: Gates return `true` (bypass)

**Canary Selection Criteria**:
- Low-traffic products (100-500 views/day)
- Test suppliers (internal or partner suppliers)
- Non-critical products (avoid top sellers)
- 10% of total dropshipping products (~50-100 products)

**Canary Logic**:
```typescript
if (!FeatureFlags.isSellerAuthorizationEnabled()) {
  return true; // Feature OFF
}

const canaryProducts = process.env.PHASE9_CANARY_PRODUCTS?.split(',') || [];
if (canaryProducts.length > 0 && !canaryProducts.includes(productId)) {
  return true; // Not in canary list, bypass
}

// Full authorization check for canary products
return await AuthorizationGateService.isSellerApprovedForProduct(sellerId, productId);
```

**Monitoring**:
| Metric | Threshold | Action |
|--------|-----------|--------|
| Gate P95 latency | <5ms | Continue |
| Gate P95 latency | 5-10ms | Investigate |
| Gate P95 latency | >10ms | Rollback |
| Error rate | <0.5% | Continue |
| Error rate | 0.5-1% | Investigate |
| Error rate | >1% | Rollback |
| Cache hit rate | >70% | Continue |
| Cache hit rate | <70% | Optimize caching |

**Alerts**:
- Slack: `#phase9-rollout` channel
- PagerDuty: Critical errors only (error rate >1%)
- Email: Daily summary to eng team

**Success Criteria**:
- [ ] Canary products: Authorization enforced correctly
- [ ] Non-canary products: No impact (bypass working)
- [ ] Gate latency P95 <5ms
- [ ] Error rate <0.5%
- [ ] No customer complaints
- [ ] Supplier inbox usable (response time <100ms)

**Duration**: 7 days

**Rollback Procedure** (if needed):
```bash
# Set feature flag to OFF
ENABLE_SELLER_AUTHORIZATION=false

# Restart API server
ssh o4o-api "pm2 restart o4o-api-server"

# Verify rollback
curl https://api.neture.co.kr/health/detailed
```

---

### Phase 2: Expanded Rollout (50% Products, 7 Days)

**Goal**: Stress test at scale, validate performance under load

**Configuration**:
```bash
ENABLE_SELLER_AUTHORIZATION=true
SELLER_PRODUCT_LIMIT=10
SELLER_REJECT_COOLDOWN_DAYS=30
PHASE9_ROLLOUT_PERCENTAGE=50  # Random 50% of products
```

**Behavior**:
- Authorization gates enforced for 50% of products (random selection)
- Selection algorithm: `hash(productId) % 100 < 50`
- Consistent hashing ensures same products always in 50%

**Selection Logic**:
```typescript
function isProductInRollout(productId: string, percentage: number): boolean {
  if (!FeatureFlags.isSellerAuthorizationEnabled()) {
    return false;
  }

  const rolloutPercentage = parseInt(process.env.PHASE9_ROLLOUT_PERCENTAGE || '0', 10);
  if (rolloutPercentage === 100) {
    return true; // Full rollout
  }

  // Consistent hashing
  const hash = crypto.createHash('md5').update(productId).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return (hashInt % 100) < rolloutPercentage;
}
```

**Monitoring** (Same thresholds as Phase 1):
- Gate P95 latency: <5ms
- Error rate: <0.5%
- Cache hit rate: >70%
- Database connection pool: <80% utilization

**Load Testing**:
- k6 script: Simulate 1000 concurrent gate checks
- Target: 10,000 requests/min sustained
- Duration: 10 minutes

**Success Criteria**:
- [ ] 50% products: Authorization enforced correctly
- [ ] Load test passed (no errors, latency <5ms P95)
- [ ] Database queries optimized (EXPLAIN ANALYZE shows index usage)
- [ ] Redis cache hit rate >80%
- [ ] No production incidents

**Duration**: 7 days

---

### Phase 3: Full Rollout (100% Products)

**Goal**: Complete migration to Phase 9 authorization system

**Configuration**:
```bash
ENABLE_SELLER_AUTHORIZATION=true
SELLER_PRODUCT_LIMIT=10
SELLER_REJECT_COOLDOWN_DAYS=30
PHASE9_ROLLOUT_PERCENTAGE=100  # Full rollout
```

**Behavior**:
- Authorization gates enforced for ALL dropshipping products
- No bypass logic (except feature flag OFF)

**Pre-Rollout Checklist**:
- [ ] Phase 1 success criteria met
- [ ] Phase 2 success criteria met
- [ ] Load testing passed (10,000 req/min)
- [ ] Runbook documented (troubleshooting, rollback)
- [ ] On-call engineer briefed
- [ ] Monitoring dashboards configured
- [ ] Alert thresholds validated

**Rollout Execution**:
1. **Timing**: Deploy during low-traffic hours (Tuesday-Thursday, 2-4 AM KST)
2. **Communication**: Announce in Slack `#engineering` channel
3. **Config Change**: Update `PHASE9_ROLLOUT_PERCENTAGE=100` via env vars
4. **Restart**: `pm2 restart o4o-api-server` (rolling restart, zero downtime)
5. **Verification**:
   ```bash
   # Check feature flag status
   curl https://api.neture.co.kr/api/v1/ds/seller/authorizations
   # Should return 200 (not 501)

   # Check metrics
   curl https://api.neture.co.kr/metrics | grep seller_auth
   ```
6. **Monitoring**: Watch dashboards for 2 hours post-deploy

**Monitoring** (24/7 for first week):
| Metric | Threshold | Action |
|--------|-----------|--------|
| Gate P95 latency | <5ms | Healthy |
| Gate P95 latency | >10ms | Page on-call |
| Error rate | <0.5% | Healthy |
| Error rate | >1% | Page on-call, prepare rollback |
| Supplier inbox size | <100 pending | Healthy |
| Supplier inbox size | >500 pending | Alert suppliers, optimize workflow |

**Success Criteria**:
- [ ] All dropshipping products: Authorization enforced
- [ ] Gate latency P95 <5ms (7-day average)
- [ ] Error rate <0.5% (7-day average)
- [ ] Zero rollbacks
- [ ] Customer satisfaction: No authorization-related complaints

**Duration**: Ongoing (permanent)

---

## Monitoring Metrics

### 1. Authorization Gate Performance

**Prometheus Query**:
```promql
# P95 latency
histogram_quantile(0.95, rate(seller_auth_gate_duration_seconds_bucket[5m]))

# Error rate
rate(seller_auth_gate_denies_total{error="true"}[5m]) / rate(seller_auth_gate_checks_total[5m])
```

**Grafana Dashboard**: `Phase 9: Authorization Gates`
- Gate latency (P50, P95, P99)
- Gate deny rate by stage (cart, order, settlement)
- Cache hit rate
- Error rate by error code

---

### 2. Supplier Inbox Health

**Prometheus Query**:
```promql
# Pending requests per supplier
seller_auth_inbox_size{supplierId="uuid"}

# Approval rate
rate(seller_auth_requests_total{action="approve"}[1h]) / rate(seller_auth_requests_total{action="request"}[1h])
```

**Grafana Dashboard**: `Phase 9: Supplier Inbox`
- Pending requests (gauge)
- Approval/rejection rate
- Average response time (request → approve/reject)

---

### 3. Business Metrics

**Prometheus Query**:
```promql
# Product limit rejections
increase(seller_auth_limit_rejections_total[24h])

# Cooldown blocks
increase(seller_auth_cooldown_blocks_total[24h])

# Revocations
increase(seller_auth_requests_total{action="revoke"}[24h])
```

**Grafana Dashboard**: `Phase 9: Business Metrics`
- Product limit hit rate
- Cooldown blocks per day
- Revocation rate (should be rare)
- Authorization approval rate by supplier

---

## Alert Configuration

### Critical Alerts (PagerDuty)

```yaml
- alert: Phase9GateLatencyHigh
  expr: histogram_quantile(0.95, rate(seller_auth_gate_duration_seconds_bucket[5m])) > 0.01
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Phase 9 gate latency P95 >10ms"
    description: "Authorization gate checks are slow (P95: {{ $value }}s). Check database and Redis."

- alert: Phase9ErrorRateHigh
  expr: rate(seller_auth_gate_denies_total{error="true"}[5m]) / rate(seller_auth_gate_checks_total[5m]) > 0.01
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Phase 9 error rate >1%"
    description: "Authorization gate errors detected. Check logs and database."
```

### Warning Alerts (Slack)

```yaml
- alert: Phase9SupplierInboxBacklog
  expr: seller_auth_inbox_size > 100
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Supplier {{ $labels.supplierId }} has >100 pending requests"
    description: "Supplier inbox backlog. Consider emailing supplier to review requests."

- alert: Phase9ProductLimitHitRate
  expr: increase(seller_auth_limit_rejections_total[1h]) > 10
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "High product limit rejection rate ({{ $value }} in 1h)"
    description: "Many sellers hitting 10-product limit. Consider increasing limit or tier-based limits."
```

---

## Rollback Procedure

### Immediate Rollback (Emergency)

**Trigger**: Error rate >1%, gate latency P95 >10ms, production outage

**Steps**:
1. **Disable Feature Flag** (30 seconds):
   ```bash
   ssh o4o-api
   export ENABLE_SELLER_AUTHORIZATION=false
   pm2 restart o4o-api-server
   ```

2. **Verify Rollback** (1 minute):
   ```bash
   curl https://api.neture.co.kr/api/v1/ds/seller/authorizations
   # Should return 501 Not Implemented

   curl https://api.neture.co.kr/metrics | grep seller_auth_gate_checks_total
   # Should stop incrementing
   ```

3. **Announce** (Slack):
   ```
   @channel Phase 9 rolled back due to [REASON].
   Authorization gates DISABLED. Investigating...
   ```

4. **Investigate** (Post-Mortem):
   - Review logs: `pm2 logs o4o-api-server --lines 1000`
   - Check metrics: Grafana dashboard
   - Database query: Slow query log
   - Root cause analysis

**Recovery Time Objective (RTO)**: <5 minutes

---

### Gradual Rollback (Non-Emergency)

**Trigger**: Persistent issues, customer complaints, business decision

**Steps**:
1. **Reduce Rollout Percentage**:
   ```bash
   PHASE9_ROLLOUT_PERCENTAGE=50  # Roll back to 50%
   pm2 restart o4o-api-server
   ```

2. **Monitor for 24 hours**

3. **If issues persist**:
   ```bash
   PHASE9_ROLLOUT_PERCENTAGE=10  # Roll back to 10%
   ```

4. **If still problematic**:
   ```bash
   ENABLE_SELLER_AUTHORIZATION=false  # Full rollback
   ```

---

## Communication Plan

### Internal Communication

| Audience | Channel | Frequency |
|----------|---------|-----------|
| Engineering Team | Slack `#phase9-rollout` | Daily updates |
| Product Team | Slack `#product` | Weekly summary |
| Support Team | Email | Before each phase + FAQ doc |
| Leadership | Email | Phase milestones only |

### External Communication

| Audience | Channel | Message |
|----------|---------|---------|
| Sellers | Email + In-app | "New authorization system launching. Request access to products from suppliers." |
| Suppliers | Email + Dashboard | "Review seller authorization requests in your inbox. Approve/reject within 3 days." |
| Partners | Email | "No action required. Authorization system improves product access control." |

**Timing**: 3 days before Phase 1 launch

---

## Post-Rollout Activities

### Week 1: Intensive Monitoring
- [ ] Daily metrics review (gate latency, error rate)
- [ ] Supplier inbox backlog check
- [ ] Customer support ticket analysis (authorization-related?)
- [ ] Performance optimization (cache tuning, query optimization)

### Week 2: Business Analysis
- [ ] Authorization approval rate by supplier
- [ ] Product limit hit rate (consider tier-based limits?)
- [ ] Cooldown effectiveness (30 days appropriate?)
- [ ] Revocation rate (rare = good)

### Month 1: Optimization
- [ ] Cache TTL tuning (60s optimal?)
- [ ] Database index optimization (EXPLAIN ANALYZE)
- [ ] Alert threshold refinement
- [ ] Feature enhancements (auto-approve whitelist, bulk approve)

### Month 3: Retrospective
- [ ] Post-mortem: What went well, what didn't
- [ ] Lessons learned for future rollouts
- [ ] Documentation updates (runbook, troubleshooting)
- [ ] Archive rollout artifacts

---

## Runbook: Common Issues

### Issue 1: Gate Latency Spike

**Symptom**: P95 latency >10ms

**Diagnosis**:
```bash
# Check Redis
redis-cli -h $REDIS_HOST ping
redis-cli -h $REDIS_HOST info stats

# Check database
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

**Resolution**:
- Redis down: Restart Redis, gates fallback to database
- Database slow: Analyze slow queries, add indexes
- Cache miss storm: Warm cache with batch preload

---

### Issue 2: High Error Rate

**Symptom**: Error rate >1%

**Diagnosis**:
```bash
# Check logs for error codes
pm2 logs o4o-api-server | grep ERR_SELLER_NOT_AUTHORIZED

# Check database constraints
psql $DATABASE_URL -c "SELECT * FROM seller_authorizations WHERE status = 'APPROVED' LIMIT 10;"
```

**Resolution**:
- Database constraint violation: Fix migration
- Logic bug: Rollback feature flag, hotfix
- External dependency (Redis): Enable fallback mode

---

### Issue 3: Supplier Inbox Overload

**Symptom**: >500 pending requests for one supplier

**Diagnosis**:
```bash
# Check inbox size
psql $DATABASE_URL -c "SELECT supplierId, COUNT(*) FROM seller_authorizations WHERE status = 'REQUESTED' GROUP BY supplierId ORDER BY COUNT(*) DESC;"
```

**Resolution**:
- Email supplier: Urgent review needed
- Admin bulk action: Approve low-risk requests (Bronze sellers, low-volume products)
- Feature enhancement: Auto-approve for trusted sellers (future)

---

## Success Criteria Summary

| Phase | Duration | Success Metrics |
|-------|----------|-----------------|
| **Phase 0** | 3-5 days | Shadow logs accurate, no errors, latency stable |
| **Phase 1** | 7 days | Canary: P95 <5ms, error <0.5%, no complaints |
| **Phase 2** | 7 days | 50%: Load test passed, metrics stable |
| **Phase 3** | Ongoing | 100%: P95 <5ms, error <0.5%, business metrics healthy |

**Overall Success**:
- Zero-downtime rollout
- Performance targets met
- Business value delivered (improved product access control)
- Easy rollback path validated

---

**Version**: 1.0.0
**Created**: 2025-01-07
**Status**: Rollout Plan Defined (Execution Pending)
