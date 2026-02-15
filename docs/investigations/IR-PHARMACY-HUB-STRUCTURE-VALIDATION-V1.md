# IR-PHARMACY-HUB-STRUCTURE-VALIDATION-V1

> **Investigation Report**: 약국 매장 허브 구현 검증
> **Status**: COMPLETE
> **Date**: 2026-02-15
> **Code Modification**: FORBIDDEN (읽기 전용 검증)

---

## 최종 보고

### 1. 구조 일치 여부: **OK (부분 불일치 2건)**

전체적으로 "소유형 채널 기반 매장 허브" 설계와 **1:1로 일치**한다.
단, 하위 2건의 부분 불일치가 발견되었다 (Phase C 참조).

### 2. 발견된 구조적 위험 요소: **2건**

| # | 위험 요소 | 심각도 | 위치 |
|---|----------|--------|------|
| 1 | 채널 필터 미적용 (cosmetic-only) | **Medium** | PharmacySellPage.tsx L387 |
| 2 | KPI 쿼리에 listing is_active 미검증 | **Low** | store-hub.controller.ts L283 |

### 3. KPI 계산 정확성 여부: **조건부 정확**

- `visibleProductCount`: `is_active = true` 필터 → **정확**
- `totalProductCount`: `COUNT(*)` 전체 → **조건부 정확** (비활성 listing 포함 가능)
- `salesLimitConfiguredCount`: `sales_limit IS NOT NULL` → **정확**

### 4. Core 침범 여부: **없음** ✅

- checkoutService 호출: **없음**
- OrderType 신규 등록: **없음**
- `*_orders` / `*_payments` 테이블: **없음**
- createOrder() 직접 호출: **없음**
- PaymentEventHub 사용: **없음**
- CLAUDE.md §7, §13 완벽 준수

### 5. 향후 Core 연결 시 예상 충돌 지점: **2건**

| # | 충돌 지점 | 설명 |
|---|----------|------|
| 1 | `sellerId` 매핑 | 약국 org ID → `EcommerceOrder.sellerId` 시, `organization_channels` 승인 상태 검증 로직 필요 |
| 2 | `channel` 필드 의미 충돌 | `EcommerceOrder.channel`('local','travel')과 `organization_channels.channel_type`('B2C','KIOSK')은 스코프가 다름 — `metadata.channelType` 활용 권장 |

### 6. 우선 수정 권고사항: **2건**

| 우선순위 | 항목 | 설명 |
|----------|------|------|
| P2 | 채널 필터 실제 적용 | `channelFilter` 상태를 listings 렌더링에 반영하거나, 필터 UI 제거 |
| P3 | KPI 쿼리 listing 조인 | `organization_product_listings.is_active` 검증 추가 (비활성 listing 제외) |

---

## Phase A — 라우트 및 화면 구조 검증

### A-1. /pharmacy 게이트 흐름 ✅

```
미로그인 사용자
  → PharmacyPage: "로그인이 필요합니다" 표시          ✅ 확인

관리자/운영자 (admin/operator)
  → PharmacyPage: "약사 전용 서비스" 접근 불가 안내     ✅ 확인

일반 약사 (pharmacistRole ≠ pharmacy_owner)
  → PharmacyPage: 약국 개설 안내 + FunctionGateModal    ✅ 확인

pharmacy_owner (미승인)
  → PharmacyApprovalGatePage: 신청 폼 표시             ✅ 확인
  → 중복 신청 시 409 처리                              ✅ 확인

pharmacy_owner (승인완료)
  → /pharmacy/hub 이동                                 ✅ 확인
  → ContextGuard(pharmacy) 적용                        ✅ 확인
```

**판정**: 게이트 흐름 **완전 구현** ✅

### A-2. 라우트 구조 트리 ✅

```
/pharmacy                    → PharmacyPage (게이트)
/pharmacy/hub                → PharmacyDashboardPage (메인 허브)
/pharmacy/dashboard          → Redirect → /pharmacy/hub (레거시 호환)
/pharmacy/approval           → PharmacyApprovalGatePage (서비스 가입 신청)
/pharmacy/sell               → PharmacySellPage (상품 판매 관리)
/pharmacy/store              → PharmacyStorePage (매장 관리)
/pharmacy/store-hub          → StoreHubPage (통합 매장 허브)
/pharmacy/services           → PharmacyServicesPage (서비스 탐색)
/pharmacy/b2b                → PharmacyB2BPage (B2B 발주)
/pharmacy/b2b/suppliers      → SupplierListPage (공급업체 목록)
/pharmacy/b2b/suppliers/:id  → SupplierDetailPage (공급업체 상세)
```

