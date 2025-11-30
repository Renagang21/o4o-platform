# Phase 9: Seller Authorization System - Rollout Strategy

## Overview

Progressive rollout plan for enabling the Seller Authorization feature flag with risk mitigation strategies and rollback procedures.

**Target**: Zero downtime deployment with gradual feature adoption

**Timeline**: 7-10 days from Phase 0 to Phase 3

---

## Phase 0: Shadow Mode (3-5 days)

**Goal**: Collect baseline metrics without affecting production behavior

### Configuration

```bash
ENABLE_SELLER_AUTHORIZATION=false  # Feature disabled, fail-open
```

### Activities

1. **Deploy Code to Production**
   - Deploy all Phase 9 services, routes, and entities
   - Metrics collection is active (passive monitoring)
   - Authorization gates return `true` (fail-open)

2. **Metrics Collection**
   - Monitor baseline traffic patterns
   - Track gate invocation frequency
   - Measure P95/P99 latency of authorization checks (no-op mode)
   - Observe cache hit rate (should be N/A)

3. **Validation Criteria**
   - No errors in logs related to authorization services
   - Metrics endpoint `/metrics` returns authorization metrics
   - Gate service instantiates without errors

### Exit Criteria
- ✅ Zero errors in authorization service logs
- ✅ Metrics collection working
- ✅ No performance degradation

---

## Phase 1: Internal Testing (10% Rollout, 1-2 days)

**Goal**: Enable feature for internal test sellers only

### Configuration

```bash
ENABLE_SELLER_AUTHORIZATION=true
SELLER_AUTHORIZATION_ROLLOUT_PERCENTAGE=10
SELLER_AUTHORIZATION_WHITELIST=seller-alice,seller-bob,seller-charlie
```

### Implementation

```typescript
// Add to AuthorizationGateService
private isSellerInRollout(sellerId: string): boolean {
  // Check whitelist
  const whitelist = process.env.SELLER_AUTHORIZATION_WHITELIST?.split(',') || [];
  if (whitelist.includes(sellerId)) return true;

  // Check rollout percentage
  const percentage = parseInt(process.env.SELLER_AUTHORIZATION_ROLLOUT_PERCENTAGE || '0');
  const hash = sellerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (hash % 100) < percentage;
}
```

### Activities

1. **Enable for Test Sellers**
   - 3 internal partner sellers from seed data
   - Test all workflows (A-E scenarios)
   - Verify UI components (Partner/Supplier/Admin)

2. **Monitoring**
   - Watch for cache hit rate >70%
   - Monitor gate latency: P95 <5ms (cache hit), P95 <15ms (cache miss)
   - Check for limit rejections, cooldown blocks
   - Track approval/rejection rates

3. **Validation Scenarios**
   - Scenario A: Request → Approve → Gate OK
   - Scenario B: Request → Pending (check inbox)
   - Scenario C: Request → Reject → Cooldown block
   - Scenario D: Approve 10 products → 11th fails
   - Scenario E: Revoke → Permanent block

### Exit Criteria
- ✅ All 5 scenarios pass (3 iterations each)
- ✅ Cache hit rate >70%
- ✅ P95 gate latency <15ms
- ✅ No unexpected errors

---

## Phase 2: Limited Production (50% Rollout, 2-3 days)

**Goal**: Expand to 50% of sellers with active monitoring

### Configuration

```bash
ENABLE_SELLER_AUTHORIZATION=true
SELLER_AUTHORIZATION_ROLLOUT_PERCENTAGE=50
```

### Gate Criteria (Must Pass Before Enabling)

| Metric | Threshold | Action if Failed |
|--------|-----------|------------------|
| Error rate | <0.1% | Rollback to 10% |
| P95 latency | <15ms | Investigate cache |
| Cache hit rate | >70% | Increase TTL to 60s |
| Limit rejections | <10/hour | OK (expected) |
| Gate denies | <50/min | Check for spike, investigate |

### Activities

1. **Progressive Rollout**
   - Day 1: Enable 20%
   - Day 2: Enable 35% (if metrics OK)
   - Day 3: Enable 50% (if metrics OK)

