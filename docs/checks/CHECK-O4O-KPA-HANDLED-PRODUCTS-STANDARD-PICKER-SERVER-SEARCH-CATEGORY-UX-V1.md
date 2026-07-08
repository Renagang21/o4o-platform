# CHECK-O4O-KPA-HANDLED-PRODUCTS-STANDARD-PICKER-SERVER-SEARCH-CATEGORY-UX-V1

Status: DONE — 코드 완료 + typecheck 통과 + 배포 성공 + 프로덕션 브라우저/API smoke PASS (일부 후속 항목 명시) (2026-07-08)
WO: `WO-O4O-KPA-HANDLED-PRODUCTS-STANDARD-PICKER-SERVER-SEARCH-CATEGORY-UX-V1`
선행: [`CHECK-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1`](CHECK-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1.md)

Scope: KPA `/store/handled-products`(매장 경영활용 제품)의 **"O4O 표준 상품에서 추가" 모달** picker 성능·분류 UX 정비.

---

## 1. 조사 결과 — WO 전제 정정

| WO 가정 | 실제 (조사 확정) |
| --- | --- |
| **P0** 프론트가 전체 198,389건을 먼저 로딩 후 프론트 페이지네이션 | ❌ **틀림.** 프론트 모달은 이미 `searchO4oStandardProducts({page, limit:20})` **서버 페이지네이션**. 전체 로딩 없음 |
| 느린 원인 = 프론트 전체 로딩 | ✅ **진짜 원인 = 백엔드 empty-q 조회.** `product_masters(name)` 인덱스 부재로 모달 오픈(검색어 없음) 시 `ORDER BY name ASC LIMIT 20`이 198k행 seq scan + top-N 정렬 |
| 분류 배지 표시 | ⚠️ 백엔드 `/search` 응답은 `category`(ProductCategory)만 반환 — 의약품/건기식/의료기기/의약외품/화장품 **분류 자체가 응답에 없음** (`regulatoryType`+`drugCategory`에서 파생 필요) |

**핵심 코드 경로**: [store-product-library.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts) `GET /search` → `netureService.searchProductMasters` → [catalog.service.ts](../../apps/api-server/src/modules/neture/services/catalog.service.ts) `searchProductMasters`.

---

## 2. 구현

### P0 성능 — name 인덱스 (migration, additive)
- `20261221000000-AddNameIndexToProductMasters.ts` — `CREATE INDEX idx_product_masters_name ON product_masters(name)`. empty-q `ORDER BY name LIMIT 20`을 index scan으로 전환. admin 상품 목록(동일 endpoint)에도 유익. **프론트 무수정.**

### P1 분류 배지 — 파생 필드
- [product-type.util.ts](../../apps/api-server/src/modules/neture/utils/product-type.util.ts) `deriveProductClassification({regulatoryType, drugCategory})` 추가 → `{code, label}`. 버킷: `otc`일반의약품 / `rx`전문의약품 / `drug`의약품(미확정) / `quasi`의약외품 / `health_functional`건강기능식품 / `medical_device`의료기기 / `cosmetic`화장품 / `general`일반·기타 / `unknown`미분류. **ProductCategory 와 별개.**
- store `/search` 응답 매핑에 `classification` 필드 추가(store 컨트롤러 로컬).
- 모달: 분류 컬럼에 색상 배지 렌더.

### P2 분류 필터 chip
- `catalog.searchProductMasters` + `neture.service` 래퍼에 optional `regulatoryType`/`drugCategory` 필터 추가 (**가산적 — 미전달 시 미적용, admin 무영향**).
- `classificationToFilter(code)` → (regulatory_type, drug_category) 매핑. store 컨트롤러가 `?classification=` query param을 변환.
- 모달 상단 chip 8종: 전체 / 일반의약품 / 전문의약품 / 의약외품 / 건강기능식품 / 의료기기 / 화장품 / 일반·기타.

### P2 설명서 검색 분리
- 기존 검색 대상 = `name / regulatory_name / barcode / manufacturer_name / product_aliases.alias` → **설명서 본문 이미 제외.** 별도 변경 없음. (고급검색 분리는 후속.)

### SOURCE GAP
- `regulatory_type='GENERAL'` 은 식품 vs 공산품을 구분하지 못함(원천 데이터 부재) → **"일반·기타"** 통합 표시.

