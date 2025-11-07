# Authorization API Specification
**Phase 9 - Seller Authorization System**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document specifies the API endpoints for the Phase 9 seller authorization system, including request/response formats, authentication requirements, and error handling.

---

## API Endpoints Summary

| Endpoint | Method | Actor | Purpose |
|----------|--------|-------|---------|
| `/api/v1/ds/products/:productId/authorization-request` | POST | Seller | Submit authorization request |
| `/api/v1/ds/authorizations/my-requests` | GET | Seller | List own requests |
| `/api/supplier/authorization-requests` | GET | Supplier | List pending requests |
| `/api/supplier/authorization-requests/:id/approve` | POST | Supplier | Approve request |
| `/api/supplier/authorization-requests/:id/reject` | POST | Supplier | Reject request |
| `/api/supplier/authorizations/:id/revoke` | POST | Supplier | Revoke approved access |
| `/api/admin/authorizations` | GET | Admin | List all authorizations |

---

## Seller APIs

### 1. Submit Authorization Request

**Endpoint**: `POST /api/v1/ds/products/:productId/authorization-request`

**Purpose**: Seller requests access to sell a supplier's product

**Authentication**: Bearer token (Seller/Partner)

**Request**:
```http
POST /api/v1/ds/products/prod_abc123/authorization-request
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "message": "I'm interested in selling your premium widgets. I have experience with similar products and expect to sell 50+ units per month."
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | No | Optional message to supplier (max 1000 chars) |

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "authorization": {
      "id": "auth_req_abc123",
      "sellerId": "seller_xyz789",
      "productId": "prod_abc123",
      "supplierId": "sup_def456",
      "status": "PENDING",
      "requestMessage": "I'm interested in selling your premium widgets...",
      "requestedAt": "2025-11-07T12:00:00Z"
    },
    "product": {
      "id": "prod_abc123",
      "name": "Premium Widget",
      "supplier": {
        "id": "sup_def456",
        "name": "Premium Supplier Co."
      }
    },
    "estimatedReviewTime": "24-48 hours"
  },
  "message": "Authorization request submitted successfully"
}
```

**Error Responses**:

```json
// 400 Bad Request - Already has active request
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "You already have a pending request for this product",
    "details": {
      "existingRequestId": "auth_req_abc123",
      "status": "PENDING",
      "requestedAt": "2025-11-06T10:00:00Z"
    }
  }
}

// 400 Bad Request - Cooling-off period
{
  "success": false,
  "error": {
    "code": "COOLING_OFF_PERIOD",
    "message": "You must wait before reapplying",
    "details": {
      "rejectedAt": "2025-10-15T10:00:00Z",
      "canReapplyAt": "2025-11-14T10:00:00Z",
      "daysRemaining": 7
    }
  }
}

// 403 Forbidden - Product limit reached
{
  "success": false,
  "error": {
    "code": "SELLER_LIMIT_REACHED",
    "message": "This product has reached the maximum number of sellers (10)",
    "details": {
      "currentSellerCount": 10,
      "maxSellerCount": 10
    }
  }
}

// 403 Forbidden - Already approved
{
  "success": false,
  "error": {
    "code": "ALREADY_AUTHORIZED",
    "message": "You are already authorized to sell this product",
    "details": {
      "authorizationId": "auth_req_abc123",
      "approvedAt": "2025-11-01T10:00:00Z"
    }
  }
}

// 403 Forbidden - Access revoked
{
  "success": false,
  "error": {
    "code": "ACCESS_REVOKED",
    "message": "Your access to this product has been permanently revoked",
    "details": {
      "revokedAt": "2025-10-20T10:00:00Z",
      "reason": "Terms violation"
    }
  }
}

// 404 Not Found - Product
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found",
    "details": {
      "productId": "prod_invalid"
    }
  }
}
```

**Validation Rules**:
- Product must exist and be active
- Seller cannot have PENDING or APPROVED request for same product
- Seller must wait 30 days after REJECTED before reapplying
- Seller cannot reapply after REVOKED (permanent ban)
- Product must not have reached seller limit (10)
- Message max length: 1000 characters

