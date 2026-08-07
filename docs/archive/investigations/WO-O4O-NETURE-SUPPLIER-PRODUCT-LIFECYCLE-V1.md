# WO-O4O-NETURE-SUPPLIER-PRODUCT-LIFECYCLE-V1

Neture Supplier → Product Lifecycle 정비 감사 보고서

**작성일:** 2026-03-14
**범위:** Supplier → Product Master → Offer → Store Listing → Order → Shipment → Settlement + Partner Commission
**결론:** 전체 Lifecycle **FULLY IMPLEMENTED** — DB 스키마, 서비스 로직, API, Guard 모두 구현 완료

---

## 1. LIFECYCLE MAP

```
┌─────────────────────────────────────────────────────────┐
│                  SUPPLIER NETWORK                       │
│                                                         │
│  [1] NetureSupplier                                     │
│       status: PENDING → ACTIVE → INACTIVE               │
│       guard: requireActiveSupplier (write)               │
│              requireLinkedSupplier (read)                 │
│                      │                                   │
│  [2] ProductMaster (SSOT)                               │
│       barcode (UNIQUE), MFDS 6 immutable fields         │
│       resolveOrCreateMaster() — barcode dedup            │
│                      │                                   │
│  [3] SupplierProductOffer                               │
│       approvalStatus: PENDING → APPROVED/REJECTED        │
│       distributionType: PUBLIC/SERVICE/PRIVATE            │
│       isActive: false → true (on approval)               │
│       slug: {barcode}-{supplierId_8}-{timestamp}         │
│                      │                                   │
│  [4] OrganizationProductListing                          │
│       AUTO: PUBLIC offer approved → all active orgs      │
│       MANUAL: SERVICE/PRIVATE → per-org request          │
│       is_active: false (default) → true (seller toggle)  │
│                      │                                   │
│  [5] NetureOrder + NetureOrderItem                      │
│       6-Gate Validation + Inventory Reserve              │
│       status: created → paid → preparing → shipped       │
│               → delivered / cancelled / refunded          │
│                      │                                   │
│  [6] NetureShipment                                      │
│       status: shipped → in_transit → delivered            │
│       tracking_number, carrier_code                      │
│                      │                                   │
│  [7] NetureSettlement + NetureSettlementOrder            │
│       status: pending → calculated → approved → paid     │
│       platform_fee_rate: 10%                             │
│       supplier_amount = total_sales - platform_fee       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  PARTNER NETWORK                        │
│                                                         │
│  [A] partner_referrals                                  │
│       referral_token (8-char hex, UNIQUE)                │
│       partner_id + product_id (offer)                    │
│                      │                                   │
│  [B] supplier_partner_commissions                       │
│       commission_per_unit (KRW, per-unit fixed)          │
│       start_date / end_date (period validation)          │
│                      │                                   │
│  [C] partner_commissions                                │
│       TWO paths:                                         │
│       - Referral: processReferralAttribution()           │
│         → qty × commission_per_unit                      │
│       - Contract: createContractCommissionsForOrder()    │
│         → order_amount × commission_rate / 100            │
│       status: pending → approved → paid                  │
│                      │                                   │
│  [D] partner_settlements + partner_settlement_items     │
│       status: pending → processing → paid                │
│       admin batch: approved commissions → settlement     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. ENTITY ERD

### 2.1 Supply Chain ERD

```
users ──────────────────────────┐
  │                             │
  │ user_id                     │ user_id
  ▼                             ▼
neture_suppliers          (buyer/seller)
  │                             │
  │ supplier_id                 │ user_id
  ▼                             ▼
supplier_product_offers    neture_orders
  │  │                         │
  │  │ master_id               │ order_id
  │  ▼                         ▼
  │  product_masters      neture_order_items
  │  │                    (product_id → offer.id)
  │  │ 1:N                     │
  │  ▼                         │ order_id
  │  product_images            ▼
  │                       neture_shipments
  │ offer_id                   │
  ▼                            │ order_id
organization_product_listings  ▼
  │                       neture_settlement_orders
  │ organization_id            │
  ▼                            │ settlement_id
organizations                  ▼
                          neture_settlements
```

### 2.2 Partner Commission ERD

```
users (partner)
  │
  │ partner_id
  ▼
partner_referrals ──────── supplier_product_offers
  │ referral_token                  │
  │                                 │ supplier_product_id
  │                                 ▼
  │                    supplier_partner_commissions
  │                    (commission_per_unit per period)
  │
  │ (on order with ?ref=TOKEN)
  ▼
partner_commissions
  │ commission_id
  ▼
partner_settlement_items
  │ settlement_id
  ▼
