# CHECK-O4O-CROSS-SERVICE-RAW-TABLE-STANDARDIZATION-BATCH-V2

WO: `WO-O4O-CROSS-SERVICE-RAW-TABLE-STANDARDIZATION-BATCH-V2`
일시: 2026-07-26 (KST)
commits: `f1f4b95aa`(A) · `72b2e176e`(C)

## 0. 결론

| 항목 | 결과 |
|---|---|
| **A. `ServiceLegalSettingsPage` 페이지 단위 전환** | ✅ 완료·배포 (소비처 4서비스) |
| **B. web-neture 49건 전수 분류** | ✅ 완료 — **실제 마크업 47건**으로 정정 |
| **C. 핵심 목록 묶음 전환** | ⏩ 1건 완료(`AdminServiceApprovalPage`), 잔여는 §5 |

`backend 0 · DB 0 · migration 0 · API 계약 변경 0 · 서비스명 조건문 0`

---

## 1. 집계 기준과 총량 (숫자 drift 방지)

**기준:** `services/web-neture/src` 하위 `*.tsx` 중 `<table` **문자열 포함 파일 수**.
단, **주석 라인(`*`, `//`)의 `<table` 은 제외**한다.

| 구분 | 건수 |
|------|:---:|
| `<table` 문자열 보유 파일 | 49 |
| **주석뿐(실제 마크업 없음)** | **2** |
| **실제 마크업 보유 (전환 대상 모집단)** | **47** |

### 1-A. 주석뿐 2건 — 이미 전환 완료된 파일

| 파일 | 실태 |
|------|------|
| `pages/operator/OperatorSupplierApprovalPage.tsx` | 헤더 주석 *"자체 `<table>` + client 전량 필터링 → O4O 표준 리스트(useStandardListQuery + DataTable…)"* — **이미 표준**(DataTable 4회 사용) |
| `pages/admin/AdminProductApprovalPage.tsx` | 동일 — **이미 표준**(DataTable 3회) |

> 과거 전환 이력을 적은 주석이 grep 에 잡혀 미전환으로 오계상되던 건이다.
> **1차 CHECK 의 "neture 49" 도 같은 방식이었으므로 실제 모집단은 47 이다.**

---

## 2. A. `ServiceLegalSettingsPage` — 페이지 단위 전환 완료

`packages/operator-core-ui/src/modules/service-legal/ServiceLegalSettingsPage.tsx`

### 2-A. 소비처 8곳 = **4서비스 × (래퍼 + 라우트 등록)**

| 서비스 | 래퍼 | 라우트 |
|--------|------|--------|
| GlycoPharm | `pages/admin/ServiceLegalSettingsPage.tsx` | `App.tsx` |
| K-Cosmetics | 〃 | `App.tsx` |
| KPA-Society | 〃 | `routes/AdminRoutes.tsx` |
| Neture | 〃 | `App.tsx` |

**계약 차이 없음** — 4개 래퍼 모두 동일한 `ServiceLegalApi` 를 주입하고
`SERVICE_KEY` 와 api client 만 다르다. → 중지 조건("소비처별 편집·게시 계약 상이") **미해당**,
래퍼 **수정 불필요**.

### 2-B. 전환 내용

| 항목 | 결과 |
|------|------|
| 정책 문서 목록 | raw `<table>` → **`DataTable`** (8컬럼, 표시 내용 동일) |
| 행 액션 | 편집 / 게시·게시해제 버튼 → **`RowActionMenu`** (게시 상태별 분기 보존) |
| 로딩·빈 상태 | `DataTable` 표준 처리로 이관 |
| 상태 배지 | 색상 하드코딩 → Tailwind 표준 배지 |
| **inline style** | `S` 객체 전면 제거 → Tailwind 토큰 `C`. **잔여 0** |
| `CSSProperties` import | **제거** |
| 편집 폼·게시 동작·API 계약 | **무변경** |

**혼합 상태를 남기지 않기 위해** 표뿐 아니라 탭·카드·폼·배너·버튼·상태행까지 페이지 전체를 전환했다
(1차에서 보류한 사유가 바로 이것이었다).

`FilterBar` 는 적용하지 않았다 — 정책 문서는 유형별 소수 항목이라 검색·필터 요구가 없다
(WO: "필요한 기능만 적용").

### 2-C. 검증·배포

| 항목 | 결과 |
|------|:---:|
| typecheck (변경 파일) | **오류 0** |
| build — GP / KCos / KPA / Neture | **4서비스 전부 PASS** |
| 배포 | `Deploy Web Services` run `30200935693` — **success** (4서비스 전부) |

> `web-k-cosmetics` 최초 빌드가 `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` 로 실패했으나
> 이는 **Windows libuv 크래시**(연속 빌드 시 발생하는 Node 이슈)이며 코드 오류가 아니다. 재시도 PASS.

---

## 3. B. web-neture 47건 분류표

프로파일링 기준: 파일당 표 수 / 행 액션 흔적 / 검색 UI / 페이지네이션 흔적.