2. **Monitoring Dashboard**
   - Create Grafana dashboard with 4 panels:
     1. Request volume by action (approve/reject/revoke)
     2. Gate performance (latency histogram, cache hit rate)
     3. Business rules (limit rejections, cooldown blocks)
     4. Supplier health (inbox size, response time)

3. **Alert Rules**
   ```yaml
   # Prometheus Alert Rules
   - alert: HighAuthErrorRate
     expr: rate(seller_auth_requests_total{result="error"}[5m]) > 0.001
     for: 10m
     severity: critical

   - alert: SlowGatePerformance
     expr: histogram_quantile(0.95, rate(seller_auth_gate_duration_seconds_bucket[5m])) > 0.015
     for: 15m
     severity: warning

   - alert: LowCacheHitRate
     expr: seller_auth_cache_hit_rate < 0.7
     for: 30m
     severity: warning

   - alert: HighGateDenyRate
     expr: rate(seller_auth_gate_denies_total[1m]) > 50
     for: 5m
     severity: critical
   ```

### Exit Criteria
- ✅ All gate criteria met for 48 hours
- ✅ No critical alerts fired
- ✅ Customer support tickets <5 related to authorization
- ✅ Supplier response time <24 hours (average)

---

## Phase 3: Full Rollout (100%, 1-2 days)

**Goal**: Enable feature for all sellers

### Configuration

```bash
ENABLE_SELLER_AUTHORIZATION=true
SELLER_AUTHORIZATION_ROLLOUT_PERCENTAGE=100
```

### Activities

1. **Final Rollout**
   - Day 1: Enable 75%
   - Day 2: Enable 100% (if metrics OK)

2. **Post-Rollout Monitoring (7 days)**
   - Daily metrics review
   - Weekly stakeholder report
   - Incident response readiness

3. **Documentation Update**
   - Update API documentation
   - Create seller onboarding guide
   - Supplier authorization FAQ

### Exit Criteria
- ✅ All metrics stable for 7 days
- ✅ No rollback events
- ✅ Feature fully adopted

---

## Rollback Procedures

### Immediate Rollback (Emergency)

**Trigger**: Critical alert fired OR error rate >1%

**Action**:
```bash
# Set feature flag to false (fail-open)
ENABLE_SELLER_AUTHORIZATION=false

# Deploy immediately (no approval needed)
./scripts/deploy.sh --emergency
```

**Expected Behavior**:
- All authorization gates return `true` immediately
- No seller transactions blocked
- Metrics collection continues (for analysis)

**Recovery Time Objective (RTO)**: 5 minutes

### Partial Rollback (Degraded Performance)

**Trigger**: P95 latency >50ms OR cache hit rate <50%

**Action**:
```bash
# Reduce rollout percentage
SELLER_AUTHORIZATION_ROLLOUT_PERCENTAGE=10

# Deploy with approval
./scripts/deploy.sh
```

**Investigation Steps**:
1. Check Redis health (`redis-cli PING`)
2. Review slow query logs (TypeORM)
3. Check database connection pool usage
4. Review cache TTL settings (increase to 60s if needed)

---

## Metrics Dashboard Specification

### Panel 1: Request Volume
- **Chart**: Line graph (time series)
- **Metrics**:
  - `rate(seller_auth_requests_total{action="request"}[5m])` - Request rate
  - `rate(seller_auth_requests_total{action="approve"}[5m])` - Approval rate
  - `rate(seller_auth_requests_total{action="reject"}[5m])` - Rejection rate
  - `rate(seller_auth_requests_total{action="revoke"}[5m])` - Revocation rate

### Panel 2: Gate Performance
- **Chart**: Dual-axis (histogram + gauge)
- **Metrics**:
  - `histogram_quantile(0.95, rate(seller_auth_gate_duration_seconds_bucket[5m]))` - P95 latency
  - `histogram_quantile(0.99, rate(seller_auth_gate_duration_seconds_bucket[5m]))` - P99 latency
  - `seller_auth_cache_hit_rate` - Cache hit rate (gauge)

### Panel 3: Business Rules
- **Chart**: Bar chart
- **Metrics**:
  - `rate(seller_auth_limit_rejections_total[1h])` - Limit rejections/hour
  - `rate(seller_auth_cooldown_blocks_total[1h])` - Cooldown blocks/hour

