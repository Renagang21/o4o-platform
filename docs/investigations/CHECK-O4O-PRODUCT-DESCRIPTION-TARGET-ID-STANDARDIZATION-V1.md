# CHECK-O4O-PRODUCT-DESCRIPTION-TARGET-ID-STANDARDIZATION-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-TARGET-ID-STANDARDIZATION-V1
> **유형:** read-only 조사 — 코드/DB/UI **무변경**. 노출 연결(OUTPUT-LINK) 선행 — 상품설명 귀속 단위 확정.
> **판정: D (ID 혼용 위험) — 노출 연결 전 scope 결정 + bridge 정리 필수.**
> 편집기는 `store_local_products.id` 를 `productId` 로 전송하나, AI 콘텐츠 백엔드(guard + generate)는 `productId` 를 **`product_masters.id`** 로 취급 → **두 상품 우주가 불일치**. 게다가 `store_local_products` 는 이미 자체 `detail_html` description 경로를 보유. **A안(현행 master 유지) 불가 — 현 ID 흐름이 정합하지 않음.**
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

## 5. Canonical Target 결정 — scope 선택 필요 (사용자 판단)

노출 연결 전, 상품설명 편집기가 **어느 상품 우주를 위한 기능인지** 먼저 확정해야 한다. 두 정합 종착지:

### 선택지 ① 매장 자체 진열상품용 (store_local_products native)
- 편집기 대상 = `store_local_products`(현 목록 유지). 설명을 `product_ai_contents` 가 아니라 **native `detail_html`** 에 저장.
- 노출: 이미 tablet/storefront 상세에서 detail_html 렌더 → **⑥ 즉시 충족**.
- AI 생성: ProductMaster 입력(regulatory/OCR) 부적합 → local product 자유 입력 기반 AI 로 재정의 필요.
- 성격: 가장 적은 데이터 이전, 사용자 가설("매장이 자기 판매 맥락에서 쓰는 설명")에 부합.

### 선택지 ② 공급 카탈로그 상품용 (Listing/Master)
- 편집기 대상 = `organization_product_listings`(주문 가능 상품)로 교체. productId = master.id(또는 listing.id)로 정합.
- 노출: 소비자 상품 상세(`store.controller` `'' AS description`)에 listing→offer→master→`product_ai_contents` join 으로 연결 → `WO-O4O-PRODUCT-DESCRIPTION-OUTPUT-LINK-V1` 가능.
- AI 생성: 현행 ProductMaster 입력과 정합.
- 성격: `product_ai_contents` 설계 의도와 일치하나, **편집기 product source 교체**(fetchLocalProducts → listing) 필요.

> 두 선택지는 배타가 아니다 — local product 설명(①)과 카탈로그 상품 설명(②)은 **다른 대상**이므로 각각 native 경로로 둘 수 있다. 다만 **현재처럼 local product 목록 → master 키 product_ai_contents 저장**은 어느 쪽으로도 정합하지 않으므로 정리 대상.

---

## 6. DB 실측 한계 (정적 확정 / DB 미수행)

- 본 조사는 정적 근거로 D 를 확정. **row-level 매칭**(아래)은 prod DB 방화벽 + 비대화형 환경(psql 대화형 only)으로 이번에 미수행.
- 후속 bridge WO 시 1회성 read-only SELECT 권장:
  ```sql
  -- product_ai_contents.product_id 가 master 와 매칭되나
  SELECT COUNT(*) FROM product_ai_contents p
    LEFT JOIN product_masters m ON m.id = p.product_id WHERE m.id IS NULL;  -- orphan(master 기준)
  -- local product 와 매칭되나
  SELECT COUNT(*) FROM product_ai_contents p
    JOIN store_local_products s ON s.id = p.product_id;  -- local 매칭 수
  ```
  결과로 ① 우세(local 매칭 다수) / ② 우세(master 매칭 다수) / orphan 규모를 정량 확정.

---

## 7. 후속 WO

| 순위 | WO | 목적 | 선행 |
|:--:|------|------|------|
| **1** | **scope 결정**(사용자) | §5 선택지 ①(local native) / ②(catalog) 확정 + DB 실측(§6) | 본 CHECK |
| 2 | `WO-O4O-PRODUCT-DESCRIPTION-ID-BRIDGE-CLEANUP-V1` | 확정 scope 로 편집기 product source / 저장처 정렬(ID 혼용 제거). orphan 데이터 처리 | scope 결정 |
| 3 | `WO-O4O-PRODUCT-DESCRIPTION-OUTPUT-LINK-V1` | (②선택 시) 상품 상세 응답에 description fallback 연결, `'' AS description` 제거 | bridge |

→ **A안 전제(현행 유지로 바로 OUTPUT-LINK) 불가.** 반드시 scope 결정 → bridge → 노출 연결 순.

---

## 8. 무변경 확인 / 검증 항목

- 코드/DB/마이그레이션/route/UI/스키마/데이터 보정 **변경 0**. 조사 문서 1개만 생성(path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용.
- [x] product_ai_contents.productId 소비처 전수(편집기/guard/generate/POP fallback)
- [x] fetchLocalProducts 반환 id 확인 (store_local_products.id)
- [x] 상품 상세 API 기준 id 확인 (supplier offer 기반, description `''`)
- [x] StoreLocalProduct ↔ ProductMaster 관계 부재 확인 (엔티티 FK 없음)
- [x] store_local_products native description 경로 확인 (detail_html 렌더)
- [ ] DB row 매칭 — **미수행**(방화벽/비대화형), 후속 권장(§6)
- 판정: **D**, canonical target = scope 결정 대기.

---

*Date: 2026-06-16 · 상품설명 target ID 표준화 조사 · 판정 D(ID 혼용) · 편집기=store_local_products.id ↔ 백엔드=product_masters.id 불일치, local product 는 native detail_html 보유 · A안(현행 유지) 불가 · 후속: scope 결정(local native vs catalog)→bridge cleanup→output-link · 코드/DB/UI 무변경.*
