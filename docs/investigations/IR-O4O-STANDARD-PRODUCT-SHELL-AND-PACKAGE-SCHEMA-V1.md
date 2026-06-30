# IR-O4O-STANDARD-PRODUCT-SHELL-AND-PACKAGE-SCHEMA-V1

> O4O 표준 상품의 기본 구조(**대표상품 + 포장단위**) 최소 스키마 설계 조사
> 작성일: 2026-06-30 · 성격: read-only 설계 조사 (코드/migration/API/UI 작성 없음)
> 자매 조사: [`IR-O4O-PUBLIC-DISTRIBUTION-PRODUCT-DATA-SOURCE-AUDIT-V1`](IR-O4O-PUBLIC-DISTRIBUTION-PRODUCT-DATA-SOURCE-AUDIT-V1.md) (공공데이터 후보)
> 선행 baseline: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md)

---

## 1. 목적

O4O 표준 상품의 기본 구조인 **대표상품 + 포장단위**를 최소 스키마 관점에서 설계한다. 목적은 마이그레이션 작성이 아니라 **앞으로 O4O 상품 데이터가 따라야 할 최소 표준 형식**의 정의다.

```
O4O 표준 상품
├─ 대표상품   (콘텐츠/소비자 안내 기준)
└─ 포장단위   (공급/유통/주문 기준)
```

---

## 2. 배경과 원칙

### 2.1 가장 중요한 사전 발견 (조사 결과로 전제가 바뀐다)

이 조사 요청서는 "대표상품/포장단위를 새로 설계한다"는 **greenfield 가정**으로 작성되었으나, 코드베이스 조사 결과 **전제가 일부 무너진다.**

