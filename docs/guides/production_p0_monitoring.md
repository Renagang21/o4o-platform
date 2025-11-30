# Production Monitoring Runbook: P0 User Refactor

**Version:** v2.0.0-p0
**Last Updated:** 2025-11-09
**Monitoring Period:** 72 hours post-deployment
**Responsible:** Platform Team

---

## 📊 Monitoring Overview

### Deployment Information
- **Release Date**: 2025-11-09
- **Components**:
  - Main Site: https://neture.co.kr
  - Admin Dashboard: https://admin.neture.co.kr
  - API Server: https://api.neture.co.kr
- **Changes**: RBAC enrollment system, role assignments, httpOnly auth

### Monitoring Scope
1. **Authentication Flow**: Cookie-based auth with /me endpoint
2. **Enrollment Flow**: User applications and admin approvals
3. **Error Patterns**: HTTP status codes and client-side errors
4. **Performance**: Response times and bundle loading

---

## 🎯 Success Metrics (72h)

### Critical Metrics

| Category | Metric | Baseline | Target | Alert Threshold | Action |
|----------|--------|----------|--------|-----------------|--------|
| **Authentication** | `/auth/cookie/me` success rate | - | ≥ 99.5% | < 99% | Cookie/CORS investigation |
| **Authentication** | Login success rate | 98% | ≥ 98% | < 95% | Auth service check |
| **Enrollment** | 201 Created rate | - | ≥ 95% | < 90% | Validation logic review |
| **Enrollment** | 409 Conflict rate | - | ≤ 5% | > 10% | UX improvement needed |
| **Admin** | Approval success rate | - | ≥ 99% | < 98% | Transaction integrity check |
| **Performance** | /me response time | - | < 200ms | > 500ms | API optimization |
| **Errors** | Console error count | 0 | 0 | > 5/hour | Immediate investigation |
| **Errors** | 5xx error rate | < 0.1% | < 0.1% | > 0.5% | Backend health check |

---

## 🔍 Monitoring Checklist (Hourly)

### Hour 0-6 (Critical Window)
- [ ] Verify /me endpoint returns assignments[] correctly
- [ ] Check httpOnly cookies are set with correct flags
- [ ] Monitor enrollment submission success rate
- [ ] Watch for console errors in browser logs
- [ ] Verify admin approval workflow works
- [ ] Check 401/403 error patterns
- [ ] Monitor server health (CPU, memory, disk)

### Hour 6-24 (High Priority)
- [ ] Review enrollment status page accuracy
- [ ] Check RoleGuard redirects work correctly
- [ ] Verify dashboard access for approved users
- [ ] Monitor rate limiting (429 responses)
- [ ] Check Navbar dynamic rendering
- [ ] Review user feedback/reports

### Hour 24-72 (Standard)
- [ ] Aggregate success metrics
- [ ] Identify recurring error patterns
- [ ] Review performance trends
- [ ] Check for edge case failures
- [ ] Prepare post-deployment report

---

## 📈 Data Collection Points

### 1. API Endpoints

#### Authentication
```bash
# /me endpoint health
curl -s -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  -X GET https://api.neture.co.kr/auth/cookie/me \
  -H "Cookie: <session-cookie>"

# Expected: 200 OK, < 200ms
```

#### Enrollment
```bash
# Create enrollment
curl -s -w "\nStatus: %{http_code}\n" \
  -X POST https://api.neture.co.kr/enrollments \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"role":"supplier","metadata":{...}}'

# Expected: 201 Created (first), 409 Conflict (duplicate)
```

#### Admin
```bash
# Get enrollments
curl -s -w "\nStatus: %{http_code}\n" \
  -X GET "https://api.neture.co.kr/admin/enrollments?status=pending" \
  -H "Cookie: <admin-cookie>"

# Expected: 200 OK for admin, 403 for non-admin
```

### 2. Browser Metrics

