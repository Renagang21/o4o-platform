# IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** 공급 상품 신청(ProductApproval PENDING) → 승인 → OrganizationProductListing(OPL) 생성 → 내 매장 주문 가능 상품 편입 경로를 KPA/GlycoPharm/K-Cosmetics 3서비스에서 audit.
> **작성일:** 2026-06-13 · 기준 HEAD `7574e08e1`
> **선행:** `WO-O4O-STORE-HUB-SUPPLY-CATALOG-NAMING-ALIGNMENT-V1`(SupplyCatalogHub) · `CHECK-O4O-STORE-HUB-SUPPLY-CATALOG-KPA-FOLD-IN-V1`(D 보류)

---

## 0. 핵심 결론 (Executive Summary)

| 질문 | 답 |
|------|-----|
| 신청→승인→OPL backend 는 서비스별로 다른가? | **NO — 단일 공유 구현.** `pharmacy-products.controller.ts`(POST `/pharmacy/products/apply`) + `ProductApprovalV2Service`(product-policy-v2) 가 serviceKey 파라미터로 3서비스를 처리. per-service 분기 없음 |
| 승인 시 OPL 이 생성되는가? | **YES — `approveServiceProduct()` 트랜잭션에서 OPL upsert.** 단 **`is_active: false`(비활성) 으로 생성** (product-approval-v2.service.ts:173) |
| 승인 직후 주문 가능 상품인가? | **NO.** OPL `is_active=false` → 운영자가 **활성화(PUT /listings/:id isActive=true) + 채널 진열(OPC is_active + channel APPROVED)** 해야 주문 가능. "승인 ≠ 즉시 주문 가능" |
| StoreProductProfile 도 생성되는가? | **NO** — 승인 경로에서 생성 안 함(표시 커스터마이즈용, 별도 수동 upsert) |
| 거절/취소/삭제 정리 정책은? | reject→ProductApproval만 REJECTED(OPL 무관) · revoke→OPL `is_active=false` 비활성 · **"내 매장 제외"(cancelProductByOfferId)→ProductApproval+OPL row 둘 다 DELETE** |
| 가장 중요한 발견 | **① OPL 초기 상태 = 비활성(3서비스 공통)** — 승인 후 활성화+진열 단계 필수. **② 소비자 storefront 성숙도 차이**: GlycoPharm 만 4-gate 소비자 storefront 보유, K-Cos/KPA 는 소비자 storefront 없음(operator-facing listings 만). **③ 승인 action UI 공백 가능성**: product-policy-v2 의 store 상품 승인 endpoint 는 admin/internal(X-Admin-Secret) 전용 — operator-facing 승인 UI 가 별도 확인 필요 |

**핵심:** 신청→승인→OPL **backend 계약은 3서비스 공통이며 OPL 은 비활성으로 생성**된다(A). 차이는 backend 가 아니라 **소비자 storefront frontend 성숙도**(GP 만 완성, C)와 **승인 operator UI 노출 여부**(확인 필요, E/D)에 있다.

---

## 1. 목적

3서비스의 ProductApproval 승인 경로, 승인 시 OPL 생성, 승인 후 주문 가능 상품 편입 조건, 거절/취소/삭제 정리 정책을 확인하고 차이를 분리하여 후속 WO 범위를 확정한다. read-only.

## 2. 선행 기준

- 신청 = `applyBySupplyProductId` → ProductApproval(PENDING) [SERVICE/PRIVATE]. 신청 ≠ 주문 가능.
- 승인 후 OPL 생성. OPL 활성화 + 채널 진열 시 주문 가능.
- 제외: StoreLocalProduct(매장 취급, OPL 아님) · EventOffer(이벤트형, 별도) · 유통참여형 펀딩(Neture-only, Store OPL 무관).

## 3. 조사 범위

