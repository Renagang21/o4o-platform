# Rollback Procedure: P0 User Refactor

**Version:** v2.0.0-p0
**Last Updated:** 2025-11-09
**Rollback Target:** Previous stable release (pre-P0)
**Estimated Time:** 15-30 minutes

---

## 🚨 When to Rollback

### Critical Rollback Triggers (Immediate)
- 🔴 **Authentication Broken**: Users cannot login (> 10% failure rate)
- 🔴 **Dashboard Inaccessible**: Approved users cannot access dashboards
- 🔴 **5xx Error Rate**: Server errors > 1% of requests
- 🔴 **Data Corruption**: Role assignments incorrectly created/deleted
- 🔴 **Security Breach**: Unauthorized access detected

### Warning-Level Issues (Evaluate)
- 🟡 **High 422 Rate**: Enrollment validation failures > 20%
- 🟡 **Admin Workflow Broken**: Approvals not working consistently
- 🟡 **Console Errors**: JavaScript errors affecting UX
- 🟡 **Performance Degradation**: Response times > 1s consistently

**Decision Matrix:**
- **Critical Issues**: Immediate rollback, no discussion needed
- **Warning Issues**: Evaluate impact → Decide within 30 minutes
- **Minor Issues**: Document and fix forward, no rollback

---

## ✅ Pre-Rollback Checklist

Before initiating rollback:

- [ ] **Confirm Issue Severity**: Is rollback truly necessary?
- [ ] **Document the Problem**: Capture error messages, logs, screenshots
- [ ] **Notify Stakeholders**: Alert team via Slack/email
- [ ] **Identify Affected Users**: How many users are impacted?
- [ ] **Check Database State**: No rollback needed for zero-data approach
- [ ] **Backup Current State**: Tag current deployment (for forensics)
- [ ] **Confirm Rollback Target**: Verify previous stable version

---

## 🔧 Rollback Methods

### Method 1: Frontend-Only Rollback (Fast - 5 minutes)

**When to Use:**
- Issue is purely in frontend (JavaScript errors, routing, UI bugs)
- API server is functioning correctly
- No database changes involved

**Steps:**

```bash
# 1. SSH to web server
ssh o4o-web

# 2. Identify previous version
cd /var/www/neture.co.kr.backup  # If backup exists
# OR
cd /home/ubuntu/o4o-platform
git log --oneline | head -10  # Find last stable commit

# 3. Revert main-site
cd /home/ubuntu/o4o-platform
git checkout <previous-stable-commit>
cd apps/main-site
npm run build
sudo cp -r dist/* /var/www/neture.co.kr/

# 4. Revert admin-dashboard
cd /home/ubuntu/o4o-platform/apps/admin-dashboard
npm run build
sudo cp -r dist/* /var/www/admin.neture.co.kr/

# 5. Verify deployment
curl -s https://neture.co.kr/ | head -20
curl -s https://admin.neture.co.kr/version.json

# 6. Test critical paths
# - Login
# - Dashboard access (for users who had access before)
```

**Time:** ~5-10 minutes
**Risk:** Low (no API/DB changes)

---

### Method 2: Route-Level Disable (Fastest - 2 minutes)

**When to Use:**
- Enrollment flow is broken but existing features work
- Need immediate mitigation while investigating
- Want to keep other P0 changes active

**Steps:**

```bash
# 1. SSH to web server
ssh o4o-web
cd /home/ubuntu/o4o-platform/apps/main-site

# 2. Edit App.tsx to comment out new routes
nano src/App.tsx

# Comment out these routes:
# - /apply/supplier
# - /apply/seller
# - /apply/partner
# - /apply/:role/status
# - /dashboard/supplier
# - /dashboard/seller
# - /dashboard/partner

# 3. Rebuild and deploy
npm run build
sudo cp -r dist/* /var/www/neture.co.kr/

# 4. Verify routes return 404
curl -s https://neture.co.kr/apply/supplier  # Should show 404
```

**Time:** ~2-5 minutes
**Risk:** Very low (surgical change)
**Limitation:** Navbar may still show links (requires full revert)

---

### Method 3: Full Rollback (Comprehensive - 30 minutes)

**When to Use:**
- Multiple components affected (frontend + backend)
- API changes causing issues
- Need complete revert to stable state

