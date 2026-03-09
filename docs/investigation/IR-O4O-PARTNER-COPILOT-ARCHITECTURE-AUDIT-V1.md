# IR-O4O-PARTNER-COPILOT-ARCHITECTURE-AUDIT-V1

> **Investigation Report: Partner Copilot Dashboard 구조 조사**
> Date: 2026-03-09
> Status: Complete
> Scope: Read-only audit (코드 변경 없음)
> Method: Source code static analysis (3개 병렬 조사 수행)

---

## Executive Summary

Partner Copilot Dashboard 구현 전, 현재 Partner 시스템의 **데이터 구조, 추적 체계, 수익 구조, 기존 Copilot 패턴**을 전수 조사하였다.

### 핵심 판정

> **Partner Copilot Dashboard는 즉시 구현 가능하다.**
> 핵심 데이터(커미션, 정산, 레퍼럴 링크)가 모두 운영 중이며,
> Supplier/Operator Copilot 패턴을 그대로 재사용할 수 있다.

| 영역 | 데이터 상태 | Dashboard 활용 가능 |
|------|:----------:|:------------------:|
| Partner 커미션 | ✅ 운영 중 | KPI 집계 가능 |
| 정산 배치 | ✅ 운영 중 | 정산 현황 표시 가능 |
| 레퍼럴 링크 | ✅ 운영 중 | 링크 성과 집계 가능 |
| 클릭 추적 | ⚠️ 프론트 구현만 | DB 저장 없음 (gaps) |
| 상품 홍보 성과 | ⚠️ 부분 | 주문 기반 역추적 가능 |
| AI 인사이트 | ✅ 패턴 존재 | Copilot 패턴 재사용 |

---

## A. Partner 데이터 구조

### A-1. Entity 계층 구조

```
Partner 시스템 (3개 도메인)
│
├── Neture Partner (핵심 - 계약 기반 커미션)
│   ├── NeturePartner              → 파트너 기본 정보 (type: SELLER|SUPPLIER|PARTNER)
│   ├── NeturePartnerRecruitment   → 상품별 파트너 모집 공고
│   ├── NeturePartnerApplication   → 파트너 지원서 (PENDING→APPROVED→REJECTED)
│   ├── NetureSellerPartnerContract → 셀러-파트너 계약 (commission_rate 스냅샷)
│   ├── partner_commissions        → 커미션 기록 (pending→approved→paid)
│   ├── partner_referrals          → 레퍼럴 토큰 (product × partner × store)
│   ├── partner_settlements        → 정산 배치
│   └── partner_settlement_items   → 정산-커미션 연결
│
├── Platform Partner (마케팅 활동)
│   ├── PartnerApplication         → v1 입점 신청서 (상태 없음, 읽기 전용)
│   ├── PartnerContent             → 홍보 콘텐츠 (text|image|link)
│   ├── PartnerEvent               → 캠페인/프로모션 (시간 제한)
│   └── PartnerTarget              → 홍보 대상 (store|region, 시스템 배정)
│
└── Cosmetics Partner Extension (별도 스키마)
    ├── PartnerProfile             → 코스메틱 파트너 계정 (influencer|affiliate|brand-ambassador)
    ├── PartnerLink                → 어필리에이트 링크 (urlSlug, clicks, conversions, earnings)
    ├── PartnerEarnings            → 수익 기록 (CLICK|CONVERSION|SALE 이벤트)
    └── PartnerRoutine             → 코스메틱 루틴 콘텐츠
```

### A-2. 핵심 테이블 상세

#### partner_commissions (커미션 — 핵심 KPI 소스)

