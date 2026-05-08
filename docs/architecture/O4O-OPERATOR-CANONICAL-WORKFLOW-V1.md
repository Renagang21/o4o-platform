# O4O Operator Canonical Workflow V1

> **Status: Baseline Locked**
> Verified through KPA Society (10 pages) and Neture (2 pages) operator implementations.
> This document records only what has been built and confirmed — no speculative extensions.

---

## 1. 목적 및 배경

### O4O Operator UX 방향

O4O operator 콘솔은 "목록 유지형 운영 콘솔" 철학을 따른다.

운영자는 다음 작업을 반복적으로 수행한다:
- 대량의 항목을 스캔하며 상태 확인
- 개별 항목을 빠르게 검토하고 승인/반려/처리
- 여러 항목을 한 번에 처리 (bulk action)
- 처리 후 목록으로 즉시 복귀

이 흐름에서 **page navigation은 운영 효율을 낮춘다**. 페이지를 이동할 때마다 이전 스크롤 위치, 필터, 선택 상태가 초기화되기 때문이다.

### "목록 유지형" vs "page navigation CRUD"

| 구분 | 목록 유지형 (Canonical) | Page Navigation CRUD |
|------|------------------------|---------------------|
| 상세 보기 | 우측 Drawer slide-in | 별도 상세 페이지 이동 |
| 처리 후 복귀 | 목록 상태 유지 (스크롤·필터·선택) | 뒤로가기 필요 |
| 운영 흐름 | 항목 간 빠른 이동 가능 | 매번 목록 재로드 |
| 적합한 대상 | moderation, approval queue, list-based ops | 복잡한 multi-step form, full editor, analytics |

---

## 2. Canonical Interaction Hierarchy

아래 4계층이 O4O operator canonical interaction 구조이다.

```
1. checkbox → bulk action (ActionBar)
2. row click → detail drawer (BaseDetailDrawer)
3. RowActionMenu → secondary / destructive action
4. route 이동 → drawer 내부 링크 (optional)
```

### 계층별 역할

**1. Checkbox → Bulk Action**
- 여러 항목 선택 후 일괄 처리 (approve/reject/delete/activate 등)
- `DataTable selectable` prop으로 checkbox UI 자동 처리
- `ActionBar` 컴포넌트: 선택 수 표시 + bulk action 버튼 그룹
- bulk action 실행 후: 선택 초기화 + 목록 갱신 (페이지 이동 없음)

**2. Row Click → Detail Drawer**
- 단일 항목 클릭 시 `BaseDetailDrawer` slide-in
- 목록 상태 유지: 스크롤, 필터, 선택 상태 변하지 않음
- Drawer: 항목의 메타데이터 조회 + 주요 workflow action (footer)
- ESC / overlay click → drawer close (목록 복귀)

**3. RowActionMenu → Secondary / Destructive**
- hover 시 우측에 나타나는 "⋮" 메뉴
- `RowActionMenu` + `defineActionPolicy` + `buildRowActions` 조합
- 역할: row click보다 덜 사용하는 secondary action, destructive action
- **절대 원칙: 상세 보기를 RowActionMenu 안에 넣지 않는다** (row click이 담당)

**4. Route 이동 → Drawer 내부 링크**
- Drawer 안에 "전체 편집", "상세 페이지" 링크를 옵션으로 제공
- 외부 라우트 이동이 필요한 경우에만 사용
- 목록 이탈이 아닌 "심층 편집" 진입점 역할

---

## 3. BaseTable / DataTable Canonical Usage

### selectable

DataTable의 `selectable` prop을 사용한다. **수동 checkbox 컬럼(`_select`) 구현 금지.**

```tsx
<DataTable
  selectable
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  onRowClick={(row) => setSelectedItem(row)}
  ...
/>
```

### onRowClick

- 모든 moderation/approval 성격 목록 페이지에 `onRowClick` 연결 필수
- `onRowClick` → `setSelectedItem(row)` → `BaseDetailDrawer` open
- `_actions` 컬럼(RowActionMenu)은 `onCellClick: () => {}` 로 row click 이벤트 차단

### hover / cursor 동작

DataTable이 `onRowClick` 있을 때 자동으로 `cursor-pointer` + hover 스타일 적용.
별도 CSS 처리 불필요.

### 상태 유지 원칙

drawer open/close 시 아래 상태를 유지한다:
- 현재 페이지 번호
- 필터 상태 (status tab, search, date range 등)
- scroll 위치
- 선택(selectedIds) 상태

drawer close 후 목록을 자동으로 scroll top 이동하거나 필터를 초기화하지 않는다.

### Bulk action 후 처리

bulk action 성공 후:
1. `selectedIds` 초기화
2. 현재 필터·페이지 상태 유지하며 목록 재조회 (`fetchOffers(page)`)
3. `BulkResultModal` 또는 `toast` 로 결과 표시

