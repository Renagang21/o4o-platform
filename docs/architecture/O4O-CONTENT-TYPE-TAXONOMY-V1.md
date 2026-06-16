# O4O-CONTENT-TYPE-TAXONOMY-V1

> **역할:** O4O 컨텐츠 타입·명칭·역할 SSOT. 공통화/리팩터 시 용어·관계 기준.
> **근거:** `IR-O4O-CONTENT-SURFACE-COMMONIZATION-MAP-V1` · `WO-O4O-CONTENT-TYPE-TAXONOMY-AND-NAMING-ALIGNMENT-V1`
> **정책 상위:** `O4O-BUSINESS-PHILOSOPHY-V1` · `O4O-3-ROLE-FLOW-BASELINE-V1` · `PLATFORM-CONTENT-POLICY-V1`(F4) · `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1` · `IR-...-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1`
> Date: 2026-06-16 · Status: V1

---

## 0. 한눈에 (용어 → 역할 → 저장소)

| 용어 | 역할 | 저장소 | 소비자 노출 |
|------|------|--------|:---:|
| **상품설명 (Product Description, canonical)** | O4O 공용 상품 DB 자산, 대표 설명 | `shared_product_descriptions` (status=canonical) | ✅ 직접 |
| **Product AI Content** | AI 생성 **draft / seed source** | `product_ai_contents` | ❌ (직접 노출 안 함) |
| **Store Product Profile description** | **legacy fallback** override | `store_product_profiles.description` | ⚠️ canonical 부재 시 fallback |
| **일반 콘텐츠 (Content)** | member/operator/store 작성·복사 본문 | `kpa_contents` / `cms_content` / `cosmetics_contents` / `glycopharm_contents` | 경우에 따라 |
| **Production Material (제작물/출력물)** | 실제 활용 출력물 (POP/QR/블로그/안내문/signage) | `kpa_store_contents`(Store Production Material) / `store_pops` / `store_qr_codes` / `store_blog_posts` / signage | ✅ 활용물 |
| **복사본 (Copy)** | 가져오기 결과, 원본과 분리된 사본 | `o4o_asset_snapshots` (Neture: `DashboardAsset`) | 사본 활용 |
| **Template** | 출력/구성 형식 틀 | template registry (`@o4o/types` ProductionTemplate) | — |
| **Hub Published** | 운영자가 hub browse 에 공개한 원본 | `hub-content.service` 조회(cms/blog/pop/qr/signage published) | reference |

---

## 1. 상품설명 (Product Description) — canonical

```
상품설명 = ProductMaster 기준 O4O 공용 상품 DB 자산
        = shared_product_descriptions 의 canonical(status='canonical') 대표 설명
```

- **권위:** `shared_product_descriptions` (per ProductMaster, master 당 canonical 1개 보장).
- **소비자-facing 해석 순서 (SSOT, `store-public-utils.ts` COALESCE):**
  ```
  COALESCE(
    shared_product_descriptions.content,   -- 1순위: canonical
    store_product_profiles.description,     -- 2순위: legacy fallback (§3)
    supplier_product_offers.consumer_detail_description  -- 3순위: 공급자 원본
  )
  ```
- **정책:**
  - 매장별 상품설명 override/selection 은 **기본 정책으로 사용하지 않는다**.
  - `product_ai_contents` 는 **상품 상세에 직접 노출하지 않는다** (해석 순서에 없음).
  - canonical 저장 시 sanitize(write) + 렌더 시 sanitize(ContentRenderer) 2겹 — `SANITIZE-ON-WRITE-V2`.

## 2. Product AI Content — draft / seed source (canonical 아님)

```
product_ai_contents(contentType='product_description')
  = canonical 상품설명이 아님
  = AI 생성 draft 또는 shared_product_descriptions candidate 의 seed source
```

- **저장소:** `product_ai_contents` (per productId, contentType: product_description / pop_short / pop_long / qr_description / signage_text).
- **관계 (B → A):** 관리자 정비 흐름에서 `seedFromProductAiContents` 가 `product_ai_contents(product_description)` 를 읽어 `shared_product_descriptions` **candidate** 로 흡수("노출 아님, 후보로만"). candidate → (admin 정비) → canonical 승격.
- **정책:**
  - public 상품 상세는 product_ai_contents 를 **직접 읽지 않는다**.
  - product_ai_contents 의 product_description 은 **초안(draft)** 으로 안내한다(저장 라벨 등).
  - product_ai_contents 원본은 seed/sanitize 과정에서 **수정하지 않는다**.

### 1↔2 관계 요약 (1순위 혼선 해소)

```
[AI 생성] product_ai_contents(product_description)  ── seedFromProductAiContents ──▶  shared_product_descriptions (candidate)
   = draft/source (비노출)                                                                     │ admin 정비/승격
                                                                                               ▼
                                                                            shared_product_descriptions (canonical)  ──▶  소비자 상품 상세 (직접 노출)
```

## 3. Store Product Profile description — legacy fallback

```
store_product_profiles.description = legacy fallback override
```

