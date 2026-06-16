# IR-O4O-PRODUCT-DESCRIPTION-PRODUCTION-FLOW-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/route/UI **무변경**.
> **판정: C (저장만 있고 산출물 없음) — 주 판정 + D (연결 ID 모호) 동반.**
> `product_ai_contents.product_description` 는 **편집기 재조회 + POP PDF fallback 으로만 읽힘**. 소비자 상품 상세 API 가 `'' AS description` 으로 **하드코딩** → 저장된 상품설명이 **노출에 전혀 참여하지 않음**(⑥ 산출물 경로 부재). 편집/저장(④)·템플릿(⑤)은 3서비스 parity 양호.
> 기준 문서: [`O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1`](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md) — 2026-06-16

---

## 1. Summary

Canonical 6단계 기준, 상품설명은 **④ 용도별 콘텐츠 저장까지는 정합하나 ⑥ 실사용 산출물(상품 상세 노출)이 끊겨 있다.**

| 단계 | 상태 | 근거 |
|------|:--:|------|
| ① 대상선택 | ◐ | 사이드바 `fetchLocalProducts`(StoreLocalProduct), 신규는 자료함 경유만 |
| ② 자료투입 | ◐ | location.state prefill + ProductMaster 정보(생성 시 LLM 주입) |
| ③ 편집·AI | ● | RichTextEditor + AiContentModal(template-aware), 재편집 가능 |
| ④ 용도별 콘텐츠 저장 | ● | `product_ai_contents`(contentType='product_description'), upsert, 재편집 |
| ⑤ 템플릿 | ● | productionTemplates(desc-*), AI 생성 시만, **templateId 미저장**(철학 일치) |
| ⑥ 실사용 산출물 | **✗** | **소비자 상품 상세가 `'' AS description` 하드코딩 — product_ai_contents 미참여** |

**핵심 결론:**
1. **상품설명은 write-only 우물** — 저장·재편집·POP PDF fallback 으로만 소비. 실제 상품 상세/커머스 노출에는 **전혀 연결되지 않음** → **판정 C**.
2. **연결 ID 모호** — 프론트가 `StoreLocalProduct.id` 를 `productId` 로 전달하는데, 백엔드 AI 콘텐츠는 `ProductMaster.id` 로 취급(org access 는 listing→offer.master_id 경로로 검증) → 어느 상품 단위에 설명이 붙는지 불명확 → **판정 D 동반**.
3. **편집/저장/템플릿은 3서비스 parity 양호** — 동일 백엔드 엔드포인트, 동일 컴포넌트, 서비스별 템플릿/문구만 차이. (E 약함)

---

## 2. Scope

대상: KPA-Society / GlycoPharm / K-Cosmetics 의 상품설명 제작(`/store/marketing/product-descriptions` · `StoreProductDescriptionsPage`) + 상품 상세 노출 경로.
제외: Neture(공급자/파트너 도메인, 매장 상품설명 대상 아님). POP PDF(pop_short/long)는 별도 산출물로만 확인.

---

## 3. 저장/편집 측 (④⑤ — parity 양호)

### 3.1 `product_ai_contents` 엔티티
`apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts`

| 컬럼 | 값/의미 |
|------|------|
| `productId` (uuid) | **ProductMaster.id 로 취급**(컨트롤러 조회), FK 명시 없음 |
| `contentType` | `product_description` / `pop_short` / `pop_long` / `qr_description` / `signage_text` |
| `content` (text) | 저장 콘텐츠(HTML) |
| `model` | LLM 모델명(nullable) |
| `createdAt/updatedAt` | 타임스탬프 |
| ~~serviceKey~~ | **없음** — org 격리는 컨트롤러 `verifyProductOrgAccess`(organization_product_listings → supplier_product_offers.master_id) 로만 |
| ~~templateId~~ | **없음** — 템플릿 미영속(철학 일치) |
| ~~author~~ | **없음** |

