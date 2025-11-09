# P0 Release Checklist - v2.0.0-p0

**Status:** ✅ UAT PASS (GO Decision)
**Date:** 2025-11-09
**Branch:** `feat/user-refactor-p0-zerodata` → `main`

---

## ✅ Pre-Release Checklist (Completed)

- [x] Phase A (Database) - Complete
- [x] Phase B (API) - Complete (c52566f9)
- [x] Phase C (Frontend) - Complete (3ea45f4c)
- [x] All builds successful
- [x] Type checking passed
- [x] Main Site deployed (https://neture.co.kr)
- [x] Admin Dashboard deployed (https://admin.neture.co.kr)
- [x] E2E verification plan created
- [x] **UAT executed - PASS**
- [x] Documentation complete
- [x] Monitoring runbook ready
- [x] Rollback procedure documented

---

## 🚀 Release Steps

### Step 1: Create Pull Request

**Quick Link:**
```
https://github.com/Renagang21/o4o-platform/compare/main...feat/user-refactor-p0-zerodata?expand=1
```

**PR Details:**
- **Title:** `feat: P0 Zero-Data User Refactor - Phase C Frontend Implementation`
- **Base:** `main`
- **Compare:** `feat/user-refactor-p0-zerodata`
- **Body:** Copy from `docs/dev/investigations/user-refactor_2025-11/zerodata/p0_pr_template.md`

**PR Checklist:**
- [ ] Title matches template
- [ ] Body includes all sections (Summary, Tasks, Files, Testing, etc.)
- [ ] Link to implementation report
- [ ] Link to E2E verification plan
- [ ] UAT result: GO
- [ ] Reviewers assigned (optional)

---

### Step 2: Merge Pull Request

**After Review (if required):**
1. Address any review comments
2. Ensure all checks pass (CI/CD if configured)
3. Click "Merge pull request"
4. Use merge commit (recommended) or squash (if preferred)
5. Delete branch `feat/user-refactor-p0-zerodata` after merge

---

### Step 3: Tag Release

**Commands to run after PR merge:**

```bash
# 1. Switch to main and pull latest
git checkout main
git pull origin main

# 2. Verify you're on the correct commit
git log --oneline -5
# Should show the merge commit with Phase C changes

# 3. Create annotated tag
git tag -a v2.0.0-p0 -m "$(cat <<'EOF'
P0 Zero-Data User Refactor - Complete RBAC Implementation

Major Features:
- Role enrollment system (apply/approve workflow)
- Role-based dashboards with dynamic access control
- Admin enrollment management interface
- httpOnly cookie authentication
- Dynamic navigation based on user roles

Phases Completed:
- Phase A: Database schema (enrollments, role_assignments, audit_log)
- Phase B: API endpoints and RBAC middleware
- Phase C: Frontend implementation (this release)

Breaking Changes:
- AuthContext API changed (hasRole() replaces user.role)
- /me endpoint now returns assignments[] instead of single role
- localStorage auth replaced with httpOnly cookies

Deployment:
- Main Site: https://neture.co.kr
- Admin Dashboard: https://admin.neture.co.kr
- API Server: Phase B deployed (c52566f9)

Documentation:
- Implementation Report: docs/.../p0_phase_c_implementation_report.md
- E2E Verification: docs/.../p0_phase_c_e2e_verification.md
- Monitoring Runbook: docs/runbooks/production_p0_monitoring.md
- Rollback Procedure: docs/runbooks/rollback_p0.md
- Release Notes: docs/releases/v2.0.0-p0_release_notes.md

Next Steps:
- 72h production monitoring (see monitoring runbook)
- Gather user feedback on enrollment UX
- Plan Phase D (P1) enhancements
EOF
)"

# 4. Push tag to remote
git push origin v2.0.0-p0

# 5. Verify tag
git tag -l "v2.0.0-*"
git show v2.0.0-p0 --quiet
```

**Expected Output:**
```
tag v2.0.0-p0
Tagger: Your Name <your.email@example.com>
Date:   2025-11-09 ...

P0 Zero-Data User Refactor - Complete RBAC Implementation
...
```

---

### Step 4: Create GitHub Release

**Quick Link:**
```
https://github.com/Renagang21/o4o-platform/releases/new?tag=v2.0.0-p0
```

**Release Details:**
- **Tag:** `v2.0.0-p0` (select from dropdown after pushing tag)
- **Title:** `v2.0.0-p0 - P0 Zero-Data User Refactor`
- **Description:** Copy from `docs/releases/v2.0.0-p0_release_notes.md`
- **Type:**
  - [ ] Latest release (recommended)
  - [ ] Pre-release (if testing further)

**Release Notes Template:**
```markdown
# v2.0.0-p0 - P0 Zero-Data User Refactor

## 🎯 Overview

Complete RBAC implementation with enrollment workflow, replacing legacy single-role system with flexible role assignments.

**Key Principle:** Zero-data migration - new system runs parallel to legacy.

---

## ✨ New Features

### 1. Role Enrollment System
- Application forms for supplier/seller/partner roles
- Real-time status tracking with badges
- Admin approval workflow (approve/reject/hold)

**Routes:**
- `/apply/supplier` - Supplier application
- `/apply/seller` - Seller application
- `/apply/partner` - Partner application
- `/apply/:role/status` - Status tracking

### 2. Role-Based Dashboards
- RoleGuard component for access control
- Automatic redirection for unapproved users
- Multiple roles support

**Routes:**
- `/dashboard/supplier`
- `/dashboard/seller`
- `/dashboard/partner`

### 3. Admin Enrollment Management
- Centralized management at `/enrollments`
- Advanced filtering (role, status, search)
- Batch actions with real-time updates

### 4. Enhanced Authentication
- httpOnly cookies (secure, XSS-resistant)
- Unified /me endpoint (user + assignments)
- hasRole() helper for simplified checks

### 5. Dynamic Navigation
- Context-aware menu based on active roles
- Dashboard shortcuts
- Application prompts for users without roles

---

## 🔄 Breaking Changes

### Authentication
**Before:**
```typescript
if (user?.role === 'supplier') { ... }
```

**After:**
```typescript
const { hasRole } = useAuth();
if (hasRole('supplier')) { ... }
```

### API Response
**Before:** `{ "id": "...", "role": "supplier" }`

**After:** `{ "user": {...}, "assignments": [{"role": "supplier", "active": true}] }`

---

## 📊 Deployment

- Main Site: https://neture.co.kr
- Admin Dashboard: https://admin.neture.co.kr
- API Server: https://api.neture.co.kr

---

## 📚 Documentation

- [Implementation Report](../docs/dev/investigations/user-refactor_2025-11/zerodata/p0_phase_c_implementation_report.md)
- [E2E Verification](../docs/dev/investigations/user-refactor_2025-11/zerodata/p0_phase_c_e2e_verification.md)
- [Monitoring Runbook](../docs/runbooks/production_p0_monitoring.md)
- [Rollback Procedure](../docs/runbooks/rollback_p0.md)

---

## 🎓 Credits

**Approach:** Zero-data migration, Server-first RBAC, Security-by-default

**Implementation Timeline:**
- Phase A (Database): 2025-11-06
- Phase B (API): 2025-11-07
- Phase C (Frontend): 2025-11-09

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

### Step 5: Start 72h Monitoring

**Monitoring Schedule:**

| Period | Frequency | Actions |
|--------|-----------|---------|
| Hour 0-6 | Every hour | Full checklist (critical window) |
| Hour 6-24 | Every 3 hours | High priority items |
| Hour 24-72 | Every 6 hours | Standard monitoring |

**Monitoring Checklist (Hour 0-6):**
- [ ] Verify /me endpoint returns assignments[]
- [ ] Check httpOnly cookies with correct flags
- [ ] Monitor enrollment submission success rate
- [ ] Watch for console errors
- [ ] Verify admin approval workflow
- [ ] Check 401/403 error patterns
- [ ] Monitor server health (CPU, memory)

**Success Metrics:**
- `/auth/cookie/me` success rate: ≥ 99.5%
- Enrollment creation success: ≥ 95%
- Admin approval success: ≥ 99%
- Console errors: 0
- 5xx error rate: < 0.1%

**Tools:**
```bash
# API Health Check
curl -s -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  https://api.neture.co.kr/health

# Check Nginx Logs
ssh o4o-web "sudo tail -f /var/log/nginx/access.log | grep -E '(401|403|409|422|429|5[0-9]{2})'"

# Check API Server Logs
ssh o4o-api "npx pm2 logs o4o-api-server --lines 100"
```

**Daily Report Template:**
```markdown
# P0 Monitoring Report - Day X

**Date:** 2025-11-0X
**Period:** 00:00 - 23:59 UTC
**Status:** 🟢 Healthy / 🟡 Warning / 🔴 Critical

## Metrics Summary
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| /me success rate | ≥99.5% | X.X% | ✅ |
| Enrollment 201 rate | ≥95% | X.X% | ✅ |
| Admin approval rate | ≥99% | X.X% | ✅ |
| Console errors | 0 | X | ✅ |
| 5xx error rate | <0.1% | X.X% | ✅ |

## Issues Encountered
None / [List issues]

## User Feedback
[Any notable feedback]

## Next 24h Focus
[Priorities]
```

---

## 📋 Post-Release Checklist

### Immediate (Within 1 hour)
- [ ] PR merged successfully
- [ ] Tag v2.0.0-p0 created and pushed
- [ ] GitHub Release published
- [ ] Monitoring started (Hour 0 checklist complete)
- [ ] Team notified of release

### Day 1
- [ ] Hour 0-6 monitoring complete (all metrics green)
- [ ] No critical issues reported
- [ ] Daily report #1 created

### Day 2
- [ ] Hour 6-24 monitoring complete
- [ ] Daily report #2 created
- [ ] Any warning-level issues documented

### Day 3
- [ ] Hour 24-48 monitoring complete
- [ ] Daily report #3 created
- [ ] User feedback collected

### 72h Complete
- [ ] Final monitoring report created
- [ ] All success metrics achieved
- [ ] Release marked as stable
- [ ] Post-mortem scheduled (if issues)
- [ ] P1 planning kickoff scheduled

---

## 🎯 Success Criteria

Release is considered successful after 72h when:

- ✅ All monitoring metrics meet targets
- ✅ No critical incidents (rollback not required)
- ✅ User feedback generally positive
- ✅ No regression in existing functionality
- ✅ Documentation proves accurate and helpful

---

## 📞 Contacts

| Role | Contact | Response Time |
|------|---------|---------------|
| Platform Lead | [Name] | 15 min |
| On-Call Engineer | [Name] | 30 min |
| Database Admin | [Name] | 30 min |
| DevOps | [Name] | 1 hour |

---

## 🔗 Quick Links

**GitHub:**
- Repository: https://github.com/Renagang21/o4o-platform
- PR Creation: https://github.com/Renagang21/o4o-platform/compare/main...feat/user-refactor-p0-zerodata?expand=1
- Release Creation: https://github.com/Renagang21/o4o-platform/releases/new?tag=v2.0.0-p0

**Production:**
- Main Site: https://neture.co.kr
- Admin Dashboard: https://admin.neture.co.kr
- API Server: https://api.neture.co.kr/health

**Documentation:**
- Implementation Report: `docs/.../p0_phase_c_implementation_report.md`
- E2E Verification: `docs/.../p0_phase_c_e2e_verification.md`
- Monitoring Runbook: `docs/runbooks/production_p0_monitoring.md`
- Rollback Procedure: `docs/runbooks/rollback_p0.md`
- Release Notes: `docs/releases/v2.0.0-p0_release_notes.md`

---

**Last Updated:** 2025-11-09
**Next Review:** After 72h monitoring complete

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
