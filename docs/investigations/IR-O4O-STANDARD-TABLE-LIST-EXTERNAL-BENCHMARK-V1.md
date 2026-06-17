# IR-O4O-STANDARD-TABLE-LIST-EXTERNAL-BENCHMARK-V1

> **유형:** 외부 디자인 시스템/SaaS 콘솔 벤치마크 + O4O 표준 리스트 운영 환경 방향 제안. **read-only 조사 — 코드/패키지/스키마/라이브러리 도입 변경 0.**
> **결론(요약): O4O 는 "표준 테이블 컴포넌트"가 아니라 "표준 리스트 운영 환경"(검색+필터+정렬+페이지네이션+선택/일괄작업+URL query+서버 연동)으로 설계한다. V1 은 무거운 grid(AG Grid/MUI X) 도입 없이 `StandardListToolbar` + `StandardDataTable` + `StandardPagination` + `useStandardListQuery` 4 레이어를 표준화하고, 운영성 목록은 서버 페이지네이션/정렬/필터를 기본으로 한다. 첫 적용 = `/operator/stores`.**
> Date: 2026-06-16

---

## 1. 조사 동기

O4O 운영자/공급자/매장 화면(`/operator/stores`, `/operator/suppliers`, `/operator/content`, `/supplier/recruitments`, `/store/commerce/products` 등)은 항목 수가 계속 증가한다. 외부 플랫폼은 테이블을 "데이터 표시"가 아니라 "데이터 조작 UI(리스트 운영 패턴)"로 본다. O4O 표준을 그 기준으로 재정의한다.

## 2. 외부 벤치마크 요약

| 플랫폼 | 핵심 패턴 | O4O 시사점 |
|--------|-----------|-----------|
| Material Design | 테이블에 체크박스/정렬/경고/페이지네이션/필터칩 포함 — "데이터 조작 UI" | 테이블=조작 UI 전제 |
| IBM Carbon | Data Table(정렬·행확장·단일/일괄 액션) + Pagination **별도 컴포넌트** | `StandardDataTable` + `StandardPagination` 분리 |
| **Shopify Polaris** (가장 근접) | **Index Table**(검색·필터·정렬·선택·bulk) + **Index Filters**(+ **saved views**) — UI만 제공, **데이터 로직은 앱이 구현** | 운영자 목록 = Index Table 패턴. UI/fetch 로직 분리 |
| Atlassian Dynamic Table | 정렬·페이지네이션·로딩·DnD 상태 **컴포넌트가 기본 관리** | 화면별 상태 직접 구현 금지 → 공통 컴포넌트가 정렬/페이지/로딩/빈상태 규칙 관리 |
| MUI X Data Grid | 서버 페이지네이션 시 **서버 필터/정렬도 함께** 해야 전체기준 동작 | 운영 데이터는 서버 기준 |
| AG Grid SSRM | 정렬을 서버가 수행, 정렬 시 서버 재요청 | 동상 |
| PrimeReact Lazy | 전체 로딩 없이 page/sort/filter 발생 시 조각 fetch | 동상 |
| TanStack Table | client/server pagination·sorting 둘 다, **UI와 상태 모델 분리** | `useStandardListQuery`로 fetch 상태 분리, 내부 구현 교체 가능하게 |
| GOV.UK | 필터/정렬은 **전체 결과 기준** 재계산 + **첫 페이지로 reset** | 검색/필터/정렬 변경 시 page=1 reset |
| Salesforce/ONS | 단일 컬럼 정렬, `aria-sort` 접근성 | 정렬 헤더 접근성 기본 |

**공통 결론:** ① 테이블 = 리스트 운영 패턴, ② 페이지네이션은 별도 컴포넌트, ③ 운영 데이터는 서버 페이지네이션/정렬/필터, ④ UI와 fetch 로직 분리, ⑤ 필터/검색/정렬 변경 시 page=1, ⑥ 정렬 헤더 접근성.

## 3. O4O 표준 방향 (결정)

### 3.1 4 레이어 표준 (V1)

```
StandardListToolbar   — 검색 / 상태·서비스·카테고리·기간 필터 / 주요 액션
StandardDataTable     — columns / rows / sort state / loading·error·empty / onSortChange (+ 선택 optional)
StandardPagination    — page / limit / total / totalPages / onPageChange / onLimitChange
useStandardListQuery  — URL query sync / fetch trigger / search·filter·sort·page 상태 / pagination 응답 normalize
```
보조: `StandardEmptyState`, `StandardTableSkeleton`, `normalizePaginatedResponse`.

### 3.2 데이터 처리 원칙

```
작은 임시 목록      → 클라이언트 정렬 허용
운영성 데이터 목록   → 서버 페이지네이션 + 서버 정렬 + 서버 필터링 (기본)
```
대상(서버 기준): `/operator/stores`, `/operator/suppliers`, `/operator/content`, `/supplier/recruitments`, `/store/commerce/products` 등.

### 3.3 List State / API 계약

