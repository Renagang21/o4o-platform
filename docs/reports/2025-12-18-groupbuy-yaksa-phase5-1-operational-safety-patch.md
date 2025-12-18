# groupbuy-yaksa Phase 5.1 Operational Safety Patch Report

**Work Order ID**: `WO-GROUPBUY-YAKSA-PHASE5-1-OPERATIONAL-SAFETY-PATCH`
**Date**: 2025-12-18
**Status**: Completed

---

## 1. Executive Summary

Phase 5.1 Operational Safety Patch가 완료되었습니다.
- Race Condition 방지 (SELECT FOR UPDATE)
- Cross-Org Access 이중 검증
- Zombie Status 제거 (취소 후 상태 재계산)
- 입력 값 검증 (quantity >= 1)
- 상태 기반 작업 차단

---

## 2. Implementation Summary

### 2.1 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `services/GroupbuyOrderService.ts` | Race Condition 방지, 이중 검증, Zombie Status 제거 |
| `services/index.ts` | `GroupbuyOrderError` export 추가 |
| `routes/groupbuy.routes.ts` | `userOrganizationId` 전달, 에러 코드 기반 응답 |

---

## 3. 구현 상세

### 3.1 Race Condition 방지

**구현 방식**: TypeORM `pessimistic_write` Lock (SELECT FOR UPDATE)

```typescript
const product = await txProductRepo
  .createQueryBuilder('product')
  .setLock('pessimistic_write')
  .leftJoinAndSelect('product.campaign', 'campaign')
  .where('product.id = :id', { id: dto.campaignProductId })
  .getOne();
```

**적용 위치**:
- `createOrder`: 상품 Row Lock
- `cancelOrder`: 주문 Row Lock
- `confirmOrder`: 주문 + 상품 Row Lock
- `cancelConfirmedOrder`: 주문 + 상품 Row Lock

**Atomic Update** (조건부 업데이트로 동시성 보호):
```typescript
const productUpdateResult = await txProductRepo
  .createQueryBuilder()
  .update()
  .set({ orderedQuantity: () => `"orderedQuantity" + ${quantityDelta}` })
  .where('id = :id', { id: dto.campaignProductId })
  .andWhere(
    product.maxTotalQuantity
      ? `"orderedQuantity" + ${quantityDelta} <= ${product.maxTotalQuantity}`
      : '1=1'
  )
  .execute();
```

### 3.2 Cross-Org Access 이중 검증

**구현 위치**: Service 레벨

```typescript
// createOrder
if (dto.userOrganizationId && dto.userOrganizationId !== campaign.organizationId) {
  const error = new Error(`타 조직의 캠페인에는 참여할 수 없습니다`);
  (error as any).code = GroupbuyOrderError.ORG_ACCESS_DENIED;
  throw error;
}

// cancelOrder, confirmOrder
if (userOrganizationId && order.campaign) {
  if (userOrganizationId !== order.campaign.organizationId) {
    const error = new Error(`타 조직의 주문을 취소/확정할 수 없습니다`);
    (error as any).code = GroupbuyOrderError.ORG_ACCESS_DENIED;
    throw error;
  }
}
```

**라우트 연동**:
```typescript
// POST /orders
const userOrganizationId = authReq.groupbuyContext?.primaryOrganizationId;
await orderService.createOrder({ ...dto, userOrganizationId });

// POST /orders/:id/cancel
await orderService.cancelOrder(id, userOrganizationId);

// POST /orders/:id/confirm
await orderService.confirmOrder(id, dropshippingOrderId, userOrganizationId);
```

### 3.3 Zombie Status 제거

**구현**: `cancelConfirmedOrder`에서 완전한 상태 재계산

```typescript
// threshold_met에서 취소로 인해 미달이 된 경우
if (
  product.status === 'threshold_met' &&
  newConfirmedQuantity < product.minTotalQuantity
) {
  // closed가 아니면 active로 복귀
  if (order.campaign?.status !== 'closed') {
    await txProductRepo.update(order.campaignProductId, {
      status: 'active',
    });
  }
}
```

### 3.4 입력 값 검증

```typescript
// 수량 검증 (최우선)
if (!dto.quantity || dto.quantity < 1) {
  const error = new Error(`주문 수량은 1 이상이어야 합니다`);
  (error as any).code = GroupbuyOrderError.INVALID_QUANTITY;
  throw error;
}
```

### 3.5 상태 기반 작업 차단

| 작업 | 차단 조건 |
|------|----------|
| `createOrder` | campaign: closed/completed/cancelled, product: closed |
| `cancelOrder` | order: cancelled/confirmed, campaign: closed/completed |
| `confirmOrder` | order: !pending |
| `cancelConfirmedOrder` | order: !confirmed, campaign: completed |

---

## 4. 에러 코드 체계

| 코드 | 설명 | HTTP Status |
|------|------|-------------|
| `GB-E001` | 상품 없음 | 404 |
| `GB-E002` | 캠페인 없음 | 404 |
| `GB-E003` | 캠페인 비활성 | 409 |
| `GB-E004` | 상품 마감 | 409 |
| `GB-E005` | 주문 시작 전 | 409 |
| `GB-E006` | 주문 기간 종료 | 409 |
| `GB-E007` | 최대 수량 초과 | 409 |
| `GB-E008` | 유효하지 않은 수량 | 400 |
| `GB-E009` | 주문 없음 | 404 |
| `GB-E010` | 유효하지 않은 주문 상태 | 409 |
| `GB-E011` | 중복 주문 | 400 |
| `GB-E012` | 캠페인 마감 | 409 |
| `GB-E013` | 캠페인 완료 | 409 |
| `GB-E014` | 캠페인 취소 | 409 |
| `GB-AUTH-003` | 조직 접근 거부 | 403 |
| `GB-AUTH-004` | 약국 불일치 | 403 |

---

## 5. 테스트 시나리오

### 5.1 Race Condition 방지

| 시나리오 | 기대 결과 |
|---------|----------|
| 동시에 2명이 남은 1개 상품 주문 | 1명만 성공, 1명은 `GB-E007` |
| 동시에 주문/취소 실행 | Row Lock으로 순차 처리 |

### 5.2 Cross-Org Access

| 시나리오 | 기대 결과 |
|---------|----------|
| 타 조직 캠페인에 주문 | 403 `GB-AUTH-003` |
| 타 조직 주문 취소 | 403 `GB-AUTH-003` |

### 5.3 상태 기반 차단

| 시나리오 | 기대 결과 |
|---------|----------|
| 마감된 캠페인에 주문 | 409 `GB-E012` |
| 완료된 캠페인 확정 주문 취소 | 409 `GB-E013` |
| 이미 취소된 주문 취소 | 409 `GB-E010` |

---

## 6. Definition of Done 체크리스트

| 항목 | 상태 |
|------|------|
| SELECT FOR UPDATE 적용 | ✅ |
| 조직 스코프 이중 검증 | ✅ |
| Zombie Status 제거 | ✅ |
| 입력 값 검증 | ✅ |
| 상태 불가 작업 차단 | ✅ |
| 에러 코드 기반 응답 | ✅ |
| 빌드 정상 통과 | ✅ |

---

## 7. 비고

- **제한 사항**: 신규 기능 없음, UI 변경 없음, 스키마 변경 없음
- **호환성**: 기존 API 호환 유지 (추가 파라미터는 optional)
- **배포**: develop 브랜치 머지 후 dev 환경 테스트 권장

---

**Phase 5.1 상태**: ✅ **Completed**

---

*Generated: 2025-12-18*
*Author: Claude Code*
