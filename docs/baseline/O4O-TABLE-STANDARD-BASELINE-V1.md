# O4O BaseTable Standard v1.0

> **Status: FROZEN (Aspirational Standard)**
> **Date: 2026-04-28**
> **WO: WO-O4O-TABLE-STANDARD-BASELINE-V1**
> **Reference Implementation: `services/web-kpa-society/src/pages/operator/OperatorResourcesPage.tsx`**

---

## 0. Nature of this Baseline

This baseline defines the **target (aspirational) UI standard** for all list/table screens in the O4O platform.

**Existing pages may not comply yet** and must be aligned via separate work orders.

The reference implementation (OperatorResourcesPage) is the closest existing approximation but is itself non-compliant on three points (see §6 Compliance Gaps). The standard takes precedence over the reference.

---

## 1. Purpose

O4O 플랫폼의 모든 리스트/테이블 화면 구조를 단일 표준으로 통일한다.

본 문서는 다음을 확정한다:

1. 모든 리스트 화면은 동일한 4단 레이아웃을 따른다 (`FilterBar / ActionBar / DataTable / Pagination`)
2. 모든 DataTable은 selection / status / row action을 필수로 포함한다
3. 컬럼 순서는 고정된다 (변경 금지)
4. 카드형 리스트, 테이블 내부 필터, 상태 없는 리스트, row action 없는 구조는 금지된다
5. 모든 신규 리스트 화면은 본 표준을 준수해야 하며, 기존 화면은 별도 WO를 통해 정렬한다

---

## 2. Page Layout (Required)

```tsx
<Page>
  <FilterBar />     {/* 항상 표시 */}
  <ActionBar />     {/* 선택 row가 1개 이상일 때만 표시 */}
  <DataTable />
  <Pagination />    {/* total > pageSize일 때만 표시 */}
</Page>
```

| 영역 | 위치 | 표시 조건 |
|------|------|----------|
| FilterBar | 테이블 외부 상단 | 항상 |
| ActionBar | 테이블 외부 상단 (필터 아래) | 선택 row ≥ 1 |
| DataTable | 페이지 본문 | 항상 |
| Pagination | 테이블 외부 하단 | `total > pageSize` |

---

## 3. FilterBar (Required)

### 3.1 구성

- 검색 input (debounce 권장)
- 상태 필터 (status select)
- 도메인별 추가 필터 (예: source_type, role, organization)
- 검색 / 초기화 버튼

### 3.2 규칙

| 항목 | 규칙 |
|------|------|
| 위치 | 테이블 **외부 상단** (테이블 내부 필터 금지) |
| 서버 query 매핑 | 1:1 매핑 (필터 변경 시 `page=1` 리셋) |
| URL query 동기화 | 권장 (필수는 아님) |
| 필터 변경 동작 | `setPage(1) + fetch` |

---

## 4. ActionBar (Required)

### 4.1 구성

- 선택 개수 표시 (`N개 선택됨`)
- Bulk action 버튼 (삭제, 상태 변경, 도메인별 추가 액션)

### 4.2 규칙

| 항목 | 규칙 |
|------|------|
| 표시 조건 | 선택 row ≥ 1 |
| 위치 | FilterBar 아래, DataTable 위 |
| 기본 액션 | 삭제, 상태 변경 |
| 추가 액션 | 도메인별 허용 |
| 제거 | 금지 (기본 액션은 항상 존재) |

---

## 5. DataTable (Required)

### 5.1 컬럼 순서 (FIXED — 변경 금지)

```text
1. checkbox            (Selection)
2. main                (이름/제목 — 식별자)
3. meta                (보조 정보 — 0..N개)
4. status              (badge)
5. createdAt           (날짜)
6. actions             (RowActionMenu)
```

도메인별 컬럼은 `meta` 슬롯 내에서만 추가 가능. `status`, `createdAt`, `actions`의 위치는 절대 변경 금지.

### 5.2 Selection Column (Required)

- 헤더: 전체 선택 체크박스
- Row: 단일 선택 체크박스
- 상태: ActionBar의 표시 조건 트리거

### 5.3 Status Column (Required)

| 항목 | 규칙 |
|------|------|
| 존재 | 필수 (상태가 없는 리스트는 금지) |
| 표현 | Badge (텍스트만 표시 금지) |
| 색상 | 의미 기반 색상 매핑 필수 |

표준 색상 매핑:

| 상태 | 색상 |
|------|------|
| `published` / `active` / `approved` | green |
| `draft` / `pending` | gray / amber |
| `private` / `hidden` | slate |
| `archived` / `deleted` / `rejected` | red |

