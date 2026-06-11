# IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1

> **성격: read-only IR (코드/DB/UI 변경 없음).**
> 목적: "판매자 모집 공고 → 매장 신청 → 공급 승인 → O4O 주문 가능 상품 전환" 흐름을 확정하고,
> `ProductApproval(PRIVATE/SERVICE)` 흐름과 `neture_partner_recruitments` 흐름의 관계를 판정한다.
> 선행 미해소 지점: `IR-O4O-KPA-SUPPLIER-PRODUCT-EXPOSURE-ORDER-FLOW-AUDIT-V1 §8/§10 D`
> ("판매자 모집 mechanism 이 PRIVATE ProductApproval 단일 경로인지 neture_partner_recruitments 별도 경로인지 엇갈림").
> 작성일: 2026-06-11 · 환경: 코드 정적 분석(production DB 직접 조회 아님)

---

## 1. 목적

선행 작업으로 내 매장 상품/제품 용어 축은 확정되었으나, "판매자 모집" mechanism 이 미확정(D)으로 남았다.
본 IR 은 다음을 확정한다.

- 판매자 모집 공고 / 매장 신청 / 공급 승인 / 주문 가능 상품의 **데이터 원장**이 각각 무엇인가.
- `ProductApproval(PRIVATE/SERVICE)` 와 `neture_partner_recruitments` 가 같은 개념인가, 다른 도메인인가, 중복/충돌인가.
- 향후 canonical 흐름과 후속 작업 분리.

---

## 2. 배경

### 2.1 확정된 내 매장 기준 모델
| 개념 | DB 원장 | 주문 |
|---|---|---|
| 매장 취급 상품 | `StoreLocalProduct` | 불가 (비-O4O) |
| 기본 O4O 주문 가능 상품 | `OrganizationProductListing` | 승인·활성, 반복 |
| 신청·승인 현황 | `ProductApproval` | 승인 전 주문 불가 |
| 이벤트형 O4O 주문 가능 상품 | `OrganizationProductListing`(status/start_at/end_at/event_price) + cart `event_offer` | 기간·상태 조건부 |
| 주문 내역 | `checkout_orders` / `checkout_order_items` | — |

### 2.2 미확정 지점 (본 IR 대상)
선행 IR §10 D: 판매자 모집 = `ProductApproval(PRIVATE)` 인지 `neture_partner_recruitments` 인지, 또는 둘의 역할이 다른지.

---

## 3. 용어 기준

| 용어 | 정의 |
|---|---|
| 판매자 모집 공고(매장 공급 맥락) | 공급자가 특정 상품을 취급할 매장을 모집/노출하는 단계. 주문 가능 상품 아님. |
| 판매자 모집 신청 | 매장 경영자가 취급 의사를 표시한 상태(`ProductApproval(PENDING)`). 주문 가능 아님. |
| 공급 승인 상품 | 신청을 공급자/운영자가 승인한 상품(`ProductApproval(APPROVED)` → listing 생성). |
| 기본 O4O 주문 가능 상품 | 승인·활성(`OrganizationProductListing.is_active=true`)되어 매장이 반복 주문 가능. |

> 주의: "모집"은 **두 가지 무관한 도메인**에서 쓰인다 — (A) **매장 공급 맥락**(매장이 공급 상품을 취급 신청),
> (B) **Neture 제휴 affiliate 맥락**(셀러가 commission 으로 파트너를 모집). 본 IR 의 핵심 결론은 이 둘의 분리다.

---

## 4. 조사 범위

- 대표: KPA-society. 참조: Neture. 후속 적용 후보: GlycoPharm / K-Cosmetics(본 IR 변경 없음).
- 조사 entity: `ProductApproval`, `OrganizationProductListing`, `SupplierProductOffer`, `neture_partner_recruitments`,
  `neture_partner_applications`, `market_trials`, `store_cart_items`, `checkout_orders`.

---

## 5. Phase 1 — route/API/entity 매핑

### 5.1 매장 공급 맥락 (KPA 매장 허브)

