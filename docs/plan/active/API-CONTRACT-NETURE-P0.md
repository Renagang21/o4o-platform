# API Contract - Neture P0

## Overview

**Service**: Neture
**Version**: P0 (Read-Only)
**Base URL**: `/api/v1/neture`
**Auth**: JWT Bearer Token (읽기만 수행)

---

## Principles

1. **GET 전용** - 모든 엔드포인트는 읽기 전용
2. **주문/결제 없음** - E-commerce Core 연동 없음
3. **외부 통신** - 협의 채널은 외부 링크로만 제공
4. **상태 표시만** - 상태 변경은 각 서비스 대시보드에서

---

## 1. Supplier APIs

### 1.1 공급자 목록 조회

```http
GET /api/v1/neture/suppliers
```

**Query Parameters:**
- `category` (optional): 제품 카테고리 필터
- `limit` (optional): 결과 개수 제한 (default: 20)
- `offset` (optional): 페이지네이션

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "slug": "supplier-slug",
      "name": "공급자명",
      "logo": "https://...",
      "category": "카테고리",
      "shortDescription": "한 줄 소개"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 1.2 공급자 상세 조회

```http
GET /api/v1/neture/suppliers/:slug
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "supplier-slug",
    "name": "공급자명",
    "logo": "https://...",
    "description": "상세 설명",
    "products": [
      {
        "id": "uuid",
        "name": "제품명",
        "category": "카테고리",
        "description": "제품 설명"
      }
    ],
    "pricingPolicy": "가격 정책 텍스트",
    "moq": "최소 주문 수량",
    "shippingPolicy": {
      "standard": "일반 배송 정책",
      "island": "도서 배송 정책",
      "mountain": "산간 배송 정책"
    },
    "contact": {
      "email": "contact@example.com",
      "phone": "010-1234-5678",
      "website": "https://...",
      "kakao": "https://pf.kakao.com/..."
    }
  }
}
```

**금지 필드:**
- `price` (숫자 가격)
- `stock` (재고)
- `cart` (장바구니)
- `order` (주문)

---

## 2. Partnership Request APIs

### 2.1 제휴 요청 목록 조회

```http
GET /api/v1/neture/partnership/requests
```

**Query Parameters:**
- `serviceType` (optional): 서비스 유형 필터
- `category` (optional): 제품 카테고리 필터
- `status` (optional): `OPEN` | `MATCHED` | `CLOSED`
- `limit` (optional): 결과 개수 제한
- `offset` (optional): 페이지네이션

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "seller": {
        "id": "uuid",
        "name": "판매자명",
        "serviceType": "glycopharm"
      },
      "productCount": 15,
      "period": {
        "start": "2026-01-01",
        "end": "2026-12-31"
      },
      "revenueStructure": "수익 배분 기준 텍스트",
      "status": "OPEN",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

### 2.2 제휴 요청 상세 조회

```http
GET /api/v1/neture/partnership/requests/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "seller": {
      "id": "uuid",
      "name": "판매자명",
      "serviceType": "glycopharm",
      "storeUrl": "https://glycopharm.co.kr/store/xxx"
    },
    "products": [
      {
        "id": "uuid",
        "name": "제품명",
        "category": "카테고리"
      }
    ],
    "revenueStructure": "제휴 기준 수익 구조 상세 설명",
    "period": {
      "start": "2026-01-01",
      "end": "2026-12-31"
    },
    "promotionScope": {
      "sns": true,
      "content": true,
      "banner": false,
      "other": "기타 설명"
    },
    "contact": {
      "email": "seller@example.com",
      "phone": "010-9876-5432",
      "kakao": "https://pf.kakao.com/..."
    },
    "status": "OPEN",
    "createdAt": "2026-01-01T00:00:00Z",
    "matchedAt": null
  }
}
```

**금지 필드:**
- `apply` (신청)
- `approve` (승인)
- `contract` (계약)
- `payment` (정산)

