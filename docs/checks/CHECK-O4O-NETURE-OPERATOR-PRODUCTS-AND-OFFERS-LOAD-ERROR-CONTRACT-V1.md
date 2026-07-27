# CHECK-O4O-NETURE-OPERATOR-PRODUCTS-AND-OFFERS-LOAD-ERROR-CONTRACT-V1

> WO: **WO-O4O-NETURE-OPERATOR-PRODUCTS-AND-OFFERS-LOAD-ERROR-CONTRACT-V1**
> (IR 묶음 2 — 운영자 상품·오퍼 관리 흐름의 load-error 계약화)
> 선행 조사: `docs/investigations/IR-O4O-NETURE-LOAD-ERROR-CONTRACT-FINAL-VALIDATION-V1.md`
> 자매 작업: `CHECK-O4O-NETURE-STORE-PRODUCT-DISCOVERY-AND-LISTINGS-LOAD-ERROR-CONTRACT-V1` (묶음 1)
> 상태: **구현·typecheck 완료 → main push → Web 배포 → 프로덕션 smoke**
> 작업일: 2026-07-27

---

## 1. 문제 (조사 → 확정)

운영자(Operator) 상품·오퍼 관리 흐름의 3개 조회 함수가 실패를 **정상 빈 결과로 삼켰다.**
"등록된 상품 없음 / 공급 가능 상품 없음" 으로 보여, 실제로는 서버·네트워크 오류인데도 정상 0건과 구분되지 않았다.
또한 승인/반려 등 mutation 성공 후의 재조회 실패도 조용히 사라졌다.

| 함수 | 파일 | 기존 삼킴 |
|------|------|----------|
| `operatorProductApi.getProducts()` | `services/web-neture/src/lib/api/operatorProductApi.ts` | `catch → return []` (403만 별도 throw) |
| `operatorAllOffersApi.getAll()` | `services/web-neture/src/lib/api/operator.ts` | `catch → return { data:[], pagination:0, kpi:0 }` |
| `operatorSupplyApi.getSupplyProducts()` | 〃 | `catch → return []` |

소비 화면(3곳)도 실패를 빈 목록/0 KPI 로 렌더했다.

- `OperatorProductApprovalPage.tsx` — 상품 승인 관리 (getProducts)
- `AllRegisteredProductsPage.tsx` — 전체 등록 상품/오퍼 (getAll)
- `AllProductsOverviewPage.tsx` — 전체 공급 가능 상품 (getSupplyProducts)

---

## 2. Backend 계약 확인 (정적, read-only)

| 엔드포인트 | 정상 | 정상 0건 | 오류/권한 |
|-----------|------|---------|-----------|
| `GET /neture/operator/products` | `200 { success:true, data:[] }` | `data:[]` (200) | `403` requireNetureScope / `500` |
| `GET /neture/operator/all-offers` | `200 { success:true, data:[], pagination, kpi }` | `data:[]` (200) | `401` 미인증 / `403` / `500` |
| `GET /neture/operator/supply-products` | `200 { success:true, data:[] }` | `data:[]` (200) | `401` / `403` / `500` |

근거: `neture.routes.ts` (all-offers L106, supply-products L384), `operator-product-approval.controller.ts` (GET /products L46, router-level `requireNetureScope('neture:operator')`).

- **404 경로 없음** — 세 GET 모두 404 미반환. `*_NOT_FOUND` 분기 없음.
- **403/401** 은 권한·인증 실패로 "정상 0건" 이 아니라 **실패** → 표면화 대상.
- 정상 0건은 항상 `200 + 빈 배열` → 빈 배열은 성공 통과, 실패만 throw 하면 두 상태가 분리된다.

---

## 3. 수정 (최소)

### 3.1 API 계약

고정 에러 코드 신설:

```ts
// operatorProductApi.ts
export const OPERATOR_PRODUCTS_LOAD_FAILED = 'OPERATOR_PRODUCTS_LOAD_FAILED';
// operator.ts
export const OPERATOR_ALL_OFFERS_LOAD_FAILED = 'OPERATOR_ALL_OFFERS_LOAD_FAILED';
export const OPERATOR_SUPPLY_PRODUCTS_LOAD_FAILED = 'OPERATOR_SUPPLY_PRODUCTS_LOAD_FAILED';
```

3개 함수를 묶음 1(`store.ts`) 과 동일 패턴으로 전환:

