# IR-O4O-NETURE-SERVICE-SPLIT-PREP-V1

> neture.service.ts 책임 분해 준비 조사

**Date:** 2026-03-21
**File:** `apps/api-server/src/modules/neture/neture.service.ts`
**Lines:** 3,021
**Status:** Investigation Complete

---

## 1. 개요

`NetureService`는 플랫폼 최대 단일 파일(3,021줄)로,
6개 이상의 하위 도메인 책임이 한 클래스에 혼재되어 있다.

- 13개 lazy repository
- 47개 public 메서드
- 5개 private helper 메서드
- 3곳의 트랜잭션 구간
- 22개 외부 소비 파일

---

## 2. 메서드 인벤토리

### 2.1 Public Methods (47개)

| # | 메서드 | 줄 범위 | 도메인 분류 | 주요 Repository |
|---|--------|---------|-------------|-----------------|
| 1 | `getSupplierIdByUserId` | 146-157 | Supplier | supplierRepo |
| 2 | `getSupplierByUserId` | 162-172 | Supplier | supplierRepo |
| 3 | `getPartnerByUserId` | 179-188 | Partner | partnerEntityRepo |
| 4 | `registerSupplier` | 195-253 | Supplier | supplierRepo |
| 5 | `approveSupplier` | 258-313 | Supplier | supplierRepo, membershipRepo, roleAssignment |
| 6 | `rejectSupplier` | 318-365 | Supplier | supplierRepo, membershipRepo, roleAssignment |
| 7 | `getPendingSuppliers` | 370-409 | Supplier | supplierRepo, raw SQL (users) |
| 8 | `deactivateSupplier` | 416-480 | Supplier | supplierRepo, raw SQL, membershipRepo, roleAssignment |
| 9 | `getAllSuppliers` | 486-534 | Supplier | supplierRepo, raw SQL (users) |
| 10 | `getPendingProducts` | 541-563 | Offer | offerRepo |
| 11 | `approveProduct` | 569-620 | Offer | offerRepo, queryRunner (tx), autoExpandPublicProduct |
| 12 | `approveProducts` | 626-647 | Offer | (delegates to approveProduct) |
| 13 | `rejectProduct` | 652-698 | Offer | offerRepo, raw SQL |
| 14 | `getAllProducts` | 703-742 | Offer | offerRepo |
| 15 | `getSuppliers` | 791-837 | Supplier | supplierRepo, computeTrustSignals |
| 16 | `hasApprovedPartnership` | 843-857 | Supplier | raw SQL |
| 17 | `getSupplierBySlug` | 919-967 | Supplier | supplierRepo, computeTrustSignals, filterContactInfo, computeContactHints |
| 18 | `getSupplierProfile` | 971-1031 | Supplier | supplierRepo, raw SQL (users) |
| 19 | `updateSupplierProfile` | 1033-1103 | Supplier | supplierRepo |
| 20 | `computeProfileCompleteness` | 1123-1203 | Supplier | supplierRepo, raw SQL |
| 21 | `getPartnershipRequests` | 1210-1245 | Partnership | partnershipRepo |
| 22 | `getPartnershipRequestById` | 1250-1299 | Partnership | partnershipRepo |
| 23 | `createPartnershipRequest` | 1306-1369 | Partnership | partnershipRepo, partnershipProductRepo |
| 24 | `updatePartnershipRequestStatus` | 1374-1401 | Partnership | partnershipRepo |
| 25 | `getSupplierProducts` | 1413-1486 | Offer | offerRepo, raw SQL, imageRepo |
| 26 | `createSupplierOffer` | 1494-1610 | Offer | offerRepo, supplierRepo, resolveOrCreateMaster, updateProductMaster |
| 27 | `updateSupplierOffer` | 1617-1720 | Offer | offerRepo, autoExpandPublicProduct |
| 28 | `getProductMasterByBarcode` | 1737-1739 | Catalog | masterRepo |
| 29 | `getProductMasterById` | 1744-1746 | Catalog | masterRepo |
| 30 | `resolveOrCreateMaster` | 1760-1827 | Catalog | masterRepo, mfds.service |
| 31 | `updateProductMaster` | 1835-1881 | Catalog | masterRepo |
| 32 | `getAllProductMasters` | 1886-1888 | Catalog | masterRepo |
| 33 | `searchProductMasters` | 1894-1929 | Catalog | masterRepo |
| 34 | `getCategoryTree` | 1936-1953 | Catalog | categoryRepo |
| 35 | `createCategory` | 1958-1980 | Catalog | categoryRepo |
| 36 | `updateCategory` | 1985-1995 | Catalog | categoryRepo |
| 37 | `deleteCategory` | 2000-2004 | Catalog | categoryRepo |
| 38 | `getAllBrands` | 2011-2013 | Catalog | brandRepo |
| 39 | `createBrand` | 2018-2032 | Catalog | brandRepo |
| 40 | `updateBrand` | 2037-2048 | Catalog | brandRepo |
| 41 | `deleteBrand` | 2053-2057 | Catalog | brandRepo |
| 42 | `getProductImages` | 2064-2069 | Catalog | imageRepo |
| 43 | `addProductImage` | 2074-2092 | Catalog | imageRepo |
| 44 | `setPrimaryImage` | 2097-2103 | Catalog | imageRepo (tx) |
| 45 | `deleteProductImage` | 2108-2128 | Catalog | imageRepo |
| 46 | `getSupplierOrdersSummary` | 2143-2237 | Dashboard | raw SQL |
| 47 | `getSupplierDashboardSummary` | 2244-2316 | Dashboard | offerRepo, raw SQL |
| 48 | `getAdminDashboardSummary` | 2321-2436 | Dashboard | supplierRepo, offerRepo, partnershipRepo, raw SQL |
| 49 | `getPartnerDashboardSummary` | 2441-2529 | Dashboard | partnershipRepo, raw SQL |
| 50 | `getOperatorSupplyProducts` | 2551-2608 | Offer | offerRepo, raw SQL |
| 51 | `getPartnerRecruitments` | 2615-2647 | Partner | recruitmentRepo |
| 52 | `createPartnerApplication` | 2652-2687 | Partner | recruitmentRepo, applicationRepo |
| 53 | `approvePartnerApplication` | 2692-2791 | Partner | applicationRepo, recruitmentRepo, contractRepo, dashboardRepo (tx), membershipRepo, roleAssignment |
| 54 | `rejectPartnerApplication` | 2796-2826 | Partner | applicationRepo, recruitmentRepo |
| 55 | `terminateContract` | 2833-2858 | Contract | contractRepo |
| 56 | `getSellerContracts` | 2863-2869 | Contract | contractRepo |
| 57 | `getPartnerContracts` | 2874-2880 | Contract | contractRepo |
| 58 | `updateCommissionRate` | 2885-2912 | Contract | contractRepo |
| 59 | `getSellerDashboardInsight` | 2924-3019 | Dashboard | raw SQL |

