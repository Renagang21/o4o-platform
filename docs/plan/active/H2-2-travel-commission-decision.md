# H2-2 Travel 채널 정산 / 커미션 모델 결정서

> **Status**: Decision Finalized
> **Date**: 2025-01-02
> **Work Order**: H2-2
> **Based On**: H1-2 Order/Payment 결정서, H2-0 구현, H2-1 UI 설계

---

## 1. 문제 정의

Travel 채널 주문 시 **수익 분배(커미션) 구조**를 결정해야 함.

### 결정해야 할 핵심 질문

| 질문 | 왜 지금 결정해야 하는가 |
|------|------------------------|
| 참여자 역할은 무엇인가? | 커미션 배분 대상 정의 |
| 커미션 정보는 어디에 저장하는가? | 주문 생성 시 필요 |
| 비율 vs 금액 중 무엇을 기록하는가? | 환불/취소 시 정산 영향 |
| 정산 단위는 Order vs Payment인가? | 분할결제 시나리오 대응 |

---

## 2. 참여자(Participant) 역할 정의

### 2.1 Travel 채널 4대 참여자

| 역할 | 영문 Key | 설명 | 필수 여부 |
|------|----------|------|----------|
| **가이드** | `guide` | 투어 진행, 매장 인도, 구매 유도 | **필수** |
| **매장** | `store` | 상품 진열, 재고 관리, 수령 지점 | **필수** |
| **파트너** | `partner` | 투어사, 에이전시, 제휴 업체 | 선택 |
| **플랫폼** | `platform` | O4O 플랫폼 운영사 | **필수** |

### 2.2 역할 상세

#### Guide (가이드)
- **정체**: 외국인 관광객 인솔 가이드
- **기여**: 매장 방문 유도, 상품 설명 보조, 구매 의사결정 지원
- **커미션 근거**: 구매 전환 기여도
- **식별**: `metadata.travel.guideId` (Participant UUID)

#### Store (매장)
- **정체**: 화장품 판매 매장 (면세점, 로드샵 등)
- **기여**: 상품 재고, 시연/테스트, 세금환급 처리
- **커미션 근거**: 판매 수수료 (기본)
- **식별**: `metadata.storeId` (Participant UUID)

#### Partner (파트너)
- **정체**: 투어사, 여행사, 제휴 에이전시
- **기여**: 투어 기획, 가이드 고용, 고객 유입
- **커미션 근거**: 고객 유입 기여
- **식별**: `metadata.commission.partnerId` (Participant UUID)
- **조건**: 존재하지 않을 수 있음 (직접 가이드 계약 시)

#### Platform (플랫폼)
- **정체**: O4O 플랫폼 운영사
- **기여**: 시스템 운영, 결제 처리, 정산 관리
- **커미션 근거**: 플랫폼 이용료
- **식별**: 고정 (별도 ID 불필요)

---

## 3. 커미션 모델 결정

### 3.1 핵심 결정: **Rate 기반 기록**

#### 최종 결정: **비율(Rate)만 저장, 금액은 저장하지 않음**

| 옵션 | 설명 | 판단 |
|------|------|------|
| **Option A** | Rate만 저장 | ✅ **채택** |
| Option B | Amount만 저장 | ❌ 기각 |
| Option C | Rate + Amount 둘 다 저장 | ❌ 기각 |

#### 결정 근거

1. **환불 시 정확한 재계산 가능**
   - Rate 기록: 환불 시 `환불금액 × rate`로 정확한 커미션 차감
   - Amount 기록: 부분 환불 시 "어느 커미션을 얼마나 차감할지" 모호

2. **가격 변동 대응**
   - 주문 생성 후 가격 조정이 있어도 rate는 유효
   - Amount는 조정마다 재계산 필요

3. **데이터 무결성**
   - Rate 합계 = 1.0 (100%) 검증 간단
   - Amount 합계 = 주문 총액 검증은 부동소수점 오차 위험

4. **정산 시점에 금액 계산**
   - 정산 배치에서 `Order.totalAmount × rate` 계산
   - 실시간 금액 추적 불필요

#### 기각 사유

**Option B (Amount만 저장)**:
- 부분 환불 시 비례 차감 로직 복잡
- 가격 변경 시 동기화 필요
- 합계 검증 시 부동소수점 오차

