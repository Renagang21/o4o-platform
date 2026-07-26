# CHECK-O4O-NETURE-APPROVAL-AND-OPERATION-LISTS-STANDARDIZATION-BATCH-V3

WO: `WO-O4O-NETURE-APPROVAL-AND-OPERATION-LISTS-STANDARDIZATION-BATCH-V3`
일시: 2026-07-26 (KST) · commit `64714f498`

## 0. 결론

**전환 3건 / 보류 2건.** `backend 0 · DB 0 · migration 0 · 승인 정책·권한 범위 변경 0`

---

## 1. 승인 잔여 4건별 판정

| # | 화면 | 판정 | 사유 |
|:-:|------|:----:|------|
| 1 | `AdminSupplierApprovalPage` (461줄) | ✅ **전환** | 단일 목록 + 상태별 행 액션 — 표준 계약에 정확히 부합 |
| 2 | `PartnershipRequestListPage` (264줄) | ✅ **전환** | 단일 목록. 액션은 주 CTA 라 인라인 유지(§2-B) |
| 3 | `MarketTrialApprovalsPage` (635줄) | ⛔ **보류** | §4-A |
| 4 | `MarketTrialApprovalDetailPage` (1249줄) | ⛔ **보류** | §4-B |

> 분류표상 승인군 5건 중 `AdminServiceApprovalPage` 는 **직전 BATCH-V2 에서 이미 전환**(`72b2e176e`).

---

## 2. 전환한 화면

### 2-A. `AdminSupplierApprovalPage`

| 항목 | 결과 |
|------|------|
| 목록 | raw `<table>` 8컬럼 → **`DataTable`**. 서류/정산 복합 셀(프로필 완료 여부·이연 항목·정산 정보·통신판매업·서류 다운로드 3버튼)을 **그대로 render 이관** |
| 행 액션 | 품목군 / 승인 / 거절 / 비활성화 → **`RowActionMenu`**. 상태별 분기 보존(PENDING=승인·거절, ACTIVE=비활성화, 품목군은 상시), `actionLoading` disabled 유지 |
| 로딩·빈 상태 | 3중 분기 제거 → `DataTable`. 빈 메시지 분기(등록 없음 / 검색 결과 없음) 보존 |
| 검색·상태 필터·통계 카드 | **무변경** |

### 2-B. `PartnershipRequestListPage`

| 항목 | 결과 |
|------|------|
| 목록 | raw `<table>` 9컬럼 → **`DataTable`** (이미지·가격 tabular-nums·수수료 배지·몰 URL 외부링크 포함) |
| 신청 액션 | **인라인 버튼 유지** — `RowActionMenu` 미적용 |
| 상태 3분기 | 마감 / 신청 완료 / 파트너 신청(+신청 중) **보존** |

> **RowActionMenu 를 쓰지 않은 이유:** 이 화면의 행 액션은 **단일 주 CTA** 다.
> kebab 메뉴에 넣으면 핵심 동선이 한 단계 깊어져 업무성이 나빠진다.
> WO 원칙("행 액션 13개를 RowActionMenu 하나에 넣으면 업무성이 나빠지는 경우")의 역방향 적용이다.

### 2-C. `AdminContactMessagesPage` (운영관리군)

| 항목 | 결과 |
|------|------|
| 목록 | raw `<table>` 6컬럼 → **`DataTable`** |
| 이름 클릭 상세 토글 | **유지** — 확장 상세가 표 **바깥**에 렌더되어 표만 분리 전환 가능했다 |
| 상태 변경 `select` | **인라인 유지** — 즉시 반영형 컨트롤이라 메뉴로 감싸면 조작이 느려진다 |

---

## 3. 운영관리 14건 재분류

WO 지시대로 14건을 구조 기준으로 다시 묶었다.

| 묶음 | 화면 | 동형 여부 |
|------|------|:---:|
| **정산·수수료 3종** | `AdminSettlementsPage`(695줄·표2) · `AdminPartnerSettlementsPage`(600줄·표2) · `AdminCommissionsPage`(667줄·표2) | **동형 후보** — 표 2개 구성·페이지네이션 유사. 규모가 커 별도 묶음 필요 |
| **문의 메시지 2종** | `AdminContactMessagesPage`(251줄·표1) ✅ · `OperatorContactMessagesPage`(268줄·표1) | **비동형** — 후자는 **행 확장(expandable row)** 패턴(`expandedId` 로 `<tr>` 내부 확장) |
| 주문·상품 목록 | `OrdersManagementPage` · `AllProductsOverviewPage` · `RecruitingProductsOverviewPage` · `SupplierOrdersListPage` · `StoreOrdersPage` | 서버 페이지네이션 보유, 개별 컬럼 상이 |
| 사용자·플랫폼 | `PlatformUsersPage` · `PlatformAccountsPage` | 개별 |
| 기타 | `AdminMasterManagementPage` · `CommunityManagementPage` | 개별 |

### 3-A. "동형 묶음" 이 기대보다 적었던 이유

