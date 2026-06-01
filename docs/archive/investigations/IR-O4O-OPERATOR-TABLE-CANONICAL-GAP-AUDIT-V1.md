# IR-O4O-OPERATOR-TABLE-CANONICAL-GAP-AUDIT-V1

**조사 대상:** 운영자 리스트 화면 테이블 구조 및 canonical 패턴과의 갭  
**작성일:** 2026-05-07  
**상태:** COMPLETE  

---

## 1. 조사 범위

- `packages/ui/src/components/table/` — BaseTable, SelectionTable, ActionBar
- `packages/ui/src/ag-components/DataTable.tsx` — legacy DataTable
- `packages/operator-ux-core/src/list/DataTable.tsx` — operator-ux-core DataTable (BaseTable wrapper)
- `apps/admin-dashboard/src/pages/` — KPA, Neture, Dropshipping, Operators, Users
- `services/web-kpa-society/src/pages/operator/` — KPA Society 운영자 페이지
- `services/web-neture/src/pages/operator/` — Neture 운영자 페이지
- `services/web-k-cosmetics/src/pages/operator/` — K-Cosmetics 운영자 페이지
- `services/web-glycopharm/src/pages/operator/` — GlycoPharm 운영자 페이지

---

## 2. 테이블 컴포넌트 생태계

### 2.1 컴포넌트 계층

```
packages/ui/src/components/table/BaseTable.tsx
    ↑ wraps
packages/operator-ux-core/src/list/DataTable.tsx   (ListColumnDef → O4OColumn 변환 레이어)
    ↑ used by
packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx

packages/ui/src/ag-components/DataTable.tsx         (독립 구현, BaseTable과 무관)
    ↑ exported as DataTable from @o4o/ui
    ↑ used by
services/web-glycopharm/src/pages/operator/UsersPage.tsx
services/web-glycopharm/src/pages/operator/PharmaciesPage.tsx
services/web-glycopharm/src/pages/operator/StoreApprovalsPage.tsx
services/web-k-cosmetics/src/pages/operator/ApplicationsPage.tsx
services/web-k-cosmetics/src/pages/operator/UsersPage.tsx
```

### 2.2 BaseTable 핵심 Selection Props

| Prop | Type | 설명 |
|------|------|------|
| `selectable` | `boolean` | header select-all checkbox 자동 생성 |
| `selectedKeys` | `Set<string>` | 선택된 row key 집합 |
| `onSelectionChange` | `(keys: Set<string>) => void` | 선택 변경 콜백 |

> **주의**: header checkbox는 BaseTable 내부 자동 관리. body cell checkbox는 consumer의 column render가 책임 (`system: true` + `key: '_select'` 컬럼 정의 필요).

### 2.3 ag-components DataTable Selection Props

```typescript
rowSelection?: {
  selectedRowKeys: string[];   // string[] (Set<string>과 다름)
  onChange: (selectedRowKeys: string[]) => void;
};
```

> BaseTable의 `Set<string>` vs ag-components DataTable의 `string[]` — API 불일치 존재.

### 2.4 operator-ux-core DataTable

BaseTable thin wrapper. `selectable`, `selectedKeys` props 지원 (BaseTable에 직접 위임).  
파일: `packages/operator-ux-core/src/list/DataTable.tsx`

### 2.5 ActionBar / BulkResultModal (공통 UI)

모두 `@o4o/ui` export. 현재 KPA Society, Neture 운영자 페이지에서 표준적으로 사용 중.

---

## 3. Canonical 패턴 정의 (V3 기준)

코드베이스 내 실제 구현 기준으로 확인된 **V3 Canonical** 패턴:

```
BaseTable
  selectable={true}
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  columns={[{ key: '_select', system: true, render: (_, row) => <checkbox /> }, ...]}

{selectedIds.size > 0 && (
  <ActionBar
    selectedCount={selectedIds.size}
    actions={bulkActions}
    onClearSelection={() => setSelectedIds(new Set())}
  />
)}

<BulkResultModal ... />   // 일괄 처리 결과 표시
```

**Canonical 구현 완료 화면 (참조 기준)**:

