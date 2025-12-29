# Web Server Architecture (G2 Phase)

> **Status**: Active (Constitution Level)
> **Created**: 2025-12-25
> **Work Order**: WO-GEN-PLATFORM-APP-ARCH-G2
> **Phase**: G2 - App Architecture Fixation

---

## 1. Overview

This document defines the **mandatory architecture** for all Web Servers (Frontend applications) in the O4O Platform.
Web Servers are the user-facing layer that consumes APIs from Core API and App API servers.

---

## 2. Web Server Definition

### 2.1 What is a Web Server?

A Web Server in O4O Platform is:
- A frontend application (React, Next.js, etc.)
- Serves static assets (HTML, JS, CSS, images)
- Makes API calls to backend servers
- **Does NOT** have direct database access

### 2.2 Current Web Servers

| App | URL | Stack | Deployment |
|-----|-----|-------|------------|
| **admin-dashboard** | admin.neture.co.kr | React + Vite | Nginx (13.125.144.8) |
| **main-site** | neture.co.kr | React + Vite | Nginx (13.125.144.8) |
| **ecommerce** | shop.neture.co.kr | React + Vite | Nginx (planned) |

---

## 3. Architecture Rules (Mandatory)

### 3.1 Data Access Rules

```
❌ FORBIDDEN: Web Server → Database (direct)
❌ FORBIDDEN: Web Server → Cloud SQL
❌ FORBIDDEN: Web Server → Redis
✅ REQUIRED:  Web Server → API Server → Database

Flow:
┌─────────────┐     HTTP/REST     ┌─────────────┐     SQL     ┌──────────┐
│ Web Server  │ ───────────────▶ │  API Server │ ──────────▶ │ Database │
│ (Frontend)  │ ◀─────────────── │  (Backend)  │ ◀────────── │          │
└─────────────┘      JSON         └─────────────┘             └──────────┘
```

### 3.2 API Call Rules

| Target | Allowed | Method |
|--------|---------|--------|
| Core API (`/api/v1/...`) | ✅ | authClient.api.get/post |
| App API (domain-specific) | ✅ | authClient.api.get/post |
| External APIs | ⚠️ | Requires approval |
| Other Web Servers | ❌ | Not allowed |

### 3.3 Authentication Handling

```typescript
// ✅ REQUIRED: Use authClient for all API calls
import { authClient } from '@o4o/auth-client';

// Auth state from Core API
const { user, isAuthenticated } = useAuth();

// API calls through authClient (auto-includes JWT)
const response = await authClient.api.get('/api/v1/users/me');
```

```typescript
// ❌ FORBIDDEN: Direct fetch with manual token handling
const response = await fetch('/api/users', {
  headers: { Authorization: `Bearer ${token}` } // Don't do this
});
```

### 3.4 Environment Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `VITE_API_URL` | ❌ Forbidden | Use authClient |
| `VITE_CORE_API_URL` | ❌ Forbidden | Use authClient |
| `NEXT_PUBLIC_API_URL` | ❌ Forbidden | Use authClient |

> **Rule**: API URLs are managed by `authClient`, not environment variables.

---

## 4. Build & Deployment Rules

### 4.1 Build Configuration

All Web Servers must:

```json
// package.json
{
  "scripts": {
    "build": "vite build",  // or next build
    "preview": "vite preview"
  }
}
```

### 4.2 Output Directory

| Framework | Output | Location |
|-----------|--------|----------|
| Vite | `dist/` | apps/{app}/dist |
| Next.js | `.next/` or `out/` | apps/{app}/.next |

### 4.3 Deployment Target

```
Current: Nginx on 13.125.144.8
Future:  Cloud Run (static) or Cloud Storage + CDN

Paths:
- admin-dashboard → /var/www/admin.neture.co.kr
- main-site       → /var/www/neture.co.kr
- ecommerce       → /var/www/shop.neture.co.kr
```

### 4.4 Deployment Workflow

```yaml
# Standard deployment pattern
- name: Build
  run: pnpm run build

- name: Deploy to Nginx
  run: |
    rsync -avz dist/ user@server:/var/www/{domain}/
```

