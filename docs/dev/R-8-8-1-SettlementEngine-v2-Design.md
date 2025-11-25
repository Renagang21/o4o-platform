# 📘 R-8-8-1: SettlementEngine v2 구조 설계서 (Draft v1)

**작성일:** 2025-11-24
**작성자:** Development Team
**대상 시스템:** O4O Platform – Dropshipping Settlement
**관련 태스크:** R-8-3 ~ R-8-7 (OrderItem/정산 기반 작업)
**상태:** 📝 Draft - Review Required

---

## 1. 개요 (Overview)

SettlementEngine v2는 **드랍쉬핑 환경에서 발생하는 모든 주문 흐름을 기반으로
판매자(Seller), 공급자(Supplier), 플랫폼(Platform), 파트너(Partner)** 간의 정산(Settlement)을 자동으로 계산·생성·조회하는 핵심 엔진입니다.

R-8-3 ~ R-8-7까지 작업을 통해:

- 주문은 **Order + OrderItem** 관계형 구조로 정비되었고
- Dashboard & Settlement 조회는 **성능 최적화 + 캐싱**까지 적용된 상태입니다.

이제 SettlementEngine v2에서는 다음을 목표로 합니다.

---

## 2. 목표 (Goals)

### 2.1 OrderItem 기반 단일 정산 흐름 확립

- JSONB/레거시 구조 완전 제거
- OrderItem → SettlementItem → Settlement → Payout까지 일관된 파이프라인

### 2.2 역할별 정산 규칙 명확화

- Seller, Supplier, Platform, Partner 각각의 수익/수수료 규칙을 엔진 레벨에서 통일적으로 처리

### 2.3 이벤트 기반(이벤트 드리븐) 정산 구조

- 주문 완료, 반품, 환불, 정책 변경 등의 이벤트에 따른 정산 재계산·추가·보정

### 2.4 확장 가능한 정책 구조

- CommissionPolicy 및 향후 "앱 마켓 수수료", "프로모션 수수료"까지 포함 가능한 구조

### 2.5 운영/감사(Audit) 용이

- Settlement 및 SettlementItem에 모든 정책·계산 근거를 기록하여
  나중에 "왜 이 금액이 나왔는지"를 추적할 수 있도록 설계

---

## 3. 도메인 모델 (Domain Model)

### 3.1 핵심 엔티티

#### 1. Order
**현재 위치:** `apps/api-server/src/entities/Order.ts`

기본 주문 정보 (buyer, orderDate, status 등)

**주요 필드:**
- id, orderNumber
- buyerId, buyerName, buyerEmail
- status (OrderStatus enum)
- paymentStatus (PaymentStatus enum)
- orderDate, confirmedDate, shippingDate, deliveryDate
- summary (OrderSummary: subtotal, shipping, tax, total)

---

#### 2. OrderItem
**현재 위치:** `apps/api-server/src/entities/OrderItem.ts`

주문 라인 아이템

**주요 필드:**
- orderId
- sellerId, supplierId
- productId, sellerProductId
- quantity, unitPrice, totalPrice
- **commissionType, commissionRate, commissionAmount** (PD-2에서 추가됨)
- basePriceSnapshot, salePriceSnapshot, marginAmountSnapshot
- productImage, productBrand, variationName (R-8-4/8-5에서 추가됨)

**R-8-6 완료:** Order.items JSONB 필드 완전 제거, OrderItem 엔티티가 SSOT

---

#### 3. CommissionPolicy
**현재 위치:** `apps/api-server/src/entities/CommissionPolicy.ts` (예정)
**현재 상태:** 미구현 (현재는 Product.commissionRate 필드로 대체)

어떤 조건에서 어떤 커미션/수수료 룰을 적용할지에 대한 정책 정의

**예상 필드:**
```typescript
{
  id: string;
  name: string;
  partyType: 'seller' | 'supplier' | 'platform' | 'partner';

  // 조건
  conditionType: 'default' | 'product' | 'category' | 'seller' | 'supplier' | 'tier';
  conditionValue?: string; // productId, categoryId, sellerId 등

  // 수수료 계산 방식
  calculationType: 'percentage' | 'fixed' | 'tiered';
  baseRate?: number; // percentage인 경우 (예: 5%)
  fixedAmount?: number; // fixed인 경우
  tieredRates?: {
    minAmount: number;
    maxAmount: number;
    rate: number;
  }[];

  // 분배 규칙
  platformShare?: number; // 플랫폼 몫 (%)
  sellerShare?: number;   // 판매자 몫 (%)
  partnerShare?: number;  // 파트너 몫 (%)

  // 유효기간
  effectiveFrom: Date;
  effectiveTo?: Date;

  isActive: boolean;
}
```

**현재 구현 상태:**
- Product 엔티티에 `commissionRate` 필드 존재
- CommissionCalculator가 Product.commissionRate 사용
- 복잡한 정책은 미구현 상태

---

#### 4. Settlement
**현재 위치:** `apps/api-server/src/entities/Settlement.ts`

특정 Party(정산 대상자)에게 지급/정산해야 할 금액의 집계 단위

