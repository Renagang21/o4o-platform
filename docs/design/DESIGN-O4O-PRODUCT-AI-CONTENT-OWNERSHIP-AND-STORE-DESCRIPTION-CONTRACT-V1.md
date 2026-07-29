# DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1

> **설계 전용 문서.** 코드 변경 0 / DB write 0 / migration 0 / API 변경 0 / 배포 0.
> 프로덕션 접근은 `SELECT` 전용(정보스키마·카운트).

| 항목 | 값 |
|------|-----|
| 선행 IR | [IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1](../investigations/IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1.md) |
| 선행 중지 보고 | [CHECK-O4O-PRODUCT-AI-CONTENT-ID-AND-ACCESS-CONTRACT-ALIGNMENT-V1](../checks/CHECK-O4O-PRODUCT-AI-CONTENT-ID-AND-ACCESS-CONTRACT-ALIGNMENT-V1.md) |
| 상위 기준 | F12 Product Resource Architecture · CLAUDE.md §7 Boundary Policy · [O4O-CONTENT-TYPE-TAXONOMY-V1](../architecture/O4O-CONTENT-TYPE-TAXONOMY-V1.md) |
| 작성일 | 2026-07-29 |
| 결론 | **A + L3** (전역 AI 초안 유지 + 매장 자체 상품은 local 자체 필드) — 단 §2.3 은 WO 기본안에서 **수정** |

---

## 1. 최종 소유권 계약

```text
소유권 축   → A. product_ai_contents = ProductMaster 기반 전역 AI 초안 (플랫폼 소유)
local 축    → L3. 매장 자체 상품 설명 = store_local_products 자체 필드
표준 상품   → 매장 편집 대상 아님 (canonical 읽기 전용) ← WO §3.3 기본안 수정
금지        → 매장 사용자가 product_ai_contents 에 직접 쓰기
```

### 1.1 A 채택 근거

