# IR-O4O-KPA-STORE-QR-TABLET-CONTENT-FLOW-AUDIT-V1

> **성격:** read-only 조사 IR. 코드·DB·배포·UI 변경 0.
> **작성일:** 2026-08-09
> **대상:** `kpa-society 내 매장`(`/store/*`) + 매장 HUB(`/store-hub/*`) 의 QR · 태블릿 · 자료함 · 매장용 상품 설명서 · 콘텐츠 선택/적용 흐름
> **목적:** 공급자 대시보드 IA 설계 근거 확보 — 매장이 실제로 무엇을 어디서 가져와 어떻게 쓰는지 확정하고, 공급자에게 열 것/닫을 것을 구분한다.
> **결론 한 줄:** 공급자→매장 전달 경로는 **이미 3개(SPD 매장용 설명서 · Screen Set HUB · Signage HUB)가 코드로 완결**돼 있고, QR·태블릿 배치·자료함은 **전부 매장 경영자 전용 권한**이다. 공급자 대시보드에 QR/태블릿 메뉴를 두면 안 되는 이유가 코드 레벨에서 이미 강제돼 있다.

---

## 1. 조사 요약

### 1.1 결론 5가지

1. **매장의 자료 소비축은 3개다.** ① 매장 HUB(`/store-hub/*`) = 운영자·공급자 게시물 진열·가져오기 ② 약국 자료함(`/store/library/*`) = 매장이 소유한 사본·자료 ③ 약국 경영지원(`/store/marketing/*`, `/store/commerce/tablet-displays`) = 사본을 QR·POP·태블릿으로 실행.
2. **"가져오기"는 예외 없이 값 복사(독립 사본)다.** 원본 FK·자동 동기화·연쇄 삭제가 전 경로에서 금지돼 있다. 원본이 바뀌어도 매장 사본은 자동으로 바뀌지 않고, `원본 갱신됨` 배지만 뜬다(§4.4).
3. **QR 은 콘텐츠를 저장하지 않고 "연결 대상"만 저장한다.** 6개 landing type(`product|promotion|page|link|video|screen_set`). 그중 `page` 는 **매장 소유 사본만** 가리키도록 서버가 강제 치환한다(copy guard).
4. **태블릿은 코너(=`store_tablets` 1 row)와 화면 세트(Screen Set)의 조합**이며, 공개 태블릿·코너 QR 이 **같은 resolver 를 공유**한다. 공급자·운영자 원본은 `origin='store'` 매장 사본으로 복사된 뒤에만 공개 경로에 도달한다.
5. **공급자는 매장 리소스에 접근할 수단이 없다.** `supplier-screen-set.controller.ts:33` 이 차단 목록을 명문화하고, Supplier ContentSourceAdapter 가 `fetchStoreContent()` 를 **항상 null** 로 막는다. 즉 공급자 대시보드의 권한 경계는 이미 백엔드에 있고, IA 는 그것을 반영만 하면 된다.

### 1.2 핵심 데이터 흐름

```
[공급자 / web-neture]                         [운영자 / KPA operator]
 매장용 설명서(SPD draft→needs_review) ──검수──▶ SPD status='canonical' (STORE)
 Screen Set 원본(origin='supplier', publish) ─┐   운영자 Screen Set 원본(origin='operator')
 Signage 원본(publish)                        │   운영자 QR/POP/블로그/동영상/콘텐츠 템플릿
                                              ▼
                                   [매장 HUB /store-hub/*]  ← 진열(읽기)
                                              │  "가져오기" = 값 복사(독립 사본)
                                              ▼
                     [약국 자료함 /store/library/*]      kpa_store_contents · store_execution_assets
                                              │
                     ┌────────────┬───────────┼────────────┬─────────────┐
                     ▼            ▼           ▼            ▼             ▼
                    QR          POP        블로그      태블릿 화면     사이니지
              store_qr_codes  store_pops  store_blog  screen_sets   store_playlists
                     │                                    │
                     └────────── 같은 resolver ───────────┘
                                     ▼
                     공개 /qr/{slug} · 공개 태블릿 /{slug}/tablet/screen
```

---

## 2. 확인한 route / component / API / table 목록

### 2.1 Frontend (services/web-kpa-society)

| 영역 | Route | Component |
|------|-------|-----------|
| 매장 HUB(셸) | `/store-hub` | `components/pharmacy/PharmacyHubLayout.tsx` (실 엔트리 — `HubSubNav` 는 dead) |
| HUB 콘텐츠 | `/store-hub/content` | `HubContentLibraryPage.tsx` |
| HUB 블로그 / POP / QR / 동영상 | `/store-hub/{blog,pop,qr,video}` | `HubBlogLibraryPage` · `HubPopLibraryPage` · `HubQrLibraryPage` · `HubVideoLibraryPage` |
| HUB 태블릿 화면 | `/store-hub/screen-set` | `HubScreenSetLibraryPage.tsx` (운영자 제공 / **공급자 제공** 2탭) |
| HUB 사이니지 | `/store-hub/signage` | `HubSignageLibraryPage.tsx` |
| HUB 다국어 상품 콘텐츠 | `/store-hub/multilingual-product-contents` | `HubMultilingualContentLibraryPage.tsx` |
| 자료함 · 콘텐츠 | `/store/library/contents` | `StoreLibraryContentsPage.tsx` → `StoreContentsSelector.tsx` |
| 자료함 · 자료 | `/store/library/resources` | `StoreLibraryResourcesPage.tsx` |
| 상품 설명 | `/store/marketing/product-descriptions` | `StoreProductDescriptionsPage.tsx` |
| QR-code | `/store/marketing/qr` | `StoreQRPage.tsx` (2,067줄) |
| QR AI 설명 | `/store/marketing/qr/ai-description` | `StoreQrAiDescriptionPage.tsx` |
| POP | `/store/marketing/pop` | `StorePopPage.tsx` |
| 태블릿 화면 제작 | `/store/commerce/tablet-displays` | `StoreTabletDisplaysPage.tsx` + `TabletScreenSetManager` · `TabletCornerContentsPanel` · `TabletCornerSwapModal` |
| 매장 경영활용 제품 | `/store/handled-products` | `StoreHandledProductsPage.tsx` |
| 공개 QR 랜딩 | `/qr/{slug}` | `PublicScreenSetViewer` 외 |
| 공개 태블릿 | `/tablet/{slug}?tabletId=` | `@o4o/tablet-kiosk-core` |