```sql
partner_commissions (
  id UUID PRIMARY KEY,
  partner_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  order_id UUID NOT NULL,          -- neture_orders 참조
  order_number VARCHAR(50),
  contract_id UUID NOT NULL,       -- neture_seller_partner_contracts 참조
  commission_rate NUMERIC(5,2),    -- 5.00 = 5%
  order_amount INT,                -- 주문 금액 (원)
  commission_amount INT,           -- 커미션 금액 (원)
  status VARCHAR(30),              -- pending|approved|paid|cancelled
  -- Referral 확장 컬럼 (nullable)
  product_id UUID,
  store_id UUID,
  quantity INT,
  commission_per_unit INT,
  referral_token VARCHAR(20),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(partner_id, order_id) WHERE status != 'cancelled'
)
```

#### partner_referrals (레퍼럴 토큰)

```sql
partner_referrals (
  id UUID PRIMARY KEY,
  partner_id UUID NOT NULL,
  store_id UUID,                   -- nullable
  product_id UUID NOT NULL,
  referral_token VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ
)
```

#### partner_settlements / partner_settlement_items (정산)

```sql
partner_settlements (
  id UUID PRIMARY KEY,
  partner_id UUID NOT NULL,
  total_commission INT DEFAULT 0,
  commission_count INT DEFAULT 0,
  status VARCHAR(30),              -- pending|processing|paid
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
)

partner_settlement_items (
  id UUID PRIMARY KEY,
  settlement_id UUID NOT NULL,
  commission_id UUID NOT NULL UNIQUE,  -- 중복 정산 방지
  commission_amount INT,
  created_at TIMESTAMPTZ
)
```

---

## B. 질문별 조사 결과

### Q1: Partner 링크 성과 데이터는 어디에 저장되는가?

**답:**

| 데이터 | 저장 위치 | 상태 |
|--------|----------|------|
| 레퍼럴 토큰 | `partner_referrals` (referral_token UNIQUE) | ✅ 운영 중 |
| 커미션 실적 | `partner_commissions` (order 연결) | ✅ 운영 중 |
| 코스메틱 링크 클릭/전환 | `cosmetics_partner_links` (totalClicks, conversionCount) | ✅ 운영 중 |
| 링크별 수익 | `cosmetics_partner_earnings` (amount, eventType) | ✅ 운영 중 |

**Copilot KPI 쿼리 가능:**
```sql
-- 파트너 링크 수
SELECT COUNT(*) FROM partner_referrals WHERE partner_id = $1;

-- 커미션 집계
SELECT
  COUNT(*)::int AS total_commissions,
  SUM(commission_amount)::int AS total_amount,
  SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END)::int AS pending,
  SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END)::int AS paid
FROM partner_commissions
WHERE partner_id = $1 AND status != 'cancelled';
```

---

### Q2: 링크 클릭 / QR 스캔 데이터는 어디에 있는가?

**답:**

| 추적 유형 | 구현 상태 | 저장 위치 |
|----------|:--------:|----------|
| QR 스캔 | ✅ 운영 중 | `store_qr_scan_events` (organizationId, qrCodeId, deviceType) |
| 레퍼럴 클릭 (프론트) | ⚠️ 코드만 존재 | `partnerTrackingUtils.ts` → `POST /api/v1/partner/track-click` |
| 레퍼럴 클릭 (백엔드) | ❌ 미구현 | API 엔드포인트 존재하나 DB 저장 로직 없음 |
| 세션 토큰 | ✅ 프론트 | `sessionStorage` (neture_referral_token) |
| 쿠키 추적 | ✅ 코드 | `referralCookie` (30일, code + source + timestamp) |

**Gap:** 클릭 추적 데이터가 DB에 저장되지 않음 → Copilot에서 "클릭 수" KPI 불가 (현재)

**대안:** `partner_commissions` 기반 역추적으로 "주문 전환" KPI는 가능

---

### Q3: Partner → Product 관계는 어떻게 구성되어 있는가?

**답:**