**Rate Limiting**: 10 requests per day per seller

---

### 2. List Own Authorization Requests

**Endpoint**: `GET /api/v1/ds/authorizations/my-requests`

**Purpose**: Seller views their authorization request history

**Authentication**: Bearer token (Seller/Partner)

**Request**:
```http
GET /api/v1/ds/authorizations/my-requests?status=PENDING&page=1&limit=20
Authorization: Bearer <seller_token>
```

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by status: `PENDING`, `APPROVED`, `REJECTED`, `REVOKED` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Results per page (max 100) |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "auth_req_abc123",
        "status": "PENDING",
        "product": {
          "id": "prod_abc123",
          "name": "Premium Widget",
          "thumbnail": "https://cdn.example.com/widget.jpg"
        },
        "supplier": {
          "id": "sup_def456",
          "name": "Premium Supplier Co."
        },
        "requestMessage": "I'm interested in selling...",
        "requestedAt": "2025-11-07T12:00:00Z"
      },
      {
        "id": "auth_req_def456",
        "status": "APPROVED",
        "product": {
          "id": "prod_ghi789",
          "name": "Standard Widget"
        },
        "supplier": {
          "id": "sup_jkl012",
          "name": "Standard Supplier Inc."
        },
        "requestMessage": null,
        "requestedAt": "2025-11-01T10:00:00Z",
        "approvedAt": "2025-11-01T14:30:00Z",
        "reviewDurationHours": 4.5
      },
      {
        "id": "auth_req_ghi789",
        "status": "REJECTED",
        "product": {
          "id": "prod_mno345",
          "name": "Exclusive Widget"
        },
        "supplier": {
          "id": "sup_pqr678",
          "name": "Exclusive Supplier Ltd."
        },
        "requestMessage": "Looking to expand...",
        "requestedAt": "2025-10-15T10:00:00Z",
        "rejectedAt": "2025-10-15T12:00:00Z",
        "rejectionReason": "Product capacity reached",
        "canReapplyAt": "2025-11-14T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    },
    "stats": {
      "pending": 3,
      "approved": 10,
      "rejected": 2,
      "revoked": 0
    }
  }
}
```

---

## Supplier APIs

### 3. List Authorization Requests

**Endpoint**: `GET /api/supplier/authorization-requests`

**Purpose**: Supplier views pending authorization requests

**Authentication**: Bearer token (Supplier)

**Request**:
```http
GET /api/supplier/authorization-requests?status=PENDING&page=1&limit=20
Authorization: Bearer <supplier_token>
```

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | `PENDING` | Filter by status |
| `productId` | string | No | - | Filter by product |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Results per page |
| `sort` | string | No | `requestedAt` | Sort field: `requestedAt`, `sellerRating` |
| `order` | string | No | `DESC` | Sort order: `ASC`, `DESC` |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "auth_req_abc123",
        "status": "PENDING",
        "seller": {
          "id": "seller_xyz789",
          "name": "Premium Seller Co.",
          "tier": "GOLD",
          "rating": 4.8,
          "stats": {
            "totalOrders": 1500,
            "totalSales": 50000000,
            "successRate": 98.5,
            "avgFulfillmentTime": 24
          }
        },
        "product": {
          "id": "prod_abc123",
          "name": "Premium Widget",
          "currentSellerCount": 7,
          "maxSellerCount": 10
        },
        "requestMessage": "I'm interested in selling your premium widgets. I have experience...",
        "requestedAt": "2025-11-07T12:00:00Z",
        "waitingTimeHours": 2.5
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

---

### 4. Approve Authorization Request

**Endpoint**: `POST /api/supplier/authorization-requests/:requestId/approve`

**Purpose**: Supplier approves seller's request

**Authentication**: Bearer token (Supplier)

**Request**:
```http
POST /api/supplier/authorization-requests/auth_req_abc123/approve
Authorization: Bearer <supplier_token>
Content-Type: application/json

