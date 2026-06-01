# IR-O4O-STORE-ASSET-POLICY-CORE-DATATABLE-V1

> **조사 일자**: 2026-05-26  
> **목적**: `@o4o/store-asset-policy-core.StoreAssetsPanel` 목록 UI O4O 표준 테이블 전환 가능성 조사  
> **결과**: 코드 변경 없음 (IR 전용)

---

## 1. 핵심 발견 요약

**StoreAssetsPanel 은 카드형 UI가 아니다.**  
이미 `@o4o/ui BaseTable` 을 사용하고 있다. DataTable 패키지 교체가 아니라, **BaseTable 의 내장 rowSelection 활성화 + ActionBar 추가**가 이번 WO 의 실제 과제다.

추가 발견: BaseTable 은 이미 `selectable / selectedKeys / onSelectionChange` 를 지원한다. 이를 활성화하면 별도 DataTable 마이그레이션 없이 checkbox 선택을 얻을 수 있다.

---

## 2. 패키지 구조

```
packages/store-asset-policy-core/src/
  components/
    StoreAssetsPanel.tsx     — 메인 오케스트레이터
    assetColumns.tsx         — O4OColumn<StoreAssetItem>[] 정의 (ForcedSection/Regular 공유)
    ForcedSection.tsx        — HQ_FORCED 항목 핀 섹션 (red border)
    PolicyFilterBar.tsx      — 상태/정책/채널 필터 바
    LifecycleStatusPill.tsx
    SnapshotTypeBadge.tsx
```

### StoreAssetsPanel 내부 렌더링 구조

```
StoreAssetsPanel
  ├─ KPI Cards (홈/사이니지/프로모션/강제노출 건수)
  ├─ Tabs (전체 / CMS 콘텐츠 / 사이니지)
  ├─ PolicyFilterBar (상태/정책/채널/정렬 필터)
  ├─ Forced expiry banner
  ├─ ForcedSection (BaseTable — red border, HQ locked)
  └─ Regular section (BaseTable — normal styling, paginated)
       └─ pagination (커스텀 버튼)
```

---

## 3. 서비스별 사용 현황

| 서비스 | StoreAssetsPanel 사용 | StoreAssetsPage 파일 | 비고 |
|--------|----------------------|---------------------|------|
| **KPA Society** | ✅ | `pages/pharmacy/StoreAssetsPage.tsx` | `/store/content` route |
| **GlycoPharm** | ✅ | `pages/store/StoreAssetsPage.tsx` | `/store/content` route |
| **K-Cosmetics** | ❌ | 없음 | types만 import 사용 |

**결론**: 패키지 변경 시 KPA + GlycoPharm 두 서비스에 영향. K-Cosmetics 무관.

---

## 4. 현재 열 정의 체계 — O4OColumn

`assetColumns.tsx` 는 `O4OColumn<StoreAssetItem>[]` 을 반환한다.

```typescript
import type { O4OColumn } from '@o4o/ui';

export function getAssetColumns(...): O4OColumn<StoreAssetItem>[] {
  return [
    { key: 'snapshotType', header: '종류', render: ... },
    { key: 'assetType',    header: '유형', render: ... },
    { key: 'title',        header: '제목', render: ... },
    { key: 'publishStatus',header: '상태', width: '6rem', render: ... },  // clickable toggle
    { key: 'createdAt',    header: '복사일', width: '7rem', render: ... },
    { key: '_action',      header: '', system: 'last', width: '4rem', render: ... },  // 편집 버튼
  ];
}
```

**O4OColumn 특징** (Column<T>와 다른 점):
- `header: ReactNode` (Column<T>는 `title: string`)
- `system?: boolean | 'last'` — 액션 컬럼을 항상 마지막 고정 (`system: 'last'`)
- `sortAccessor?: (row: T) => ...` — 직접 정렬 추출 함수

