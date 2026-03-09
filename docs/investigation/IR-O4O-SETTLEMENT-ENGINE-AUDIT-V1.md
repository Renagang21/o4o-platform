# IR-O4O-SETTLEMENT-ENGINE-AUDIT-V1

> **조사 일자**: 2026-03-09
> **대상**: O4O 플랫폼 전체 정산/수수료/지급 구조
> **조사 방법**: 코드 경로 분석 (Entity, Migration, Service, Route)
> **조사자**: AI

---

## Executive Summary

O4O 플랫폼의 Financial Infrastructure는 **4개 도메인에 분산된 Settlement 구현**이 존재한다.

| 도메인 | 테이블 | Entity | Service | API | 상태 |
|--------|--------|--------|---------|-----|------|
| **Neture** | `neture_settlements` | Raw SQL only | Route 내 인라인 | ✅ 운영중 | **유일한 실동작** |
| **Partner** | `partner_settlements` | `PartnerSettlementBatch` | Placeholder | ⚠️ Stub | Entity만 존재 |
| **Dropshipping** | `settlement_batches` | `SettlementBatch` | 없음 | 없음 | Entity만 존재 |
| **Pharma** | 없음 | `PharmaSettlementBatch` | 없음 | 없음 | Entity만 존재 |

**핵심 발견**: 실제 정산 로직은 **Neture 도메인에만** 존재하며, `neture.routes.ts` 4471-4570행의 인라인 코드로 구현되어 있다. 나머지 3개 도메인은 Entity/Migration만 존재하고 실동작하는 서비스가 없다.

---

## 질문 1: 주문 → 정산 흐름

### Neture (유일한 실동작 흐름)

```
Order Created (status='created')
 ↓
Payment (status='paid')
 ↓
Warehouse Prep (status='preparing')         ← Admin 수동
 ↓
Shipped (status='shipped')                  ← Admin 수동
 ↓
Delivered (status='delivered')              ← Admin 수동 ⭐ 정산 적격
 ↓
Admin Calculate (POST /admin/settlements/calculate)  ← 수동 트리거 ⭐
 ↓
Settlement Record Created (status='calculated')
 ↓
Admin Approve (status='approved')           ← 수동
 ↓
Payout (status='paid')                      ← 수동
```

