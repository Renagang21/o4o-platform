# CHECK — WO-O4O-STORE-HUB-SUPPLY-PRODUCT-EXPLORER-COMMONIZATION-V1

- 작업일: 2026-08-13
- 브랜치: `work/commonization-store-hub` (worktree `C:\tmp\o4o-common-store-hub`)
- 선행: `CHECK-O4O-PHARMACY-HUB-STORE-HUB-HOME-INTRODUCTION-V1` (commit `3c2c73598`)
- 범위: 공급 상품 **탐색** 화면의 목록/검색/필터/페이지네이션/상태 공통화. 신청·제외·장바구니·주문은 서비스 고유로 유지.

---

## 1. 기존 3서비스 구조 비교 (코드 변경 전 실측)

| 항목 | KPA-Society `HubB2BCatalogPage` (798줄, `/store-hub/b2b`) | K-Cosmetics `HubB2BPage` → 공통 `SupplyCatalogHub` (482줄, `/store-hub/b2b`) | Pharmacy-Hub `ProductsPage` (251줄, `/store-owner/products`) |
|---|---|---|---|
| 데이터 타입 | `CatalogProduct` (`api/pharmacyProducts`) | `SupplyCatalogProduct` 제약 + 서비스 `CatalogProduct` | 화면 로컬 `ProductRow` (offer 기준) |
| API response | `{ data, pagination{total,limit,offset} }` | 동일 | `{ data:{ items, pagination{page,limit,total,totalPages} } }` |
| 조회 파라미터 | `distributionType` · `recommended` · `operatorView` · `limit` · `offset` | `distributionType` · `operatorView` · `limit` · `offset` | `q` · `regulatoryType` · `supplierId` · `page` · `limit` |
| 검색 | 없음 | 없음 | 있음 (상품명·바코드·제조사, 서버 검색) |
| 필터 | 유통유형 탭 4 (전체/B2B/운영자/공급 승인 대상) | 유통유형 탭 4 (동일) | 규제유형 탭 6 + 공급자 select(현재 페이지 파생) |
| 페이지네이션 | offset 기반 → 공통 `Pagination` 렌더 | offset 기반 → prev/next 버튼 | **page 기반** → prev/next 버튼 |
| 상품명 | 이름 + `내 약국` 뱃지 + description | 이름 + `내 매장` 뱃지 + description | 이름(상세 링크) + 제조사·바코드 |
| 공급자 | **로고 이미지 + placeholder + 이름** | 이름만 | 이름만 |
| 분류 | 컬럼 없음 | 컬럼 없음 | `categoryName ?? regulatoryType` + `규제` 뱃지 |
| 가격 | `priceGold ?? priceGeneral` + **sublabel(서비스가/일반가)** | `priceGold ?? priceGeneral` | `effectiveUnitPrice` + **sublabel(서비스 공급가 적용)** |
| 이미지 | 없음 | 없음 | `imageUrl` 필드는 있으나 미렌더 |
| 상태 표시 | `내 약국` 뱃지 + 추가/제외 아이콘 상태 | `내 매장` 뱃지 + 아이콘 상태 | 없음 |
| row action | 추가(+) / 제외(휴지통) | 추가(+) / 제외(휴지통) | 없음 (상품명 클릭 = 상세) |
| bulk action | ActionBar `내 약국에 추가` + **미추가 N개 statusInfo** | ActionBar `내 매장에 추가` + `선택 해제` | 없음 |
| 상세 진입 | 없음 | 없음 | `/store-owner/products/:offerId` |
| 신청 | `applyBySupplyProductId` → ProductApproval(PENDING) | 동일 | **없음 (도입 안 함)** |
| 제외 | `cancelProductByOfferId` + **커스텀 확인 모달** | `cancelProductByOfferId` + `window.confirm` | 없음 |
| 장바구니 | 없음 | 없음 | 상세 화면에서 담기 → `/store-owner/cart` → 주문 |

