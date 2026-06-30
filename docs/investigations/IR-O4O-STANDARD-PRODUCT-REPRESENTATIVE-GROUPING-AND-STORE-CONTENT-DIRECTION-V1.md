# IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1

> O4O 표준 상품 구조의 **대표상품 그룹핑 계층**과 **매장 활용 콘텐츠 방향**을 고정하는 종합 IR
> 작성일: 2026-06-30 · 성격: **read-only 종합 IR** (코드/DB/migration/API/UI 변경 없음 · 산출물 = 본 문서 1개)
> 종합 기반: 4개 병렬 선행 조사 (§2)

---

## 1. 목적

본 IR은 4개의 병렬 read-only 조사 결과를 하나로 종합하여, **O4O 표준 상품 구조의 기준선(baseline 방향)을 고정**한다. 구현 결론(migration/컬럼 확정 실행)은 후속 WO로 넘기고, 본 문서는 다음을 확정한다.

1. 포장단위/SKU의 SSOT가 무엇인가 (= 기존 `ProductMaster`, 신규 아님).
2. 대표상품(여러 포장을 묶는 그룹핑) 계층의 신규 필요성과 최소 형태.
3. 공급자 등록 / 매장 경영지원 제품 등록 흐름에 대한 영향(무변경 또는 additive).
4. B2B / B2C / 매장 활용 콘텐츠 3분리 원칙.
5. 공공데이터 활용의 1차 범위(의약품 한정).
6. 만들지 않을 기능 / 후속 WO 후보 / 유보 사항.

표준 상품 구조 그림:

```
O4O 표준 상품
├─ 대표상품   (콘텐츠/소비자 안내 기준 · 여러 포장단위를 묶는 그룹핑)   ← 신규 1개 계층
└─ 포장단위   (공급/유통/주문 기준 · barcode 단위 실물 SKU)          ← 이미 ProductMaster 가 담당
```

대표상품 예시: **"타이레놀정 500mg"**(대표상품) ← `{10정/PTP, 30정/병, 100정/병}` 각각이 별개의 `ProductMaster`(포장단위).

---

## 2. 선행 조사 요약

| # | 문서 | 핵심 확정 사실 |
|---|------|---------------|
| 1 | `IR-O4O-STANDARD-PRODUCT-SHELL-AND-PACKAGE-SCHEMA-V1` | 포장단위는 새 개념이 아니라 **이미 존재하는 `ProductMaster`** 다. 진짜 부재한 것은 그 위 **대표상품 그룹핑 계층 1개**뿐. 1차 권장 = `representative_products` 테이블 1개 + `ProductMaster.representative_product_id` nullable FK 1개(후보 D). `product_package_units` 신규 테이블은 grain 중복(SSOT 2개) → 만들지 않는다. |
| 2 | `IR-O4O-SUPPLIER-PRODUCT-STANDARD-LOOKUP-FLOW-AUDIT-V1` | `supplier_products`(= `product_masters` + `supplier_product_offers`)는 사실상 **포장단위(SKU)** 이며 대표상품 계층은 부재(`representative_product`/`package_unit` grep 0건). 등록 Step1에 이미 **바코드 → 기존 Master 조회** UX 존재 → 표준상품 검색의 선행 형태. 1차 = 검색·선택 + nullable 링크 1컬럼, 신규 표준상품 생성·구조화 필드·별도 package 테이블은 제외/후순위. B2C 자동 덮어쓰기 금지. |
| 3 | `IR-O4O-PUBLIC-DISTRIBUTION-PRODUCT-DATA-SOURCE-AUDIT-V1` | 공공데이터로 "대표상품 + 포장단위 + 기준코드 + 바코드 연결" 구조를 **의약품에서만** 구성 가능. 1차 A등급 소스 3종: 심평원 약가마스터 표준코드(15067462, 키 없는 CSV), 식약처 의약품 제품 허가정보(15095677), 묶음의약품정보서비스(15063908, 대표상품 그룹핑 시드). 의약외품/건기식/의료기기=2차, 화장품/일반소비재=직접 등록 권장. |
| 4 | `IR-O4O-STORE-MANAGEMENT-PRODUCT-STANDARD-ENTRY-FLOW-AUDIT-V1` | `StoreLocalProduct`(`store_local_products`)는 **Display Domain 전용**, `name`만 필수, barcode/thumbnail/description 모두 nullable → "빈 필드 허용 · 최소 정보 등록" 원칙에 이미 100% 부합. 표준상품 연결 FK 전무(깨끗한 백지). Domain 경계 보증은 `ecommerce_order_items/organization_product_listings/organization_product_channels` 참조만 금지 → `product_masters` 참조 nullable FK 추가는 경계 위반 아님. 참고자료 모달 자산(ImportB2cDescriptionModal/StoreContentImportModal/LinkedContentsDrawer) 이미 존재. |
| (보조) | `IR-O4O-PRODUCT-CORE-AND-REGISTRATION-FLOW-AUDIT-V1` | Product Core 단일화는 greenfield 아닌 "이미 구축된 canonical 모델 통합" 문제. `ProductMaster`=SSOT, `SupplierProductOffer`/`StoreProductProfile`/`ProductIdentifier`(부분)/`SharedProductDescription` 현존. barcode 단일 UNIQUE 컬럼이 현 구조 최대 제약. |

