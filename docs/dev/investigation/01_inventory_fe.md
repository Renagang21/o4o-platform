# Frontend (FE) User/Auth Inventory

**Investigation Date:** 2025-11-08
**Scope:** `apps/main-site/src`

---

## 1. Routing & Navigation

### Router Configuration
- **File:** `src/App.tsx` (lines 1-170)
- **Library:** React Router v6 (BrowserRouter, Routes, Route)
- **Auth Routes:**
  - `/signup`, `/register`, `/auth/signup`, `/auth/register` → `Signup.tsx`
  - `/logout` → `Logout.tsx` (auto-processing)
  - `/auth/callback`, `/auth/callback/:provider` → `OAuthCallback.tsx`
  - `/auth/verify-email/pending` → `EmailVerificationPending.tsx`
  - `/auth/verify-email/success` → `EmailVerificationSuccess.tsx`
  - `/auth/verify-email/error` → `EmailVerificationError.tsx`
  - `/auth/forgot-password` → `ForgotPassword.tsx`
  - `/auth/reset-password` → `ResetPassword.tsx`
  - **NOTE:** `/login`, `/find-id`, `/find-password` handled by `PublicPage.tsx` (content-editor driven via shortcodes)

### Route Guards
- **File:** `src/components/auth/PrivateRoute.tsx`
- **Protected Routes:** `/editor/page/:id?` requires authentication
- **Guard Implementation:** Wraps children with authentication check

---

## 2. State Management

### Primary Auth Context
- **File:** `src/contexts/AuthContext.tsx` (198 lines)
- **Provider:** `AuthProvider` (React Context API)
- **State:**
  - `user: User | null`
  - `isLoading: boolean`
  - `isAuthenticated: boolean` (computed: `!!user && user.status === 'approved'`)

### Core Methods:
- `login(email, password)` → Returns Promise<boolean>
- `logout()` → Clears cookies + state
- `updateUser(userData)` → Updates user in state + cookies
- `checkAuthStatus()` → Verifies token on mount + refreshes user data

### Token/Session Storage:
- **Method:** `js-cookie` library
- **Cookies:**
  - `authToken` (expires: 1 day)
  - `user` (JSON stringified, expires: 1 day)
- **Token verification:** Calls `authAPI.verifyToken()` on app init
- **Preferences loading:** Fetches `currentRole`, `defaultRole`, `availableRoles` from `/auth/preferences`

### Custom Hooks:
- `useAuth()` - Returns full AuthContext
- `usePermissions()` - Returns:
  - `isAdmin`, `isManager`, `isPartner`, `isUser`
  - `isManagerOrAdmin`
  - `hasRole(roles[])`, `canAccessAdmin`

### Data Normalization:
- **MongoDB compatibility:** Maps `_id` to `id` field (lines 29-34, 42-43, 88-89, 118-119)

---

## 3. Auth Pages & Components

### Auth Pages (`src/pages/auth/`)
| File | Purpose | Key Features |
|------|---------|--------------|
| `Login.tsx` | Login form | Email/password + OAuth buttons |
| `Signup.tsx` | Registration | Terms acceptance, marketing opt-in |
| `Logout.tsx` | Auto-logout | Immediate redirect |
| `OAuthCallback.tsx` | OAuth redirect handler | Processes provider callbacks |
| `FindId.tsx` | Email recovery | - |
| `FindPassword.tsx` | Password reset request | - |
| `ForgotPassword.tsx` | Password reset flow | - |
| `ResetPassword.tsx` | Set new password | Token-based |
| `EmailVerificationPending.tsx` | Waiting state | - |
| `EmailVerificationSuccess.tsx` | Confirmation | - |
| `EmailVerificationError.tsx` | Error state | - |

### Auth Components (`src/components/`)
| File | Purpose | Notes |
|------|---------|-------|
| `auth/RoleGate.tsx` | Conditional rendering by role | UI-level guard |
| `auth/PrivateRoute.tsx` | Route-level auth guard | Redirects if not authenticated |
| `guards/RoleGuard.tsx` | Role-specific guard | Duplicate of RoleGate? |
| `common/UserRoleSwitch.tsx` | Role switcher UI | Multi-role support |
| `blocks/RoleSwitcher.tsx` | Block-based role switch | Content editor integration |
| `account/SessionManager.tsx` | Session lifecycle | - |
| `shortcodes/authShortcodes.tsx` | Auth UI shortcodes | `[login_form]`, `[social_login]`, etc. |
| `features/ProfileCard.tsx` | User profile display | - |

---

## 4. API Integration

### Auth API Client
- **File:** `src/api/auth/authApi.ts` (151 lines)
- **Dual System:** SSO (primary) + Legacy (fallback)
- **SSO Toggle:** `VITE_USE_SSO` env var (default: `true`)

### Key Endpoints (abstracted):
- `register(data)` → Legacy only
- `login(email, password)` → SSO first, fallback to legacy
- `legacyLogin(data)` → Direct legacy auth
- `getCurrentUser()` → SSO first, fallback to legacy
- `logout()` → Clears both SSO + legacy tokens
- `getToken()` → SSO token or legacy token
- `isAuthenticated()` → Checks SSO or legacy
- `refreshToken()` → SSO only