{
  "welcomeMessage": "Welcome! Looking forward to working with you."
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `welcomeMessage` | string | No | Optional message to seller (max 500 chars) |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "authorization": {
      "id": "auth_req_abc123",
      "status": "APPROVED",
      "seller": {
        "id": "seller_xyz789",
        "name": "Premium Seller Co."
      },
      "product": {
        "id": "prod_abc123",
        "name": "Premium Widget",
        "currentSellerCount": 8
      },
      "approvedAt": "2025-11-07T14:30:00Z",
      "approvedBy": "sup_def456"
    }
  },
  "message": "Authorization approved successfully. Seller has been notified."
}
```

**Error Responses**:

```json
// 400 Bad Request - Already approved
{
  "success": false,
  "error": {
    "code": "ALREADY_APPROVED",
    "message": "This request has already been approved",
    "details": {
      "approvedAt": "2025-11-07T10:00:00Z"
    }
  }
}

// 400 Bad Request - Already rejected
{
  "success": false,
  "error": {
    "code": "ALREADY_REJECTED",
    "message": "This request has already been rejected",
    "details": {
      "rejectedAt": "2025-11-07T10:00:00Z",
      "reason": "Product capacity reached"
    }
  }
}

// 403 Forbidden - Seller limit reached
{
  "success": false,
  "error": {
    "code": "SELLER_LIMIT_REACHED",
    "message": "Product has reached maximum seller count",
    "details": {
      "currentSellerCount": 10,
      "maxSellerCount": 10
    }
  }
}

// 404 Not Found
{
  "success": false,
  "error": {
    "code": "REQUEST_NOT_FOUND",
    "message": "Authorization request not found"
  }
}
```

**Side Effects**:
- Authorization status updated to APPROVED
- Seller receives email + in-app notification
- Seller gains access to product details
- Product seller count incremented

---

### 5. Reject Authorization Request

**Endpoint**: `POST /api/supplier/authorization-requests/:requestId/reject`

**Purpose**: Supplier rejects seller's request

**Authentication**: Bearer token (Supplier)

**Request**:
```http
POST /api/supplier/authorization-requests/auth_req_abc123/reject
Authorization: Bearer <supplier_token>
Content-Type: application/json

{
  "reason": "DOES_NOT_MEET_REQUIREMENTS",
  "customReason": "Your store does not align with our brand positioning."
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Predefined reason code |
| `customReason` | string | No | Custom reason text (max 500 chars) |

**Reason Codes**:
- `CAPACITY_REACHED`: Product capacity reached
- `DOES_NOT_MEET_REQUIREMENTS`: Seller does not meet requirements
- `POLICY_RESTRICTIONS`: Supplier policy restrictions
- `FULFILLMENT_ISSUES`: Previous fulfillment issues
- `BRAND_MISALIGNMENT`: Brand positioning concerns
- `OTHER`: Custom reason (requires `customReason`)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "authorization": {
      "id": "auth_req_abc123",
      "status": "REJECTED",
      "seller": {
        "id": "seller_xyz789",
        "name": "Premium Seller Co."
      },
      "product": {
        "id": "prod_abc123",
        "name": "Premium Widget"
      },
      "rejectedAt": "2025-11-07T14:30:00Z",
      "rejectedBy": "sup_def456",
      "rejectionReason": "Seller does not meet requirements: Your store does not align with our brand positioning.",
      "canReapplyAt": "2025-12-07T14:30:00Z"
    }
  },
  "message": "Authorization rejected. Seller has been notified."
}
```

**Error Responses**:

```json
// 400 Bad Request - Missing reason
{
  "success": false,
  "error": {
    "code": "REASON_REQUIRED",
    "message": "Rejection reason is required"
  }
}

