# Customizer API Reference

Complete API documentation for the O4O Platform Customizer endpoints.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
   - [Scroll-to-Top Settings](#scroll-to-top-settings)
   - [Button Settings](#button-settings)
   - [Breadcrumbs Settings](#breadcrumbs-settings)
4. [Common Responses](#common-responses)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

---

## Overview

**Base URL:** `https://your-domain.com/api/v1/customizer`

**Content-Type:** `application/json`

**API Version:** v1.0.0

All Customizer settings are accessed through RESTful endpoints following the pattern:
- `GET /api/v1/customizer/{section}` - Retrieve settings (public)
- `PUT /api/v1/customizer/{section}` - Update settings (authenticated)

---

## Authentication

### Public Endpoints (GET)

All **GET** requests are **public** and do not require authentication:

```bash
curl https://your-domain.com/api/v1/customizer/scroll-to-top
```

### Protected Endpoints (PUT)

All **PUT** requests require authentication via **JWT Bearer Token**:

```bash
curl -X PUT \
  https://your-domain.com/api/v1/customizer/scroll-to-top \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Obtaining a Token

**POST** `/api/v1/auth/login`

```json
// Request
{
  "email": "user@example.com",
  "password": "your-password"
}

// Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

### Required Permissions

To update customizer settings, the authenticated user must have:
- **Permission:** `settings:write`
- **Roles:** `admin`, `editor`, `designer`

---

## Endpoints

### Scroll-to-Top Settings

Configure the scroll-to-top button behavior and appearance.

#### GET Scroll-to-Top Settings

**Endpoint:** `GET /api/v1/customizer/scroll-to-top`

**Authentication:** None (public)

**Response:**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "displayType": "both",
    "threshold": 300,
    "backgroundColor": "#3b82f6",
    "iconColor": "#ffffff",
    "position": "right"
  }
}
```

**Fields:**

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `enabled` | boolean | Enable/disable scroll-to-top button | `true` |
| `displayType` | string | Display on: `"desktop"`, `"mobile"`, or `"both"` | `"both"` |
| `threshold` | number | Pixels to scroll before showing (min: 0) | `300` |
| `backgroundColor` | string | Button background color (hex) | `"#3b82f6"` |
| `iconColor` | string | Icon color (hex) | `"#ffffff"` |
| `position` | string | Button position: `"left"` or `"right"` | `"right"` |

#### UPDATE Scroll-to-Top Settings

**Endpoint:** `PUT /api/v1/customizer/scroll-to-top`

**Authentication:** Required (JWT Bearer Token)

**Permissions:** `settings:write`

**Request Body:**

```json
{
  "enabled": true,
  "displayType": "mobile",
  "threshold": 500,
  "backgroundColor": "#ff0000",
  "iconColor": "#ffffff",
  "position": "left"
}
```

**Note:** All fields are optional - only provide fields you want to update. Missing fields will retain their current values (deep merge).

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "displayType": "mobile",
    "threshold": 500,
    "backgroundColor": "#ff0000",
    "iconColor": "#ffffff",
    "position": "left"
  }
}
```

**Response (Error - Validation):**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "path": ["threshold"],
      "message": "Expected number, received string"
    }
  ]
}
```

**Example Request:**

```bash
curl -X PUT \
  https://your-domain.com/api/v1/customizer/scroll-to-top \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

---

### Button Settings

Configure button styles for different variants (primary, secondary, outline, text).

#### GET Button Settings

**Endpoint:** `GET /api/v1/customizer/button-settings`

**Authentication:** None (public)

**Response:**

```json
{
  "success": true,
  "data": {
    "global": {
      "minHeight": 40,
      "minWidth": "auto",
      "displayType": "inline-block",
      "iconSpacing": 8
    },
    "primary": {
      "backgroundColor": "#3b82f6",
      "textColor": "#ffffff",
      "borderWidth": 1,
      "borderColor": "#3b82f6",
      "borderStyle": "solid",
      "borderRadius": 6,
      "paddingVertical": 12,
      "paddingHorizontal": 24,
      "fontSize": {
        "desktop": 16,
        "tablet": 15,
        "mobile": 14
      },
      "fontWeight": "600",
      "textTransform": "none",
      "letterSpacing": 0,
      "hoverBackgroundColor": "#2563eb",
      "hoverTextColor": "#ffffff",
      "hoverBorderColor": "#2563eb",
      "transitionDuration": 200,
      "boxShadow": "medium",
      "hoverBoxShadow": "large",
      "hoverTransform": "translateY"
    },
    "secondary": { /* similar structure */ },
    "outline": { /* similar structure */ },
    "text": { /* similar structure */ }
  }
}
```

