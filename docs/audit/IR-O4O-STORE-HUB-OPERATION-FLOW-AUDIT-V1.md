# IR-O4O-STORE-HUB-OPERATION-FLOW-AUDIT-V1

> **Investigation Report — O4O Platform Store Hub Operational Flow Comprehensive Audit**
> Date: 2026-03-09
> Status: Complete
> Scope: Store Hub operational flows across GlycoPharm / KPA Society / K-Cosmetics / GlucoseView
> Prerequisite: IR-O4O-STORE-HUB-ARCHITECTURE-AUDIT-V1 (구조 조사 완료)

---

## Executive Summary

O4O Platform Store Hub의 **실제 운영 흐름**을 전수 조사한 결과, 다음을 확인했다.

### Store Hub Operational Model

```
제품 공급 (Neture Supplier)
    ↓
제품 승인 (Product Policy v2)
    ↓
매장 제품 로스터 (Organization Product Listing)
    ↓
채널 생성 (B2C / KIOSK / TABLET / SIGNAGE — auto-APPROVED)
    ↓
채널 제품 연결 (Organization Product Channel)
    ↓
고객 노출 (4-Gate Visibility)
    ↓
주문 (Checkout → Toss Payment → Order)
```

### Service Implementation Status

| Feature | GlycoPharm | KPA Society | K-Cosmetics | GlucoseView |
|---------|:----------:|:-----------:|:-----------:|:-----------:|
| 제품 관리 | Full | Full | Partial (Cockpit) | None |
| 채널 관리 | Full | Full | None | None |
| 주문 관리 | Full | Full | Placeholder | None |
| 콘텐츠 관리 | Full | Full (Library) | Placeholder | None |
| 사이니지 | Full (8 sub-routes) | Full | Placeholder | None |
| QR/POP | - | Full | - | - |
| 분석 | AI Insights | Marketing Analytics | Stub | None |
| 정산 | Full | Hidden route | Placeholder | None |

---

## 1. Store Hub Operational Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPPLY CHAIN (Neture)                          │
│                                                                   │
│  Supplier → ProductMaster (SSOT) → SupplierProductOffer          │
│                                     ↓                            │
│                              Distribution Type                    │
│                         PUBLIC / SERVICE / PRIVATE                │
│                                     ↓                            │
│                          Product Approval (v2)                    │
│                                     ↓                            │
│                    OrganizationProductListing (is_active=false)    │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STORE OPERATIONS                               │
│                                                                   │
│  Store Owner → 제품 활성화 (is_active=true)                      │
│             → 채널 생성 (B2C/KIOSK/TABLET/SIGNAGE)               │
│             → 채널 제품 연결 (Product Channel Mapping)            │
│             → 콘텐츠 등록 (Library/QR/POP/Signage/Blog)          │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER EXPOSURE                              │
│                                                                   │
│  B2C Storefront → 4-Gate Visibility → Product List               │
│  Tablet Display → Supplier + Local Products (Display Domain)     │
│  Kiosk Display  → Large UI + Auto-reset + Cart                   │
│  QR Landing     → Scan → Landing Page + Analytics                │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ORDER & COMMERCE                               │
│                                                                   │
│  Customer → Cart → Checkout Initiate → Toss Payment              │
│          → Payment Confirm → Order Created                       │
│  Store Owner → Order Dashboard → Refund (operator)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Product Supply Flow

### 2.1 ProductMaster Creation

| 항목 | 값 |
|------|------|
| **UI** | `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` |
| **API** | `POST /api/v1/neture/supplier/products` |
| **Service** | `NetureService.resolveOrCreateMaster(barcode, manualData)` |
| **Auth** | `requireAuth` + `requireActiveSupplier` |
| **Table** | `product_masters` |

**Master Resolution Pipeline (4-Step)**:

```
1. GTIN Validation (8/12/13/14 digits)
     ↓
2. Existing Check (barcode 중복 검사)
     ↓
3. MFDS Lookup (식약처 조회 — 현재 STUB, 미구현)
     ↓
4. Master 생성
   ├── Case A: MFDS 성공 → isMfdsVerified=true
   ├── Case B: MFDS 실패 + manual data → isMfdsVerified=false
   └── Case C: 데이터 없음 → MFDS_VERIFICATION_FAILED 에러
```

**Immutable Fields** (런타임 Guard):

```
barcode, regulatoryType, regulatoryName,
manufacturerName, mfdsPermitNumber, mfdsProductId
```

### 2.2 SupplierProductOffer Creation

