# IR-O4O-NETURE-PARTNER-SYSTEM-AUDIT

Neture Partner System 구조 조사 보고서

**작성일:** 2026-03-14
**범위:** Partner Registration → Recruitment → Contract → Referral → Commission → Settlement + Admin Management
**결론:** Partner Network **FULLY IMPLEMENTED** — 9개 테이블, 30+ API, Frontend 20+ 페이지 전체 구현 완료

---

## 1. 조사 결과 총괄

| 영역 | 판정 | 비고 |
|------|------|------|
| Partner Registration | **ACTIVE** | RegisterModal + neture_partners + role_assignments |
| Partner Profile | **ACTIVE** | neture.neture_partners (schema 분리) |
| Partner HUB (Frontend) | **ACTIVE** | 2 Layout + 14 pages + 3 Admin pages |
| Product Pool | **ACTIVE** | commission policy 기반 상품 노출 |
| Referral Link System | **ACTIVE** | 8-char token, collision retry |
| Recruitment → Application → Contract | **ACTIVE** | 3 테이블 atomic transaction |
| Partner Commission | **ACTIVE** | Dual path (referral + contract) |
| Partner Settlement | **ACTIVE** | Admin batch + atomic payment |
| Admin Partner Management | **ACTIVE** | Monitoring + Settlement + Detail |
| Partner Dashboard Items | **ACTIVE** | Product curation + content linking |

---

## 2. PARTNER ROUTE MAP

### 2.1 Partner Space (`/partner/*`) — PartnerSpaceLayout

| Route | Component | 상태 |
|-------|-----------|------|
| `/partner` | PartnerLandingPage | Public 랜딩 |
| `/partner/dashboard` | PartnerHubDashboardPage | Commission KPI + 최근 커미션 |
| `/partner/products` | ProductPoolPage | 상품 풀 + 레퍼럴 생성 |
| `/partner/links` | ReferralLinksPage | 내 추천 링크 관리 |
| `/partner/settlements` | PartnerSettlementBatchPage | 정산 내역 |
| `/partner/forum` | ForumPage | 포럼 |
| `/partner/overview` | PartnerOverviewPage | Legacy (유지) |
| `/partner/stores` | RecruitingProductsPage | Legacy (유지) |
| `/partner/commissions` | SettlementsPage | Legacy (유지) |

**Sub-Nav:** Dashboard / Products / My Links / Settlements
**Guard:** `user.roles.some(r => ['partner', 'admin'].includes(r))`

### 2.2 Partner Account (`/account/partner/*`) — PartnerAccountLayout

| Route | Component | 상태 |
|-------|-----------|------|
| `/account/partner` | PartnerAccountDashboardPage | 계정 대시보드 |
| `/account/partner/contents` | PartnerContentsPage | 콘텐츠 관리 |
| `/account/partner/links` | PartnerLinksPage | 링크 관리 |
| `/account/partner/stores` | PartnerStoresPage | 매장 관리 |

**Sidebar:** Dashboard / Contents / Links / Stores / Forum
**Guard:** `user.roles.some(r => ['partner', 'admin'].includes(r))`

### 2.3 Partnership Workspace (`/workspace/partners/*`) — SupplierOpsLayout

| Route | Component | 상태 |
|-------|-----------|------|
| `/workspace/partners/requests` | PartnershipRequestListPage | 제휴 요청 목록 |
| `/workspace/partners/requests/new` | PartnershipRequestCreatePage | 제휴 요청 생성 |
| `/workspace/partners/requests/:id` | PartnershipRequestDetailPage | 요청 상세 |
| `/workspace/partners/info` | PartnerInfoPage | 역할 안내 |

### 2.4 Admin Partner (`/workspace/admin/*`) — AdminLayout

| Route | Component | Guard |
|-------|-----------|-------|
| `/workspace/admin/partners` | AdminPartnerMonitoringPage | admin only |
| `/workspace/admin/partners/:id` | AdminPartnerDetailPage | admin only |
| `/workspace/admin/partner-settlements` | AdminPartnerSettlementsPage | admin only |

---

## 3. PARTNER DATA MODEL

### 3.1 Entity 목록 (9개 테이블)