// 400 Bad Request - Invalid reason code
{
  "success": false,
  "error": {
    "code": "INVALID_REASON_CODE",
    "message": "Invalid reason code",
    "details": {
      "validCodes": [
        "CAPACITY_REACHED",
        "DOES_NOT_MEET_REQUIREMENTS",
        "POLICY_RESTRICTIONS",
        "FULFILLMENT_ISSUES",
        "BRAND_MISALIGNMENT",
        "OTHER"
      ]
    }
  }
}
```

**Side Effects**:
- Authorization status updated to REJECTED
- Seller receives email + in-app notification
- Seller cannot reapply for 30 days
- Cooling-off period starts

---

### 6. Revoke Authorization

**Endpoint**: `POST /api/supplier/authorizations/:authorizationId/revoke`

**Purpose**: Supplier revokes previously approved seller access

**Authentication**: Bearer token (Supplier)

**Request**:
```http
POST /api/supplier/authorizations/auth_req_abc123/revoke
Authorization: Bearer <supplier_token>
Content-Type: application/json

{
  "reason": "TERMS_VIOLATION",
  "customReason": "Seller violated pricing terms by selling below MSRP."
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Predefined reason code |
| `customReason` | string | No | Custom reason text (max 500 chars) |

**Reason Codes**:
- `TERMS_VIOLATION`: Terms violation
- `QUALITY_ISSUES`: Quality issues
- `FULFILLMENT_PROBLEMS`: Fulfillment problems
- `SUPPLIER_DECISION`: Supplier decision
- `OTHER`: Custom reason

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "authorization": {
      "id": "auth_req_abc123",
      "status": "REVOKED",
      "seller": {
        "id": "seller_xyz789",
        "name": "Premium Seller Co."
      },
      "product": {
        "id": "prod_abc123",
        "name": "Premium Widget",
        "currentSellerCount": 7
      },
      "revokedAt": "2025-11-07T14:30:00Z",
      "revokedBy": "sup_def456",
      "revocationReason": "Terms violation: Seller violated pricing terms by selling below MSRP.",
      "existingOrders": {
        "pending": 5,
        "processing": 2,
        "action": "Existing orders will be honored"
      }
    }
  },
  "message": "Authorization revoked. Seller has been notified. Existing orders will be honored."
}
```

**Error Responses**:

```json
// 400 Bad Request - Not approved
{
  "success": false,
  "error": {
    "code": "NOT_APPROVED",
    "message": "Can only revoke approved authorizations",
    "details": {
      "currentStatus": "PENDING"
    }
  }
}

// 400 Bad Request - Already revoked
{
  "success": false,
  "error": {
    "code": "ALREADY_REVOKED",
    "message": "This authorization has already been revoked",
    "details": {
      "revokedAt": "2025-11-01T10:00:00Z"
    }
  }
}
```

**Side Effects**:
- Authorization status updated to REVOKED
- Seller receives email + in-app notification
- Seller loses access to product immediately
- Existing orders honored (fulfillment continues)
- Seller cannot re-request (permanent ban)
- Product seller count decremented

---

## Admin APIs

### 7. List All Authorizations

**Endpoint**: `GET /api/admin/authorizations`

**Purpose**: Admin views all authorization requests across platform

**Authentication**: Bearer token (Admin)

**Request**:
```http
GET /api/admin/authorizations?status=PENDING&page=1&limit=50
Authorization: Bearer <admin_token>
```

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by status |
| `sellerId` | string | No | - | Filter by seller |
| `supplierId` | string | No | - | Filter by supplier |
| `productId` | string | No | - | Filter by product |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 50 | Results per page (max 100) |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "authorizations": [
      {
        "id": "auth_req_abc123",
        "status": "PENDING",
        "seller": {
          "id": "seller_xyz789",
          "name": "Premium Seller Co.",
          "tier": "GOLD"
        },
        "product": {
          "id": "prod_abc123",
          "name": "Premium Widget"
        },
        "supplier": {
          "id": "sup_def456",
          "name": "Premium Supplier Co."
        },
        "requestedAt": "2025-11-07T12:00:00Z",
        "waitingTimeHours": 2.5
      }
    ],
    "pagination": {
      "total": 250,
      "page": 1,
      "limit": 50,
      "totalPages": 5
    },
    "stats": {
      "pending": 45,
      "approved": 180,
      "rejected": 20,
      "revoked": 5
    }
  }
}
```