**주요 필드:**
```typescript
{
  id: string;
  partyType: 'seller' | 'supplier' | 'platform';
  partyId: string;

  periodStart: Date;
  periodEnd: Date;

  // 금액 (string으로 저장 - 정밀도 보장)
  totalSaleAmount: string;
  totalBaseAmount: string;
  totalCommissionAmount: string;
  totalMarginAmount: string;
  payableAmount: string;

  status: SettlementStatus; // PENDING, PROCESSING, PAID, CANCELLED

  paidAt?: Date;
  notes?: string;
  memo?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

**현재 구현 상태:** ✅ 완전 구현됨 (Phase PD-5)

---

#### 5. SettlementItem
**현재 위치:** `apps/api-server/src/entities/SettlementItem.ts`

Settlement의 구성 요소, 개별 OrderItem 수준의 정산 레코드

**주요 필드:**
```typescript
{
  id: string;
  settlementId: string;
  orderId: string;
  orderItemId: string;

  productName: string;
  quantity: number;

  // 가격 스냅샷 (string으로 저장)
  salePriceSnapshot: string;
  basePriceSnapshot: string;
  commissionAmountSnapshot: string;
  marginAmountSnapshot: string;

  totalSaleAmount: string;
  totalBaseAmount: string;

  sellerId?: string;
  supplierId?: string;

  // Phase SETTLE-1: 커미션 정책 정보 추가
  commissionType?: string;
  commissionRate?: string;

  createdAt: Date;
}
```

**현재 구현 상태:** ✅ 완전 구현됨 (Phase PD-5 + SETTLE-1)

**v2에서 추가 필요 필드:**
```typescript
{
  // v2 추가 예정
  partyType: 'seller' | 'supplier' | 'platform' | 'partner';
  partyId: string;
  policyId?: string; // CommissionPolicy.id
  reasonCode: 'default_commission' | 'refund' | 'adjustment' | 'partner_commission';
  grossAmount: string; // 원금
  netAmount: string;   // 순액
  metadata?: Record<string, any>; // 확장 가능한 메타데이터
}
```

---

## 4. SettlementEngine v2 구조 (High-Level Architecture)

### 4.1 레이어 구조

```
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │           SettlementEngine (Facade)              │  │
│  │  - runOnOrderCompleted()                         │  │
│  │  - runDailySettlement()                          │  │
│  │  - runOnRefund()                                 │  │
│  │  - recalculateSettlement()                       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Domain Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Settlement       │  │  Commission      │            │
│  │ Calculator       │  │  Calculator      │            │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Policy           │  │  Settlement      │            │
│  │ Resolver         │  │  Aggregator      │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Layer                      │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Settlement       │  │  OrderItem       │            │
│  │ Repository       │  │  Repository      │            │
│  └──────────────────┘  └──────────────────┘            │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ CommissionPolicy │  │  Cache           │            │
│  │ Repository       │  │  Service         │            │
│  └──────────────────┘  └──────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 주요 컴포넌트 설계

### 5.1 SettlementEngine (Facade / Orchestrator)

**파일 위치:** `apps/api-server/src/services/settlement-engine/SettlementEngine.ts` (예정)

```typescript
class SettlementEngine {
  constructor(
    private readonly settlementCalculator: SettlementCalculator,
    private readonly settlementRepository: SettlementRepository,
    private readonly settlementItemRepository: SettlementItemRepository,
    private readonly orderRepository: OrderRepository,
    private readonly cacheInvalidation: CacheInvalidationService,
    private readonly logger: Logger,
  ) {}

  /**
   * 주문 완료 시 정산 생성
   * OrderService에서 호출됨
   */
  async runOnOrderCompleted(orderId: string): Promise<void> {
    // 1. Order + OrderItem 조회
    // 2. 각 OrderItem에 대해 SettlementItem 생성
    // 3. Party별로 Settlement에 aggregate
    // 4. 캐시 무효화
  }

  /**
   * 일일 정산 배치
   * Cron job에서 호출됨
   */
  async runDailySettlement(date: Date): Promise<void> {
    // 1. 기간 내 완료 주문 조회
    // 2. 미정산 항목 계산
    // 3. Settlement 상태 업데이트
  }

  /**
   * 환불 처리
   * OrderService.requestRefund()에서 호출됨
   */
  async runOnRefund(orderId: string): Promise<void> {
    // 1. 기존 SettlementItem 조회
    // 2. 반대 방향 SettlementItem 생성 (음수)
    // 3. Settlement 재집계
  }

  /**
   * 정산 재계산 (관리자 기능)
   */
  async recalculateSettlement(settlementId: string): Promise<void> {
    // 1. Settlement + SettlementItem 조회
    // 2. 재계산
    // 3. 업데이트
  }
}
```

**역할:**
- 외부(Service, Controller)에서 요청을 받는 진입점
- 내부에서 필요한 Calculator/Repository를 호출하여 정산 처리
- OrderEvent와 자연스럽게 연결 (향후 EventBus 도입 시 확장 가능)

---

### 5.2 SettlementCalculator

**파일 위치:** `apps/api-server/src/services/settlement-engine/SettlementCalculator.ts` (예정)

