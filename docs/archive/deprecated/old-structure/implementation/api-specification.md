# API 명세서

## 📋 개요

O4O 플랫폼의 RESTful API 명세서입니다. 현재는 Mock 데이터를 기반으로 구현되어 있으며, 실제 백엔드 API와의 연동을 위한 설계 문서입니다.

## 🔐 인증 시스템

### Base URL
```
https://api.o4o-platform.com/v1
```

### 인증 방식
- **JWT Token**: Bearer 토큰 방식
- **Refresh Token**: 자동 토큰 갱신
- **Role-based Access**: 역할 기반 접근 제어

### 헤더 구성
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
Accept: application/json
```

## 👤 인증 API

### POST /auth/login
사용자 로그인

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "userType": "customer" // admin | supplier | retailer | customer
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "홍길동",
      "userType": "customer",
      "status": "active"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 3600
    }
  }
}
```

### POST /auth/register
사용자 회원가입

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "김신규",
  "phone": "010-1234-5678",
  "userType": "customer",
  "businessNumber": "123-45-67890", // 사업자 등록시 필수
  "grade": "gold" // 리테일러인 경우
}
```

### POST /auth/logout
로그아웃

### POST /auth/refresh
토큰 갱신

## 📦 상품 API

### GET /products
상품 목록 조회

**Query Parameters:**
```
?page=1
&limit=20
&category=electronics
&search=노트북
&minPrice=100000
&maxPrice=2000000
&sortBy=createdAt
&sortOrder=desc
&approvalStatus=approved
&supplierId=supplier_123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "product_123",
        "name": "삼성 갤럭시 노트북 15인치",
        "brand": "삼성",
        "model": "NT750XDA-K58A",
        "categories": ["electronics", "laptops"],
        "images": [
          "https://example.com/image1.jpg"
        ],
        "basePrice": 1200000,
        "pricing": {
          "gold": 1020000,
          "premium": 900000,
          "vip": 780000
        },
        "stockQuantity": 50,
        "minOrderQuantity": 1,
        "maxOrderQuantity": 10,
        "approvalStatus": "approved",
        "supplierId": "supplier_123",
        "rating": 4.5,
        "reviewCount": 128,
        "createdAt": "2024-06-01T00:00:00Z",
        "updatedAt": "2024-06-20T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

### GET /products/:id
상품 상세 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "product_123",
      "name": "삼성 갤럭시 노트북 15인치",
      "description": "고성능 비즈니스 노트북입니다...",
      "shortDescription": "15인치 FHD 디스플레이, 16GB RAM",
      "specifications": {
        "화면크기": "15.6인치",
        "해상도": "1920x1080",
        "프로세서": "Intel Core i7-11th",
        "메모리": "16GB DDR4",
        "저장장치": "512GB NVMe SSD"
      },
      // ... 기타 필드들
    }
  }
}
```

### POST /products
상품 등록 (공급업체 전용)

**Request Body:**
```json
{
  "name": "새 상품명",
  "brand": "브랜드명",
  "model": "모델명",
  "description": "상품 상세 설명",
  "shortDescription": "간단한 설명",
  "categories": ["category_id_1", "category_id_2"],
  "basePrice": 1000000,
  "stockQuantity": 100,
  "minOrderQuantity": 1,
  "maxOrderQuantity": 50,
  "specifications": {
    "키": "값"
  },
  "images": ["image_url_1", "image_url_2"]
}
```

### PUT /products/:id
상품 수정

### DELETE /products/:id
상품 삭제

### PUT /products/:id/approval
상품 승인/반려 (관리자 전용)

**Request Body:**
```json
{
  "status": "approved", // approved | rejected
  "adminNote": "승인 사유 또는 반려 사유"
}
```

## 🛒 주문 API

### GET /orders
주문 목록 조회

**Query Parameters:**
```
?page=1
&limit=20
&status=pending
&buyerId=user_123
&supplierId=supplier_123
&dateFrom=2024-06-01
&dateTo=2024-06-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_123",
        "orderNumber": "ORD-2024-001",
        "buyerId": "user_123",
        "buyerType": "customer",
        "status": "pending",
        "paymentStatus": "pending",
        "shippingStatus": "preparing",
        "items": [
          {
            "id": "item_123",
            "productId": "product_123",
            "productName": "삼성 갤럭시 노트북 15인치",
            "quantity": 2,
            "unitPrice": 1020000,
            "totalPrice": 2040000
          }
        ],
        "subtotalAmount": 2040000,
        "discountAmount": 40800,
        "shippingAmount": 0,
        "totalAmount": 1999200,
        "shippingAddress": {
          "name": "홍길동",
          "phone": "010-1234-5678",
          "address": "서울시 강남구...",
          "zipCode": "12345"
        },
        "orderDate": "2024-06-24T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 50,
      "itemsPerPage": 20
    }
  }
}
```

### GET /orders/:id
주문 상세 조회

### POST /orders
주문 생성

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product_123",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "address": "서울시 강남구 테헤란로 123",
    "addressDetail": "456호",
    "zipCode": "12345"
  },
  "paymentMethod": "card",
  "orderNote": "배송 시 연락 바랍니다"
}
```

