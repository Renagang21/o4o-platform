# Analytics Deployment Plan
**Phase 7 - Partner Analytics**
**Created**: 2025-11-07
**Branch**: `feat/phase7-partner-analytics`

---

## Pre-Deployment Checklist

- [x] All code committed to feature branch
- [x] Feature branch pushed to GitHub
- [x] API implementation complete (3 endpoints)
- [x] Frontend UI complete (4 cards, 2 charts)
- [x] Documentation complete (KPIs, API Spec, Validation)
- [ ] All tests passed (see ANALYTICS_VALIDATION.md)
- [ ] Pull request created
- [ ] Code review completed
- [ ] Merge approved

---

## Deployment Strategy

### Option A: Gradual Rollout (Recommended)
1. **Dev Environment** (immediate)
2. **Staging Environment** (after 1 day)
3. **Production - 10% partners** (feature flag, after 2 days)
4. **Production - 100% partners** (after 7 days, no issues)

### Option B: Full Deployment (Fast-track)
1. Merge to main
2. Deploy API + Frontend together
3. Monitor for 24h
4. Rollback if critical issues

**Recommendation**: Option A for safer rollout

---

## Step-by-Step Deployment

### Step 1: Create Pull Request

```bash
# Already done - branch pushed to GitHub
# PR URL: https://github.com/Renagang21/o4o-platform/pull/new/feat/phase7-partner-analytics
```

**PR Description Template**:
```markdown
## Phase 7: Partner Analytics

### Summary
Implements comprehensive partner analytics with 8 KPIs, time-series charts, and conversion funnel visualization.

### Changes
- **API**: 3 new endpoints under `/api/v1/analytics/partner`
- **Frontend**: Analytics tab in Partner Dashboard with 4 KPI cards + 2 charts
- **Documentation**: KPI definitions, API spec, validation guide

### Testing
- [ ] All 19 test cases passed (see `docs/ANALYTICS_VALIDATION.md`)
- [ ] API endpoints return correct data
- [ ] Frontend renders without errors
- [ ] No performance regression

### Deployment Notes
- No database migrations required (uses existing tables)
- No breaking changes to existing APIs
- Feature can be hidden with `defaultTab='overview'` if needed

### Risks
- None (read-only analytics, no data mutations)

### Rollback Plan
- Revert PR merge
- No data cleanup needed (read-only)
```

---

### Step 2: Code Review

**Reviewers**:
- Backend: Review PartnerAnalyticsController.ts, route registration
- Frontend: Review React components, API service, hooks
- DevOps: Review no infrastructure changes needed

**Review Checklist**:
- [ ] TypeScript types are correct
- [ ] No hardcoded values
- [ ] Error handling present
- [ ] Authorization checks in place
- [ ] No console.log statements
- [ ] Comments explain complex logic
- [ ] Performance considerations addressed

---

### Step 3: Merge to Main

```bash
# After PR approval
git checkout main
git pull origin main
git merge feat/phase7-partner-analytics
git push origin main
```

---

### Step 4: Deploy API Server

**Automatic Deployment** (via GitHub Actions):
- Trigger: Push to `main` branch
- Workflow: `.github/workflows/deploy-api.yml`
- Time: ~2-3 minutes
- Process: git pull → pnpm install → build → pm2 restart

**Verify API Deployment**:
```bash
# Check PM2 process
ssh o4o-api "pm2 list"

# Test API endpoint
curl -s https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=me&range=last_30d \
  -H "Authorization: Bearer <token>" | jq .

# Expected: 200 OK with analytics data
```

**Rollback API** (if needed):
```bash
ssh o4o-api
cd /home/ubuntu/o4o-platform
git reset --hard HEAD~1  # Revert to previous commit
pnpm install && pnpm run build:api
pm2 restart o4o-api-server
```

---

### Step 5: Deploy Main Site (Frontend)

**Manual Deployment** (Main Site requires manual build):
```bash
# On local machine
ssh o4o-web
cd /home/ubuntu/o4o-platform

# Pull latest code
git pull origin main

# Build main site
cd apps/main-site
pnpm install
pnpm run build

# Copy to web root (requires sudo)
sudo rsync -av --delete dist/ /var/www/neture.co.kr/
sudo chown -R www-data:www-data /var/www/neture.co.kr/

# Verify
curl -s https://neture.co.kr/version.json
```

**Verify Frontend Deployment**:
1. Open https://neture.co.kr/partner/dashboard
2. Login as partner
3. Click "📊 분석" tab
4. Verify all components render
5. Check browser console for errors

