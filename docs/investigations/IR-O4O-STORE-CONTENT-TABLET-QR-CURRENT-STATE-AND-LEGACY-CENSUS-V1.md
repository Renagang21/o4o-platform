# IR-O4O-STORE-CONTENT-TABLET-QR-CURRENT-STATE-AND-LEGACY-CENSUS-V1

> **성격**: READ-ONLY investigation. 코드 · DB · migration · runtime 변경 **0**.
> **기준**: `origin/main` = `8e41598ca` (2026-09-08) 실제 소스 정적 조사.
> **근거 WO**: `WO-O4O-STORE-CONTENT-TABLET-QR-CANONICAL-BASELINE-AND-LEGACY-CENSUS-V1` §B~§D
> **정본(자매 문서)**: [`O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1`](../baseline/O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1.md)

## 0. 판정 어휘 (§C)

| 판정 | 의미 |
|---|---|
| `CANONICAL_KEEP` | 현재 정본. 유지. |
| `CANONICAL_NEEDS_ALIGNMENT` | 정본 축이지만 계약이 어긋나 정렬 필요. |
| `DUPLICATED_TO_COMMONIZE` | 같은 목적의 구현이 서비스별로 중복. 공통화 대상. |
| `LEGACY_INTERMEDIATE` | 세대 교체 중간 산물. 아직 살아 있으나 정본 아님. |
| `LEGACY_COMMERCE` | 소비자 commerce 잔재. |
| `DEAD` | 코드는 있으나 실행 경로에서 결과를 내지 못함. |
| `UNKNOWN` | 근거 부족. **임의 삭제·복구 금지.** |

---

## 1. 축 1 — Product / Description

| 대상 | 위치 | 판정 | 근거 |
|---|---|:---:|---|
| `ProductMaster` | `product_masters` | `CANONICAL_KEEP` | 상품 SSOT. F12 불변식 ⑥(역방향 FK 없음) 유지 중. |
| `shared_product_descriptions` (SPD) | `20261223000000-AddDescriptionTypeToSharedProductDescriptions.ts` | `CANONICAL_KEEP` | `description_type VARCHAR(32) NOT NULL DEFAULT 'STORE'`; canonical unique = `(master_id, description_type) WHERE status='canonical' AND deleted_at IS NULL`; 중복 존재 시 migration abort guard 포함. |
| `description_type` 3종 (`STORE`/`B2C`/`B2B`) | 동일 | `CANONICAL_KEEP` | 리터럴 실측(`routes/o4o-store` + `modules`): `'STORE'` 41 · `'B2C'` 13 · `'B2B'` 3. STORE 가 매장 축 정본임이 사용량으로도 확인. |
| STORE 설명서 공개 resolve | `store-public-tablet-content-resolve.ts` | `CANONICAL_KEEP` | `description_type='STORE'` + `status='canonical'` + 언어→`ko` fallback, `RESOLVE_LIMIT=50`. 정본 §2 2순위 계약의 **유일한 서버측 구현**. |
| `kpa_store_contents` (Store Production Material) | `routes/kpa/entities/kpa-store-content.entity.ts` | `CANONICAL_KEEP` (물리명은 legacy) | 4서비스 공용 원장. KPA · PharmacyHub · POP · 자료함 · QR 이 모두 소비(controller 실측 20+ 파일). 물리 table name 만 legacy prefix — [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) 판정 유지. |
| `kpa_store_content_product_links` | `20261128000000-CreateKpaStoreContentProductLinks.ts` | `CANONICAL_KEEP` | 정본 §2 **1순위(매장 선택 콘텐츠 x 상품 연결)** 의 저장 축. |
| `store_product_description_selections` | migration 에만 존재 | `DEAD` | 코드 전수 검색 결과 migration 외 참조 **0건**. 선택저장 방식이 revert 된 잔재(WO-STORE-HANDLED-PRODUCT-ACTION-FLOW-REVERT). **삭제는 이번 회차 범위 아님.** |
| `store_execution_assets` | `store-execution-assets.controller.ts` · entity | `CANONICAL_KEEP` | 매장 실행자산 원장. `usage_type`(pop/qr/signage/banner/notice) 보유 — §D-⑪ 참조. |
| `o4o_asset_snapshots` / asset-copy-core | `asset-snapshot.controller.ts`(98L) | `CANONICAL_KEEP` | 가져오기=사본 primitive. assetType = cms/signage/lesson/content/resource/blog. **단 `blog` 는 resolver 가 항상 null 반환하는 placeholder** → 해당 assetType 만 `DEAD`(주석에 명시). |
| `store_multilingual_product_content_groups/_pages` | `20260621010000-...` | `CANONICAL_KEEP` | 다국어 상품 콘텐츠. UNIQUE `(organization_id, target_kind, target_id, content_key)` · `(group_id, locale)`. |