- canonical(`shared_product_descriptions`) **부재 시에만** 해석 순서 2순위로 노출. 데이터는 **삭제하지 않고 보존**.
- 편집 UI(`PATCH /api/v1/store/products/:id/description`)는 잔존하나 **신규 기본 흐름 아님**. 매장 특화 설명은 §4 Production Material / Content 로 안내.

## 4. 일반 콘텐츠 (Content)

```
일반 콘텐츠 = member/operator/store 가 작성하거나 복사해 보관·활용하는 본문 콘텐츠
```

예: 안내문, 블로그 글, 매장 홍보문, 교육/자료형 콘텐츠, store-hub content, member-authored `/content`.
- 저장소: `kpa_contents` / `cms_content` / `cosmetics_contents` / `glycopharm_contents`(per-service 원본) + 복사본은 §6.
- **상품설명과 다르다**: 상품설명은 공용 상품 DB 자산(§1), 매장 특화 홍보문은 **콘텐츠/제작물(§4·§5)**.

## 5. Production Material (제작물 / 출력물)

```
Production Material = 실제 활용 목적의 출력물 (POP / QR / 블로그 / 안내문 / signage 등)
```

- 저장소: Store Production Material(legacy table `kpa_store_contents`, `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`) + `store_pops`/`store_qr_codes`/`store_blog_posts`/signage.
- 생성 흐름: `StartProductionModal` → (template) → `AiContentModal`(draft) → `ProductionMaterialEditorPage` → 저장.
- **상품설명 ≠ 제작물**: 상품설명은 §1 공용 자산, 제작물은 매장 활용물.

## 6. 복사 (Copy) vs 게시 (Hub Publish) vs Reference

| 개념 | 정의 | 메커니즘 |
|------|------|----------|
| **가져오기 = 복사(Copy)** | My Store/내 보관함에 **독립 복사본** 생성, 원본과 분리(원본 수정·삭제 무영향), source metadata 만 보존 | store: `assetSnapshotApi.copy()` → `o4o_asset_snapshots` / Neture: `dashboardCopy` → `DashboardAsset` |
| **Hub Publish** | 운영자가 원본 콘텐츠를 hub browse surface 에 **공개/노출**(copy 아님, reference 성격) | `hub-content.service` (Producer/SourceDomain/serviceKey 3축, published 필터) |
| **Reference** | 노출/참조만, 사본 생성 아님 | hub browse, canonical 노출 |

- 정책: **가져오기는 복사다.** Hub publish 는 노출이지 복사가 아니다. 둘을 혼동하는 문구 금지.

## 7. Template

```
Template = 출력/디자인/구성 형식을 제공하는 틀 (콘텐츠 원본/복사본 아님)
```

- `@o4o/types` ProductionTemplate registry. 서비스별 template(POP/QR/상품설명 톤)로 분기하나 **콘텐츠 자체가 아님**.

## 8. 명칭 정렬 규칙 (drift 방지)

**반드시 정렬할 표현 (오해 유발):**
- product_ai_contents 를 canonical 상품설명처럼 설명 → "AI 상품설명 **초안**" 으로.
- 상품설명을 매장별 override 대상으로 안내 → 매장 특화는 "콘텐츠/홍보문 만들기" 로.
- 가져오기를 reference 처럼 설명 → "내 보관함에 **복사** / 사본 만들기".
- Production Material 을 원본 content 처럼 설명 → "제작물/출력물".
- Hub publish 와 copy 혼동 → publish=노출, copy=사본.

**유지 가능 표현:** 서비스별 "내 약국"/"내 매장"/"내 보관함", 익숙한 "콘텐츠 만들기", DB/API 변경 비용 큰 legacy 코드명·internal enum.

## 9. 비목표 / 불변

- 본 V1 은 **용어·관계 SSOT 문서**. DB schema/컬럼/enum/API field rename **안 함**. 대규모 component 공통화·production flow 리팩터 **안 함**.
- legacy 식별자(`kpa_store_contents`, `product_ai_contents`, `store_product_profiles`)는 명칭 유지(역할만 본 문서로 고정).

## 10. 후속 (taxonomy 기반)

- `WO-O4O-CONTENT-COPY-POLICY-UI-LABEL-ALIGNMENT-V1` — 가져오기=복사/원본·사본/삭제 영향 문구 정렬(본 §6·§8 기준).
- `WO-O4O-CONTENT-HUB-MY-STORE-COPY-CONTRACT-V1` — assetSnapshot ↔ Neture dashboardCopy 정렬(본 §6).
- `WO-O4O-CONTENT-PRODUCTION-FLOW-UI-COMMONIZATION-V1` — ProductionMaterialEditor/StartProductionModal/AiContentModal(본 §5).
- `WO-O4O-CONTENT-BODY-SANITIZE-ON-WRITE-CROSSSERVICE-V1` — raw 저장 body sanitize 확장(보안).

---

*용어 고정: 상품설명(canonical=shared_product_descriptions) ≠ product_ai_contents(AI draft/seed) ≠ store_product_profiles(legacy fallback) ≠ 일반 콘텐츠 ≠ Production Material(출력물) ≠ 복사본(asset snapshot) ≠ Template. 가져오기=복사, Hub publish=노출. public 상품설명 해석=canonical→legacy fallback→supplier.*
