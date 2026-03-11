# IR-O4O-STORE-CORE-ENTITY-BOUNDARY-AUDIT-V1

> **Investigation Report**: Store Core Entity Boundary Audit
> **Date**: 2026-03-11
> **Status**: Complete
> **Scope**: READ-ONLY — 모든 store 관련 entity의 위치·소유권·경계 위반 분석

---

## Executive Summary

O4O Platform의 Store 도메인 entity는 **8개 이상 디렉토리**에 분산되어 있다. 핵심 발견: **5개 Core entity**가 `routes/kpa/entities/`에 위치하지만 실제로는 **2~6개 서비스**가 공유 사용한다. 이로 인해 **28개 파일**에서 cross-boundary import 위반이 발생하며, Frozen Baseline F3(Store Layer Architecture)를 위반한다.

| 등급 | 항목 | 수량 |
|------|------|------|
| CRITICAL | Core entity가 service-specific 디렉토리에 위치 | 5개 |
| CRITICAL | Routes 간 cross-boundary import | 28개 파일 |
| CRITICAL | Module → Route entity import | 2개 파일 |
| HIGH | TypeORM 등록 분류 오류 | 5개 entity |
| MEDIUM | Store Core 테이블 schema 미분리 | 5개 테이블 |

---

## 1. Entity 분포 현황

### 1.1 Misplaced Core Entities — KPA routes에 위치하나 실제 Core

| Entity | 위치 | 테이블 | 사용 서비스 | 분류 |
|--------|------|--------|------------|------|
| `OrganizationStore` | `routes/kpa/entities/` | `organizations` | KPA, GlycoPharm, O4O-Store, Neture | **CORE (4 services)** |
| `OrganizationChannel` | `routes/kpa/entities/` | `organization_channels` | KPA, O4O-Store | **CORE (2 services)** |
| `OrganizationProductListing` | `routes/kpa/entities/` | `organization_product_listings` | KPA, GlycoPharm, O4O-Store, Neture, Platform, Product-Policy-V2 | **CORE (6+ consumers)** |
| `OrganizationProductChannel` | `routes/kpa/entities/` | `organization_product_channels` | KPA, O4O-Store | **CORE (2 services)** |
| `ServiceProduct` | `routes/kpa/entities/` | `service_products` | KPA, Neture, Product-Policy-V2 | **CORE (3 consumers)** |

### 1.2 Properly Located Entities — modules (platform-independent)

| Entity | 위치 | 테이블 | 비고 |
|--------|------|--------|------|
| `ProductMaster` | `modules/neture/entities/` | `product_masters` | Product SSOT |
| `SupplierProductOffer` | `modules/neture/entities/` | `supplier_product_offers` | Offer layer |
| `Brand` | `modules/neture/entities/` | `brands` | Product metadata |
| `ProductCategory` | `modules/neture/entities/` | `product_categories` | Categorization |
| `StoreProductProfile` | `modules/neture/entities/` | `store_product_profiles` | Service-agnostic |

### 1.3 Extension Entities — service-specific, 올바른 위치

| Entity | 위치 | Schema | 용도 |
|--------|------|--------|------|
| `CosmeticsStore` | `routes/cosmetics/entities/` | `cosmetics` | K-Cosmetics 매장 |
| `CosmeticsStoreListing` | `routes/cosmetics/entities/` | `cosmetics` | Cosmetics 상품 진열 |
| `GlycopharmApplication` | `routes/glycopharm/entities/` | `public` | GlycoPharm 입점 |
| `GlycopharmPharmacyExtension` | `routes/glycopharm/entities/` | `public` | GlycoPharm 확장 |

### 1.4 Platform Foundation Entities — 전역 store identity

| Entity | 위치 | 테이블 | 비고 |
|--------|------|--------|------|
| `PhysicalStore` | `routes/platform/entities/` | `physical_stores` | 사업자번호 → 매장 연결 |
| `PhysicalStoreLink` | `routes/platform/entities/` | `physical_store_links` | 물리매장 ↔ 서비스매장 매핑 |
| `PlatformStoreSlug` | `platform-core/store-identity` | `platform_store_slugs` | Slug SSOT |
| `StoreLocalProduct` | `routes/platform/entities/` | `store_local_products` | Display-only 상품 |
| `StoreTablet` | `routes/platform/entities/` | `store_tablets` | 태블릿 디바이스 등록 |