| 파일 | 서비스 | 비고 |
|------|--------|------|
| `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx` | KPA | V3 Full |
| `services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx` | KPA | V3 Full |
| `services/web-kpa-society/src/pages/operator/OperatorForumPage.tsx` | KPA | V3 Full |
| `services/web-kpa-society/src/pages/operator/ProductApplicationManagementPage.tsx` | KPA | V3 Full |
| `services/web-kpa-society/src/pages/operator/UsersPage.tsx` | KPA | V3 Full |
| `services/web-kpa-society/src/pages/operator/QualificationRequestsPage.tsx` | KPA | V3 Full |
| `services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx` | Neture | V3 Full |
| `services/web-neture/src/pages/operator/ForumManagementPage.tsx` | Neture | V3 Full |

---

## 4. 화면별 현황 전수 조사

### 4.1 KPA Society (`services/web-kpa-society/src/pages/operator/`)

| 파일 | 테이블 컴포넌트 | checkbox | ActionBar | BulkResult | 판정 |
|------|----------------|---------|-----------|------------|------|
| ContentManagementPage | BaseTable | ✅ | ✅ | ✅ | **CANONICAL** |
| OperatorLmsCoursesPage | BaseTable | ✅ | ✅ | ✅ | **CANONICAL** |
| OperatorForumPage | BaseTable | ✅ | ✅ | ✅ | **CANONICAL** |
| ProductApplicationManagementPage | BaseTable | ✅ | ✅ | ✅ | **CANONICAL** |
| UsersPage | BaseTable | ✅ | ✅ | ✅ | **CANONICAL** |
| QualificationRequestsPage | BaseTable | ✅ | ✅ | — | **CANONICAL** |
| PharmacyRequestManagementPage | BaseTable | ✅ (selectable) | — | — | **PARTIAL** |
| OperatorResourcesPage | BaseTable | ✅ | ✅ | — | **PARTIAL** (bulk = 개별 호출 병렬, WO 주석으로 명시) |
| ForumManagementPage | BaseTable | ✅ | ✅ | — | **PARTIAL** |
| ForumDeleteRequestsPage | BaseTable | ✅ | — | — | **PARTIAL** |

### 4.2 Neture (`services/web-neture/src/pages/operator/`)

| 파일 | 테이블 컴포넌트 | checkbox | ActionBar | 판정 |
|------|----------------|---------|-----------|------|
| OperatorProductApprovalPage | BaseTable | ✅ | ✅ + BulkResultModal | **CANONICAL** |
| ForumManagementPage | BaseTable | ✅ | ✅ + BulkResultModal | **CANONICAL** |
| AllRegisteredProductsPage | operator-ux-core DataTable | **커스텀** (_select 컬럼 직접 정의) | ✅ | **VARIANT** (ActionBar 있으나 BaseTable selectable 미사용) |
| ForumDeleteRequestsPage | BaseTable | ✅ | — | **PARTIAL** |
| MarketTrialApprovalDetailPage | BaseTable | — | — | 상세 페이지 |

### 4.3 K-Cosmetics (`services/web-k-cosmetics/src/pages/operator/`)

| 파일 | 테이블 컴포넌트 | checkbox | ActionBar | 판정 |
|------|----------------|---------|-----------|------|
| ProductsPage | operator-ux-core DataTable | ✅ (selectable) | — | **PARTIAL** (bulk 버튼 있으나 ActionBar 미사용) |
| EventOfferApprovalsPage | **Raw HTML grid** | ❌ | ❌ | **LEGACY** |
| UsersPage | ag-components DataTable | ❌ | ❌ | **LEGACY** |
| ApplicationsPage | ag-components DataTable | ❌ | ❌ | **LEGACY** |
| StoresPage | 미확인 | — | — | 조사 필요 |
| OrdersPage | 미확인 | — | — | 조사 필요 |

### 4.4 GlycoPharm (`services/web-glycopharm/src/pages/operator/`)

