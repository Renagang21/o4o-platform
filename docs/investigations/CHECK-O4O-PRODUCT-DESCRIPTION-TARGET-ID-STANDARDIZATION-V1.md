# CHECK-O4O-PRODUCT-DESCRIPTION-TARGET-ID-STANDARDIZATION-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-TARGET-ID-STANDARDIZATION-V1
> **유형:** read-only 조사 — 코드/DB/UI **무변경**. 노출 연결(OUTPUT-LINK) 선행 — 상품설명 귀속 단위 확정.
> **판정: D (ID 혼용 위험) — 노출 연결 전 bridge 정리 필수.**
> 편집기는 `store_local_products.id` 를 `productId` 로 전송하나, AI 콘텐츠 백엔드(guard + generate)는 `productId` 를 **`product_masters.id`** 로 취급 → **두 상품 우주가 불일치**. 게다가 `store_local_products` 는 이미 자체 `detail_html` description 경로를 보유. **A안(현행 master 유지) 불가 — 현 ID 흐름이 정합하지 않음.**
> **🔵 Canonical Target 결정(사용자, 2026-06-16):** ①(local 단독)도 ②(catalog 단독)도 아닌 **통합 "매장 내 상품 설명" scope** — StoreLocalProduct + OrganizationProductListing(그 뒤 ProductMaster/SupplierProductOffer 정보) 를 **모두 포괄**. 저장 기준 = **store/organization scope + product identity**. 상품설명은 공용 ProductMaster 설명이 아니라 **매장별 재사용·수정 가능한 설명 콘텐츠**. → §5.
> 선행: [`IR-O4O-PRODUCT-DESCRIPTION-PRODUCTION-FLOW-AUDIT-V1`](IR-O4O-PRODUCT-DESCRIPTION-PRODUCTION-FLOW-AUDIT-V1.md) — 2026-06-16

---

## 1. 결론 요약

상품설명 편집기와 AI 콘텐츠 백엔드가 **서로 다른 상품 식별자 우주**를 가정한다.

| 위치 | productId 가 가리키는 것 | 근거 |
|------|------|------|
| **편집기**(StoreProductDescriptionsPage) | **`store_local_products.id`** | `fetchLocalProducts()` → `/store/local-products` → `LocalProduct.id` 를 selectedId 로 사용 (KPA:71-74,176) |
| **AI 콘텐츠 guard** | **`product_masters.id`** | `verifyProductOrgAccess`: `spo.master_id = productId` (product-access.utils.ts:50-57) |
| **AI 콘텐츠 generate** | **`product_masters.id`** | `loadProductContentInput`: `product_masters WHERE pm.id = productId` (controller:228-231) |

**`store_local_products` 엔티티에는 `master_id`/`offer_id`/`listing_id` 등 ProductMaster 관계가 전혀 없다**(독립 UUID, organization_id 스코프). 따라서 `store_local_products.id` 와 `product_masters.id` 가 일치한다는 **명시적 보장이 없다** → 현 구현은 ID 혼용 상태.

→ **판정 D.** A안(ProductMaster 기준 유지)은 "현재처럼 안정적으로 매칭됨"을 전제하나, 그 전제가 **성립하지 않는다.**

---

## 2. 증거 체인 (정적, 전수)

### 2.1 편집기가 보내는 id = StoreLocalProduct.id
`services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx` (GP/KCos 동형)
- `71` `fetchLocalProducts({...})` → `72` `setProducts(res.items)` → `74` `setSelectedId(res.items[0].id)`.
- `176` `saveProductAiContent(selectedId, 'product_description', ...)` · `91/155` `getProductAiContents(selectedId)` / `generateProductAiContent(selectedId, ...)`.
- `fetchLocalProducts` client: `GET /api/v1/store/local-products` → `store_local_products` rows (`api/localProducts.ts:6,112`).

### 2.2 백엔드는 그 id 를 ProductMaster.id 로 취급
`apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts`
- 모든 endpoint: `verifyProductOrgAccess(ds, productId, userId)` 선통과 필요 (43/79/115/141/169).
- `loadProductContentInput`(213-233): `SELECT ... FROM product_masters pm ... WHERE pm.id = $1`.

`apps/api-server/src/modules/store-ai/utils/product-access.utils.ts:50-57`
```sql
SELECT 1 FROM organization_product_listings opl
JOIN supplier_product_offers spo ON spo.id = opl.offer_id
WHERE spo.master_id = $1  -- productId
  AND opl.organization_id = $2
```
→ **productId = product_masters.id 여야** non-admin 통과.

### 2.3 귀결 (store 역할 사용자가 local product 설명 편집 시)
| 동작 | 결과(추정, 정적) |
|------|------|
| guard(`spo.master_id = store_local_products.id`) | **매칭 없음 → 403** (admin/operator 만 bypass) |
| generate(`product_masters WHERE id = store_local_products.id`) | **null → 404** "Product not found" |
| save(PUT) | guard 403 (save 자체는 master 조회 안 하나 guard 선통과 필요) |

