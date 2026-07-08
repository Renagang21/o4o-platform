# CHECK-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-V1

Status: DONE — 코드 완료 + 프로덕션 브라우저 smoke PASS (2026-07-08)
WO: `WO-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-V1`
(초안 WO명: `...-STANDARD-TABLE-AND-PAGINATION-V1` — "테이블 교체"보다 "표준 목록 패턴 확립"이 정확해 개명)

Scope: admin.neture.co.kr **O4O 상품관리(o4o-product-db)** 목록을 O4O 표준 목록 패턴으로 정비. **단계적 접근 — 레퍼런스 먼저**: 가장 많이 쓰는 **ProductMasters + ProductCandidates 2개**에 표준 패턴을 완성해 canonical 확정. 나머지 4개(설명상태/설명검토/이미지/초안)는 이 패턴 복사로 후속 WO.

---

## 1. 조사 — 현재 상태 (문제 확정)

o4o-product-db 목록 페이지 6개 전수 조사 결과, **WO가 가정한 문제와 실제가 다름**:

| WO 가정 | 실제 |
| --- | --- |
| ① 표준 테이블 컴포넌트 미적용 | **사실** — 6개 전부 raw `<table>` + 로컬 Th/Td. BaseTable 미사용 |
| ④ 일부 화면이 전체 데이터 한 번에 로딩 → 속도 | **해당 없음** — 6개 전부 이미 `page/limit` 서버 페이지네이션. 전체 fetch/client pagination 없음 |
| ⑤ 서버 페이지네이션 미적용 | **해당 없음** — 이미 전부 서버 페이지네이션(meta.total/totalPages) |
| 활용 상태 / 작업 이력 목록 | 별도 목록 아님 — **ProductMasterDetailPage 내부 섹션** |

→ **실질 gap = 표준 컴포넌트 미적용 + row action/선택 구조 부재.** 성능(서버 페이지네이션)은 이미 확보됨.

표준 컴포넌트 = **`BaseTable` + `RowActionMenu` + `ActionBar` + `O4OColumn` (`@o4o/ui`)** — dropshipping/kpa/neture 등에서 광범위 사용 중인 canonical. 새 컴포넌트 만들지 않음(WO 준수). 레퍼런스: `SuppliersList.tsx`(서버 pagination+BaseTable), `ProductApprovalQueuePage.tsx`(FilterBar+RowActionMenu+ActionBar), `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`.

---

## 2. 구현 — 표준 목록 패턴 (2개 레퍼런스)

`ProductMastersPage.tsx` · `ProductCandidatesPage.tsx` 마이그레이션.

| 요소 | 적용 |
| --- | --- |
| **BaseTable** | raw `<table>` → `<BaseTable columns data rowKey onRowClick emptyMessage>`. 컬럼은 `O4OColumn[]` 정의(render 유지) |
| **RowActionMenu** | `_actions`(system:'last') 컬럼 — 현재 **상세 보기**(navigate). 후보/마스터 모두 read-only라 write 액션 없음 |
| **선택(Checkbox)** | `selectable` + `selectedKeys: Set<string>` + `onSelectionChange`. BaseTable 자동 select-all 헤더 |
| **Bulk 구조(ActionBar)** | 선택 시 `<ActionBar selectedCount onClearSelection statusInfo>` 표시. **actions=[]** — 일괄 write는 후속 WO(WO 준수: "대량 write 무리하게 X, UI 흐름·placement만") |
| **서버 페이지네이션** | 기존 유지(page/limit+meta). 표준 pagination footer(이전/다음, n/total) |
| **검색/필터** | 유지. Masters=검색(제출 커밋, 198k행 성능 위해 keystroke 조회 안 함) · Candidates=3 select+source_label+검색 |
| **URL sync** | Candidates 기존 유지. **Masters 신규 추가**(q/page) — 공유·새로고침·뒤로가기 |
| **컬럼 상태** | `tableId` + `columnVisibility` + `persistState`(순서·표시 localStorage) |
| **Empty/Loading/Error** | emptyMessage(loading 반영) + 기존 error 배너/재시도 유지 |

컬럼(Masters): 이미지/상품명/공식명/제조사/브랜드/분류/규격/바코드/이미지상태/(액션).
컬럼(Candidates): 상품명/제조·업체/분류/source/식별자/후보상태/매칭상태/생성일/(액션).

