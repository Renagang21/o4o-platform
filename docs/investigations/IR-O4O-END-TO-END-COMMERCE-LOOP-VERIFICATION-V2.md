# IR-O4O-END-TO-END-COMMERCE-LOOP-VERIFICATION-V2

> **조사 일자**: 2026-03-09
> **대상 서비스**: KPA Society (slug 기반 Storefront)
> **조사 방법**: 코드 경로 분석 + 배포 API 호출
> **조사자**: AI

---

## 13-Step 검증 결과 요약

| Step | 항목 | 결과 | 비고 |
|------|------|------|------|
| 1 | 공급사 상품 등록 | **PASS** | `POST /neture/supplier/products` → `supplier_product_offers` |
| 2 | 상품 승인 + 자동 리스팅 | **PASS** | `autoExpandPublicProduct()` → 모든 active org에 OPL(is_active=false) 생성 |
| 3 | 매장 상품 카탈로그 조회 | **PASS** | `GET /kpa/pharmacy/products/catalog` → isApplied/isApproved/isListed 반환 |
| 4 | 매장 상품 리스팅 활성화 | **PASS** | `PUT /kpa/pharmacy/products/listings/:id` → is_active toggle + audit log |
| 5 | 채널 생성 | **PASS** | `POST /kpa/store-hub/channels` → 4 types, auto-APPROVED (Base Rights) |
| 6 | 채널 상품 등록 | **PASS** | `POST /kpa/store-hub/channel-products/:channelId` → B2C/KIOSK만 가능 |
| 7 | Storefront 공개 상품 목록 | **PASS** | `GET /stores/:slug/products` → 4-gate visibility + API 200 OK 확인 |
| 8 | 상품 상세 페이지 | **FAIL** | Backend API 존재. **Frontend route 미등록** (`/store/:slug/products/:id`) |
| 9 | QR 코드 랜딩 | **PASS** | `GET /qr/public/:slug` → scan tracking + store redirect |
| 10 | QR 전단지 인쇄 | **PASS** | `POST /pharmacy/qr/print` → A4 8-cell PDF (pdfkit) |
| 11 | 장바구니 (Cart) | **PASS (제한적)** | Client-side localStorage만. KPA 전용 cart 없음 |
| 12 | 주문 생성 | **FAIL (KPA)** | GlycoPharm/Cosmetics ✅. **KPA checkout endpoint 없음** |
| 13 | 결제 처리 | **FAIL (KPA)** | Toss Payments 연동 존재. **KPA → 결제 경로 없음** |

**총 결과: 10 PASS / 3 FAIL (KPA 기준)**

---

## STEP 1: 공급사 상품 등록 — PASS

- **Endpoint**: `POST /api/v1/neture/supplier/products`
- **Route**: `apps/api-server/src/modules/neture/neture.routes.ts:1147`
- **Service**: `neture.service.ts:1334-1435` → `createSupplierOffer()`

**코드 경로**:
```
Request (barcode, manualData, priceGeneral...)
  → Supplier ACTIVE status 검증
  → Barcode → ProductMaster resolve/create
  → SupplierProductOffer INSERT (isActive=false, approvalStatus=PENDING)
```

**주요 검증 사항**:
- barcode 필수, masterId 직접 주입 차단 ✅
- isActive=false, approvalStatus=PENDING 기본값 ✅
- Boundary: supplierId로 스코핑 ✅

---

## STEP 2: 상품 승인 + 자동 리스팅 — PASS

- **Endpoint**: `POST /api/v1/neture/admin/products/:id/approve`
- **Service**: `neture.service.ts:510-561` → `approveProduct()`
- **Auto-listing**: `auto-listing.utils.ts:27-60` → `autoExpandPublicProduct()`

**코드 경로**:
```
Admin Approve Request
  → SupplierProductOffer status=PENDING 확인
  → QueryRunner Transaction 시작
  → offer.approvalStatus=APPROVED, isActive=true
  → autoExpandPublicProduct(queryRunner, offerId, masterId)
    → INSERT INTO organization_product_listings
      SELECT org_id, ose.service_code AS service_key
      FROM organization_service_enrollments ose
      WHERE ose.status='active' AND org.isActive=true
      ON CONFLICT DO NOTHING
  → Transaction COMMIT
```

