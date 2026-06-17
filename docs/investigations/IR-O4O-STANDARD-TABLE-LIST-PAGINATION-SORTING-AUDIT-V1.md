# IR-O4O-STANDARD-TABLE-LIST-PAGINATION-SORTING-AUDIT-V1

> **유형:** 내부 화면 감사(read-only — 코드/route/backend/schema/package 변경 0). 문서 1개 산출.
> **선행 기준:** [IR-...-EXTERNAL-BENCHMARK-V1](IR-O4O-STANDARD-TABLE-LIST-EXTERNAL-BENCHMARK-V1.md)(b833d19d3) · O4O-TABLE-STANDARD-BASELINE-V1 · `@o4o/operator-ux-core` list 모듈.
> **결론(3확정): ① 내부 리스트는 "공통 컴포넌트(DataTable)는 널리 쓰지만 페이지네이션·정렬·검색·응답shape·URL sync는 화면마다 제각각"으로 흩어져 있다. ② STANDARD-LIST-CORE 가 먼저 만들 것 = `useStandardListQuery`(state/URL sync/page=1 reset/응답 normalize) + `StandardListToolbar` + 표준 응답 어댑터. DataTable/Pagination 컴포넌트는 이미 있어 신규 불요(수렴 대상). ③ `/operator/stores` 첫 적용 = **적합**(이미 OperatorStoresList 공통 + 서버 page/limit/sortBy/search 지원).**
> Date: 2026-06-17

---

## 1. Executive Summary

- `@o4o/operator-ux-core` list 모듈은 이미 **DataTable / Pagination / SearchBar / EditableDataTable / useBatchAction / action·delete-policy** 를 export. 4앱 합산 **163 import** — 컴포넌트 채택은 높다.
- 그러나 표준 운영 환경의 **상태 계층**(검색·필터·정렬·페이지 state + URL query sync + page=1 reset + 응답 정규화)은 **공통화되어 있지 않다.** 화면마다 `useState(page/limit)` + 자체 pagination JSX + 제각각 응답 파싱을 반복.
- 외부 벤치마크 표준 대비 주요 gap 3: **(g1) 응답 shape 4종 혼재**, **(g2) 정렬은 "현재 페이지 내 클라이언트 정렬"(sortAccessor)이 다수 — 서버 전체기준 정렬 아님**, **(g3) URL query sync·page=1 reset 미표준**.
- **즉시 적용 후보 존재**(`/operator/stores`, operator members, 승인 큐들). **backend 선행 필요**는 일부(array-only 응답 endpoint).

## 2. 조사 범위와 기준

- 범위: web-neture / web-glycopharm / web-kpa-society / web-k-cosmetics 의 operator·store·supplier·admin 관리 리스트 화면 + 대응 api-server list endpoint. (detail/dashboard/home 제외.)
- 기준: 외부 벤치마크 IR 의 4 레이어(`StandardListToolbar/DataTable/Pagination + useStandardListQuery`) + 응답 `{success,data,pagination}` + page=1 reset + 정렬 opt-in.
- 방법: rg/grep 정적 분석 + 공통 모듈 export 확인. 운영 데이터 미조회.

## 3. 외부 기준 ↔ 내부 감사 연결

| 외부 표준(벤치마크) | 내부 현황 | 정합도 |
|---|---|---|
| Toolbar(검색/필터/액션) | 화면별 자체 구현(SearchBar 컴포넌트 거의 미사용) | △ 분산 |
| DataTable(정렬·행액션) | operator-ux-core DataTable 널리 사용(28+ 화면) | ✅ 양호 |
| Pagination 별도 컴포넌트 | 컴포넌트는 있으나 다수 화면이 **자체 pagination JSX** | △ 분산 |
| 서버 페이지네이션/정렬/필터 | 페이지네이션은 서버 다수, **정렬은 클라이언트(페이지 내)** 다수 | △ 정렬 gap |
| `{success,data,pagination}` | **4종 혼재**(아래 §8) | ❌ 비표준 |
| page=1 reset / URL sync | 일부만, 비표준 | ❌ |
| useStandardListQuery 류 상태 계층 | **부재** | ❌ |