**실제 중복은 "목록 상태 기계"뿐이다.** 3화면 모두 동일한 것은
`조회 → loading → items/total → 필터 변경 시 1페이지 리셋 → 페이지 이동 → empty → error+재시도` 이며,
표시(컬럼)·액션(신청/제외/장바구니)·업무 의미는 서비스마다 다르다.

---

## 2. §7 판정 — **C. 기존 `SupplyCatalogHub` 유지 + 새 작은 Explorer Core 공유**

- A(그대로 확장) 기각: PharmacyHub 는 검색·select 필터·page 축·상세 진입이 필요하고 신청/제외가 **없다**.
  `SupplyCatalogHub` 에 이를 넣으면 신청 흐름과 주문 흐름이 한 컴포넌트에 섞여 §3 경계를 깬다.
- B(내부 Core 분리 후 전면 소비) 부분 채택: `SupplyCatalogHub` 는 **상태 Core 만** 소비하고 **화면(accent 탭·안내 박스·액션 컬럼·ActionBar)은 그대로 둔다.**
  공통 View 까지 태우면 GP/K-Cosmetics 의 accent 색·안내문이 바뀌어 §9 "목록 변화 없음"을 위반한다.
- KPA(798줄 fuller)는 **무변경**. §4 보호 대상(공급자 로고·권장 소비자가·가격 sublabel·제외 확인 모달·`미추가 N개` statusInfo)을 축소하지 않기 위해 이번 범위에서 제외한다.

---

## 3. 도입한 Core 구조 (2 파일, 액션 로직 0)

| 파일 | 역할 |
|---|---|
| `packages/store-ui-core/src/components/supply-catalog/useSupplyProductList.ts` | headless 상태 Core — `fetchPage` adapter · page(1-indexed)/limit · tab · select filters · search(입력/제출 분리) · loading · error · `items`/`setItems`(액션 후 로컬 반영) · `reload` · `hasActiveFilter` |
| `packages/store-ui-core/src/components/supply-catalog/SupplyProductExplorer.tsx` | 목록 View — 헤더 · 탭 · select 필터 · 검색 · `DataTable` · `Pagination` · loading/empty(조건 유무 분기)/error+재시도 · `toolbar`/`notice`/`footer` slot |

- **신청·제외·장바구니·주문 로직은 Core 에 없다.** 컬럼 `render` 와 `toolbar` slot 으로 소비처가 주입한다.
- 페이지 축은 **1-indexed page 로 통일**하고, offset API 는 각 서비스 adapter 에서 `(page-1)*limit` 로 환산한다 → **backend 무변경**.
- `SupplyProductExplorerColumn<T>` 를 재노출해 소비 서비스가 `@o4o/operator-ux-core` 를 **직접 의존하지 않는다** (신규 dependency 0).

---

## 4. 서비스별 적용

| 서비스 | 적용 | 내용 |
|---|---|---|
| Pharmacy-Hub `/store-owner/products` | Core 전면 | `useSupplyProductList` + `SupplyProductExplorer` 소비. adapter(`/pharmacy-hub/store-owner/products` 그대로) + 컬럼 4개 + 상세 링크만 남김. 251줄 → 172줄 |
| K-Cosmetics · GlycoPharm (`SupplyCatalogHub` 4개 소비처) | Core 부분 | 상태/조회/페이지네이션만 `useSupplyProductList` 로 위임. **props · 마크업 · accent · 안내문 · 액션 전부 무변경** |
| KPA-Society `/store-hub/b2b` | 미적용 | fuller 구현 보호(§4). 후속 WO 후보 |
| Neture | 코드 변경 0 | 공급 계약(`SupplierProductOffer` 등) 미접촉 — 조사만 |

`SupplyCatalogHub` 소비처 4곳(K-Cos hub/store-commerce, GP hub/store-management)은 호출부 수정 0건.

### KPA fuller 보존 방법
KPA 는 이번 WO 에서 **파일을 열지 않았다**. 추후 적용 시에도 컬럼 `render`(로고·권장 소비자가·가격 sublabel), `toolbar`(statusInfo 포함 ActionBar), 별도 확인 모달을 그대로 주입하는 wrapper 형태만 허용한다.