```
┌─────────────────────────────────────────────────────────────┐
│                 PARTNER DATA MODEL                           │
│                                                               │
│  [Identity]                                                   │
│  neture.neture_partners                                      │
│    user_id → users.id (soft ref, no FK)                      │
│    status: pending/active/suspended/inactive                  │
│    type: seller/supplier/partner                              │
│                                                               │
│  [Recruitment → Application → Contract]                      │
│  neture_partner_recruitments                                  │
│    product_id + seller_id (UNIQUE)                            │
│    commission_rate, status: recruiting/closed                  │
│         │                                                     │
│         ▼                                                     │
│  neture_partner_applications                                  │
│    recruitment_id + partner_id (UNIQUE)                        │
│    status: pending/approved/rejected                           │
│         │ (on approve, ATOMIC →)                              │
│         ▼                                                     │
│  neture_seller_partner_contracts                              │
│    seller_id + partner_id (UNIQUE where active)               │
│    commission_rate (snapshot, immutable)                       │
│    contract_status: active/terminated/expired                  │
│                                                               │
│  [Affiliate]                                                  │
│  partner_referrals                                            │
│    partner_id + product_id → referral_token (8-char, UNIQUE) │
│                                                               │
│  supplier_partner_commissions                                 │
│    supplier_product_id + commission_per_unit                  │
│    start_date / end_date (period validation)                  │
│                                                               │
│  [Commission & Settlement]                                    │
│  partner_commissions                                          │
│    Dual mode: contract(commission_rate) + referral(per_unit) │
│    status: pending → approved → paid / cancelled              │
│         │                                                     │
│         ▼                                                     │
│  partner_settlement_items                                     │
│    commission_id (UNIQUE — 1 commission per settlement)       │
│         │                                                     │
│         ▼                                                     │
│  partner_settlements                                          │
│    status: pending → processing → paid                        │
│                                                               │
│  [Dashboard]                                                  │
│  neture_partner_dashboard_items                               │
│    partner_user_id + product_id (UNIQUE)                     │
│    status: active/inactive                                    │
│         │                                                     │
│         ▼                                                     │
│  neture_partner_dashboard_item_contents                       │
│    dashboard_item_id + content_id + content_source (UNIQUE)  │
│    sort_order, is_primary                                     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Partner Identity

**핵심:** `neture_partners` 테이블이 **별도 존재** (neture schema 내)

```
neture.neture_partners
├─ id (UUID PK)
├─ user_id (UUID) → users.id (soft reference, no FK)
├─ name (varchar 200)
├─ business_name (varchar 200, nullable)
├─ business_number (varchar 50, nullable)
├─ type (ENUM: seller/supplier/partner)
├─ status (ENUM: pending/active/suspended/inactive)
├─ contact (JSONB: {name, email, phone, position})
├─ address (JSONB: {zipCode, address1, address2, city, province, country})
├─ metadata (JSONB)
├─ logo, website, description
└─ created_at, updated_at
```

**Guard 동작:**
- `requireActivePartner`: `SELECT id, status FROM neture.neture_partners WHERE user_id = $1` → status='active' 필수
- `requireLinkedPartner`: 같은 쿼리, status 무관 (PENDING도 허용)

---

## 4. PARTNER API MAP

### 4.1 공개 API (인증 불필요)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/partner/recruiting-products` | 파트너 모집 상품 목록 |
| GET | `/partner/recruitments` | 활성 모집 공고 목록 |

