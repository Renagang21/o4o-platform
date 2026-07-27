# IR-O4O-NETURE-LOAD-ERROR-CONTRACT-FINAL-VALIDATION-V1

조사일: 2026-07-27 (KST) · 기준: `origin/main` 동기 상태

선행 문서(오류 계약 정비 완료분):
- `IR-O4O-NETURE-SUPPLIER-API-LOAD-ERROR-CONTRACT-AUDIT-V1`
- `IR-O4O-NETURE-SUPPLIER-REMAINING-C-LOAD-ERROR-CONTRACT-AUDIT-V1`
- `IR-O4O-NETURE-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1` / `…STORE-ORDER-DETAIL…`
- `CHECK-…-SUPPLIER-ORDER-INVENTORY-SETTLEMENT / APPROVAL-COUNTS / CONTENT-DISTRIBUTION / PROFILE-AUX / LIBRARY / SPOT-POLICY / SHIPMENT / ORDER-CONDITION / PARTNER-COMMISSIONS / PRODUCTS`
- `CHECK-…-STORE-ORDERS-LIST-500-AND-LOAD-ERROR-CONTRACT-V1`

**성격: read-only 최종 검증.** 코드 0 / API 0 / UI 0 / backend 0 / DB 0 / migration 0 / 배포 0 / 운영 데이터 접근·write 0.
정적 코드 분석 전용(프로덕션 호출·브라우저 실행 없음). 조사 방식: 4개 업무 흐름(매장 커머스 / 콘텐츠·CMS / 공급자 / 운영자·플랫폼)으로 분할하여 `services/web-neture/src/lib/api/**` 전 조회 함수와 소비처를 전수 재검색.

---

## 0. 오류 계약 판정 기준 (선행 표준 계승)

각 조회 함수를 다음으로 분류한다.

```text
완료            실패 시 throw(또는 404→null 명시 분리), 또는 문서화된 의도적 fail-open
정비 필요       catch 가 실패를 []/null/0/false/빈 payload 로 흡수 + 소비처가 0건↔오류 미구분
의도된 fail-open 흡수가 의도적이며 문서/주석으로 근거가 있고 UX 상 안전 (섹션 폴백 등)
미사용          소비처 없음
계약 불명확     backend 응답(200+빈 vs 404 vs 5xx)이 확정되어야 처리 방식이 갈림
```

정비 필요 항목은 정상 0건과 오류를 구분하지 못해 **장애를 "정상 빈 상태"로 위장**한다. 위험도는 P0(금전·주문·법적 오조치) → P1(중요 데이터가 "없음"으로 은폐) → P2(보조 정보) → P3(장식·배지) 로 매긴다.

---

## 1. 완료 영역 재검증 결과 — 회귀 0

선행 WO 로 정비 완료된 함수가 **현재 main 에서도 그대로 throw/전파 계약을 유지**하는지 전수 확인했다.

### 1-A. 공급자 (supplier.ts / supplierScreenSets.ts) — 23종 전부 유지