1. `api.get` 실패(4xx/5xx/네트워크) → `console.warn(describeApiError(error))` 후 고정 코드 throw.
2. 200 이지만 payload 이상(`success !== true` / `data` 비배열 / all-offers 는 `pagination`·`kpi` 누락) → 동일 코드 throw.
3. 정상 200 + 빈 배열 → 그대로 성공 반환(0건).
4. `getProducts` 의 기존 `403 → '접근 권한이 없습니다'` 개별 throw 는 제거 — 모든 실패를 단일 고정 코드로 통일(소비 화면이 catch 하여 에러 UI 표시). 기존에는 이 throw 가 소비 화면 catch 부재로 **unhandled rejection** 을 유발할 수 있었다.

`describeApiError` 헬퍼는 두 파일에 각각 모듈-private 로 추가(묶음 1 `store.ts` 와 동일 구현).

**mutation 무변경:** `approveProduct`/`rejectProduct`/`batchApprove`/`batchReject`/`batchToggleActive`/`productCleanupApi.softDelete` 계약은 손대지 않음(기존 `{ success, error }`·boolean·`{ updated, failed }` 흐름 유지).

### 3.2 소비 화면 상태 분리

**공통 원칙:** loading / error / success+0건 / success+데이터 4상태 분리. 재시도는 현재 검색·필터·페이지 보존. 실패 시 기존 데이터를 `[]` 로 밀지 않고 에러만 표면화. error 와 empty 를 동시 렌더하지 않음(우선순위 loading > error > empty > data).

- **OperatorProductApprovalPage** — `loadError` state 추가. `loadProducts` 를 `try/catch/finally` 로 감싸고
  실패 시 `loadError=true`(products 는 미변경). loadError 시 통계 카드/필터/ActionBar/DataTable 을 숨기고
  전용 에러 패널(아이콘+안내+`다시 시도`=`loadProducts()`) 렌더. 승인/반려/삭제/일괄 후 `loadProducts()` 재조회가
  실패해도 mutation 성공(드로어 close·목록 갱신 시도)은 그대로, 목록 영역만 에러로 전환.

- **AllRegisteredProductsPage** — `loadError` state 추가. `fetchOffers` catch 에서 기존 `setOffers([])`(blank) 제거 →
  `loadError=true`(offers/kpi 보존). loadError 시 테이블 컨테이너를 에러 패널로 교체(페이지네이션 포함 숨김).
  재시도 `fetchOffers(page)` 로 현재 page·검색·필터 보존. row/bulk 승인·반려·토글·삭제 성공 toast 후 재조회 실패
  시에도 성공 toast 유지 + 목록 영역만 에러(§7 계약).

- **AllProductsOverviewPage** — `loadError` state 추가. `fetchProducts` catch 에서 `setProducts([])` 제거 →
  `loadError=true`. loadError 시 KPI 카드 숨김(0 오인 방지) · "총 N건" → "불러오기 실패" · 테이블 본문에 에러 행
  (`다시 시도`=`fetchProducts`) · 페이지네이션 숨김.
  **주의(§7):** 본 파일은 커밋 시점에 별도 동시 세션의 DataTable 마이그레이션(원시 `<table>` → `<DataTable>`)이
  미커밋 상태로 인터리브되어 있어, **본 WO 커밋에서 제외**했다. 상세는 §6 참조.

---

## 4. 변경 범위 밖 (WO EXCLUDE 준수)

- backend / DB / migration 무변경 (계약은 read-only 확인만).
- 승인 정책 · offer 상태 머신 · 상품 데이터 모델 · operator IA 무변경.
- mutation 계약 무변경(§3.1).
- 공통 API wrapper / UI Core / 의존성 무추가.
- 운영 write 0 (mutation 실호출 없음 — 코드 경로/합성 응답으로만 검증).

### Backend 계약 변경 필요 항목 (별도 보고, 이번 미수행)

- 없음. 프론트 스코프만으로 완결.

---

## 5. 검증

### 5.1 정적 / 빌드

- `tsc --noEmit` (web-neture) — 본 WO 대상 4개 커밋 파일(operatorProductApi.ts / operator.ts /
  OperatorProductApprovalPage.tsx / AllRegisteredProductsPage.tsx) **0 error**.