```typescript
class SettlementCalculator {
  constructor(
    private readonly commissionCalculator: CommissionCalculator,
    private readonly policyResolver: PolicyResolver,
  ) {}

  /**
   * 특정 주문에 대한 SettlementItem 생성
   */
  async calculateForOrder(
    order: Order,
    items: OrderItem[]
  ): Promise<SettlementItem[]> {
    const settlementItems: SettlementItem[] = [];

    for (const item of items) {
      // Seller Settlement
      if (item.sellerId) {
        const sellerPolicy = await this.policyResolver.resolveForItem(item, {
          partyType: 'seller',
          partyId: item.sellerId,
        });

        const sellerSettlement = await this.commissionCalculator.calculateCommission(
          item,
          sellerPolicy
        );

        settlementItems.push(
          this.createSettlementItem(item, 'seller', item.sellerId, sellerSettlement)
        );
      }

      // Supplier Settlement
      if (item.supplierId) {
        const supplierPolicy = await this.policyResolver.resolveForItem(item, {
          partyType: 'supplier',
          partyId: item.supplierId,
        });

        const supplierSettlement = await this.commissionCalculator.calculateCommission(
          item,
          supplierPolicy
        );

        settlementItems.push(
          this.createSettlementItem(item, 'supplier', item.supplierId, supplierSettlement)
        );
      }

      // Platform Commission (항상 생성)
      const platformPolicy = await this.policyResolver.resolveForItem(item, {
        partyType: 'platform',
        partyId: 'platform',
      });

      const platformSettlement = await this.commissionCalculator.calculateCommission(
        item,
        platformPolicy
      );

      settlementItems.push(
        this.createSettlementItem(item, 'platform', 'platform', platformSettlement)
      );
    }

    return settlementItems;
  }

  /**
   * 특정 기간의 미정산 항목 계산
   */
  async calculateForPeriod(params: {
    partyId: string;
    partyType: 'seller' | 'supplier' | 'platform';
    periodStart: Date;
    periodEnd: Date;
  }): Promise<SettlementItem[]> {
    // 1. 기간 내 완료된 주문 조회
    // 2. 이미 정산된 항목 제외
    // 3. 미정산 항목에 대해 SettlementItem 생성
  }

  private createSettlementItem(
    item: OrderItem,
    partyType: string,
    partyId: string,
    calculation: CommissionCalculation
  ): SettlementItem {
    // SettlementItem 생성 로직
  }
}
```

**역할:**
- 실제 business rule을 기반으로 SettlementItem 목록을 생성
- "한 주문" 혹은 "한 기간"에 대해 정산 라인을 계산

---

### 5.3 CommissionCalculator

**현재 위치:** `apps/api-server/src/services/CommissionCalculator.ts` (기존 구현 있음)

**v2 개선 예정:**

```typescript
interface CommissionCalculation {
  grossAmount: number;      // 원금 (판매가 * 수량)
  commissionAmount: number; // 커미션 금액
  netAmount: number;        // 순액 (grossAmount - commissionAmount)
  calculationDetails: {
    type: 'percentage' | 'fixed' | 'tiered';
    rate?: number;
    fixedAmount?: number;
    appliedTier?: { minAmount: number; maxAmount: number; rate: number };
  };
}

class CommissionCalculator {
  async calculateCommission(
    item: OrderItem,
    policy: CommissionPolicy
  ): Promise<CommissionCalculation> {
    const grossAmount = item.unitPrice * item.quantity;

    switch (policy.calculationType) {
      case 'percentage':
        const commissionAmount = grossAmount * (policy.baseRate / 100);
        return {
          grossAmount,
          commissionAmount,
          netAmount: grossAmount - commissionAmount,
          calculationDetails: {
            type: 'percentage',
            rate: policy.baseRate,
          },
        };

      case 'fixed':
        return {
          grossAmount,
          commissionAmount: policy.fixedAmount * item.quantity,
          netAmount: grossAmount - policy.fixedAmount * item.quantity,
          calculationDetails: {
            type: 'fixed',
            fixedAmount: policy.fixedAmount,
          },
        };

      case 'tiered':
        const tier = this.findApplicableTier(grossAmount, policy.tieredRates);
        const tieredCommission = grossAmount * (tier.rate / 100);
        return {
          grossAmount,
          commissionAmount: tieredCommission,
          netAmount: grossAmount - tieredCommission,
          calculationDetails: {
            type: 'tiered',
            appliedTier: tier,
          },
        };
    }
  }

  private findApplicableTier(
    amount: number,
    tiers: CommissionPolicy['tieredRates']
  ) {
    return tiers.find(
      (tier) => amount >= tier.minAmount && amount <= tier.maxAmount
    );
  }
}
```

**역할:**
- CommissionPolicy + OrderItem 정보를 바탕으로 정산 금액을 계산
- 수수료/마진/분배액까지 포함 가능

---

### 5.4 PolicyResolver

**파일 위치:** `apps/api-server/src/services/settlement-engine/PolicyResolver.ts` (예정)

