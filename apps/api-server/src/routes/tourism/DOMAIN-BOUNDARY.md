# Tourism Domain Boundary

> **Phase 5-C 확정 (2026-01-11)**

---

## 1. Tourism 정체성

Tourism은 **O4O 표준 매장**입니다.

| 질문 | 답변 |
|------|------|
| O4O 표준 매장인가? | **예** |
| 독립 Commerce인가? | **아니오** |
| E-commerce Core 사용? | **예** |
| OrderType | `TOURISM` |

---

## 2. 소유권 경계

### Tourism이 소유하는 것

| 테이블 | 설명 |
|--------|------|
| tourism_destinations | 관광지/테마 정보 |
| tourism_packages | 관광 패키지 |
| tourism_package_items | 패키지 구성 아이템 |

### Tourism이 소유하지 않는 것

| 데이터 | 소유자 |
|--------|--------|
| 주문 (Order) | E-commerce Core |
| 결제 (Payment) | E-commerce Core |
| 상품 (Product) | Dropshipping |
| 사용자 (User) | Core |

---

## 3. 주문 흐름

```
[Tourism UI]
   ↓ (패키지 선택)
[Tourism Controller]
   ↓ (주문 위임)
[checkoutService.createOrder({
    orderType: OrderType.TOURISM,
    ...
})]
   ↓
checkout_orders (orderType: TOURISM)
```

### 금지 흐름

```
[Tourism Controller]
   ↓ ❌ 직접 저장
tourism_orders ← 이 테이블 생성 금지!
```

---

## 4. Dropshipping 연계

Tourism은 **상품을 소유하지 않습니다**.

| 역할 | 책임 |
|------|------|
| Tourism | 상품을 설명하는 서비스 |
| Dropshipping | 상품을 공급하는 엔진 |
| E-commerce Core | 주문 원장 |

### 상품 참조 규칙

```typescript
// tourism_package_items
@Column({ type: 'uuid', nullable: true })
dropshippingProductId?: string;  // Soft FK (참조만)
```

- FK 제약 설정 금지
- Dropshipping 상품 변경이 Tourism에 영향 주지 않도록

---

## 5. API 경계

### 허용 API

| 엔드포인트 | 설명 |
|------------|------|
| GET /tourism/destinations | 관광지 목록 |
| GET /tourism/packages | 패키지 목록 |
| GET /tourism/packages/:slug | 패키지 상세 |
| POST /tourism/orders | 주문 생성 (Core 위임) |
| GET /tourism/orders | 주문 목록 조회 |

### 금지 API

| 엔드포인트 | 금지 이유 |
|------------|-----------|
| POST /tourism/payments | Core 책임 |
| POST /tourism/users | Core 책임 |
| POST /tourism/products | Dropshipping 책임 |

---

## 6. 위반 시 조치

| 위반 유형 | 조치 |
|-----------|------|
| tourism_orders 테이블 생성 | 즉시 삭제 |
| checkoutService 미사용 | 즉시 수정 |
| Dropshipping 상품 직접 저장 | 즉시 제거 |

---

**Document Version**: 1.0
**Last Updated**: 2026-01-11
**Phase**: 5-C