### 3.2 컨트롤러
`apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts`
- `PUT /:productId/ai-contents/:type` (저장 upsert) · `GET /:productId/ai-contents[/:type]` · `POST .../generate[/:type]` · `DELETE`.
- 모두 **authenticate + verifyProductOrgAccess**. 생성은 fire-and-forget(4초 폴링). 입력 자료 = `product_masters`(regulatory_name/marketingName/specification/category/brand/manufacturer/tags) + 옵션 `product_ocr_texts`.

### 3.3 편집 페이지 (3서비스 동형)
`StoreProductDescriptionsPage.tsx` — KPA `pages/pharmacy` · GP `pages/store-management` · KCos `pages/store`.
- ① 사이드바 `fetchLocalProducts()` → `GET /api/v1/store/local-products`(**StoreLocalProduct**, org-scoped, Display Domain).
- ② `location.state.production.source.items[0].description` → prefillNote.
- ③ RichTextEditor + AiContentModal(templateId/templateSystemPrompt/templateForcedOptions). 저장 후 재편집·AI 재생성 가능.
- ④ `PUT /products/:productId/ai-contents/product_description`.
- **신규 생성은 자료함 경유만** — 페이지 직접 신규 진입 불가(블로그와 비대칭).

### 3.4 템플릿 (⑤ — 철학 일치)
`productionTemplates`(KPA 로컬 / GP·KCos config): target='product-description'(desc-b2c-persuasion / desc-professional-spec / 서비스별 diabetes·skincare 등). `systemPromptOverride`+`starterHtml`+`forcedOptions` 를 **AI 생성 시점만** 적용, **`product_ai_contents` 에 templateId 미저장** → "템플릿=산출물/생성 시점, 콘텐츠 영구결합 금지" 원칙 충족.

---

## 4. 산출물/노출 측 (⑥ — 부재, 판정 C 핵심)

### 4.1 product_ai_contents 를 읽는 소비처 (전수)
| 소비처 | 용도 | 노출? |
|------|------|:--:|
| `StoreProductDescriptionsPage`(3서비스) | **자기 편집기 재조회**(재편집용) | ✗ |
| `ProductPopBuilderPage`(3서비스) | **POP PDF fallback** (pop_short/long 없을 때 product_description 사용) | ✗(별도 PDF) |
| 백엔드 `GET /:productId/ai-contents` | 인증 필요, 편집기/admin 전용 | ✗ |

→ **소비자 상품 상세·B2B·B2C·커머스 응답에 병합되는 경로 없음.**

### 4.2 소비자 상품 상세가 실제 보여주는 설명
- GlycoPharm `StoreProductDetail.tsx:313` `{product.description}` 렌더 → 백엔드 `glycopharm/controllers/store.controller.ts:147` 에서 **`'' AS description` 하드코딩**. SQL(139-174)에 `product_ai_contents` JOIN **없음**.
- KPA `StorefrontProductDetailPage.tsx:292` 동일 백엔드 → **빈 문자열**(조건부 렌더라 미표시).
- K-Cosmetics: **소비자 storefront 상품 상세 자체 부재**(내부 도구 페이지만).

### 4.3 fallback/우선순위 체인
**존재하지 않음.** 상품 상세 응답이 `supplier_product_offers`/`product_masters`/visibility gate 로만 구성되고 description 은 빈 리터럴. `ProductMaster.description`/`SupplierProductOffer.description`/`product_ai_contents` 어느 것도 노출에 연결 안 됨.

---

## 5. 연결 ID 모호 (판정 D)

| 위치 | productId 의미 |
|------|------|
| 프론트 사이드바/URL | **StoreLocalProduct.id** (fetchLocalProducts 결과) |
| 백엔드 AI 콘텐츠 조회 | **ProductMaster.id** (product_masters 조회) |
| org access 검증 | organization_product_listings → supplier_product_offers.**master_id** = productId |

→ StoreLocalProduct.id 와 ProductMaster.id 가 **동일 UUID 라는 암묵 가정**(명시 FK·문서 없음). 상품설명이 **어느 상품 단위(Master/Offer/Listing/LocalProduct)에 귀속되는지 표준 부재** → 노출 연결 시 우선 해소 필요. *(본 IR 은 read-only — 실제 동일성 여부는 후속 WO 에서 DB 검증 권장.)*