### 2.2 Private Methods (5개)

| 메서드 | 사용처 | 도메인 |
|--------|--------|--------|
| `computeTrustSignals` | getSuppliers, getSupplierBySlug | Supplier |
| `filterContactInfo` | getSupplierBySlug | Supplier |
| `computeContactHints` | getSupplierBySlug | Supplier |
| `formatRelativeTime` | getPartnerDashboardSummary | Dashboard (유틸) |
| `MASTER_IMMUTABLE_FIELDS` (static) | updateProductMaster | Catalog |

---

## 3. 도메인별 그룹핑 결과

### G1: SupplierService (14 methods, ~1,060줄)

공급자 등록/승인/거절/비활성화, 공급자 목록/상세, 프로필, 신뢰도.

| 메서드 |
|--------|
| getSupplierIdByUserId |
| getSupplierByUserId |
| registerSupplier |
| approveSupplier |
| rejectSupplier |
| getPendingSuppliers |
| deactivateSupplier |
| getAllSuppliers |
| getSuppliers |
| hasApprovedPartnership |
| getSupplierBySlug |
| getSupplierProfile |
| updateSupplierProfile |
| computeProfileCompleteness |

**Repos:** supplierRepo, membershipRepo, roleAssignmentService
**Private helpers:** computeTrustSignals, filterContactInfo, computeContactHints

### G2: OfferService (8 methods, ~620줄)

상품 Offer CRUD, 승인/반려, 일괄 승인, 공급가능 목록.

| 메서드 |
|--------|
| getPendingProducts |
| approveProduct |
| approveProducts |
| rejectProduct |
| getAllProducts |
| getSupplierProducts |
| createSupplierOffer |
| updateSupplierOffer |
| getOperatorSupplyProducts |

**Repos:** offerRepo, supplierRepo(read-only), autoExpandPublicProduct
**Cross-dependency:** `createSupplierOffer` → `resolveOrCreateMaster` (Catalog), `updateProductMaster` (Catalog)

### G3: CatalogService (16 methods, ~470줄)

ProductMaster, Category, Brand, ProductImage CRUD.

| 메서드 |
|--------|
| getProductMasterByBarcode |
| getProductMasterById |
| resolveOrCreateMaster |
| updateProductMaster |
| getAllProductMasters |
| searchProductMasters |
| getCategoryTree |
| createCategory / updateCategory / deleteCategory |
| getAllBrands |
| createBrand / updateBrand / deleteBrand |
| getProductImages / addProductImage / setPrimaryImage / deleteProductImage |

**Repos:** masterRepo, categoryRepo, brandRepo, imageRepo
**External import:** mfds.service (동적 import)
**Static:** MASTER_IMMUTABLE_FIELDS

