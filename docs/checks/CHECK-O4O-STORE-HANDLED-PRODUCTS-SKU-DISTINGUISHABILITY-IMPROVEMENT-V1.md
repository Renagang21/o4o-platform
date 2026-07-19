# CHECK-O4O-STORE-HANDLED-PRODUCTS-SKU-DISTINGUISHABILITY-IMPROVEMENT-V1

> WO: 동일 상품명 ProductMaster 를 검색 결과에서 구분할 수 있게 SKU 보조정보 표시 (병합 아님).
> 대상: `/store/handled-products` → `O4O 표준 상품에서 추가` 모달.
> 성격: **최소 UX 개선 — 순수 프론트 변경**. ProductMaster 병합·삭제·스캐너·DB migration 없음.

---

## 1. 조사 (read-only)

### 1.1 화면·컴포넌트
- 페이지: `/store/handled-products` → [StoreHandledProductsPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx)
- 추가 모달: [AddO4oStandardProductModal.tsx](../../services/web-kpa-society/src/pages/pharmacy/AddO4oStandardProductModal.tsx) — 표 컬럼 `제품 | 제조사 | 바코드 | 분류 | 등록`.
- API 클라이언트/타입: [o4oStandardProducts.ts](../../services/web-kpa-society/src/api/o4oStandardProducts.ts) (`O4oStandardProduct`, `searchO4oStandardProducts`).

### 1.2 검색 API — `GET /api/v1/store/products/search`
[store-product-library.controller.ts:117-160](../../apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts) → `catalog.searchProductMasters`.
- **응답에 이미 `specification` 포함**(:155 `specification: m.specification || null`). regulatoryName·manufacturerName·barcode·classification·primaryImageUrl 도 포함.
- 검색 범위([catalog.service.ts:384-391](../../apps/api-server/src/modules/neture/services/catalog.service.ts)): `name / regulatory_name / barcode / manufacturer_name / alias` **모두 ILIKE** → placeholder `제품명 / 제조사 / 바코드 검색` 이미 정확(§4.3 변경 불필요).
- 개별 함량/제형/포장 컬럼(`product_drug_extensions.dosage_form/strength/package_unit`)은 **검색 응답에 없음**. (원천도 대량 코퍼스에서 대부분 NULL — [CHECK-...-KOPU-...-VERIFY-V1](CHECK-O4O-KPA-TABLET-KOPU-SAME-NAME-PRODUCTS-PROD-READONLY-VERIFY-V1.md) §1.1 실증.)

### 1.3 안정적으로 표시 가능한 필드 = `specification` (유일)
- `pm.specification` = "약품규격 / 총수량 / 제형 / 포장형태" 결합 문자열(예: `20밀리리터 / 6 / 시럽 / 포`, `500밀리리터 / 1 / 개 / 병`). **채워져 있음**.
- 개별 구조화 필드는 응답 부재 + 원천 NULL → API 확장해도 대부분 빈 값. → **specification 만** 사용, API 무변경.

### 1.4 동일 상품명 실측 사례
- 근거: [KOPU VERIFY](CHECK-O4O-KPA-TABLET-KOPU-SAME-NAME-PRODUCTS-PROD-READONLY-VERIFY-V1.md) — `코푸시럽에스` 6 ProductMaster: **이름·제조사·품목기준코드(196900058) 동일, 표준코드(바코드)·specification 상이**(500mL병 / 20mL포 1·6·12). → 병합 대상 아님(정상 SKU), specification 으로 구분 가능.
- `유한메디카` 검색 동일 이름 사례는 **배포 후 브라우저 smoke 에서 확인**(§4 검증).

### 1.5 병합이 불필요/금지인 이유
바코드(표준코드)·규격·포장수량·품목기준코드 중 하나라도 다르면 별도 SKU. 화면 목적은 **선택 UX 개선**이지 데이터 정합이 아님 → ProductMaster 구조 유지, `DISTINCT product_name` 류 병합 금지.

---

## 2. 구현 (순수 프론트, API·DB 무변경)

### 변경 파일
- [o4oStandardProducts.ts](../../services/web-kpa-society/src/api/o4oStandardProducts.ts) — `buildProductVariantLabel()` 순수 함수 추가(export, 테스트 가능).
- [AddO4oStandardProductModal.tsx](../../services/web-kpa-society/src/pages/pharmacy/AddO4oStandardProductModal.tsx) — 상품명 셀에 SKU 보조라인 + `productVariant` 스타일.

### buildProductVariantLabel
- `specification` 을 `/`·`·` 로 분리 → trim → 빈 값·`없음`·`0`·`-`·`미상`·`undefined`·`null` 제거 → 중복 토큰 제거(순서 유지) → `·` 로 결합. 없으면 `''`.
- **원문을 임의 구조화/재라벨하지 않음**(§2.3) — 존재하는 토큰만 노출. 잘못된 함량/제형 추정 없음.
- 예: `20밀리리터 / 6 / 시럽 / 포` → `20밀리리터 · 6 · 시럽 · 포` / `없음 / 0` → `''`(상품명만) / `500밀리리터 / 0` → `500밀리리터`.

### 표시
- 상품명 아래(regulatoryName 위)에 보조라인 1줄. 값 없으면 상품명만(빈 값 `-`/`undefined` 미노출).
- 스타일: `neutral600`(상품명보다 작지만 너무 흐리지 않게, §8 접근성), 색상만이 아닌 텍스트로 차이 표현. 작은 화면 자연 줄바꿈(`wordBreak: keep-all`, 말줄임 아님) + `title` 원문. 모달 폭·컬럼 구조 유지(§4.2).

### 미변경(정상 확인)
- 검색 placeholder(§4.3): API 가 name/제조사/바코드 모두 지원 → 현행 유지.
- 등록 상태(§4.4): `registeredIds`(ProductMaster id 기준) + `등록됨`/`등록` — **개별 master 단위**로 이미 정상. 동일 이름 타 SKU 등록이 현재 SKU 에 전이 안 됨.
- 등록 확인창(§4.5): 이번 범위 제외(기존 동작 유지).

---

## 3. 제외 범위 (§7 준수)
ProductMaster 병합/삭제 · ProductIdentifier·바코드 정책 변경 · 품목기준코드 그룹화 · 접기/펼치기 UI · 일괄/상품군 등록 · 바코드 스캐너·카메라 · 이미지 수집 · DB migration · AI 추출 · admin 화면 변경 — **모두 안 함**.

---

## 4. 검증
| 항목 | 결과 |
|------|------|
| typecheck (web-kpa-society) | ✅ `tsc --noEmit` EXIT 0 |
| production build | ✅ `npm run build` EXIT 0 (14.67s) |
| 단위 테스트 | ⚠️ web-kpa-society 에 테스트 인프라(vitest/jest) 부재 → 프레임워크 도입은 범위 밖. 함수는 순수·export(추후 테스트 가능). §10.1 케이스는 함수 규칙으로 커버(모두 있음/함량+제형만/포장만/전무→''/중복 제거/긴 문자열 줄바꿈/혼합/의약품·비의약품 공통). |
| 브라우저 smoke (유한메디카) | ⏳ 배포 후 — 모달 열기→`유한메디카` 검색→동일 이름 SKU 가 규격·제형·포장으로 구분됨/바코드·분류·등록 정상/카테고리·페이지네이션 정상/데이터 없는 상품도 안 깨짐 |

---

## 5. 산출물
- 변경 파일: `o4oStandardProducts.ts`, `AddO4oStandardProductModal.tsx`, 본 CHECK.
- API 변경: 없음. DB write/migration: 없음.
- commit: (아래 커밋 해시) / push 완료.