| 항목 | 값 |
|------|------|
| **UI** | `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` |
| **API** | `POST /api/v1/neture/supplier/products` |
| **Table** | `supplier_product_offers` |
| **Initial State** | `isActive=false, approvalStatus=PENDING` |

**Distribution Types**:

| Type | Visibility | 승인 | Auto-Listing |
|------|-----------|------|-------------|
| **PUBLIC** | 모든 Organization | 불필요 | 즉시 (모든 org에 자동 생성, is_active=false) |
| **SERVICE** | 특정 org 신청 | Admin 승인 | 승인 시 자동 (is_active=false) |
| **PRIVATE** | allowedSellerIds | 자동 (whitelist) | 승인 시 자동 (is_active=false) |

### 2.3 Product Approval (v2)

| 항목 | 값 |
|------|------|
| **API** | `/api/v1/product-policy-v2/service-approval` (POST/approve) |
| **Auth** | `X-Admin-Secret` header (= JWT_SECRET) |
| **Table** | `product_approvals` |
| **Service** | `ProductApprovalV2Service` |

**Approval Flow**:

```
SERVICE:
  org 신청 (createServiceApproval)
    → PENDING
    → Admin 승인 (approveServiceProduct)
    → APPROVED (transaction)
    → Auto-create OrganizationProductListing (is_active=false)

PRIVATE:
  allowedSellerIds 포함 여부 확인
    → PENDING
    → Admin 승인 (approvePrivateProduct)
    → APPROVED (transaction)
    → Auto-create OrganizationProductListing (is_active=false)

PUBLIC:
  Supplier가 Offer 활성화
    → autoExpandPublicProduct()
    → 모든 active Organization에 Listing 자동 생성 (is_active=false)
```

### 2.4 OrganizationProductListing

| 항목 | 값 |
|------|------|
| **Table** | `organization_product_listings` |
| **Key Columns** | `organization_id, service_key, offer_id, master_id, is_active, price` |
| **Initial State** | `is_active=false` (매장 Owner가 활성화해야 함) |

**Auto-Listing Triggers**:

1. **PUBLIC Offer 승인** → `autoExpandPublicProduct()` → 모든 org에 자동 생성
2. **SERVICE/PRIVATE 승인** → approval 트랜잭션에서 생성
3. **새 Organization 생성** → `autoListPublicProductsForOrg()` → 기존 PUBLIC offer 자동 등록

---

## 3. Store Product Selection Flow

### 3.1 Product Catalog Browsing

| 항목 | 값 |
|------|------|
| **API** | `GET /api/v1/o4o-store/pharmacy-products/catalog` |
| **Auth** | `requireAuth` + store owner |
| **Purpose** | PUBLIC + SERVICE offer 카탈로그 조회 (승인 상태 포함) |

**Response per Offer**:

```json
{
  "offerId": "uuid",
  "productName": "...",
  "priceGeneral": 15000,
  "distributionType": "PUBLIC",
  "isApplied": false,
  "isApproved": false,
  "isListed": false
}
```

### 3.2 Product Listing Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/pharmacy-products/listings` | 내 매장 제품 로스터 조회 (service_key 필터) |
| PUT | `/pharmacy-products/listings/:id` | 제품 활성화/비활성화, 가격 설정 |
| GET | `/pharmacy-products/catalog` | B2B 카탈로그 탐색 |
| GET | `/pharmacy-products/applications` | 승인 요청 현황 |
| GET | `/pharmacy-products/approved` | 승인 완료 목록 |

### 3.3 Product Activation (Store Owner Action)

```
Store Owner → PUT /listings/:id
  → { is_active: true, price: 18000 }
  → OrganizationProductListing.is_active = true
  → 이제 채널에 연결 가능
```

---

## 4. Channel Creation Flow

### 4.1 Channel Types & Auto-Approval

| Channel | Status on Create | 승인 | Purpose |
|---------|:----------------:|:----:|---------|
| **B2C** | APPROVED | Auto | 온라인 스토어프론트 |
| **KIOSK** | APPROVED | Auto | 매장 내 키오스크 |
| **TABLET** | APPROVED | Auto | 직원용 태블릿 |
| **SIGNAGE** | APPROVED | Auto | 디지털 사이니지 |

**Base-Right Policy**: 모든 4개 채널은 생성 즉시 APPROVED (WO-STORE-CHANNEL-BASE-RIGHT-ACTIVATION-V1)

### 4.2 Channel Creation API

| 항목 | 값 |
|------|------|
| **API** | `POST /api/v1/kpa/store-hub/channels` |
| **Auth** | `requireAuth` + organization membership |
| **Body** | `{ channelType: "B2C" }` |
| **Table** | `organization_channels` |