| 파일 | 테이블 컴포넌트 | checkbox | ActionBar | 판정 |
|------|----------------|---------|-----------|------|
| UsersPage | ag-components DataTable | ✅ (`rowSelection.selectedRowKeys`) | ✅ | **VARIANT** (DataTable + ActionBar 조합, BaseTable과 API 불일치) |
| PharmaciesPage | ag-components DataTable | — | ✅ | **VARIANT** (ActionBar 있으나 selection 없음) |
| StoreApprovalsPage | ag-components DataTable | — | — | **LEGACY** |
| LmsCoursesPage | BaseTable 미사용 | — | — | 조사 필요 |
| ForumRequestsPage | 미확인 | — | — | 조사 필요 |

### 4.5 Admin Dashboard (`apps/admin-dashboard/src/pages/`)

| 파일 | 테이블 컴포넌트 | checkbox | ActionBar | 판정 |
|------|----------------|---------|-----------|------|
| kpa/HubContentsPage | BaseTable | ❌ | ❌ | **LEGACY** |
| kpa/HubNoticeListPage | BaseTable | ❌ | ❌ | **LEGACY** |
| kpa/MyStoreContentsPage | BaseTable | ❌ | ❌ | **LEGACY** |
| neture/ProductApprovalQueuePage | BaseTable | ❌ | ❌ | **LEGACY** (WO 참조 레퍼런스 페이지임에도 selection 없음) |
| operator/ContentApprovalsPage | BaseTable | ❌ | ❌ | **LEGACY** |
| operators/OperatorsPage | BaseTable | ❌ | ❌ | **LEGACY** |
| dropshipping/Products | BaseTable | ✅ (selectable) | 커스텀 버튼 | **PARTIAL** (ActionBar 미사용, 개별 `confirm()` 사용) |
| dropshipping/PartnersList | BaseTable | ✅ (selectable) | 커스텀 버튼 | **PARTIAL** |
| dropshipping/SellersList | BaseTable | ✅ (selectable) | 커스텀 버튼 | **PARTIAL** |
| dropshipping/SuppliersList | BaseTable | ✅ (selectable) | 커스텀 버튼 | **PARTIAL** |
| users/UsersListClean | BaseTable | ✅ (selectable) | 커스텀 select UI | **PARTIAL** |
| users/ActiveUsers | BaseTable | ❌ | ❌ | **LEGACY** |
| neture/ProductListPage | 미확인 | — | — | 조사 필요 |
| neture/SupplierListPage | 미확인 | — | — | 조사 필요 |
| neture/PartnerListPage | 미확인 | — | — | 조사 필요 |

### 4.6 KPA Event Offer (별도 분류)

| 파일 | 테이블 컴포넌트 | checkbox | ActionBar | 판정 |
|------|----------------|---------|-----------|------|
| `services/web-kpa-society/src/pages/event-offer/KpaEventOfferPage.tsx` | **커스텀 구현** | 커스텀 | 커스텀 | **VARIANT** (약사/분회 회원용 주문 화면, 운영자 화면 아님) |

> KpaEventOfferPage는 운영자 화면이 아닌 분회 회원용 B2B 주문 화면. canonical 적용 대상 제외.

---

## 5. Gap 분석

### 5.1 패턴별 분류 집계

| 판정 | 건수 | 설명 |
|------|------|------|
| **CANONICAL** | 8 | BaseTable + selectable + ActionBar + BulkResultModal 완전 구현 |
| **PARTIAL** | 10 | selectable 있으나 ActionBar/BulkResultModal 미사용, 또는 ActionBar 있으나 selectable 미연결 |
| **VARIANT** | 3 | ag-components DataTable + ActionBar (API 불일치), 또는 커스텀 selection |
| **LEGACY** | 12+ | checkbox/bulk action 전무 |

### 5.2 주요 Gap 유형

**Gap 1: checkbox 완전 부재 (LEGACY)**
- `HubContentsPage`, `HubNoticeListPage`, `MyStoreContentsPage`
- `ProductApprovalQueuePage` (참조 페이지임에도 selection 없음)
- `ContentApprovalsPage`, `OperatorsPage`, `ActiveUsers`
- `EventOfferApprovalsPage` (Raw HTML + 개별 버튼만)