| 함수 | 위치 | 기대 계약 | 현재 main | 판정 |
|------|------|-----------|-----------|:----:|
| `getProducts` | supplier.ts:618 | throw `SUPPLIER_PRODUCTS_LOAD_FAILED` | catch→throw + payload-shape throw | OK |
| `getProductsPaginated` | supplier.ts:635 | throw | catch→throw + shape throw (pagination 기본값 문서화) | OK |
| `getApprovalCounts` | supplier.ts:679 | throw `SUPPLIER_APPROVAL_COUNTS_LOAD_FAILED` | catch→throw + `isValidApprovalCounts` throw | OK |
| `getOrdersSummary` | supplier.ts:881 | throw `SUPPLIER_ORDERS_LOAD_FAILED` | catch→throw + shape throw | OK |
| `getOrders` | supplier.ts:1004 | throw ORDERS | catch→throw + `!Array.isArray` throw | OK |
| `getUnifiedOrders` | supplier.ts:1030 | throw ORDERS | catch→throw + array throw | OK |
| `getOrderById` | supplier.ts:1055 | 404→null, else throw | `isNotFound`→null else throw | OK |
| `getOrderKpi` | supplier.ts:1076 | throw ORDERS | catch→throw + shape throw | OK |
| `getInventory` | supplier.ts:1093 | throw `SUPPLIER_INVENTORY_LOAD_FAILED` | catch→throw + array throw | OK |
| `getInventoryItem` | supplier.ts:1110 | 404→null else throw | `isNotFound`→null else throw | OK |
| `getSettlements` | supplier.ts:1194 | throw `SUPPLIER_SETTLEMENTS_LOAD_FAILED` | catch→throw + array throw | OK |
| `getSettlementDetail` | supplier.ts:1222 | 404→null else throw | `isNotFound`→null else throw | OK |
| `getSettlementKpi` | supplier.ts:1234 | throw SETTLEMENTS | catch→throw + shape throw | OK |
| `getLibraryItems` | supplier.ts:907 | throw `SUPPLIER_LIBRARY_ITEMS_LOAD_FAILED` | catch→throw + items array throw | OK |
| `getLibraryItem` | supplier.ts:937 | 404→NOT_FOUND else LOAD_FAILED | status===404 분리 + shape throw | OK |
| `listSpotPolicies` | supplier.ts:1279 | 403→FORBIDDEN else LOAD_FAILED | status===403 분리 + array throw | OK |
| `getShipment` | supplier.ts:1159 | 404→ORDER_NOT_FOUND else LOAD_FAILED; 200+null=미출고 | 404 분리·null 보존·non-object throw | OK |
| `getOrderCondition` | supplier.ts:1404 | 404→NOT_FOUND else LOAD_FAILED; null 제거 | 404 분리 + shape throw | OK |
| `getOnboarding` | supplier.ts:1436 | throw `SUPPLIER_ONBOARDING_LOAD_FAILED`; null 제거 | catch→throw + object throw | OK |
| `regulatedCategory.list` | supplier.ts:1574 | throw `SUPPLIER_REGULATED_CATEGORIES_LOAD_FAILED` | catch→throw + array throw | OK |
| `recruitment.listMine` | supplier.ts:1724 | throw `SUPPLIER_RECRUITMENTS_LOAD_FAILED` | catch→throw + array throw | OK |
| `commission.getCommissions` | supplier.ts:268 | throw `SUPPLIER_COMMISSION_LOAD_FAILED` | catch→throw + success/array throw | OK |
| `fetchSupplierScreenSets` | supplierScreenSets.ts:70 | throw `SUPPLIER_SCREEN_SETS_LOAD_FAILED` + array guard | catch→throw + `!Array.isArray` throw | OK |

> 선행 IR 이 **E 등급(계약 확인 보류)** 으로 남겼던 `getShipment` / `getOrderCondition` 은 이후 WO 에서 404 분리 계약으로 승격되어 현재 **완료**다. 선행 D 등급(의도적 fail-open)인 프로필·AI 계열은 §4 참조.

### 1-B. 매장 커머스 (store.ts) — 주문·배송 3종 유지

| 함수 | 위치 | 기대 계약 | 현재 main | 판정 |
|------|------|-----------|-----------|:----:|
| `getOrders` | store.ts:371 | throw `STORE_ORDERS_LOAD_FAILED` (transport+shape) | 유지, `\|\|[]` 재유입 없음 | OK |
| `getOrderById` | store.ts:436 | 404→`STORE_ORDER_NOT_FOUND` else `STORE_ORDER_LOAD_FAILED`, null 반환형 제거 | 유지 | OK |
| `getShipment` | store.ts:405 | 404→`STORE_SHIPMENT_ORDER_NOT_FOUND` else `STORE_SHIPMENT_LOAD_FAILED`, 200+null(미출고) 보존 | 유지 | OK |

소비처 `StoreOrdersPage` / `StoreOrderDetailPage` 모두 error(재시도) ↔ not-found ↔ 정상 0건 분리 UI 유지. `describeApiError` console-only 패턴 존재.

---

## 2. 회귀 또는 부적절한 구현 여부

```text
회귀(정비 후 다시 []/null 흡수로 되돌아간 함수): 0건
부적절한 구현(정비 완료로 표기했으나 실제로는 미흡): 0건
```

23(공급자) + 3(매장 주문·배송) = **26종 재검증 전부 계약 유지**. `data || []` / `data ?? []` 재유입, catch 흡수 부활, 소비처 오류 UI 소거 등 어느 것도 발견되지 않았다. **완료 영역은 안정적이며 재작업 대상 아님.**

