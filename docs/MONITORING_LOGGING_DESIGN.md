# Monitoring & Logging Design for Phase 8
**Phase 8 - Supplier Policy Integration**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document specifies the monitoring, logging, and alerting strategy for the Phase 8 supplier policy resolution system. It ensures observability, debuggability, and operational health tracking.

---

## Structured Logging

### Log Format

**Standard**: JSON format for structured parsing

**Logger**: Winston or Pino (existing logger in codebase)

**Example**:
```json
{
  "timestamp": "2025-11-07T10:30:00.123Z",
  "level": "info",
  "event": "policy_resolution",
  "service": "api-server",
  "environment": "production",
  "requestId": "req_abc123",
  "data": {
    "orderId": "ord_xyz789",
    "orderItemId": "item_001",
    "productId": "prod_456",
    "supplierId": "sup_789",
    "partnerId": "ptr_012",
    "appliedPolicy": {
      "id": "pol_def345",
      "code": "SUPPLIER-XYZ-2025",
      "type": "SUPPLIER",
      "rate": 15.0,
      "level": "supplier"
    },
    "evaluatedLevels": ["product", "supplier"],
    "resolutionTimeMs": 3.2
  }
}
```

---

## Log Events

### 1. Policy Resolution Success

**Event**: `policy_resolution`
**Level**: `info`
**When**: Policy successfully resolved for order item

**Fields**:
```typescript
interface PolicyResolutionLog {
  event: 'policy_resolution';
  level: 'info';
  timestamp: string; // ISO 8601
  requestId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  supplierId: string;
  partnerId: string;
  appliedPolicy: {
    id: string;
    code: string;
    type: 'DEFAULT' | 'TIER' | 'SUPPLIER' | 'PRODUCT';
    rate: number;
    level: 'product' | 'supplier' | 'tier' | 'default';
  };
  evaluatedLevels: string[]; // e.g., ["product", "supplier"]
  resolutionTimeMs: number;
  calculatedCommission: number;
}
```

**Example**:
```json
{
  "timestamp": "2025-11-07T10:30:00.123Z",
  "level": "info",
  "event": "policy_resolution",
  "requestId": "req_abc123",
  "orderId": "ord_xyz789",
  "orderItemId": "item_001",
  "productId": "prod_456",
  "supplierId": "sup_789",
  "partnerId": "ptr_012",
  "appliedPolicy": {
    "id": "pol_def345",
    "code": "SUPPLIER-XYZ-2025",
    "type": "SUPPLIER",
    "rate": 15.0,
    "level": "supplier"
  },
  "evaluatedLevels": ["product", "supplier"],
  "resolutionTimeMs": 3.2,
  "calculatedCommission": 7500
}
```

**Usage**:
```typescript
logger.info('policy_resolution', {
  requestId: req.id,
  orderId: orderItem.orderId,
  orderItemId: orderItem.id,
  productId: orderItem.productId,
  supplierId: orderItem.supplierId,
  partnerId: orderItem.partnerId,
  appliedPolicy: {
    id: resolved.policy.id,
    code: resolved.policy.policyCode,
    type: resolved.policy.policyType,
    rate: resolved.policy.commissionRate,
    level: resolved.resolutionLevel
  },
  evaluatedLevels: ['product', 'supplier'],
  resolutionTimeMs: resolved.resolutionTimeMs,
  calculatedCommission: commissionAmount
});
```

---

### 2. Policy Resolution Failure (Safe Mode)

**Event**: `policy_resolution_failure`
**Level**: `warn`
**When**: No policy found at any level, safe mode triggered (0% commission)

**Fields**:
```typescript
interface PolicyResolutionFailureLog {
  event: 'policy_resolution_failure';
  level: 'warn';
  timestamp: string;
  requestId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  supplierId: string;
  partnerId: string;
  reason: 'no_policy_found' | 'all_policies_expired' | 'all_policies_inactive';
  evaluatedLevels: string[];
  fallback: 'safe_mode_0_percent';
  resolutionTimeMs: number;
}
```

**Example**:
```json
{
  "timestamp": "2025-11-07T10:35:00.456Z",
  "level": "warn",
  "event": "policy_resolution_failure",
  "requestId": "req_def456",
  "orderId": "ord_abc123",
  "orderItemId": "item_002",
  "productId": "prod_789",
  "supplierId": "sup_012",
  "partnerId": "ptr_345",
  "reason": "no_policy_found",
  "evaluatedLevels": ["product", "supplier", "tier", "default"],
  "fallback": "safe_mode_0_percent",
  "resolutionTimeMs": 5.1
}
```

