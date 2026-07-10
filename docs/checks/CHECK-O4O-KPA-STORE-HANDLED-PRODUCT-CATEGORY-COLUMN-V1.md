# CHECK-O4O-KPA-STORE-HANDLED-PRODUCT-CATEGORY-COLUMN-V1

> WO: `WO-O4O-KPA-STORE-HANDLED-PRODUCT-CATEGORY-COLUMN-V1`
> 목적: `/store/handled-products` 목록의 **연결 콘텐츠 컬럼 제거 + O4O 표준 분류(분류) 컬럼 추가**
> 코드 커밋: `46841a1cc` · 작업일: 2026-07-10

---

## 0. 결론
매장 경영활용 제품 목록에서 `연결 콘텐츠` 컬럼(+집계 쿼리+뷰어 드로어)을 제거하고, **ProductMaster의 기존 표준 분류**(`regulatory_type`+`drug_category`)에서 파생한 **`분류`** 컬럼을 추가했다. 분류 매핑은 화면에서 새로 만들지 않고 **기존 SSOT 함수 `deriveProductClassification`**(같은 페이지의 O4O 표준상품 picker가 이미 사용)을 재사용한다. 분류 없는 제품(local·master 없음·미상)은 **`미분류`**로 안전 표시.

---

## 1. 변경 내용

### 1.1 백엔드 `store-handled-products.routes.ts` (GET /store/handled-products)
- listing SELECT에 `pm.regulatory_type` + `pm.drug_category` 추가(additive). local SELECT는 `NULL` (master 없음).
- 응답 매핑에서 `deriveProductClassification({regulatoryType, drugCategory})` → `{code,label}` 파생 →
  **`classificationCode` + `classificationLabel`** 필드 추가.
- **`linkedContentCount` 집계 쿼리(`kpa_store_content_product_links`)와 응답 필드 제거** (연결 콘텐츠 컬럼 삭제에 따른 표시 로직 제거, 쿼리 1회 절감).

### 1.2 프론트 API 타입 `handledProducts.ts`
- `HandledProduct.linkedContentCount` 제거 → `classificationCode` + `classificationLabel` 추가.

### 1.3 프론트 화면 `StoreHandledProductsPage.tsx`
- 컬럼: `선택 | 제품 | 구분 | 매장 표시 가격 | 연결 콘텐츠 | 최근 수정일`
  → **`선택 | 제품 | 구분 | 분류 | 매장 표시 가격 | 최근 수정일`**.
- `연결 콘텐츠` th/td(카운트 버튼) 제거, `구분` 뒤에 **`분류`** td 추가:
  - `classificationCode`가 `unknown`이면(또는 없음) **`미분류`**(회색), 아니면 `classificationLabel` 뱃지.
- `LinkedContentsDrawer` import·state(`drawerProduct`)·JSX 제거 + **파일 삭제**(소비처 0, dead).
- 제거 확인창의 연결-콘텐츠 경고 문구 삭제(연결 해제 시 자료함/QR 미삭제 안내는 유지).
- 검색·페이지네이션·선택 ActionBar(상세설명서 보기 / 상품 QR 출력 / 경영활용에서 제거) **무변경**.

---

## 2. 분류 매핑 (SSOT: `deriveProductClassification`)
`regulatory_type`(+`drug_category`) → 표시 분류. 화면 임의 생성 없음.

| regulatory_type | drug_category | code | 표시 라벨 |
|---|---|---|---|
| DRUG/의약품 | otc | otc | 일반의약품 |
| DRUG/의약품 | rx/etc | rx | 전문의약품 |
| DRUG/의약품 | (미지정) | drug | 의약품 |
| QUASI_DRUG/의약외품 | — | quasi | 의약외품 |
| HEALTH_FUNCTIONAL/건강기능식품 | — | health_functional | 건강기능식품 |
| MEDICAL_DEVICE/의료기기 | — | medical_device | 의료기기 |
| COSMETIC/화장품 | — | cosmetic | 화장품 |
| GENERAL/일반 | — | general | 일반·기타 |
| (없음/미상) | — | unknown | **미분류** |

> WO 예시 라벨(처방 의약품/비처방 의약품/일반 상품)과 의미 동일. 플랫폼 표준 라벨(전문의약품/일반의약품/일반·기타)은 **같은 페이지의 O4O 표준상품 picker가 이미 사용 중**이라 일관성을 위해 재사용. 임의 추정 없음 — 원천 데이터 부재 시 `미분류`.
> 데이터 한계: `GENERAL`은 식품/공산품/건기식 미분리(SOURCE GAP) → 데모 제품(예: 흑염소 진액, regulatory_type='일반')은 `일반·기타`로 표시된다(정상). 세분화는 원천 분류 보정 별도.

---

## 3. 검증
| 항목 | 결과 |
|---|---|
| api-server `type-check` (내 파일) | PASS (신규 에러 0) |
| web-kpa-society `build` | PASS (✓ 15.12s) |
| 잔여 `linkedContentCount`/`LinkedContentsDrawer`/`drawerProduct`/`countBtn` | 0 (grep CLEAN) |

### 3.1 실브라우저 smoke — **PASS** (2026-07-10, kpa-society.co.kr, Playwright)
api+web 배포(둘 다 SUCCESS: run 29071397914/29071397918) 후 체험 약국 경영자 로그인 → `/store/handled-products`:
1. ✅ 컬럼 = **선택 | 제품 | 구분 | 분류 | 매장 표시 가격 | 최근 수정일** — **`연결 콘텐츠` 컬럼 없음**, **`분류` 컬럼 추가**.
2. ✅ 분류값이 ProductMaster 표준값과 일치: **건강기능식품**(헤파에이스400·로얄파워민·코큐텐·오메가3·맨파워포텐 = HEALTH_FUNCTIONAL), **일반·기타**(아렉스알부민·리얼매스틱·콸콸포맨·흑염소진액·리포좀 = GENERAL).
3. ✅ 검색창·페이지네이션(20/50/100)·건수(10건) 정상. 선택 ActionBar(상세설명서 보기/상품 QR 출력/제거)는 컬럼 변경과 독립 — 무변경.
4. ✅ 미분류 fallback 코드 존재(이 매장은 전 제품 master 보유라 미분류 미발생).

증빙: 스크린샷 `handled-products-category-column.png`.

---

## 4. 완료 기준 대비
- [x] `연결 콘텐츠` 컬럼 제거 (+표시 로직·드로어·집계 쿼리)
- [x] `분류` 컬럼 추가
- [x] O4O 표준 분류와 실제 값 일치 (deriveProductClassification SSOT, regulatory_type/drug_category)
- [x] 분류 없는 제품 `미분류` 안전 표시 (임의 추정 없음)
- [x] 검색·페이지네이션·선택 ActionBar 유지
- [x] 타입체크·빌드 PASS / 운영 smoke **PASS** (§3.1)

## 5. 안전 확인
- migration 0 · DB write 0 (read-only 컬럼 추가 조회) · path-specific 커밋(4파일).
- 백엔드 추가 필드는 additive(regulatory_type/drug_category → classification). ProductMaster 무변경.