- 참고: 워킹트리 전체 tsc 는 동시 세션의 **미커밋** 파일 2개(`AllProductsOverviewPage.tsx` DataTable 마이그레이션 미완,
  `SupplierPartnerCommissionsPage.tsx` thStyle/tdStyle 미사용)에서 TS6133 발생. 두 파일 모두 `origin/main` 에는
  해당 코드가 없어 **CI(커밋 트리 빌드)에는 무영향**. 본 커밋에서 두 파일 미포함.

### 5.2 합성 오류 주입 (코드 경로 근거)

세 함수 모두 아래 입력에 대해 고정 코드 throw → 소비 화면 error state 렌더로 귀결:

| 주입 | API 계약 결과 | 화면 |
|------|--------------|------|
| 500 | `catch` → throw `OPERATOR_*_LOAD_FAILED` | 에러 패널/행 + 다시 시도 |
| 401/403 | 〃 | 〃 |
| 네트워크 단절 | `catch` → throw | 〃 |
| `200 { success:false }` | payload guard → throw | 〃 |
| `200` 비배열 `data` (all-offers 는 pagination/kpi 누락 포함) | payload guard → throw | 〃 |
| 재시도 후 성공 | 정상 반환 | 목록 정상 렌더(에러 해제) |
| 정상 0건(`200 []`) | 성공 통과 | "등록된 상품 없음"/"공급 가능 상품 없음" (정상 empty) |

**mutation 후 재조회(§7):** 승인/반려/토글/삭제 성공 → 재조회 실패 경로에서 mutation 성공(toast/드로어 close)은
유지되고, 재조회 함수(`loadProducts`/`fetchOffers`)가 내부 catch 로 `loadError=true` 만 세팅(throw 전파 없음) →
mutation 성공→실패 뒤집힘 0 · 기존 데이터 [] 로 밀림 0 · unhandled rejection 0. 재조회 성공 시 에러 자동 해제.

### 5.3 프로덕션 smoke

- 배포: `Deploy Web Services (Cloud Run)` run `30229072238` — `deploy-neture` ✅ (2m26s).
  신 revision `neture-web-01340-fb2` LIVE.
- **엔드포인트 오류 게이팅 확인** (미인증 직접 호출, o4o-core-api):
  | 엔드포인트 | HTTP |
  |-----------|------|
  | `GET /api/v1/neture/operator/products` | `401` |
  | `GET /api/v1/neture/operator/all-offers` | `401` |
  | `GET /api/v1/neture/operator/supply-products` | `401` |
  세 엔드포인트가 실패를 실 HTTP 오류(401)로 반환(200-빈-결과 아님)임을 확인 → 신 코드의 `catch → throw` 경로가
  정상 empty(200 빈 배열)와 분리됨을 뒷받침.
- **실 브라우저 합성 주입 smoke: 미수행(환경 차단).** Playwright 영속 프로파일이 사용자 Chrome 세션에 점유되어
  브라우저 기동 불가. 사용자 세션 강제 종료 지양. 프론트 계약은 §5.1·§5.2·엔드포인트 게이팅으로 검증.

---

## 6. 커밋 / 배포 / 동시 세션 충돌 처리

- path-specific stage (다른 세션 파일 미접촉):
  - `services/web-neture/src/lib/api/operatorProductApi.ts`
  - `services/web-neture/src/lib/api/operator.ts`
  - `services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx`
  - `services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx`
  - `docs/checks/CHECK-O4O-NETURE-OPERATOR-PRODUCTS-AND-OFFERS-LOAD-ERROR-CONTRACT-V1.md`

- **AllProductsOverviewPage.tsx 제외 사유:** 커밋 시점에 별도 동시 세션이 동일 파일을 DataTable 로 마이그레이션
  중(미커밋)이었고, 내 error-contract 편집과 인터리브되어 워킹트리에서만 존재. 타 세션 미커밋 작업을 덮어쓰지
  않기 위해 본 커밋에서 제외. 내 편집(loadError state·fetchProducts try/catch·KPI/카운트 gate·에러 행)은 해당
  세션의 워킹카피에 이미 포함되어 있어, 그 세션의 DataTable 커밋과 함께 상륙 예정.
- **안전성:** `operator.ts`(getSupplyProducts throw) 는 커밋되지만, `origin/main` 의 AllProductsOverviewPage 는 이미
  `catch { setProducts([]) }` 를 보유 → 신 throw 를 crash 없이 흡수(구 삼킴 동작으로 graceful degrade). 3개 API 계약은
  모두 상륙, 소비 화면은 2/3 상륙 + 1/3(overview)은 동시 세션 커밋에 위임.