### 4.2 Partner API (requireLinkedPartner/requireActivePartner)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/partner/product-pool` | Linked | 커미션 정책 있는 상품 풀 |
| POST | `/partner/referral-links` | Active | 추천 링크 생성 |
| GET | `/partner/referral-links` | Linked | 내 추천 링크 목록 |
| GET | `/partner/commissions/kpi` | Linked | 커미션 KPI |
| GET | `/partner/commissions` | Linked | 커미션 목록 |
| GET | `/partner/commissions/:id` | Linked | 커미션 상세 |
| GET | `/partner/settlements` | Linked | 정산 목록 |
| GET | `/partner/settlements/:id` | Linked | 정산 상세 |
| POST | `/partner/applications` | Auth | 모집 지원 |
| GET | `/partner/contracts` | Auth | 계약 목록 |
| POST | `/partner/contracts/:id/terminate` | Active | 계약 해지 |
| GET | `/partner/dashboard/items` | Linked | 대시보드 상품 |
| POST | `/partner/dashboard/items` | Active | 대시보드 상품 추가 |
| PATCH | `/partner/dashboard/items/:id` | Active | 상품 상태 토글 |
| GET | `/partner/contents` | Linked | CMS 콘텐츠 조회 |
| POST | `/partner/dashboard/items/:itemId/contents` | Auth | 콘텐츠 연결 |
| DELETE | `/partner/dashboard/items/:itemId/contents/:linkId` | Auth | 콘텐츠 해제 |
| GET | `/partner/dashboard/items/:itemId/contents` | Auth | 연결 콘텐츠 목록 |
| PATCH | `/partner/dashboard/items/:itemId/contents/reorder` | Auth | 콘텐츠 순서 변경 |
| PATCH | `/partner/dashboard/items/:itemId/contents/:linkId/primary` | Auth | 주요 콘텐츠 설정 |

### 4.3 Seller API (파트너 지원 관리)

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| POST | `/partner/applications/:id/approve` | ActiveSupplier | 지원 승인 → 계약 생성 |
| POST | `/partner/applications/:id/reject` | ActiveSupplier | 지원 거절 |

### 4.4 Admin API (requireNetureScope('neture:admin'))

| Method | Path | 설명 |
|--------|------|------|
| GET | `/admin/partners` | 파트너 목록 + KPI |
| GET | `/admin/partners/:id` | 파트너 상세 + 최근 커미션 |
| POST | `/admin/partner-settlements` | 정산 배치 생성 |
| POST | `/admin/partner-settlements/:id/pay` | 정산 지급 처리 |
| GET | `/admin/partner-settlements` | 정산 목록 |
| GET | `/admin/partner-settlements/:id` | 정산 상세 |
| POST | `/admin/commissions/calculate` | 커미션 일괄 계산 |
| GET | `/admin/commissions` | 전체 커미션 목록 |
| GET | `/admin/commissions/kpi` | 커미션 KPI |
| PATCH | `/admin/commissions/:id/approve` | 커미션 승인 |
| PATCH | `/admin/commissions/:id/pay` | 커미션 지급 |

---

## 5. PARTNER COMMISSION FLOW

### 5.1 Two Commission Paths

```
┌──────────────────────────────────────────────────┐
│  PATH A: Referral Commission (Affiliate)         │
│                                                    │
│  1. Supplier → supplier_partner_commissions        │
│     (commission_per_unit per product)              │
│  2. Partner → POST /partner/referral-links         │
│     (No contract check, product pool based)        │
│  3. Buyer clicks → ?ref=TOKEN                      │
│  4. Order created → processReferralAttribution()   │
│  5. commission = qty × commission_per_unit          │
│  6. partner_commissions (status: pending)           │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  PATH B: Contract Commission (Partnership)       │
│                                                    │
│  1. Supplier → neture_partner_recruitments          │
│  2. Partner → POST /partner/applications            │
│  3. Supplier approves → contract created (ATOMIC)  │
│     commission_rate snapshot                        │
│  4. Order delivered →                               │
│     createContractCommissionsForOrder()             │
│  5. commission = order_amount × rate / 100          │
│  6. partner_commissions (status: pending)           │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  SETTLEMENT (Both paths converge)                │
│                                                    │
│  1. Admin: approve commission (pending → approved) │
│  2. Admin: create settlement batch                 │
│     (approved commissions → partner_settlements)   │
│  3. Admin: pay settlement (ATOMIC TRANSACTION)     │
│     settlement.status → paid                       │
│     commissions.status → paid                      │
└──────────────────────────────────────────────────┘
```

### 5.2 Commission Status Machine

```
          ┌─────────────┐
          │   pending    │ ← created (on order delivery or referral)
          └──────┬──────┘
                 │ admin approve
                 ▼
          ┌─────────────┐
          │  approved    │
          └──────┬──────┘
                 │ admin pay (via settlement)
                 ▼
          ┌─────────────┐
          │    paid      │
          └─────────────┘

     (pending/approved) → cancelled (admin cancel)
```