**4개 조사의 일관된 결론**: 신규 구조는 최소화하고(대표상품 1계층), 기존 ProductMaster 중심 구조(식별자/이미지/공급자상품/주문가능상품)를 그대로 재사용한다.

---

## 3. 기존 가정과 조사 후 수정된 전제

| 조사 전 가정 | 조사 후 확정 전제 |
|---|---|
| 대표상품·포장단위 **둘 다 신규 설계**한다 (greenfield) | 포장단위는 **이미 `ProductMaster`로 존재**. 신규는 **대표상품 1계층뿐**. |
| `product_package_units` 테이블이 필요하다 | 만들지 않는다. ProductMaster와 grain 중복 → SSOT 2개. |
| 기준코드/표준코드용 `primary_code` 컬럼이 필요하다 | `ProductIdentifier`(source ref 방식 B)가 이미 다중 식별자 계층 제공 → 신규 불필요. |
| `barcode_verified` boolean이 필요하다 | `ProductIdentifier.verification_status`가 더 풍부하게 대체. 매장 측 barcode는 단순 식별 메모로 충분. |
| 매장 직접 등록을 표준 구조에 강제 통합해야 한다 | `StoreLocalProduct`는 Display Domain 유지. 강제 통합 금지, nullable 느슨한 연결만(후속). |
| 공급자 등록 흐름을 새로 짠다 | 기존 `ProductMaster + SupplierProductOffer` 흐름 유지. 검색·선택 + nullable 링크만 additive. |
| 공공데이터로 전 상품군 후보를 만든다 | **의약품 한정**. 그 외는 포장단위·커버리지 빈약 → 직접 등록. |

---

## 4. 현존 Product Core 구조 (조사로 확인된 사실)

```
   (현존 SSOT = 포장단위/SKU grain)
   ┌──────────────────────────────────────────────┐
   │ ProductMaster (product_masters)               │
   │  barcode(varchar14, UNIQUE, immutable) · name ·│
   │  manufacturerName · brand · categoryId ·       │
   │  specification("500mg×60정") · originCountry · │
   │  regulatoryType/Name · drugCategory · tags     │
   └──────────────────────────────────────────────┘
        │1:N            │1:N               │1:N
   ProductImage    ProductIdentifier    (offers)
   (type=thumbnail/ (GTIN/KOREA_DRUG_CODE/         │
    detail/content, ATC/SUPPLIER_SKU/INTERNAL_O4O, │
    is_primary)     source_type·verification_status,│
                    전역 UNIQUE 없음)               │ master_id
   ┌──────────────────────┐   ┌────────────────────────────────┐
   │ SupplierProductOffer │   │ OrganizationProductListing      │
   │ (공급자별 공급 제안:  │   │ (매장 진열 = 주문가능 상품,      │
   │  B2B/B2C 설명·가격·   │   │  master_id 필수 + offer_id      │
   │  재고·distribution·   │   │  nullable)                      │
   │  승인) master_id 1:1  │   │ + StoreProductProfile           │
   └──────────────────────┘   │   (org_id, master_id) UNIQUE    │
                              └────────────────────────────────┘

   (별도 도메인 — Product Core 비연결, Display-only)
   ┌──────────────────────────────────────────────┐
   │ StoreLocalProduct (store_local_products)      │
   │  organizationId · name(필수, 유일) ·           │
   │  barcode(varchar64, nullable, "단순 식별 메모",│
   │  UNIQUE 없음) · images/thumbnailUrl · detailHtml│
   │  ⚠ ecommerce_order_items/listings/channels     │
   │     참조 금지 (Domain 경계 보증)               │
   └──────────────────────────────────────────────┘

   (공용 설명 풀)
   SharedProductDescription (master_id, source_type, status=candidate/canonical/...)
```