**DataTable(Column<T>) 마이그레이션 필요성 없음**: 이미 BaseTable + O4OColumn 조합이 최적이다.  
`Column<T> → O4OColumn<T>` 으로의 변환보다 BaseTable의 내장 selection 활성화가 더 단순하다.

---

## 5. BaseTable 내장 rowSelection 지원

`packages/ui/src/components/table/types.ts` (BaseTableProps):

```typescript
// WO-O4O-BASETABLE-SELECTION-COLUMN-STICKY-AND-SELECT-ALL-V1
selectable?: boolean;                                    // 선택 체크박스 활성화
selectedKeys?: Set<string>;                             // 선택 키 목록
onSelectionChange?: (keys: Set<string>) => void;        // 선택 변경 콜백
```

헤더에 select-all 체크박스가 자동 생성된다 (key='_select' 컬럼).  
**결론**: `DataTable<T>` 로 마이그레이션 없이 BaseTable 의 기존 API로 checkbox 선택 가능.

---

## 6. 선택 영역 분리 원칙

| 섹션 | 선택 허용 | 이유 |
|------|----------|------|
| **ForcedSection** (HQ_FORCED, active) | ❌ | `isForced=true` 항목은 상태 변경 불가 (canToggleStatus=false). 선택 혼란 방지 |
| **Regular section** (pagedItems) | ✅ | 상태 변경 가능 항목. bulk status 변경 대상 |

→ `ForcedSection.tsx` 는 변경하지 않는다.  
→ Regular section 의 BaseTable 에만 `selectable + selectedKeys + onSelectionChange` 추가.

---

## 7. bulk action 요구사항 정의

### 현재 단건 API

```typescript
storeAssetControlApi.updatePublishStatus(id: string, status: AssetPublishStatus): Promise<...>
// AssetPublishStatus = 'draft' | 'published' | 'hidden'
```

### 제안 bulk action (fan-out 가능)

| 액션 | 구현 방식 | 포함 여부 |
|------|----------|----------|
| **선택 게시** | `Promise.allSettled(ids.map(id => api.updatePublishStatus(id, 'published')))` | ✅ 1차 포함 |
| **선택 숨김** | `Promise.allSettled(ids.map(id => api.updatePublishStatus(id, 'hidden')))` | ✅ 1차 포함 |
| **선택 초안** | `Promise.allSettled(ids.map(id => api.updatePublishStatus(id, 'draft')))` | ✅ 1차 포함 |

주의: 단건 `onToggleStatus` 는 cycle (`draft→published→hidden`) 방식이지만,  
bulk 는 **명시적 상태 지정** 방식이어야 한다. ActionBar 버튼 3개로 구성.

isForced 항목이 선택에 포함된 경우: API 호출 전 필터로 제외 (서버가 reject하더라도 클라이언트 방어).

### 보류 bulk action

| 액션 | 이유 |
|------|------|
| 선택 삭제 | 현재 삭제 API 미확인 (publish status = 'hidden'이 soft-delete 역할) |
| 선택 강제노출 | HQ 관리자 영역 — 운영자 권한 없음 |

---

## 8. 표준화 옵션 비교

### Option A — BaseTable 내장 selection 활성화 (권장)

**변경 범위**:

```
StoreAssetsPanel.tsx
  + selectedRegularKeys: Set<string> state
  + selectable / selectedKeys / onSelectionChange → Regular BaseTable 에만 적용
  + ActionBar (게시 / 숨김 / 초안 3종)
  + StoreAssetsPanelProps.onBulkStatusChange?: (ids: string[], status) => Promise<void>

StoreAssetsPage.tsx (KPA + GlycoPharm 각 1개)
  + handleBulkStatusChange 핸들러 추가 (fan-out 로직)
```

**장점**:
- `assetColumns.tsx` 무변경 (O4OColumn 그대로)
- `ForcedSection.tsx` 무변경
- BaseTable API 내에서 처리 — DataTable 마이그레이션 불필요

**위험**:
- 패키지 변경 → KPA + GlycoPharm 두 빌드 동시 검증 필요
- `StoreAssetsPanelProps` 인터페이스 변경 (optional prop 추가, 하위 호환)

