# CHECK-O4O-KPA-TABLET-CONTENT-SOURCE-SELECTION-DESIGN-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-SOURCE-SELECTION-DESIGN-V1`
> 성격: **설계 문서**(구현 아님). read-only 조사 + 설계. write 0.
> 선행: `CHECK-O4O-KPA-TABLET-CONTENT-SOURCE-FLEXIBILITY-AUDIT-V1`(태블릿=product-record-lock)
> Date: 2026-07-13

---

## 0. 설계 요약 (결정)

| 항목 | 결정 |
|------|------|
| **블록 모델** | 신규 **`content_list`** block_type 도입. `product_list`(상품 record)는 그대로 유지, dormant `product_content`는 **deprecated**(신규 사용 안 함, content_list 가 대체). |
| **콘텐츠 카드 sourceType** | **2종**: `o4o_product_description`(SPD STORE canonical 직접 참조) · `store_content`(`kpa_store_contents` — 매장 상품설명서·일반콘텐츠·복사편집본 모두 포함). |
| **O4O 표준 사용** | **직접 참조 + 복사 편집 모두 지원**. 그대로 사용=SPD 직접 참조(원본 추종), 매장 편집=`kpa_store_contents` 복사(스냅샷 독립, source_metadata 추적). |
| **매장 콘텐츠** | 상품 링크 유무와 무관하게 content_list 로 배치 가능(일반콘텐츠=source 4 unlock). 노출 게이트 = **content_list 편입 자체**(+ not archived/deleted + org 소유). |
| **viewer** | content_list = 독립 카드 섹션(코너 설명/QR 옆). 서버가 render 시점 resolve → 카드 data. 상세=ContentRenderer(DOMPurify). |
| **관리 UI** | content_list picker(출처 필터 + 검색 + 선택목록 정렬/제거/override). raw JSON textarea 폐기. |
| **migration** | **Phase 1 = JSONB config**(store_tablet_screen_blocks.config)로 최소. block_type 화이트리스트에 `content_list` 추가(+ DB CHECK 있으면 1줄 migration). 정규화 테이블은 후속. |
| **seed 재개 조건** | content_list 가 viewer 에 렌더되고(최소 두 sourceType) picker 로 선택 가능해진 시점. |

---

## 1. 선행 AUDIT 요약

- viewer 상품 카드 = `/tablet/products`(supplier offer + local) 만. standalone Store Content 카드 경로 없음.
- `product_content` 블록 = 서버가 `{productRef,contentId}` 원값만 통과, **viewer 미렌더(dormant)**.
- O4O STORE canonical(**21,188**)은 등록 supplier 상품의 자동 description(SPD LATERAL)으로만.
- `kpa_store_contents`(Store Production Material) 존재하나 태블릿 노출 경로 없음. 표준→매장 복사=폐기(읽기전용/orphan).
- 저장소·블록·링크 테이블은 이미 존재 → **갭은 "콘텐츠가 카드 소스가 못 됨"**(스키마 부재 아님).

---

## 2. content_list 도입 여부 (§5.1)

**결정: A+D — 신규 `content_list` block_type 도입, `product_list`는 상품 전용 유지.**

근거:
- `product_list` 는 4중 commerce visibility gate(offer/channel APPROVED)에 묶인 **판매 상품** 의미가 명확. 여기에 콘텐츠를 섞으면 commerce gate 와 content 표시가 엉킴(선행 serviceKey/gate 이슈와 충돌).
- `product_content` 는 단수·dormant·viewer 미렌더. 반쪽 블록을 되살리기보다, "**코너에 배치할 콘텐츠 카드 목록**"에 맞는 **복수(list) 블록**을 신설.
- content_list 가 source 1~4 의 주 통로. product_list 는 실제 판매 상품(향후 commerce)용으로 분리 유지.
- product_content: back-compat 위해 타입은 남기되 **deprecated**(신규 편집 UI 미제공). 기존 인스턴스 0건이라 위험 없음.

| 블록 | 역할(설계 후) |
|------|---------------|
| product_list | 상품 record(supplier offer/local) 카드 — commerce gate. **불변** |
| **content_list (신규)** | O4O 표준 설명서 + 매장 제작 콘텐츠 카드 목록 |
| product_content | **deprecated**(dormant 유지, 신규 미사용) |
| corner_description / qr_guide / idle_media / health_info / staff_inquiry | 불변 |

