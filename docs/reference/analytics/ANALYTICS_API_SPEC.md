# Analytics API Specification

**Version**: 1.0
**Phase**: 7
**Base URL**: `/api/v1/analytics/partner`
**Last Updated**: 2025-11-07

## Overview

This document defines the Partner Analytics API contract. All endpoints follow RESTful conventions and return JSON responses.

---

## Authentication & Authorization

### Authentication
- **Method**: JWT Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Token Source**: Existing auth system (authClient)

### Authorization Rules

| User Role | Access |
|-----------|--------|
| Partner | Own data only (`partnerId=me` auto-resolved) |
| Admin | All partners (can specify `partnerId` or omit for aggregate) |
| Super Admin | All partners + system-wide metrics |

### Partner ID Resolution

When `partnerId=me`:
```javascript
// Server-side resolution
const userId = req.user.id; // from JWT
const partner = await partnerRepo.findOne({ where: { userId } });
const partnerId = partner.id;
```

---

## Common Parameters

### Date Range

All endpoints support standardized date filtering:

| Parameter | Type | Format | Required | Default | Example |
|-----------|------|--------|----------|---------|---------|
| `from` | string | ISO 8601 | No | 30 days ago | `2025-11-01T00:00:00Z` |
| `to` | string | ISO 8601 | No | Now | `2025-11-07T23:59:59Z` |
| `range` | string | Preset | No | - | `last_7d`, `last_30d`, `last_90d`, `this_month` |

**Range Presets**:
- `last_7d`: Last 7 days
- `last_30d`: Last 30 days (default)
- `last_90d`: Last 90 days
- `this_month`: Current calendar month
- `last_month`: Previous calendar month
- `this_year`: Current year

**Precedence**: `from/to` overrides `range` if both provided.

### Timezone

All timestamps use UTC. Response includes timezone metadata:

```json
{
  "metadata": {
    "timezone": "UTC",
    "serverTime": "2025-11-07T06:00:00Z"
  }
}
```

---

## Endpoints

### 1. GET `/summary`

Returns aggregated KPI summary for dashboard cards.

#### Request

**URL**: `/api/v1/analytics/partner/summary`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `partnerId` | string | No | `me` | Partner UUID or "me" |
| `range` | string | No | `last_30d` | Date range preset |
| `from` | string | No | - | Start date (ISO 8601) |
| `to` | string | No | - | End date (ISO 8601) |

**Example**:
```
GET /api/v1/analytics/partner/summary?partnerId=me&range=last_30d
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-10-08T00:00:00Z",
      "end": "2025-11-07T23:59:59Z",
      "days": 30
    },
    "metrics": {
      "clicks": {
        "value": 1234,
        "change": 15.5,
        "changeType": "increase"
      },
      "conversions": {
        "value": 87,
        "change": 8.2,
        "changeType": "increase"
      },
      "cvr": {
        "value": 7.05,
        "unit": "percent",
        "change": -0.5,
        "changeType": "decrease"
      },
      "aov": {
        "value": 63333,
        "unit": "KRW",
        "change": 12.3,
        "changeType": "increase"
      },
      "epc": {
        "value": 3525.93,
        "unit": "KRW",
        "change": 18.7,
        "changeType": "increase"
      },
      "pendingExposure": {
        "value": 435000,
        "unit": "KRW",
        "breakdown": {
          "scheduled": 200000,
          "processing": 150000,
          "pending": 85000
        }
      },
      "paidRate": {
        "value": 90.00,
        "unit": "percent",
        "amounts": {
          "confirmed": 4350000,
          "paid": 3915000
        }
      },
      "returningRatio": {
        "value": 17.24,
        "unit": "percent",
        "breakdown": {
          "returning": 15,
          "total": 87
        }
      }
    },
    "comparison": {
      "previousPeriod": {
        "start": "2025-09-08T00:00:00Z",
        "end": "2025-10-07T23:59:59Z"
      }
    }
  },
  "metadata": {
    "timezone": "UTC",
    "cacheHit": false,
    "computedAt": "2025-11-07T06:00:00Z"
  }
}
```

#### Error Responses

**403 Forbidden**: Insufficient permissions
```json
{
  "success": false,
  "error": {
    "code": "ERR_ANALYTICS_FORBIDDEN",
    "message": "You do not have permission to view this partner's analytics",
    "details": {
      "requestedPartnerId": "abc-123",
      "yourPartnerId": "xyz-789"
    }
  }
}
```

**404 Not Found**: Partner not found
```json
{
  "success": false,
  "error": {
    "code": "ERR_PARTNER_NOT_FOUND",
    "message": "Partner profile not found",
    "details": {
      "partnerId": "invalid-id"
    }
  }
}
```

---

### 2. GET `/timeseries`

Returns time-series data for charts/graphs.