partner_settlements
```

---

## 3. 단계별 상세 검증 결과

### 3.1 Supplier (neture_suppliers)

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| Status enum (PENDING/ACTIVE/INACTIVE/REJECTED) | PASS | NetureSupplier.entity.ts |
| User 연결 (user_id FK) | PASS | userId column |
| Approval metadata (approved_by, approved_at, rejected_reason) | PASS | Entity columns |
| Status guard (write=ACTIVE only) | PASS | neture-identity.middleware.ts:requireActiveSupplier |
| Status guard (read=any linked) | PASS | neture-identity.middleware.ts:requireLinkedSupplier |
| Admin approve/reject/deactivate API | PASS | admin.controller.ts |

**Guard 동작 확인:**
- PENDING supplier → product 생성 시도 → `SUPPLIER_NOT_ACTIVE` 반환
- ACTIVE supplier → product 생성 허용
- Deactivated supplier → 기존 offer의 product_approvals revoked, listings disabled

### 3.2 Product Master (product_masters)

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| Barcode UNIQUE constraint | PASS | Entity + resolveOrCreateMaster() dedup |
| MFDS immutable 6 fields (barcode, regulatoryType, regulatoryName, manufacturerName, mfdsPermitNumber, mfdsProductId) | PASS | MASTER_IMMUTABLE_FIELDS guard |
| Mutable fields (marketingName, categoryId, brandId, specification, originCountry, tags) | PASS | updateProductMaster() |
| MFDS verified path | PASS | resolveOrCreateMaster() → isMfdsVerified=true |
| Manual data path | PASS | resolveOrCreateMaster() → isMfdsVerified=false |
| Duplicate prevention (barcode lookup before create) | PASS | findOne({ where: { barcode } }) |
| Category/Brand relations | PASS | ManyToOne with SET NULL on delete |
| Product images (1:N) | PASS | OneToMany → ProductImage |

### 3.3 Supplier Product Offer (supplier_product_offers)

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| approvalStatus enum (PENDING/APPROVED/REJECTED) | PASS | Entity enum |
| distributionType enum (PUBLIC/SERVICE/PRIVATE) | PASS | Entity enum |
| isActive default false | PASS | Entity column default |
| Unique constraint (master_id, supplier_id) | PASS | Entity index |
| Slug generation (barcode-supplierId8-timestamp) | PASS | createSupplierOffer() |
| Slug UNIQUE constraint | PASS | Entity column |
| Inventory fields (stockQuantity, reservedQuantity, lowStockThreshold, trackInventory) | PASS | Entity columns |
| Price tiers (priceGeneral, priceGold, pricePlatinum, consumerReferencePrice) | PASS | Entity columns |
| PRIVATE requires allowedSellerIds | PASS | updateSupplierOffer() guard |

### 3.4 Store Listing (organization_product_listings)

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| Auto-listing (PUBLIC offer approved → all orgs) | PASS | autoExpandPublicProduct() |
| Auto-listing (new org → all PUBLIC offers) | PASS | autoListPublicProductsForOrg() |
| service_key field (default 'kpa') | PASS | Entity column |
| Unique constraint (org_id, service_key, offer_id) | PASS | ON CONFLICT DO NOTHING |
| is_active default false (seller toggle) | PASS | Entity column |
| Cascade delete on offer removal | PASS | ManyToOne onDelete CASCADE |

**AUTO-LISTING 트리거:**
1. Admin이 PUBLIC offer 승인 → `autoExpandPublicProduct()` 호출 → 모든 active org에 listing 생성
2. 새 organization 생성 → `autoListPublicProductsForOrg()` 호출 → 모든 APPROVED PUBLIC offer listing 생성
3. Supplier가 PRIVATE→PUBLIC 변경 (이미 APPROVED) → `autoExpandPublicProduct()` 호출

### 3.5 Order (neture_orders + neture_order_items)

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| 6-Gate Validation | PASS | createOrder() |
| Status enum (created/pending_payment/paid/preparing/shipped/delivered/cancelled/refunded) | PASS | Entity enum |
| Inventory reservation (atomic transaction) | PASS | createOrder() transaction |
| Inventory release (on cancellation) | PASS | updateOrderStatus() GREATEST guard |
| Stock deduction (on delivery) | PASS | updateOrderStatus() DELIVERED handler |
| Shipping fee (free ≥ 50,000 KRW, else 3,000 KRW) | PASS | createOrder() calculation |
| Server-enforced pricing (client price ignored) | PASS | Gate 6 — unitPrice from DB |
| Order number generation | PASS | generateOrderNumber() |
| Referral attribution (on delivery) | PASS | processReferralAttribution() |

**6-Gate Details:**

| Gate | 검증 내용 | 실패 시 |
|------|-----------|---------|
| 1 | offer.isActive === true | "Product is not active" |
| 2 | offer.approvalStatus === 'APPROVED' | "Product is not approved" |
| 3 | offer.supplier.status === 'ACTIVE' | "Supplier is not active" |
| 4 | distributionType access check (PRIVATE→allowedSellerIds, SERVICE→organizationId) | "Distribution access denied" |
| 5 | quantity: integer, 1-1000 | "Invalid/too large quantity" |
| 6 | priceGeneral > 0 (server-forced) | "Invalid price" |
| 7* | trackInventory → available_stock ≥ quantity | "Insufficient stock" |

### 3.6 Shipment (neture_shipments)

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| Create shipment (status=shipped, shipped_at=NOW()) | PASS | shipment.service.ts |
| Status transitions (shipped→in_transit→delivered) | PASS | SHIPMENT_STATUS_TRANSITIONS |
| Tracking number | PASS | carrier_code + carrier_name + tracking_number |
| Order relation (order_id FK) | PASS | Schema column |
| Supplier ownership validation | PASS | updateShipment() ownership check |

### 3.7 Settlement (neture_settlements + neture_settlement_orders)

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| Calculate from delivered orders | PASS | calculateSettlements() |
| Platform fee 10% | PASS | platform_fee_rate default 0.10 |
| supplier_amount = total_sales - platform_fee | PASS | calculateSettlements() |
| Duplicate prevention (supplier+period UNIQUE where status!='cancelled') | PASS | Conditional unique index |
| Order 1:1 mapping (order_id UNIQUE in settlement_orders) | PASS | idx_neture_settlement_orders_order_unique |
| Status flow (pending→calculated→approved→paid) | PASS | Settlement service methods |
| Cancel → DELETE settlement_orders (re-settlement 허용) | PASS | cancelSettlement() |

### 3.8 Partner Commission

| 항목 | 상태 | 코드 위치 |
|------|------|-----------|
| Referral token generation (8-char hex) | PASS | partner.controller.ts |
| Token collision retry | PASS | 23505 error → retry with new token |
| Referral attribution on order | PASS | processReferralAttribution() |
| Per-unit commission (qty × commission_per_unit) | PASS | Referral path |
| Contract commission (order_amount × rate / 100) | PASS | createContractCommissionsForOrder() |
| Auto-create on delivery | PASS | updateOrderStatus() DELIVERED handler |
| Commission status flow (pending→approved→paid) | PASS | partner-commission.service.ts |
| Partner settlement batch | PASS | createAdminSettlement() |
| Settlement payment (atomic transaction) | PASS | payAdminSettlement() |

---

## 4. API 구조 검증

### 4.1 Supplier APIs

| Endpoint | Method | Guard | 상태 |
|----------|--------|-------|------|
| /supplier/products | POST | requireActiveSupplier | PASS |
| /supplier/products | GET | requireLinkedSupplier | PASS |
| /supplier/products/:id | PATCH | requireActiveSupplier | PASS |
| /supplier/orders | GET | requireLinkedSupplier | PASS |
| /supplier/orders/:id | GET | requireLinkedSupplier | PASS |
| /supplier/orders/kpi | GET | requireLinkedSupplier | PASS |
| /supplier/inventory | GET | requireLinkedSupplier | PASS |
| /supplier/inventory/:offerId | PATCH | requireActiveSupplier | PASS |
| /supplier/settlements | GET | requireLinkedSupplier | PASS |
| /supplier/settlements/kpi | GET | requireLinkedSupplier | PASS |
| /supplier/shipments | GET | requireLinkedSupplier | PASS |
| /supplier/shipments/:id/status | PATCH | requireActiveSupplier | PASS |
| /supplier/partner-commissions | GET/POST/PUT/DELETE | requireActiveSupplier | PASS |
| /supplier/csv-import | POST | requireActiveSupplier | PASS |

### 4.2 Partner APIs

| Endpoint | Method | Guard | 상태 |
|----------|--------|-------|------|
| /partner/product-pool | GET | requireLinkedPartner | PASS |
| /partner/referral-links | POST/GET | requireLinkedPartner | PASS |
| /partner/commissions | GET | requireLinkedPartner | PASS |
| /partner/commissions/kpi | GET | requireLinkedPartner | PASS |
| /partner/settlements | GET | requireLinkedPartner | PASS |
| /partner/contracts | GET | requireAuth | PASS |
| /partner/dashboard/items | GET/POST/PATCH | requireLinkedPartner | PASS |

### 4.3 Admin APIs

| Endpoint | Method | Guard | 상태 |
|----------|--------|-------|------|
| /admin/suppliers/* | GET/POST | requireNetureScope('neture:admin') | PASS |
| /admin/products/* | GET/POST | requireNetureScope('neture:admin') | PASS |
| /admin/masters/* | GET/POST/PATCH | requireNetureScope('neture:admin') | PASS |
| /admin/settlements/* | GET/POST/PATCH | requireNetureScope('neture:admin') | PASS |
| /admin/commissions/* | GET/POST/PATCH | requireNetureScope('neture:admin') | PASS |
| /admin/partners/* | GET | requireNetureScope('neture:admin') | PASS |
| /admin/partner-settlements/* | GET/POST | requireNetureScope('neture:admin') | PASS |

---

## 5. 상태 전이 다이어그램

### 5.1 Supplier Status

```
  [Registration]
       │
       ▼
    PENDING ──── Admin Reject ──── REJECTED
       │
       │ Admin Approve
       ▼
    ACTIVE ──── Admin Deactivate ──── INACTIVE
