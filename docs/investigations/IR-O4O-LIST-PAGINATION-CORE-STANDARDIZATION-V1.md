# IR-O4O-LIST-PAGINATION-CORE-STANDARDIZATION-V1

> **성격**: Investigation Report 전용. **코드 무변경**. O4O 전반의 list / pagination / table 관련 **core 구조**를 상세 조사하여, 후속 core 정비 WO의 안전한 범위·canonical 후보·additive 이행 가능성·이행 순서를 확정한다.
> **선행**: `IR-O4O-STANDARD-TABLE-PAGINATION-RESPONSIVE-COVERAGE-V1`(화면별 coverage 조사). 본 IR은 그 후속 **core 전용 상세 조사**.
> **작성일**: 2026-06-12
> **결과: 조사 완료 — backend canonical response 후보 확정 가능 / frontend normalizer·list state hook additive 도입 가능 / DataTable 2종은 즉시 통합 비권장, interface 정렬 권장. 코드 수정 없음.**

---

## 1. Summary

### 조사 범위
- **Backend**: `apps/api-server` — pagination response shape, 공통 helper(`BaseController.okPaginated`), query parsing, max limit guard, shared DTO.
- **Frontend list state**: 4서비스 + operator-ux-core / operator-core-ui / store-ui-core / account-ui / types / shared — pagination state 패턴, response normalization, page reset, API client.
- **Table UI core**: ag-components `DataTable` ↔ operator-ux-core `DataTable` 2종 병존, BaseTable 관계, Pagination 계열, RowActionMenu overlay, Search/Filter/ActionBar/Drawer responsive, column type.

### 핵심 발견 (3줄)
1. **Backend canonical response 후보 확정 가능** — `{success, data:T[], pagination:{page,limit,total,totalPages,hasNextPage?,hasPreviousPage?}}`. 대다수 endpoint가 이미 page-based이고 `BaseController.okPaginated`(30+ 컨트롤러 사용)와 Signage `meta` 패턴을 병합하면 됨. **단, response shape가 실제 5종 혼재**(중복형 Forum / meta형 / pagination형 / items형 / total만형)이고 `totalPages` vs `pages` 등 필드명 불일치, limit guard 미적용 endpoint 존재.
2. **Frontend는 화면별 inline pagination state + 화면별 독자 response 추출이 반복**(공통 hook은 `useStoresQuery` 1건, `usePagination`은 admin-dashboard 전용으로 서비스 미사용). **순수 함수 normalizer + opt-in hook으로 additive(기존 화면 무변경) 도입 가능** — 회귀 위험 낮음. 단 API client가 서비스별 상이(KPA/GP fetch wrapper vs KCos/Neture authClient axios), React Query 미사용.
3. **Table UI core는 DataTable 2종이 서로 다른 도메인에서 정착**(ag DataTable 18+ 파일 / operator-ux-core DataTable 50+ 파일, 둘 다 BaseTable→O4OColumn 기반이나 column type·pagination 모델·selection API 상이). **즉시 통합은 68개 파일 breaking → 비권장. interface 정렬(ListColumnDef를 canonical로) 우선이 안전.** RowActionMenu는 이미 `fixed` positioning이라 overflow에 갇히지 않음(선행 IR의 "갇힘" 가설은 정정 필요) — 다만 z-index 경쟁·우측 edge clamp는 개선 여지.

### core 정비 필요 여부
**필요.** 단, "DataTable 통합" 같은 고위험 작업은 본 IR 결론상 **즉시 착수 금지**. 안전 순서: backend canonical을 **additive(dual response)** 로 추가 → frontend **normalizer/타입**(순수, 무위험) → primitive responsive 보강 → 그 다음에야 화면 계층·DataTable interface 정렬.