사이드바 정의: `packages/store-ui-core/src/config/storeMenuConfig.ts` → `KPA_SOCIETY_STORE_CONFIG` (약국 상품·거래 / **약국 경영지원** / 약국 자료함 / 디지털 사이니지 / 온라인 판매 / 판매 채널 확장 / 분석 / 설정).

### 2.2 Backend (apps/api-server)

| 영역 | 파일 | 비고 |
|------|------|------|
| 매장 콘텐츠 CRUD 공통 | `services/store/store-content.service.ts` | `kpa_store_contents` direct CRUD + 제품 링크 |
| 매장 콘텐츠 라우트(가져오기·재가져오기) | `routes/o4o-store/controllers/store-content.controller.ts` | `POST /store-contents/import-b2c-description` · `POST /store-contents/:id/reimport-source` |
| 자료함 통합 feed | `routes/o4o-store/controllers/store-library-feed.controller.ts` | snapshot+direct UNION, **`원본 갱신됨` 판정 SQL** |
| 자료(실행 자산) CRUD | `services/store/store-library.service.ts` | `store_execution_assets`, soft delete + QR 참조 가드 |
| QR | `services/store/store-qr.service.ts` (854줄) | 공개 랜딩 · 목록 · 통계 · 생성 · 수정 · 비활성화 |
| QR page copy guard | `routes/o4o-store/services/qr-content-hub-copy.service.ts` | content_hub 원본 → 매장 사본 강제 치환 |
| Screen Set QR SSOT | `routes/platform/store-screen-set-qr.service.ts` | `SCREEN_SET_QR_JOIN` · `QR_LANDABLE_CONDITION` · `ARCHIVED_SCREEN_SET_QR_CONDITION` |
| 태블릿·Screen Set | `routes/platform/store-tablet.routes.ts` (2,325줄) | 44개 endpoint, 전부 `withStoreAuth` |
| 공개 Screen Set resolver | `routes/platform/store-public/store-public-screen-set-resolve.ts` | 태블릿 runtime · QR 랜딩 공용 |
| content_list 원본 adapter | `routes/platform/store-public/store-public-tablet-content-source.ts` | Store / **Operator** / **Supplier** 3종 |
| POP | `services/store/store-pop.service.ts` | `store_pops` author_role='store' 사본 |
| 파생 추적 | `routes/o4o-store/services/store-asset-derivation.service.ts` | source_kind 10종 / derived_kind 8종 |
| 공급자 Screen Set | `routes/o4o-store/controllers/supplier-screen-set.controller.ts` | `origin='supplier'` 원본 + HUB publish |
| 공급자 매장용 설명서 | `modules/neture/controllers/supplier-store-description.controller.ts` | SPD draft/needs_review |
| 운영자 SPD 검수 | `modules/neture/controllers/operator-supplier-store-description-review.controller.ts` | → canonical |

### 2.3 테이블

| 테이블 | 역할 | 경계 |
|--------|------|------|
| `kpa_store_contents` | **매장 콘텐츠**(legacy physical name, 논리명 = Store Production Material). snapshot 사본 + direct 작성 + O4O 설명서 가져온 사본 | `organization_id` |
| `kpa_store_content_product_links` | 콘텐츠 ↔ 취급제품(listing/local) 연결 (1건 유지) | `organization_id` |
| `store_execution_assets` | **자료함 "자료"** (file / content / external-link) | `organization_id` |
| `store_qr_codes` | QR (slug 전역 unique, soft delete) | `organization_id` |
| `store_qr_scan_events` | 스캔 이벤트 | `organization_id` |
| `store_tablets` | **코너 ≡ 태블릿(1:1)**. `current_screen_set_id` = 현재 표시 | `organization_id` |
| `store_tablet_screen_sets` | 화면 세트. `origin ∈ {store, operator, supplier}` · `status` · `public_qr_slug` · `hub_target_store_type` | `organization_id`(store) / `supplier_id`(supplier) |
| `store_tablet_screen_blocks` | 세트 내 블록(`block_type`, `sort_order`, `config`) | 부모 세트 |
| `store_tablet_corner_contents` | 코너 × 세트 다대다(선택 가능 목록) | `organization_id` |
| `store_tablet_displays` | legacy 코너 진열(상품, `product_type` 판별자) | `organization_id` |
| `store_pops` | POP (`author_role ∈ {operator, store}`) | `(store_id, service_key)` |
| `store_asset_derivations` | 원본→파생 provenance (FK 없음) | `(service_key, organization_id)` |
| `shared_product_descriptions` (SPD) | **O4O 표준 매장용 설명서**. `description_type='STORE'`, `status='canonical'` | 플랫폼 공용(org 게이트 없음) |
| `store_local_products` | 매장 자체 상품 (+ `detail_html` = 매장 소유 상품 설명) | `organization_id` |
| `organization_product_listings` | O4O 취급 제품(listing) | `organization_id` |

---

## 3. 매장 자료함 / 콘텐츠 목록 구조

### 3.1 두 축이 분리돼 있다

