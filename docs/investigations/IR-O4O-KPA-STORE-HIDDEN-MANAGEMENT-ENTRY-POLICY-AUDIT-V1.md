# IR-O4O-KPA-STORE-HIDDEN-MANAGEMENT-ENTRY-POLICY-AUDIT-V1

> KPA 내 매장의 hidden route 2건(`/store/commerce/local-products`, `/store/library/production-materials`)의
> 실제 역할·인바운드·데이터 소비처·권한을 조사하고 진입 정책을 판정한다.
>
> **범위: read-only.** 코드 변경 0 / DB write 0 / route·메뉴 변경 0 / 배포 0.
>
> - 작성일: 2026-07-29
> - 선행: [IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1](IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1.md)
> - 관련 SSOT: [O4O-STORE-MENU-CANONICAL-TREE-V1](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) · [O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)

---

## 1. 한 줄 판정

**두 화면은 성격이 정반대다.**

```text
/store/commerce/local-products
→ A. 정식 사이드바 메뉴 (조건부 — §2.7 정책 충돌 선결)
   이유: store_local_products 의 유일한 생성·수정 화면이며,
        정식 메뉴 2개(상품 설명 · 태블렛 화면 제작)가 이 데이터에 전적으로 의존한다.
        현재 생성 경로가 사실상 소실되어 '상품 설명' 메뉴가 신규 매장에서 공회전한다.

/store/library/production-materials  (list)
→ C. legacy 호환 route (메뉴 승격 부적합)
   이유: 활성 인바운드 0. 목록 내용이 이미 정식 메뉴 3개(자료함>콘텐츠 · QR-code · 블로그)로
        완전히 커버되는 기술적 UNION이다. 단, 서브라우트 `/:id/edit` 는 B(내부 액션·딥링크)로 **유지 필수**.
```

---

## 2. 조사 축 A — 매장 자체 상품 (`/store/commerce/local-products`)

### 2.1 대상

