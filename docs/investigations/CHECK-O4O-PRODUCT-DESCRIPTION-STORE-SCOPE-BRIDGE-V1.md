# CHECK-O4O-PRODUCT-DESCRIPTION-STORE-SCOPE-BRIDGE-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-STORE-SCOPE-BRIDGE-V1
> **유형:** 조사·설계 중심. 코드/DB/migration **무변경**(저장 key 미확정 → 저장 구현 HOLD).
> **결과: PARTIAL PASS — 통합 target shape 확정 + 저장 key 권장안(B: store-scoped 신규 테이블) 확정 + 결정적 제약 발견. 코드 무변경(저장은 migration 동반 → 후속 storage WO).**
> 선행: [`CHECK-O4O-PRODUCT-DESCRIPTION-TARGET-ID-STANDARDIZATION-V1`](CHECK-O4O-PRODUCT-DESCRIPTION-TARGET-ID-STANDARDIZATION-V1.md) — 통합 "매장 내 상품 설명" scope 확정 — 2026-06-16

---

## 1. 결정적 발견 (설계의 핵심 제약)

**`product_ai_contents` 는 master-global 저장소다 — 매장별 설명을 담을 수 없다.**

- 엔티티 키: `@Index(['productId','contentType'])`, 컬럼 = `product_id`(=ProductMaster.id) + `content_type` + `content` + `model`. **organization_id / store_id / targetKind 컬럼 없음** (product-ai-content.entity.ts:24-48).
- 결과: 같은 `master_id` 를 진열한 **매장 A·B 가 동일한 `(master, product_description)` 1행을 공유**한다. A 가 저장하면 B 도 덮인다.
- 확정 기준(STANDARDIZATION §5.2): "같은 ProductMaster 라도 **매장마다 설명이 다를 수 있다**" → **정면 충돌.**

→ **통합 scope 의 store-scope 저장은 `product_ai_contents` 확장만으로 불가**하며, **store-scope 저장소가 구조적으로 필요**하다. 이는 migration 동반(본 WO 금지 §6) → 저장 구현 HOLD, 설계까지 PARTIAL PASS.

---

## 2. 통합 source 조사 결과

### 2.1 두 source 의 product identity
| source | 엔드포인트 | 행이 보유한 식별자 | org scope |
|------|------|------|:--:|
| **store_local_products** | `GET /api/v1/store/local-products` | `id`(독립 UUID) — master/offer/listing 링크 **없음** | `organization_id` ✅ |
| **organization_product_listings** | `GET /pharmacy/products/listings` | `id`(listing) + **`master_id`** + `offer_id`(nullable) + `service_key` | `organization_id` ✅ |

→ **두 source 모두 organization_id 를 보유** → store-scope 저장 key 의 org 축은 양쪽에서 안정적으로 얻을 수 있다(server: `requirePharmacyOwner` → `req.organizationId`, store-owner.utils.ts:73-101).
→ listing 은 master/offer 식별자를 행에 직접 보유 → product identity 표현 가능. local 은 자체 id 만(native 설명).

### 2.2 통합 엔드포인트 부재 + 기존 merge 버그
- **통합 endpoint 없음.** listing/local 각각 별도. PharmacyB2BPage 가 client-side merge 하나, `ProductListing` 클라이언트 타입이 **엔티티에 없는 필드**(`external_product_id`/`product_name`/`retail_price`/`display_order`)를 참조 — WO-O4O-PRODUCT-MASTER-CORE-RESET-V1 리팩터 후 프론트 미갱신(별도 버그, 본 WO 범위 외 — IR-O4O-STORE-COMMERCE-PRODUCT-PAGE 와 연계).
- listing 이름/브랜드/카테고리는 `master_id` → `product_masters` join(또는 catalog API)으로 enrich 필요.