**Rollback Frontend** (if needed):
```bash
ssh o4o-web
cd /home/ubuntu/o4o-platform
git reset --hard HEAD~1
cd apps/main-site && pnpm install && pnpm run build
sudo rsync -av --delete dist/ /var/www/neture.co.kr/
```

---

## Feature Flag Configuration (Optional)

### Environment Variables

Add to API `.env`:
```bash
# Phase 7 Feature Flags
ENABLE_PARTNER_ANALYTICS=true
ANALYTICS_ATTRIBUTION_DAYS=30
```

### Usage in Code
```typescript
// In PartnerDashboard.tsx
const analyticsEnabled = process.env.VITE_ENABLE_ANALYTICS !== 'false';

{analyticsEnabled && (
  <button onClick={() => setActiveTab('analytics')}>
    📊 분석
  </button>
)}
```

---

## Monitoring Setup

### 1. API Metrics (Prometheus)

Add to `prometheus-metrics.service.ts`:
```typescript
// Analytics endpoint metrics
const analyticsRequestDuration = new Histogram({
  name: 'analytics_request_duration_seconds',
  help: 'Analytics API request duration',
  labelNames: ['endpoint', 'partnerId']
});

const analyticsErrorCount = new Counter({
  name: 'analytics_errors_total',
  help: 'Total analytics API errors',
  labelNames: ['endpoint', 'error_code']
});
```

### 2. Grafana Dashboard

Create dashboard with panels:
- **API Response Times**: P50, P95, P99
- **Request Count**: by endpoint
- **Error Rate**: by error code
- **Cache Hit Rate**: (future Redis integration)
- **Top Partners**: by request volume

### 3. Alerting Rules

```yaml
# alerts/analytics.yml
groups:
  - name: analytics_alerts
    interval: 30s
    rules:
      - alert: AnalyticsHighLatency
        expr: histogram_quantile(0.95, analytics_request_duration_seconds) > 0.5
        for: 5m
        annotations:
          summary: "Analytics API P95 latency > 500ms"

      - alert: AnalyticsHighErrorRate
        expr: rate(analytics_errors_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Analytics error rate > 5%"
```

### 4. Log Monitoring

**Search for errors**:
```bash
ssh o4o-api
pm2 logs o4o-api-server --lines 100 | grep -i "analytics\|ERR_ANALYTICS"
```

**Key log patterns to monitor**:
- `ERR_ANALYTICS_FORBIDDEN`: Authorization failures
- `ERR_ANALYTICS_INTERNAL`: Database/query errors
- `ERR_ANALYTICS_TIMEOUT`: Slow queries

---

## Performance Monitoring

### 1. Initial Baseline

After deployment, collect baseline metrics:
```bash
# API response times (100 requests)
ab -n 100 -c 10 -H "Authorization: Bearer <token>" \
  "https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=me&range=last_30d"

# Expected:
# P50: < 50ms
# P95: < 150ms
# P99: < 300ms
```

### 2. Continuous Monitoring

**Daily checks**:
- [ ] API error rate < 1%
- [ ] P95 response time within SLA
- [ ] No memory leaks (check PM2 memory usage)
- [ ] No database connection pool exhaustion

**Weekly checks**:
- [ ] Review Grafana dashboards
- [ ] Check for slow query logs
- [ ] Analyze partner usage patterns
- [ ] Plan capacity scaling if needed

---

## Post-Deployment Verification

### Smoke Tests (15 minutes)

1. **API Endpoints**:
   ```bash
   # Summary
   curl https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=me&range=last_30d \
     -H "Authorization: Bearer <token>"

   # Timeseries
   curl "https://api.neture.co.kr/api/v1/analytics/partner/timeseries?metric=commission&interval=day&from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z" \
     -H "Authorization: Bearer <token>"

   # Funnel
   curl "https://api.neture.co.kr/api/v1/analytics/partner/funnel?from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z" \
     -H "Authorization: Bearer <token>"
   ```

2. **Frontend**:
   - Login as partner
   - Navigate to Analytics tab
   - Verify all cards render
   - Change date range (7d → 30d → 90d)
   - Check browser console for errors

3. **Authorization**:
   - Partner A cannot view Partner B's data
   - Admin can view any partner's data

### Full Regression Tests (1 hour)

Run all 19 tests from `ANALYTICS_VALIDATION.md`:
- [ ] API endpoint tests (3)
- [ ] Frontend UI tests (4)
- [ ] Authorization tests (2)
- [ ] Performance tests (2)
- [ ] Numerical validation (2)
- [ ] Regression tests (1)
- [ ] Integration tests (1)
- [ ] Browser/mobile tests (2)
- [ ] Security tests (2)

