# IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1

> **유형:** read-only 정책·구조 조사 — 코드/DB/UI **무변경**.
> **판정: A (공용 후보 풀 + 관리자 정비 + 대표 설명 1개) 채택 / D (매장별 override·selection) 비권장 확정 / C (product_ai_contents) 후보 시드로만 부분 재사용.**
> **🔵 방향 전환:** 본 IR 은 선행 [`CHECK-O4O-PRODUCT-DESCRIPTION-STORE-SCOPE-BRIDGE-V1`](CHECK-O4O-PRODUCT-DESCRIPTION-STORE-SCOPE-BRIDGE-V1.md) 의 **B안(store_product_descriptions 매장별 저장소) 방향을 대체(deprecate)** 한다. 상품설명은 매장별 자산이 아니라 **O4O 공용 상품 DB 자산**으로 본다.
> 선행: STORE-SCOPE-BRIDGE · STANDARDIZATION · [`O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1`](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md) — 2026-06-16

---

## 1. 정책 배경 (사용자 확정)

상품설명은 분량이 크고 품질 편차가 크다. 매장별 사본/override/선택값으로 관리하면 중복 작업·품질 분산·자산화 약화·UI 복잡도가 커진다. 따라서:

```text
상품설명 = O4O 공용 상품 DB 자산
공용 후보 풀 → O4O 전체 관리자 정기 정비 → 대표 상품설명 1개 → 모든 매장 기본 사용
```

- 매장별 본문 override 저장소 **기본 정책 제외**.
- 매장별 "후보 선택값(selection)" 저장 **기본 정책 제외**.
- 매장 특화 홍보문/이벤트/POP·블로그 문구는 **기존 콘텐츠 만들기/콘텐츠 리스트**로 안내(별도 저장소·코드 분기 금지).

---

## 2. 상품 식별 체계 (backbone — 이미 충분)

| 자산 | 식별/관계 | 설명 |
|------|------|------|
| **ProductMaster** | `barcode`(GTIN 14, **immutable, 1:1**) | **플랫폼 상품 SSOT.** "물리 제품 1 = barcode 1 = ProductMaster 1". O4O 전체 상품 코드 = barcode |
| **ProductIdentifier** (Identifier Core) | `(product_master_id, identifier_type, normalized_value)` | **O4O 자체 코드/대체 식별자 계층 이미 존재.** primary=barcode mirror, additive |
| **SupplierProductOffer** | `master_id` → ProductMaster | 공급자 공급 제안 (master 안정 연결) |
| **OrganizationProductListing** | `offer_id` → offer.`master_id` → ProductMaster | 매장 진열/주문 가능 상품. master 까지 **안정 연결** |
| **StoreLocalProduct** | **master 링크 없음**(독립 UUID) | **off-catalog 매장 자체 상품.** ProductMaster/barcode 와 무관 |

**결론:**
- 공용 상품 DB 의 중심축 = **ProductMaster(barcode)** — 확립됨. listing→offer→master 체인 안정.
- O4O 자체 product code 는 **ProductIdentifier Core 로 이미 표현 가능** → 별도 code-bridge WO 거의 불필요(§9).
- **StoreLocalProduct 는 공용 자산 대상 밖** — barcode/master 가 없어 "대표 설명" 개념이 성립하지 않음. local 은 native `detail_html` 유지(별 우주).

---

## 3. 설명 자료 현황 — 후보는 이미 분산 존재

ProductMaster 자체엔 **description 컬럼이 없다.** 그러나 master 기준으로 묶을 수 있는 설명 소스가 이미 여러 곳에 존재한다(= 사실상 후보들이 흩어져 있음):

| 소스 | 컬럼 | 성격 | master 연결 |
|------|------|------|:--:|
| **SupplierProductOffer** | `consumer_short_description`, `consumer_detail_description`, `business_short_description`, `business_detail_description` | **공급자 제공 설명**(소비자/사업자 × 단문/상세) | ✅ offer.master_id |
| **ProductDrugExtension** | `efficacy_text`, `dosage_text`, `caution_text`, `storage_text`, `contraindication_text`, `ingredient_summary` | **의약품 규제 구조화 상세** | ✅ 1:1 master |
| **product_ai_contents** | `product_description`(content_type) | **AI 초안**(master 키, 1행/master) | ✅ product_id=master |
| **ProductMaster** | (description 컬럼 없음) | name/specification/tags 뿐 | — |