한 가지 관찰(회귀 아님): 매장 주문 상세는 비-UUID id 에 대한 **프론트 정규식 가드가 없고** backend 404 → `STORE_ORDER_NOT_FOUND` 매핑에 의존한다. 이는 오류 흡수 결함이 아니라 "주문 UUID 검증" WO 항목이 **backend 계약 레벨에서 충족**되고 있다는 의미다. 별도 정비 불필요.

---

## 3. 남은 오류 삼킴 목록 (정비 필요)

소비처가 0건↔오류를 구분하지 못해 장애가 "정상 빈 상태"로 보이는 조회 함수. 업무 흐름별로 묶었다(§6).

### 3-A. 매장 상품 검색·오퍼·취급 상품 (store.ts)

| 함수 | 위치 · endpoint | 실패 fallback | 소비처(route) | 사용자 오인 | 위험 | 계약 |
|------|-----------------|---------------|---------------|-------------|:---:|------|
| `getMyListings` | store.ts:498 · `GET /store/products` | catch → `{data:[],meta:{total:0}}` (+`data\|\|[]`) | `StoreListingsPage.tsx:46` (`/store/manage/products`) — try/catch·error state 없음 | 내 매장 진열 조회 장애 → "진열 제품 0개" → 등록 상품이 사라진 줄 앎 | **P1** | 불명확 |
| `getMasterOffers` | store.ts:475 · `GET /store/products/master/:id/offers` | catch → `[]` (+`data\|\|[]`) | `StoreProductLibraryPage.tsx:215` (오퍼 선택 모달) | offer 조회 장애 → "선택 가능 공급자 없음" → 진열 불가로 오판. `offerCount>0` 게이트 뒤라 빈 배열은 사실상 오류 | **P2** | 불명확 |
| `searchProducts` | store.ts:455 · `GET /store/products/search` | catch → `{data:[],meta:{total:0}}` (+`data\|\|[]`) | `StoreProductLibraryPage.tsx:186` (`/store/manage/products/library`) | 검색 장애 → "검색 결과 없음" → 없는 상품이라 판단 | **P2** | 불명확 |

### 3-B. 운영자 상품·오퍼 관리 (operator.ts / operatorProductApi.ts)

| 함수 | 위치 · endpoint | 실패 fallback | 소비처(route) | 사용자 오인 | 위험 | 계약 |
|------|-----------------|---------------|---------------|-------------|:---:|------|
| `operatorAllOffersApi.getAll` | operator.ts:79 · `GET /neture/operator/all-offers` | catch → `{data:[],pagination:0,kpi:all-0}` | `AllRegisteredProductsPage.tsx:282` — catch도 `setOffers([])`, error UI 없음 | 목록 비고 **KPI 전부 0** = "등록 상품 없음" | **P1** | 아니오 |
| `operatorProductApi.getProducts` | operatorProductApi.ts:14 · `GET /neture/operator/products` | 403→throw, 기타 catch → `[]` | `OperatorProductApprovalPage.tsx:175` (`data\|\|[]`), `AllRegisteredProductsPage` | 비-403 장애 → "승인 대기 상품 없음" → 운영 판단 오도 | **P1** | 아니오 |
| `operatorSupplyApi.getSupplyProducts` | operator.ts:116 · `GET /neture/operator/supply-products` | catch → `[]` | `AllProductsOverviewPage.tsx:41` — error UI 없음 | "공급 상품 없음" | **P2** | 아니오 |
| `operatorProductApi.approveProduct` / `rejectProduct` | operatorProductApi.ts:26 | catch → `false` | `OperatorProductApprovalPage:193/204`, `AllRegisteredProductsPage:432/447` — `if(ok)` 성공만 처리 | 승인/거부 눌렀는데 무반응(토스트 없음) → 실패를 인지 못 함 | **P2** | 아니오 |

### 3-C. 운영자 홈페이지 CMS·콘텐츠 자산 (content.ts)

