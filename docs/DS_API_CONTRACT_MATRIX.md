# 드랍쉬핑 API 계약 매트릭스

**작성일**: 2025-11-06
**목적**: API ↔ Frontend 계약 스냅샷, 요청/응답/에러 명세
**범위**: 핵심 6개 API + 주요 드랍쉬핑 엔드포인트

---

## 목차

1. [개요](#1-개요)
2. [공통 규격](#2-공통-규격)
3. [핵심 API 스냅샷 (6개)](#3-핵심-api-스냅샷-6개)
4. [Entity CRUD APIs](#4-entity-crud-apis)
5. [Admin APIs](#5-admin-apis)
6. [Tracking APIs](#6-tracking-apis)
7. [Payment APIs](#7-payment-apis)
8. [에러 코드 정의](#8-에러-코드-정의)
9. [변경 이력](#9-변경-이력)

---

## 1. 개요

### 1.1 API 버전 전략

| 버전 | Base Path | 상태 | 비고 |
|------|-----------|------|------|
| v1 | `/api/v1` | ✅ Active | 현재 버전 |
| admin | `/api/admin` | ✅ Active | 관리자 전용 |
| entity | `/api/v1/entity` | ✅ Active | Entity 기반 CRUD |

### 1.2 인증 방식

**Authorization Header**:
```
Authorization: Bearer <access_token>
```

**Token Refresh**:
- Access Token 만료: 1시간
- Refresh Token 만료: 7일
- authClient 자동 갱신

### 1.3 Rate Limiting

| 엔드포인트 | 제한 | 윈도우 |
|-----------|------|--------|
| POST /tracking/clicks | 10 req | 5분 |
| POST /payments/* | 5 req | 1분 |
| GET /entity/* | 100 req | 1분 |
| POST /admin/* | 30 req | 1분 |

---

## 2. 공통 규격

### 2.1 성공 응답 형식

```typescript
// 단일 리소스
{
  data: T,
  meta?: {
    timestamp: string
  }
}

// 리스트 리소스
{
  data: T[],
  meta: {
    total: number,
    page: number,
    limit: number,
    totalPages: number
  }
}
```

### 2.2 에러 응답 형식

```typescript
{
  error: {
    code: string,          // 에러 코드 (ERR_*)
    message: string,       // 사람이 읽을 수 있는 메시지
    details?: any,         // 추가 상세 정보
    timestamp?: string     // ISO 8601 형식
  }
}
```

### 2.3 페이지네이션 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| page | number | 1 | 페이지 번호 (1부터 시작) |
| limit | number | 20 | 페이지당 항목 수 |
| sortBy | string | createdAt | 정렬 필드 |
| sortOrder | asc\|desc | desc | 정렬 순서 |

### 2.4 필터 파라미터 (공통)

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| status | string | 상태 필터 |
| dateFrom | ISO 8601 | 시작 날짜 |
| dateTo | ISO 8601 | 종료 날짜 |
| search | string | 검색 키워드 |

---

## 3. 핵심 API 스냅샷 (6개)

### 3.1 POST /api/v1/ds/products/sync

**목적**: 외부 피드에서 상품 동기화

#### 요청

```http
POST /api/v1/ds/products/sync HTTP/1.1
Host: api.neture.co.kr
Authorization: Bearer <token>
Content-Type: application/json

{
  "feedId": "feed-uuid-123",
  "supplierId": "supplier-uuid-456",
  "range": {
    "start": 0,
    "limit": 100
  },
  "options": {
    "updateExisting": true,
    "createNew": true,
    "deleteRemoved": false
  }
}
```

**Body 스키마**:
```typescript
interface ProductSyncRequest {
  feedId: string;                    // 필수: 피드 ID
  supplierId: string;                // 필수: 공급자 ID
  range?: {
    start: number;                   // 선택: 시작 인덱스 (기본: 0)
    limit: number;                   // 선택: 가져올 항목 수 (기본: 100)
  };
  options?: {
    updateExisting?: boolean;        // 기존 상품 업데이트 여부 (기본: true)
    createNew?: boolean;             // 신규 상품 생성 여부 (기본: true)
    deleteRemoved?: boolean;         // 피드에서 제거된 상품 삭제 여부 (기본: false)
  };
}
```

#### 응답 (Success)

```http
HTTP/1.1 202 Accepted
Content-Type: application/json

{
  "data": {
    "jobId": "sync-job-789",
    "status": "processing",
    "stats": {
      "total": 100,
      "created": 0,
      "updated": 0,
      "failed": 0,
      "skipped": 0
    },
    "startedAt": "2025-11-06T02:00:00Z",
    "estimatedCompletion": "2025-11-06T02:05:00Z"
  }
}
```

**응답 스키마**:
```typescript
interface ProductSyncResponse {
  jobId: string;                     // 비동기 작업 ID
  status: 'processing' | 'completed' | 'failed';
  stats: {
    total: number;                   // 전체 항목 수
    created: number;                 // 생성된 상품 수
    updated: number;                 // 업데이트된 상품 수
    failed: number;                  // 실패한 항목 수
    skipped: number;                 // 건너뛴 항목 수
  };
  startedAt: string;                 // ISO 8601
  estimatedCompletion?: string;      // ISO 8601
}
```

#### 에러 응답

**401 Unauthorized**:
```json
{
  "error": {
    "code": "ERR_UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden**:
```json
{
  "error": {
    "code": "ERR_FORBIDDEN",
    "message": "Insufficient permissions. Admin or supplier role required."
  }
}
```

**404 Not Found**:
```json
{
  "error": {
    "code": "ERR_NOT_FOUND",
    "message": "Feed not found: feed-uuid-123"
  }
}
```

**409 Conflict**:
```json
{
  "error": {
    "code": "ERR_CONFLICT",
    "message": "Sync job already in progress for this feed",
    "details": {
      "existingJobId": "sync-job-456"
    }
  }
}
```

#### 작업 상태 조회

```http
GET /api/v1/ds/products/sync/:jobId HTTP/1.1
```

**응답**:
```json
{
  "data": {
    "jobId": "sync-job-789",
    "status": "completed",
    "stats": {
      "total": 100,
      "created": 35,
      "updated": 60,
      "failed": 3,
      "skipped": 2
    },
    "startedAt": "2025-11-06T02:00:00Z",
    "completedAt": "2025-11-06T02:04:32Z",
    "failedItems": [
      {
        "index": 5,
        "sku": "PROD-005",
        "error": "Invalid price format"
      }
    ]
  }
}
```

---

### 3.2 GET /api/v1/entity/products

**목적**: 상품 목록 조회 (필터/정렬/페이지네이션)

#### 요청

```http
GET /api/v1/entity/products?page=1&limit=20&sortBy=createdAt&sortOrder=desc&status=active&supplierId=supplier-123 HTTP/1.1
Host: api.neture.co.kr
Authorization: Bearer <token>
```

**Query Parameters**:
```typescript
interface ProductListQuery {
  // 페이지네이션
  page?: number;                     // 기본: 1
  limit?: number;                    // 기본: 20, 최대: 100

  // 정렬
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'price' | 'stock';  // 기본: createdAt
  sortOrder?: 'asc' | 'desc';        // 기본: desc

  // 필터
  status?: 'draft' | 'active' | 'inactive' | 'archived';
  supplierId?: string;
  category?: string;
  tags?: string[];                   // 쉼표 구분 (tag1,tag2)
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;                 // true: 재고 있음만

  // 검색
  search?: string;                   // 상품명, SKU 검색
}
```

#### 응답 (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": [
    {
      "id": "product-001",
      "sku": "PROD-001",
      "name": "드랍쉬핑 상품 A",
      "description": "상품 설명...",
      "price": 29900,
      "compareAtPrice": 39900,
      "currency": "KRW",
      "stock": 150,
      "lowStockThreshold": 10,
      "status": "active",
      "supplierId": "supplier-123",
      "supplier": {
        "id": "supplier-123",
        "businessName": "공급사 A",
        "status": "approved"
      },
      "category": {
        "id": "cat-001",
        "name": "전자제품",
        "slug": "electronics"
      },
      "images": [
        {
          "url": "https://cdn.neture.co.kr/products/prod-001-1.jpg",
          "alt": "상품 이미지 1",
          "order": 0
        }
      ],
      "tags": ["베스트", "할인"],
      "seo": {
        "title": "드랍쉬핑 상품 A | O4O",
        "description": "SEO 설명...",
        "keywords": ["드랍쉬핑", "전자제품"]
      },
      "createdAt": "2025-10-01T00:00:00Z",
      "updatedAt": "2025-11-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 250,
    "page": 1,
    "limit": 20,
    "totalPages": 13
  }
}
```

**응답 스키마**:
```typescript
interface ProductListResponse {
  data: Product[];
  meta: PaginationMeta;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  stock: number;
  lowStockThreshold?: number;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  supplierId: string;
  supplier?: SupplierSummary;
  category?: CategorySummary;
  images: ProductImage[];
  tags?: string[];
  seo?: SEOMetadata;
  createdAt: string;
  updatedAt: string;
}
```

#### 에러 응답

**400 Bad Request**:
```json
{
  "error": {
    "code": "ERR_VALIDATION",
    "message": "Invalid query parameter",
    "details": {
      "field": "limit",
      "message": "Limit must be between 1 and 100"
    }
  }
}
```

---

### 3.3 POST /api/v1/entity/orders

**목적**: 주문 생성

#### 요청

```http
POST /api/v1/entity/orders HTTP/1.1
Host: api.neture.co.kr
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "user-123",
  "items": [
    {
      "productId": "product-001",
      "quantity": 2,
      "unitPrice": 29900
    },
    {
      "productId": "product-002",
      "quantity": 1,
      "unitPrice": 15000
    }
  ],
  "shipping": {
    "method": "standard",
    "address": {
      "recipient": "홍길동",
      "phone": "010-1234-5678",
      "postalCode": "06000",
      "address1": "서울시 강남구 테헤란로 123",
      "address2": "ABC빌딩 4층"
    },
    "message": "부재시 문앞에 놓아주세요"
  },
  "referralCode": "PARTNER123",
  "metadata": {
    "source": "mobile_app",
    "campaign": "summer_sale"
  }
}
```

**Body 스키마**:
```typescript
interface CreateOrderRequest {
  customerId: string;                // 필수: 구매자 ID
  items: OrderItem[];                // 필수: 주문 항목 (최소 1개)
  shipping: ShippingInfo;            // 필수: 배송 정보
  referralCode?: string;             // 선택: 추천인 코드
  couponCode?: string;               // 선택: 쿠폰 코드
  metadata?: Record<string, any>;    // 선택: 추가 메타데이터
}

interface OrderItem {
  productId: string;
  quantity: number;                  // 최소: 1
  unitPrice: number;                 // 단가 (검증용)
  options?: Record<string, string>;  // 옵션 (색상, 사이즈 등)
}

interface ShippingInfo {
  method: 'standard' | 'express' | 'pickup';
  address: Address;
  message?: string;                  // 배송 메시지
}

interface Address {
  recipient: string;
  phone: string;
  postalCode: string;
  address1: string;
  address2?: string;
  country?: string;                  // 기본: KR
}
```

#### 응답 (Success)

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/v1/entity/orders/order-789

{
  "data": {
    "id": "order-789",
    "orderNumber": "O4O-20251106-0789",
    "customerId": "user-123",
    "status": "pending",
    "paymentStatus": "pending",
    "items": [
      {
        "id": "item-001",
        "productId": "product-001",
        "productName": "드랍쉬핑 상품 A",
        "quantity": 2,
        "unitPrice": 29900,
        "totalPrice": 59800,
        "supplierId": "supplier-123"
      },
      {
        "id": "item-002",
        "productId": "product-002",
        "productName": "드랍쉬핑 상품 B",
        "quantity": 1,
        "unitPrice": 15000,
        "totalPrice": 15000,
        "supplierId": "supplier-456"
      }
    ],
    "summary": {
      "subtotal": 74800,
      "shippingCost": 3000,
      "tax": 0,
      "discount": 0,
      "total": 77800,
      "currency": "KRW"
    },
    "shipping": {
      "method": "standard",
      "address": { /* ... */ },
      "message": "부재시 문앞에 놓아주세요"
    },
    "partnerId": "partner-456",       // referralCode 매칭 결과
    "referralCode": "PARTNER123",
    "createdAt": "2025-11-06T03:00:00Z",
    "updatedAt": "2025-11-06T03:00:00Z"
  }
}
```

#### 에러 응답

**400 Bad Request (재고 부족)**:
```json
{
  "error": {
    "code": "ERR_INSUFFICIENT_STOCK",
    "message": "Insufficient stock for product",
    "details": {
      "productId": "product-001",
      "requested": 2,
      "available": 1
    }
  }
}
```

**400 Bad Request (가격 불일치)**:
```json
{
  "error": {
    "code": "ERR_PRICE_MISMATCH",
    "message": "Unit price does not match current product price",
    "details": {
      "productId": "product-001",
      "submittedPrice": 29900,
      "currentPrice": 32000
    }
  }
}
```

---

### 3.4 POST /api/v1/entity/orders/:id/confirm

**목적**: 주문 확정 (재고 차감, 커미션 생성)

#### 요청

```http
POST /api/v1/entity/orders/order-789/confirm HTTP/1.1
Host: api.neture.co.kr
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentConfirmed": true,
  "metadata": {
    "confirmedBy": "admin-001",
    "notes": "정상 결제 확인"
  }
}
```

#### 응답 (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "id": "order-789",
    "orderNumber": "O4O-20251106-0789",
    "status": "confirmed",
    "paymentStatus": "completed",
    "confirmedAt": "2025-11-06T03:05:00Z",
    "inventoryDeducted": true,
    "commissionCreated": true,
    "commissionId": "comm-123",
    "message": "Order confirmed successfully"
  }
}
```

#### 에러 응답

**409 Conflict**:
```json
{
  "error": {
    "code": "ERR_ORDER_ALREADY_CONFIRMED",
    "message": "Order has already been confirmed",
    "details": {
      "orderId": "order-789",
      "confirmedAt": "2025-11-06T03:00:00Z"
    }
  }
}
```

---

### 3.5 POST /api/v1/payments/toss/webhook

**목적**: Toss Payments 웹훅 수신

#### 요청

```http
POST /api/v1/payments/toss/webhook HTTP/1.1
Host: api.neture.co.kr
Content-Type: application/json
tosspayments-signature: v1:abc123def456...
tosspayments-webhook-transmission-time: 1730851200

{
  "eventType": "PAYMENT_CONFIRMED",
  "createdAt": "2025-11-06T03:00:00Z",
  "data": {
    "paymentKey": "toss-payment-key-123",
    "orderId": "order-789",
    "status": "DONE",
    "transactionKey": "txn-456",
    "method": "카드",
    "totalAmount": 77800,
    "approvedAt": "2025-11-06T03:00:00Z",
    "card": {
      "company": "신한",
      "number": "1234-56**-****-7890",
      "installmentPlanMonths": 0,
      "isInterestFree": false,
      "approveNo": "12345678"
    }
  }
}
```

**Header 검증**:
```typescript
interface WebhookHeaders {
  'tosspayments-signature': string;              // v1:<signature1>,<signature2>,...
  'tosspayments-webhook-transmission-time': string;  // Unix timestamp (seconds)
}
```

#### 응답 (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Webhook processed successfully",
  "webhookId": "webhook-001"
}
```

#### 에러 응답

**401 Unauthorized (서명 불일치)**:
```json
{
  "error": {
    "code": "ERR_INVALID_SIGNATURE",
    "message": "Webhook signature verification failed"
  }
}
```

**400 Bad Request (타임스탬프 초과)**:
```json
{
  "error": {
    "code": "ERR_TIMESTAMP_EXPIRED",
    "message": "Webhook timestamp is too old",
    "details": {
      "transmissionTime": 1730851200,
      "currentTime": 1730851500,
      "diff": 300,
      "maxAllowed": 300
    }
  }
}
```

**Idempotency**:
- 동일한 paymentKey로 중복 웹훅 수신 시 200 OK 반환 (재처리 안 함)
- 웹훅 로그 테이블에 기록

---

### 3.6 POST /api/v1/ds/settlements/calc

**목적**: 정산 금액 계산 (실행 전 미리보기)

#### 요청

```http
POST /api/v1/ds/settlements/calc HTTP/1.1
Host: api.neture.co.kr
Authorization: Bearer <token>
Content-Type: application/json

{
  "paymentId": "payment-123",
  "breakdown": true
}
```

#### 응답 (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "paymentId": "payment-123",
    "totalAmount": 77800,
    "settlements": [
      {
        "recipientType": "SUPPLIER",
        "recipientId": "supplier-123",
        "recipientName": "공급사 A",
        "amount": 50000,
        "fee": 0,
        "tax": 0,
        "netAmount": 50000,
        "scheduledAt": "2025-11-09T00:00:00Z",
        "breakdown": {
          "items": [
            {
              "productId": "product-001",
              "quantity": 2,
              "unitSupplyPrice": 25000,
              "totalSupplyPrice": 50000
            }
          ]
        }
      },
      {
        "recipientType": "SUPPLIER",
        "recipientId": "supplier-456",
        "recipientName": "공급사 B",
        "amount": 12000,
        "fee": 0,
        "tax": 0,
        "netAmount": 12000,
        "scheduledAt": "2025-11-09T00:00:00Z",
        "breakdown": {
          "items": [
            {
              "productId": "product-002",
              "quantity": 1,
              "unitSupplyPrice": 12000,
              "totalSupplyPrice": 12000
            }
          ]
        }
      },
      {
        "recipientType": "PARTNER",
        "recipientId": "partner-456",
        "recipientName": "파트너 홍길동",
        "amount": 7780,
        "fee": 0,
        "tax": 0,
        "netAmount": 7780,
        "scheduledAt": "2025-11-13T00:00:00Z",
        "breakdown": {
          "commissionId": "comm-123",
          "commissionRate": 10.0,
          "orderAmount": 77800,
          "calculatedCommission": 7780
        }
      },
      {
        "recipientType": "PLATFORM",
        "recipientId": "00000000-0000-0000-0000-000000000000",
        "recipientName": "O4O Platform",
        "amount": 3890,
        "fee": 0,
        "tax": 0,
        "netAmount": 3890,
        "scheduledAt": "2025-11-06T03:00:00Z",
        "breakdown": {
          "feeRate": 5.0,
          "orderAmount": 77800,
          "calculatedFee": 3890
        }
      }
    ],
    "summary": {
      "totalSupplierAmount": 62000,
      "totalPartnerCommission": 7780,
      "totalPlatformFee": 3890,
      "totalDistributed": 73670,
      "remaining": 4130
    }
  }
}
```

**응답 스키마**:
```typescript
interface SettlementCalcResponse {
  paymentId: string;
  totalAmount: number;
  settlements: Settlement[];
  summary: {
    totalSupplierAmount: number;
    totalPartnerCommission: number;
    totalPlatformFee: number;
    totalDistributed: number;
    remaining: number;
  };
}

interface Settlement {
  recipientType: 'SUPPLIER' | 'PARTNER' | 'PLATFORM';
  recipientId: string;
  recipientName: string;
  amount: number;
  fee: number;
  tax: number;
  netAmount: number;
  scheduledAt: string;              // ISO 8601
  breakdown?: any;
}
```

---

## 4. Entity CRUD APIs

### 4.1 Suppliers

**Base Path**: `/api/v1/entity/suppliers`

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | / | 공급자 목록 | User (본인), Admin (전체) |
| GET | /:id | 공급자 상세 | Owner, Admin |
| POST | / | 공급자 생성 | Authenticated |
| PUT | /:id | 공급자 수정 | Owner, Admin |
| DELETE | /:id | 공급자 삭제 (Soft) | Owner, Admin |
| PUT | /:id/approve | 공급자 승인 | Admin |
| PUT | /:id/reject | 공급자 거부 | Admin |
| GET | /:id/dashboard | 공급자 대시보드 | Owner, Admin |

**Supplier DTO**:
```typescript
interface SupplierDTO {
  id: string;
  userId: string;
  businessName: string;
  businessNumber: string;
  businessType: 'individual' | 'corporation';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  tier: 'basic' | 'standard' | 'premium';
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: Address;
  bankAccount?: BankAccount;
  documents?: Document[];
  metrics: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    avgRating: number;
  };
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}
```

### 4.2 Partners

**Base Path**: `/api/v1/entity/partners`

| Method | Path | 설명 | 권한 |
|--------|------|------|------|
| GET | / | 파트너 목록 | User (본인), Admin (전체) |
| GET | /:id | 파트너 상세 | Owner, Admin |
| POST | / | 파트너 생성 | Authenticated |
| PUT | /:id | 파트너 수정 | Owner, Admin |
| DELETE | /:id | 파트너 삭제 (Soft) | Owner, Admin |
| PUT | /:id/approve | 파트너 승인 | Admin |
| PUT | /:id/reject | 파트너 거부 | Admin |
| GET | /:id/referral-link | 추천 링크 생성 | Owner, Admin |
| GET | /:id/dashboard/summary | 파트너 대시보드 | Owner, Admin |
| GET | /:id/dashboard/commissions | 커미션 내역 | Owner, Admin |

**Partner DTO**:
```typescript
interface PartnerDTO {
  id: string;
  userId: string;
  referralCode: string;              // 고유 코드 (6-8자)
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  status: 'active' | 'inactive' | 'suspended';
  isActive: boolean;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEnabled: boolean;
  bankAccount?: BankAccount;
  metrics: {
    totalClicks: number;
    totalSignups: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommission: number;
    paidCommission: number;
    pendingCommission: number;
  };
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
}
```

**Referral Link Response**:
```typescript
// GET /api/v1/entity/partners/:id/referral-link?productId=product-001
{
  "data": {
    "partnerId": "partner-456",
    "referralCode": "PARTNER123",
    "url": "https://neture.co.kr/products/product-001?ref=PARTNER123",
    "shortUrl": "https://ntu.re/p/abc123",
    "qrCodeUrl": "https://cdn.neture.co.kr/qr/partner-456-product-001.png",
    "expiresAt": null  // 영구 링크
  }
}
```

---

## 5. Admin APIs

**Base Path**: `/api/admin/dropshipping`

### 5.1 Commission Policies

```http
GET /api/admin/dropshipping/commission-policies HTTP/1.1
```

**응답**:
```json
{
  "data": [
    {
      "id": "policy-001",
      "policyCode": "DEFAULT",
      "name": "기본 커미션 정책",
      "policyType": "DEFAULT",
      "status": "ACTIVE",
      "priority": 0,
      "commissionType": "PERCENTAGE",
      "commissionRate": 10.0,
      "minCommission": 1000,
      "maxCommission": 100000,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": null,
      "usageCount": 1250,
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "policy-002",
      "policyCode": "TIER_GOLD",
      "name": "골드 티어 커미션",
      "policyType": "TIER_BASED",
      "status": "ACTIVE",
      "priority": 50,
      "partnerTier": "gold",
      "commissionType": "PERCENTAGE",
      "commissionRate": 15.0,
      "usageCount": 320,
      "createdAt": "2025-03-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 8,
    "page": 1,
    "limit": 20
  }
}
```

### 5.2 Approvals

```http
GET /api/admin/dropshipping/approvals HTTP/1.1
```

**응답**:
```json
{
  "data": [
    {
      "id": "approval-001",
      "type": "supplier",
      "resourceId": "supplier-789",
      "resourceName": "신규 공급사 ABC",
      "status": "pending",
      "requestedBy": "user-123",
      "requestedAt": "2025-11-05T10:00:00Z",
      "documents": [
        {
          "type": "business_registration",
          "url": "https://cdn.neture.co.kr/docs/br-789.pdf"
        }
      ]
    },
    {
      "id": "approval-002",
      "type": "partner",
      "resourceId": "partner-890",
      "resourceName": "파트너 홍길동",
      "status": "pending",
      "requestedBy": "user-456",
      "requestedAt": "2025-11-04T15:30:00Z"
    }
  ],
  "meta": {
    "total": 12,
    "pending": 12,
    "approved": 45,
    "rejected": 3
  }
}
```

**Approve**:
```http
POST /api/admin/dropshipping/approvals/approval-001/approve HTTP/1.1
Content-Type: application/json

{
  "notes": "서류 확인 완료"
}
```

**응답**:
```json
{
  "data": {
    "id": "approval-001",
    "status": "approved",
    "approvedBy": "admin-001",
    "approvedAt": "2025-11-06T03:00:00Z",
    "notes": "서류 확인 완료"
  }
}
```

### 5.3 System Status

```http
GET /api/admin/dropshipping/system-status HTTP/1.1
```

**응답**:
```json
{
  "data": {
    "overall": "healthy",
    "components": {
      "database": {
        "status": "up",
        "connections": 15,
        "maxConnections": 100,
        "avgQueryTime": 12
      },
      "redis": {
        "status": "up",
        "usedMemory": "256MB",
        "hitRate": 98.5
      },
      "queue": {
        "status": "up",
        "activeJobs": 3,
        "completedToday": 1245,
        "failedToday": 2
      },
      "webhookService": {
        "status": "up",
        "queueDepth": 15,
        "successRate": 99.8
      }
    },
    "statistics": {
      "totalSuppliers": 45,
      "activeSuppliers": 38,
      "totalPartners": 120,
      "activePartners": 105,
      "totalProducts": 2340,
      "activeProducts": 1985,
      "pendingApprovals": 12,
      "pendingCommissions": 345,
      "pendingSettlements": 89
    },
    "lastBatchRun": {
      "type": "commission_confirmation",
      "startedAt": "2025-11-06T02:00:00Z",
      "completedAt": "2025-11-06T02:00:12Z",
      "processed": 123,
      "failed": 0
    }
  }
}
```

### 5.4 Bulk Product Import

```http
POST /api/admin/dropshipping/products/bulk-import HTTP/1.1
Content-Type: application/json

{
  "format": "json",
  "supplierId": "supplier-123",
  "products": [
    {
      "sku": "PROD-NEW-001",
      "name": "신규 상품 1",
      "price": 29900,
      "stock": 100,
      "category": "electronics"
    },
    {
      "sku": "PROD-NEW-002",
      "name": "신규 상품 2",
      "price": 15000,
      "stock": 50,
      "category": "home"
    }
  ],
  "options": {
    "updateExisting": false,
    "validate": true,
    "dryRun": false
  }
}
```

**응답**:
```json
{
  "data": {
    "jobId": "import-job-456",
    "status": "processing",
    "total": 2,
    "validated": 2,
    "errors": [],
    "warnings": [],
    "estimatedCompletion": "2025-11-06T03:01:00Z"
  }
}
```

---

## 6. Tracking APIs

**Base Path**: `/api/v1/tracking`

### 6.1 POST /clicks

**목적**: 추천 클릭 추적

```http
POST /api/v1/tracking/clicks HTTP/1.1
Content-Type: application/json

{
  "referralCode": "PARTNER123",
  "productId": "product-001",
  "referralLink": "https://neture.co.kr/products/product-001?ref=PARTNER123",
  "campaign": "summer_sale",
  "medium": "social",
  "source": "facebook"
}
```

**응답**:
```json
{
  "data": {
    "id": "click-789",
    "partnerId": "partner-456",
    "productId": "product-001",
    "referralCode": "PARTNER123",
    "status": "VALID",
    "clickSource": "SOCIAL",
    "deviceType": "mobile",
    "country": "KR",
    "city": "Seoul",
    "createdAt": "2025-11-06T03:00:00Z"
  }
}
```

**Status 값**:
- `VALID`: 정상 클릭
- `DUPLICATE`: 중복 클릭 (24시간 내)
- `BOT`: 봇 탐지
- `INTERNAL`: 내부 트래픽
- `RATE_LIMITED`: 레이트 리미트 초과

### 6.2 POST /conversions

**목적**: 전환 이벤트 기록

```http
POST /api/v1/tracking/conversions HTTP/1.1
Content-Type: application/json

{
  "referralClickId": "click-789",
  "orderId": "order-789",
  "conversionType": "PURCHASE",
  "orderAmount": 77800,
  "quantity": 3
}
```

**응답**:
```json
{
  "data": {
    "id": "conversion-456",
    "partnerId": "partner-456",
    "referralClickId": "click-789",
    "orderId": "order-789",
    "status": "CONFIRMED",
    "conversionType": "PURCHASE",
    "orderAmount": 77800,
    "attributionModel": "LAST_TOUCH",
    "attributionWeight": 1.0,
    "isNewCustomer": true,
    "createdAt": "2025-11-06T03:05:00Z"
  }
}
```

---

## 7. Payment APIs

**Base Path**: `/api/v1/payments`

### 7.1 POST /prepare

**목적**: 결제 준비

```http
POST /api/v1/payments/prepare HTTP/1.1
Content-Type: application/json

{
  "orderId": "order-789",
  "amount": 77800,
  "orderName": "드랍쉬핑 상품 A 외 1건",
  "customerEmail": "customer@example.com",
  "customerName": "홍길동",
  "customerMobilePhone": "01012345678",
  "successUrl": "https://neture.co.kr/payments/success",
  "failUrl": "https://neture.co.kr/payments/fail"
}
```

**응답**:
```json
{
  "data": {
    "paymentId": "payment-123",
    "orderId": "order-789",
    "amount": 77800,
    "currency": "KRW",
    "status": "PENDING",
    "clientKey": "test_ck_...",
    "successUrl": "https://neture.co.kr/payments/success",
    "failUrl": "https://neture.co.kr/payments/fail",
    "createdAt": "2025-11-06T03:00:00Z"
  }
}
```

### 7.2 POST /confirm

**목적**: 결제 승인

```http
POST /api/v1/payments/confirm HTTP/1.1
Content-Type: application/json

{
  "paymentKey": "toss-payment-key-123",
  "orderId": "order-789",
  "amount": 77800
}
```

**응답**:
```json
{
  "data": {
    "paymentId": "payment-123",
    "paymentKey": "toss-payment-key-123",
    "orderId": "order-789",
    "status": "DONE",
    "method": "CARD",
    "amount": 77800,
    "approvedAt": "2025-11-06T03:00:00Z",
    "methodDetails": {
      "company": "신한",
      "number": "1234-56**-****-7890",
      "installmentPlanMonths": 0
    }
  }
}
```

### 7.3 POST /cancel

**목적**: 결제 취소/환불

```http
POST /api/v1/payments/cancel HTTP/1.1
Content-Type: application/json

{
  "paymentKey": "toss-payment-key-123",
  "cancelReason": "고객 변심",
  "cancelAmount": 77800
}
```

**응답**:
```json
{
  "data": {
    "paymentId": "payment-123",
    "status": "CANCELED",
    "cancelAmount": 77800,
    "balanceAmount": 0,
    "cancelReason": "고객 변심",
    "canceledAt": "2025-11-06T04:00:00Z"
  }
}
```

---

## 8. 에러 코드 정의

### 8.1 인증/권한 (4xx)

| 코드 | HTTP | 설명 | 해결 방법 |
|------|------|------|-----------|
| `ERR_UNAUTHORIZED` | 401 | 인증 필요 | 로그인 후 재시도 |
| `ERR_TOKEN_EXPIRED` | 401 | 토큰 만료 | 토큰 갱신 후 재시도 |
| `ERR_FORBIDDEN` | 403 | 권한 부족 | 관리자 문의 |
| `ERR_INVALID_TOKEN` | 401 | 잘못된 토큰 | 재로그인 필요 |

### 8.2 리소스 (4xx)

| 코드 | HTTP | 설명 | 해결 방법 |
|------|------|------|-----------|
| `ERR_NOT_FOUND` | 404 | 리소스 없음 | ID 확인 |
| `ERR_ALREADY_EXISTS` | 409 | 중복 리소스 | 다른 값 사용 |
| `ERR_CONFLICT` | 409 | 상태 충돌 | 리소스 상태 확인 |

### 8.3 검증 (4xx)

| 코드 | HTTP | 설명 | 해결 방법 |
|------|------|------|-----------|
| `ERR_VALIDATION` | 400 | 입력값 검증 실패 | details 필드 확인 |
| `ERR_INVALID_INPUT` | 400 | 잘못된 입력 | 파라미터 형식 확인 |
| `ERR_MISSING_FIELD` | 400 | 필수 필드 누락 | 필드 추가 |
| `ERR_PRICE_MISMATCH` | 400 | 가격 불일치 | 최신 가격 확인 |

### 8.4 비즈니스 로직 (4xx)

| 코드 | HTTP | 설명 | 해결 방법 |
|------|------|------|-----------|
| `ERR_INSUFFICIENT_STOCK` | 400 | 재고 부족 | 수량 감소 또는 재입고 대기 |
| `ERR_INSUFFICIENT_BALANCE` | 400 | 잔액 부족 | 충전 후 재시도 |
| `ERR_ORDER_CANCELLED` | 400 | 취소된 주문 | 새 주문 생성 |
| `ERR_COMMISSION_ALREADY_PAID` | 400 | 이미 지급된 커미션 | 조정 불가 |
| `ERR_PAYMENT_FAILED` | 400 | 결제 실패 | 결제 수단 확인 |

### 8.5 레이트 리미팅 (4xx)

| 코드 | HTTP | 설명 | 해결 방법 |
|------|------|------|-----------|
| `ERR_RATE_LIMIT` | 429 | 요청 한도 초과 | Retry-After 헤더 확인 후 재시도 |

### 8.6 외부 서비스 (5xx)

| 코드 | HTTP | 설명 | 해결 방법 |
|------|------|------|-----------|
| `ERR_UPSTREAM` | 502 | 외부 API 오류 | 잠시 후 재시도 |
| `ERR_TOSS_API` | 502 | Toss API 오류 | 결제 상태 확인 |

### 8.7 내부 오류 (5xx)

| 코드 | HTTP | 설명 | 해결 방법 |
|------|------|------|-----------|
| `ERR_INTERNAL` | 500 | 서버 내부 오류 | 관리자 문의 |
| `ERR_DATABASE` | 500 | 데이터베이스 오류 | 관리자 문의 |

---

## 9. 변경 이력

### v1.0.0 (2025-11-06)

**초기 버전**:
- 핵심 6개 API 스냅샷 작성
- Entity CRUD APIs 정의
- Admin APIs 정의
- Tracking APIs 정의
- Payment APIs 정의
- 에러 코드 표준화

**Breaking Changes**:
- 없음 (초기 버전)

**Deprecations**:
- 없음

**Known Issues**:
- Settlement 실행 API 미구현 (계산 API만 제공)
- Partner 정산 로직 일부 TODO 상태

---

## 부록

### A. Request/Response 예시 (Curl)

**Product Sync**:
```bash
curl -X POST https://api.neture.co.kr/api/v1/ds/products/sync \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "feedId": "feed-uuid-123",
    "supplierId": "supplier-uuid-456",
    "range": { "start": 0, "limit": 100 }
  }'
```

**Product List**:
```bash
curl -X GET "https://api.neture.co.kr/api/v1/entity/products?page=1&limit=20&status=active" \
  -H "Authorization: Bearer <token>"
```

**Create Order**:
```bash
curl -X POST https://api.neture.co.kr/api/v1/entity/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @order-payload.json
```

### B. TypeScript SDK 예시

```typescript
import { O4OApiClient } from '@o4o/api-client';

const client = new O4OApiClient({
  baseURL: 'https://api.neture.co.kr',
  accessToken: '<token>'
});

// Product sync
const syncJob = await client.dropshipping.products.sync({
  feedId: 'feed-uuid-123',
  supplierId: 'supplier-uuid-456',
  range: { start: 0, limit: 100 }
});

console.log('Job ID:', syncJob.jobId);

// Product list
const products = await client.entity.products.list({
  page: 1,
  limit: 20,
  status: 'active'
});

console.log('Total:', products.meta.total);
console.log('Products:', products.data);

// Create order
const order = await client.entity.orders.create({
  customerId: 'user-123',
  items: [
    { productId: 'product-001', quantity: 2, unitPrice: 29900 }
  ],
  shipping: {
    method: 'standard',
    address: {
      recipient: '홍길동',
      phone: '010-1234-5678',
      postalCode: '06000',
      address1: '서울시 강남구 테헤란로 123'
    }
  },
  referralCode: 'PARTNER123'
});

console.log('Order created:', order.orderNumber);
```

### C. Postman Collection

**Collection 구조**:
```
O4O Dropshipping APIs
├── Entity APIs
│   ├── Products
│   │   ├── List Products
│   │   ├── Get Product
│   │   ├── Create Product
│   │   └── Update Product
│   ├── Suppliers
│   │   ├── List Suppliers
│   │   ├── Approve Supplier
│   │   └── ...
│   └── Partners
│       ├── List Partners
│       ├── Generate Referral Link
│       └── ...
├── Admin APIs
│   ├── Commission Policies
│   ├── Approvals
│   └── System Status
├── Tracking APIs
│   ├── Record Click
│   └── Record Conversion
└── Payment APIs
    ├── Prepare Payment
    ├── Confirm Payment
    └── Cancel Payment
```

**환경변수**:
```json
{
  "baseUrl": "https://api.neture.co.kr",
  "accessToken": "{{$randomUUID}}",
  "supplierId": "supplier-123",
  "partnerId": "partner-456",
  "productId": "product-001"
}
```

### D. OpenAPI 3.0 스펙 (요약)

```yaml
openapi: 3.0.0
info:
  title: O4O Dropshipping API
  version: 1.0.0
  description: O4O Platform 드랍쉬핑 API 명세

servers:
  - url: https://api.neture.co.kr/api/v1
    description: Production
  - url: https://staging-api.neture.co.kr/api/v1
    description: Staging

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Product:
      type: object
      properties:
        id: { type: string, format: uuid }
        sku: { type: string }
        name: { type: string }
        price: { type: number }
        # ...

    Error:
      type: object
      properties:
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
            details: { type: object }

paths:
  /entity/products:
    get:
      summary: List products
      operationId: listProducts
      # ...

  /entity/orders:
    post:
      summary: Create order
      operationId: createOrder
      # ...
```

---

**작성자**: Claude (Detailed Analysis)
**검토자**: (검토 후 서명)
**승인자**: (승인 후 서명)
**최종 수정일**: 2025-11-06
