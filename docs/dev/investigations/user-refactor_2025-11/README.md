# User Area Refactoring Investigation

**Date:** 2025-11-08
**Status:** Phase 1 Complete - Initial Investigation
**Investigator:** Claude Code

---

## 📁 Documents in This Investigation

### Core Inventory
1. **[01_inventory_fe.md](./01_inventory_fe.md)** - Frontend auth/user system inventory
   - Auth pages, components, hooks
   - State management (AuthContext)
   - Type definitions
   - API integration
   - Security issues identified

2. **02_inventory_api.md** - Backend API inventory *(In Progress)*
   - Auth routes and endpoints
   - Middleware and guards
   - Services and controllers

3. **03_schema_db.md** - Database schema *(In Progress)*
   - User, Role, Permission tables
   - Constraints and indexes
   - Migration history

### Analysis Documents
4. **04_auth_flow.md** - Authentication flow diagrams *(Pending)*
5. **05_acls_matrix.md** - Role/Permission matrix *(Pending)*

6. **[06_findings.md](./06_findings.md)** - **⭐ Critical Findings Report**
   - 3 Critical security issues (P1)
   - 6 High priority architecture issues (P2)
   - 3 Medium priority issues (P3)
   - Summary statistics
   - Recommended action plan

### Action Plans
7. **07_plan.md** - Comprehensive improvement plan *(Pending)*

8. **[08_P1_QUICK_WINS.md](./08_P1_QUICK_WINS.md)** - **🔴 Immediate Action Items**
   - 5 quick fixes (3-4 hours total)
   - Step-by-step implementation guide
   - Testing checklist
   - Deployment plan

---

## 🚨 Executive Summary

### Critical Findings

**🔴 Security Vulnerabilities (Immediate Action Required):**
1. **XSS Risk:** Tokens stored in localStorage (accessible to JavaScript)
2. **Cookie Security:** Frontend sets cookies without `httpOnly` flag
3. **CSRF Protection:** Needs verification

**🟡 Architecture Complexity:**
- Dual auth systems (SSO + Legacy) running in parallel
- Triple role storage (3 different fields in User entity)
- Inconsistent role definitions between FE/BE
- No centralized ACL enforcement

### Impact Assessment

| Issue | Severity | Impact | Effort | Priority |
|-------|----------|--------|--------|----------|
| localStorage tokens | 🔴 Critical | High | Low | P1 |
| Cookie security | 🔴 Critical | High | Medium | P1 |
| CSRF verification | 🔴 Critical | Medium | Low | P1 |
| Triple role storage | 🟡 High | Medium | High | P2 |
| Dual auth system | 🟡 High | Low | High | P2 |
| Role definition mismatch | 🟡 High | High | Medium | P2 |

---

## 📋 Investigation Process

### Phase 1: Discovery ✅ COMPLETE
- [x] Frontend code inventory (auth, state, routing)
- [x] Backend routes and middleware inventory
- [x] Database schema analysis (via migrations)
- [x] Type definitions analysis
- [x] Security audit (cookie/token handling)
- [x] Identify critical issues
- [x] Document findings

### Phase 2: Deep Analysis (In Progress)
- [ ] Create auth flow sequence diagrams
- [ ] Build complete ACL matrix (all roles × all resources)
- [ ] Query production database for actual role usage
- [ ] Map all auth-protected API endpoints
- [ ] Document OAuth integration flows

### Phase 3: Planning
- [ ] Design unified role system
- [ ] Plan migration from triple-role to single source
- [ ] Create SSO migration timeline
- [ ] Design centralized ACL middleware
- [ ] Security hardening roadmap

### Phase 4: Implementation (Future)
- [ ] Execute P1 quick wins
- [ ] Refactor role storage
- [ ] Consolidate auth systems
- [ ] Implement refresh token flow
- [ ] Add comprehensive auth tests

---

## 🎯 Recommended Next Actions

