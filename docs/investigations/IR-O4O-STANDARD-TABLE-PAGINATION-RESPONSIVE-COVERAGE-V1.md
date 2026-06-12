# IR-O4O-STANDARD-TABLE-PAGINATION-RESPONSIVE-COVERAGE-V1

> **성격**: Investigation Report 전용. **코드 무변경**. O4O 전반의 표준 테이블 / 테이블형 리스트 화면을 조사하여 pagination 적용 여부와 responsive coverage 현황을 정리하고, 후속 수정 WO 분리안을 제시한다.
> **선행**: `CHECK-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1`(buyer checkout 라벨 공통 정렬 완료) §10 후속 트랙 분리 합의.
> **작성일**: 2026-06-12
> **결과: 조사 완료 — 4서비스 + 공통 패키지 + backend pagination contract 현황 정리. 코드 수정 없음.**

---

## 1. Summary

### 조사 범위
- **Frontend 서비스 4종**: web-kpa-society / web-glycopharm / web-k-cosmetics / web-neture
- **공통 UI 패키지**: packages/ui (BaseTable·DataTable·RowActionMenu·FilterBar·ActionBar·EmptyState·Pagination 계열) / operator-ux-core / operator-core-ui / store-ui-core / account-ui / shared-space-ui
- **Backend**: apps/api-server 주요 리스트 조회 endpoint pagination contract

### 핵심 발견 (3줄 요약)
1. **Frontend pagination 표준화는 전반적으로 양호**(특히 operator/admin 영역은 `@o4o/operator-ux-core DataTable` 기반 server-side pagination이 사실상 표준). 다만 **"전체 로딩 후 client-side filter/slice"** 패턴이 각 서비스 핵심 업무 화면(주문/신청/브랜드/운영자/상품승인)에 잔존 — 데이터 증가 시 성능·메모리 리스크.
2. **Responsive 리스크는 "자체 `<table>` / inline-style / CSSinJS / 커스텀 카드리스트" 화면에 집중**. 표준 BaseTable 경유 화면은 `overflow-x-auto` 가로스크롤이 내장되어 비교적 안전하나, **Store(매장) 영역의 비표준 화면 + RowActionMenu 드롭다운이 overflow 컨테이너에 갇히는 구조적 문제**가 공통.
3. **Backend pagination contract는 미표준화**. 동일 개념을 5가지 response shape(`pagination` / `meta` / top-level flat / `items` / `data+total`만)으로 반환하고, `totalPages` vs `pages` 등 필드명 불일치, max limit 검증 유무 혼재. Forum Posts는 중복 pagination 필드까지 존재.

### 가장 큰 리스크
- **전체 로딩(client-side) 핵심 업무 화면** — Neture `AdminProductApprovalPage`/`BrandManagementPage`/`OperatorsPage`, KCos `ApplicationsPage`/`EventOfferApprovalsPage`, GP `PharmacyOrders`, KPA `StoreOrdersPage`. 데이터 증가 시 P0 성능 붕괴 + 모바일 사용 불가.
- **Store(매장) 영역 비표준 + responsive 취약** — KCos `StoreOrdersPage`/`StoreLocalProductsPage`(CSSinJS), GP `CustomerRequestsPage`/`StoreLocalProductsPage`, Neture `StoreOrdersPage`(inline style). 매장 담당자 일일 화면인데 모바일 깨짐 위험.
- **공통 컴포넌트 레벨 구조적 미흡** — RowActionMenu 드롭다운이 `overflow-x-auto` 내부에 갇힘(Portal 미사용), SearchBar `max-w-md` 고정, Pagination 계열 모바일 stack 미지원.

### 후속 WO 필요 여부
**필요.** 공통 컴포넌트 보강 1건 + 서비스 계층별(운영자/매장/공급자) 적용 3건 + backend contract 표준화 1건으로 분리 권장 (§8).

---

## 2. O4O Standard Baseline (잠정 기준)

### Pagination 기준
- 기본 pageSize: **20** (대량 업무형 50 허용)
- pageSizeOptions: 20 / 50 / 100
- server max limit: **100** (모든 paginated endpoint 강제)
- 검색/필터/정렬 변경 시 **page=1 reset**
- server 데이터는 가능하면 **server-side pagination**. "전체 배열 로딩 후 client-side slice"는 대량 데이터 화면에서 **개선 대상**으로 분류
- 권장 response shape (canonical 후보):
  ```json
  { "success": true, "data": [], "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }
  ```