### 가장 큰 회귀 위험
- **Backend**: Forum Posts 중복 response(동일 endpoint에 top-level + `pagination` + `totalCount` 동시) 정리 시 기존 client 의존 깨질 위험. AdminApproval `requests`/`pages` 필드명, `{data:{items,...}}` nested형은 canonical `data:T[]`와 충돌.
- **Frontend/UI**: DataTable column type 변경(`Column` vs `ListColumnDef`)은 68개 파일 영향 — 가장 큰 breaking risk. 본 IR은 이를 **단계적 adapter로 흡수, 즉시 통합 금지** 권고.

### 권장 후속 WO (§8)
타입/normalizer → backend additive canonical → primitive responsive → (그 다음) 화면 계층. DataTable 통합은 별도 IR/단계로 분리.

---

## 2. Prior IR Linkage

### `IR-O4O-STANDARD-TABLE-PAGINATION-RESPONSIVE-COVERAGE-V1` 요약
- 화면 단위 coverage: operator/admin은 표준 DataTable+server pagination 양호. **"전체 로딩 후 client filter/slice"** 가 핵심 업무 화면에 잔존(Neture 상품승인/브랜드/운영자 등 P0). Store 영역 비표준(CSSinJS/inline) responsive 취약. backend shape 5종 혼재.

### 본 IR에서 더 상세히 본 영역 (화면 → core)
- 선행 IR이 "어느 화면이 미흡한가"였다면, 본 IR은 **"그 미흡을 고치기 위해 어떤 core를 canonical로 두고, 기존을 안 깨고 어떻게 흡수하는가"** 를 본다.
- **정정 사항**: 선행 IR §3/§6.6의 "RowActionMenu 드롭다운이 overflow-x-auto 컨테이너에 갇힘" → 본 IR 코드 확인 결과 RowActionMenu는 `position: fixed` + viewport 기준 좌표 계산이라 **overflow에 갇히지 않음**. 실제 이슈는 ① z-index 경쟁(drawer/modal) ② 매우 우측 trigger의 좌표 clamp 품질 ③ 모바일 bottom-sheet 미지원. → primitive 보강 항목 재정의(§5.3).

---

## 3. Backend Pagination Core

### 3.1 Current Response Shapes (5종 혼재)

| Shape | 대표 endpoint | 정확한 필드 | Compatibility Risk | Notes |
|---|---|---|---|---|
| **S1 pagination형** | Checkout(KPA/GP), Cosmetics Members, Channel logs(offset) | `{success, data:T[], pagination:{page,limit,total,totalPages}}` | 낮음 | **canonical 후보**. 다수 채택 |
| **S2 meta형** | Signage Playlists, Neture Products | `{data:T[], meta:{page,limit,total,totalPages,hasNext,hasPrev}}` | 낮음 | 필드 완비(hasNext/Prev 포함). 이름만 `meta`→`pagination` |
| **S3 중복형** | **Forum Posts** | `{success, data, total, page, limit, totalPages, pagination:{page,limit,totalPages}, totalCount}` | **높음** | top-level + nested + alias 동시. 최악 — 정리 필요 |
| **S4 items형** | KPA Members(raw SQL), Cosmetics Members(`data.items`), Neture Partners(`partners`) | `{data:{items:T[],total,page,limit}}` 또는 `{partners,total}` | 중간~높음 | `data:T[]` canonical과 충돌. page 정보 누락 가능 |
| **S5 minimal형** | Signage Media | `{data:T[], total}` (page/limit/totalPages 없음) | 중간 | 클라이언트가 totalPages 직접 계산 |
| **S6 필드명 변종** | Admin Approvals | `{requests:T[], pagination:{page,limit,total,pages}}` | 높음 | `requests`(≠data), `pages`(≠totalPages) |

### 3.2 Existing Helpers