---

## 6. RECRUITMENT → CONTRACT LIFECYCLE

```
[Supplier]
  POST recruitment
    │
    │ neture_partner_recruitments
    │ (product_id, commission_rate, status='recruiting')
    ▼
[Partner]
  POST /partner/applications
    │
    │ neture_partner_applications
    │ (recruitment_id, partner_id, status='pending')
    ▼
[Supplier]
  POST /partner/applications/:id/approve
    │
    │ ── ATOMIC TRANSACTION ──
    │ 1. Application status → 'approved'
    │ 2. Contract created:
    │    neture_seller_partner_contracts
    │    (commission_rate snapshot, status='active')
    │ 3. Dashboard item auto-added:
    │    neture_partner_dashboard_items
    │    (partner_user_id, product_id, status='active')
    ▼
[Active Contract]
    │
    ├── Orders trigger commission creation
    │
    ├── Partner can terminate:
    │   POST /partner/contracts/:id/terminate
    │   (status → 'terminated', terminated_by='partner')
    │
    └── Expiry: status → 'expired' (if expires_at set)
```

**핵심 제약:**
- 하나의 (seller, partner) 쌍에 ACTIVE 계약 1개만 허용 (partial unique index)
- commission_rate는 계약 생성 시 스냅샷 (불변)
- 계약 변경 시: 기존 계약 terminate → 새 계약 create

---

## 7. ADMIN PARTNER CONTROL

### 7.1 AdminPartnerMonitoringPage (`/workspace/admin/partners`)

- **KPI 카드 4개:** 총 파트너 수, 총 커미션, 미지급 커미션, 지급 완료
- **파트너 목록:** 검색, 페이지네이션 (20건/페이지)
- **상세 진입:** → AdminPartnerDetailPage

### 7.2 AdminPartnerDetailPage (`/workspace/admin/partners/:id`)

- **파트너 정보:** 이름, 상태, 등록일
- **KPI:** 커미션 요약
- **최근 커미션 목록:** 주문번호, 금액, 상태, 날짜

### 7.3 AdminPartnerSettlementsPage (`/workspace/admin/partner-settlements`)

- **정산 생성:** 파트너 선택 → 승인된 커미션 자동 수집 → 배치 생성
- **정산 목록:** 상태 필터 (pending/processing/paid)
- **정산 지급:** 클릭 → 정산 + 포함 커미션 모두 paid 상태로 (atomic)

---

## 8. FRONTEND 페이지 목록 (전체)

| # | 파일 | Route | 상태 |
|---|------|-------|------|
| 1 | PartnerLandingPage.tsx | `/partner` | ACTIVE (public) |
| 2 | PartnerHubDashboardPage.tsx | `/partner/dashboard` | ACTIVE |
| 3 | ProductPoolPage.tsx | `/partner/products` | ACTIVE |
| 4 | ReferralLinksPage.tsx | `/partner/links` | ACTIVE |
| 5 | PartnerSettlementBatchPage.tsx | `/partner/settlements` | ACTIVE |
| 6 | PartnerAccountDashboardPage.tsx | `/account/partner` | ACTIVE |
| 7 | PartnerContentsPage.tsx | `/account/partner/contents` | ACTIVE |
| 8 | PartnerLinksPage.tsx | `/account/partner/links` | ACTIVE |
| 9 | PartnerStoresPage.tsx | `/account/partner/stores` | ACTIVE |
| 10 | ReferralLinkModal.tsx | (modal component) | ACTIVE |
| 11 | AdminPartnerMonitoringPage.tsx | `/workspace/admin/partners` | ACTIVE |
| 12 | AdminPartnerDetailPage.tsx | `/workspace/admin/partners/:id` | ACTIVE |
| 13 | AdminPartnerSettlementsPage.tsx | `/workspace/admin/partner-settlements` | ACTIVE |
| 14 | PartnershipRequestListPage.tsx | `/workspace/partners/requests` | ACTIVE |
| 15 | PartnershipRequestCreatePage.tsx | `/workspace/partners/requests/new` | ACTIVE |
| 16 | PartnershipRequestDetailPage.tsx | `/workspace/partners/requests/:id` | ACTIVE |
| 17 | PartnerOverviewPage.tsx | `/partner/overview` | LEGACY |
| 18 | SettlementsPage.tsx | `/partner/commissions` | LEGACY |
| 19 | RecruitingProductsPage.tsx | `/partner/stores` | LEGACY |
| 20 | PromotionsPage.tsx | `/partner/promotions` | LEGACY |

