# IR-O4O-DISTRIBUTION-POLICY-STRUCTURE-AUDIT-V1

> **Investigation Report: O4O 유통(Distribution) 정책 구조 전수 감사**
> Date: 2026-02-24
> Status: Complete
> Scope: Read-only audit (코드 변경 없음)

---

## 1. 전체 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPPLY LAYER (Neture)                                │
│                                                                         │
│  NetureSupplierProduct                                                  │
│  ├── distribution_type: PUBLIC | PRIVATE                                │
│  ├── allowed_seller_ids: text[] (PRIVATE일 때 사용)                      │
│  ├── purpose: CATALOG | APPLICATION | ACTIVE_SALES                      │
│  └── status: active | inactive | draft                                  │
│                                                                         │
│  NetureSupplier                                                         │
│  └── status: ACTIVE | INACTIVE (INACTIVE → 제품 쿼리 차단)              │
│                                                                         │
│  NetureSupplierRequest                                                  │
│  └── status: pending | approved | rejected | suspended | revoked | expired │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼  getSellerAvailableSupplyProducts()
               │  WHERE distribution_type='PUBLIC'
               │     OR (distribution_type='PRIVATE' AND allowed_seller_ids @> orgId)
               │
┌──────────────┴──────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                                     │
│                                                                         │
│  OrganizationProductApplication                                         │
│  ├── status: pending → approved | rejected                              │
│  ├── rejected → pending (재신청 가능)                                    │
│  └── approval → auto-creates Listing (is_active=false)                  │
│                                                                         │
│  ※ PUBLIC 제품만 신청 가능 (catalog 에서 필터링)                         │
│  ※ PRIVATE 제품은 allowed_seller_ids에 포함된 조직만 카탈로그에 노출     │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼  Approved
               │
┌──────────────┴──────────────────────────────────────────────────────────┐
│                    LISTING LAYER                                        │
│                                                                         │
│  OrganizationProductListing                                             │
│  ├── is_active: boolean (pharmacy가 수동 활성화)                         │
│  ├── retail_price: nullable (미설정 시 판매 불가)                        │
│  ├── listing_metadata: jsonb                                            │
│  └── FK: applicationId, productId, organizationId                       │
│                                                                         │
│  ※ 생성 시 is_active=false, retail_price=null                           │
│  ※ pharmacy operator가 가격 설정 + 활성화 필요                          │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼  Listing activated
               │
┌──────────────┴──────────────────────────────────────────────────────────┐
│                    CHANNEL LAYER                                        │
│                                                                         │
│  OrganizationChannel                                                    │
│  └── status: PENDING | APPROVED | REJECTED | SUSPENDED | EXPIRED |      │
│              TERMINATED                                                 │
│                                                                         │
│  OrganizationProductChannel                                             │
│  ├── is_active: boolean                                                 │
│  ├── sales_limit: integer (nullable)                                    │
│  ├── channel_price: decimal (nullable)                                  │
│  └── FK: listingId, channelId, organizationId                           │
│                                                                         │
│  ※ sales_limit: GlycoPharm checkout에서 FOR UPDATE로 enforcement        │
│  ※ channel_price: null이면 listing의 retail_price 사용                   │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────┴──────────────────────────────────────────────────────────┐
│                    STOREFRONT LAYER (B2C 노출)                          │
│                                                                         │
│  4중 게이트 (Visibility Gate):                                          │
│  ┌─────────────────────────────────────────────────────┐                │
│  │ Gate 1: opl.is_active = true     (Listing 활성화)   │                │
│  │ Gate 2: opc.is_active = true     (Channel 활성화)   │                │
│  │ Gate 3: oc.status = 'APPROVED'   (Channel 승인)     │                │
│  │ Gate 4: p.status = 'active'      (Product 활성)     │                │
│  └─────────────────────────────────────────────────────┘                │
│                                                                         │
│  ✅ B2C API (/api/public/store/:id/products) — 4 gates 완전 적용       │
│  ✅ TABLET API (/api/public/store/:id/tablet/products) — 4 gates 완전  │
│  ⚠️ Hub visibleProductCount — Gate 1,2만 적용 (Gate 3,4 누락)          │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────┴──────────────────────────────────────────────────────────┐
│                    CHECKOUT LAYER (주문 생성)                            │
│                                                                         │
│  GlycoPharm (7-step validation):                                        │
│  ├── 1. listing 존재 확인                                               │
│  ├── 2. listing.is_active 확인                                          │
│  ├── 3. channel 존재 확인                                               │
│  ├── 4. channel.is_active 확인                                          │
│  ├── 5. sales_limit 잔량 확인 (FOR UPDATE)                              │
│  ├── 6. supply contract 유효 확인 (neture_supplier_requests)            │
│  └── 7. 재고 차감 + 주문 생성                                           │
│                                                                         │
│  Cosmetics (3-step only):                                               │
│  ├── 1. 입력 검증 (channel, items, metadata)                            │
│  ├── 2. 금액 검증 (unitPrice * quantity = subtotal)                     │
│  └── 3. 주문 생성 (EcommerceOrder + Items)                              │
│                                                                         │
│  ❌ 두 서비스 모두 checkout에서 distribution_type 미검증                 │
│  ❌ 두 서비스 모두 checkout에서 allowed_seller_ids 미검증                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. distribution_type별 표 정리

