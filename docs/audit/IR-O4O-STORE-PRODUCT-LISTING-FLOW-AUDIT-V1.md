# IR-O4O-STORE-PRODUCT-LISTING-FLOW-AUDIT-V1

> Store Product Listing Flow Audit — 매장 제품 리스트 SSOT 검증
> 조사일: 2026-03-15

---

## 1. Executive Summary

### 핵심 판정

| 질문 | 답변 |
|------|------|
| `organization_product_listings`가 SSOT인가? | **YES** — 전자상거래 등록의 유일한 기준 |
| Channel Product는 Listing 없이 생성 가능한가? | **NO** — `product_listing_id` FK 필수 |
| 매장 제품 리스트 생성 흐름이 존재하는가? | **YES** — PUBLIC 자동확장 + SERVICE/PRIVATE 승인 후 자동생성 |
| 전자상거래 등록 = 매장 제품 리스트 전체인가? | **YES** — Channel Product는 Listing의 부분집합 |

### SSOT 구조 확인

```
product_masters (제품 정의 — 바코드 1:1)
       ↓
supplier_product_offers (공급자 공급 조건)
       ↓
organization_product_listings (내 매장 제품 — SSOT)
       ↓
organization_product_channels (채널별 진열 — Listing의 부분집합)
       ↓
Customer (B2C / Kiosk)
```

**`organization_product_listings`가 전자상거래 등록 가능 제품의 SSOT이다.**

---

## 2. 테이블 구조

### 2.1 product_masters

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `barcode` | VARCHAR(14) UNIQUE | GTIN 바코드 (불변) |
| `regulatory_name` | VARCHAR(255) | MFDS 공식명 (불변) |
| `marketing_name` | VARCHAR(255) | 표시명 |
| `manufacturer_name` | VARCHAR(255) | 제조사 (불변) |
| `mfds_product_id` | VARCHAR(100) UNIQUE | MFDS 고유 ID |

**Entity**: `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`

### 2.2 supplier_product_offers

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `master_id` | UUID FK → product_masters | 제품 연결 |
| `supplier_id` | UUID FK → neture_suppliers | 공급자 |
| `distribution_type` | ENUM | **PUBLIC / SERVICE / PRIVATE** |
| `approval_status` | ENUM | PENDING / APPROVED / REJECTED |
| `is_active` | BOOLEAN | 활성 여부 |
| `price_general` | INT | B2B 일반가 |
| `stock_quantity` | INT | 재고 (WO-O4O-INVENTORY-ENGINE-V1) |
| `slug` | VARCHAR(160) UNIQUE | SEO 슬러그 |

**UNIQUE**: (master_id, supplier_id)
**Entity**: `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts`

### 2.3 organization_product_listings (SSOT)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `organization_id` | UUID FK → organizations | **매장** |
| `service_key` | VARCHAR(50) | 도메인 (kpa, glycopharm 등) |
| `master_id` | UUID FK → product_masters | 제품 정의 |
| `offer_id` | UUID FK → supplier_product_offers | 공급자 오퍼 |
| `price` | NUMERIC(12,2) | 매장별 가격 오버라이드 |
| `is_active` | BOOLEAN (default false) | **매장 레벨 활성 여부** |

**UNIQUE**: (organization_id, service_key, offer_id)
**Entity**: `apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts`

### 2.4 organization_product_channels

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `channel_id` | UUID FK → organization_channels | 채널 |
| `product_listing_id` | UUID FK → organization_product_listings | **Listing 필수** |
| `is_active` | BOOLEAN (default true) | 채널별 활성 |
| `display_order` | INT (default 0) | 진열 순서 |
| `sales_limit` | INT (nullable) | 채널별 판매 제한 |

**UNIQUE**: (channel_id, product_listing_id)
**Entity**: `apps/api-server/src/modules/store-core/entities/organization-product-channel.entity.ts`

### 2.5 organization_channels

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `organization_id` | UUID FK → organizations | 매장 |
| `channel_type` | ENUM | **B2C / KIOSK / TABLET / SIGNAGE** |
| `status` | ENUM | PENDING → APPROVED → SUSPENDED/TERMINATED |

---

## 3. Store Product 생성 흐름

### 3.1 Flow A: PUBLIC 제품 (자동 확장)

