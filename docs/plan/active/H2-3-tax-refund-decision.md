# H2-3 Travel Tax Refund 모델 결정서

> **Status**: Decision Finalized
> **Date**: 2025-01-02
> **Work Order**: H2-3
> **Based On**: H1-2 Order/Payment 결정, H2-0 주문 생성, H2-2 커미션 결정

---

## 1. 문제 정의

Travel 채널 주문은 다음 특성을 가집니다:

- 결제 방식이 다양함 (현금/카드/분할결제)
- 환급은 **주문 단위 기준**으로 판단됨
- 환급 시점은 결제 시점과 다를 수 있음
- 외부 시스템(면세/환급사) 연동 가능성 존재

### 결정해야 할 핵심 질문

| 질문 | 왜 지금 결정해야 하는가 |
|------|------------------------|
| 환급 기준 단위는? | Order vs Payment 선택 |
| 저장 위치는? | 엔티티 vs metadata 선택 |
| 금액을 저장하는가? | 환불/정책 변경 대응 |
| 상태 관리는 어떻게? | 외부 연동 대비 |

---

## 2. 핵심 결정 요약 (4대 결정)

| 결정 항목 | 최종 결정 | 근거 |
|----------|----------|------|
| 환급 기준 단위 | **Order 기준** | 분할결제/다중 결제와 분리 |
| 저장 위치 | `Order.metadata.travel.taxRefund` | 엔티티 증가 방지 |
| 금액 저장 여부 | **Amount 저장 안 함** | 환불/정책 변경 재계산 |
| 상태 관리 | **상태 머신 최소화** | 외부 연동 대비 |

---

## 3. 결정 상세

### 3.1 환급 기준 단위: Order 기준

#### 최종 결정: **Payment가 아닌 Order 기준**

| 옵션 | 설명 | 판단 |
|------|------|------|
| **Option A** | Order 기준 환급 | ✅ **채택** |
| Option B | Payment 기준 환급 | ❌ 기각 |

#### 결정 근거

1. **환급 대상은 "구매 내역"**
   - 세금환급은 "무엇을 샀는가" 기준
   - "어떻게 결제했는가"와 무관
   - 카드/현금/분할 모두 동일 환급 대상

2. **분할결제 복잡도 차단**
   - 100,000원을 50,000원씩 2회 결제해도
   - 환급 대상 = 100,000원 (단순)
   - Payment별 환급 시: 추적 복잡

3. **H1-2 결정과 일관성**
   - Tax Refund는 Order.metadata에 저장 (H1-2 확정)
   - Commission도 Order 기준 (H2-2 확정)
   - 정산도 Order 기준

#### 기각 사유 (Payment 기준)

- 분할결제 시 환급 분배 복잡
- Payment 취소 시 환급 재조정 필요
- 결제 방식에 따른 환급 차등 불필요

---

### 3.2 저장 위치: Order.metadata.travel.taxRefund

#### 최종 결정: **별도 엔티티 없이 metadata 사용**

| 옵션 | 설명 | 판단 |
|------|------|------|
| **Option A** | `Order.metadata.travel.taxRefund` | ✅ **채택** |
| Option B | TaxRefund 별도 엔티티 | ❌ 기각 |
| Option C | TaxRefundRequest 엔티티 | ❌ 기각 |

#### 결정 근거

1. **H1-2 결정 준수**
   - H1-2에서 이미 `Order.metadata.travel.taxRefund` 확정
   - 추가 엔티티 불필요

2. **Order와 1:1 관계**
   - 하나의 Order에 하나의 환급 정보
   - 1:N 관계 없음 → 별도 테이블 불필요

3. **조회 성능**
   - Order 조회 시 환급 정보 함께 조회
   - JOIN 없이 단일 쿼리

#### 기각 사유

**Option B (TaxRefund 엔티티)**:
- 1:1 관계에 별도 테이블 과잉
- 마이그레이션 필요
- 조회 시 JOIN 필요

**Option C (TaxRefundRequest 엔티티)**:
- 환급 신청 이력 관리용 (현재 불필요)
- 외부 연동 확정 후 검토 (H3+)