---

## Rollback Procedures

### Scenario 1: Critical Bug Found

**Immediate rollback**:
```bash
# API
ssh o4o-api "cd /home/ubuntu/o4o-platform && git reset --hard HEAD~1 && pnpm run build:api && pm2 restart o4o-api-server"

# Frontend
ssh o4o-web "cd /home/ubuntu/o4o-platform && git reset --hard HEAD~1 && cd apps/main-site && pnpm run build && sudo rsync -av --delete dist/ /var/www/neture.co.kr/"
```

### Scenario 2: Performance Degradation

**Disable analytics temporarily**:
```bash
# Option 1: Hide tab in frontend (quick fix)
# Modify PartnerDashboard.tsx to hide analytics tab

# Option 2: Return 503 from API (graceful)
# Add maintenance mode check in analytics routes
```

### Scenario 3: Database Issues

**Analytics is read-only**, so no data corruption risk. If DB queries are slow:
```bash
# Check database connections
ssh o4o-api "pm2 logs o4o-api-server --lines 50 | grep 'database\|typeorm'"

# Restart API server
ssh o4o-api "pm2 restart o4o-api-server"
```

---

## Success Criteria

**After 24 hours**:
- [ ] Zero critical errors
- [ ] < 1% API error rate
- [ ] P95 response time within SLA
- [ ] No partner complaints
- [ ] Positive user feedback

**After 7 days**:
- [ ] Sustained good performance
- [ ] No rollbacks required
- [ ] Feature used by > 80% of partners
- [ ] Ready for 100% rollout

---

## Communication Plan

### Internal Team

**Before Deployment**:
- Notify team in Slack: "#engineering"
- Schedule: "Phase 7 Analytics deployment starting at [TIME]"
- Expected duration: 30 minutes
- Impact: None (new feature, no breaking changes)

**After Deployment**:
- Post completion message
- Share metrics dashboard link
- Document any issues encountered

### Partners (External)

**Announcement**:
```markdown
🎉 New Feature: Partner Analytics Dashboard

We're excited to announce our new Analytics Dashboard!

📊 Track your performance with:
- Real-time KPIs (clicks, conversions, earnings)
- Commission trend charts
- Conversion funnel visualization
- Period comparisons

Access it now: Dashboard → 📊 분석 tab

Learn more: [Link to help docs]
```

---

## Known Issues & Workarounds

### Issue 1: Zero-Data Display
**Symptom**: Charts show "데이터가 없습니다" for new partners
**Expected**: Normal behavior until partner generates traffic
**Workaround**: None needed, working as designed

### Issue 2: Cache Staleness
**Symptom**: Metrics don't update immediately
**Expected**: 30-second cache TTL by design
**Workaround**: Wait 30s or hard refresh (Ctrl+Shift+R)

---

## Future Improvements (Post-MVP)

### Phase 7.1: Enhanced Analytics
- [ ] Redis caching layer
- [ ] CSV export functionality
- [ ] Email weekly reports
- [ ] Custom date range picker
- [ ] More metrics (ROAS, LTV, cohort analysis)

### Phase 7.2: Optimization
- [ ] Database query optimization
- [ ] Materialized views for aggregations
- [ ] CDN for frontend assets
- [ ] Rate limiting by partner tier

---

## Deployment Sign-Off

| Stage | Date | Status | Notes |
|-------|------|--------|-------|
| Code Complete | 2025-11-07 | ✅ | All 6 steps done |
| Testing Complete | - | Pending | Run ANALYTICS_VALIDATION.md |
| PR Created | - | Pending | Create PR on GitHub |
| Code Review | - | Pending | Backend + Frontend review |
| Merge Approved | - | Pending | At least 1 approval |
| API Deployed | - | Pending | GitHub Actions auto-deploy |
| Frontend Deployed | - | Pending | Manual build on o4o-web |
| Smoke Tests Pass | - | Pending | 15-min verification |
| 24h Monitoring | - | Pending | Check metrics daily |
| Production Ready | - | Pending | After 7 days stable |

---

## Contact & Support

- **Developer**: Claude (AI Assistant)
- **Code Review**: TBD
- **DevOps**: TBD
- **On-Call**: TBD

**Emergency Rollback**: See "Rollback Procedures" section above

---

*Generated with [Claude Code](https://claude.com/claude-code)*
