# CHECK-O4O-NETURE-STORE-PRODUCT-DISCOVERY-AND-LISTINGS-LOAD-ERROR-CONTRACT-V1

> WO: **WO-O4O-NETURE-STORE-PRODUCT-DISCOVERY-AND-LISTINGS-LOAD-ERROR-CONTRACT-V1**
> (IR 묶음 1 — 매장 상품 탐색·진열 흐름의 load-error 계약화)
> 선행 조사: `docs/investigations/IR-O4O-NETURE-LOAD-ERROR-CONTRACT-FINAL-VALIDATION-V1.md`
> 상태: **구현·typecheck·build 완료 → main push → Web 배포 → 프로덕션 smoke**
> 작업일: 2026-07-27

---

## 1. 문제 (조사 → 확정)

매장(Store Owner) 상품 탐색·진열 흐름의 3개 조회 함수가 실패를 **정상 빈 결과로 삼켰다.**
사용자에게 "검색 결과 없음 / 공급자 없음 / 진열 0개" 로 보여, 실제로는 서버·네트워크 오류인데도
정상 상태와 구분되지 않았다.

| 함수 | 파일 | 기존 삼킴 |
|------|------|----------|
| `searchProducts()` | `services/web-neture/src/lib/api/store.ts` | `catch → return { data: [], meta: 0 }` |
| `getMasterOffers()` | 〃 | `catch → return []` |
| `getMyListings()` | 〃 | `catch → return { data: [], meta: 0 }` |

소비 화면(2곳)도 `try/catch`·error state 없이 무조건 결과를 그려, 실패를 빈 목록으로 렌더했다.

- `StoreProductLibraryPage.tsx` (`/store/manage/products/library`) — 검색 + 오퍼 선택 모달
- `StoreListingsPage.tsx` (`/store/manage/products`) — 내 매장 진열 목록

---

## 2. Backend 계약 확인 (정적, read-only)

`apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts`

| 엔드포인트 | 정상 | 정상 0건 | 오류/권한 |
|-----------|------|---------|-----------|
| `GET /store/products/search` | `200 { success:true, data:[], meta }` | `data: []` (200) | `403` requireStoreOwner / `500` |
| `GET /store/products/master/:id/offers` | `200 { success:true, data:[] }` | `data: []` (200) | `403` / `500`. **master 미존재도 404 아닌 빈 배열** |
| `GET /store/products` (내 진열) | `200 { success:true, data:[], meta }` | `data: []` (200) | `403` / `500` |

- **404 경로 없음** — 세 GET 모두 404 를 반환하지 않는다. 따라서 `*_NOT_FOUND` 분기는 두지 않았다.
- **403** 은 `requireStoreOwner` 실패(권한 없음)로, "정상 0건" 이 아니라 **실패**다 → 표면화 대상.
- 정상 0건은 항상 `200 + 빈 배열` 이므로, 빈 배열은 성공으로 통과시키고 실패만 throw 하면 두 상태가 분리된다.

---

## 3. 수정 (최소)

### 3.1 API 계약 (`store.ts`)

고정 에러 코드 신설:

```ts
export const STORE_PRODUCT_SEARCH_LOAD_FAILED = 'STORE_PRODUCT_SEARCH_LOAD_FAILED';
export const STORE_MASTER_OFFERS_LOAD_FAILED  = 'STORE_MASTER_OFFERS_LOAD_FAILED';
export const STORE_LISTINGS_LOAD_FAILED       = 'STORE_LISTINGS_LOAD_FAILED';
```

3개 함수를 기존 `getOrders`/`getShipment` 패턴과 동일하게 전환:

1. `api.get` 실패(4xx/5xx/네트워크) → `console.warn(describeApiError(error))` 후 고정 코드 throw.
2. 200 이지만 payload 형태 이상(`success !== true` 또는 `data` 비배열) → 동일 코드 throw.
3. 정상 200 + 빈 배열 → 그대로 성공 반환(0건). `meta` 없으면 안전 fallback.

서버 원문은 `console.warn` 으로만 남기고 UI 로 노출하지 않는다.

### 3.2 소비 화면 상태 분리

**공통 원칙:** loading / error / success+0건 / success+데이터 4상태 분리, 재시도는 현재 검색·필터·페이지 보존.