| 함수 | 위치 · endpoint | 실패 fallback | 소비처(route) | 사용자 오인 | 위험 | 계약 |
|------|-----------------|---------------|---------------|-------------|:---:|------|
| `homepageCmsApi.getContents(section)` | content.ts:206 · `GET /neture/admin/homepage-contents` | catch → `[]` | `HomepageCmsPage.tsx:43` (운영자 CMS) — error state 전무, "첫 콘텐츠 추가하기" CTA | admin API 장애 → 빈 섹션으로 오인 → **중복 재생성 유발** | **P1** | 아니오 |
| `contentAssetApi.listAssets` | content.ts:70 · `GET /dashboard/assets` | catch → `{success:false,data:[]}` | `MyContentPage.tsx` (`/my-content`) — `setAssets([])`, `success` 미확인 | "아직 가져온 콘텐츠 없음" | **P2** | 아니오(이미 `success` 플래그 존재) |
| `contentAssetApi.getKpi` | content.ts:85 · `GET /dashboard/assets/kpi` | catch → `{success:false,data:{…0,null}}` | `MyContentPage.tsx` KPI 카드 (`.catch(()=>{})`) | 전부-0 KPI 가 실제처럼 보임 | **P2** | 아니오(`success` 존재) |
| `cmsApi.getContents` | content.ts:131 · `GET /neture/content` | catch → `{data:[],pagination:0}` (+`data\|\|[]`) | `ContentListPage`/`CommunityAnnouncementsPage`/`NetureResourcesPage`/`CommunityPage` — **ContentListPage 의 try/catch+빨간 error UI 가 dead code**(API 가 throw 안 함) | 장애 → "등록된 콘텐츠/공지 없음" | **P2** | 아니오(API throw 로 기존 error UI 재활성) |

### 3-D. 운영자 대시보드 부분 은폐 (dashboard.ts)

| 함수 | 위치 · endpoint | 실패 fallback | 소비처(route) | 사용자 오인 | 위험 | 계약 |
|------|-----------------|---------------|---------------|-------------|:---:|------|
| `dashboardApi.getOperatorDashboard` | dashboard.ts:111 · `GET /neture/operator/dashboard` | catch → `null` | `HubPage.tsx:440` (admin 분기, `allSettled`) — null → admin 섹션 **조용히 숨김** | 운영자 KPI 블록이 장애 시 사라짐(=없음) | **P2** | 아니오 |

> `HubPage.tsx` 함정: `dashboardApi.*` 가 **내부에서 이미 catch→null** 하므로 `allSettled` 관점에서 항상 `fulfilled(null)`. 즉 `results[..].status==='rejected'` 분기는 사실상 dead code 이고, 장애든 진짜 빈 데이터든 동일하게 `null→미표시/0` 으로 수렴한다. `allSettled` 자체는 크래시 방지엔 적절하나 **장애 신호가 사용자에게 전달되지 않는다.**

### 3-E. 공급자 잔여 (supplier.ts / supplierSignage.ts / supplierScreenSets.ts)

| 함수 | 위치 · endpoint | 실패 fallback | 소비처 | 사용자 오인 | 위험 | 계약 |
|------|-----------------|---------------|--------|-------------|:---:|------|
| `supplierProfileApi.getProfile` | supplier.ts:1327 · `GET /neture/supplier/profile` | catch → `null` | `SupplierActivationGate.tsx:74` (`.catch` **도달 불가** — API가 throw 안 함 → 오류가 null 프로필로 위장, 게이트 open→비-ACTIVE 취급), `SupplierProfilePage`, `SupplierDashboardPage` | 일시 장애 → "미승인/프로필 미완료" 로 표시 | **P2** | 불명확(null 이 정상 상태인지, `getOnboarding` 처럼 항상 200-object 인지) |
| `supplierRecruitmentApi.getApplications` | supplier.ts:1741 · `GET /neture/partner/recruitments/:id/applications` | catch → `null` | `SupplierRecruitmentDetailPage` — 404↔장애 미구분 | 장애 → "모집 없음/신청 0건" | **P2** | 불명확(404 vs 5xx) |
| `fetchSupplierSignageList` | supplierSignage.ts:66 (`call()` :57) · `GET /kpa/supplier/signage/media` | 4xx/5xx/network→throw(정상), **200-non-array → `undefined`**(array guard 없음) | `SupplierSignagePage.tsx:58` — network 오류는 표면화, 깨진 200 은 `items=undefined`→`.map` 크래시/무음 | 계약 위반 200 → 빈 목록/화이트스크린 | **P2** | 아니오(`fetchSupplierScreenSets:78` 처럼 `Array.isArray` 가드 추가) |
| `supplierProfileApi.getCompleteness` | supplier.ts:1338 · `/profile/completeness` | catch → `null` | 프로필 완성도 UI | 오류가 0%/미정으로 | **P3** | 불명확 |
| `fetchSupplierScreenSet`(detail)+mutations | supplierScreenSets.ts:85~147 (`call()` :45) | 4xx/5xx/network→throw(정상), **200 에서 `res.data?.data` undefined → 조용히 `undefined` pass-through** | `SupplierTabletScreenSetsPage`+에디터 | 깨진 200 상세→빈 에디터; 깨진 200 mutation→무음 성공 오인 | **P3** | 아니오(`call()` 에서 `data` 존재 검증) — signage mutations 동일 잔여 |
| `supplierCopilotApi.getProductPerformance`/`getDistribution`/`getTrendingProducts` | supplier.ts:382/393/404 | catch → `console.warn` + `[]` | `SupplierDashboardPage` copilot 카드 | "성과/유통/급상승 0" | **P3** | 불명확(보조 위젯, 의도적 fail-open 경계) |