---

## 2. 축 2 — Tablet

### 2-1. 세 세대가 동시에 살아 있다

```text
1세대  store_tablet_displays          진열 row + content_id 직접 선택
2세대  store_tablet_screen_sets/_blocks + store_tablets.current_screen_set_id
3세대  store_tablet_corner_contents   코너 x 콘텐츠 다중 연결
```

| 대상 | 판정 | 근거 |
|---|:---:|---|
| `store_tablets` | `CANONICAL_KEEP` | 매장 태블릿 원장. |
| `store_tablets.current_screen_set_id` | `CANONICAL_KEEP` | `20270120000000` migration 주석: "**NULL = legacy 경로**", FK SET NULL = "세트 삭제 시 태블릿은 legacy 경로로 복귀". 정본 축임을 migration 자체가 명시. |
| `store_tablet_screen_sets` / `_blocks` | `CANONICAL_KEEP` | 저작(§4-A) 정본. `origin` CHECK `('store','operator')` (+후속 supplier), status `draft/active/archived/operator_template`. |
| `store_tablet_corner_contents` | `CANONICAL_KEEP` | 코너 x 콘텐츠 다중 연결(§4-B 운영 축). |
| `store_tablet_displays` (진열 row) | `LEGACY_INTERMEDIATE` | 삭제 불가 — `product_list` 블록 resolve 가 tablet context 에서 여전히 이 테이블로 "코너 진열"을 판정한다(`store-public-screen-set-resolve.ts` → `queryTabletVisibleProducts(..., { firstTabletId, configured })`). |
| `store_tablet_displays.content_id` | `LEGACY_INTERMEDIATE` | `20261129000000-AddContentIdToStoreTabletDisplays.ts`. 진열별 콘텐츠 직접 선택 = 2세대 `content_list` 블록과 **같은 목적의 이전 세대**. |
| `resolveTabletDisplaySource()` `first_active` fallback | `LEGACY_INTERMEDIATE` | `store-public-utils.ts`: `SELECT id FROM store_tablets WHERE organization_id=$1 AND is_active=true ORDER BY created_at ASC LIMIT 1`. 코너별 운영·`current_screen_set_id` 도입 이후에도 생존. |
| `idle_playlist_items` (store_tablets) | `CANONICAL_NEEDS_ALIGNMENT` | `store-public-tablet.handler.ts` `/:slug/tablet/idle` 가 **이중 읽기**: `current_screen_set_id` → `idle_media` 블록 config override, 없으면 legacy `idle_playlist_items` + 운영자 공통 prepend. 두 경로가 공존. |
| 블록 타입 `content_list` | `CANONICAL_KEEP` | `20270206000000` additive. `ContentSourceAdapter` seam 으로 SPD/`kpa_store_contents` 를 **서버에서 resolve** — 정본 §1-3-③ 을 이미 구현. |
| 블록 타입 `product_content` | **`DEAD`** | ① `AUTO_BLOCK_TYPES`(screen-content-core) 5종에 **미포함** → 편집기가 만들지 않음 ② `@o4o/tablet-screen-set-editor`(1639L) 에 처리 코드 **0** ③ resolver 는 `{ productRef, contentId }` 참조만 passthrough ④ 뷰어(`PublicScreenSetViewer.tsx:187-205`)는 본문 없으면 `return null`. 형제 파일 주석이 이를 "**product_content 의 dormant 실패**"라 스스로 기록. |
| 블록 타입 `product_list` | `CANONICAL_NEEDS_ALIGNMENT` | 정본 계약(§2 1순위→2순위)과 무관하게 1세대 진열 테이블에 의존. |
| `@o4o/screen-content-core` | `CANONICAL_KEEP` | 순수 계약(248L). 8 블록 타입 · `SelectedProductRef` · `ContentListItem`. |
| `@o4o/tablet-screen-set-editor` | `CANONICAL_KEEP` | 1639L. 소비처 = web-kpa-society(5 페이지) · web-neture(공급자) · web-pharmacy-hub. |
| `@o4o/tablet-kiosk-core` | `CANONICAL_KEEP` | `TabletKioskPage.tsx` 2385L · `IdlePlaylistEditor` 985L 등. |
| `store-tablet.routes.ts` 공통 라우터 | `CANONICAL_KEEP` | 2425L / 44 endpoint. `createStoreTabletRoutes(ds, { resolveOrganizationId, qrServiceKey, operatorTemplateServiceKey })` 주입형. **PharmacyHub 가 이미 이것을 마운트**(백엔드 parity 달성). |