사이드바 `약국 자료함` = **콘텐츠**(`/store/library/contents`) + **자료**(`/store/library/resources`). 서로 다른 테이블이다.

```
route:      /store/library/contents
component:  StoreLibraryContentsPage → StoreContentsSelector (mode='page')
API:        GET /store-library/contents?page&limit&search&type=document&source&tag
table:      kpa_store_contents (source_type='direct') ⊎ o4o_asset_snapshots (UNION ALL)
주요 필드:   id, origin('snapshot'|'direct'), selectionKey, assetType('cms'|'content'|null),
            title, contentJson, createdAt, lifecycleStatus, tags, hasSourceUpdate
원본 연결:   source_metadata JSONB — { copiedFrom, sourceRefId, masterId, copiedAt }
```

```
route:      /store/library/resources
component:  StoreLibraryResourcesPage
API:        GET/POST/PUT/DELETE /store/library  (store-library.service.ts)
table:      store_execution_assets
주요 필드:   assetType('file'|'content'|'external-link'), fileUrl, htmlContent, url,
            category, sourceType('uploaded'|'generated'), isActive
삭제 정책:   soft delete(is_active=false). **QR 이 참조 중이면 409 QR_REFERENCE_EXISTS** 로 차단
```

### 3.2 매장 사본의 PK · 원본 연결

- **매장 사본 PK** = 사본 자신의 UUID (`kpa_store_contents.id` 또는 `store_execution_assets.id`). 원본 id 를 PK 로 쓰지 않는다.
- **원본 SPD id 보존** = `kpa_store_contents.source_metadata->>'sourceRefId'`. **FK 아님**(문자열 soft-ref).
- **`source_metadata` 구조** (O4O 설명서 가져오기 시):
  ```json
  { "copiedFrom": "o4o_b2c_product_description",
    "sourceRefId": "<SPD uuid>", "masterId": "<uuid>", "copiedAt": "ISO" }
  ```
- **provenance 별도 원장** = `store_asset_derivations` (source_kind: `content_hub`, `operator_screen_set`, `supplier_screen_set`, `store_local_product`, `store_execution_asset`, … / derived_kind: `qr_code`, `pop_pdf`, `blog_post`, `screen_set`, `store_execution_asset`, …). best-effort 기록이며 FK·연쇄삭제 없음.

### 3.3 `원본 갱신 배지` 구현 위치

`store-library-feed.controller.ts:287-318` — 사본의 `sourceRefId` 로 원본 SPD 의 `(master_id, description_type, language)` 를 읽고, **같은 키의 현재 `status='canonical'`** 행 id 와 비교. 다르면 `hasSourceUpdate=true`.
프론트 배지: `StoreContentsSelector.tsx:471-480` (`원본 갱신됨`, amber). 옆에 **사용처 요약**(QR/태블릿/취급제품/POP) 을 lazy 조회해 함께 표시(`:481-486`).

### 3.4 공급자 자료와의 연결 가능성

| 자료함 축 | 공급자 자료 유입 경로 | 상태 |
|-----------|----------------------|------|
| 콘텐츠(`kpa_store_contents`) | 공급자 SPD → 운영자 검수 → canonical → 매장이 `import-b2c-description` 으로 복사 | **LIVE (간접)** |
| 자료(`store_execution_assets`) | 공급자 직접 경로 **없음**. content_hub(운영자) 사본만 유입 | 미연결 |
| Screen Set | 공급자 원본 → HUB → 매장 독립 사본 | **LIVE (직접)** |
| Signage | 공급자 publish → HUB → 매장 Full Copy | **LIVE (직접, 상품 분류 가드 없음 — 확정 정책)** |
| POP / 블로그 / QR 템플릿 / 동영상 | 운영자 전용(`operator_*`). 공급자 축 없음 | 미연결 |

---

## 4. 매장용 상품 설명서 가져오기 흐름

### 4.1 "상품 설명서"는 이름이 같은 **두 개**다 (혼동 주의)

| 구분 | 실체 | 저장 위치 | 화면 |
|------|------|-----------|------|
| **A. O4O 표준 매장용 설명서 (SPD)** | 플랫폼 canonical, 다국어 | `shared_product_descriptions` (`description_type='STORE'`, `status='canonical'`) | 매장은 **읽거나 사본으로 가져옴** |
| **B. 매장 자체 상품 설명** | 매장이 직접 쓰는 자체 상품 본문 | `store_local_products.detail_html` | `/store/marketing/product-descriptions` (`StoreProductDescriptionsPage`) |

> **주의:** 사이드바 `약국 경영지원 > 상품 설명` 은 **B(자체 상품)** 전용이다. `StoreProductDescriptionsPage.tsx:17-23` 이 명시 — `product_ai_contents` 를 매장 저장소로 쓰던 구조를 제거하고 canonical 을 `store_local_products.detail_html` 로 고정했다. **A(SPD)는 이 화면에 없다.**

### 4.2 A(SPD) 를 매장이 발견하는 3개 지점

1. **매장 경영활용 제품 화면** (`/store/handled-products`) — listing 선택 → `GET /store-contents/b2c-descriptions?listingId=` → 해당 master 의 STORE canonical 목록 **본문 포함** 반환(`store-content.controller.ts:342-369`). 정책상 **복사 없이 직접 읽어 표시**(읽기 전용 뷰어 `StoreDescriptionViewModal`).
2. **태블릿 콘텐츠 picker** — `GET /store/tablet-content-sources/o4o-descriptions?q=` (`store-tablet.routes.ts:2086-2111`). STORE canonical 이 있는 ProductMaster 검색(상품명/바코드), 언어 배열 포함. **org 게이트 없음**(플랫폼 공용 표준 콘텐츠).
3. **매장 HUB 다국어 상품 콘텐츠** (`/store-hub/multilingual-product-contents`) — 운영자 발행 다국어 안내를 내 매장 상품에 연결.