---

## 9. MIGRATION 목록 (시간순)

| Migration | 테이블 | Work Order |
|-----------|--------|------------|
| 2026013100001 | neture_partner_dashboard_items | WO-PARTNER-DASHBOARD-PHASE1-V1 |
| 2026013100002 | neture_partner_dashboard_item_contents | WO-PARTNER-CONTENT-LINK-PHASE1-V1 |
| 2026020100001 | neture_partner_recruitments + applications | WO-O4O-PARTNER-RECRUITMENT-API-V1 |
| 20260224600000 | neture_seller_partner_contracts | WO-NETURE-SELLER-PARTNER-CONTRACT-V1 |
| 20260308400000 | partner_commissions | WO-O4O-PARTNER-COMMISSION-ENGINE-V1 |
| 20260308500000 | supplier_partner_commissions | WO-O4O-PARTNER-HUB-CORE-V1 |
| 20260308510000 | partner_referrals | WO-O4O-PARTNER-HUB-CORE-V1 |
| 20260308520000 | partner_commissions (ALTER: referral columns) | WO-O4O-PARTNER-HUB-CORE-V1 |
| 20260308700000 | partner_settlements + items | WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1 |

---

## 10. 설계 특이사항

### 10.1 Product Pool ≠ Contract

Product Pool은 `supplier_partner_commissions` 기반이고, 계약(contract) 여부와 무관.
파트너는 **계약 없이도** 커미션 정책이 있는 모든 상품에 대해 레퍼럴 링크 생성 가능.

### 10.2 Schema 분리

`neture.neture_partners`는 neture schema에 격리. Core users 테이블과 FK 없이 soft reference만 사용.
이를 통해 독립적 스키마 진화 가능.

### 10.3 Commission Dual Mode

하나의 `partner_commissions` 테이블에서 두 종류의 커미션 처리:
- **Referral:** `product_id + quantity + commission_per_unit` (per-unit 고정)
- **Contract:** `contract_id + commission_rate` (order_amount 비율)

### 10.4 Immutable Commission Rate

계약의 `commission_rate`는 모집 공고의 rate를 스냅샷. 변경 불가.
rate 변경 필요 시: 기존 계약 terminate → 새 계약 create.

### 10.5 Settlement Atomicity

settlement 지급 시 `partner_settlements.status='paid'` + `partner_commissions.status='paid'`를 하나의 트랜잭션으로 처리.

---

## 11. 최종 판정

### Partner Network: FULLY IMPLEMENTED

```
Partner Registration     ── ACTIVE (RegisterModal + neture_partners)
Partner Profile          ── ACTIVE (neture schema, soft user ref)
Recruitment System       ── ACTIVE (3-table atomic: recruitment → application → contract)
Product Pool             ── ACTIVE (commission policy 기반)
Referral Link            ── ACTIVE (8-char token, collision retry)
Commission (Referral)    ── ACTIVE (qty × per_unit)
Commission (Contract)    ── ACTIVE (order_amount × rate%)
Commission Settlement    ── ACTIVE (admin batch + atomic payment)
Partner Dashboard        ── ACTIVE (product curation + content linking)
Admin Monitoring         ── ACTIVE (KPI + list + detail + settlement)
Frontend Pages           ── ACTIVE (20 pages, 2 layouts)
API Endpoints            ── ACTIVE (30+ endpoints with proper guards)
```

### 구조적 개선 가능 사항 (Optional)

1. Legacy 페이지 4개 정리 가능 (PartnerOverviewPage, SettlementsPage, RecruitingProductsPage, PromotionsPage)
2. `/account/partner/*`와 `/partner/*` 두 공간이 기능 중복 — 통합 검토 가능
3. Contract expiry 자동 처리 (expires_at 기반 스케줄러) 미구현 — WO 필요

---

*IR completed: 2026-03-14*
*Status: FULLY IMPLEMENTED — No critical gaps*
