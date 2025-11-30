# API Contract Update for Phase 8
**Phase 8 - Supplier Policy Integration**
**Version**: 1.0
**Created**: 2025-11-07

---

## Overview

This document specifies API contract changes for the Phase 8 supplier policy integration. It covers new and modified endpoints for policy management and settlement calculation responses.

---

## Authentication & Authorization

### Read Operations (Partner Dashboard)
- **Authentication**: Bearer token (Partner)
- **Scope**: Read-only access to own data

### Write Operations (Admin UI)
- **Authentication**: Bearer token (Admin)
- **Authorization**: `ADMIN` role required
- **Scope**: Full CRUD on policies, linkages

---

## Admin API Endpoints

### 1. List Commission Policies (Enhanced)

**Endpoint**: `GET /api/admin/dropshipping/commission-policies`

**Purpose**: Retrieve commission policies with filtering by scope/type

**Changes from Existing**:
- Added `scope` query parameter for filtering
- Added `policyType` filter
- Added `status` filter
- Enhanced response with usage statistics

**Request**:
```http
GET /api/admin/dropshipping/commission-policies?scope=supplier&status=active&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `scope` | string | No | - | Filter by scope: `supplier`, `product`, `tier`, `default` |
| `policyType` | string | No | - | Filter by type: `DEFAULT`, `TIER`, `SUPPLIER`, `PRODUCT` |
| `status` | string | No | `active` | Filter by status: `active`, `inactive`, `deleted` |
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Results per page |
| `search` | string | No | - | Search by policy code or description |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "id": "pol_abc123",
        "policyCode": "SUPPLIER-XYZ-2025",
        "policyType": "SUPPLIER",
        "commissionType": "PERCENTAGE",
        "commissionRate": 15.0,
        "commissionAmount": null,
        "minCommission": 1000,
        "maxCommission": 50000,
        "priority": 1,
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z",
        "status": "active",
        "metadata": {
          "description": "Premium supplier Q1-Q4 2025"
        },
        "usage": {
          "linkedSuppliers": 5,
          "linkedProducts": 0,
          "totalCommissions": 150000,
          "lastUsed": "2025-11-06T10:30:00Z"
        },
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

**Error Responses**:
```json
// 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 403 Forbidden
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Admin access required"
  }
}

// 400 Bad Request
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Invalid scope parameter",
    "details": {
      "field": "scope",
      "validValues": ["supplier", "product", "tier", "default"]
    }
  }
}
```

---

### 2. Link Policy to Supplier (New)

**Endpoint**: `POST /api/admin/dropshipping/suppliers/:supplierId/policy`

**Purpose**: Link or unlink a commission policy to a supplier

**Authorization**: Admin only

**Request**:
```http
POST /api/admin/dropshipping/suppliers/sup_abc123/policy
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "policyId": "pol_def456",
  "settlementCycleDays": 30,
  "effectiveDate": "2025-11-15T00:00:00Z"
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyId` | string (UUID) | Yes | Policy ID to link. Use `null` to unlink. |
| `settlementCycleDays` | number | No | Custom settlement cycle (overrides default). Default: 30 |
| `effectiveDate` | string (ISO 8601) | No | When policy takes effect. Default: now |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "supplier": {
      "id": "sup_abc123",
      "code": "SUP-XYZ",
      "name": "Premium Supplier Co.",
      "policyId": "pol_def456",
      "settlementCycleDays": 30,
      "policy": {
        "id": "pol_def456",
        "policyCode": "SUPPLIER-XYZ-2025",
        "policyType": "SUPPLIER",
        "commissionRate": 15.0,
        "status": "active"
      },
      "updatedAt": "2025-11-07T10:30:00Z"
    },
    "message": "Policy linked successfully"
  }
}
```

**Unlink Example**:
```http
POST /api/admin/dropshipping/suppliers/sup_abc123/policy
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "policyId": null
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "supplier": {
      "id": "sup_abc123",
      "code": "SUP-XYZ",
      "name": "Premium Supplier Co.",
      "policyId": null,
      "settlementCycleDays": 30,
      "policy": null,
      "updatedAt": "2025-11-07T10:35:00Z"
    },
    "message": "Policy unlinked successfully"
  }
}
```