```

### 5.2 Offer Lifecycle

```
  [Supplier Create]
       │
       │ approvalStatus=PENDING, isActive=false
       ▼
    PENDING ──── Admin Reject ──── REJECTED
       │                              │
       │ Admin Approve                │ (revoke product_approvals)
       │ isActive=true                │ (disable listings)
       ▼
    APPROVED
       │
       │ PUBLIC → autoExpandPublicProduct()
       │ SERVICE/PRIVATE → manual listing
       ▼
    [LIVE IN STORES]
```

### 5.3 Order Lifecycle

```
  [Buyer Create Order]
       │
       │ 6-Gate Validation + Inventory Reserve
       ▼
    CREATED → PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED
       │                                                         │
       │ Cancel (release inventory)                              │ Stock deduction
       ▼                                                         │ Partner commission auto-create
    CANCELLED                                                    ▼
                                                          [Settlement Ready]
    REFUNDED ←─── (from PAID/DELIVERED)
```

### 5.4 Settlement Lifecycle

```
  [Admin Calculate]
       │
       │ Find delivered orders not yet settled
       │ Group by supplier, calculate fees
       ▼
    CALCULATED ──── Cancel ──── CANCELLED
       │                        (delete settlement_orders, allow re-settlement)
       │ Admin Approve
       ▼
    APPROVED ──── Cancel ──── CANCELLED
       │
       │ Admin Pay
       ▼
      PAID