**Button Variant Fields:**

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `backgroundColor` | string | Button background color (hex) | `"#3b82f6"` |
| `textColor` | string | Button text color (hex) | `"#ffffff"` |
| `borderWidth` | number | Border width in pixels (0-10) | `1` |
| `borderColor` | string | Border color (hex) | `"#3b82f6"` |
| `borderStyle` | string | Border style: `"solid"`, `"dashed"`, `"dotted"`, `"none"` | `"solid"` |
| `borderRadius` | number | Border radius in pixels (0-50) | `6` |
| `paddingVertical` | number | Vertical padding in pixels (0-30) | `12` |
| `paddingHorizontal` | number | Horizontal padding in pixels (0-50) | `24` |
| `fontSize` | object | Responsive font sizes (desktop/tablet/mobile) | `{desktop: 16, tablet: 15, mobile: 14}` |
| `fontWeight` | string | Font weight: `"400"`, `"500"`, `"600"`, `"700"` | `"600"` |
| `textTransform` | string | Text transform: `"none"`, `"uppercase"`, `"lowercase"`, `"capitalize"` | `"none"` |
| `letterSpacing` | number | Letter spacing in pixels (-2 to 5) | `0` |
| `hoverBackgroundColor` | string | Hover state background color | `"#2563eb"` |
| `hoverTextColor` | string | Hover state text color | `"#ffffff"` |
| `hoverBorderColor` | string | Hover state border color | `"#2563eb"` |
| `transitionDuration` | number | Transition duration in ms (0-1000) | `200` |
| `boxShadow` | string | Box shadow: `"none"`, `"small"`, `"medium"`, `"large"` | `"medium"` |
| `hoverBoxShadow` | string | Hover box shadow: `"none"`, `"small"`, `"medium"`, `"large"` | `"large"` |
| `hoverTransform` | string | Hover transform: `"none"`, `"scale"`, `"translateY"` | `"translateY"` |

**Global Settings:**

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `minHeight` | number | Minimum button height in pixels (20-80) | `40` |
| `minWidth` | string | Minimum button width (`"auto"` or `"100px"`, etc.) | `"auto"` |
| `displayType` | string | CSS display: `"inline-block"`, `"block"`, `"inline-flex"` | `"inline-block"` |
| `iconSpacing` | number | Space between icon and text in pixels (0-20) | `8` |

#### UPDATE Button Settings

**Endpoint:** `PUT /api/v1/customizer/button-settings`

**Authentication:** Required (JWT Bearer Token)

**Permissions:** `settings:write`

**Request Body (Partial Update):**

```json
{
  "primary": {
    "backgroundColor": "#ff0000",
    "hoverBackgroundColor": "#cc0000",
    "borderRadius": 8
  }
}
```

**Note:** You can update specific variants without affecting others. Only provided fields will be updated (deep merge).

**Response:**

```json
{
  "success": true,
  "data": {
    "global": { /* unchanged */ },
    "primary": {
      "backgroundColor": "#ff0000",        // Updated
      "hoverBackgroundColor": "#cc0000",   // Updated
      "borderRadius": 8,                   // Updated
      "textColor": "#ffffff",              // Preserved
      "borderWidth": 1,                    // Preserved
      /* ... other preserved fields */
    },
    "secondary": { /* unchanged */ },
    "outline": { /* unchanged */ },
    "text": { /* unchanged */ }
  }
}
```

**Example Request:**

```bash
curl -X PUT \
  https://your-domain.com/api/v1/customizer/button-settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "primary": {
      "backgroundColor": "#28a745",
      "borderRadius": 12
    },
    "secondary": {
      "backgroundColor": "#6c757d"
    }
  }'
```

---

### Breadcrumbs Settings

Configure breadcrumb navigation appearance and behavior.

#### GET Breadcrumbs Settings

**Endpoint:** `GET /api/v1/customizer/breadcrumbs-settings`

