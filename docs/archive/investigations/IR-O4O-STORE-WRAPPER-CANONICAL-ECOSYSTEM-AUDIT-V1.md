# IR-O4O-STORE-WRAPPER-CANONICAL-ECOSYSTEM-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**: Store HUB 에서 사용 중인 외부 wrapper / shared package 의 **ecosystem** 관점 감사
**범위**: 4개 wrapper / shared package

**선행 IR**:
- `IR-O4O-STORE-HUB-LIST-UX-CANONICAL-AUDIT-V1` — 페이지 layer 분류
- `IR-O4O-STORE-WRAPPER-CANONICAL-INTERNAL-AUDIT-V1` — wrapper 내부 drift inventory (raw `<table>` 위치 4곳 식별)

**본 IR 의 차별점**:
> 선행 IR 이 **drift 위치** 를 식별했다면, 본 IR 은 **ecosystem 흐름** (다른 세션 동시 작업 방향, copy-to-store workflow, selection/bulk 정합성, shared abstraction 가능성, execution UX 정렬) 을 분석한다.

**기준 문서**:
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`

---

## 0. 결론 요약

> **Store HUB wrapper ecosystem 은 정책적으로 일관됨. 다른 세션이 선행 IR Priority 1 (StoreAssetsPanel / ForcedSection raw `<table>` → BaseTable) 을 정확히 정비 활성 진행 중 — 완료 직전 상태. 본 IR 단계에서 침범 금지.**

### 핵심 발견

1. **🔄 다른 세션이 선행 IR Priority 1 정비 활성 진행 중** — `WO-O4O-STORE-ASSETS-PANEL-BASETABLE-MIGRATION-V1` (assetColumns.tsx 헤더 명시). raw `<table>` × 2 (StoreAssetsPanel L337, ForcedSection L29) → BaseTable migration 완료된 working tree 상태. `assetColumns.tsx` 신규 shared O4OColumn 정의 + AssetRow 제거 + `@o4o/ui` dependency 추가. **본 IR 단계 침범 금지**.

2. **🎁 Bonus drift cleanup 발견** — 이전 raw `<table>` 의 orphan "채널" header (body cell 없는 layout drift) 가 새 assetColumns 에서 의도적으로 미반영 ([assetColumns.tsx#L25-31](packages/store-asset-policy-core/src/components/assetColumns.tsx#L25)). 다른 세션이 정비 중 발견한 잠재 drift.

3. **⚠️ ContentHubTemplate KPA override 없음 확인** — 선행 IR §2-3 의 "KPA override 검증 미수행" 답: KPA `HubContentLibraryPage` 에 `renderItems` grep 결과 **0건**. 즉 KPA `/store-hub/content` 사용자도 `DefaultTableView` raw `<table>` (ContentHubTemplate.tsx L388) 실제 노출 중. 정비 영향 범위가 KPA 까지 확장.

4. **✅ copy-to-store workflow ecosystem 깔끔** — `copiedIds: Set<string>` (재진입 sync) + `copyingId` (single-flight lock) + `justCopiedId` (직전 항목 highlight) + `afterCopyAction` (next-action 즉시 노출). adapter 주입 패턴.

5. **🎯 selection/bulk ecosystem 정책상 의도된 부재** — Asset 단건 publish toggle, Content 단건 copy. 같은 패키지 내 `ResourcesHubTemplate` / `LmsHubTemplate` 은 TRUE-CANONICAL multi-select + ActionBar 구현 — **두 패턴 의도적 공존**.

6. **♻️ shared abstraction 가능성** — `ContentHubTemplate DefaultTableView` 를 다른 세션의 `assetColumns` 패턴 (`getContentHubColumns()` + BaseTable) 으로 동일하게 정비 가능. 비용 낮음.

7. **🚫 mock / dead residue 0건** — 4개 wrapper 모두 adapter 패턴으로 실 API 사용.

### Wrapper ecosystem health map

| Wrapper | 다른 세션 활동 | raw drift | ecosystem 정합성 | execution UX | mobile | 본 IR 우선순위 |
|---|:---:|:---:|---|:---:|:---:|---|
| **@o4o/store-products-ui** `StoreProductsManagerPage` | — | 0 | 양호 (BaseTable SIMPLE) | high | 중 | observational |
| **@o4o/store-asset-policy-core** `StoreAssetsPanel` + `ForcedSection` | **🔄 활성 진행 중** | 0 (working tree) | 양호 (assetColumns shared) | high | 중 | **observe-only (침범 금지)** |
| **@o4o/shared-space-ui** `StoreHubTemplate` | — | N/A (랜딩) | 양호 (card-first 5-block) | high | 중 | observational |
| **@o4o/shared-space-ui** `ContentHubTemplate` | — | 2 (L388 DefaultTableView + L493 SkeletonTable) | medium (workflow OK / default raw) | high | 중 | **medium (정비 후보)** |

---

## 1. @o4o/store-asset-policy-core — 다른 세션 작업 현황 (활성)

본 IR 작성 시점의 `git status` (다른 세션 변경, unstaged):

```
 M packages/store-asset-policy-core/package.json     # +@o4o/ui workspace:* dep
 D packages/store-asset-policy-core/src/components/AssetRow.tsx    # row renderer 컴포넌트 삭제
 M packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx   # raw <table> → BaseTable
 M packages/store-asset-policy-core/src/components/ForcedSection.tsx      # raw <table> → BaseTable
 M packages/store-asset-policy-core/src/index.ts                          # AssetRow export 제거