## 4. 리스트 화면 인벤토리 (대표)

> 4앱 합 ~40 화면. 대표/패턴 구분용 발췌. (app·area·route·component·UI·pagination·sort·search·filter·응답)

| 화면 | app·area | route | component | 공통UI | 페이지네이션 | 정렬 | 검색 | 필터 | 응답shape |
|------|----------|-------|-----------|--------|------|------|------|------|----------|
| Store 관리 | neture·operator | `/operator/stores` | StoreManagementPage→**OperatorStoresList**(operator-core-ui) | 공통 wrapper | **서버**(page/limit) | **서버**(sortBy/Order) | ✓ | serviceKey | `{data,pagination{page,limit,total,totalPages}}` |
| 회원 관리 | neture·operator | `/operator/members` | UsersManagementPage→**OperatorMembersConsolePage** | 공통 wrapper | 서버 | 클라(sortAccessor) | ✓ | status tabs/role | `{data.users,data.pagination}` |
| 전체 상품 | neture·operator | `/operator/all-products` | AllRegisteredProductsPage | DataTable | 서버 | 클라 | tab | Primary/Supply/Service | `{data.data}`+KPI |
| 공급상품 승인 | neture·admin | `/admin/product-approval` | AdminProductApprovalPage | custom cards | **없음** | 없음 | ✓ | status | **array-only** |
| 브랜드 | neture·operator | `/operator/brands` | BrandManagementPage | DataTable | **front-slice** | 클라 | ✓(debounce) | — | array-only |
| 회원 관리 | neture·admin | `/admin/members` | AdminMemberManagementPage | DataTable | 서버 | 클라(sortAccessor) | ✓(Enter) | status tabs | `{data.users,data.pagination}` |
| 가입신청 | glyco·operator | `/operator/applications` | ApplicationsPage | DataTable | 서버 | 없음 | 없음 | status/type/org | **`{applications,pagination}`** |
| 약국 목록(legacy) | glyco·operator | `/operator/pharmacies` | PharmaciesPage | DataTable | 서버 | 클라 | ✓ | region/tier/status | `{pharmacies,pagination}` (backend **stub**) |
| 블로그/POP/QR/설문 | glyco·kcos·kpa·operator | `/operator/{blog,pop,qr,survey}` | Operator{X}ListPage | DataTable(+useBatchAction) | 서버 | 없음 | 일부 | status | **`{data,meta.total}`** |
| 콘텐츠/포럼/강의 | kpa·다영역 | `/contents`,`/forum`,`/instructor/courses` | {X}ListPage | DataTable | 서버 | 없음 | ✓ | category/status | `{data,pagination}` |
| 공급자 상품/주문 | neture·supplier | `/account/products`,`/account/orders` | Supplier{X}ListPage | **custom `<table>`** | **front-slice** | 없음 | ✓ | category/date | array-only |
| 모집 노출 승인 | 3서비스·operator | `/operator/recruitment-exposure` | RecruitmentExposureApprovalPage→**RecruitmentExposureConsole** | 공통(신규) | 없음(소량) | 없음 | 없음 | (serviceKey 고정) | `{data}` |

## 5. 페이지네이션 현황

- **서버 페이지네이션(다수·양호)**: `page`(1-base)/`limit`(보통 20) 쿼리 → 응답에서 total/totalPages. operator stores/members, applications, blog/pop/qr/survey, contents/forum/courses.
- **front-slice(비표준)**: BrandManagementPage, Supplier products/orders 등 — 전체 fetch 후 `.slice()`. 데이터 증가 시 위험.
- **없음**: AdminProductApprovalPage, 소량 승인/콘솔.
- **UI**: `Pagination` 컴포넌트 존재하나 **다수 화면이 자체 prev/next JSX**(operator-core-ui contact-inquiry/cms-content 도 자체 JSX). → 표준 수렴 여지 큼.