**Error Responses**:
```json
// 404 Not Found - Supplier
{
  "success": false,
  "error": {
    "code": "SUPPLIER_NOT_FOUND",
    "message": "Supplier not found",
    "details": {
      "supplierId": "sup_invalid"
    }
  }
}

// 404 Not Found - Policy
{
  "success": false,
  "error": {
    "code": "POLICY_NOT_FOUND",
    "message": "Policy not found",
    "details": {
      "policyId": "pol_invalid"
    }
  }
}

// 400 Bad Request - Invalid Policy Type
{
  "success": false,
  "error": {
    "code": "INVALID_POLICY_TYPE",
    "message": "Policy type must be SUPPLIER or DEFAULT",
    "details": {
      "policyType": "PRODUCT",
      "allowedTypes": ["SUPPLIER", "DEFAULT"]
    }
  }
}

// 400 Bad Request - Inactive Policy
{
  "success": false,
  "error": {
    "code": "INACTIVE_POLICY",
    "message": "Cannot link inactive policy",
    "details": {
      "policyId": "pol_def456",
      "status": "inactive"
    }
  }
}

// 409 Conflict - Already Linked
{
  "success": false,
  "error": {
    "code": "POLICY_ALREADY_LINKED",
    "message": "Supplier already has this policy",
    "details": {
      "supplierId": "sup_abc123",
      "currentPolicyId": "pol_def456"
    }
  }
}
```

**Idempotency**: Linking the same policy twice returns success with no changes.

**Side Effects**:
- Future orders from this supplier will use the linked policy
- Existing orders/commissions remain unchanged (immutable snapshots)
- Audit log entry created

---

### 3. Link Policy to Product (New)

**Endpoint**: `POST /api/admin/dropshipping/products/:productId/policy`

**Purpose**: Link or unlink a policy override to a specific product

**Authorization**: Admin only

**Request**:
```http
POST /api/admin/dropshipping/products/prod_xyz789/policy
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "policyId": "pol_promo_q4",
  "reason": "Q4 double commission promotion"
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyId` | string (UUID) | Yes | Policy ID to link. Use `null` to unlink. |
| `reason` | string | No | Reason for override (stored in audit log) |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "prod_xyz789",
      "sku": "PROD-XYZ-001",
      "name": "Premium Widget",
      "policyId": "pol_promo_q4",
      "policy": {
        "id": "pol_promo_q4",
        "policyCode": "PRODUCT-XYZ-PROMO-Q4",
        "policyType": "PRODUCT",
        "commissionRate": 25.0,
        "maxCommission": 100000,
        "status": "active",
        "startDate": "2025-10-01T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z"
      },
      "updatedAt": "2025-11-07T10:40:00Z"
    },
    "message": "Product policy override applied"
  }
}
```

**Unlink Example**:
```http
POST /api/admin/dropshipping/products/prod_xyz789/policy
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "policyId": null,
  "reason": "Promotion ended"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "prod_xyz789",
      "sku": "PROD-XYZ-001",
      "name": "Premium Widget",
      "policyId": null,
      "policy": null,
      "updatedAt": "2025-11-07T10:45:00Z"
    },
    "message": "Product policy override removed"
  }
}
```

**Error Responses**:
```json
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

// 404 Not Found - Policy
{
  "success": false,
  "error": {
    "code": "POLICY_NOT_FOUND",
    "message": "Policy not found",
    "details": {
      "policyId": "pol_invalid"
    }
  }
}

// 400 Bad Request - Invalid Policy Type
{
  "success": false,
  "error": {
    "code": "INVALID_POLICY_TYPE",
    "message": "Policy type must be PRODUCT",
    "details": {
      "policyType": "SUPPLIER",
      "allowedTypes": ["PRODUCT"]
    }
  }
}

// 400 Bad Request - Inactive Policy
{
  "success": false,
  "error": {
    "code": "INACTIVE_POLICY",
    "message": "Cannot link inactive policy",
    "details": {
      "policyId": "pol_promo_q4",
      "status": "inactive"
    }
  }
}
```

**Idempotency**: Linking the same policy twice returns success with no changes.

**Side Effects**:
- This product will use override policy regardless of supplier policy
- Takes highest priority in policy resolution
- Future orders use new policy
- Existing orders/commissions remain unchanged

---

## Partner API Endpoints

### 4. Calculate Settlement (Enhanced Response)

**Endpoint**: `POST /api/v1/ds/settlements/calc`

**Purpose**: Calculate settlement for partner orders (enhanced with policy snapshot)

**Changes from Existing**:
- Added `appliedPolicy` field to response
- Added `policyResolutionLevel` field
- Added per-item policy information

**Request**:
```http
POST /api/v1/ds/settlements/calc
Authorization: Bearer <partner_token>
Content-Type: application/json

