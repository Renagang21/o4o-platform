# WO-SERVICE-MARKET-TRIAL-CODE-AUDIT-REPORT

> **Status**: COMPLETE
> **Date**: 2025-12-28
> **Scope**: Code-first / No Refactor
> **Target App**: `market-trial`

---

## Executive Summary

Market Trial은 **"공급자 주도의 제품 시험 펀딩 플랫폼"**으로,
일반적인 Crowdfunding과 유사하지만 **B2B 참여자 제한**과 **Dropshipping 연계**라는
명확한 차별점을 가진 **Extension App**이다.

**최종 판정: `HOLD`**
- 현재 구조 유지 적절
- 개념 재정의 불필요
- E-commerce Core 연결만 보완 필요

---

## 1. 핵심 조사 질문 답변

### Q1. 중심 주체는 누구인가?

**코드 기준 답변: Supplier (공급자) 중심**

```typescript
// MarketTrial.entity.ts:36-38
@Column({ type: 'uuid' })
@Index()
supplierId!: string;
```

| 주체 | 역할 | 코드 근거 |
|------|------|-----------|
| **Supplier** | Trial 생성자 | `supplierId` 필수, 모든 Trial의 소유자 |
| Seller | 참여자 (Funding) | `ParticipantType.SELLER`, contributionAmount |
| Partner | 참여자 (Funding) | `ParticipantType.PARTNER`, selectedSellerIds |
| End User | **없음** | 코드에 소비자 참여 로직 전무 |

> **결론**: Supplier가 Trial을 개설하고, Seller/Partner가 펀딩에 참여하는 **B2B 구조**.
> 일반 소비자(End User) 참여 경로는 코드에 존재하지 않음.

---

### Q2. "참여"는 어떻게 표현되는가?

**코드 기준 답변: 금액 기여(contributionAmount)로 표현**

```typescript
// MarketTrialParticipant.entity.ts:60-61
@Column({ type: 'decimal', precision: 12, scale: 2 })
contributionAmount!: number;
```

#### 참여 수단

| 항목 | 코드 표현 |
|------|-----------|
| 참여 방식 | `contribute` (금액 기여) |
| 참여 단위 | `contributionAmount` (decimal) |
| 참여 기록 | `MarketTrialParticipant` 엔터티 |

#### 상태 전이 (MarketTrialStatus)

```typescript
// MarketTrial.entity.ts:21-25
export enum MarketTrialStatus {
  OPEN = 'open',                 // 펀딩 진행 중
  TRIAL_ACTIVE = 'trial_active', // 펀딩 성공, 시험 기간
  FAILED = 'failed',             // 펀딩 실패 또는 시험 실패
}
```

```
OPEN → (targetAmount 도달) → TRIAL_ACTIVE
OPEN → (fundingEndAt 경과 & 미달) → FAILED
```

#### 결제/송금 처리

| 항목 | 현재 상태 |
|------|-----------|
| 실제 결제 호출 | ❌ 없음 |
| EcommerceOrder 생성 | ❌ 없음 |
| 외부 PG 연동 | ❌ 없음 |

> **결론**: `contributionAmount`는 **약정/기록 수준**이며,
> 실제 결제/송금 처리 코드는 현재 없음.

---

### Q3. Crowdfunding과의 유사점/차이점

#### 유사점 (코드 기준)

| 항목 | Crowdfunding | Market Trial | 일치 |
|------|-------------|--------------|------|
| 목표 금액 설정 | ✓ | `targetAmount` | ✅ |
| 펀딩 기간 제한 | ✓ | `fundingStartAt`, `fundingEndAt` | ✅ |
| 참여자 기여금 | ✓ | `contributionAmount` | ✅ |
| 목표 미달 시 실패 | ✓ | `FAILED` 상태 전이 | ✅ |

#### 차이점 (코드 기준)

| 항목 | 일반 Crowdfunding | Market Trial | 차이 |
|------|------------------|--------------|------|
| 참여자 범위 | 대중 (누구나) | **Seller/Partner만** | ⚠️ 핵심 차이 |
| 리워드 | 제품/굿즈 | **Dropshipping 판매권** | ⚠️ 핵심 차이 |
| 가격 공개 | 공개 | 참여자 한정 (추정) | - |
| 결과물 | 제품 수령 | **판매 신청 생성** | ⚠️ 핵심 차이 |

```typescript
// MarketTrialDecisionService.ts:219-241
if (dto.decision === DecisionType.CONTINUE) {
  const offer = await this.findOrCreateOffer(trial);
  if (offer) {
    const listing = listingRepo.create({
      sellerId: dto.participantId,
      offerId: offer.id,
      status: ListingStatus.DRAFT, // 신청 상태
      metadata: {
        sourceType: 'market_trial',
        marketTrialId: trial.id,
      },
    });
    // ...
  }
}
```