**부재 확인**: 대표상품(여러 포장 그룹핑) 계층. `representative_product` / `package_unit` grep 0건.

---

## 5. ProductMaster의 재정의: 포장단위/SKU SSOT

> **결정 1**: `ProductMaster` = O4O **포장단위/SKU SSOT**다. barcode 단위 실물 상품이며 **유통·주문·공급의 기준**이다. 대표상품으로 오해해서는 안 된다.

- baseline 선언: *"물리적 제품 1건 = barcode 1건 = ProductMaster 1건"*.
- 공급가/재고/B2B·B2C 설명은 `SupplierProductOffer`(master 1:1)에, 다중 식별자는 `ProductIdentifier`(master 1:N)에, 이미지는 `ProductImage`(master 1:N)에 응집.
- "한 제품의 여러 포장단위 가격"은 현재 **여러 ProductMaster(=여러 barcode)** 로만 표현된다 → 이것을 묶는 상위 노드가 부재 → §6의 대표상품 계층이 그 공백을 채운다.

> **결정 4**: 별도 `product_package_units` 테이블은 만들지 않는다. ProductMaster가 포장단위를 담당하므로 신규 테이블은 grain 중복(SSOT 2개)을 낳는다.

---

## 6. 신규 대표상품 계층 필요성

> **결정 2**: 대표상품 계층 = 신규 `representative_products` 테이블 **1개**.

- 대표상품 = **소비자 안내와 콘텐츠 활용의 기준**. 포장이 달라도 동일 제품으로 묶는 기준점.
- 예: `타이레놀정 500mg`(대표상품) ← `{10정/PTP, 30정/병, 100정/병}` 각 ProductMaster.
- 공공데이터의 **묶음의약품정보서비스(대표 품목기준코드)** 가 이 개념의 시드 후보(단 "성분 유사" 묶음 기준이므로 "동일제품 다른포장"과 정합 검토 필요 — §16 유보 2).
- 필드는 **거의 전부 nullable**, 대부분 멤버 포장단위(ProductMaster)에서 파생 가능. 유일 필수는 `display_name`.

| 필드 | 타입 | 1차 분류 |
|---|---|---|
| `id` | uuid PK | 필수 |
| `display_name` | varchar | **필수 (유일)** |
| `product_group` | varchar | nullable |
| `manufacturer_name` | varchar | nullable (멤버 파생 가능) |
| `brand_id` / `brand_name` | uuid/varchar | nullable |
| `thumbnail_image_id` | uuid | nullable (없으면 멤버 primary image fallback — §13, 단 §16 유보 3) |
| `created_by` / `created_source` | uuid/varchar | nullable |
| `created_at` / `updated_at` | timestamp | 필수 |

`normalized_name`·`primary_code`는 1차 제외(검색 최적화 후속 / `ProductIdentifier`로 흡수).

---

## 7. 1차 권장 구조

> **결정 3**: 1차 최소 확장 = `product_masters.representative_product_id` nullable FK **1개**.

