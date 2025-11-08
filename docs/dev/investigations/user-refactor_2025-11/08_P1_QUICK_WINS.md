# P1 Quick Win Items - Immediate Action Required

**Created:** 2025-11-08
**Priority:** 🔴 CRITICAL - Address within 1 week
**Estimated Effort:** 2-4 hours total

---

## Overview

These items can be fixed **immediately without major refactoring** and address **critical security vulnerabilities**.

---

## 1. Remove localStorage Token Storage

**Severity:** 🔴 Critical (XSS Vulnerability)
**Effort:** 30 minutes
**Files to Modify:**
- `apps/main-site/src/api/auth/authApi.ts`

### Current Code (INSECURE):
```typescript
// Lines 112-114
localStorage.removeItem('token');
localStorage.removeItem('legacy_token');
localStorage.removeItem('sso_access_token');

// Lines 61, 119
localStorage.setItem('legacy_token', response.data.token);
localStorage.setItem('token', token);
```

### Action:
1. **Remove ALL `localStorage.setItem()` calls for tokens**
2. **Remove ALL `localStorage.getItem()` calls for tokens**
3. **Update `getToken()` method** to only check cookies
4. **Update `isAuthenticated()` method** to only check cookies

### Modified Code:
```typescript
// authApi.ts - DELETE these lines:
// - Line 61: localStorage.setItem('legacy_token', ...)
// - Line 119: localStorage.setItem('token', ...)
// - Lines 112-114: localStorage.removeItem(...)
// - Line 127: return localStorage.getItem('token') || ...
// - Line 135: return !!(localStorage.getItem('token') || ...)

// Replace getToken():
getToken: (): string | null => {
  if (USE_SSO && ssoAuthAPI.isAuthenticated()) {
    return ssoAuthAPI.getTokenManager().getAccessToken();
  }
  // Tokens now only in cookies, managed by backend
  return null; // Frontend doesn't access tokens directly
},

// Replace isAuthenticated():
isAuthenticated: (): boolean => {
  if (USE_SSO && ssoAuthAPI.isAuthenticated()) {
    return true;
  }
  // Check if auth cookie exists (backend sets httpOnly cookie)
  return document.cookie.includes('authToken');
},
```

### Testing:
1. Clear all localStorage
2. Login → verify token NOT in localStorage
3. Refresh page → verify still authenticated
4. Logout → verify cookie cleared

---

## 2. Move Frontend Cookie Setting to Backend

**Severity:** 🔴 Critical (Cannot set httpOnly from client)
**Effort:** 1 hour
**Files to Modify:**
- `apps/main-site/src/contexts/AuthContext.tsx`
- `apps/api-server/src/routes/auth.ts`
- `apps/api-server/src/routes/unified-auth.routes.ts`

### Problem:
Frontend sets cookies via `js-cookie` (client-side):
```typescript
// AuthContext.tsx:46-47
Cookies.set('authToken', token, { expires: 1 });
Cookies.set('user', JSON.stringify(normalizedUser), { expires: 1 });
```
**This CANNOT set `httpOnly` flag → XSS risk**

### Action:

#### Step 1: Update Backend to Set Cookies

**File:** `apps/api-server/src/routes/auth.ts`

Add after line 72 (after token generation):
```typescript
// Set secure httpOnly cookies
res.cookie('authToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

#### Step 2: Remove Frontend Cookie Setting

**File:** `apps/main-site/src/contexts/AuthContext.tsx`

**DELETE lines 46-47:**
```typescript
// Cookies.set('authToken', token, { expires: 1 }); // DELETE
// Cookies.set('user', JSON.stringify(normalizedUser), { expires: 1 }); // DELETE
```

**Modify login method (line 36-74):**
```typescript
const login = async (email: string, password: string): Promise<boolean> => {
  try {
    const response = await authAPI.login(email, password);
    const { user: userData }: LoginResponse = response.data;

    // Normalize user data
    const normalizedUser = normalizeUserData(userData);

    // Backend now sets httpOnly cookies - we just update state
    // NO cookie setting here anymore
    setUser(normalizedUser);
    toast.success('로그인되었습니다.');
    return true;
  } catch (error: any) {
    // ... error handling
  }
};
```

**Modify logout method (line 76-82):**
```typescript
const logout = () => {
  // Backend should clear cookies via /api/auth/logout endpoint
  // Just clear local state
  setUser(null);
  toast.info('로그아웃되었습니다.');
  // Cookies cleared by backend logout response
};
```

#### Step 3: Update Backend Logout to Clear Cookies

**File:** `apps/api-server/src/routes/auth.ts`

**Modify logout endpoint (line 224-231):**
```typescript
router.post('/logout', authenticate, asyncHandler(async (req: Request, res) => {
  // Clear cookies
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  return res.json({
    success: true,
    message: 'Logout successful'
  });
}));
```

### Testing:
1. Login → Check DevTools Application tab → `authToken` should have `httpOnly` flag
2. Try `document.cookie` in console → Should NOT see `authToken`
3. Logout → Cookie should be cleared
4. Refresh after login → Should still be authenticated

---

## 3. Apply Cookie Security in ALL Environments

**Severity:** 🔴 Critical
**Effort:** 15 minutes
**File to Modify:**
- `apps/api-server/src/routes/unified-auth.routes.ts`

### Problem:
Security flags only applied in production:
```typescript
// Lines 93-109
if (process.env.NODE_ENV === 'production') {
  res.cookie('accessToken', ...);
}
```

**Development has NO cookie security!**

### Action:

**Replace lines 93-109:**
```typescript
// ALWAYS set cookies (not just in production)
res.cookie('accessToken', result.tokens.accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: 'strict',
  domain: process.env.NODE_ENV === 'production' ? '.neture.co.kr' : undefined,
  maxAge: 15 * 60 * 1000 // 15 minutes
});