```
Supplier → offer(distribution_type=PUBLIC, is_active=true)
       ↓
autoExpandPublicProduct(offerId, masterId)
       ↓
모든 활성 조직에 organization_product_listings 자동 생성
       (is_active=false — 매장 경영자가 활성화해야 함)
       ↓
ON CONFLICT DO NOTHING (멱등)
```

| 항목 | 내용 |
|------|------|
| API | 없음 (Supplier가 offer 활성화 시 자동) |
| Service | `autoExpandPublicProduct()` |
| File | `apps/api-server/src/utils/auto-listing.utils.ts` |
| 동작 | 모든 active org에 listing INSERT, `is_active=false` |

**신규 조직 등록 시**: `autoListPublicProductsForOrg(dataSource, orgId, serviceKey)` 호출 → 기존 PUBLIC offer 일괄 등록

### 3.2 Flow B: SERVICE 제품 (승인 후 등록)

```
매장 → 취급 신청 (createServiceApproval)
       ↓
product_approvals (status=PENDING, type=service)
       ↓
운영자/공급자 승인 (approveServiceProduct)
       ↓ ATOMIC TRANSACTION
product_approvals → status=APPROVED
+ organization_product_listings 자동 생성 (is_active=false)
```

| 항목 | 내용 |
|------|------|
| 신청 API | `POST /pharmacy/products/apply` → **410 DEPRECATED** → v2 시스템 |
| 신청 Service | `ProductApprovalV2Service.createServiceApproval()` |
| 승인 API | `PATCH /operator/product-applications/:id/approve` |
| 승인 Service | `ProductApprovalV2Service.approveServiceProduct()` |
| File | `apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts` |

**승인 시 자동 동작**:
1. approval → APPROVED + decided_by/decided_at
2. `organization_product_listings` INSERT (master_id, offer_id, is_active=false)
3. 이미 listing 존재하면 재사용 (멱등)

### 3.3 Flow C: PRIVATE 제품 (지정 판매자)

```
공급자 → offer(distribution_type=PRIVATE, allowed_seller_ids=[...])
       ↓
지정 판매자 → 취급 신청 (createPrivateApproval)
       ↓
공급자 승인 (approvePrivateProduct)
       ↓ ATOMIC TRANSACTION
organization_product_listings 자동 생성
```

| 항목 | 내용 |
|------|------|
| Service | `ProductApprovalV2Service.createPrivateApproval()` / `.approvePrivateProduct()` |
| 제한 | `allowed_seller_ids`에 포함된 조직만 신청 가능 |

### 3.4 생성 흐름 요약

| Flow | Trigger | Listing 생성 시점 | is_active |
|------|---------|:----------------:|:---------:|
| PUBLIC | Offer 활성화 | **즉시 (자동)** | false |
| SERVICE | 운영자 승인 | **승인 시 (자동)** | false |
| PRIVATE | 공급자 승인 | **승인 시 (자동)** | false |

**공통**: 모든 listing은 `is_active=false`로 생성 → 매장 경영자가 명시적으로 활성화

---

## 4. 전자상거래 등록 구조

### 4.1 Listing → Channel 흐름

```
organization_product_listings (is_active=true)
       ↓ 매장 경영자 선택
organization_product_channels
       ↓
B2C Channel → 고객 구매 가능
KIOSK Channel → 키오스크 표시
```

### 4.2 Channel Product 등록 API

| HTTP | Path | 설명 |
|------|------|------|
| GET | `/store-hub/channel-products/:channelId` | 채널 등록 제품 목록 |
| GET | `/store-hub/channel-products/:channelId/available` | **등록 가능 제품** (listing.is_active=true + 미등록) |
| POST | `/store-hub/channel-products/:channelId` | 제품 등록 |
| PATCH | `/store-hub/channel-products/:channelId/reorder` | 순서 변경 |
| PATCH | `/store-hub/channel-products/:channelId/:id/deactivate` | 비활성화 |

**Controller**: `apps/api-server/src/routes/o4o-store/controllers/store-channel-products.controller.ts`

### 4.3 등록 가능 제품 기준

`/available` 엔드포인트의 필터 조건:

```sql
FROM organization_product_listings l
JOIN supplier_product_offers o ON l.offer_id = o.id
JOIN product_masters m ON o.master_id = m.id
WHERE l.organization_id = $orgId
  AND l.is_active = true              -- 매장에서 활성화한 제품
  AND l.id NOT IN (                   -- 이미 등록되지 않은 것
    SELECT product_listing_id
    FROM organization_product_channels
    WHERE channel_id = $channelId AND is_active = true
  )
```