```
(신규 — 테이블 1개)
representative_products
  id                    uuid PK
  display_name          varchar      NOT NULL   ← 유일 필수
  product_group         varchar      NULL
  brand_id / brand_name uuid/varchar NULL
  manufacturer_name     varchar      NULL
  thumbnail_image_id    uuid         NULL   (없으면 멤버 primary image fallback)
  created_by/source     uuid/varchar NULL
  created_at/updated_at timestamp

(현존 ProductMaster 에 추가 — 컬럼 1개)
ProductMaster.representative_product_id  uuid  NULL  FK → representative_products

(그 외 전부 현존 재사용, 신규 0)
  포장단위/SKU      = ProductMaster
  바코드           = ProductMaster.barcode + ProductIdentifier
  기준코드/표준코드  = ProductIdentifier (방식 B 이미 구현)
  포장 이미지       = ProductImage
  공급자 상품       = SupplierProductOffer.master_id
  주문가능 상품      = OrganizationProductListing.master_id
  매장 자체 제품     = StoreLocalProduct (Display Domain 유지)
  매장 활용 콘텐츠   = 기존 콘텐츠 도메인 (대표상품 id 로 연결만)
```

**신규 총량 = 테이블 1개 + nullable 컬럼 1개.** (후보 D — 가장 작은 additive)

> ⚠️ `product_masters` 컬럼 추가는 **Core 동결 정책(CLAUDE.md §3)** 대상 → 명시적 WO + 소비처 전수 영향평가 필요.

---

## 8. 공급자 상품 등록 흐름에 대한 영향

> **결정 5**: 공급자 등록 흐름 = 기존 `ProductMaster + SupplierProductOffer` 유지.

- 현재 단일 위저드 3-Step(기본정보 → 공급가 → 이미지/설명). Step1에 **바코드 → 기존 Master 조회(`getMasterByBarcode`/`searchBarcode`)** 가 이미 존재 → 표준상품 검색의 선행 형태.
- 1차 도입은 **검색·선택만**: Step1 바코드 블록을 "표준상품(상품명/바코드/표준코드) 검색"으로 확장 → 선택 시 폼 prefill + 그룹핑 키(`representative_product_id`) 부착. **미선택 시 기존 직접 등록 100% 유지.**
- **신규 표준상품(ProductMaster) 생성은 1차 제외** — 등록 폼에 마스터데이터 거버넌스(중복·승인·표준코드 검증)를 끌어들이면 복잡도 급증.
- 공급정책(가격/재고/MOQ/distribution)은 Offer/Profile에 그대로 귀속. 대표상품 도달은 `master_id → ProductMaster.representative_product_id` 간접 경로 → offer에 중복 FK를 두지 않는다.
- **B2C 자동 덮어쓰기 금지**: 표준상품 대표 콘텐츠를 공급자 B2C에 자동 주입하지 않는다(prefill 제안까지만).

---

## 9. 매장 경영지원 제품 등록 흐름에 대한 영향

> **결정 6**: 매장 경영지원 제품 = `StoreLocalProduct` **Display Domain 유지** (주문 불가, `name`만 필수, barcode/thumbnail/description nullable).
> **결정 7**: `StoreLocalProduct.representative_product_id` nullable 연결은 **후속 검토만 (1차 미구현)**.

- 현재 등록은 단일 모달, 백엔드 필수 검증은 `name`뿐. 이미지·설명·바코드·가격 없어도 등록 가능 → "빈 필드 허용" 원칙에 이미 부합.
- 표준상품 연결 FK 전무(백지). Domain 경계 보증은 `ecommerce_order_items/organization_product_listings/organization_product_channels` 참조만 금지 → `product_masters`/`representative_products` 참조 nullable FK 추가는 **경계 위반 아님**. 단 1차에서는 추가하지 않고 후속 WO로 검토.
- 매장 자체 제품의 온라인몰/상품설명 채널은 `not_supported` 고정(Display Domain). 주문가능 상품(`OrganizationProductListing`)과 구조적으로 완전 분리, 섞이는 곳은 읽기전용 `handled-products` UNION 한 곳뿐.
- **GP/KCos 공통 폼 격차**: 바코드 입력·RichTextEditor·MediaPicker·콘텐츠 가져오기가 KPA 전용. 표준상품 검색을 3사 공통화하려면 Shared Module Change Protocol 적용 필요(§16 유보 5).

---

## 10. B2B / B2C / 매장 활용 콘텐츠 구분

