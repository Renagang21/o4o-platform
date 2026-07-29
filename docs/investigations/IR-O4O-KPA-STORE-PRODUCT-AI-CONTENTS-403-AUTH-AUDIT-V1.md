# IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1

> **read-only 감사.** 코드 변경 0 / DB write 0 / API 변경 0 / 권한 변경 0 / 배포 0.
> 프로덕션 DB 접근은 `SELECT` 전용이며, 사용한 질의는 §9 에 전부 기록한다.

| 항목 | 값 |
|------|-----|
| 작성일 | 2026-07-29 |
| 대상 증상 | `GET /api/v1/products/{id}/ai-contents` → **403 `PRODUCT_ACCESS_DENIED`** |
| 관측 화면 | KPA `/store/marketing/product-descriptions` (StoreProductDescriptionsPage) |
| 판정 | **복합 원인 — 주원인 B(인가 계약이 프로덕션에서 항상 거짓) + 부원인 A(ID 계약 불일치)** |
| 상태 | 조사 종료 · 후속 구현 WO 1건 제안 (§11) |

---

## 1. 조사 배경

`/store/marketing/product-descriptions` 진입 시 상품을 선택하면 매번
`GET /api/v1/products/{id}/ai-contents` 가 403 을 반환한다.
403 이라는 이유만으로 "권한 부족"으로 단정하지 않고, 아래 6 가지 가능성을 코드·엔티티·마이그레이션·프로덕션 데이터로 분리했다.

| # | 가설 | 결과 |
|---|------|------|
| H1 | 프론트가 잘못된 종류의 상품 ID 를 전달 | **확인됨** (부원인) |
| H2 | 백엔드는 ProductMaster ID 를 기대하나 local-product ID 수신 | **확인됨** (H1 과 동일 사실의 백엔드 측면) |
| H3 | organization scope / 역할 가드 불일치 | **확인됨** (주원인) |
| H4 | `product_ai_contents` 소유권 계약 불일치 | **확인됨** (데이터 오염 형태로 실재) |
| H5 | legacy endpoint | 아님 — 현재 등록·활성 라우트 |
| H6 | 특정 데이터만 잘못 연결 | 아님 — **모든 호출자·모든 ID 에 대해 403** |

---

## 2. 요청 경로 전개

```
브라우저  /store/marketing/product-descriptions
   └─ fetchLocalProducts()            GET /api/v1/store/local-products
        → items[].id = store_local_products.id        ← 조직 경계(organization_id)
   └─ setSelectedId(items[0].id)
   └─ getProductAiContents(selectedId)
        → GET /api/v1/products/{store_local_products.id}/ai-contents
             ↓ app.use('/api/v1/products', createProductAiContentRouter)
             ↓ authenticate                                    (통과)
             ↓ verifyProductOrgAccess(ds, productId, userId)   ← 여기서 실패
             → 403 { success:false, error:'Product access denied', code:'PRODUCT_ACCESS_DENIED' }
```

---

## 3. ID 계약 대조표 (§6)