### 5.4 Row Action Column (Required)

| 항목 | 규칙 |
|------|------|
| 위치 | **마지막 컬럼 고정** |
| 컴포넌트 | `RowActionMenu` (`@o4o/ui`) |
| 트리거 아이콘 | `⋯` |
| 기본 액션 | 상세 보기, 수정, 삭제, 상태 변경 |
| 추가 | 도메인별 허용 |
| 제거 | 금지 (기본 액션은 항상 존재) |
| 액션 정의 방식 | `defineActionPolicy` + `buildRowActions` (`@o4o/operator-ux-core`) |

---

## 6. Pagination (Required)

| 항목 | 규칙 |
|------|------|
| 방식 | 서버 기반 pagination |
| 파라미터 | `page`, `limit`, `total` |
| 위치 | 테이블 외부 하단 |
| 표시 조건 | `total > pageSize` |
| 컴포넌트 | `Pagination` (`@o4o/operator-ux-core`) |

---

## 7. Forbidden Patterns

| # | 금지 패턴 | 이유 |
|---|----------|------|
| F1 | 카드형 리스트 (Card grid) | 일관성 파괴 |
| F2 | 테이블 내부 필터 | FilterBar 표준 위반 |
| F3 | 상태(status) 없는 리스트 | 운영 가시성 부족 |
| F4 | RowActionMenu 없는 리스트 | 단일 row 액션 경로 부재 |
| F5 | Status 텍스트만 표시 (badge 미사용) | 시각 인지성 저하 |
| F6 | 컬럼 순서 변경 | 표준 §5.1 위반 |
| F7 | Custom DataTable 직접 구현 | `@o4o/operator-ux-core DataTable` 필수 |

---

## 8. Required Components

| 용도 | 컴포넌트 | 패키지 |
|------|---------|--------|
| Table | `DataTable` | `@o4o/operator-ux-core` |
| Pagination | `Pagination` | `@o4o/operator-ux-core` |
| Action Policy | `defineActionPolicy`, `buildRowActions` | `@o4o/operator-ux-core` |
| Row Menu | `RowActionMenu` | `@o4o/ui` |
| Column Type | `ListColumnDef<T>` | `@o4o/operator-ux-core` |

> 참고: `@o4o/ui DataTable`(`Column<T>` 사용)은 별도 컴포넌트이며 본 표준의 대상이 아니다. 본 표준은 `@o4o/operator-ux-core DataTable`(`ListColumnDef<T>`)을 기준으로 한다.

---

## 9. Compliance Gaps (Reference Page)

Reference Implementation `OperatorResourcesPage`는 본 표준 대비 다음 3가지가 불일치:

| # | 항목 | 현재 상태 | 표준 요구 | 후속 WO |
|---|------|----------|----------|--------|
| C1 | Selection Column | 없음 | 필수 | `WO-KPA-OPERATOR-RESOURCES-TABLE-STANDARD-COMPLIANCE-V1` |
| C2 | ActionBar / Bulk Action | 없음 | 필수 | 동상 |
| C3 | 컬럼 순서 (`view_count`가 `created_at` 앞) | 비표준 | meta 슬롯 내로 이동 | 동상 |

---

## 10. Application Scope

본 표준은 다음 모든 영역에 동일하게 적용:

- Operator 화면 (`/operator/*`)
- Admin 화면 (`/admin/*`)
- Supplier 화면
- Store 관리 화면
- Content / Resources / LMS 리스트
- Forum / Signage 리스트

도메인 또는 서비스 별 변형 금지. 변경 필요 시 본 베이스라인을 통해서만 (별도 WO 승인).

---

## 11. Change Policy

본 베이스라인은 **Frozen**이다.

- 버그 수정 / 명확화 / 누락된 사례 추가 → 허용
- 컬럼 순서 / 필수 구성 변경 → 명시적 WO + 본 문서 갱신 필수
- 신규 화면은 본 표준에 따라 작성

---

## 12. Related Documents

| 영역 | 문서 |
|------|------|
| Operator Dashboard 표준 | `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` |
| HUB Template Standard | `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md` |
| Design Core Governance | `docs/rules/design-core-governance.md` |
| Operator OS Baseline | `docs/baseline/BASELINE-OPERATOR-OS-V1.md` |
| KPA UX Baseline | `docs/baseline/KPA_UX_BASELINE_V1.md` |

---

*Updated: 2026-04-28*
*Version: 1.0*
*Status: Frozen — Aspirational Standard*