?? packages/store-asset-policy-core/src/components/assetColumns.tsx       # shared O4OColumn 신규 (212 lines)
```

### 작업 방향 (직접 read 후 검증)

WO 식별자: `WO-O4O-STORE-ASSETS-PANEL-BASETABLE-MIGRATION-V1` ([assetColumns.tsx L8](packages/store-asset-policy-core/src/components/assetColumns.tsx#L8))

| 변경 | 검증 |
|---|---|
| `assetColumns.tsx` 신규 | `O4OColumn<StoreAssetItem>[]` shared columns — forced + regular section 의 동일 셀 보장 (컨테이너 스타일만 차이) |
| `StoreAssetsPanel.tsx` L337-349 | raw `<table>` 제거, `<BaseTable<StoreAssetItem>>` 적용 ([L338](packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx#L338)). `headerClassName="bg-slate-50"`, `bodyClassName="bg-white divide-y divide-slate-100"`, `rowClassName={assetRowClassName}` |
| `ForcedSection.tsx` L29-30 | raw `<table>` 제거, `<BaseTable<StoreAssetItem>>` 적용 ([L33](packages/store-asset-policy-core/src/components/ForcedSection.tsx#L33)). `headerClassName="bg-red-50"`, `bodyClassName="bg-white divide-y divide-red-100"` |
| `AssetRow.tsx` 삭제 | per-row renderer 컴포넌트가 BaseTable + columns 패턴으로 대체됨 |
| `package.json` | `@o4o/ui: workspace:*` dependency 추가 |

### 정책 보존 검증 (100% 유지)

- ✅ `forcedHighlight: bg-red-50/30` (forced 활성 row)
- ✅ `expiredDim: opacity-50` (lifecycle expired)
- ✅ `archivedDim: opacity-40` (archived)
- ✅ KPI 4-card (Home/Signage/Promotion/Forced)
- ✅ Tab (all/cms/signage) + Filter (status/policy/channel/sort)
- ✅ Forced expiring banner ("강제노출 만료 임박: N건")
- ✅ Section separation (forced pinned + regular paginated)
- ✅ `forced-expiring` view 진입 시 자동 sort/filter
- ✅ `canEdit / canToggleStatus / isForcedActive / isForcedExpired / isForcedExpiringSoon` policy gates

### 🎁 Bonus drift cleanup

[assetColumns.tsx L25-31](packages/store-asset-policy-core/src/components/assetColumns.tsx#L25):
```typescript
/**
 * Note: The previous raw <table> markup declared a "채널" header (w-20) with no
 * matching body cell. That orphan header is intentionally not reproduced here —
 * it was a layout drift, never rendered any data.
 */