| 서비스 | apply/승인 backend | OPL 엔티티 | 소비자 storefront / operator listings |
|--------|---------------------|-----------|----------------------------------------|
| 공통 backend | `routes/o4o-store/controllers/pharmacy-products.controller.ts` · `modules/product-policy-v2/product-approval-v2.service.ts` | `modules/store-core/entities/organization-product-listing.entity.ts` | `GET /pharmacy/products/listings`(operator) |
| KPA | `kpa.routes.ts` mount (serviceKey 'kpa-society') | 공유 | operator listings (소비자 storefront 없음) |
| GlycoPharm | `glycopharm.routes.ts` mount ('glycopharm') | 공유 | **소비자 storefront** `store.controller.ts` 4-gate (`/store/:slug/products`) |
| K-Cosmetics | `cosmetics.routes.ts:110` mount ('cosmetics') | 공유 | operator catalog 만 (소비자 storefront 미구현) |

엔티티: `apps/api-server/src/entities/ProductApproval.ts` (status enum: PENDING/APPROVED/REJECTED/REVOKED), `StoreProductProfile.entity.ts`.

---

## 4. Phase 1 — ProductApproval 생성 경로

| 서비스 | frontend apply | backend endpoint | service method | 생성 결과 | 판정 |
|--------|----------------|------------------|----------------|-----------|:---:|
| 3서비스 공통 | `applyBySupplyProductId(id)` (pharmacyProducts adapter) | `POST /pharmacy/products/apply` (`pharmacy-products.controller.ts:195-238`) | distribution_type 분기 | — | A |
| └ SERVICE | 〃 | 〃 | `createServiceApproval()` (`product-approval-v2.service.ts:29-99`) | **ProductApproval(PENDING)** (type SERVICE) | A |
| └ PRIVATE | 〃 | 〃 | `createPrivateApproval()` (:199-274) | **ProductApproval(PENDING)** (type PRIVATE) | A |
| └ PUBLIC | 〃 | 〃 | `createPublicListing()` | **OPL 즉시 생성(is_active=false)** — 승인 단계 없음 | A |

- serviceKey 는 body 에서 resolve(`resolveServiceKeyFromBody`), 가드는 `requirePharmacyOwner`(serviceKey-aware). **단일 컨트롤러·단일 서비스, per-service 분기 없음.**

---

## 5. Phase 2 — 승인 action 경로

| 경로 | 화면 | 승인 API | service method | status transition | 비고 |
|------|------|----------|----------------|-------------------|------|
| product-policy-v2 (store 상품 승인) | **operator UI 미확인** | `POST /service-approval/:id/approve` (`product-policy-v2.internal.routes.ts:115-145`) | `ProductApprovalV2Service.approveServiceProduct()` (:105-193) | PENDING→APPROVED | **admin/internal — X-Admin-Secret 요구**(operator-facing 승인 UI 별도 확인 필요) |
| Neture offer 승인(별도 레이어) | Neture operator | `PATCH /service-approvals/:id/approve` (`operator-service-approval.controller.ts:184-199`) | `OfferServiceApprovalService.approve()` | offer_service_approvals: pending→approved | **product_approvals 와 다른 테이블**. 승인 시 auto-listing(OPL is_active=false) |

**판정:** 승인 service 는 공유(`ProductApprovalV2Service`)이나, **현재 노출된 승인 endpoint 가 admin/internal 전용**으로 보임 → **operator 가 자기 서비스 store 상품 신청을 승인하는 UI/route 존재 여부가 미확정(E/D)**. Neture 는 offer_service_approvals 라는 별도 승인 레이어(공급자/플랫폼 단)를 가짐. → **Q2 후속 확인 필요.**

---

## 6. Phase 3 — 승인 → OPL 생성