**Authentication:** None (public)

**Response:**

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "position": "below-header",
    "separator": "/",
    "showHome": true,
    "colors": {
      "text": "#6b7280",
      "link": "#3b82f6",
      "hover": "#2563eb",
      "active": "#1f2937"
    },
    "fontSize": {
      "desktop": 14,
      "tablet": 13,
      "mobile": 12
    },
    "padding": {
      "top": 12,
      "bottom": 12,
      "left": 0,
      "right": 0
    }
  }
}
```

**Fields:**

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `enabled` | boolean | Enable/disable breadcrumbs | `true` |
| `position` | string | Position: `"above-header"`, `"below-header"`, `"above-content"` | `"below-header"` |
| `separator` | string | Separator character(s): `"/"`, `">"`, `"»"`, `"•"` | `"/"` |
| `showHome` | boolean | Show "Home" link as first item | `true` |
| `colors.text` | string | Default text color (hex) | `"#6b7280"` |
| `colors.link` | string | Link color (hex) | `"#3b82f6"` |
| `colors.hover` | string | Hover color (hex) | `"#2563eb"` |
| `colors.active` | string | Active/current page color (hex) | `"#1f2937"` |
| `fontSize` | object | Responsive font sizes | `{desktop: 14, tablet: 13, mobile: 12}` |
| `padding` | object | Padding (top, bottom, left, right) in pixels (0-50) | `{top: 12, bottom: 12, left: 0, right: 0}` |

#### UPDATE Breadcrumbs Settings

**Endpoint:** `PUT /api/v1/customizer/breadcrumbs-settings`

**Authentication:** Required (JWT Bearer Token)

**Permissions:** `settings:write`

**Request Body:**

```json
{
  "enabled": false
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "enabled": false,                     // Updated
    "position": "below-header",            // Preserved
    "separator": "/",                      // Preserved
    "showHome": true,                      // Preserved
    "colors": { /* preserved */ },
    "fontSize": { /* preserved */ },
    "padding": { /* preserved */ }
  }
}
```

**Example Request:**

```bash
curl -X PUT \
  https://your-domain.com/api/v1/customizer/breadcrumbs-settings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "separator": ">",
    "colors": {
      "link": "#ff0000"
    }
  }'
```

---

## Common Responses

### Success Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Optional success message"
}
```

### Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Error category",
  "message": "Detailed error message",
  "details": [ /* optional validation details */ ]
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid request body or validation error |
| `401` | Unauthorized | Missing or invalid authentication token |
| `403` | Forbidden | Authenticated but insufficient permissions |
| `404` | Not Found | Endpoint does not exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error occurred |
| `503` | Service Unavailable | Service temporarily down |

### Error Types

#### 400 Bad Request - Validation Error

**Scenario:** Invalid data sent in request body

**Response:**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "code": "invalid_type",
      "path": ["backgroundColor"],
      "message": "Expected string, received number"
    },
    {
      "code": "invalid_string",
      "path": ["backgroundColor"],
      "message": "Invalid hex color format"
    }
  ]
}
```

**Common Validation Errors:**

- `invalid_type` - Wrong data type (e.g., string instead of number)
- `invalid_string` - String doesn't match pattern (e.g., invalid hex color)
- `too_small` - Number below minimum
- `too_big` - Number above maximum
- `invalid_enum_value` - Value not in allowed options

#### 401 Unauthorized

**Scenario:** Missing or expired JWT token

**Response:**

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**Solutions:**
- Include valid JWT token in `Authorization: Bearer {token}` header
- Refresh expired token using `/api/v1/auth/refresh`
- Re-authenticate if refresh token is also expired

#### 403 Forbidden

**Scenario:** Authenticated user lacks required permissions

**Response:**

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions. Required: settings:write"
}
```

**Solutions:**
- Request `settings:write` permission from administrator
- Check user role has required permissions

#### 429 Too Many Requests

**Scenario:** Rate limit exceeded

**Response:**

```json
{
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60
}
```

**Rate Limits:**
- GET requests: 100 requests per 15 minutes per IP
- PUT requests: 20 requests per 15 minutes per user

#### 500 Internal Server Error

**Scenario:** Unexpected server error

**Response:**

```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred. Please try again later."
}
```