#### Network Tab Monitoring
**What to Check:**
- POST /auth/v2/login → 200 OK
- GET /auth/cookie/me → 200 OK with assignments[]
- POST /enrollments → 201 Created
- PATCH /admin/enrollments/:id/approve → 200 OK

**Red Flags:**
- 401 on authenticated requests (cookie issue)
- 403 on expected operations (RBAC misconfiguration)
- 5xx errors (server-side failures)
- CORS errors (preflight failures)

#### Console Tab Monitoring
**What to Check:**
- React errors/warnings
- API call failures
- State management errors
- Asset loading failures

**Red Flags:**
- "Cannot read property 'assignments' of undefined"
- "Failed to fetch"
- "CORS policy blocked"
- "Uncaught TypeError"

#### Application Tab (Cookies)
**What to Check:**
- Cookie name: `<your-cookie-name>`
- HttpOnly: ✓
- Secure: ✓ (production)
- SameSite: Lax
- Expiry: Reasonable (7-30 days)

**Red Flags:**
- Cookie not set after login
- Cookie missing HttpOnly flag
- Cookie deleted on page refresh

### 3. Server Logs

#### API Server Logs
```bash
# SSH to API server
ssh o4o-api

# Check PM2 logs
npx pm2 logs o4o-api-server --lines 100

# Look for:
# - Error stack traces
# - 5xx status codes
# - Database connection errors
# - Authentication failures
```

#### Nginx Access Logs
```bash
# SSH to web server
ssh o4o-web

# Check access patterns
sudo tail -f /var/log/nginx/access.log | grep -E "(401|403|409|422|429|5[0-9]{2})"

# Count status codes
sudo awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

---

## 🚨 Alert Conditions

### Immediate Action Required

| Condition | Severity | Action |
|-----------|----------|--------|
| 5xx error rate > 1% | 🔴 Critical | Check server health, review recent commits |
| Console errors > 10/hour | 🔴 Critical | Investigate JavaScript errors, consider hotfix |
| Login success rate < 90% | 🔴 Critical | Verify auth service, check cookies |
| /me endpoint failure > 1% | 🔴 Critical | Check API server, database connection |
| Dashboard inaccessible | 🔴 Critical | Verify RoleGuard, check assignments[] |

### Warning Level

| Condition | Severity | Action |
|-----------|----------|--------|
| 409 Conflict rate > 10% | 🟡 Warning | Review UX, add better duplicate detection |
| 422 Validation errors > 5% | 🟡 Warning | Check form validation, API contract |
| 429 Rate limit hits | 🟡 Warning | Review rate limits, check for abuse |
| Response time > 500ms | 🟡 Warning | Profile API endpoints, optimize queries |
| Admin approval failures | 🟡 Warning | Check transaction handling, locks |

---

## 📊 Reporting

### Daily Report Template (0-72h)

```markdown
# P0 Monitoring Report - Day X

**Date:** YYYY-MM-DD
**Period:** HH:MM - HH:MM UTC
**Status:** 🟢 Healthy / 🟡 Warning / 🔴 Critical

## Metrics Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| /me success rate | ≥99.5% | X.X% | ✅/⚠️/❌ |
| Enrollment 201 rate | ≥95% | X.X% | ✅/⚠️/❌ |
| Admin approval rate | ≥99% | X.X% | ✅/⚠️/❌ |
| Console errors | 0 | X | ✅/⚠️/❌ |
| 5xx error rate | <0.1% | X.X% | ✅/⚠️/❌ |

## Issues Encountered
1. [Issue description]
   - **Impact**: Low/Medium/High
   - **Action**: [What was done]
   - **Status**: Resolved/Monitoring/Open

## User Feedback
- [Notable feedback items]

## Next 24h Focus
- [Priorities for next monitoring period]
```

### 72h Final Report Template

```markdown
# P0 Monitoring - Final Report

**Monitoring Period:** YYYY-MM-DD to YYYY-MM-DD
**Overall Status:** ✅ Success / ⚠️ Partial / ❌ Rollback Required

## Executive Summary
[2-3 sentences on deployment outcome]