---

## 2. Cross-Boundary Violation 분석

### 2.1 GlycoPharm → KPA Entities (16 controllers + 2 services)

GlycoPharm의 **18개 파일**이 `routes/kpa/entities/OrganizationStore`를 직접 import:

| 파일 | Import 대상 |
|------|------------|
| `routes/glycopharm/controllers/admin.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/application.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/checkout.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/cockpit.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/customer-request.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/display.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/event.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/funnel.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/operator.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/signage.controller.ts` | OrganizationStore |
| `routes/glycopharm/controllers/store.controller.ts` | OrganizationStore |
| `routes/glycopharm/repositories/glycopharm.repository.ts` | OrganizationStore |
| `routes/glycopharm/services/event-promotion.service.ts` | OrganizationStore |
| + 3개 추가 controllers | OrganizationStore |

**위반 사유**: `OrganizationStore`는 service-agnostic entity이나, KPA route의 private directory에 위치.

### 2.2 O4O-Store → KPA Entities (8 controllers)

| 파일 | Import 대상 |
|------|------------|
| `routes/o4o-store/controllers/pharmacy-products.controller.ts` | OrganizationProductListing, OrganizationProductChannel |
| `routes/o4o-store/controllers/pharmacy-store-config.controller.ts` | OrganizationStore |
| `routes/o4o-store/controllers/store-hub.controller.ts` | OrganizationStore |
| + 5개 추가 controllers | 다수 |

### 2.3 Module → Route Entity Import (Layer 위반)

```
modules/product-policy-v2/product-approval-v2.service.ts
  → import { OrganizationProductListing } from '../../routes/kpa/entities/...'
```

**위반 사유**: Platform module이 route의 private entity directory를 직접 import. Core → Extension 레이어링 역방향.

### 2.4 위반 요약

| 위반 유형 | 파일 수 | 심각도 |
|----------|---------|--------|
| GlycoPharm → KPA entities | 18 | CRITICAL |
| O4O-Store → KPA entities | 8 | CRITICAL |
| Module → Route entities | 2 | CRITICAL |
| **합계** | **28** | |

---

## 3. Product Layer 의존 체인

```
ProductMaster (modules/neture — ✅ CORRECT)
    ↓ 1:N
SupplierProductOffer (modules/neture — ✅ CORRECT)
    ↓ 1:N
ServiceProduct (routes/kpa — ❌ MISPLACED)
    ↓ 1:N
OrganizationProductListing (routes/kpa — ❌ MISPLACED)
    ↓ 1:N
OrganizationProductChannel (routes/kpa — ❌ MISPLACED)
```

상위 2개 entity는 `modules/neture/`에 올바르게 위치하나, 하위 3개 entity는 `routes/kpa/`에 위치하여 의존 체인이 **module → route** 경계를 넘는다.

---

## 4. Store Organization 계층 구조

```
OrganizationStore (routes/kpa — ❌ MISPLACED)
    ├─ type: 'pharmacy' | 'chain' | ...
    ├─ service_enrollment → OrganizationServiceEnrollment
    │
    ├─→ OrganizationChannel (routes/kpa — ❌ MISPLACED)
    │       ├─ channel_type: 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE'
    │       └─→ OrganizationProductChannel
    │
    └─→ OrganizationProductListing (routes/kpa — ❌ MISPLACED)
            ├─→ ProductMaster (modules/neture — ✅)
            ├─→ SupplierProductOffer (modules/neture — ✅)
            └─→ ServiceProduct (routes/kpa — ❌ MISPLACED)
```

**모든** 하위 entity가 KPA directory에 집중되어 "KPA-monopoly" 상태.

---

## 5. ESM Entity Pattern 준수 여부

모든 store entity는 올바른 ESM 패턴을 사용:

```typescript
// ✅ CORRECT — String-based relation (모든 store entity)
@ManyToOne('OrganizationStore')
@JoinColumn({ name: 'organization_id' })
organization?: OrganizationStore;

// ✅ CORRECT — import type 사용
import type { OrganizationStore } from './organization-store.entity.js';
```