```
Partner → Product 관계 체인:

NeturePartnerRecruitment (모집 공고)
  productId → product_masters.id
  sellerId → neture_partners.id (SELLER)
  commissionRate → 커미션 비율
  status: recruiting | closed
        ↓ (파트너 지원)
NeturePartnerApplication
  recruitmentId → 모집 공고
  partnerId → 파트너 ID
  status: PENDING → APPROVED
        ↓ (승인 시)
NetureSellerPartnerContract
  recruitmentId → 모집 공고
  partnerId, sellerId → 계약 당사자
  commissionRate → 스냅샷 (불변)
  contractStatus: active | terminated | expired
        ↓ (레퍼럴 링크 생성)
partner_referrals
  partner_id → 파트너
  product_id → 상품 (supplier_product_offers)
  store_id → 매장 (nullable)
  referral_token → 고유 토큰
```

**Copilot 활용:** 파트너별 계약 상품 목록 + 상품별 커미션 실적 조회 가능

---

### Q4: Partner → Store 연결 구조는 무엇인가?

**답:**

| 연결 경로 | 방식 | 상태 |
|----------|------|:----:|
| `partner_referrals.store_id` | 레퍼럴 생성 시 매장 연결 | ✅ nullable |
| `partner_commissions.store_id` | 커미션 기록에 매장 | ⚠️ nullable (미연결 가능) |
| Contract → Recruitment → Product → Listing → Organization | 간접 연결 | ✅ 쿼리 가능 |

**현재 구조:** Partner ↔ Store 직접 연결 테이블 없음. 상품/주문 기반 간접 연결.

**Copilot 활용 쿼리:**
```sql
-- 파트너가 활동하는 매장 목록 (주문 기반)
SELECT DISTINCT
  o.store_name, o.store_id,
  COUNT(pc.id)::int AS commission_count,
  SUM(pc.commission_amount)::int AS total_earned
FROM partner_commissions pc
JOIN neture_orders o ON o.id = pc.order_id
WHERE pc.partner_id = $1 AND pc.status != 'cancelled'
GROUP BY o.store_name, o.store_id;
```

---

### Q5: Partner 수익 데이터는 어디에 있는가?

**답:**

| 수익 유형 | 테이블 | 계산 방식 |
|----------|--------|----------|
| 계약 기반 커미션 | `partner_commissions` | `order_amount × commission_rate / 100` |
| 단위당 커미션 | `partner_commissions` | `quantity × commission_per_unit` |
| 정산 배치 | `partner_settlements` | approved 커미션 합산 |
| 코스메틱 수익 | `cosmetics_partner_earnings` | 이벤트별 (CLICK/CONVERSION/SALE) |

**CommissionEngine (통합 계산):**
```typescript
// packages/financial-core/src/commission-engine.ts
calculate(input) {
  platformFee = totalPrice × platformFeeRate (10%)
  partnerCommission = totalPrice × contractCommissionRate / 100
                   OR quantity × commissionPerUnit
  supplierAmount = totalPrice - platformFee - partnerCommission
}
```

---

## C. 기존 Copilot 패턴 분석

### C-1. Supplier Copilot (참조 구현)

**파일:**
- `apps/api-server/src/modules/neture/controllers/supplier-copilot.controller.ts`
- `apps/api-server/src/modules/neture/services/supplier-copilot.service.ts`

**엔드포인트 구조:**

| Endpoint | 데이터 | 쿼리 패턴 |
|----------|--------|----------|
| `GET /copilot/kpi` | registeredProducts, activeProducts, storeListings, recentOrders | COUNT + FILTER |
| `GET /copilot/products/performance` | productName, orders, revenue, qrScans | JOIN + GROUP BY + ORDER BY revenue DESC |
| `GET /copilot/distribution` | productName, storeCount, newStores | COUNT stores per product |
| `GET /copilot/products/trending` | currentOrders, previousOrders, growthRate | CTE (주간 비교) |

### C-2. Operator Copilot (참조 구현)

**파일:**
- `apps/api-server/src/modules/operator/operator-copilot.controller.ts`
- `apps/api-server/src/modules/operator/operator-copilot.service.ts`

