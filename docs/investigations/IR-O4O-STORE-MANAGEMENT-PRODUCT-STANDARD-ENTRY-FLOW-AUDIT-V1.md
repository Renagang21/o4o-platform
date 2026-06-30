# IR-O4O-STORE-MANAGEMENT-PRODUCT-STANDARD-ENTRY-FLOW-AUDIT-V1

> **상태**: read-only 조사 완료
> **일자**: 2026-06-30
> **방식**: grep / 파일 읽기 / route·controller·service·entity·frontend 정적 분석 (코드·DB 무변경)
> **대상 서비스**: KPA 중심 + GlycoPharm / K-Cosmetics 공통 구조 비교

---

## 1. 목적

매장 경영자가 O4O에서 제품을 **직접 등록**할 때, 앞으로 도입할 **O4O 표준 상품 구조(대표상품 + 포장단위)** 를 최소 변경으로 적용할 수 있는지 판단한다.

핵심 질문:

```text
매장 경영자가 직접 등록하는 제품(StoreLocalProduct)도
대표상품 + 포장단위 구조를 따르게 할 수 있는가?
```

본 조사는 구현·DB 변경이 아니라 현재 흐름을 read-only로 확인하고 적용 가능성을 분류하는 것이다.

---

## 2. 조사 범위

- 매장 경영지원(자체) 제품 등록 / 수정 / 목록·상세 화면
- `StoreLocalProduct` entity / migration / API
- 바코드 · 이미지/썸네일 · 설명 입력 구조
- O4O 주문 가능 상품(`OrganizationProductListing`)과의 관계
- 기존 표준상품 후보(`ProductMaster` / `SupplierProductOffer` / `SharedProductDescription`)
- QR / POP / 블로그 / 콘텐츠 자료함 연결 지점
- 참고자료 보기/복사 모달을 붙일 위치 후보

---

## 3. 매장 경영지원 제품 관련 주요 파일/경로

### Backend