### 2-2. 프론트 두께 (§D-⑥ 실측)

| 서비스 | Tablet 화면 | 규모 |
|---|---|---|
| KPA-Society | `StoreTabletDisplaysPage.tsx` 1877L / 99KB, `TabletContentLibraryList` 39KB, `TabletCornerContentsPanel` 24KB, `TabletCornerSwapModal` 10KB, `TabletScreenSetManager` 286L, `HubScreenSetLibraryPage` 24KB, `TabletRequestsPage` 16KB | 3세대 전부 |
| PharmacyHub | `TabletsPage.tsx` 400L | 축소 모델 |
| K-Cosmetics | `StoreTabletDisplaysPage.tsx` + `TabletStorePage.tsx` + `tabletDisplayApi.ts` | 1세대 |
| GlycoPharm | `StoreTabletDisplaysPage.tsx` + `TabletLayout.tsx` + `api/tabletDisplays.ts` | 1세대 |

---

## 3. 축 3 — QR

| 대상 | 판정 | 근거 |
|---|:---:|---|
| `store_qr_codes` + `/qr/{slug}` | `CANONICAL_KEEP` | 매장 실행 QR 정본. 정본 §6-B. |
| `store_qr_scan_events` | `CANONICAL_KEEP` | 익명 스캔 이벤트(device_type/user_agent/referer/ip_hash). 개인 식별자 없음 — 정본 §8 부합. |
| `product_landings` + `/p/{public_key}` | `CANONICAL_KEEP` | ProductMaster 대표 랜딩. master 당 UNIQUE, `public_key` UNIQUE, **QR 이미지 비저장**(동적 인코딩). 정본 §6-A. |
| `VALID_QR_LANDING_TYPES` (KPA/공통) | `CANONICAL_KEEP` | `['product','promotion','page','link','video','screen_set']` (`store-qr.service.ts` 883L). |
| `store_qr_codes.type` 컬럼 | `CANONICAL_NEEDS_ALIGNMENT` | `store-qr.service.ts:757` `type: type \|\| landingType` — `type` 이 `landing_type` 을 사실상 중복한다. 이중 진실 원천. |
| PH `ALLOWED_LANDING_TYPES` | `CANONICAL_NEEDS_ALIGNMENT` (의도적 축소) | `['page','product','link']`. 컨트롤러 헤더가 사유를 명시: "**연결 대상이 없는 QR 타입은 만들지 않는다**(스캔했을 때 빈 화면이 되는 QR 0)". 정본 §5 의 마지막 행과 **일치하는 원칙** — 다만 매장축이 붙으면 확대해야 하는 임시 상태. |
| `operator_qr_templates` | `CANONICAL_KEEP` | 운영자 HUB QR 템플릿. slug/organization/scan tracking **없음** — 실제 발급은 매장 가져가기 시점 `store_qr_codes`. 3서비스(KPA/GP/KCos) `api/operatorQr.ts` 보유. |
| QR HUB 가져오기 | `CANONICAL_KEEP` | `hub-content.controller/service` + `asset-snapshot.controller` 경유. |
| QR analytics | `CANONICAL_NEEDS_ALIGNMENT` | `store-analytics.controller.ts`(157L) = organization 단위 KPI + TOP QR + device + 일별 추이. **Content 축·Placement 축 없음.** 활성 QR 판정은 `QR_LANDABLE_CONDITION` 로 공개 게이트와 동일 — 이 부분은 이미 정렬됨. |
| QR 인쇄/출력 | `CANONICAL_KEEP` | KPA `QrPrintTemplateModal.tsx`. 타 서비스 미보유. |
| PH QR 컨트롤러 | `DUPLICATED_TO_COMMONIZE` | `PharmacyHubStoreQrController.ts` 604L — 공통 `store_qr_codes` 원장 위의 **PH 전용 구현**. 태블릿과 달리 공통 라우터를 쓰지 않는다. |
| PH `/qr/public/:slug` | `DUPLICATED_TO_COMMONIZE` | 공개 resolver 가 서비스별로 존재. |
| 프론트 QR 화면 | `DUPLICATED_TO_COMMONIZE` | KPA `StoreQRPage.tsx` 2070L · `QrLandingPage.tsx` 622L / PH `QrPage.tsx` 617L · `QrLandingPage.tsx` 120L / GP·KCos `StoreQrPage.tsx`. **4서비스 4구현.** |