```typescript
class PolicyResolver {
  constructor(
    private readonly policyRepository: CommissionPolicyRepository,
  ) {}

  /**
   * OrderItem에 적용할 정책 결정
   * 우선순위: 상품별 > 판매자별 > 공급자별 > 카테고리별 > 글로벌 기본
   */
  async resolveForItem(
    item: OrderItem,
    context: { partyType: 'seller' | 'supplier' | 'platform' | 'partner'; partyId: string }
  ): Promise<CommissionPolicy> {
    // 1. 상품별 정책 조회
    let policy = await this.policyRepository.findByCondition({
      conditionType: 'product',
      conditionValue: item.productId,
      partyType: context.partyType,
      isActive: true,
    });

    if (policy) return policy;

    // 2. 파티별 정책 조회 (seller/supplier specific)
    if (context.partyType === 'seller') {
      policy = await this.policyRepository.findByCondition({
        conditionType: 'seller',
        conditionValue: context.partyId,
        isActive: true,
      });
    } else if (context.partyType === 'supplier') {
      policy = await this.policyRepository.findByCondition({
        conditionType: 'supplier',
        conditionValue: context.partyId,
        isActive: true,
      });
    }

    if (policy) return policy;

    // 3. 카테고리별 정책 조회
    // (Product 엔티티에서 categoryId 조회 필요)

    // 4. 글로벌 기본 정책
    policy = await this.policyRepository.findByCondition({
      conditionType: 'default',
      partyType: context.partyType,
      isActive: true,
    });

    if (!policy) {
      throw new Error(`No commission policy found for ${context.partyType}:${context.partyId}`);
    }

    return policy;
  }
}
```

**역할:**
- 어떤 OrderItem에 어떤 정책(policy)을 적용할지 결정
- 정책 조합:
  - 글로벌 기본 정책
  - 공급자 별 정책
  - 판매자 별 override
  - 특정 카테고리/상품 별 정책

---

### 5.5 SettlementAggregator

**파일 위치:** `apps/api-server/src/services/settlement-engine/SettlementAggregator.ts` (예정)

```typescript
class SettlementAggregator {
  /**
   * SettlementItem들을 하나의 Settlement로 집계
   */
  aggregateToSettlement(
    partyType: 'seller' | 'supplier' | 'platform',
    partyId: string,
    period: { start: Date; end: Date },
    items: SettlementItem[]
  ): Settlement {
    const totalSaleAmount = items.reduce(
      (sum, item) => sum + parseFloat(item.totalSaleAmount),
      0
    );
    const totalBaseAmount = items.reduce(
      (sum, item) => sum + parseFloat(item.totalBaseAmount || '0'),
      0
    );
    const totalCommissionAmount = items.reduce(
      (sum, item) => sum + parseFloat(item.commissionAmountSnapshot || '0'),
      0
    );
    const totalMarginAmount = items.reduce(
      (sum, item) => sum + parseFloat(item.marginAmountSnapshot || '0'),
      0
    );

    // 지급액 계산 (partyType별 다름)
    let payableAmount = 0;
    if (partyType === 'seller') {
      // Seller: margin - commission
      payableAmount = totalMarginAmount - totalCommissionAmount;
    } else if (partyType === 'supplier') {
      // Supplier: base amount
      payableAmount = totalBaseAmount;
    } else if (partyType === 'platform') {
      // Platform: commission
      payableAmount = totalCommissionAmount;
    }

    return {
      partyType,
      partyId,
      periodStart: period.start,
      periodEnd: period.end,
      totalSaleAmount: totalSaleAmount.toString(),
      totalBaseAmount: totalBaseAmount.toString(),
      totalCommissionAmount: totalCommissionAmount.toString(),
      totalMarginAmount: totalMarginAmount.toString(),
      payableAmount: payableAmount.toString(),
      status: SettlementStatus.PENDING,
    } as Settlement;
  }

  /**
   * 기존 Settlement에 새 SettlementItem 추가
   */
  addItemsToSettlement(
    settlement: Settlement,
    newItems: SettlementItem[]
  ): Settlement {
    // 기존 금액에 새 항목 금액 추가
    const currentTotalSale = parseFloat(settlement.totalSaleAmount);
    const newTotalSale = newItems.reduce(
      (sum, item) => sum + parseFloat(item.totalSaleAmount),
      0
    );

    settlement.totalSaleAmount = (currentTotalSale + newTotalSale).toString();
    // ... 다른 필드도 동일하게 처리

    return settlement;
  }
}
```

**역할:**
- 여러 SettlementItem들을 하나의 Settlement 단위로 집계
- 기간별/주체별 grouping 로직 구현

---

## 6. 주요 흐름(Flow)

### 6.1 주문 완료 시 (Order Completed)

```
┌─────────────┐
│ OrderService│
│ .updateOrder│
│  Status()   │
└──────┬──────┘
       │ 1. Order status = DELIVERED
       ↓
┌──────────────────────┐
│ SettlementEngine     │
│ .runOnOrderCompleted │
└──────┬───────────────┘
       │ 2. Order + OrderItem 조회
       ↓
┌──────────────────────┐
│ SettlementCalculator │
│ .calculateForOrder() │
└──────┬───────────────┘
       │ 3. 각 OrderItem 처리:
       │    - PolicyResolver → Policy 결정
       │    - CommissionCalculator → 금액 계산
       │    - SettlementItem 생성
       ↓
┌──────────────────────┐
│ SettlementAggregator │
│ .aggregateToSettleme │
└──────┬───────────────┘
       │ 4. Party별 Settlement에 집계
       ↓
┌──────────────────────┐
│ SettlementRepository │
│ .save()              │
└──────┬───────────────┘
       │ 5. DB 저장
       ↓
┌──────────────────────┐
│ CacheInvalidation    │
│ .invalidateSettlement│
└──────────────────────┘
       6. 캐시 무효화
```