| 영역 | 기능 | route/API | component/service | entity/table | 근거(파일:라인) |
|---|---|---|---|---|---|
| 매장 허브 진입 | HUB 인트로 | `/store-hub` | StoreHubPage | — | web-kpa-society/src/pages/pharmacy/StoreHubPage.tsx |
| B2B 카탈로그 | 공급 상품 탐색(노출) | `/store-hub/b2b` | HubB2BCatalogPage | `supplier_product_offers` | web-kpa-society/.../HubB2BCatalogPage.tsx |
| **취급 신청** | "내 매장에 추가/취급 신청" | `POST /pharmacy/products/apply` | applyBySupplyProductId() | `product_approvals` **또는** `organization_product_listings` | web-kpa-society/src/api/pharmacyProducts.ts:107 / apps/api-server/.../o4o-store/controllers/pharmacy-products.controller.ts |
| 카탈로그 isAdded | 취급 여부 판정 | `GET /pharmacy/products/catalog` | getCatalog() | `supplier_product_offers` ⨝ (`product_approvals` ∪ `organization_product_listings`) | pharmacy-products.controller.ts (EXISTS 서브쿼리) |
| 운영자 승인 | 신청 승인/반려 | `/operator/product-applications` | OperatorProductApplications | `product_approvals` | apps/api-server/.../kpa/controllers/operator-product-applications.controller.ts |
| 내 매장 상품 | O4O 주문 가능 상품 관리 | `/store/my-products` | StoreProductsManagerPage | `organization_product_listings` | packages/store-products-ui/src/StoreProductsManagerPage.tsx |
| B2B 구매 | 진열 상품 탐색/작업대 | `/store/commerce/products` | PharmacyB2BPage | `organization_product_listings` | web-kpa-society/.../PharmacyB2BPage.tsx |

### 5.2 Neture 제휴 affiliate 맥락

| 영역 | 기능 | route/API | entity/table | 근거 |
|---|---|---|---|---|
| 모집 공고 조회(공개) | 파트너 모집 탐색 | `GET /neture/partner/recruitments` | `neture_partner_recruitments` | apps/api-server/.../neture/controllers/partner-recruitment.controller.ts:74-91 |
| 파트너 신청 | 모집에 신청 | `POST /neture/partner/applications` | `neture_partner_applications` | partner-recruitment.controller.ts:94-127 |
| 신청 승인/거절 | 셀러가 결정 | `POST /partner/applications/:id/{approve,reject}` | `neture_partner_applications` | partner-recruitment.controller.ts:130-192 |
| 커미션 계산 | 파트너 commission | (service) | `neture_partner_recruitments` soft-JOIN `supplier_product_offers` | partner-commission.service.ts:52-53,224 |

---

## 6. Phase 2 — PRIVATE/SERVICE ProductApproval 흐름

**엔티티**: `apps/api-server/src/entities/ProductApproval.ts:33 @Entity('product_approvals')` (단일 테이블).
- 컬럼: `offer_id`(→`supplier_product_offers`, CASCADE), `organization_id`(약국), `service_key`(기본 kpa),
  `approval_type`(SERVICE|PRIVATE), `approval_status`(PENDING|APPROVED|REJECTED|REVOKED),
  `requested_by`(셀러), `decided_by`(운영자), `decided_at`, `reason`, `metadata`.
- UNIQUE `(offer_id, organization_id, approval_type)`. 마이그레이션 `20260225100000-CreateProductApprovalsTable.ts`.

| 단계 | action/API | 생성/변경 데이터 | 상태값 | 승인 주체 | 다음 단계 | 근거(파일:라인) |
|---|---|---|---|---|---|---|
| 신청(SERVICE) | `POST /seller/service-products/:id/apply` | `product_approvals` INSERT | PENDING | 셀러(store_owner) | 운영자 승인 대기 | seller.controller.ts:115-166 / product-approval-v2.service.ts:88-95 |
| 신청(PRIVATE) | createPrivateApproval(offer, sellerOrg) | `product_approvals` INSERT (allowed_seller_ids 검증) | PENDING | 셀러/시스템 | 운영자 승인 대기 | product-approval-v2.service.ts:199-274 |
| 승인 | `/operator/products/:id/approve` · `/admin/products/:id/approve` | approval=APPROVED **+ `organization_product_listings` INSERT(is_active=false)** | APPROVED | operator/admin | 매장 활성화 | product-approval-v2.service.ts:150-189, 280-352 |
| 반려 | `/operator/products/:id/reject` | approval=REJECTED, reason | REJECTED | operator/admin | 재신청 가능 | product-approval-v2.service.ts:391-418 |
| 철회 | admin revoke | approval=REVOKED + listing is_active=false | REVOKED | admin | 재신청 가능 | product-approval-v2.service.ts:424-460 |