**Steps:**

```bash
# 1. Rollback API Server (if needed)
ssh o4o-api
cd /home/ubuntu/o4o-platform

# Find commit before Phase B
git log --oneline --all | grep -B5 "Phase B"
git checkout <commit-before-phase-b>

# Rebuild and restart
cd apps/api-server
pnpm install
pnpm run build
npx pm2 restart o4o-api-server

# Verify API health
curl https://api.neture.co.kr/health

# 2. Rollback Frontend (main-site)
ssh o4o-web
cd /home/ubuntu/o4o-platform
git checkout <commit-before-phase-c>

cd apps/main-site
npm install
npm run build
sudo cp -r dist/* /var/www/neture.co.kr/

# 3. Rollback Admin Dashboard
cd /home/ubuntu/o4o-platform/apps/admin-dashboard
npm install
npm run build
sudo cp -r dist/* /var/www/admin.neture.co.kr/

# 4. Verification (see below)
```

**Time:** ~20-30 minutes
**Risk:** Medium (full deployment revert)

---

## 🧪 Post-Rollback Verification

After rollback, verify these critical paths:

### 1. Authentication
```bash
# Test login endpoint
curl -X POST https://api.neture.co.kr/auth/v2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Expected: 200 OK with cookie
```

### 2. User Dashboard Access
- **Test**: Login as regular user
- **Navigate**: To their pre-existing dashboard
- **Verify**: No errors, all features work

### 3. Admin Dashboard Access
- **Test**: Login as admin
- **Navigate**: To admin dashboard
- **Verify**: All admin features functional

### 4. Critical User Flows
- [ ] User can login successfully
- [ ] User can access their authorized pages
- [ ] No console errors on page load
- [ ] No 5xx errors in network tab
- [ ] Session persists across page refreshes

### 5. Monitoring
```bash
# Check error rate (should drop to baseline)
sudo tail -f /var/log/nginx/access.log | grep -E "5[0-9]{2}"

# Check API server logs
ssh o4o-api
npx pm2 logs o4o-api-server --lines 50
```

---

## 📊 Database Considerations

### Zero-Data Approach (P0)
**Good News:** P0 used zero-data migration approach.

**What This Means:**
- ✅ No data migration to revert
- ✅ Existing user data untouched
- ✅ No database rollback needed

**Database State After Rollback:**
- `enrollments` table: May contain submitted applications (harmless)
- `role_assignments` table: May contain approved roles (harmless)
- `audit_log` table: Contains history (keep for forensics)

**Action Required:**
- ❌ **DO NOT** delete enrollment/assignment data
- ✅ **DO** keep database tables intact
- ✅ **DO** preserve audit logs

**Why:**
1. Tables are isolated (no foreign key dependencies on critical data)
2. Enrollment data valuable for post-mortem
3. Role assignments can be manually reviewed later
4. Future forward-fix can reuse the data

---

## 🔒 Security Considerations

### Critical: Prevent Security Regression

**Before Rollback:**
- [ ] Verify previous version doesn't have known security issues
- [ ] Check that rollback doesn't expose sensitive data
- [ ] Ensure authentication mechanisms remain secure

**During Rollback:**
- [ ] Don't expose database credentials in scripts
- [ ] Use secure channels for all operations (SSH keys)
- [ ] Audit all configuration changes

**After Rollback:**
- [ ] Verify httpOnly cookies still work (if previous version used them)
- [ ] Check CORS policies are correct
- [ ] Ensure no authentication bypass possible

**⚠️ WARNING: NEVER ROLLBACK SECURITY FIXES**
If P0 included security improvements, evaluate carefully:
- Can we fix-forward instead?
- Can we keep security fixes and revert only features?
- Is a hybrid approach (security + partial revert) feasible?

---

## 📞 Communication Plan

### Internal Communication

**Immediately Upon Decision to Rollback:**
```
Subject: [URGENT] P0 Rollback Initiated

Team,

We are initiating a rollback of the P0 User Refactor release due to [ISSUE].

Impact: [Describe user impact]
Rollback Method: [Method 1/2/3]
ETA: [XX minutes]
Status Updates: Every 10 minutes

Team Lead: [Name]
```

**During Rollback (Every 10 minutes):**
```
Update [X/Y]:
- Progress: [What's done]
- Next: [What's next]
- Issues: [Any blockers]
```