| 역할 | 경로 |
|------|------|
| Entity | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` |
| Route/Controller | `apps/api-server/src/routes/platform/store-local-product.routes.ts` (`/api/v1/store/local-products`) |
| 라우트 등록 | `apps/api-server/src/bootstrap/register-routes.ts:315` |
| barcode 추가 migration | `apps/api-server/src/database/migrations/20261201000000-AddBarcodeToStoreLocalProduct.ts` |
| Domain 경계 보증 migration | `apps/api-server/src/database/migrations/20260224300000-HardenStoreLocalProductDomain.ts` |
| 통합 조회(handled-products) | `apps/api-server/src/routes/platform/store-handled-products.routes.ts` (`GET /api/v1/store/handled-products`) |
| 콘텐츠↔제품 연결 조인 | `apps/api-server/src/database/migrations/20261128000000-CreateKpaStoreContentProductLinks.ts` / `apps/api-server/src/routes/kpa/entities/kpa-store-content-product-link.entity.ts` |

### Frontend

| 서비스 | 등록/수정 화면 | 비고 |
|--------|---------------|------|
| **KPA (고급형)** | `services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx` (`ProductFormModal` 480–879행) | RichTextEditor + MediaPickerModal + 콘텐츠 가져오기 |
| GlycoPharm (기본형) | `services/web-glycopharm/src/pages/store-management/StoreLocalProductsPage.tsx` → 공통 위임 | textarea + URL 입력 |
| K-Cosmetics (기본형) | `services/web-k-cosmetics/src/pages/store/StoreLocalProductsPage.tsx` → 공통 위임 | textarea + URL 입력 |
| 공통 컴포넌트(GP/KCos) | `packages/store-ui-core/src/components/local-products/StoreLocalProductsManager.tsx` (`ProductFormModal` 465–675행) | 바코드 입력 **없음** |
| 메뉴 정의 | `packages/store-ui-core/src/config/storeMenuConfig.ts` (KPA 262–283 / GP 197 / KCos 119) | KPA는 메뉴 숨김, `/store/handled-products`로 진입 |
| 라우트 마운트 | KPA `App.tsx:990` / GP `App.tsx:1000` / KCos `App.tsx:800` — 모두 `/store/commerce/local-products` |

### 참고자료/콘텐츠 모달 (KPA 전용)

| 컴포넌트 | 경로 | 용도 |
|----------|------|------|
| StoreContentImportModal | `services/web-kpa-society/src/components/store/StoreContentImportModal.tsx` | 내 매장 콘텐츠(source=mine) 본문 복사 |
| ImportB2cDescriptionModal | `services/web-kpa-society/src/pages/pharmacy/ImportB2cDescriptionModal.tsx` | O4O 기반 제품의 B2C 상세설명 복사 |
| LinkedContentsDrawer | `services/web-kpa-society/src/pages/pharmacy/LinkedContentsDrawer.tsx` | 제품에 연결된 콘텐츠 조회/편집 진입 |
| MediaPickerModal | `services/web-kpa-society/src/components/common/MediaPickerModal.tsx` | 공용 미디어(URL 반환, base64 금지) |

---

## 4. StoreLocalProduct 데이터 구조

**테이블**: `store_local_products` · **Entity**: `store-local-product.entity.ts` · 총 21필드, **Display Domain 전용**

| 필드 | DB타입 | Nullable | 비고 |
|------|--------|:--------:|------|
| id | uuid | N | PK, gen_random_uuid() |
| organizationId | uuid | N | 매장 소유권 FK → organizations (CASCADE) |
| **name** | varchar(200) | **N** | **유일한 필수 입력 필드** |
| description | text | Y | |
| images | jsonb | N | 기본 `[]` |
| category | varchar(100) | Y | |
| **barcode** | **varchar(64)** | **Y** | unique 제약 **없음**, 인덱스 없음 |
| priceDisplay | numeric(12,2) | Y | |
| isActive | boolean | N | 기본 true (soft delete) |
| sortOrder | int | N | 기본 0 |
| summary | text | Y | 한 줄 요약 |
| detailHtml | text | Y | HTML, sanitize 처리 |
| usageInfo | text | Y | |
| cautionInfo | text | Y | |
| thumbnailUrl | varchar(500) | Y | |
| galleryImages | jsonb | N | 기본 `[]` |
| badgeType | enum | N | none/new/recommend/event |
| highlightFlag | boolean | N | 기본 false |
| createdAt / updatedAt | timestamp | N | |

**공급자/표준상품 연결 FK — 현재 전무**:
- `representative_product_id` ❌ / `package_unit_id` ❌ / `supplier_product_id` ❌
- `ProductMaster` FK ❌ / `OrganizationProductListing` FK ❌

**Domain 경계 보증** (migration `20260224300000` DB Comment):
> `store_local_products` is **Display Domain only. Must NEVER be referenced by ecommerce_order_items, organization_product_listings, or organization_product_channels.**

→ 즉, 표준상품 연결 필드를 추가하려면 **새 nullable 컬럼**을 도입하는 것 외에 다른 경로가 없으며, 현재 구조는 깨끗한 백지 상태다.

---

## 5. 매장 경영지원 제품 등록 흐름

진입: `/store/commerce/local-products` (KPA는 `/store/handled-products` 통합 화면 경유). **단일 모달 폼**(단계형 아님).

### 등록 폼 입력 필드 & 필수 여부

| 필드 | KPA | GP/KCos | 필수? |
|------|:---:|:-------:|:-----:|
| 제품명 | ✅ | ✅ | **필수** |
| 바코드 | ✅ | ❌(필드 없음) | 선택 |
| 대표 이미지 | MediaPickerModal | URL 직접입력 | 선택 |
| 설명 | RichTextEditor(`@o4o/content-editor`, preset=full) | plain textarea | 선택 |
| 요약 / 카테고리 / 표시가격 / 갤러리 / Badge / 정렬순서 / 강조 | ✅ | ✅ | 선택 |

### 저장 API & 검증

`POST/PUT /api/v1/store/local-products` (`store-local-product.routes.ts` 192–369행). **백엔드 필수 검증은 `name` 뿐**:

```text
- name: 빈 문자열 불가 (VALIDATION_ERROR)   ← 유일한 필수
- badgeType: 허용값 검증
- priceDisplay: normalizePriceDisplay() — 쉼표/₩/원 정제, 음수 금지
- barcode: normalizeBarcode() — 빈 값/공백 → null 정규화 (스캔/OCR/중복검사 없음)
- detailHtml: sanitizeHtml() — <script>/inline 이벤트 제거
```

저장 성공 → 모달 닫기 → 목록 재로드. 수정은 목록 행의 Edit → 동일 모달.

**현재 등록 흐름은 이미 "빈 필드 허용 · 최소 정보 등록 가능" 원칙에 부합한다.** 이미지·설명·바코드·가격 모두 없어도 `name`만 있으면 등록된다.

---

## 6. 매장 경영지원 제품 수정 흐름

- 동일 `ProductFormModal` 재사용 (`handleEdit` → 같은 row PUT, id 불변).
- KPA 수정 화면에는 이미 **"콘텐츠에서 가져오기"** 버튼이 설명 필드 라벨 우측(`StoreLocalProductsPage.tsx` 704–714행)에 존재 → 참고자료 모달 확장 지점으로 최적.
- 목록 액션에서 `/store/commerce/products/{id}/marketing` · `/pop` 네비게이션(마케팅 자산/POP) 진입 가능.

---

## 7. O4O 주문 가능 상품과의 관계

| 구분 | 매장 경영지원 제품 | O4O 주문 가능 상품 |
|------|------|------|
| Entity | `StoreLocalProduct` | `OrganizationProductListing` |
| 테이블 | `store_local_products` | `organization_product_listings` |
| 공급자 연결 | **없음** | `master_id`→ProductMaster(필수), `offer_id`→SupplierProductOffer(nullable) |
| 주문 가능? | ❌ (Commerce 분리) | ✅ (`/pharmacy/products/orderable` 권위 테이블) |
| 성격 | 비-O4O 매장 자체 취급 | 공급자 상품 기반 활성화 |

**구조적으로 완전 분리** — 두 테이블 간 FK·공통 컬럼 없음. 섞이는 곳은 **읽기 전용 통합 조회** `handled-products`(UNION ALL) 한 곳뿐:

```sql
-- store-handled-products.routes.ts:104-134
SELECT 'listing' ... FROM organization_product_listings opl
  LEFT JOIN product_masters pm ON pm.id = opl.master_id
  LEFT JOIN supplier_product_offers spo ON spo.id = opl.offer_id