---

## 3. sourceType 모델 (§5.2)

**결정: content_list item 의 `sourceType` = 2종.**

| sourceType | 참조 대상 | 커버하는 WO 출처 |
|------------|-----------|------------------|
| `o4o_product_description` | SPD STORE canonical (키 = `masterId` + `language`) | ① O4O 표준 매장용 설명서 |
| `store_content` | `kpa_store_contents.id` | ② 표준 복사·편집본 / ③ 매장 상품 설명서 / ④ 매장 일반 콘텐츠 |

- ②③④가 하나의 `store_content` 로 수렴하는 이유: 셋 다 물리적으로 `kpa_store_contents` row. 상품연결(③) vs 일반(④) vs 복사출처(②) 구분은 **콘텐츠 자체의 링크/`source_metadata`** 로 표현(sourceType 을 쪼갤 필요 없음). 카드에는 파생 배지로 노출.
- 판매 상품 카드(supplier/local)는 content_list 가 아니라 **product_list** 소관 → sourceType 에 포함하지 않음(축 분리).

카드 필드(공통):
```
{ title, summary?, thumbnailUrl?, sourceBadge, body(detail)?, relatedProduct? , qrUrl? }
```
- title/summary: override 우선 → 원본(SPD summary / kpa_store_contents.title·content_json.summary).
- sourceBadge: "O4O 표준" | "매장 제작"(+상품연결 시 상품명).
- body: 상세 탭 시 ContentRenderer 로 렌더(SPD.content / content_json.html·body).
- qrUrl: 콘텐츠 공개 landing 이 있으면 연결(후속, 필수 아님).

---

## 4. O4O 표준 설명서 참조 방식 (§5.3)

**결정: C — 직접 참조 + 복사 편집 모두 지원.**

| 모드 | 저장 | 원본 추종 | 추적 |
|------|------|:---------:|------|
| **그대로 사용** | content_list item `o4o_product_description`(복사 없음) | **추종**(render 시 현재 STORE canonical 조회) | 참조키(masterId+language) |
| **매장 편집** | `kpa_store_contents` 복사 → item `store_content` | **비추종(스냅샷 독립)** | `source_metadata.copiedFrom='o4o_store_description'` + `sourceRefId(SPD)` + `masterId` |

- 복사 흐름: 폐기된 `POST /import-b2c-description`(controller:519-628, orphan) **재활성화**가 자연스러운 재사용 경로(신규 스키마 불요). 재활성화 시 "복사=사본" 불변식([[ir-copy-on-import-invariant-audit]]) 준수.
- 직접 참조 키: **`masterId` + `language`** (spd row id 아님) → canonical 이 언어별 재승격돼도 항상 현재 canonical 을 가리킴(선행 다국어 canonical 이슈 회피).
- 직접 참조 render: STORE canonical 이 없으면(해당 언어 없음) ko fallback → 없으면 item skip.

---

## 5. 매장 제작 콘텐츠 사용 방식 (§5.4)

- **상품 연결 유무 구분**: `kpa_store_content_product_links` 존재 여부. content_list 는 **링크 유무 무관하게** 참조 가능(일반콘텐츠=source 4 unlock). 카드 배지에 상품연결 시 상품명 표기.
- **노출 상태 게이트**: content_list 편입 = 매장의 명시적 게시 의도([[wo-content-save-means-ready-global-standard]] "저장=ready" 정렬). 따라서 상태 게이트는 관대하게 = **archived/deleted 제외 + org 소유** 만. draft 도 store 가 골라 넣었다면 노출(단, 원치 않으면 item.visible=false).
  - 대안(문서화): 별도 published 상태를 강제하고 싶으면 workspace_status 화이트리스트(예: ready_curation 이상)로 게이트 — Phase 2 에서 운영 요구 보고 결정.
- **content_json 렌더 범위**: title + summary(카드), html/body(상세). blocks 기반이면 기존 렌더 파이프(ContentRenderer) 재사용.
- **org scope**: server 가 save/render 양쪽에서 `organization_id` 일치 검증(타 매장 콘텐츠 참조 차단).

---

## 6. viewer 렌더 계약 (§5.5)