> **결정 8**: B2C = **공급자 공식 소비자 설명** (O4O/매장이 임의 대체 금지).
> **결정 9**: O4O가 만드는 콘텐츠 = 공식 B2C가 아니라 **"매장 활용 참고 콘텐츠"**.

```
표준상품
├─ 대표상품 (신규 representative_products)
├─ 포장단위 (ProductMaster)
│
├─ 공급자 제공 데이터 (SupplierProductOffer)
│   ├─ B2B  (business_short/detail_description)   ← 사업자(도매/파트너)용
│   └─ B2C  (consumer_short/detail_description)   ← 공급자 공식 소비자 설명
│
└─ 매장 활용 콘텐츠 (기존 콘텐츠/자료함 도메인)
    ├─ O4O 참고 콘텐츠
    ├─ 공급자 B2C 참고
    ├─ 운영자/서비스 참고
    ├─ 커뮤니티 참고
    └─ 매장 최종 콘텐츠
```

- **3분리 원칙**:
  - **B2B**: 사업자용. 비어 있으면 B2C로 fallback — 단 **저장 시 복사 아님**, **조회 시점 COALESCE**(`COALESCE(spo.business_*, spo.consumer_*)`)로 구현됨.
  - **B2C**: 공급자 공식 소비자 설명. Offer 소유, 공급자 입력. **임의 대체/자동 덮어쓰기 금지.**
  - **매장 활용**: 매장 경영자가 O4O참고 / 공급자B2C참고 / 운영자·서비스참고 / 커뮤니티참고 / 매장 최종콘텐츠로 구성.
- **1차는 보기/복사만**: 자동 혼합·AI 재작성·매장 맞춤 자동생성 안 함. 기존 자산(ImportB2cDescriptionModal=B2C 복사 / StoreContentImportModal=내 콘텐츠 복사 / LinkedContentsDrawer=연결 조회)을 보기·복사 중심으로 결합.
- B2B/B2C는 이미 Offer에 4필드로 분리. Product Core(대표상품/포장단위)로 끌어올리지 않는다. 매장 활용 콘텐츠는 기존 콘텐츠 도메인이 담당, 이 스키마는 연결 지점(대표상품 id)만 제공.

---

## 11. 공공데이터 활용 방향

> **결정 10**: 공공데이터 1차 대상 = **의약품 한정**.

| 소스 | data.go.kr | 제공 | 활용 |
|---|---|---|---|
| 약가마스터 의약품표준코드 | 15067462 | **키 없는 CSV** (≈29.8만행, 연1회) | 표준코드(13자리)/한글상품명/업체명/포장형태/제품총수량 → **ProductMaster(포장단위) 후보 핵심** |
| 의약품 제품 허가정보 | 15095677 | OpenAPI(키필요) | 품목기준코드/포장단위/전문일반구분/허가상태 → 약가마스터 보강 |
| 묶음의약품정보서비스 | 15063908 | OpenAPI(키필요) | 대표 품목기준코드/대표 제품명/멤버 품목 → **대표상품 그룹핑 후보** |

- 표준코드(13자리 KD코드)는 GS1 GTIN-13/14의 근간 → **바코드 연결 키**로 활용 가능.
- 세 소스 결합 시 **의약품에 한해** "대표상품 + 포장단위 + 기준코드 + 바코드 연결" 후보를 공공데이터만으로 구성 가능.
- **의약외품/건기식/의료기기/화장품/일반소비재 = 1차 import 대상 아님** → 후순위(2차) 또는 직접 등록 보완. 포장단위·커버리지가 빈약.
- 이용허락: 식약처="제한없음", 심평원 약가마스터="공공저작물 제1유형(출처표시)" → 출처표시 의무 준수.
- import 흐름은 **후보 생성**용이며, baseline §8·§12에 따라 ProductMaster에 직접 확정 저장이 아닌 candidate/draft 경유가 정합(후속 설계).

---

## 12. 바코드와 식별자 원칙