**Response**:

```json
{
  "id": "uuid",
  "channelType": "B2C",
  "status": "APPROVED",
  "approvedAt": "2026-03-09T...",
  "visibleProductCount": 0,
  "totalProductCount": 0
}
```

### 4.3 Channel Status Transitions

```
APPROVED (Base-Right)
   ├── SUSPENDED (Admin 조치)
   ├── EXPIRED (시간 만료)
   └── TERMINATED (영구 종료)
```

---

## 5. Channel Product Linking Flow

### 5.1 Product-Channel Mapping

| 항목 | 값 |
|------|------|
| **API Base** | `/api/v1/kpa/store-hub/channel-products` |
| **Controller** | `store-channel-products.controller.ts` |
| **Table** | `organization_product_channels` |

### 5.2 Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/:channelId` | 채널에 등록된 제품 목록 |
| GET | `/:channelId/available` | 채널에 등록 가능한 제품 목록 |
| POST | `/:channelId` | 채널에 제품 추가 |
| PATCH | `/:channelId/reorder` | 제품 진열 순서 변경 |
| PATCH | `/:channelId/:productChannelId/deactivate` | 채널에서 제품 비활성화 |

### 5.3 Channel Product Entity

```
organization_product_channels
├── id (UUID)
├── channel_id (UUID → organization_channels)
├── product_listing_id (UUID → organization_product_listings)
├── is_active (boolean)
├── display_order (int)
├── sales_limit (int nullable)
└── created_at, updated_at
```

### 5.4 Guard Rules

- Channel must be **APPROVED** status (WO-CHANNEL-APPROVAL-GUARD-ENFORCEMENT-V1)
- Only **B2C/KIOSK** channels support product management
- Organization membership required
- Listing must belong to same organization

---

## 6. Customer Exposure Flow

### 6.1 B2C Storefront (4-Gate Visibility)

| 항목 | 값 |
|------|------|
| **API** | `GET /api/v1/stores/:slug/products` |
| **Controller** | `unified-store-public.routes.ts` |
| **Auth** | None (public) |

**4-Gate SQL**:

```sql
SELECT DISTINCT ON (spo.id)
  spo.id, pm.marketing_name AS name,
  pm.brand_name AS category,
  spo.price_general AS price,
  opc.sales_limit
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
INNER JOIN organization_product_listings opl
  ON opl.offer_id = spo.id
  AND opl.organization_id = $1
  AND opl.service_key = ANY($2::text[])     -- Gate 2: service_key
  AND opl.is_active = true                   -- Gate 2: listing active
INNER JOIN organization_product_channels opc
  ON opc.product_listing_id = opl.id
  AND opc.is_active = true                   -- Gate 3: channel product active
INNER JOIN organization_channels oc
  ON oc.id = opc.channel_id
  AND oc.channel_type = 'B2C'                -- Gate 1: channel type
  AND oc.status = 'APPROVED'                 -- Gate 1: channel approved
WHERE spo.is_active = true                   -- Gate 4: offer active
  AND s.status = 'ACTIVE'                    -- Gate 4: supplier active
```

**Multi-Service**: `?services=kpa,glycopharm` → `service_key = ANY($2::text[])`

### 6.2 Tablet Display

| 항목 | 값 |
|------|------|
| **API** | `GET /api/v1/stores/:slug/tablet/products` |
| **Auth** | None (public) |

**Dual Data Source**:

```
Supplier Products (4-Gate, channel_type='TABLET')
    +
Local Products (Display Domain Only — checkout 불가)
    ↓
App-Level Merge (DB UNION 금지 — WO-STORE-LOCAL-PRODUCT-HARDENING-V1)
```

**Tablet Features**:
- Staff-assisted ordering
- Request dialog (consultation/sample/order)
- Rate limit: 10 requests / 10 min / IP

### 6.3 Kiosk Display

| 항목 | 값 |
|------|------|
| **UI** | `services/web-glycopharm/src/components/layouts/KioskLayout.tsx` |
| **특징** | Large buttons, auto-reset timer (30s), shopping cart |

| Feature | Tablet | Kiosk |
|---------|--------|-------|
| Size | Standard (직원용) | Large (고객용) |
| Auto-reset | 없음 | 있음 (30s 경고) |
| Staff interaction | 있음 | 없음 |
| Font size | Normal | XL |

### 6.4 QR Landing

| 항목 | 값 |
|------|------|
| **API** | `GET /api/v1/store/qr/public/:slug` |
| **Auth** | None (public) |
| **Table** | `store_qr_codes`, `store_qr_scan_events` |