### Token Management:
- **SSO token:** Managed by `ssoAuthAPI.getTokenManager()`
- **Legacy tokens:**
  - `localStorage.setItem('token', ...)`
  - `localStorage.setItem('legacy_token', ...)`
  - `localStorage.setItem('sso_access_token', ...)`

### Auth Interceptor
- **File:** `src/services/authInterceptor.ts`
- **Purpose:** Auto-attach tokens to axios requests
- **Init:** Called in `App.tsx` useEffect (line 52)

---

## 5. Type Definitions

### User Types
- **File:** `src/types/user.ts` (161 lines)
- **Core Type:** `User` interface (lines 40-57)
  - Supports `_id` (MongoDB) + `id` (UUID)
  - `role?: UserRole` (single, optional)
  - `roles?: UserRole[]` (multi-role array)
  - `currentRole?: UserRole` (active role for switching)
  - `defaultRole?: UserRole`
  - `userType: 'admin' | 'supplier' | 'retailer' | 'customer'` (legacy)
  - `status: UserStatus`
  - `businessInfo?: BusinessInfo`

### UserRole Type (lines 8-22):
```typescript
'user' | 'admin' | 'administrator' | 'manager' | 'partner' |
'operator' | 'member' | 'seller' | 'affiliate' | 'contributor' |
'vendor' | 'supplier' | 'retailer' | 'customer'
```
**Total:** 14 role strings

### Auth Types
- **File:** `src/types/auth.ts` (122 lines)
- **LoginFormData, RegisterFormData, ResetPasswordFormData**
- **AuthUser, AuthTokens, AuthResponse**
- **AuthErrorCode enum** (11 codes: INVALID_CREDENTIALS, EMAIL_ALREADY_EXISTS, etc.)
- **OAuthProviders:** google, kakao, naver

---

## 6. Configuration

### Role Redirects
- **File:** `src/config/roleRedirects.ts`
- **Purpose:** Post-login redirect rules per role

### OAuth Provider Config
- **Not found in FE** - Likely handled server-side

---

## 7. Utilities & Services

| File | Purpose |
|------|---------|
| `src/utils/logRoleChange.ts` | Role switch logging |
| `src/services/authProviderService.ts` | OAuth provider abstraction |
| `src/hooks/useReusableBlock.ts` | Block system auth integration? |
| `src/hooks/useAdmin.ts` | Admin-specific hooks |

---

## 🔴 Issues & Inconsistencies

### 1. **Dual Token Storage** (Security Risk)
- Cookies (`authToken`, `user`) **AND** localStorage (`token`, `legacy_token`, `sso_access_token`)
- **Risk:** XSS can steal localStorage tokens
- **Cookie Config:** Not visible - need to check:
  - `httpOnly`, `secure`, `sameSite` settings

### 2. **Duplicate Role Guards**
- `auth/RoleGate.tsx` vs `guards/RoleGuard.tsx`
- `common/UserRoleSwitch.tsx` vs `blocks/RoleSwitcher.tsx`

### 3. **Inconsistent Role Definitions**
- Frontend: 14 role strings (`user.ts`)
- Backend: TBD (need API inventory)
- **Risk:** FE/BE mismatch can cause authorization failures

### 4. **MongoDB/PostgreSQL ID Confusion**
- `_id` (MongoDB) vs `id` (UUID PostgreSQL)
- Normalization logic in 4 places - potential for bugs

### 5. **SSO/Legacy Dual System Complexity**
- Fallback logic in every API call
- 3 different token storage keys
- **Migration risk:** Unclear when to deprecate legacy

### 6. **No Route-Level Role Guards**
- `PrivateRoute` only checks `isAuthenticated`
- **Missing:** Role-specific route protection (e.g., admin-only routes)

### 7. **Preferences Load Timing**
- `checkAuthStatus()` loads preferences separately (lines 122-131)
- **Risk:** Race condition if user data used before preferences load

### 8. **Hardcoded Login Redirect**
- Per CLAUDE.md: "모두 홈으로 이동"
- **Missing:** Role-specific dashboards (despite `roleRedirects.ts` existing)

---

## 📋 Action Items

### P1 (Security/Critical):
1. Audit cookie security settings (`httpOnly`, `secure`, `sameSite`)
2. Remove localStorage token storage (use httpOnly cookies only)
3. Implement CSRF protection

### P2 (Consistency):
1. Consolidate duplicate components (RoleGate vs RoleGuard)
2. Sync role definitions with backend
3. Unify ID handling (single source of truth for _id vs id)

### P3 (Architecture):
1. Add role-based route guards
2. Implement role-specific redirects (if needed)
3. Document SSO migration plan (when to sunset legacy)
4. Add token refresh logic (prevent session expiry)

---

## 📊 Metrics

- **Total Auth Pages:** 11
- **Total Auth Components:** 8
- **Total Role Strings (FE):** 14
- **Token Storage Locations:** 2 (cookies + localStorage)
- **Auth Systems:** 2 (SSO + Legacy)

---

**Next Steps:**
- Cross-reference with Backend API inventory
- Verify cookie security settings
- Test token expiry/refresh flow