→ admin/operator(role bypass)로만 동작 가능하고, 그조차 generate 는 master 부재로 404. **store 역할 기준으로 현 흐름은 정합하지 않음.**

### 2.4 store_local_products 는 이미 자체 description 경로 보유
`apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` — `description`, `detail_html`, `usage_info`, `caution_info`, `summary` 컬럼.
- 저장/수정: `store-local-product.routes.ts:174,207,270,291` (sanitizeHtml).
- 노출: `store-public-tablet.handler.ts:58` — 목록 제외, **상세 조회 시 detail_html 포함**(tablet/storefront 렌더).

→ 편집기가 실제 대상으로 삼는 **local product 는 이미 native description 필드**를 가지며 그게 렌더된다. `product_ai_contents`(master 키)는 이 대상에 대해 **잘못 키잉된 평행 저장소**.

---

## 3. 두 상품 우주 정리

| 우주 | 테이블 | 성격 | 설명 저장처 | 편집기 연결 |
|------|------|------|------|------|
| **매장 자체 진열상품** | `store_local_products` | Display only(Checkout 금지) | **native `detail_html`**(렌더됨) | 편집기가 **이 목록**을 보여줌 |
| **공급 카탈로그 상품** | `product_masters` ⊕ `supplier_product_offers` ⊕ `organization_product_listings` | 주문 가능(B2B/B2C) | `product_ai_contents`(master 키, **노출 미연결** — IR 선행) + 소비자 상세는 `'' AS description` | 편집기가 **연결 안 함** |

핵심: `product_ai_contents` 는 공급 카탈로그(ProductMaster) 기반 AI 설명용으로 설계(regulatory_name/specification/OCR 입력)되었으나, **편집기는 매장 자체 진열상품(store_local_products) 목록을 물려** 잘못된 우주의 id 를 전송한다.

---

## 4. 판정 (A/B/C/D)

- **D (ID 혼용 위험) — 확정.**
  - `store_local_products.id` ↔ `product_masters.id` 혼용, 명시 FK·문서 없음, store 역할에서 guard/generate 부정합.
  - `product_ai_contents.productId` 가 어느 테이블에도 안정적으로 매칭된다고 보장할 수 없음(orphan 가능). *(row-level 매칭은 DB 실측 필요 — §6.)*
- **A 기각** — "현재처럼 ProductMaster.id 기준 안정 매칭"이 성립하지 않음.
- **B/C 는 미래 설계 선택지** — 노출 연결 전 **scope 결정**으로 다룬다(§5).

---

## 5. Canonical Target 결정 (사용자 확정, 2026-06-16)

> **결정:** 상품설명 편집기는 **자체 상품/O4O 상품을 구분하지 않고, 매장 안에서 활용되는 모든 상품을 대상으로 한다.** 상품설명은 공용 ProductMaster 설명이 아니라, **매장별로 재사용·수정 가능한 상품설명 콘텐츠**로 본다.

### 5.1 통합 scope 정의 (선택지 ③)
앞서 검토한 ①(local 단독)·②(catalog 단독)은 **모두 부분 해이며 채택하지 않는다.** Canonical target 은 둘을 포괄한다.

```text
매장 상품 설명 scope
= organization/store  +  product identity (어떤 상품인가)

대상 상품 우주:
- StoreLocalProduct          (매장 자체 진열상품)
- OrganizationProductListing (O4O 주문 가능 상품)
- 그 뒤 ProductMaster / SupplierProductOffer 정보 (표시·AI 입력용)
→ 모두 하나의 "매장 상품 설명" 편집 목록으로 통합
```

### 5.2 저장 기준
- 상품설명은 **매장별(store/organization scope) 콘텐츠**다 — 같은 ProductMaster 라도 **매장마다 설명이 다를 수 있다.**
- 따라서 canonical key 는 `ProductMaster.id` 단독이 **아니라** `(organization/store, product identity)` 복합이다.
- 공용 ProductMaster.description 을 덮어쓰지 않는다(공급자 원천 자료 보존, 3-Role Flow §4 원천 자료 vs 실행 자산).

### 5.3 후속 작업 지시 원칙
```text
A안 / ProductMaster 단독 기준으로 고정하지 말 것.
B안 / OrganizationProductListing 만으로 제한하지 말 것.
StoreLocalProduct 와 O4O Listing 을 모두 포괄하는
"매장 내 상품 설명" 기준으로 정리할 것.
```