**세부 동작:**

1. **OrderService.updateOrderStatus()**에서 status가 DELIVERED가 되면
2. **SettlementEngine.runOnOrderCompleted()** 호출
3. Order와 OrderItem 조회 (관계형 데이터)
4. 각 OrderItem에 대해:
   - **PolicyResolver**로 적용할 CommissionPolicy 결정
   - **CommissionCalculator**로 gross/commission/net 계산
   - **SettlementItem** 생성 (seller, supplier, platform 각각)
5. **SettlementAggregator**로 현재 기간의 Settlement에 추가/집계
6. Settlement/SettlementItem DB 저장
7. **CacheInvalidation**으로 관련 캐시 무효화
8. 새 API 요청 시 최신 데이터로 캐시됨

---

### 6.2 정산 배치 (매일/매주 등)

```
┌─────────────┐
│ Cron Job    │
│ (Daily 1AM) │
└──────┬──────┘
       │ 1. runDailySettlement(date)
       ↓
┌──────────────────────┐
│ SettlementEngine     │
│ .runDailySettlement()│
└──────┬───────────────┘
       │ 2. 기간 내 완료 주문 조회
       │    (status = DELIVERED)
       ↓
┌──────────────────────┐
│ SettlementCalculator │
│ .calculateForPeriod()│
└──────┬───────────────┘
       │ 3. 미정산 항목 계산
       │    - 이미 정산된 항목 제외
       │    - 신규 SettlementItem 생성
       ↓
┌──────────────────────┐
│ SettlementAggregator │
│ .aggregateToSettleme │
└──────┬───────────────┘
       │ 4. Party별 Settlement 집계
       ↓
┌──────────────────────┐
│ Settlement           │
│ .updateStatus()      │
└──────┬───────────────┘
       │ 5. PENDING → READY
       ↓
┌──────────────────────┐
│ NotificationService  │
│ .notify()            │
└──────────────────────┘
       6. 정산 대상자에게 알림
```

**세부 동작:**

1. Cron job (예: 매일 오전 1시)에서 **runDailySettlement(date)** 호출
2. 전일 기간 내 status=DELIVERED인 주문 조회
3. 기존 SettlementItem/Settlement 비교하여 미정산 항목 확인
4. 미정산 항목에 대해 SettlementItem 생성
5. Settlement 상태 업데이트 (PENDING → READY)
6. 정산 대상자(Seller/Supplier)에게 알림 발송
7. Dashboard & API에 최신 정산 정보 노출

---

### 6.3 환불/취소 처리

```
┌─────────────┐
│ OrderService│
│ .requestRefu│
└──────┬──────┘
       │ 1. Refund requested
       ↓
┌──────────────────────┐
│ SettlementEngine     │
│ .runOnRefund()       │
└──────┬───────────────┘
       │ 2. 기존 SettlementItem 조회
       ↓
┌──────────────────────┐
│ SettlementCalculator │
│ .calculateRefund()   │
└──────┬───────────────┘
       │ 3. 반대 방향 SettlementItem 생성
       │    (netAmount = -originalAmount)
       ↓
┌──────────────────────┐
│ SettlementAggregator │
│ .addItemsToSettleme │
└──────┬───────────────┘
       │ 4. Settlement 금액 조정
       │    (payableAmount -= refundAmount)
       ↓
┌──────────────────────┐
│ OrderEvent           │
│ .log()               │
└──────────────────────┘
       5. 이벤트 로그 기록
          (settlement_recalculated)
```

**세부 동작:**

1. **OrderService.requestRefund()**에서 환불 처리
2. **SettlementEngine.runOnRefund(orderId)** 호출
3. 해당 주문의 기존 SettlementItem 조회
4. 각 SettlementItem에 대해 반대 방향 항목 생성:
   - grossAmount: -original
   - commissionAmount: -original
   - netAmount: -original
   - reasonCode: 'refund'
5. 해당 Settlement의 금액 재집계 (감액)
6. OrderEvent에 'settlement_recalculated' 로그 기록
7. 캐시 무효화

---

## 7. SettlementEngine v2와 기존 시스템 통합

### 7.1 기존 Settlement* 서비스와의 관계

#### SettlementReadService (유지)
**위치:** `apps/api-server/src/services/SettlementReadService.ts`

**역할:**
- 조회/요약 전담 (Read-only)
- Dashboard용 통계 제공
- R-8-7에서 캐싱 적용됨

**v2 통합 방안:**
- SettlementEngine이 생성한 Settlement/SettlementItem을 읽기 전용으로 조회
- 기존 API 엔드포인트는 그대로 유지
- 내부 로직만 SettlementEngine 결과를 참조하도록 변경

---

#### SettlementManagementService (점진적 마이그레이션)
**위치:** `apps/api-server/src/services/SettlementManagementService.ts`