**핵심 코드**: [neture.routes.ts:4471-4570](apps/api-server/src/modules/neture/neture.routes.ts#L4471-L4570)

```
POST /api/v1/neture/admin/settlements/calculate
  Input: { period_start, period_end }
  1. neture_orders WHERE status='delivered' AND NOT IN neture_settlement_orders
  2. GROUP BY spo.supplier_id → SUM(oi.total_price)
  3. platform_fee = total_sales × 0.10
  4. supplier_amount = total_sales - platform_fee
  5. INSERT neture_settlements + neture_settlement_orders
```

### Checkout (Generic — Phase N-1)

```
Order Created → Payment → PAID
```

**정산 없음**. Checkout 주문은 PAID 이후 lifecycle이 없다.
Shipment/Delivered 상태 자체가 존재하지 않는다.

### 판단

| 항목 | 결과 |
|------|------|
| Settlement 자동 트리거 | ❌ 없음 (수동 Admin API 호출) |
| Event-driven | ❌ 없음 (배치 기반) |
| Cron/스케줄러 | ❌ 없음 |
| Multi-domain 통합 | ❌ 없음 (Neture 전용) |

---

## 질문 2: Commission 구조

### 2.1 Commission 시스템 현황 (4개 독립 구현)

| # | 시스템 | 위치 | 대상 | 상태 |
|---|--------|------|------|------|
| 1 | **CommissionCalculator** | `services/CommissionCalculator.ts` | Dropshipping (legacy Product 기반) | ⚠️ 미연결 |
| 2 | **NETURE_PLATFORM_FEE_RATE** | `neture.routes.ts:3666` | Neture Supplier | ✅ 실동작 |
| 3 | **CommissionRule + CommissionTransaction** | `packages/dropshipping-core/` | Dropshipping | Entity만 |
| 4 | **CommissionPolicy + CommissionEngine** | `packages/cosmetics-partner-extension/` | Cosmetics Partner | Entity만 |
| 5 | **supplier_partner_commissions** | Migration `20260308500000` | Neture Partner referral | ✅ 테이블 존재 |
| 6 | **partner_commissions** | Migration `20260308400000` | Neture Partner | ✅ 테이블 존재 |

### 2.2 Neture Supplier Commission (실동작)

**계산 방식**: 고정 10% Platform Fee

```typescript
// neture.routes.ts:3666
const NETURE_PLATFORM_FEE_RATE = 0.10;

// 계산
platformFee = Math.round(totalSales * feeRate);
supplierAmount = totalSales - platformFee;
```

- Fee Rate은 settlement 레코드에 `platform_fee_rate` 컬럼으로 **스냅샷** 저장
- 상품별/공급자별 차등 수수료 없음 — 전체 10% 고정

### 2.3 CommissionCalculator (Dropshipping Legacy)

**파일**: [CommissionCalculator.ts](apps/api-server/src/services/CommissionCalculator.ts)

```
우선순위:
1. Product-level policy (product.getCommissionPolicy())
2. Seller-level default (businessInfo.defaultCommissionRate)
3. Global default: 20% (GLOBAL_DEFAULT_COMMISSION_RATE)
```

- Rate 타입 (%) 또는 Fixed 타입 (건당 고정금액) 지원
- **문제**: `Product` + `BusinessInfo` 엔티티 기반 — Neture의 `SupplierProductOffer` 와 무관
- **사용처 없음**: import 검색 결과 실제 호출되는 곳이 없음

### 2.4 Partner Commission (테이블만 존재)

**테이블**: `partner_commissions`

| 컬럼 | 설명 |
|------|------|
| `partner_id` | 파트너 ID |
| `supplier_id` | 공급자 ID |
| `order_id` | 주문 ID |
| `contract_id` | 판매자-파트너 계약 참조 |
| `commission_rate` | 수수료율 (5,2) |
| `commission_amount` | 계산된 수수료 |
| `commission_per_unit` | 건당 고정 수수료 |
| `status` | pending → approved → paid |

**Supplier Partner Commission Policy** 테이블: `supplier_partner_commissions`
- 공급자가 상품별 파트너 수수료 정책 설정
- `commission_per_unit` (KRW), `start_date`, `end_date`

**판단**: 테이블 구조는 잘 설계되었으나, 자동 계산 로직(주문 시 commission 레코드 생성)이 없음.

### 2.5 종합 판단

```
Supplier Commission: Neture 10% 고정 (실동작) — 상품별 차등 미지원
Partner Commission:  테이블 존재, 계산/생성 로직 없음
Platform Fee:        Neture에서만 계산 (checkout에는 없음)
```

---

## 질문 3: Settlement Snapshot

### Neture Settlement Snapshot

| 스냅샷 항목 | 저장 여부 | 컬럼 |
|------------|----------|------|
| 총 매출 | ✅ | `total_sales` (INT, KRW) |
| 플랫폼 수수료 | ✅ | `platform_fee` (INT, KRW) |
| 공급자 정산금 | ✅ | `supplier_amount` (INT, KRW) |
| 수수료율 | ✅ | `platform_fee_rate` (NUMERIC 5,4) |
| 주문 수 | ✅ | `order_count` |
| 주문별 매출 | ✅ | `neture_settlement_orders.supplier_sales_amount` |

### 미저장 항목

| 항목 | 저장 여부 | 비고 |
|------|----------|------|
| 할인금액 (discount) | ❌ | Settlement에 할인 개념 없음 |
| 세금 (tax) | ❌ | Tax 계산 없음 |
| 배송비 (shipping) | ❌ | Settlement에 배송비 분리 없음 |
| 상품별 내역 | ❌ | 주문 단위로만 기록 (상품별 breakdown 없음) |
| 파트너 수수료 | ❌ | Partner commission과 Settlement 분리 |

### Checkout Order Snapshot

`checkout_orders` 테이블:
- `subtotal`, `shipping_fee`, `discount`, `total_amount` — **주문 시점에 저장**
- `items` (JSONB): `[{productId, productName, quantity, unitPrice, subtotal}]`
- 그러나 **Commission 스냅샷은 저장하지 않음**

### 판단

```
Price snapshot:      ✅ (주문 시점 저장)
Commission snapshot: ⚠️ (Neture settlement에만, 전체 rate만)
Tax snapshot:        ❌ 없음
Per-item breakdown:  ❌ Settlement 레벨에서 없음
```

---

## 질문 4: Refund 처리

### Checkout Refund Flow

```
POST /api/checkout/refund (admin only)
 → TossPaymentsService.cancelPayment(paymentKey, reason)
 → checkout_payments.status = 'REFUNDED'
 → checkout_orders.status = 'REFUNDED'
```

### Settlement 영향

**환불된 주문은 Settlement에서 자동 제외됨**:
```sql
WHERE o.status = 'delivered'  -- refunded 주문은 포함 안 됨
```

**BUT**: 이미 Settlement이 생성된 후 환불되면?

1. Settlement 레코드는 자동 수정되지 않음
2. Admin이 수동으로:
   - Settlement 취소 (`PATCH /admin/settlements/:id/status`)
   - Settlement 재계산 (`POST /admin/settlements/calculate`)
3. **자동 rollback 없음**

### Partial Refund

- Toss `cancelAmount` 파라미터 존재 (부분 환불 가능)
- 그러나 Settlement에는 부분 환불 반영 로직 없음
- 부분 환불 시 Settlement 금액 불일치 발생 가능

### 판단

```
Full refund before settlement:  ✅ 자동 제외
Full refund after settlement:   ❌ 수동 취소 + 재계산 필요
Partial refund:                 ❌ Settlement 반영 불가
Refund → Commission rollback:   ❌ 없음 (Partner commission과 분리)
```

---

## 질문 5: Ledger vs Summary

### 현재 구조: **Summary 기반**

```
neture_settlements (정산 요약)
 ├── total_sales: 100,000
 ├── platform_fee: 10,000
 ├── supplier_amount: 90,000
 └── neture_settlement_orders (주문-정산 연결)
      ├── order_1: 50,000
      └── order_2: 50,000
```

이것은 **Ledger가 아님**. Ledger는 다음과 같은 형태:

```
// Ledger 형태 (미구현)
settlement_ledger
 ├── CREDIT order_1 sales: +50,000
 ├── DEBIT  order_1 platform_fee: -5,000
 ├── CREDIT order_2 sales: +50,000
 ├── DEBIT  order_2 platform_fee: -5,000
 └── NET BALANCE: 90,000
```

### Dropshipping Core의 SettlementBatch (Entity만 존재)

```
SettlementBatch
 ├── totalAmount (총 주문금액)
 ├── commissionAmount (플랫폼 수수료)
 ├── deductionAmount (환불/취소 차감)
 ├── netAmount (순 정산금)
 └── CommissionTransaction[] (건별 수수료)
```

이것도 **Summary + Transaction 목록** 형태. Ledger는 아님.

### 판단

```
현재 구조:    Summary 기반 (집계 결과 저장)
Ledger 기반:  ❌ 미구현
Double-entry: ❌ 미구현
Audit trail:  ⚠️ 부분적 (주문-정산 연결만)
```

---

## 질문 6: Payout 구조

### 현재 상태

| 항목 | 존재 여부 | 비고 |
|------|----------|------|
| Payout 테이블 | ❌ | 없음 |
| Payout 스케줄 | ❌ | 없음 |
| 계좌 정보 | ⚠️ | `PartnerSettlementBatch.paymentInfo` (JSONB, Entity만) |
| 송금 처리 | ❌ | 자동 송금 없음 |
| 송금 확인 | ❌ | 수동 (Admin이 status를 'paid'로 변경) |

### Neture Settlement Payout

```
Admin 수동 프로세스:
1. GET /admin/settlements (정산 목록 확인)
2. 외부 은행 송금 (수동)
3. PATCH /admin/settlements/:id/status → 'paid'
```

- 자동 payout 연동 없음
- 은행 API 연동 없음
- Payout batch 개념 없음

### Partner Payout (Entity만)

`PartnerSettlementBatch` entity에 다음 필드 존재:
- `paymentDueDate` (지급 예정일)
- `paidAt` (지급일)
- `paymentInfo` (JSONB: method, accountNumber, bankName, reference, transactionId)
- `status`: OPEN → CLOSED → PROCESSING → PAID | FAILED

실제 서비스 로직은 없음.

### 판단

```
Supplier payout: ❌ 수동 (은행 송금 후 status 변경)
Partner payout:  ❌ Entity만 존재, 로직 없음
Auto payout:     ❌ 없음
Payout schedule: ❌ 없음
```

---

## 질문 7: Service별 Settlement 분리

### 현재 상태

| Service | Settlement 테이블 | 분리 방식 |
|---------|------------------|----------|
| Neture | `neture_settlements` | ✅ 전용 테이블 |
| KPA | 없음 | ❌ 정산 자체 없음 |
| Cosmetics | 없음 | ❌ 정산 자체 없음 |
| GlycoPharm | 없음 | ❌ 정산 자체 없음 |
| Dropshipping | `settlement_batches` (Entity만) | ⚠️ 미구현 |
| Pharma | `PharmaSettlementBatch` (Entity만) | ⚠️ 미구현 |
| Partner | `partner_settlements` | ⚠️ 테이블만 존재 |

### Commission 시스템 분리

| Service | Commission 시스템 | 상태 |
|---------|------------------|------|
| Neture Supplier | Platform Fee 10% 고정 | ✅ 실동작 |
| Neture Partner | `partner_commissions` 테이블 | ⚠️ 테이블만 |
| Dropshipping | `CommissionRule` + `CommissionTransaction` | ⚠️ Entity만 |
| Cosmetics Partner | `CommissionPolicy` + `CommissionEngine` | ⚠️ Entity만 |
| Generic | `CommissionCalculator` (Product→Seller→Global 20%) | ⚠️ 미연결 |

### 판단

```
Multi-service Settlement Engine: ❌ 없음
통합 Commission Engine:          ❌ 없음 (4개 독립 구현)
Service-specific Settlement:     ⚠️ Neture만 존재
Cross-service 집계:              ❌ 불가
```

---

## 전체 아키텍처 진단

### Financial Infrastructure Maturity Level

```
Level 0: 코드 없음
Level 1: 테이블/Entity 정의만
Level 2: CRUD API 존재
Level 3: 비즈니스 로직 구현
Level 4: 자동화/스케줄링
Level 5: Ledger + Audit + Reconciliation
```

| 컴포넌트 | 현재 Level | 필요 Level |
|----------|-----------|-----------|
| Neture Supplier Settlement | **Level 3** | Level 4-5 |
| Partner Commission | **Level 1** | Level 3 |
| Partner Settlement | **Level 1** | Level 3 |
| Checkout Payment | **Level 3** | Level 3 |
| Payout | **Level 0** | Level 3 |
| Financial Ledger | **Level 0** | Level 4 |
| Tax/Invoice | **Level 0** | Level 3 |
| Reconciliation | **Level 0** | Level 4 |

---

## 발견된 구조적 이슈

### CRITICAL

| # | 이슈 | 영향 |
|---|------|------|
| C1 | **Settlement Engine이 Route 파일 인라인** | neture.routes.ts에 정산 로직 직접 구현. 재사용/테스트 불가 |
| C2 | **Commission 시스템 4개 분산** | CommissionCalculator, NETURE_PLATFORM_FEE_RATE, CommissionRule, CommissionEngine — 통합 불가 |
| C3 | **Refund → Settlement 자동 반영 없음** | 정산 후 환불 시 수동 재계산 필요. 금액 불일치 위험 |
| C4 | **Payout 시스템 없음** | 수동 은행 송금 + status 변경만. 자동화 기반 없음 |

### HIGH

| # | 이슈 | 영향 |
|---|------|------|
| H1 | **Platform Fee 10% 하드코딩** | 공급자별/상품별 차등 수수료 불가 |
| H2 | **Ledger 부재** | 건별 추적 불가, 감사 증적 부족 |
| H3 | **Per-item financial breakdown 없음** | Settlement이 주문 단위로만 기록. 상품별 정산 불가 |
| H4 | **Tax 처리 없음** | 세금계산서 발행 기반 없음 |

### MEDIUM

| # | 이슈 | 영향 |
|---|------|------|
| M1 | **Settlement Entity 미존재 (Neture)** | Raw SQL로만 동작. TypeORM Repository 패턴 미사용 |
| M2 | **Partner Commission 생성 트리거 없음** | 주문 시 자동 commission 레코드 생성 안 됨 |
| M3 | **Partial refund settlement 미지원** | 부분 환불 시 정산 금액 불일치 |
| M4 | **Checkout → Settlement 경로 없음** | Checkout 주문은 정산 대상 자체가 안 됨 |

---

## 현재 Money Flow 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    NETURE MONEY FLOW (유일한 실동작)              │
└─────────────────────────────────────────────────────────────────┘

Customer ──→ Toss Payment ──→ Platform 수취
                                   │
                              [Admin 수동]
                              POST /admin/settlements/calculate
                                   │
                                   ▼
                          neture_settlements
                         ┌─────────────────┐
                         │ total_sales      │ ← SUM(neture_order_items.total_price)
                         │ platform_fee     │ ← total_sales × 10%
                         │ supplier_amount  │ ← total_sales - platform_fee
                         └────────┬────────┘
                                  │
                             [Admin 수동]
                             은행 송금
                                  │
                                  ▼
                             Supplier 수령


┌─────────────────────────────────────────────────────────────────┐
│               PARTNER COMMISSION FLOW (미완성)                   │
└─────────────────────────────────────────────────────────────────┘

Customer ──→ QR/Link Click ──→ Partner Tracking
                                   │
                              [미구현]
                              Commission 생성 트리거
                                   │
                                   ▼
                         partner_commissions ← 테이블만 존재
                                   │
                              [미구현]
                              Settlement Batch
                                   │
                                   ▼
                         partner_settlements ← 테이블만 존재
                                   │
                              [미구현]
                              Payout
                                   │
                                   ▼
                             Partner 수령


┌─────────────────────────────────────────────────────────────────┐
│                CHECKOUT MONEY FLOW (정산 없음)                   │
└─────────────────────────────────────────────────────────────────┘

Customer ──→ Toss Payment ──→ Platform 수취
                                   │
                              [흐름 끝]
                              정산/Payout 없음
```

---

## 기존 인프라 재사용 가능 목록

### 재사용 가능 (잘 설계됨)

| 항목 | 위치 | 비고 |
|------|------|------|
| `neture_settlements` 테이블 구조 | Migration 20260308100000 | 기간별, 공급자별, 스냅샷 포함 |
| `neture_settlement_orders` 중복방지 | 같은 Migration | UNIQUE(order_id) — 이중 정산 방지 |
| `partner_commissions` 테이블 | Migration 20260308400000 | 계약 참조, 건당/비율 지원 |
| `supplier_partner_commissions` | Migration 20260308500000 | 상품별 파트너 수수료 정책 |
| `partner_settlements` 테이블 | Migration 20260308700000 | Batch + Items 구조 |
| `PartnerSettlementBatch` Entity | packages/partner-core | 상태 머신, paymentInfo JSONB |
| `CommissionPolicy` Entity | packages/cosmetics-partner-extension | 우선순위, 기간, Rate/Fixed |
| `SettlementBatch` Entity | packages/dropshipping-core | 다목적(seller/supplier/extension) |
| `commission.config.ts` | services/ | Rate/Fixed 타입, 계산 함수 |

### 재사용 불가 (교체 필요)

| 항목 | 이유 |
|------|------|
| `CommissionCalculator` | Product/BusinessInfo 기반 — Neture SPO와 불일치 |
| NETURE_PLATFORM_FEE_RATE 상수 | 하드코딩, 공급자별 차등 불가 |
| Settlement 인라인 로직 (neture.routes.ts) | 서비스 분리 필요 |

---

## Settlement Engine Architecture 권고

### Phase 1: Settlement Core 추출 (최소 변경)

```
현재: neture.routes.ts 인라인 코드
목표: SettlementService 클래스 추출

1. NetureSettlementService 생성
   - calculateSettlements(periodStart, periodEnd)
   - approveSettlement(id)
   - cancelSettlement(id)
2. Neture Settlement Entity 생성 (Raw SQL → TypeORM)
3. Route에서 Service 호출로 전환
```

### Phase 2: Commission Engine 통합

```
현재: 4개 독립 Commission 구현
목표: 통합 CommissionEngine

1. Commission 계산 인터페이스 정의
   interface CommissionCalculation {
     calculate(order, policy): CommissionResult
   }
2. Platform Fee 정책을 platform_services 또는 별도 테이블로 이동
3. Partner Commission 자동 생성 트리거 구현
```

### Phase 3: Payout Engine

```
현재: 수동 은행 송금
목표: Payout 스케줄링 + 추적

1. payout_batches 테이블
2. Payout 스케줄 (월별/주별)
3. 은행 API 연동 준비 (수동 확인은 유지)
```

### Phase 4: Financial Ledger (장기)

```
현재: Summary 기반
목표: Ledger 기반

1. settlement_ledger_entries 테이블
2. Double-entry 패턴 (debit/credit)
3. Reconciliation 자동화
```

---

## 즉시 권고 사항

1. **WO-O4O-SETTLEMENT-SERVICE-EXTRACTION-V1**: neture.routes.ts 인라인 정산 로직을 `NetureSettlementService`로 추출. 기존 API 동작 100% 동일하게 유지하면서 서비스 계층 분리.

2. **WO-O4O-COMMISSION-RATE-POLICY-V1**: Platform Fee Rate을 하드코딩에서 `platform_services` 또는 별도 정책 테이블로 이동. 공급자별/상품별 차등 수수료 기반 마련.

3. **WO-O4O-PARTNER-COMMISSION-TRIGGER-V1**: 주문 Delivered 시 `partner_commissions` 레코드 자동 생성. 현재 테이블은 있으나 데이터가 쌓이지 않음.

---

*조사 완료: 2026-03-09*
*Status: Investigation Complete*