**엔드포인트 구조:**

| Endpoint | 데이터 |
|----------|--------|
| `GET /copilot/kpi` | totalStores, totalSuppliers, totalProducts, recentOrders |
| `GET /copilot/stores` | 매장 목록 + 상태 |
| `GET /copilot/suppliers` | 공급자 목록 + 상태 |
| `GET /copilot/products` | 상품 목록 + 성과 |
| `GET /copilot/trends` | 주문 증감, 매장/공급자 성장 |
| `GET /copilot/alerts` | 조건 기반 경고 (가입 대기, 비활성 상품, 주문 없음) |
| `GET /copilot/ai-summary` | AI Core → rule-based fallback |

### C-3. Copilot 공통 패턴

```typescript
// Controller 구조
router.get('/copilot/kpi', authenticate, async (req, res) => {
  const result = await service.getKpi(userId);
  res.json({ success: true, data: result });
});

// Service 구조
async getKpi(partnerId: string) {
  const [commissions] = await this.dataSource.query(`...`, [partnerId]);
  return { totalCommission, pendingAmount, paidAmount, linkCount };
}

// AI Insight 패턴
async getAiSummary(partnerId: string) {
  try {
    const { runAIInsight } = await import('@o4o/ai-core');
    return await runAIInsight({ contextData: kpiData });
  } catch {
    return buildRuleBasedSummary(kpiData); // fallback
  }
}
```

---

## D. Partner Copilot Dashboard KPI 정의

### D-1. 즉시 구현 가능한 KPI (데이터 존재)

| KPI | 소스 테이블 | 쿼리 |
|-----|-----------|------|
| **총 커미션 금액** | `partner_commissions` | `SUM(commission_amount) WHERE status != 'cancelled'` |
| **대기 커미션** | `partner_commissions` | `SUM(...) WHERE status = 'pending'` |
| **승인 커미션** | `partner_commissions` | `SUM(...) WHERE status = 'approved'` |
| **지급 완료** | `partner_commissions` | `SUM(...) WHERE status = 'paid'` |
| **활성 계약 수** | `neture_seller_partner_contracts` | `COUNT(*) WHERE contract_status = 'active'` |
| **생성 링크 수** | `partner_referrals` | `COUNT(*) WHERE partner_id = $1` |
| **주문 기여 수** | `partner_commissions` | `COUNT(DISTINCT order_id)` |
| **상품별 성과** | `partner_commissions` JOIN `supplier_product_offers` | GROUP BY product |
| **정산 현황** | `partner_settlements` | 배치별 금액/상태 |
| **최근 커미션 트렌드** | `partner_commissions` | 주간/월간 비교 CTE |

### D-2. 추가 개발 필요한 KPI

| KPI | 부족한 데이터 | 필요 작업 |
|-----|-------------|----------|
| **클릭 수** | 클릭 이벤트 DB 미저장 | `partner_click_events` 테이블 + API 구현 |
| **전환율** | 클릭→주문 연결 없음 | 클릭 추적 + 전환 매핑 |
| **매장별 매출 기여** | `store_id` nullable | 주문에서 매장 역추적 가능 (간접) |

### D-3. Dashboard 블록 구성

```
Partner Copilot Dashboard
│
├── [Block 1] KPI 요약
│   ├── 총 커미션 / 대기 / 지급 완료
│   ├── 활성 계약 수
│   └── 생성 링크 수
│
├── [Block 2] 상품별 성과 (Performance)
│   ├── 상품명, 주문 수, 매출 기여, 커미션 금액
│   └── 정렬: 커미션 금액 DESC
│
├── [Block 3] 커미션 트렌드 (Trends)
│   ├── 이번 주 vs 지난 주 커미션
│   ├── 이번 달 vs 지난 달 커미션
│   └── 성장률 (%)
│
├── [Block 4] 알림 (Alerts)
│   ├── 승인 대기 커미션 N건
│   ├── 만료 예정 계약 N건
│   ├── 정산 대기 N건
│   └── 새 모집 공고 N건
│
├── [Block 5] AI 인사이트
│   ├── AI Core 연동 (Gemini Flash)
│   └── Rule-based fallback
│
└── [Block 6] 추천 전략 (Optional)
    ├── 성과 좋은 상품 추천
    └── 새로운 모집 공고 추천
```