## Metrics Achievement
| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| ... | ... | ... | ... |

## Issues Summary
- **Critical**: X issues ([list])
- **Warning**: X issues ([list])
- **Resolved**: X issues

## Go/No-Go Recommendation
- [ ] ✅ GO - Continue with release
- [ ] 🛑 NO-GO - Rollback required

## Next Steps
1. [Action items]
```

---

## 🔧 Troubleshooting Guide

### Issue: Users cannot login

**Symptoms:**
- POST /auth/v2/login returns 200 but no cookie set
- Cookie set but GET /me returns 401

**Diagnosis:**
```bash
# Check cookie settings in API response
curl -i -X POST https://api.neture.co.kr/auth/v2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'

# Look for Set-Cookie header
```

**Common Causes:**
1. CORS misconfiguration (credentials not allowed)
2. SameSite policy mismatch
3. Domain mismatch (cookie set for wrong domain)
4. httpOnly + Secure flags incompatible with protocol

**Resolution:**
- Verify CORS allows credentials: `Access-Control-Allow-Credentials: true`
- Check cookie domain matches request origin
- Ensure HTTPS in production (for Secure flag)

---

### Issue: Enrollment submission fails (422)

**Symptoms:**
- POST /enrollments returns 422 with validation errors

**Diagnosis:**
```bash
# Check exact error message
curl -X POST https://api.neture.co.kr/enrollments \
  -H "Content-Type: application/json" \
  -H "Cookie: <cookie>" \
  -d '{"role":"supplier","metadata":{...}}' | jq
```

**Common Causes:**
1. Missing required fields in metadata
2. Invalid role value
3. Metadata schema mismatch

**Resolution:**
- Review API contract in Phase B docs
- Check TypeScript types in auth-client
- Update form validation to match backend

---

### Issue: Admin cannot approve enrollments

**Symptoms:**
- PATCH /admin/enrollments/:id/approve returns 403

**Diagnosis:**
```bash
# Check admin user's assignments
curl https://api.neture.co.kr/auth/cookie/me \
  -H "Cookie: <admin-cookie>" | jq '.assignments'

# Should include: { "role": "admin", "active": true }
```

**Common Causes:**
1. Admin user missing admin role assignment
2. RBAC middleware not recognizing admin role
3. Session cookie expired/invalid

**Resolution:**
- Verify admin role in database: `SELECT * FROM role_assignments WHERE role = 'admin';`
- Check RBAC middleware logs
- Re-login to refresh session

---

### Issue: Dashboard shows "Access Denied" for approved users

**Symptoms:**
- User approved but RoleGuard redirects to status page

**Diagnosis:**
```javascript
// In browser console (while logged in)
fetch('/auth/cookie/me', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log(data.assignments))
```

**Common Causes:**
1. Approval didn't create role_assignment record
2. Assignment created but active=false
3. Frontend cache outdated (old user state)

**Resolution:**
- Check database: `SELECT * FROM role_assignments WHERE user_id = ...;`
- Force frontend refresh (hard reload or logout/login)
- Verify approval transaction completed successfully

---

## 📞 Escalation Contacts

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Critical (5xx > 1%) | Platform Team Lead | 15 minutes |
| Security (Auth failures) | Security Team | 30 minutes |
| Database Issues | DBA On-Call | 30 minutes |
| Infrastructure | DevOps Team | 1 hour |

---

## 📝 Post-Monitoring Actions

### After 72h Success
1. ✅ Mark release as stable
2. ✅ Update monitoring to standard cadence
3. ✅ Document lessons learned
4. ✅ Plan P1 features
5. ✅ Archive monitoring logs

### If Issues Found
1. 📋 Document all incidents
2. 📋 Create hotfix tickets
3. 📋 Schedule post-mortem
4. 📋 Update rollback procedures
5. 📋 Improve monitoring coverage

---

**Document Owner:** Platform Team
**Review Frequency:** Post-deployment (daily), then quarterly
**Next Review Date:** 2025-12-09

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