---

## 4. BaseDetailDrawer Usage Standard

### 기본 구조

```tsx
<BaseDetailDrawer
  open={!!selectedItem}
  onClose={() => setSelectedItem(null)}
  title={selectedItem?.name ?? ''}
  width={520}           // 기본 520px, 복잡한 내용은 560px까지 허용
  actions={[...]}       // footer actions (optional)
>
  {selectedItem && (
    <div>
      {/* 메타데이터 렌더링 */}
    </div>
  )}
</BaseDetailDrawer>
```

### Footer actions 위치 기준

| action 유형 | 위치 |
|------------|------|
| 주요 workflow (approve/reject) | `actions` prop → drawer footer |
| 수정/편집 (primary) | `actions` prop → `variant: 'primary'` |
| 일반 보조 | `actions` prop → `variant: 'default'` |
| destructive (삭제) | **RowActionMenu** (drawer footer X) |

**원칙**: destructive action (삭제, 강제 종료 등)은 drawer footer에 넣지 않는다. RowActionMenu가 담당.

### close 정책

- `onClose`: `setSelectedItem(null)` — drawer 닫기만, 목록 재조회 없음
- 목록 갱신이 필요한 경우(approve/reject 후): action handler 내에서 `fetchData()` → `setSelectedItem(null)` 순서로 처리

### metadata layout

```tsx
{[
  { label: '공급사', value: item.supplierName || '-' },
  { label: '상태', value: statusLabel },
  { label: '등록일', value: formatDate(item.createdAt) },
].map((item) => (
  <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
    <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70, flexShrink: 0 }}>{item.label}</span>
    <span style={{ color: '#1e293b' }}>{item.value}</span>
  </div>
))}
```

인라인 스타일 패턴을 사용한다. Tailwind className도 허용이나 일관성 유지.

### width 선택 기준

| 내용 | width |
|------|-------|
| 단순 메타데이터 + 상태 | 480px |
| 표준 메타데이터 + 서비스 현황 | 520px |
| 긴 텍스트(사유·코멘트 포함) + workflow | 560px |

---

## 5. RowActionMenu 역할 정의

### 담당 범위

```
RowActionMenu = secondary action + destructive action
```

### 적용 원칙

1. **상세 보기 금지**: "상세 보기" / "미리보기" 를 RowActionMenu에 넣지 않는다. row click이 담당.
2. **primary workflow 금지**: 승인/반려 같은 주요 workflow는 drawer footer에 위치. RowActionMenu는 보조 진입점.
3. **destructive는 RowActionMenu**: 삭제, 강제 비활성화, 영구 취소 등 되돌리기 어려운 작업만 담당.
4. **confirm 내장**: `defineActionPolicy` rule의 `confirm` 속성으로 실행 전 확인 dialog를 자동 처리.

### 구현 패턴

```tsx
// Policy 정의 (컴포넌트 외부)
const myPolicy = defineActionPolicy<MyItem>('service:entity', {
  inlineMax: 2,
  rules: [
    { key: 'approve', label: '승인', variant: 'primary', visible: (row) => row.status === 'pending', ... },
    { key: 'reject', label: '반려', variant: 'danger', visible: (row) => row.status === 'pending', ... },
    { key: 'delete', label: '삭제', variant: 'danger', visible: () => true, confirm: ... },
  ],
});

// 컬럼 render
render: (_v, row) => (
  <RowActionMenu
    actions={buildRowActions(myPolicy, row, {
      approve: () => handleApprove(row),
      reject: (reason) => handleReject(row, reason),
      delete: () => handleDelete(row),
    }, { icons: ACTION_ICONS })}
  />
)
```

`inlineMax: 2` — inline 최대 2개, 초과분은 overflow 메뉴.

---

## 6. Canonical 적용 완료 페이지

### KPA Society (`services/web-kpa-society`)

| 페이지 | 파일명 | 적용 내용 |
|--------|--------|-----------|
| 자격증 신청 | `QualificationRequestsPage.tsx` | row click → BaseDetailDrawer (검토 + 승인/반려) |
| 회원 목록 | `UsersPage.tsx` | row click → BaseDetailDrawer (회원 정보) |
| 회원 관리 | `MemberManagementPage.tsx` | row click → BaseDetailDrawer (멤버십 정보) |
| 약국 신청 | `PharmacyRequestManagementPage.tsx` | row click → BaseDetailDrawer (신청 검토) |
| 상품 신청 | `ProductApplicationManagementPage.tsx` | row click → BaseDetailDrawer (상품 검토) |
| LMS 강좌 | `OperatorLmsCoursesPage.tsx` | row click → BaseDetailDrawer (강좌 정보) |
| 자료실 | `OperatorResourcesPage.tsx` | row click → BaseDetailDrawer (자료 정보) |
| 콘텐츠 관리 | `ContentManagementPage.tsx` | row click → BaseDetailDrawer (+ 수정 action) |
| 포럼 관리 | `ForumManagementPage.tsx` | row click → BaseDetailDrawer (승인/반려/재생성) |
| 삭제 요청 | `ForumDeleteRequestsPage.tsx` | row click → BaseDetailDrawer (승인/반려) |