| Helper | 파일 | 시그니처 | 사용 | limit guard |
|---|---|---|---|---|
| **BaseController.okPaginated** | `apps/api-server/src/common/base.controller.ts` | `okPaginated<T>(res, data:T[], pagination:{page,limit,total,totalPages})` | **30+ 컨트롤러**(forum/lms/survey/point/ai/cms 등) | ❌ |
| **PaginatedResponse** (type) | `packages/types/src/common.ts` | `{data:T[], total, page, pageSize}` (`pageSize` 명칭) | 타입 참조만 | ❌ |
| **PaginatedApiResponse** (type) | `packages/types/src/api.ts` | `{success, data:T[], pagination:{page,limit,total,totalPages}, currentPage?, pageSize?, totalItems?}` | 낮음(legacy alias 포함) | ❌ |
| **Signage PaginatedResponse** | `apps/api-server/src/routes/signage/dto/index.ts` | `{data:T[], meta:PaginationMeta}` (page,limit,total,totalPages,hasNext,hasPrev) | signage 내부만 | ❌ |

> **핵심**: helper가 있어도 **강제되지 않음**. okPaginated 호출 컨트롤러와 직접 `res.json` 구성 컨트롤러가 혼재. 공통 `parsePagination`/`buildPaginationMeta` 유틸은 **부재**(각 endpoint가 직접 parseInt + Math.min).

### 3.3 Query Parsing Patterns

| 패턴 | 예시 | page base | limit guard | Notes |
|---|---|---|---|---|
| parseInt direct | Forum Posts | 1 | `Math.min(.||20, 50)` | 가장 흔함 |
| Number() coercion | GP Operator | 1 | `Math.min(.||10, ...)` | |
| 조건부 ternary | (일부 legacy) | 1 | 없음 | guard 미적용 |
| parseInt radix | Signage/KPA | 1 | `Math.min(.,20~100)` | |
| offset-based | AI Admin, Channel logs | N/A | `Math.min(., 1000/200)` | 소수(~10 endpoint) |

- **limit guard 100 적용**: store/product/membership/supplier console, GP resources, KPA qualification 등 다수.
- **guard 미적용/상이**: ForumComment(없음), ForumModeration(없음), 일부 legacy, offset계열(1000/200 cap).
- **offset 기반**: AI Admin, Channel playback logs, 일부 content assets — page 변환은 `page = floor(offset/limit)+1` 로 가능하나 일부는 의도적 offset.

### 3.4 Backend Standardization Options

- **canonical 후보(확정 가능)**: `{success:true, data:T[], pagination:{page,limit,total,totalPages,hasNextPage,hasPreviousPage}}`. S1(다수)+S2(필드 완비) 병합. hasNext/Prev는 Signage가 이미 사용.
- **additive(dual response) 가능**: S1/S2/S5/Signage 계열은 기존 필드 유지 + `pagination` 추가로 **무손실 흡수 가능**(Risk 낮음). **S3(Forum 중복)·S4(items)·S6(requests/pages)** 는 필드명/구조 충돌로 **adapter 또는 신중한 dual** 필요(Risk 높음 — 별도 처리).
- **공통 helper 도입**: `parsePagination()`(page/offset 통합 + limit clamp) + `buildPaginationMeta()` + `respondPaginated()` 신규(`apps/api-server/src/common/pagination.helper.ts` 후보). **opt-in이라 기존 코드 무변경**, 신규/마이그레이션 endpoint부터 적용. 영향 파일은 점진(우선순위 기반).
- **cursor**: 현 단계 **불필요**(orders/members 모두 page-based로 충분). 향후 대량 시계열만 검토.

> **결론(backend)**: canonical 확정 가능. **additive dual response + opt-in helper** 가 안전 경로. S3/S4/S6는 즉시 건드리지 말고 별도 단계. max limit 100 강제는 helper 경유 시 자연 해결.

---

## 4. Frontend List Core

### 4.1 Pagination State Patterns