### PUT /orders/:id/status
주문 상태 변경

**Request Body:**
```json
{
  "status": "confirmed", // pending | confirmed | processing | shipped | delivered | cancelled
  "note": "상태 변경 사유"
}
```

## 🛍️ 장바구니 API

### GET /cart
장바구니 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "cart_123",
      "userId": "user_123",
      "items": [
        {
          "id": "cart_item_123",
          "productId": "product_123",
          "productName": "삼성 갤럭시 노트북",
          "productImage": "https://example.com/image.jpg",
          "quantity": 2,
          "unitPrice": 1020000,
          "totalPrice": 2040000
        }
      ],
      "subtotalAmount": 2040000,
      "discountAmount": 40800,
      "totalAmount": 1999200,
      "updatedAt": "2024-06-24T10:00:00Z"
    }
  }
}
```

### POST /cart/items
장바구니에 상품 추가

**Request Body:**
```json
{
  "productId": "product_123",
  "quantity": 2
}
```

### PUT /cart/items/:id
장바구니 상품 수량 변경

**Request Body:**
```json
{
  "quantity": 3
}
```

### DELETE /cart/items/:id
장바구니 상품 삭제

### DELETE /cart
장바구니 비우기

## ⭐ 리뷰 API

### GET /reviews
리뷰 목록 조회

**Query Parameters:**
```
?productId=product_123
&userId=user_123
&rating=5
&status=published
&type=purchase
&sortBy=newest
&page=1
&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "review_123",
        "productId": "product_123",
        "productName": "삼성 갤럭시 노트북 15인치",
        "userId": "user_123",
        "userName": "김**",
        "userType": "customer",
        "title": "정말 만족스러운 노트북입니다!",
        "content": "회사 업무용으로 구매했는데...",
        "rating": 5,
        "images": [
          {
            "id": "img_123",
            "url": "https://example.com/review-image.jpg",
            "alt": "리뷰 이미지"
          }
        ],
        "type": "purchase",
        "status": "published",
        "isPurchaseVerified": true,
        "helpfulCount": 24,
        "helpfulUserIds": ["user_456", "user_789"],
        "createdAt": "2024-06-20T14:30:00Z",
        "updatedAt": "2024-06-20T14:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "itemsPerPage": 20
    }
  }
}
```

### GET /reviews/summary/:productId
상품 리뷰 요약 정보

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "productId": "product_123",
      "totalCount": 128,
      "averageRating": 4.2,
      "ratingDistribution": {
        "1": 2,
        "2": 5,
        "3": 15,
        "4": 45,
        "5": 61
      },
      "recommendationRate": 83
    }
  }
}
```