UNION ALL
SELECT 'local'   ... FROM store_local_products lp
```

응답 라벨(178–179행): `listing → 'O4O 기반 제품' / '공급·플랫폼'`, `local → '매장 경영활용 제품' / '내 매장'`.
매장 자체 제품의 온라인몰/상품설명 채널은 **`not_supported` 고정**.

---

## 8. 바코드 구조

| 질문 | 현황 |
|------|------|
| 바코드 필드 존재? | ✅ `varchar(64)` (KPA 화면만 입력 UI 노출) |
| nullable? | ✅ |
| 필수? | ❌ (선택) |
| unique 제약? | ❌ (중복 허용) |
| 수정 가능? | ✅ |
| 검증 상태(verified)? | ❌ (없음, 스캔/OCR/외부조회/중복검사 모두 없음) |

→ migration 주석상 "단순 식별 메모 필드". **조사요청서 §6.4 설계 원칙(nullable · 미확인 비오류 · 사용 비차단 · 별도 신고기능 없음)에 이미 100% 부합.** `barcode_verified`는 1차 불필요.

⚠️ 단, GP/KCos 공통 컴포넌트(`StoreLocalProductsManager.tsx`)에는 **바코드 입력 UI가 없다** — 컬럼은 공통이나 입력은 KPA 전용. 표준상품 검색(바코드 키)을 GP/KCos까지 확장하려면 공통 폼 보완 필요.

---

## 9. 이미지 / 썸네일 구조

| 질문 | 현황 |
|------|------|
| 대표 이미지 / 썸네일 필드 | ✅ `thumbnailUrl` varchar(500) + `images`/`galleryImages` jsonb |
| 이미지 없이 등록? | ✅ (전부 nullable / 기본 `[]`) |
| 업로드 구조 | KPA: MediaPickerModal(공용 미디어, URL 반환·base64 금지) / GP·KCos: URL 직접 입력만 |
| supplier product 이미지와 동일 구조? | ❌ 별개 (supplier=ProductImage 엔티티, local=jsonb URL 배열) |
| 1000×1000/webp 파이프라인 | 프론트 코드엔 없음 — 백엔드 미디어 API 처리 추정(별도 확인 대상) |

→ 썸네일 비필수 원칙 충족. 매장 경영자가 나중에 보완 가능.

---

## 10. 설명 / 콘텐츠 구조

| 질문 | 현황 |
|------|------|
| 설명 필드 | `description`(text) + `detailHtml`(HTML) + `summary` |
| HTML 여부 | KPA: RichTextEditor → HTML / GP·KCos: plain textarea |
| O4O 표준 RichTextEditor | KPA만 사용(`@o4o/content-editor`, preset=full, AI 정리 포함) |
| QR/POP/블로그 연결 | 직접 FK 없음 — `kpa_store_content_product_links` 조인으로 매개 |
| 공급자 B2C 설명 참고 위치 | ✅ ImportB2cDescriptionModal(복사) — 단 O4O 기반 제품(listing)에서만 |
| O4O 참고 콘텐츠 보기 위치 | ✅ StoreContentImportModal(내 매장 콘텐츠 복사) |

**상품 상세 데이터 B2B/B2C/매장 구분 개념은 이미 코드에 존재**:

```text
B2B   : organization_product_listings / supplier_product_offers
B2C   : product_masters.b2c_description / b2c_descriptions(다국어) — 매장은 읽기/복사만
매장용 : store_local_products(description/detailHtml/usageInfo/cautionInfo)
        + kpa_store_contents(direct) + store_execution_assets(QR/POP/블로그/사이니지)