### Responsive 기준 (검토 화면폭)
- mobile **390 x 844** / tablet **768 x 1024** / desktop **1440 x 900**

최소 합격 기준:
- 모바일에서 화면 좌우 깨짐 없음 / 컬럼 多 테이블은 horizontal scroll 허용
- 검색·필터 영역 모바일 세로 정렬 / 액션 버튼 겹침·잘림 없음
- 페이지네이션 모바일 사용 가능 / empty·loading·error 상태 모바일 정상

### 분류 코드
| 코드 | 의미 |
|----|------|
| A | 표준 DataTable + server pagination + responsive 양호 |
| B | 표준 DataTable + pagination/response 일부 미흡 |
| C | 표준 DataTable인데 pagination 없음(전체 로드) |
| D | 자체 table/list + pagination 있음 |
| E | 자체 table/list + pagination 없음 |
| F | card/list인데 pagination 필요 |
| G | 데이터량 구조적으로 적어 pagination 예외 가능 |
| H | 라우트/화면은 있으나 비활성·접근 불가 |

### 우선순위
| 우선순위 | 기준 |
|----|------|
| P0 | 데이터 증가 가능 + pagination 없음, 또는 모바일 사용 불가 수준 |
| P1 | 운영자/관리자 주요 업무 화면 pagination/responsive 미흡 |
| P2 | 매장/약국/공급자 주요 업무 화면 미흡 |
| P3 | 보조 화면, 데이터량 적음, 후순위 |
| EX | pagination 예외 가능 |

---

## 3. Common Components

| Component | Package / 파일 | Pagination Support | Responsive Support | RowAction Mobile | Empty/Loading/Error | 주요 사용처 |
|---|---|---|---|---|---|---|
| **BaseTable** | `packages/ui/src/components/table/BaseTable.tsx` | ❌ (상위에서 처리) | ✅ overflow-x-auto wrapper + min-w-full + table-layout fixed | N/A | emptyMessage ✅ / loading 상위 | 모든 테이블 렌더 엔진 |
| **DataTable (ag-components)** | `packages/ui/src/ag-components/DataTable.tsx` | ✅ `{current,pageSize,total,onChange}` | ✅ (BaseTable 상속) | N/A | loading skeleton ✅ / emptyText ✅ | 표준 데이터 테이블 |
| **DataTable (operator-ux-core)** | `packages/operator-ux-core` (BaseTable wrap) | ❌ prop 없음 (server-side는 상위 + 별도 Pagination) | ✅ (BaseTable 상속) | RowActionMenu 사용 | emptyMessage/loading/error prop ✅ | **operator/admin 사실상 표준** |
| **Pagination** | `packages/operator-ux-core/src/list/Pagination.tsx` | ✅ page/totalPages/total | ⚠️ 고정 flex, 모바일 stack 미지원 | N/A | N/A | server-side 리스트 |
| **AGTablePagination** | `packages/ui/src/ag-components/AGTable.tsx` | ✅ page/totalPages/totalItems | ⚠️ flex gap, 모바일 stack 미지원 | N/A | N/A | AGTable 조합 |
| **ContentPagination** | `packages/ui/src/content-discovery/ContentPagination.tsx` | ✅ currentPage/totalPages/pageSize | ⚠️ inline style, 모바일 버튼 비대 | totalPages≤1이면 null | N/A | CMS/discovery |
| **HubPagination** | `@o4o/shared-space-ui` | ✅ | (Hub/Forum 전용) | N/A | N/A | Forum/Hub 리스트 |
| **RowActionMenu** | `packages/ui/src/components/table/RowActionMenu.tsx` | N/A | ⚠️ **fixed 드롭다운이 overflow-x-auto 컨테이너에 갇힘**(Portal 미사용) | ⚠️ 우측 셀에서 잘림 위험 | confirm 내장 | 모든 행 액션 |
| **FilterBar** | `packages/ui/src/components/table/FilterBar.tsx` | N/A | ✅ flex-wrap + min-w-[180px] (모바일 auto stack) | N/A | N/A | 테이블 상단 필터 |
| **SearchBar** | `packages/operator-ux-core/src/list/SearchBar.tsx` | N/A | ⚠️ **max-w-md 고정** → 모바일 cut-off | N/A | N/A | 리스트 검색(300ms debounce) |
| **ActionBar** | `packages/ui/src/components/table/ActionBar.tsx` | N/A | ✅ flex wrap + ml-auto | N/A | 선택 0이면 null | bulk action |
| **EmptyState** | `packages/ui/src/components/EmptyState.tsx` | N/A | ✅ compact prop, 반응형 | N/A | ✅ icon/title/desc/action | 데이터 없음 |
| **BaseDetailDrawer** | `packages/ui/src/components/table/BaseDetailDrawer.tsx` | N/A | ✅ 우측 슬라이드(width prop) / ⚠️ narrow screen 화면 점유 큼 | N/A | loading ✅ / **error 상태 없음** | row 상세 |
| **AGPageHeader** | `packages/ui/src/layout/AGPageHeader.tsx` | N/A | ✅ sm: breakpoint + 반응형 padding | N/A | N/A | 페이지 헤더 |

