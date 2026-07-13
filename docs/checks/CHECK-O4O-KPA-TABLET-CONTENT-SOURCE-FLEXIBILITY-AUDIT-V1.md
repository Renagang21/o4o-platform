# CHECK-O4O-KPA-TABLET-CONTENT-SOURCE-FLEXIBILITY-AUDIT-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-SOURCE-FLEXIBILITY-AUDIT-V1`
> 성격: **read-only 조사** (콘텐츠 출처 유연성). 코드/DB/배포 write 0.
> Date: 2026-07-13

---

## 0. 결론 (먼저)

**현재 태블릿은 ProductMaster/local-product 중심 구조에 갇혀 있다.** 매장 제작 콘텐츠·O4O 표준 설명서를 "코너에 배치할 콘텐츠 카드"로 자유롭게 선택·표시하는 경로는 **없다**.

- viewer 가 렌더하는 상품 카드는 전적으로 `/tablet/products`(supplier offer + local product). 상품과 무관한 **standalone Store Content 카드 경로 없음**.
- `product_content` 블록은 **완전 dormant** — 서버는 참조 ID만 통과시키고 viewer 는 렌더조차 안 함.
- O4O 표준 STORE 설명서(SPD STORE canonical **21,188건**)는 **등록된 supplier 상품의 description 으로만** 자동 표시(SPD LATERAL COALESCE). standalone 첨부 불가.
- 매장 일반 콘텐츠(상품 무관)는 `kpa_store_contents` 에 저장 **가능**하나 **태블릿 노출 경로가 없음**(등록 상품에 링크돼야만).
- 표준→매장 복사·편집 흐름은 **폐기**(읽기 전용 조회만; 복사 POST 는 UI 미연결 orphan).

→ **`USABLE-CORNER-CONTENT-SEED` 를 바로 하면 안 된다.** 원하는 4-출처 모델(§3)이 미지원이므로, 먼저 **CONTENT-SOURCE-SELECTION-DESIGN** 이 필요하다.

---

## 1. 조사 대상 (파일/테이블/API)

