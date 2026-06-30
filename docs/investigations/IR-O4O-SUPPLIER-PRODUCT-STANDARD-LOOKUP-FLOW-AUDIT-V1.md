# IR-O4O-SUPPLIER-PRODUCT-STANDARD-LOOKUP-FLOW-AUDIT-V1

> 공급자 상품 등록 흐름 전수조사 + 미래 **O4O 표준 상품 구조(대표상품 + 포장단위)** 연결 가능성 진단
> 작성일: 2026-06-30 · 성격: read-only 코드 조사 (코드/DB/migration 변경 없음)
> 선행 참조: `IR-O4O-PUBLIC-DISTRIBUTION-PRODUCT-DATA-SOURCE-AUDIT-V1`, `O4O-PRODUCT-CORE-BASELINE-V1`

---

## 1. 목적

공급자가 O4O에서 상품을 등록하는 현재 흐름을 정밀 조사하고, 향후 도입할 **표준 상품 구조**

```
O4O 표준 상품
├─ 대표상품 (콘텐츠·소비자 안내 기준)
└─ 포장단위 (공급·유통·주문 기준)
```

와의 **연결 가능성**을, 기존 등록 흐름을 깨지 않는 nullable optional 필드 추가 관점에서 진단한다.

핵심 질문: **표준상품 검색·선택 단계를 기존 공급자 등록 흐름 앞에 붙이고, `representative_product_id` / `package_unit_id` 를 nullable 로 추가해도 기존 등록이 그대로 동작하는가?**

## 2. 조사 범위

- 프론트: `services/web-neture/src/pages/supplier/*` (등록 진입/생성/임포트/목록/상세 드로어), `lib/api/supplier.ts`
- 백엔드: `apps/api-server/src/modules/neture/` (entities, controllers, services)
- 데이터: `ProductMaster`, `SupplierProductOffer`, `ProductImage`, `ProductIdentifier` 엔티티
- 표준 구조 baseline: `O4O-PRODUCT-CORE-BASELINE-V1`

## 3. 공급자 상품 관련 주요 파일/경로