**Solutions:**
- Retry request after a few seconds
- Check server logs if you're the administrator
- Contact support if problem persists

---

## Rate Limiting

### Limits

**GET Endpoints (Public):**
- **Limit:** 100 requests per 15 minutes
- **Scope:** Per IP address
- **Headers:**
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1609459200
  ```

**PUT Endpoints (Authenticated):**
- **Limit:** 20 requests per 15 minutes
- **Scope:** Per authenticated user
- **Headers:**
  ```
  X-RateLimit-Limit: 20
  X-RateLimit-Remaining: 15
  X-RateLimit-Reset: 1609459200
  ```

### Handling Rate Limits

When rate limited, wait for the time specified in `X-RateLimit-Reset` or `retryAfter` field:

```javascript
const response = await fetch('/api/v1/customizer/scroll-to-top', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  console.log(`Rate limited. Retry after ${retryAfter} seconds`);
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  // Retry request
}
```

---

## Examples

### JavaScript (Fetch API)

#### GET Request

```javascript
async function getScrollToTopSettings() {
  try {
    const response = await fetch('https://your-domain.com/api/v1/customizer/scroll-to-top');
    const result = await response.json();

    if (result.success) {
      console.log('Settings:', result.data);
      return result.data;
    } else {
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

#### PUT Request (with Auth)

```javascript
async function updateButtonSettings(updates) {
  const token = localStorage.getItem('accessToken');

  try {
    const response = await fetch('https://your-domain.com/api/v1/customizer/button-settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Settings updated:', result.data);
      return result.data;
    } else {
      console.error('Error:', result.error, result.details);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Failed to update settings:', error);
    throw error;
  }
}

// Usage
updateButtonSettings({
  primary: {
    backgroundColor: '#28a745',
    borderRadius: 8,
  },
});
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

interface ScrollToTopSettings {
  enabled: boolean;
  displayType: 'desktop' | 'mobile' | 'both';
  threshold: number;
  backgroundColor: string;
  iconColor: string;
  position: 'left' | 'right';
}

export function useScrollToTopSettings() {
  const [settings, setSettings] = useState<ScrollToTopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/v1/customizer/scroll-to-top');
        const result = await response.json();

        if (result.success) {
          setSettings(result.data);
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<ScrollToTopSettings>) => {
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch('/api/v1/customizer/scroll-to-top', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        setSettings(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return { settings, loading, error, updateSettings };
}
```

### cURL Examples

#### GET with Default Settings

```bash
curl -X GET https://your-domain.com/api/v1/customizer/scroll-to-top
```

#### PUT with Authentication

```bash
curl -X PUT \
  https://your-domain.com/api/v1/customizer/button-settings \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "primary": {
      "backgroundColor": "#28a745",
      "hoverBackgroundColor": "#218838"
    }
  }'
```

#### PUT with Pretty JSON Response

```bash
curl -X PUT \
  https://your-domain.com/api/v1/customizer/breadcrumbs-settings \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"separator": ">"}' \
  | jq '.'
```

---

## Versioning

The API uses semantic versioning in the URL path: `/api/v1/...`

**Current Version:** v1.0.0

**Backward Compatibility:** v1.x releases maintain backward compatibility. Breaking changes will be released as v2.

**Deprecation Policy:** Deprecated endpoints remain functional for at least 6 months with deprecation warnings in response headers.

---

## Support

### Documentation
- [User Guide](./CUSTOMIZER_USER_GUIDE.md)
- [Developer Guide](./CUSTOMIZER_DEVELOPER_GUIDE.md)
- [Migration Guide](../../api-server/MIGRATION_GUIDE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Contact
- **API Issues:** api-support@o4o-platform.com
- **Bug Reports:** [GitHub Issues](https://github.com/o4o-platform/platform/issues)
- **Questions:** [Community Forum](https://community.o4o-platform.com)

---

## Changelog

### v1.0.0 (2025-10-11)

**Added:**
- Initial API release
- 6 customizer endpoints (3 sections × GET/PUT)
- JWT authentication
- Zod validation
- Automatic migration system
- Deep merge for partial updates
- Rate limiting

**Fixed:**
- N/A (initial release)

**Breaking Changes:**
- N/A (initial release)

---

Last Updated: 2025-10-11