---

## E. 기존 Partner 프론트엔드 현황

### E-1. 운영 중인 페이지

| 페이지 | 경로 | API 연동 | 상태 |
|--------|------|:--------:|:----:|
| PartnerOverviewPage | `/partner` | ✅ Full | **운영 중** |
| PartnerHubDashboardPage | `/partner/dashboard` | ✅ Full | **운영 중** |
| ProductPoolPage | `/partner/products` | ✅ Full | **운영 중** |
| ReferralLinksPage | `/partner/links` | ✅ Full | **운영 중** |
| SettlementsPage | `/partner/settlements` | ✅ Full | **운영 중** |
| PartnerSettlementBatchPage | `/partner/settlement-batches` | ✅ Full | **운영 중** |
| RecruitingProductsPage | `/partner/recruiting-products` | ✅ Partial | **운영 중** |
| AdminPartnerMonitoringPage | `/admin/partners` | ✅ Full | **운영 중** |
| AdminPartnerDetailPage | `/admin/partners/:id` | ✅ Full | **운영 중** |

### E-2. 플레이스홀더 페이지

| 페이지 | 상태 | 비고 |
|--------|:----:|------|
| CollaborationPage | ⬜ Mock | 공급자 연결 (빈 배열) |
| PromotionsPage | ⬜ Mock | 캠페인 상태 (빈 배열) |
| PartnerContentsPage | ⬜ Mock | 콘텐츠 관리 (레거시) |
| PartnerStoresPage | ⬜ Mock | 매장 네트워크 (레거시) |
| PartnerAccountDashboardPage | ⬜ Mock | 개인 대시보드 (레거시) |

### E-3. API 클라이언트 현황

```typescript
// services/web-neture/src/lib/api/partner.ts

recruitingApi          → GET /neture/partner/recruiting-products
partnerDashboardApi    → CRUD /neture/partner/dashboard/items (콘텐츠 링크 관리)
partnerAffiliateApi    → GET/POST /neture/partner/product-pool, /referral-links
partnerCommissionApi   → GET /neture/partner/commissions, /commissions/kpi
partnerSettlementApi   → GET /neture/partner/settlements
```

---

## F. 데이터 관계 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARTNER COPILOT DATA FLOW                     │
└─────────────────────────────────────────────────────────────────┘

  [Seller]                          [Partner]
     │                                  │
     ▼                                  ▼
  NeturePartnerRecruitment ◄────── NeturePartnerApplication
  (상품, 커미션율, 모집 상태)        (지원, 승인/거절)
     │                                  │
     └────────────┬─────────────────────┘
                  ▼
     NetureSellerPartnerContract
     (활성 계약, commission_rate 스냅샷)
                  │
                  ▼
     partner_referrals
     (referral_token, product_id, store_id)
                  │
                  ▼
     [고객 클릭: ?ref=TOKEN]
                  │
                  ▼
     neture_orders (주문 생성)
                  │
                  ▼ (배송 완료 시 자동)
     partner_commissions
     (order_id, commission_rate, commission_amount)
     status: pending → approved → paid
                  │
                  ▼
     partner_settlements (정산 배치)
     partner_settlement_items (중복 방지)
```

---

## G. Partner Copilot 구현 전략

### G-1. Copilot 패턴 적용

Supplier Copilot / Operator Copilot과 동일한 패턴:

```
파일 구조:
  apps/api-server/src/modules/neture/controllers/partner-copilot.controller.ts
  apps/api-server/src/modules/neture/services/partner-copilot.service.ts