| 영역 | 근거 |
|------|------|
| 태블릿 화면 세트 블록 | `store_tablet_screen_blocks` (migration 20270120000000), 화이트리스트 `store-tablet.routes.ts:1145-1148` |
| /tablet/screen 렌더러 | `store-public-tablet.handler.ts:480-556`, `store-public-tablet-screen.ts` |
| 상품 조회 | `store-public-utils.ts:329-546 queryTabletVisibleProducts`, `/tablet/products` handler |
| kiosk viewer | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` |
| 관리 편집 UI | `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx`, `api/tabletDisplays.ts` |
| 매장 콘텐츠 저장소 | `kpa-store-content.entity.ts`, `kpa-store-content-product-link.entity.ts`, `store-content.controller.ts` |
| O4O 표준 설명서 | `SharedProductDescription.entity.ts`, `shared-product-description.service.ts` |
| Canonical 개념 | `docs/architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md` |

---

## 2. 현재 태블릿 상품/콘텐츠 표시 구조

### 2.1 블록 타입 (7종)
`idle_media` · `product_list` · `product_content` · `corner_description` · `health_info` · `staff_inquiry` · `qr_guide`.

### 2.2 /tablet/screen 의 block → section 변환 (handler.ts:529-551)

| block | 서버가 반환 | 비고 |
|-------|-------------|------|
| idle_media | `{items, operatorCommonSource}` | resolve |
| **product_list** | `{products: queryTabletVisibleProducts().data, localProductsEndpoint}` | **supplier 만 인라인, config.items 무시** |
| **product_content** | `{productRef, contentId}` (config 원값만) | **본문 resolve 안 함** |
| corner_description/health_info/staff_inquiry/qr_guide | `shapeStaticBlock()` 텍스트 | — |

### 2.3 kiosk viewer 가 실제 소비하는 것 (TabletKioskPage.tsx)

- 상품 목록 = **`api.fetchProducts` → `/tablet/products` 독립 로드** (screen_set product_list 블록 **미사용**).
- screen sections 중 **소비 blockType = `corner_description`·`qr_guide`·`idle_media` 3개뿐**.
- **`product_content` 블록 = viewer 가 전혀 렌더하지 않음(dormant).**
- 상품 상세 콘텐츠 = `selectedProduct.selectedContentHtml`(= 상품에 attach 된 콘텐츠)로만.

### 2.4 queryTabletVisibleProducts 소스 (utils.ts)
- supplier: `supplier_product_offers → product_masters(ProductMaster) → opl(offer_id INNER JOIN) → TABLET 채널 APPROVED 게이트`.
- local: `store_local_products`.
- **표준설명서 자동 표시**: `LEFT JOIN LATERAL shared_product_descriptions (STORE canonical, ko 우선) → COALESCE(spd.content, sp.description, spo…)`. → 등록 supplier 상품엔 **O4O STORE canonical 설명서가 자동으로 붙음**(단, 상품이 게이트를 통과할 때만).
- **ProductMaster/local 외에 Store Content 를 카드 소스로 만드는 경로 없음.**

### 2.5 콘텐츠 attach 경로 (상품 종속)
`store_tablet_displays disp.content_id → kpa_store_content_product_links(link_type='product_description') → kpa_store_contents`. **disp row(진열)가 있는 상품에만** 콘텐츠가 붙음.

### 2.6 관리 UI
`TabletScreenSetManager` 블록 편집기: `product_list`=설정 없음, `product_content`=**raw JSON textarea**(전용 콘텐츠 picker 없음). 콘텐츠↔상품 연결은 진열 편집(`saveTabletDisplays.contentId`)에서만, 그나마 **서버가 "해당 상품에 링크된 콘텐츠인지" 검증**(상품 없이 콘텐츠만 선택 불가).

---

## 3. 매장 제작 콘텐츠 저장소 (Store Production Material)

- **테이블** `kpa_store_contents` (= canonical "Store Production Material" 물리 구현). 컬럼: `title`, `content_json`(blocks/html/body/summary/usage/tags/subType…), `source_type`(**direct**=매장 직접 / **snapshot_edit**=허브·snapshot 편집), `organization_id`(매장 격리), `author_role`(operator/store, supplier 금지), `visibility_scope`(organization 고정), `workspace_status`(draft→…→archived), `source_metadata`(복사 출처 추적용). **master_id 컬럼 없음** — 상품 연결은 링크 테이블 경유.
- **링크** `kpa_store_content_product_links`: `product_source_type`(listing/local) + `product_source_id` + `master_id`(부가) + `link_type='product_description'`.
- **API** `/api/v1/{kpa|glycopharm|cosmetics}/store-contents` (service-neutral): 목록/생성(direct)/수정/삭제/번역/snapshot 편집.
- **일반(상품 무관) 콘텐츠 저장 가능** — 동일 테이블 `source_type='direct'`, 링크 없이. (즉 저장소는 이미 "상품 콘텐츠 + 일반 콘텐츠" 겸용.)

### DB 실측 (현재)
| 항목 | 값 |
|------|------|
| kpa_store_contents | **7건**(전량 네뚜레 org 9c87f46b), source_type direct6/snapshot_edit1, 전부 workspace_status=draft, visibility=organization |
| kpa_store_content_product_links | **0건** (콘텐츠↔상품 링크 전무) |
| 두 샘플 태블릿 store_tablet_displays | **0건** (진열 row 없음 → legacy_fallback) |

---

## 4. O4O 표준 상품 설명서 저장소

- **테이블** `shared_product_descriptions`(SPD): `master_id`(ProductMaster 단방향) + `content`/`summary` + `descriptionType`(**B2B/B2C/STORE/SUPPLIER_STORE**) + `status`(canonical/candidate/needs_review/hidden/…) + `language` + `source_ref_id`. canonical 유일 = (master, type, language)당 1개.
- **매장 읽기 경로**: `GET /store-contents/b2c-descriptions?listingId=` → org→listing→master 검증 후 `status='canonical' AND description_type='STORE'` **본문 포함 읽기 전용** 반환.

### DB 실측
| descriptionType/status | 건수 |
|------------------------|------|
| STORE canonical | **21,188** |
| STORE candidate | 288 · STORE hidden 1 |
| B2B canonical | 64 |

→ O4O 표준 매장용 설명서는 **대량 존재**(21k). 태블릿엔 "등록 supplier 상품의 자동 description(§2.4)" 로만 도달.

---

## 5. 표준 → 매장 콘텐츠 복사·편집 흐름 = **폐기(읽기 전용만)**

- 과거: `POST /store-contents/import-b2c-description`(controller:519-628) — SPD canonical → `kpa_store_contents` direct 복사 + product_description 링크, `source_metadata.copiedFrom` 추적. (WO-…-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1)
- 현재: **정책 변경으로 복사 폐기 → 읽기 전용 조회**(controller:480-482 주석, `StoreDescriptionViewModal` "복사 없음"). 복사 POST 는 코드 잔존하나 **프론트 호출 0건 = orphan**.
- `store_product_description_selections`(설명서 선택 저장)도 dead model revert(소비 0).
- **원본↔편집본 추적**: 복사 폐기로 살아있는 연결키 없음(읽기 조회만).

→ **표준→매장 편집본(출처 #2) 생성 경로가 현재 없음**(과거 orphan 코드만).

---

## 6. WO 확정 원칙 대비 현행 갭 (4-출처)

| 출처 | 저장소 존재 | 태블릿 표시 가능? |
|------|:-----------:|:-----------------:|
| ① O4O 표준 상품 매장용 설명서 | ✅ SPD STORE(21k) | △ **등록 supplier 상품의 자동 description 으로만**(standalone 불가) |
| ② 표준 복사·편집한 매장 자체 설명서 | △ 저장소(kpa_store_contents)는 있으나 **복사 흐름 폐기** | ✗ 생성 경로 없음 + attach 만 가능 |
| ③ 매장 직접 제작 상품 설명서 | ✅ kpa_store_contents + link | △ **등록 상품에 링크 + 진열 시에만** |
| ④ 매장 직접 제작 일반 콘텐츠 | ✅ kpa_store_contents(direct, 링크 없음) | ✗ **태블릿 노출 경로 전무**(상품 카드 아님) |

**공통 병목**: 태블릿 카드의 소스가 "product record(OPL/local)" 로 고정. 콘텐츠는 그 상품의 부가물일 뿐, 콘텐츠 자체가 카드가 되지 못함.

---

## 7. 현재 products=[] 인 이유 (샘플)
① TABLET 채널 APPROVED 0건(commerce gate) ② 이 매장 supplier OPL 은 offer_id NULL·service_key='neture'(offer INNER JOIN 제외) ③ local product 0 ④ 진열(disp) row 0. → serviceKey/콘텐츠와 무관하게 **상품 자체가 게이트를 통과하지 못함**. (선행 CHECK: [[check-kpa-store-listing-servicekey-neture-audit]])

---

## 8. 한계 정리 (A~E)

**A. 현재 그대로 가능**
- 등록 supplier 상품(게이트 통과)에 **O4O STORE canonical 설명서 자동 표시**(SPD LATERAL).
- 등록 상품(OPL/local)에 kpa_store_contents 콘텐츠 attach(진열 disp.content_id + 링크) → 상세에 표시.

**B. 작은 UI/API 보정으로 가능**
- `product_content` 블록 **실구현**: 서버가 `contentId` → `kpa_store_contents` 본문 resolve + **viewer 가 해당 섹션 렌더**. (블록 타입/스키마는 이미 존재, viewer 소비만 추가)
- 관리 편집기에 **매장 콘텐츠 picker**(현재 raw JSON) 추가.

**C. block config / 설계 필요 (핵심)**
- "**content_list**"(코너에 배치할 콘텐츠 카드 목록) 개념 도입, 또는 `product_list` 를 **콘텐츠-출처 혼합**으로 확장(`contentSource: o4o | store` / `sourceType: o4o_product_description | store_product_content | store_general_content`).
- 표준 설명서를 **상품 등록 없이** 코너 카드로 붙이는 참조 모델(SPD id 직접 참조 vs 복사).
- product_list config.items(현재 dormant `{items:[]}`)를 실제 큐레이션 소스로 살릴지 결정.

**D. migration 필요 여부**
- 대부분 **불요**(kpa_store_contents/SPD/screen_blocks/링크 테이블 이미 존재). 필요 시 screen_blocks **config 값 스키마 표준화**(컬럼 추가 아님) 또는 content_list 블록타입 화이트리스트 추가 정도. 표준→매장 복사 재활성화는 **기존 orphan API 재연결**로 가능(신규 스키마 불요).

**E. 하면 안 되는 우회**
- products=[] 회피하려 **가짜 상품(OPL/local) seed** 로 콘텐츠를 억지로 태우기(commerce gate 우회).
- `product_content` config 에 **raw HTML 직접 박기**(kpa_store_contents 저장소 우회 → 편집·번역·거버넌스 상실).
- 표준 SPD 를 태블릿 전용으로 별도 복제(SSOT 이탈).

### WO §8 3대 판단
- **상품 표시에 OPL/local 필수인가?** → **현재 필수.** Store Content 단독 카드 경로 없음. (B/C 로 완화 가능)
- **표준설명서 직접 태블릿 첨부 가능?** → standalone 불가. **등록 supplier 상품의 자동 description 으로만**. 복사도 폐기.
- **일반 콘텐츠를 product_list 에 섞어도 되나, content_list 별도 필요?** → 현재 둘 다 콘텐츠 카드 렌더 불가. **content_list 개념(또는 product_content 실구현 + 출처 구분)이 설계상 필요**.

---

## 9. 추천 구현 순서

```
1. (완료) CONTENT-SOURCE-FLEXIBILITY-AUDIT  ← 본 CHECK
2. CONTENT-SOURCE-SELECTION-DESIGN          ← 필요(필수)
   - content_list vs product_content 실구현 결정
   - 출처 구분(contentSource/sourceType) + 카드 스키마
   - 표준(SPD) 참조 방식(직접 참조 vs 복사 재활성화)
   - viewer 렌더 계약(콘텐츠 카드 섹션) + 관리 picker