### Neture (`services/web-neture`)

| 페이지 | 파일명 | 적용 내용 |
|--------|--------|-----------|
| 상품 승인 | `OperatorProductApprovalPage.tsx` | row click → `ProductDetailDrawer` (rich drawer, approvalActions) |
| 전체 상품 | `AllRegisteredProductsPage.tsx` | row click → BaseDetailDrawer (메타데이터 + 서비스 노출) |

> **Neture 특이사항**: `OperatorProductApprovalPage`는 `ProductDetailDrawer`(공급사 전용 rich drawer)를 operator approval context로 재사용. `approvalActions` prop으로 approve/reject footer 추가. `BaseDetailDrawer`보다 rich하지만 동일한 계층 구조를 따름.

---

## 7. 적용 제외 케이스

아래 유형의 페이지는 canonical drawer 패턴 적용 대상이 아니다.

### Analytics / Dashboard

예: `AnalyticsPage`, `ForumAnalyticsDashboard`, `OperatorAiReportPage`

이유: 단순 데이터 조회 중심. 항목 moderation workflow가 없음. KPI 카드, 차트 기반 레이아웃.

### Multi-step Workflow

예: `MarketTrialApprovalsPage` (→ `MarketTrialApprovalDetailPage` navigate)

이유: Trial 승인은 탭 구조 + 여러 단계의 상태 변경이 필요. 별도 상세 페이지가 적합.

### Full Editor

예: `WorkingContentEditPage`

이유: 에디터 자체가 full-page 레이아웃을 요구. Drawer에 담을 수 없음.

### User Detail (routing)

예: `UsersManagementPage` (Neture), `OperatorStoresPage` (KPA), `OperatorForumPage` (KPA)

이유: User/Store/Forum 상세는 별도 경로(`/operator/users/:id`)로 관리됨. 상세 내용이 drawer에 담기에 너무 많거나 독립 URL이 필요한 경우.

### 판단 기준 요약

| 조건 | Drawer 적용 | Route 이동 |
|------|:----------:|:---------:|
| moderation / approval queue 성격 | ✅ | |
| 목록에서 빠른 처리가 핵심 | ✅ | |
| 상세 내용이 metadata 수준 | ✅ | |
| 복잡한 multi-step form | | ✅ |
| 독립 URL이 필요 (bookmark, 공유) | | ✅ |
| Full editor 레이아웃 | | ✅ |

---

## 8. 현재 결론

### 확정된 결론

**`BaseDetailDrawer` + `DataTable selectable` 조합으로 충분하다.**

추가 abstraction, `operator-ui` 패키지 분리, generalized workflow engine 등은 현시점에서 불필요하다.

| 항목 | 결론 |
|------|------|
| 별도 operator-ui 패키지 | 불필요 |
| generalized approval engine | 불필요 |
| drawer content 공통화 | 불필요 (서비스별 차이 허용) |
| 추가 abstraction layer | 금지 (복잡도만 증가) |

### 허용되는 차이

서비스별 drawer content의 차이는 의도된 것이다:
- KPA: 단순 메타데이터 위주
- Neture OperatorProductApproval: `ProductDetailDrawer` — B2C/B2B 설명, 이미지, 태그, 스팟가격 포함 (공급사 워크플로우와 통합)
- AllRegisteredProducts: 이미지 + 기본 메타데이터 + 서비스 노출 현황

이 차이를 하나의 공통 컴포넌트로 합치려는 시도는 금지한다.

### 이후 적용 가능한 서비스

아래 서비스의 operator 페이지 신규 개발 시 이 문서를 기준으로 한다:

| 서비스 | 현재 상태 | Canonical 적용 대상 예시 |
|--------|-----------|------------------------|
| **GlycoPharm** | operator pages 미구현 | 회원 신청, 포럼 관리, 상품 승인 |
| **K-Cosmetics** | operator pages 미구현 | 파트너 신청, 상품 관리 |
| **KPA (신규)** | 기존 10개 완료 | 추가 moderation 페이지 |
| **Neture (신규)** | 기존 2개 완료 | ProductServiceApprovalPage 리팩토링 등 |

---

## 부록: 핵심 Import 목록

```tsx
// Drawer
import { BaseDetailDrawer } from '@o4o/ui';

// Table
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

// Bulk UI
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
```

---

*Created: 2026-05-08*
*Based on: KPA Society 10 pages + Neture 2 pages production verification*
*Version: V1 (Baseline Locked)*