- **StoreListingsPage** — `loadError` state 추가. `fetchListings` 를 `try/catch/finally` 로 감싸고 실패 시
  `loadError=true` (목록·페이지 상태는 건드리지 않음). 실패 전용 블록(아이콘+안내+`다시 시도`)을 로딩과
  0건 사이에 렌더. 재시도는 `fetchListings(page)` 로 **현재 페이지 보존**. 헤더 카운트·페이지네이션은 에러 시 숨김.

- **StoreProductLibraryPage** — 두 **영역 독립** 상태:
  - `searchError` — `doSearch` 실패 시 결과/총계 초기화 + 에러 표면화. 재시도 `doSearch(page)` 로
    현재 q/category/brand/page 보존.
  - `offersError` — `handleListProduct` 의 오퍼 조회를 `try/catch`. 실패 시 모달에 "공급자 정보를
    불러오지 못했습니다(공급자 없음 아님)" + `다시 시도`(`retryOffers`). **오퍼 미상(unknown) 상태에서
    진열하기 액션을 숨긴다** — 실패를 "공급자 0" 으로 오인해 등록을 막거나 유도하지 않음.
  - master 전환 시 `setOffers([])` + `setOffersError(false)` 로 **이전 master 잔상 제거**.
  - 검색 실패가 오퍼 모달 상태를, 오퍼 실패가 검색 목록을 blank 시키지 않음(**영역 독립** 충족).

---

## 4. 변경 범위 밖 (WO EXCLUDE 준수)

- backend / DB / migration 무변경 (계약은 read-only 확인만).
- 검색 알고리즘 · 오퍼 정책 · listing 모델 무변경.
- mutation 계약(`createListing`/`updateListing`) 무변경 — `handleSelectOffer`/`handleToggleActive`/
  `handleSavePrice` 는 기존 `{ success, error }` 흐름 그대로.
- 공통 wrapper / UI Core / 의존성 무추가.
- 운영 write 0.

### Backend 계약 변경 필요 항목 (별도 보고, 이번 미수행)

- 없음. 프론트 스코프만으로 완결. (search 응답의 `offerCount` 미포함은 별도 WO
  `...OFFER-DEPENDENCY-CLEANUP` 결정 사항으로, 본 WO 범위 밖 — 오퍼 로드 실패 처리와는 독립.)

---

## 5. 검증

### 5.1 정적 / 빌드

- `tsc --noEmit` (web-neture) — **PASS** (0 error).
- `vite build` — **PASS** (13.56s, 0 error).

### 5.2 합성 오류 주입 (코드 경로 근거)

세 함수 모두 아래 입력에 대해 고정 코드 throw → 소비 화면 error state 렌더로 귀결:

| 주입 | API 계약 결과 | 화면 |
|------|--------------|------|
| 500 | `catch` → throw `*_LOAD_FAILED` | 에러 블록 + 다시 시도 |
| 네트워크 단절 | `catch` → throw | 〃 |
| `200 { success:false }` | payload guard → throw | 〃 |
| `200` 비배열 `data` | payload guard → throw | 〃 |
| 재시도 후 성공 | 정상 반환 | 결과/목록 정상 렌더 |
| 정상 0건(`200 []`) | 성공 통과 | "검색 결과 없음"/"공급자 없음"/"진열 0개" (정상 empty) |

### 5.3 프로덕션 smoke (실 브라우저)

- 라우트: `/store/manage/products`, `/store/manage/products/library` (실존 확인). WO 문구의
  `/store/products`·`/store/product-library`·`/store/handled-products` 는 근사 표기이며,
  `handled-products` 는 neture 라우트에 **부재**(KPA 개념) — 기록만.
- (배포 후 아래 결과 채움)

---

## 6. 커밋 / 배포

- path-specific stage (다른 세션 파일 미접촉):
  - `services/web-neture/src/lib/api/store.ts`
  - `services/web-neture/src/pages/store/StoreListingsPage.tsx`
  - `services/web-neture/src/pages/store/StoreProductLibraryPage.tsx`
  - `docs/checks/CHECK-O4O-NETURE-STORE-PRODUCT-DISCOVERY-AND-LISTINGS-LOAD-ERROR-CONTRACT-V1.md`
- commit / push / `neture-web` 배포 / smoke 결과: (아래 채움)