**Flow**:

```
QR Scan → GET /qr/public/:slug
    → Return: { type, title, landingType, landingTargetId, storeSlug }
    → Fire-and-forget: store_qr_scan_events INSERT (5s dedup by IP hash)
    → Frontend: Redirect to landing target
```

**Scan Analytics**:
- Device type detection (mobile/tablet/desktop)
- IP hash (SHA256, privacy)
- 5-second dedup per IP + QR code

---

## 7. Order Flow

### 7.1 Checkout Initiate

| 항목 | 값 |
|------|------|
| **API** | `POST /api/checkout/initiate` |
| **Auth** | `requireAuth` |
| **Controller** | `checkoutController.ts` |
| **Service** | `checkoutService.createOrder()` |

**Request**:

```json
{
  "items": [
    { "productId": "uuid", "productName": "...", "quantity": 1, "unitPrice": 15000 }
  ],
  "shippingAddress": { "name": "...", "phone": "...", "address": "..." },
  "sellerOrganizationId": "uuid"
}
```

**Phase N-1 Constraints**:
- Max 3 items
- Max 1,000,000 KRW
- `sellerId`: 'platform-seller' (hardcoded)
- `supplierId`: 'supplier-phase-n1' (hardcoded)

### 7.2 Payment (Toss)

```
1. POST /api/checkout/initiate
   → Order 생성 (status: CREATED)
   → Payment 생성 (status: PENDING)
   → Toss Payment 준비 (orderId, amount, successUrl, failUrl)
   → Response: { orderId, orderNumber, totalAmount, payment: tossPaymentInfo }

2. Customer → Toss 결제 페이지

3. POST /api/checkout/confirm (Toss callback, no auth)
   → paymentKey, orderId, amount 검증
   → tossPaymentsService.confirmPayment()
   → Order: PAID, Payment: PAID
```

### 7.3 Order Number Format

```
ORD-YYYYMMDD-XXXX
예: ORD-20260309-4281
```

### 7.4 Order Status Transitions

```
CREATED
  ↓
PENDING_PAYMENT
  ↓
PAID ──→ REFUNDED
  │
  └──→ CANCELLED
```

### 7.5 Checkout Guard (Supply Contract Validation)

| 항목 | 값 |
|------|------|
| **Service** | `checkout-guard.service.ts` |
| **Function** | `validateSupplierSellerRelation(dataSource, sellerId)` |

**Distribution Tier Verification**:
- Tier 1 (PUBLIC): 승인 불필요
- Tier 2 (SERVICE): SERVICE 승인 필요
- Tier 3 (PRIVATE): PRIVATE 승인 필요
- No records → 허용 (PUBLIC-only or non-Neture seller)
- Approved record 존재 → 허용
- Records 존재하나 모두 미승인 → 거부 (SUPPLY_CONTRACT_NOT_APPROVED)

### 7.6 Admin Order Management

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/orders/stats` | 주문 통계 (paid/refunded/pending/total + revenue) |
| GET | `/api/admin/orders` | 전체 주문 목록 (paginated) |
| GET | `/api/admin/orders/:id` | 주문 상세 + 결제 정보 |
| POST | `/api/admin/orders/:id/refund` | 환불 처리 |
| GET | `/api/admin/orders/:id/logs` | 주문 감사 로그 |

---

## 8. Content Operations Flow

### 8.1 Store Library

| 항목 | 값 |
|------|------|
| **Table** | `store_library_items` |
| **API** | `/pharmacy/library` (CRUD) |
| **Domain** | Display (commerce 연결 없음) |
| **사용 서비스** | KPA Society |

**CRUD Operations**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/pharmacy/library` | 목록 (pagination, search, category filter) |
| POST | `/pharmacy/library` | 생성 (title, fileUrl, category) |
| PUT | `/pharmacy/library/:id` | 수정 |
| DELETE | `/pharmacy/library/:id` | Soft-delete (isActive=false) |

**Categories**: banner, promotion, signage, qr, manual, other

### 8.2 QR Code Operations

| 항목 | 값 |
|------|------|
| **Table** | `store_qr_codes` |
| **API** | `/pharmacy/qr` (CRUD + analytics) |
| **사용 서비스** | KPA Society |

