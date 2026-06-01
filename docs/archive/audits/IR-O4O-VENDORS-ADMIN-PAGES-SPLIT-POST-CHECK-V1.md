# IR-O4O-VENDORS-ADMIN-PAGES-SPLIT-POST-CHECK-V1

> **WO-O4O-VENDORS-ADMIN-PAGES-SPLIT-V1 사후 점검 보고서**
> 브랜치: `feature/vendors-admin-split` | 커밋: `9dee85327`
> 점검일: 2026-03-22

---

## 1. 분해 결과 요약

| # | 파일 | 줄 수 | 역할 |
|---|------|-------|------|
| 1 | `VendorsAdmin.tsx` | 286 | Container (breadcrumb + tabs + toolbar + table mount) |
| 2 | `vendors-admin/vendors-admin-types.ts` | 28 | Type definitions |
| 3 | `vendors-admin/useVendorsAdmin.tsx` | 432 | Hook (state + handlers + fetch + filter/sort) |
| 4 | `vendors-admin/VendorsScreenOptions.tsx` | 129 | Column visibility + pagination |
| 5 | `vendors-admin/VendorsTable.tsx` | 436 | Table + inline quick edit + hover actions |
| 6 | `VendorsCommissionAdmin.tsx` | 212 | Container (breadcrumb + tabs + controls + table mount) |
| 7 | `vendors-commission/vendors-commission-types.ts` | 27 | Type definitions |
| 8 | `vendors-commission/useVendorsCommission.tsx` | 355 | Hook (state + handlers + fetch + filter/sort) |
| 9 | `vendors-commission/CommissionSummaryCards.tsx` | 60 | 4 stat cards |
| 10 | `vendors-commission/CommissionScreenOptions.tsx` | 115 | Column visibility + pagination |
| 11 | `vendors-commission/CommissionTable.tsx` | 585 | Table + rate edit + expanded details + CSS |
| | **합계** | **2,665** | |

원본: VendorsAdmin.tsx (1,078줄) + VendorsCommissionAdmin.tsx (1,162줄) = **2,240줄**
분해 후: 11개 파일, **2,665줄** (types + headers + props interface 추가로 +425줄)

---

## 2. Container 안전성 점검

### VendorsAdmin.tsx (286줄)

| 항목 | 결과 |
|------|------|
| 비즈니스 로직 | 없음 — `useVendorsAdmin()` hook으로 전량 위임 |
| API 호출 | 없음 |
| 상태 관리 | 없음 — hook에서 반환된 값만 소비 |
| JSX 구성 | breadcrumb + header + status tabs + bulk actions dropdown + search + VendorsTable + bottom actions |
| default export | 보존 |

286줄은 계획(~170줄)보다 크지만, 순수 레이아웃 JSX만 존재. bulk actions dropdown과 status tabs가 container에 남아있어 줄 수가 늘어남. **분리 불필요.**

### VendorsCommissionAdmin.tsx (212줄)

| 항목 | 결과 |
|------|------|
| 비즈니스 로직 | 없음 |
| API 호출 | 없음 |
| 상태 관리 | 없음 |
| JSX 구성 | breadcrumb + header + CommissionScreenOptions + CommissionSummaryCards + tabs + controls + CommissionTable + bottom nav |
| default export | 보존 |
| 관찰사항 | `onItemsPerPageChange` 콜백에 인라인 `localStorage.setItem` (원본 그대로 보존) |

212줄은 계획(~150줄)과 근접. 순수 container. **안전.**

**Container 판정: PASS**

---

## 3. Hook 책임 분리 점검

### useVendorsAdmin.tsx (432줄)

| 영역 | Lines | 내용 |
|------|-------|------|
| State declarations | 30-72 | 15 useState + 1 useRef |
| Effects | 75-140 | fetch (authClient.api.get) + 4 sync effects |
| Column/Display handlers | 142-159 | handleColumnToggle, handleItemsPerPageChange |
| Selection handlers | 162-178 | handleSelectAll, handleSelectVendor |
| Navigation handlers | 180-191 | handleAddNew, handleEdit, handleView |
| Quick edit handlers | 194-238 | handleQuickEdit, handleSaveQuickEdit, handleCancelQuickEdit |
| Status action handlers | 240-282 | handleApprove/Suspend/Trash/Restore/PermanentDelete |
| Bulk action handler | 284-319 | handleApplyBulkAction |
| Sort handler | 321-329 | handleSort |
| Filter/sort logic | 332-384 | getFilteredVendors (tab + search + sort + pagination) |
| Status counts | 386-393 | getStatusCounts |
| Tier badge (JSX) | 395-403 | getTierBadge — JSX 반환 (→ .tsx 확장자 필요) |
| Return | 405-432 | 30+ exports |