**KPA 포함 여부**: ✅ `service_code='kpa-society'`인 enrollment 가진 모든 active org에 OPL 자동 생성
**is_active 기본값**: `false` (매장에서 수동 활성화 필요) ✅

---

## STEP 3: 매장 상품 카탈로그 — PASS

- **Endpoint**: `GET /api/v1/kpa/pharmacy/products/catalog`
- **Controller**: `pharmacy-products.controller.ts:60-146`
- **Auth**: `requireAuth` + `requirePharmacyOwner`

**응답 필드**:
- `isApplied`: product_approvals에 pending/approved 존재 여부 ✅
- `isApproved`: product_approvals에 approved 존재 여부 ✅
- `isListed`: organization_product_listings 존재 여부 ✅

**Boundary**: organizationId 필터 (requirePharmacyOwner → organization_members 검증) ✅

---

## STEP 4: 매장 상품 리스팅 활성화 — PASS

- **Endpoint**: `PUT /api/v1/kpa/pharmacy/products/listings/:id`
- **Controller**: `pharmacy-products.controller.ts:271-311`

**코드 경로**: `listing.is_active = req.body.isActive` → `listingRepo.save()` + KpaAuditLog
**소유권 검증**: `WHERE id=$1 AND organization_id=$2 AND service_key=$3` 복합 키 ✅

---

## STEP 5: 채널 생성 — PASS

- **Endpoint**: `POST /api/v1/kpa/store-hub/channels`
- **Controller**: `store-hub.controller.ts:303-366`

**Auto-APPROVED 로직**: 모든 4개 채널 (B2C, KIOSK, TABLET, SIGNAGE) → `status='APPROVED'` 즉시 ✅
**UNIQUE Constraint**: `(organization_id, channel_type)` — 중복 채널 방지 ✅

---

## STEP 6: 채널 상품 등록 — PASS

- **Endpoint**: `POST /api/v1/kpa/store-hub/channel-products/:channelId`
- **Controller**: `store-channel-products.controller.ts:159-235`

**PRODUCT_CHANNELS 제약**: `['B2C', 'KIOSK']`만 상품 등록 가능 ✅
**Channel Status Guard**: `status='APPROVED'` 필수 (POST mutation만 적용) ✅
**비활성 재활성화**: 기존 inactive mapping → reactivate (is_active=true) ✅

---

## STEP 7: Storefront 공개 상품 목록 — PASS

- **Endpoint**: `GET /api/v1/stores/:slug/products`
- **Route**: `unified-store-public.routes.ts:535-557`

**4-Gate Visibility SQL**:
```sql
FROM supplier_product_offers spo
JOIN organization_product_listings opl ON opl.is_active = true       -- Gate 1
JOIN organization_product_channels opc ON opc.is_active = true       -- Gate 2
JOIN organization_channels oc ON oc.status = 'APPROVED'              -- Gate 3
WHERE spo.is_active = true AND s.status = 'ACTIVE'                   -- Gate 4
```

**API 검증 결과** (2026-03-09):
```
GET /api/v1/stores/resolve/대한약사회
→ {"success":true,"data":{"found":true,"slug":"대한약사회","serviceKey":"kpa"}}

GET /api/v1/stores/대한약사회/products
→ {"success":true,"data":[],"meta":{"page":1,"limit":20,"total":0,"totalPages":0}}
```
**결과**: 200 OK, 빈 배열 (활성 리스팅 없음 — 정상) ✅

---

## STEP 8: 상품 상세 페이지 — FAIL

### Backend: EXISTS ✅
- **Endpoint**: `GET /api/v1/stores/:slug/products/:id`
- **Route**: `unified-store-public.routes.ts:560-587`
- 동일 `queryVisibleProducts()` + `productId` 필터 사용