엔드포인트:
  GET /api/v1/neture/partner/copilot/kpi
  GET /api/v1/neture/partner/copilot/products/performance
  GET /api/v1/neture/partner/copilot/trends
  GET /api/v1/neture/partner/copilot/alerts
  GET /api/v1/neture/partner/copilot/ai-summary
```

### G-2. 기존 코드 재사용

| 구성요소 | 재사용 대상 | 비고 |
|---------|-----------|------|
| Controller 구조 | supplier-copilot.controller.ts | 동일 패턴 |
| KPI 집계 | partner-commission.service.ts `getPartnerKpi()` | 이미 구현됨 |
| 커미션 목록 | partner-commission.service.ts `getPartnerCommissions()` | 이미 구현됨 |
| AI Insight | operator-copilot.service.ts `getAiSummary()` | 패턴 재사용 |
| Alert 로직 | operator-copilot.service.ts `getAlerts()` | 조건 변경만 |

### G-3. 신규 구현 필요

| 구성요소 | 내용 |
|---------|------|
| **상품별 성과 쿼리** | partner_commissions JOIN 상품 정보 → GROUP BY product |
| **트렌드 비교** | CTE 기반 주간/월간 커미션 비교 |
| **파트너 Alert** | 만료 예정 계약, 승인 대기 커미션, 새 모집 공고 |
| **프론트엔드 페이지** | PartnerCopilotDashboardPage (Neture web) |

---

## H. 부족한 데이터 (Gaps)

| Gap | 현재 상태 | 영향 | 해결 방안 |
|-----|----------|------|----------|
| **클릭 추적** | 프론트 코드만 존재, DB 미저장 | "클릭 수" KPI 불가 | `partner_click_events` 테이블 + API |
| **전환율** | 클릭→주문 매핑 없음 | 전환율 계산 불가 | referral_token 기반 매핑 |
| **매장 귀속** | `store_id` nullable | 매장별 매출 불완전 | 주문의 store 정보로 역추적 |

**판정:** 이 Gap들은 Copilot v1에서 필수가 아니다. 커미션/정산/계약 데이터만으로 유의미한 Dashboard 구성 가능.

---

## I. 결론

### I-1. Partner Copilot Dashboard 구현 가능 여부

**즉시 구현 가능.** 핵심 데이터 인프라가 모두 운영 중이다.

### I-2. 구현 우선순위

| 순위 | 블록 | 데이터 소스 | 난이도 |
|:----:|------|-----------|:------:|
| 1 | KPI 요약 | partner_commissions | Low |
| 2 | 상품별 성과 | partner_commissions + products | Low |
| 3 | 알림 | contracts + commissions + recruitments | Medium |
| 4 | 커미션 트렌드 | partner_commissions (CTE) | Medium |
| 5 | AI 인사이트 | AI Core + fallback | Medium |

### I-3. Frozen Baseline 영향

- **F7 (Neture Partner Contract):** 계약 테이블/ENUM 변경 없음 → **충돌 없음**
- **F8 (Distribution Engine):** 유통 구조 변경 없음 → **충돌 없음**
- 신규 테이블/컬럼 추가 없음 (기존 데이터 읽기 전용)

### I-4. 후속 WO 제안

```
WO-O4O-PARTNER-COPILOT-DASHBOARD-V1
  Scope: partner-copilot.controller.ts + service.ts + 프론트엔드 페이지
  데이터: partner_commissions, partner_referrals, contracts, recruitments
  패턴: Supplier/Operator Copilot 동일 구조
  예상 작업량: Controller + Service + 1 페이지 (기존 패턴 재사용)
```

---

*Investigation Complete: 2026-03-09*
*Files Analyzed: 30+ across 3 domains*
*Data Tables Confirmed: 6 (all operational)*
*Copilot Reference Implementations: 2 (Supplier, Operator)*
