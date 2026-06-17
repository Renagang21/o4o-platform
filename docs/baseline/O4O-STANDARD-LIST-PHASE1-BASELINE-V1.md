# O4O-STANDARD-LIST-PHASE1-BASELINE-V1

> **성격:** Baseline 문서화 (새 구현 아님). O4O 표준 테이블형 리스트 Phase 1 결과를 기준으로 고정한다.
> **일자:** 2026-06-17
> **판정:** **Phase 1 PASS — 종료 고정.**
> 향후 모든 리스트 정비는 본 baseline 의 **6 적용 유형** 중 하나로 먼저 분류한 뒤 WO 를 작성한다.

---

## 1. Status

- Phase 1: **PASS**
- Browser smoke: **PASS** (`SMOKE-O4O-STANDARD-LIST-PHASE1-REFERENCE-V1`, commit `080ec21f5`)

### 기준 커밋

| 항목 | commit |
|------|--------|
| Standard List Core | `62dc177f5` |
| Operator Stores adoption | `203353832` |
| DataTable onSort controlled sort | `ed962cc59` |
| Operator Members adoption | `fc0465b4a` |
| Recruitment Exposure adoption | `3c8f62b9b` |
| GP Operator Applications adoption | `280d757ab` |
| KCos Applications URL sync (minimal) | `40ed83132` |
| Admin Product Approval backend pagination | `3ff222bfe` |
| Admin Product Approval standard list adoption | `e59be827c` |
| Phase 1 smoke (PASS) | `080ec21f5` |

### 기준 문서

- `docs/investigations/IR-O4O-STANDARD-TABLE-LIST-EXTERNAL-BENCHMARK-V1.md`
- `docs/investigations/IR-O4O-STANDARD-TABLE-LIST-PAGINATION-SORTING-AUDIT-V1.md`
- `docs/investigations/IR-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-BACKEND-AUDIT-V1.md`
- `docs/checks/CHECK-O4O-STANDARD-LIST-CORE-V1.md`
- `docs/checks/CHECK-O4O-DATATABLE-ONSORT-CONTROLLED-SORT-V1.md`
- `docs/checks/CHECK-O4O-OPERATOR-STORES-STANDARD-LIST-ADOPTION-V1.md`
- `docs/checks/CHECK-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1.md`
- `docs/checks/CHECK-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1.md`
- `docs/checks/CHECK-O4O-OPERATOR-APPLICATIONS-STANDARD-LIST-ADOPTION-V1.md`
- `docs/checks/CHECK-O4O-KCOS-OPERATOR-APPLICATIONS-URL-SYNC-MINIMAL-V1.md`
- `docs/checks/CHECK-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1.md`
- `docs/checks/CHECK-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION-V1.md`
- `docs/checks/SMOKE-O4O-STANDARD-LIST-PHASE1-REFERENCE-V1.md`

### 적용 대상 화면

`/operator/stores`(4사) · `/operator/members`(Neture·GP·KCos) · `/operator/recruitment-exposure`(KPA·GP·KCos) · GP `/operator/applications` · KCos `/operator/applications` · `/admin/product-approvals`(Neture Admin). + `/admin/members` 무변경 확인.

---

## 2. 표준 리스트의 정의

O4O 표준 리스트는 **단순 DataTable 이 아니라** 다음 조합이다 (`@o4o/operator-ux-core`).

| 계층 | 구성 |
|------|------|
| Toolbar | `StandardListToolbar` (검색 + 필터 slot + 액션 slot + summary slot) |
| Table | `DataTable` (+ `manualSort`/`sortBy`/`sortOrder`/`onSort` controlled sort) |
| Pagination | `Pagination` |
| 상태 | `useStandardListQuery` (page/limit/search/sortBy/sortOrder/filters 단일 소스) |
| 정규화 | `normalizePaginatedResponse` (응답 shape 혼재 흡수) |
| URL | query sync (`syncUrl`, `urlKeyPrefix`) |
| 데이터 | server-driven pagination / search / filter / sort |
| 규약 | search/filter/sort/limit 변경 시 **page=1 reset** |

핵심: **상태·계약·정규화 계층을 표준화**하고 기존 UI(DataTable/Pagination/SearchBar)는 재사용한다.

---

## 3. Phase 1 적용 유형 (6종)

새 리스트/기존 리스트 정비 시 아래 6 유형 중 하나로 **먼저 분류**한다.

### A. Full Reference
- **대표:** `/operator/stores`
- **조건:** backend pagination 존재 + server search/filter/sort 가능 + DataTable/Pagination/URL sync 가능.
- **표준:** `useStandardListQuery` full adoption + DataTable `manualSort` + `StandardListToolbar` + `Pagination`.