```

→ "O4O가 만드는 것은 공식 B2C가 아니라 매장 활용 참고 콘텐츠"라는 원칙이 이미 구조에 반영됨(복사 기반, 연결·자동혼합 아님).

---

## 11. 표준상품 검색/선택 단계 추가 가능성

**중요 발견 — 표준상품 인프라가 이미 존재한다** (`apps/api-server/src/modules/neture/entities/`):

| 개념 | 기존 엔티티 | 핵심 필드 |
|------|------------|-----------|
| **대표상품** | `ProductMaster` | `barcode`(UNIQUE, immutable, GTIN), `name`(canonical), `specification`("500mg×60정") |
| 공급 Offer | `SupplierProductOffer` | `master_id`, `supplier_id`, `price_general/gold`, `distribution_type` |
| 공용 설명 | `SharedProductDescription` | `master_id`, `source_type`, `status`(candidate/canonical/...) |

**검색 단계 추가 위치**: KPA `ProductFormModal`의 바코드/제품명 입력 직후(`StoreLocalProductsPage.tsx` 680–701행 인근)에 "표준상품 검색" 버튼을 둘 자리가 있다. 바코드는 `ProductMaster.barcode`(unique)가 자연 검색 키.

**그러나 조사요청서의 "대표상품 + 포장단위" 모델과 기존 모델 사이에 간극이 있다**:

```text
조사요청서 모델          기존 코드 모델
대표상품               ≈ ProductMaster (barcode SSOT)        ← 거의 일치
포장단위(별도 엔티티)   ≈ ProductMaster.specification (문자열)  ← 별도 엔티티 없음
```

→ "포장단위"를 **별도 테이블/엔티티**로 둘지, 기존 `specification` 문자열로 둘지는 **표준상품 구조 자체의 설계 결정**이며, 본 매장 등록 조사 범위를 넘어선다(§17 후속).

---

## 12. representative_product_id / package_unit_id 연결 가능성

- 현재 `store_local_products`에 두 컬럼 **모두 없음**.
- Domain 경계 보증(§4)이 금지하는 것은 `ecommerce_order_items / organization_product_listings / organization_product_channels` **참조**이지, `product_masters` 참조가 아니다 → **nullable FK 추가는 경계 위반 아님**.
- additive nullable 컬럼 + API 응답 additive 필드로 무중단 도입 가능. `name`만 필수인 기존 검증을 건드리지 않으므로 기존 등록 흐름 영향 0.
- 단 `package_unit_id`의 대상 테이블이 아직 없음(§11) → `representative_product_id`(→ProductMaster)는 즉시 가능, `package_unit_id`는 표준상품 구조 확정 후.

---

## 13. 참고자료 보기/복사 모달 위치 후보

| 우선 | 위치 | 근거 |
|:---:|------|------|
| **A (최적)** | KPA `StoreLocalProductsPage.tsx` 설명 필드 영역 704–714행 | 이미 "콘텐츠에서 가져오기" 버튼 존재 → 우측에 "참고자료 보기" 탭/버튼 추가 |
| B | 동 파일 793–798행(domain notice 위) | "참고자료" 섹션 + 연결 콘텐츠 요약 배지 |
| C | `StoreHandledProductsPage.tsx` 119–149행 | LinkedContentsDrawer 이미 구현 — 액션 열 활용 |
| D (GP/KCos) | `StoreLocalProductsManager.tsx` 533–562행 | 공통 폼 description 인근 |

기존 자산 재사용: ImportB2cDescriptionModal(B2C 복사) + StoreContentImportModal(내 콘텐츠 복사) + LinkedContentsDrawer(연결 조회). **1차는 보기/복사/원문 열기만**, 자동 혼합·AI 재작성 없음(원칙 준수).

---

## 14. 기존 흐름 유지 방안

- `StoreLocalProduct` 구조 그대로 유지, `name`만 필수인 현재 검증 불변.
- 표준상품 연결 필드는 **nullable additive** — 미선택 시 기존과 동일하게 동작.
- 표준상품 검색은 "있으면 좋은" 보조 단계, **등록 차단 조건 아님**.
- 바코드/이미지/설명 없이 등록 가능한 현 동작 유지.
- 검수·승인·신고 워크플로 추가 없음(문제는 기존 대화/문의 흐름).

---

## 15. 복잡해질 수 있는 부분

1. **"포장단위" 엔티티 부재** — 기존엔 `ProductMaster.specification` 문자열뿐. 별도 package_unit 테이블 신설은 표준상품 전체 설계 변경 → 무겁다.
2. **신규 표준상품 생성 흐름** — 매장 등록 중 ProductMaster를 새로 만들면 barcode unique 충돌·중복 마스터 양산 위험. 1차 제외 권장.
3. **GP/KCos 공통 폼의 기능 격차** — 바코드 입력·RichTextEditor·MediaPicker·콘텐츠 가져오기가 KPA 전용. 표준상품 검색을 3사 공통화하려면 공통 컴포넌트 대폭 보완 필요.
4. **SharedProductDescription는 master 기준 전용** — 명시적으로 StoreLocalProduct 대상 아님(엔티티 주석). 매장 제품 설명을 여기에 끌어오면 안 됨.

---

## 16. 1차 권장안

```text
1. StoreLocalProduct 구조·등록 흐름 그대로 유지 (이미 표준 원칙 부합)
2. representative_product_id (→ ProductMaster) nullable FK 컬럼만 1차 추가
   - 바코드/제품명으로 ProductMaster 검색 → 있으면 선택 연결, 없으면 그냥 등록(연결 null)
   - API 응답 additive 필드로 노출