- content_list = **독립 카드 섹션**(corner_description/qr_guide 와 형제). 서버 `/tablet/screen` 이 각 item 을 **resolve 해 카드 data 배열**로 반환(viewer 가 SPD/kpa_store_contents 를 직접 몰라도 되게 — product_content 의 실패(참조ID만 통과)를 반복하지 않음).
- viewer(TabletKioskPage):
  - screenSections 에서 `content_list` 섹션 소비 추가(현재 corner/qr/idle 3종 → 4종).
  - 카드 그리드 렌더(기존 productCard 스타일 재사용 가능), 탭 시 상세(ContentRenderer, DOMPurify).
  - **product_list 와 공존 시**: content_list 섹션과 상품 그리드를 분리 표시(혼잡 방지). templateKey 로 배치 우선순위 결정(후속).
  - **상품 0건이어도 content_list 카드 있으면 화면 안 비어 보임**(§5.5 목표 충족 — 현재 empty-state 카드 대신 콘텐츠 카드).
- 렌더 계약 카드:
```
card = { itemId, sourceType, sourceBadge, title, summary?, thumbnailUrl?, hasDetail, relatedProductName? }
detail(별도 fetch 또는 inline) = { html }  // ContentRenderer 로 sanitize 렌더
```

---

## 7. 관리 picker UX 계약 (§6)

- 편집기(TabletScreenSetManager)에 **content_list 블록** 추가 + 전용 picker(현재 product_content = raw JSON textarea 폐기).
- picker 모달:
  - **출처 필터**: `O4O 표준 설명서` / `매장 제작(상품)` / `매장 제작(일반)`.
  - **검색**: 상품명 / barcode / 콘텐츠 제목 / 콘텐츠 유형 / 상태.
  - 선택 목록: 카드 미리보기 + **정렬(sortOrder)** + 제거 + **title/summary override** + visible 토글.
- 데이터: 아래 §8 API.

---

## 8. API 계약 (§7 — 제안, 구현은 후속)

| 목적 | 제안 | 재사용 여부 |
|------|------|-------------|
| 매장 콘텐츠 검색(picker) | `GET /{service}/store-contents?q=&linked=&status=` | 기존 `GET /store-contents`(목록, org-scoped `{id,sourceType,title,updatedAt}`) **확장**(현재 검색/필터 없음) |
| O4O 표준 설명서 검색(picker) | `GET /store/tablet-content-sources/o4o-descriptions?q=` (상품명/barcode → master + STORE canonical 요약) | 신규(경량) — ProductMaster 검색 + SPD STORE canonical 조인. 기존 `b2c-descriptions`(listingId 기준 단건 읽기)와 별개 |
| 콘텐츠 상세 본문(viewer) | `/tablet/screen` 이 resolve 해 포함 (별도 호출 최소화) | `/tablet/screen` 확장 |
| block 저장 | 기존 screen-sets blocks 저장(`PUT .../blocks`) | **재사용**(config JSONB) |
| 표준→매장 복사 | 기존 `POST /store-contents/import-b2c-description`(orphan) 재활성화 | **재사용** |

- picker 응답 shape(예):
```
{ items: [ { sourceType, refKey, title, summary, thumbnailUrl?, badge, productName? } ], total }
```

---

## 9. block config shape (§8)

`store_tablet_screen_blocks.config` (JSONB) — `content_list`:
```json
{
  "items": [
    { "sourceType": "o4o_product_description", "masterId": "<uuid>", "language": "ko",
      "displayTitle": null, "displaySummary": null, "visible": true, "sortOrder": 10 },
    { "sourceType": "store_content", "contentId": "<kpa_store_contents.id>",
      "displayTitle": null, "visible": true, "sortOrder": 20 }
  ]
}
```
필수 결정(확정):
- `sourceId` 가 가리키는 것: `o4o_product_description`→ **masterId(+language)**(spd row id 아님, canonical 추종). `store_content`→ **kpa_store_contents.id**.
- `productMasterId`: o4o item 은 masterId 자체가 키. store item 은 불필요(링크는 콘텐츠가 이미 보유).
- title/summary override: **허용**(displayTitle/displaySummary, null=원본).
- sortOrder: 명시 정수(오름차순). visible: item 별 토글.
- 원본 삭제/archived/canonical 없음 → **item skip**(shapeStaticBlock null 패턴과 동일, 안전 fallback).