**Usage**:
```typescript
logger.warn('policy_resolution_failure', {
  requestId: req.id,
  orderId: orderItem.orderId,
  orderItemId: orderItem.id,
  productId: orderItem.productId,
  supplierId: orderItem.supplierId,
  partnerId: orderItem.partnerId,
  reason: 'no_policy_found',
  evaluatedLevels: ['product', 'supplier', 'tier', 'default'],
  fallback: 'safe_mode_0_percent',
  resolutionTimeMs: Date.now() - startTime
});
```

---

### 3. Policy Resolution Error

**Event**: `policy_resolution_error`
**Level**: `error`
**When**: Unexpected error during policy lookup (DB error, timeout, etc.)

**Fields**:
```typescript
interface PolicyResolutionErrorLog {
  event: 'policy_resolution_error';
  level: 'error';
  timestamp: string;
  requestId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  supplierId: string;
  partnerId: string;
  error: {
    message: string;
    code: string; // e.g., 'DB_TIMEOUT', 'CONNECTION_ERROR'
    stack?: string;
  };
  evaluatedLevels: string[];
  fallback: 'safe_mode' | 'cached_default' | 'none';
}
```

**Example**:
```json
{
  "timestamp": "2025-11-07T10:40:00.789Z",
  "level": "error",
  "event": "policy_resolution_error",
  "requestId": "req_ghi789",
  "orderId": "ord_def456",
  "orderItemId": "item_003",
  "productId": "prod_123",
  "supplierId": "sup_456",
  "partnerId": "ptr_789",
  "error": {
    "message": "Database connection timeout",
    "code": "DB_TIMEOUT",
    "stack": "Error: timeout\n  at Connection.query ..."
  },
  "evaluatedLevels": ["product"],
  "fallback": "safe_mode"
}
```

**Usage**:
```typescript
logger.error('policy_resolution_error', {
  requestId: req.id,
  orderId: orderItem.orderId,
  orderItemId: orderItem.id,
  productId: orderItem.productId,
  supplierId: orderItem.supplierId,
  partnerId: orderItem.partnerId,
  error: {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    stack: error.stack
  },
  evaluatedLevels: ['product'],
  fallback: 'safe_mode'
});
```

---

### 4. Policy Resolution Timeout

**Event**: `policy_resolution_timeout`
**Level**: `warn`
**When**: Policy lookup exceeds timeout threshold

**Fields**:
```typescript
interface PolicyResolutionTimeoutLog {
  event: 'policy_resolution_timeout';
  level: 'warn';
  timestamp: string;
  requestId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  supplierId: string;
  partnerId: string;
  timeoutMs: number;
  evaluatedLevels: string[];
  fallback: 'cached_default' | 'safe_mode';
}
```

**Example**:
```json
{
  "timestamp": "2025-11-07T10:45:00.012Z",
  "level": "warn",
  "event": "policy_resolution_timeout",
  "requestId": "req_jkl012",
  "orderId": "ord_ghi789",
  "orderItemId": "item_004",
  "productId": "prod_456",
  "supplierId": "sup_789",
  "partnerId": "ptr_012",
  "timeoutMs": 100,
  "evaluatedLevels": ["product", "supplier"],
  "fallback": "cached_default"
}
```

---

### 5. Policy Linkage (Admin Action)

**Event**: `policy_linkage`
**Level**: `info`
**When**: Admin links/unlinks policy to supplier or product

**Fields**:
```typescript
interface PolicyLinkageLog {
  event: 'policy_linkage';
  level: 'info';
  timestamp: string;
  requestId: string;
  adminId: string;
  action: 'link' | 'unlink';
  entityType: 'supplier' | 'product';
  entityId: string;
  policyId: string | null;
  previousPolicyId?: string | null;
  reason?: string; // Optional reason for override
}
```

**Example**:
```json
{
  "timestamp": "2025-11-07T11:00:00.345Z",
  "level": "info",
  "event": "policy_linkage",
  "requestId": "req_mno345",
  "adminId": "admin_abc",
  "action": "link",
  "entityType": "supplier",
  "entityId": "sup_xyz789",
  "policyId": "pol_def456",
  "previousPolicyId": null,
  "reason": null
}
```