### Frontend: MISSING ❌
- **App.tsx:673**: `/store/:slug` → `StorefrontHomePage` (홈만 존재)
- **미등록 라우트**: `/store/:slug/products/:id` → **라우트 정의 없음**
- **미존재 컴포넌트**: `StorefrontProductDetailPage` → **파일 없음** (web-kpa-society)

### 영향
- QR Landing (`QrLandingPage.tsx:68`)이 `navigate(/store/${slug}/products/${id})`로 이동 → **404 발생**
- 스토어프론트에서 상품 클릭 → 상세 페이지 이동 불가

### 권고
```
WO-O4O-STOREFRONT-PRODUCT-DETAIL-PAGE-V1:
1. StorefrontProductDetailPage.tsx 생성 (web-kpa-society)
2. App.tsx에 Route 추가: /store/:slug/products/:id
3. API: GET /api/v1/stores/:slug/products/:id (이미 구현됨)
```

---

## STEP 9: QR 코드 랜딩 — PASS

- **Backend**: `store-qr-landing.controller.ts:58-135` → `GET /qr/public/:slug`
- **Frontend**: `QrLandingPage.tsx` → `/qr/:slug`
- **Scan 추적**: `store_qr_scan_events` INSERT (5초 dedup, fire-and-forget) ✅
- **Store Slug 해결**: `platform_store_slugs WHERE store_id=$1` ✅
- **디바이스 감지**: mobile/tablet/desktop ✅

---

## STEP 10: QR 전단지 인쇄 — PASS

- **Endpoint**: `POST /api/v1/kpa/pharmacy/qr/print`
- **Service**: `qr-print.service.ts:87-192`
- **PDF**: A4 8-cell grid (2×4), 120×120 QR per cell, NotoSansKR font ✅
- **Batch**: 최대 24개 QR 코드 ✅
- **개별 다운로드**: `GET /pharmacy/qr/:id/image?format=png|svg` ✅

---

## STEP 11: 장바구니 — PASS (제한적)

- **구현**: Client-side localStorage (`o4o_cart` key)
- **위치**: `apps/admin-dashboard/src/services/cartService.ts`
- **KPA 전용**: ❌ 없음 (admin-dashboard에만 존재)

**제한 사항**:
- 서버 사이드 cart persistence 없음
- KPA web-kpa-society에 cart 서비스 미구현
- 사용자 인증과 cart 연결 없음

---

## STEP 12: 주문 생성 — FAIL (KPA 미연결)

### 존재하는 구현
| 서비스 | Endpoint | Entity | 상태 |
|--------|----------|--------|------|
| GlycoPharm | `POST /api/v1/glycopharm/checkout` | EcommerceOrder | ✅ 정상 |
| Cosmetics | `POST /api/v1/cosmetics/orders` | EcommerceOrder | ✅ 정상 |
| Generic | `POST /api/checkout/initiate` | CheckoutOrder (legacy) | ⚠️ Phase N-2 |

### KPA: ❌ 없음
- `/routes/kpa/` 내에 checkout/order endpoint 없음
- KPA groupbuy-admin은 상품 가시성/통계만 관리 (주문 생성 아님)
- **checkoutService.createOrder() 호출 경로 없음**

### Dual Order 시스템 현황
- `EcommerceOrder` (Core): GlycoPharm/Cosmetics 사용 ✅
- `CheckoutOrder` (Legacy): Generic checkout 사용 ⚠️ (E-commerce Core 계약 위반)

---

## STEP 13: 결제 처리 — FAIL (KPA 미연결)

### Toss Payments 인프라: EXISTS ✅
- **Service**: `toss-payments.service.ts`
- **Prepare**: `preparePayment(orderId, orderName, amount, successUrl, failUrl)`
- **Confirm**: `POST /api/checkout/confirm` → Toss API `/payments/confirm`
- **Refund**: `POST /api/checkout/refund` → Toss API `/payments/{paymentKey}/cancel`
- **DB**: `checkout_payments` (paymentKey, status, method, cardCompany...)

### KPA: ❌ 미연결
- KPA → 주문 경로 자체가 없으므로 결제 도달 불가
- KPA 전용 payment route 없음