> **결론**: 구조적으로 Crowdfunding과 유사하나,
> **B2B 참여 제한 + Dropshipping 판매권 부여**라는 명확한 차별점 존재.
> **"시장 시험 펀딩"** 또는 **"제품 랜딩 펀딩"**이 더 정확한 개념.

---

### Q4. Dropshipping과의 관계

#### 펀딩 단계: 연계 없음

```typescript
// MarketTrialService.ts:61-93
async createTrial(dto: CreateTrialDto): Promise<MarketTrial> {
  // productId로 dropshipping 상품 참조만
  // dropshipping-core 호출 없음
}
```

| 항목 | 현재 상태 |
|------|-----------|
| Trial 생성 시 Dropshipping 호출 | ❌ |
| 참여 시 Dropshipping 호출 | ❌ |
| EcommerceOrder 생성 | ❌ |

#### 종료 이후: Decision 시점에서 연계

```typescript
// MarketTrialDecisionService.ts:163-184
private async createSellerApplication(
  trial: MarketTrial,
  sellerId: string,
  offer: SupplierProductOffer
): Promise<SellerListing> {
  const listing = this.listingRepo.create({
    sellerId: sellerId,
    offerId: offer.id,
    status: ListingStatus.DRAFT, // ← 신청 상태
    // ...
  });
  return await this.listingRepo.save(listing);
}
```

| 항목 | 현재 상태 | 설명 |
|------|-----------|------|
| SellerListing 생성 | ✅ | Decision = CONTINUE 시 |
| SupplierProductOffer 생성 | ✅ | 없으면 자동 생성 |
| OrderRelay 생성 | ❌ | 미구현 |
| EcommerceOrder 생성 | ❌ | 미구현 |

> **결론**: Trial 종료 후 CONTINUE 결정 시 **SellerListing(DRAFT)**을 생성하여
> Dropshipping 판매 신청으로 연결. 실제 주문/정산 연계는 미구현.

---

### Q5. 결과 수령 방식

**코드 기준 답변: 제품 수령이 아닌 "판매권 부여"**

```typescript
// DecisionType
export enum DecisionType {
  CONTINUE = 'continue', // 판매 계속 희망 → SellerListing 생성
  STOP = 'stop',         // 중단 희망 → 아무 것도 안 함
}
```

| 결과 유형 | 코드 표현 | 현재 상태 |
|-----------|-----------|-----------|
| 현금 회수 | ❌ 없음 | 미구현 |
| 이자 개념 | ❌ 없음 | 미구현 |
| 제품 수령 | ❌ 없음 | 코드 없음 |
| **판매권 부여** | ✅ `SellerListing(DRAFT)` | 구현됨 |

> **결론**: Crowdfunding의 "제품 리워드"가 아닌,
> **"Dropshipping 판매 신청권"**이 결과물.
> 이는 **B2B 시장 시험 플랫폼**의 특성.

---

### Q6. 다른 서비스에서 반복 사용 가능한가?

#### 도메인 종속성 분석

```typescript
// manifest.ts:17-20
dependencies: {
  core: ['dropshipping-core'],
  optional: ['forum-core'],
},
```

| 항목 | 분석 |
|------|------|
| Yaksa 종속? | ❌ (organization-core 의존 없음) |
| 특정 산업 종속? | ❌ (dropshipping 범용) |
| 서비스 하드코딩? | ❌ (없음) |

#### 범용성 평가

| 항목 | 현재 상태 | 범용 가능? |
|------|-----------|------------|
| 공급자 개념 | dropshipping Supplier | ✅ 범용 |
| 참여자 개념 | Seller/Partner | ✅ 범용 |
| 상품 개념 | ProductMaster | ✅ 범용 |
| 결과물 | SellerListing | ⚠️ Dropshipping 한정 |

#### 반복 사용 장벽

| 장벽 | 설명 |
|------|------|
| Dropshipping 결과물 고정 | 결과가 SellerListing으로만 연결됨 |
| 결제 미구현 | 실제 펀딩 수금 로직 없음 |
| 환불 미구현 | 실패 시 환불 로직 없음 |

> **결론**: 개념적으로 범용 가능하나, 현재 구현은 **Dropshipping 전용**.
> 다른 도메인 확장 시 결과물 연결 로직 추가 필요.

---

## 2. 데이터 소유권 및 계약 경계

### 소유 테이블 (4개)

| 테이블 | 엔터티 | 소유자 |
|--------|--------|--------|
| `market_trials` | MarketTrial | market-trial |
| `market_trial_participants` | MarketTrialParticipant | market-trial |
| `market_trial_forums` | MarketTrialForum | market-trial |
| `market_trial_decisions` | MarketTrialDecision | market-trial |