**Upon Completion:**
```
Subject: P0 Rollback Complete

Rollback completed at [TIME].

Status: ✅ Services restored
Verification: [Summary of checks]
Next Steps: [Post-mortem, fix plan]

Incident Report: [Link to doc]
```

### External Communication (If Needed)

**If Downtime > 5 minutes:**
- Post status page update: "Investigating issues with recent deployment"
- Notify high-value customers directly
- Update social media if public-facing

---

## 📝 Post-Rollback Actions

### Immediate (Within 1 hour)
1. ✅ **Document the Incident**
   - Create `docs/incidents/2025-11-09_p0_rollback.md`
   - Include: Timeline, root cause, impact, resolution

2. ✅ **Preserve Evidence**
   - Tag the failed deployment: `git tag failed/v2.0.0-p0`
   - Save logs: API server, Nginx, browser console
   - Export database state: `pg_dump enrollments role_assignments`

3. ✅ **Verify Stability**
   - Monitor for 1 hour post-rollback
   - Confirm error rates back to baseline
   - Check user reports/feedback

### Short-term (Within 24 hours)
1. 📋 **Root Cause Analysis (RCA)**
   - What went wrong?
   - Why wasn't it caught in testing?
   - How can we prevent recurrence?

2. 📋 **Fix Planning**
   - Create hotfix branch: `hotfix/p0-[issue-brief]`
   - Write test cases to reproduce issue
   - Implement fix with extra validation

3. 📋 **Test Enhancement**
   - Update E2E test suite
   - Add monitoring for failed scenario
   - Improve smoke test coverage

### Long-term (Within 1 week)
1. 📊 **Post-Mortem Meeting**
   - Blameless review of incident
   - Identify process improvements
   - Update deployment procedures

2. 📚 **Documentation Updates**
   - Update rollback procedures (lessons learned)
   - Enhance monitoring runbook
   - Add to incident playbook

3. 🔄 **Re-deployment Planning**
   - Fix-forward strategy
   - Enhanced testing plan
   - Gradual rollout (if applicable)

---

## 🎯 Success Criteria

Rollback is considered successful when:

- ✅ Error rates return to pre-deployment baseline (< 0.1% for 5xx)
- ✅ User login success rate ≥ 98%
- ✅ No console errors in browser
- ✅ All critical user flows functional
- ✅ Monitoring shows stable metrics for 1 hour
- ✅ No new incidents reported

---

## 📋 Rollback Decision Template

```markdown
# Rollback Decision: P0 v2.0.0-p0

**Date:** YYYY-MM-DD HH:MM UTC
**Incident:** [Brief description]
**Severity:** Critical / High / Medium

## Issue Summary
[What's broken, impact on users]

## Metrics
- Error Rate: X%
- User Impact: X users / X%
- Duration: X minutes

## Rollback Decision
- [ ] ✅ ROLLBACK - Issue meets critical criteria
- [ ] ⏸️ MONITOR - Issue being investigated, hold rollback
- [ ] ❌ NO ROLLBACK - Fix-forward approach

## Method Selected
- [ ] Method 1: Frontend-Only
- [ ] Method 2: Route-Level Disable
- [ ] Method 3: Full Rollback

## Authorization
- Requested By: [Name]
- Approved By: [Team Lead]
- Executed By: [Engineer]

## Timeline
- Incident Start: HH:MM
- Decision Made: HH:MM
- Rollback Start: HH:MM
- Rollback Complete: HH:MM
- Verification Complete: HH:MM

## Next Steps
1. [Immediate actions]
2. [RCA plan]
3. [Fix-forward plan]
```

---

## 🔗 Related Documents

- [Monitoring Runbook](./production_p0_monitoring.md)
- [Phase C Implementation Report](../dev/investigations/user-refactor_2025-11/zerodata/p0_phase_c_implementation_report.md)
- [E2E Verification Plan](../dev/investigations/user-refactor_2025-11/zerodata/p0_phase_c_e2e_verification.md)
- [Deployment Guide](../DEPLOYMENT.md)

---

**Document Owner:** Platform Team
**Review Frequency:** After each incident, quarterly
**Last Tested:** [Never / Date of last drill]
**Next Drill:** 2025-12-09

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