### Panel 4: Supplier Health
- **Chart**: Heatmap
- **Metrics**:
  - `seller_auth_inbox_size` - Pending requests per supplier (grouped)
  - `sum(seller_auth_inbox_size)` - Total pending across all suppliers

---

## On-Call Runbook

### Issue: High Error Rate

**Symptoms**: `seller_auth_requests_total{result="error"}` spike

**Investigation**:
1. Check logs: `grep "ERR_" /var/log/o4o-api.log | tail -100`
2. Identify error code: `ERR_PRODUCT_LIMIT_REACHED`, `ERR_COOLDOWN_ACTIVE`, etc.
3. Check if expected (business rule) or unexpected (bug)

**Resolution**:
- Business rule error (expected): Document and monitor
- Bug (unexpected): Rollback immediately

### Issue: Slow Gate Performance

**Symptoms**: P95 latency >15ms

**Investigation**:
1. Check cache hit rate: If <70%, cache is not warming properly
2. Check Redis health: `redis-cli --latency`
3. Check database query time: Review TypeORM slow query logs

**Resolution**:
- Increase cache TTL: `CACHE_TTL=60` (from 30s)
- Warm cache on startup: Call `AuthorizationGateService.warmCache()` for top sellers

### Issue: Supplier Inbox Overload

**Symptoms**: `seller_auth_inbox_size` >100 for multiple suppliers

**Investigation**:
1. Check supplier response time (manual query)
2. Identify bottleneck suppliers
3. Contact suppliers to expedite processing

**Resolution**:
- Notify suppliers via email/slack
- Temporarily pause new requests for overloaded suppliers (manual gate)

---

## Checklist

### Pre-Rollout (Phase 0)
- [ ] Deploy code to production (shadow mode)
- [ ] Verify metrics endpoint `/metrics` working
- [ ] Confirm zero errors in logs
- [ ] Baseline metrics collected (3-5 days)

### Phase 1 (10% Rollout)
- [ ] Enable feature flag for test sellers
- [ ] Execute 5 scenarios x 3 iterations (15 tests)
- [ ] Verify cache hit rate >70%
- [ ] Verify P95 latency <15ms
- [ ] No unexpected errors

### Phase 2 (50% Rollout)
- [ ] Progressive rollout: 20% → 35% → 50%
- [ ] Grafana dashboard created
- [ ] Alert rules configured
- [ ] All gate criteria met for 48 hours
- [ ] Customer support tickets <5

### Phase 3 (100% Rollout)
- [ ] Progressive rollout: 75% → 100%
- [ ] Post-rollout monitoring (7 days)
- [ ] Documentation updated
- [ ] Feature fully adopted

---

## Stakeholder Communication

### Pre-Rollout (1 week before)
- **To**: Product, Engineering, Customer Support
- **Message**: Phase 9 Seller Authorization feature will be enabled progressively starting [DATE]
- **Action**: Review runbook, ensure on-call coverage

### Phase 1 Start
- **To**: Internal test sellers
- **Message**: You are now part of the authorization system beta. Please test workflows.
- **Action**: Provide feedback channel (Slack/email)

### Phase 2 Start
- **To**: All sellers (50%)
- **Message**: New authorization system is now active for your account. Review FAQs.
- **Action**: Monitor support tickets

### Phase 3 Complete
- **To**: All stakeholders
- **Message**: Phase 9 Seller Authorization is now fully rolled out. Metrics stable.
- **Action**: Weekly review for 1 month

---

## Success Metrics (30-day post-rollout)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Authorization request volume | >100/day | TBD | ⏳ |
| Approval rate | >60% | TBD | ⏳ |
| Rejection rate | <30% | TBD | ⏳ |
| Revocation rate | <5% | TBD | ⏳ |
| Cache hit rate | >80% | TBD | ⏳ |
| P95 gate latency | <10ms | TBD | ⏳ |
| Error rate | <0.01% | TBD | ⏳ |
| Customer satisfaction | >4.5/5 | TBD | ⏳ |

---

**Document Version**: 1.0
**Last Updated**: 2025-01-07
**Owner**: Platform Engineering Team