### 4.3 가져오기(복사) 계약

```
API:   POST /store-contents/import-b2c-description  { listingId, descriptionId }
권한:  isStoreOwner(userId, 'kpa') — 매장 경영자(kpa:store_owner)만 (403 STORE_OWNER_REQUIRED)
검증:  org → listing 소유 → master_id → SPD(status='canonical', deleted_at IS NULL) 관계를 서버가 재검증
저장:  단일 트랜잭션
       INSERT kpa_store_contents (source_type='direct', snapshot_id=NULL,
              content_json={html,summary,sourceResources:[],generatedBy:'o4o-b2c-import'},
              source_metadata={copiedFrom,sourceRefId,masterId,copiedAt},
              author_role='operator', visibility_scope='organization', workspace_status='draft')
       INSERT kpa_store_content_product_links (listing 링크, ON CONFLICT DO NOTHING)
반복:  **매 호출마다 새 사본**. 덮어쓰지 않고 차단하지도 않는다
       (WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1 관례)
```

가져온 사본은 `kpa_store_contents` 에 들어가므로 **QR(page 참조) · 태블릿 content_list · POP 제작 · 인쇄 PDF 대상**으로 전부 선택 가능하다.

### 4.4 원본 교체 정책 — **자동 반영 없음** (확정)

| 질문 | 답 | 근거 |
|------|---|------|
| 원본 canonical 교체 시 매장 사본이 자동 변경되는가? | **아니다.** 본문 무변경 | `store-library-feed.controller.ts:291` "자동 갱신 없음(사본 본문 무변경) — 표시 전용" |
| `원본 갱신됨` 배지만 뜨는가? | 그렇다 (+ 사용처 요약) | `StoreContentsSelector.tsx:471-486` |
| 매장 경영자가 명시적으로 다시 가져와야 하는가? | 그렇다. `POST /store-contents/:id/reimport-source` | `store-content.controller.ts:492-503` |
| 재가져오기가 기존 사본을 덮어쓰는가? | **아니다.** 기존 사본(본문·QR·태블릿 연결) 불변, **새 사본 D 생성** | 같은 곳 §V1 정책 |
| 이미 최신이면? | `mode='already_latest'` no-op | 프론트 `handleReimport` |

---

## 5. QR-code 흐름

### 5.1 route / API

| 목적 | Frontend | Backend |
|------|----------|---------|
| 목록·생성·수정·삭제 | `/store/marketing/qr` (`StoreQRPage`) | `GET/POST/PUT/DELETE /kpa/store/qr-codes` → `store-qr.service.ts` |
| 스캔 통계 | 행 확장 | `GET .../qr-codes/:id/analytics` |
| 출력(이미지·PDF·일괄) | 툴바 | `.../qr-codes/:id/{image,pdf}` · `POST /pharmacy/qr/print` |
| 운영자 QR 템플릿 가져오기 | `/store-hub/qr` (`HubQrLibraryPage`) | `importOperatorQr(slug, sourceId)` → `operator_qr_templates` → `store_qr_codes` 변환 INSERT |
| 공개 랜딩 | `/qr/{slug}` | `GET /kpa/qr/public/:slug` → `resolvePublicQrLanding()` |

### 5.2 landing type 6종과 대상 의미

| `landing_type` | `landing_target_id` 의미 | 참조 형태 |
|----------------|--------------------------|-----------|
| `product` | `supplier_product_offers.id` 또는 `organization_product_listings.id` | soft-ref(varchar) |
| `promotion` | 매장 프로모션 | soft-ref |
| `page` | 매장 소유 사본 — `kpa_store_contents.id`(direct) **또는** `library_item_id`(store_execution_assets) | soft-ref |
| `link` | 외부 절대 URL (블로그·다국어 콘텐츠 포함) | 문자열 |
| `video` | `store_videos.id` (매장 사본, `status='published'` 만 노출) | soft-ref |
| `screen_set` | `store_tablet_screen_sets.id` (`origin='store'` 만) | soft-ref |

> **FK 는 없다.** `landing_target_id` 는 varchar 이며(link QR 은 URL), 조인 시 `qs.id::text = qr.landing_target_id` 로 **uuid→text 방향 고정**한다(`store-screen-set-qr.service.ts:63-71`).
> 유일하게 실제 컬럼 참조를 갖는 건 `library_item_id`(→`store_execution_assets`)이며, 이 때문에 자료 삭제가 **409 로 차단**된다(§3.1).

### 5.3 QR 이 매장 사본만 가리키게 하는 강제 장치 (copy guard)

`createStoreQrCode()` 의 `page` 분기에서 `ensureStoreCopyForPageTarget()` 호출:

- `landingTargetId` 가 **운영자 content_hub 원본(`kpa_contents.id`)** 이면 → 본문을 `store_execution_assets(assetType='content')` 매장 사본으로 생성/재사용하고 `libraryItemId` 로 치환, `landingTargetId=null`.
- 이미 같은 원본에서 만든 사본이 있으면 `store_asset_derivations` 로 dedup 후 재사용.
- 매장 직접 콘텐츠(`kpa_store_contents`)·slug·비-UUID 는 그대로 통과.

→ **매장 QR 이 운영자 원본을 직접 참조하는 구조는 존재하지 않는다** (`WO-O4O-KPA-QR-TARGET-COPY-GUARD-V1`, A안).

### 5.4 QR 생성 시 콘텐츠 선택 UI

`StoreQRPage` → `StoreAssetSelectorModal` 이 소스 탭을 제공하고, 선택 결과(`LibrarySelectorResult.source`)에 따라 자동 분기(`StoreQRPage.tsx:373-433`):