**결론**: ESM 규칙(CLAUDE.md §2) 위반 없음. 경계 위반은 **파일 위치** 문제이지 decorator 패턴 문제가 아님.

---

## 6. TypeORM Entity Registration

`apps/api-server/src/database/connection.ts` (lines 746-761):

```typescript
// ============================================================================
// KPA ENTITIES (Pharmacist Association SaaS)  ← 분류 라벨
// ============================================================================
KpaOrganization,
KpaMember,
KpaApplication,
// ... KPA-specific entities
OrganizationProductListing,      // ❌ Core — KPA 섹션에 등록
OrganizationChannel,              // ❌ Core — KPA 섹션에 등록
OrganizationProductChannel,       // ❌ Core — KPA 섹션에 등록
OrganizationStore,                // ❌ Core — KPA 섹션에 등록
ServiceProduct,                   // ❌ Core — KPA 섹션에 등록
```

5개 Core entity가 "KPA ENTITIES" 섹션에 등록되어 실제 소유권과 불일치.

---

## 7. Package 분석

### 7.1 현재 Store 관련 Packages

| Package | 타입 | Entity Export | 비고 |
|---------|------|--------------|------|
| `store-core` | Pure TS | None | KPI/Insight engines, adapter pattern |
| `store-ui-core` | Pure TS | None | UI 컴포넌트 |
| `store-asset-policy-core` | Pure TS | None | Policy engine |
| `platform-core` | Frozen | `PlatformStoreSlug`, `PhysicalStore` | Platform identity |
| `organization-core` | Frozen | `Organization`, `OrganizationMember` | Base organization |

### 7.2 Gap 분석

**Missing**: `@o4o/product-store-core` 또는 `modules/store/entities/` — 5개 Core entity의 적합한 위치가 존재하지 않음.

현재 packages는 **Pure TypeScript** (entity 없음) 또는 **Frozen** (변경 불가) 상태여서, misplaced entity를 수용할 위치가 아키텍처에 없다.

---

## 8. Frozen Baseline 준수 여부

### F3: Store Layer Architecture (FROZEN 2026-02-22)

**기대 구조**:
```
store-core (Pure TS) → store-ui-core → store-asset-policy-core
    → organization-core (Frozen) → platform-core → service-specific
```

**실제 구조**:
```
store-core ✅ (Pure TS)
store-ui-core ✅ (Pure TS)
store-asset-policy-core ✅ (Pure TS)

organization-core (Frozen)
    → extended by routes/kpa/OrganizationStore ❌ (not extracted)
    → NO dedicated store module ❌

platform-core ✅
    → PhysicalStore, PhysicalStoreLink ✅
    → BUT missing: core product-store entities ❌

services:
    glycopharm → imports from routes/kpa ❌ (VIOLATION)
    cosmetics ✅ (isolated schema)
    kpa ✅ (owner, but should extract core)
```

**준수 결과**: ❌ VIOLATED — Core entity 미추출, cross-service import 다수.

### F10: O4O Core Freeze (FROZEN 2026-03-11)

Auth, Membership, Approval, RBAC 4개 모듈 고정. Store entity는 이 범위에 포함되지 않으므로 **영향 없음**.

---

## 9. Boundary Violation Graph

```
CORRECT FLOW:
organization-core (frozen)
    ↓ extension
modules/neture/entities/ (ProductMaster, SupplierProductOffer)
    ↓ consumption
routes/{service}/controllers/

ACTUAL VIOLATIONS:
routes/kpa/entities/ ← Core entities 위치
    ↑ WRONG — 18 files
routes/glycopharm/controllers/
    ↑ WRONG — 8 files
routes/o4o-store/controllers/
    ↑ WRONG — 2 files
modules/product-policy-v2/
```

---

## 10. Misplaced Entity 상세

### 10.1 OrganizationStore

- **현재 위치**: `routes/kpa/entities/organization-store.entity.ts`
- **테이블**: `organizations` (organization-core 확장)
- **Phase A 확장 필드**: storefront_config, template_profile, business fields
- **4개 서비스**가 사용 (KPA, GlycoPharm, O4O-Store, Neture)
- **WO**: WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1

### 10.2 OrganizationProductListing

