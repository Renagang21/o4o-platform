# Phase 7-X: Cosmetics App Architecture Integrity Audit

> ⚠ 본 문서는 CLAUDE.md v2.0을 기준으로 하며, 충돌 시 CLAUDE.md를 우선한다.

**Audit Date:** 2025-12-15
**Branch:** feature/cosmetics-service
**Status:** Complete

---

## Executive Summary

Cosmetics Suite 전체 앱의 아키텍처 정합성 감사를 수행한 결과:

| 항목 | 수치 | 상태 |
|------|------|------|
| 총 앱 수 | 8개 | - |
| API 엔드포인트 | 303개 | ⚠️ 중복 존재 |
| Entity 수 | 23개 | ⚠️ 중복 존재 |
| 순환 의존성 | 0개 | ✅ 정상 |
| 고위험 중복 | 5건 | 🔴 조치 필요 |

---

## 1. 조사 대상 앱 목록

### 1.1 Core App

| App ID | Type | Status | 설명 |
|--------|------|--------|------|
| dropshipping-cosmetics | extension | Active | 화장품 Core 데이터 + AI + 필터링 |

### 1.2 Extension Apps

| App ID | Type | Depends On | 설명 |
|--------|------|------------|------|
| cosmetics-partner-extension | extension | dropshipping-cosmetics | 파트너/인플루언서 기능 |
| cosmetics-seller-extension | extension | dropshipping-cosmetics | 매장 판매원 기능 |
| cosmetics-supplier-extension | extension | dropshipping-cosmetics, cosmetics-partner-extension | 브랜드 공급사 기능 |
| cosmetics-sample-display-extension | extension | dropshipping-cosmetics | 샘플/진열 (스텁) |

### 1.3 Utility/UI Packages

| Package | Type | 설명 |
|---------|------|------|
| design-system-cosmetics | utility | Antigravity Design System |
| forum-cosmetics | extension | 화장품 포럼 (스텁) |

---

## 2. 기능 경계 매핑 (Function Boundary)

### 2.1 기능 버킷별 소유권

| 기능 | Primary Owner | Secondary | 중복 여부 |
|------|---------------|-----------|-----------|
| **Product** | dropshipping-cosmetics | - | ✅ 단일 |
| **Brand** | dropshipping-cosmetics | supplier-extension (관리) | ✅ 정상 분리 |
| **Routine** | dropshipping-cosmetics | partner-extension | 🔴 **중복** |
| **Sample** | seller-extension | supplier-extension | ⚠️ 다중 소유 |
| **Display** | seller-extension | - | ✅ 단일 |
| **Campaign** | dropshipping-cosmetics | supplier-extension | ⚠️ 다중 소유 |
| **Seller Ops** | seller-extension | - | ✅ 단일 |
| **Partner Ops** | partner-extension | - | ✅ 단일 |
| **Supplier Ops** | supplier-extension | - | ✅ 단일 |

### 2.2 기능 중복 상세

#### Routine 중복 (Critical)
```
dropshipping-cosmetics:
  - CosmeticsRoutine entity
  - /api/v1/partner/routines/* (influencer-routine.routes.ts)

cosmetics-partner-extension:
  - PartnerRoutine entity
  - /api/v1/partner/routine/* (partner-extension.routes.ts)
```

**문제점:** 거의 동일한 Routine 개념이 2개 앱에 분산
**권장:** partner-extension에 통합, dropshipping-cosmetics는 조회만

#### Campaign 중복 (Medium)
```
dropshipping-cosmetics:
  - CosmeticsCampaign entity (범용 캠페인)

cosmetics-supplier-extension:
  - SupplierCampaign entity (공급사 캠페인)
```

**문제점:** 캠페인 계층 구조 불명확
**권장:** CosmeticsCampaign을 Base로, SupplierCampaign이 확장

---

## 3. API/Route 중복 분석

### 3.1 전체 API 통계

| Package | Route Files | Endpoints | Prefix |
|---------|-------------|-----------|--------|
| dropshipping-cosmetics | 11 | 102 | `/api/v1/cosmetics` |
| cosmetics-partner-extension | 1 | 60 | `/api/v1/partner` |
| cosmetics-seller-extension | 1 | 54 | `/api/v1/seller` |
| cosmetics-supplier-extension | 1 | 87 | `/api/v1/supplier` |
| **Total** | **14** | **303** | - |

### 3.2 URL Prefix 충돌