| selector source | 저장 형태 |
|-----------------|-----------|
| `content-hub`(운영자 콘텐츠) | `landingType='page'`, `landingTargetId=content.id`, `libraryItemId` 미전송 → 백엔드가 사본 치환 |
| `direct-content`(매장 직접 콘텐츠) | `landingType='page'`, `landingTargetId=content.id` (inline 렌더) |
| `blog` / `mlc`(다국어) | `landingType='link'`, `landingTargetId=공개 URL` |
| `asset`(자료함 자료) | `autoLandingType(assetType)` + `libraryItemId=asset.id` |
| 동영상(`PharmacyVideoPage` 진입) | `landingType='video'` prefill |

**매장용 설명서 사본을 QR 대상으로 고를 수 있는가 → 그렇다.** 가져온 SPD 사본은 `kpa_store_contents(source_type='direct')` 이므로 `direct-content` 탭에 나타나고 `page` QR 로 연결된다.

### 5.5 코너 QR(screen_set) 의 이중 게이트

- 생성: `origin='store'` + 미삭제 + 미보관 세트만. **세트당 QR 1개**(partial unique). 이미 있으면 **재사용**(이름 변경 ≠ 주소 변경) 후 `public_qr_slug` 동기화.
- 공개 랜딩: `QR is_active` **AND** Screen Set 유효. 비활성 코너 QR = **410 `SCREEN_SET_INACTIVE`**(일반 QR 은 404).
- 보관 시: `setScreenSetQrActive(false)` 로 `is_active` 만 내리고 **slug·row 는 보존** → 복원하면 같은 주소로 부활.
- 판정 SSOT: `store-screen-set-qr.service.ts` 의 `QR_LANDABLE_CONDITION` / `ARCHIVED_SCREEN_SET_QR_CONDITION` / `screenSetQrPrintablePredicate()` 를 **목록·KPI·출력·랜딩 4곳이 공유**한다.

### 5.6 원본 갱신 배지가 QR 화면에도 필요한가

**구조적으로 필요하다(현재 없음).** QR `page` 대상이 SPD 사본이면 원본 canonical 이 교체돼도 QR 은 옛 사본을 계속 가리킨다. 자료함 목록에는 배지가 뜨지만 QR 목록에는 그 신호가 없다.
자료함 쪽에는 **사용처 요약**(이 사본이 QR/태블릿에서 쓰이는지)이 이미 있으므로 역방향(QR→원본 상태) 표시만 비어 있다. → **후속 WO 후보 (§11-F)**. 이번 IR 은 제안만 하고 구현하지 않는다.

---

## 6. 태블릿 흐름

### 6.1 모델

```
store_tablets 1 row  =  코너  ≡  태블릿   (1:1 동일 엔티티, UI 는 location||name 을 코너명으로 표시)
   ├ current_screen_set_id  → 현재 표시 화면 1개 (반드시 연결 목록 안에 있음 — 불변식)
   └ store_tablet_corner_contents (다대다) → 이 코너에서 고를 수 있는 화면 목록

store_tablet_screen_sets (origin='store'|'operator'|'supplier', status, template_key, public_qr_slug)
   └ store_tablet_screen_blocks (block_type, sort_order, is_visible, config JSONB)
```

**적용은 원자적이다** — `POST /tablets/:id/current-screen-set` 이 연결 INSERT(멱등, `ON CONFLICT DO NOTHING`) + `current_screen_set_id` UPDATE 를 한 트랜잭션으로 처리(`store-tablet.routes.ts:2127-2135`). 세트는 `origin='store'` + `status='active'` 여야 한다(아니면 409 `SCREEN_SET_NOT_ACTIVE`).

### 6.2 화면 탭 구조 (`/store/commerce/tablet-displays`)

| 탭 | 내용 |
|----|------|
| **코너별 운영**(기본) | 코너 카드 → `TabletCornerSwapModal` "화면 바꾸기" → 적용. `TabletCornerContentsPanel` 이 연결 목록 관리 |
| **태블릿 콘텐츠** | `TabletScreenSetManager` — 매장 소유 세트 라이브러리(가져온 사본 포함, '사용 가능 · 현재 미적용') |

진입 시 `location.state.tab / highlightScreenSetId / editScreenSetId` 로 초기 탭·하이라이트 제어(`StoreTabletDisplaysPage.tsx:110-131`).

### 6.3 block 종류와 `content_list` 참조 방식

`resolveScreenSetSections()` 이 처리하는 block:

| blockType | 처리 |
|-----------|------|
| `idle_media` | 태블릿 runtime 전용. **QR/모바일 경로에서는 생략**(대기화면은 무조작 태블릿 개념) |
| `product_list` | 명시 선택(`{source:'selected_products', products:[{productType,productId,qrCodeId}]}`) 우선. **QR 경로는 선택된 상품만, 없으면 0건**(매장 전체 폴백 금지) |
| `product_content` | `{productRef, contentId}` 그대로 전달 |
| `content_list` | **ContentSourceAdapter** 위임 — `o4o:{masterId}:{lang}`(SPD STORE canonical) 또는 `store:{contentId}`(kpa_store_contents) |
| `qr_guide` | URL 은 config 가 아니라 **`public_qr_slug` 로 서버 도출**. slug 없으면 빈 문자열 |
| 기타 static | `shapeStaticBlock()` |

`content_list` 의 `contentId` 구조 = `store:{kpa_store_contents.id}` / `o4o:{product_masters.id}:{language}`. adapter 가 미존재·타 org·`workspace_status='archived'` 를 null 로 걸러 카드 자체를 skip 한다.

### 6.4 관리 UI 화면 세트 vs 실제 고객 화면 소비