---

### 6. Commission Calculation

**Event**: `commission_calculation`
**Level**: `info`
**When**: Commission calculated for order item

**Fields**:
```typescript
interface CommissionCalculationLog {
  event: 'commission_calculation';
  level: 'info';
  timestamp: string;
  requestId: string;
  orderId: string;
  orderItemId: string;
  partnerId: string;
  calculationDetails: {
    baseAmount: number; // price * quantity
    commissionRate: number;
    rawCommission: number; // Before caps
    minCap?: number;
    maxCap?: number;
    finalCommission: number; // After caps
    capApplied: 'none' | 'min' | 'max';
  };
  policySnapshot: {
    policyId: string;
    policyCode: string;
    resolutionLevel: string;
  };
  calculationTimeMs: number;
}
```

**Example**:
```json
{
  "timestamp": "2025-11-07T11:05:00.678Z",
  "level": "info",
  "event": "commission_calculation",
  "requestId": "req_pqr678",
  "orderId": "ord_jkl012",
  "orderItemId": "item_005",
  "partnerId": "ptr_345",
  "calculationDetails": {
    "baseAmount": 200000,
    "commissionRate": 25.0,
    "rawCommission": 50000,
    "minCap": null,
    "maxCap": 100000,
    "finalCommission": 50000,
    "capApplied": "none"
  },
  "policySnapshot": {
    "policyId": "pol_promo_q4",
    "policyCode": "PRODUCT-PROMO-Q4",
    "resolutionLevel": "product"
  },
  "calculationTimeMs": 8.5
}
```

---

## Prometheus Metrics

### Metric Naming Convention

**Format**: `o4o_<category>_<metric>_<unit>`

**Examples**:
- `o4o_policy_resolution_duration_ms`
- `o4o_policy_resolution_total`
- `o4o_policy_resolution_failures_total`

---

### 1. Policy Resolution Duration (Histogram)

**Name**: `o4o_policy_resolution_duration_ms`
**Type**: Histogram
**Help**: Time taken to resolve commission policy
**Labels**:
- `resolution_level`: `product`, `supplier`, `tier`, `default`, `safe_mode`
- `success`: `true`, `false`

**Buckets**: `[1, 2, 5, 10, 20, 50, 100]` (milliseconds)

**Usage**:
```typescript
import { Histogram } from 'prom-client';

const policyResolutionDuration = new Histogram({
  name: 'o4o_policy_resolution_duration_ms',
  help: 'Time taken to resolve commission policy',
  labelNames: ['resolution_level', 'success'],
  buckets: [1, 2, 5, 10, 20, 50, 100]
});

// Record metric
policyResolutionDuration.observe(
  { resolution_level: resolved.resolutionLevel, success: 'true' },
  resolved.resolutionTimeMs
);
```

**Queries**:
```promql
# P95 resolution time by level
histogram_quantile(0.95, sum by (resolution_level, le) (
  rate(o4o_policy_resolution_duration_ms_bucket[5m])
))

# P99 resolution time
histogram_quantile(0.99, sum by (le) (
  rate(o4o_policy_resolution_duration_ms_bucket[5m])
))
```

---

### 2. Policy Resolution Total (Counter)

**Name**: `o4o_policy_resolution_total`
**Type**: Counter
**Help**: Total policy resolutions by level
**Labels**:
- `resolution_level`: `product`, `supplier`, `tier`, `default`, `safe_mode`

**Usage**:
```typescript
import { Counter } from 'prom-client';

const policyResolutionTotal = new Counter({
  name: 'o4o_policy_resolution_total',
  help: 'Total policy resolutions by level',
  labelNames: ['resolution_level']
});

// Increment metric
policyResolutionTotal.inc({ resolution_level: resolved.resolutionLevel });
```

**Queries**:
```promql
# Resolution rate by level (per second)
rate(o4o_policy_resolution_total[5m])

# Distribution by level (percentage)
sum by (resolution_level) (rate(o4o_policy_resolution_total[5m]))
/ ignoring(resolution_level) group_left sum(rate(o4o_policy_resolution_total[5m]))
* 100
```

---

### 3. Policy Resolution Failures (Counter)

**Name**: `o4o_policy_resolution_failures_total`
**Type**: Counter
**Help**: Total policy resolution failures (safe mode)
**Labels**:
- `reason`: `no_policy_found`, `timeout`, `db_error`, `all_expired`