**Staff Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/pharmacy/qr` | QR 목록 + scan counts |
| POST | `/pharmacy/qr` | QR 생성 (title, slug, landingType, landingTargetId) |
| PUT | `/pharmacy/qr/:id` | QR 수정 |
| DELETE | `/pharmacy/qr/:id` | Soft-delete |
| GET | `/pharmacy/qr/:id/analytics` | Scan 통계 (total, today, weekly, device breakdown) |
| GET | `/pharmacy/qr/:id/image` | QR 이미지 (PNG/SVG) |
| POST | `/pharmacy/qr/print` | Batch PDF (max 24) |

**Landing Types**: product, promotion, page, link

### 8.3 POP (Point of Purchase)

| 항목 | 값 |
|------|------|
| **API** | `POST /pharmacy/pop/generate` |
| **사용 서비스** | KPA Society |
| **Output** | PDF binary |

**Request**:

```json
{
  "libraryItemIds": ["uuid1", "uuid2"],
  "qrId": "uuid",
  "layout": "A4"
}
```

**Rules**: Max 8 library items, same organization, isActive=true

### 8.4 Signage (Digital Signage Playlists)

| 항목 | 값 |
|------|------|
| **Table** | `store_playlists`, `store_playlist_items` |
| **API** | `/store-playlists` |
| **사용 서비스** | GlycoPharm (8 sub-routes), KPA Society |

**Playlist Types**:
- **SINGLE**: 단일 영상 반복 (max 1 item)
- **LIST**: 복수 영상 순환

**Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/store-playlists` | 재생목록 목록 |
| POST | `/store-playlists` | 재생목록 생성 |
| PATCH | `/store-playlists/:id` | 이름/상태 수정 |
| DELETE | `/store-playlists/:id` | Soft-delete |
| GET | `/store-playlists/:id/items` | 항목 목록 |
| POST | `/store-playlists/:id/items` | 항목 추가 (snapshot) |
| POST | `/store-playlists/:id/items/from-library` | Library → Snapshot → 항목 추가 |
| PATCH | `/store-playlists/:id/items/reorder` | 순서 변경 |
| DELETE | `/store-playlists/:id/items/:itemId` | 항목 삭제 (is_locked이면 차단) |
| GET | `/store-playlists/public/:id` | 공개 재생 (published + active만) |

**Forced Content Rules**:
- `is_forced=true` → 매장 Owner 삭제 불가
- `forced_start_at / forced_end_at` → 시간 제한
- Admin 주입 콘텐츠 (운영자 광고)

**Library → Signage Integration**:

```
StoreLibraryItem
    → POST /store-playlists/:id/items/from-library
    → Create o4o_asset_snapshots (source_service='store-library', asset_type='signage')
    → Create StorePlaylistItem (snapshot_id, display_order)
    → 디지털 사이니지에서 재생
```

### 8.5 Store Asset Management

| 항목 | 값 |
|------|------|
| **Core Table** | `o4o_asset_snapshots` (FROZEN) |
| **Extension Table** | `kpa_store_asset_controls` |
| **API** | `/store-assets` |

**Snapshot Types**:
- `user_copy`: 매장 생성 (수정 가능)
- `hq_forced`: 본부 푸시 (locked, 수정 불가)
- `campaign_push`: 캠페인 (temporal)
- `template_seed`: 템플릿 기본값

**Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/store-assets` | Snapshot + Control LEFT JOIN |
| PATCH | `/store-assets/:id/publish` | 공개 상태 변경 (forced이면 차단) |
| PATCH | `/store-assets/:id/channel` | 채널 맵 변경 (forced이면 차단) |

### 8.6 Store Blog

| 항목 | 값 |
|------|------|
| **Table** | `store_blog_posts` |
| **API** | `/stores/:slug/blog` (public), `/stores/:slug/blog/staff` (auth) |
| **사용 서비스** | GlycoPharm, KPA Society |

**Public Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stores/:slug/blog` | 발행 글 목록 (published + publishedAt <= now) |
| GET | `/stores/:slug/blog/:postSlug` | 글 상세 |