**핵심**: `is_active=true`인 listing만 채널 등록 가능 → **Listing이 SSOT**

### 4.4 Channel 등록 검증

POST 등록 시 검증:

| 검증 항목 | 실패 시 |
|-----------|---------|
| Channel status = APPROVED | 403 |
| Listing exists & is_active | 404 |
| 중복 등록 | 23505 → 기존 비활성 mapping 재활성화 |

---

## 5. Store HUB 제품 화면

### 5.1 매장 제품 관리 API

| HTTP | Path | 설명 |
|------|------|------|
| GET | `/pharmacy/products/catalog` | B2B 카탈로그 (전체 공급 제품) |
| GET | `/pharmacy/products/applications` | 내 승인 신청 목록 |
| GET | `/pharmacy/products/approved` | 승인된 제품 |
| GET | `/pharmacy/products/listings` | **내 매장 제품 리스트** |
| PUT | `/pharmacy/products/listings/:id` | 활성/비활성 토글 |
| GET | `/pharmacy/products/listings/:id/channels` | 제품의 채널별 설정 |
| PUT | `/pharmacy/products/listings/:id/channels` | 채널별 설정 일괄 변경 |

**Controller**: `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts`

### 5.2 UI 구조

| 서비스 | 페이지 | 기능 |
|--------|--------|------|
| KPA | `StoreChannelsPage.tsx` | 5-Section 채널 실행 콘솔 |
| GlycoPharm | `StoreChannelsPage.tsx` | 동일 구조 |
| K-Cosmetics | `StoreChannelsPage.tsx` | 동일 구조 |

**5-Section 구조**:

| # | Section | 내용 |
|---|---------|------|
| A | Channel Tabs | B2C / KIOSK / TABLET / SIGNAGE 탭 |
| B | Channel KPI | 상태, 진열 제품 수, 콘텐츠 수 |
| C | Quick Actions | 대시보드, 자산 보기, 스토어 미리보기 |
| D | Channel Product List | 테이블 + 순서변경 + 추가/제거 |
| E | Exposed Asset List | CMS/Signage 자산 표시 |

### 5.3 제품 등록 UI

- **Modal 방식**: "제품 추가" 버튼 → AddProductModal
- **개별 등록**: 제품별 "추가" 버튼 (일괄 체크 방식 없음)
- **순서 변경**: Up/Down 화살표로 인접 항목 교환
- **제거**: "제거" 버튼 → `deactivateChannelProduct()`

---

## 6. Channel 등록 구조

### 6.1 Channel 타입별 지원

| Channel | Product 등록 | 지원 서비스 |
|---------|:-----------:|------------|
| **B2C** | ✅ | KPA, GlycoPharm, K-Cosmetics |
| **KIOSK** | ✅ | KPA, GlycoPharm, K-Cosmetics |
| **TABLET** | ❌ (별도 시스템) | GlycoPharm, KPA |
| **SIGNAGE** | ❌ (CMS 기반) | KPA, GlycoPharm, K-Cosmetics |

### 6.2 Channel-Product Mapping

```
organization_channels (B2C, channel_type=B2C, status=APPROVED)
       ↓
organization_product_channels
  channel_id → organization_channels.id
  product_listing_id → organization_product_listings.id
  display_order = 1, 2, 3...
  is_active = true/false
  sales_limit = null or INT
```

### 6.3 Capability → Channel 자동생성

```
store_capabilities (capability_key=B2C_COMMERCE, enabled=true)
       ↓ StoreCapabilityService.setCapability()
organization_channels (channel_type=B2C, status=APPROVED) 자동생성
```

| Capability | Channel Type | Default Enabled |
|-----------|:------------:|:---------------:|
| B2C_COMMERCE | B2C | **true** |
| TABLET | TABLET | false |
| KIOSK | KIOSK | false |
| SIGNAGE | SIGNAGE | false |

---

## 7. 서비스별 차이

| 항목 | KPA | K-Cosmetics | GlycoPharm | Neture |
|------|:---:|:-----------:|:----------:|:------:|
| Store Channels 페이지 | ✅ | ✅ | ✅ | ❌ |
| Channel Product CRUD | ✅ | ✅ | ✅ | ❌ |
| Inventory 관리 | ❌ | ✅ | ✅ | ✅ (공급자) |
| Product Distribution Policy | ❌ | ❌ | ❌ | ✅ |
| B2B Products 페이지 | ❌ | ❌ | ✅ (검증용) | ❌ |
| 공급자 제품 관리 | ❌ | ❌ | ❌ | ✅ |
| API Base | `/kpa/` | `/cosmetics/` | `/glycopharm/` | `/neture/` |