---

### 3.3 금액 저장 여부: Amount 저장 안 함

#### 최종 결정: **Rate만 저장, Amount 저장 안 함**

| 옵션 | 설명 | 판단 |
|------|------|------|
| **Option A** | Rate/비율만 저장 | ✅ **채택** |
| Option B | Amount/금액만 저장 | ❌ 기각 |
| Option C | 둘 다 저장 | ❌ 기각 |

#### 결정 근거

1. **환불 시 정확한 재계산**
   - 부분 환불 시: `환불금액 × estimatedRate`
   - 고정 금액 시: 부분 환불 처리 모호

2. **정책 변경 대응**
   - 환급률 정책 변경 시 재계산 가능
   - 고정 금액은 정책 변경 시 불일치

3. **H2-2 커미션과 일관성**
   - 커미션도 Rate만 저장
   - 금액은 정산 시점에 계산

#### 기각 사유

**Option B (Amount만 저장)**:
- 부분 환불 시 비례 차감 복잡
- 정책 변경 시 동기화 필요

**Option C (둘 다 저장)**:
- 중복 데이터
- 불일치 시 정합성 문제

---

### 3.4 상태 관리: 최소화

#### 최종 결정: **4개 상태로 최소화**

```typescript
type TaxRefundStatus = 'pending' | 'requested' | 'completed' | 'rejected';
```

| 상태 | 설명 |
|------|------|
| `pending` | 환급 대상이지만 신청 전 |
| `requested` | 환급 신청됨 (외부 연동 시) |
| `completed` | 환급 완료 |
| `rejected` | 환급 거부됨 |

#### 결정 근거

1. **외부 연동 대비**
   - 면세점/환급사 연동 시 상태 추적 필요
   - 최소한의 상태로 대응

2. **내부 로직은 eligible 기준**
   - 환급 대상 여부 = `eligible: true`
   - 상태는 추적/표시용

3. **복잡도 최소화**
   - 상태 전이 규칙 단순
   - 예외 상황 최소화

---

## 4. 확정 스키마

### 4.1 TaxRefundMetadata 인터페이스

```typescript
/**
 * H2-3 확정 Tax Refund Metadata Schema
 *
 * 위치: Order.metadata.travel.taxRefund
 * 규칙:
 * - eligible은 필수
 * - amount 필드 없음 (정산 시 계산)
 * - 외부 연동은 reference만
 */
interface TaxRefundMetadata {
  /** 환급 대상 여부 (필수) */
  eligible: boolean;

  /** 환급 방식 (선택) */
  scheme?: 'standard' | 'instant';

  /** 예상 환급 비율 (0~1, 선택) */
  estimatedRate?: number;

  /** 환급 사업자 코드 (선택, 외부 연동 시) */
  provider?: string;

  /** 외부 시스템 참조 ID (선택, 외부 연동 시) */
  referenceId?: string;

  /** 환급 상태 (선택) */
  status?: 'pending' | 'requested' | 'completed' | 'rejected';

  /** 신청 시점 (선택) */
  requestedAt?: string;

  /** 완료 시점 (선택) */
  completedAt?: string;
}
```

### 4.2 스키마 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `eligible` | boolean | **필수** | 환급 대상 여부 |
| `scheme` | string | 선택 | 'standard' (사후) / 'instant' (즉시) |
| `estimatedRate` | number | 선택 | 예상 환급 비율 (예: 0.10 = 10%) |
| `provider` | string | 선택 | 환급 사업자 코드 (외부 연동 시) |
| `referenceId` | string | 선택 | 외부 시스템 참조 ID |
| `status` | string | 선택 | 환급 진행 상태 |
| `requestedAt` | string | 선택 | ISO 8601 형식 |
| `completedAt` | string | 선택 | ISO 8601 형식 |

---

## 5. 예시 시나리오

### 시나리오 A: 환급 대상 주문 (신청 전)

```json
{
  "metadata": {
    "channel": "travel",
    "travel": {
      "guideId": "guide-uuid-123",
      "tourSessionId": "session-uuid-456",
      "taxRefund": {
        "eligible": true,
        "scheme": "standard",
        "estimatedRate": 0.10,
        "status": "pending"
      }
    }
  }
}
```