### 공통 컴포넌트 보강 필요 (우선순위)
| 우선순위 | 항목 | 현황 | 개선 방향 |
|----|------|------|---------|
| **P1** | RowActionMenu 모바일 | fixed 드롭다운이 테이블 overflow 내 갇힘 | **Portal(document.body mount)** 또는 popover 라이브러리 |
| **P1** | SearchBar 모바일 너비 | max-w-md 고정 | max-w-full / flex-1 |
| **P1** | Pagination 계열 모바일 | flex gap, stack 미지원 | sm breakpoint compact 모드 |
| **P2** | FilterBar 모바일 gap | gap-3 | gap-2 sm:gap-3 / flex-col sm:flex-row |
| **P2** | BaseDetailDrawer error 상태 | loading만 | error/errorMessage prop |
| **P3** | operator-ux-core DataTable에 pagination prop 통합 검토 | ag DataTable엔 있음 | ListColumnDef 통일 고려 |

> **Design System 이중 구조 주의**: ① ag-components `DataTable`(pagination prop 내장) ② operator-ux-core `DataTable`(별도 Pagination 조합) — 두 표준이 병존. 후속 공통화 시 어느 쪽을 canonical로 둘지 결정 필요.

---

## 4. Service Coverage Matrix

> 표는 각 서비스에서 발견된 **대표 리스트 화면**을 정리한 것이다(전수 아님). 분류/우선순위는 §2 기준.

### 4.1 KPA Society (`services/web-kpa-society`)

전반적으로 **operator/content/hub 영역이 표준 DataTable + server-side pagination(limit 20)으로 가장 잘 정렬**되어 있음. pagination 완전 누락 화면은 사실상 없고, client-side는 데이터 적은 화면에 한정.

| Area | Route/Page 파일 | Component | List Type | Pagination | Responsive Risk | 분류 | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| 매장 주문 | `pages/pharmacy/StoreOrdersPage.tsx` | DataTable | 표준 | client slice (limit:100) | overflow-x-auto, 데이터 적음 | C | P2 | 전체 로드 후 client 필터(현재 데이터 소량) |
| 운영자 회원 | `pages/...MemberManagementPage.tsx`(Console wrapper) | OperatorMembersConsole | 표준 | server | 양호 | A | P0 | totalPages UI 노출 검증 권장 |
| 관리자 회원 | `pages/admin/AdminMemberManagementPage.tsx` | MemberListLayout(DataTable) | 표준 | server/20 | 양호 | A | P0 | hard delete workflow |
| 콘텐츠 허브 | `pages/...ContentListPage.tsx` | 3섹션 BaseTable | 표준 | server/20 | 카드형 대체 ✅ | A | P1 | 문서/코스/설문 |
| 포럼 목록 | `pages/...ForumListPage.tsx` | BaseTable+Card | 표준 | HubPagination server/10 | ✅ 모바일 카드 전환 우수 | A | P1 | 반응형 모범 사례 |
| 감사 로그 | `pages/operator/AuditLogPage.tsx` | DataTable | 표준 | server/20 | ⚠️ 컬럼 width 고정 → tablet 넘침 | B | P1 | |
| 운영자 POP/Blog/QR/Survey/채널/포럼카테고리/약국신청/사이니지 등 | `pages/operator/*` | DataTable + ActionPolicy/bulk | 표준 | server/20 | ⚠️ 일부 RowActionMenu 잘림 | A/B | P1 | 다수 화면 표준 적용 양호 |
| Hub 라이브러리(B2B/POP/QR/Signage/Blog) | `pages/pharmacy/Hub*Library.tsx` | DataTable+bulk | 표준 | server/offset 20 | 양호 | A/B | P2 | B2B는 offset 기반 |
| 포럼 피드 | `pages/...ForumFeedPage.tsx` | Card 무한스크롤 | card | client infinite | 모바일 친화 | D | P2 | server pagination 전환 검토 |