→ "후보 풀"은 **새로 만드는 게 아니라, 흩어진 소스를 master 기준으로 모으고 대표 1개를 지정**하는 문제. 빠진 것은 ① 대표 지정, ② 후보 상태/큐레이션, ③ 상품 상세 노출 연결.

---

## 4. 대표 상품설명 저장 — 선택지

| 방식 | 내용 | 후보 다중 | 상태/큐레이션 | 비고 |
|------|------|:--:|:--:|------|
| A. ProductMaster description 필드 | master 에 대표 1컬럼 | ✗ | ✗ | 가장 단순, 후보/이력 없음. SSOT immutable 성격과 약간 상충 |
| **B. 공용 후보 테이블 + canonical 플래그** ✅ | `shared_product_descriptions(master_id, content, source_type, status, ...)` | **✓** | **✓** | 후보 풀+대표 동시. master 기준. 권장 |
| C. product_ai_contents 재사용 | 그중 하나 대표 표시 | △(현재 1행/master) | ✗(상태 없음) | AI 초안 시드로만. 다중 후보/상태엔 부족 |
| D. SupplierProductOffer 설명 fallback | 공급자 설명만 노출 | ✗ | ✗ | 대표 부재 시 fallback 으로만 |

### 권장: B (공용 후보 테이블 + canonical 1개)
```text
shared_product_descriptions
- id (uuid)
- master_id (uuid)              -- ProductMaster(barcode) 기준
- content (text, HTML)
- source_type ('supplier' | 'ai' | 'admin' | 'community' | 'store')
- source_ref (uuid, nullable)   -- offer_id / ai_content_id / user 등 출처
- status ('candidate' | 'canonical' | 'hidden' | 'needs_review' | 'deprecated')
- curated_by (uuid, nullable)   -- 관리자
- created_at / updated_at
부분 UNIQUE: master_id WHERE status='canonical'  -- master 당 대표 1개 보장
```
- **대표 = `status='canonical'` 1행/master.** 노출은 이것을 사용.
- 공급자 설명·AI 초안은 `source_type='supplier'/'ai'` 후보로 흡수(또는 참조). 매장/공급자/커뮤니티 기여본도 `candidate` 로만 들어오고 **자동 canonical 금지**.
- product_ai_contents(AI 초안)는 **유지** — 후보 시드/생성 도구. POP/QR/signage 의 master-global 용도 그대로.

---

## 5. O4O 관리자 정비 모델

```text
- 후보(candidate)는 master 기준으로 축적된다 (공급자/AI/관리자/커뮤니티).
- O4O 전체 관리자가 정기적으로 후보를 정비한다:
    AI 보조 = 중복 병합 · 요약/표준화 · needs_review 플래깅
    사람 검수 = 품질 확인 · 법적 표현(특히 의약품) 확인
- 관리자가 대표(canonical) 1개를 지정한다.
- 품질 낮은 후보 = hidden / deprecated.
- 매장·공급자·커뮤니티 기여본은 자동 canonical 이 되지 않는다(관리자 책임).
```

상태값(권장): `candidate · canonical · hidden · needs_review · deprecated`.
의약품군은 `ProductDrugExtension` 규제 텍스트 + `efficacy/caution/contraindication` 와 정합 검수 필요(법적 안전).

---

## 6. 상품 상세 노출 (output) — 단순 연결

현재 `glycopharm/store.controller:147` 가 `'' AS description` 하드코딩 → 모든 카탈로그 상품 설명 공백(IR 선행). 정책 적용 후 노출 우선순위:

```text
카탈로그 상품(listing→offer→master):
1. shared_product_descriptions.canonical (관리자 지정 대표)
2. SupplierProductOffer.consumer_detail_description (공급자 제공)
3. ProductMaster name/specification (+ 의약품: ProductDrugExtension 구조화)

off-catalog 매장 자체 상품(StoreLocalProduct):
- native detail_html (현행 유지, 공용 자산 대상 아님)
```

→ **매장별 selection/override 없이** master 기준 대표 설명을 직접 노출. 매장 UI 단순(읽기 전용 표시).

---

## 7. 매장 특화 문구 — 안내로 처리 (코드 분기 금지)

상품설명 화면에 안내 문구만 둔다(별도 저장소/흐름 없음):

> 상품설명은 O4O 공용 상품 DB 기준으로 관리됩니다. 매장만의 홍보문·이벤트 문구·POP/블로그용 문구가 필요하면 **콘텐츠 만들기**에서 별도 콘텐츠로 제작하세요.