- **바코드는 틀릴 수 있다.** 미확인이라도 사용 차단 안 함. **검증/신고 기능을 만들지 않는다.** 문제 제기는 기존 문의(대화) 흐름으로 처리.
- `ProductMaster.barcode`(varchar14, GTIN) = 포장단위 grain에 위치(원칙과 일치). 미입력 시 내부 바코드 자동생성(GS1 prefix 200, EAN-13) + `INTERNAL_O4O` identifier.
- 다중·중복·비-GTIN 코드(표준코드/보험코드/SKU)는 `ProductIdentifier`(전역 UNIQUE 없음, `verification_status`)로 수용 → "미확인/충돌 수용"이 이미 구조화됨. `barcode_verified` boolean 신규 불필요.
- `StoreLocalProduct.barcode`(varchar64, nullable, UNIQUE 없음) = **단순 식별 메모 유지**. 스캔/OCR/외부조회/중복검사 없음.
- ⚠️ `ProductMaster.barcode`는 **전역 UNIQUE**, 매장 barcode는 중복 허용 — 두 원칙의 관계는 §16 유보 1.

---

## 13. 이미지와 썸네일 원칙

- **썸네일/이미지 없이 등록 가능** — 오류 아님(전부 nullable / 기본 `[]`).
- 포장단위별 이미지는 `ProductImage`(master 1:N, type=thumbnail/detail/content, is_primary)로 이미 지원. 신규 작업 0.
- 대표상품 썸네일은 `representative_products.thumbnail_image_id` nullable + 없으면 **멤버 포장단위의 primary ProductImage로 fallback**(조회 시 COALESCE). 별도 이미지 테이블 신규 불필요.
- `StoreLocalProduct`는 `thumbnailUrl`/`images`/`galleryImages`(jsonb URL) 별개 구조 — 매장이 나중에 보완 가능.
- 매장 이미지 1000×1000/webp 파이프라인 백엔드 실재 여부는 별도 확인 대상(공급자 import 경로엔 존재).

---

## 14. 만들지 않을 기능 (1차/고정 제외)

- `product_package_units` 신규 테이블 (ProductMaster와 grain 중복)
- ProductMaster 외 별도 포장단위 SSOT
- `StoreLocalProduct → ProductMaster` 강제 통합
- 공급자 등록 중 신규 대표상품 생성 / 매장 등록 중 신규 ProductMaster 생성
- 바코드 검증/신고 기능 (`barcode_verified` boolean 포함)
- B2C 자동 덮어쓰기
- O4O AI로 공식 B2C 생성
- 콘텐츠 자동 혼합 / AI 재작성 / 매장 맞춤 자동생성
- 공공데이터 전체 상품군 import (의약품 외)
- DUR / 상담 / 처방 판단 연결
- 복잡한 승인/검수 워크플로

---

## 15. 후속 WO 후보

### WO-O4O-PRODUCT-MASTER-REPRESENTATIVE-LINK-FOUNDATION-V1
- `representative_products` 테이블 추가(§6 필드, `display_name`만 NOT NULL).
- `product_masters.representative_product_id` nullable FK 추가.
- ProductMaster 조회 응답 **additive 확장** 검토(기존 필드 무변경).
- 기존 등록/조회/주문 흐름 **무변경**. (Core 동결 → 명시적 WO + 소비처 전수 영향평가)

### CHECK-O4O-DRUG-STANDARD-CODE-CSV-SAMPLE-MAPPING-V1
- 약가마스터(15067462) CSV **실제 헤더/인코딩/포장형태 코드값** 확인.
- 표준코드/품목기준코드/상품명/업체명/포장형태/제품총수량 컬럼 확인.
- **100~500건 샘플**로 ProductMaster 매칭 가능성 검증.
- 묶음의약품 대표 품목기준코드 ↔ 대표상품 매핑 가능성 검토.

### WO-O4O-SUPPLIER-PRODUCT-STANDARD-MASTER-LOOKUP-PREFILL-V1
- 공급자 등록 Step1 바코드 조회를 **ProductMaster 검색(상품명/바코드/표준코드)** 으로 확장.
- 선택 시 폼 prefill, **미선택 시 기존 등록 유지**.
- **신규 표준상품 생성 없음** (검색·선택만).

### WO-O4O-STORE-LOCAL-PRODUCT-REPRESENTATIVE-LINK-V1
- `store_local_products.representative_product_id` nullable 추가 **검토**.
- KPA 등록/수정 모달에 표준상품 검색·선택(**optional**).
- 미선택 등록 가능, **바코드 검증 없음**.