#### Request

**URL**: `/api/v1/analytics/partner/timeseries`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `metric` | string | Yes | - | Metric to query |
| `interval` | string | No | `day` | Time interval |
| `from` | string | Yes | - | Start date (ISO 8601) |
| `to` | string | Yes | - | End date (ISO 8601) |
| `partnerId` | string | No | `me` | Partner UUID |
| `cumulative` | boolean | No | `false` | Cumulative sum |
| `fillMissing` | boolean | No | `true` | Fill missing intervals with 0 |

**Metric Options**:
- `clicks`
- `conversions`
- `commission` (confirmed commission amount)
- `revenue` (order total)
- `cvr` (conversion rate)

**Interval Options**:
- `hour` (max 7 days range)
- `day` (max 90 days range)
- `week` (max 365 days range)
- `month` (max 730 days range)

**Example**:
```
GET /api/v1/analytics/partner/timeseries?metric=commission&interval=day&from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true,
  "data": {
    "metric": "commission",
    "interval": "day",
    "unit": "KRW",
    "period": {
      "start": "2025-10-01T00:00:00Z",
      "end": "2025-11-01T00:00:00Z"
    },
    "dataPoints": [
      {
        "timestamp": "2025-10-01T00:00:00Z",
        "value": 125000,
        "cumulative": 125000
      },
      {
        "timestamp": "2025-10-02T00:00:00Z",
        "value": 98000,
        "cumulative": 223000
      },
      {
        "timestamp": "2025-10-03T00:00:00Z",
        "value": 0,
        "cumulative": 223000,
        "filled": true
      }
      // ... more data points
    ],
    "summary": {
      "total": 4350000,
      "average": 140322.58,
      "min": 0,
      "max": 325000,
      "dataPointsCount": 31
    }
  },
  "metadata": {
    "timezone": "UTC",
    "cacheHit": true,
    "computedAt": "2025-11-07T06:00:00Z"
  }
}
```

#### Error Responses

**400 Bad Request**: Invalid parameters
```json
{
  "success": false,
  "error": {
    "code": "ERR_ANALYTICS_INVALID_PARAMS",
    "message": "Invalid interval for date range",
    "details": {
      "interval": "hour",
      "maxDaysForInterval": 7,
      "requestedDays": 31
    }
  }
}
```

---

### 3. GET `/funnel`

Returns conversion funnel data (Clicks → Conversions → Commission → Payment).

#### Request

**URL**: `/api/v1/analytics/partner/funnel`

**Method**: `GET`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from` | string | Yes | - | Start date (ISO 8601) |
| `to` | string | Yes | - | End date (ISO 8601) |
| `partnerId` | string | No | `me` | Partner UUID |
| `uniqueCustomers` | boolean | No | `false` | De-duplicate by customer |
| `breakdown` | string | No | - | Breakdown by field |

**Breakdown Options**:
- `source` (traffic source)
- `campaign` (marketing campaign)
- `product` (product category)

**Example**:
```
GET /api/v1/analytics/partner/funnel?from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z&uniqueCustomers=true
```

#### Response

**Status**: `200 OK`

**Body**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-10-01T00:00:00Z",
      "end": "2025-11-01T00:00:00Z"
    },
    "stages": [
      {
        "name": "clicks",
        "label": "클릭",
        "value": 5432,
        "rate": 100.00,
        "dropoff": 0
      },
      {
        "name": "conversions",
        "label": "전환",
        "value": 489,
        "rate": 9.00,
        "dropoff": 4943,
        "dropoffRate": 91.00
      },
      {
        "name": "confirmed_commission",
        "label": "커미션 확정",
        "value": 465,
        "rate": 8.56,
        "dropoff": 24,
        "dropoffRate": 4.91
      },
      {
        "name": "paid",
        "label": "정산 완료",
        "value": 418,
        "rate": 7.69,
        "dropoff": 47,
        "dropoffRate": 10.11
      }
    ],
    "totals": {
      "clicks": 5432,
      "conversions": 489,
      "confirmedCommission": {
        "count": 465,
        "amount": 4650000,
        "currency": "KRW"
      },
      "paid": {
        "count": 418,
        "amount": 4180000,
        "currency": "KRW"
      }
    },
    "uniqueCustomers": true,
    "breakdown": null
  },
  "metadata": {
    "timezone": "UTC",
    "cacheHit": false,
    "computedAt": "2025-11-07T06:00:00Z"
  }
}
```