### This Week (P1 - Security Fixes)
1. **Read:** `08_P1_QUICK_WINS.md` in detail
2. **Implement:** 5 quick security fixes (3-4 hours)
3. **Test:** All auth flows in development
4. **Deploy:** Backend → Frontend (in that order)
5. **Monitor:** Production logs for 24 hours

### Next Week (P2 - Role System)
1. **Audit:** Query production DB for role usage statistics
2. **Sync:** Create canonical role list (FE + BE)
3. **Document:** Role hierarchy and permissions
4. **Plan:** Migration from triple-role to single source

### Month 1 (P3 - Architecture Cleanup)
1. **Consolidate:** Duplicate components (RoleGate, RoleSwitcher)
2. **Standardize:** Auth flow (choose SSO or Legacy as primary)
3. **Implement:** Token refresh logic
4. **Test:** Security penetration testing

---

## 📊 Statistics

### Codebase Metrics
- **Frontend Auth Pages:** 11
- **Frontend Auth Components:** 8
- **Frontend Role Strings:** 14
- **Backend Role Enum Values:** 13
- **User Role Fields (DB):** 4 (role, roles, dbRoles, activeRole)
- **Auth Routes:** 2 systems (Legacy + Unified)
- **Token Storage Locations:** 5 (3x localStorage + 2x cookies)

### Security Metrics
- **Critical Vulnerabilities:** 3
- **High Priority Issues:** 6
- **Medium Priority Issues:** 3
- **Lines of Auth Code (FE):** ~800
- **Lines of Auth Code (BE):** ~1500 (estimated)

---

## 🔗 Related Documents

### External References
- **Project Instructions:** `/CLAUDE.md`
- **Deployment Guide:** `/DEPLOYMENT.md`
- **Blocks Development:** `/BLOCKS_DEVELOPMENT.md`

### Infrastructure
- **Main Site:** https://neture.co.kr
- **Admin Dashboard:** https://admin.neture.co.kr
- **API Server:** https://api.neture.co.kr

### Servers
- Web Server: 13.125.144.8 (ssh o4o-web)
- API Server: 43.202.242.215 (ssh o4o-api)

---

## 💡 Key Insights

### What's Working Well
✅ Backend has proper cookie security in unified-auth (httpOnly, secure, sameSite)
✅ Database schema supports modern RBAC (roles + permissions tables)
✅ TypeORM migrations provide good schema versioning
✅ User entity has comprehensive helper methods (hasRole, hasPermission, etc.)

### Major Pain Points
❌ Frontend sets cookies client-side (cannot be httpOnly)
❌ Tokens in localStorage (XSS vulnerability)
❌ Three different role storage mechanisms (data inconsistency risk)
❌ Two parallel auth systems (increased complexity)
❌ No single source of truth for role definitions

### Architectural Decisions Needed
🤔 SSO vs Legacy: Which is primary? When to sunset the other?
🤔 Role storage: Migrate to dbRoles only? Keep legacy fields?
🤔 Token strategy: Short-lived access + refresh? Or long-lived?
🤔 Authorization: Centralized middleware? Or per-route guards?

---

## 🎓 Lessons for Future Refactoring

1. **Security First:** Always audit cookie/token handling before feature work
2. **Single Source of Truth:** Avoid multiple fields for same data (e.g., role/roles/dbRoles)
3. **Incremental Migration:** Running dual systems (SSO+Legacy) adds complexity - need clear end date
4. **Type Safety:** FE/BE type mismatches cause runtime errors - share types via monorepo
5. **Documentation:** Complex auth needs flow diagrams, not just code comments

---

## 📞 Contact & Review

**Investigation Lead:** Claude Code
**Review Status:** Pending stakeholder review
**Next Review Date:** After P1 implementation complete

**Questions or feedback?** Open an issue or discuss in team chat.

---

**Last Updated:** 2025-11-08