**판정**: 11개 라우트 정상 등록, 충돌 없음 ✅

### A-3. 허브 화면 구성 순서 ✅

```
PharmacyDashboardPage
├── Header (약국 운영 허브, 조직명)
├── 0. ChannelLayerSection         ← ✅ 최상단 배치 확인 (L45)
├── 1. StoreOverviewSection        (L48)
├── 2. StoreManagementSection      (L51)
├── 3. ActiveServicesSection       (L54)
├── 4. QuickActionsSection         (L57)
├── 5. MyRequestsSection           (L58)
└── 6. RecommendedServicesSection  (L61)
```

**판정**: ChannelLayerSection **최상단 배치 확인** ✅

---

## Phase B — 채널 소유 구조 검증 (DB + API)

### B-1. organization_channels 구조 ✅

| 항목 | 검증 결과 |
|------|----------|
| ENUM `organization_channel_type` | ✅ `B2C, KIOSK, TABLET, SIGNAGE` |
| ENUM `organization_channel_status` | ✅ `PENDING, APPROVED, REJECTED, SUSPENDED, EXPIRED, TERMINATED` |
| UNIQUE (organization_id, channel_type) | ✅ `UQ_org_channel_type` 존재 |
| FK → kpa_organizations | ✅ ON DELETE RESTRICT, ON UPDATE CASCADE |
| INDEX organization_id | ✅ `IDX_org_channel_org_id` |
| status DEFAULT 'PENDING' | ✅ |
| Entity 매핑 | ✅ 완전 일치, string-based relations (CLAUDE.md §4 준수) |

### B-2. organization_product_channels 구조 ✅

| 항목 | 검증 결과 |
|------|----------|
| FK channel_id → organization_channels | ✅ ON DELETE CASCADE |
| FK product_listing_id → organization_product_listings | ✅ ON DELETE CASCADE |
| UNIQUE (channel_id, product_listing_id) | ✅ `UQ_channel_product` |
| `is_active` (BOOLEAN, default true) | ✅ |
| `display_order` (INTEGER, default 0) | ✅ |
| `channel_price` (INTEGER, nullable) | ✅ |
| `sales_limit` (INTEGER, nullable) | ✅ Migration 200004로 추가 |
| 복합 INDEX (channel_id, is_active) | ✅ KPI 쿼리 최적화 |
| Entity 매핑 | ✅ 완전 일치 |

### B-3. API 검증: GET /store-hub/channels ✅

**SQL 쿼리 구조**:
```sql
SELECT oc.*, COALESCE(stats.visible_count, 0)::int AS "visibleProductCount", ...
FROM organization_channels oc
LEFT JOIN (
  SELECT channel_id,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE is_active = true) AS visible_count,
    COUNT(*) FILTER (WHERE sales_limit IS NOT NULL) AS limit_count
  FROM organization_product_channels GROUP BY channel_id
) stats ON stats.channel_id = oc.id
WHERE oc.organization_id = $1
```

| KPI 필드 | 계산 방식 | 정확성 |
|----------|----------|--------|
| `visibleProductCount` | `FILTER (WHERE is_active = true)` | ✅ |
| `totalProductCount` | `COUNT(*)` | ⚠️ listing의 is_active 미검증 |
| `salesLimitConfiguredCount` | `FILTER (WHERE sales_limit IS NOT NULL)` | ✅ |

**판정**: DB 구조 **완전 일치**, API KPI **조건부 정확** ✅

---

## Phase C — 상품-채널 종속성 검증

### C-1. /pharmacy/sell 구조