3. package_unit_id 는 표준상품 "포장단위" 구조 확정 후로 보류 (§17)
4. 신규 표준상품(ProductMaster) 생성 흐름은 1차 제외 (검색·선택만)
5. 참고자료 모달: 위치 A에 기존 3개 모달(B2C복사/내콘텐츠복사/연결조회) 보기·복사 중심으로 결합 (후속 WO)
6. 바코드 검증 상태(barcode_verified) 도입하지 않음
```

---

## 17. 후속 조사 또는 구현 후보

- **IR/설계**: O4O 표준 상품의 "대표상품 + 포장단위" 정식 모델 확정 — 포장단위를 별도 엔티티로 둘지 `ProductMaster.specification` 확장으로 둘지 (이게 선행되어야 `package_unit_id` 의미 확정).
- **WO 후보 1**: `store_local_products.representative_product_id` nullable FK 추가 + 등록/수정 폼 표준상품 검색(선택) 단계 (additive, KPA 우선).
- **WO 후보 2**: 매장 제품 등록/수정 참고자료 모달(보기/복사/원문) — 위치 A.
- **확인 대상**: 매장 이미지 1000×1000/webp 파이프라인이 백엔드 미디어 API에 실재하는지(공급자 import 경로엔 존재 — 메모리 `wo-neture-import-image-storage-bucket-alignment` 참조).
- **공통화 검토**: GP/KCos 공통 폼에 바코드/표준상품 검색 확장 여부(Shared Module Change Protocol 적용 필요).

---

## 결론 분류 (조사요청서 §13)

| 항목 | 분류 | 근거 |
|------|:---:|------|
| 매장 직접 등록 | **A 그대로 활용** | name만 필수, 빈 필드 허용 — 표준 원칙 이미 부합 |
| 대표상품 연결 | **B nullable 연결 필드 추가** | `representative_product_id`→ProductMaster, Domain 경계 위반 아님 |
| 포장단위 연결 | **C / E 후속+추가조사** | package_unit 엔티티 부재, 표준상품 구조 확정 선행 필요 |
| 바코드 | **A 그대로 활용** | varchar(64) nullable, unique 없음, 비차단 — 원칙 완전 부합 |
| 바코드 확인 상태 | **D 1차 제외** | 검증 불필요, 별도 신고기능 없음 |
| 썸네일 | **A 그대로 활용** | nullable, 미입력 허용 |
| 설명 | **A 그대로 활용** | KPA RichTextEditor 존재 (GP/KCos는 textarea — B 보완 여지) |
| 매장 최종 콘텐츠 | **A 그대로 활용** | detailHtml + kpa_store_contents + execution_assets |
| O4O 주문가능 상품 구분 | **A 그대로 활용** | 구조적 완전 분리, handled-products UNION 읽기전용 |
| 참고자료 모달 | **C 후속 확장** | 위치·기존 자산 확보, 신규 결합 UI는 후속 WO |
| QR/POP/블로그/TV 연결 | **A/C** | kpa_store_content_product_links 매개 존재, 매장제품 직접 진입점은 후속 |
