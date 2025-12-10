# Tourist Order Flow Specification

> 최종 업데이트: 2025-12-10
> 개인/단체 주문 및 픽업 플로우

---

## 1. Personal Traveler Flow

### 주문 플로우

```
1. 상품 탐색 (ProductBrowseView)
         ↓
2. 장바구니 추가 (CartView)
         ↓
3. 주문 생성 (OrderView)
   - 결제 방식 선택
   - 픽업 위치 선택
         ↓
4. 결제 완료
   - SellerOps Order 생성
   - 픽업 코드 발급
         ↓
5. 픽업 (PickupView)
   - 픽업 코드 확인
   - 상품 수령
```

### API Endpoints (Personal)

| Method | Path | 설명 |
|--------|------|------|
| GET | /tourist/products | 상품 목록 |
| POST | /tourist/cart | 장바구니 추가 |
| POST | /tourist/orders | 주문 생성 |
| GET | /tourist/orders/:id | 주문 상세 |
| POST | /tourist/orders/:id/pay | 결제 |
| GET | /tourist/pickups/:code | 픽업 코드 확인 |

---

## 2. Group Tour Flow

### 가이드 플로우

```
1. 그룹 생성 (GroupManageView)
   - 그룹명, 픽업 위치/시간 설정
         ↓
2. 멤버 초대/등록
   - QR 코드 또는 그룹 코드 공유
         ↓
3. 주문 취합 (GroupOrderView)
   - 멤버별 주문 현황 모니터링
   - 일괄 주문 마감
         ↓
4. 단체 결제
   - 가이드 일괄 결제 또는 개별 결제
         ↓
5. 단체 픽업 (GroupPickupView)
   - 멤버별 상품 준비 상태 확인
   - 일괄 픽업 처리
         ↓
6. 수수료 정산 (CommissionView)
   - 가이드 수수료 계산/지급
```

### API Endpoints (Group)

| Method | Path | 설명 |
|--------|------|------|
| POST | /tourist/groups | 그룹 생성 |
| GET | /tourist/groups/:id | 그룹 상세 |
| POST | /tourist/groups/:id/members | 멤버 추가 |
| GET | /tourist/groups/:id/orders | 그룹 주문 현황 |
| POST | /tourist/groups/:id/close | 주문 마감 |
| POST | /tourist/groups/:id/pickup | 단체 픽업 처리 |

---

## 3. Order Status

### TouristOrderStatus (enum)

| 상태 | 설명 |
|------|------|
| `pending` | 주문 대기 |
| `paid` | 결제 완료 |
| `preparing` | 상품 준비 중 |
| `ready` | 픽업 준비 완료 |
| `picked_up` | 픽업 완료 |
| `cancelled` | 취소됨 |

### PickupStatus (enum)

| 상태 | 설명 |
|------|------|
| `pending` | 대기 |
| `ready` | 준비 완료 |
| `picked_up` | 수령 완료 |

---

## 4. Pickup Code System

### 코드 생성 규칙

```typescript
// 6자리 영숫자 코드
function generatePickupCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
  // 예: "A3K9X2"
}
```

### 픽업 확인 플로우

```
1. 고객이 픽업 코드 제시 (또는 QR 스캔)
2. 직원이 코드 입력/스캔
3. 시스템에서 주문 확인
4. 상품 전달 및 픽업 완료 처리
```

---

## 5. SellerOps Integration

### 주문 매핑

Tourist 주문은 내부적으로 SellerOps Order로 변환된다.

```typescript
// Tourist Order → SellerOps Order
interface TouristOrderMapping {
  touristOrderId: string;
  selleropsOrderId: string;
  touristType: 'personal' | 'group_member';
  groupId?: string;
  pickupCode: string;
}
```

### 주문 생성 시

```typescript
async function createTouristOrder(dto: CreateTouristOrderDto) {
  // 1. SellerOps Order 생성
  const sellerOrder = await sellerOpsService.createOrder({
    items: dto.items,
    sellerId: dto.sellerId,
  });

  // 2. Tourist Pickup 생성
  const pickup = await this.pickupRepo.save({
    orderId: sellerOrder.id,
    groupId: dto.groupId,
    touristType: dto.touristType,
    pickupCode: generatePickupCode(),
    pickupStatus: 'pending',
  });

  return { order: sellerOrder, pickup };
}
```

---

## 6. Group Commission

### 가이드 수수료 계산

```typescript
interface GuideCommission {
  guideId: string;
  groupId: string;
  totalSales: number;       // 그룹 총 매출
  commissionRate: number;   // 수수료율 (예: 5%)
  commissionAmount: number; // 수수료 금액
  status: 'pending' | 'approved' | 'paid';
}
```

### 정산 플로우

```
그룹 픽업 완료 → 수수료 계산 → 정산 배치에 포함 → 지급
```

---

## Related Documents

- [Tourist Overview](./tourist-overview.md)
- [Storefront Integration](./tourist-storefront.md)
- [SellerOps Settlement](../sellerops/sellerops-settlement.md)

---

*Phase 12-4에서 생성*