---

## 10. 권한/스코프 (§9)

- `store_content` item: `kpa_store_contents.organization_id == 매장 org` 검증(save/render 양쪽). 타 매장 참조 차단.
- `o4o_product_description` item: STORE canonical 은 **플랫폼 공용 소비자 표준 콘텐츠** → 매장 참조 허용. picker 는 매장 취급/검색 상품을 우선 노출. (대안: 취급상품(OPL/handled)로 게이트 — 운영정책 확정 시 조정. 문서에 옵션 명시.)
- 노출 제외: archived / deleted / (선택)draft. supplier 저작 콘텐츠는 author_role='supplier' 금지(엔티티 CHECK)라 자연 배제.
- **sanitization**: viewer 는 ContentRenderer(@o4o/content-editor `sanitize.ts` DOMPurify) 로만 렌더 — raw HTML 직접 innerHTML 금지.

---

## 11. migration 필요 여부 (§10)

**결정: Phase 1 = A/B 최소.**
- store_tablet_screen_blocks.config 는 JSONB → **content_list config 저장에 스키마 변경 불요**.
- block_type 허용 목록에 `content_list` 추가: 서버 화이트리스트(코드) + **block_type 컬럼에 DB CHECK 제약이 있으면 1줄 migration**(CHECK 에 'content_list' 추가). CHECK 유무는 구현 착수 시 확인.
- 정규화 테이블(`content_list_items`)은 **후속**(사용량/운영 요구 확인 후). Phase 1 은 JSONB 로 작게 시작.

---

## 12. Phase 별 구현 순서 & seed 재개 조건 (§13·§14)

```
1. (완료) CONTENT-SOURCE-SELECTION-DESIGN            ← 본 문서
2. CONTENT-LIST-BLOCK-SCHEMA-CONTRACT
   - block_type 화이트리스트 + config shape 확정 + 서버 render resolve(SPD/kpa_store_contents → 카드) + org/상태 게이트. (UI 없이)
3. CONTENT-LIST-BLOCK-RUNTIME
   - viewer(TabletKioskPage) content_list 섹션 렌더(카드+상세 ContentRenderer). product_list 공존 배치.
4. CONTENT-LIST-PICKER-UI
   - 관리 편집기 picker(출처 필터/검색/정렬/override) + 표준 복사 재활성화(선택).
5. USABLE-CORNER-CONTENT-SEED                         ← 아래 조건 충족 후
```

**seed 재개 조건**: content_list 가 **viewer 에 실제 렌더**되고(최소 `o4o_product_description` + `store_content` 두 출처), picker 로 선택 가능(또는 최소 config 주입 경로 존재). 그 전 seed 는 상품-우회(§13)로 빠지므로 금지.

- 단, "등록 상품 + O4O STORE 자동 설명(A, 현재 가능)"만 검증하는 별도 최소 seed 는 축이 다름(상품 게이트/serviceKey) — 이 트랙과 분리.

---

## 13. 하면 안 되는 방식 (§11)
```
가짜 상품(OPL/local) seed 로 콘텐츠 카드 흉내
product_content config 에 raw HTML 직접 저장(kpa_store_contents 저장소 우회)
SPD 를 태블릿 전용으로 무분별 복제(SSOT 이탈)
org scope 없이 매장 콘텐츠 참조
viewer 에서 sanitization 없이 HTML 렌더
```

---

## 14. write 여부
```
DB write 0 · 코드/프론트/배포/샘플 변경 0 (설계 문서만)
```

---

*태블릿 콘텐츠 출처 선택 설계 · 결정: 신규 content_list 블록(product_list=상품 유지, product_content=deprecated) · sourceType 2종(o4o_product_description 직접참조 / store_content=kpa_store_contents 2·3·4 수렴) · 표준=직접참조+복사편집 병행(masterId+language 키, 복사=orphan API 재활성화) · 일반콘텐츠 unlock(content_list 편입=게시) · viewer는 서버 resolve 카드 섹션(ContentRenderer sanitize) · picker(출처필터/검색/override) · Phase1=JSONB config 최소 migration · seed 재개=content_list viewer 렌더 후 · write 0.*