### 추가 발견
- Toss Webhook 미구현 (poll-based confirm만 존재)
- payment confirm 시 buyerId boundary check 미확인 (orderId만 검증)

---

## 발견된 이슈 목록 (우선순위순)

### CRITICAL

| # | 이슈 | 영향 | 권고 WO |
|---|------|------|---------|
| C1 | **KPA checkout endpoint 없음** | KPA 사용자 주문 생성 불가 | WO-O4O-KPA-CHECKOUT-INTEGRATION-V1 |
| C2 | **StorefrontProductDetailPage 없음** | 상품 상세 페이지 접근 불가, QR→상품 연결 끊김 | WO-O4O-STOREFRONT-PRODUCT-DETAIL-PAGE-V1 |
| C3 | **KPA → Payment 경로 없음** | KPA 사용자 결제 불가 | C1 해결 시 함께 해결 |

### MEDIUM

| # | 이슈 | 영향 | 권고 |
|---|------|------|------|
| M1 | KPA cart 서비스 미구현 | 장바구니 기능 없음 | WO-O4O-KPA-CART-SERVICE-V1 |
| M2 | CheckoutOrder vs EcommerceOrder 이원화 | E-commerce Core 계약 위반 (generic checkout) | 향후 마이그레이션 대상 |
| M3 | Payment confirm buyerId 미검증 | 타인 주문 결제 확인 가능성 (이론적) | WO-O4O-PAYMENT-BOUNDARY-GUARD-V1 |
| M4 | Toss Webhook 미구현 | 결제 후 브라우저 종료 시 상태 미반영 | WO-O4O-PAYMENT-WEBHOOK-V1 |

### LOW

| # | 이슈 | 비고 |
|---|------|------|
| L1 | 대한약사회 storefront data=[] | 활성 리스팅 없어서 정상 (상품 미등록 상태) |

---

## Commerce Loop Flow Diagram (KPA 기준)

```
✅ STEPS 1-7: 상품 공급 → 매장 진열 → Storefront 노출 — 완성

    Supplier                    Platform Admin              Store Owner (KPA)
    ────────                    ──────────────              ─────────────────
    POST /supplier/products     POST /admin/approve         GET /pharmacy/catalog
    (상품 등록)                  (승인 + auto-expand)         (카탈로그 확인)
         │                           │                           │
         └── SPO created ──────────▶ OPL created ──────────▶ PUT /listings/:id
                                    (is_active=false)        (활성화)
                                                                │
                                                          POST /channels (채널)
                                                                │
                                                          POST /channel-products
                                                          (채널 상품 등록)
                                                                │
                                                          ┌─────▼─────┐
                                                          │ Storefront │
                                                          │  4-Gate    │
                                                          │ Visibility │
                                                          └─────┬─────┘
                                                                │
                                                    GET /stores/:slug/products
                                                          (공개 상품 목록) ✅

❌ STEPS 8, 11-13: 상품 상세 → Cart → 주문 → 결제 — 미완성

    Customer
    ────────
    GET /store/:slug/products/:id  ← STEP 8: Frontend route 없음 ❌
         │
    Add to Cart                    ← STEP 11: KPA cart 없음 ❌
         │
    POST /checkout                 ← STEP 12: KPA endpoint 없음 ❌
         │
    Payment (Toss)                 ← STEP 13: 경로 도달 불가 ❌
```

---

## 후속 작업 권고

1. **WO-O4O-STOREFRONT-PRODUCT-DETAIL-PAGE-V1** — StorefrontProductDetailPage 컴포넌트 생성 + App.tsx 라우트 등록 (QR→상품 흐름 복구)
2. **WO-O4O-KPA-CHECKOUT-INTEGRATION-V1** — KPA checkout endpoint + EcommerceOrder 통합 (Cart → Order → Payment 전체 루프)
3. **IR-O4O-COMMERCE-DATA-INTEGRITY-AUDIT** — Order/Settlement/Commission 데이터 정합성 (GlycoPharm/Cosmetics 대상)

---

*검증 완료: 2026-03-09*
*Status: Investigation Complete*