**가장 큰 리스크 3**: ① 회원관리(P0) totalPages 표시/대량 성능 ② 운영자 Blog/POP/QR RowActionMenu tablet 잘림 ③ AuditLog/HqPlaylists/HqMedia 컬럼 多 가로 넘침.
**Pagination 완전 누락**: 없음(전체 로드는 데이터 소량 화면 한정 — StoreOrders/CourseList).
**Responsive 위험**: AuditLogPage, QualificationRequests Drawer, Operator(Blog/POP/QR) RowActionMenu, HqPlaylists/HqMedia, HubB2BCatalog.

### 4.2 GlycoPharm (`services/web-glycopharm`)

operator 영역은 DataTable 표준 양호. **store-management(매장) 영역의 커스텀 리스트가 리스크 집중**.

| Area | Route/Page 파일 | Component | List Type | Pagination | Responsive Risk | 분류 | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| 운영자 주문/약국/상품/매장/회원/신청 | `pages/operator/*Page.tsx` | DataTable@ux-core / core-ui wrapper | 표준 | server/10~20 | 양호 | A | P1 | stats/필터/count 표준 |
| 자격신청/LMS강의/블로그/설문/채널 | `pages/operator/*` | DataTable + RowActionMenu/bulk | 표준 | server/20 | 양호 | A/B | P2~P3 | |
| Hub 라이브러리(B2B/Blog/Signage/POP/QR) | `pages/hub/Hub*Page.tsx` | DataTable | 표준 | offset/20 | 양호 | A/B | P2~P3 | offset 기반 |
| 스토어 승인 | `pages/operator/StoreApprovalsPage.tsx` | DataTable | 표준 | server | 미확인 | B | P1 | 전체 코드 재검토 필요 |
| **약국 주문 내역** | `pages/store-management/PharmacyOrders.tsx` | 커스텀 카드 | card/custom | **client (limit:100 전체)** | expandable, 모바일 중 | E | **P2→P0(증가시)** | 대량 약국 성능 위험 |
| **고객 요청 처리** | `pages/store-management/CustomerRequestsPage.tsx` | 커스텀 카드 | card/custom | server(미확인) | ⚠️ tab wrap, card 모바일 | D | P2 | responsive 점검 필요 |
| 매장 로컬상품 | `pages/store-management/StoreLocalProductsPage.tsx` | 커스텀 list+modal | 자체 | server/20 | ⚠️ modal 모바일 | D | P3 | |
| B2B 상품(검증용) | `pages/store-management/PharmacyB2BProducts.tsx` | 구형 @o4o/ui DataTable | 자체 | client(검증) | 위험 | E | P3 | 신규 DataTable 마이그레이션 후보 |
| 포럼 게시글 | `pages/forum/*` | HubPagination | 표준 | server/20 | 양호 | A | P2 | |

**가장 큰 리스크 3**: ① PharmacyOrders 전체 로드(limit:100) ② CustomerRequestsPage responsive 미확인 ③ StoreLocalProducts modal 모바일.
**Pagination 완전 누락**: PharmacyOrders(전체 로드), PharmacyB2BProducts(검증용).
**Responsive 위험**: CustomerRequestsPage, PharmacyB2BProducts, PharmacyOrders(expandable), StoreLocalProductsPage(modal).

### 4.3 K-Cosmetics (`services/web-k-cosmetics`)

operator/hub는 표준 양호. **Store 영역 CSSinJS + client-side 전체 로드 다수 → 리스크 가장 집중된 서비스 중 하나**.

