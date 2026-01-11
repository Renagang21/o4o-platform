# Phase 5-B′: Cosmetics E-commerce Core 주문 위임 결과 보고서

**Work Order**: WO-O4O-STRUCTURE-REFORM-PHASE5-B′-V01
**Status**: ✅ 완료
**Date**: 2026-01-11
**Author**: Claude Code

---

## 1. 실행 요약

Cosmetics 서비스의 주문 생성을 E-commerce Core로 위임하는 작업을 완료했습니다.

### 1.1 완료 항목

| 태스크 | 상태 | 설명 |
|--------|------|------|
| B′-1: 주문 API 구현 전환 | ✅ | Mock → checkoutService.createOrder() |
| B′-2: 입력 DTO 정합성 확인 | ✅ | ShippingAddress 호환성 검증 |
| B′-3: 응답 계약 통일 | ✅ | 기존 API 응답 형식 유지 |
| TypeScript 빌드 검증 | ✅ | `tsc --noEmit` 성공 |

---

## 2. 변경 내용

### 2.1 수정된 파일

**[cosmetics-order.controller.ts](apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts)**

#### Import 추가

```typescript
import { checkoutService, type OrderItem } from '../../../services/checkout.service.js';
import { OrderType } from '../../../entities/checkout/CheckoutOrder.entity.js';
```

#### Mock 응답 → E-commerce Core 호출

**변경 전 (Mock)**:
```typescript
const orderResponse = {
  id: `order-${Date.now()}`, // 임시 ID
  orderNumber,
  orderType: 'retail',
  // ...
};
res.status(201).json({ data: orderResponse });
```

**변경 후 (E-commerce Core)**:
```typescript
// E-commerce Core CreateOrderDto 형식으로 변환
const orderItems: OrderItem[] = dto.items.map((item) => ({
  productId: item.productId,
  productName: item.productName,
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  subtotal: item.quantity * item.unitPrice - (item.discount || 0),
}));

// E-commerce Core를 통해 주문 생성
const order = await checkoutService.createOrder({
  orderType: OrderType.COSMETICS,
  buyerId,
  sellerId: dto.sellerId,
  supplierId: dto.sellerId,
  items: orderItems,
  shippingAddress: dto.shippingAddress ? { ... } : undefined,
  metadata: {
    ...dto.metadata,
    originalItems: dto.items, // Cosmetics 원본 정보 보존
  },
});
```

---

## 3. DTO 매핑

### 3.1 입력 매핑 (Cosmetics → E-commerce Core)

| Cosmetics DTO | E-commerce Core DTO | 비고 |
|---------------|---------------------|------|
| buyerId (from auth) | buyerId | JWT에서 추출 |
| sellerId | sellerId | 그대로 전달 |
| sellerId | supplierId | Cosmetics는 seller=supplier |
| items[].productId | items[].productId | 그대로 전달 |
| items[].productName | items[].productName | 그대로 전달 |
| items[].quantity | items[].quantity | 그대로 전달 |
| items[].unitPrice | items[].unitPrice | 그대로 전달 |
| items[].discount | (subtotal 계산에 반영) | 별도 필드 없음 |
| shippingAddress | shippingAddress | 동일 구조 |
| metadata | metadata | 원본 items 포함 |

### 3.2 출력 매핑 (E-commerce Core → Cosmetics Response)

| CheckoutOrder | Cosmetics Response | 비고 |
|---------------|-------------------|------|
| id | id | UUID |
| orderNumber | orderNumber | ORD-YYYYMMDD-XXXX |
| orderType | orderType | 'COSMETICS' |
| buyerId | buyerId | 그대로 |
| sellerId | sellerId | 그대로 |
| status | status | 'created' |
| paymentStatus | paymentStatus | 'pending' |
| subtotal | subtotal | 계산된 값 |
| shippingFee | shippingFee | 기본 0 |
| discount | discount | 기본 0 |
| totalAmount | totalAmount | 계산된 값 |
| createdAt | createdAt | Date 객체 |