**판정**: `ProductApproval` = **신청·승인 원장**(셀러 신청 → 운영자 승인). "모집 공고 원장"이 아니다 —
모집/타깃 노출은 `SupplierProductOffer`(distribution_type + allowed_seller_ids/service_keys)가 담당.
승인 시 `OrganizationProductListing(is_active=false)` 자동 생성됨(실코드 존재).

> ⚠️ 관찰(이중 경로): `product_approvals` 를 다루는 코드가 (a) `modules/product-policy-v2/product-approval-v2.service.ts`(neture 계열)
> 와 (b) `routes/kpa/controllers/operator-product-applications.controller.ts`(KPA 계열) 두 군데로 보인다. 단일 테이블이나
> 접근/승인 경로가 둘일 수 있어 **드리프트 가능성** — Phase 6 후속에서 단일 경로 확인 권장.

---

## 7. Phase 3 — neture_partner_recruitments 흐름

**엔티티**: `apps/api-server/src/modules/neture/entities/NeturePartnerRecruitment.entity.ts` (`neture_partner_recruitments`).
- 컬럼: `product_id`(varchar soft-ref), `product_name`, `manufacturer`, `consumer_price`, **`commission_rate`**,
  `seller_id`, `seller_name`, `service_id`(nullable), `status`(RECRUITING|CLOSED). **`organization_id` 없음 · `offer_id`(FK) 없음 · `master_id`(FK) 없음.**
- 신청 원장: `neture_partner_applications`(recruitment_id FK, partner_id, status PENDING|APPROVED|REJECTED). organizationId 없음.

| 항목 | 확인 결과 | 근거(파일:라인) | 주문 가능 상품 전환과 관계 | 판정 |
|---|---|---|---|---|
| 역할 | 셀러가 commission_rate 명시해 **제휴 파트너 모집 공고** 게시 + 신청/승인 | NeturePartnerRecruitment.entity.ts:4-8, partner-contract.service.ts:168-214 | ❌ 전환 코드 0건 | affiliate 도메인 |
| 매장 소비 | KPA/GP/KCos 코드에서 recruitment 참조 0건 — Neture 파트너 대시보드 전용 | web-* grep 0 / web-neture/src/lib/api/partner.ts:165-188 | ❌ 없음 | Neture 전용 |
| OrganizationProductListing 전환 | recruitment 승인 → listing 생성 코드 **없음**. 승인 시 dashboard item만 생성 | partner-contract.service.ts:217-232 | ❌ 미연결 | 주문 흐름과 무관 |
| market_trials/펀딩 혼재 | 테이블 공유·FK 0건. market_trials(supplier→seller 펀딩)와 별개 | market_trials(packages) vs neture_partner_* | ❌ 무관 | 독립 |
| service-neutral | `/neture/partner/*` + `neture_partner_*` 스키마, Neture 모듈 격리 | — | — | 100% Neture |

**판정**: `neture_partner_recruitments` = **Neture 제휴(affiliate) 파트너 모집 도메인**. 매장 공급 승인/주문 가능 상품과
**무관**하며 어떤 서비스도 store 공급 흐름으로 소비하지 않는다. 모집 공고 원장이긴 하나 그 대상은 "매장 공급"이 아니라 "Neture 제휴 파트너".

---

## 8. Phase 4 — 두 흐름의 관계 판정