### 3-1. KPA QR target source 5종 (`StoreAssetSelectorModal.tsx`)

| source | 원장 | 생성 landingType |
|---|---|---|
| `asset` | `store_execution_assets` | — |
| `content-hub` | `kpa_contents` | `page` |
| `blog` | `store_blog_posts` | `link` |
| `mlc` | `store_multilingual_product_content_*` | `link` (멱등 publicKey) |
| `direct-content` | `kpa_store_contents` | `page` |

→ 같은 "Content" 가 원장별로 **서로 다른 landingType 으로 매핑**된다. 정본 §5 의 target 상위 개념과 1:1 대응하지 않는다 → `CANONICAL_NEEDS_ALIGNMENT`.

---

## 4. 축 4 — 공통화 현황

| 패키지 | 소비처 | 판정 |
|---|---|:---:|
| `@o4o/screen-content-core` | api-server + editor 패키지 | `CANONICAL_KEEP` |
| `@o4o/tablet-screen-set-editor` (1639L) | web-kpa-society · web-neture · web-pharmacy-hub | `CANONICAL_KEEP` |
| `@o4o/tablet-kiosk-core` | 태블릿 runtime | `CANONICAL_KEEP` |
| `@o4o/store-ui-core` `StoreTabletDisplaysView`(172L, tablet 컴포넌트 총 546L) | **web-glycopharm · web-k-cosmetics 만** | `LEGACY_INTERMEDIATE` |
| `@o4o/store-ui-core` `StoreQrConsoleView` | **web-glycopharm · web-k-cosmetics 만** | `LEGACY_INTERMEDIATE` |

### 4-1. 핵심 발견 — 공통화가 잘못된 세대를 가리킨다

현재 유일한 "공통 매장 Tablet/QR UI"인 `@o4o/store-ui-core` 는 **1세대(`store_tablet_displays`) 모델**을 담고 있고, 그것을 쓰는 서비스는 GlycoPharm · K-Cosmetics 둘뿐이다. 반면:

- **KPA** — 가장 두꺼운 3세대 구현을 **자체 보유**(공통 패키지 미사용)
- **PharmacyHub** — 가장 얇은 구현을 **자체 보유**(공통 패키지 미사용)

즉 지금 상태에서 "공통화"를 진행하면 **오래된 세대가 공통 자산으로 굳는다.** 정본 §10 이 Phase 2(KPA 정렬) → Phase 3(공통 추출) 순서를 고정한 실측 근거가 이것이다.

**백엔드는 이미 정반대**다. `createStoreTabletRoutes` 주입형 공통 라우터를 PharmacyHub 가 그대로 마운트하고 있어 **Tablet 백엔드 parity 는 달성 상태**다. 남은 격차는 **프론트엔드 전용**이다.

---

## 5. §D 정비 후보 12항목 — 조사 결과