---

## 4. 데이터 흐름

### 4.1 주문 생성 흐름 (Phase 5-B′ 이후)

```
POST /api/cosmetics/orders
        │
        ▼
cosmetics-order.controller.ts
        │
        ├─ 1. Authentication (requireAuth)
        ├─ 2. express-validator 검증
        ├─ 3. Channel metadata 검증
        │
        ▼
checkoutService.createOrder({
  orderType: OrderType.COSMETICS,
  buyerId, sellerId, supplierId,
  items, shippingAddress, metadata
})
        │
        ▼
checkout_orders 테이블 INSERT
        │
        ▼
응답 형식 변환 (기존 API 호환성)
        │
        ▼
HTTP 201 { data: orderResponse }
```

### 4.2 저장 위치

| 데이터 | 저장 위치 | 비고 |
|--------|----------|------|
| 주문 기본 정보 | checkout_orders | E-commerce Core |
| orderType | checkout_orders.order_type | 'COSMETICS' |
| Cosmetics metadata | checkout_orders.metadata | channel, travel/local 정보 |
| 원본 아이템 정보 | checkout_orders.metadata.originalItems | productSnapshot 포함 |

---

## 5. 기존 API 호환성

### 5.1 유지된 항목

| 항목 | 상태 |
|------|------|
| POST /api/cosmetics/orders | ✅ 유지 |
| Request Body 구조 | ✅ 유지 |
| Response 구조 | ✅ 유지 |
| Channel 검증 (local/travel) | ✅ 유지 |
| TaxRefund 검증 | ✅ 유지 |

### 5.2 변경된 항목

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| ID 형식 | `order-{timestamp}` | UUID |
| orderNumber 형식 | `COS-YYYYMMDD-XXXX` | `ORD-YYYYMMDD-XXXX` |
| 데이터 저장 | 없음 (Mock) | checkout_orders 테이블 |
| orderType 값 | 'retail' | 'COSMETICS' |

---

## 6. Definition of Done 체크리스트

### 구조 기준
- [x] Cosmetics 주문 생성이 E-commerce Core를 통해 처리됨
- [x] OrderType.COSMETICS가 올바르게 설정됨
- [x] checkout_orders 테이블에 주문 저장됨

### 기술 기준
- [x] TypeScript 빌드 성공
- [x] 기존 API 응답 형식 호환성 유지
- [x] ShippingAddress 타입 호환

### 문서 기준
- [x] 변경 내용 문서화
- [x] DTO 매핑 명세

---

## 7. 통합 현황 (Phase 5 전체)

| 서비스 | Phase | OrderType | 주문 생성 | 상태 |
|--------|-------|-----------|----------|------|
| Dropshipping | - | DROPSHIPPING | E-commerce Core | ✅ 표준 |
| GlycoPharm | 5-A | GLYCOPHARM | ~~독립~~ → 410 Gone | ✅ 차단 |
| Cosmetics | 5-B′ | COSMETICS | ~~Mock~~ → E-commerce Core | ✅ 통합 완료 |
| Tourism | - | TOURISM | 미구현 | ⏳ 향후 |

---

## 8. 관련 문서

- [COSMETICS-ORDER-POSITIONING.md](docs/_platform/COSMETICS-ORDER-POSITIONING.md) - Phase 5-B 결정 문서
- [E-COMMERCE-ORDER-CONTRACT.md](docs/_platform/E-COMMERCE-ORDER-CONTRACT.md) - 주문 표준 계약
- [PHASE5-AP-ECOMMERCE-CORE-STANDARDIZATION-V01.md](docs/reports/PHASE5-AP-ECOMMERCE-CORE-STANDARDIZATION-V01.md) - Phase 5-A′ 결과
- CLAUDE.md §7 - E-commerce Core 절대 규칙
- CLAUDE.md §11.6 - Cosmetics 주문 처리 원칙

---

**Report Version**: V01
**Last Updated**: 2026-01-11