| Area | Route/Page 파일 | Component | List Type | Pagination | Responsive Risk | 분류 | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| 운영자 상품/주문/회원/매장 | `pages/operator/*Page.tsx` | DataTable / core-ui wrapper | 표준 | server/20 | 낮음 | A | P1 | 완전 표준 |
| **운영자 신청** | `pages/operator/ApplicationsPage.tsx` | DataTable | 표준 | **client (limit:100 전체)** | 낮음 | E | P1 | status 필터 client-side |
| **운영자 이벤트오퍼** | `pages/operator/EventOfferApprovalsPage.tsx` | DataTable | 표준 | **client (limit:50 전체)** | 낮음 | E | P3 | pagination 미구현 |
| 운영자 채널/QR/POP/블로그/설문/LMS | `pages/operator/*` | DataTable + RowActionMenu/bulk | 표준 | server/20 (meta형) | 채널 RowAction 중 | A/B | P2 | meta shape |
| 강제 콘텐츠 | `pages/operator/...ForcedContentPage.tsx` | 구형 @o4o/ui DataTable | 자체 | client 전체 | 중 | E | P3 | 신규 DataTable 마이그레이션 후보 |
| Hub(B2B/POP/QR/Blog/Signage) | `pages/hub/*` | DataTable+ActionBar | 표준 | server/offset 20 | 낮음~중 | A/D | P2~P3 | |
| **매장 주문** | `pages/store/StoreOrdersPage.tsx` | **CSSinJS 커스텀** | 자체 | server/20 | ⚠️ **높음**(media query 미흡, 상태탭 grid 없음) | D | **P1** | 가장 자주 쓰는 매장 화면 |
| **매장 로컬상품** | `pages/store/StoreLocalProductsPage.tsx` | 커스텀+modal | 자체 | client filter(20) | ⚠️ **높음**(modal form overflow) | E | P2 | search client debounce |
| 사이니지 재생선택 | `pages/store/...SignagePlayerSelectPage.tsx` | 구형 DataTable | 자체 | client 전체 | 중 | E | P3 | keyword 필터만 |

**가장 큰 리스크 3**: ① StoreOrdersPage CSSinJS responsive ② StoreLocalProductsPage modal/전체로드 ③ Applications/EventOffers pagination 누락.
**Pagination 완전 누락**: ApplicationsPage, EventOfferApprovalsPage, ForcedContentPage, SignagePlayerSelectPage, (StoreLocalProducts는 search가 client-side 재로드).
**Responsive 위험**: StoreOrdersPage(높음), StoreLocalProductsPage(높음), OperatorStoreChannels(RowAction), HubSignage, ForcedContent, SignagePlayerSelect.

### 4.4 Neture (`services/web-neture`)

admin/operator 화면이 가장 많음. **표준 DataTable과 자체 table/inline-style이 혼재**, client-side 전체 로드 화면이 핵심 업무에 다수 → **P0 집중**.

| Area | Route/Page 파일 | Component | List Type | Pagination | Responsive Risk | 분류 | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| 관리자 회원 | `pages/admin/AdminMemberManagementPage.tsx` | DataTable | 표준 | server/20 | overflow-x-auto ✅ | A | P1 | |
| 운영자 전체상품 | `pages/operator/AllRegisteredProductsPage.tsx` | DataTable+Drawer | 표준 | server/50 | tablet KPI grid 재배치 | A | P1 | |
| **운영자 브랜드 관리** | `pages/operator/BrandManagementPage.tsx` | DataTable | 표준 | **client 전체** | DataTable | C | **P0** | page 기능 미포함, 1000+시 저하 |
| **관리자 운영자 관리** | `pages/admin/OperatorsPage.tsx` | DataTable | 표준 | **client 전체** | DataTable | C | **P0** | page 미구현 |
| **관리자 상품 승인** | `pages/admin/AdminProductApprovalPage.tsx` | **raw HTML table** | 자체 | **client 전체** | ⚠️ **모바일 없음** | E | **P0** | 메모리 로드+필터, responsive 전무 |
| 운영자 상품승인 | `pages/operator/OperatorProductApprovalPage.tsx` | DataTable+Drawer | 표준 | server(내부) | tablet RowAction 중 | B | P1 | |
| 문의/정산/커미션/파트너정산 | `pages/admin/Admin*Page.tsx` | **자체 table**(expandable) | 자체 | server/20 | ⚠️ inline style, mobile>tablet 깨짐 | B | P1 | DataTable 마이그레이션 후보 |
| 주문 관리 | `pages/operator/OrdersManagementPage.tsx` | 자체 table+inline | 자체 | server/20 | ⚠️ 모바일 깨짐 | B | P1 | |
| 파트너 모니터링 | `pages/admin/AdminPartnerMonitoringPage.tsx` | DataTable | 표준 | server/20 | 양호 | A | P1 | |
| 유통참여형펀딩 | `pages/operator/MarketTrialApprovalsPage.tsx` | Card+table(failures) | mixed | server/20 | overflow-x-auto ✅ | D | P2 | |
| 포럼 관리 | `pages/operator/ForumManagementPage.tsx` | core-ui wrapper | 표준 | wrapper | 양호 | A | P2 | |
| 공급자 상품 관리 | `pages/supplier/SupplierProductsPage.tsx` | EditableDataTable | 표준 | server/20 | RowAction 검증 | A | P1 | |
| 공급자 주문 | `pages/supplier/SupplierOrdersPage.tsx` | Card+확장 | card | server/20 | 양호 | D | P2 | |
| **공급자 자료실** | `pages/supplier/SupplierLibraryPage.tsx` | DataTable(단순) | 자체 | **client 전체** | 단순 | C/G | P2 | |
| **공급자 상품목록** | `pages/account/SupplierProductsListPage.tsx` | **자체 table+mobile card** | 자체 | **없음** | ⚠️ inline, mobile toggle 불완전 | E | P2 | |
| 매장 주문 | `pages/store/StoreOrdersPage.tsx` | inline style+table/card toggle | 자체 | server/20 | ⚠️ inline | B | P1 | |
| 포럼 게시글 | `pages/forum/ForumPage.tsx` | HubPagination+table | 표준 | server/20 | 양호 | A | P2 | |