| Prefix | Owner | 상태 |
|--------|-------|------|
| `/api/v1/cosmetics/*` | dropshipping-cosmetics | ✅ 단일 |
| `/api/v1/partner/*` | partner-extension | ⚠️ 일부 dropshipping-cosmetics |
| `/api/v1/seller/*` | seller-extension | ✅ 단일 |
| `/api/v1/supplier/*` | supplier-extension | ✅ 단일 |

### 3.3 충돌 엔드포인트

| Endpoint Pattern | App 1 | App 2 | 충돌 유형 |
|------------------|-------|-------|-----------|
| `/api/v1/partner/routines/*` | dropshipping-cosmetics | partner-extension | 🔴 URL 중복 |
| Campaign CRUD | dropshipping-cosmetics | supplier-extension | ⚠️ 개념 중복 |

### 3.4 API Canonical Owner 정의 (권장)

| Domain | Canonical Owner | 비고 |
|--------|-----------------|------|
| Product CRUD | dropshipping-cosmetics | 유일 |
| Product Filtering | dropshipping-cosmetics | 유일 |
| Brand Management | dropshipping-cosmetics | 유일 |
| Routine CRUD | **partner-extension** | 통합 필요 |
| Routine View (Signage) | dropshipping-cosmetics | 조회만 |
| Partner Profile/Links/Earnings | partner-extension | 유일 |
| Seller Operations | seller-extension | 유일 |
| Supplier Operations | supplier-extension | 유일 |
| Campaign (Platform) | dropshipping-cosmetics | Base |
| Campaign (Supplier) | supplier-extension | Extension |

---

## 4. Entity/DTO 중복 분석

### 4.1 전체 Entity 통계

| Package | Entity Count | Tables |
|---------|--------------|--------|
| dropshipping-cosmetics | 10 | `cosmetics_*` |
| cosmetics-partner-extension | 5 | `cosmetics_partner_*` |
| cosmetics-seller-extension | 5 | `cosmetics_seller_*` |
| cosmetics-supplier-extension | 5 | `cosmetics_supplier_*` |
| **Total** | **25** | - |

### 4.2 고위험 중복 Entity

#### 1. Routine Entity 중복 (Critical)

| Entity | Package | Table | 주요 필드 |
|--------|---------|-------|-----------|
| CosmeticsRoutine | dropshipping-cosmetics | `cosmetics_routines` | partnerId, title, steps, skinType, concerns |
| PartnerRoutine | partner-extension | `cosmetics_partner_routines` | partnerId, title, steps, skinTypes, skinConcerns |

**분석:** 거의 동일한 스키마. `PartnerRoutine`이 더 완성도 높음
**권장:** `PartnerRoutine`을 정규 Entity로, `CosmeticsRoutine` 제거

#### 2. Campaign Entity 중복 (Medium)

| Entity | Package | Table | Scope |
|--------|---------|-------|-------|
| CosmeticsCampaign | dropshipping-cosmetics | `cosmetics_campaigns` | 플랫폼 전체 |
| SupplierCampaign | supplier-extension | `cosmetics_supplier_campaigns` | 공급사별 |

**분석:** 다른 목적이지만 개념 중복
**권장:** 계층 관계 명확화 필요

#### 3. Sample 관리 분산 (Medium)

| Entity | Package | 관점 |
|--------|---------|------|
| SellerSample | seller-extension | 매장 샘플 재고 |
| SampleSupply | supplier-extension | 공급사 샘플 배송 |

**분석:** 동일 물리적 샘플의 다른 관점
**권장:** 공통 `Sample` Entity + View 분리

### 4.3 Missing Relations

현재 모든 Entity가 String FK 사용 중. TypeORM Relations 미정의:

```typescript
// 현재 상태 (문제)
@Column()
partnerId: string;

// 권장 상태
@ManyToOne(() => PartnerProfile)
@JoinColumn({ name: 'partnerId' })
partner: PartnerProfile;
```

---

## 5. AppStore Dependency 분석

### 5.1 의존성 그래프

```
                    ┌─────────────────┐
                    │ dropshipping-core│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │dropshipping-    │
                    │cosmetics        │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │  partner-   │   │  seller-    │   │  supplier-  │
    │  extension  │   │  extension  │   │  extension  │
    └─────────────┘   └─────────────┘   └──────┬──────┘
                                               │
                                        depends on
                                               │
                                     ┌─────────▼─────────┐
                                     │ partner-extension │
                                     └───────────────────┘
```