> 참고: `CHECK-PROFILE-AUX §16 #4` 가 이미 screen-set `call()` undefined pass-through 를 후속 항목으로 명시했다. 본 IR 은 이를 3-E 저우선 잔여로 재확인한다.

---

## 4. 의도된 fail-open 목록 (정비 대상 아님 — 유지)

UX 상 안전하고(부분 섹션 폴백) 근거가 문서/주석·플래그로 확인되는 흡수. **건드리지 않는다.**

| 함수 | 위치 | fail-open 방식 | 근거 |
|------|------|----------------|------|
| `homepageCmsApi.getHeroSlides` | content.ts:181 | catch→`[]` → `StaticHero` 폴백 | 파일 헤더 문서화("0건이면 정적 Hero") |
| `homepageCmsApi.getAds` | content.ts:189 | catch→`[]` → 섹션 미표시 | 문서화("0건이면 섹션 미표시") |
| `homepageCmsApi.getLogos` | content.ts:197 | catch→`[]` → 미표시 | 문서화 |
| `cmsApi.trackView` | content.ts:168 | catch→무시 | 조회수 fire-and-forget |
| `contentAssetApi.getCopiedSourceIds` | content.ts:61 | catch→`{success:false,sourceIds:[]}` | "사용 중" 배지 전용(장식) |
| `contentAssetApi.getSupplierSignal` | content.ts:118 | catch→`false` | 프로모 배너 전용 |
| `dashboardApi.getSellerSignal` | dashboard.ts:121 | catch→`{success:false}` | `success` 플래그로 구분 가능 |
| `operatorAllOffersApi.batchToggleActive` | operator.ts:104 | catch→`{failed:[{id:'all',error:'NETWORK_ERROR'}]}` | 실패 신호 보존(무음 아님) |
| `notificationsApi.getUnreadCount` / `list` | notifications.ts:28/40 | **401 만** →0/빈, 그 외 re-throw | 파일 헤더 문서화(로그아웃 정상 처리) |
| `supplierProfileApi.getAiInsight` | supplier.ts:415 | catch→`null` | AI 인사이트 선택적(보조) |

> `dashboardApi.getSellerSignal`·`operatorAllOffersApi.batchToggleActive` 는 **실패를 플래그로 노출**하므로 fail-open 이되 무음이 아니다(안전). 반면 3-B 의 `approveProduct`(catch→`false`)는 소비처가 실패 플래그를 무시하여 무음이므로 정비 필요다 — 같은 boolean 반환이라도 소비처 처리로 등급이 갈린다.

---

## 5. P0~P3 우선순위

**P0 없음.** 금전·주문·법적 오조치를 유발하는 흡수는 재검증에서 발견되지 않았다(주문·정산·재고 계열은 §1 에서 완료 확인). 남은 항목은 전부 "목록/집계 은폐" 성격이다.

### P1 (우선 구현 대상)