**현재 역할:**
- Settlement 생성/수정/삭제
- 배치 정산 (batchCreateSettlements)
- 정산 상태 변경

**v2 통합 방안:**
1. **Phase 1:** SettlementEngine과 병행 운영
   - 기존 로직 유지
   - SettlementEngine 결과와 비교 (Shadow Mode)

2. **Phase 2:** 점진적 마이그레이션
   - createSettlement() → SettlementEngine.runOnOrderCompleted()로 대체
   - batchCreateSettlements() → SettlementEngine.runDailySettlement()로 대체

3. **Phase 3:** 관리자 기능만 남김
   - 수동 정산 조정 (updateSettlementStatus, updateSettlementMemo)
   - SettlementEngine.recalculateSettlement() 호출

---

### 7.2 OrderService 통합

**위치:** `apps/api-server/src/services/OrderService.ts`

**통합 지점:**

```typescript
// OrderService.ts

async updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  options?: UpdateStatusOptions
): Promise<Order> {
  // ... 기존 로직

  const savedOrder = await this.orderRepository.save(order);

  // R-8-8: SettlementEngine 통합
  if (status === OrderStatus.DELIVERED) {
    await this.settlementEngine.runOnOrderCompleted(orderId);
  }

  // ... 나머지 로직
}

async requestRefund(orderId: string, reason: string, amount?: number): Promise<Order> {
  // ... 기존 로직

  const savedOrder = await this.orderRepository.save(order);

  // R-8-8: SettlementEngine 통합
  await this.settlementEngine.runOnRefund(orderId);

  return savedOrder;
}
```

---

## 8. 확장성(Extensibility) 고려

### 8.1 향후 추가될 수 있는 요구사항

#### 1. 앱 마켓 수익/정산
- 앱 판매자(App Provider)가 플랫폼에 앱을 등록하고 판매
- 판매 수익 중 일부를 앱 개발자에게 분배
- **필요한 변경:**
  - partyType에 'app_provider' 추가
  - CommissionPolicy에 앱별 정책 추가
  - SettlementItem에 앱 관련 메타데이터 추가

#### 2. 파트너 수익 분배
- 파트너 링크를 통한 주문의 커미션 분배
- 광고주/어필리에이트 수익 정산
- **필요한 변경:**
  - partyType 'partner' 이미 예정됨
  - Partner 엔티티와 연동
  - PartnerCommission → SettlementItem 통합

#### 3. 오프라인 매장 정산
- 오프라인 POS 시스템과 연동
- 오프라인 판매 데이터 정산
- **필요한 변경:**
  - OrderItem에 'offline' 플래그 추가
  - 오프라인 전용 CommissionPolicy
  - 매장별 정산 규칙

#### 4. 외부 회계 시스템(ERP) 연계
- 정산 데이터를 외부 ERP로 전송
- 회계 감사 연동
- **필요한 변경:**
  - Settlement에 externalId 필드 추가
  - 동기화 상태 추적
  - Webhook/API 연동

---

### 8.2 확장 가능한 설계 원칙

SettlementEngine v2는 다음을 전제로 설계됨:

#### 1. partyType 확장 가능
```typescript
type PartyType = 'seller' | 'supplier' | 'platform' | 'partner' | 'app_provider' | 'offline_store';
// 새로운 타입 추가 시 최소한의 변경
```

#### 2. CommissionPolicy 구조 확장 가능
```typescript
interface CommissionPolicy {
  // 기본 필드
  id: string;
  name: string;

  // 확장 가능한 메타데이터
  metadata?: {
    appMarketConfig?: { ... };
    offlineStoreConfig?: { ... };
    partnerConfig?: { ... };
  };
}
```

#### 3. SettlementItem 필드 확장 가능
```typescript
interface SettlementItem {
  // 기본 필드
  id: string;
  settlementId: string;
  // ...

  // 확장 가능한 메타데이터
  metadata?: Record<string, any>;
  // 예:
  // metadata: {
  //   appMarketSale: { appId, appName, version },
  //   partnerReferral: { partnerId, referralCode, clickId },
  //   offlineStore: { storeId, posId, transactionId }
  // }
}
```

---

## 9. 마이그레이션 전략 (High-level)

### Phase 1: Shadow Mode (1-2주)
1. SettlementEngine v2 구현 완료
2. 기존 SettlementManagementService와 병행 운영
3. 두 시스템의 결과 비교 및 검증
4. 차이 발생 시 원인 분석 및 수정

### Phase 2: Soft Launch (1-2주)
1. 신규 주문에만 SettlementEngine v2 적용
2. 기존 주문은 레거시 시스템 유지
3. 실시간 모니터링 및 에러 트래킹
4. Dashboard/API 응답 정합성 확인

### Phase 3: Full Migration (1주)
1. 모든 정산 로직을 SettlementEngine v2로 전환
2. SettlementManagementService는 관리자 기능만 남김
3. 레거시 로직 제거

### Phase 4: Optimization (지속)
1. 성능 모니터링 및 최적화
2. 캐싱 전략 개선
3. 배치 처리 효율화

---

## 10. 데이터 모델 변경 사항

### 10.1 신규 엔티티