### 외부 참조 (Soft FK)

| 참조 대상 | 소유자 | 참조 방식 |
|-----------|--------|-----------|
| `dropshipping_suppliers` | dropshipping-core | supplierId (UUID) |
| `dropshipping_product_masters` | dropshipping-core | productId (UUID) |
| `dropshipping_sellers` | dropshipping-core | participantId (seller) |
| `dropshipping_seller_listings` | dropshipping-core | 생성 (write) |
| `dropshipping_supplier_product_offers` | dropshipping-core | 생성 (write) |

### 계약 경계

```
market-trial (Extension)
  ├── 읽기: Supplier, ProductMaster (조회용)
  ├── 쓰기: SellerListing, SupplierProductOffer (Decision 시)
  └── 의존: dropshipping-core [필수]
```

---

## 3. CLAUDE.md 준수 상황

### 3.1 의존성 규칙 ✅

```
Extension (market-trial)
  ↓ (허용: Extension → Core)
Core (dropshipping-core)
```

✅ 역방향 의존 없음
✅ 계층 구조 준수

### 3.2 E-commerce Core 규칙 ⚠️

| 항목 | 현재 상태 | CLAUDE.md §7 |
|------|-----------|--------------|
| EcommerceOrder 생성 | ❌ 미구현 | 필수 |
| OrderType 지정 | ❌ 미구현 | 필수 |
| ecommerceOrderId 저장 | ❌ 미구현 | 필수 |

> **향후 보완 필요**: 참여(contributionAmount) 시 EcommerceOrder 생성 필요

### 3.3 App 유형 체계 ✅

```typescript
appType: 'extension' as const
dependencies: { core: ['dropshipping-core'] }
```

✅ Extension 타입 명시
✅ Core 의존성 명확

---

## 4. 지금 건드리면 안 되는 영역

| 영역 | 이유 |
|------|------|
| Entity 구조 | 현재 구조로 Phase 1-3 완료 |
| Status 상태 전이 로직 | 동작 중, 테스트 필요 시 별도 WO |
| Decision → Listing 연결 | 핵심 비즈니스 로직, 변경 시 영향 범위 큼 |
| 개념 명칭 (Market Trial) | 용어 변경은 전체 문서/코드 수정 필요 |

---

## 5. 보완 가능 영역 (향후 WO 대상)

| 영역 | 우선순위 | 설명 |
|------|----------|------|
| E-commerce 연결 | P1 | CLAUDE.md §7 준수 |
| 실제 결제 연동 | P2 | PG 연동, 펀딩 수금 |
| 환불 로직 | P2 | 실패 시 환불 처리 |
| Trial 종료 자동화 | P3 | trialPeriodDays 만료 처리 |

---

## 6. 최종 판정

### 판정: `HOLD`

| 판정 | 의미 |
|------|------|
| `OBSERVE` | 관찰만, 변경 불필요 |
| **`HOLD`** | **현재 구조 유지, 보완만 필요** |
| `CHANGE` | 구조 변경 필요 |

### 판정 근거

1. **개념 정체성 명확**: B2B 시장 시험 펀딩 플랫폼
2. **Crowdfunding과 구별됨**: 참여자 제한 + 판매권 결과물
3. **구조적 문제 없음**: Extension 패턴 준수
4. **보완만 필요**: E-commerce 연결, 결제 연동

### 권고 사항

| 구분 | 내용 |
|------|------|
| 지금 할 것 | 없음 (HOLD) |
| 하지 말 것 | 개념 재정의, 리팩토링 |
| 향후 검토 | E-commerce 연결 WO 발행 |

---

## 부록: 코드 구조 요약

```
packages/market-trial/
├── src/
│   ├── manifest.ts                    # Extension 선언
│   ├── entities/
│   │   ├── MarketTrial.entity.ts      # Trial 본체
│   │   ├── MarketTrialParticipant.entity.ts  # 참여자
│   │   ├── MarketTrialDecision.entity.ts     # 의사 결정
│   │   └── MarketTrialForum.entity.ts        # Forum 연결
│   ├── services/
│   │   ├── MarketTrialService.ts      # Trial/참여 관리
│   │   ├── MarketTrialDecisionService.ts  # 의사 결정 + Listing 생성
│   │   └── MarketTrialForumService.ts     # Forum 접근 관리
│   ├── controllers/
│   │   └── MarketTrialController.ts   # REST API
│   └── routes.ts                      # 라우터 구성
```

---

*Report Version: 1.0*
*Created: 2025-12-28*
*Status: COMPLETE*