---

## Webhooks (Future)

### Authorization Approved Webhook

**Event**: `authorization.approved`

**Payload**:
```json
{
  "event": "authorization.approved",
  "timestamp": "2025-11-07T14:30:00Z",
  "data": {
    "authorizationId": "auth_req_abc123",
    "sellerId": "seller_xyz789",
    "productId": "prod_abc123",
    "supplierId": "sup_def456",
    "approvedAt": "2025-11-07T14:30:00Z",
    "approvedBy": "sup_def456"
  }
}
```

---

## Authentication & Authorization

### Authentication Methods

**Bearer Token**:
```http
Authorization: Bearer <token>
```

**Token Types**:
- Seller token: `sellerId` extracted from JWT
- Supplier token: `supplierId` extracted from JWT
- Admin token: `role: 'admin'` in JWT

### Authorization Matrix

| Endpoint | Seller | Supplier | Admin |
|----------|--------|----------|-------|
| `POST /api/v1/ds/products/:id/authorization-request` | ✅ | ❌ | ✅ |
| `GET /api/v1/ds/authorizations/my-requests` | ✅ (own only) | ❌ | ✅ |
| `GET /api/supplier/authorization-requests` | ❌ | ✅ (own only) | ✅ |
| `POST /api/supplier/authorization-requests/:id/approve` | ❌ | ✅ (own only) | ✅ |
| `POST /api/supplier/authorization-requests/:id/reject` | ❌ | ✅ (own only) | ✅ |
| `POST /api/supplier/authorizations/:id/revoke` | ❌ | ✅ (own only) | ✅ |
| `GET /api/admin/authorizations` | ❌ | ❌ | ✅ |

---

## Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `POST /api/v1/ds/products/:id/authorization-request` | 10 requests | Per day |
| `GET /api/v1/ds/authorizations/my-requests` | 100 requests | Per hour |
| `GET /api/supplier/authorization-requests` | 100 requests | Per hour |
| `POST /api/supplier/authorization-requests/:id/approve` | 50 requests | Per hour |
| `POST /api/supplier/authorization-requests/:id/reject` | 50 requests | Per hour |
| `POST /api/supplier/authorizations/:id/revoke` | 20 requests | Per hour |

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `DUPLICATE_REQUEST` | 400 | Seller already has active request |
| `COOLING_OFF_PERIOD` | 400 | Seller must wait before reapplying |
| `SELLER_LIMIT_REACHED` | 403 | Product reached maximum seller count |
| `ALREADY_AUTHORIZED` | 403 | Seller already approved |
| `ACCESS_REVOKED` | 403 | Seller access permanently revoked |
| `PRODUCT_NOT_FOUND` | 404 | Product does not exist |
| `REQUEST_NOT_FOUND` | 404 | Authorization request not found |
| `ALREADY_APPROVED` | 400 | Request already approved |
| `ALREADY_REJECTED` | 400 | Request already rejected |
| `NOT_APPROVED` | 400 | Cannot revoke non-approved authorization |
| `ALREADY_REVOKED` | 400 | Authorization already revoked |
| `REASON_REQUIRED` | 400 | Rejection/revocation reason required |
| `INVALID_REASON_CODE` | 400 | Invalid reason code provided |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |

---

## Testing Checklist

- [ ] Seller can submit authorization request
- [ ] Seller cannot submit duplicate request
- [ ] Seller respects cooling-off period (30 days)
- [ ] Product enforces seller limit (10)
- [ ] Supplier can list pending requests
- [ ] Supplier can approve request
- [ ] Supplier can reject request with reason
- [ ] Supplier can revoke approved access
- [ ] Seller receives notifications (approve/reject/revoke)
- [ ] Supplier receives notification on new request
- [ ] Admin can view all authorizations
- [ ] Rate limiting works correctly
- [ ] Authorization checks integrated with product access
- [ ] Existing orders honored after revocation

---

## Version History

- **1.0** (2025-11-07): Initial API specification for Phase 9

---

*Generated with [Claude Code](https://claude.com/claude-code)*