#### CommissionPolicy
**파일:** `apps/api-server/src/entities/CommissionPolicy.ts` (신규)

```typescript
@Entity('commission_policies')
export class CommissionPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description?: string;

  @Column({ type: 'enum', enum: ['seller', 'supplier', 'platform', 'partner'] })
  partyType: 'seller' | 'supplier' | 'platform' | 'partner';

  @Column({ type: 'enum', enum: ['default', 'product', 'category', 'seller', 'supplier', 'tier'] })
  conditionType: string;

  @Column({ nullable: true })
  conditionValue?: string;

  @Column({ type: 'enum', enum: ['percentage', 'fixed', 'tiered'] })
  calculationType: 'percentage' | 'fixed' | 'tiered';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  baseRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fixedAmount?: number;

  @Column({ type: 'jsonb', nullable: true })
  tieredRates?: {
    minAmount: number;
    maxAmount: number;
    rate: number;
  }[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  platformShare?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sellerShare?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  partnerShare?: number;

  @Column({ type: 'timestamp' })
  effectiveFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  effectiveTo?: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### 10.2 기존 엔티티 수정

#### SettlementItem 필드 추가
**파일:** `apps/api-server/src/entities/SettlementItem.ts` (수정)

```typescript
@Entity('settlement_items')
export class SettlementItem {
  // ... 기존 필드

  // v2 추가 필드
  @Column({ nullable: true })
  partyType?: 'seller' | 'supplier' | 'platform' | 'partner';

  @Column({ nullable: true })
  partyId?: string;

  @Column({ nullable: true })
  policyId?: string; // CommissionPolicy.id