**With Breakdown**:
```json
{
  "data": {
    "breakdown": {
      "field": "source",
      "values": [
        {
          "key": "google",
          "label": "Google Ads",
          "funnel": [
            { "name": "clicks", "value": 2345 },
            { "name": "conversions", "value": 234 },
            { "name": "confirmed_commission", "value": 225 },
            { "name": "paid", "value": 203 }
          ]
        },
        {
          "key": "facebook",
          "label": "Facebook Ads",
          "funnel": [
            { "name": "clicks", "value": 1876 },
            { "name": "conversions", "value": 156 },
            { "name": "confirmed_commission", "value": 150 },
            { "name": "paid", "value": 135 }
          ]
        }
      ]
    }
  }
}
```

---

## Common Filters

All endpoints support these optional filters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by status | `confirmed`, `pending` |
| `campaign` | string | Marketing campaign ID | `summer-2025` |
| `source` | string | Traffic source | `google`, `facebook` |
| `productId` | string | Product UUID | `prod-abc-123` |

**Example**:
```
GET /api/v1/analytics/partner/summary?range=last_30d&source=google&campaign=summer-2025
```

---

## Standard Error Format

All errors follow consistent structure:

```json
{
  "success": false,
  "error": {
    "code": "ERR_<CATEGORY>_<SPECIFIC>",
    "message": "Human-readable error message",
    "details": {
      // Additional context
    },
    "timestamp": "2025-11-07T06:00:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `ERR_ANALYTICS_FORBIDDEN` | 403 | Insufficient permissions |
| `ERR_ANALYTICS_INVALID_PARAMS` | 400 | Invalid query parameters |
| `ERR_ANALYTICS_RANGE_TOO_LARGE` | 400 | Date range exceeds limit |
| `ERR_PARTNER_NOT_FOUND` | 404 | Partner does not exist |
| `ERR_ANALYTICS_INTERNAL` | 500 | Internal server error |
| `ERR_ANALYTICS_TIMEOUT` | 504 | Query timeout exceeded |

---

## Performance Targets

| Endpoint | P50 | P95 | P99 | Max Timeout |
|----------|-----|-----|-----|-------------|
| `/summary` | < 50ms | < 150ms | < 300ms | 5s |
| `/timeseries` | < 100ms | < 250ms | < 500ms | 10s |
| `/funnel` | < 80ms | < 200ms | < 400ms | 8s |

**Optimization Strategies**:
- Query result caching (30s TTL)
- Database indexes on timestamp + partnerId
- Pre-aggregated daily snapshots
- Pagination for large datasets

---

## Rate Limiting

| User Type | Rate Limit | Burst |
|-----------|------------|-------|
| Partner | 60 req/min | 10 req/s |
| Admin | 300 req/min | 50 req/s |

**Headers**:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699344000
```

---

## Caching Strategy

### Client-Side (React Query)
- **TTL**: 30 seconds
- **Stale-while-revalidate**: Enabled
- **Retry**: 1 attempt

### Server-Side (Redis)
- **TTL**: 30 seconds (summary), 60 seconds (timeseries/funnel)
- **Key Pattern**: `analytics:{partnerId}:{endpoint}:{params_hash}`
- **Invalidation**: On commission status change

---

## Versioning

**Current**: v1
**Path**: `/api/v1/analytics/partner/*`

Future versions will use `/api/v2/...` with backwards compatibility maintained for 6 months.

---

## Examples

### Example 1: Dashboard Summary (Partner)

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/summary?partnerId=me&range=last_30d" \
  -H "Authorization: Bearer <partner_token>"
```

**Response**: See `/summary` response above.

---

### Example 2: Commission Trend Chart (Admin)

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/timeseries?metric=commission&interval=day&from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z&partnerId=abc-123" \
  -H "Authorization: Bearer <admin_token>"
```

**Response**: See `/timeseries` response above.

---

### Example 3: Conversion Funnel

**Request**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/analytics/partner/funnel?from=2025-10-01T00:00:00Z&to=2025-11-01T00:00:00Z&uniqueCustomers=true" \
  -H "Authorization: Bearer <partner_token>"
```

**Response**: See `/funnel` response above.

---

## Testing

### Mock Data

For development/testing, use these mock responses:

**Summary (Zero Data)**:
```json
{
  "success": true,
  "data": {
    "metrics": {
      "clicks": { "value": 0 },
      "conversions": { "value": 0 },
      "cvr": { "value": 0 },
      "aov": { "value": 0 },
      "epc": { "value": 0 },
      "pendingExposure": { "value": 0 },
      "paidRate": { "value": 0 }
    }
  }
}
```

### Contract Tests

All endpoints must pass OpenAPI 3.0 validation. Schema definitions available in `/docs/openapi/analytics.yaml`.

---

## Security Considerations

1. **SQL Injection**: Use parameterized queries only
2. **Data Leakage**: Verify partnerId ownership on every request
3. **DoS Protection**: Enforce rate limits and query timeouts
4. **PII Masking**: Never expose customer emails/names in analytics

---

## Version History

- **1.0** (2025-11-07): Initial API specification for Phase 7