| # | 지점 | 파일 · 위치 | 실제 값의 정체 | 근거 |
|---|------|------------|---------------|------|
| 1 | local-products 목록 row `id` | [store-local-product.routes.ts:154-157](../../apps/api-server/src/routes/platform/store-local-product.routes.ts#L154-L157) | **`store_local_products.id`** | `SELECT id, ... FROM store_local_products WHERE organization_id = $1` |
| 2 | 페이지 state `selectedId` | [StoreProductDescriptionsPage.tsx:71](../../services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx#L71) | 위 1 을 그대로 저장 | `setSelectedId(res.items[0].id)` |
| 3 | API client path param | [productAiContent.ts:34](../../services/web-kpa-society/src/api/productAiContent.ts#L34) | 변환 없이 그대로 전달 | `` coreApiClient.get(`/products/${productId}/ai-contents`) `` |
| 4 | 백엔드 route param | [product-ai-content.controller.ts:136-147](../../apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts#L136-L147) | **`product_masters.id` 를 기대** | 가드가 `spo.master_id = $1` 로 비교, `loadProductContentInput` 이 `FROM product_masters pm WHERE pm.id = $1` |
| 5 | service 조회 조건 | [product-ai-content.service.ts](../../apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts) · [product-pop-pdf.controller.ts:59-65](../../apps/api-server/src/modules/store-ai/controllers/product-pop-pdf.controller.ts#L59-L65) | `product_ai_contents.product_id = {같은 값}` | 조건 없는 단순 일치 — 검증 없음 |
| 6 | `product_ai_contents.product_id` 의 의미 | [entity](../../apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts#L39-L40) · [migration 20260309300000](../../apps/api-server/src/database/migrations/20260309300000-CreateProductAiContents.ts#L14-L23) | **의도는 ProductMaster.id, 그러나 FK 없음** | 주석 "Product Master 기반 AI 생성 콘텐츠", 컬럼 정의는 `product_id UUID NOT NULL` — **FK/CHECK 제약 0** |

> **핵심:** 1~3 은 Store Ops 도메인(`organizationId` 경계)의 ID, 4~6 은 Broadcast/Catalog 도메인의 ID다.
> 두 값이 같은 이름(`productId`)으로 흐르지만 **서로 다른 테이블의 PK** 이며, 이를 강제하는 제약이 DB 에 없다.
> 프로덕션에서 두 집합의 UUID 우연 일치는 **0 건**이다 (§9 Q7).

---

## 4. 403 분기 전수표 (§7)

`GET /:productId/ai-contents` 에 도달 가능한 403 은 **단 하나의 지점**에서만 발생한다.

| # | 분기 | 코드 | 조건 | 프로덕션 실제 |
|---|------|------|------|--------------|
| B0 | 인증 실패 | `authenticate` | 토큰 없음/만료 | 401 (403 아님) — 본 증상과 무관 |
| B1 | 플랫폼 관리자 우회 | [product-access.utils.ts:36-41](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L36-L41) | `role_assignments.role ∈ {'admin','operator'} AND is_active` | **매칭 0 명** — 프로덕션 역할은 전부 prefix 형(`kpa:operator`, `platform:super_admin` …). 우회는 **절대 발동하지 않음** |
| B2 | 조직 미소속 → 403 | [:44-49](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L44-L49) | `organization_members` 에 활성 행 없음 | 매장 계정은 소속 있음 → 여기서 막히지 않음 |
| B3 | 조직 상품 목록 미포함 → 403 | [:54-64](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L54-L64) | `organization_product_listings opl JOIN supplier_product_offers spo ON spo.id = opl.offer_id WHERE spo.master_id = $1 AND opl.organization_id = $2` | **항상 0 행** — `supplier_product_offers` 프로덕션 **0 행**, `organization_product_listings.offer_id` 는 20 행 전부 **NULL** (§9 Q4·Q5) |

**결론:** B1 이 절대 발동하지 않고 B3 의 JOIN 이 구조적으로 0 행이므로,
**어떤 사용자가 어떤 ID(local product·ProductMaster 무관)를 보내도 이 엔드포인트는 403 을 반환한다.**
ID 를 ProductMaster 로 바꿔도 증상은 해소되지 않는다.

---

## 5. 정상 vs 403 비교 (§8)

같은 화면·같은 세션에서 **local product ID 를 그대로 쓰는데도 성공하는 API** 가 존재한다. 차이는 "가드가 무엇을 기준으로 소유권을 판단하는가" 하나다.

| 항목 | ✅ 정상 — 마케팅 자산 | ❌ 403 — AI 콘텐츠 |
|------|----------------------|-------------------|
| 엔드포인트 | `GET /api/v1/pharmacy/products/:productId/marketing` | `GET /api/v1/products/:productId/ai-contents` |
| 컨트롤러 | [product-marketing.controller.ts:33-48](../../apps/api-server/src/routes/o4o-store/controllers/product-marketing.controller.ts#L33-L48) | [product-ai-content.controller.ts:136](../../apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts#L136) |
| 가드 | `requireAuth` + `createRequireStoreOwner(serviceKey)` → `req.organizationId` | `authenticate` + `verifyProductOrgAccess` |
| 소유권 판정 기준 | **organization_id 스코프**로 자기 행만 조회 (`WHERE organization_id=$1 AND product_id=$2`) | **카탈로그 등재 여부** (`opl → spo.master_id`) |
| productId 취급 | 조직 내에서만 의미 있는 **불투명 값** — 종류 검증 없음 | **product_masters.id 로 강제 해석** |
| 전달된 값 | `store_local_products.id` (동일) | `store_local_products.id` (동일) |
| 결과 | 200 | 403 |

> 즉 "특정 상품만 잘못 연결"이 아니다. 같은 ID 가 한쪽에서는 정상 동작하고 다른 쪽에서는 403 이다.
> **화면·데이터가 아니라 엔드포인트별 소유권 계약이 서로 다르다는 것이 본질이다.**

---

## 6. 가드 감사 (§9) — 가드 역전 가능성 포함

`verifyProductOrgAccess` 는 3 단계다.

```
1) role_assignments.role = ANY('{admin,operator}')  AND is_active  → 무조건 허용 (조직 무시)
2) organization_members(left_at IS NULL) 로 사용자 조직 1건 해석
3) opl JOIN spo ON spo.id = opl.offer_id, spo.master_id = productId, opl.organization_id = 사용자 조직
```

발견된 문제 3 가지:

**(a) 관리자 우회 목록이 RBAC SSOT 와 어긋난다 — 실질 무효항.**
`PLATFORM_ADMIN_ROLES = ['admin','operator']` 는 **접두어 없는** 문자열 정확 일치다.
프로덕션 `role_assignments` 활성 역할 18 종 중 무접두 `admin`/`operator` 는 **0 건**이다 (§9 Q6).
반면 실제 운영자는 `kpa:operator`(1) · `neture:operator`(1) · `glycopharm:operator`(2) · `cosmetics:operator`(1),
관리자는 `platform:super_admin`(2) · `kpa:admin`(1) 등 **전부 prefix 형**이다.
→ 의도한 "관리자·운영자 우회"가 **한 번도 발동하지 않는다.**

**(b) 가드 역전 가능성 — 존재한다.**
만약 누군가에게 무접두 `admin` 또는 `operator` 를 부여하면,
이 가드는 **service_key 를 보지 않으므로** 해당 사용자가 KPA·GlycoPharm·K-Cosmetics·Neture **전 서비스의 모든 상품 AI 콘텐츠에 무제한 접근**하게 된다.
즉 현재 상태는 "전원 차단", 완화 시도 시 한 번에 "전원 개방"으로 넘어가는 **이분법 가드**다.
CLAUDE.md §7 Guard Rule 3(Domain Primary Boundary 필터 필수)·§11(서비스 스코프 가드) 기준에서 **정렬 필요 항목**이다.

**(c) 소유권 판정이 죽은 JOIN 경로를 쓴다.**
`organization_product_listings` 에는 `master_id` 컬럼이 **직접 존재**하고 프로덕션 20 행 전부 채워져 있으며 전부 유효한 `product_masters.id` 다.
그런데 가드는 `offer_id → supplier_product_offers.master_id` 로 **우회**한다.
프로덕션 `supplier_product_offers` 는 **0 행**, `opl.offer_id` 는 **전부 NULL** →
**JOIN 결과가 구조적으로 항상 0 행**이다. (이는 인가 판정 경로가 canonical 컬럼을 쓰지 않아 생긴 문제이며, 데이터 부재만의 문제가 아니다.)

> 참고 — **동일 가드를 공유하는 다른 컨트롤러**: [product-ai-tag.controller.ts](../../apps/api-server/src/modules/store-ai/controllers/product-ai-tag.controller.ts) 의 6 개 엔드포인트(`/:productId/ai-tags*`)가 같은 `verifyProductOrgAccess` 를 사용한다.
> 따라서 **AI 태그 기능도 동일하게 전원 403 상태일 가능성이 높다.** (본 감사에서는 코드상 동일성만 확인했고 브라우저 검증은 수행하지 않았다.)

---

## 7. `product_ai_contents` 소비처 전수 (§10)

| # | 소비처 | 파일 | product_id 를 무엇으로 보는가 | 상태 |
|---|--------|------|------------------------------|------|
| 1 | AI 콘텐츠 CRUD (GET/PUT/POST/DELETE) | [product-ai-content.controller.ts](../../apps/api-server/src/modules/store-ai/controllers/product-ai-content.controller.ts) | ProductMaster.id | **전원 403** |
| 2 | AI 콘텐츠 생성 서비스 | [product-ai-content.service.ts](../../apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts) | 호출자가 준 값 그대로 upsert | 검증 없음 |
| 3 | POP PDF 생성 | [product-pop-pdf.controller.ts:36-72](../../apps/api-server/src/modules/store-ai/controllers/product-pop-pdf.controller.ts#L36-L72) | ProductMaster.id (`FROM product_masters WHERE id=$1` → 없으면 **404**) | local product ID 로는 404 |
| 4 | SPD candidate seed | [shared-product-description.service.ts:861-867](../../apps/api-server/src/modules/neture/services/shared-product-description.service.ts#L861-L867) | **masterId 로만 조회** | local ID 로 쓰인 행은 **영구 미도달** |
| 5 | 상품 임포트 시 AI 생성 | [product-import-common.service.ts:20-50](../../apps/api-server/src/modules/neture/services/product-import-common.service.ts#L20-L50) | ProductMaster.id | 정상 계약 |
| 6 | KPA 상품 상세설명 화면 | [StoreProductDescriptionsPage.tsx:88·157](../../services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx#L88) | **store_local_products.id** | 403 |
| 7 | KPA POP 빌더 | [ProductPopBuilderPage.tsx:81·140-141](../../services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx#L81) | **store_local_products.id** (StoreLocalProductsPage → `/store/commerce/products/{local.id}/pop`) | 403 |
| 8 | GlycoPharm 동일 2 화면 | `services/web-glycopharm/src/pages/store-management/{StoreProductDescriptionsPage,ProductPopBuilderPage}.tsx` | 동일 (`fetchLocalProducts`) | 동일 결함 |
| 9 | K-Cosmetics 동일 2 화면 | `services/web-k-cosmetics/src/pages/store/{StoreProductDescriptionsPage,ProductPopBuilderPage}.tsx` | 동일 | 동일 결함 |

> **KPA 단독 문제가 아니다.** 동일 코드 형태가 3 개 서비스에 복제되어 있다 (CLAUDE.md §1 Shared Module Change Rule 대상).

### 7-1. UX 관측 — 403 이 사용자에게 어떻게 보이는가

- 조회(`fetchContent`)는 [catch 에서 조용히 삼킨다](../../services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx#L98-L104) → 사용자는 **"저장된 내용이 없는 빈 편집기"** 로 인식한다. 오류 표시 없음.
- 저장(`handleSave`)만 토스트로 실패를 알린다 → **"작성은 되는데 저장만 안 되는 화면"** 처럼 보인다.
- 이 조합이 원인 파악을 지연시킨 요인이다.

---

## 8. `product_ai_contents` 데이터 실태 (프로덕션 read-only)

| 항목 | 값 |
|------|-----|
| 총 행 수 | **3** |
| distinct `product_id` | **1** (`fee036a0-…3e76a`) |
| content_type 분포 | `product_description` 1 · `pop_short` 1 · `pop_long` 1 |
| `product_id` 가 `product_masters` 에 존재 | **0** |
| `product_id` 가 `store_local_products` 에 존재 | **0** |
| 어느 테이블에도 없음(고아) | **3 (전부)** |
| 내용 | 3 행 모두 동일 문구("롯데 자일리톨 껌 …"), 최초 `product_description` 은 `model=gemini-2.5-flash`, POP 2 행은 `model=NULL`(수동 저장) |

**해석:** 이 데이터는 가드가 우회되던 시점(또는 당시 데이터 상태)에서 **local product ID 로 저장**된 뒤,
해당 local product 행이 사라지면서 **어떤 조회 경로로도 도달할 수 없는 고아 데이터**가 되었다.
`product_id` 에 FK 가 없기 때문에 DB 가 이를 막지 못했다 — **H4(소유권 계약 불일치)가 데이터로 실증된 사례**다.

> 본 감사는 이 3 행을 **삭제·수정하지 않는다.** 정리는 후속 WO 판단 사항이다.

---

## 9. 프로덕션 read-only 확인 기록 (§11)

- 채널: 기존 실행 중인 `cloud-sql-proxy`(`netureyoutube:asia-northeast3:o4o-platform-db`, 127.0.0.1:15433) + `pg` 클라이언트
- 계정: `o4o_api` (Cloud Run 서비스 env 에서 추출), DB `o4o_platform`
- **실행 질의는 전부 `SELECT`. INSERT/UPDATE/DELETE/DDL 0 건.**

| Q | 질의 요지 | 결과 |
|---|-----------|------|
| Q1 | `SELECT count(*) FROM product_ai_contents` | 3 |
| Q2 | content_type 별 집계 | product_description 1 / pop_short 1 / pop_long 1 |
| Q3 | `product_id` 의 `product_masters` / `store_local_products` 존재 여부 | 0 / 0 (고아 3) |
| Q4 | `SELECT count(*) FROM supplier_product_offers` | **0** |
| Q5 | `organization_product_listings` 20 행 · `master_id` 채움 20 · `offer_id` 채움 **0** · OPL⋈SPO JOIN **0 행** · master_id 유효성 20/20 | — |
| Q6 | 활성 `role_assignments` 역할 분포 | 무접두 `admin`/`operator` **0**, prefix 형만 존재 |
| Q7 | `store_local_products.id` 가 `product_masters.id` 와 우연 일치 | **0** |
| Q8 | `store_local_products` 43 행(활성 10), 조직 2 곳(테스트 약국 40 / Sohae 약국 3) | — |
| Q9 | `product_marketing_assets` 총 행 | 0 |
| Q10 | 고아 `product_id` 를 public 스키마의 모든 uuid PK 테이블에서 역탐색 | **어느 테이블에서도 발견되지 않음** |

---

## 10. 판정 (§12)

### 판정: **복합 원인**

| 구분 | 원인 | 근거 | 영향 |
|------|------|------|------|
| **주원인** | **인가 계약이 프로덕션에서 항상 거짓** — 관리자 우회 역할 문자열이 RBAC SSOT 와 불일치(무접두 vs prefix)하고, 소유권 판정이 0 행인 `supplier_product_offers` 를 경유한다 | §4 B1·B3, §6 (a)(c), §9 Q4·Q5·Q6 | 이 원인만으로 **모든 사용자·모든 ID 에 대해 403**. ID 를 고쳐도 해소되지 않음 |
| **부원인** | **ID 계약 불일치** — Store Ops 도메인의 `store_local_products.id` 를 Catalog 도메인의 `product_masters.id` 자리에 전달 | §3, §7, §9 Q7 | 가드를 고쳐도 남는다. 통과 시 404(POP PDF) 또는 **고아 데이터 생성**(§8) |

**"단순 권한 오류"가 아니다.** 사용자·역할·조직 설정을 바꿔도 해결되지 않으며,
반대로 ID 만 ProductMaster 로 교정해도 해결되지 않는다. **두 계약을 함께 정렬해야 한다.**

부가 판정:
- **legacy endpoint 아님** — [register-routes.ts:684-691](../../apps/api-server/src/bootstrap/register-routes.ts#L684-L691) 에 현재 활성 등록.
- **특정 데이터 문제 아님** — 403 은 데이터 무관하게 결정적이다.
- **KPA 한정 아님** — GP/K-Cos 동일 구조 (§7 #8·#9).

---

## 11. 후속 구현안 — **1 건만 제안** (§13)

### `WO-O4O-PRODUCT-AI-CONTENT-ID-AND-ACCESS-CONTRACT-ALIGNMENT-V1`

**한 문장:** `product_ai_contents` 계열 엔드포인트의 **소유권 판정 기준**과 **productId 의 정체**를 하나의 계약으로 확정하고, 프론트 3 서비스를 그 계약에 맞춘다.

범위 후보(설계는 해당 WO 에서 확정):
1. 소유권 판정을 `organization_product_listings.master_id`(canonical 컬럼) 기준으로 교정 — 0 행 JOIN 경로 제거.
2. 관리자 우회 역할 목록을 RBAC 카탈로그(prefix 형)와 정렬하고 **service_key 경계를 함께 검사** — §6(b) 가드 역전 차단.
3. `productId` 의 정체를 계약으로 명문화 (ProductMaster 고정 + 프론트가 local product → master 를 해석해 전달, 또는 Store Ops 도메인 ID 를 1급으로 승격 — 택1). CLAUDE.md §7 Boundary Policy 및 F12 Product Resource Architecture 와 정합해야 한다.
4. `product_ai_contents.product_id` 무결성 보강 및 고아 3 행 처리 방침.
5. KPA / GlycoPharm / K-Cosmetics **3 서비스 동시 정렬** (Shared Module Change Protocol).
6. 403 조회 실패를 화면에서 **삼키지 않도록** 오류 계약 정비 (§7-1).

> **왜 1 건인가:** 가드만 고치면 ID 불일치로 고아 데이터가 계속 쌓이고, ID 만 고치면 여전히 403 이다. 두 변경은 같은 배포에서 함께 검증되어야 한다.

---

## 12. 하지 않은 것 / 남은 리스크

**하지 않은 것 (WO §14 준수):** StoreProductDescriptionsPage 수정 · API endpoint 수정 · 권한 완화 · `product_ai_contents` 데이터 수정 · `store_local_products` 수정 · ProductMaster 연결 생성 · migration · route 변경 · UI 오류 메시지 변경 · 브라우저에서 콘텐츠 저장 · 운영 데이터 생성/삭제.

**남은 리스크·미확인:**
- `/:productId/ai-tags` 6 개 엔드포인트의 실제 403 여부는 **코드 동일성만 확인**했고 브라우저 검증은 하지 않았다 (Neture 공급자 태그 UI 영향 가능).
- 고아 3 행의 원래 소유 상품은 특정하지 못했다 (§9 Q10 — 어느 테이블에도 없음).
- `supplier_product_offers` 0 행이 **정상 상태인지 데이터 유실인지**는 본 감사 범위 밖이다. 다만 §10 주원인 판정은 이 값과 무관하게 성립한다(가드가 canonical 컬럼을 쓰지 않는다는 사실 자체가 결함).

---

*IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1 · read-only · 2026-07-29*