| 항목 | 값/위치 | 판정 |
|------|---------|:---:|
| OPL 생성 | `approveServiceProduct()` 트랜잭션 내 upsert (`product-approval-v2.service.ts:156-189`) | A |
| 연결 키 | `organization_id`, `service_key`, `master_id`(offer.masterId), `offer_id`(offer.id) | A |
| **초기 active** | **`is_active: false`** (:173) — 엔티티 default 도 false (`organization-product-listing.entity.ts:41-42`) | A (3서비스 공통) |
| 중복 방지 | unique(organization_id, offer_id, service_key) → 23505 시 기존 listing 재조회 | A |
| StoreProductProfile | **생성 안 함** (승인 경로 무관) | — |
| source_type/source_id | 미설정(nullable) | — |

**핵심:** 승인은 OPL 을 **비활성(is_active=false)** 으로 만든다. 3서비스 공통(단일 서비스). 즉 **승인만으로는 주문 가능 상품이 아니다.**

---

## 7. Phase 4 — /store/my-products(내 매장 주문 가능 상품) 반영

| 서비스 | 화면/엔드포인트 | 데이터 소스 | 표시/주문 가능 조건 | 판정 |
|--------|-----------------|-------------|---------------------|:---:|
| **operator listings (공통)** | `GET /pharmacy/products/listings` (`pharmacy-products.controller.ts:326-348`) | OPL `where {organization_id, service_key?}` | **is_active 무관 전체 반환**(운영자는 활성/비활성 모두 봄) | A |
| OPL 활성화 | `PUT /pharmacy/products/listings/:id` (`:351-391`) `{isActive:true}` | — | 운영자가 명시적 활성화("진열") | A |
| **GlycoPharm 소비자 storefront** | `GET /glycopharm/stores/:slug/products` (`store.controller.ts:114-173`) | OPL **4-gate INNER JOIN** | ① offer is_active ② **OPL is_active=true** ③ OPC is_active=true ④ channel B2C APPROVED | A (GP 완성) |
| K-Cosmetics 소비자 storefront | **미구현** | — | 소비자 storefront 없음(operator catalog 만) | C |
| KPA 소비자 storefront | **미구현** | — | operator listings 만 | C |

**판정:** 승인 후 흐름 = **OPL(비활성) 생성 → 운영자 활성화(is_active=true) + 채널 진열(OPC) → (GP) 소비자 storefront 4-gate 통과 시 주문 가능.** GlycoPharm 만 소비자 storefront 가 완성되어 있고, K-Cos/KPA 는 소비자 storefront 미구현(operator-facing listings 까지만). → **frontend 성숙도 차이(C), backend 차이 아님.**

---

## 8. Phase 5 — 거절/취소/삭제 정책

| 케이스 | ProductApproval | OPL | StoreProductProfile | 위치 | 판정 |
|--------|-----------------|-----|---------------------|------|:---:|
| reject (PENDING→REJECTED) | REJECTED 로 상태변경 | **무관**(생성 전이므로 없음) | — | `product-approval-v2.service.ts:358-417` | A |
| revoke (APPROVED→REVOKED) | REVOKED | **`is_active=false` 비활성**(삭제 아님) | — | `:424-460` (UPDATE OPL is_active=false) | A |
| "내 매장 제외" `cancelProductByOfferId` | **row DELETE** | **row DELETE** | — | `pharmacy-products.controller.ts:523-542` (DELETE product_approvals + organization_product_listings) | A |

**판정:** 정리 정책 일관(공통 backend). revoke=비활성 보존 / 제외=완전 삭제. 거절은 승인 전 단계라 OPL 영향 없음.

---

## 9. Phase 6 — cross-service 판정

| 영역 | KPA | GlycoPharm | K-Cosmetics | 판정 | 후속 |
|------|-----|-----------|-------------|:---:|------|
| apply→ProductApproval(PENDING) | 공유 | 공유 | 공유 | **A** | — |
| 승인 service (approveServiceProduct) | 공유 | 공유 | 공유 | **A** | — |
| 승인 operator-facing UI/route 노출 | ? | ? | ? | **E/D** | Q2 후속 — admin/internal 외 operator 승인 surface 확인 |
| 승인→OPL 생성(is_active=false) | 공유 | 공유 | 공유 | **A** | — |
| OPL 활성화(PUT listings) + 채널 진열 | 공유 | 공유 | 공유 | **A** | — |
| 소비자 storefront(주문 가능 노출) | 미구현 | **4-gate 완성** | 미구현 | **C** | 서비스별 storefront 구축(frontend 성숙도) |
| reject/revoke/제외 정리 | 공유 | 공유 | 공유 | **A** | — |
| StoreProductProfile 연계 | 없음 | 없음 | 없음 | **A**(일관, 미연계) | 필요 시 별도 |

