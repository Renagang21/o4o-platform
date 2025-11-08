# User Area Investigation - Critical Findings

**Investigation Date:** 2025-11-08
**Status:** Initial Assessment Complete
**Severity Levels:** 🔴 Critical | 🟡 High | 🟢 Medium

---

## Executive Summary

The user authentication and authorization system shows **significant architectural complexity** with:
- **Dual auth systems** (SSO + Legacy) running in parallel
- **Triple role storage mechanisms** (legacy `role` field + `roles` array + new `dbRoles` relation)
- **Inconsistent role definitions** between frontend (14 roles) and backend (enumerated roles)
- **Mixed token storage** (cookies + localStorage) creating security vulnerabilities
- **No centralized ACL enforcement** - guards scattered across FE/BE

**Immediate Action Required:** Security audit of cookie settings and token storage.

---

## 🔴 P1 - Critical Security Issues

### 1. **Insecure Token Storage (XSS Vulnerability)**
**Severity:** 🔴 Critical
**Files:**
- `apps/main-site/src/api/auth/authApi.ts` (lines 112-114, 61, 127)
- `apps/main-site/src/contexts/AuthContext.tsx` (lines 46-47, 78-79)

**Issue:**
- Tokens stored in BOTH `localStorage` AND cookies
- localStorage tokens:
  - `token`
  - `legacy_token`
  - `sso_access_token`
- Cookie tokens:
  - `authToken`
  - `user` (contains full user object)

**Risk:**
- XSS attacks can steal localStorage tokens → full account compromise
- User object in cookies may contain sensitive data

**Evidence:**
```typescript
// authApi.ts:112-114
localStorage.removeItem('token');
localStorage.removeItem('legacy_token');
localStorage.removeItem('sso_access_token');

// AuthContext.tsx:46-47
Cookies.set('authToken', token, { expires: 1 });
Cookies.set('user', JSON.stringify(normalizedUser), { expires: 1 });
```

**Recommendation:**
- **Remove all localStorage token storage immediately**
- Use `httpOnly` cookies exclusively for tokens
- Move user state to server-side session or encrypted cookie
- Audit cookie settings: Need `httpOnly`, `secure`, `sameSite: 'strict'`

---

### 2. **Missing Cookie Security Flags**
**Severity:** 🔴 Critical
**Files:**
- `apps/main-site/src/contexts/AuthContext.tsx` (lines 46-47)
- `apps/api-server/src/routes/unified-auth.routes.ts` (lines 94-108)

**Issue:**
Frontend cookies (js-cookie) show NO security flags in code:
```typescript
Cookies.set('authToken', token, { expires: 1 }); // Missing httpOnly, secure, sameSite
```

Backend cookies (unified-auth) DO have proper flags BUT only in production:
```typescript
if (process.env.NODE_ENV === 'production') {
  res.cookie('accessToken', result.tokens.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    domain: '.neture.co.kr',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
}
```

**Problem:**
- Frontend sets cookies via js-cookie (client-side) → **CANNOT set `httpOnly`**
- Development environment has NO cookie security
- Cookies accessible to JavaScript → XSS risk

**Recommendation:**
- **Stop setting auth cookies from frontend entirely**
- Backend should set ALL auth cookies with proper flags
- Apply security flags in ALL environments (not just production)

---

### 3. **No CSRF Protection Detected**
**Severity:** 🔴 Critical

**Issue:**
- No CSRF token validation found in middleware
- Cookies set with `sameSite: 'strict'` in production (unified-auth) ✅
- BUT frontend cookies use default sameSite (likely 'lax') ❌

**Recommendation:**
- Verify `sameSite` cookie attribute in all environments
- Consider adding CSRF tokens for state-changing operations
- Document CSRF protection strategy

---

## 🟡 P2 - High Priority Architecture Issues

### 4. **Triple Role Storage Mechanism (Data Inconsistency Risk)**
**Severity:** 🟡 High
**Files:**
- `apps/api-server/src/entities/User.ts` (lines 40-77)

**Issue:**
User entity has THREE different role storage fields:
1. `role: UserRole` - Single enum field (line 56)
2. `roles: string[]` - Legacy array (line 63)
3. `dbRoles?: Role[]` - New ManyToMany relation (line 72)
4. `activeRole?: Role` - Current active role (line 77)

**Code Evidence:**
```typescript
@Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
role!: UserRole;

@Column({ type: 'simple-array', default: () => `'${UserRole.CUSTOMER}'` })
roles!: string[];

@ManyToMany('Role', 'users', { eager: true })
dbRoles?: Role[];

@ManyToOne('Role', { nullable: true, eager: true })
activeRole?: Role | null;
```

**Consequences:**
- Data can be inconsistent (role ≠ roles[0] ≠ dbRoles[0])
- Unclear "source of truth" for authorization checks
- Migration complexity (3 fields to sync)

**Helper Methods Attempt to Bridge:**
- `hasRole()` checks all 3 sources (lines 198-206)
- `getRoleNames()` falls back across sources (lines 266-271)