| 패턴 | 대표 화면 | page state | limit state | reset | 빈도 |
|---|---|---|---|---|---|
| currentPage + 상수 | GP/KCos `OrdersPage` | `currentPage`(useState(1)) | `ITEMS_PER_PAGE=20` | 필터 onChange서 수동 `setCurrentPage(1)` | 매우 높음 |
| page + 상수 | `OperatorBlogListPage`(다수 서비스) | `page` | `PAGE_LIMIT=20` | useCallback 의존성 자동 | 높음 |
| pagination object | Neture `OrdersManagementPage`, GP `ProductsPage` | `currentPage` | `limit`(객체 내) | 수동 reset | 중간 |
| 공통 hook | `useStoresQuery`(operator-core-ui) | props page | props pageSize | 호출처 관리 | 낮음(유일 공통화) |

**명칭 혼재**: `page` vs `currentPage` / `limit` vs `PAGE_LIMIT` vs `pageSize` vs `perPage` / `total` vs `totalItems` vs `totalOrders`.

### 4.2 Response Normalization Needs

| backend shape | 받는 화면 | 현재 추출(요약) | 정규화 필요 | Risk |
|---|---|---|---|---|
| `data.pagination.total` | GP `OrdersPage` | `response.data.pagination?.total` 직접 | ✅ | shape 변경 시 전파 |
| `data.pagination`(nested data) | KCos `OrdersPage` | `body.data.pagination?.total` | ✅ | wrapper 로직 상이 |
| top-level `pagination` | GP `ProductsPage` | `data.pagination.total` | ✅ | nesting 위치 차이 |
| `meta` | GP `operatorBlog.ts` | `res.meta.total` | ✅ | 필드명 `meta`(비표준) |

- **기존 정규화 유틸**: API list 응답용 **없음**(`ai-core/response-normalizer`는 AI 전용, 무관).
- **타입**: `packages/types/src/api.ts`의 `PaginatedApiResponse<T>` **정의만 있고 실사용 거의 없음**. `common.ts`엔 `pageSize` 명칭의 중복 정의.

### 4.3 Proposed Frontend Types (후보)
- `PaginationState {page, limit}`, `PaginationMeta {page,limit,total,totalPages,hasNextPage?,hasPreviousPage?}`, `PaginatedListResult<T> {items:T[], meta}`, `PageSizeOption = 20|50|100`. → `packages/types`(0 의존)에 확정.

### 4.4 Proposed Utilities (후보)

| Utility | 목적 | 패키지 후보 | Risk |
|---|---|---|---|
| `normalizePaginatedResponse()` | 5종 shape → 단일 meta | `packages/types` 인접 util 또는 `packages/shared` | 낮음(순수 함수) |
| `usePaginatedListState()` | page/limit/reset 캡슐화 | `packages/operator-ux-core/list` | 중간(opt-in) |
| `buildPaginationQuery()` / `clampPageSize()` / `getTotalPages()` | query 빌드/검증 | shared util | 낮음 |
| `resetPageOnFilterChange()` | 필터변경 page=1 | hook 내부 | 낮음 |

- **page reset 공통화 가능**: hook이 filter/search setter를 래핑해 자동 page=1.
- **URL query 보존(useSearchParams)**: 현재 **0 사용**. 필요 없음 → opt-in으로만.
- **API client**: KPA/GP는 fetch wrapper, KCos/Neture는 `authClient.api`(axios). **React Query 미사용**. → normalizer/hook은 client 무관하게 설계(응답 객체만 받음). client 통일은 **본 트랙 범위 밖**(별도 WO).
- **package boundary**: 타입/normalizer는 `packages/types`(+ shared util), hook은 `packages/operator-ux-core/list`(UI 인접). 의존 방향 Core→…→Service 준수. service-specific adapter(예: GP `operatorBlog.ts`)는 서비스에 잔류, common adapter는 패키지.

> **결론(frontend)**: normalizer/타입은 **순수·opt-in → 기존 화면 무변경 additive 가능, 회귀 위험 낮음**. hook은 신규/시범 화면부터. 가장 큰 위험은 본 트랙이 아니라 **API client 통일**(별도 WO로 격리).

---

## 5. Table UI Core

### 5.1 DataTable Variants