**가장 큰 리스크 3**: ① AdminProductApprovalPage(raw table + 전체로드 + responsive 전무) ② BrandManagementPage(전체로드 P0) ③ OperatorsPage(전체로드 P0).
**Pagination 완전 누락**: AdminProductApprovalPage, BrandManagementPage, OperatorsPage, SupplierLibraryPage, SupplierProductsListPage (+ 상태 확인 필요: AdminMasterManagement, CategoryManagement, StoreManagement).
**Responsive 위험**: AdminProductApproval(모바일 전무), SupplierProductsList(inline), OrdersManagement(inline), AdminSettlements/AdminCommissions(expandable inline), StoreOrders(inline).

---

## 5. Backend Pagination Contract Matrix

| Service/Domain | Endpoint | Query Params | Server Pagination | Response Shape | Max Limit | 기본 limit | 파일 |
|---|---|---|---|---|---|---|---|
| KPA Checkout | `GET /checkout/orders`, `/checkout/store-orders` | page,limit,status | ✅ take/skip | `{data, pagination{page,limit,total,totalPages}}` | 100 | 20 | `routes/kpa/controllers/kpa-checkout.controller.ts` |
| GP Checkout | `GET /checkout/orders` | page,limit | ✅ take/skip | `{data, pagination{...}}` | 100 | 20 | `routes/glycopharm/controllers/checkout.controller.ts` |
| GP Operator | `GET /operator/orders`, `/operator/pharmacies` | page,limit,status,paymentStatus | ✅(orders 위임) / stub(pharmacies) | `{data, pagination{...}}` | varies | 20/10 | `routes/glycopharm/controllers/operator.controller.ts` |
| Forum Posts | `GET /forum/posts` | page,limit,forumId,search,tag,status,sortBy | ✅ getManyAndCount | ⚠️ **중복**: `{data,total,page,limit,totalPages, pagination{...}, totalCount}` | 50 | 20 | `controllers/forum/ForumPostController.ts` |
| Forum Comments | `GET /forum/posts/:id/comments` | page,limit | ✅ findAndCount | `{data, pagination{page,limit,totalPages}, totalCount}` | — | 20 | `controllers/forum/ForumCommentController.ts` |
| LMS Courses | `GET /courses` | page,limit,filters | ✅ getManyAndCount | BaseController.okPaginated 위임 | filter dependent | 20 | `modules/lms/controllers/CourseController.ts` |
| Signage Media | `GET /media` | page,limit,mediaType,status,search,sort | ✅ getManyAndCount | ⚠️ `{data, total}`만 (page/limit/totalPages 없음) | implicit | 20 | `routes/signage/controllers/media.controller.ts` |
| KPA Members | `GET /members` | page,limit,organization_id,status,role,search | ✅ raw SQL LIMIT/OFFSET | 배열 + custom meta | ⚠️ 없음 | 20 | `routes/kpa/controllers/member.controller.ts` |
| Cosmetics Members | `GET /members` | page,limit,status,subRole | ✅ getManyAndCount | `{data:{items,total,page,limit}}` | 100 | 20 | `routes/cosmetics/controllers/cosmetics-member.controller.ts` |
| Neture Products | `GET /products`, `/products/search` | page,limit,partner_id,category,status,sort | ✅ findAndCount | `{data, meta{page,limit,total,totalPages}}` | implicit | 20 | `routes/neture/services/neture.service.ts` |
| Neture Partners | `GET /partners` | page,limit,type,status,sort | ✅ skip/take | ⚠️ `{partners, total}` (page 정보 없음) | implicit | 20 | `routes/neture/repositories/neture.repository.ts` |
| Admin Approvals | `GET /approvals` | status,page,limit | ✅ getManyAndCount | ⚠️ `{requests, pagination{page,limit,total,pages}}` (`pages` 명칭) | implicit | 20 | `controllers/admin/adminApprovalController.ts` |