| # | 함수 | 흐름 | 오도되는 운영 판단 |
|---|------|------|---------------------|
| 1 | `getMyListings` | 매장 취급상품 | 진열 제품이 사라진 줄 앎 |
| 2 | `operatorProductApi.getProducts` | 운영자 상품 승인 | 승인 대기 없음으로 오인 → 처리 누락 |
| 3 | `operatorAllOffersApi.getAll` | 운영자 전상품/KPI | 등록 상품 전무로 오인 |
| 4 | `homepageCmsApi.getContents` | 운영자 홈페이지 CMS | 빈 섹션 오인 → 중복 재생성 |

### P2 (같은 화면·흐름 후속 정비에 포함)

`getMasterOffers` · `searchProducts`(매장) / `getSupplyProducts` · `approve|rejectProduct` 무음(운영자) / `listAssets` · `getKpi` · `cmsApi.getContents`(콘텐츠 자산) / `getOperatorDashboard` HubPage 은폐 / `getProfile` · `getApplications` · `fetchSupplierSignageList` 200-가드(공급자)

### P3 (저우선 잔여)

`getCompleteness` / screen-set·signage detail·mutation undefined pass-through / `supplierCopilot.*` 배열

---

## 6. 업무 흐름별 후속 묶음

함수별 소형 WO 를 만들지 않는다. **같은 API 파일·같은 소비 화면·같은 오류 UI 패턴** 기준으로 묶었다.

### 묶음 1 — 매장 상품 검색·오퍼·취급 상품 (P1 포함, 최우선)
```text
getMyListings (P1) + getMasterOffers (P2) + searchProducts (P2)     — store.ts
소비처: StoreListingsPage, StoreProductLibraryPage
패턴: 선행 STORE_ORDERS 계약(throw 상수 + 목록 loadError + 재시도) 그대로 이식
선행 필요: backend 200+빈 vs 5xx 계약 확인 (§10)
```

### 묶음 2 — 운영자 상품·오퍼 관리 (P1 포함)
```text
operatorAllOffersApi.getAll (P1) + operatorProductApi.getProducts (P1)
 + getSupplyProducts (P2) + approve|rejectProduct 무음 (P2)
소비처: AllRegisteredProductsPage, OperatorProductApprovalPage, AllProductsOverviewPage
패턴: 목록 error state + KPI '—' + mutation 실패 토스트
```

### 묶음 3 — 운영자 홈페이지 CMS·콘텐츠 자산 관리 (P1 포함)
```text
homepageCmsApi.getContents (P1) + contentAssetApi.listAssets/getKpi (P2)
 + cmsApi.getContents dead-error-UI 재활성 (P2)
소비처: HomepageCmsPage, MyContentPage, ContentListPage
주의: 공개 콘텐츠 브라우징(§4 홈페이지 3종)은 이 묶음에서 제외 — 의도적 fail-open 유지
접근: listAssets/getKpi 는 이미 반환하는 `success:false` 플래그를 소비처가 읽기만 하면 됨(backend 무변경)
```

### 묶음 4 — 공급자 프로필·시그니지·스크린셋 잔여 (P2/P3, 후순위)
```text
getProfile (P2, 도달 불가 error 분기) + getApplications (P2)
 + fetchSupplierSignageList Array.isArray 가드 (P2)
 + screen-set/signage detail·mutation undefined pass-through (P3) + getCompleteness/copilot (P3)
소비처: SupplierActivationGate, SupplierProfilePage, SupplierRecruitmentDetailPage, SupplierSignagePage, SupplierTabletScreenSetsPage
선행 필요: getProfile/getApplications backend 계약(200-object vs 404) 확인 (§10)
```

**묶지 않을 것**: 매장(묶음1)·운영자 상품(묶음2)·CMS(묶음3)·공급자(묶음4)는 업무 의미·화면·회귀 범위가 모두 달라 하나의 구현 WO 로 묶지 않는다. HubPage 대시보드 은폐(3-D)는 운영자 KPI 성격상 묶음2 또는 별도 소규모로 처리 가능(소비처가 HubPage 단일).

### backend 계약 확인 필요 (§10 요약)
```text
1. GET /store/products, /store/products/search, /master/:id/offers — 미존재/권한없음 시 200+빈 vs 4xx/5xx
2. GET /neture/supplier/profile — null 이 정상 미생성 상태인가 404 인가
3. GET /neture/partner/recruitments/:id/applications — 404 vs 5xx
4. platform.ts list 응답 — 항상 {data:[...]}/pagination 보장 여부(200+{data:null} 오인 가능성)
```
전부 **backend 소스 정적 확인** 또는 후속 WO 선행 조사 단계에서 처리한다(본 IR 은 호출 안 함).