**Neture는 공급자 플랫폼 — 매장 채널 관리는 KPA/GlycoPharm/K-Cosmetics 담당**

---

## 8. SSOT 검증 결과

### 8.1 Listing = 전자상거래 등록 가능 제품 ✅

```
Channel Product 등록 가능 조건:
1. organization_product_listings에 존재
2. listing.is_active = true
3. 해당 채널에 미등록

→ Listing이 없으면 Channel Product 생성 불가
→ Listing이 비활성이면 Channel Product 등록 불가
→ organization_product_listings = 전자상거래 등록 가능 제품
```

### 8.2 중복 등록 방지 ✅

- `UNIQUE(organization_id, service_key, offer_id)` — Listing 중복 방지
- `UNIQUE(channel_id, product_listing_id)` — Channel Product 중복 방지
- `ON CONFLICT DO NOTHING` — 자동 확장 시 멱등

### 8.3 is_active 2단계 제어 ✅

| 레벨 | 테이블 | 의미 |
|------|--------|------|
| **매장** | `organization_product_listings.is_active` | "이 제품을 취급한다" |
| **채널** | `organization_product_channels.is_active` | "이 채널에 진열한다" |

### 8.4 데이터 무결성 ✅

- `product_listing_id` FK → ON DELETE CASCADE (Listing 삭제 시 Channel Product도 삭제)
- `offer_id` FK → ON DELETE CASCADE (Offer 삭제 시 Listing도 삭제)
- Approval → Listing 생성이 ATOMIC TRANSACTION

---

## 9. 관련 파일 참조

### Backend

```
apps/api-server/src/modules/store-core/entities/
  organization-product-listing.entity.ts          — Listing 엔티티
  organization-product-channel.entity.ts          — Channel Product 엔티티
  organization-channel.entity.ts                  — Channel 엔티티
  store-capability.entity.ts                      — Capability 엔티티

apps/api-server/src/modules/neture/entities/
  ProductMaster.entity.ts                         — 제품 마스터
  SupplierProductOffer.entity.ts                  — 공급자 오퍼

apps/api-server/src/routes/o4o-store/controllers/
  pharmacy-products.controller.ts                 — 매장 제품 관리 API
  store-channel-products.controller.ts            — 채널 제품 관리 API
  store-hub.controller.ts                         — Store HUB 개요 API

apps/api-server/src/modules/product-policy-v2/
  product-approval-v2.service.ts                  — 승인 워크플로 (SERVICE/PRIVATE)

apps/api-server/src/utils/
  auto-listing.utils.ts                           — PUBLIC 자동 확장
```

### Frontend

```
services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx
services/web-glycopharm/src/pages/store/StoreChannelsPage.tsx
services/web-k-cosmetics/src/pages/store/StoreChannelsPage.tsx
services/web-neture/src/pages/supplier/SupplierProductsPage.tsx

services/web-kpa-society/src/api/channelProducts.ts
services/web-glycopharm/src/api/channelProducts.ts
services/web-k-cosmetics/src/api/channelProducts.ts
```

---

## 10. 결론

### Store Product Listing SSOT 판정: **확인**

```
organization_product_listings = 매장 제품 리스트 = 전자상거래 등록 가능 제품
```

| 항목 | 판정 |
|------|------|
| Listing이 Channel Product의 유일한 소스인가? | **YES** — FK 필수 |
| 모든 생성 흐름이 Listing을 거치는가? | **YES** — PUBLIC/SERVICE/PRIVATE 모두 |
| 중복 방지가 되어 있는가? | **YES** — UNIQUE + ON CONFLICT |
| is_active 2단계 제어가 동작하는가? | **YES** — 매장 레벨 + 채널 레벨 |
| 삭제 시 데이터 무결성이 유지되는가? | **YES** — CASCADE |

### 매장 제품 흐름 확정

```
Supplier Product (product_masters + supplier_product_offers)
       ↓
Store Product Listing (organization_product_listings) ← SSOT
       ↓
Channel Product (organization_product_channels)
       ↓
Customer (B2C / Kiosk)
```

---

*IR-O4O-STORE-PRODUCT-LISTING-FLOW-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete*