### 5.2 의존성 검증

| App | declared deps | 실제 사용 | 상태 |
|-----|---------------|-----------|------|
| dropshipping-cosmetics | dropshipping-core | ✓ | ✅ |
| partner-extension | dropshipping-core, dropshipping-cosmetics | ✓ | ✅ |
| seller-extension | dropshipping-core, dropshipping-cosmetics | ✓ | ✅ |
| supplier-extension | dropshipping-core, dropshipping-cosmetics, partner-extension | ✓ | ✅ |

### 5.3 순환 의존성 검사

**결과:** ✅ 순환 의존성 없음

### 5.4 Install 순서

```
1. dropshipping-core
2. dropshipping-cosmetics
3. cosmetics-partner-extension
4. cosmetics-seller-extension (병렬 가능)
5. cosmetics-supplier-extension
```

---

## 6. Role/Permission 분석

### 6.1 Permission 목록

#### dropshipping-cosmetics
```
cosmetics:view
cosmetics:edit
cosmetics:manage_filters
cosmetics:recommend_routine
```

#### partner-extension
```
cosmetics-partner:view
cosmetics-partner:manage_profile
cosmetics-partner:manage_links
cosmetics-partner:manage_routines
cosmetics-partner:view_earnings
cosmetics-partner:withdraw
cosmetics-partner:admin
```

#### seller-extension
```
cosmetics-seller:view
cosmetics-seller:manage_displays
cosmetics-seller:manage_samples
cosmetics-seller:manage_inventory
cosmetics-seller:view_consultations
cosmetics-seller:view_kpi
cosmetics-seller:admin
```

#### supplier-extension
```
supplier:profile:read/write
supplier:price-policy:read/write
supplier:sample:read/write
supplier:approval:read/write
supplier:campaign:read/write
```

### 6.2 Role → Permission 매핑 (권장)

| Role | Apps | Key Permissions |
|------|------|-----------------|
| consumer | storefront | - (public) |
| partner | partner-extension | cosmetics-partner:* |
| seller | seller-extension | cosmetics-seller:* |
| supplier | supplier-extension | supplier:* |
| operator | all | admin permissions |
| admin | all | full access |

### 6.3 Permission 중복/누락

| Issue | Type | 상세 |
|-------|------|------|
| Routine permission | 중복 | `cosmetics:recommend_routine` vs `cosmetics-partner:manage_routines` |
| Storefront auth | 누락 | Public API isolation 필요 |

---

## 7. UI 기능 중복 검사

### 7.1 Frontend Pages 분포

| App | Pages | 주요 컴포넌트 |
|-----|-------|---------------|
| dropshipping-cosmetics | 2 | CosmeticsFilters, RoutineTemplates |
| partner-extension | 4 | Dashboard, Links, Routines, Earnings |
| seller-extension | 6 | Dashboard, Displays, Samples, Inventory, Consultations, KPI |
| supplier-extension | 5 | Dashboard, PricePolicies, Samples, Approvals, Campaigns |

### 7.2 UI 중복 분석

| Component | Apps | 중복 여부 |
|-----------|------|-----------|
| Product Display | multiple | ⚠️ 잠재적 중복 |
| Routine Viewer | dropshipping, partner | 🔴 중복 |
| Sample Management | seller, supplier | ⚠️ 관점 차이 |
| Campaign Editor | dropshipping, supplier | ⚠️ 관점 차이 |

### 7.3 UI 통합 권장

| Component | Target App | 비고 |
|-----------|------------|------|
| RoutineViewer | partner-extension | 단일화 |
| ProductCard | design-system-cosmetics | 공통 컴포넌트 |
| CampaignEditor | supplier-extension | 공급사 전용 |

---

## 8. 통합 아키텍처 Boundary Map

### 8.1 최종 책임 경계도