### 시나리오 B: 즉시 환급 완료

```json
{
  "metadata": {
    "channel": "travel",
    "travel": {
      "guideId": "guide-uuid-123",
      "taxRefund": {
        "eligible": true,
        "scheme": "instant",
        "estimatedRate": 0.08,
        "provider": "KTRS",
        "referenceId": "KTRS-2025-001234",
        "status": "completed",
        "completedAt": "2025-01-02T15:30:00Z"
      }
    }
  }
}
```

### 시나리오 C: 환급 비대상

```json
{
  "metadata": {
    "channel": "travel",
    "travel": {
      "guideId": "guide-uuid-123",
      "taxRefund": {
        "eligible": false
      }
    }
  }
}
```

---

## 6. 설계 원칙

### 원칙 1: 금액은 저장하지 않는다

```typescript
// ❌ 잘못된 방식
taxRefund: {
  eligible: true,
  amount: 10000  // 저장하지 않음
}

// ✅ 올바른 방식
taxRefund: {
  eligible: true,
  estimatedRate: 0.10  // 비율만 저장
}

// 정산 시 계산
const refundAmount = order.totalAmount * taxRefund.estimatedRate;
```

### 원칙 2: Payment와 완전 분리

```
Order (100,000원)
 ├─ Payment 1 (50,000원, 카드)  ← 환급과 무관
 ├─ Payment 2 (50,000원, 현금)  ← 환급과 무관
 └─ TaxRefund (eligible: true)  ← Order 기준
```

### 원칙 3: 외부 연동은 Reference만

```typescript
// ❌ 잘못된 방식 - 외부 데이터 저장
taxRefund: {
  externalResponse: { ... },  // 외부 API 응답 전체 저장
  externalStatus: "APPROVED"
}

// ✅ 올바른 방식 - 참조만 저장
taxRefund: {
  provider: "KTRS",
  referenceId: "KTRS-2025-001234"
}
```

### 원칙 4: 상태 최소화

```typescript
// ❌ 과도한 상태
type Status = 'created' | 'validated' | 'submitted' | 'processing' |
              'approved' | 'rejected' | 'paid' | 'cancelled' | 'expired';

// ✅ 최소 상태
type Status = 'pending' | 'requested' | 'completed' | 'rejected';
```

---

## 7. Order / Payment / Commission / TaxRefund 관계

```
EcommerceOrder
 │
 ├─ OrderItems[] (상품 스냅샷)
 │    └─ productSnapshot: { brandId, brandName, ... }
 │
 ├─ Payments[] (1:N, 분할결제 가능)
 │    └─ amount, method, status, ...
 │
 ├─ metadata.commission (H2-2)
 │    ├─ guide: { participantId, rate }
 │    ├─ store: { participantId, rate }
 │    ├─ partner?: { participantId, rate }
 │    └─ platform: { rate }
 │
 └─ metadata.travel.taxRefund (H2-3)
      ├─ eligible: boolean
      ├─ scheme?: string
      ├─ estimatedRate?: number
      └─ status?: string
```

### 핵심 원칙

- **서로 FK 없음**: Order가 유일한 기준점
- **Commission과 TaxRefund 독립**: 커미션 계산과 환급은 별개
- **Payment와 분리**: 결제 방식과 무관하게 환급 판단

---

## 8. 환급 금액 계산 로직

### 8.1 기본 계산

```typescript
function calculateTaxRefundAmount(order: Order): number {
  const taxRefund = order.metadata.travel?.taxRefund;

  if (!taxRefund?.eligible) {
    return 0;
  }

  const rate = taxRefund.estimatedRate || 0.10; // 기본 10%
  return Math.floor(order.totalAmount * rate);
}
```

### 8.2 부분 환불 시 재계산

```typescript
function calculateRefundedTaxAmount(
  order: Order,
  refundAmount: number
): number {
  const taxRefund = order.metadata.travel?.taxRefund;

  if (!taxRefund?.eligible) {
    return 0;
  }

  const rate = taxRefund.estimatedRate || 0.10;
  return Math.floor(refundAmount * rate);
}
```