**Usage**:
```typescript
import { Counter } from 'prom-client';

const policyResolutionFailures = new Counter({
  name: 'o4o_policy_resolution_failures_total',
  help: 'Total policy resolution failures (safe mode)',
  labelNames: ['reason']
});

// Increment metric
policyResolutionFailures.inc({ reason: 'no_policy_found' });
```

**Queries**:
```promql
# Failure rate per second
rate(o4o_policy_resolution_failures_total[5m])

# Success rate (%)
(1 - (sum(rate(o4o_policy_resolution_failures_total[5m]))
/ sum(rate(o4o_policy_resolution_total[5m])))) * 100
```

---

### 4. Commission Calculation Duration (Histogram)

**Name**: `o4o_commission_calculation_duration_ms`
**Type**: Histogram
**Help**: Time taken to calculate commission (including policy resolution)
**Labels**: None

**Buckets**: `[5, 10, 20, 50, 100, 200, 500]` (milliseconds)

**Usage**:
```typescript
const commissionCalculationDuration = new Histogram({
  name: 'o4o_commission_calculation_duration_ms',
  help: 'Time taken to calculate commission (including policy resolution)',
  buckets: [5, 10, 20, 50, 100, 200, 500]
});

// Record metric
commissionCalculationDuration.observe(Date.now() - startTime);
```

**Queries**:
```promql
# P95 calculation time
histogram_quantile(0.95, sum by (le) (
  rate(o4o_commission_calculation_duration_ms_bucket[5m])
))
```

---

### 5. Commission Calculation Total (Counter)

**Name**: `o4o_commission_calculation_total`
**Type**: Counter
**Help**: Total commission calculations
**Labels**:
- `cap_applied`: `none`, `min`, `max`

**Usage**:
```typescript
const commissionCalculationTotal = new Counter({
  name: 'o4o_commission_calculation_total',
  help: 'Total commission calculations',
  labelNames: ['cap_applied']
});

// Increment metric
commissionCalculationTotal.inc({ cap_applied: 'max' });
```

---

### 6. Policy Linkage Total (Counter)

**Name**: `o4o_policy_linkage_total`
**Type**: Counter
**Help**: Total policy linkage operations
**Labels**:
- `action`: `link`, `unlink`
- `entity_type`: `supplier`, `product`

**Usage**:
```typescript
const policyLinkageTotal = new Counter({
  name: 'o4o_policy_linkage_total',
  help: 'Total policy linkage operations',
  labelNames: ['action', 'entity_type']
});

// Increment metric
policyLinkageTotal.inc({ action: 'link', entity_type: 'supplier' });
```

---

## Alerts

### Alert Configuration

**Format**: Prometheus Alertmanager rules

**File**: `monitoring/alerts/policy-resolution.yml`

---

### Alert 1: High Policy Resolution Failure Rate

**Name**: `HighPolicyResolutionFailureRate`
**Severity**: `warning`
**Threshold**: > 5% of resolutions fail
**Duration**: 5 minutes

**Rule**:
```yaml
groups:
  - name: policy_resolution
    rules:
      - alert: HighPolicyResolutionFailureRate
        expr: |
          (sum(rate(o4o_policy_resolution_failures_total[5m]))
          / sum(rate(o4o_policy_resolution_total[5m])))
          * 100 > 5
        for: 5m
        labels:
          severity: warning
          component: policy_resolution
        annotations:
          summary: "High policy resolution failure rate"
          description: "{{ $value | humanizePercentage }} of policy resolutions are failing (safe mode triggered)"
```

**Action**: Investigate missing policies or configuration issues

---

### Alert 2: Policy Resolution Latency High

**Name**: `PolicyResolutionLatencyHigh`
**Severity**: `warning`
**Threshold**: P95 > 50ms
**Duration**: 5 minutes

**Rule**:
```yaml
- alert: PolicyResolutionLatencyHigh
  expr: |
    histogram_quantile(0.95, sum by (le) (
      rate(o4o_policy_resolution_duration_ms_bucket[5m])
    )) > 50
  for: 5m
  labels:
    severity: warning
    component: policy_resolution
  annotations:
    summary: "Policy resolution P95 latency high"
    description: "P95 policy resolution time is {{ $value }}ms (target: <10ms)"
```

**Action**: Investigate database performance, add indexes, enable caching

---

### Alert 3: Policy Resolution Error Spike