| 관점 | ProductApproval(PRIVATE/SERVICE) | neture_partner_recruitments |
|---|---|---|
| 도메인 | **매장 공급 승인** (Store supply) | **Neture 제휴 affiliate** |
| 모집/타깃 노출 원장 | `SupplierProductOffer`(distribution_type·allowed_seller_ids·service_keys) | `neture_partner_recruitments`(commission 모집 공고) |
| 신청 원장 | `product_approvals`(PENDING) | `neture_partner_applications`(PENDING) |
| 승인 주체 | 운영자/관리자 | 셀러(모집 주체) |
| 주문 가능 상품 전환 | ✅ → `OrganizationProductListing` | ❌ (dashboard/commission만) |
| organizationId 연결 | ✅ | ❌ |
| 서비스 소비 | KPA/GP/KCos(매장) | Neture 전용 |
| 테이블 공유 | — | 상호 FK·공유 0 |

**판정: C 변형 — "둘 다 필요하나 서로 다른 도메인(역할 분리)".**
- 같은 개념의 **경쟁 canonical 이 아니다.** "모집"이라는 단어만 겹칠 뿐, 한쪽은 매장 공급 승인, 다른 쪽은 Neture 제휴다.
- 테이블 미공유 + 전환 미연결이므로 **중복/드리프트 위험은 없다.** 유일한 위험은 **네이밍/IA 혼동**("판매자 모집"이 두 가지를 가리킴).
- 따라서 선행 IR §10 D 는 다음으로 해소된다:
  **매장 공급 맥락의 "판매자 모집"은 `ProductApproval(PRIVATE/SERVICE)` 신청·승인 + `SupplierProductOffer` 타깃 노출이 canonical이고,
  `neture_partner_recruitments` 는 그 흐름과 무관한 별도 Neture affiliate 기능이다.**

---

## 9. Phase 5 — 권장 canonical 흐름 (매장 공급)

| 단계 | 권장 데이터 원장 | 현재 구현 | gap |
|---|---|---|---|
| 1. 모집/노출 | `SupplierProductOffer`(distribution_type PUBLIC/SERVICE/PRIVATE, allowed_seller_ids, service_keys) | store-hub/b2b 카탈로그 노출 | 별도 "모집 공고" 화면 없음 — 카탈로그=노출 (의도된 단순화) |
| 2. 매장 신청 | `product_approvals`(PENDING) | PRIVATE/SERVICE apply → product_approvals | PUBLIC 은 신청 없이 즉시 listing(자동 확산) |
| 3. 공급 승인 | `product_approvals`(APPROVED) | operator/admin approve | 이중 코드 경로 확인 필요(§6 관찰) |
| 4. 주문 가능 원장 생성 | `OrganizationProductListing`(is_active=false) | 승인/자동확산 시 INSERT | auto-expand(PUBLIC/SERVICE)=is_active=false vs apply 직접경로 is_active 값 차이 가능 |
| 5. 매장 활성화 | `OrganizationProductListing.is_active=true` | /store/my-products 토글 | 수동 — 매장이 활성화해야 주문 가능 |
| 6. 주문 검증 | checkout guard 3계층(offer.is_active ∧ listing.is_active ∧ channel.is_active ∧ distribution policy) | kpa-checkout.controller.ts:271-378 | 확정됨 |

**전환 성격 판정**: `SupplierProductOffer 승인 → (자동) listing 생성(is_active=false) → (수동) 매장 활성화 → (자동) 주문 검증`
= **반자동 4단계**. "공급 승인"과 "주문 가능"은 `is_active` 게이트로 명확히 분리되어 있다(신청·승인 상태 ≠ 주문 가능).

> 관찰(KPA 2차 심사 브릿지): `offer-service-approval.service.ts`(syncOfferFromServiceApprovals)에서 kpa-society service
> 승인 시 `product_approvals(pending)` 행을 추가 생성(KPA 운영자 2차 심사 큐). → SupplierProductOffer 승인과 KPA ProductApproval 이
> 브릿지로 연결됨. 이 2차 심사 경로의 최종 승인이 listing 활성화로 이어지는지 별도 확인 권장.

---

## 10. Phase 6 — 후속 작업 분리