| # | 질문 | 답 | 판정 |
|:---:|---|---|:---:|
| ① | `store_tablet_displays` 구형 진열/콘텐츠 선택 ↔ Screen Set `product_list`/`product_content` 중복·이원화? | **YES.** `product_list` 가 tablet context 에서 `configured`(=`store_tablet_displays` 가시행 존재)로 분기해 1세대 진열을 그대로 소비. | `LEGACY_INTERMEDIATE` |
| ② | `product_content` 가 `content_list` 보다 오래된 resolver 계약? | **YES, 그리고 그 이상.** `product_content` 는 참조만 통과시켜 **아무것도 렌더하지 않는다**. `content_list` 는 서버 resolve 로 이 실패를 고쳤다. | `DEAD` |
| ③ | 매장 선택 → 없으면 STORE canonical fallback 계약이 runtime 전체에서 단일한가? | **NO.** 단일 구현은 `store-public-tablet-content-resolve.ts` 뿐이고, `product_list`·`product_content`·QR landing 은 각자 다른 경로. | `CANONICAL_NEEDS_ALIGNMENT` |
| ④ | "첫 active tablet" fallback 이 `current_screen_set_id`·코너 운영 이후에도 남아 있는가? | **YES.** `resolveTabletDisplaySource()` 의 `ORDER BY created_at ASC LIMIT 1` (`source:'first_active'`). | `LEGACY_INTERMEDIATE` |
| ⑤ | KPA 태블릿 UI 에 legacy idle/display/product 설정과 Screen Set 운영 UI 가 동시 존재? | **YES.** `StoreTabletDisplaysPage.tsx` 1877L(1세대) + `TabletScreenSetManager`/`TabletCornerContentsPanel`(2·3세대) 병존. idle 도 서버가 이중 읽기. | `LEGACY_INTERMEDIATE` |
| ⑥ | PharmacyHub 가 과거 "축소 tablet 모델" 잔재를 유지? | **프론트만 YES**(400L vs 1877L+). 백엔드는 공통 라우터 마운트로 이미 동등. | `MISSING_ADOPTION` (정본 §9) |
| ⑦ | KPA/PH QR target 타입·UI drift? | **YES.** PH `['page','product','link']` vs 공통 6종. PH 는 전용 컨트롤러 604L 보유. 단 PH 의 축소는 "빈 화면 QR 0" 원칙에 따른 **문서화된 의도**. | `DUPLICATED_TO_COMMONIZE` |
| ⑧ | content-hub / direct / snapshot / execution-asset 이 Tablet·QR 에서 서로 다르게 해석되는가? | **YES.** §3-1 표 참조 — 5개 source 가 `page`/`link` 로 임의 매핑되고, Tablet `content_list` 는 별도 2종(`o4o_product_description`/`store_content`)만 인식. | `CANONICAL_NEEDS_ALIGNMENT` |
| ⑨ | ProductMaster 대표 QR 과 store QR 이 UI·코드에서 혼동? | **구조적으로는 분리 유지.** `product_landings`(master UNIQUE, `/p/`)와 `store_qr_codes`(org, `/qr/`)는 테이블·경로·서비스가 완전 분리. 혼동은 **용어 수준**(양쪽 다 "상품 QR"로 불림). | `CANONICAL_KEEP` (용어만 정렬) |
| ⑩ | 자체 storefront 은퇴 후 product QR landing 에 commerce 문구/CTA/route 잔재? | **NO.** `ProductLandingPage.tsx`(351L) + `App.tsx:727` 대상 구매/장바구니/주문/결제/가격/cart/checkout/buy 검색 **0건**. | 잔재 없음 |
| ⑪ | QR placement 를 표현하는 기존 필드·테이블·유사 개념? | **QR 측에는 없다.** `store_qr_codes`·`store_qr_scan_events` 모두 placement 필드 0. 유일한 인접 개념 = `store_execution_assets.usage_type`(pop\|qr\|signage\|banner\|notice) — **자산 쪽에 붙어 있고 QR 쪽이 아니다.** | 신규 필요(설계 미착수) |
| ⑫ | QR analytics 가 placement 확장 가능한 구조? | **부분적.** `store_qr_scan_events` 는 QR 단위 append-only 이므로 **additive 컬럼/테이블로 확장 가능**하나, 현재 집계 쿼리(§3)는 QR·device 축만 갖고 Content·Placement 축이 없다. | `CANONICAL_NEEDS_ALIGNMENT` |

---

## 6. 판정 집계

| 판정 | 건수 | 주요 항목 |
|---|:---:|---|
| `CANONICAL_KEEP` | **20** | ProductMaster · SPD · STORE resolve · kpa_store_contents · product links · execution assets · snapshot · MLC · store_tablets · current_screen_set_id · screen_sets/blocks · corner_contents · content_list · screen-content-core · editor · kiosk-core · 공통 tablet 라우터 · store_qr_codes · scan_events · product_landings · operator_qr_templates · QR HUB · QR 인쇄 · ⑨ |
| `CANONICAL_NEEDS_ALIGNMENT` | **8** | idle 이중 읽기 · product_list · `store_qr_codes.type` 중복 · PH landing types · QR analytics 축 · KPA target source 매핑 · ③ fallback 단일화 · ⑫ |
| `DUPLICATED_TO_COMMONIZE` | **4** | PH QR 컨트롤러 · PH 공개 resolver · 4서비스 QR 프론트 · KPA/PH 태블릿 프론트 |
| `LEGACY_INTERMEDIATE` | **6** | store_tablet_displays · displays.content_id · first_active fallback · KPA 1세대 UI · store-ui-core Tablet View · store-ui-core QR View |
| `LEGACY_COMMERCE` | **0** | product QR landing 에 잔재 없음(§D-⑩). |
| `DEAD` | **3** | `product_content` 블록 타입 · `store_product_description_selections` · snapshot `blog` assetType(placeholder) |
| `UNKNOWN` | **0** | — |