이것은 새 결정이 아니라 **이미 문서화된 계약의 재확인**이다.
[product-ai-content.entity.ts:16-22](../../apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts#L16-L22) 가 명시한다.

> `contentType='product_description'` 은 **canonical 상품설명이 아니다**. AI 생성 draft/source 이며,
> `shared_product_descriptions` 의 candidate seed source 로만 사용된다.
> 소비자-facing 상품 상세는 `product_ai_contents` 를 직접 읽지 않는다.

즉 **테이블 계약은 처음부터 전역 초안**이었고, 매장 편집 화면 3종이 이를 매장별 저장소로 오용한 것이 drift 다.
따라서 A 는 "선택"이 아니라 **정합 복원**이다.

### 1.2 L3 채택 근거 — 신규 스키마 0

`store_local_products` 는 이미 콘텐츠 블록 필드를 보유하고, API 도 이미 받는다.

| 근거 | 위치 |
|------|------|
| 엔티티에 `summary` / `detail_html` / `usage_info` / `caution_info` 존재 | [store-local-product.entity.ts:60-72](../../apps/api-server/src/routes/platform/entities/store-local-product.entity.ts#L60-L72) |
| POST·PUT 이 이미 4개 필드를 수용 | [store-local-product.routes.ts:215](../../apps/api-server/src/routes/platform/store-local-product.routes.ts#L215) · [:319](../../apps/api-server/src/routes/platform/store-local-product.routes.ts#L319) |
| 태블릿 공개 화면이 이미 상세 조회 시 소비 | [store-public-tablet.handler.ts:85](../../apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts#L85) |
| 조직 격리 = `organization_id` (Store Ops Boundary 준수) | 동 엔티티 `@Index(['organizationId','isActive'])` |

**신규 테이블·컬럼·migration 없이** 매장 자체 상품 설명 기능을 성립시킬 수 있는 유일한 축이다.

---

## 2. 4개 저장소 역할

| 저장소 | 역할 | 소유 | 식별자 | 매장 쓰기 | 프로덕션 |
|--------|------|------|--------|:---------:|---------|
| `shared_product_descriptions` (SPD) | O4O 표준 상품 canonical 설명서 (언어별) | 플랫폼 | `master_id` (+language) | ✗ 읽기 전용 | 대량 |
| `product_ai_contents` | ProductMaster 기반 **전역 AI 초안·파생 문구** | 플랫폼 | `master_id` | ✗ 금지 | 3행 (전부 고아) |
| `store_product_profiles` | 표준 상품의 매장 표시명 override (**legacy fallback**) | organization | `org_id + master_id` (UNIQUE) | △ 신규 쓰기 경로 만들지 않음 | 2행 · description 0건 |
| `store_local_products` | 매장 자체 상품 원천 + **자체 설명** | organization | `store_local_products.id` | ✓ canonical | 43행 |

### 2.1 `shared_product_descriptions`

master 기준 canonical. 공개 해석 순서의 최상위 —
[store-public-utils.ts:192](../../apps/api-server/src/routes/platform/store-public/store-public-utils.ts#L192)
`COALESCE(spd.content, sp.description, spo.consumer_detail_description, '')`.
매장 저장·편집 대상으로 사용하지 않는다. (엔티티 주석: "매장별 override / selection 저장소를 만들지 않는다")

### 2.2 `product_ai_contents`

**content_type별 실제 전역 소비처 전수** (backend 4곳 — 이것이 전부):

| # | 소비처 | content_type | ID | 성격 |
|---|--------|-------------|----|----|
| C1 | [product-ai-content.controller.ts](../../apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts) 6 routes | 전체 | master | CRUD/생성 (현재 403) |
| C2 | [product-pop-pdf.controller.ts:59-65](../../apps/api-server/src/modules/store-ai/controllers/product-pop-pdf.controller.ts#L59-L65) | `pop_short`·`pop_long` | master (`FROM product_masters` 404 게이트) | PDF 렌더 입력 |
| C3 | [shared-product-description.service.ts:860-867](../../apps/api-server/src/modules/neture/services/shared-product-description.service.ts#L860-L867) `seedFromProductAiContents` | `product_description` | master | SPD **candidate seed** (노출 아님) |
| C4 | [product-import-common.service.ts:20](../../apps/api-server/src/modules/neture/services/product-import-common.service.ts#L20) `triggerAiContentGeneration` | 생성 전체 | master | 임포트 시 자동 생성 (내부 호출, HTTP 가드 없음) |

- **태블릿은 `product_ai_contents` 를 소비하지 않는다** — `store-tablet.routes.ts`·`store-public-*` 전수 grep 결과 0건. §4.3 의 우려는 실재하지 않는다.
- 소비자-facing 공개 경로도 소비하지 않는다 (§2.1 COALESCE 체인에 부재).
- 따라서 **매장 실행 자산의 원본이 아니다.** 매장 편집 결과를 여기 쓰면 C3 seed 를 오염시킨다.

### 2.3 `store_product_profiles` — **WO §3.3 기본안 수정**

WO §3.3 은 이 테이블을 "`StoreProductDescriptionsPage` 가 표준 상품을 편집할 때의 canonical 저장소 후보"로 확정하자고 했다.
**확정하지 않기를 권고한다.** 근거:

1. **선행 WO 가 이미 매장 override 를 의도적으로 격하했다.**
   [store-public-utils.ts:187-190](../../apps/api-server/src/routes/platform/store-public/store-public-utils.ts#L187-L190) 주석:
   > `WO-O4O-...-STORE-PROFILE-OVERRIDE-POLICY-ALIGNMENT-V1`: O4O 공용 대표(canonical) 설명을 우선 노출.
   > 기존 `store_product_profiles` override 는 삭제하지 않고 canonical 아래 **legacy fallback 으로 격하**(매장 override 정책 격하).

   지금 이 테이블을 매장 편집 canonical 로 승격하면 **직전 WO 결정을 뒤집는다.**

2. **프로덕션에 설명 데이터가 없다.** 2행 / 1조직 / `description` 0건 / `pharmacist_comment` 0건.
   현재 이 행들은 candidate 승격·태블릿 바코드 스캔 경로가 만드는 **연결(linkage) 행**이다
   ([product-candidate.service.ts:463](../../apps/api-server/src/modules/neture/services/product-candidate.service.ts#L463) · [store-tablet.routes.ts:995](../../apps/api-server/src/routes/platform/store-tablet.routes.ts#L995)).

3. **제품 정책이 이미 "매장은 표준 상품 설명을 쓰지 않는다"고 화면에서 안내한다.**
   [StoreProductDescriptionsPage.tsx:191-192](../../services/web-glycopharm/src/pages/store-management/StoreProductDescriptionsPage.tsx#L191-L192) 안내문:
   > 상품설명은 **O4O 공용 상품 DB 기준**으로 관리됩니다. … 약국 특화 홍보문·이벤트 문구·POP/블로그용 문구가 필요하면 **콘텐츠 만들기**에서 별도 콘텐츠로 제작하세요.

**확정 역할:** `store_product_profiles` = 표시명(`display_name`) override + legacy description fallback.
**데이터 보존, 신규 쓰기 경로 신설 금지.** 매장의 표준 상품 특화 문구는 매장 콘텐츠(자료함)로 간다.

### 2.4 `store_local_products`

매장 자체 상품 원천 + 자체 설명. Display Domain (Checkout 연결 금지 — 엔티티 주석).

**현재 필드 사용 실태** (프로덕션 43행):

| 필드 | 채워진 행 | 편집 UI |
|------|:--------:|--------|
| `description` (RichText HTML) | 11 | ✓ `StoreLocalProductsPage` 등록/수정 모달 |
| `summary` | 10 | ✓ 동일 모달 |
| `detail_html` | **0** | ✗ **편집 UI 없음** |
| `usage_info` | **0** | ✗ 없음 |
| `caution_info` | **0** | ✗ 없음 |

→ `detail_html`·`usage_info`·`caution_info` 는 **스키마·API·공개 소비 경로는 갖췄으나 편집 진입점이 없는 미사용 필드**다.

---

## 3. ID 계약

```text
productId 단독 사용 금지
```

프론트 → 백엔드로 상품을 지목할 때 다음 3필드 계약을 사용한다.

```ts
sourceType : 'listing' | 'local'
sourceId   : listing → organization_product_listings.id | local → store_local_products.id
masterId   : sourceType==='listing' 일 때만 존재 (product_masters.id)
```

- `product_ai_contents.product_id` = **`product_masters.id`** (불변, 재확인).
- `store_local_products.id` 를 `product_ai_contents.product_id` 로 보내지 않는다. 임시 호환도 만들지 않는다.
- 상품명·바코드·UUID 추정으로 local ↔ master 를 자동 연결하지 않는다.
- **하나의 `productId` 로 두 entity 를 혼용하는 API 를 신설하지 않는다.**

### 3.1 현재 계약 위반 지점

| 지점 | 보내는 값 | 받는 쪽 해석 | 결과 |
|------|----------|-------------|------|
| `StoreProductDescriptionsPage` (3서비스) | `store_local_products.id` | `product_masters.id` | 403 (가드 불통과) |
| `ProductPopBuilderPage` (3서비스) | `store_local_products.id` | `product_masters.id` | 403 → PDF 는 404 |
| `web-neture` `ProductDetailDrawer` → ai-tags | `masterId` **(정상)** | `product_masters.id` | 403 (가드가 공급자를 모름 — §8.3) |

---

## 4. API 전수표

| API | 현재 ID | 현재 저장소 | 실제 소비자 | 새 역할 | 판정 |
|-----|--------|------------|------------|--------|------|
| `GET /products/:productId/ai-contents` | local id 수신 → master 해석 | `product_ai_contents` | KPA·GP·KCos 설명/POP 화면 | 전역 초안 조회 (운영자/공급자/내부) | **전환** — 매장 화면 분리 + 가드 정렬 |
| `GET /products/:productId/ai-contents/:type` | 〃 | 〃 | (프론트 호출 0) | 〃 | 유지 + 가드 정렬 |
| `PUT /products/:productId/ai-contents/:type` | 〃 | 〃 | 설명 저장 · POP 저장 (3서비스) | 전역 초안 쓰기 | **전환** — 매장 쓰기 제거 |
| `POST /products/:productId/ai-contents/generate` | 〃 | 〃 | (프론트 호출 0) · 임포트 내부 | 전역 생성 | 유지 + 가드 정렬 |
| `POST /products/:productId/ai-contents/generate/:type` | 〃 | 〃 | (프론트 호출 0) | 〃 | 유지 + 가드 정렬 |
| `DELETE /products/:productId/ai-contents/:contentId` | 〃 | 〃 | (프론트 호출 0) | 〃 | 유지 + 가드 정렬 |
| `GET·POST·DELETE /products/:productId/ai-tags*` (6) | **masterId (정상)** | `product_ai_tags` | `web-neture` 공급자 `ProductDetailDrawer` | 전역 태그 | **가드만 수정** (공급자 축 추가) |
| `GET /products/:productId/pop/:layout` (PDF) | master 요구 (`FROM product_masters` → 404) | `product_ai_contents` 읽기 | POP 빌더 (3서비스) | POP 렌더 | **전환** — local 입력 경로 필요 (§6) · 가드 부재 보완 |
| `GET /api/v1/store/local-products` · `POST` · `PUT /:id` · `DELETE /:id` | `store_local_products.id` + org scope | `store_local_products` | 자체 상품 목록/등록 모달 · 설명 화면 목록 | **매장 자체 상품 설명 canonical** | **유지 + 소비 확대** (스키마 변경 0) |
| `PATCH /api/v1/store/products/:id/description` | org + master | `store_product_profiles` | (legacy) | 표시명 override / legacy fallback | **동결** — 신규 쓰기 경로 신설 금지 |
| `GET /products/:productId/marketing` | opaque id + `organization_id` scope | `product_marketing_assets` | `ProductMarketingPage` (3서비스) | 매장 마케팅 자산 링크 | **유지** — org-scope 정상 패턴의 선례 |

호출부 (3서비스 동일 계약):

```text
KPA   services/web-kpa-society/src/api/productAiContent.ts
GP    services/web-glycopharm/src/api/productAiContent.ts
KCos  services/web-k-cosmetics/src/api/productAiContent.ts
      → 세 파일 모두 coreApiClient.get(`/products/${productId}/ai-contents`) 동일
```

---

## 5. 3서비스 화면 전환안

세 서비스의 두 화면은 **동일 코드 패턴**이다 (GP 파일 헤더: "KPA-Society StoreProductDescriptionsPage canonical 패턴 이식"). 따라서 전환도 3서비스 동시 적용한다.

### 5.1 `StoreProductDescriptionsPage` (KPA `pages/pharmacy` · GP `pages/store-management` · KCos `pages/store`)

| 항목 | 현재 | 전환 후 |
|------|------|--------|
| 목록 source | `fetchLocalProducts()` (local only) | **동일 유지** — 화면 정체성이 이미 "매장 자체 상품"(빈 상태 문구·`/store/commerce/local-products` 링크) |
| 식별자 | `store_local_products.id` → ai-contents | `store_local_products.id` → local-products API |
| 조회 | `GET /products/:id/ai-contents` | `GET /api/v1/store/local-products` 응답의 `detailHtml` |
| 저장 | `PUT /products/:id/ai-contents/product_description` | `PUT /api/v1/store/local-products/:id` `{ detailHtml }` |
| AI 생성 결과 | 전역 row 에 저장 | 편집기 state 반영 → 저장 시 local 필드로 |
| 빈 상태 | 빈 편집기 (403 을 삼킴) | "저장된 설명 없음" + 신규 작성 가능 |
| 오류 | 무음 | 명시 오류 + 재시도 (§9) |

**저장 대상 필드 = `detail_html` 권장.** 이유: `description` 은 이미 `StoreLocalProductsPage` 등록/수정 모달이 쓰는 필드라 두 화면이 같은 필드를 놓고 충돌한다. `detail_html` 은 스키마·API·태블릿 상세 소비까지 갖췄으면서 **편집 진입점이 없고 프로덕션 0건**이라 회귀 위험이 없다.
→ 역할 분리: **모달 = 상품 기본정보 + 짧은 설명(`description`/`summary`), 설명 화면 = 상세 설명(`detail_html`)**.
(대안: `description` 단일 필드로 통일하고 모달에서 상세 편집을 제거 — 단일 소스지만 모달 회귀 검증 필요.)

### 5.2 `ProductPopBuilderPage` (3서비스)

현재 local id 로 진입 → ai-contents 403 → 저장 실패 → PDF 404. **end-to-end 로 이미 불능**이다.

| 항목 | 전환 후 |
|------|--------|
| 진입 | `ProductMarketingPage` → `/store/commerce/products/:id/pop` (경로 유지) |
| 입력 원천 | **local**: `store_local_products` 의 `summary`/`description`/`detail_html` · **listing**: SPD(STORE) canonical |
| 저장 | `product_ai_contents` 쓰기 **제거** (§6 참조 — 저장 위치는 WO-2 에서 확정) |
| PDF | `GET /products/:id/pop/:layout` 는 master 전용 → local 지원 경로 필요 |

### 5.3 참고 화면 (변경 없음, 회귀 확인 대상)

```text
StoreLocalProductsPage      — description/summary 모달 (필드 역할 분리 확인)
ProductMarketingPage        — org-scope opaque id, 정상 동작 (전환 없음)
StoreTabletDisplaysPage     — product_ai_contents 미소비 (영향 없음)
web-neture ProductDetailDrawer — ai-tags 가드 수정의 유일한 실사용 소비자
```

---

## 6. POP · 태블릿 소비 계약

### 6.1 태블릿

**현 상태로 이미 정합** — 태블릿은 `product_ai_contents` 를 읽지 않는다.

```text
local product   → store_local_products (list: description/summary, detail: detail_html/usage_info/caution_info)
listing product → shared_product_descriptions(STORE canonical) → store_product_profiles(legacy fallback)
                  → supplier_product_offers
```

§5.1 이 `detail_html` 을 채우면 태블릿 상세가 **자동으로 개선**된다 (신규 배선 0).

### 6.2 POP

`product_ai_contents.pop_short/pop_long` 은 **ProductMaster 전역 문구**로 남긴다 (C2 PDF 입력 유지).
매장이 편집한 POP 문구를 전역 row 에 되쓰지 않는다.

매장 POP 문구 저장 위치 — WO-2 에서 택 1 (권장: P2):

| 안 | 내용 | 평가 |
|---|------|------|
| **P2 (권장)** | POP 산출물 = **매장 자료함 자산**(매장 콘텐츠)로 저장. 기존 POP 제작·PDF 경로와 동일 축 | 이미 매장 POP 제작 canonical 이 자료함에 존재 → 중복 저장소 신설 없음 |
| P1 | 저장 없이 편집 → 즉시 PDF 생성 | 최소 변경. 재편집 불가 |
| P3 | `store_local_products` 에 pop 필드 추가 | migration 필요. listing 상품은 여전히 미해결 |

PDF 엔드포인트는 `sourceType` 계약(§3)을 받아 local/listing 입력을 분기해야 한다. 현재 `authenticate` 만 있고 **org 가드가 없다** — WO-1 에서 함께 보완한다.

---

## 7. AI 생성 계약

```text
전역 AI 생성 (운영자·임포트 자동)
→ product_ai_contents 저장
→ SPD candidate seed 로 흘러감 (seedFromProductAiContents)

매장 요청 AI 초안 (매장 사용자)
→ 생성 결과를 편집기 state 로만 반환
→ 저장은 매장 소유 저장소 (local: store_local_products / POP: §6.2)
→ 전역 row 에 쓰지 않는다
```

- 매장 편집 화면의 AI 는 **편집기 내장 보조 AI**(RichTextEditor `aiRequestHeaders`)로 이미 동작하며 전역 저장을 하지 않는다 → 이 축은 현재도 정합.
- O4O 는 매장 상품설명 초안을 자동 생성하지 않는다 (AI 진입점 정책 유지).

---

## 8. 접근 권한 계약 (RBAC · service scope)

### 8.1 전역 AI 콘텐츠 / 태그 (`product_ai_contents`, `product_ai_tags`)

| 주체 | 읽기 | 쓰기 |
|------|:----:|:----:|
| `platform:super_admin` | ✓ | ✓ |
| `{service}:operator` / `{service}:admin` (**해당 service 상품만**) | ✓ | ✓ |
| 공급자 (자기 offer 의 master) | ✓ | ✓ (태그) |
| 매장 사용자 | 필요 시 읽기 | **✗ 금지** |
| 미인증 | ✗ | ✗ |

### 8.2 현재 가드의 3대 결함 ([product-access.utils.ts](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts))

| # | 결함 | 영향 |
|---|------|------|
| G1 | 우회 역할이 무접두 `['admin','operator']` 정확 일치 — 활성 `role_assignments` 는 전부 접두형(`kpa:operator` 등) → **매칭 0** | 운영자 전원 차단 |
| G2 | 소유 판정이 `OPL.offer_id → supplier_product_offers.master_id` JOIN — `offer_id` 100% NULL · `supplier_product_offers` 0행 → **항상 0행** (`OPL.master_id` 는 20/20 정상) | 매장 전원 차단 |
| G3 | 공급자 축이 없음 — ai-tags 의 유일한 실사용 소비자가 공급자(`web-neture`)인데 가드는 `organization_members` 만 본다 | 공급자 차단 |

→ 현재 **모든 주체 / 모든 id 에 대해 결정적 403**. G1 을 단순히 여는 것은 **service_key 검증이 없어 전 서비스 상품이 열리는 가드 역전**이다.

### 8.3 정렬 방향

```text
1) 소유 판정   OPL.organization_id + OPL.master_id + OPL.is_active   (offer JOIN 제거)
2) 공급자 판정 supplier_product_offers.supplier_id ← 사용자 공급자 소속
3) 운영자 판정 prefix RBAC(role LIKE '{service}:%') + 대상 상품의 service scope 일치
4) 전역       platform:super_admin 만
```

- Neture 운영자에게 KPA 상품 접근을 자동 허용하지 않는다.
- service_key 없는 관리자 우회를 만들지 않는다.

### 8.4 매장 보완 설명 (`store_local_products`)

`organization_id` scope 필수 — 기존 `store-local-product.routes.ts` 가 이미 `WHERE organization_id = $1` 로 강제한다. **추가 설계 불필요.** 다른 조직 접근 불가.

---

## 9. 오류 UX 계약

세 상태를 구분한다 (현재는 전부 "빈 편집기"로 보임 — `catch` 무음).

| 상태 | 화면 |
|------|------|
| 정상 · 콘텐츠 없음 | "저장된 설명이 없습니다. 새로 작성하세요." + 편집 가능 |
| 조회 실패 (403/500/네트워크) | "설명을 불러오지 못했습니다." + **재시도 버튼** + 저장 버튼 비활성 |
| 대상 부적합 (listing 상품인데 매장 편집 불가) | "이 상품은 O4O 표준 상품입니다. 매장 특화 문구는 콘텐츠 만들기에서 제작하세요." + 안내 링크 |

빈 콘텐츠와 오류를 같은 화면으로 표시하지 않는다. (Neture Load-Error 계약 시리즈와 동일 원칙)

---

## 10. 고아 데이터 처리

| 테이블 | 행 | 실태 |
|--------|:--:|------|
| `product_ai_contents` | 3 | 1개 `product_id`(`fee036a0-…`) — `public` 스키마의 **어떤 uuid PK 테이블에도 없음**. `pop_short`/`pop_long`/`product_description` 각 1 |
| `product_ai_tags` | 9 | master 0건 / local 0건 — **전량 고아** (동일 결함) |

```text
재연결 금지 (원 소유 상품 식별 불가)
```

**권장: A — 감사 산출물 보존 후 승인된 단일 트랜잭션 DELETE.**

```text
1) 12행 전량(3 + 9)을 원문·메타데이터 포함 JSON/SQL 로 덤프하여 감사 산출물로 커밋
2) 사용자 승인 후 단일 트랜잭션 DELETE (pre/post count 검증 + rollback 계약)
3) 삭제 완료 후에만 FK 를 추가한다
```

이번 설계에서는 실제 DELETE 를 수행하지 않는다.

---

## 11. migration 판단

| 항목 | 판정 | 근거 |
|------|------|------|
| `product_ai_contents.product_id` FK → `product_masters.id` | **추가 권장, 단 §10 정리 이후** | 현재 3행 전부 고아 → FK 추가 즉시 실패 |
| ON DELETE 정책 | **CASCADE** (RESTRICT 아님) | 파생 초안이므로 master 삭제 시 잔존 무의미. RESTRICT 는 기존 master 정리 migration([20270209000000](../../apps/api-server/src/database/migrations/20270209000000-DeleteHffCorruptedProductMasters.ts) 등)을 실패시킨다. 자매 테이블 `store_product_profiles` 도 CASCADE |
| `UNIQUE (product_id, content_type)` | **추가 권장** | 서비스 upsert 가 이미 `(productId, contentType)` 최신 1개 계약([service:145](../../apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts#L145)). 현재 중복 0건. C2 PDF 리더도 type 당 1행 가정 |
| 생성 이력 다중 row | **불채택** | 이력 요구가 현재 어디에도 없고, 다중 row 는 C2·C3 소비 계약을 깨뜨린다. 이력이 필요해지면 별도 `*_versions` 테이블로 분리 |
| `content_type` CHECK 제약 | 선택 | 앱 레벨 union 존재. 추가 시 5개 값 고정 — 확장 시 migration 필요 |
| `organization_id` 추가 | **불필요** | A 채택으로 전역 확정 |
| `store_local_products` 스키마 변경 | **불필요** | L3 는 기존 필드 재사용 |

→ **이번 설계의 결론: 신규 컬럼 0. migration 은 FK + UNIQUE 2건뿐이며, 둘 다 §10 고아 정리 이후에만 적용 가능.**

---

## 12. 후속 구현 WO 2개

### WO-1 `O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1`

```text
범위
→ product_ai_contents 전역 계약 명문화 (엔티티/문서)
→ product-access.utils.ts 가드 3대 결함 수정 (G1 prefix RBAC+service scope / G2 offer JOIN 제거 / G3 공급자 축)
→ ai-tags 6 endpoint 동일 가드 적용 (공급자 소비자 회귀 확인)
→ POP PDF 엔드포인트 org/service 가드 보완
→ 고아 12행 감사 덤프 → 승인 후 DELETE → FK(CASCADE) + UNIQUE 추가
```

### WO-2 `O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1`

```text
범위
→ 3서비스 StoreProductDescriptionsPage: 저장 대상을 store_local_products.detail_html 로 전환
→ 3서비스 ProductPopBuilderPage: 전역 쓰기 제거 + 입력 원천 분기 + POP 저장 위치 확정(P2)
→ sourceType/sourceId/masterId ID 계약 적용
→ 오류 UX 3상태 (§9)
→ 태블릿 상세 회귀 확인 (detail_html 소비)
```

### 배포 순서와 호환 기간

```text
WO-1 먼저 배포 (가드·전역 계약 정리)
  → 이 시점에도 매장 화면은 여전히 local id 를 보내므로 403 유지 (회귀 없음: 현재도 403)
  → 매장 사용자에게 전역 쓰기가 열리는 창이 생기지 않는다  ← 순서를 뒤집으면 안 되는 이유

WO-2 배포 (매장 화면을 매장 저장소로 전환)
  → 이 시점에 매장 설명 기능이 정상 동작 시작

호환 기간 불필요
  → 매장 화면은 현재 100% 403 이므로 전환으로 잃을 동작이 없다
  → product_ai_contents 매장 유래 데이터도 0건 (3행은 전부 고아, 매장 소유 아님)
```

---

## 13. 코드·DB 변경 0

```text
코드 변경   0
DB write    0
migration   0
API 변경    0
권한 변경   0
배포        0
```

프로덕션 접근은 `SELECT`(정보스키마·카운트) 전용. 결과는 §2·§10 에 기록.
다른 세션 WIP 파일은 접촉하지 않았다.

---

## 14. 미확인 리스크

| # | 리스크 | 확인 시점 |
|---|--------|----------|
| R1 | POP 저장 위치 P2(자료함) 의 실제 스키마 정합 — 매장 자료함 자산 타입에 POP 문구 2필드를 담는 방식 미검증 | WO-2 착수 시 |
| R2 | `detail_html` vs `description` 필드 역할 분리 시 `StoreLocalProductsPage` 모달의 사용자 혼동 | WO-2 UX 검토 |
| R3 | 공급자 소유 판정(G3) 은 `supplier_product_offers` 0행이라 프로덕션 실데이터 검증 불가 — 테스트 데이터 필요 | WO-1 테스트 |
| R4 | K-Cosmetics·GlycoPharm 의 `localProducts` API 경로가 KPA 와 동일 백엔드인지 (KCos 는 `@/services/localProductApi`) | WO-2 착수 시 |

---

*DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1 · 결론 A + L3 · 2026-07-29*