**Staff Endpoints**:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stores/:slug/blog/staff` | 모든 글 (draft/published/archived) |
| POST | `/stores/:slug/blog/staff` | 글 생성 (draft) |
| PUT | `/stores/:slug/blog/staff/:id` | 글 수정 |
| PATCH | `/stores/:slug/blog/staff/:id/publish` | 발행 |
| PATCH | `/stores/:slug/blog/staff/:id/archive` | 보관 |
| DELETE | `/stores/:slug/blog/staff/:id` | 삭제 (hard delete) |

---

## 9. Service-Specific Operational Differences

### 9.1 GlycoPharm — Full Store Operations + Care Integration

**Dashboard Focus**: AI-driven operations hub

**Hub Dashboard (StoreOverviewPage) Data**:

```typescript
CockpitData {
  aiSummary: { summary, riskLevel, recommendedActions[] },
  todayActions: { todayOrders, pendingOrders, pendingRequests, operatorNotices },
  careDashboard: { totalPatients, highRiskCount, moderateRiskCount, lowRiskCount },
  signageStats: { enabled, activeContents },
  productStats: { total }
}
```

**AI Signal System**:

| Signal | Level | Trigger |
|--------|-------|---------|
| `glycopharm.high_risk` | critical/warning | 고위험 환자 수 |
| `glycopharm.coaching` | critical | 미실시 코칭 |
| `glycopharm.analysis` | info | 개선 추이 |
| `glycopharm.ai_summary` | varies | AI 위험 레벨 |
| `glycopharm.revenue` | info | 일일 주문 수 |
| `glycopharm.pending_requests` | warning | 미처리 고객 요청 |

**QuickActions**:
- Care review 시작
- 코칭 세션 자동 생성
- AI 분석 갱신
- 요청 처리 이동

### 9.2 KPA Society — Marketing Operations Hub

**Dashboard Focus**: QR/POP/Content analytics

**Marketing Dashboard (StoreMarketingDashboardPage) Data**:

```
KPI Cards (4):
├── Total Scans
├── Today's Scans
├── Weekly Scans
└── Active QR Count

Top QR Performance (TOP 5):
├── Rank + Title + Slug + Scan Count
└── Link to full analytics

Recent Activity (Last 8 scans):
├── Device Type (mobile/tablet/desktop)
├── QR Title
└── Timestamp
```

**Quick Actions (4)**:
- QR 관리 → `/store/marketing/qr`
- POP 자료 → `/store/marketing/pop`
- 자료실 → `/store/operation/library`
- 상세 분석 → `/store/analytics/marketing`

### 9.3 K-Cosmetics — Cockpit View

**Dashboard Focus**: 5-Block store cockpit

**StoreCockpitPage Blocks**:

```
Block 1: Store Status Header
├── Store selector (multi-store support)
├── Member count + role
└── Quick buttons: 상품 관리, 주문 관리

Block 2: KPI Cards (4)
├── Today Orders + Revenue
├── Monthly Revenue + Orders
├── Channel Breakdown
└── Registered Products (visible count)

Block 3: Product Operations
├── Top Products (by revenue)
└── Recent Listings

Block 4: Content/Signage
├── Playlist list
└── Auto-generate button

Block 5: AI Insights
├── Positive/Warning/Info indicators
└── Insight messages
```

**Product Schema Difference**:
- **K-Cosmetics**: `cosmetics_store_listings` (cosmetics schema, 격리)
- **KPA/GlycoPharm**: `organization_product_listings` (공유 테이블, service_key 분리)

### 9.4 GlucoseView — Stub Implementation

**Dashboard**: 4 placeholder KPI cards (모두 `-` 표시)

```
등록 환자: -
이번달 방문: -
CGM 데이터: -
활성 서비스: -
```

**No API integration**: All values hardcoded
**2/8 menus**: dashboard + settings only

---

## 10. Operational Scenarios

### Scenario 1: Supplier → Store → B2C → Order

```
1. Supplier creates ProductMaster (barcode → MFDS lookup)
   UI:  SupplierProductCreatePage
   API: POST /api/v1/neture/supplier/products
   DB:  product_masters INSERT

2. Supplier creates Offer (distributionType=SERVICE)
   DB:  supplier_product_offers INSERT (isActive=false, PENDING)

3. Admin approves Offer
   API: POST /api/v1/product-policy-v2/service-approval
   API: POST /api/v1/product-policy-v2/service-approval/:id/approve
   DB:  product_approvals INSERT (APPROVED)
   DB:  organization_product_listings INSERT (is_active=false)

4. Store Owner activates listing
   API: PUT /api/v1/o4o-store/pharmacy-products/listings/:id
   DB:  organization_product_listings UPDATE (is_active=true)

5. Store Owner creates B2C channel
   API: POST /api/v1/kpa/store-hub/channels
   DB:  organization_channels INSERT (status=APPROVED)

6. Store Owner links product to B2C channel
   API: POST /api/v1/kpa/store-hub/channel-products/:channelId
   DB:  organization_product_channels INSERT

7. Customer views storefront
   API: GET /api/v1/stores/:slug/products
   SQL: 4-Gate visibility query
   UI:  StoreFront / FranchiseStandardTemplate