### G4: PartnershipService (4 methods, ~200줄)

파트너십 요청 CRUD.

| 메서드 |
|--------|
| getPartnershipRequests |
| getPartnershipRequestById |
| createPartnershipRequest |
| updatePartnershipRequestStatus |

**Repos:** partnershipRepo, partnershipProductRepo

### G5: PartnerApplicationService (5 methods, ~350줄)

파트너 모집, 신청, 승인/거절 + 계약 자동 생성.

| 메서드 |
|--------|
| getPartnerByUserId |
| getPartnerRecruitments |
| createPartnerApplication |
| approvePartnerApplication |
| rejectPartnerApplication |

**Repos:** partnerEntityRepo, recruitmentRepo, applicationRepo, contractRepo, membershipRepo, roleAssignmentService
**Tx:** approvePartnerApplication 내 트랜잭션 (계약 + 대시보드 자동 등록)

### G6: ContractService (4 methods, ~100줄)

Seller-Partner 계약 조회, 해지, 수수료 변경.

| 메서드 |
|--------|
| terminateContract |
| getSellerContracts |
| getPartnerContracts |
| updateCommissionRate |

**Repos:** contractRepo

### G7: DashboardService (5 methods, ~420줄)

대시보드 통계/집계 (Supplier, Admin, Partner, Seller, Order Summary).

| 메서드 |
|--------|
| getSupplierOrdersSummary |
| getSupplierDashboardSummary |
| getAdminDashboardSummary |
| getPartnerDashboardSummary |
| getSellerDashboardInsight |

**Repos:** 거의 전부 raw SQL. supplierRepo, offerRepo, partnershipRepo (count 용도)
**Private:** formatRelativeTime

---

## 4. 의존성/호출 관계 요약

### 4.1 내부 메서드 호출 그래프

```
createSupplierOffer → resolveOrCreateMaster (Catalog)
createSupplierOffer → updateProductMaster (Catalog)
approveProducts → approveProduct (self)
getSuppliers → computeTrustSignals (private)
getSupplierBySlug → hasApprovedPartnership, filterContactInfo, computeContactHints, computeTrustSignals
approvePartnerApplication → (tx 내부: contractRepo, dashboardRepo, applicationRepo)
```

### 4.2 Repository 사용 분포

| Repository | G1 | G2 | G3 | G4 | G5 | G6 | G7 |
|------------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| supplierRepo | **●** | ○ | | | | | ○ |
| offerRepo | | **●** | | | | | ○ |
| masterRepo | | | **●** | | | | |
| categoryRepo | | | **●** | | | | |
| brandRepo | | | **●** | | | | |
| imageRepo | | | **●** | | | | |
| partnershipRepo | | | | **●** | | | ○ |
| partnershipProductRepo | | | | **●** | | | |
| recruitmentRepo | | | | | **●** | | |
| applicationRepo | | | | | **●** | | |
| contractRepo | | | | | ○ | **●** | |
| partnerEntityRepo | | | | | **●** | | |
| membershipRepo | ○ | | | | ○ | | |

**●** = primary, **○** = secondary/read-only

### 4.3 Cross-domain 의존성 (분해 핵심)

1. **Offer → Catalog:** `createSupplierOffer`가 `resolveOrCreateMaster` + `updateProductMaster` 호출
2. **Dashboard → ALL:** 대시보드 집계가 거의 모든 repo에서 count/집계
3. **PartnerApplication → Contract:** 승인 시 계약 자동 생성 (트랜잭션)
4. **Supplier/PartnerApplication → RBAC:** membershipRepo + roleAssignmentService 공유

---

## 5. 강결합 구간

### 5.1 Offer ↔ Catalog (중간 결합)

`createSupplierOffer`이 `resolveOrCreateMaster`를 호출한다.
**해법:** OfferService가 CatalogService를 주입받아 호출 (단방향 의존).

### 5.2 Dashboard → 전체 (읽기 전용 약결합)

Dashboard 메서드들은 거의 전부 raw SQL로 직접 조회한다.
repository를 직접 쓰지 않고 `AppDataSource.query()`를 사용.
**해법:** DashboardService는 독립적으로 분리 가능. repository 의존 없음.

### 5.3 approvePartnerApplication 트랜잭션 (강결합)

applicationRepo + contractRepo + dashboardRepo를 하나의 tx에서 처리.
**해법:** PartnerApplicationService와 ContractService를 합치거나,
tx 안에서 직접 manager.getRepository()를 쓰므로 분리해도 tx 로직은 한 곳에 유지 가능.

### 5.4 Supplier/Partner → RBAC (기능적 결합)