---

## 3. 의도적 미포함 (WO 준수 / 후속)

- **대량 write bulk action**: ActionBar 구조만. 실제 승인/승격/매칭/숨김 일괄 처리는 후속(백엔드 bulk 엔드포인트 필요).
- **컬럼 정렬(sortable)**: 서버 정렬 파라미터(sortBy/sortOrder) 미지원 → 현재 페이지(20행)만 client 정렬 시 오해 소지 → **미적용**. 서버 정렬은 후속(API 확장 필요). WO "정렬 정상"은 서버 정렬 도입 시 충족.
- **나머지 4개 목록**(DescriptionStatus/DescriptionReview/ImageQuality/DrugDescriptionDrafts): 본 패턴 복사 적용 후속 WO.
- 제외 항목(merge/split/재매칭/설명생성/이미지교체/thumbnail sync/대량 write/승격): 무접촉.

---

## 4. 검증

| 항목 | 결과 |
| --- | --- |
| admin-dashboard typecheck | **에러 0** (`tsc --noEmit`) |
| admin-dashboard build | **EXIT 0** (`vite build`, ProductMasters/Candidates 청크 정상 생성) |
| 변경 파일 | 2개 (ProductMastersPage.tsx, ProductCandidatesPage.tsx) — API/백엔드/공통 컴포넌트 무변경 |
| DB write | **0** (GET-only 유지 — 네트워크상 유일 POST=/auth/login) |
| 프로덕션 브라우저 smoke | **PASS** (admin.neture.co.kr, 2026-07-08, 서철환 admin) |

**smoke 상세 (2 배포: BaseTable 마이그레이션 → `_select` 체크박스 수정):**
- **ProductMasters**: BaseTable 렌더(총 198,389건, 1/9920 서버 pagination) · "더보기"→"상세 보기"→상세 이동(URL `/masters/{id}`) · 검색 "타이레놀"→43건+URL `?q=` sync+1/3 재계산 · "컬럼 설정"(columnVisibility) · **행 체크박스+헤더 select-all(indeterminate)** · 체크 시 **ActionBar "1개 선택"+선택 해제+statusInfo** 노출 · 체크박스 클릭이 상세 이동 안 함(stopPropagation)
- **ProductCandidates**: BaseTable 렌더(총 394,491건, 1/19725) · 3필터+source_label+검색 · 안내 배너 · "더보기" · 체크박스
- **네트워크 GET-only**: `/neture/products/library/search?page&limit` GET 200, mutation 0
- **발견/수정**: BaseTable `selectable`은 헤더 select-all만 auto-wire → body 체크박스는 consumer `_select` 컬럼 필요(BaseTable.tsx:265). 1차 배포서 체크박스 미렌더 확인 → `_select` 컬럼 추가 재배포 후 정상(SuppliersList 등 기존 페이지도 동일 잠재 이슈 — 후속 정리 대상)

---

## 5. 완료 기준 대비

| WO 완료 기준 | 상태 |
| --- | --- |
| 주요 목록 표준 테이블 적용 | ✅ Masters·Candidates (레퍼런스 2개) |
| 서버 페이지네이션 | ✅ 유지 확인(이미 적용됨) |
| 체크/선택 후 action 흐름 | ✅ selectable + ActionBar 구조 확립 (write는 후속) |
| 수정/숨김/복원 action UX | 목록 레벨은 상세 이동. 숨김/복원/대표는 이미지 detail 레벨(별도 완료 WO) |
| 속도 문제 개선 | 이미 서버 페이지네이션 — 회귀 없음 |
| CHECK 작성 | ✅ 본 문서 |
| commit/push/deploy | ✅ 완료 (9c3652a41 마이그레이션 + 0a3f2f819 체크박스 수정, Cloud Run 배포 성공) |

---

## 6. 후속 WO

**`WO-O4O-ADMIN-O4O-PRODUCT-STANDARD-LIST-PATTERN-APPLY-V2`** — 본 패턴을 나머지 4개 목록(설명상태/설명검토/이미지/초안)에 복사 적용.
그 외: 서버 정렬(API sortBy/sortOrder) · 목록 bulk write 액션(백엔드 bulk 엔드포인트).