8. Customer orders
   API: POST /api/checkout/initiate
   DB:  checkout_orders INSERT (CREATED)
   →    Toss payment redirect
   API: POST /api/checkout/confirm
   DB:  checkout_orders UPDATE (PAID)
```

### Scenario 2: Local Product → Tablet → QR

```
1. Store Owner creates local product
   API: POST /api/v1/store-local-products
   DB:  store_local_products INSERT

2. Tablet displays local products
   API: GET /api/v1/stores/:slug/tablet/products
   Response: supplierProducts + localProducts (app-level merge)

3. Store Owner creates QR for product
   API: POST /api/v1/store/pharmacy/qr
   DB:  store_qr_codes INSERT (landingType=product, landingTargetId=offerId)

4. Customer scans QR
   API: GET /api/v1/store/qr/public/:slug
   DB:  store_qr_scan_events INSERT (fire-and-forget)
   UI:  Redirect to landing target

Note: Local products are Display Domain ONLY (checkout 불가)
```

### Scenario 3: Content → Signage

```
1. Store Owner uploads to library
   API: POST /api/v1/store/pharmacy/library
   DB:  store_library_items INSERT

2. Store Owner creates playlist
   API: POST /api/v1/store-playlists
   DB:  store_playlists INSERT

3. Library item → Playlist
   API: POST /api/v1/store-playlists/:id/items/from-library
   DB:  o4o_asset_snapshots INSERT (source='store-library', type='signage')
   DB:  store_playlist_items INSERT

4. Publish playlist
   API: PATCH /api/v1/store-playlists/:id
   DB:  store_playlists UPDATE (publish_status='published')

5. Signage device renders
   API: GET /api/v1/store-playlists/public/:id
   Response: playlist + items with content_json
```

---

## 11. Operational Risk Analysis

### RISK-1: Phase N-1 Checkout Constraints (HIGH)

**현상**: sellerId='platform-seller', supplierId='supplier-phase-n1' 하드코딩
**영향**: 실제 Supplier → Seller 매핑이 아닌 플랫폼 단일 판매자 모드
**제한**: Max 3 items, Max 1,000,000 KRW
**권장**: Phase N-2에서 실제 Supplier/Seller 연결 구현

### RISK-2: MFDS Integration 미구현 (MEDIUM)

**현상**: MFDS 서비스가 STUB (always returns `verified: false`)
**영향**: 모든 ProductMaster가 `isMfdsVerified=false`로 생성
**권장**: 식약처 API 연동 구현 또는 수동 검증 프로세스 확립

### RISK-3: K-Cosmetics Product Schema 격리 (MEDIUM)

**현상**: `cosmetics_store_listings` 별도 schema vs `organization_product_listings` 공유 테이블
**영향**: K-Cosmetics는 Neture 공급망 미사용, 채널 시스템 미연결
**현재**: Cockpit에서 KPI 표시만, 실제 채널 운영 없음
**권장**: K-Cosmetics의 Neture 통합 여부 결정

### RISK-4: Local Product → Commerce 단절 (MEDIUM)

**현상**: `store_local_products`는 Display Domain ONLY (checkout 연결 불가)
**영향**: Tablet에서 보이는 local product에 대해 주문 불가
**의도**: WO-STORE-LOCAL-PRODUCT-DISPLAY-V1 — 의도적 설계
**권장**: 향후 local product commerce 확장 시 별도 WO 필요

### RISK-5: GlucoseView Store Hub 무기능 (LOW)

**현상**: 4개 placeholder KPI card, API 미연결
**영향**: Store Hub가 존재하나 실질적 기능 없음
**권장**: GlucoseView Store Hub 필요성 재검토

### RISK-6: Signage Forced Content 관리 부재 (LOW)

**현상**: is_forced, is_locked 메커니즘 존재하나 Admin UI에서 forced 콘텐츠 주입 UI 미확인
**영향**: Forced content 기능이 코드에 존재하나 운영 수단 불명확
**권장**: Admin signage forced injection UI 존재 여부 확인

### RISK-7: QR Analytics 단방향 (INFO)

**현상**: QR scan events는 append-only, 분석 대시보드는 KPA Society에만 존재
**영향**: GlycoPharm 등 다른 서비스에서 QR 분석 불가
**권장**: QR analytics를 Platform Common으로 확장 검토

---

## 12. File Manifest

### Product Supply Chain

| File | Purpose |
|------|---------|
| `apps/api-server/src/modules/neture/neture.service.ts` | Product Master + Offer creation |
| `apps/api-server/src/modules/neture/neture.routes.ts` | Neture API routes |
| `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | Product SSOT entity |
| `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` | Offer entity |
| `apps/api-server/src/modules/neture/services/mfds.service.ts` | MFDS integration (STUB) |
| `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts` | Approval service |
| `apps/api-server/src/modules/product-policy-v2/product-policy-v2.internal.routes.ts` | Approval routes |
| `apps/api-server/src/utils/auto-listing.utils.ts` | Auto-listing for PUBLIC offers |
| `apps/api-server/src/constants/service-keys.ts` | Service key constants |