### 소형 WO 후보
- **용어/IA 정리**: 매장 공급의 "취급 신청/판매자 모집" 라벨이 Neture affiliate "파트너 모집"과 혼동되지 않도록 문구 구분
  (페이지 heading/설명 수준 — 메뉴 canonical 무변경 원칙 유지).
- **`seller_recruitment` cart sourceType 처리**: `StoreCartItem.entity.ts:31` + 3서비스 storeCart.ts 에 선언되어 있으나
  "주문 아님 — 신청/승인 모델"(선행 IR §9). 주문 경로가 아니라면 dead enum 표식/주석 또는 가드 명문화.
- **신청 상태 표시**: 카탈로그에서 PENDING 신청을 "주문 가능"처럼 보이지 않게(현재 isAdded 가 approval∪listing 합집합 — PENDING도 isAdded=true) — 상태 구분 라벨 검토.

### 추가 IR 후보
- **이중 product_approvals 코드 경로**(product-policy-v2 service vs kpa routes controller) 단일화 여부 — drift 정밀 조사.
- **auto-expand vs apply 직접 경로의 is_active 초기값 정합** — "매장이 활성화해야 주문 가능" 불변식이 모든 진입 경로에서 보장되는지.
- **Neture affiliate → 매장 공급 연계(미래)**: neture_partner_recruitments 가 향후 매장 주문 가능 상품으로 이어져야 한다면 전환 설계 별도 IR(현재 무연결).

### 장기 리팩터 후보
- `SupplierProductOffer`(모집/타깃) ↔ `ProductApproval`(신청·승인) ↔ `OrganizationProductListing`(주문 가능) 3원장 경계를
  service-neutral 로 명문화(현재 KPA 중심 raw SQL 다수).

---

## 11. 내 매장 공통화 반영 기준

- 내 매장 "O4O 주문 가능 상품"(`/store/my-products`)의 상류는 **`ProductApproval`(신청·승인) → `OrganizationProductListing`(주문 가능)**
  체인이다. `neture_partner_recruitments` 는 이 체인에 포함되지 않는다 — 공통화 설계에서 제외.
- 3서비스 공통화 시 모집/타깃은 `SupplierProductOffer`, 신청·승인은 `product_approvals`, 주문 가능은 `organization_product_listings`
  를 단일 기준으로 본다. Neture affiliate 는 Neture 도메인 내부 기능으로 분리 유지.

---

## 12. 결론

**핵심 결론 (선행 IR §10 D 해소):**

> **C 변형 — 둘 다 필요하나 서로 다른 도메인(역할 분리).**
> 1. 매장 공급 맥락의 판매자 모집/취급 신청 = `SupplierProductOffer`(노출·타깃) + **`ProductApproval(PRIVATE/SERVICE)`(신청·승인 canonical)**
>    → `OrganizationProductListing`(주문 가능 원장). 승인≠주문가능은 `is_active` 게이트로 분리.
> 2. `neture_partner_recruitments` = **별도 Neture 제휴(affiliate) 모집 도메인.** 매장 공급/주문 가능 상품과 무관(legacy 아님, active but separate).
> 3. 두 흐름은 테이블 미공유·전환 미연결 → **중복/드리프트 위험 없음.** 위험은 "모집" 네이밍 혼동뿐 → 소형 용어 WO 로 분리.

**완료 조건 충족:**
- 모집/노출 원장(SupplierProductOffer), 신청 원장(product_approvals), 승인 원장(product_approvals), 주문 가능 원장(organization_product_listings) 확인 ✅
- 승인 후 listing 전환 여부(자동 생성 is_active=false, 매장 수동 활성화) 확인 ✅
- ProductApproval ↔ neture_partner_recruitments 관계 판정(별도 도메인) ✅
- canonical 흐름 제안 + 신청/주문가능 분리 + 후속 WO/IR/리팩터 분리 ✅
- 코드 변경 0 (문서만) ✅

**미확정(추가 조사 필요, 본 IR 단정 불가):**
- product_approvals 이중 코드 경로의 실제 단일성/드리프트.
- auto-expand vs apply 경로의 is_active 초기값 정합.
- KPA 2차 심사 브릿지 최종 승인 → listing 활성화 연결.