---

## 9. 채택/기각 요약

### ✅ 채택

| 항목 | 이유 |
|------|------|
| Order 기준 환급 | 결제 복잡도 차단 |
| metadata 저장 | 엔티티 폭증 방지 |
| Rate 중심 설계 | 정책 변경 안전 |
| 외부 ref만 저장 | 벤더 종속 제거 |
| 상태 최소화 | 복잡도 감소 |

### ❌ 기각

| 기각 항목 | 사유 |
|----------|------|
| TaxRefund 엔티티 생성 | 1:1 관계에 과도한 구조 |
| Payment 기준 환급 | 분할결제 충돌 |
| 환급 금액 고정 저장 | 환불/정책 변경 시 오류 |
| 환급 상태 세분화 | 현재 단계에서 과잉 |

---

## 10. H1/H2 원칙 준수 체크

| 원칙 | 준수 여부 |
|------|----------|
| K-Shopping 동결 | ✅ 준수 (변경 없음) |
| Cosmetics FK 금지 | ✅ 준수 (UUID 참조) |
| Order 단일 Source | ✅ 준수 |
| 엔티티 수 증가 없음 | ✅ 준수 |
| H1-2 스키마 준수 | ✅ 준수 |

---

## 11. 의도적으로 하지 않은 것

### 11.1 이번 결정에서 제외

| 항목 | 사유 | 다음 단계 |
|------|------|----------|
| 환급 신청 UX | UI 구현 단계 | H3+ |
| 환급 지급 로직 | 외부 연동 필요 | H3+ |
| 회계/정산 반영 | 비즈니스 규칙 필요 | 운영 정책 |
| 외부 API 연동 | 사업자 확정 후 | H3+ |
| 환급 신청 이력 | TaxRefundRequest 엔티티 | 필요 시 H3+ |

### 11.2 의도적 단순화

| 단순화 항목 | 이유 |
|------------|------|
| Amount 저장 안 함 | Rate × TotalAmount로 항상 계산 가능 |
| 상태 4개로 제한 | 현재 요구사항에 충분 |
| 외부 데이터 미저장 | 벤더 종속 방지 |

---

## 12. 다음 단계 연결

### 12.1 이제 가능해진 것 (H3+)

- **H3-0**: Travel 주문 + TaxRefund 플래그 구현
- **H3-1**: 환급 대상 주문 필터링 API
- **H3-2**: 외부 환급 시스템 연동 (선택)

### 12.2 조회 쿼리 예시

```sql
-- 환급 대상 주문 조회
SELECT *
FROM ecommerce_orders
WHERE metadata->>'channel' = 'travel'
  AND metadata->'travel'->'taxRefund'->>'eligible' = 'true'
  AND metadata->'travel'->'taxRefund'->>'status' = 'pending';

-- 환급 완료 통계
SELECT
  COUNT(*) as completed_count,
  SUM(total_amount * (metadata->'travel'->'taxRefund'->>'estimatedRate')::numeric) as total_refund
FROM ecommerce_orders
WHERE metadata->'travel'->'taxRefund'->>'status' = 'completed';
```

---

## 13. 최종 결론

> **Tax Refund는 Order의 "속성"이지, Payment의 결과가 아니다.**

이 결정으로 Travel 주문 · 결제 · 커미션 · 환급이 **서로 간섭 없이 공존**할 수 있습니다.

---

## 14. 승인 체크리스트

- [x] 환급 기준 단위가 Order로 확정됨
- [x] metadata.travel.taxRefund 스키마가 확정됨
- [x] Amount 미저장 원칙이 확립됨
- [x] H1-2, H2-2와 일관성 유지됨
- [x] 외부 연동 대비 reference 구조 정의됨
- [x] 의도적으로 하지 않은 것이 문서화됨

---

*Document Version: 1.0*
*Created by: H2-3 Work Order*
*Decision Authority: Platform Architecture*
*Based on: H1-2 Order/Payment Decision, H2-2 Commission Decision*
