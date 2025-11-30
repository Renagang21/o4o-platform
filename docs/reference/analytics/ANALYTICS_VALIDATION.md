# Analytics Validation & Testing Guide
**Phase 7 - Partner Analytics**
**Created**: 2025-11-07
**Status**: Ready for Testing

---

## Test Environment Setup

### 1. API Server
- Branch: `feat/phase7-partner-analytics`
- Endpoint base: `/api/v1/analytics/partner`
- Authentication: JWT required
- Database: Uses existing zero-data from Sprint 2

### 2. Main Site (Frontend)
- Branch: `feat/phase7-partner-analytics`
- Component: Partner Dashboard → Analytics Tab
- React Query cache: 30s TTL

---

## API Endpoint Tests

### Test 1: Summary Endpoint

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=me&range=last_30d" \
  -H "Authorization: Bearer <partner_token>"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-10-08T00:00:00Z",
      "end": "2025-11-07T23:59:59Z",
      "days": 30
    },
    "metrics": {
      "clicks": { "value": 0, "change": 0, "changeType": "neutral" },
      "conversions": { "value": 0, "change": 0, "changeType": "neutral" },
      "cvr": { "value": 0, "unit": "percent", "change": 0, "changeType": "neutral" },
      "aov": { "value": 0, "unit": "KRW", "change": 0, "changeType": "neutral" },
      "epc": { "value": 0, "unit": "KRW", "change": 0, "changeType": "neutral" },
      "pendingExposure": {
        "value": 0,
        "unit": "KRW",
        "breakdown": { "scheduled": 0, "processing": 0, "pending": 0 }
      },
      "paidRate": { "value": 0, "unit": "percent", "amounts": { "confirmed": 0, "paid": 0 } },
      "returningRatio": { "value": 0, "unit": "percent", "breakdown": { "returning": 0, "total": 0 } }
    }
  }
}
```

**✅ Pass Criteria**:
- Status 200
- All 8 metrics present
- No NaN or undefined values
- Timezone is UTC
- Response < 150ms (P95)

---

### Test 2: Timeseries Endpoint

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/timeseries?metric=commission&interval=day&from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z&partnerId=me" \
  -H "Authorization: Bearer <partner_token>"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "metric": "commission",
    "interval": "day",
    "unit": "KRW",
    "period": { "start": "...", "end": "..." },
    "dataPoints": [],
    "summary": {
      "total": 0,
      "average": 0,
      "min": 0,
      "max": 0,
      "dataPointsCount": 0
    }
  }
}
```

**✅ Pass Criteria**:
- Status 200
- dataPoints array (may be empty for zero-data)
- summary stats present
- Response < 250ms (P95)

---

### Test 3: Funnel Endpoint

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/funnel?from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z&partnerId=me" \
  -H "Authorization: Bearer <partner_token>"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "period": { "start": "...", "end": "..." },
    "stages": [
      { "name": "clicks", "label": "클릭", "value": 0, "rate": 100.00, "dropoff": 0 },
      { "name": "conversions", "label": "전환", "value": 0, "rate": 0, "dropoff": 0 },
      { "name": "confirmed_commission", "label": "커미션 확정", "value": 0, "rate": 0, "dropoff": 0 },
      { "name": "paid", "label": "정산 완료", "value": 0, "rate": 0, "dropoff": 0 }
    ],
    "totals": {
      "clicks": 0,
      "conversions": 0,
      "confirmedCommission": { "count": 0, "amount": 0, "currency": "KRW" },
      "paid": { "count": 0, "amount": 0, "currency": "KRW" }
    }
  }
}
```

**✅ Pass Criteria**:
- Status 200
- 4 stages present
- Totals object complete
- Response < 200ms (P95)

---

## Frontend UI Tests

### Test 4: Analytics Tab Rendering

**Steps**:
1. Login as partner
2. Navigate to Partner Dashboard
3. Click "📊 분석" tab

**✅ Pass Criteria**:
- Tab switches without errors
- 4 KPI cards render (even with 0 values)
- Commission trend chart shows "데이터가 없습니다" for zero-data
- Conversion funnel chart shows "데이터가 없습니다" for zero-data
- Date range selector works (7d, 30d, 90d)
- No console errors

---

### Test 5: Data Loading States

**Steps**:
1. Open Analytics tab
2. Observe loading skeletons

**✅ Pass Criteria**:
- Skeleton loaders show during fetch
- Smooth transition to actual data
- No layout shift (CLS)
- Loading time < 2 seconds

---

### Test 6: Error Handling

**Steps**:
1. Disconnect from network
2. Try loading Analytics tab
3. Reconnect and retry

**✅ Pass Criteria**:
- Error message displays clearly
- Retry button works
- No infinite loading states
- No app crash

---

### Test 7: React Query Caching

**Steps**:
1. Load Analytics tab
2. Switch to Overview tab
3. Switch back to Analytics tab within 30s

**✅ Pass Criteria**:
- Data loads instantly (from cache)
- No new network request (check Network tab)
- Cache expires after 30s
- Fresh data fetched after expiry

---

## Authorization Tests

### Test 8: Partner Isolation

**Scenario**: Partner A tries to view Partner B's data

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=<partner_b_id>" \
  -H "Authorization: Bearer <partner_a_token>"
```

**✅ Pass Criteria**:
- Status 403 Forbidden
- Error code: `ERR_ANALYTICS_FORBIDDEN`
- Clear error message