{
  "partnerId": "ptr_abc123",
  "startDate": "2025-11-01T00:00:00Z",
  "endDate": "2025-11-07T23:59:59Z",
  "includeDetails": true
}
```

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `partnerId` | string (UUID) | Yes | Partner ID |
| `startDate` | string (ISO 8601) | Yes | Period start |
| `endDate` | string (ISO 8601) | Yes | Period end |
| `includeDetails` | boolean | No | Include per-item breakdown. Default: false |

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "settlement": {
      "id": "stl_xyz789",
      "partnerId": "ptr_abc123",
      "period": {
        "startDate": "2025-11-01T00:00:00Z",
        "endDate": "2025-11-07T23:59:59Z"
      },
      "summary": {
        "totalOrders": 25,
        "totalOrderItems": 47,
        "totalSales": 5000000,
        "totalCommission": 750000,
        "averageCommissionRate": 15.0,
        "policyBreakdown": {
          "product": {
            "count": 5,
            "commission": 125000
          },
          "supplier": {
            "count": 30,
            "commission": 450000
          },
          "tier": {
            "count": 10,
            "commission": 150000
          },
          "default": {
            "count": 2,
            "commission": 25000
          }
        }
      },
      "items": [
        {
          "orderItemId": "item_001",
          "orderId": "ord_abc123",
          "productId": "prod_xyz789",
          "productName": "Premium Widget",
          "supplierId": "sup_abc123",
          "supplierName": "Premium Supplier Co.",
          "quantity": 2,
          "price": 50000,
          "subtotal": 100000,
          "commission": {
            "amount": 25000,
            "rate": 25.0,
            "appliedPolicy": {
              "policyId": "pol_promo_q4",
              "policyCode": "PRODUCT-XYZ-PROMO-Q4",
              "policyType": "PRODUCT",
              "commissionType": "PERCENTAGE",
              "commissionRate": 25.0,
              "minCommission": null,
              "maxCommission": 100000,
              "resolutionLevel": "product",
              "appliedAt": "2025-11-06T10:30:00Z"
            }
          },
          "orderDate": "2025-11-06T10:30:00Z"
        },
        {
          "orderItemId": "item_002",
          "orderId": "ord_abc123",
          "productId": "prod_abc456",
          "productName": "Standard Widget",
          "supplierId": "sup_abc123",
          "supplierName": "Premium Supplier Co.",
          "quantity": 1,
          "price": 30000,
          "subtotal": 30000,
          "commission": {
            "amount": 4500,
            "rate": 15.0,
            "appliedPolicy": {
              "policyId": "pol_def456",
              "policyCode": "SUPPLIER-XYZ-2025",
              "policyType": "SUPPLIER",
              "commissionType": "PERCENTAGE",
              "commissionRate": 15.0,
              "minCommission": 1000,
              "maxCommission": 50000,
              "resolutionLevel": "supplier",
              "appliedAt": "2025-11-06T10:30:00Z"
            }
          },
          "orderDate": "2025-11-06T10:30:00Z"
        },
        {
          "orderItemId": "item_003",
          "orderId": "ord_def456",
          "productId": "prod_def789",
          "productName": "Basic Widget",
          "supplierId": "sup_def456",
          "supplierName": "Standard Supplier Inc.",
          "quantity": 3,
          "price": 20000,
          "subtotal": 60000,
          "commission": {
            "amount": 6000,
            "rate": 10.0,
            "appliedPolicy": {
              "policyId": "pol_default_2025",
              "policyCode": "DEFAULT-2025",
              "policyType": "DEFAULT",
              "commissionType": "PERCENTAGE",
              "commissionRate": 10.0,
              "minCommission": null,
              "maxCommission": null,
              "resolutionLevel": "default",
              "appliedAt": "2025-11-06T11:00:00Z"
            }
          },
          "orderDate": "2025-11-06T11:00:00Z"
        }
      ],
      "calculatedAt": "2025-11-07T10:50:00Z"
    }
  }
}
```

**Safe Mode Example** (No Policy Found):
```json
{
  "orderItemId": "item_004",
  "orderId": "ord_ghi789",
  "productId": "prod_ghi123",
  "productName": "Orphan Widget",
  "supplierId": "sup_orphan",
  "supplierName": "Unconfigured Supplier",
  "quantity": 1,
  "price": 10000,
  "subtotal": 10000,
  "commission": {
    "amount": 0,
    "rate": 0,
    "appliedPolicy": null,
    "resolutionLevel": "safe_mode",
    "warning": "No policy found - applied 0% commission"
  },
  "orderDate": "2025-11-06T12:00:00Z"
}
```