### 2-A. distribution_type 값과 동작

| distribution_type | 카탈로그 노출 | 신청 가능 | checkout 검증 | 비고 |
|-------------------|:----------:|:--------:|:------------:|------|
| **PUBLIC** | 전체 공개 | ✅ 가능 | ❌ 미검증 | 기본값, 대부분의 제품 |
| **PRIVATE** | allowed_seller_ids만 | ✅ 가능 (목록 내) | ❌ 미검증 | 지정 판매자만 카탈로그 노출 |
| ~~SELECTED~~ | — | — | — | **코드베이스에 존재하지 않음** |

### 2-B. 검증 시점별 enforcement 현황

| 검증 항목 | 카탈로그 | 신청 | 리스팅 | 스토어프론트 | Checkout |
|-----------|:-------:|:----:|:------:|:----------:|:--------:|
| distribution_type | ✅ | ✅ (간접) | — | — | ❌ |
| allowed_seller_ids | ✅ | ✅ (간접) | — | — | ❌ |
| product.status | — | — | — | ✅ (Gate 4) | ❌ |
| listing.is_active | — | — | — | ✅ (Gate 1) | ✅ (GlycoPharm) |
| channel.is_active | — | — | — | ✅ (Gate 2) | ✅ (GlycoPharm) |
| channel.status | — | — | — | ✅ (Gate 3) | ❌ |
| sales_limit | — | — | — | — | ✅ (GlycoPharm) |
| supply contract | — | — | — | — | ✅ (GlycoPharm) |

---

## 3. 실제 코드 위치

### 3-A. Supply Layer

| 위치 | 역할 |
|------|------|
| `modules/neture/entities/NetureSupplierProduct.entity.ts` | distribution_type, allowed_seller_ids 정의 |
| `modules/neture/entities/NetureSupplier.entity.ts` | supplier status (ACTIVE/INACTIVE) |
| `modules/neture/entities/NetureSupplierRequest.entity.ts` | supplier-seller 관계 상태 |
| `modules/neture/neture.service.ts` → `getSellerAvailableSupplyProducts()` | distribution_type 필터링 쿼리 |

### 3-B. Application Layer

| 위치 | 역할 |
|------|------|
| `routes/kpa/entities/organization-product-application.entity.ts` | 신청 엔티티, status enum |
| `routes/kpa/controllers/operator-product-applications.controller.ts` | 승인 처리 → 자동 listing 생성 |
| `routes/kpa/controllers/pharmacy-products.controller.ts` | 카탈로그 조회 (PUBLIC 필터), 재신청 |

### 3-C. Listing Layer

| 위치 | 역할 |
|------|------|
| `routes/kpa/entities/organization-product-listing.entity.ts` | listing 엔티티, is_active, retail_price |
| `routes/kpa/controllers/operator-product-listings.controller.ts` | listing 관리 (활성화/비활성화) |

### 3-D. Channel Layer

| 위치 | 역할 |
|------|------|
| `routes/kpa/entities/organization-channel.entity.ts` | 채널 엔티티, 6-status enum |
| `routes/kpa/entities/organization-product-channel.entity.ts` | 채널별 상품 설정, sales_limit |