3. CONTENT-SOURCE-SELECTION-IMPLEMENTATION
4. USABLE-CORNER-CONTENT-SEED                ← DESIGN·최소 IMPL 이후
```

**seed 를 바로 하면 안 되는 이유**: 현재 구조로는 seed 가 "상품 등록(OPL/local) → 진열 → 콘텐츠 링크" 만 가능하며, 원하는 4-출처(특히 ②표준편집본·④일반콘텐츠·standalone 콘텐츠 카드)는 **표시 자체가 불가**. 억지 seed 는 §8-E 우회로 빠질 위험.

- 단, "**등록 supplier 상품 + O4O STORE 설명서 자동 표시**"(A) 만 검증하는 최소 seed 는 DESIGN 없이도 가능하나, 이는 WO 의 콘텐츠-유연성 목표와 다른 축(상품 게이트/serviceKey 축, 선행 CHECK 참조).

---

## 10. write 여부
```
DB write 0 (SELECT/정보스키마만)
코드/프론트/배포/샘플 변경 0
```

---

*태블릿 콘텐츠 출처 유연성 audit(read-only) · 결론: 태블릿은 product-record-lock, standalone Store Content 카드·product_content 렌더·표준 standalone 첨부 모두 없음, 표준→매장 복사 폐기 · 저장소는 존재(kpa_store_contents=Store Production Material / SPD STORE 21k) · 갭=콘텐츠가 카드 소스가 못 됨 · seed 전 CONTENT-SOURCE-SELECTION-DESIGN 필요 · migration 대부분 불요(config/viewer 설계 중심) · write 0.*