---

## 6. 3-Service Parity

| 측면 | KPA | GP | KCos |
|------|:--:|:--:|:--:|
| 편집 페이지/컴포넌트 | ● | ● 동형 | ● 동형 |
| 저장 엔드포인트(공통) | ● | ● | ● |
| 템플릿 레지스트리 | ● | ● 서비스별 | ● 서비스별 |
| 소비자 상품 상세 | 빈 description | 빈 description | **storefront 부재** |
| 상품설명 노출 | ✗ | ✗ | ✗(화면도 없음) |

→ 편집/저장은 parity 우수. **노출은 3서비스 공통 부재**(KCos 는 storefront 자체 없음 — 별도 격차).

---

## 7. 판정 근거 (A/B/C/D/E)

- **C (저장만, 산출물 없음) — 주 판정.** ④까지 충족하나 ⑥ 노출 경로 부재. product_ai_contents 가 상품 상세에 미참여(`'' AS description`).
- **D (연결 ID 모호) — 동반.** StoreLocalProduct.id ↔ ProductMaster.id 암묵 동일 가정, 귀속 단위 표준 부재.
- **NOT B** — 일부 화면만 노출되는 게 아니라 **노출 화면이 0**.
- **NOT A** — 노출 round-trip 미완.
- **E 약함** — 편집/저장 parity 양호, 단 KCos storefront 부재는 별도 격차.

---

## 8. 후속 WO 제안

| 순위 | WO | 목적 | 위험 |
|:--:|------|------|:--:|
| **1** | `WO-O4O-PRODUCT-DESCRIPTION-TARGET-ID-STANDARDIZATION-V1` | 상품설명 귀속 단위 확정(Master/Offer/Listing/LocalProduct) + StoreLocalProduct.id↔ProductMaster.id 관계 DB 검증·문서화 | 중 — 노출 연결의 선행 조건 |
| **2** | `WO-O4O-PRODUCT-DESCRIPTION-OUTPUT-LINK-V1` | `product_ai_contents.product_description` 를 상품 상세 응답에 연결(fallback 체인: ai_desc ?? offer.desc ?? master.desc). `'' AS description` 제거 | 중 — store.controller SQL 변경, visibility gate 준수 |
| 3 | `WO-O4O-PRODUCT-DESCRIPTION-EDITOR-NEW-ENTRY-V1`(선택) | 페이지 직접 "신규 생성" 진입점 추가(블로그 대칭) | 하 |
| 4 | `WO-O4O-KCOSMETICS-STOREFRONT-PRODUCT-DETAIL-V1`(선택) | KCos 소비자 상품 상세 화면 도입(노출 기반 마련) | 중 |

**권장:** WO 1(귀속 단위 표준)을 먼저 확정해야 WO 2(노출 연결)가 안전하다. 두 WO 가 canonical ⑥ 의 "꼬리 끊김"을 해소하는 핵심.

> 본 IR 범위와 별개로, [`IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1`](IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1.md)(상품·거래 화면 parity)과 데이터 소스(GP 레거시 glycopharm_products)·노출 화면을 공유하므로, WO 2 진행 시 함께 정렬 권장.

---

## 9. Out of Scope / 무변경 확인

- 코드/DB/마이그레이션/route/UI/상품설명 노출 구현/템플릿/AI prompt/공통 컴포넌트/상품 데이터 모델 **변경 0**.
- 조사 문서 1개만 생성(path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용.

---

*Date: 2026-06-16 · 상품설명 제작 흐름 조사 · 판정 C(저장만, 산출물 없음)+D(연결 ID 모호) · product_ai_contents 는 편집기/POP fallback 으로만 소비, 상품 상세는 `'' AS description` 하드코딩 → 노출 미참여 · 편집/저장/템플릿 parity 양호 · 후속 P1 귀속단위 표준→P2 노출 연결.*