**Option C (둘 다 저장)**:
- 중복 데이터 (rate × totalAmount = amount)
- 불일치 시 어느 것이 정확한지 모호
- 저장 공간 낭비

---

### 3.2 metadata.commission 스키마 (확정)

```typescript
/**
 * H2-2 확정 Commission Metadata Schema
 *
 * 규칙:
 * - 모든 rate는 소수점 (0.0 ~ 1.0)
 * - guide.rate + store.rate + partner.rate + platform.rate = 1.0
 * - amount 필드 없음 (정산 시 계산)
 */
interface CommissionMetadata {
  /** 가이드 커미션 (필수) */
  guide: {
    participantId: string;  // Guide의 Participant UUID
    rate: number;           // 예: 0.10 (10%)
  };

  /** 매장 커미션 (필수) */
  store: {
    participantId: string;  // Store의 Participant UUID
    rate: number;           // 예: 0.70 (70%)
  };

  /** 파트너 커미션 (선택) */
  partner?: {
    participantId: string;  // Partner의 Participant UUID
    rate: number;           // 예: 0.05 (5%)
  };

  /** 플랫폼 커미션 (필수) */
  platform: {
    rate: number;           // 예: 0.15 (15%)
    // participantId 없음 (플랫폼은 고정)
  };
}
```

### 3.3 Rate 합계 규칙

```typescript
// 검증 로직 (pseudo-code)
function validateCommissionRates(commission: CommissionMetadata): boolean {
  const sum =
    commission.guide.rate +
    commission.store.rate +
    (commission.partner?.rate || 0) +
    commission.platform.rate;

  // 부동소수점 오차 허용 (0.0001)
  return Math.abs(sum - 1.0) < 0.0001;
}
```

### 3.4 예시 시나리오

#### 시나리오 A: 파트너 없는 직접 가이드

```json
{
  "commission": {
    "guide": { "participantId": "guide-uuid-123", "rate": 0.15 },
    "store": { "participantId": "store-uuid-456", "rate": 0.70 },
    "platform": { "rate": 0.15 }
  }
}
```
- 합계: 0.15 + 0.70 + 0.15 = 1.0 ✅

#### 시나리오 B: 파트너(투어사) 경유

```json
{
  "commission": {
    "guide": { "participantId": "guide-uuid-123", "rate": 0.10 },
    "store": { "participantId": "store-uuid-456", "rate": 0.65 },
    "partner": { "participantId": "partner-uuid-789", "rate": 0.10 },
    "platform": { "rate": 0.15 }
  }
}
```
- 합계: 0.10 + 0.65 + 0.10 + 0.15 = 1.0 ✅

#### 시나리오 C: 고가이드 프리미엄 (커미션 높음)

```json
{
  "commission": {
    "guide": { "participantId": "guide-uuid-vip", "rate": 0.20 },
    "store": { "participantId": "store-uuid-456", "rate": 0.60 },
    "platform": { "rate": 0.20 }
  }
}
```
- 합계: 0.20 + 0.60 + 0.20 = 1.0 ✅

---

## 4. 정산 단위 결정

### 4.1 핵심 결정: **Order 단위 정산**

#### 최종 결정: **Payment가 아닌 Order 기준으로 정산**

| 옵션 | 설명 | 판단 |
|------|------|------|
| **Option A** | Order 단위 정산 | ✅ **채택** |
| Option B | Payment 단위 정산 | ❌ 기각 |

#### 결정 근거

1. **커미션 책임은 "판매"에 귀속**
   - 가이드는 "구매"를 유도했지, "결제"를 유도한 게 아님
   - 매장은 "상품"을 제공했지, "결제 수단"을 제공한 게 아님
   - 따라서 정산 기준 = 주문(Order)

2. **분할 결제 복잡도 회피**
   - Order 100,000원을 50,000원씩 2회 결제해도
   - 가이드 커미션 = 100,000 × 0.10 = 10,000원 (단순)
   - Payment별 정산 시: 5,000 + 5,000 = 10,000원 (복잡)

3. **환불 처리 일관성**
   - 전체 환불: Order 기준 커미션 전액 차감
   - 부분 환불: 환불금액 × rate 차감
   - Payment 기준 시 "어느 결제를 환불했는지" 추적 필요

4. **H1-2와 일관성**
   - Tax Refund도 Order 단위로 결정됨
   - Tour Session도 Order에 귀속됨
   - 정산도 Order 단위가 자연스러움