### Response shape 변종 (5종)
- **A 중복형**(Forum Posts): top-level + `pagination` + `totalCount` 동시 — 정리 필요.
- **B meta형**(Neture Products, Signage): `{data, meta{...}}`.
- **C top-level pagination형**(Checkout, Cosmetics Members): `{data, pagination{...}}` — **canonical 후보**.
- **D items형**(KPA Members, Neture Partners): `{items/partners, total}` — page 정보 누락 가능.
- **E minimal형**(Signage Media): `{data, total}`만 — 클라이언트가 totalPages 직접 계산.

### Contract 표준화 필요
- **P1**: Forum Posts 중복 필드 제거 / Signage Media·Neture Partners에 page·limit·totalPages 추가 / 모든 endpoint max limit 100 강제(미들웨어).
- **P2**: response shape를 `{data, pagination{page,limit,total,totalPages}}`로 통일 / `pages`→`totalPages` / `items`↔`data` 통일.
- **P3**: 대량 데이터(orders/members) cursor 기반 검토.

---

## 6. Findings by Category

### 6.1 Pagination Missing (전체 로드 / pagination 미구현)
- **Neture**: AdminProductApprovalPage, BrandManagementPage, OperatorsPage, SupplierLibraryPage, SupplierProductsListPage **(P0 다수)**
- **K-Cosmetics**: ApplicationsPage(limit:100), EventOfferApprovalsPage(limit:50), ForcedContentPage, SignagePlayerSelectPage
- **GlycoPharm**: PharmacyOrders(limit:100), PharmacyB2BProducts(검증용)
- **KPA**: 없음(전체 로드는 데이터 소량 화면 한정 — StoreOrders/CourseList)

### 6.2 Client-side Pagination Only (server 데이터인데 client slice/filter)
- KCos StoreLocalProductsPage(search client debounce 재로드), KPA StoreOrdersPage·CourseListPage, GP PharmacyOrders, Neture 상품승인/브랜드/운영자.

### 6.3 Server-side Pagination Inconsistent (offset vs page, meta shape 차이)
- offset 기반: KPA/GP/KCos Hub B2B·Library 계열. page 기반과 혼재.
- backend response shape 5종 혼재(§5).

### 6.4 Responsive Wrapper Missing (자체 table / inline / CSSinJS)
- Neture AdminProductApproval(raw table·모바일 전무), Admin Settlements/Commissions·OrdersManagement·SupplierProductsList·StoreOrders(inline).
- KCos StoreOrdersPage·StoreLocalProductsPage(CSSinJS).
- GP store-management 커스텀 리스트.
- 표준 BaseTable 경유 화면은 overflow-x-auto 내장으로 비교적 안전.

### 6.5 Mobile Filter/Search Risk
- 공통 SearchBar `max-w-md` 고정. 매장 화면 상태탭 grid 미적용(KCos StoreOrders), 커스텀 tab wrap(GP CustomerRequests).

### 6.6 Row Action Risk
- **공통 구조 문제**: RowActionMenu 드롭다운이 `overflow-x-auto` 컨테이너 내부에 갇혀 우측 셀에서 잘림(Portal 미사용) — 전 서비스 공통.
- 특히 KPA operator(Blog/POP/QR), KCos 채널.

### 6.7 Empty/Loading/Error State Risk
- DataTable 기반 화면은 empty/loading/error 대체로 구비.
- BaseDetailDrawer는 **error 상태 prop 없음**(loading만).
- 자체 table 화면 일부 error/empty 누락 가능(개별 점검 필요).

---

## 7. Exception Candidates (pagination 예외 가능)

기준: 항목 수가 구조적으로 적음 / 설정성 static list / 단순 navigation / dashboard summary card / server data 아님.