- POP/블로그/안내문/이벤트 문구 = 기존 제작 흐름(canonical 6단계, store_pops/store_blog_posts 등)에서 처리. 신규 코드 0.

---

## 8. 판정 (A/B/C/D)

- **A — 채택.** 식별이 ProductMaster(barcode)/ProductIdentifier 로 묶이고, 설명 후보 소스가 이미 다수 존재하며, 관리자 정비·대표 지정 모델과 정합. 매장별 selection/override 없이 대표 노출 가능.
- **B(저장 방식) 권장** — 공용 후보 테이블 + canonical 플래그가 후보 풀+대표+상태를 동시에 표현.
- **C — 부분 재사용.** product_ai_contents 는 **AI 초안/후보 시드**로 유지하되, 1행/master·상태 부재로 후보 풀 본체로는 부족 → B 로 승격.
- **D — 비권장 확정.** 매장별 본문 override·선택값 저장소는 복잡도↑·품질 분산·공용 자산화 약화 → **선행 STORE-SCOPE-BRIDGE B안 deprecate.**

---

## 9. 선행 방향 수정 / 식별 bridge 재평가

- **STORE-SCOPE-STORAGE(매장별 store_product_descriptions) 방향 폐기.** 대신 master 기준 `shared_product_descriptions`.
- **EDITOR-UNIFIED-SOURCE(local+listing 통합 편집 목록) 방향도 폐기/축소.** 카탈로그 상품 설명은 매장이 편집하지 않고 관리자가 정비. local 상품은 native detail_html. 매장 편집기는 "공용 설명 표시 + 콘텐츠 만들기 안내"로 단순화.
- **WO-O4O-PRODUCT-CODE-IDENTITY-BRIDGE 거의 불필요** — barcode + ProductIdentifier Core 가 이미 O4O 코드 체계 제공. 필요 시 StoreLocalProduct↔barcode 선택적 연결(있다면 그 local 도 카탈로그 설명 참조 가능)만 소규모 검토.

---

## 10. 후속 WO 우선순위

| 순위 | WO | 목적 | 비고 |
|:--:|------|------|------|
| **1** | `WO-O4O-PRODUCT-DESCRIPTION-SHARED-CANDIDATE-STORAGE-V1` | `shared_product_descriptions`(master 기준 후보 풀 + canonical 상태) 정의·생성 + 기존 소스(공급자/AI) 후보 흡수 전략 + DB 실측 | B안 |
| **2** | `WO-O4O-PRODUCT-DESCRIPTION-ADMIN-CURATION-V1` | O4O 관리자 후보 정비/대표 지정/숨김 + AI 보조(병합·표준화) | storage 후 |
| **3** | `WO-O4O-PRODUCT-DESCRIPTION-CANONICAL-OUTPUT-LINK-V1` | 상품 상세 description = canonical 우선 fallback 연결(`'' AS description` 제거) | storage 후(curation 병행 가능) |
| 4 | `WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1`(소) | 상품설명 화면 안내 문구(공용 관리 + 콘텐츠 만들기 유도) | 독립 가능 |
| — | ~~STORE-SCOPE-STORAGE / EDITOR-UNIFIED-SOURCE~~ | **폐기**(§9) | — |

> 1·3 은 병렬 가능(저장 정의 → 노출 연결). 2 는 운영 화면이라 후행. 4 는 즉시 가능한 소형.

---

## 11. 무변경 확인 / 산출물

- 코드/DB/마이그레이션/route/UI/스키마/후보 테이블/대표 필드/관리자 화면/AI batch/콘텐츠 만들기/override·selection 저장소 **변경 0**.
- DB row 실측 미수행(prod 방화벽/비대화형) — storage WO 선행 권장.
- 조사 문서 1개만 생성(path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용.

---

*Date: 2026-06-16 · 상품설명 공용 자산·대표 설명 정책 조사 · 판정 A(공용 후보 풀+관리자 정비+대표 1개) · D(매장별 override/selection) 비권장 확정 → STORE-SCOPE-BRIDGE B안 deprecate · 식별=ProductMaster(barcode)+ProductIdentifier 이미 충분, 설명 후보(공급자 4종/의약품 구조화/AI 초안) 이미 분산 존재 · 후속 P1 shared_product_descriptions→P2 admin curation→P3 canonical output-link · 코드/DB 무변경.*