### 5.4 현 구현과의 격차 (bridge 가 메워야 할 것)
- 편집기 product source: 현재 `store_local_products` 만 → **local + listing 통합 목록**으로 확장 필요.
- 저장 key: 현재 `product_ai_contents.productId`(master 가정, store scope 없음) → **store/organization scope 보장** 필요(매장별 설명 분리).
- AI 입력: ProductMaster 정보(regulatory/OCR)는 listing 계열엔 적합, local product 엔 자유 입력 기반 보강 필요.
- 노출(⑥): local → native `detail_html` 경로 / listing → 소비자 상세(`'' AS description`) 연결 — **두 노출 경로 모두** 통합 콘텐츠를 소비하도록 정렬.

---

## 6. DB 실측 (정적 확정 / DB row 매칭 미수행 — bridge WO 선행 권장)

본 조사는 정적 근거로 D 를 확정. **row-level 매칭**은 prod DB 방화벽 + 비대화형 환경(psql 대화형 only)으로 이번에 미수행. bridge WO 착수 시 아래 5개를 read-only 로 확인한다(사용자 지정 질문):

```text
1. StoreLocalProduct 와 ProductMaster 의 관계 (FK/공유 id 여부 — 엔티티상 부재, DB 실측)
2. OrganizationProductListing 과 ProductMaster 의 관계 (opl.offer_id → spo.master_id, 정상 경로)
3. product_ai_contents.productId 가 현재 어느 쪽과 매칭되는지 (master / local / orphan 분포)
4. 모든 매장 상품(local + listing)을 하나의 편집 목록으로 보여줄 수 있는지 (통합 쿼리 가능성)
5. 저장 시 store/organization scope 가 보장되는지 (현 product_ai_contents 에 org/store 컬럼 부재 확인)
```

참고 read-only SELECT:
```sql
SELECT COUNT(*) FROM product_ai_contents p
  LEFT JOIN product_masters m ON m.id = p.product_id WHERE m.id IS NULL;     -- master 기준 orphan
SELECT COUNT(*) FROM product_ai_contents p
  JOIN store_local_products s ON s.id = p.product_id;                        -- local 매칭 수
```
→ master 매칭 / local 매칭 / orphan 분포로 현 데이터가 어느 우주에 쏠려 있는지 정량 확정 후 bridge 이전 전략 결정.

---

## 7. 후속 WO

> scope 는 §5 에서 **통합 "매장 내 상품 설명"으로 확정**됨. 후속은 그 기준으로 bridge → 노출 순.

| 순위 | WO | 목적 | 선행 |
|:--:|------|------|------|
| **1** | `WO-O4O-PRODUCT-DESCRIPTION-STORE-SCOPE-BRIDGE-V1` | §5 통합 scope 구현: ① 편집기 product source = **local + listing 통합 목록**, ② 저장 key = `(store/organization, product identity)` 로 정렬(매장별 설명 분리), ③ DB 실측(§6) 후 orphan/기존 데이터 이전 | 본 CHECK + DB 실측 |
| 2 | `WO-O4O-PRODUCT-DESCRIPTION-OUTPUT-LINK-V1` | 통합 콘텐츠를 **두 노출 경로 모두** 연결 — local → native `detail_html`, listing → 소비자 상세(`'' AS description` 제거, store-scope 설명 우선 fallback) | bridge |
| 3 | `WO-O4O-PRODUCT-DESCRIPTION-AI-INPUT-UNIFY-V1`(선택) | AI 생성 입력을 local(자유 입력)·listing(ProductMaster/OCR) 양쪽 지원하도록 통합 | bridge |

→ **A안(ProductMaster 단독)·B안(Listing 단독) 모두 채택 금지.** 반드시 통합 scope(§5.3 지시 원칙) 기준 bridge → 노출 순.

---

## 8. 무변경 확인 / 검증 항목

- 코드/DB/마이그레이션/route/UI/스키마/데이터 보정 **변경 0**. 조사 문서 1개만 생성(path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용.
- [x] product_ai_contents.productId 소비처 전수(편집기/guard/generate/POP fallback)
- [x] fetchLocalProducts 반환 id 확인 (store_local_products.id)
- [x] 상품 상세 API 기준 id 확인 (supplier offer 기반, description `''`)
- [x] StoreLocalProduct ↔ ProductMaster 관계 부재 확인 (엔티티 FK 없음)
- [x] store_local_products native description 경로 확인 (detail_html 렌더)
- [ ] DB row 매칭 — **미수행**(방화벽/비대화형), bridge WO 선행 권장(§6)
- 판정: **D**, canonical target = **통합 "매장 내 상품 설명" scope 확정**(§5).

---

*Date: 2026-06-16 · 상품설명 target ID 표준화 조사 · 판정 D(ID 혼용) · 편집기=store_local_products.id ↔ 백엔드=product_masters.id 불일치, local product 는 native detail_html 보유 · **Canonical target=통합 "매장 내 상품 설명"(local+listing, store/org scope, 매장별 콘텐츠) 사용자 확정** · A안/B안 단독 금지 · 후속: store-scope bridge→output-link · 코드/DB/UI 무변경.*