---

### Test 9: Admin Access

**Scenario**: Admin views any partner's data

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=<any_partner_id>" \
  -H "Authorization: Bearer <admin_token>"
```

**✅ Pass Criteria**:
- Status 200
- Data returned for requested partner
- Admin can use `partnerId=me` (returns own partner data if exists)

---

## Performance Tests

### Test 10: API Response Times

**Tool**: Apache Bench or wrk
```bash
# Summary endpoint
ab -n 100 -c 10 -H "Authorization: Bearer <token>" \
  "https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=me&range=last_30d"
```

**✅ Pass Criteria**:
- P50: < 50ms
- P95: < 150ms
- P99: < 300ms
- No errors in 100 requests

---

### Test 11: Frontend Rendering Performance

**Tool**: Chrome DevTools Lighthouse

**✅ Pass Criteria**:
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1
- Performance score: > 90

---

## Numerical Validation Tests

### Test 12: KPI Calculation Accuracy

**Setup**: Create test data with known values
```sql
-- Insert 10 clicks, 2 conversions (20% CVR)
INSERT INTO referral_clicks (partnerId, status, createdAt, ...) VALUES (...);
INSERT INTO conversion_events (partnerId, status, orderAmount, createdAt, ...) VALUES (...);
```

**✅ Pass Criteria**:
- Clicks count: 10
- Conversions count: 2
- CVR: 20.00%
- AOV: (order1 + order2) / 2
- EPC: total_commission / 10

---

### Test 13: Edge Cases

**Test Cases**:
1. **Zero data**: All metrics = 0
2. **Single click, no conversions**: CVR = 0%, not NaN
3. **All conversions cancelled**: Should not count
4. **Date range with no data**: Empty arrays, not errors
5. **Very large date range (365 days)**: Still < 10s response time

**✅ Pass Criteria**: No errors, graceful handling

---

## Regression Tests

### Test 14: Existing Endpoints Still Work

**Endpoints to verify**:
- `/api/v1/entity/settlements` (Sprint 3)
- `/api/v1/dropshipping/partner/dashboard/summary` (existing)

**✅ Pass Criteria**:
- Status 200
- Same response format as before
- No performance degradation

---

## Integration Tests

### Test 15: Full User Journey

**Scenario**: Partner logs in and explores analytics

**Steps**:
1. Login as partner user
2. Navigate to Partner Dashboard
3. View Overview tab (existing metrics)
4. Switch to Analytics tab
5. Change date range to "최근 7일"
6. Verify all charts update
7. Change to "최근 90일"
8. Verify all charts update again

**✅ Pass Criteria**:
- No errors throughout journey
- All data updates correctly
- Smooth transitions
- Date range reflected in all components

---

## Browser Compatibility Tests

### Test 16: Cross-Browser Testing

**Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**✅ Pass Criteria**:
- All UI renders correctly
- Charts display properly
- No console errors
- Interactions work smoothly

---

## Mobile Responsiveness Tests

### Test 17: Mobile Layout

**Devices**:
- iPhone 12 (375x812)
- iPad (768x1024)
- Galaxy S21 (360x800)

**✅ Pass Criteria**:
- KPI cards stack vertically
- Charts are scrollable horizontally if needed
- Tab navigation works on touch
- Text is readable (no tiny fonts)

---

## Security Tests

### Test 18: SQL Injection Protection

**Attempt**: Malicious input in query params
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=me'; DROP TABLE partners--" \
  -H "Authorization: Bearer <token>"
```

**✅ Pass Criteria**:
- No database error
- Safe handling of input
- No data loss

---

### Test 19: XSS Protection

**Attempt**: Inject script in metric labels
```
<script>alert('XSS')</script>
```

**✅ Pass Criteria**:
- Script not executed
- Properly escaped in HTML
- React prevents XSS by default

---

## Test Execution Checklist

- [ ] Test 1-3: API Endpoints
- [ ] Test 4-7: Frontend UI
- [ ] Test 8-9: Authorization
- [ ] Test 10-11: Performance
- [ ] Test 12-13: Numerical Validation
- [ ] Test 14: Regression
- [ ] Test 15: Integration
- [ ] Test 16-17: Browser/Mobile
- [ ] Test 18-19: Security

---

## Known Issues & Limitations

### Current Limitations (Phase 7 MVP):
1. **No caching layer**: Direct DB queries (acceptable for MVP)
2. **No rate limiting**: Should add in production
3. **No real-time updates**: 30s cache TTL
4. **CSV export not implemented**: Deferred to Phase 7.1
5. **No custom date range picker**: Only presets (7d, 30d, 90d)

### Planned Improvements (Post-MVP):
1. Redis caching for frequently accessed data
2. Prometheus metrics for monitoring
3. Grafana dashboards for ops visibility
4. Rate limiting per partner tier
5. Email reports (weekly summaries)

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | Claude | 2025-11-07 | ✅ Complete |
| QA | - | - | Pending |
| Product | - | - | Pending |

---

## Next Steps (After Testing)

1. **If all tests pass**: Proceed to Step 6 (Deployment)
2. **If tests fail**: Document issues, fix, re-test
3. **Create JIRA tickets** for any bugs found
4. **Update API documentation** with any changes

---

*Generated with [Claude Code](https://claude.com/claude-code)*