### POST /reviews
리뷰 작성

**Request Body:**
```json
{
  "productId": "product_123",
  "orderId": "order_123",
  "orderItemId": "item_123",
  "title": "리뷰 제목",
  "content": "리뷰 내용",
  "rating": 5,
  "type": "purchase",
  "images": ["image_file_1", "image_file_2"]
}
```

### PUT /reviews/:id
리뷰 수정

### DELETE /reviews/:id
리뷰 삭제

### POST /reviews/:id/helpful
리뷰 도움됨 투표

**Request Body:**
```json
{
  "helpful": true // true: 도움됨, false: 도움되지 않음
}
```

### POST /reviews/:id/report
리뷰 신고

**Request Body:**
```json
{
  "reason": "inappropriate", // spam | inappropriate | fake | offensive | other
  "description": "신고 사유 상세 설명"
}
```

### PUT /reviews/:id/status
리뷰 승인/숨김 (관리자 전용)

**Request Body:**
```json
{
  "status": "published", // published | hidden
  "adminNote": "처리 사유"
}
```

## 📊 통계 API

### GET /admin/stats
관리자 대시보드 통계

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalProducts": 1250,
      "pendingProducts": 23,
      "totalOrders": 8940,
      "totalRevenue": 2340000000,
      "totalUsers": 15670,
      "totalSuppliers": 145,
      "totalRetailers": 890,
      "totalCustomers": 14635,
      "reviewStats": {
        "totalReviews": 5430,
        "pendingReviews": 12,
        "reportedReviews": 3,
        "averageRating": 4.2
      }
    }
  }
}
```

### GET /supplier/stats
공급업체 통계

### GET /retailer/stats
리테일러 통계

## 🗂️ 카테고리 API

### GET /categories
카테고리 목록 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_123",
        "name": "전자제품",
        "slug": "electronics",
        "description": "전자제품 카테고리",
        "parentId": null,
        "children": [
          {
            "id": "cat_124",
            "name": "노트북",
            "slug": "laptops",
            "parentId": "cat_123"
          }
        ],
        "productCount": 450,
        "order": 1,
        "isActive": true
      }
    ]
  }
}
```

## 🔧 에러 응답 형식

### 일반적인 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "요청이 올바르지 않습니다",
    "details": {
      "field": "email",
      "reason": "이메일 형식이 올바르지 않습니다"
    }
  }
}
```

### HTTP 상태 코드
- `200 OK`: 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 필요
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 충돌 (중복 등)
- `422 Unprocessable Entity`: 유효성 검증 실패
- `500 Internal Server Error`: 서버 오류

### 에러 코드 목록
```typescript
enum ErrorCode {
  // 인증 관련
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  
  // 유효성 검증
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',
  
  // 리소스 관련
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  
  // 비즈니스 로직
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  ORDER_ALREADY_PROCESSED = 'ORDER_ALREADY_PROCESSED',
  REVIEW_ALREADY_EXISTS = 'REVIEW_ALREADY_EXISTS',
  
  // 시스템 오류
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

## 🔄 페이지네이션

모든 목록 API는 다음과 같은 페이지네이션을 지원합니다:

**Query Parameters:**
- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 아이템 수 (기본값: 20, 최대: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 200,
    "itemsPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## 🔍 필터링 및 정렬

### 공통 정렬 옵션
- `sortBy`: 정렬 기준 필드
- `sortOrder`: `asc` (오름차순) 또는 `desc` (내림차순)

### 공통 필터 옵션
- `search`: 키워드 검색
- `status`: 상태별 필터
- `dateFrom`, `dateTo`: 날짜 범위 필터
- `userId`, `productId`: 관련 ID 필터

---

이 API 명세서는 O4O 플랫폼의 완전한 백엔드 API 설계를 담고 있으며, 실제 구현 시 참고 문서로 활용할 수 있습니다.