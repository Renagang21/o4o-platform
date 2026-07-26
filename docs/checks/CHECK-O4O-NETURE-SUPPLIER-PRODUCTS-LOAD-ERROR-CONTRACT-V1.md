# CHECK-O4O-NETURE-SUPPLIER-PRODUCTS-LOAD-ERROR-CONTRACT-V1

WO: `WO-O4O-NETURE-SUPPLIER-PRODUCTS-LOAD-ERROR-CONTRACT-V1`
대상: 공급자 상품 목록 조회 오류 계약
작성일: 2026-07-26 (KST)
선행: `CHECK-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-LOAD-ERROR-CONTRACT-V1` (`6406c8125` · `a5a25bef3`) — 동일 패턴의 후속 항목 #1

---

## 1. 기존 오류 삼킴 위치

`services/web-neture/src/lib/api/supplier.ts` **두 곳**이었다.

```ts
// (1) getProducts()
} catch (error) {
  console.warn('[Supplier API] Failed to fetch products:', error);
  return [];                                    // ← 실패를 정상 0건으로 변환
}

// (2) getProductsPaginated()
} catch (error) {
  console.warn('[Supplier API] Failed to fetch paginated products:', error);
  return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
}                                               // ← WO §4 가 금지한 "빈 pagination 응답"
```

두 함수 모두 `result.data || []` 로 **200 이지만 payload 가 깨진 경우**도 0건으로 흘려보냈다.

> **조사 중 확인**: WO 는 `getProducts()` 를 지목했으나, 실제 `/supplier/products` 화면은
> **`getProductsPaginated()`** 를 사용한다. 후자가 바로 §4 가 명시적으로 금지한 "빈 pagination 응답"
> 형태였으므로 두 함수를 함께 정비했다.

### backend 응답 계약 (무변경)

`GET /neture/supplier/products` → 성공 `{ success: true, data: [...], pagination? }` / 실패 `5xx`.
성공 0건과 실패는 backend 에서 이미 구분 가능했다. **backend 변경 불필요.**

## 2. `getProducts()` / `getProductsPaginated()` 소비처 전수 조사

`supplierApi.getProducts()` — 4곳:

| # | 소비처 | 기존 오류 처리 | throw 전환 영향 |
|---|--------|----------------|-----------------|
| 1 | `pages/account/SupplierProductsListPage.tsx:450` | `try/catch` (무시) | **본 WO 에서 오류 UI 추가** |
| 2 | `pages/supplier/SupplierStoreDescriptionsPage.tsx:83` | `Promise.all(...).catch(() => {})` | 안전 — 실패 시 기존과 동일하게 빈 목록 |
| 3 | `pages/supplier/SupplierSignagePage.tsx:66` | `.catch(() => {})` | 안전 — 동일 |
| 4 | `pages/supplier/SupplierPartnerCommissionsPage.tsx:78` | `Promise.allSettled` (선행 WO) | 안전 — 이미 rejection 처리 |

`supplierApi.getProductsPaginated()` — 2곳:

| # | 소비처 | 기존 오류 처리 | throw 전환 영향 |
|---|--------|----------------|-----------------|
| 5 | `pages/supplier/SupplierProductsPage.tsx:1060` | **없음** (try/catch 부재) | **필수 수정** — 미처리 시 `setLoading(false)` 미실행으로 로딩 고착 |
| 6 | `pages/supplier/SupplierB2BContentPage.tsx:35` | `try/catch → setProducts([])` | 안전 — 동일 |

> 이름이 같은 `adminApi.getProducts` / `operatorProductApi.getProducts` / `eventOfferAdminApi.getProducts` /
> glycopharm `pharmacy.getProducts` 는 **별개 객체**로 접촉하지 않았다. 타 서비스 영향 0.

## 3. 변경한 오류 계약

```ts
export const SUPPLIER_PRODUCTS_LOAD_FAILED = 'SUPPLIER_PRODUCTS_LOAD_FAILED';
```

| 규칙 | 적용 |
|------|------|
| 성공 → 기존 응답 구조 그대로 (`SupplierProduct[]` / `{ data, pagination }`) | O |
| 실패 → throw (고정 sentinel) | O |
| 실패 시 `[]` / 빈 pagination | **제거** |
| 200 + `success=false` 또는 `data` 비배열 | 조회 실패 처리 (§4·§11) |
| 서버 오류 원문 화면 노출 | 없음 (`console.warn` 전용) |
| runtime schema 라이브러리 / dependency 추가 | **없음** |

**pagination 취급**: 응답 형태·필드명은 그대로다. `pagination` 은 성공 응답의 **보조 필드**이므로
누락 시에도 목록 자체는 유효하다고 보고 기본값을 유지한다(실패로 승격하지 않는다).

## 4. loading / error / empty 상태 분리

### `/supplier/products` (canonical · `SupplierProductsPage`)

