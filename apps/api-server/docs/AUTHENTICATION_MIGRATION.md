# Authentication API Migration Guide

## Overview

The O4O Platform authentication system has been consolidated into a unified API endpoint at `/api/v1/authentication`. This guide explains the migration from legacy authentication routes to the new unified system.

---

## What Changed?

### Legacy Routes (Deprecated)

The following authentication routes have been deprecated:

| Legacy Route | Status | Sunset Date | Replacement |
|-------------|--------|-------------|-------------|
| `/api/auth` | ⚠️ Active | TBD | `/api/v1/authentication` |
| `/api/v1/auth` | ⚠️ Active | TBD | `/api/v1/authentication` |
| `/api/v1/auth/cookie` | ⚠️ Deprecated | 2025-12-31 | `/api/v1/authentication` |
| `/api/auth/unified` | ✅ **REMOVED** | 2025-11-19 | `/api/v1/authentication` |
| `/api/v1/auth/unified` | ✅ **REMOVED** | 2025-11-19 | `/api/v1/authentication` |

### Deprecation Headers

Deprecated routes return the following HTTP headers:

```http
Deprecation: true
Sunset: 2025-12-31T00:00:00Z
Link: </api/v1/authentication>; rel="alternate"
X-API-Deprecated: true
X-API-Replacement: /api/v1/authentication
```

**Response Body Warning:**
```json
{
  "success": true,
  "data": { ... },
  "_deprecated": {
    "message": "This endpoint is deprecated. Please use /api/v1/authentication instead.",
    "replacement": "/api/v1/authentication",
    "sunsetDate": "2025-12-31T00:00:00Z"
  }
}
```

---

## Migration Path

### Route Changes

#### Email/Password Login

**Before:**
```bash
POST /api/auth/login
POST /api/v1/auth/login
POST /api/v1/auth/cookie/login
POST /api/auth/unified/login
```

**After:**
```bash
POST /api/v1/authentication/login
# or convenience endpoint
POST /api/v1/authentication/email/login
```

---

#### OAuth Login

**Before:**
```bash
POST /api/auth/unified/oauth
POST /api/v1/auth/unified/oauth
```

**After:**
```bash
POST /api/v1/authentication/login
```

**Request body change:**
```json
// Before
{
  "provider": "google",
  "profile": {
    "id": "...",
    "email": "..."
  }
}

// After
{
  "provider": "google",
  "oauthProfile": {
    "id": "...",
    "email": "..."
  }
}
```

---

#### Token Refresh

**Before:**
```bash
POST /api/v1/auth/cookie/refresh
POST /api/auth/unified/refresh
```

**After:**
```bash
POST /api/v1/authentication/refresh
```

---

#### Logout

**Before:**
```bash
POST /api/v1/auth/cookie/logout
POST /api/auth/unified/logout
POST /api/auth/logout
```

**After:**
```bash
POST /api/v1/authentication/logout
# or logout from all devices
POST /api/v1/authentication/logout-all
```

---

#### Get Current User

**Before:**
```bash
GET /api/v1/auth/cookie/me
GET /api/auth/status
```

**After:**
```bash
GET /api/v1/authentication/me
# or check status without throwing error
GET /api/v1/authentication/status
```

---

#### Password Reset

**Before:**
```bash
POST /api/v1/auth/cookie/forgot-password
POST /api/v1/auth/cookie/reset-password
POST /api/auth/unified/forgot-password
POST /api/auth/unified/reset-password
```

**After:**
```bash
POST /api/v1/authentication/forgot-password
POST /api/v1/authentication/reset-password
```

---

## Response Format Changes

### Unified Response Structure

All endpoints now use a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "message": "Optional success message",
  "user": { ... },
  "tokens": { ... },
  "sessionId": "..."
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

### Token Structure

**Before (JWT only):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**After (Comprehensive tokens):**
```json
{
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

---

## Frontend Migration

### React/TypeScript Example

#### Before (Legacy)

```typescript
// Legacy auth client
async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
}