#### 기각 사유 (Payment 단위)

- 분할 결제 시 커미션 분배 복잡
- Payment 취소 시 커미션 재조정 로직 필요
- 정산 조회 쿼리 복잡도 증가

---

## 5. 주문 생성 시 적용 규칙

### 5.1 Travel 채널 필수 검증

```typescript
// 주문 생성 시 검증 로직
function validateTravelOrderCommission(metadata: OrderMetadata): ValidationResult {
  // 1. Travel 채널이면 commission 필수
  if (metadata.channel === 'travel') {
    if (!metadata.commission) {
      return { valid: false, error: 'Travel 채널은 commission 필수' };
    }

    // 2. guide, store, platform 필수
    if (!metadata.commission.guide?.participantId) {
      return { valid: false, error: 'guide.participantId 필수' };
    }
    if (!metadata.commission.store?.participantId) {
      return { valid: false, error: 'store.participantId 필수' };
    }
    if (metadata.commission.platform?.rate === undefined) {
      return { valid: false, error: 'platform.rate 필수' };
    }

    // 3. Rate 합계 검증
    if (!validateCommissionRates(metadata.commission)) {
      return { valid: false, error: 'Rate 합계가 1.0이 아님' };
    }
  }

  return { valid: true };
}
```

### 5.2 Local 채널 규칙

- Local 채널은 `metadata.commission` **선택**
- 존재할 경우 Travel과 동일한 Rate 합계 검증 적용
- 일반적으로 Local은 Store 100% 또는 Store + Platform만 사용

```json
// Local 채널 예시 (commission 있을 경우)
{
  "channel": "local",
  "commission": {
    "store": { "participantId": "store-uuid", "rate": 0.85 },
    "platform": { "rate": 0.15 }
  }
}
```

### 5.3 Rate 기본값 정책

| 참여자 | 기본값 | 비고 |
|--------|--------|------|
| Guide | 0.10 | 기본 가이드 커미션 |
| Store | 0.70 | 기본 매장 마진 |
| Partner | 0.00 | 파트너 없을 때 |
| Platform | 0.15 | 고정 플랫폼 수수료 |

> **주의**: 기본값은 참고용이며, 실제 비율은 계약에 따라 주문 생성 시 명시적으로 설정

---

## 6. 정산 조회 쿼리 예시

### 6.1 가이드별 정산 조회

```sql
-- 가이드 ID별 정산 금액 (예시)
SELECT
  o.metadata->'commission'->'guide'->>'participantId' as guide_id,
  SUM(o.total_amount * (o.metadata->'commission'->'guide'->>'rate')::numeric) as guide_commission
FROM ecommerce_orders o
WHERE o.metadata->>'channel' = 'travel'
  AND o.status = 'completed'
  AND o.created_at BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY guide_id;
```

### 6.2 매장별 정산 조회

```sql
-- 매장 ID별 정산 금액 (예시)
SELECT
  o.metadata->'commission'->'store'->>'participantId' as store_id,
  SUM(o.total_amount * (o.metadata->'commission'->'store'->>'rate')::numeric) as store_commission
FROM ecommerce_orders o
WHERE o.metadata->>'channel' = 'travel'
  AND o.status = 'completed'
  AND o.created_at BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY store_id;
```

### 6.3 투어 세션별 정산 조회

```sql
-- 투어 세션별 총 정산 (예시)
SELECT
  o.metadata->'travel'->>'tourSessionId' as session_id,
  o.metadata->'travel'->>'tourDate' as tour_date,
  COUNT(*) as order_count,
  SUM(o.total_amount) as total_sales,
  SUM(o.total_amount * (o.metadata->'commission'->'guide'->>'rate')::numeric) as guide_total,
  SUM(o.total_amount * (o.metadata->'commission'->'store'->>'rate')::numeric) as store_total
FROM ecommerce_orders o
WHERE o.metadata->>'channel' = 'travel'
  AND o.status = 'completed'
GROUP BY session_id, tour_date;
```

---

## 7. 환불 시 커미션 처리

### 7.1 원칙: **Rate 기반 비례 차감**

```typescript
// 환불 시 커미션 차감 계산
function calculateRefundCommissions(
  order: Order,
  refundAmount: number
): CommissionRefund {
  const commission = order.metadata.commission;

  return {
    guide: refundAmount * commission.guide.rate,
    store: refundAmount * commission.store.rate,
    partner: commission.partner
      ? refundAmount * commission.partner.rate
      : 0,
    platform: refundAmount * commission.platform.rate,
    total: refundAmount  // 검증: 합계 = refundAmount
  };
}
```