| 항목 | ag-components `DataTable` | operator-ux-core `DataTable` |
|---|---|---|
| 파일 | `packages/ui/src/ag-components/DataTable.tsx` | `packages/operator-ux-core/src/list/DataTable.tsx` |
| 기반 | BaseTable→O4OColumn | BaseTable→O4OColumn |
| column type | `Column<T>`(title/dataIndex/sorter) | `ListColumnDef<T>`(header/accessor/sortAccessor) |
| pagination | **내장형** prop `{current,pageSize,total,onChange}` | **외부 조합형**(별도 `Pagination`) |
| selection | `selectedRowKeys:string[]` | `selectedKeys:Set<string>` |
| expandable | 지원 | **미지원** |
| 부가 | onRowClick/emptyText | tableId/reorderable/persistState/columnVisibility |
| 사용처 | **18+ 파일**(주로 KPA pharmacy/B2C, Neture supplier library) | **50+ 파일**(operator/admin 표준) |

- 둘 다 BaseTable이 공통 엔진(O4OColumn으로 변환). **canonical 후보: operator-ux-core `ListColumnDef` 라인**(사용처·기능 우위).
- **즉시 통합 비권장**: column type(`Column`↔`ListColumnDef`)·pagination 모델·selection(Array↔Set)·expandable 차이로 **68개 파일 breaking**. → **interface 정렬(adapter)** 우선.

### 5.2 Pagination Components

| Component | 파일 | props | 모바일 | 추천 |
|---|---|---|---|---|
| Pagination(ux-core) | `operator-ux-core/src/list/Pagination.tsx` | page/totalPages/onPageChange/total? | flex-wrap만 | ⭐ operator 표준 |
| HubPagination | `shared-space-ui/HubPagination.tsx` | currentPage/totalPages/align/bordered/accentColor/showFirstLast | 옵션 다양 | ⭐ HUB 표준 |
| ContentPagination | `ui/content-discovery/ContentPagination.tsx` | currentPage/totalPages/size/showItemRange | size='sm' | 콘텐츠 특화 |
| AG 내부 pagination | ag DataTable 내장 | {current,pageSize,total,onChange} | 고정 UI | △ 제거 권장 |

- **표준 모델 권장: 외부 Pagination 조합형**(pageSize 변경·정렬 유연). ag DataTable 내장 pagination은 점진 제거.

### 5.3 RowActionMenu / Overlay Risk (선행 IR 정정)
- 코드(`packages/ui/src/components/table/RowActionMenu.tsx`): `openMenu`가 `getBoundingClientRect()`로 좌표 계산 후 **`position: fixed z-[9999]`** 로 렌더. → **overflow-x-auto에 갇히지 않음**(선행 IR 가설 정정).
- 실제 리스크: ① **z-index 경쟁**(drawer/modal과) ② 매우 우측 trigger에서 `rawLeft = rect.right - 192`가 음수→clamp 품질 ③ **모바일 bottom-sheet 미지원**.
- **Portal feasibility**: z-index 경쟁 해소엔 유효하나 **CSS 상속 끊김(color/font)**·DevTools 위치 변화의 breaking 가능. → **즉시 Portal 비권장**. 단기엔 좌표 clamp 개선 + z-index 토큰화, Portal은 opt-in prop(`usePortal?`)으로 후속.

### 5.4 Search/Filter/ActionBar/Drawer Responsive

| Component | 파일 | 현재 | risk | 추천 |
|---|---|---|---|---|
| SearchBar | `operator-ux-core/src/list/SearchBar.tsx` | `max-w-md` 고정 | 부모 좁을 때 overflow | `md:max-w-md`(모바일 100%) |
| FilterBar | `ui/.../FilterBar.tsx` | `flex flex-wrap`+min-w | 양호 | sm gap 조정(선택) |
| ActionBar | `ui/.../ActionBar.tsx` | 고정 gap-3/px-4 | sm에서 버튼 wrap | sm flex-col/gap 축소 |
| BaseDetailDrawer | `ui/.../BaseDetailDrawer.tsx` | width 480 + maxWidth 100vw | 모바일 OK / **error 상태 prop 없음** | error/errorMessage prop 추가 |

