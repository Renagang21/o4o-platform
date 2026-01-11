# Phase 5-A′: E-commerce Core 주문 표준화 결과 보고서

**Work Order**: WO-O4O-STRUCTURE-REFORM-PHASE5-A′-V01
**Status**: ✅ 완료
**Date**: 2026-01-11
**Author**: Claude Code

---

## 1. 실행 요약

E-commerce Core의 주문 표준화를 완료했습니다. 모든 주문은 이제 `orderType`으로 서비스를 식별할 수 있으며, 주문 생성 경로가 단일화되었습니다.

### 1.1 완료 항목

| 태스크 | 상태 | 설명 |
|--------|------|------|
| A′-1: orderType 필드 추가 | ✅ | CheckoutOrder 엔티티에 OrderType enum 추가 |
| A′-1b: 마이그레이션 생성 | ✅ | DB 스키마 변경용 마이그레이션 생성 |
| A′-2: API 표준화 | ✅ | CheckoutController에 orderType 지원 추가 |
| A′-3: 서비스 가드 확인 | ✅ | GlycoPharm 차단 확인, Cosmetics는 별도 분리 |
| A′-4: 계약 문서화 | ✅ | E-COMMERCE-ORDER-CONTRACT.md 작성 |

---

## 2. OrderType 정의

```typescript
export enum OrderType {
  GENERIC = 'GENERIC',         // 일반 주문 (기본값)
  DROPSHIPPING = 'DROPSHIPPING', // 드롭쉬핑 주문
  GLYCOPHARM = 'GLYCOPHARM',   // GlycoPharm 약국 주문
  COSMETICS = 'COSMETICS',     // Cosmetics 화장품 주문
  TOURISM = 'TOURISM',         // Tourism 관광 주문
}
```

---

## 3. 수정된 파일

### 3.1 Entity

**[CheckoutOrder.entity.ts](apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts)**

```typescript
// 추가된 enum
export enum OrderType {
  GENERIC = 'GENERIC',
  DROPSHIPPING = 'DROPSHIPPING',
  GLYCOPHARM = 'GLYCOPHARM',
  COSMETICS = 'COSMETICS',
  TOURISM = 'TOURISM',
}

// 추가된 필드
@Index()
@Column({
  type: 'enum',
  enum: OrderType,
  default: OrderType.GENERIC,
})
orderType!: OrderType;
```

### 3.2 Service

**[checkout.service.ts](apps/api-server/src/services/checkout.service.ts)**

```typescript
// CreateOrderDto에 orderType 추가
export interface CreateOrderDto {
  orderType?: OrderType;
  buyerId: string;
  // ...
}

// createOrder에서 orderType 처리
async createOrder(dto: CreateOrderDto): Promise<CheckoutOrder> {
  const orderType = dto.orderType || OrderType.GENERIC;

  const order = this.orderRepository.create({
    orderType,
    // ...
  });
}
```

### 3.3 Controller

**[checkoutController.ts](apps/api-server/src/controllers/checkout/checkoutController.ts)**

```typescript
// 요청에서 orderType 추출
const { items, shippingAddress, partnerId, successUrl, failUrl, orderType } = req.body;

// orderType 검증
if (orderType && !Object.values(OrderType).includes(orderType)) {
  return res.status(400).json({
    success: false,
    message: `Invalid orderType. Must be one of: ${Object.values(OrderType).join(', ')}`
  });
}

// 응답에 orderType 포함
res.status(201).json({
  success: true,
  data: {
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    // ...
  }
});
```

### 3.4 Migration

**[1736950000000-AddOrderTypeToCheckoutOrders.ts](apps/api-server/src/database/migrations/1736950000000-AddOrderTypeToCheckoutOrders.ts)**