### Store Operations

| File | Purpose |
|------|---------|
| `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` | Product listing management |
| `apps/api-server/src/routes/o4o-store/controllers/store-hub.controller.ts` | Hub KPI + Channel creation |
| `apps/api-server/src/routes/o4o-store/controllers/store-channel-products.controller.ts` | Channel product linking |
| `apps/api-server/src/routes/kpa/entities/organization-product-listing.entity.ts` | Product listing entity |
| `apps/api-server/src/routes/kpa/entities/organization-channel.entity.ts` | Channel entity |
| `apps/api-server/src/routes/kpa/entities/organization-product-channel.entity.ts` | Product-channel entity |

### Customer Exposure

| File | Purpose |
|------|---------|
| `apps/api-server/src/routes/platform/unified-store-public.routes.ts` | Unified storefront (4-Gate) |
| `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` | GlycoPharm storefront |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | Tablet display |
| `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts` | QR landing |
| `services/web-glycopharm/src/pages/store/StoreFront.tsx` | B2C storefront UI |
| `services/web-glycopharm/src/components/layouts/TabletLayout.tsx` | Tablet UI |
| `services/web-glycopharm/src/components/layouts/KioskLayout.tsx` | Kiosk UI |

### Order Flow

| File | Purpose |
|------|---------|
| `apps/api-server/src/routes/checkout.routes.ts` | Checkout routes |
| `apps/api-server/src/controllers/checkout/checkoutController.ts` | Checkout controller |
| `apps/api-server/src/services/checkout.service.ts` | Order + Payment service |
| `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` | Order entity |
| `apps/api-server/src/core/checkout/checkout-guard.service.ts` | Supply contract guard |
| `apps/api-server/src/controllers/admin/adminOrderController.ts` | Admin order management |

### Content Operations

| File | Purpose |
|------|---------|
| `apps/api-server/src/routes/o4o-store/controllers/store-library.controller.ts` | Library CRUD |
| `apps/api-server/src/routes/o4o-store/controllers/store-qr.controller.ts` | QR print |
| `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts` | QR landing + analytics |
| `apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts` | POP PDF generation |
| `apps/api-server/src/routes/o4o-store/controllers/store-playlist.controller.ts` | Signage playlists |
| `apps/api-server/src/routes/o4o-store/controllers/store-asset-control.controller.ts` | Asset management |
| `apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts` | Asset snapshots |
| `apps/api-server/src/routes/o4o-store/controllers/blog.controller.ts` | Blog CRUD |
| `apps/api-server/src/routes/platform/entities/store-library-item.entity.ts` | Library entity |
| `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts` | QR code entity |
| `apps/api-server/src/routes/platform/entities/store-qr-scan-event.entity.ts` | QR scan event entity |
| `apps/api-server/src/routes/kpa/entities/store-playlist.entity.ts` | Playlist entity |
| `apps/api-server/src/routes/kpa/entities/store-playlist-item.entity.ts` | Playlist item entity |

### Service-Specific Store Pages

| Service | File | Page |
|---------|------|------|
| GlycoPharm | `services/web-glycopharm/src/pages/store/StoreOverviewPage.tsx` | Hub dashboard |
| GlycoPharm | `services/web-glycopharm/src/pages/store/hooks/useStoreHub.ts` | Hub data hook |
| KPA Society | `services/web-kpa-society/src/pages/pharmacy/StoreMarketingDashboardPage.tsx` | Marketing dashboard |
| KPA Society | `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx` | QR management |
| KPA Society | `services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx` | POP generation |
| KPA Society | `services/web-kpa-society/src/pages/pharmacy/StoreLibraryPage.tsx` | Library management |
| KPA Society | `services/web-kpa-society/src/pages/pharmacy/MarketingAnalyticsPage.tsx` | Analytics |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx` | Store cockpit |
| GlucoseView | `services/web-glucoseview/src/pages/store/StoreOverviewPage.tsx` | Stub dashboard |

---

*Investigation complete. 2026-03-09*
*Store Hub Operational Model: Verified across 4 services with 7 operational risks identified*