**종합:** 신청→승인→OPL→정리 **backend 계약은 3서비스 완전 공통(A)**. 차이는 ① **소비자 storefront frontend 성숙도(C — GP만 완성)**, ② **승인 operator UI 노출(E/D — 확인 필요)** 에 국한. 신규 parity backend 작업은 불요.

---

## 10. 후속 작업

| 우선 | WO/IR 후보 | 분류 | 내용 |
|:---:|-----------|:---:|------|
| 1 | `IR-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-AUDIT-V1` | E/D | store 상품 승인(product_approvals PENDING→APPROVED)을 **operator 가 수행하는 UI/route 존재 여부** 확정. admin/internal 전용이면 operator 승인 surface 설계 필요 여부 판단 (Q2) |
| 2 | `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1` | C | 승인 후 OPL 활성화+채널 진열 정책을 3서비스 공통 문서화. K-Cos/KPA 소비자 storefront 구축 시 GP 4-gate 패턴 채택 기준 |
| 3 | `WO-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1` | — | 신청→승인→활성화→진열→주문 가능 end-to-end 흐름 문서(운영자 가이드) |
| 4 | *(조건부)* `WO-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-PARITY-FIX-V1` | C | Phase 6 에서 C 로 판정된 storefront 성숙도 차이 정비(필요 시) |

> backend 는 이미 공통(A)이므로 parity-fix 의 실익은 낮고, 후속 핵심은 **(1) 승인 operator surface 확인 + (2) storefront/활성화 정책 문서화**다.

---

## 11. 결론

- 공급 상품 **신청→승인→OPL 생성→거절/취소 정리 backend 는 3서비스 완전 공통**(`pharmacy-products.controller` + `ProductApprovalV2Service`, serviceKey 파라미터, per-service 분기 0). → A.
- **승인 시 OPL 은 `is_active=false`(비활성) 으로 생성**된다(3서비스 공통). **승인 ≠ 즉시 주문 가능** — 운영자 **활성화(PUT listings isActive=true) + 채널 진열(OPC is_active + channel APPROVED)** 이 추가로 필요.
- **소비자 주문 가능 노출은 GlycoPharm 만 완성**(4-gate storefront). K-Cos/KPA 는 operator-facing listings 까지만, 소비자 storefront 미구현 → **frontend 성숙도 차이(C)**, backend 차이 아님.
- **승인 action 의 operator-facing 노출 여부가 미확정**(현재 노출 endpoint 는 admin/internal X-Admin-Secret) → 최우선 후속 확인(E/D).
- 신규 주문 테이블·parity backend 불요. 후속은 (1) 승인 operator surface 확인 IR, (2) 활성화/storefront 정책 문서화.

---

## 12. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1.md`)
- [x] 코드/DB/migration/route/UI/API 변경 없음 (read-only), production write 없음
- [x] Phase 1 신청 경로 / Phase 2 승인 action / Phase 3 승인→OPL(is_active=false) / Phase 4 my-products 반영 / Phase 5 정리 정책 / Phase 6 cross-service 판정
- [x] OPL 초기 active 상태 코드 직접 확인(`product-approval-v2.service.ts:173` is_active:false)
- [x] 후속 WO/IR 분리 (§10)
- [x] 다른 세션 WIP(lms-ui 등) 미접촉

---

*End of IR-O4O-PRODUCT-APPROVAL-TO-OPL-CROSSSERVICE-AUDIT-V1*