### 2.3 POP fallback 영향 반경
- `ProductPopBuilderPage` 는 `getProductAiContents(productId)` 로 `pop_short/pop_long/product_description`(master 키) 읽음 → fallback 체인. **product_ai_contents 키를 바꾸면 POP 도 영향.**
- 따라서 store-scope 설명을 product_ai_contents 안으로 끌어들이면 POP/QR/signage(master-global)까지 의미가 흔들림 → **분리 보관이 안전**(§4 권장안 B 근거).

---

## 3. 통합 target shape (확정)

상품설명 편집기가 사용할 통합 row 타입. **UI id 와 저장 key 를 분리**한다.

```ts
type ProductDescriptionTarget = {
  rowId: string;                         // UI 전용 (e.g. `${targetKind}:${targetId}`)
  targetKind: 'local' | 'listing';
  targetId: string;                      // localProductId 또는 listingId
  organizationId: string;                // 저장 scope 축
  productIdentity: {
    localProductId?: string;             // targetKind='local'
    listingId?: string;                  // targetKind='listing'
    masterId?: string;                   // listing.master_id (표시/AI 입력)
    offerId?: string;                    // listing.offer_id (nullable)
  };
  name: string;
  brand?: string;
  category?: string;
  sourceLabel: '자체 상품' | 'O4O 주문 가능 상품';
  existingDescription?: string;          // local→detail_html / listing→store-scope 저장소
};
```

규칙:
- **local 과 listing 을 같은 id 공간으로 가정 금지** — 저장 key 는 항상 `(organizationId, targetKind, targetId)`.
- `masterId` 는 표시·AI 입력용이지 **저장 key 아님**(매장별 분리 위해).

---

## 4. 저장 key 선택지 비교 → 권장 **B**

| 선택지 | 내용 | 매장별 분리 | POP 영향 | migration | 통합 계약 |
|------|------|:--:|:--:|:--:|:--:|
| **A. product_ai_contents 확장** | org/targetKind/targetId 컬럼 추가 | △(키 변경) | **큼**(master-global 깨짐, pop/qr/signage 동반) | 필요 | 유지 |
| **B. store-scoped 신규 테이블** ✅ | `store_product_descriptions(organization_id, target_kind, target_id, content, ...)` | **명확** | **없음**(product_ai_contents 불변) | 필요(신규 테이블) | **유지** |
| **C. local=detail_html / listing=product_ai_contents** | 분리 보관 | listing △(master-global) | 중 | 적음 | **깨짐**(이원화) |

### 권장: B (store-scoped 신규 테이블)
- 근거: 통합 scope(local+listing)를 **하나의 store-scoped 저장소**에서 매장별로 분리 표현하는 유일한 정합안. `product_ai_contents`(master-global AI 카탈로그 초안 — POP/QR/signage 용)는 **건드리지 않음**.
- 개념 분리 명확:
  - `product_ai_contents` = **master-level AI 초안**(공급 카탈로그, 매장 공유) — 기존 유지.
  - `store_product_descriptions`(신규) = **매장별 발행 상품설명**(local + listing 통합, store-scope).
- AI 초안(product_ai_contents)을 store-scope 발행본의 **시드/참조**로 쓸 수 있어 재사용도 보존.

### 권장 테이블 개략 (후속 storage WO 에서 확정)
```text
store_product_descriptions
- id (uuid)
- organization_id (uuid)        -- store scope
- target_kind ('local'|'listing')
- target_id (uuid)              -- localProductId | listingId
- service_key (varchar)         -- 서비스 격리(선택)
- content (text, HTML)
- source_template_id (nullable) -- 산출 시점 참고(콘텐츠엔 미결합)
- created_at / updated_at
UNIQUE (organization_id, target_kind, target_id)
```

---

## 5. 이번 WO 구현 범위 / HOLD 사유