| 항목 | 상태 | 상세 |
|------|------|------|
| 채널 필터 칩 (ALL, B2C, KIOSK, TABLET, SIGNAGE) | ✅ 존재 | L351-368 |
| 비승인 채널 disabled | ✅ | `disabled={ch.status !== 'APPROVED'}` |
| 채널 설정 패널 (per listing) | ✅ | ChannelSettingsPanel 컴포넌트 |
| 노출 토글 (isVisible) | ✅ | checkbox L625-633 |
| 판매 한도 (salesLimit) | ✅ | input L635-654, ≤0 방지 |
| 정렬 순서 (displayOrder) | ✅ | number input L656-675 |
| 비승인 채널 안내 텍스트 | ✅ | "채널 승인 후 설정 가능합니다" L619 |
| 비노출 시 입력 비활성화 | ✅ | `disabled={!ch.isVisible}` L643, L663 |
| Dirty 상태 추적 + 저장 | ✅ | dirty flag, L699-714 |

### C-2. 숫자 일관성

#### ⚠️ 발견 사항 1: 채널 필터 미적용

```
channelFilter 상태 변경 → setChannelFilter(ch.channelType)  ✅ 작동
listings 렌더링 → listings.map(listing => ...)              ❌ 필터 미적용
```

**문제**: `channelFilter` 값이 변경되지만, 실제 `listings.map()` (L387)에서
해당 필터를 사용하여 목록을 걸러내지 않는다. **모든 listing이 항상 표시됨.**

**영향**: 사용자가 채널 필터를 클릭해도 상품 목록이 변하지 않음.

#### ⚠️ 발견 사항 2: KPI 수치 불일치 가능성

```
ChannelLayerSection.visibleProductCount
  = organization_product_channels WHERE is_active = true (채널-상품 매핑 기준)

PharmacySellPage 상품 수
  = organization_product_listings 전체 (채널 필터 미적용이므로 전체 listing 수)
```

**시나리오**: listing 5개 중 3개만 B2C 채널에 is_active=true로 매핑
→ ChannelLayerSection에 "상품 **3** / 5" 표시
→ Sell 페이지에는 5개 전부 표시 (필터 미작동)
→ 사용자 혼란 가능

### C-3. Frontend API 타입 일치 ✅

| Interface | Server 응답 | 일치 |
|-----------|------------|------|
| `ChannelOverview.visibleProductCount` | `"visibleProductCount"` | ✅ |
| `ChannelOverview.totalProductCount` | `"totalProductCount"` | ✅ |
| `ChannelOverview.salesLimitConfiguredCount` | `"salesLimitConfiguredCount"` | ✅ |
| `ListingChannelSetting.isVisible` | `COALESCE(opc.is_active, false) AS "isVisible"` | ✅ |
| `ListingChannelSetting.salesLimit` | `opc.sales_limit AS "salesLimit"` | ✅ |
| `ListingChannelSetting.displayOrder` | `opc.display_order AS "displayOrder"` | ✅ |

**판정**: 타입 계약 **완전 일치** ✅

---

## Phase D — Core 침범 여부 검증

### 전체 결과: **Core 침범 없음** ✅ / **헌법 위반 없음** ✅

| Check | 대상 | 결과 |
|-------|------|------|
| 1 | checkoutService 호출 | **없음** ✅ |
| 2 | OrderType 신규 등록 | **없음** ✅ (기존 6개 유지) |
| 3 | `*_orders` / `*_payments` 테이블 | **없음** ✅ |
| 4 | createOrder() 직접 호출 | **없음** ✅ |
| 5 | PaymentEventHub 사용 | **없음** ✅ |

### 신규 테이블 목록 (모두 합법)

| 테이블 | 목적 | 주문/결제 관련? |
|--------|------|----------------|
| `organization_channels` | 채널 관리 | ❌ 아님 |
| `organization_product_channels` | 상품-채널 매핑 | ❌ 아님 |
| `organization_product_applications` | 상품 신청 | ❌ 아님 |
| `organization_product_listings` | 상품 진열 | ❌ 아님 |

### CLAUDE.md 준수 확인

| 규칙 | 상태 |
|------|------|
| §4 ESM Entity Rules | ✅ string-based relations 사용 |
| §7 E-commerce Core 절대 규칙 | ✅ 주문 기능 자체 없음 |
| §13 O4O Store & Order Guardrails | ✅ 금지 테이블 미생성 |
| §17 KPA Society 구조 기준 | ✅ 분회 서비스 라우트 내 구현 |

---

## Phase E — UX 흐름 검증 (Owner 시나리오)

### 시나리오 추적