```ts
type StandardListState = {
  page: number; limit: number;
  search?: string;
  sortBy?: string; sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | string[] | undefined>;
};
```
Query: `?page=1&limit=20&search=&sortBy=createdAt&sortOrder=desc&status=PENDING&dateFrom=&dateTo=`

Response(표준):
```ts
{ success: true, data: T[],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }
```
> 참고: 기존 `OfferServiceApproval` 계열 operator 목록은 이미 `listApprovals({status,serviceKey,search,dateFrom,dateTo,page,limit})` 형태 → 본 표준과 정합. 신규 표준은 이를 일반화한다.

### 3.4 page reset 정책 (GOV.UK)

| 행동 | 동작 |
|------|------|
| 검색어/상태·기간 필터/정렬/limit 변경 | **page=1 reset** |
| 단순 페이지 이동 | 검색·필터·정렬 유지 |

### 3.5 정렬 opt-in (모든 컬럼 정렬 금지)

기본 정렬 대상만 허용: 생성일(기본)·이름/제목(기본)·승인일/검토일(승인화면 기본)·금액(주문/정산 기본). 제외: 설명/메모·액션·긴 본문. 접근성: 정렬 헤더 `aria-sort` + 키보드 Enter/Space.

### 3.6 반응형 / 일괄작업

데스크톱 table, 좁은 화면 horizontal scroll 우선. 선택/bulk action 은 **optional**(운영성 목록에서만).

## 4. 설계 판단

- **A. 무거운 grid 즉시 도입 안 함**: 1차 O4O `StandardDataTable` → 2차 내부 구현 TanStack Table 교체 가능하게 설계 → 3차 복잡 정산/통계만 별도 DataGrid 검토.
- **B. 서버 페이지네이션이 기본**: 프론트 slice 를 표준으로 삼지 않음.
- **C. 정렬 컬럼 제한**: §3.5.

## 5. 기존 O4O 자산과의 관계 (정합)

- `@o4o/operator-ux-core` 의 list 모듈(`./list/index`) + `DataTable`(operator-ux-core) 이미 존재 → 본 표준은 이들을 대체가 아니라 **표준 계약(State/Query/Response)으로 수렴**시키는 방향.
- 표준 테이블/폼 baseline 문서(`O4O-TABLE-STANDARD-BASELINE-V1`, `O4O-FORM-STANDARD-BASELINE-V1`, `OPERATOR-DATATABLE-POLICY-V1`, `O4O-OPERATOR-TABLE-CANONICAL-V1`) 와 충돌 여부는 내부 감사(후속 IR)에서 확인 필요 — 본 IR 은 외부 벤치마크 범위.

## 6. V1 범위 / V2 후보

**V1 채택:** 서버 페이지네이션·정렬·필터 / `search` 단일 파라미터 / `status·serviceKey·category·dateFrom·dateTo` 필터 / URL query sync / page=1 reset / `{success,data,pagination}` 응답 / Toolbar+Table+Pagination 3단 / aria-sort / horizontal scroll.
**V1 제외(V2 후보):** Saved views(Polaris) / 탭형 view / 컬럼 DnD·resize·표시토글 고도화 / export / 무거운 DataGrid / 복합 다중정렬.

## 7. 후속 작업 제안

1. **(본 IR)** `IR-O4O-STANDARD-TABLE-LIST-EXTERNAL-BENCHMARK-V1` — 외부 벤치마크 + 표준 방향(완료).
2. `IR-O4O-STANDARD-TABLE-LIST-PAGINATION-SORTING-AUDIT-V1` — **O4O 내부 화면 감사**(현재 페이지네이션/정렬/필터 구현 실태, baseline 문서 충돌, 적용 우선순위).
3. `WO-O4O-STANDARD-LIST-CORE-V1` — 4 레이어(`StandardListToolbar/DataTable/Pagination` + `useStandardListQuery`) 구현(operator-ux-core 수렴).
4. `WO-O4O-STANDARD-LIST-APPLY-OPERATOR-STORES-V1` — 첫 적용 `/operator/stores` → 공급자·콘텐츠·신청관리·내 매장 확산.

## 8. 제외 / 준수

코드/패키지/lock/스키마/migration 변경 0. 외부 라이브러리 도입 **결정 보류**(V1 자체 구현, 교체 가능 설계만). 본 IR 은 방향 고정용 기준 문서.

## 9. 결론

O4O 의 방향은 "단순 테이블 정비"가 아니라 **검색+필터+정렬+페이지네이션+상태관리+URL query+서버 연동을 묶은 표준 리스트 운영 환경**이다. V1 은 AG Grid 류 복잡 기능 대신 `StandardDataTable`/`StandardPagination`/`useStandardListQuery` 3종을 먼저 표준화하고, `/operator/stores` 를 첫 적용 대상으로 한다.

---

*Date: 2026-06-16 · read-only 외부 벤치마크 IR(코드 변경 0). 결정: 서버 페이지네이션/정렬/필터 기본 + 4 레이어 표준 + page=1 reset + 정렬 opt-in. V1=자체 StandardDataTable(교체가능 설계), 무거운 grid·saved views 보류. 후속: 내부 감사 IR → STANDARD-LIST-CORE WO → /operator/stores 적용.*