  @Column({ nullable: true })
  reasonCode?: 'default_commission' | 'refund' | 'adjustment' | 'partner_commission';

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  grossAmount?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  netAmount?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
```

---

## 11. 성능 고려사항

### 11.1 캐싱 전략 (R-8-7 기반)

SettlementEngine v2는 R-8-7에서 구축한 캐싱 인프라를 활용:

#### 1. Settlement Summary 캐싱
- **TTL:** 300초 (medium)
- **캐시 키:** `settlement:summary:{partyType}:{partyId}:{rangeKey}`
- **무효화:** SettlementEngine 실행 후 자동 무효화

#### 2. Commission Summary 캐싱
- **TTL:** 300초 (medium)
- **캐시 키:** `settlement:{partyType}:{partyId}:commission:{from}:{to}`
- **무효화:** 정산 생성/수정 시 자동 무효화

---

### 11.2 배치 처리 최적화

#### Bulk Insert
대량의 SettlementItem 생성 시 bulk insert 사용:

```typescript
// 비효율적
for (const item of settlementItems) {
  await repository.save(item);
}

// 효율적
await repository
  .createQueryBuilder()
  .insert()
  .into(SettlementItem)
  .values(settlementItems)
  .execute();
```

#### Pagination
대량 데이터 처리 시 pagination 적용:

```typescript
async runDailySettlement(date: Date) {
  const pageSize = 100;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const orders = await this.orderRepository.find({
      where: { ... },
      take: pageSize,
      skip: page * pageSize,
    });

    if (orders.length < pageSize) {
      hasMore = false;
    }

    await this.processOrders(orders);
    page++;
  }
}
```

---

## 12. 모니터링 및 로깅

### 12.1 로깅 전략

#### 주요 로그 포인트
1. **정산 시작/종료**
   ```
   [SettlementEngine] runOnOrderCompleted START orderId={orderId}
   [SettlementEngine] runOnOrderCompleted END orderId={orderId} duration={ms}
   ```

2. **정산 항목 생성**
   ```
   [SettlementCalculator] Created SettlementItem partyType={seller} partyId={id} amount={amount}
   ```

3. **정책 해결**
   ```
   [PolicyResolver] Resolved policy={policyId} for item={orderItemId} partyType={seller}
   ```

4. **에러 로깅**
   ```
   [SettlementEngine] ERROR runOnOrderCompleted orderId={orderId} error={message} stack={stack}
   ```

---

### 12.2 메트릭 수집

#### Performance Metrics
- 정산 계산 시간 (per order)
- 배치 정산 처리 시간 (per period)
- SettlementItem 생성 개수 (per day)

#### Business Metrics
- 일일 정산 금액 (by partyType)
- 정산 실패 건수
- 환불 처리 건수

---

## 13. 테스트 전략

### 13.1 단위 테스트

#### CommissionCalculator
```typescript
describe('CommissionCalculator', () => {
  it('should calculate percentage commission correctly', async () => {
    const item = createMockOrderItem({ unitPrice: 10000, quantity: 2 });
    const policy = createMockPolicy({ calculationType: 'percentage', baseRate: 5 });

    const result = await calculator.calculateCommission(item, policy);

    expect(result.grossAmount).toBe(20000);
    expect(result.commissionAmount).toBe(1000); // 5% of 20000
    expect(result.netAmount).toBe(19000);
  });
});
```

#### PolicyResolver
```typescript
describe('PolicyResolver', () => {
  it('should resolve product-specific policy first', async () => {
    const item = createMockOrderItem({ productId: 'product-123' });

    const policy = await resolver.resolveForItem(item, {
      partyType: 'seller',
      partyId: 'seller-456',
    });

    expect(policy.conditionType).toBe('product');
    expect(policy.conditionValue).toBe('product-123');
  });
});
```

---

### 13.2 통합 테스트

#### SettlementEngine
```typescript
describe('SettlementEngine Integration', () => {
  it('should create settlements for all parties when order is completed', async () => {
    // Setup
    const order = await createTestOrder({
      items: [
        { sellerId: 'seller-1', supplierId: 'supplier-1', unitPrice: 10000 },
      ],
    });

    // Execute
    await settlementEngine.runOnOrderCompleted(order.id);

    // Verify
    const sellerSettlement = await settlementRepository.findOne({
      where: { partyType: 'seller', partyId: 'seller-1' },
    });
    const supplierSettlement = await settlementRepository.findOne({
      where: { partyType: 'supplier', partyId: 'supplier-1' },
    });
    const platformSettlement = await settlementRepository.findOne({
      where: { partyType: 'platform', partyId: 'platform' },
    });

    expect(sellerSettlement).toBeDefined();
    expect(supplierSettlement).toBeDefined();
    expect(platformSettlement).toBeDefined();
  });
});
```

---

### 13.3 E2E 테스트

#### 주문 완료 → 정산 생성 흐름
```typescript
describe('Settlement E2E', () => {
  it('should complete full settlement flow', async () => {
    // 1. Create order
    const order = await orderService.createOrder(buyerId, orderData);

    // 2. Update status to DELIVERED
    await orderService.updateOrderStatus(order.id, OrderStatus.DELIVERED);

    // 3. Verify settlements created
    const settlements = await settlementRepository.find({
      where: { periodStart: LessThanOrEqual(new Date()) },
    });

    expect(settlements.length).toBeGreaterThan(0);

    // 4. Verify dashboard shows updated data
    const summary = await sellerDashboardService.getSummaryForSeller(sellerId);
    expect(summary.totalCommission).toBeGreaterThan(0);
  });
});
```

---

## 14. 보안 고려사항

### 14.1 데이터 접근 제어

#### Repository Level
```typescript
class SettlementRepository {
  async findByParty(
    partyType: string,
    partyId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<Settlement[]> {
    // Admin은 모든 정산 조회 가능
    if (requesterRole === 'admin') {
      return this.find({ where: { partyType, partyId } });
    }

    // Seller/Supplier는 본인 정산만 조회 가능
    if (requesterId !== partyId) {
      throw new ForbiddenException('Cannot access other party settlements');
    }

    return this.find({ where: { partyType, partyId } });
  }
}
```

---

### 14.2 금액 데이터 보안

#### 1. 정밀도 보장
- 모든 금액은 `string` 또는 `decimal` 타입으로 저장
- JavaScript `number`의 부동소수점 오차 방지

#### 2. 변경 이력 추적
- Settlement/SettlementItem의 모든 변경사항 로깅
- 감사(Audit) 로그 보관

#### 3. 무결성 검증
```typescript
async validateSettlement(settlement: Settlement) {
  const items = await this.settlementItemRepository.find({
    where: { settlementId: settlement.id },
  });

  const calculatedTotal = items.reduce(
    (sum, item) => sum + parseFloat(item.netAmount),
    0
  );

  const storedTotal = parseFloat(settlement.payableAmount);

  if (Math.abs(calculatedTotal - storedTotal) > 0.01) {
    throw new Error('Settlement amount mismatch');
  }
}
```

---

## 15. 결론

SettlementEngine v2는:

✅ **OrderItem 기반 정산 구조 완성**
- R-8-3 ~ R-8-6의 작업 결과를 기반으로 일관된 정산 파이프라인 구축

✅ **역할별 정산 규칙 명확화**
- Seller/Supplier/Platform/Partner 각각의 수익 분배 로직 통일

✅ **이벤트 기반 정산 자동화**
- 주문 완료, 환불, 취소 등의 이벤트에 자동 대응

✅ **확장 가능한 설계**
- CommissionPolicy를 통한 유연한 정책 관리
- 메타데이터를 통한 확장 가능한 구조

✅ **캐싱 및 성능 최적화**
- R-8-7의 캐싱 인프라 활용
- 배치 처리 최적화

✅ **운영/감사 용이**
- 모든 정산 근거를 데이터로 기록
- 완전한 추적 가능성(Traceability)

---

## 다음 단계

이 설계서를 기반으로:

### R-8-8-2: SettlementItem 생성 규칙 및 SettlementEngine 기본 구현
- CommissionPolicy 엔티티 구현
- SettlementEngine 핵심 컴포넌트 구현
- 단위 테스트 작성

### R-8-8-3: Settlement API 리팩토링
- 기존 SettlementManagementService 마이그레이션
- Shadow Mode 구현 및 검증
- API 엔드포인트 통합

### R-8-8-4: 배치 정산 시스템 구현
- Cron job 설정
- 일일/주간/월간 정산 로직
- 대량 데이터 처리 최적화

---

**문서 버전:** Draft v1
**최종 수정일:** 2025-11-24
**상태:** 📝 Review Required
**리뷰어:** Development Team