**Error Responses**:
```json
// 401 Unauthorized
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 403 Forbidden - Not Your Partner
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Cannot access other partner's settlements",
    "details": {
      "requestedPartnerId": "ptr_abc123",
      "authenticatedPartnerId": "ptr_def456"
    }
  }
}

// 400 Bad Request - Invalid Date Range
{
  "success": false,
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "End date must be after start date",
    "details": {
      "startDate": "2025-11-07T00:00:00Z",
      "endDate": "2025-11-01T00:00:00Z"
    }
  }
}

// 400 Bad Request - Date Range Too Large
{
  "success": false,
  "error": {
    "code": "DATE_RANGE_TOO_LARGE",
    "message": "Date range cannot exceed 90 days",
    "details": {
      "requestedDays": 120,
      "maxDays": 90
    }
  }
}
```

**Notes**:
- `appliedPolicy` is **immutable** - stored at commission calculation time
- If policy was deleted/modified after order, snapshot preserves original values
- `resolutionLevel` shows which priority level was used
- `safe_mode` indicates no policy was found (0% commission applied)

---

## Policy Snapshot Schema

The `appliedPolicy` object in settlement responses contains an **immutable snapshot** of the policy at the time of commission calculation.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `policyId` | string (UUID) | Original policy ID |
| `policyCode` | string | Policy code (e.g., "SUPPLIER-XYZ-2025") |
| `policyType` | string | `DEFAULT`, `TIER`, `SUPPLIER`, `PRODUCT` |
| `commissionType` | string | `PERCENTAGE` or `FIXED` |
| `commissionRate` | number | Percentage rate (for PERCENTAGE type) |
| `commissionAmount` | number | Fixed amount (for FIXED type) |
| `minCommission` | number | Minimum commission cap |
| `maxCommission` | number | Maximum commission cap |
| `resolutionLevel` | string | `product`, `supplier`, `tier`, `default`, `safe_mode` |
| `appliedAt` | string (ISO 8601) | Timestamp when policy was applied |

---

## Validation Rules

### Policy Linkage Validation

**Supplier Policy**:
- Policy type must be `SUPPLIER` or `DEFAULT`
- Policy status must be `active`
- Cannot link expired policy (`endDate < now`)
- Cannot link future policy (`startDate > now`) unless `effectiveDate` is set

**Product Policy**:
- Policy type must be `PRODUCT`
- Policy status must be `active`
- Cannot link expired policy
- Can override any supplier/tier/default policy

### Date Range Validation

**Settlement Calculation**:
- `startDate` must be before `endDate`
- Maximum range: 90 days
- Dates must be in ISO 8601 format
- Cannot query future dates

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `SUPPLIER_NOT_FOUND` | 404 | Supplier ID not found |
| `PRODUCT_NOT_FOUND` | 404 | Product ID not found |
| `POLICY_NOT_FOUND` | 404 | Policy ID not found |
| `INVALID_PARAMS` | 400 | Invalid query parameters |
| `INVALID_POLICY_TYPE` | 400 | Policy type not allowed for this operation |
| `INACTIVE_POLICY` | 400 | Cannot link inactive policy |
| `POLICY_ALREADY_LINKED` | 409 | Entity already has this policy linked |
| `INVALID_DATE_RANGE` | 400 | Start/end date validation failed |
| `DATE_RANGE_TOO_LARGE` | 400 | Date range exceeds maximum allowed |

---

## Migration Notes

### Backward Compatibility

**Existing Endpoints**:
- `POST /api/v1/ds/settlements/calc` - Enhanced response is **backward compatible**
- Old clients ignoring `appliedPolicy` field will continue to work
- `totalCommission` field unchanged

**New Endpoints**:
- `POST /api/admin/dropshipping/suppliers/:id/policy` - New endpoint
- `POST /api/admin/dropshipping/products/:id/policy` - New endpoint

**Feature Flag**:
- When `ENABLE_SUPPLIER_POLICY=false`:
  - Policy linkage APIs still work (data stored)
  - Settlement calculation ignores supplier/product policies
  - `appliedPolicy.resolutionLevel` will be `tier` or `default` only

---

## Testing Checklist

- [ ] Admin can list policies with scope filter
- [ ] Admin can link supplier policy
- [ ] Admin can unlink supplier policy
- [ ] Admin can link product override
- [ ] Admin can unlink product override
- [ ] Partner cannot access admin endpoints (403)
- [ ] Settlement calc includes `appliedPolicy` snapshot
- [ ] Settlement calc shows correct `resolutionLevel`
- [ ] Safe mode returns 0% with warning
- [ ] Expired policy rejected (400)
- [ ] Inactive policy rejected (400)
- [ ] Invalid policy type rejected (400)
- [ ] Idempotent policy linking works
- [ ] Policy snapshot immutable after order

---

## Version History

- **1.0** (2025-11-07): Initial API contract for Phase 8

---

*Generated with [Claude Code](https://claude.com/claude-code)*