| 분류 | 건수 | 대표 파일 |
|------|:---:|------|
| **① 운영자·관리자 승인 목록** | 5 | `AdminServiceApprovalPage`(✅전환) · `AdminSupplierApprovalPage` · `MarketTrialApprovalsPage` · `MarketTrialApprovalDetailPage` · `PartnershipRequestListPage` |
| **② 운영 관리 목록**(주문·상품·회원·정산) | 14 | `OrdersManagementPage` · `AllProductsOverviewPage` · `PlatformUsersPage` · `AdminSettlementsPage` · `AdminCommissionsPage` · `AdminPartnerSettlementsPage` · `SupplierOrdersListPage` 등 |
| **③ 공급자/파트너 자기 화면 목록** | 12 | `SupplierProductsListPage` · `SupplierRecruitmentsPage` · `PartnerLinksPage` · `PartnerStoresPage` · `ReferralLinksPage` 등 |
| **④ 통계·리포트 표**(읽기 전용) | 7 | `AiAdminDashboardPage` · `AiCostPage` · `AiCardReportPage` · `AiOperationsPage` · `AnalyticsPage` · `SupplierQualityPage` · `PartnerHubDashboardPage` |
| **⑤ 상세·요약 표**(목록 아님) | 5 | `SupplierOrderDetailPage` · `AdminPartnerDetailPage` · `SupplierRecruitmentDetailPage` · `SupplierAccountDashboardPage` · `SupplierB2BContentPage` |
| **⑥ 임포트·정리 도구**(폼/미리보기 내부 표) | 4 | `CSVImportPage` · `ImportHistoryPage` · `SupplierCsvImportPage` · `SupplierBulkRegisterPage` · `ProductDataCleanupPage` |
| **⑦ 기타 관리 화면** | 2 | `CategoryManagementPage` · `CategoryMappingRulesPage` |
| debug·archive·dead | **0** | 해당 없음 |
| 이미 표준 컴포넌트 내부 구현 | **2** | §1-A (모집단 외) |

**전환 우선순위:** ① → ② → ③. ④·⑤·⑥ 은 **읽기 전용/폼 내부 표**라
"읽기 전용 표에 불필요한 체크박스·액션 추가 금지" 원칙상 **후순위 또는 제외 후보**다.

---

## 4. C. 이번 묶음에서 전환한 화면

### `AdminServiceApprovalPage` (분류 ①)

| 항목 | 결과 |
|------|------|
| 목록 | raw `<table>` 7컬럼 → **`DataTable`** (표시 내용 동일) |
| 행 액션 | 승인·거절·철회 인라인 버튼 → **`RowActionMenu`**, 상태별 분기 보존(PENDING=승인·거절 / APPROVED=철회 / 그 외 없음), 처리중 `disabled` 유지 |
| 로딩·빈 상태 | 3중 분기 제거 → `DataTable` 처리. 빈 메시지 분기(등록 없음 / 검색 결과 없음)는 `emptyMessage` 로 **보존** |
| 검색·상태 필터 | **기존 유지**(동작 무변경) |
| 체크박스·ActionBar | **미적용** — 일괄 승인이 정의되어 있지 않음 |
| 잔여 raw `<table>` | **0** (주석 2건만) |
| typecheck / build | 오류 0 / `web-neture` **PASS** |

---

## 5. 보류·제외 사유 및 잔여

### 5-A. 이번 묶음에서 더 진행하지 않은 이유

분류 ① 의 나머지 4건은 구조가 **서로 다르다**:

- `MarketTrialApprovalDetailPage` — 표 3개, **상세 화면**(분류 ⑤ 성격 혼재)
- `MarketTrialApprovalsPage` — 635줄, 자체 페이지네이션 구현
- `AdminSupplierApprovalPage` — 461줄, 행 액션 13개소
- `PartnershipRequestListPage` — 요청 목록, 액션 3개소

"구조가 같은 화면은 같은 묶음에서" 원칙을 적용할 만큼 동형이 아니어서, 각각 개별 검토가 필요하다.
**세션 작업량 한계로 이번에는 ① 중 동형 판단이 끝난 1건만 전환**했고, 나머지는 잔여로 남긴다.

### 5-B. 잔여 우선순위

| 순위 | 대상 | 건수 |
|:---:|------|:---:|
| 1 | 분류 ① 잔여 (승인 목록) | 4 |
| 2 | 분류 ② 운영 관리 목록 | 14 |
| 3 | 분류 ③ 공급자/파트너 목록 | 12 |
| 4 | 분류 ⑦ 기타 관리 | 2 |
| — | 분류 ④⑤⑥ (읽기 전용·상세·폼 내부) | 16 — **전환 부적합 후보**, 개별 판단 |
| — | `admin-dashboard` | 71 (별도 배치) |

---

## 6. 커밋·배포

| 항목 | 값 |
|------|-----|
| A 전환 | `f1f4b95aa` — `ServiceLegalSettingsPage` (+135/-128) |
| A 배포 | `Deploy Web Services` run `30200935693` **success** (4서비스) |
| C 전환 | `72b2e176e` — `AdminServiceApprovalPage` (+79/-75) |
| C 배포 | push 완료 — 배포 파이프라인 자동 트리거 |

## 7. 미수행

- **브라우저 화면 실측** — 자동화 프로필을 다른 세션이 점유 중. `ServiceLegalSettingsPage` 의
  편집·게시 동작과 `AdminServiceApprovalPage` 의 승인·거절·철회는 **코드 경로·빌드로만 검증**했다.
  실제 클릭 검증은 사용자 브라우저에서 확인 권장(경로: 각 서비스 `/admin/service-legal`,
  Neture `/admin/service-approvals`).
- 모바일 overflow 실측 — `DataTable`→`BaseTable` 이 `overflow-x-auto` 를 제공하므로 구조적으로는
  대응되나 시각 확인은 미수행.