```
1. 약국 개설자 → /pharmacy 진입
   → PharmacyPage 게이트: pharmacistRole=pharmacy_owner 확인
   → ContextGuard: pharmacy context 설정
   → /pharmacy/hub 이동
   ✅ 자연스러움

2. 허브에서 채널 상태 확인
   → ChannelLayerSection (최상단)
   → 채널 카드 4개 (B2C, KIOSK, TABLET, SIGNAGE)
   → 승인 상태 배지 (승인됨/대기중/거부됨...)
   → 경고 배너: "승인된 채널이 없습니다" 또는 "대기 중 N개"
   ✅ 직관적

3. 상품 노출 설정
   → 채널 카드 클릭 → /pharmacy/sell?channel=B2C
   → PharmacySellPage 내 "내 매장 진열 상품" 탭
   → 상품별 "채널 설정" 버튼 클릭 → ChannelSettingsPanel 확장
   → 채널별 노출 토글, 판매 한도, 정렬 설정
   → "채널 설정 저장" 클릭
   ✅ 논리적 (단, 필터 미적용 주의)

4. KPI 확인
   → 허브 ChannelLayerSection에서 "상품 3 / 5 활성" 표시
   → salesLimitConfiguredCount > 0이면 "한도 설정: N개" 표시
   → 상단 "N/M 활성" 채널 카운트
   ✅ 정보량 적절

5. 채널 필터 사용
   → /pharmacy/sell에서 필터 칩 클릭 (B2C, KIOSK 등)
   → ⚠️ 목록은 변하지 않음 (필터 미적용)
   → 사용자 기대와 불일치 가능
   ⚠️ UX 갭 존재
```

### UX 흐름 평가

| 단계 | 자연스러움 | 비고 |
|------|-----------|------|
| 1. 허브 진입 | ✅ 자연스러움 | 게이트 → 허브 흐름 명확 |
| 2. 채널 상태 확인 | ✅ 자연스러움 | 최상단 배치, 상태 시각화 우수 |
| 3. 상품 노출 설정 | ✅ 자연스러움 | 채널 카드 → sell 페이지 → 패널 확장 |
| 4. KPI 확인 | ✅ 자연스러움 | visible/total 비율 직관적 |
| 5. 채널 필터 사용 | ⚠️ 부자연스러움 | 필터 클릭해도 목록 불변 |

**전체 UX 판정**: **양호** (5단계 중 4단계 자연스러움, 1단계 개선 필요)

---

## 종합 판정

```
┌──────────────────────────────────────────────────────────┐
│                    검증 결과 종합                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Phase A  라우트/화면 구조        ✅ OK                   │
│  Phase B  채널 소유 구조 (DB+API)  ✅ OK                   │
│  Phase C  상품-채널 종속성         ⚠️ 부분 불일치 2건       │
│  Phase D  Core 침범 여부          ✅ 침범 없음             │
│  Phase E  UX 흐름                 ✅ 양호 (1건 개선 필요)   │
│                                                          │
│  Core 침범:    없음  ✅                                   │
│  헌법 위반:    없음  ✅                                   │
│  KPI 정확성:   조건부 정확  ⚠️                            │
│                                                          │
│  전체 판정:    OK (부분 불일치 2건)                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 발견된 불일치 상세

#### 불일치 #1: 채널 필터 미적용 (P2)

- **위치**: [PharmacySellPage.tsx:387](services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx#L387)
- **현상**: `channelFilter` 상태가 변경되지만 `listings.map()`에 필터 조건 미적용
- **영향**: 사용자가 채널 필터 클릭 시 목록이 변하지 않음
- **권장**: 채널별 product_channel 매핑 데이터로 필터링 로직 추가, 또는 필터 UI 제거

#### 불일치 #2: KPI 쿼리 listing is_active 미검증 (P3)

- **위치**: [store-hub.controller.ts:283](apps/api-server/src/routes/kpa/controllers/store-hub.controller.ts#L283)
- **현상**: `totalProductCount`가 `organization_product_channels`의 모든 행을 카운트하며, 부모 `organization_product_listings.is_active = false`인 비활성 listing도 포함
- **영향**: listing을 비활성화해도 채널 KPI 숫자에 반영되지 않을 수 있음
- **권장**: 서브쿼리에 `JOIN organization_product_listings opl ON opl.id = opc.product_listing_id` 추가 후 `WHERE opl.is_active = true` 조건 적용

---

*Investigation completed: 2026-02-15*
*All 5 Phases verified. No code modified.*