### 3-E. Storefront Layer

| 위치 | 역할 |
|------|------|
| `routes/platform/unified-store-public.routes.ts` → `queryVisibleProducts()` | 4중 게이트 SQL (B2C + TABLET) |
| `routes/kpa/controllers/store-hub.controller.ts` → `visibleProductCount` | Hub 카운트 (2중 게이트만) |

### 3-F. Checkout Layer

| 위치 | 역할 |
|------|------|
| `routes/glycopharm/controllers/checkout.controller.ts` | GlycoPharm 7-step validation |
| `core/checkout/checkout-guard.service.ts` → `validateSupplierSellerRelation()` | supply contract 검증 |
| `routes/cosmetics/controllers/cosmetics-order.controller.ts` | Cosmetics 3-step validation |

---

## 4. 정책 일관성 판정

### 4-A. GlycoPharm/KPA 공유 인프라

**판정: Stable with Gaps**

GlycoPharm과 KPA는 동일한 유통 인프라(org_product_listings, org_product_channels, org_channels)를 공유한다. 전체적으로 일관된 구조이나 다음 gap이 존재:

1. **Storefront ↔ Hub 불일치**: B2C/TABLET의 4중 게이트와 Hub의 2중 게이트가 일관되지 않음
2. **Checkout에서 distribution_type 미검증**: 카탈로그에서 필터링되므로 정상 흐름에서는 문제없으나, 직접 API 호출 시 우회 가능
3. **Checkout에서 channel.status 미검증**: channel이 SUSPENDED/EXPIRED 되어도 checkout 차단 안 됨

### 4-B. Cosmetics 격리 스키마

**판정: 구조적으로 별개**

Cosmetics는 `cosmetics_store_listings` 독자 테이블을 사용하며, 공유 org_product 인프라와 무관하다. distribution_type, allowed_seller_ids, channel 개념이 적용되지 않는다. Cosmetics의 유통 정책은 본 감사 범위의 공유 인프라와 교차하지 않는다.

### 4-C. Neture 공급 계층

**판정: Stable**

Neture는 공급자 측 데이터 소유권만 가지며, distribution_type과 allowed_seller_ids를 정의한다. enforcement는 `neture.service.ts`의 `getSellerAvailableSupplyProducts()`에서 일관되게 수행된다.

---

## 5. 리스크 목록

### Risk-1: Checkout에서 distribution_type/allowed_seller_ids 미검증 (HIGH)

| 항목 | 내용 |
|------|------|
| **심각도** | HIGH |
| **영향** | PRIVATE 제품이 allowed_seller_ids 외부 판매자에 의해 주문될 수 있음 |
| **현재 방어** | 카탈로그 필터링 + 신청 필터링 (정상 UI 흐름에서는 노출 안 됨) |
| **우회 시나리오** | 직접 API 호출로 listingId/productId를 지정하면 카탈로그 필터 우회 가능 |
| **위치** | `checkout.controller.ts` (GlycoPharm), `cosmetics-order.controller.ts` (Cosmetics) |
| **권장** | checkout에 distribution_type + allowed_seller_ids 검증 추가 검토 |

### Risk-2: Hub visibleProductCount 게이트 불일치 (MEDIUM)

| 항목 | 내용 |
|------|------|
| **심각도** | MEDIUM |
| **영향** | Hub 운영 KPI에 표시되는 "노출 상품 수"가 실제 스토어프론트 노출과 불일치 |
| **현재 상태** | `opl.is_active` + `opc.is_active`만 확인 (2 gates) |
| **누락 게이트** | `oc.status = 'APPROVED'` (Gate 3), `p.status = 'active'` (Gate 4) |
| **위치** | `routes/kpa/controllers/store-hub.controller.ts` |
| **권장** | Hub 카운트 쿼리에 Gate 3, 4 추가 |

### Risk-3: Checkout에서 channel.status 미검증 (MEDIUM)