```
┌─────────────────────────────────────────────────────────────────────┐
│                        COSMETICS SUITE                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              dropshipping-cosmetics (Core)                    │    │
│  │  • Product Catalog & Metadata                                 │    │
│  │  • Brand Management                                           │    │
│  │  • Dictionary (SkinType, Concern, Ingredient, Category)       │    │
│  │  • AI Recommendation Engine                                   │    │
│  │  • Product Filtering                                          │    │
│  │  • Digital Signage Content                                    │    │
│  │  • Seller Workflow Session (in-store)                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│      ┌───────────────────────┼───────────────────────┐              │
│      │                       │                       │              │
│  ┌───▼─────────────┐  ┌──────▼──────────┐  ┌────────▼────────┐     │
│  │ partner-ext     │  │ seller-ext      │  │ supplier-ext    │     │
│  │                 │  │                 │  │                 │     │
│  │ • Profile       │  │ • Display       │  │ • Profile       │     │
│  │ • Routine ⭐    │  │ • Sample        │  │ • Price Policy  │     │
│  │ • Links         │  │ • Inventory     │  │ • Sample Supply │     │
│  │ • Earnings      │  │ • Consultation  │  │ • Approval      │     │
│  │ • Commission    │  │ • KPI           │  │ • Campaign      │     │
│  │ • AI Features   │  │                 │  │                 │     │
│  │ • Storefront    │  │                 │  │                 │     │
│  │ • QR/Landing    │  │                 │  │                 │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              design-system-cosmetics (UI Library)             │    │
│  │  • AGCard, AGButton, AGInput                                  │    │
│  │  • Theme (colors, spacing, typography)                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 데이터 흐름

```
Supplier → PricePolicy → Product ← Catalog ← dropshipping-cosmetics
    │                       │
    ▼                       ▼
SampleSupply ──────► SellerSample ◄──── Seller
    │                       │
    ▼                       ▼
SupplierApproval         SellerKPI
    │
    ▼
PartnerProfile ◄──── Partner
    │
    ▼
PartnerRoutine → PartnerLink → Consumer (Storefront)
```

---

## 9. 중복 제거 및 리팩토링 제안

### 9.1 High Priority (즉시 조치)

#### P1. Routine Entity 통합
```
현재:
  - CosmeticsRoutine (dropshipping-cosmetics)
  - PartnerRoutine (partner-extension)

권장:
  - PartnerRoutine만 유지 (partner-extension)
  - dropshipping-cosmetics에서 조회 API만 유지
  - CosmeticsRoutine → deprecated → 제거
```

**Migration:**
```sql
-- Data migration
INSERT INTO cosmetics_partner_routines (...)
SELECT ... FROM cosmetics_routines;