---

## 7. 지금 정비 트랙을 닫아도 되는 범위

```text
닫아도 되는 영역 (완료·안정, 재작업 불필요):
  - 공급자 주문·재고·정산·상세 (getOrders/Inventory/Settlement 계열 + KPI + 상세 404 분리)
  - 공급자 승인 건수 / 콘텐츠 배포(모집 listMine) / 파트너 커미션 / 상품 목록
  - 공급자 자료함(getLibraryItems/Item) / 스팟 정책 / 프로필 온보딩·규제품목·주문조건·배송
  - 공급자 스크린셋 목록(fetchSupplierScreenSets)
  - 매장 주문 목록·상세·배송 + 주문 UUID(backend 404 계약 충족)
  - 플랫폼 admin(accounts/services/users) — throw + error 배너
  - 운영자/관리자 대시보드 진입(fetchOperatorDashboard/fetchAdminDashboard) — null=error+재시도
  - 알림(401-only fail-open) / 홈페이지 공개 3종(문서화 fail-open) / 각종 배지·시그널

열어 두어야 하는 트랙 (남은 흡수, §6 묶음):
  - 묶음1 매장 상품 검색·오퍼·취급상품 (P1)
  - 묶음2 운영자 상품·오퍼 관리 (P1)
  - 묶음3 운영자 홈페이지 CMS·콘텐츠 자산 (P1)
  - 묶음4 공급자 프로필·시그니지·스크린셋 잔여 (P2/P3)
```

**결론**: 선행에서 정비한 "공급자·매장 커머스 핵심 조회" 트랙은 회귀 0 으로 **종료 가능**하다. 남은 흡수는 **매장 진열/운영자 관리/CMS/공급자 보조** 4개 흐름으로, P1 4건을 우선 구현 대상으로 올리고 P2·P3 는 같은 화면 후속에 포함한다.

---

## 8. 코드·DB·배포 변경 0

| 항목 | 값 |
|------|-----|
| 코드 변경 | **0** |
| API 계약 변경 | **0** |
| UI 변경 | **0** |
| backend / DB / migration | 0 / 0 / 0 |
| 배포 | **0** |
| 운영 데이터 접근·write | **0** |
| 다른 세션 파일 접촉 | **0** |
| 조사 방식 | 정적 코드 분석 전용(프로덕션 호출·브라우저 실행 없음) |

---

## 9. 결과 요약표

| 흐름 | 완료(재검증 OK) | 남은 흡수(정비 필요) | 의도적 fail-open | 최고 위험 |
|------|:---:|:---:|:---:|:---:|
| 공급자 주문·재고·정산·상세 | 13 | 0 | — | — |
| 공급자 자료함·스팟·프로필·모집·커미션·스크린셋 | 10 | getProfile/Completeness/Applications/signageList/screen-set·mutation/copilot | getAiInsight | P2 |
| 매장 주문·배송 | 3 | 0 | — | — |
| 매장 상품 검색·오퍼·취급 | 0 | getMyListings/getMasterOffers/searchProducts | — | **P1** |
| 운영자 상품·오퍼 관리 | batchApprove 등 | getAll/getProducts/getSupply/approve·reject무음 | batchToggleActive | **P1** |
| 콘텐츠·CMS·자료함 | getContentById/mutations | homepageCmsApi.getContents/listAssets/getKpi/cmsApi.getContents | trackView/copied-ids/signals + 홈페이지 3종 | **P1** |
| 운영자·플랫폼 대시보드 | platform·dashboard 진입 5종 | getOperatorDashboard(HubPage 은폐) | sellerSignal/notifications | P2 |

**총평**: 재검증 26종 회귀 0. 남은 오류 삼킴은 4개 업무 흐름의 P1 4건 + P2/P3 잔여이며, 전부 **프론트 단독(흡수 제거 또는 기존 `success` 플래그 소비)** 으로 해결 가능하고 backend 변경이 강제되는 항목은 없다(일부 계약 확인만 선행).

---

*Recorded: 2026-07-27 · read-only 최종 검증 · 변경 0*