### 7.2 예시

- **주문**: 100,000원
- **커미션 비율**: Guide 10%, Store 70%, Platform 20%
- **부분 환불**: 30,000원

**커미션 차감액**:
| 참여자 | 계산 | 차감액 |
|--------|------|--------|
| Guide | 30,000 × 0.10 | 3,000원 |
| Store | 30,000 × 0.70 | 21,000원 |
| Platform | 30,000 × 0.20 | 6,000원 |
| **합계** | | **30,000원** |

---

## 8. 채택/기각 옵션 요약

| 결정 항목 | 채택 | 기각 |
|----------|------|------|
| 커미션 기록 | Rate만 저장 | Amount 저장 |
| 정산 단위 | Order 기준 | Payment 기준 |
| 참여자 구조 | 4대 역할 고정 | 동적 역할 |
| Rate 검증 | 합계 = 1.0 | 유연한 합계 |

---

## 9. 의도적으로 하지 않은 것

### 9.1 이번 결정에서 제외

| 항목 | 사유 | 다음 단계 |
|------|------|----------|
| 정산 주기 | 비즈니스 결정 필요 (주간/월간) | 운영 정책 |
| 정산 지급 방식 | 계좌이체/PG 연동 등 | 결제 시스템 |
| 커미션 협상 UI | 백오피스 기능 | H3+ |
| 정산 분쟁 처리 | 운영 프로세스 | 운영 정책 |
| 세금 처리 | 회계/세무 연동 | 회계 시스템 |

### 9.2 의도적 단순화

| 단순화 항목 | 이유 |
|------------|------|
| Amount 저장 안 함 | Rate × TotalAmount로 항상 계산 가능 |
| 동적 역할 안 함 | 4대 역할로 충분, 복잡도 감소 |
| Payment 연동 안 함 | Order 기준 정산이 더 단순 |

---

## 10. H2-0 구현과의 연결

### 10.1 현재 구현 상태 (H2-0)

[cosmetics-order.controller.ts:51-60](apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts#L51-L60)에 CommissionMeta 인터페이스가 이미 정의됨:

```typescript
interface CommissionMeta {
  partnerId?: string;
  referralCode?: string;
  rate?: number;
}
```

### 10.2 H2-2 결정 반영 시 변경 필요 (H3+)

```typescript
// 기존 (H2-0)
interface CommissionMeta {
  partnerId?: string;
  referralCode?: string;
  rate?: number;
}

// 변경 (H2-2 확정 스키마 반영 - H3+ 구현)
interface CommissionMetadata {
  guide: { participantId: string; rate: number; };
  store: { participantId: string; rate: number; };
  partner?: { participantId: string; rate: number; };
  platform: { rate: number; };
}
```

### 10.3 마이그레이션 계획

1. **H3-0**: CommissionMetadata 스키마 확장 구현
2. **H3-1**: Rate 합계 검증 로직 추가
3. **H3-2**: 정산 조회 API 구현

---

## 11. 최종 요약

| 결정 | 최종안 | 핵심 근거 |
|------|--------|----------|
| **참여자** | Guide/Store/Partner/Platform 4대 역할 | 명확한 책임 분리 |
| **기록 방식** | Rate만 저장 (Amount 없음) | 환불 시 정확한 재계산 |
| **정산 단위** | Order 기준 | 분할결제 복잡도 회피 |
| **검증 규칙** | Rate 합계 = 1.0 | 데이터 무결성 보장 |
| **Travel 필수** | guide, store, platform | 채널 특성 반영 |

---

## 12. 승인 체크리스트

- [x] Travel 채널 정산 참여자가 명확히 정의됨
- [x] Rate 기반 커미션 모델이 확정됨
- [x] Order 단위 정산 원칙이 확립됨
- [x] H2-0 구현과의 연결점이 명시됨
- [x] 환불 시 처리 규칙이 정의됨
- [x] 의도적으로 하지 않은 것이 문서화됨

---

*Document Version: 1.0*
*Created by: H2-2 Work Order*
*Decision Authority: Platform Architecture*
*Based on: H1-2 Order/Payment Decision*