### 5.5 Column Type 통일
- 종류 4: `O4OColumn`(BaseTable 표준), `ListColumnDef`(ux-core), `Column`(ag), `AGTableColumn`(AGTable, 사용 희소).
- 호환: ListColumnDef→O4OColumn ~95%, Column→O4OColumn ~70%, AGTableColumn ~80%.
- **통일 방향**: `O4OColumn` 단일 내부 모델 유지, **공개 API는 `ListColumnDef` canonical화**. ag `Column`은 deprecated 후 점진 전환. AGTableColumn은 사용 희소 → deprecate 검토.

> **결론(table UI)**: ① **DataTable 통합 즉시 착수 금지 → interface 정렬(ListColumnDef canonical + adapter)** ② pagination 외부 조합형 표준 ③ primitive responsive 보강은 **저위험 → core WO 포함 가능** ④ 최대 breaking risk = column type 변경(68파일, adapter로 흡수).

---

## 6. Package Boundary Recommendation

| Concern | 권장 패키지 | 이유 |
|---|---|---|
| pagination types (`PaginationState/Meta/PaginatedListResult/PageSizeOption`) | `packages/types` | 0 의존, 모든 계층 공유 |
| pagination constants (`DEFAULT_PAGE_SIZE=20/LARGE=50/MAX=100/OPTIONS`) | `packages/types` 또는 shared const | 단일 출처 |
| `normalizePaginatedResponse()` / 빌더·clamp util | `packages/shared`(또는 types 인접 util) | 순수 함수, types만 의존 |
| `usePaginatedListState()` hook | `packages/operator-ux-core/list` | List UI 인접, error/ui 의존 허용 |
| DataTable props / ListColumnDef canonical | `packages/operator-ux-core/list` + 내부 `O4OColumn`(ui) | 사용처 우위 |
| responsive primitive(SearchBar/Filter/Action/Drawer/RowActionMenu) | `packages/ui` + `operator-ux-core` | 정의 위치 유지 |
| backend `pagination.helper.ts` | `apps/api-server/src/common` | 서버 전용 |

---

## 7. Migration Strategy

### 7.1 Additive First
- 기존 response shape **제거 금지**. canonical `pagination` 필드를 **추가**(dual response)하고, frontend **normalizer가 5종을 단일 meta로 흡수** → 화면은 normalizer 출력만 의존.
- 서비스 화면은 후속 WO에서 **신규/시범부터 hook 적용**, 기존은 잔류 허용.

### 7.2 Compatibility Guard
- typecheck: 4 web + 관련 패키지. smoke: 각 서비스 대표 리스트 1~2개.
- 회귀 위험원: ① backend S3/S4/S6 정리(필드명/구조) ② API client 서비스별 상이 ③ DataTable column type.
- deploy 순서: backend additive(무손실) → FE 타입/normalizer → primitive → 화면. **S3/S4/S6와 DataTable 통합은 분리·후순위**.

### 7.3 Deprecation Plan
- deprecated shape(중복 Forum / `pages` / `requests` / `data.items`)는 **표시만**하고 일정 기간 유지. 신규 endpoint/화면은 canonical만. ag `Column`/AGTableColumn deprecated 표기 후 점진.

---

## 8. Recommended Follow-up WOs

> 안전 순서. **저위험·무변경(타입/normalizer/additive)** 을 앞에, **고위험(DataTable 통합/client 통일)** 을 뒤·별도로.