res.cookie('refreshToken', result.tokens.refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  domain: process.env.NODE_ENV === 'production' ? '.neture.co.kr' : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

**Also update logout (lines 266-273):**
```typescript
// ALWAYS clear cookies
res.clearCookie('accessToken', {
  domain: process.env.NODE_ENV === 'production' ? '.neture.co.kr' : undefined
});
res.clearCookie('refreshToken', {
  domain: process.env.NODE_ENV === 'production' ? '.neture.co.kr' : undefined
});
```

---

## 4. Verify CSRF Protection

**Severity:** 🔴 Critical
**Effort:** 30 minutes (investigation only)
**Action:** Verification task, not code change

### Steps:

1. **Check if `sameSite: 'strict'` is sufficient:**
   - Review OWASP CSRF guidelines
   - Verify all state-changing endpoints use `sameSite: 'strict'` cookies
   - Document decision in security doc

2. **Test CSRF protection:**
   ```bash
   # Create malicious HTML file:
   cat > csrf_test.html <<'EOF'
   <html>
   <body>
   <form action="https://api.neture.co.kr/api/auth/logout" method="POST">
     <input type="submit" value="Click me">
   </form>
   </body>
   </html>
   EOF

   # Open in browser while logged in
   # Click button - should FAIL due to sameSite: strict
   ```

3. **Document findings:**
   - Create `docs/security/csrf-protection.md`
   - Explain why sameSite: strict is sufficient (or add CSRF tokens if not)

---

## 5. Add Rate Limiting to Auth Endpoints

**Severity:** 🟡 High (Brute Force Protection)
**Effort:** 1 hour
**Files to Create/Modify:**
- New: `apps/api-server/src/middleware/rate-limit.ts`
- Modify: `apps/api-server/src/routes/auth.ts`

### Code:

**Create `middleware/rate-limit.ts`:**
```typescript
import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 min
  message: {
    error: 'Too many login attempts',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});
```

**Apply to auth routes:**
```typescript
// auth.ts
import { authRateLimiter } from '../middleware/rate-limit.js';

router.post('/login',
  authRateLimiter, // Add this line
  body('email').isEmail(),
  // ... rest of validation
  asyncHandler(async (req, res) => {
    // ... login logic
  })
);

router.post('/signup',
  authRateLimiter, // Add this line
  // ... rest
);
```

### Testing:
1. Attempt login 6 times with wrong password
2. 6th attempt should return 429 Too Many Requests
3. Wait 15 minutes → should be able to try again

---

## Deployment Checklist

### Before Deployment:
- [ ] Code review by senior developer
- [ ] Test all auth flows in dev:
  - [ ] Email/password login
  - [ ] OAuth login (Google, Kakao, Naver)
  - [ ] Signup
  - [ ] Logout
  - [ ] Token refresh
- [ ] Verify cookies in DevTools:
  - [ ] `httpOnly` flag present
  - [ ] `secure` flag present (prod only)
  - [ ] `sameSite: strict` present
- [ ] Test XSS protection:
  - [ ] Attempt `document.cookie` in console → tokens should be hidden
  - [ ] Inject `<script>localStorage.getItem('token')</script>` → should return null

### Deployment Order:
1. **Deploy backend first** (cookie setting must work before frontend stops)
2. **Test backend in production** (verify cookies set correctly)
3. **Deploy frontend** (remove client-side cookie setting)
4. **Monitor error logs** for 24 hours

### Rollback Plan:
If issues detected:
1. Revert frontend deployment (restore client-side cookie setting)
2. Keep backend changes (httpOnly cookies don't hurt)
3. Investigate issue
4. Redeploy when fixed

---

## Success Criteria

✅ **Security:**
- No tokens in localStorage
- All auth cookies have `httpOnly` flag
- All auth cookies have `sameSite: strict`
- CSRF protection verified

✅ **Functionality:**
- Login works (email + OAuth)
- Logout works (clears cookies)
- Token refresh works (if implemented)
- Users stay logged in on page refresh

✅ **Monitoring:**
- No auth errors in production logs
- No user complaints about login issues
- XSS/CSRF attack attempts logged (if monitoring in place)

---

**Estimated Total Time:** 3-4 hours
**Risk Level:** Medium (with proper testing)
**Impact:** High (critical security improvements)