### WO-O4O-STORE-LOCAL-PRODUCT-CONTENT-REFERENCE-VIEW-COPY-V1
- KPA `StoreLocalProductsPage` 설명 영역(§13 위치 A)에 참고자료 보기 버튼(O4O참고 / 공급자B2C참고 / 운영자·서비스 / 커뮤니티).
- **보기·복사 중심**. 자동 혼합·AI 재작성·편집기 강제삽입 없음.

---

## 16. 위험 요소와 유보 사항

1. **`ProductMaster.barcode` 전역 UNIQUE vs 매장 barcode 중복 허용**의 관계 — Identifier Core(barcode 단일 UNIQUE → ProductIdentifier 다중 계층)와 대표상품 계층의 선후 관계 확정 필요.
2. **묶음의약품 대표 품목기준코드 ↔ O4O 대표상품 개념 완전 일치 여부** — 공공데이터 묶음 기준은 "성분 유사", O4O는 "동일제품 다른포장" → 정제 규칙 필요.
3. **`representative_products.thumbnail_image_id`를 둘지 vs 멤버 ProductImage fallback만** — 대표상품 전용 썸네일 컬럼 보유 여부 결정 유보.
4. **StoreLocalProduct에 `representative_product_id`만 둘지 vs `master_id`도 둘지** — 콘텐츠 정합(대표상품)과 실물/바코드 정합(포장단위) 중 어디까지 연결할지.
5. **GP/KCos까지 표준상품 검색 공통화 vs KPA 우선** — 공통 폼 기능 격차(바코드/RichTextEditor/MediaPicker) → Shared Module Change Protocol 적용 대상.
6. **`SharedProductDescription`을 매장 활용 참고 콘텐츠에 어떻게 연결할지** — master 기준 전용 엔티티이며 명시적으로 StoreLocalProduct 대상 아님(주석) → 끌어오기 금지, 연결 방식 별도 설계.

---

## 17. 최종 결론

> O4O 표준 상품 구조에서 포장단위/SKU는 새로 만들지 않고 기존 `ProductMaster`가 담당한다. 1차 신규 구조는 `representative_products` 하나이며 `ProductMaster`에 `representative_product_id` nullable FK 추가가 최소 확장안이다. 공급자상품/주문가능상품/상품이미지/식별자는 기존 ProductMaster 중심 구조를 재사용한다. `StoreLocalProduct`는 매장 경영활용 제품으로 Display Domain을 유지하고 필요시 대표상품에 nullable 연결한다. O4O가 만드는 콘텐츠는 공급자 공식 B2C가 아니라 매장 활용 참고 콘텐츠다. 공공데이터 1차 대상은 의약품으로 한정한다. `package_units` 테이블·자동병합·검수워크플로·바코드 검증/신고 기능은 만들지 않는다.

### 결정 고정 요약

| # | 결정 |
|---|------|
| 1 | ProductMaster = 포장단위/SKU SSOT (대표상품 오해 금지) |
| 2 | 대표상품 = 신규 `representative_products` 1개 |
| 3 | 1차 최소 확장 = `product_masters.representative_product_id` nullable FK 1개 |
| 4 | `product_package_units` 신규 테이블 만들지 않음 |
| 5 | 공급자 등록 = 기존 ProductMaster + SupplierProductOffer 유지 |
| 6 | 매장 경영지원 = StoreLocalProduct Display Domain 유지 |
| 7 | StoreLocalProduct 대표상품 연결 = 후속 검토만 (1차 미구현) |
| 8 | B2C = 공급자 공식 소비자 설명 (임의 대체 금지) |
| 9 | O4O 생성 콘텐츠 = 매장 활용 참고 콘텐츠 (공식 B2C 아님) |
| 10 | 공공데이터 1차 = 의약품 한정 |

---

**작성:** O4O Platform 종합 IR · 2026-06-30
**성격:** read-only 종합 IR — 4개 병렬 조사 종합. 구현 결론(migration/컬럼 확정 실행)은 §15 후속 WO로 위임.