**Gap 2: selectable 있으나 ActionBar 미사용 (PARTIAL — Dropshipping 패턴)**
- `confirm()` 직접 호출 + 커스텀 버튼
- `Promise.all()` 개별 API 호출
- ActionBar/BulkResultModal UX 일관성 없음

**Gap 3: ag-components DataTable + ActionBar (VARIANT — GlycoPharm 패턴)**
- API 불일치: `rowSelection.selectedRowKeys: string[]` vs BaseTable `Set<string>`
- `BulkResultModal` 미사용
- GlycoPharm UsersPage에서만 ActionBar 연결, 나머지는 미연결

**Gap 4: Raw HTML 테이블 (k-cosmetics EventOfferApprovalsPage)**
- BaseTable 미사용
- grid CSS 직접 사용
- selection/bulk action 전무

**Gap 5: operator-ux-core DataTable + 커스텀 checkbox 컬럼 (VARIANT — Neture AllRegisteredProductsPage)**
- BaseTable `selectable` prop 미사용
- `_select` 컬럼 직접 정의 + 커스텀 selection state
- ActionBar는 연결됨

### 5.3 SelectionTable 미사용 문제

`packages/ui/src/components/table/SelectionTable.tsx` 존재하나 실제 사용 화면 **없음**.
- BaseTable 위의 wrapper로 selection 로직 캡슐화
- ActionBar 통합 포함
- Production-ready이나 문서화/도입 없음
- 현재 모든 CANONICAL 페이지는 SelectionTable 없이 직접 BaseTable + selectedKeys state 구현

---

## 6. Bulk Action API 현황

| 서비스 | endpoint | 방식 |
|--------|---------|------|
| Neture | `POST /operator/products/batch-approve` | 진짜 bulk ✅ |
| Neture | `POST /operator/products/batch-reject` | 진짜 bulk ✅ |
| KPA OperatorResourcesPage | 없음 | `Promise.all()` 개별 호출 (WO 주석 명시) |
| Dropshipping Products | 없음 | `Promise.all()` 개별 호출 |
| Dropshipping Partners/Sellers/Suppliers | 없음 | `Promise.all()` 개별 호출 |
| GlycoPharm UsersPage | `/admin/users/{id}` 개별 | `Promise.all()` 개별 호출 |
| KPA ContentManagementPage | 개별 API 반복 | `Promise.all()` 개별 호출 |

> **요약**: bulk 전용 API는 Neture 도메인에만 존재. 나머지는 모두 개별 API 반복 호출 패턴.

---

## 7. 공통화 가능 범위

### 7.1 이미 공통화된 것 (재사용 가능)

| 컴포넌트/Hook | 위치 | 상태 |
|--------------|------|------|
| `BaseTable` | `@o4o/ui` | Production ✅ |
| `ActionBar` | `@o4o/ui` | Production ✅ |
| `BulkResultModal` | `@o4o/ui` | Production ✅ |
| `RowActionMenu` | `@o4o/ui` | Production ✅ |
| `FilterBar` | `@o4o/ui` | Production ✅ |
| `SelectionTable` | `@o4o/ui` | Production-ready, 미사용 ⚠️ |

### 7.2 서비스별 고유 컬럼 여부

| 서비스 | 공통화 가능 컬럼 | 서비스 고유 컬럼 |
|--------|----------------|----------------|
| KPA | 이름, 이메일, 상태, 등록일, 액션 | 약사면허번호, 분회정보, 자격증상태 |
| GlycoPharm | 이름, 이메일, 상태, 등록일, 액션 | 약국명, 사업자번호 |
| K-Cosmetics | 이름, 이메일, 상태, 등록일, 액션 | 공급사, 브랜드 |
| Neture | 이름, 상태, 승인상태, 등록일, 액션 | supplier정보, DistributionType |

> **공통 컬럼 패턴**: 이름/제목, 상태 badge, 등록일, 액션(RowActionMenu)은 모든 서비스에서 동일.

### 7.3 shared-space-ui 이관 가능성

- `LmsHubTemplate`: 이미 ActionBar + selectedKeys 패턴 포함. LMS 운영자 페이지에서 재사용 가능.
- `ResourcesHubTemplate`: ActionBar + BulkDelete + BulkResultModal 완전 구현. Resources 운영자 페이지 공통화 기준.
- 두 템플릿 모두 `config` prop 기반 서비스별 분기 → **공통화 최적 패턴 확인**.