- KPA: CourseListPage(강사 강의 ~10건), 데이터 소량 store/instructor 화면.
- Neture: SupplierLibraryPage(자료 소량 시 G), dashboard summary card류.
- 각 서비스 **설정/옵션성 local list**(상태 옵션, 카테고리 static 등).
- **주의**: "현재 데이터가 적다"는 운영 성장에 따라 변할 수 있으므로, 예외 인정 화면도 **데이터 증가 모니터링 대상**으로 표시(특히 GP PharmacyOrders, KPA StoreOrders는 현재 소량이나 매장 주문이라 증가 가능 → 예외 아님, 개선 대상).

---

## 8. Recommended Follow-up WOs (분리안)

1. **WO-O4O-TABLE-PRIMITIVE-RESPONSIVE-HARDENING-V1** — 공통 컴포넌트 보강
   - RowActionMenu **Portal 적용**(overflow 갇힘 해결), SearchBar `max-w-full`, Pagination 계열 모바일 compact, FilterBar gap, BaseDetailDrawer error 상태, ag-DataTable vs operator-ux-core DataTable canonical 결정.
   - 우선순위: **P1 (모든 서비스 동시 수혜, 선행 권장)**

2. **WO-O4O-OPERATOR-ADMIN-LIST-PAGINATION-V1** — 운영자/관리자 리스트 pagination/responsive
   - Neture **AdminProductApproval / BrandManagement / Operators**(P0 전체 로드 → server pagination), Admin Settlements/Commissions/Orders 자체 table → 표준 DataTable, KCos **Applications / EventOffers** server pagination.
   - 우선순위: **P0~P1**

3. **WO-O4O-STORE-LIST-RESPONSIVE-PAGINATION-V1** — 매장/약국 경영자 리스트
   - KCos **StoreOrdersPage(CSSinJS→Tailwind)** / StoreLocalProductsPage(modal 반응형), GP PharmacyOrders(server pagination)/CustomerRequests(responsive)/StoreLocalProducts, Neture StoreOrders(inline 정리).
   - 우선순위: **P1~P2**

4. **WO-O4O-SUPPLIER-LIST-PAGINATION-V1** — 공급자 리스트
   - Neture SupplierProductsListPage(자체 table+pagination), SupplierLibrary, 공급자 영역 RowAction 반응형.
   - 우선순위: **P2**

5. **WO-O4O-BACKEND-PAGINATION-CONTRACT-STANDARD-V1** — backend contract 표준화
   - response shape를 `{data, pagination{page,limit,total,totalPages}}`로 통일, Forum Posts 중복 제거, Signage Media·Neture Partners page 정보 보강, max limit 100 미들웨어 강제, `pages`→`totalPages`.
   - 우선순위: **P1 (FE 적용과 병행 — shape 확정이 FE 작업 전제)**

> **권장 순서**: 5(backend shape 확정) + 1(공통 primitive) 선행 → 2 → 3 → 4. backend shape 확정 없이 FE만 손대면 재작업 발생.

---

## 9. Final Recommendation

### 즉시 수정 대상 (P0)
- Neture **AdminProductApprovalPage / BrandManagementPage / OperatorsPage** — 전체 로드 + (상품승인은 responsive 전무). 데이터 증가 시 UI 사용 불가.
- KCos **ApplicationsPage / EventOfferApprovalsPage** — 운영자 신청/오퍼 전체 로드.

### 후속 분리 대상 (P1~P2)
- 공통 primitive 보강(RowActionMenu Portal·SearchBar·Pagination 모바일) — **모든 서비스 선행 수혜**.
- 매장 영역 CSSinJS/inline → 표준 DataTable + Tailwind responsive(KCos·GP·Neture Store 화면).
- backend pagination contract 표준화(FE 작업 전제).

### 보류 가능 대상 (P3 / EX)
- 데이터 구조적 소량 화면(설정·옵션 list, 일부 supplier 자료실) — 데이터 증가 모니터링 조건부 예외.
- KPA operator/hub 영역은 이미 표준 정렬 양호 — RowActionMenu 공통 수정 시 자동 수혜, 개별 WO 불요.

### 표준화 필요 공통 컴포넌트
- RowActionMenu(Portal), SearchBar(width), Pagination 계열(모바일), BaseDetailDrawer(error), ag-DataTable ↔ operator-ux-core DataTable **canonical 단일화 결정**.

---

*Date: 2026-06-12 · IR-O4O-STANDARD-TABLE-PAGINATION-RESPONSIVE-COVERAGE-V1 · 4서비스 + 공통 패키지 + backend contract pagination/responsive 현황 조사. 코드 무변경. 후속 WO 5건 분리안 제시(공통 primitive / 운영자·관리자 / 매장 / 공급자 / backend contract).*