> 집계는 본 IR 이 명시적으로 판정한 항목 기준이다. 동일 개념이 여러 표에 나오면 1건으로 센다.

---

## 7. 후속 실행 순서 제안

정본 §10 Phase 2(KPA 정렬)를 **2개의 큰 작업**으로 묶기를 권한다. 세분화된 다수 WO 로 쪼개지 않는다.

### 작업 1 — Tablet 세대 정리 (KPA reference)

1. `product_content` 블록 타입 **은퇴 판정 확정**(DEAD 근거 §2-1). CHECK 제약·타입 union 처리 방식은 해당 WO 에서 결정.
2. `product_list` 를 정본 §2 계약(1순위 매장 선택 → 2순위 STORE canonical → 3순위 없음)으로 재정렬. `store_tablet_displays` 의존을 **읽기 경로에서** 분리.
3. `first_active` fallback 의 존치 여부 확정 — 코너 운영 도입 후의 정확한 의미 재정의.
4. idle 이중 읽기(`current_screen_set_id` vs `idle_playlist_items`) 단일화.
5. KPA 1세대 UI(`StoreTabletDisplaysPage.tsx` 1877L)의 Screen Set 축 흡수.

### 작업 2 — QR 축 정렬 + PH parity

1. `store_qr_codes.type` ↔ `landing_type` 이중 진실 해소.
2. KPA target source 5종을 정본 §5 target 상위 개념에 매핑하는 단일 계약 정의(§D-⑧).
3. PH QR 을 공통 축으로 흡수(태블릿이 이미 성공한 `createStoreTabletRoutes` 주입 패턴을 QR 에 동일 적용) — PH landing types 확대 포함.
4. QR analytics 에 Content 축 추가(Placement 는 schema 확정 후).

### schema 신규 필요 여부

| 항목 | 판단 |
|---|---|
| Tablet 정리 (작업 1) | **신규 schema 불필요.** 기존 테이블 조합으로 가능. |
| QR 정렬 (작업 2 · 1~3) | **신규 schema 불필요.** |
| QR analytics Content 축 | **불필요**(기존 join 으로 도출 가능). |
| **QR placement** | **신규 필요.** 단 정본 §7-1 에 따라 **이번 회차에서 확정하지 않는다.** 설계 시 `store_execution_assets.usage_type` 확장 vs QR 측 신규 축 중 택일을 먼저 판정한다. |

---

## 8. 문서 정합 (§E)

전수 검색 결과 **직접 충돌하는 기준 문서는 발견되지 않았다.** 아래 문서들은 본 정본의 하위 계층이며 그대로 유지한다.

| 문서 | 관계 | 조치 |
|---|---|---|
| `O4O-STORE-COMMERCE-BOUNDARY-V1` | 상위(정본 §1-3-④ 가 인용) | 변경 없음 |
| `O4O-CONTENT-TYPE-TAXONOMY-V1` | 하위 — Content 세부 분류·저장소 대응 | 변경 없음 |
| `O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1` | 하위 — Content 제작 6단계 | 변경 없음 |
| `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` | 하위 — 실행자산 테이블 경계 | 변경 없음 |
| `ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1` | 하위 — Screen Set Core/Extension | 변경 없음. 본 IR §4-1 은 이 ADR 의 "부분 GO" 판단과 **일치**(공통화 착수 전 정렬 필요). |
| `O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1` | 하위 — QR 과금 2계층 | 변경 없음. 정본 §6·§7-2-3 이 인용. |
| `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1` | 하위 — PH 서비스 모델 | 변경 없음. 정본 §9 parity 문장과 정합. |

**SUPERSEDED 처리 0건.** 근거 없는 대량 상태 변경을 하지 않는다(WO §E).

색인 갱신: `docs/baseline/README.md` 에 신규 baseline 1행 추가. `CLAUDE.md` / `AGENTS.md` 정본 목록 추가는 **후속 WO 에서 Phase 2 착수와 함께 판단**을 권한다(본 회차는 조사·문서 확정까지이며, 최상위 정본 목록 변경은 §16-4 인라인 금지 항목에 해당).

---

*Status: Investigation complete · 코드 변경 0*