---

## 3. 금지 엔드포인트 (P0)

다음 엔드포인트는 **절대 구현 금지**:

```http
POST /api/v1/neture/partnership/requests        ❌ (생성은 각 서비스 대시보드)
PUT /api/v1/neture/partnership/requests/:id     ❌
DELETE /api/v1/neture/partnership/requests/:id  ❌
POST /api/v1/neture/partnership/apply           ❌
POST /api/v1/neture/orders                      ❌
POST /api/v1/neture/payments                    ❌
POST /api/v1/neture/messages                    ❌
```

---

## 4. Error Responses

### 4.1 표준 에러 포맷

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "요청하신 리소스를 찾을 수 없습니다"
  }
}
```

### 4.2 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| `RESOURCE_NOT_FOUND` | 404 | 리소스 없음 |
| `INVALID_PARAMETER` | 400 | 잘못된 파라미터 |
| `UNAUTHORIZED` | 401 | 인증 필요 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `SERVER_ERROR` | 500 | 서버 오류 |

---

## 5. DB Schema (참조용)

### 5.1 neture_suppliers

```sql
CREATE TABLE neture_suppliers (
  id UUID PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  logo TEXT,
  description TEXT,
  pricing_policy TEXT,
  moq VARCHAR(255),
  shipping_standard TEXT,
  shipping_island TEXT,
  shipping_mountain TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_website TEXT,
  contact_kakao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 neture_supplier_products

```sql
CREATE TABLE neture_supplier_products (
  id UUID PRIMARY KEY,
  supplier_id UUID REFERENCES neture_suppliers(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 neture_partnership_requests

```sql
CREATE TABLE neture_partnership_requests (
  id UUID PRIMARY KEY,
  seller_id UUID NOT NULL, -- 소프트 FK (각 서비스의 사용자 ID)
  seller_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(50) NOT NULL, -- glycopharm, k-cosmetics 등
  store_url TEXT,
  revenue_structure TEXT,
  period_start DATE,
  period_end DATE,
  promotion_sns BOOLEAN DEFAULT false,
  promotion_content BOOLEAN DEFAULT false,
  promotion_banner BOOLEAN DEFAULT false,
  promotion_other TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_kakao TEXT,
  status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, MATCHED, CLOSED
  matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5.4 neture_partnership_products

```sql
CREATE TABLE neture_partnership_products (
  id UUID PRIMARY KEY,
  request_id UUID REFERENCES neture_partnership_requests(id),
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**중요 원칙:**
- Core DB에 Neture 테이블 생성 ❌
- 모든 테이블은 `neture_` prefix 필수
- 타 서비스 테이블에 FK 설정 금지
- `seller_id`는 문자열/UUID로만 저장 (소프트 참조)

---

## 6. Mock Data (개발용)

### 6.1 공급자 Mock

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "abc-pharma",
  "name": "ABC 제약",
  "logo": "https://via.placeholder.com/150",
  "category": "의약품",
  "shortDescription": "검증된 의약품 공급자"
}
```

### 6.2 제휴 요청 Mock

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "seller": {
    "name": "서울약국",
    "serviceType": "glycopharm"
  },
  "productCount": 12,
  "period": {
    "start": "2026-02-01",
    "end": "2026-07-31"
  },
  "revenueStructure": "매출의 5% 수익 배분",
  "status": "OPEN"
}
```

---

## 7. 검증 체크리스트

- [ ] 모든 API는 GET 메서드만 사용
- [ ] 주문/결제 관련 엔드포인트 없음
- [ ] 상태 변경 API 없음 (POST/PUT/DELETE)
- [ ] DB 스키마에 `neture_` prefix 사용
- [ ] Core 테이블에 FK 없음
- [ ] 응답에 금지 필드 없음 (price, stock, cart, order)

---

**Work Order**: WO-NETURE-CORE-V1
**생성일**: 2026-01-11
**버전**: P0 (Read-Only)