### PharmacyHub 주문형 계약 보존 방법
- `applyBySupplyProductId` 계열 API 를 **호출하지 않는다.** ProductApproval 도입 0.
- 상품명 클릭 → `/store-owner/products/:offerId` 상세 → `장바구니에 담기` → `/store-owner/cart` → 주문 경로 무변경 (상세/장바구니/주문/결제 파일 미수정).

---

## 5. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/components/supply-catalog/useSupplyProductList.ts` | 신규 |
| `packages/store-ui-core/src/components/supply-catalog/SupplyProductExplorer.tsx` | 신규 |
| `packages/store-ui-core/src/index.ts` | 신규 export 2 + 타입 |
| `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx` | 상태/조회를 Core 로 위임 (마크업 무변경) |
| `services/web-pharmacy-hub/src/pages/store-owner/ProductsPage.tsx` | Core 소비로 재작성 |
| `services/web-pharmacy-hub/tailwind.config.js` | `operator-ux-core/src` content glob 추가 (DataTable/Pagination 클래스 생성용) |

**backend 0 · DB 0 · migration 0 · API endpoint 0 · package.json 0 · lockfile 0.**

---

## 6. 검증 결과

| 항목 | 결과 |
|---|---|
| typecheck `pharmacy-hub-web` (`tsc -b`) | PASS (0) |
| typecheck K-Cosmetics / GlycoPharm / KPA-Society | PASS (0) — 사전 실패는 미빌드 dist 패키지 원인, 빌드 후 0 |
| `vite build` 4개 서비스 (PH / KCos / GP / KPA) | PASS |
| PharmacyHub 브라우저 smoke (`/store-owner/products`, 프로덕션 API) | PASS — 목록 1건 렌더 · 규제유형 탭 · 공급자 select · 검색 · 공급가 sublabel · console error 0 |
| PharmacyHub 상세 진입 | PASS — `/store-owner/products/3bb54519-…` 이동, 상세의 `장바구니에 담기` 정상 노출 |
| PharmacyHub empty 분기 | PASS — 조건 있음 "조건에 맞는 상품이 없습니다" / 조건 없음 "아직 … 제공된 상품이 없습니다" |
| `SupplyCatalogHub` 회귀 (stub API 하네스로 실브라우저 검증 후 하네스 삭제) | PASS — 20행/45건 · `1/3 → 2/3` 페이지 이동 · 탭 전환 시 1페이지 리셋(`1/2 · 22건`) · 단건 추가 후 뱃지 반영 · bulk 선택 시 ActionBar `내 매장에 추가 (2)` · console error 0 |
| K-Cosmetics / GlycoPharm 실계정 브라우저 smoke | **미수행** — `cosmetics` / `glycopharm` serviceKey 로 로그인 가능한 store_owner 계정 없음(`SERVICE_NOT_MEMBER`). 위 stub 하네스 + build 로 대체 |
| KPA 목록·신청·제외 | 파일 무변경 (코드 diff 0). 실계정 smoke 미수행 |
| Neture 공급 계약 | 코드 변경 0 — 위반 없음 |

---

## 7. 남은 중복 · 다음 작업 제안

1. **KPA `HubB2BCatalogPage` 미적용** — 798줄 중 상태 기계 부분(약 120줄)이 여전히 중복. fuller UI 를 slot 으로 주입하는 wrapper 화가 다음 후보.
2. **`SupplyCatalogHub` 의 View 계층** — 탭/안내 박스/페이지네이션 마크업이 `SupplyProductExplorer` 와 유사하지만 accent 정책 때문에 분리 유지 중. accent 를 Explorer 의 토큰으로 승격하면 통합 가능.
3. **PharmacyHub `imageUrl` 미렌더** — 응답에는 있으나 열이 없다. 상품 이미지 열 추가는 별도 판단 필요.
4. WO 원문의 다음 기능 후보 — **공급자 콘텐츠 탐색 → 매장으로 가져오기**.

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건 (위 §7-1~3)