| 영역 | 파일 |
|---|---|
| 등록 진입 (의약/비의약 2분기 → 단일/대량) | `services/web-neture/src/pages/supplier/SupplierProductRegisterEntryPage.tsx` |
| 단일 등록 위저드 (3-Step) | `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` |
| 등록 도우미 (상세페이지 소스 자동 입력) | `services/web-neture/src/pages/supplier/SupplierProductImportPage.tsx` |
| 상품 목록 | `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` |
| 상품 상세/수정 드로어 | `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` |
| B2B 콘텐츠 관리 | `services/web-neture/src/pages/supplier/SupplierB2BContentPage.tsx`, `components/supplier/B2BContentDrawer.tsx` |
| 공급자 API 클라이언트 | `services/web-neture/src/lib/api/supplier.ts` (`supplierApi.createProduct` 등) |
| 상품 컨트롤러 (POST /supplier/products) | `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` |
| 오퍼 생성/수정 서비스 | `apps/api-server/src/modules/neture/services/offer.service.ts` (`createSupplierOffer`) |
| Master 해석/생성 | `neture.service.ts` → catalog service `resolveOrCreateMaster` |
| **Product Master (SSOT)** | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` |
| **Supplier Product Offer (공급 확장)** | `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts` |
| 상품 이미지 | `apps/api-server/src/modules/neture/entities/ProductImage.entity.ts` |
| 식별자 코어 (additive) | `apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts` |

## 4. 공급자 상품 데이터 구조

핵심은 **2계층 분리** (`O4O-PRODUCT-CORE-BASELINE-V1 §2`):

- **`ProductMaster` (`product_masters`) = 상품 정보 SSOT.** "물리적 제품 1건 = barcode 1건 = ProductMaster 1건" (`ProductMaster.entity.ts:1-10`). 식별/규제/카테고리/브랜드/이미지/스펙을 소유. `barcode`, `regulatoryType`, `regulatoryName`, `manufacturerName`, `mfdsPermitNumber`, `mfdsProductId` 는 **immutable**.
- **`SupplierProductOffer` (`supplier_product_offers`) = 공급자별 공급 제안.** Master 1건당 공급자 1 Offer (`SupplierProductOffer.entity.ts:1-8`). 가격·유통정책·B2B/B2C 설명·재고·서비스키·승인상태를 소유. Master 만 참조하며 공급정책은 Core 로 끌어올리지 않는다(baseline §2.2).
- **`ProductImage` (`product_images`)** 은 `master_id` 직결. `type: thumbnail | detail | content`, `is_primary` 보유 (`ProductImage.entity.ts:25-46`).
- **`ProductIdentifier` (`product_identifiers`)** 은 Master 1:N additive 계층. `GTIN/EAN13/SUPPLIER_SKU/KOREA_DRUG_CODE/ATC_CODE/...` 등 다중 식별자 수용. **전역 UNIQUE 없음** — 중복 바코드/충돌 수용이 설계 목적 (`ProductIdentifier.entity.ts:18-22, 51-64`).

> **결론(중요):** 현재 `ProductMaster` = barcode 단위 = **물류 SKU = 포장단위에 가깝다.** "대표상품(여러 포장의 그룹핑)" 개념은 코드/DB/baseline 어디에도 **존재하지 않는다.** (`representative_product`, `package_unit` grep 0건)

## 5. 등록 흐름

### 5.1 진입 (`SupplierProductRegisterEntryPage.tsx`)
- 1차: **의약품 / 비의약품** 2분기. 의약품 선택 시 **비처방(otc)/처방(rx)** 세부 선택.
- 2차: **하나씩 등록(`/supplier/products/new`)** 또는 **대량 등록(`/supplier/products/bulk`)**.
- `productType` / `regulatoryType` 를 query param 으로 전달.
- `SupplierActivationGate mode="gate"` 로 감싸 비활성 공급자 진입 차단.

### 5.2 단일 위저드 (`SupplierProductCreatePage.tsx`, 3-Step)
- **Step 1 기본 정보**: 포장 상품명(선택), 상품명(필수), 카테고리(필수), 규제 구분, 브랜드, 제조사, **바코드(선택)**. 바코드 입력 시 `productApi.getMasterByBarcode` 로 기존 Master 조회 (`searchBarcode`, line 207-226).
- **Step 2 기본 공급가**: `priceGeneral`(필수), `consumerReferencePrice`. 공급 방식은 `hideDistribution` 로 숨김 — **정보-우선** 정책(`WO-...-CREATE-INFO-FIRST-V1`): 등록 시엔 내부 상품(미노출)로만 저장, 공급 방식은 등록 후 상세에서 설정.
- **Step 3 이미지/설명**: 대표 이미지(썸네일 1장), 성분/라벨 이미지(content, 다중), **소비자용 간이 설명**(RichTextEditor). 파일 업로드 또는 미디어 라이브러리 선택.
- 저장: `supplierApi.createProduct(...)` → `POST /neture/supplier/products` → `createSupplierOffer`. 성공 후 `masterId` 받아 이미지를 `uploadProductImage` / `registerImageFromUrl` 로 등록 (line 329-345).

### 5.3 등록 도우미 (Import Assistant)
- "⚡ 상세페이지 소스로 자동 입력" 버튼 → `/supplier/products/import-assistant` (`SupplierProductCreatePage.tsx:474-493`).
- 공급자 자사 Firstmall 관리자 HTML 을 브라우저에서 파싱 → 초안(`loadAndClearDraft`)을 위저드에 prefill (single-use). `consumerDetailDesc`, `thumbnailUrl`, `contentImageUrls`, `priceGeneral` 등 포함.

### 5.4 백엔드 생성 파이프라인 (`offer.service.ts`)
1. `validateCreateInput` (line 811-839): 바코드 없으면 `generateInternalBarcode(supplierId)` 로 내부 바코드 생성. PUBLIC 인데 소비자 설명 없으면 거부. `masterId` 직접 주입 금지.
2. `resolveProductMetadata` (line 841-914): 카테고리/규제/브랜드 해석 → **`resolveOrCreateMaster(barcode, manualData)`** 로 Master find-or-create → 확장 필드(spec/origin/tags/name) 적용.
3. Offer INSERT. 생성 시 **`businessShortDescription: null`** (line 1006) — B2B 는 빈 채로 시작.

### 5.5 등록 후 승인/활성화 흐름
- 등록 직후 = `is_active=false`, `distribution_type=PRIVATE` (내부 상품, HUB 미노출).
- 공급 방식 설정: 상세의 `[공급 방식 변경]` → `updateDistribution` (`/products/:id/distribution`). 추가=pending/재심사, 제거=cancelled+listing 비활성.
- 서비스 승인 요청: `submitForApproval` → `OfferServiceApproval` (서비스별 pending/approved/rejected).
- 활성화 게이트: `SupplierActivationGate` — backend `activationReady` / `missingActivationFields` 단일 권위.

## 6. 수정 흐름

- `ProductDetailDrawer.tsx` + `supplierApi.updateProduct` (`PATCH /products/:id`): 상품명, 카테고리/브랜드(Master), spec/origin/tags, 가격, B2C/B2B 설명, 재고, 유통/seller 수정 가능.
- **Master immutable 필드(barcode/regulatory/manufacturer/mfds)** 는 수정 경로 없음 — Core 불변.
- B2B 콘텐츠 별도 수정: `updateBusinessContent` (`PATCH /products/:id/business-content`).
- 승인된 상품 제약: soft-delete(`deleted_at`/`deleted_by`/`delete_reason`)·recycle-bin 흐름 존재. 유통 제거 시 cancelled + listing 비활성 캐스케이드.

## 7. B2B/B2C 설명 구조

- **명확히 분리됨.** `SupplierProductOffer` 에 4개 컬럼: `consumer_short_description`, `consumer_detail_description`(B2C), `business_short_description`, `business_detail_description`(B2B) (`SupplierProductOffer.entity.ts:107-123`).
- **각 용도**: B2C(consumer)=소비자 노출용 (공식 소비자 설명). B2B(business)=도매/파트너용.
- **"B2B 비어 있으면 B2C 복사" 로직** — *저장 시 복사는 없음*. 생성 시 B2B 는 `null` 고정(offer.service.ts:1006). 실제 fallback 은 **소비 시점 COALESCE** 로 구현:
  `store-product-library.controller.ts:182-183` —
  `COALESCE(spo.business_short_description, spo.consumer_short_description)`,
  `COALESCE(spo.business_detail_description, spo.consumer_detail_description)`.
  UI 안내도 동일: "B2B 설명이 없으면 B2C 설명이 자동으로 사용됩니다" (`SupplierB2BContentPage.tsx:78`).
- **B2C = 공급자의 공식 소비자 설명으로 저장됨** (Offer 소유, 공급자 입력). O4O AI 생성 매장 참고 콘텐츠와는 **별개 계층**(매장측 `kpa_store_contents` / asset 계층). 혼동 없음.
- 운영자/매장이 B2C 를 override 하는 흐름: 공급자 Offer 의 B2C 직접 덮어쓰기 경로는 없음. 매장은 Master 참조 + 자체 프로필/사본(StoreProductProfile / asset)으로 분리.

## 8. 이미지/썸네일 구조

- `ProductImage` 가 `master_id` 직결 (공급자 Offer 가 아니라 **Master 귀속**). `type`(thumbnail/detail/content) + `is_primary` + `sort_order`.
- 업로드 2경로: 파일 직접 업로드(GCS) 또는 미디어 라이브러리 URL 등록(`registerImageFromUrl`).
- 매장/운영자는 Master 의 이미지를 참조. 별도 media asset 구조(MediaLibrary)와 연결되나 상품 이미지는 `product_images` 가 1차.

## 9. 포장단위/바코드 구조

- **포장단위 전용 필드 없음.** 규격은 `ProductMaster.specification`(text, 예 "500mg × 60정") 자유서술 1칸뿐. 입수량/단위/용량 구조화 필드 없음. (등록 폼 Step3 "제품 규격" 자유입력)
- **바코드**: `ProductMaster.barcode`(varchar 14, GTIN, UNIQUE, immutable). 미입력 시 내부 바코드 자동 생성.
- **다중/비-GTIN 식별자**: `ProductIdentifier` additive 계층이 이미 존재 — `KOREA_DRUG_CODE`(표준코드), `ATC_CODE`, `SUPPLIER_SKU` 등 수용 가능. **전역 UNIQUE 없음** = 표준상품 매칭/그룹핑 키 부착에 유리.
- **포장단위별 가격**: 가격은 Offer(`price_general` 등)에 있고 Offer=Master 1:1 이므로, "한 상품의 여러 포장단위 가격"은 현재 **여러 Master(=여러 barcode)** 로만 표현됨.
- **KEY 판정**: **`supplier_products`(=`supplier_product_offers` + `product_masters`)는 사실상 포장단위(SKU)에 해당한다.** 대표상품 계층은 부재.

## 10. 공급 조건 구조

- Offer 보유: `price_general`(B2B 공급가), `price_gold`(참고), `consumer_reference_price`, `stock_quantity`/`reserved`/`low_stock_threshold`/`track_inventory`, `service_keys[]`, `is_public`, `distribution_type`, `approval_status`, `is_featured`, `allowed_seller_ids[]`.
- 공급자 프로필 레벨: `minOrderAmount`(MOQ 금액), `minOrderSurcharge`, `baseShippingFee`, `freeShippingThreshold`, `averageDispatchDays` (`supplier.ts` SupplierProfile).
- 서비스별 가격: `OfferServicePrice` (`/products/:id/service-prices`).
- 이벤트/특가: `SpotPricePolicy`, Event Offer 별도 시스템 (등록 후 연결).
- → **공급 조건은 일관되게 Offer/Profile 에 귀속.** 표준 상품 구조 도입 시 **포장단위(=Master/Offer) 쪽에 자연 연결**됨.

## 11. 표준상품 검색/선택 단계 추가 가능성

- 현재 Step 1 에 이미 **바코드 조회 → 기존 Master 매칭** UX가 존재(`searchBarcode`). 이는 **표준상품(포장단위) 검색 단계의 선행 형태**다. 표준상품 풀이 생기면 이 자리에 "포장단위/표준코드 검색"을 확장 삽입하는 것이 자연스럽다.
- 진입(`SupplierProductRegisterEntryPage`) → 위저드 Step 1 사이, 또는 Step 1 상단에 **"표준상품 검색(선택)"** 스텝을 prepend 가능. 미선택 시 기존 직접 등록 흐름 그대로 동작(현행 = 표준 미선택 등록).
- **권장**: 신규 스텝을 강제하지 말고 Step 1 바코드 블록을 **표준상품 lookup 으로 확장**(검색 → 후보 선택 → 폼 prefill). 미선택 폴백 = 현재 동작.

## 12. representative_product_id / package_unit_id 연결 가능성

- **package_unit_id**: `ProductMaster`(=포장단위 등가)에 nullable FK 1개 추가가 가장 정합적. 단 별도 `package_units` 테이블을 새로 만들 경우 — Master 가 이미 포장단위 역할이므로 **중복 계층 위험**. 우선은 **`ProductMaster.representativeProductId`(nullable)** 만으로 "이 포장단위(Master)가 어느 대표상품에 속하는가"를 표현하는 편이 단순.
- **representative_product_id**: 신규 `representative_products` 테이블(대표상품) + `ProductMaster.representative_product_id`(nullable FK). 또는 식별자 코어 재사용 — 묶음의약품 "대표 품목기준코드"를 `ProductIdentifier`(type=`MFDS_CODE`/신규 `REPRESENTATIVE_CODE`)로 부착해 그룹핑 키만 먼저 확보(테이블 신설 회피).
- **모두 nullable additive** 로 가능. `ProductMaster` 는 이미 nullable FK(`categoryId`, `brandId`)를 가산해온 전례가 있어 패턴 동일. 기존 등록·조회·승인 쿼리는 신규 컬럼을 읽지 않으므로 **무영향**.
- baseline 철학(§2 "신규 테이블 최소화, additive")과 정합. 단 **Core 동결 정책**상 `product_masters` 컬럼 추가는 **명시적 WO 필요**.

## 13. 기존 흐름 유지 방안

1. 표준상품 선택은 **항상 선택사항.** 미선택 = 현재 직접 등록(바코드 자동생성 포함) 100% 유지.
2. 신규 FK 는 **nullable, 기본 NULL.** 어떤 기존 코드도 NOT NULL 가정 금지.
3. 검색 UI 는 Step 1 바코드 블록 확장으로 흡수 — **새 강제 스텝 추가 금지**(위저드 길이·복잡도 유지).
4. B2C = 공급자 공식 소비자 설명 불변. 표준상품의 대표 콘텐츠를 B2C 에 **자동 덮어쓰기 금지**(prefill 제안까지만).
5. 포장단위별 가격 = 기존대로 Offer 에 유지. 표준 구조는 식별/그룹핑만 부여, 가격/공급정책은 Offer 소유 유지(baseline §2.2).

## 14. 복잡해질 수 있는 부분 (→ 후순위 신호)

- **등록 도중 새 대표상품/포장단위 생성**: 검색→없음→즉석 생성은 마스터데이터 거버넌스(중복·승인·표준코드 검증)를 등록 폼에 끌고 들어와 복잡도 급증. **1차 제외.**
- **포장단위 구조화 필드 신설**(입수량/단위/용량 정규화): 등록 입력 항목 증가 = 등록 마찰. 공공데이터(약가마스터 포장형태/총수량) import 후속과 묶어 별도 처리 권장.
- **별도 `package_units` 테이블** 도입: Master 와 역할 중첩 → 모델 혼란. 우선은 Master=포장단위로 두고 representative 만 위에 얹는 편이 단순.
- **B2B/B2C ↔ 대표상품 콘텐츠 동기화**: 자동 동기화는 출처 혼동 위험. 수동 prefill 만.

## 15. 1차 권장안

1. **검색·선택만 1차 도입, 신규 표준상품 생성은 제외.** Step 1 바코드 블록을 "표준상품(포장단위/표준코드) 검색"으로 확장하고, 선택 시 폼 prefill + 그룹핑 키 부착.
2. **`ProductMaster.representativeProductId`(nullable) 한 컬럼**을 additive 로 추가하는 것을 우선 검토(대표상품 그룹핑). 별도 package_unit 테이블·구조화 필드는 보류.
3. 대표상품 후보 풀은 **의약품 우선**(선행 IR: 약가마스터 표준코드 + 묶음의약품). 표준코드는 `ProductIdentifier`(KOREA_DRUG_CODE)로 부착해 매칭 키 확보.
4. 미선택 폴백 = 현행 직접 등록 100% 유지. B2C 자동 덮어쓰기 없음.
5. `product_masters` 컬럼 추가는 **Core 동결 → 명시적 WO** 경유.

## 16. 후속 조사/구현 후보 + A~E 분류표

분류: **A** 그대로 활용 / **B** nullable 링크 필드로 가능 / **C** 후속 확장 필요 / **D** 1차 제외 / **E** 추가 조사 필요

| 항목 | 분류 | 근거 |
|---|:---:|---|
| 표준상품 검색 단계 | **B** | Step 1 바코드 조회(searchBarcode)가 이미 선행 형태. 검색 UI 확장으로 흡수 가능, 강제 스텝 불필요 |
| 대표상품 링크 (representative) | **B** | `ProductMaster.representativeProductId`(nullable) additive 추가로 가능. 단 대표상품 테이블/소스는 별도 |
| 포장단위 링크 (package_unit) | **A→B** | Master 가 이미 포장단위 등가 → 별도 링크 불요(**A**). 별도 package_units 테이블화는 중복 위험(**B/후순위**) |
| 공급자 직접 신규 표준상품 생성 | **D** | 등록 폼에 마스터데이터 거버넌스 유입 → 복잡도 급증. 1차 제외, 검색/선택만 |
| B2B 데이터 | **A** | `business_*_description` 분리 존재. 그대로 활용 |
| B2C 데이터 | **A** | `consumer_*_description` = 공급자 공식 소비자 설명. 그대로 활용 |
| B2B→B2C 복사 | **A** | 저장 복사 아님 — 소비 시점 COALESCE fallback 이미 구현(store-product-library.controller.ts:182-183) |
| 이미지/썸네일 | **A** | `product_images`(master 귀속, type/primary) 그대로 활용. 대표상품 공유 이미지 정책은 **C** |
| 바코드 | **A** | `ProductMaster.barcode`(GTIN, immutable) + `ProductIdentifier` 다중 식별자 계층 이미 존재 |
| 공급 조건 | **A** | Offer/Profile 에 일관 귀속. 표준 구조와 무충돌 |
| 승인/활성화 흐름 | **A** | activation gate + service approval + distribution 흐름 안정. 표준 링크와 독립 |
| 포장단위 구조화 필드(입수량/단위) | **C** | 현재 specification 자유서술 1칸. 정규화는 공공데이터 import 후속과 묶어 별도 |
| product_masters 컬럼 추가 자체 | **E** | Core 동결 정책 → 명시적 WO/영향평가 필요 (소비처 전수) |

---

### 핵심 한 줄 결론

> 현재 `supplier_products`(= `product_masters` + `supplier_product_offers`)는 **사실상 "포장단위(SKU)"** 이며 **"대표상품" 계층은 부재**하다. 따라서 1차는 **표준상품 검색·선택 + 대표상품 nullable 링크 한 컬럼**만 additive 로 얹고(미선택 폴백=현행 유지), **신규 표준상품 생성·포장단위 구조화 필드·별도 package_units 테이블은 후순위/제외**가 최소 마찰 경로다.