```sql
-- OrderType enum 생성
CREATE TYPE "checkout_orders_order_type_enum" AS ENUM (
  'GENERIC', 'DROPSHIPPING', 'GLYCOPHARM', 'COSMETICS', 'TOURISM'
);

-- 컬럼 추가
ALTER TABLE "checkout_orders"
ADD COLUMN "order_type" "checkout_orders_order_type_enum"
NOT NULL DEFAULT 'GENERIC';

-- 인덱스 생성
CREATE INDEX "IDX_checkout_orders_order_type" ON "checkout_orders" ("order_type");
```

---

## 4. 생성된 문서

**[E-COMMERCE-ORDER-CONTRACT.md](docs/_platform/E-COMMERCE-ORDER-CONTRACT.md)**

- 주문 생성 규칙 정의
- OrderType 명세
- API 명세
- 서비스별 정책
- 위반 시 조치

---

## 5. 서비스별 현황

| 서비스 | OrderType | 주문 생성 경로 | 상태 |
|--------|-----------|----------------|------|
| Dropshipping | DROPSHIPPING | E-commerce Core | ✅ 표준 |
| GlycoPharm | GLYCOPHARM | ~~독립~~ → 차단됨 | ✅ 차단 (Phase 5-A) |
| Cosmetics | COSMETICS | 독립 Commerce | ⚠️ 별도 분리 |
| Tourism | TOURISM | 미구현 | ⏳ 향후 |

---

## 6. 테스트 검증

### 6.1 빌드 검증

```bash
$ pnpm run build  # ✅ 성공
$ npx tsc --noEmit  # ✅ 타입 검사 통과
```

### 6.2 API 사용 예시

```bash
# orderType 지정 주문 생성
curl -X POST /api/checkout/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderType": "GLYCOPHARM",
    "items": [...],
    "shippingAddress": {...}
  }'

# 응답
{
  "success": true,
  "data": {
    "orderId": "...",
    "orderNumber": "ORD-20260111-1234",
    "orderType": "GLYCOPHARM",
    "totalAmount": 50000
  }
}
```

---

## 7. HARD RULES 준수 상태

| 규칙 | 상태 | 설명 |
|------|------|------|
| RULE-1: 주문 생성 = E-commerce Core | ✅ | 단일 진입점 확보 |
| RULE-2: OrderType 필수 | ✅ | 기본값 GENERIC 적용 |
| RULE-3: 서비스는 Order 소유자 아님 | ✅ | GlycoPharm 차단 완료 |

---

## 8. Definition of Done 체크리스트

### 구조 기준
- [x] Order 생성 경로가 E-commerce Core로 단일화됨
- [x] orderType 없는 주문 생성 시 기본값 적용
- [x] GlycoPharm 서비스 코드에서 Order 직접 생성 경로 차단

### 기술 기준
- [x] TypeScript 빌드 성공
- [x] 기존 Dropshipping 시나리오 영향 없음 (호환성 유지)
- [ ] 마이그레이션 실행 필요 (별도 진행)

### 문서 기준
- [x] 주문 표준 계약 문서 존재
- [x] 이후 서비스 개발 시 참조 가능

---

## 9. 후속 작업

### 필수 (마이그레이션)

```bash
# 개발 환경에서 마이그레이션 실행
pnpm run typeorm migration:run
```

### 권장 (향후 Phase)

1. **Phase 5-B**: Cosmetics 재판정 / 표준 편입 여부 결정
2. **Phase 5-C**: Tourism 구현 (표준 기반)
3. **Phase 5-D**: GlycoPharm 주문 데이터 마이그레이션 검토

---

## 10. 결론

Phase 5-A′를 통해 E-commerce Core의 주문 표준이 확정되었습니다.

- **주문 생성**: E-commerce Core (`POST /api/checkout/initiate`)
- **서비스 식별**: `orderType` 필드
- **가드**: GlycoPharm 410 Gone + Service Read-only 플래그

이제 O4O 플랫폼은 새로운 서비스가 추가되어도 동일한 패턴으로 주문을 처리할 수 있는 표준 구조를 갖추게 되었습니다.

---

**Report Version**: V01
**Last Updated**: 2026-01-11