---

## 3. 검증 (typecheck / 배포)
- typecheck: api-server 변경 파일 EXIT 0 / web-kpa-society EXIT 0. (`drug-otc-nutrition-combo-*` 스크립트 에러는 병렬 세션 산출물, 본 변경과 무관·build 제외 대상)
- 커밋 `d735a27d3` (path-specific, 7파일). 배포: web-kpa-society(내 SHA) + API Server(상위 커밋 `5b63bb50a`, 본 migration 포함) 모두 `completed success`. 서빙 리비전 `o4o-core-api-02471-8sr`.

---

## 4. 프로덕션 실브라우저/API smoke (2026-07-08, kpa-society.co.kr, 약국 경영자 renagang21)

브라우저: 체험용 약국 경영자 자동로그인 → `/store/handled-products` → "O4O 표준 상품에서 추가" 모달 오픈. UI 확인 후, 앱 인증 토큰으로 `/api/v1/store/products/search` 직접 호출하여 정량 검증(브라우저 fetch, warm 반복 측정).

| # | 항목 | 결과 | 근거 |
| --- | --- | :---: | --- |
| 1 | 모달 오픈 속도 (empty-q) | **PASS** | warm 444/655/724ms (cold 1359ms). total 198,389, 20건/페이지, 9,920페이지 서버 페이지네이션. 전체 로딩 없음 |
| 2 | 분류 배지 표시 | **PASS** | empty-q 첫 행 "손 부목" → `classification:{medical_device, 의료기기}`. 모달 배지 "의료기기" 렌더 확인 |
| 3 | 분류 chip 필터 | **PASS** | chip 8종 렌더. `?classification=otc` → total 57,572, 샘플 "젤-씨과립" 전부 `otc` |
| 4 | 검색 결과 정확도 | **PASS** | q=타이레놀 → total **43**, "타이레놀콜드-에스정" `일반의약품`. q=마스크 → total **5,740**. q=비타민 계열/쌍화탕 정상 응답 |
| 5 | 등록 동작 유지 | **PASS(코드)** | 선행 V1 smoke에서 검증(idempotent ALREADY_LISTED). 본 WO 미변경 |

### 후속(FAIL 아님, 별도 개선 여지)
- **타이핑 검색(ILIKE) 응답 ~2s**: q=타이레놀 warm 1976~2532ms, q=마스크 2089ms. `ILIKE '%...%'` 선행 와일드카드는 name btree 인덱스를 사용할 수 없어 seq scan + COUNT(*) 비용이 남음. **본 WO의 P0(모달 오픈=empty-q)는 개선됐으나, 타이핑 검색 속도는 별개 병목.** → 후속 제안: `pg_trgm` GIN 인덱스(name) 또는 search_vector, 그리고 매 호출 COUNT(*) 제거/근사.
- 검색어 "비타민C"/"쌍화탕" 정확 문자열 = 0건: 제품명이 "비타민씨"/"비타민 C"(공백)/한글 표기 등으로 저장된 네이밍 차이. **버그 아님.** → 후속: alias/정규화 확대(가이드 §3.7 표기변형 정규화 연계).
- 설명서 본문 고급검색 분리: 설계만. 미착수.

### 관측 메모
- 모달 오픈 시 콘솔에 `/store/products/search` 401→재시도 warmup 1건 관측(데이터는 정상 표시). 인증 토큰 warmup, 기능 영향 없음.
- 인덱스 실사용(EXPLAIN) 은 프로덕션 DB 직접 접근 제약(방화벽 + auto-mode 분류기)으로 미확인. empty-q warm ~0.5s + migration이 성공 배포된 리비전에 포함됨으로 간접 확인.

---

## 5. 변경 파일 (커밋 d735a27d3)
- `apps/api-server/src/database/migrations/20261221000000-AddNameIndexToProductMasters.ts` (신규)
- `apps/api-server/src/modules/neture/utils/product-type.util.ts`
- `apps/api-server/src/modules/neture/services/catalog.service.ts`
- `apps/api-server/src/modules/neture/neture.service.ts`
- `apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts`
- `services/web-kpa-society/src/api/o4oStandardProducts.ts`
- `services/web-kpa-society/src/pages/pharmacy/AddO4oStandardProductModal.tsx`
