# PartnerOps Event Handlers

> 최종 업데이트: 2025-12-10
> 이벤트 기반 확장 패턴 상세

---

## 1. Overview

PartnerOps는 dropshipping-core의 이벤트를 구독하여
파트너 전환 및 정산 상태를 동기화한다.

```
dropshipping-core                    PartnerOps
      │                                   │
      │──── order.created ───────────────→│ recordConversion()
      │                                   │
      │──── commission.applied ──────────→│ updateStatus('approved')
      │                                   │
      │──── settlement.closed ───────────→│ updateStatus('paid')
      │                                   │
```

---

## 2. Event Subscriptions

### order.created

주문 생성 시 파트너 귀속 여부 확인 및 전환 기록.

**Payload:**
```typescript
{
  orderId: string;
  orderAmount: number;
  referralCode?: string;
  partnerId?: string;
  linkId?: string;
  clickId?: string;
}
```

**Handler Logic:**
1. `referralCode` 또는 `partnerId`로 파트너 식별
2. 커미션율 조회 (partnerops_settings)
3. 전환 기록 생성 (status: 'pending')
4. 링크/클릭 통계 업데이트

### commission.applied

커미션 승인 시 전환 상태 업데이트.

**Payload:**
```typescript
{
  orderId: string;
  commissionId: string;
  status: string;
}
```

**Handler Logic:**
1. orderId로 전환 레코드 조회
2. status를 'approved'로 변경

### settlement.closed

정산 완료 시 전환 상태를 지급 완료로 변경.

**Payload:**
```typescript
{
  settlementId: string;
  orderIds: string[];
}
```

**Handler Logic:**
1. orderIds 배열의 모든 전환 조회
2. status를 'paid'로 일괄 변경

---

## 3. Event Publications

PartnerOps가 발행하는 이벤트.

### partner.registered

```typescript
{
  partnerId: string;
  userId: string;
  partnerCode: string;
  tenantId: string;
}
```

### partner.approved

```typescript
{
  partnerId: string;
  approvedBy: string;
  approvedAt: Date;
}
```

### partner.link.clicked

```typescript
{
  linkId: string;
  partnerId: string;
  clickId: string;
  visitorId: string;
  referer: string;
}
```

### partner.conversion.recorded

```typescript
{
  conversionId: string;
  partnerId: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
}
```

---

## 4. Error Handling

### Retry Policy

| 이벤트 | 재시도 | 최대 횟수 |
|--------|--------|-----------|
| order.created | Yes | 3 |
| commission.applied | Yes | 3 |
| settlement.closed | Yes | 3 |

### Fallback

이벤트 처리 실패 시:
1. 에러 로깅
2. Dead Letter Queue 전송 (향후)
3. 수동 재처리 대기

---

## 5. Testing

### Event Simulation

```typescript
// order.created 테스트
await handleOrderCreated(context, {
  orderId: 'test-order-1',
  orderAmount: 100000,
  referralCode: 'PARTNER123'
});

// 전환 확인
const conversion = await db.query(
  `SELECT * FROM partnerops_conversions WHERE order_id = $1`,
  ['test-order-1']
);
expect(conversion[0].status).toBe('pending');
```

---

## Related Documents

- [PartnerOps Overview](./partnerops-overview.md)
- [Extension App Guideline](../../app-guidelines/extension-app-guideline.md)
- [Lifecycle Hooks](../../specs/organization/lifecycle-hooks.md)

---

*Phase 12-1에서 생성*