---

## 5. Code Organization Rules

### 5.1 Required Directory Structure

```
apps/{web-server}/
├── src/
│   ├── components/        # UI components
│   ├── pages/             # Route pages
│   ├── hooks/             # Custom hooks
│   ├── services/          # API call functions
│   ├── stores/            # State management
│   └── utils/             # Utilities
├── public/                # Static assets
├── index.html             # Entry point
├── vite.config.ts         # Build config
└── package.json
```

### 5.2 API Service Pattern

```typescript
// src/services/user.service.ts
import { authClient } from '@o4o/auth-client';

export const userService = {
  async getProfile() {
    return authClient.api.get('/api/v1/users/me');
  },

  async updateProfile(data: UpdateProfileDto) {
    return authClient.api.put('/api/v1/users/me', data);
  }
};
```

### 5.3 Forbidden Patterns

```typescript
// ❌ Direct database connection
import { Pool } from 'pg';
const pool = new Pool({ connectionString: '...' });

// ❌ Hardcoded API URLs
const API_URL = 'https://api.neture.co.kr';

// ❌ Axios with manual headers
import axios from 'axios';
axios.get('/api/...', { headers: { ... } });
```

---

## 6. Security Rules

### 6.1 Sensitive Data

| Data Type | Client Storage | Handling |
|-----------|----------------|----------|
| JWT Token | ❌ localStorage | Cookie (httpOnly) |
| User Password | ❌ Never | Backend only |
| API Keys | ❌ Never | Backend only |
| User Data | ⚠️ Memory only | Clear on logout |

### 6.2 CORS Configuration

```
Web Server → API Server CORS:
- Origin: Explicitly listed domains
- Credentials: true
- Methods: GET, POST, PUT, DELETE, PATCH
```

### 6.3 Content Security Policy

Web Servers should implement CSP headers:
- Managed by Nginx or API server
- No inline scripts unless required

---

## 7. Allowed / Forbidden Summary

### 7.1 Allowed Actions

| Action | Status |
|--------|--------|
| Call Core API via authClient | ✅ |
| Call App API via authClient | ✅ |
| Use React/Vue/Next.js frameworks | ✅ |
| Deploy static files to Nginx | ✅ |
| Use @o4o/ui component library | ✅ |
| Use client-side state management | ✅ |

### 7.2 Forbidden Actions

| Action | Status | Alternative |
|--------|--------|-------------|
| Direct database connection | ❌ | Use API |
| Store JWT in localStorage | ❌ | Use httpOnly cookie |
| Hardcode API URLs | ❌ | Use authClient |
| Import backend-only packages | ❌ | API call |
| Server-side DB queries (SSR) | ❌ | API call from server |

---

## 8. SSR/SSG Considerations

For Next.js or similar SSR frameworks:

### 8.1 Server-Side Rendering

```typescript
// ✅ Allowed: API call from getServerSideProps
export async function getServerSideProps(context) {
  const response = await fetch(`${INTERNAL_API}/api/v1/data`);
  return { props: { data: response.json() } };
}

// ❌ Forbidden: Direct DB query in getServerSideProps
export async function getServerSideProps() {
  const db = await getConnection();
  const data = await db.query('SELECT * FROM ...');  // NO!
}
```

### 8.2 Static Generation

```typescript
// ✅ Allowed: API call at build time
export async function getStaticProps() {
  const response = await fetch(`${BUILD_API}/api/v1/static-data`);
  return { props: { data: response.json() } };
}
```

---

## 9. Reference

- [CLAUDE.md](../../CLAUDE.md) - Platform Constitution (Section 10: API Call Rules)
- [app-api-architecture.md](./app-api-architecture.md) - App API Architecture
- [infra-migration-gcp.md](./infra-migration-gcp.md) - Infrastructure
- [@o4o/auth-client](../../packages/auth-client) - Authentication Client

---

*This document is part of the G2 Phase - App Architecture Fixation.*
*It is subordinate to CLAUDE.md and governs all Web Server implementations.*