| 경로 | 입력 | 특징 |
|------|------|------|
| 공개 태블릿 runtime `GET /:slug/tablet/screen` | `tabletContext` **있음** | idle 완전 resolve, 상품 = 코너 진열(`store_tablet_displays`, `configured=true`) 기준 |
| 코너 QR `GET /kpa/qr/public/:slug` | `tabletContext` **없음** | idle 생략, 상품 = **명시 선택만**, 내부 Screen Set UUID 를 프론트에 노출하지 않음(`landingTargetId=null` 처리) |
| draft preview `POST /screen-sets/preview` | 미저장 blocks | 같은 헬퍼 공유(별도 판정 로직 복제 없음) |

즉 **관리 UI 의 Screen Set 이 곧 공개 소비 대상**이다. legacy `store_tablet_displays` 는 상품 진열(태블릿 runtime 전용)으로만 남아 있고, 세트가 없으면 legacy 로 폴백한다.

### 6.5 매장 콘텐츠 사본 → 태블릿 연결 방식

`content_list` block 의 `config.items[].contentId = "store:{uuid}"`. **복사가 아니라 참조**다 — 사본 본문을 수정하면 태블릿 표시도 즉시 바뀐다(자료함 사본이 SSOT).

### 6.6 공급자가 태블릿에 직접 배포하면 안 되는 이유 (코드 근거)

`supplier-screen-set.controller.ts:33` — 공급자 API 의 **차단 목록이 문서화·구현돼 있다**:

> `차단: 매장·코너 직접 적용 / current 지정 / 공개 타블렛 URL / Screen Set QR 생성 / 매장 제작 콘텐츠 조회`

추가 강제:
- `createSupplierContentSourceAdapter().fetchStoreContent()` → **항상 null** (매장 제작 콘텐츠 조회 불가).
- 공개 resolver 는 `origin='store'` 만 통과 → 공급자 원본은 공개 URL·QR 을 **가질 수 없다**.
- `ensureScreenSetQr()` 도 `origin='store'` 게이트 → 공급자 원본에 QR 미발급.
- HUB 노출은 `hub_target_store_type`(pharmacy/non_pharmacy/all) **매장 유형 단위**이며 특정 매장 지정 불가 — 3자 Flow 원칙과 일치.
- 비약국 매장에는 의약품 포함 세트가 목록·상세·가져오기 **3단계 모두에서** 재검사돼 차단(`MEDICATION_PHARMACY_ONLY`).

→ 공급자는 **"매장이 가져다 쓸 수 있는 화면 원본을 만들어 게시"** 하는 데까지만 권한이 있고, 그 이후는 전부 매장 경영자 행위다.

---

## 7. POP / 기타 매장 자료 흐름

| 항목 | 내용 |
|------|------|
| POP 생성 | `/store/marketing/pop`(`StorePopPage`) · `/store/commerce/products/:productId/pop`(`ProductPopBuilderPage`) · 자료함 선택 → `StartProductionModal` |
| 매장 POP 사본 관리 | `/store/content/pop`(`PharmacyPopPage`) — 운영자 HUB 에서 가져온 사본 수정 |
| HUB 가져오기 | `/store-hub/pop`(`HubPopLibraryPage`) → `store_pops(author_role='operator')` 원본을 **값 복사**로 `author_role='store'`, `status='draft'`, 새 id 로 INSERT. 출처는 `excerpt` 접두어 `[운영자 자료 가져옴]` 로만 표시(스키마 무변경) |
| 경계 | `(store_id, service_key)` 복합. 운영자 원본은 store service 의 조회·수정·삭제 경로에 **절대 걸리지 않는다**(import 의 source 로만 읽음) |
| `store_asset_derivations` 사용 | **사용한다.** `source_kind ∈ {content_snapshot, content_direct, library_resource, production_material, store_execution_asset, content_hub, operator_screen_set, supplier_screen_set, store_local_product}` → `derived_kind ∈ {pop_pdf, qr_code, blog_post, signage_item, signage_playlist, store_execution_asset, screen_set}` |
| POP PDF 와 원본 갱신 | **관계 없음.** PDF 는 생성 시점 스냅샷이며 원본 변경을 추적하지 않는다. 자료함의 `원본 갱신됨` 사용처 요약에 POP 이 집계될 뿐 |

### 7.1 판단

- **공급자 자료가 POP 로 활용될 수 있는가** → 간접적으로 가능하다. 공급자 SPD → 매장이 사본으로 가져옴 → 그 사본을 소스로 POP 제작. **공급자 POP 직접 발행 경로는 없다**(`operator_*` 축만 존재).
- **공급자 대시보드에 POP 를 메뉴로 둘 필요가 있는가** → **없다.** POP 은 매장의 인쇄·게시 실행 자산이며 공급자 산출물의 소비 채널일 뿐이다. "매장 활용 가능 채널"로만 안내하는 것이 맞다.

---

## 8. 권한 경계

### 8.1 가드 지형

| 계층 | 가드 | 대상 |
|------|------|------|
| 매장 API 전반 | `createRequireStoreOwner(dataSource)` → `withStoreAuth(handler(req,res,organizationId))` | `store-tablet.routes.ts` 44개 endpoint 전부 |
| 매장 콘텐츠 write | `isStoreOwner(userId,'kpa')` (403 `STORE_OWNER_REQUIRED`) | `store-content.controller.ts` |
| 공급자 API | `requireActiveSupplier` / `requireLinkedSupplier` (ACTIVE `neture_suppliers` 구성원, 자기 원본만) | `supplier-*` controllers |
| 콘텐츠 원본 조회 | ContentSourceAdapter 3종 — Store(전체) / Operator(store 차단) / Supplier(store 차단) | `content_list` 해석 |
| 매장 유형 게이트 | `hub_target_store_type` + `analyzeScreenSetMedication` | 공급자 HUB 노출 |