**Recommendation:**
- **Define single source of truth:** Use `dbRoles` as primary
- Deprecate legacy `role` and `roles` fields
- Create migration plan with backward compatibility period

---

### 5. **Dual Authentication System (SSO + Legacy)**
**Severity:** 🟡 High
**Files:**
- `apps/main-site/src/api/auth/authApi.ts` (entire file)
- `apps/api-server/src/routes/auth.ts`
- `apps/api-server/src/routes/unified-auth.routes.ts`

**Issue:**
- Frontend tries SSO first, falls back to legacy (authApi.ts:28-49)
- TWO separate auth routes on backend:
  - `/api/auth/*` - Legacy (auth.ts)
  - `/api/auth/unified/*` - New unified system (unified-auth.routes.ts)
- No clear deprecation timeline for legacy

**Code Evidence:**
```typescript
// authApi.ts:28-49
if (USE_SSO) {
  try {
    const ssoResponse = await ssoAuthAPI.login(data.email, data.password);
    // ...
  } catch (error) {
    // SSO 실패 시 레거시 시스템으로 폴백
    return this.legacyLogin(data);
  }
}
```

**Complexity:**
- 2 separate token issuance systems
- Logout must clear tokens from BOTH systems (authApi.ts:86-110)
- Increased attack surface

**Recommendation:**
- Complete SSO migration plan:
  1. Feature flag for gradual rollout
  2. Migration utility to convert legacy users
  3. Sunset date for legacy auth
- Document which system is "primary"

---

### 6. **Inconsistent Role Definitions (FE/BE Mismatch)**
**Severity:** 🟡 High
**Files:**
- Frontend: `apps/main-site/src/types/user.ts` (lines 8-22)
- Backend: `apps/api-server/src/types/auth.ts` (lines 5-21)

**Issue:**

**Frontend has 14 role strings:**
```typescript
type UserRole = 'user' | 'admin' | 'administrator' | 'manager' | 'partner' |
  'operator' | 'member' | 'seller' | 'affiliate' | 'contributor' |
  'vendor' | 'supplier' | 'retailer' | 'customer';
```

**Backend has enum with different set:**
```typescript
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  VENDOR = 'vendor',
  VENDOR_MANAGER = 'vendor_manager',
  SELLER = 'seller',
  CUSTOMER = 'customer',
  BUSINESS = 'business',
  MODERATOR = 'moderator',
  PARTNER = 'partner',
  BETA_USER = 'beta_user',
  SUPPLIER = 'supplier',
  AFFILIATE = 'affiliate',
  MANAGER = 'manager' // Legacy
}
```

**Mismatches:**
- FE has `administrator`, BE has `SUPER_ADMIN`
- FE has `user`, BE doesn't
- FE has `operator`, `member`, `contributor`, `retailer` - BE doesn't
- BE has `VENDOR_MANAGER`, `BUSINESS`, `MODERATOR`, `BETA_USER` - FE doesn't

**Consequences:**
- Authorization checks will FAIL for mismatched roles
- UI may show/hide incorrectly
- Route guards may malfunction

**Recommendation:**
- **Audit actual roles in production database**
- Create single canonical role list (shared TypeScript file)
- Sync FE/BE types from single source

---

## 🟡 P2 - Duplicate Code & Inconsistencies

### 7. **Duplicate Role Guard Components**
**Severity:** 🟡 High
**Files:**
- `apps/main-site/src/components/auth/RoleGate.tsx`
- `apps/main-site/src/components/guards/RoleGuard.tsx`
- `apps/main-site/src/components/common/UserRoleSwitch.tsx`
- `apps/main-site/src/components/blocks/RoleSwitcher.tsx`

**Issue:**
- Two separate "RoleGate" components (likely doing same thing)
- Two separate "RoleSwitcher" components

**Recommendation:**
- Consolidate into single canonical implementation
- Remove duplicates
- Update all imports

---

### 8. **MongoDB/PostgreSQL ID Confusion**
**Severity:** 🟡 High
**Files:**
- `apps/main-site/src/contexts/AuthContext.tsx` (lines 29-34, 42-43, 88-89, 118-119)
- `apps/main-site/src/types/user.ts` (lines 41-42)

**Issue:**
User interface supports BOTH `_id` (MongoDB) and `id` (PostgreSQL UUID):
```typescript
export interface User {
  _id?: string;  // MongoDB
  id: string;    // UUID
  // ...
}
```

Normalization logic scattered in 4 places:
```typescript
const normalizeUserData = (userData: Partial<User> & { _id?: string }): User => {
  return {
    ...userData,
    id: userData._id || userData.id || '', // MongoDB _id를 id로 매핑
  } as User;
};
```

**Problem:**
- Code assumes MongoDB legacy system (but current DB is PostgreSQL)
- Risk of `id` being empty string if both fields missing
- Confusion about which DB is source of truth

**Recommendation:**
- Remove MongoDB compatibility if not needed
- If Medusa uses MongoDB, document integration strategy
- Ensure ID validation (non-empty, valid UUID format)