**분석:**
- 단일 도메인 (vendor list management) — 모든 state가 동일 데이터에 대한 조회/조작
- 18개 handler는 각각 독립적이고 단순 (상태 변경 + toast)
- `getFilteredVendors()`는 tab/search/sort/pagination을 결합하는 핵심 computed — hook에 위치하는 것이 자연스러움
- `getTierBadge()`는 JSX를 반환하는 render helper (7줄) — 별도 유틸로 추출 가능하나 단독 사용처
- Status action handlers (~100줄, lines 240-319)를 추출하면 vendors state setter 의존으로 오히려 복잡도 증가

**판정: Acceptable orchestration hook. God-hook 아님.**

### useVendorsCommission.tsx (355줄)

| 영역 | Lines | 내용 |
|------|-------|------|
| Module-level helpers | 32-42 | getCurrentPeriod, getDefaultDueDate (순수 함수) |
| State declarations | 45-77 | 14 useState + 2 useRef |
| Effects | 80-127 | fetch (period 의존) + 2 session sync effects |
| Filter/sort logic | 130-176 | getFilteredCommissions |
| Summary calculation | 179-187 | calculateSummary |
| Handlers | 190-298 | sort/select/bulk/rateEdit/pay/toggleExpansion/toggleColumn |
| Status badge (JSX) | 300-317 | getStatusBadge — JSX with lucide icons |
| Tab counts | 320-328 | getTabCounts |
| Return | 330-355 | 25+ exports |

**분석:**
- 단일 도메인 (commission management)
- 355줄은 orchestration hook으로 적절한 범위
- `getStatusBadge()`는 icon import + JSX 반환 (17줄) — hook에 위치하지만 VendorsTable에서 `getTierBadge`와 동일 패턴
- `calculateSummary()`는 `getFilteredCommissions()`에 의존 — hook 내부 위치가 자연스러움

**판정: Acceptable orchestration hook. God-hook 아님.**

**Hook 판정: PASS**

---

## 4. Table/Component 책임 분리 점검

### Small Components (PASS)

| 컴포넌트 | 줄 수 | 판정 |
|---------|-------|------|
| `VendorsScreenOptions.tsx` | 129 | Props-only, 내부 상태 없음, 단일 책임 |
| `CommissionScreenOptions.tsx` | 115 | Props-only, 내부 상태 없음, 단일 책임 |
| `CommissionSummaryCards.tsx` | 60 | Props-only, 4개 stat card 렌더링 |
| `vendors-admin-types.ts` | 28 | 순수 타입 정의 |
| `vendors-commission-types.ts` | 27 | 순수 타입 정의 |

모든 소형 컴포넌트는 props-only 패턴, 내부 상태 없음, 단일 책임 준수.

---

## 5. CommissionTable / VendorsTable 별도 판단

### VendorsTable.tsx (436줄)

| 영역 | 줄 수 | 내용 |
|------|-------|------|
| Props interface | ~28 | 25+ props (typed with VendorStatus, Vendor['tier']) |
| Table header | ~70 | 체크박스 + 9개 컬럼 (3개 sortable) |
| Quick edit row | ~65 | 4 필드 inline edit (businessName, status, tier, commission) |
| Normal row | ~195 | 체크박스 + avatar + vendor info + hover actions + 8개 데이터 컬럼 |
| Empty state | ~6 | AlertCircle + 메시지 |

**분석:**
- 436줄은 table rendering 전용
- Quick edit row와 normal row는 동일 Vendor 데이터 계약 공유
- Hover actions는 vendor.status에 따라 조건부 렌더링 (trash→복원/영구삭제, active→정지, pending→승인)
- 분할 시 QuickEditRow + VendorRow 추출 가능하나 동일 props 전달 반복으로 복잡도만 증가
- ContentBlockEditors.tsx (595줄, accepted precedent)와 유사한 구조