### 8.2 구분표

**공급자에게 보여줄 것 (제공자 역할)**

- 매장용 상품 설명서 작성·다국어(ko/en/zh/ja)·검수 요청·철회 — `shared_product_descriptions` (`source_type='supplier'`, `created_by_supplier_id`)
- 매장 활용 태블릿 화면 원본 제작(Screen Set) + HUB 게시/해제/보관 — 대상은 **매장 유형**(약국/비약국/전체)까지
- 사이니지 원본 제작 + HUB 게시
- 제품 콘텐츠(B2B offer 의 `businessShort/DetailDescription`)
- 검수 상태 확인(draft / needs_review / revision_requested / canonical / hidden)
- 승인된 자료 확인, 수정 요청 대응, 새 버전 제출
- **매장에서 활용 가능한 채널 안내** (읽기 전용 설명 — QR/태블릿/자료함/POP)

**공급자에게 숨길 것 (매장 권한 — 코드로 이미 차단)**

| 기능 | 차단 근거 |
|------|-----------|
| QR 생성 · 연결 변경 · 출력 | `withStoreAuth` / `ensureScreenSetQr` 의 `origin='store'` 게이트 |
| 태블릿 화면 세트 코너 적용 · current 지정 | `supplier-screen-set.controller.ts:33` 명시 차단 |
| 코너별 운영 · 코너 진열(`store_tablet_displays`) | `withStoreAuth` |
| 매장 콘텐츠 사본 조회·수정·덮어쓰기 | `createSupplierContentSourceAdapter().fetchStoreContent() → null` |
| 매장 자료함 콘텐츠 삭제 | `withStoreAuth` + org 경계 |
| 매장 public runtime 설정 · 공개 태블릿 URL | 공개 resolver `origin='store'` |
| 매장 POP 직접 발행 | `store_pops` author_role 축에 supplier 없음 |
| 특정 매장 지정 배포 | HUB 대상은 매장 **유형**만 |

**운영자에게만 필요한 것**

- 공급자 SPD 검수 → `status='canonical'` 승격 / revision_requested 반려
- 운영자 Screen Set 원본(`origin='operator'`, `status='operator_template'`) 제작·HUB 게시
- 운영자 QR/POP/블로그/동영상/콘텐츠 템플릿 게시(`operator_*` 테이블)
- 다국어 상품 콘텐츠 발행
- 공급자 승인·품질 콘솔

**매장 경영자에게만 필요한 것**

- HUB 가져오기(모든 축) · 사본 편집 · 재가져오기 결정
- QR 전 생애주기(생성·연결·수정·출력·비활성)
- 태블릿 코너 구성·화면 적용·상품 선택·언어 선택
- 자료함 정리(콘텐츠/자료 삭제·비활성)
- POP/블로그/사이니지 실행 자산 발행
- 매장 자체 상품 및 그 설명(`store_local_products.detail_html`)

---

## 9. 공급자 대시보드 IA 에 주는 시사점

1. **공급자 산출물의 소비 채널은 이미 3개 다 살아 있다.** IA 는 "새 기능 배치"가 아니라 **"이미 있는 3개 제공 경로를 하나의 그룹으로 묶어 상태를 보여주는 일"** 이다.
2. **"게시했는데 그 다음은?" 이 유일한 실질 갭이다.** 독립 사본 설계상 어느 매장이 가져갔는지 공급자는 알 수 없다(`IR-O4O-SUPPLIER-SCREEN-SET-TO-TABLET-END-TO-END-FLOW-AUDIT-V1 §5`). 집계 수준(가져간 매장 수·게시 대상 유형)까지는 `store_asset_derivations` 로 **조회 가능**하지만, 매장 식별 노출은 신중해야 한다.
3. **QR·태블릿을 메뉴로 두면 사용자 기대가 어긋난다.** 공급자는 QR 을 만들 수도, 코너에 적용할 수도 없다(코드로 차단). 메뉴로 노출하면 클릭 → 403/빈 화면이 되어 `SupplierSupplyOffersPage` 와 같은 dead-end 를 하나 더 만든다.
4. **현재 공급자 사이드바(`SupplierSpaceLayout.tsx:51-115`)는 이미 정답에 가깝다.** `콘텐츠` 그룹 = 제품 콘텐츠 / 매장용 설명서 / 태블릿 / 디지털 사이니지. 문제는 **그룹 이름이 "콘텐츠"** 라 "매장 제공 자료"라는 의미가 드러나지 않고, **검수 상태가 화면마다 흩어져** 있다는 점이다.
5. **"매장용 설명서" 라는 단어가 매장 쪽에서 다른 뜻으로 쓰인다**(§4.1). 공급자 IA 에서는 `O4O 표준 상품 설명서` 처럼 축을 드러내는 라벨이 혼동을 줄인다.
6. **load-error silent swallow 가 `SupplierStoreDescriptionsPage` 에 남아 있다**(선행 IR §13-C). "실패 = 0건" 오인이 공급자 신뢰를 직접 깎는 지점이므로 IA 정비와 함께 다뤄야 한다.

---

## 10. 공급자 대시보드 1차 메뉴 제안

요청서 초안을 조사 결과에 맞춰 조정한 안이다. **구현하지 않는다.**