| 항목 | 내용 |
|------|------|
| **심각도** | MEDIUM |
| **영향** | SUSPENDED/EXPIRED/TERMINATED 채널의 상품이 checkout에서 차단되지 않음 |
| **현재 방어** | 스토어프론트 4중 게이트에서 APPROVED만 노출 (정상 흐름에서는 비노출) |
| **우회 시나리오** | 이전에 카트에 담긴 상품이 채널 상태 변경 후에도 결제 가능 |
| **위치** | `checkout.controller.ts` (GlycoPharm) |
| **권장** | checkout에 `oc.status = 'APPROVED'` 검증 추가 검토 |

### Risk-4: Cosmetics checkout 제품 검증 부재 (MEDIUM)

| 항목 | 내용 |
|------|------|
| **심각도** | MEDIUM |
| **영향** | 존재하지 않는 상품, 비활성 상품에 대한 주문 생성 가능 |
| **현재 상태** | 입력 검증 (필드 존재) + 금액 검증만 수행 |
| **누락 검증** | 상품 존재 여부, 상품 활성 상태, 스토어 리스팅 활성 상태, 재고 |
| **위치** | `cosmetics-order.controller.ts` |
| **권장** | cosmetics_store_listings 기반 상품 검증 추가 검토 |

### Risk-5: 비활성 공급자 데이터 잔존 (LOW)

| 항목 | 내용 |
|------|------|
| **심각도** | LOW |
| **영향** | INACTIVE supplier의 request 레코드가 approved 상태로 남을 수 있음 |
| **현재 방어** | supplier status INACTIVE 시 제품 쿼리 자체가 차단됨 |
| **위치** | `NetureSupplier.entity.ts`, `NetureSupplierRequest.entity.ts` |
| **권장** | 운영 모니터링 수준으로 충분 (코드 수정 불필요) |

---

## 6. ServiceKey별 유통 구조 비교

| 구분 | GlycoPharm / KPA | Cosmetics | Neture |
|------|-------------------|-----------|--------|
| **인프라** | 공유 (org_product_*) | 격리 (cosmetics_*) | 공급 전용 |
| **distribution_type** | ✅ 카탈로그 필터 | ❌ 해당 없음 | ✅ 정의 |
| **allowed_seller_ids** | ✅ 카탈로그 필터 | ❌ 해당 없음 | ✅ 정의 |
| **Application 흐름** | ✅ 완전 구현 | ❌ 없음 | — |
| **Listing 관리** | ✅ org_product_listings | cosmetics_store_listings | — |
| **Channel 관리** | ✅ org_channels + opc | ❌ 없음 (metadata.channel) | — |
| **Storefront 게이트** | 4중 게이트 | — | — |
| **Checkout 검증** | 7-step | 3-step | — |
| **sales_limit** | ✅ FOR UPDATE | ❌ 없음 | — |
| **Supply contract** | ✅ validateSupplierSellerRelation | ❌ 없음 | — |

---

## 7. 최종 판정

### **Stable with Gaps**

O4O 플랫폼의 유통 정책 구조는 전체적으로 **안정적(Stable)**이나, 다음 gap이 존재한다:

**구조적 강점:**
- Supply → Application → Listing → Channel → Storefront 계층이 명확히 분리
- Storefront 4중 게이트가 B2C/TABLET 엔드포인트에 일관 적용
- sales_limit의 FOR UPDATE 동시성 제어가 정확히 구현
- distribution_type의 카탈로그 필터링이 정상 동작

**식별된 Gap:**
1. **Checkout 계층의 distribution policy 미반영** (Risk-1, HIGH)
2. **Hub 운영 KPI 카운트와 실제 노출의 불일치** (Risk-2, MEDIUM)
3. **Checkout에서 channel 상태 미검증** (Risk-3, MEDIUM)
4. **Cosmetics 제품 검증 부재** (Risk-4, MEDIUM)

**판정 근거:**
- 정상 UI 흐름(카탈로그 → 신청 → 리스팅 → 스토어프론트 → 결제)에서는 모든 정책이 간접적으로 enforcement됨
- Gap은 주로 직접 API 호출(정상 흐름 우회) 시나리오에서 발생
- 현재 서비스가 Alpha 단계이므로 즉각적인 보안 사고 위험은 낮음
- 그러나 GA 전환 시 Risk-1, Risk-3은 반드시 해소 필요

---

*Investigation completed: 2026-02-24*
*Auditor: Claude Code (AI-assisted static analysis)*
*Method: Source code static analysis only (no DB access, no runtime test)*