> **현재 `ProductMaster`(`product_masters`) 가 이미 "포장단위/SKU" grain 의 SSOT 다.**
> baseline 선언: *"물리적 제품 1건 = barcode 1건 = ProductMaster 1건"*
> ([ProductMaster.entity.ts](../../apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts), [O4O-PRODUCT-CORE-BASELINE-V1](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §2)

즉 이 IR 이 말하는 **포장단위는 새 개념이 아니라 이미 존재하는 ProductMaster** 다. 진짜 **부재한 것은 그 위의 "대표상품(representative)" 그룹핑 계층 하나뿐**이다.

마찬가지로 §9 의 "기준 코드 source ref 방식(방식 B)" 도 **이미 구현되어 있다**: [`ProductIdentifier`](../../apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts) (`product_identifiers`) 가 `{product_master_id, identifier_type, identifier_value, normalized_value, source_type, is_primary, verification_status}` 의 1:N 다중·비-GTIN 식별자 계층을 이미 제공한다.

따라서 본 조사의 **가장 중요한 기여는 "두 개의 새 테이블을 만들지 말라"** 는 것이다. 기존 SSOT(ProductMaster)를 포장단위로 재사용하고, **대표상품 계층 1개만 additive 로 추가**하는 것이 가장 단순하고 baseline 정합적인 설계다.

### 2.2 유지하는 원칙 (요청서 §3·§21)

- 정확한 완성보다 **표준 형식**이 우선이다.
- **빈 필드는 오류가 아니다.** 썸네일·상세설명·기준코드 없이도 등록 가능.
- 매장 경영자 직접 등록 상품도 같은 표준 형식을 따른다.
- 바코드 미확인은 사용 제한 사유가 아니다.
- 공급자 B2C = 공식 소비자용 설명. **O4O 가 만드는 것은 공식 B2C 가 아니라 매장 활용 참고 콘텐츠.**
- 코드가 복잡해지는 설계는 제외/후순위.

### 2.3 현존 구조 (조사로 확인된 사실)

```
   (현존, SSOT = 포장단위/SKU grain)
   ┌──────────────────────────────────────────────┐
   │ ProductMaster  (product_masters)              │
   │  barcode(varchar14, UNIQUE) · name ·          │
   │  manufacturerName · brandName/brandId ·        │
   │  categoryId · specification · originCountry ·  │
   │  regulatoryType/Name · drugCategory · tags     │
   └──────────────────────────────────────────────┘
        │ 1:N            │ 1:N              │ 1:N
   ProductImage    ProductIdentifier   (offers)
   (대표 isPrimary,  (GTIN/표준코드/보험/         │
    type=thumbnail/   내부/공급자/약국로컬,        │
    detail/content)   source_type·verification)   │
                                                   │ master_id
   ┌──────────────────────┐   ┌────────────────────────────────┐
   │ SupplierProductOffer │   │ OrganizationProductListing      │
   │ (공급자 전용: B2B/B2C │   │ (매장 진열, master_id +         │
   │  설명·가격·재고·승인)  │   │  offer_id nullable)             │
   └──────────────────────┘   └────────────────────────────────┘
                              + StoreProductProfile (org_id, master_id) UNIQUE

   (별도 도메인, Product Core 비연결 — display-only)
   ┌──────────────────────────────────────────────┐
   │ StoreLocalProduct (store_local_products)      │
   │  organizationId · name · barcode(varchar64,   │
   │  nullable, "단순 식별 메모") · images · thumb  │
   └──────────────────────────────────────────────┘
```

---

## 3. 대표상품 정의

대표상품은 **소비자 안내와 콘텐츠 활용의 기준**이다. 포장단위가 달라도 동일 제품으로 묶는 기준점.

예: `타이레놀정 500mg` (= 10정/PTP, 30정/병 등 여러 포장단위를 묶음).

공공데이터 자매조사(§5.3)의 **묶음의약품정보서비스(대표 품목기준코드)** 가 이 개념과 1:1 대응한다.

**현재 코드베이스에 대표상품 계층은 부재**하다. ProductMaster 는 포장단위 grain 이므로 그 위에 그룹핑 노드가 없다.

---

## 4. 포장단위 정의

포장단위는 **공급·유통·주문의 기준**(실제 거래/물류 SKU)이다.

예: `타이레놀정 500mg 10정/PTP`, `타이레놀정 500mg 30정/병`.

> **결론(중요): 포장단위 = 현존 `ProductMaster`.** 새 `product_package_units` 테이블을 만들면 ProductMaster 와 grain 이 겹쳐 SSOT 가 둘이 된다. 만들지 않는다.

---

## 5. 대표상품 최소 필드 후보

대표상품 계층만 신규다. 필드는 **거의 전부 nullable**, 대부분 멤버 포장단위(ProductMaster)에서 파생 가능.

| 필드 | 타입 | 1차 분류 | 비고 |
|---|---|---|---|
| `id` | uuid PK | 필수 | |
| `display_name` | varchar | **필수** | 유일한 필수 입력 |
| `product_group` | varchar | nullable | 미분류 허용 |
| `manufacturer_name` | varchar | nullable | 멤버에서 파생 가능 |
| `brand_name` / `brand_id` | varchar/uuid | nullable | ProductMaster 와 동일 패턴 |
| `thumbnail_image_id` | uuid | nullable | §8 (없으면 멤버 primary image fallback) |
| `created_by` / `created_source` | uuid/varchar | nullable | 추적용 |
| `created_at` / `updated_at` | timestamp | 필수 | |

> 요청서 §5 의 `normalized_name` · `primary_code` 는 **1차 제외 권장.** `primary_code` 는 ProductIdentifier 로 흡수(§9), `normalized_name` 은 검색 최적화이므로 후속.

신규 테이블명 후보: **`representative_products`** (= `대표상품`). grain 명확.

---

## 6. 포장단위 최소 필드 후보

포장단위 = **현존 ProductMaster**. 요청서 §6 후보 필드를 현존 컬럼에 매핑:

| 요청서 후보 | 현존 ProductMaster 대응 | 상태 |
|---|---|---|
| `package_unit_id` | `id` | 있음 |
| `representative_product_id` | **(신규) `representative_product_id` nullable** | 추가 필요 (단 1개 컬럼) |
| `package_display_name` | `name` | 있음 |
| `quantity` / `unit` | `specification` (자유텍스트) + **의약품: `ProductDrugExtension.package_quantity`/`package_unit`(varchar64)** | 부분 (비의약품 정형 분해는 후속) |
| `barcode` | `barcode` (varchar14, UNIQUE) | 있음 |
| `standard_code` | `ProductIdentifier` (KOREA_DRUG_CODE 등) | 있음(별도 계층) |
| `package_image_id` | `ProductImage` (master 1:N) | 있음 |
| `created_by/source`, timestamps | (timestamps 있음, created_by 없음) | 부분 |

> **포장단위에 새로 필요한 것은 `representative_product_id` nullable FK 단 하나.** 나머지는 이미 있다. `quantity`/`unit` 정형 필드는 의약품에 한해 `ProductDrugExtension.package_quantity`/`package_unit` 로 이미 존재하며, 비의약품 정형 분해는 등록 부담을 키우므로 1차는 `specification` 자유텍스트 유지, 후속 정형화.

---

## 7. 바코드 설계

요청서 §7 원칙(바코드는 포장단위에)은 현존 구조와 **이미 일치**한다.

- `ProductMaster.barcode` (varchar14, UNIQUE) — 포장단위 grain 에 위치. ✅
- barcode 없으면 내부 바코드 자동생성(GS1 prefix 200, EAN-13) + `INTERNAL_O4O` identifier (현존).
- 다중·중복·비-GTIN 코드는 `ProductIdentifier.verification_status` 로 미확인/충돌 수용 — 요청서의 "미확인이어도 사용 제한 안 함" 이 이미 구조화돼 있음.

> 요청서 §7 의 `barcode_verified boolean` 는 **신규 불필요.** `ProductIdentifier.verification_status` (`unverified`/`operator_verified`/`conflict` 등)가 더 풍부하게 대체.
>
> ⚠️ 단, 현존 `barcode` 는 **전역 UNIQUE** 다. 요청서 원칙("바코드가 틀릴 수 있다/중복 수용")과 충돌 가능. baseline §5 도 이를 "현 구조의 가장 큰 제약"으로 명시. → **대표상품/포장단위 도입과 무관하게 Identifier Core 가 이 제약 해소의 본류**(별도 Phase).

---

## 8. 썸네일 설계

요청서 §8 원칙(대표 썸네일은 대표상품에)에 동의. 다만 현존 이미지는 **포장단위(ProductMaster)에 1:N 으로 매달려 있다**(`ProductImage`, `is_primary`, `type=thumbnail`).

권장:

- **대표상품**: `thumbnail_image_id` nullable. 없으면 **멤버 포장단위의 primary ProductImage 로 fallback** (조회 시 COALESCE). → 별도 이미지 테이블 신규 불필요.
- **포장단위별 이미지**: 이미 `ProductImage` 로 지원됨(§6). 1차 신규 작업 없음.
- 썸네일은 필수값 아님. 없으면 비워둠.

---

## 9. 기준 코드 설계

> **방식 B(source ref)가 이미 구현되어 있다.** 요청서 §9 의 A vs B 비교는 사실상 결론이 나 있다 — **방식 B 채택, 단 신규 테이블 없이 기존 `ProductIdentifier` 재사용.**

`ProductIdentifier` 가 이미 제공: `identifier_type`(GTIN/EAN13/KOREA_DRUG_CODE/KOREA_INSURANCE_CODE/ATC_CODE/MFDS_CODE/SUPPLIER_SKU/STORE_LOCAL/INTERNAL_O4O/...), `identifier_value`, `normalized_value`, `source_type`, `is_primary`, `verification_status`, `metadata`.

→ 요청서가 우려한 "방식 B 가 1차 구현 범위를 키운다"는 **해당 없음**(이미 존재). 대표상품/포장단위 어느 쪽에도 `primary_code`/`standard_code` 단순 필드를 새로 만들지 않는다.

대표상품 식별(예: 묶음 대표 품목기준코드)이 필요하면, 후속에서 `ProductIdentifier` 에 대표상품 레벨을 허용하거나 `representative_products.primary_code` nullable 1개를 두는 정도로 충분(1차는 보류 권장).

---

## 10. 매장 직접 등록 상품 적용

요청서 §10 흐름은 표준 형식 적용 측면에서 타당. 단 **현존 구조상 두 갈래의 긴장**이 있다:

1. **표준 경로(Product Core)**: 매장이 등록 → ProductMaster(포장단위) [+ representative_products] 생성. 단 baseline §8·§12 는 *"모바일/수집 데이터를 ProductMaster 에 직접 확정 저장 금지(SSOT 오염 방지) — candidate/draft 경유"* 를 명시. → 매장 직접 등록도 **`product_candidates` 검토 큐 경유**가 baseline 정합.
2. **현존 매장 자체 상품(`StoreLocalProduct`)**: display-only 별도 도메인, Product Core 미연결. baseline §4 가 *"통합 대상 아님(혼동 금지)"* 로 명시.

> **판단:** 매장 직접 등록을 "표준 형식"으로 끌어들이려면, StoreLocalProduct 를 ProductMaster 로 강제 통합하는 대신 **nullable 연결 필드(`representative_product_id` / `master_id`)를 additive 로 부착**하여 *"원하면 표준 상품에 정합, 안 해도 동작"* 의 느슨한 연결을 권장(§12). 강제 통합은 baseline 위반.

매장 직접 등록 최소 입력은 요청서대로: 대표상품명 + (상품군/기타), 포장단위명 + barcode nullable. 나머지 전부 빈 값 허용.

---

## 11. 공급자 상품 연결

요청서 §11 "공급자 상품은 포장단위와 연결" → **이미 그렇다.**

- `SupplierProductOffer.master_id` → `ProductMaster`(포장단위 grain). 공급가/MOQ/재고/B2B·B2C 설명이 모두 offer(포장단위 기준)에 응집.
- 대표상품 정보는 `ProductMaster.representative_product_id` 를 통해 **간접 도달** 가능.

> **결론: supplier 측 신규 연결 필드 불필요.** `master_id` 만으로 충분하고, `representative_product_id` 를 offer 에 중복으로 두면 안 된다(baseline §6: 공급정책/식별을 분산시키지 않음). 요청서가 물은 "둘 다 필요한가" → **package(master) 하나면 충분.**

(주의: O4O 에 `supplier_products` 라는 별도 테이블은 없다. 공급자 상품 = `supplier_product_offers`.)

---

## 12. 매장 경영지원 제품 연결

대상이 둘이며 grain 이 다르다 — 혼동 주의:

- **`StoreLocalProduct`** (매장 자체 상품, display-only) — Product Core 미연결.
- **`OrganizationProductListing` + `StoreProductProfile`** (매장이 Master 를 진열) — 이미 `master_id` 로 연결.

권장:

- `StoreLocalProduct`: `representative_product_id` nullable + `master_id`(package) nullable **둘 다 additive**. 콘텐츠는 대표상품, 실물/바코드는 포장단위에 정합하고 싶을 때만 채움. 강제 아님.
- 단, 1차에서 **둘 다 채우도록 요구하지 않는다.** 매장 콘텐츠 중심이면 `representative_product_id` 하나만으로 충분.

---

## 13. O4O 주문 가능 상품 연결

요청서 §13 질문에 현존 구조로 답:

- `OrganizationProductListing` 은 `supplier_product_offers` 를 참조하는가 → **`master_id`(ProductMaster) 필수 + `offer_id`(nullable) 둘 다 참조.** `WO-...-MY-PRODUCTS-FLOW-SIMPLIFY-V1` 로 **offer 없이 master 만으로 진열** 가능.
- 공급자 offer 가 포장단위(master)를 가지므로 listing 은 **이미 간접적으로 포장단위와 연결**됨.
- listing 에 별도 `package_unit_id` 필요한가 → **불필요.** `master_id` 가 곧 포장단위.
- 표준상품 연결은 supplier/master 쪽에 두는 게 나은가 → **그렇다.** listing 은 "매장별 활성화 상태"이므로 표준 식별은 ProductMaster/ProductIdentifier 에 둔다.

대표상품 도달 경로: `listing.master_id → ProductMaster.representative_product_id`. listing 에 신규 필드 0.

---

## 14. B2B / B2C / 매장 사용 데이터와의 관계

요청서 §14 의 분리 원칙은 현존 경계와 정합:

```
표준상품
├─ 대표상품 (신규, representative_products)
├─ 포장단위 (ProductMaster)
│
├─ 공급자 제공 데이터 (SupplierProductOffer)
│   ├─ B2B  (businessShort/DetailDescription)
│   └─ B2C  (consumerShort/DetailDescription)  ← 공급자 공식 소비자 설명
│
└─ 매장 활용 콘텐츠 (기존 콘텐츠/자료함 도메인 — kpa_store_contents 등)
    ├─ O4O 참고 콘텐츠
    ├─ 운영자/서비스 참고
    ├─ 커뮤니티 참고
    └─ 매장 최종 콘텐츠
```

> B2B/B2C 는 이미 `SupplierProductOffer` 에 4필드로 분리(baseline §6). **Product Core(대표상품/포장단위)로 끌어올리지 않는다.** 매장 활용 콘텐츠는 기존 콘텐츠 도메인이 담당하며, 이 스키마는 그것을 **물리적으로 흡수하지 않고 연결 지점(대표상품 id)만 제공**한다.

---

## 15. 설계 후보 비교

> 요청서 §16 의 A/B/C 후보는 모두 ProductMaster 가 이미 포장단위 SSOT 라는 사실을 반영하지 못한다. 그 한계를 보정해 후보 D 를 추가한다.

| 후보 | 내용 | 평가 |
|---|---|---|
| **A** | `representative_products` + `product_package_units` **둘 다 신규** | ❌ `product_package_units` 가 ProductMaster 와 grain 중복 → SSOT 2개. baseline §2 위반 |
| **B** | `supplier_product_offers` 중심 확장 | ❌ 공급자 상품이 표준 기준이 됨. 매장/공공데이터 기반 상품을 offer 없이 표현 불가. baseline §6 위반 |
| **C** | `StoreLocalProduct` 중심 확장 | ❌ display-only 별도 도메인. 공급/유통 분리. baseline §4 "통합 대상 아님" |
| **D (권장)** | **ProductMaster = 포장단위 재사용** + 신규 `representative_products` 1개 + `ProductMaster.representative_product_id` nullable FK 1개 | ✅ 가장 작은 additive. 기존 SSOT·Identifier·Image·Offer·Listing 전부 무변경 재사용 |

---

## 16. 1차 권장안 (후보 D)

```
(신규 — 단 1개 테이블)
representative_products
  id                    uuid PK
  display_name          varchar       NOT NULL   ← 유일 필수
  product_group         varchar       NULL
  brand_id / brand_name uuid/varchar  NULL
  manufacturer_name     varchar       NULL
  thumbnail_image_id    uuid          NULL  (없으면 멤버 primary image fallback)
  created_by            uuid          NULL
  created_source        varchar       NULL
  created_at/updated_at timestamp

(현존 ProductMaster 에 추가 — 단 1개 컬럼)
ProductMaster.representative_product_id  uuid  NULL  FK → representative_products

(그 외 전부 현존 재사용, 신규 0)
  포장단위        = ProductMaster
  바코드          = ProductMaster.barcode + ProductIdentifier
  기준코드        = ProductIdentifier (방식 B 이미 구현)
  포장 이미지     = ProductImage
  공급자 연결     = SupplierProductOffer.master_id
  주문가능 상품   = OrganizationProductListing.master_id
  매장 활용 콘텐츠 = 기존 콘텐츠 도메인 (대표상품 id 로 연결)
```

**신규 총량 = 테이블 1개 + nullable 컬럼 1개.** 이것이 요청서 §15-12 "가장 단순한 additive 확장"의 답이다.

매장 직접 등록·StoreLocalProduct 정합은 **느슨한 nullable 연결(`representative_product_id`/`master_id`)** 로 후속에서 부착(강제 통합 금지).

---

## 17. 제외할 기능 (요청서 §4·§21)

- `product_package_units` 신규 테이블 (ProductMaster 와 중복)
- `primary_code`/`standard_code` 단순 필드 (ProductIdentifier 로 흡수됨)
- `barcode_verified` boolean (verification_status 로 대체)
- `quantity`/`unit` 정형 분해 강제 (1차는 specification 자유텍스트)
- 자동 중복 병합 / 검수·승인 / 매장 강제 통합 / 공공데이터 import 구현
- DUR·상담·처방 판단 연결 (자매조사 §3 동일하게 제외)

---

## 18. 후속 조사 필요 항목

1. **barcode 전역 UNIQUE vs "중복/미확인 수용" 충돌** — Identifier Core(baseline Phase 2)와 본 대표상품 계층의 선후 관계 확정.
2. **대표상품 자동 그룹핑 정책** — 묶음의약품(성분 유사)을 O4O "동일제품 다른포장"으로 정제하는 규칙(자매조사 §20).
3. **매장 직접 등록 경로** — `product_candidates` 검토 큐 경유 vs StoreLocalProduct nullable 연결, 둘 중 1차 채택안 결정.
4. **StoreProductProfile 과 대표상품의 표시명 충돌** — 매장 표시명이 대표상품/포장단위 어느 레벨에 우선하는지.
5. **`created_by` 컬럼 부재** — ProductMaster 에 등록 주체 추적 필드 추가 여부.

---

## 19. 결론

이 IR 의 핵심 결론은 **"새 구조를 설계하기 전에, 포장단위는 이미 ProductMaster 로 존재한다"** 는 것이다.

- **포장단위 = 현존 ProductMaster** (재사용). 새 테이블 금지.
- **대표상품 = 유일한 신규 계층** (`representative_products` 1개 + nullable FK 1개).
- **기준 코드(방식 B) = ProductIdentifier 이미 구현** (신규 불필요).
- **바코드 = 포장단위(ProductMaster.barcode)에 이미 위치** (요청서 원칙과 일치).
- **썸네일 = 대표상품에 nullable + 멤버 fallback.**
- **공급자/주문가능 상품 = master_id 로 이미 포장단위 연결** (신규 필드 0).
- **매장 직접 등록·StoreLocalProduct = nullable 느슨한 연결로 후속** (강제 통합 금지).

> 본 조사는 자매조사 2건(현재 구조 조사 / 공공데이터 후보)의 결과로 **조정 가능한 설계 후보**까지만 제시하며, 구현 결론(migration/컬럼 확정)은 유보한다.

### 20. 결론 분류 (요청서 §20)

| 항목 | 분류 | 근거 |
|---|:--:|---|
| 대표상품명 (display_name) | **A. 1차 포함(필수)** | 유일 필수 |
| 상품군 (product_group) | B. nullable | 미분류 허용 |
| 제조사 / 브랜드 | B. nullable | 멤버 파생 가능 |
| 기준 코드 | **A (현존 ProductIdentifier 재사용)** | 신규 작업 0 |
| 대표 썸네일 | B. nullable (대표상품) | 멤버 fallback |
| 포장단위명 | **A (현존 ProductMaster.name)** | — |
| 포장수량 / 단위 | C. 후속 (정형 분해) | 1차는 specification |
| 바코드 | **A (현존 ProductMaster.barcode)** | nullable·미확인 수용 |
| 포장 이미지 | **A (현존 ProductImage)** | — |
| `representative_product_id` (ProductMaster) | **A. 1차 신규 (컬럼 1개)** | 대표상품 연결 본체 |
| supplier_products(=offer) 연결 | **A (현존 master_id)** | 신규 0 |
| StoreLocalProduct 연결 | C. 후속 (nullable 부착) | 강제 통합 금지 |
| OrganizationProductListing 연결 | **A (현존 master_id)** | 신규 0 |
| B2B 데이터 | D. 제외 (Offer 유지) | Core 미승격 |
| B2C 데이터 | D. 제외 (Offer 유지) | 공급자 공식 설명 |
| 매장 활용 참고 콘텐츠 | C. 후속 (대표상품 id 연결) | 콘텐츠 도메인 |

---

**작성:** O4O Platform 조사 · 2026-06-30
**성격:** read-only 설계 조사 — 구현 결론 유보. 1차 권장 = `representative_products` 1테이블 + `ProductMaster.representative_product_id` nullable 1컬럼 (후보 D)