| 항목 | 상태 | 사유 |
|------|------|------|
| 통합 scope 확정 | ✅ 문서 | §3 target shape |
| 저장 key 권장안 | ✅ 문서 | §4 B안 |
| 통합 read API 추가 | **HOLD** | 저장 미정 상태에서 프론트 source 교체 시 save(selectedId)가 mixed id 로 더 깨짐 → storage WO 와 함께 |
| 프론트 product source 교체 | **HOLD** | 동상 |
| 저장 구현 | **HOLD** | store-scoped 테이블(migration) 필요 — 본 WO 금지(§6) |
| DB row 실측 | **미수행** | prod 방화벽 + 비대화형(psql 대화형 only). storage WO 선행 권장 |

→ **코드/DB/migration 변경 0.** typecheck N/A(코드 무변경).

> 무리한 부분 구현(read API만, 또는 프론트 source만)은 save 경로를 더 불안정하게 만들어 **순효과 음(-)** → 의도적으로 설계까지만.

---

## 6. OUTPUT-LINK 선행 조건 충족 여부

| 선행 조건 | 충족 |
|------|:--:|
| 통합 scope 정의 | ✅ (§3) |
| 저장 key 전략 확정 | ✅ 권장 B (구현은 storage WO) |
| 매장별 분리 보장 방법 | ✅ store_product_descriptions UNIQUE(org,kind,id) |
| 두 노출 경로 식별 | ✅ local→detail_html / listing→소비자 상세(`'' AS description`) |
| **실제 store-scope 저장소 존재** | ❌ **미구현** → OUTPUT-LINK 전 storage WO 필수 |

→ OUTPUT-LINK 는 **store-scope 저장소 구현 후** 가능. 본 WO 는 그 직전 설계 게이트.

---

## 7. 후속 WO

| 순위 | WO | 목적 | 선행 |
|:--:|------|------|------|
| **1** | `WO-O4O-PRODUCT-DESCRIPTION-STORE-SCOPE-STORAGE-V1` | `store_product_descriptions` 테이블(B안) + 통합 read API(`GET /store/product-description-targets`) + 저장/조회 store-scope. DB 실측 동반 | 본 CHECK |
| 2 | `WO-O4O-PRODUCT-DESCRIPTION-EDITOR-UNIFIED-SOURCE-V1` | 편집기 product source → 통합 목록 교체, 저장을 store-scope 저장소로 | storage |
| 3 | `WO-O4O-PRODUCT-DESCRIPTION-OUTPUT-LINK-V1` | local→detail_html / listing→소비자 상세 fallback 연결(`'' AS description` 제거) | editor unified |
| 4 | `WO-O4O-PRODUCT-DESCRIPTION-AI-INPUT-UNIFY-V1`(선택) | AI 입력 local(자유)·listing(master/OCR) 통합 | storage |

---

## 8. 검증 항목 / 무변경 확인

- [x] StoreLocalProduct source 확인 (독립, org-scope, native detail_html)
- [x] OrganizationProductListing source 확인 (org + master_id + offer_id 보유)
- [x] ProductMaster/SupplierProductOffer join 경로 확인 (listing.master_id → product_masters)
- [x] product_ai_contents 현재 id 의미 확인 (**master-global, org/store 컬럼 없음 — 핵심 제약**)
- [ ] DB read-only 매칭 — 미수행(방화벽/비대화형), storage WO 선행 권장
- [x] 통합 target type 문서화 (§3)
- [x] 저장 key 권장안 문서화 (§4 B)
- 코드/DB/마이그레이션/route/UI/스키마 **변경 0**. 조사 문서 1개만 생성(path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용. typecheck N/A.
- **판정: PARTIAL PASS** — 설계 확정, 저장 구현은 store-scope 테이블(migration) 필요로 storage WO 분리.

---

*Date: 2026-06-16 · 상품설명 store-scope bridge 설계 · PARTIAL PASS · 핵심 제약=product_ai_contents master-global(매장별 설명 불가) → store-scoped 신규 테이블(B안) 권장 · 통합 target shape(local+listing, key=(org,kind,id)) 확정 · 저장/노출 구현은 후속 storage→output-link · 코드/DB 무변경.*