## 6. 정렬 현황 (핵심 gap)

- **서버 정렬**은 사실상 **OperatorStoresList(operator stores)** 정도(`sortBy/sortOrder`).
- 대다수는 `DataTable` 의 `sortable:true` + `sortAccessor` → **현재 페이지 데이터 내 클라이언트 정렬**. 서버 페이지네이션과 결합 시 **전체 데이터 기준 정렬이 아님**(MUI X/AG Grid 경고 케이스와 동일). 사용자에겐 "정렬됨"처럼 보이나 page 경계에서 부정확.
- **없음**: 승인/필터 중심 화면 다수.
- → 표준: 운영성 목록은 **서버 정렬**로 수렴, 정렬 가능 컬럼은 opt-in(생성일/이름/승인일/금액).

## 7. 검색/필터 현황

- 검색: 자체 input(debounce 또는 Enter) — 공통 `SearchBar` **거의 미사용**. 파라미터명 대체로 `search`.
- 필터: `status`(tabs/dropdown) 광범위, `serviceKey`(operator stores 등 고정/선택), `category`, `dateFrom/dateTo`(supplier orders, 일부 승인 분석). page=1 reset 은 **일부만** 적용.

## 8. API 응답 shape 현황 (비표준 — 최대 gap)

4종 혼재:
1. `{ data, pagination: { page, limit, total, totalPages } }` — operator stores, contact-inquiry, contents 다수 (**표준 근접**).
2. `{ data, meta: { total } }` — blog/pop/qr/survey(operator). totalPages 클라 계산.
3. `{ <도메인명>, pagination }` — glyco applications(`{applications,pagination}`), pharmacies(`{pharmacies,pagination}`).
4. **array-only** — admin product-approval, brand, supplier products/orders.

> 표준 `{ success, data, pagination{page,limit,total,totalPages,hasNextPage,hasPreviousPage} }` 와 1번은 거의 정합, 2·3은 어댑터로 흡수 가능, 4는 backend 선행 필요. `OfferServiceApproval.listApprovals`(status/serviceKey/search/dateFrom/dateTo/page/limit)는 이미 표준 친화.

## 9. 공통 UI/Hook/Module 사용 현황

- list 모듈 export: `DataTable, Pagination, SearchBar, EditableDataTable, useBatchAction` + `ListColumnDef/PaginatedResponse` 타입 + `action-policy(defineActionPolicy/buildRowActions)` + `delete-policy`.
- member-list 모듈: `MemberListLayout, StatusBadge, RoleBadge, ServiceBadge`(OperatorMembersConsolePage 한정).
- operator-core-ui: **OperatorStoresList / OperatorMembersConsolePage**(상위 화면 wrapper, 서버 page/limit/sort 내장).
- 채택 편차: **DataTable 높음(28+) · Pagination 컴포넌트 낮음 · SearchBar 사실상 0 · useBatchAction 신규 화면 위주(4+)**. **상태 계층(query/url/normalize) 공통 hook 부재**가 핵심 공백.

## 10. 대표 문제 유형

- **P1 응답 비표준(4종)** → 화면마다 파싱 분기. 표준 어댑터 필요.
- **P2 정렬 클라/페이지내** → 전체기준 부정확. 서버 정렬 수렴.
- **P3 페이지네이션 UI 중복 구현** → Pagination 컴포넌트 미수렴.
- **P4 URL query sync / page=1 reset 비표준** → 새로고침·딥링크·필터변경 UX 불일치.
- **P5 front-slice 잔존** → 데이터 증가 회귀 위험(brand, supplier).
- **P6 SearchBar/Toolbar 분산** → 검색·필터 배치 제각각.

## 11. /operator/stores 첫 적용 적합성