-- Drop old table
DROP TABLE cosmetics_routines;
```

#### P2. API Route Conflict 해결
```
현재:
  /api/v1/partner/routines/* → dropshipping-cosmetics
  /api/v1/partner/routine/* → partner-extension

권장:
  /api/v1/partner/routines/* → partner-extension (CRUD)
  /api/v1/cosmetics/routines/signage → dropshipping-cosmetics (조회만)
```

### 9.2 Medium Priority (Phase 8 전)

#### P3. Campaign 계층 명확화
```
권장:
  - CosmeticsCampaign: 플랫폼 전체 캠페인 (Admin)
  - SupplierCampaign: 공급사별 캠페인 (Supplier)
  - SupplierCampaign.parentCampaignId → CosmeticsCampaign (선택적)
```

#### P4. Sample 통합 모델
```
권장:
  - 공통 Sample Entity 생성
  - SellerSample → Sample + View (매장 관점)
  - SampleSupply → Sample + View (공급사 관점)
```

### 9.3 Low Priority (향후)

#### P5. TypeORM Relations 추가
- 모든 String FK를 실제 @ManyToOne/@OneToMany로 전환
- Cascade 옵션 정의

#### P6. Permission 정리
- `cosmetics:recommend_routine` → `cosmetics-partner:manage_routines` 통합
- Storefront public API 분리

---

## 10. Definition of Done 체크리스트

| 항목 | 상태 |
|------|------|
| Cosmetics 관련 모든 앱의 기능 경계 표 완성 | ✅ |
| API/DTO/Entity 중복 검출 | ✅ |
| AppStore 의존성 구조 보고서 완료 | ✅ |
| Boundary Map 완료 | ✅ |
| 중복 제거 제안서 문서화 | ✅ |
| develop에 영향 없는 조사-only 작업 | ✅ |
| Phase 8 진입 조건 충족 | ⚠️ P1, P2 조치 필요 |

---

## 11. Phase 8 진입 조건

### 필수 조치 (Blocking)

| ID | 조치 | 담당 | 예상 공수 |
|----|------|------|-----------|
| P1 | Routine Entity 통합 | Backend | 1일 |
| P2 | API Route Conflict 해결 | Backend | 0.5일 |

### 권장 조치 (Non-Blocking)

| ID | 조치 | 담당 | 예상 공수 |
|----|------|------|-----------|
| P3 | Campaign 계층 명확화 | Design | 0.5일 |
| P4 | Sample 통합 모델 | Backend | 1일 |
| P5 | TypeORM Relations | Backend | 2일 |

---

## 부록 A: 전체 API 엔드포인트 목록

### dropshipping-cosmetics (102 endpoints)
<details>
<summary>펼치기</summary>

```
/api/v1/cosmetics/brands (CRUD)
/api/v1/cosmetics/campaigns (CRUD + auto)
/api/v1/cosmetics/filters (CRUD)
/api/v1/cosmetics/products (list, filter)
/api/v1/cosmetics/product/:id (detail)
/api/v1/cosmetics/recommendations
/api/v1/cosmetics/dictionary/* (skin-types, concerns, ingredients, categories)
/api/v1/partner/routines/* (influencer routines)
/api/v1/cosmetics/seller-workflow/*
/api/v1/cosmetics/signage/*
```
</details>

### partner-extension (60 endpoints)
<details>
<summary>펼치기</summary>

```
/api/v1/partner/profile/*
/api/v1/partner/link/*
/api/v1/partner/routine/*
/api/v1/partner/earnings/*
/api/v1/partner/ai/*
/api/v1/partner/storefront/*
/api/v1/partner/qr/*
/api/v1/partner/social/*
/api/v1/partner/campaign/*
```
</details>

### seller-extension (54 endpoints)
<details>
<summary>펼치기</summary>

```
/api/v1/seller/display/*
/api/v1/seller/sample/*
/api/v1/seller/inventory/*
/api/v1/seller/consultation/*
/api/v1/seller/kpi/*
```
</details>

### supplier-extension (87 endpoints)
<details>
<summary>펼치기</summary>

```
/api/v1/supplier/profile/*
/api/v1/supplier/price-policy/*
/api/v1/supplier/sample/*
/api/v1/supplier/approval/*
/api/v1/supplier/campaign/*
```
</details>

---

## 부록 B: Entity 스키마 요약

| Entity | Table | Package | 주요 용도 |
|--------|-------|---------|-----------|
| CosmeticsBrand | cosmetics_brands | core | 브랜드 마스터 |
| CosmeticsCategory | cosmetics_categories | core | 카테고리 마스터 |
| CosmeticsConcern | cosmetics_concerns | core | 피부고민 마스터 |
| CosmeticsSkinType | cosmetics_skin_types | core | 피부타입 마스터 |
| CosmeticsIngredient | cosmetics_ingredients | core | 성분 마스터 |
| CosmeticsFilter | cosmetics_filters | core | 필터 설정 |
| CosmeticsRoutine | cosmetics_routines | core | 루틴 (deprecated) |
| CosmeticsCampaign | cosmetics_campaigns | core | 플랫폼 캠페인 |
| CosmeticsSignagePlaylist | cosmetics_signage_playlists | core | 사이니지 플레이리스트 |
| CosmeticsSellerWorkflowSession | cosmetics_seller_workflow_sessions | core | 매장 상담 세션 |
| PartnerProfile | cosmetics_partner_profiles | partner | 파트너 프로필 |
| PartnerLink | cosmetics_partner_links | partner | 추천 링크 |
| PartnerRoutine | cosmetics_partner_routines | partner | 파트너 루틴 |
| PartnerEarnings | cosmetics_partner_earnings | partner | 수익 내역 |
| CommissionPolicy | cosmetics_partner_commission_policies | partner | 커미션 정책 |
| SellerDisplay | cosmetics_seller_displays | seller | 매장 진열 |
| SellerSample | cosmetics_seller_samples | seller | 매장 샘플 |
| SellerInventory | cosmetics_seller_inventory | seller | 매장 재고 |
| SellerConsultationLog | cosmetics_seller_consultation_logs | seller | 상담 로그 |
| SellerKPI | cosmetics_seller_kpi | seller | 판매원 KPI |
| SupplierProfile | cosmetics_supplier_profiles | supplier | 공급사 프로필 |
| PricePolicy | cosmetics_price_policies | supplier | 가격 정책 |
| SampleSupply | cosmetics_sample_supply | supplier | 샘플 공급 |
| SupplierApproval | cosmetics_supplier_approvals | supplier | 승인 관리 |
| SupplierCampaign | cosmetics_supplier_campaigns | supplier | 공급사 캠페인 |

---

*Phase 7-X Audit Report v1.0 - 2025-12-15*
*Generated by Claude Code*