문의 메시지 2종은 줄 수·표 개수·페이지네이션이 같아 동형으로 보였으나, 실제로는
`OperatorContactMessagesPage` 가 **행 확장 패턴**을 쓴다(`{messages.map((m) => { const isOpen = expandedId === m.id; ...`).
`DataTable` 은 행 확장을 표준 지원하지 않으므로 **같은 방식으로 전환할 수 없다.**

→ 표면 지표(줄 수·표 수)로 동형을 판단하면 안 되고, **행 렌더 패턴**까지 봐야 한다.

---

## 4. 보류 화면과 사유

### 4-A. `MarketTrialApprovalsPage` — 대상 표가 승인 목록이 아님

- 이 페이지의 `<table>` 은 `pageTab === 'forum-failures'` 서브탭의 **포럼 실패 로그**다
  (컬럼: 상태·심각도·유통참여형 펀딩·단계·**에러 메시지**·발생 시각·해결 시각·액션).
- 행 렌더가 전용 컴포넌트 **`ForumFailureRow`** 에 위임되어 있고 콜백 4개(`onNavigate`/`onResolve`/`onShowError`)를 받는다.
  컬럼 render 로 이관하려면 그 컴포넌트를 해체해야 한다.
- 성격상 **감사·오류 이력**이라 WO 중지 조건("감사 기록과 강하게 결합")에 가깝다.
- **서버 페이지네이션은 이미 정상**(`page`/`limit=20`/`total`/`totalPages`) — backend 계약 변경은 불필요하다.
  즉 보류 사유는 계약이 아니라 **대상 성격과 구조**다.

### 4-B. `MarketTrialApprovalDetailPage` — 상세 화면 + 편집 결합

- 1249줄 **상세 화면**이며 표 3개 중 하나가 **"정산 상태 관리"** — 조회가 아니라 상태 전이를 다루는 관리 표다.
- WO 중지 조건 "상세 화면의 표가 편집 폼이나 감사 기록과 강하게 결합된 경우" 에 해당.
- WO 원칙 "상세 화면의 여러 표는 무조건 DataTable 로 바꾸지 않고, 목록 성격인 표만 전환" 에 따라 **전체 보류**.

---

## 5. 기존 액션·페이지네이션 보존 결과

| 항목 | 결과 |
|------|:---:|
| 승인·거절·철회·비활성화 상태 전이 | **무변경** (호출 함수·확인 모달 동일) |
| 처리 중 `disabled` | **보존** (`actionLoading` / `applyingId` / `updatingId`) |
| 검색·상태 필터 | **무변경** |
| 페이지네이션 | 전환 3건 모두 자체 페이지네이션 미보유 — 해당 없음. `MarketTrialApprovalsPage` 의 서버 페이지네이션은 **손대지 않음** |
| 통계 카드·모달·토스트 | **무변경** |
| 권한·API 계약 | **무변경** |

---

## 6. 검증

| 항목 | 결과 |
|------|:---:|
| typecheck (전환 3파일) | **오류 0** |
| 잔여 raw `<table>` 마크업 (전환 3파일) | **각 0** (주석 언급만 잔존) |
| `web-neture` build | **PASS** |
| backend / DB / migration | **0** |

### 미수행

- **브라우저 실측** — 자동화 프로필을 다른 세션이 점유 중. 승인·거절·비활성화 클릭, 상세 토글,
  상태 select 즉시 반영, 모바일 overflow 는 **코드 경로·빌드로만 검증**했다.
  확인 경로: `/admin/suppliers`(공급자 승인) · `/admin/contact-messages` · 파트너십 요청 목록.
- `DataTable`→`BaseTable` 이 `overflow-x-auto` 를 제공하므로 모바일 가로 스크롤은 구조적으로 대응되나
  시각 확인은 미수행.

---

## 7. 잔여 우선순위

| 순위 | 대상 | 건수 | 비고 |
|:---:|------|:---:|------|
| 1 | 정산·수수료 3종 | 3 | **동형 후보** — 표 2개 구성이 유사해 한 묶음 가치 큼 |
| 2 | 주문·상품 목록 5종 | 5 | 서버 페이지네이션 보유, 컬럼 개별 |
| 3 | `OperatorContactMessagesPage` | 1 | 행 확장 패턴 — `DataTable` 확장 지원 여부 선결 |
| 4 | 사용자·플랫폼 2종 · 기타 2종 | 4 | 개별 |
| 5 | `MarketTrialApprovals` / `Detail` | 2 | §4 — 구조 판단 선행 |
| — | 읽기전용·상세·폼 내부 표 | 16 | 전환 부적합 후보(BATCH-V2 §3 분류 ④⑤⑥) |

**neture 진행률:** 실제 마크업 47건 중 **전환 누계 4건**(V2 1 + V3 3), 보류·부적합 후보 18건, 잔여 25건.

---

## 8. 커밋·배포

| 항목 | 값 |
|------|-----|
| commit | `64714f498` — 3파일 (+306 / -285) |
| 배포 | push 완료 — `Deploy Web Services` 자동 트리거 |
| 직전 배치 | `f1f4b95aa`(V2-A) · `72b2e176e`(V2-C) · `bb48a7e4a`(V2 CHECK) |