async function getProfile() {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/auth/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

#### After (New Unified API)

```typescript
// New unified auth client
async function login(email: string, password: string) {
  const response = await fetch('/api/v1/authentication/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      provider: 'email',
      email,
      password
    })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Login failed');
  }

  // Tokens are automatically stored in httpOnly cookies
  // You can also store accessToken in memory for client-side use
  return data;
}

async function getProfile() {
  const response = await fetch('/api/v1/authentication/me', {
    credentials: 'include' // Sends cookies
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to get profile');
  }

  return data.user;
}
```

---

### Auth Client Example

```typescript
// auth-client.ts
class AuthClient {
  private baseURL = '/api/v1/authentication';

  async login(email: string, password: string) {
    return this.post('/login', {
      provider: 'email',
      email,
      password
    });
  }

  async loginWithOAuth(provider: 'google' | 'kakao' | 'naver', oauthProfile: OAuthProfile) {
    return this.post('/login', {
      provider,
      oauthProfile
    });
  }

  async refresh() {
    return this.post('/refresh', {});
  }

  async logout() {
    return this.post('/logout', {});
  }

  async getMe() {
    return this.get('/me');
  }

  async checkStatus() {
    return this.get('/status');
  }

  async forgotPassword(email: string) {
    return this.post('/forgot-password', { email });
  }

  async resetPassword(token: string, password: string) {
    return this.post('/reset-password', { token, password });
  }

  private async post(path: string, body: any) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });

    return response.json();
  }

  private async get(path: string) {
    const response = await fetch(`${this.baseURL}${path}`, {
      credentials: 'include'
    });

    return response.json();
  }
}

export const authClient = new AuthClient();
```

---

## Backend Migration

### Express Middleware

#### Before

```typescript
import { authenticateToken } from '../middleware/auth.middleware';

app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
```

#### After

```typescript
import { requireAuth } from '../middleware/auth.middleware';

app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
```

**Note:** Both `authenticateToken` and `requireAuth` are still supported for backward compatibility.

---

## Testing

### cURL Examples

#### Login

```bash
# Before
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# After
curl -X POST http://localhost:4000/api/v1/authentication/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"provider":"email","email":"user@example.com","password":"password123"}'
```

#### Get Profile

```bash
# Before
curl -X GET http://localhost:4000/api/auth/status \
  -H "Authorization: Bearer $TOKEN"

# After
curl -X GET http://localhost:4000/api/v1/authentication/me \
  -b cookies.txt
```

---

## Monitoring Deprecated Usage

Server logs track deprecated route access:

```
[DEPRECATED] GET /api/auth/unified accessed from 192.168.1.1
[DEPRECATED] POST /api/v1/auth/cookie accessed from 192.168.1.1
```

**Check deprecated usage:**

```bash
# On API server
ssh o4o-api "npx pm2 logs o4o-api-server | grep DEPRECATED"
```

---

## Breaking Changes

### 1. OAuth Request Structure

**Before:**
```json
{
  "provider": "google",
  "profile": { ... }
}
```

**After:**
```json
{
  "provider": "google",
  "oauthProfile": { ... }
}
```

**Migration:** Update client code to use `oauthProfile` instead of `profile`.

---

### 2. Error Response Codes

Some error codes have been standardized:

| Old Code | New Code |
|----------|----------|
| `EMAIL_NOT_VERIFIED` | `ACCOUNT_NOT_ACTIVE` |
| `ACCOUNT_INACTIVE` | `ACCOUNT_NOT_ACTIVE` |
| `TOKEN_INVALID` | `INVALID_TOKEN` |
| `TOKEN_EXPIRED` | `INVALID_REFRESH_TOKEN` |

**Migration:** Update error handling code to check for new error codes.

---

### 3. Cookie Names

Cookie names remain the same, but attributes have been standardized:

| Attribute | Old Value | New Value |
|-----------|-----------|-----------|
| `sameSite` | `lax` | `strict` |
| `secure` | Varies | `true` (production only) |

**Migration:** Ensure your frontend sends `credentials: 'include'` in fetch requests.

---

## Rollback Plan

If issues arise, you can temporarily revert to legacy routes:

1. **Identify the issue:** Check server logs and error responses
2. **Update client code:** Revert to legacy route URLs
3. **Monitor:** Check for successful requests
4. **Report:** Contact development team with error details

**Note:** Legacy routes will remain active until their sunset dates.

---

## Timeline

| Date | Event |
|------|-------|
| 2025-11-19 | `/api/auth/unified` and `/api/v1/auth/unified` removed |
| 2025-12-31 | `/api/v1/auth/cookie` sunset date (planned) |
| TBD | `/api/auth` and `/api/v1/auth` deprecation announcement |

---

## Support

For migration assistance:
1. Review [API_AUTHENTICATION.md](./API_AUTHENTICATION.md) for complete endpoint documentation
2. Check deprecation headers and response warnings
3. Test in development environment first
4. Contact development team with migration questions

**Development Team:**
- API Documentation: See `docs/API_AUTHENTICATION.md`
- Server Logs: `ssh o4o-api "npx pm2 logs o4o-api-server"`
- Rate Limiting: Monitor `X-RateLimit-*` headers