**Name**: `PolicyResolutionErrorSpike`
**Severity**: `critical`
**Threshold**: > 10 errors in 1 minute
**Duration**: 1 minute

**Rule**:
```yaml
- alert: PolicyResolutionErrorSpike
  expr: |
    sum(increase(o4o_policy_resolution_failures_total{reason="db_error"}[1m])) > 10
  for: 1m
  labels:
    severity: critical
    component: policy_resolution
  annotations:
    summary: "Policy resolution error spike"
    description: "{{ $value }} database errors in last 1 minute"
```

**Action**: Check database health, connection pool, query timeouts

---

### Alert 4: Commission Calculation Slow

**Name**: `CommissionCalculationSlow`
**Severity**: `warning`
**Threshold**: P95 > 100ms
**Duration**: 5 minutes

**Rule**:
```yaml
- alert: CommissionCalculationSlow
  expr: |
    histogram_quantile(0.95, sum by (le) (
      rate(o4o_commission_calculation_duration_ms_bucket[5m])
    )) > 100
  for: 5m
  labels:
    severity: warning
    component: commission_calculation
  annotations:
    summary: "Commission calculation P95 latency high"
    description: "P95 calculation time is {{ $value }}ms (target: <50ms)"
```

**Action**: Investigate policy resolution, database writes, or calculation logic

---

### Alert 5: No Default Policy Active

**Name**: `NoDefaultPolicyActive`
**Severity**: `critical`
**Threshold**: 0 default policies active
**Duration**: Immediate

**Rule**:
```yaml
- alert: NoDefaultPolicyActive
  expr: |
    count(commission_policies{policyType="DEFAULT", status="active"}) == 0
  for: 0m
  labels:
    severity: critical
    component: policy_management
  annotations:
    summary: "No default policy active"
    description: "No active DEFAULT policy found - all orders will fail to 0% commission"
```

**Action**: Activate default policy immediately

---

## Dashboards

### Grafana Dashboard: Policy Resolution

**Panels**:

1. **Policy Resolution Rate** (Graph)
   - Query: `sum(rate(o4o_policy_resolution_total[5m])) by (resolution_level)`
   - Type: Stacked area chart
   - Unit: resolutions/sec

2. **Policy Resolution Latency** (Graph)
   - Query: `histogram_quantile(0.95, sum by (resolution_level, le) (rate(o4o_policy_resolution_duration_ms_bucket[5m])))`
   - Type: Line chart
   - Unit: milliseconds
   - Legend: P95 by level

3. **Policy Resolution Success Rate** (Gauge)
   - Query: `(1 - (sum(rate(o4o_policy_resolution_failures_total[5m])) / sum(rate(o4o_policy_resolution_total[5m])))) * 100`
   - Type: Gauge
   - Unit: %
   - Thresholds: <95% (red), 95-99% (yellow), >99% (green)

4. **Policy Distribution** (Pie Chart)
   - Query: `sum by (resolution_level) (rate(o4o_policy_resolution_total[5m]))`
   - Type: Pie chart
   - Shows: % of resolutions by level

5. **Failure Reasons** (Bar Chart)
   - Query: `sum by (reason) (rate(o4o_policy_resolution_failures_total[5m]))`
   - Type: Bar chart
   - Unit: failures/sec

6. **Commission Calculation Time** (Graph)
   - Query: `histogram_quantile(0.95, sum by (le) (rate(o4o_commission_calculation_duration_ms_bucket[5m])))`
   - Type: Line chart
   - Unit: milliseconds

---

### Grafana Dashboard: Commission Calculations

**Panels**:

1. **Total Commissions Calculated** (Stat)
   - Query: `sum(increase(o4o_commission_calculation_total[1h]))`
   - Type: Stat
   - Unit: count

2. **Cap Application Rate** (Graph)
   - Query: `sum(rate(o4o_commission_calculation_total[5m])) by (cap_applied)`
   - Type: Stacked bar chart
   - Shows: How often min/max caps are applied

3. **Average Commission Rate** (Gauge)
   - Custom query from database
   - Shows: Average commission rate across all calculations

---

## Log Aggregation

### Log Storage

**Tool**: Elasticsearch or CloudWatch Logs

**Index Pattern**: `o4o-api-logs-*`

**Retention**: 90 days

---

### Log Queries

