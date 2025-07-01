# 🔌 O4O Platform API 명세서

**API 버전**: v1  
**베이스 URL**: `http://localhost:3001/api`  
**인증 방식**: JWT Bearer Token  
**업데이트**: 2025-06-22  

---

## 📋 **목차**

1. [인증 API](#인증-api)
2. [상품 관리 API](#상품-관리-api)
3. [장바구니 API](#장바구니-api)
4. [주문 관리 API](#주문-관리-api)
5. [공통 응답 형식](#공통-응답-형식)
6. [오류 코드](#오류-코드)

---

## 🔐 **인증 API**

### **헤더 인증**
모든 보호된 엔드포인트는 다음 헤더가 필요합니다:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### **사용자 역할**
```typescript
enum UserRole {
  CUSTOMER = 'customer',    // 일반 고객
  BUSINESS = 'business',    // 사업자 (도매)
  AFFILIATE = 'affiliate',  // 제휴사
  ADMIN = 'admin'          // 관리자
}
```

---

## 🛍️ **상품 관리 API**

### **1. 상품 목록 조회**
```http
GET /api/ecommerce/products
```

**쿼리 파라미터**:
```typescript
{
  page?: number;        // 페이지 번호 (기본값: 1)
  limit?: number;       // 페이지당 항목 수 (기본값: 20)
  category?: string;    // 카테고리 필터
  search?: string;      // 검색어
  minPrice?: number;    // 최소 가격
  maxPrice?: number;    // 최대 가격
  sortBy?: 'name' | 'price' | 'createdAt' | 'rating';
  sortOrder?: 'ASC' | 'DESC';
  isActive?: boolean;   // 활성 상품만
}
```

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

**Product 스키마**:
```typescript
{
  id: string;
  name: string;
  description: string;
  price: number;           // 역할별 가격 (자동 계산)
  retailPrice: number;     // 일반 소비자 가격
  wholesalePrice: number;  // 도매가
  affiliatePrice: number;  // 제휴가
  stockQuantity: number;
  categoryId: string;
  category: Category;
  images: string[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}
```

---

### **2. 추천 상품 조회**
```http
GET /api/ecommerce/products/featured
```

**쿼리 파라미터**:
```typescript
{
  limit?: number;  // 추천 상품 수 (기본값: 10)
}
```

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    featuredProducts: Product[];
  };
}
```

---

### **3. 상품 상세 조회**
```http
GET /api/ecommerce/products/:id
```

**경로 파라미터**:
- `id` (string): 상품 ID

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    product: Product & {
      category: Category;
      relatedProducts: Product[];  // 관련 상품 5개
    };
  };
}
```

---

### **4. 상품 생성** 🔒 *관리자 전용*
```http
POST /api/ecommerce/products
```

**요청 바디**:
```typescript
{
  name: string;
  description: string;
  retailPrice: number;
  wholesalePrice: number;
  affiliatePrice: number;
  stockQuantity: number;
  categoryId: string;
  images: string[];
  isActive?: boolean;
}
```

**응답 (201)**:
```typescript
{
  success: true;
  data: {
    product: Product;
  };
  message: "상품이 성공적으로 생성되었습니다.";
}
```

---

### **5. 상품 수정** 🔒 *관리자 전용*
```http
PUT /api/ecommerce/products/:id
```

**경로 파라미터**:
- `id` (string): 상품 ID

**요청 바디**: (상품 생성과 동일, 모든 필드 선택사항)

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    product: Product;
  };
  message: "상품이 성공적으로 수정되었습니다.";
}
```

---

### **6. 상품 삭제** 🔒 *관리자 전용*
```http
DELETE /api/ecommerce/products/:id
```

**경로 파라미터**:
- `id` (string): 상품 ID

**응답 (200)**:
```typescript
{
  success: true;
  message: "상품이 성공적으로 삭제되었습니다.";
}
```

---

## 🛒 **장바구니 API**

### **1. 장바구니 조회** 🔒 *인증 필요*
```http
GET /api/ecommerce/cart
```

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    cart: {
      id: string;
      userId: string;
      items: CartItem[];
      totalAmount: number;    // 역할별 가격 적용된 총액
      itemCount: number;
      createdAt: string;
      updatedAt: string;
    };
  };
}
```

**CartItem 스키마**:
```typescript
{
  id: string;
  cartId: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;        // 역할별 가격
  subtotal: number;     // quantity * price
  createdAt: string;
}
```

---

### **2. 장바구니에 상품 추가** 🔒 *인증 필요*
```http
POST /api/ecommerce/cart/items
```

**요청 바디**:
```typescript
{
  productId: string;
  quantity: number;
}
```

**응답 (201)**:
```typescript
{
  success: true;
  data: {
    cartItem: CartItem;
    cart: Cart;
  };
  message: "상품이 장바구니에 추가되었습니다.";
}
```

**오류 응답**:
- `400`: 재고 부족
- `404`: 상품을 찾을 수 없음

---

### **3. 장바구니 아이템 수량 수정** 🔒 *인증 필요*
```http
PUT /api/ecommerce/cart/items/:id
```

**경로 파라미터**:
- `id` (string): 장바구니 아이템 ID

**요청 바디**:
```typescript
{
  quantity: number;
}
```

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    cartItem: CartItem;
    cart: Cart;
  };
  message: "장바구니 아이템이 수정되었습니다.";
}
```

---

### **4. 장바구니 아이템 제거** 🔒 *인증 필요*
```http
DELETE /api/ecommerce/cart/items/:id
```

**경로 파라미터**:
- `id` (string): 장바구니 아이템 ID

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    cart: Cart;
  };
  message: "상품이 장바구니에서 제거되었습니다.";
}
```