### B. Targeted Adoption
- **대표:** `/operator/members`
- **조건:** 기존 화면 구조 복잡(탭/drawer/batch/action 유지 필요), 공유 컴포넌트가 admin 과 공용.
- **표준:** opt-in prop, 일부 URL sync, 일부 server sort, 기존 구조 유지. **breaking change 금지.**

### C. Minimal Card Queue
- **대표:** `/operator/recruitment-exposure`
- **조건:** DataTable 화면이 아님(카드형 승인 큐), backend pagination/search/sort 없음.
- **표준:** 카드 UI 유지, status filter URL sync, 기본 pending. **DataTable/Pagination 도입 금지.**
- **smoke 근거:** 3사 모두 `hasTable=0` 확인.

### D. Service-specific Full Adoption
- **대표:** GlycoPharm `/operator/applications`
- **조건:** 같은 route 명이라도 서비스별 backend shape 상이. 특정 서비스만 `{applications,pagination}` 같은 표준 근접 응답 보유.
- **표준:** 해당 서비스만 full adoption, 다른 서비스는 별도 판정. (검색·정렬은 backend 미지원이면 N/A.)

### E. Minimal URL Sync
- **대표:** K-Cosmetics `/operator/applications`
- **조건:** array-only + client filter + backend pagination/search/sort 부재.
- **표준:** 기존 client filter 유지 + URL sync 최소 적용. backend pagination 은 후속(Phase 2)으로 분리.

### F. Backend-first Full Adoption
- **대표:** `/admin/product-approvals`
- **조건:** array-only 전량 로드 + client KPI 집계 + 자체 `<table>` + field contract drift.
- **표준 순서 (반드시 이 순서):**
  1. backend pagination/search/sort 도입 (선행 WO)
  2. summary endpoint 분리 (KPI 전체 집계)
  3. field contract 정합 (예: `marketingName`/`category`)
  4. frontend standard list adoption

---

## 4. URL query parameter 규약 (정정·고정) ★

`useStandardListQuery` 는 URL key 를 **`${urlKeyPrefix}${key}` (구분자 없음)** 로 emit 한다. prefix 와 key 사이에 underscore 를 **자동 삽입하지 않는다.** (filter 만 `${prefix}f_${filterKey}`.)

### 정확한 실제 param (smoke 확인)

| state | 실제 param |
|-------|-----------|
| search | `storessearch` · `memberssearch` · `productApprovalssearch` |
| page | `storespage` · `productApprovalspage` |
| limit | `storeslimit` · `productApprovalslimit` |
| sortBy / sortOrder | `storessortBy`/`storessortOrder` · `productApprovalssortBy`/`productApprovalssortOrder` |
| filter | `productApprovalsf_approvalStatus` · `applicationsf_status` |

### 주의 (문서 drift 정정)
기존 일부 CHECK 문서의 `productApprovals_page`, `stores_search`, `applications_f_status` 같은 **underscore 표기는 설명상 의도였으나 실제 구현 규약과 다르다.** 기능은 정상이며 전 Phase 1 화면이 동일 규약(no-underscore)으로 일관된다. **Phase 1 baseline 이후 문서·신규 작업은 실제 규약(no-underscore prefix)을 따른다.**

### 권장
- prefix 는 사람이 읽기 쉬운 camelCase: `stores` · `members` · `applications` · `productApprovals` · `recruitmentExposure`.
- filter key 는 `f_` 접두 사용: `productApprovalsf_approvalStatus` · `applicationsf_status`.
- (Phase 2 후보) separator 개선(예: prefix 에 `_` 포함 강제) 여부는 §12 에서 검토.

---

## 5. page=1 reset 규약

**page=1 로 reset:** search 변경 · filter 변경 · sort 변경 · limit 변경.
**기존 조건 유지:** page 이동 · 새로고침 후 URL query 복원 · drawer/modal open·close.

---

## 6. 정렬 규약

- server-driven list 는 DataTable `manualSort` 사용. `sortBy`/`sortOrder`/`onSort` 를 외부 상태(`useStandardListQuery`)에 연결.
- **backend whitelist 에 없는 컬럼은 sortable 로 노출하지 않는다.** (예: `/admin/product-approvals` 는 `createdAt`/`approvalStatus`/`distributionType` 만 sortable; `supplierName`(enrichment)/`category` 는 제외.)
- client sort(BaseTable 프론트 정렬)는 단일 페이지 내부 정렬일 뿐 — **server pagination 과 혼용 금지.**
- 같은 컬럼 재클릭 = asc↔desc 토글, 다른 컬럼 = asc. aria-sort 는 controlled sort 상태 반영.

---

## 7. 검색 규약