approveSupplier, rejectSupplier, deactivateSupplier, approvePartnerApplication 모두
membershipRepo + roleAssignmentService를 사용.
**해법:** 공통 helper나 base class에서 제공, 또는 각 서비스가 직접 import.

---

## 6. 권장 분해 구조

```
modules/neture/
  neture.service.ts           → 제거 또는 최소 facade
  services/
    supplier.service.ts       (G1: 14 methods, ~1,060줄)
    offer.service.ts          (G2: 9 methods, ~620줄)
    catalog.service.ts        (G3: 16 methods, ~470줄)
    partnership.service.ts    (G4: 4 methods, ~200줄)
    partner-application.service.ts (G5+G6: 9 methods, ~450줄)
    dashboard.service.ts      (G7: 5 methods, ~420줄)
  neture-service.facade.ts    (backward-compat wrapper)
```

### 왜 G5+G6 합산인가?

- Contract 메서드가 4개(100줄)로 너무 작고
- approvePartnerApplication이 계약 생성을 트랜잭션으로 처리하므로
- `PartnerContractService`로 합치는 것이 자연스럽다

---

## 7. Facade 유지 여부

**필요하다.**

- 22개 외부 소비 파일이 `new NetureService()` 인스턴스 하나에서 모든 메서드를 호출
- 특히 `neture.routes.ts`, `admin.controller.ts`, `hub-trigger.controller.ts`는 10+ 메서드 사용
- Forum 분해와 동일하게, composition facade로 backward-compat 유지

```typescript
// neture-service.facade.ts (또는 neture.service.ts 유지)
export class NetureService {
  private supplier = new SupplierService();
  private offer = new OfferService(this.catalog);
  private catalog = new CatalogService();
  private partnership = new PartnershipService();
  private partnerApp = new PartnerContractService();
  private dashboard = new DashboardService();

  // Delegate all methods...
  getSupplierIdByUserId = (...args) => this.supplier.getSupplierIdByUserId(...args);
  // ...
}
```

---

## 8. 권장 분해 순서

| 순서 | 대상 | 이유 |
|------|------|------|
| **1** | CatalogService | 외부 의존 없음. masterRepo/categoryRepo/brandRepo/imageRepo 전용. 가장 깨끗한 경계. |
| **2** | PartnershipService | 4 메서드, partnershipRepo만 사용. 즉시 분리 가능. |
| **3** | ContractService + PartnerApplicationService → PartnerContractService | 트랜잭션 경계가 한 곳. recruitmentRepo+applicationRepo+contractRepo. |
| **4** | DashboardService | raw SQL 위주. repository 의존 최소. 하지만 메서드가 길어서 line 절감 효과 큼. |
| **5** | OfferService | CatalogService 분리 후, Offer → Catalog 단방향 의존 설정 가능. |
| **6** | SupplierService | 가장 많은 메서드(14개). private helper 3개 포함. 마지막에 분리. |

---

## 9. 질문 답변

**Q1. 실제 하위 도메인 책임 수?**
→ **7개** (Supplier, Offer, Catalog, Partnership, PartnerApplication, Contract, Dashboard)
→ 합산 시 **6개 서비스**로 분해 권장

**Q2. 가장 자연스러운 분해 경계?**
→ Repository 기준. 각 그룹이 서로 다른 repository 집합을 주로 사용.

**Q3. 같은 서비스로 묶여야 하는 메서드?**
→ 위 G1~G7 분류 참조. PartnerApplication + Contract = PartnerContractService.

**Q4. 바로 분해하기 어려운 구간?**
→ `createSupplierOffer` (Offer→Catalog 의존). CatalogService를 먼저 분리하면 해결.

**Q5. 공통 helper/facade 필요한가?**
→ **Facade 필수** (22개 외부 소비자). membershipRepo + roleAssignment는 각 서비스에서 직접 import 가능.

**Q6. controller/route 변경 없이 분해 가능한가?**
→ **가능.** Facade가 기존 인터페이스를 유지하면 외부 소비자 변경 없음.

**Q7. 1차 분해는 몇 개 서비스가 안전한가?**
→ **6개 서비스** + 1개 facade

**Q8. 분해 순서?**
→ Catalog → Partnership → PartnerContract → Dashboard → Offer → Supplier (위 §8 참조)

**Q9. 최종 판정?**
→ **B. 얇은 facade 유지형으로 가능.**
추가 선행 정리 불필요. Forum 분해와 동일한 패턴 적용.

---

## 10. 후속 WO 방향

```
WO-O4O-NETURE-SERVICE-SPLIT-V1

Phase 1: CatalogService + PartnershipService 추출
Phase 2: PartnerContractService + DashboardService 추출
Phase 3: OfferService + SupplierService 추출 + facade 확정

각 Phase는 독립 커밋 가능.
빌드 검증: Phase별 tsc --noEmit 통과 필수.
```

---

*Investigation completed: 2026-03-21*