---

### **5. 장바구니 비우기** 🔒 *인증 필요*
```http
DELETE /api/ecommerce/cart
```

**응답 (200)**:
```typescript
{
  success: true;
  message: "장바구니가 비워졌습니다.";
}
```

---

## 📦 **주문 관리 API**

### **1. 주문 목록 조회** 🔒 *인증 필요*
```http
GET /api/ecommerce/orders
```

**쿼리 파라미터**:
```typescript
{
  page?: number;
  limit?: number;
  status?: OrderStatus;
  sortBy?: 'createdAt' | 'totalAmount';
  sortOrder?: 'ASC' | 'DESC';
}
```

**OrderStatus**:
```typescript
enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}
```

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    orders: Order[];
    pagination: PaginationInfo;
  };
}
```

---

### **2. 주문 상세 조회** 🔒 *인증 필요*
```http
GET /api/ecommerce/orders/:id
```

**경로 파라미터**:
- `id` (string): 주문 ID

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    order: Order & {
      items: OrderItem[];
      user: User;
    };
  };
}
```

**Order 스키마**:
```typescript
{
  id: string;
  userId: string;
  orderNumber: string;    // 주문번호 (자동 생성)
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

**OrderItem 스키마**:
```typescript
{
  id: string;
  orderId: string;
  productId: string;
  productName: string;        // 주문 시점 스냅샷
  productDescription: string; // 주문 시점 스냅샷
  price: number;             // 주문 시점 가격
  quantity: number;
  subtotal: number;
  createdAt: string;
}
```

---

### **3. 주문 생성** 🔒 *인증 필요*
```http
POST /api/ecommerce/orders
```

**요청 바디**:
```typescript
{
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  paymentMethod: string;
  notes?: string;
}
```

**비즈니스 로직**:
1. 장바구니에서 주문 아이템 생성
2. 재고 확인 및 차감
3. 상품 정보 스냅샷 저장
4. 장바구니 비우기
5. 트랜잭션으로 모든 과정 보장

**응답 (201)**:
```typescript
{
  success: true;
  data: {
    order: Order & {
      items: OrderItem[];
    };
  };
  message: "주문이 성공적으로 생성되었습니다.";
}
```

**오류 응답**:
- `400`: 장바구니가 비어있음
- `400`: 재고 부족
- `500`: 트랜잭션 실패

---

### **4. 주문 취소** 🔒 *인증 필요*
```http
PATCH /api/ecommerce/orders/:id/cancel
```

**경로 파라미터**:
- `id` (string): 주문 ID

**비즈니스 로직**:
1. 주문 상태를 CANCELLED로 변경
2. 주문된 상품들의 재고 복구
3. 트랜잭션으로 처리

**응답 (200)**:
```typescript
{
  success: true;
  data: {
    order: Order;
  };
  message: "주문이 성공적으로 취소되었습니다.";
}
```

**오류 응답**:
- `400`: 이미 취소된 주문
- `400`: 취소 불가능한 상태 (배송 완료 등)

---

## 📋 **공통 응답 형식**

### **성공 응답**
```typescript
{
  success: true;
  data?: any;
  message?: string;
}
```

### **오류 응답**
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### **페이지네이션 정보**
```typescript
{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

## ⚠️ **오류 코드**

### **HTTP 상태 코드**
- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 필요
- `403`: 권한 부족
- `404`: 리소스를 찾을 수 없음
- `409`: 충돌 (중복 등)
- `500`: 서버 내부 오류

### **커스텀 오류 코드**
```typescript
{
  // 인증 관련
  'AUTH_REQUIRED': '인증이 필요합니다.',
  'INVALID_TOKEN': '유효하지 않은 토큰입니다.',
  'INSUFFICIENT_PERMISSIONS': '권한이 부족합니다.',
  
  // 상품 관련
  'PRODUCT_NOT_FOUND': '상품을 찾을 수 없습니다.',
  'INSUFFICIENT_STOCK': '재고가 부족합니다.',
  'PRODUCT_INACTIVE': '비활성화된 상품입니다.',
  
  // 장바구니 관련
  'CART_ITEM_NOT_FOUND': '장바구니 아이템을 찾을 수 없습니다.',
  'CART_EMPTY': '장바구니가 비어있습니다.',
  
  // 주문 관련
  'ORDER_NOT_FOUND': '주문을 찾을 수 없습니다.',
  'ORDER_CANNOT_CANCEL': '취소할 수 없는 주문 상태입니다.',
  'INVALID_ORDER_STATUS': '유효하지 않은 주문 상태입니다.',
  
  // 일반 오류
  'VALIDATION_ERROR': '입력값이 유효하지 않습니다.',
  'DATABASE_ERROR': '데이터베이스 오류가 발생했습니다.',
  'TRANSACTION_FAILED': '트랜잭션 처리에 실패했습니다.'
}
```

---

## 🔧 **개발 가이드**

### **테스트 방법**
```bash
# API 서버 시작
npm run dev

# 테스트 데이터 시딩
npm run seed

# API 테스트 (예시)
curl -X GET "http://localhost:3001/api/ecommerce/products" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### **환경 변수**
```env
# 데이터베이스
DATABASE_URL=postgresql://username:password@localhost:5432/o4o_platform
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# 서버
PORT=3001
NODE_ENV=development
```

---

**📅 API 명세서 업데이트**: 2025-06-22  
**🔄 API 버전**: v1  
**📊 구현 상태**: 백엔드 완전 구현 완료  
**🚀 다음 단계**: PostgreSQL 연결 후 프론트엔드 연동