`fetchProducts` 에 try/catch/finally 를 추가하고 `loadError` 상태를 도입했다.
목록은 공통 `DataTable` 을 쓰므로 **오류 노드를 `emptyMessage` 로 주입**한다 — 신규 UI 패턴 도입 없이
`loadError` 일 때 기존 빈 상태 문구(`등록된 제품이 없습니다`)가 렌더될 경로를 원천 차단한다.

| 조건 | 렌더 |
|------|------|
| `loading` | DataTable 로딩 |
| `loadError` | **오류 노드** (`상품 목록을 불러오지 못했습니다.` + `잠시 후 다시 시도해 주세요.` + `다시 시도`) |
| 성공 · 필터 있음 · 0건 | 기존 `현재 필터/검색 조건에 맞는 상품이 없습니다.` + 필터 초기화 |
| 성공 · 필터 없음 · 0건 | `등록된 제품이 없습니다` |
| 성공 · 1건 이상 | 목록 |

### `/account/supplier/products` (`SupplierProductsListPage`)

동일하게 `loadError` 를 추가하고 렌더 분기를 `loading → loadError → 0건 → 검색결과 0 → 목록` 순으로 두었다.
`EmptyState`(`등록된 상품이 없습니다.`)는 `loadError=false` 일 때만 도달한다.

## 5. 다시 시도

| 항목 | 처리 |
|------|------|
| 재호출 대상 | 동일 `fetchProducts` |
| 조건 유지 | `/supplier/products` 는 `fetchProducts(pagination.page)` 로 **현재 페이지 + 검색어 + 필터 + 승인 탭**을 그대로 유지(모두 `useCallback` 의존성에 포함) |
| loading 재진입 | O |
| 성공 시 | `setLoadError(false)` → 오류 해제 |
| 실패 시 | 오류 상태 유지 |
| 중복·무한 재호출 | 없음 — 클릭 시 1회 호출, `useEffect` 는 기존 의존성 그대로라 재실행 루프 없음 |

## 6. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/lib/api/supplier.ts` | `getProducts()` · `getProductsPaginated()` throw 계약 + sentinel |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | `loadError` · try/catch/finally · 오류 노드 |
| `services/web-neture/src/pages/account/SupplierProductsListPage.tsx` | `loadError` · `fetchProducts` useCallback · 오류 카드 |

합계 3 files, +105 / −42.

| 항목 | 값 |
|------|-----|
| backend / DB / migration | **0 / 0 / 0** |
| 상품 API 응답 구조 | **무변경** |
| 검색·필터·pagination 정책 | **무변경** (§7 쿼리 계약 실측) |
| 상품 등록·수정·가격·활성 토글·승인 요청·공급 오퍼 | **무접촉** |
| 공통 `authClient` / `apiClient` | **무접촉** |
| dependency / lockfile | **무변경** |

## 7. 오류 주입 테스트 결과

### 실행 방식

프로덕션 API 가 `localhost` 오리진을 CORS 로 차단하므로(선행 CHECK 실측), Playwright 로
`https://neture.co.kr/**` 자산만 로컬 `dist` 로 치환해 **실제 오리진에서 배포 전 검증**한 뒤,
배포 후 프로덕션 번들로 동일 스크립트를 재실행했다.
주입은 전부 **클라이언트 측 interception** 이며 backend 를 중단·조작하지 않았다.

주입 대상: `GET **/neture/supplier/products` (목록 GET 한정)

### 결과 — 43/43 PASS (두 페이지 × 시나리오 A~E + 쿼리 계약)

| 시나리오 | `/supplier/products` | `/account/supplier/products` |
|----------|:---:|:---:|
| **A. 성공 + 0건** → 빈 상태 문구, 오류·재시도 미표시 | PASS | PASS |
| **B. 성공 + 데이터** → 목록 렌더, 빈 상태·오류 미표시 | PASS | PASS |
| **C. 500** → 한국어 오류 + 재시도 안내 표시 | PASS | PASS |
| **C. 500** → **빈 상태 문구 미표시 (핵심)** | PASS | PASS |
| **C. 500** → 데이터 행 0 | PASS | PASS |
| **C. 500** → `INTERNAL_ERROR` 원문 미노출 | PASS | PASS |
| **C. 500** → `HTTP_5`·`AxiosError`·`status code` 미노출 | PASS | PASS |
| **D. 다시 시도(실패 지속)** → 오류 유지 · 빈 상태 미표시 | PASS | PASS |
| **E. 다시 시도(복구)** → 오류 해제 · 목록/정상 빈 상태 복귀 | PASS | PASS |

**시나리오 B 주의**: 검증 계정의 실제 상품이 **0건**이라, 데이터 렌더 경로는
합성 200 응답(가짜 2행)을 주입해 확인했다. **운영 데이터는 생성하지 않았다**(§8 준수).