### 7.4 공통화 불가 항목

- 각 서비스의 role guard (KPA: `kpa-society:operator`, Glycopharm: `glycopharm:operator`)
- 서비스별 bulk action 의미 (KPA: 승인/거부, Dropshipping: 삭제, Neture: batch-approve)
- 서비스별 pagination API 형태 차이

---

## 8. UX Canonical 기준 정리

### 8.1 Row Click 정책

현재 상태: 혼재
- 대부분: row click → detail page navigate
- 일부: row click → drawer/panel open
- 일부: click 없음

**Canonical 방향**: row click → detail drawer (operator 컨텍스트), 별도 page navigate는 선택적.

### 8.2 Action Icon 최소화 기준

현재 상태: RowActionMenu(kebab 메뉴) 사용이 canonical에서 표준.  
LEGACY 페이지에서는 inline icon(edit/delete) 과다 사용.

**Canonical**: `RowActionMenu` (kebab), inline은 `inlineMax: 1` (가장 중요한 1개만).

### 8.3 Checkbox 위치

`system: true` 컬럼 (맨 앞), key: `_select`, header는 BaseTable 자동 관리.

### 8.4 Bulk Toolbar 위치

ActionBar: 선택 시(`selectedIds.size > 0`)에만 표시, 테이블 상단 floating 또는 sticky.

### 8.5 상태 Badge Canonical

현재: 서비스별로 다른 badge 구현 혼재.  
**관찰**: KPA canonical 페이지는 `<span className="...">` 인라인 badge. 공통 StatusBadge 컴포넌트 부재.

### 8.6 Empty / Loading State

BaseTable 내장 처리 (`loading`, `emptyMessage` props). 추가 구현 불필요.

### 8.7 Pagination Canonical

BaseTable 외부에서 Pagination 컴포넌트 사용 (operator-ux-core 또는 @o4o/ui Pagination).  
서버사이드 페이지네이션: `page`, `limit` query params → API 호출 패턴.

### 8.8 Mobile Collapse 정책

현재: 조사된 operator 페이지에서 mobile collapse 정책 없음. Desktop-first 구현.

---

## 9. 위험 요소

### 9.1 API 불일치 (높음)

BaseTable: `Set<string>` / ag-components DataTable: `string[]`  
→ GlycoPharm, K-Cosmetics 일부 페이지를 BaseTable 패턴으로 전환 시 state 타입 변경 필요.

### 9.2 Drawer/Detail Panel 충돌 (중간)

일부 페이지에서 row click → detail panel open 구현. checkbox row click과 panel open 간 이벤트 충돌 가능.  
현재 canonical 페이지들은 `e.stopPropagation()`으로 처리.

### 9.3 Inline Action 의존 (낮음)

LEGACY 페이지의 inline edit/delete 버튼 → RowActionMenu 전환 시 UX 변경 발생.  
기능 동등이나 사용자 학습 필요.

### 9.4 Role Guard 차이 (낮음)

서비스별 scope guard 이미 분리되어 있음. 공통화 시에도 guard는 서비스별 유지.

### 9.5 대량 데이터 성능 (낮음)

현재 operator 페이지 대부분 서버사이드 페이지네이션. BaseTable 자체 부담 낮음.  
SelectionTable의 `maxSelect` prop으로 제한 가능.

---

## 10. Phase 분리 권장

### Phase 1 — 즉시 적용 가능 (코드 변경 최소)
**대상**: LEGACY 중 BaseTable 이미 사용 중인 페이지

- `apps/admin-dashboard/src/pages/kpa/HubContentsPage.tsx`
- `apps/admin-dashboard/src/pages/kpa/HubNoticeListPage.tsx`
- `apps/admin-dashboard/src/pages/kpa/MyStoreContentsPage.tsx`
- `apps/admin-dashboard/src/pages/operator/ContentApprovalsPage.tsx`
- `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx`