```
공급자 대시보드
├─ 홈 (대시보드)                                    /supplier/dashboard      [기존 canonical]
├─ 상품                                                                       [기존 유지]
│  ├─ 상품 목록 · 상품 등록 · 대량 등록 · 등록 도우미
├─ 매장 제공 자료                                    ← 기존 '콘텐츠' 그룹 개칭
│  ├─ 매장용 상품 설명서   /supplier/store-descriptions      [SPD STORE · 다국어]
│  ├─ 태블릿 화면          /supplier/tablet-screen-sets      [Screen Set 원본 + HUB 게시]
│  ├─ 사이니지             /supplier/signage                 [HUB 게시]
│  ├─ 제품 콘텐츠          /supplier/b2b-content             [B2B offer 설명 — 성격 다름, 유지]
│  └─ 검수·게시 현황       (신규 통합 뷰 — 후속 WO)
├─ 유통 / 주문·정산 / 커뮤니티                                                [기존 유지]
└─ 공급자 정보             /mypage/business-profile          [기존 유지]
```

### 10.1 QR·태블릿 배치의 표현 방식

메뉴가 아니라 **각 자료 화면의 안내 문구 + 상태 배지**로 표현한다.

```
이 자료는 매장이 QR · 태블릿 · 매장 자료함에서 활용할 수 있습니다.
실제 적용 여부는 매장 경영자가 선택합니다.
```

배지 예: `게시됨 · 대상: 약국` / `검수 대기` / `승인됨(canonical)` / `보완 요청`.

### 10.2 이번 IA 에서 만들지 말아야 할 것

- QR 메뉴 / 태블릿 코너 배치 화면 / 매장 자료함 열람 / 특정 매장 지정 배포 / 매장별 사용 현황 상세.

---

## 11. 구현 전에 결정해야 할 사항

| # | 결정 사항 | 선택지 | 비고 |
|:-:|-----------|--------|------|
| A | **공급자 피드백 범위** | ① 게시 상태만 ② + 가져간 매장 **수**(집계) ③ + 매장 식별 | ②는 `store_asset_derivations` 로 즉시 가능. ③은 독립 사본 설계·매장 프라이버시와 충돌 |
| B | **"매장용 설명서" 라벨** | 현행 유지 / `O4O 표준 상품 설명서` 로 개칭 | 매장 쪽 동명 메뉴(자체 상품 설명)와 혼동(§4.1) |
| C | **`검수·게시 현황` 통합 뷰 신설 여부** | 신설 / 각 화면 배지로 분산 유지 | 신설 시 SPD·ScreenSet·Signage 3축 상태 스키마 통일 필요 |
| D | **그룹명 `콘텐츠` → `매장 제공 자료`** | 개칭 / 유지 | `SupplierSpaceLayout` 은 web-neture 전용이라 공용 모듈 미접촉 |
| E | ~~**Signage HUB 게시의 대상 셀렉터·의약품 가드 부재**~~ | **종결 (2026-08-09)** | **가드 도입하지 않음으로 확정.** Signage 는 ProductMaster 를 구조적으로 참조하지 않는 단순 콘텐츠 자료라 상품 분류 가드의 대상이 아니다. 자기신고 방식도 미채택(공급자에게 적합성 판단을 지우므로). → `CHECK-O4O-SUPPLIER-SIGNAGE-HUB-TARGET-AND-MEDICATION-GUARD-ALIGN-V1 §0-A` |
| F | **QR 화면의 `원본 갱신됨` 신호** | 추가 / 자료함에만 유지 | 매장 측 개선이며 공급자 IA 와 별개(§5.6) |

---

## 12. 후속 WO 후보

| ID | 제목(가칭) | 범위 | 등급 |
|----|-----------|------|:---:|
| WO-1 | **공급자 대시보드 IA 정비 — '매장 제공 자료' 그룹화 + 활용 채널 안내 문구** | web-neture 프론트 한정. 라우트·API·DB 무변경 | P2 |
| WO-2 | **공급자 검수·게시 현황 통합 뷰** | SPD/ScreenSet/Signage 3축 상태 집계(read-only). A·C 결정 선행 | P2 |
| ~~WO-3~~ | ~~**Signage HUB 게시 대상·의약품 가드 정합**~~ | **CANCEL / 정책상 미진행 (2026-08-09).** 안전 결함이 아니라 자료 유형 차이였다 — §11-E 참조 | — |
| WO-4 | **`SupplierStoreDescriptionsPage` load-error 계약 표준화** | silent swallow → throw+재시도 | P2 |
| WO-5 | **매장 QR 목록 `원본 갱신됨` 신호 노출** | KPA 매장 프론트 + 목록 API additive 필드 | P3 |
| WO-6 | **매장 태블릿 last-mile UX**(D-1 탭 단절 등) | 선행 IR §8 에서 이미 제안된 건 — 중복 착수 주의 | P3 |

> **2026-08-09 정정:** WO-3 은 분리 보고 후 조사 결과 **안전 결함이 아님**이 확인되어 CANCEL 됐다.
> 근거·확정 정책은 `docs/checks/CHECK-O4O-SUPPLIER-SIGNAGE-HUB-TARGET-AND-MEDICATION-GUARD-ALIGN-V1 §0-A`.
> 확정 축: `SPD=상품 기준 검수 가능` / `Screen Set=상품 블록 있으면 의약품 가드` / `Signage=단순 콘텐츠, 상품 분류 가드 없음` / `활용 판단=매장 경영자`.

---

## 13. 변경 없음 선언

```
코드 변경 0 · DB write 0 · migration 0 · 배포 0 · UI 변경 0 · 기능 추가 0 · 리팩터링 0
git 변경 = 본 IR 문서 1개(문서만)
```

조사 방법: `git pull origin main`(clean tree) 후 정적 코드 정독(Read/Grep). 프로덕션 DB·브라우저 접근 없음.

---

*판정: 매장 측 QR/태블릿/자료함/설명서 흐름 설명 가능 · 공급자 제공/차단 경계 코드 근거로 확정 · 공급자 대시보드 IA WO 작성 가능*