**판정: 추가 분할 불필요. 응집된 테이블 컴포넌트.**

### CommissionTable.tsx (585줄)

| 영역 | 줄 수 | 내용 |
|------|-------|------|
| Props interface | ~18 | 15 props |
| Empty state | ~5 | 간단한 메시지 |
| Table header | ~100 | 체크박스 + 9개 컬럼 (5개 sortable) |
| Row rendering | ~215 | vendor info + row actions + period + sales + rate edit + amount + status + dates + bank + expand button |
| Expanded details | ~75 | 4개 detail section (수수료 계산, 지급 정보, 관련 문서, 메모) + action buttons |
| Embedded CSS | ~195 | `<style>` 태그 내 50+ CSS rules |

**분석:**
- 실제 JSX 로직: ~390줄 (CSS 제외)
- CSS 195줄은 이 컴포넌트 + CommissionSummaryCards가 사용하는 클래스 정의 (아래 관찰사항 참조)
- 390줄 JSX는 table + inline editing + expanded details로서 응집된 범위
- expanded details를 별도 추출하면 ~75줄 절약되나, commission 데이터 전체 + handler 3개를 prop으로 전달해야 함
- ContentBlockEditors.tsx (595줄)와 동일 논리로 수용

**판정: 추가 분할 불필요. 단, CSS 관련 관찰사항 존재 (아래 참조).**

---

## 6. Dead Code / Orphan / UI-API 정합성

### Dead Code

| 점검 항목 | 결과 |
|----------|------|
| 미사용 import | 없음 |
| 미사용 export | 없음 — 모든 export는 container에서 소비 |
| 주석 처리된 코드 | 없음 |
| 미사용 타입 | 없음 |

### Orphan 파일

| 점검 항목 | 결과 |
|----------|------|
| 원본 VendorsAdmin.tsx | container로 교체됨 (원본 삭제 완료) |
| 원본 VendorsCommissionAdmin.tsx | container로 교체됨 (원본 삭제 완료) |
| 기타 orphan | 없음 |

### UI-API 정합성

| API 호출 | 위치 | 원본 대비 |
|---------|------|----------|
| `authClient.api.get('/vendors')` | useVendorsAdmin.tsx:80 | 동일 |
| `authClient.api.get('/vendors/commissions?period=...')` | useVendorsCommission.tsx:85 | 동일 |

- 응답 transform 로직 원본 그대로 보존
- 에러 처리 패턴 (toast.error + setEmpty) 보존
- sessionStorage/localStorage 키 이름 및 동작 보존

### Route/Import 정합성

- VendorsAdmin, VendorsCommissionAdmin 모두 main route 파일에 등록되지 않은 standalone 페이지
- default export 보존됨 — 어떤 방식으로 import되든 호환
- VendorsPendingAdmin.tsx는 별도 파일로 이미 분리되어 있으며, 이번 작업 대상 아님

**정합성 판정: PASS**

---

## 7. 관찰사항 (Findings)

### F1. CSS 교차 의존 (Severity: Low)

**위치:** CommissionTable.tsx `<style>` 블록 (lines 389-428)
**내용:** CommissionSummaryCards.tsx에서 사용하는 CSS 클래스들이 CommissionTable.tsx의 `<style>` 태그에 정의됨:

```
.o4o-stats-cards   → CommissionSummaryCards.tsx:21
.stats-card        → CommissionSummaryCards.tsx:22
.stats-icon        → CommissionSummaryCards.tsx:23
.stats-content     → CommissionSummaryCards.tsx:26
.stats-label       → CommissionSummaryCards.tsx:27
.stats-value       → CommissionSummaryCards.tsx:28
```

원본에서는 동일 파일 내에 있었으므로 문제 없었지만, 분해 후 CommissionSummaryCards는 CommissionTable이 같은 페이지에 렌더링되어야 CSS가 적용됨.

**현재 영향:** 없음 — VendorsCommissionAdmin container가 항상 둘을 함께 렌더링
**위험:** CommissionSummaryCards를 독립 사용하면 스타일 누락