| 항목 | 값 |
|------|-----|
| Route | `/store/commerce/local-products` ([App.tsx:1003](../../services/web-kpa-society/src/App.tsx#L1003)) |
| Component | [StoreLocalProductsPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx) (KPA 자체 구현) |
| Frontend API | [api/localProducts.ts](../../services/web-kpa-society/src/api/localProducts.ts) → `/api/v1/store/local-products` |
| Backend | [store-local-product.routes.ts](../../apps/api-server/src/routes/platform/store-local-product.routes.ts) |
| Table | `store_local_products` (Display Domain — Commerce Object 아님, Checkout/Order 연결 금지) |

### 2.2 사용자 업무 정의

> **"O4O 표준 상품 DB(ProductMaster)에 없는, 우리 매장이 직접 취급하는 상품을 등록하고
> 태블릿·QR·상품 설명 등 매장 안내 자산의 기준 데이터로 삼는다."**

`매장 경영활용 제품`(`/store/handled-products`)과의 경계는 코드·데이터에서 성립한다.

| 축 | 매장 경영활용 제품 (handled-products) | 매장 자체 상품 (local-products) |
|----|------|------|
| 성격 | 통합 **조회 전용**(UNION) | **원천 CRUD** |
| 데이터 | `organization_product_listings` + `store_local_products` | `store_local_products` 단독 |
| master | ProductMaster 연결 있음(listing) | **master 없음** (`master_id NULL`) |
| 생성 | O4O 표준 상품에서 추가 / 신규 상품 등록 요청 | 매장이 직접 입력 |
| 근거 | [store-handled-products.routes.ts:121-130](../../apps/api-server/src/routes/platform/store-handled-products.routes.ts#L121-L130) | — |

### 2.3 기능 전수

`StoreLocalProductsPage` 가 제공하는 기능:

| 기능 | local-products | handled-products | 다른 대체 화면 | 독립 관리 필요 |
|------|:---:|:---:|------|:---:|
| 상품 등록(생성) | ✅ | ❌ (정책 폐기, §2.7) | 없음 | ✅ |
| 수정 | ✅ | ❌ | 없음 | ✅ |
| 삭제·비활성화 | ✅ (soft: `is_active=false`) | △ (`handled-products/remove` = row 삭제) | — | ✅ |
| 대표 이미지(미디어 라이브러리 업로드) | ✅ | ❌ | 없음 | ✅ |
| 바코드 | ✅ | ❌ | 없음 | ✅ |
| 상품명·규격·표시가격(`price_display`) | ✅ | 읽기만 | 없음 | ✅ |
| 배지(신상품/추천/이벤트) | ✅ (`LOCAL_PRODUCT_BADGE_OPTIONS`) | ❌ | 없음 | ✅ |
| 본문(RichTextEditor) + 내 매장 콘텐츠 가져오기 | ✅ | ❌ | 없음 | ✅ |
| ProductMaster 연결 | ❌ (구조상 없음) | listing 만 | — | — |
| OPL 연결 | ❌ | ✅ | `/store/my-products` | — |
| 다국어 콘텐츠 배지·진입 | ✅ | ✅ (`targetKind='local'` 공통) | `/store/products/multilingual/:kind/:id` | — |
| 고객용 보기 / QR / URL 복사 | ✅ (`MultilingualPublicActions`) | ✅ (listing 만 상품 QR) | — | — |
| POP | ❌ | ❌ | `/store/marketing/pop` | — |
| handled-products 목록 반영 | ✅ (`source_type='local'`) | — | — | — |

> 요약: **생성·수정·이미지·바코드·배지·본문은 이 화면에만 존재한다.** 대체 화면 없음.

### 2.4 인바운드 전수 (저장소 전체 검색)

검색어: `/store/commerce/local-products`, `commerce/local-products`, `StoreLocalProductsPage`, `local-products`

| # | 위치 | 분류 | 활성 | 비고 |
|---|------|------|:---:|------|
| 1 | [storeMenuConfig.ts:119](../../packages/store-ui-core/src/config/storeMenuConfig.ts#L119) (K-Cosmetics 블록) | 사이드바 | ✅ | **KPA 아님** — `매장 활성화 > 자체 상품` |
| 2 | [storeMenuConfig.ts:197](../../packages/store-ui-core/src/config/storeMenuConfig.ts#L197) (GlycoPharm 블록) | 사이드바 | ✅ | **KPA 아님** — `약국 활성화 > 자체 상품` |
| 3 | KPA 블록 | 사이드바 | ❌ | [storeMenuConfig.ts:273-277](../../packages/store-ui-core/src/config/storeMenuConfig.ts#L273-L277) 주석 — `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-INTERNAL-TABS-V1` 로 **메뉴 제거** |
| 4 | [StoreProductDescriptionsPage.tsx:238](../../services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx#L238) | 화면 내부 CTA | ✅ | **KPA 유일 활성 진입** — 단, **목록이 0건일 때만** 노출되는 empty-state 링크 |
| 5 | [StoreTabletDisplaysPage.tsx:796](../../services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx#L796) | 화면 내부(뒤로가기 ←) | ⚠️ | **stale drift** — 태블릿은 `약국 경영지원` 소속인데 ← 화살표가 local-products 로 이동 |
| 6 | [StoreTabletDisplaysPage.tsx:1485](../../services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx#L1485) | 화면 내부 | ⚠️ | 동일 |
| 7 | [store-handled-products.routes.ts:179](../../apps/api-server/src/routes/platform/store-handled-products.routes.ts#L179) | Backend `managePath` | ⚠️ | `/store/commerce/local-products?highlight={id}` 응답에 존재하나 **KPA 프론트에서 미소비**(dead field) |
| 8 | 홈 CTA | — | ❌ | [StoreHomePage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx) 는 `/store/handled-products`·`/store/library/contents` 만 링크 |
| 9 | 알림·이메일 / 모바일 메뉴 / legacy redirect | — | ❌ | 해당 없음 |
| 10 | docs/* | 문서 참조 | — | 판정 대상 아님 |

**결론: KPA 활성 진입 = 1건(#4, empty-state 한정) + 오배치 뒤로가기 2건(#5·#6).**
정상 진입 동선이 존재하지 않는다.

### 2.5 데이터 관계 (소비처)

`store_local_products` 는 **KPA 정식 메뉴 2개가 직접 의존**한다.

| 소비처 | 정식 메뉴 여부 | 소비 방식 | 근거 |
|--------|:---:|------|------|
| **상품 설명** `/store/marketing/product-descriptions` | ✅ `약국 경영지원 > 상품 설명` | **목록 전체가 `fetchLocalProducts()` 단독** — O4O listing 미포함 | [StoreProductDescriptionsPage.tsx:29,68](../../services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx#L65-L70) |
| **태블렛 화면 제작** `/store/commerce/tablet-displays` | ✅ `약국 경영지원 > 태블렛 화면 제작` | `product_type: 'supplier' \| 'local'` 전시 대상 | [api/tabletDisplays.ts:31,55](../../services/web-kpa-society/src/api/tabletDisplays.ts#L31) |
| 매장 경영활용 제품 | ✅ | `source_type='local'` UNION (읽기) | handled-products routes §2.2 |
| 다국어 상품 콘텐츠 | ✅(진입은 handled-products/local-products 행 액션) | `targetKind='local'` | [StoreProductMultilingualContentPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreProductMultilingualContentPage.tsx) |
| QR | ✅ `약국 경영지원 > QR-code` | `fetchLocalProducts` import | [StoreQRPage.tsx:46](../../services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L46) |
| 상품 QR(고정 랜딩) | — | **local 제외** (master 없음) | [store-handled-products.routes.ts:281](../../apps/api-server/src/routes/platform/store-handled-products.routes.ts#L281) |

**삭제 시 downstream**: `handled-products/remove` 는 `store_local_products` row 를 **hard delete** 하고
`kpa_store_content_product_links` 만 해제한다(콘텐츠·QR 자체는 보존).
`local-products` 화면의 삭제는 `is_active=false` soft delete 로, **두 화면의 삭제 의미가 다르다.**

### 2.6 판정 근거

| 기준 (§5.6) | 충족 |
|------|:---:|
| 독립 CRUD 업무 | ✅ 생성·수정·이미지·바코드·배지·본문이 이 화면에만 존재 |
| 대체 화면 없음 | ✅ handled-products 는 등록 버튼 제거됨 |
| 반복적 직접 진입 필요 | ✅ 상품 추가/가격 변경은 상시 업무 |
| 다른 기능의 선행 데이터 관리 화면 | ✅ 상품 설명·태블릿·QR 의 기준 데이터 |
| 권한·데이터 계약 명확 | ⚠️ frontend guard 불일치 (§4) |

→ **A. 정식 사이드바 메뉴**

### 2.7 ⚠️ 선결 과제 — WO 간 정책 충돌 (판정 조건)

두 WO 가 서로 반대 방향으로 결정했고, 그 사이에 진입점이 소실됐다.

```text
WO-O4O-KPA-STORE-HANDLED-PRODUCTS-INTERNAL-TABS-V1
  → 사이드바 '매장 자체 제품' 메뉴 제거,
    "'매장 경영활용 제품' 화면 내부(출처 탭 + 관리 버튼)로 흡수" 를 전제로 함
        ↓
WO-O4O-KPA-STORE-HANDLED-PRODUCT-REMOVE-AND-STATUS-AUDIT-V1
  → "'매장 직접 등록'(store_local_products) 정책 폐기 → 등록 버튼·로컬 탭 제거"
    ([StoreHandledProductsPage.tsx:11,281](../../services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx#L11))
        ↓
결과: 흡수 대상(내부 탭·관리 버튼)이 사라졌으나 원래 메뉴는 복원되지 않음
      → local-products 생성 경로가 empty-state 링크 1개로만 남음
```

동시에 **후행 WO 의 "정책 폐기" 선언과 현행 코드가 불일치**한다.
`store_local_products` 는 여전히 handled-products 목록에 UNION 되고(§2.5), 상품 설명·태블릿·QR 이 이를 소비한다.
즉 **"등록 정책만 폐기하고 소비는 유지"** 된 어중간한 상태다.

후속 WO 는 다음 중 하나를 **먼저** 확정해야 한다.

- **(A1) 진입점 복원** — `매장 자체 상품` 메뉴를 KPA 블록에 복원. 소비처 3개가 살아있으므로 정합.
- **(A2) 전면 은퇴** — `store_local_products` 를 KPA 에서 폐기. 단 상품 설명 화면 재설계(O4O listing 기반 전환)
  + 태블릿 `product_type='local'` 제거 + QR/다국어 경로 정리가 동반되는 **대형 작업**이며,
  GP/KCos 는 정식 메뉴로 유지 중이라 공통 테이블·백엔드는 존치해야 한다.

본 IR 은 **(A1) 을 권고**한다. 근거: 소비처가 정식 메뉴 2개이고, 현 상태에서 신규 매장은
`상품 설명` 메뉴에 들어가도 등록된 상품이 0건이라 아무 작업도 할 수 없다(기능 은폐 = CLAUDE.md §1 위반 상태).

---

## 3. 조사 축 B — 매장 제작 자료 (`/store/library/production-materials`)

### 3.1 대상

| 항목 | 값 |
|------|-----|
| Route (list) | `/store/library/production-materials` ([App.tsx:996](../../services/web-kpa-society/src/App.tsx#L996)) |
| Route (new) | `/store/library/production-materials/new` ([App.tsx:998](../../services/web-kpa-society/src/App.tsx#L998)) |
| Route (edit) | `/store/library/production-materials/:id/edit` ([App.tsx:1000](../../services/web-kpa-society/src/App.tsx#L1000)) |
| Component | [StoreProductionMaterialsPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx) / [ProductionMaterialEditorPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx) |

### 3.2 사용자 업무 정의

목록의 실제 구성은 **"제작 결과물 4소스 클라이언트 머지"** 다. 고유 업무 서술이 아니라 기술적 UNION 이다.

### 3.3 실제 데이터 구성

| source | 포함 기준 | 편집 route | 삭제 가능 | 실제 소비처(정식 메뉴) |
|--------|-----------|-----------|:---:|------|
| `kpa_store_contents` | `directContentApi.list()` → `sourceType='direct'` | `/store/content/direct/:id` | ✅ | `약국 자료함 > 콘텐츠` |
| `store_execution_assets` | `getStoreExecutionAssets()` → `sourceType='generated'` | `/store/library/production-materials/:id/edit` | ✅ | `약국 자료함 > 콘텐츠` |
| `pharmacy_qr_codes` | `getStoreQrCodes()` | (원본 화면으로 `href` 이동) | ✅ | `약국 경영지원 > QR-code` |
| `staff_blog_posts` | `fetchStaffBlogPosts()` | (원본 화면으로 `href` 이동) | ✅ | `약국 경영지원 > 블로그` |
| `store_asset_derivations` | 원본↔파생 뷰어(보조) | — | — | 공통 `StoreAssetDerivationViewer` |

> 백엔드 통합 엔드포인트 없음 — 4개 list API 를 프론트에서 머지한다
> ([StoreProductionMaterialsPage.tsx:5-24](../../services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx#L5-L24)).

### 3.4 인바운드 전수

| # | 위치 | 대상 route | 분류 | 활성 |
|---|------|-----------|------|:---:|
| 1 | [storeMenuConfig.ts:131](../../packages/store-ui-core/src/config/storeMenuConfig.ts#L131) (K-Cosmetics) | list | 사이드바 | ✅ **KPA 아님** |
| 2 | [storeMenuConfig.ts:209](../../packages/store-ui-core/src/config/storeMenuConfig.ts#L209) (GlycoPharm) | list | 사이드바 | ✅ **KPA 아님** |
| 3 | KPA 블록 | list | 사이드바 | ❌ [storeMenuConfig.ts:307-310](../../packages/store-ui-core/src/config/storeMenuConfig.ts#L307-L310) — `WO-O4O-KPA-QR-POP-RESULT-SCOPE-V1` 로 숨김 |
| 4 | [StoreContentsSelector.tsx:135](../../services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx#L135) | **`/:id/edit`** | 자료함 콘텐츠 목록 행 [편집] | ✅ **KPA 유일 활성 진입** |
| 5 | [StoreProductionMaterialsPage.tsx:244,254,334](../../services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx#L244) | `/new` | 자기 페이지 내부 CTA | ❌ 부모가 도달 불가 → 사실상 죽은 진입 |
| 6 | [ProductionMaterialEditorPage.tsx:169,184](../../services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx#L169) | — | **저장 후 이동 = `/store/library/contents`** | ✅ (list 로 가지 **않음**) |
| 7 | [ProductionMaterialEditorPage.tsx:15,26](../../services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx#L15) | — | 헤더 주석 "저장 후 → production-materials 이동" | ⚠️ **주석 stale**(코드와 불일치) |
| 8 | [StoreProductionMaterialsPage.tsx:529](../../services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx#L529) | 가이드 | `GuideBackLink → /guide/features/production-materials` | ✅ (list → guide, 역방향) |
| 9 | [GuideFeatureProductionMaterialsPage.tsx](../../services/web-kpa-society/src/pages/guide/GuideFeatureProductionMaterialsPage.tsx) | list | 가이드 → 화면 | ❌ `/store/*` 링크 없음 |
| 10 | [StorePopCreateModal.tsx:105](../../services/web-kpa-society/src/components/store/StorePopCreateModal.tsx#L105) | list | POP 생성 후 안내 | ❌ **제거됨**(주석만 잔존) → `POP 목록 보기` 로 대체 |
| 11 | [StoreHomePage.tsx:19](../../services/web-kpa-society/src/pages/pharmacy/StoreHomePage.tsx#L19) | list | 홈 Step 2 CTA | ❌ **제거됨**(주석만 잔존) → `/store/library/contents` |
| 12 | [CreateContentFromResourcesModal.tsx](../../services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx) | `/new` | "빈 편집기에서 바로 작성" | ❌ **제거됨** → `/store/content/direct/:id` |
| 13 | [productionTargets.tsx](../../services/web-kpa-society/src/pages/pharmacy/productionTargets.tsx) | — | canonical 제작 타겟 4종 | ❌ POP·QR·블로그·상품설명만 (production-materials 없음) |

**결론 (KPA):**

```text
list  (/store/library/production-materials)        → 활성 인바운드 0
new   (/store/library/production-materials/new)    → 활성 인바운드 0 (부모 페이지에서만 호출)
edit  (/store/library/production-materials/:id/edit) → 활성 인바운드 1 — 자료함>콘텐츠 행 [편집]. 유지 필수.
```

### 3.5 기존 화면과 중복 비교

| 업무 | production-materials | 기존 화면 | 중복 | 고유 가치 |
|------|:---:|------|:---:|------|
| 매장 제작 자료(execution asset) 재편집 | ✅ | `약국 자료함 > 콘텐츠` (동일 행에서 같은 `/:id/edit` 로 연결) | **완전 중복** | 없음 |
| 직접 작성 콘텐츠(direct) | ✅ | `약국 자료함 > 콘텐츠` | **완전 중복** | 없음 |
| QR 목록·스캔수 | ✅ | `약국 경영지원 > QR-code` | 중복 | 없음(행 클릭 시 원본 화면으로 이동) |
| 블로그 목록·상태 | ✅ | `약국 경영지원 > 블로그` | 중복 | 없음(동일) |
| POP 결과물 | ✅(파일형) | `약국 경영지원 > POP` | 중복 | 없음 |
| 4소스 **교차 통합 검색** | ✅ | 없음 | — | ⚠️ 유일한 고유 가치, 단 검색/필터 UI 는 미제공 |
| 원본↔파생 관계 뷰어 | ✅ | 공통 컴포넌트(다른 화면도 사용) | 부분 중복 | 낮음 |

→ §6.7 기준의 **"그냥 각 목록을 UNION한 기술적 페이지"** 에 해당. 별도 메뉴 부적합.

### 3.6 편집 계약

| 행 유형 | 편집기 연결 | 계약 정합 |
|---------|------------|:---:|
| execution asset (`generated`) | `/store/library/production-materials/:id/edit` → 같은 row update(id 불변, QR `library_item_id` 유지) | ✅ |
| direct (`kpa_store_contents`) | `/store/content/direct/:id?edit=1` | ✅ |
| QR | 편집 아님 — `href` 로 QR 원본 화면 이동 | ✅ |
| 블로그 | 편집 아님 — `href` 로 블로그 화면 이동 | ✅ |
| POP(파일형) | `fileUrl` 재출력만 | ✅ |

깨지는 route 는 발견되지 않았다. **편집 불가 항목(QR/블로그/POP파일)이 편집 가능 항목과 한 목록에 섞여 있는 것**이
목록 성격을 모호하게 만드는 주요 원인이다.

### 3.7 판정

| 기준 (§6.7) | 판정 |
|------|------|
| 여러 제작 결과물의 통합 결과함 | △ UNION 이나 검색/필터 없음 |
| 반복적으로 다시 찾고 편집 | ❌ 편집 가능한 2소스는 `자료함 > 콘텐츠` 가 동일 기능 제공 |
| 현재 콘텐츠·자료 메뉴로 대체되지 않음 | ❌ 대체됨 |
| 행 액션이 실제로 동작 | ✅ |
| 활성 인바운드 | ❌ 0 (list/new) |

→ **C. legacy 호환 route** (직전까지 정식 메뉴였으므로 북마크 보호 목적으로 route 존치.
`/:id/edit` 는 **B. 내부 액션·딥링크**로 별도 유지 필수 — 제거 시 자료함 콘텐츠 편집이 즉시 깨진다.)

`D. 은퇴`로 가지 않은 이유: 컴포넌트 `ProductionMaterialEditorPage` 가 `/new` 와 `/:id/edit` 를 공유하므로
list/new 만 떼어내는 실익이 작고, GP/KCos 는 동일 route 를 정식 메뉴로 사용 중이라 공통 계약을 건드리면 안 된다.

---

## 4. 권한 감사

| Route | Frontend guard | Backend | 결과 |
|-------|---------------|---------|------|
| `/store/*` (공통 wrapper) | `PharmacyGuard` (인증·승인) — [App.tsx:942](../../services/web-kpa-society/src/App.tsx#L942) | — | — |
| `commerce/local-products` | `PharmacyGuard` **만** | `requireAuth` + `resolveStoreAccess(organizationId)` | 매장 구성원 접근 가능 |
| `library/production-materials(+new/:id/edit)` | `PharmacyGuard` **만** | `requireAuth` + org scope | 매장 구성원 접근 가능 |
| `handled-products` | `PharmacyGuard` + **`PharmacyOwnerOnlyGuard`** — [App.tsx:985](../../services/web-kpa-society/src/App.tsx#L985) | 동일 | **owner 전용** |
| `my-products` | `PharmacyGuard` + **`PharmacyOwnerOnlyGuard`** | 동일 | owner 전용 |
| `products/multilingual/:kind/:id` | `PharmacyGuard` + **`PharmacyOwnerOnlyGuard`** | 동일 | owner 전용 |

**발견된 권한 불일치**

```text
local-products 는 store_local_products 의 CRUD(생성·수정·삭제) 화면인데
PharmacyOwnerOnlyGuard 가 없다.
반면 '읽기 전용' handled-products 와 다국어 콘텐츠는 owner 전용이다.
→ 쓰기 화면이 읽기 화면보다 느슨하다(가드 역전).
```

백엔드는 두 경로 모두 `resolveStoreAccess` 로 organization scope 를 강제하므로 **데이터 유출은 없다**
(타 매장 데이터 접근 불가). 문제는 **같은 매장 내 비-owner 구성원의 쓰기 권한**이다.

정식 메뉴로 승격할 경우 `PharmacyOwnerOnlyGuard` 정렬을 함께 판단해야 한다(후속 WO 범위).
`store-ui-core` 공통 계약 변경은 **불필요** — guard 는 KPA `App.tsx` 로컬이다.

---

## 5. 프로덕션 read-only 확인

**확인 불가.** 본 세션 로컬 환경에 검증 채널이 없다.

| 항목 | 상태 |
|------|------|
| `psql` 클라이언트 | ❌ 미설치 (`Get-Command psql` → 없음) |
| `cloud-sql-proxy` 바이너리 | ✅ 존재 (`C:\Users\home\cloud-sql-proxy.x64.exe`) |
| 프록시 리스너(5432/5442/5470) | ❌ 미기동 |
| DB 자격증명 (`.env.apiserver` / `apps/api-server/.env`) | ❌ 로컬에 실 파일 없음 (`.example` 만 존재) |

따라서 §10 의 다음 항목은 모두 **`프로덕션 확인 필요`** 로 분류한다.

| 축 | 확인 필요 항목 | 판정 영향 |
|----|--------------|-----------|
| local-products | 조직별 `store_local_products` 건수 / 최근 수정 / 실사용 조직 수 | **판정 A 자체는 불변** — 소비처가 코드로 확정됨. 다만 (A1) vs (A2) 선택의 보강 근거 |
| local-products | `product_ai_contents`(상품 설명) 중 local 대상 건수 | (A2) 전면 은퇴 시 손실 규모 산정에 필수 |
| production-materials | source 별 row 수 / 최근 생성 시점 | **판정 C 불변** — 인바운드 0 이 코드로 확정됨 |

> 근거 구분: **코드로 확정** = §2.4·§2.5·§3.4·§4 / **구조상 추정** = 없음 / **프로덕션 확인 필요** = 위 표.

---

## 6. 메뉴 정책 비교 (§7)

| 화면 | 독립 업무 | 반복 진입 | 대체 화면 | 메뉴 후보 | 최종 판정 |
|------|:---:|:---:|------|------|------|
| `local-products` | ✅ 원천 CRUD | ✅ 상품 추가·가격 변경 상시 | **없음** | `약국 상품·거래 > 매장 자체 상품` | **A. 정식 사이드바 메뉴** (§2.7 선결) |
| `production-materials` (list) | ❌ 기술적 UNION | ❌ | `자료함 > 콘텐츠` · `QR-code` · `블로그` | 없음 | **C. legacy 호환 route** |
| `production-materials/:id/edit` | — | ✅ | 없음 | (메뉴 아님) | **B. 내부 액션·딥링크 — 유지 필수** |

두 화면을 같은 이유로 묶지 않았다: 전자는 **소비처가 살아있는데 진입점만 소실**, 후자는 **소비처 자체가 다른 화면으로 이관 완료**.

---

## 7. 명칭 감사 (§8) — 제안만, UI 변경 없음

### local-products

| 후보 | 평가 |
|------|------|
| **매장 자체 상품** | ✅ **권장**. `매장 경영활용 제품`(통합 조회)·`O4O 제품`(플랫폼 제공)과 축이 구분됨 |
| 직접 등록 상품 | △ 등록 행위 강조 — 관리 화면 명칭으로는 약함 |
| 매장 등록 상품 | ❌ `O4O 제품 취급 등록`과 혼동 |
| ~~내 상품 / 자체 제품 / 매장 상품~~ | ❌ 회피(§8 지시) |

> 참고: GP/KCos 는 현재 `자체 상품` 을 쓴다. KPA 는 `매장 경영활용 제품`과 나란히 놓이므로
> `매장 자체 상품` 이 대비가 선명하다. 크로스서비스 라벨 통일 여부는 후속 WO 판단.

### production-materials

메뉴로 올리지 않으므로 **신규 명칭 불필요**. 기존 `제작 자료` 용어는 `자료함 > 콘텐츠` 내부 배지
(`제작 자료` / `QR-code` / `블로그`)로 이미 사용 중이므로 **메뉴 라벨로 재도입 시 오히려 중복**이다.

---

## 8. 후속 WO 2개 (§12) — 분리 필수

### WO-O4O-KPA-STORE-LOCAL-PRODUCTS-ENTRY-ALIGNMENT-V1

```text
목적: '매장 자체 상품' 진입 정책 확정 및 정합화
선결: §2.7 정책 충돌 결정 — (A1) 진입점 복원 vs (A2) 전면 은퇴
범위(A1 채택 시):
  1. storeMenuConfig KPA 블록에 { key:'local-products', label:'매장 자체 상품',
     subPath:'/commerce/local-products' } 를 '약국 상품·거래' 그룹에 추가
  2. StoreHandledProductsPage 헤더 주석의 "정책 폐기" 문구 정정(소비 유지 사실 반영)
  3. StoreTabletDisplaysPage 뒤로가기 2곳(796·1485) 을 올바른 상위 화면으로 정정
  4. PharmacyOwnerOnlyGuard 적용 여부 결정(§4 가드 역전 해소)
  5. StoreProductDescriptionsPage empty-state 링크 라벨을 새 메뉴명과 정합
Shared Module Change Protocol: 적용 대상 ✅
  - storeMenuConfig.ts 는 3서비스 공유 파일. 단, 변경은 KPA_SOCIETY_STORE_CONFIG 블록 한정.
  - GP/KCos 블록 무변경 확인 + 두 서비스 사이드바 회귀 smoke 필수.
검증: 브라우저 smoke — 메뉴 노출 / 등록·수정 / 상품 설명·태블릿 목록 반영
```

### WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-ENTRY-ALIGNMENT-V1

```text
목적: '매장 제작 자료' hidden route 의 legacy 지위 명문화
범위:
  1. /store/library/production-materials (list) 를 legacy 로 명시
     — 옵션 a) 그대로 존치 + 주석 명문화 (최소)
       옵션 b) /store/library/contents 로 redirect (북마크 보호 + 중복 제거)  ← 권장
  2. /new 는 활성 인바운드 0 — list 존치/redirect 결정에 종속시켜 함께 처리
  3. /:id/edit 는 절대 변경 금지 (자료함 콘텐츠 편집 진입)
  4. stale 주석 정정: ProductionMaterialEditorPage L15·L26(저장 후 이동 경로),
     StorePopCreateModal L105, StoreHomePage L19
  5. 사이드바 메뉴 추가 금지 재확인
Shared Module Change Protocol: 적용 대상 ✅ (판단만)
  - GP/KCos 는 동일 route 를 정식 메뉴로 사용 → KPA 만 redirect 시 공통 컴포넌트
    ProductionMaterialEditorShell 의 savedPath 기본값('/store/library/production-materials') 영향 확인 필요.
    KPA 는 이미 /store/library/contents 로 override 중이므로 무영향 예상 — 코드로 재확인.
검증: 자료함 콘텐츠 [편집] 진입 회귀 smoke + GP/KCos 제작 자료 메뉴 회귀 smoke
```

---

## 9. 코드·DB 변경 (§13 준수)

```text
사이드바 메뉴 추가·삭제   0
홈 CTA 추가             0
route redirect          0
컴포넌트 삭제            0
화면명 변경              0
API 변경                0
store_local_products 수정 0
production materials 데이터 수정 0
editor 이동 경로 수정     0
store-ui-core 변경       0
DB write / migration     0
배포                    0
```

**본 IR 은 문서 1건만 추가한다.**

---

## 10. 중지 조건 점검 (§14)

| 조건 | 해당 | 처리 |
|------|:---:|------|
| local-products 가 다른 서비스 공통 관리 화면 | ✅ | GP/KCos 정식 메뉴 + 공통 테이블·백엔드·배지 컴포넌트 공유. → **판정 범위를 KPA 메뉴 정책으로 한정**하고 플랫폼 은퇴는 권고하지 않음 |
| production-materials 가 여러 서비스 공통 계약 | ✅ | GP/KCos 정식 메뉴 + `StoreProductionMaterialsView`/`ProductionMaterialEditorShell` 공유. → **KPA 자체 페이지만 대상**, 공통 패키지 무변경 전제로 판정 |
| 데이터 소비 관계가 코드만으로 불명확 | ❌ | §2.5·§3.3 전부 코드로 확정 |
| 프로덕션 실사용 확인 없이 은퇴 판단 불가 | ✅(부분) | **은퇴(D) 판정을 내리지 않음.** local=A, production=C 로, 둘 다 프로덕션 실측 없이 성립하는 판정 |
| 메뉴 노출에 store-ui-core 공통 계약 변경 필수 | ⚠️ | `storeMenuConfig.ts` 는 공유 파일이나 서비스별 블록 분리 구조 → 계약 변경 아님. Shared Module Change Protocol 은 후속 WO 에서 적용 |
| 동시 세션이 대상 파일 수정 중 | ❌ | `git status` clean |

→ 전면 중지 사유 없음. 단 **§2.7 정책 충돌은 후속 WO 의 선결 결정 사항**으로 이관한다.

---

## 11. 요약 판정표

| 화면 | 판정 | 사용자 업무 한 문장 | 정식 진입 화면 | 권장 위치 | 권장 명칭 | 유지 route |
|------|:---:|------|------|------|------|------|
| `/store/commerce/local-products` | **A** | O4O 표준 상품에 없는 매장 자체 취급 상품을 등록·관리해 태블릿·QR·상품 설명의 기준 데이터로 삼는다 | 사이드바 직접 진입 | `약국 상품·거래` 그룹, `매장 경영활용 제품` 바로 아래 | **매장 자체 상품** | 유지 |
| `/store/library/production-materials` | **C** | (고유 업무 없음 — 4소스 결과물 UNION) | 없음(legacy 딥링크) | 메뉴 없음 | (신규 명칭 불필요) | 유지 또는 `/store/library/contents` redirect |
| `/store/library/production-materials/new` | **C** | (list 종속) | 없음 | 메뉴 없음 | — | list 결정에 종속 |
| `/store/library/production-materials/:id/edit` | **B** | 자료함 콘텐츠 목록에서 매장 제작 자료(execution asset)를 단건 편집한다 | `약국 자료함 > 콘텐츠` 행 [편집] | 메뉴 아님 | — | **유지 필수** |

---

*Status: Read-only Investigation Complete*
*Version: 1.0*