```

→ 다른 세션이 정비 중 발견한 layout drift (header-only column without td). 본 IR 의 가치 — wrapper migration 작업이 단순 mechanical replace 가 아니라 정책적 cleanup 도 수행 중.

### Build 상태

`tsc --noEmit` 결과 17개 TS 에러 (모두 store-asset-policy-core/ 안):
- `@o4o/ui` 모듈 not found (package.json 에 dep 추가됐으나 pnpm install 미수행 가능성)
- O4OColumn render signature (`(value: any, row: T)`) 의 implicit any 경고

→ 다른 세션이 곧 해소할 것으로 보임. **본 IR 단계 침범 금지** (WO 본문 명시: "현재 다른 세션 변경 중이므로 조사만 수행, 수정 금지").

---

## 2. @o4o/shared-space-ui `ContentHubTemplate` ecosystem 분석

### 디자인 패턴

5-block 구조:
1. **Hero** (heroTitle + heroDesc + headerAction)
2. **Search + Filter** (debounced search + filter tabs + chip-based active filter display)
3. **Content List** — `config.renderItems ? renderItems(items, itemCtx) : <DefaultTableView />`
4. **Usage / CTA** (optional)
5. **Info / Guidance** (optional)

adapter 패턴:
```typescript
interface ContentHubConfig {
  fetchItems: (params) => Promise<ContentHubFetchResult>;
  loadCopiedIds?: () => Promise<Set<string>>;
  onCopy?: (item) => Promise<void>;
  afterCopyAction?: { label: string; href: string };
  renderItems?: (items, ctx) => ReactNode;  // override slot
}
```

### KPA HubContentLibraryPage override 검증 결과

| 검증 | 결과 |
|---|---|
| `renderItems` keyword grep | **0건** ([HubContentLibraryPage.tsx](services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx)) |
| Config 구성 | `fetchItems` + `onCopy` + `loadCopiedIds` + `filters` + `afterCopyAction` (`/store/library/contents`) — adapter only |
| List 렌더 | `DefaultTableView` 호출 (raw `<table>`) |

→ **KPA 사용자도 `DefaultTableView` raw `<table>` 노출 중**. 선행 IR §2-3 의 "KPA override 검증 미수행" 결론: override 없음. 정비 영향 범위 KPA 포함.

### copy-to-store workflow ecosystem (잘 설계됨)

| 상태 | 역할 |
|---|---|
| `copiedIds: Set<string>` | 재진입 시 서버 sync (loadCopiedIds adapter 호출) |
| `copyingId: string \| null` | single-flight lock (동시 복사 방지) |
| `justCopiedId: string \| null` | 직전 복사 항목 highlight + `afterCopyAction` 즉시 노출 |
| `afterCopyAction: { label, href }` | 복사 직후 "작업하러 가기" 등 next-action 링크 (adapter 주입) |

`handleCopy` 흐름 ([L220-233](packages/shared-space-ui/src/ContentHubTemplate.tsx#L220)):
```typescript
setCopyingId(item.id);
await config.onCopy(item);
setCopiedIds(prev => new Set(prev).add(item.id));
setJustCopiedId(item.id);
```

→ 깔끔. single-item copy 정책 의도가 명확.

### DefaultTableView 정비 가능성

[L385-407](packages/shared-space-ui/src/ContentHubTemplate.tsx#L385) 의 raw `<table>` + `<thead>/<tbody>` + `<tr>/<td>` per-row 구조 — 다른 세션의 `assetColumns.tsx` 패턴 그대로 적용 가능:

```typescript
// 가능한 정비 구조 (본 IR 단계 작업 금지)
export function getContentHubColumns(ctx, showCopyCol): O4OColumn<ContentHubItem>[] {
  return [
    { key: 'type', ... },
    { key: 'title', ... },
    { key: 'summary', ... },
    ...(showCopyCol ? [{ key: 'status', ... }] : []),
    { key: 'date', ... },
    ...(showCopyCol ? [{ key: 'action', system: 'last', ... }] : []),
  ];
}
```

assetColumns 패턴이 이미 같은 monorepo 내 모범 — 정비 비용 낮음.

---

## 3. @o4o/shared-space-ui `StoreHubTemplate` ecosystem 분석

### 5-block 구조 (랜딩 / 리스트 아님)

1. **Hero** — title + desc + storeCta + headerAction
2. **Resource Discovery** — `resourceCards: StoreHubResourceCard[]` (2-col card grid)
3. **AI Recommendation** — `renderAiSection?` slot 또는 `DefaultAiPlaceholder`
4. **Store CTA** — 매장 진입 유도 block
5. **Operation Flow** — `operationSteps: StoreHubFlowStep[]` (3-step arrow flow)

### 평가

| 항목 | 결과 |
|---|---|
| Card-first 적합성 | ✅ 랜딩 페이지 — 카드 grid + flow guide |
| Execution discoverability | ✅ Resource cards (탐색) + storeCta (실행 진입) + Flow guide (1-2-3 단계) |
| Dead section | 없음 — `showAiBlock` / `showStoreCtaBlock` / `showFlowBlock` 으로 toggle 가능 |
| AI block placeholder | "준비 중" badge + 향후 기능 설명 — 의도된 정직한 placeholder |
| service-neutral | ✅ 모든 콘텐츠가 config 주입 |

→ 정비 불필요. 현 상태 유지.

---

## 4. @o4o/store-products-ui ecosystem 분석

### 패키지 구조 (5 파일)

| 파일 | 역할 |
|---|---|
| `StoreProductsManagerPage.tsx` | 선행 IR 검증 — `@o4o/ui BaseTable` SIMPLE, 정렬 양호 |
| `StoreProductImageManagerModal.tsx` | 별도 modal (list scope 외) |
| `api.ts` | API client (searchStoreProducts / createStoreListing / getMyStoreListings / image / channel) |
| `types.ts` | type definitions |
| `index.ts` | exports (Page + Modal + API + types) |

### multi-service 라우팅 정책

index.ts L9-12 주석:
> "본 패키지는 다음 3개의 서비스 웹앱에서 동일하게 사용된다(다음 Phase):
> - services/web-kpa-society
> - services/web-glycopharm
> - services/web-k-cosmetics"

현재 KPA 만 라우팅 (`/store/my-products`). 후속 Phase 에서 GlycoPharm + K-Cosmetics 라우팅 시 별도 audit 권장 (3개 서비스 정합성).

---

## 5. Selection / Bulk ecosystem 정합성

| Wrapper | selection | bulk | 정책 컨텍스트 |
|---|:---:|:---:|---|
| StoreProductsManagerPage | 없음 | 없음 | 단건 listing 편집 — 적절 |
| StoreAssetsPanel | row publish toggle | 없음 | forced 강제 / draft↔published 단건 토글 — 적절 |
| ContentHubTemplate | single-item copy | 없음 | 1건씩 결정 — 적절 |
| StoreHubTemplate | N/A (list 아님) | N/A | 카드 navigation — 적절 |

### 같은 패키지 (shared-space-ui) 내 두 ecosystem 패턴 공존

| 패턴 | 컴포넌트 | 시그니처 |
|---|---|---|
| **single-action** | ContentHubTemplate, (Forum/Store/Signage Hub Template) | copy 1건씩, ActionBar 없음 |
| **bulk-action** (TRUE CANONICAL) | ResourcesHubTemplate, LmsHubTemplate | `Set<string> selectedKeys` + `ActionBar` + `onBulkDelete / bulkActions[]` |

→ **정책상 의도된 공존**:
- Content / Hub 진입 = 사용자가 1건씩 검토 후 즉시 결정 (탐색 흐름)
- Resources / Lms = 매장 자료 정리 작업 (일괄 삭제/관리)

향후 ContentHubTemplate 에 bulk copy 도입 결정 시 ResourcesHubTemplate 패턴 그대로 적용 가능 — design abstraction 부담 낮음.

---

## 6. Copy-to-store workflow 일관성

### 흐름 매핑

| 단계 | wrapper / page | mechanism |
|---|---|---|
| Hub catalog (copy 진입점) | `ContentHubTemplate`, `HubB2BCatalogPage`, `HubSignageLibraryPage` | renderItems/DataTable + onCopy adapter |
| Copy 상태 sync | `Set<string> copiedIds` + `loadCopiedIds()` adapter | 재진입 시 서버 상태 sync |
| After copy | `justCopiedId` + `afterCopyAction` 노출 | "작업하러 가기" 즉시 진입 |
| Store library (수신) | `StoreLibraryContentsPage`, `StoreLibraryResourcesPage`, `StoreProductionMaterialsPage` | BaseTable + multi-select + 제작 modal (TRUE CANONICAL) |
| Asset display | `StoreAssetsPanel` (forced + regular) | BaseTable (working tree) + KPI |
| Production | `ProductionMaterialEditorPage` | editor |
| Execution | `StoreSignagePage`, `StorePopPage`, `StoreQRPage`, `PharmacyBlogPage` | service-specific UX |

→ wrapper layer (copy 진입) 와 service layer (store-side) 의 boundary 명확. 정합성 양호.

---

## 7. Shared abstraction 가능성

| 후보 | 사유 | 비용 | 우선순위 |
|---|---|---|---|
| **ContentHubTemplate DefaultTableView → `getContentHubColumns()` + BaseTable** | 다른 세션이 store-asset-policy-core 에서 동일 패턴 (`assetColumns` shared columns) 정비 중 — 그대로 적용 가능 | low (assetColumns 212 lines 참조) | **medium** |
| ContentHubTemplate bulk copy 도입 | 같은 패키지 ResourcesHubTemplate/LmsHubTemplate 가 모범 (ActionBar + `Set<string>` + onBulkAction) | medium (정책 결정 필요) | low (선택적) |
| store-products-ui 3개 서비스 라우팅 적용 | 이미 라이브러리화됨, Phase 적용 작업만 | low | low (별도 Phase) |
| HubPagination 의 @o4o/ui 통합 | 이미 별도 분리됨 (DRY), @o4o/ui 의 표준 컴포넌트와 통합 가치 | low-medium | observational |

---

## 8. Execution UX 적합성 종합

| Wrapper | execution UX | preview UX |
|---|:---:|:---:|
| StoreHubTemplate | 높음 (랜딩 + flow guide + storeCta) | 낮음 (랜딩) |
| StoreAssetsPanel | 높음 (KPI + forced + publish toggle + filter banner) | 중 (snapshot type badge) |
| ContentHubTemplate | 높음 (search + filter + copy + afterCopyAction) | 중 (썸네일은 render override 시) |
| StoreProductsManagerPage | 높음 (단건 listing 편집 + image manager modal) | 낮음 (관리 중심) |

→ 모든 wrapper 가 execution UX 와 잘 정렬됨.

---

## 9. Mobile usability

| Wrapper | max-width | layout | mobile 적합 |
|---|---|---|:---:|
| StoreHubTemplate | 960px | 5-block, 2-col card grid | 중 |
| StoreAssetsPanel | 7xl (~80rem) | 4-col KPI + table | 중 |
| ContentHubTemplate | 1100px | search + filter + table | 중 |
| StoreProductsManagerPage | service-controlled | table + custom pagination | 중 |

→ 매장 owner desktop/tablet 중심 정책상 적합. mobile 전용 화면 (`TabletDisplaysPage` / `TabletRequestsPage`) 은 별도 page.

---

## 10. Mock / Dead residue

본 IR scope (4개 wrapper) 내 mock / dead residue **0건**. 모든 wrapper 가 adapter 패턴으로 실 API 호출.

선행 IR 와 동일 결론.

---

## 11. Wrapper drift 우선순위 (본 IR 기준)

| Priority | 대상 | 작업 | 다른 세션 상태 |
|---|---|---|---|
| — | StoreAssetsPanel + ForcedSection raw → BaseTable | 정비 활성 진행 중 | **다른 세션 진행 중 — 침범 금지** |
| **2** | ContentHubTemplate DefaultTableView (L388, L493) raw → BaseTable | `assetColumns` 패턴 적용 가능 (`getContentHubColumns()` + BaseTable) | 다른 세션 작업 완료 후 시작 권장 |
| 3 (observational) | StoreProductsManagerPage custom pagination → 표준 페이지네이션 컴포넌트 | DRY 정도 | 없음 |

---

## 12. 위험 신호 / 추가 결정

| # | 항목 | 비고 |
|---|---|---|
| 1 | **다른 세션 store-asset-policy-core build break** | `tsc --noEmit` 17개 TS 에러 (모두 해당 패키지). `@o4o/ui` 모듈 not found (pnpm install 미수행 가능성) + implicit any. 그 세션이 곧 해소할 것으로 보임 — 본 IR 단계 침범 금지 |
| 2 | **ContentHubTemplate KPA override 없음 검증 완료** | `renderItems` grep 0건 → KPA `/store-hub/content` 사용자도 raw `<table>` 노출 중. 정비 영향 KPA 포함 |
| 3 | **store-products-ui 후속 Phase 라우팅** | 3개 서비스 (KPA/GlycoPharm/K-Cosmetics) 동일 적용 시점에 별도 audit 권장 |
| 4 | **ContentHubTemplate bulk copy 정책 결정 사항** | 정책상 single-item 의도이나 향후 가치 검토. 패키지 내 모범 사례 (Resources/Lms) 적용 가능 |
| 5 | **shared-space-ui 내부 패턴 일관성 문서화 가치** | TRUE-CANONICAL (Resources/Lms) vs single-action (Content/Forum/Store/Signage Hub) 혼재 — 정책상 의도. 패턴 선택 기준 문서화 권장 |
| 6 | **SignageManagerTemplate 사용처 확인 후속 진행** | 선행 IR §10-3 항목 — store 측 (StoreSignagePage, HubSignageLibraryPage) 미사용 직접 확인됨 (이전 검증). operator/manager 사용처 별도 식별 권장 |
| 7 | **SignageHubTemplate 직접 검증 미수행** | 선행 IR §10-5 — 본 IR 도 미수행. 별도 mini-audit 권장 |

---

## 13. 본 IR 범위 외 (후속)

- GlycoPharm / K-Cosmetics 의 wrapper 사용 패턴 (multi-service 영향)
- `SignageHubTemplate` 내부 직접 검증 (선행 IR + 본 IR 모두 미수행)
- `SignageManagerTemplate` 사용처 정확 식별 (store 측 미사용 확인됨, operator 측 미확인)
- ContentHubTemplate bulk copy 정책 결정
- 후속 WO (본 IR 단계 작성 금지):
  - `WO-O4O-CONTENT-HUB-TEMPLATE-DEFAULT-CANONICAL-V1` (DefaultTableView → BaseTable, assetColumns 패턴 재사용)
  - `WO-O4O-STORE-PRODUCTS-UI-MULTI-SERVICE-ROUTING-V1` (3개 서비스 라우팅 적용)

---

## 14. 참조

### 🔄 다른 세션 활성 작업 (관찰만, 침범 금지)
- `packages/store-asset-policy-core/src/components/assetColumns.tsx` (신규, 212 lines, WO-O4O-STORE-ASSETS-PANEL-BASETABLE-MIGRATION-V1)
- `packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx` (raw → BaseTable + assetColumns)
- `packages/store-asset-policy-core/src/components/ForcedSection.tsx` (raw → BaseTable + assetColumns)
- `packages/store-asset-policy-core/src/components/AssetRow.tsx` (삭제됨)
- `packages/store-asset-policy-core/package.json` (+@o4o/ui workspace:* dep)
- `packages/store-asset-policy-core/src/index.ts` (AssetRow export 제거)

### ⚠️ 정비 후보 (Priority 2)
- `packages/shared-space-ui/src/ContentHubTemplate.tsx` L388 (DefaultTableView raw `<table>`) + L493 (SkeletonTable raw `<table>`)

### ✅ Ecosystem 정렬 양호 (observational)
- `packages/store-products-ui/src/StoreProductsManagerPage.tsx` (BaseTable SIMPLE)
- `packages/shared-space-ui/src/StoreHubTemplate.tsx` (5-block card-first 랜딩)

### KPA adapter (override 미사용 확인)
- `services/web-kpa-society/src/pages/pharmacy/HubContentLibraryPage.tsx` (`renderItems` grep 0건 — DefaultTableView 사용)

### 연관 IR
- `IR-O4O-STORE-HUB-LIST-UX-CANONICAL-AUDIT-V1` (페이지 layer 분류)
- `IR-O4O-STORE-WRAPPER-CANONICAL-INTERNAL-AUDIT-V1` (drift inventory)
- `IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1`
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1`

### Canonical 기준
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`

---

*조사 전용 — 코드/DB 수정 없음. 본 IR 단계에서 후속 WO 작성 금지. 특히 `@o4o/store-asset-policy-core` 는 다른 세션 활성 작업 중이므로 본 IR 결과 기반 수정 절대 금지.*
