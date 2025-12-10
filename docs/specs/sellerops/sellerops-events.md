# SellerOps Event Handlers

> 최종 업데이트: 2025-12-10
> dropshipping-core 이벤트 구독 상세

---

## 1. Overview

SellerOps는 dropshipping-core의 이벤트를 구독하여
판매자에게 실시간 알림을 제공한다.

```
dropshipping-core                    SellerOps
      │                                   │
      │──── product.offer.updated ───────→│ 재고 부족 알림
      │──── order.created ───────────────→│ 새 주문 알림
      │──── order.relay.fulfilled ───────→│ 배송 시작 알림
      │──── settlement.closed ───────────→│ 정산 마감 알림
      │                                   │
```

---

## 2. Event Subscriptions

### product.master.updated

상품 마스터 정보 변경 시.

**Payload:**
```typescript
{
  productMasterId: string;
  changes: Record<string, any>;
}
```

**Handler:**
- 해당 상품을 리스팅한 판매자 조회
- 상품 정보 변경 알림 생성

### product.offer.updated

Offer 가격/재고 변경 시.

**Payload:**
```typescript
{
  offerId: string;
  changes: { supplyPrice?: number; stock?: number };
}
```

**Handler:**
```typescript
if (changes.stock < 10) {
  // 해당 Offer 사용 중인 리스팅의 판매자 조회
  const sellers = await findSellersByOffer(offerId);

  for (const seller of sellers) {
    await createNotification(seller.id, {
      type: 'warning',
      title: '재고 부족 알림',
      message: `판매 중인 상품의 재고가 부족합니다. (남은 재고: ${stock})`
    });
  }
}
```

### order.created

새 주문 생성 시.

**Payload:**
```typescript
{
  orderId: string;
  listingId: string;
  quantity: number;
}
```

**Handler:**
- 리스팅 소유 판매자 조회
- 새 주문 알림 생성

### order.relay.dispatched

공급자가 주문 발송 시.

**Payload:**
```typescript
{
  orderId: string;
  supplierOrderId: string;
}
```

### order.relay.fulfilled

배송 완료 시.

**Payload:**
```typescript
{
  orderId: string;
  trackingNumber?: string;
  shippingCarrier?: string;
}
```

**Handler:**
- 판매자에게 배송 시작 알림
- 송장번호 포함

### settlement.closed

정산 마감 시.

**Payload:**
```typescript
{
  batchId: string;
  sellerId: string;
  netAmount: number;
}
```

**Handler:**
- 정산 마감 알림 생성
- 예정 금액 표시

### commission.applied

수수료 적용 시.

**Payload:**
```typescript
{
  transactionId: string;
  orderId: string;
  commissionAmount: number;
}
```

---

## 3. Published Events

### sellerops.supplier.requested

공급자 승인 요청 시.

```typescript
{
  requestId: string;
  sellerId: string;
  supplierId: string;
  requestedAt: Date;
}
```

### sellerops.listing.created

리스팅 생성 시.

```typescript
{
  listingId: string;
  sellerId: string;
  offerId: string;
}
```

### sellerops.listing.activated

리스팅 활성화 시.

```typescript
{
  listingId: string;
  sellerId: string;
}
```

### sellerops.notification.sent

알림 발송 시.

```typescript
{
  notificationId: string;
  sellerId: string;
  type: string;
  title: string;
}
```

---

## 4. Notification Types

| Type | 아이콘 | 용도 |
|------|--------|------|
| `info` | ℹ️ | 일반 정보 |
| `warning` | ⚠️ | 주의 필요 (재고 부족) |
| `success` | ✅ | 완료 (배송 완료) |
| `error` | ❌ | 오류 발생 |

---

## 5. Error Handling

### Retry Policy

| 이벤트 | 재시도 | 최대 횟수 |
|--------|--------|-----------|
| order.created | Yes | 3 |
| settlement.closed | Yes | 3 |
| 기타 | No | - |

### 실패 처리

```typescript
try {
  await createNotification(...);
} catch (error) {
  console.error('[sellerops] Failed to create notification:', error);
  // 알림 실패는 치명적이지 않으므로 throw하지 않음
}
```

---

## Related Documents

- [SellerOps Overview](./sellerops-overview.md)
- [Extension App Guideline](../../app-guidelines/extension-app-guideline.md)
- [PartnerOps Events](../partnerops/partnerops-events.md)

---

*Phase 12-2에서 생성*