---

## 🟢 P3 - Medium Priority Issues

### 9. **No Route-Level Role Guards**
**Severity:** 🟢 Medium
**File:** `apps/main-site/src/App.tsx`

**Issue:**
- `PrivateRoute` only checks `isAuthenticated` (boolean)
- NO role-based route protection

**Example:**
```typescript
<Route path="/editor/page/:id?" element={
  <PrivateRoute>  {/* Only checks if logged in, not role */}
    <PageEditor />
  </PrivateRoute>
} />
```

**Consequence:**
- Any authenticated user can access page editor (should be admin-only?)

**Recommendation:**
- Add role-based route guards:
  ```typescript
  <RoleRoute allowedRoles={['admin', 'editor']}>
    <PageEditor />
  </RoleRoute>
  ```

---

### 10. **Preferences Loading Race Condition**
**Severity:** 🟢 Medium
**File:** `apps/main-site/src/contexts/AuthContext.tsx` (lines 122-131)

**Issue:**
After token verification, preferences loaded in separate async call:
```typescript
// Token verified, user set in state
setUser(normalizedUser);

// Then preferences loaded (may fail silently)
try {
  const prefsResponse = await authAPI.getPreferences();
  if (prefsResponse.data.success) {
    normalizedUser.currentRole = prefsResponse.data.data.currentRole;
    // ...
  }
} catch (error) {
  // preferences 로드 실패 시 무시하고 계속 진행
}
```

**Problem:**
- If preferences call is slow, UI may render with incomplete user data
- Silent failure - no user feedback if preferences can't load

**Recommendation:**
- Batch user data + preferences in single API call
- OR: Show loading state until preferences loaded
- OR: Use default preferences if API fails

---

### 11. **JWT Expiry Differences**
**Severity:** 🟢 Medium
**Files:**
- `apps/api-server/src/routes/auth.ts` (line 66): `expiresIn: '7d'`
- `apps/api-server/src/routes/unified-auth.routes.ts` (line 99): `maxAge: 15 * 60 * 1000` (15 min)

**Issue:**
- Legacy auth: 7 day tokens
- Unified auth: 15 minute access tokens + 7 day refresh tokens

**Problem:**
- Inconsistent user experience depending on auth system used
- No refresh token logic in frontend for legacy auth

**Recommendation:**
- Standardize token lifetimes across both systems
- Implement refresh token flow in frontend
- Document when/how tokens expire

---

## 📊 Summary Statistics

| Category | Count | Notes |
|----------|-------|-------|
| **Frontend Role Strings** | 14 | Defined in `user.ts` |
| **Backend Role Enum** | 13 | Defined in `auth.ts` |
| **Auth Routes (FE)** | 11 | Login, signup, OAuth, etc. |
| **Auth Components (FE)** | 8 | Guards, switchers, forms |
| **Token Storage Locations** | 5 | 3x localStorage + 2x cookies |
| **Auth Systems** | 2 | SSO + Legacy |
| **User Role Fields (DB)** | 4 | role, roles, dbRoles, activeRole |
| **Auth Middlewares (BE)** | 2+ | authenticate, authorize, ... |
| **Critical Security Issues** | 3 | Token storage, cookies, CSRF |
| **High Architecture Issues** | 6 | Role storage, dual auth, inconsistency |

---

## 🎯 Recommended Action Plan

### Phase 1: Emergency Security Fixes (Week 1)
1. **Remove localStorage token storage** - Use httpOnly cookies only
2. **Audit cookie security flags** - Ensure httpOnly, secure, sameSite on ALL cookies
3. **Stop client-side cookie setting** - Move to backend-only

### Phase 2: Role System Standardization (Week 2-3)
1. **Audit production database** - Get actual role usage statistics
2. **Create canonical role list** - Single TypeScript file, shared FE/BE
3. **Sync FE/BE type definitions**
4. **Document role hierarchy** - Who can access what

### Phase 3: Architecture Cleanup (Week 4-6)
1. **Consolidate duplicate components** (RoleGate, RoleSwitcher)
2. **Define single role source of truth** (recommend dbRoles)
3. **Create legacy field deprecation plan**
4. **Document SSO migration roadmap**

### Phase 4: Enhanced Security (Week 7-8)
1. **Implement token refresh flow**
2. **Add CSRF protection**
3. **Add rate limiting to auth endpoints**
4. **Security audit of all auth flows**

---

## Next Investigation Steps

1. **Database Schema Audit** - Query actual role/permission data in production
2. **ACL Matrix Creation** - Document what each role can actually do
3. **Auth Flow Diagrams** - Visual sequence diagrams for login/signup/OAuth
4. **API Endpoint Inventory** - Complete list of auth-protected endpoints
5. **Security Penetration Test** - Attempt XSS/CSRF attacks in dev environment

---

**Document Owner:** Claude Code Investigation
**Review Date:** 2025-11-08
**Next Review:** After Phase 1 completion