**쿼리 계약 회귀** (실데이터 0건이라 "결과 건수 변화" 대신 클라이언트가 보내는 파라미터로 검증):

| 조작 | 전송된 요청 | 결과 |
|------|-------------|:---:|
| 초기 로드 | `products?page=1&limit=50` | PASS |
| 검색어 입력 + Enter | `keyword=` 포함 | PASS |
| `이미지 없음` 필터 칩 | `hasImage=false` 포함 | PASS |
| `승인완료` 탭 | `serviceApprovalStatus=approved` 포함 | PASS |

**텔레메트리**: page error **0** · mutation(POST/PUT/DELETE) 요청 **0**.
console error 는 **주입한 500 자체**에 대한 브라우저 기본 로그뿐이며, 정상 시나리오(A·B·E)에서는 0.

자격증명은 `docs/local/TEST-ACCOUNTS.local.md` 에서 스크립트가 직접 읽고 명령행·로그에 남기지 않았다.

## 8. 반응형 결과

오류 상태와 **정상 상태(기준선)** 를 같은 뷰포트에서 각각 측정해 회귀 여부를 분리했다.

| 뷰포트 | 페이지 | 오류 상태 overflow | 정상 상태(기준선) | 회귀 | 다시 시도 버튼 |
|--------|--------|:---:|:---:|:---:|------|
| Desktop 1440×900 | `/supplier/products` | 없음 | 없음 | **없음** | 75×24 |
| Tablet 768×1024 | `/supplier/products` | 없음 | 없음 | **없음** | 75×24 |
| Mobile 390×844 | `/supplier/products` | 있음 | **있음** | **없음 (기존 동작)** | 75×24 |
| Desktop 1440×900 | `/account/supplier/products` | 없음 | 없음 | **없음** | 124×42 |
| Tablet 768×1024 | `/account/supplier/products` | 없음 | 없음 | **없음** | 124×42 |
| Mobile 390×844 | `/account/supplier/products` | 있음 | **있음** | **없음 (기존 동작)** | 78×102 |

390px 가로 overflow 는 **정상 상태에서도 동일하게 발생**하는 기존 레이아웃 특성(넓은 상품 테이블)이며
본 변경으로 새로 생기지 않았다. 문구 잘림 없음, 다시 시도 버튼은 세 뷰포트 모두 접근 가능.

## 9. build / 배포 / 프로덕션 smoke

| 항목 | 결과 |
|------|:---:|
| `pnpm --filter @o4o/web-neture build` (`tsc && vite build`) | **PASS** (22.90s) |
| `pnpm --filter @o4o/web-neture test` | 실행 불가 — web-neture 에 test 스크립트·테스트 인프라 없음 (선행 CHECK §9 와 동일) |
| commit | `bc441b48d` |
| 배포 run | 30180801641 (push, sha `bc441b48d`) — `detect-changes` success · `deploy-neture` **success** (타 3서비스 skipped) |
| Cloud Run revision | `neture-web-01313-qr4` → **`neture-web-01314-hb4`** |
| 프로덕션 재검증 | 동일 스크립트를 배포된 프로덕션 번들로 재실행 → **43/43 PASS · 0 FAIL** (배포 전 결과와 동일) |

배포 전(로컬 dist 서빙)과 배포 후(프로덕션 번들) **두 번 모두 43/43 PASS**.
프로덕션 실행에서도 page error 0 · mutation 요청 0.

## 10. 실데이터 제한

| 항목 | 상태 | 사유 |
|------|:---:|------|
| 실제 상품 데이터로 목록·검색 결과 건수 변화 | **미확인** | 검증 가능한 공급자 계정 2개 모두 상품 0건. §8·§11 에 따라 테스트 데이터를 생성하지 않았다 |
| 데이터 렌더 경로 | 합성 200 으로 대체 검증 | 위 §7 시나리오 B |
| pagination 2페이지 이상 동작 | **미확인** | 총 0건이라 페이지가 1개뿐 |
| 실제 backend 장애 | **미재현** | 운영 backend 를 고의로 중단하지 않는다(§8) |

## 11. 후속 항목

| # | 항목 |
|---|------|
| 1 | `supplierApi.getApprovalCounts()` 는 여전히 실패를 0 카운트로 삼킨다. 탭 배지 숫자라 영향이 작아 본 WO 범위 밖 — 별도 정비 대상 |
| 2 | 같은 파일에 `return []` / 빈 기본값으로 실패를 삼키는 supplier API 가 다수 남아 있다(주문·정산·재고 등). 화면별로 오류 UI 가 필요한 곳부터 순차 정비 권장 |
| 3 | 상품 목록 390px 가로 overflow(기존 동작) — 모바일 카드 전환 검토는 별도 UX WO |
| 4 | 실데이터 확보 후 검색 결과 건수·pagination 2페이지 이상 검증 |