작업: `selectable`, `selectedKeys`, `onSelectionChange` 추가 + ActionBar 연결.  
Bulk API: 기존 개별 API `Promise.all()` 패턴으로 충분.

### Phase 2 — 중간 복잡도 (PARTIAL → CANONICAL)
**대상**: selectable 있으나 ActionBar 미연결인 Dropshipping 페이지들

- `apps/admin-dashboard/src/pages/dropshipping/Products.tsx`
- `apps/admin-dashboard/src/pages/dropshipping/PartnersList.tsx`
- `apps/admin-dashboard/src/pages/dropshipping/SellersList.tsx`
- `apps/admin-dashboard/src/pages/dropshipping/SuppliersList.tsx`
- `apps/admin-dashboard/src/pages/users/UsersListClean.tsx`

작업: 커스텀 confirm() + 커스텀 버튼 → ActionBar + BulkResultModal 교체.

### Phase 3 — 고위험 (VARIANT → CANONICAL)
**대상**: ag-components DataTable 또는 Raw HTML 사용 페이지

- `services/web-k-cosmetics/src/pages/operator/EventOfferApprovalsPage.tsx` (Raw HTML → BaseTable)
- `services/web-glycopharm/src/pages/operator/UsersPage.tsx` (DataTable → BaseTable)
- `services/web-glycopharm/src/pages/operator/PharmaciesPage.tsx` (DataTable → BaseTable)
- `services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx` (커스텀 checkbox → BaseTable selectable)

작업: 컴포넌트 교체 + column 재정의 + state 타입 변경.

---

## 11. 우선 적용 대상 추천

### 최우선 (Phase 1, impact 높음)

1. **`ProductApprovalQueuePage`** (`apps/admin-dashboard/src/pages/neture/ProductApprovalQueuePage.tsx`)
   - 이유: WO-O4O-TABLE-STANDARD-ALIGNMENT-V1 **레퍼런스 페이지**로 명시되었으나 selection 없음. 모순.
   - 작업: selectable + ActionBar + batch-approve/batch-reject API 연결.

2. **`ContentApprovalsPage`** (`apps/admin-dashboard/src/pages/operator/ContentApprovalsPage.tsx`)
   - 이유: 콘텐츠 승인 운영 화면, bulk approve/reject 수요 높음.

3. **`HubContentsPage`** (`apps/admin-dashboard/src/pages/kpa/HubContentsPage.tsx`)
   - 이유: KPA HUB 핵심 콘텐츠 관리 화면, 다건 처리 필요.

### 차순위 (Phase 2)

4. **`EventOfferApprovalsPage`** (`services/web-k-cosmetics/src/pages/operator/EventOfferApprovalsPage.tsx`)
   - Raw HTML → BaseTable 전환 필요. Event Offer 도메인 canonical 부재.

---

## 12. 산출물 요약

| 구분 | 목록 |
|------|------|
| **Canonical 후보** (기준 페이지) | ContentManagementPage, OperatorLmsCoursesPage, OperatorForumPage, ProductApplicationManagementPage (web-kpa-society), OperatorProductApprovalPage (web-neture) |
| **Legacy 리스트** (개선 필요) | HubContentsPage, HubNoticeListPage, MyStoreContentsPage, ProductApprovalQueuePage, ContentApprovalsPage, OperatorsPage, ActiveUsers, EventOfferApprovalsPage (k-cosmetics), UsersPage/ApplicationsPage (k-cosmetics 일부) |
| **공통화 가능** | ActionBar, BulkResultModal, RowActionMenu, SelectionTable (미사용 활용 가능) |
| **공통화 불가** | Role guard, 서비스별 bulk action semantics, 서비스별 API endpoint |
| **Bulk API 존재** | Neture (batch-approve, batch-reject). 나머지는 Promise.all 개별 호출 |
| **Phase 1 우선 대상** | ProductApprovalQueuePage, ContentApprovalsPage, HubContentsPage, HubNoticeListPage |
| **Phase 3 고위험** | EventOfferApprovalsPage (Raw HTML), GlycoPharm UsersPage/PharmaciesPage (DataTable API 불일치) |

---

*조사 완료: 2026-05-07*  
*코드 수정 없음 — 조사 전용*
