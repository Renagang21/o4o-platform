# Shadow Mode Implementation - Phase 8 Policy Engine

## Overview

Shadow mode enables gradual rollout and comparison between legacy commission calculation and the new policy engine. When `ENABLE_SUPPLIER_POLICY=false`, the system runs both calculations in parallel:
- **Primary Path**: Legacy calculation (10% flat rate) → DB write
- **Shadow Path**: Policy engine → No DB write, only logs and metrics

## Implementation Summary

### 1. Shadow Mode Service
**File**: `/home/sohae21/o4o-platform/apps/api-server/src/services/shadow-mode.service.ts`

**Key Features**:
- Runs policy engine in parallel with legacy calculation
- Calculates difference between legacy and policy results
- Logs structured comparison data
- Records metrics for monitoring
- Error handling: Non-blocking (shadow failures don't affect primary path)

**Methods**:
- `runShadowComparison(request, legacyCommission)`: Main comparison logic
- `isShadowModeEnabled()`: Check if shadow mode is active

**Comparison Log Format**:
```json
{
  "orderId": "order-123",
  "orderItemId": "item-456",
  "partnerId": "partner-789",
  "legacyCommission": 1000,
  "policyCommission": 1200,
  "diff": 200,
  "diffPercent": 20.00,
  "policyResolutionLevel": "supplier",
  "shadowExecutionTimeMs": 15
}
```

### 2. Settlement Service Updates
**File**: `/home/sohae21/o4o-platform/apps/api-server/src/services/SettlementService.ts`

**Changes**:
- Added feature flag check in `calculateCommission()`
- Split calculation into two paths:
  - `calculateWithShadowMode()`: Legacy + shadow comparison
  - `calculateWithPolicyEngine()`: Full policy engine (existing)
- Fire-and-forget shadow comparison (async, error-caught)

**Legacy Calculation**:
```typescript
// Simple 10% flat rate baseline
const legacyCommission = orderTotal * 0.10;
```

### 3. Metrics Service Updates
**File**: `/home/sohae21/o4o-platform/apps/api-server/src/services/metrics.service.ts`

**New Metrics**:
1. `shadow_mode_comparison_total{status=match|mismatch|error}` (Counter)
   - Tracks comparison outcomes

2. `shadow_mode_diff_absolute{status=match|mismatch}` (Histogram)
   - Tracks absolute difference in commission amounts
   - Buckets: [0.01, 0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000] KRW

**Method**:
- `recordShadowModeComparison({ status, diffAbsolute })`

### 4. Test Coverage
**File**: `/home/sohae21/o4o-platform/apps/api-server/src/services/__tests__/shadow-mode.service.test.ts`

**Test Cases**:
- Shadow mode enabled/disabled detection
- Comparison with matching results
- Error handling (policy resolution failures)
- Zero commission handling

## Usage

### Enable Shadow Mode
```bash
# Disable supplier policy to enable shadow mode
export ENABLE_SUPPLIER_POLICY=false
```

### Monitor Shadow Mode
```bash
# Check metrics endpoint
curl http://localhost:4000/metrics | grep shadow_mode

# Expected output:
# shadow_mode_comparison_total{status="match"} 150
# shadow_mode_comparison_total{status="mismatch"} 25
# shadow_mode_comparison_total{status="error"} 2
```

### View Comparison Logs
```bash
# Check application logs for shadow comparisons
tail -f /var/log/o4o/api-server.log | grep ShadowMode

# Expected log format:
# [ShadowMode] Comparison completed {
#   "orderId": "...",
#   "legacyCommission": 1000,
#   "policyCommission": 1200,
#   "diff": 200,
#   "diffPercent": 20.00,
#   ...
# }
```

## Rollout Strategy

### Phase 1: Shadow Mode (Current)
1. Deploy with `ENABLE_SUPPLIER_POLICY=false`
2. Monitor shadow mode metrics for 1-2 weeks
3. Analyze comparison logs for discrepancies
4. Investigate and fix any mismatches

### Phase 2: Gradual Rollout
1. Enable for specific partners/products (future enhancement)
2. Monitor error rates and commission accuracy
3. Expand coverage gradually

### Phase 3: Full Rollout
1. Set `ENABLE_SUPPLIER_POLICY=true`
2. Policy engine becomes primary path
3. Shadow mode disabled

## Key Design Decisions

### 1. Non-Blocking Shadow Path
- Shadow mode errors do NOT affect primary calculation
- Uses fire-and-forget pattern with `.catch()`
- Logs warnings but continues processing

### 2. Legacy Baseline
- Uses simple 10% flat rate as baseline
- Can be replaced with actual legacy logic if needed
- Ensures consistent comparison baseline

### 3. Structured Logging
- All comparisons logged with full context
- Easy to query and analyze with log aggregation tools
- Includes timing information for performance analysis

### 4. Prometheus Metrics
- Real-time monitoring via `/metrics` endpoint
- Histogram buckets optimized for KRW amounts
- Separate counters for match/mismatch/error states

## Files Modified/Created

### Created
1. `/home/sohae21/o4o-platform/apps/api-server/src/services/shadow-mode.service.ts`
2. `/home/sohae21/o4o-platform/apps/api-server/src/services/__tests__/shadow-mode.service.test.ts`
3. `/home/sohae21/o4o-platform/docs/SHADOW_MODE_IMPLEMENTATION.md`

### Modified
1. `/home/sohae21/o4o-platform/apps/api-server/src/services/SettlementService.ts`
   - Added shadow mode path
   - Split calculation logic
   - Added feature flag check

2. `/home/sohae21/o4o-platform/apps/api-server/src/services/metrics.service.ts`
   - Added shadow mode metrics (counter + histogram)
   - Added `recordShadowModeComparison()` method

## Success Criteria

✅ **Build**: TypeScript compilation succeeds
✅ **Shadow Mode**: Runs without affecting primary calculation
✅ **Logging**: Structured comparison logs include all required fields
✅ **Metrics**: Prometheus metrics exposed via `/metrics` endpoint
✅ **No DB Writes**: Shadow path does not write to database
✅ **Error Handling**: Shadow failures are non-blocking

## Next Steps

1. **Deploy**: Push changes to API server
2. **Monitor**: Watch shadow mode metrics for 1-2 weeks
3. **Analyze**: Review comparison logs for discrepancies
4. **Iterate**: Fix any policy engine bugs discovered
5. **Enable**: Set `ENABLE_SUPPLIER_POLICY=true` when confident

---

**Created**: 2025-01-07
**Phase**: 8 - Policy Engine Shadow Mode
**Status**: Ready for deployment