**Query 1: Find all safe mode triggers**
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "event": "policy_resolution_failure" } },
        { "match": { "fallback": "safe_mode_0_percent" } }
      ]
    }
  }
}
```

**Query 2: Find all policy resolutions for specific order**
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "event": "policy_resolution" } },
        { "match": { "orderId": "ord_xyz789" } }
      ]
    }
  }
}
```

**Query 3: Find slow policy resolutions (>50ms)**
```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "event": "policy_resolution" } },
        { "range": { "resolutionTimeMs": { "gt": 50 } } }
      ]
    }
  }
}
```

---

## Health Checks

### API Health Endpoint

**Endpoint**: `GET /health/policy-resolution`

**Response**:
```json
{
  "status": "healthy",
  "checks": {
    "policyResolution": {
      "status": "healthy",
      "lastSuccessfulResolution": "2025-11-07T11:30:00Z",
      "avgResolutionTimeMs": 4.2,
      "successRate": 99.8
    },
    "defaultPolicyActive": {
      "status": "healthy",
      "policyId": "pol_default_2025",
      "policyCode": "DEFAULT-2025"
    },
    "database": {
      "status": "healthy",
      "latencyMs": 2.1
    }
  }
}
```

---

## Operational Runbook

### Runbook 1: High Failure Rate

**Alert**: `HighPolicyResolutionFailureRate`

**Steps**:
1. Check logs for `policy_resolution_failure` events
2. Identify most common `reason` (no_policy_found, all_expired, etc.)
3. If `no_policy_found`:
   - Check if default policy is active
   - Check if suppliers have policies linked
4. If `all_expired`:
   - Renew policies via Admin UI
   - Check `endDate` fields
5. If `db_error`:
   - Check database health
   - Check connection pool

---

### Runbook 2: High Latency

**Alert**: `PolicyResolutionLatencyHigh`

**Steps**:
1. Check P95/P99 latencies by resolution level
2. Identify slow level (product, supplier, tier, default)
3. Check database indexes:
   - `idx_suppliers_policy_id`
   - `idx_products_policy_id`
   - `idx_commission_policies_lookup`
4. Check database query logs for slow queries
5. Consider enabling Redis caching for policies

---

### Runbook 3: No Default Policy

**Alert**: `NoDefaultPolicyActive`

**Steps**:
1. **CRITICAL**: Activate default policy immediately
2. SQL:
   ```sql
   UPDATE commission_policies
   SET status = 'active'
   WHERE policyType = 'DEFAULT'
   ORDER BY createdAt DESC
   LIMIT 1;
   ```
3. If no default policy exists:
   ```sql
   INSERT INTO commission_policies (id, policyCode, policyType, commissionType, commissionRate, status)
   VALUES (gen_random_uuid(), 'DEFAULT-EMERGENCY', 'DEFAULT', 'PERCENTAGE', 10.00, 'active');
   ```
4. Notify admin team

---

## Testing Monitoring

### Metric Validation Tests

**Test**: Verify metrics are collected
```typescript
it('should increment policy resolution counter', async () => {
  const before = await getMetricValue('o4o_policy_resolution_total', { resolution_level: 'supplier' });

  await policyResolutionService.resolve(context);

  const after = await getMetricValue('o4o_policy_resolution_total', { resolution_level: 'supplier' });
  expect(after).toBe(before + 1);
});
```

---

### Log Validation Tests

**Test**: Verify structured logs are emitted
```typescript
it('should emit policy_resolution log', async () => {
  const logs = await captureLogsDuring(async () => {
    await policyResolutionService.resolve(context);
  });

  expect(logs).toContainEqual(expect.objectContaining({
    event: 'policy_resolution',
    level: 'info',
    orderId: context.orderId,
    appliedPolicy: expect.objectContaining({
      level: 'supplier'
    })
  }));
});
```

---

## Success Criteria

- [ ] Structured logs emitted for all policy resolution events
- [ ] Prometheus metrics collected and exposed on `/metrics`
- [ ] Grafana dashboards created and displaying data
- [ ] Alerts configured in Prometheus Alertmanager
- [ ] Health check endpoint returns correct status
- [ ] Runbooks documented for common issues
- [ ] Log aggregation configured (Elasticsearch or CloudWatch)
- [ ] Metric validation tests pass
- [ ] Log validation tests pass

---

## Version History

- **1.0** (2025-11-07): Initial monitoring and logging design for Phase 8

---

*Generated with [Claude Code](https://claude.com/claude-code)*