**권장 조치:** 즉시 조치 불필요. 향후 CSS 모듈화 시 `.o4o-stats-cards` 관련 CSS를 CommissionSummaryCards로 이동 또는 공유 CSS 파일 추출.

### F2. Hook 내 JSX 반환 함수 (Severity: Info)

**위치:** useVendorsAdmin.tsx:395 (`getTierBadge`), useVendorsCommission.tsx:300 (`getStatusBadge`)
**내용:** 두 hook 모두 JSX를 반환하는 render helper를 포함. 이로 인해 `.tsx` 확장자 필요.

**현재 영향:** 없음 — 정상 동작
**대안:** `getTierBadge`를 VendorsTable 내부로, `getStatusBadge`를 CommissionTable 내부로 이동하면 hook이 순수 `.ts`가 될 수 있으나, 현재 container에서 prop으로 전달하는 구조가 기존 패턴과 일치하므로 변경 불필요.

### F3. Container 내 localStorage 직접 사용 (Severity: Info)

**위치:** VendorsCommissionAdmin.tsx:91-94
```tsx
onItemsPerPageChange={(value) => {
  setItemsPerPage(value);
  localStorage.setItem('commission-per-page', value.toString());
}}
```

**내용:** useVendorsCommission hook은 itemsPerPage에 대한 localStorage sync useEffect가 없음 (useVendorsAdmin hook에는 있음). 원본 VendorsCommissionAdmin.tsx에서도 inline이었으므로 동작 보존.

**현재 영향:** 없음
**비고:** 두 페이지 간 persistence 패턴 약간 비대칭 (VendorsAdmin: useEffect sync / VendorsCommission: inline). 기능은 동일.

---

## 8. Oversized 잔존 점검

| 파일 | 줄 수 | 400줄+ | 판정 |
|------|-------|--------|------|
| CommissionTable.tsx | 585 | YES | CSS 195줄 포함. JSX 390줄. 테이블+inline edit+expanded details. **수용** |
| VendorsTable.tsx | 436 | YES | 테이블+quick edit+hover actions. **수용** |
| useVendorsAdmin.tsx | 432 | YES | 단일 도메인 orchestration hook. **수용** |
| useVendorsCommission.tsx | 355 | NO | - |

400줄 초과 파일 3개 모두 응집된 단일 책임 구조. 추가 분할 시 복잡도 증가 > 가독성 이득.

**Oversized 판정: 신규 god-component/god-hook 없음. PASS.**

---

## 9. 최종 판정

| 점검 항목 | 결과 |
|----------|------|
| Container 안전성 | PASS |
| Hook 책임 분리 | PASS |
| Table/Component 책임 | PASS |
| CommissionTable/VendorsTable 별도 판단 | PASS — 추가 분할 불필요 |
| Dead code / Orphan | PASS |
| UI-API 정합성 | PASS |
| Oversized 잔존 | PASS — 신규 god-component 없음 |
| default export 보존 | PASS |
| Route 호환성 | PASS |
| sessionStorage/localStorage 보존 | PASS |

**관찰사항 3건 (F1, F2, F3):** 모두 Low/Info 수준. 즉시 조치 불필요.

---

## 10. 권장 다음 단계

### 즉시 가능: main merge

이 분해는 안전하며, 기능 변경 없이 구조만 개선됨.
`feature/vendors-admin-split` → `main` merge 가능.

### 선택적 후속 작업 (별도 WO)

| 우선순위 | 작업 | 예상 영향 |
|---------|------|----------|
| Low | F1 CSS 교차 의존 해소 — stats-cards CSS를 CommissionSummaryCards.tsx 또는 공유 CSS 파일로 이동 | ~20줄 이동 |
| Low | F3 localStorage 패턴 통일 — useVendorsCommission hook에 itemsPerPage useEffect 추가 | ~5줄 추가 |

두 작업 모두 기능 변경 없는 미세 정리이며, 별도 WO 없이 다음 vendors 관련 작업 시 포함 가능.

---

*Generated: 2026-03-22*
*Investigator: Claude Code*
*Branch: feature/vendors-admin-split*
*Commit: 9dee85327*