**난이도**: 중간

---

### Option B — DataTable<T> (Column<T>) 로 마이그레이션

**변경 범위**:
- `assetColumns.tsx`: `O4OColumn<T>` → `Column<T>` (header → title, system 제거)
- `ForcedSection.tsx` + `StoreAssetsPanel.tsx`: BaseTable → DataTable
- `system: 'last'` 대체 처리 필요 (Column<T> 미지원)

**문제점**:
- `system: 'last'` 은 Column<T> 에 없음 — 액션 컬럼 고정 처리 별도 필요
- `O4OColumn.header: ReactNode` → `Column<T>.title: string` 으로 다운그레이드
- ForcedSection 의 red border 스타일링과 DataTable의 기본 스타일 충돌 가능

**결론**: 더 많은 변경, 더 높은 위험. **채택 불가**.

---

### Option C — wrapper 페이지에서 별도 DataTable 구성

**문제점**: 데이터 fetch + filter + sort + pagination 로직이 StoreAssetsPanel 내부에 있음.  
wrapper 에서 재구성하면 KPA/GlycoPharm 양쪽에 중복 구현 발생. **채택 불가**.

---

## 9. 권장 옵션: **Option A**

이유:
1. BaseTable 이미 selection API 내장 → 최소한의 변경
2. `O4OColumn` / `ForcedSection` 무변경 → 리스크 격리
3. `StoreAssetsPanelProps` optional prop 추가 → 하위 호환
4. KPA + GlycoPharm 동시 표준화

---

## 10. 후속 WO 권장 범위

### WO-O4O-STORE-ASSET-POLICY-CORE-BASETABLE-SELECTION-V1

**포함**:
```
packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx
  - selectedRegularKeys: Set<string> state 추가
  - Regular BaseTable: selectable / selectedKeys / onSelectionChange 연결
  - ActionBar: 게시(published) / 숨김(hidden) / 초안(draft) 3종
  - Props: onBulkStatusChange?: (ids: string[], status: AssetPublishStatus) => Promise<void>

services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx
  - handleBulkStatusChange 추가 (Promise.allSettled fan-out)

services/web-glycopharm/src/pages/store/StoreAssetsPage.tsx
  - handleBulkStatusChange 추가 (동일 패턴)
```

**제외**:
```
packages/store-asset-policy-core/src/components/assetColumns.tsx  — 무변경
packages/store-asset-policy-core/src/components/ForcedSection.tsx — 무변경
services/web-k-cosmetics/**                                        — 무관
backend API                                                        — 무변경
```

**TypeScript 검증**: `web-kpa-society` + `web-glycopharm` 두 서비스 모두 검증 필요.

---

## 11. 현재 단건 action 현황 (보존 목록)

| 액션 | 위치 | 보존 여부 |
|------|------|----------|
| publishStatus toggle (클릭) | `assetColumns.tsx` PublishStatusCell | ✅ 유지 |
| 콘텐츠 편집 버튼 | `assetColumns.tsx` _action 컬럼 | ✅ 유지 |
| ForcedSection 상태 표시 (read-only) | ForcedSection | ✅ 유지 |

---

## 12. 코드 변경 없음 확인

이번 IR 에서 코드 파일을 수정하지 않았다.

```
수정된 파일: 없음
```

---

## 13. 참조 파일

```
packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx
packages/store-asset-policy-core/src/components/assetColumns.tsx
packages/store-asset-policy-core/src/components/ForcedSection.tsx
packages/ui/src/components/table/types.ts           (BaseTableProps — selectable API)
packages/ui/src/components/table/BaseTable.tsx
services/web-kpa-society/src/pages/pharmacy/StoreAssetsPage.tsx
services/web-glycopharm/src/pages/store/StoreAssetsPage.tsx
services/web-k-cosmetics/src/api/assetSnapshot.ts   (types only, StoreAssetsPanel 미사용)
```