- backend 가 **실제 지원하는 검색 대상만** placeholder 에 표시한다.
  - 예: `/admin/product-approvals` backend search = `master.name`(상품명) → placeholder "상품명으로 검색". `supplierName`(enrichment) 은 backend search 불가 → placeholder 에서 제외.
- enrichment 값(조직명 등)은 backend search 불가 시 검색 대상에서 제외하고 CHECK 에 명시.
- **full adoption 화면에서 client-side 재필터링 지양** (server search 단일 소스).

---

## 8. 응답 정규화 규약

### 표준 응답
```jsonc
{
  "success": true,
  "data": [],
  "pagination": { "page", "limit", "total", "totalPages", "hasNextPage", "hasPreviousPage" }
}
```

### normalizePaginatedResponse 가 흡수하는 형태
- `{ success, data, pagination }`
- `{ data, pagination }`
- `{ data: { items, pagination } }`
- `{ <domainKey>, pagination }` (예: `{ applications, pagination }`)
- `{ items, meta }`
- array-only → fallback(total=length, page=1)

> **단, array-only 는 full adoption 대상으로 보지 않는다.** Minimal URL sync(E) 또는 Backend-first(F) 대상으로 분류한다.

---

## 9. KPI / summary 규약

- **pagination 도입 후 client 전량 집계 금지.** (현재 페이지 기준 집계는 KPI 를 왜곡.)
- KPI 가 전체 기준이어야 하면 **summary endpoint** 를 둔다.
  - 대표: `/admin/product-approvals` → `GET /neture/admin/products/summary` (`{ total, pending, approved, rejected }`).
  - 화면은 진입 시 + 변경(승인/반려) 성공 후 list refetch + summary refetch.

---

## 10. 적용 화면 목록

| 화면 | 유형 |
|------|------|
| `/operator/stores` (Neture·GP·KCos·KPA) | A. Full reference |
| `/operator/members` (Neture·GP·KCos) | B. Targeted adoption |
| `/operator/recruitment-exposure` (KPA·GP·KCos) | C. Minimal card queue |
| GP `/operator/applications` | D. Service-specific full |
| KCos `/operator/applications` | E. Minimal URL sync |
| `/admin/product-approvals` (Neture Admin) | F. Backend-first full |
| `/admin/members` | (shared console — 무변경 확인) |

---

## 11. Smoke 결과 요약

- 도구: Playwright headless chromium (ephemeral context — profile lock 회피).
- 범위: Neture / GlycoPharm / K-Cosmetics / KPA Society 4서비스.
- 결과: 로그인 4사 성공, 전 route 렌더, **console error 0 · network 4xx/5xx 0**, PASS.
- `/admin/product-approvals`: 검색·정렬·토글·status 필터 URL sync + page=1 reset + 새로고침 복원 전부 통과.
- **제외(설계상):** 승인/반려 **live 실행**은 prod 데이터 변경이라 미실행(금지선 준수). 2페이지+ page-nav 는 단일 페이지 데이터로 미발생.
- 상세: `docs/checks/SMOKE-O4O-STANDARD-LIST-PHASE1-REFERENCE-V1.md`.

---

## 12. Phase 2 후보

- array-only 화면 backend pagination 선행 (일반).
- KCos `/operator/applications` backend pagination (E → F 승격).
- `/operator/recruitment-exposure` 대량화 시 backend pagination 도입 검토 (C 재분류 트리거).
- `/admin/product-approvals` `supplierName` search 확장 (organizations JOIN 재설계) + `supplierName`/`category` sort.
- 표준 URL key separator 개선 여부 검토 (no-underscore → 가독성 개선 시 core 변경 — 전 화면 동시 영향, 신중).

---

## 13. 금지선

- 표준 적용을 이유로 **카드 큐를 억지로 DataTable 화하지 않는다.**
- backend pagination 없는 **array-only 화면을 full adoption 으로 분류하지 않는다.**
- admin 과 operator 가 공유하는 컴포넌트는 **opt-in 방식으로만** 바꾼다.
- **backend whitelist 없는 컬럼을 sortable 로 노출하지 않는다.**
- **client KPI 집계를 pagination 이후에도 유지하지 않는다.**

---

## 14. 결론

O4O 표준 테이블형 리스트 **Phase 1 은 PASS 로 종료**한다.

향후 리스트 정비는 본 baseline 의 **6 유형(Full Reference / Targeted Adoption / Minimal Card Queue / Service-specific Full Adoption / Minimal URL Sync / Backend-first Full Adoption)** 중 하나로 먼저 분류한 뒤 WO 를 작성한다. URL query param 은 실제 규약(`${prefix}${key}`, no-underscore)을 따른다.