**적합(권장).** 근거: 이미 **OperatorStoresList 공통 컴포넌트** + 서버 `page/limit/sortBy/sortOrder/search/serviceKey` + 표준근접 응답(`{data,pagination{page,limit,total,totalPages}}`). 즉 backend 추가 없이 **상태 계층(useStandardListQuery) + URL sync + page=1 reset 표준만 입히면** 표준 레퍼런스로 전환 가능 → 회귀 위험 낮음, 4앱 공통이라 파급 큼.

## 12. 1차 적용 후보 Top 5

| 순위 | 화면 | 이유 | 표준화 적합도 |
|---|---|---|---|
| 1 | **`/operator/stores`** | 공통 wrapper + 서버 page/sort/search 완비, 4앱 공통 | **즉시(adapter 경미)** |
| 2 | `/operator/members` | 공통 wrapper, 서버 페이지네이션 | 즉시(정렬 서버화 검토) |
| 3 | `/operator/recruitment-exposure` | 신규·소형, 공통 console 이미 보유 | adapter(서버 페이지네이션 추가 시) |
| 4 | operator `/operator/applications`(승인 큐 계열) | 서버 페이지네이션, 응답만 어댑터(`{applications,..}`) | adapter |
| 5 | `/admin/product-approval` | 거버넌스 가시성, 단 array-only | **backend 선행** |

## 13. STANDARD-LIST-CORE WO 선행 요구사항

신규로 만들 것(컴포넌트 중복 금지 — 기존 DataTable/Pagination 재사용):
1. **`useStandardListQuery`** — `StandardListState`(page/limit/search/sortBy/sortOrder/filters) + URL query sync + **page=1 reset 규칙**(검색/필터/정렬/limit 변경) + fetch 트리거.
2. **`normalizePaginatedResponse`** — 4종 응답 → `{ data, pagination{page,limit,total,totalPages,hasNext,hasPrev} }` 흡수 어댑터.
3. **`StandardListToolbar`** — 검색 + status/serviceKey/category/date 필터 슬롯 표준화(기존 SearchBar 흡수).
4. 표준 계약 타입(`StandardListState`/표준 응답) 을 operator-ux-core 에 수렴 export.
> DataTable·Pagination·EmptyState·Skeleton 은 **기존 자산 재사용**(신규 X). 서버 정렬 onSortChange 배선만 표준화.

## 14. V1 적용 범위 / V2 보류

- **V1**: useStandardListQuery + normalizePaginatedResponse + StandardListToolbar / 서버 페이지네이션·서버 정렬(opt-in)·검색·status·serviceKey·date 필터 / URL sync·page=1 reset / `/operator/stores` 레퍼런스 적용.
- **V2 보류**: Saved views·탭형 view / 컬럼 DnD·resize·표시토글 / export / 무거운 DataGrid / 다중정렬 / array-only endpoint 의 서버 페이지네이션화(개별 backend WO).

## 15. 결론

내부 리스트는 **표시 컴포넌트(DataTable)는 수렴됐지만 운영 상태 계층(query·url·정렬·응답정규화)은 분산**돼 있다. 따라서 STANDARD-LIST-CORE 는 **새 테이블을 만드는 것이 아니라 `useStandardListQuery`+`normalizePaginatedResponse`+`StandardListToolbar` 상태/계약 계층을 표준화**하고, **`/operator/stores`(즉시 적합)** 를 첫 레퍼런스로 적용하는 순서가 안전하다.

**다음 순서:** ① (본 IR) 내부 감사 ✅ → ② `WO-O4O-STANDARD-LIST-CORE-V1`(상태/계약 계층) → ③ `WO-O4O-OPERATOR-STORES-STANDARD-LIST-ADOPTION-V1`.

---

*Date: 2026-06-17 · read-only 내부 감사(코드 변경 0). 확정: 내부 분산도(컴포넌트 수렴/상태 분산), CORE 선행=useStandardListQuery+normalize+Toolbar(기존 DataTable/Pagination 재사용), 첫 적용=/operator/stores. 다른 세션 platform-users WIP 미접촉.*