```

---

## 6. 감사 판정

### 전체 Lifecycle 판정: FULLY IMPLEMENTED

| 단계 | 판정 | 비고 |
|------|------|------|
| Supplier Registration & Approval | PASS | Status guard + admin API 완전 구현 |
| Product Master SSOT | PASS | Barcode dedup + MFDS immutable guard |
| Supplier Offer Pipeline | PASS | Barcode-only pipeline, masterId injection blocked |
| Distribution Tier (PUBLIC/SERVICE/PRIVATE) | PASS | Auto-listing + seller whitelist |
| Store Listing Connection | PASS | Auto-expand + manual + seller toggle |
| Order 6-Gate Validation | PASS | 7 gates (including inventory bonus) |
| Shipment Tracking | PASS | Status transitions + supplier ownership |
| Supplier Settlement | PASS | Period-based batch + 10% platform fee |
| Partner Referral | PASS | Token generation + collision retry |
| Partner Commission | PASS | Dual path (referral + contract) |
| Partner Settlement | PASS | Admin batch + atomic payment |
| Inventory Management | PASS | Reserve/release/deduction atomic |

### 발견된 이슈: NONE (Critical)

구조적 개선 가능 사항 (Optional, non-blocking):
- `service_key` default 'kpa' → 향후 multi-service 확장 시 명시적 설정 필요
- Shipment entity는 migration으로만 존재 (TypeORM entity 파일 없음, raw SQL 사용)
- Partner commission의 두 경로(referral/contract)가 별도 서비스에서 처리됨 → 통합 가능성

---

## 7. 총 API Endpoint 수

| 영역 | Endpoint 수 |
|------|------------|
| Supplier (Product/Order/Inventory/Settlement/Shipment) | ~25 |
| Partner (Commission/Referral/Dashboard/Contract/Settlement) | ~25 |
| Admin (Supplier/Product/Master/Settlement/Commission/Partner) | ~35 |
| Seller (Products/Orders) | ~5 |
| Public (Suppliers/Partnerships) | ~3 |
| Hub Trigger | ~7 |
| **Total** | **~100+** |

---

*Audit completed: 2026-03-14*
*Status: ALL PASS — No code changes required*
