# Prometheus Metrics Duplication Prevention Guide

## Overview

This document outlines the critical rules and patterns for preventing Prometheus metrics duplication errors in the o4o-platform API server.

## Problem Context

**Error**: `A metric with the name <metric_name> has already been registered`

This error occurs when:
1. Multiple services try to register the same metric name
2. `collectDefaultMetrics()` is called multiple times
3. Services are re-initialized without proper singleton guards

## Critical Rules

### 1. Single Registry Rule

**Rule**: Use ONE shared `Registry` instance across all metrics services.

```typescript
// ✅ CORRECT: Single registry
class PrometheusMetricsService {
  public registry: promClient.Registry; // Shared with HttpMetricsService

  private constructor() {
    this.registry = new promClient.Registry();
  }
}

const httpMetrics = HttpMetricsService.getInstance(prometheusMetrics.registry);

// ❌ INCORRECT: Multiple registries
const registry1 = new promClient.Registry();
const registry2 = new promClient.Registry(); // Creates duplication issues
```

### 2. Default Metrics Collection Rule

**Rule**: Call `collectDefaultMetrics()` ONLY ONCE per application lifecycle.

```typescript
// ✅ CORRECT: Guarded with static flag
class PrometheusMetricsService {
  private static defaultMetricsCollected = false;

  private constructor() {
    if (!PrometheusMetricsService.defaultMetricsCollected) {
      promClient.collectDefaultMetrics({ register: this.registry });
      PrometheusMetricsService.defaultMetricsCollected = true;
      logger.info('✅ Default Prometheus metrics collection started');
    }
  }
}

// ❌ INCORRECT: Unguarded call
private constructor() {
  promClient.collectDefaultMetrics({ register: this.registry }); // Duplicates on re-init
}
```

### 3. Metric Reuse Rule

**Rule**: Always check if a metric exists before creating a new one.

```typescript
// ✅ CORRECT: Get or create pattern
const getOrCreateMetric = <T>(MetricClass: any, config: any): T => {
  try {
    const existing = registry.getSingleMetric(config.name);
    if (existing) {
      logger.info(`♻️  Reusing existing metric: ${config.name}`);
      return existing as T;
    }
  } catch (e) {
    // Metric doesn't exist, create new one
  }
  return new MetricClass(config) as T;
};

this.cacheHitsTotal = getOrCreateMetric<promClient.Counter>(promClient.Counter, {
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['layer', 'type'],
  registers: [registry],
});

// ❌ INCORRECT: Direct creation without check
this.cacheHitsTotal = new promClient.Counter({
  name: 'cache_hits_total', // Fails if already registered
  // ...
});
```

### 4. Single Metric Definition Rule

**Rule**: Each metric name should be defined in ONE service only.

```typescript
// ✅ CORRECT: Cache metrics defined only in HttpMetricsService
class HttpMetricsService {
  private cacheHitsTotal: promClient.Counter;
  private cacheMissesTotal: promClient.Counter;
}

class PrometheusMetricsService {
  // Cache metrics removed - no duplication
}

// ❌ INCORRECT: Same metric in multiple services
class HttpMetricsService {
  private cacheHitsTotal: promClient.Counter; // Defined here
}

class PrometheusMetricsService {
  private cacheHitsTotal: promClient.Counter; // AND here - DUPLICATION!
}
```

### 5. Label Consistency Rule

**Rule**: Labels must be consistent across all observations of the same metric.

```typescript
// ✅ CORRECT: Consistent labels
this.cacheHitsTotal.inc({ layer: 'L1', type: 'product' });
this.cacheHitsTotal.inc({ layer: 'L2', type: 'vendor' });

// ❌ INCORRECT: Inconsistent labels
this.cacheHitsTotal.inc({ layer: 'L1', type: 'product' });
this.cacheHitsTotal.inc({ cache_type: 'product' }); // Different label name!
```

## Verification Checklist

After implementing metrics changes, verify:

- [ ] Server starts without metric registration errors
- [ ] `/metrics` endpoint returns HTTP 200
- [ ] Server can restart multiple times (test 3+ times) without errors
- [ ] `pm2 logs` shows no "already been registered" errors
- [ ] Metric values are being collected correctly
- [ ] No duplicate metric names in `/metrics` output

## Testing Commands

```bash
# 1. Build the project
pnpm run build:packages && cd apps/api-server && pnpm run build

# 2. Start server
pm2 restart o4o-api-server

# 3. Check logs for errors
pm2 logs o4o-api-server --lines 50 | grep -i "error\|already"

# 4. Test metrics endpoint
curl -s https://api.neture.co.kr/metrics | head -100

# 5. Restart again (test idempotency)
pm2 restart o4o-api-server && sleep 5
pm2 logs o4o-api-server --lines 30 | grep -i "error\|already"

# 6. Check health
curl -s https://api.neture.co.kr/health
```

## Forbidden Patterns

### ❌ DO NOT: Create new Registry in multiple places

```typescript
// BAD
class ServiceA {
  constructor() {
    this.registry = new promClient.Registry(); // First registry
  }
}

class ServiceB {
  constructor() {
    this.registry = new promClient.Registry(); // Second registry - WRONG!
  }
}
```

### ❌ DO NOT: Call collectDefaultMetrics() multiple times

```typescript
// BAD
promClient.collectDefaultMetrics({ register: registry1 });
promClient.collectDefaultMetrics({ register: registry2 }); // Duplicate!
```

### ❌ DO NOT: Define the same metric in multiple services

```typescript
// BAD
// In ServiceA:
new promClient.Counter({ name: 'requests_total', ... });

// In ServiceB:
new promClient.Counter({ name: 'requests_total', ... }); // Duplicate!
```

## Recovery Steps

If you encounter duplication errors in production:

1. **Immediate**: Restart the server to clear in-memory state
   ```bash
   pm2 restart o4o-api-server
   ```

2. **Short-term**: Disable problematic metrics if needed
   ```typescript
   // Temporarily comment out duplicate metric registration
   // this.cacheHitsTotal = new promClient.Counter({ ... });
   ```

3. **Long-term**: Apply the patterns in this guide
   - Implement `getOrCreateMetric()` helper
   - Add defaultMetricsCollected guard
   - Remove duplicate metric definitions

## References

- Prometheus Client Library: https://github.com/siimon/prom-client
- Implementation: `apps/api-server/src/middleware/metrics.middleware.ts`
- Implementation: `apps/api-server/src/services/prometheus-metrics.service.ts`
- Main setup: `apps/api-server/src/main.ts` (line 290-294)

## Changelog

- **2025-11-05**: Initial guide created after fixing critical duplication bug
- Fixed error: "A metric with the name cache_hits_total has already been registered"
- Implemented: Singleton pattern with metric reuse