- **현재 위치**: `routes/kpa/entities/organization-product-listing.entity.ts`
- **테이블**: `organization_product_listings`
- **6개 이상 consumer**가 사용
- **Relations**: ProductMaster, SupplierProductOffer, ServiceProduct, OrganizationStore
- **WO**: WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1

### 10.3 OrganizationChannel

- **현재 위치**: `routes/kpa/entities/organization-channel.entity.ts`
- **테이블**: `organization_channels`
- **Generic 개념**: B2C, KIOSK, TABLET, SIGNAGE 채널 — KPA 전용 아님

### 10.4 ServiceProduct

- **현재 위치**: `routes/kpa/entities/service-product.entity.ts`
- **테이블**: `service_products`
- **Preparation 상태**: Listing에서 nullable FK로 참조
- **WO**: WO-O4O-SERVICE-PRODUCT-LAYER-PREP-V1

### 10.5 OrganizationProductChannel

- **현재 위치**: `routes/kpa/entities/organization-product-channel.entity.ts`
- **테이블**: `organization_product_channels`
- **Generic 개념**: 상품 ↔ 채널 매핑 규칙

---

## 11. 검증 항목 종합

| # | 검증 항목 | 상태 | 비고 |
|---|----------|------|------|
| 1 | Core entity 식별 | ✅ OK | 5개 Core, 4개 Extension, 5개 Platform 식별 |
| 2 | Cross-boundary import | ❌ CRITICAL | 28개 파일 위반 |
| 3 | ESM decorator pattern | ✅ OK | 모든 entity string-based relation 사용 |
| 4 | TypeORM registration 분류 | ❌ HIGH | 5개 Core entity가 KPA 섹션 |
| 5 | Package entity export | ✅ OK | 현행 packages는 entity 미포함 (정상) |
| 6 | Module → Route import | ❌ CRITICAL | 2개 파일 layer 역방향 |
| 7 | F3 Store Layer 준수 | ❌ VIOLATED | Core entity 미추출 |
| 8 | Extension entity 위치 | ✅ OK | Cosmetics, GlycoPharm 정상 |
| 9 | Platform entity 위치 | ✅ OK | PhysicalStore 등 정상 |
| 10 | Schema 분리 | ⚠️ PARTIAL | Cosmetics만 분리, Store Core는 public schema |

---

## 12. Architecture Debt Map

```
┌──────────────────────────────────────────────────────────┐
│                    CURRENT STATE                          │
│                                                          │
│  modules/neture/entities/     routes/kpa/entities/       │
│  ┌──────────────────┐        ┌────────────────────────┐  │
│  │ ProductMaster ✅  │        │ OrganizationStore  ❌  │  │
│  │ SupplierOffer  ✅ │───────→│ OrgProductListing  ❌  │  │
│  │ Brand          ✅ │        │ OrgChannel         ❌  │  │
│  │ ProductCategory✅ │        │ OrgProductChannel  ❌  │  │
│  └──────────────────┘        │ ServiceProduct     ❌  │  │
│                              └────────────────────────┘  │
│                                    ↑  ↑  ↑               │
│                     ┌──────────────┘  │  └──────┐        │
│                     │                 │         │        │
│  routes/glycopharm/ │  routes/o4o-store/  modules/       │
│  (18 files)         │  (8 files)      product-policy-v2  │
│                     │                 (2 files)          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    TARGET STATE                           │
│                                                          │
│  modules/store/entities/  (NEW — Core Entity Home)       │
│  ┌────────────────────────────────────────────┐          │
│  │ OrganizationStore                          │          │
│  │ OrganizationChannel                        │          │
│  │ OrganizationProductListing                 │          │
│  │ OrganizationProductChannel                 │          │
│  │ ServiceProduct                             │          │
│  └────────────────────────────────────────────┘          │
│            ↑           ↑           ↑                     │
│  routes/kpa/  routes/glycopharm/  routes/o4o-store/      │
│  (owner)      (consumer)          (consumer)             │
└──────────────────────────────────────────────────────────┘
```

---

*Generated: 2026-03-11*
*Classification: Architecture Audit*
*Scope: Store Core Entity Boundary — 위치·소유권·경계 위반*