1. **WO-O4O-PAGINATION-CORE-TYPES-AND-NORMALIZERS-V1** — `packages/types` pagination 타입·상수 확정 + `normalizePaginatedResponse()`(순수). **기존 무변경, 최우선**.
2. **WO-O4O-BACKEND-PAGINATION-CANONICAL-ADDITIVE-V1** — `pagination.helper.ts`(parse/build/respond, limit 100 clamp) + **dual response additive**(S1/S2/S5/Signage 우선). S3/S4/S6는 제외(별도).
3. **WO-O4O-TABLE-PRIMITIVE-RESPONSIVE-HARDENING-V1** — SearchBar width / ActionBar 모바일 stack / RowActionMenu 좌표 clamp·z-index 토큰화 / BaseDetailDrawer error prop. (Portal·DataTable 통합 제외)
4. **WO-O4O-LIST-STATE-HOOK-ADOPTION-V1** — `usePaginatedListState()` + 시범 화면(Blog/QR/POP 계열) opt-in 적용.
5. **WO-O4O-OPERATOR-ADMIN-LIST-PAGINATION-V1** — Neture 상품승인/브랜드/운영자 등 P0 전체로드 → server pagination(normalizer/hook 위에서).
6. **WO-O4O-STORE-LIST-RESPONSIVE-PAGINATION-V1** / **WO-O4O-SUPPLIER-LIST-PAGINATION-V1** — 매장/공급자 계층.
7. **(별도 IR 권장) IR-O4O-DATATABLE-VARIANT-CONSOLIDATION-V1** — ag DataTable ↔ operator-ux-core DataTable interface 정렬/통합 결정. **column type·selection·expandable·pagination 모델 정합** 설계. 본 IR 결론: **즉시 통합 금지, 별도 상세 IR 후 단계적**.
8. **(별도 WO 격리) WO-O4O-FRONTEND-API-CLIENT-UNIFICATION-V1** — KPA/GP fetch ↔ KCos/Neture axios 통일(+React Query 검토). **본 트랙과 분리**.

---

## 9. Final Recommendation

### 바로 수정 가능한 core (저위험)
- pagination **타입/상수/normalizer**(packages/types + shared, 순수·opt-in) → WO #1.
- backend **additive dual response + helper**(S1/S2/S5/Signage) → WO #2.
- **primitive responsive 보강**(SearchBar/ActionBar/RowActionMenu clamp/Drawer error) → WO #3.

### 추가 IR이 필요한 core
- **DataTable 2종 통합**: column type·selection·expandable·pagination 모델 차이 + 68파일 영향 → **IR-O4O-DATATABLE-VARIANT-CONSOLIDATION-V1** 선행. 본 IR에서는 "통합 즉시 착수 금지, interface 정렬 방향" 까지만 확정.

### 보류해야 할 통합 / 우선 구현하면 안 되는 위험 작업
- **DataTable 즉시 통합** — 보류(별도 IR).
- **RowActionMenu 즉시 Portal 전환** — 보류(CSS 상속 breaking, opt-in 후속).
- **Forum S3 중복/Admin S6 `requests,pages`/`data.items` S4 즉시 제거** — 보류(client 의존, additive 후 deprecation).
- **frontend API client 통일** — 본 트랙과 분리(별도 WO).

### 확정 가능한 canonical
- **Backend response**: `{success, data:T[], pagination:{page,limit,total,totalPages,hasNextPage?,hasPreviousPage?}}`.
- **Frontend type**: `PaginationMeta{page,limit,total,totalPages,hasNextPage?,hasPreviousPage?}` + `PageSizeOption=20|50|100`, `DEFAULT_PAGE_SIZE=20/MAX=100`.
- **Column 공개 API**: `ListColumnDef`(내부 `O4OColumn` 유지).
- **Pagination 모델**: 외부 조합형(operator-ux-core `Pagination` / HUB는 `HubPagination`).

---

*Date: 2026-06-12 · IR-O4O-LIST-PAGINATION-CORE-STANDARDIZATION-V1 · backend pagination helper/shape/parsing + frontend list state/normalization + table UI core(DataTable 2종·primitive) 상세 조사. 코드 무변경. backend canonical 후보 확정 / additive 이행 가능 / DataTable 즉시통합 비권장(별도 IR). 후속 WO 8건 분리안 — 저위험(타입·normalizer·additive·primitive) 선행, 고위험(DataTable 통합·client 통일) 격리.*
