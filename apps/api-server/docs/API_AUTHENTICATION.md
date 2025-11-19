# Authentication API Documentation

## Overview

The O4O Platform provides a unified authentication system that supports multiple authentication methods:
- **Email/Password Authentication**
- **OAuth Authentication** (Google, Kakao, Naver)
- **Session Management** (Cookie-based and Token-based)
- **Password Reset & Email Verification**

This document describes the **new unified authentication API** available at `/api/v1/authentication`.

---

## Base URL

```
Production: https://api.neture.co.kr/api/v1/authentication
Development: http://localhost:4000/api/v1/authentication
```

---

## Authentication Methods

### 1. Email/Password Login

**Endpoint:** `POST /login`

**Request Body:**
```json
{
  "provider": "email",
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer",
    "status": "active"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "sessionId": "session-uuid"
}
```

**Response (Error - Invalid Credentials):**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

**Response (Error - Account Not Active):**
```json
{
  "success": false,
  "message": "Account is not active",
  "code": "ACCOUNT_NOT_ACTIVE",
  "details": {
    "status": "pending"
  }
}
```

---

### 2. OAuth Login

**Endpoint:** `POST /login`

**Request Body:**
```json
{
  "provider": "google",
  "oauthProfile": {
    "id": "google-user-id",
    "email": "user@gmail.com",
    "displayName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "emailVerified": true
  }
}
```

**Supported Providers:**
- `google`
- `kakao`
- `naver`

**Response:** Same as email/password login

---

### 3. Email Login (Convenience Endpoint)

**Endpoint:** `POST /email/login`

Simplified endpoint specifically for email/password authentication.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as `/login`

---

## Token Management

### Refresh Access Token

**Endpoint:** `POST /refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Or use cookies:**
The refresh token can also be read from the `refreshToken` cookie (httpOnly).

**Response (Success):**
```json
{
  "success": true,
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Invalid refresh token",
  "code": "INVALID_REFRESH_TOKEN"
}
```

---

### Verify Access Token

**Endpoint:** `POST /verify-token`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (Valid):**
```json
{
  "success": true,
  "valid": true,
  "payload": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "role": "customer",
    "iat": 1699999999,
    "exp": 1700000899
  }
}
```

**Response (Invalid):**
```json
{
  "success": false,
  "message": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

---

## Session Management

### Get Current User

**Endpoint:** `GET /me`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer",
    "status": "active",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-11-19T00:00:00Z"
  }
}
```

---

### Check Authentication Status

**Endpoint:** `GET /status`

**Headers:** (Optional)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "authenticated": false,
  "user": null
}
```

---

### Logout (Current Session)

**Endpoint:** `POST /logout`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### Logout from All Devices

**Endpoint:** `POST /logout-all`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

---

## Password Management

### Request Password Reset

**Endpoint:** `POST /forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
Always returns success to prevent email enumeration.

```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

---

### Reset Password

**Endpoint:** `POST /reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Response (Error - Invalid Token):**
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "code": "INVALID_PASSWORD_RESET_TOKEN"
}
```

---

## HTTP Cookies

The API uses httpOnly cookies for enhanced security:

### Cookie Names

| Cookie Name | Description | Duration |
|------------|-------------|----------|
| `accessToken` | JWT access token | 15 minutes |
| `refreshToken` | JWT refresh token | 7 days |
| `sessionId` | Session identifier | 7 days |

### Cookie Attributes

- `httpOnly`: true (prevents JavaScript access)
- `secure`: true (HTTPS only in production)
- `sameSite`: 'strict' (CSRF protection)
- `path`: '/'

---

## Error Codes

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `ACCOUNT_NOT_ACTIVE` | 403 | Account is not active or approved |
| `ACCOUNT_LOCKED` | 403 | Account has been locked |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification required |
| `NO_REFRESH_TOKEN` | 401 | Refresh token not provided |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token is invalid or expired |
| `INVALID_TOKEN` | 401 | Access token is invalid |
| `INVALID_PASSWORD_RESET_TOKEN` | 400 | Password reset token is invalid |
| `UNAUTHORIZED` | 401 | Authentication required |
| `USER_NOT_FOUND` | 404 | User not found |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limiting

Authentication endpoints are protected by rate limiting:

| Endpoint | Rate Limit |
|----------|-----------|
| `POST /login` | 5 requests per minute per IP |
| `POST /email/login` | 5 requests per minute per IP |
| `POST /refresh` | 10 requests per minute per IP |
| `POST /forgot-password` | 3 requests per 15 minutes per IP |
| `POST /reset-password` | 5 requests per hour per IP |
| Other endpoints | 60 requests per minute per IP |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1699999999
Retry-After: 60
```

---

## Security Best Practices

### 1. Token Storage

**Client-side:**
- Store access tokens in memory (not localStorage)
- Rely on httpOnly cookies when possible
- Implement automatic token refresh

### 2. HTTPS Only

Always use HTTPS in production to protect tokens in transit.

### 3. Token Expiration

- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Implement automatic refresh before expiration

### 4. Password Requirements

- Minimum 8 characters
- At least one uppercase letter (for new registrations)
- At least one lowercase letter
- At least one number
- At least one special character

---

## Example: Complete Authentication Flow

### Step 1: Login

```bash
curl -X POST https://api.neture.co.kr/api/v1/authentication/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "email",
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

### Step 2: Access Protected Resource

```bash
curl -X GET https://api.neture.co.kr/api/v1/authentication/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Step 3: Refresh Token

```bash
curl -X POST https://api.neture.co.kr/api/v1/authentication/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

### Step 4: Logout

```bash
curl -X POST https://api.neture.co.kr/api/v1/authentication/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Support

For issues or questions:
- Check API response error codes and messages
- Review server logs for detailed error information
- Contact development team with request details and error codes

**Server Log Format:**
```
[AUTH] Login attempt for user@example.com from 192.168.1.1
[AUTH] Login successful for user-uuid
[AUTH] Token refreshed for user-uuid
[AUTH] User user-uuid logged out
```
