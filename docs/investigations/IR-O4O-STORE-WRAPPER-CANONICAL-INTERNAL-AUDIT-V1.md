# IR-O4O-STORE-WRAPPER-CANONICAL-INTERNAL-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**: Store HUB 사용 wrapper/template 패키지의 **내부 렌더러 구조 직접 감사**
**범위**: 패키지 자체 (`packages/store-products-ui/`, `packages/store-asset-policy-core/`, `packages/shared-space-ui/`)

**선행 IR**:
- `IR-O4O-STORE-HUB-LIST-UX-CANONICAL-AUDIT-V1` — Store HUB 페이지가 wrapper 에 위임함을 식별, wrapper 내부 미감사
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1`
- `IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1`

**기준 문서**:
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`

**평가 기준**:
> "operator canonical 과 동일 기준" 이 아니라
> **"Store execution UX 에 적합한 canonical 구조인가?"**

---

## 0. 결론 요약

> **결론: 핵심 wrapper 3개에서 hidden raw `<table>` drift 발견 — 페이지 layer 만 canonical 처럼 보였으나 내부는 LEGACY-RAW.**

### 핵심 발견

1. **🚨 hidden raw `<table>` 4 곳 발견** — Store HUB 페이지 layer 의 94% canonical 정렬과 무관하게 wrapper 내부에 LEGACY-RAW 잔존:
   - `store-asset-policy-core/.../StoreAssetsPanel.tsx` L337-349
   - `store-asset-policy-core/.../ForcedSection.tsx` L29-30
   - `shared-space-ui/ContentHubTemplate.tsx` L388-399, L493-494 (2개)
   - `shared-space-ui/SignageManagerTemplate.tsx` L307, L444 (Video table + Playlist table 2개)
2. **`ResourcesHubTemplate` / `LmsHubTemplate` 는 진정한 canonical** — `BaseTable` + `Set<string> selectedKeys` + `ActionBar` + bulk action 까지 완전 구현. wrapper 정상 사례.
3. **`StoreProductsManagerPage` 도 정렬됨** — `@o4o/ui BaseTable` 사용 (L21, L725). 커스텀 페이지네이션 잔존하나 SIMPLE 분류 적절.
4. **mock data residue 0건** — 모든 wrapper 가 실제 API adapter 사용.
5. **`SignageManagerTemplate` 는 scope creep** — store 컨텍스트 wrapper 인데 operator 패턴(selection + ActionBar slot) 을 retrofit. raw `<table>` × 2 + 자체 checkbox 로직.

### 패키지별 drift 요약

| 패키지 | 핵심 컴포넌트 수 | LEGACY-RAW | TRUE-CANONICAL | 비고 |
|---|:---:|:---:|:---:|---|
| `@o4o/store-products-ui` | 1 | 0 | 0 (SIMPLE 1) | 정렬 양호 |
| `@o4o/store-asset-policy-core` | 2 | **2** | 0 | **drift 핵심** |
| `@o4o/shared-space-ui` | 7 | **2** | 2 | drift + canonical 혼재 |
| `@o4o/store-core`, `hub-core`, `store-ui-core`, `asset-copy-core` | — | — | — | 렌더러 없음 (skip) |

→ **wrapper-layer 의 canonical 준수율은 페이지 layer 보다 낮음**. 페이지 IR (94%) 만 보면 안 보이는 hidden drift.

---

## 1. 패키지 인벤토리 & family 분류

### 1-1. `@o4o/store-products-ui`

| 컴포넌트 | 분류 | drift | 비고 |
|---|---|:---:|---|
| `StoreProductsManagerPage` | SIMPLE-DATATABLE | low | `import { BaseTable } from '@o4o/ui'` (L21), `<BaseTable<StoreListingItem>` (L725). 커스텀 페이지네이션 (L745-768) 잔존하나 store 컨텍스트 적절 |

**consumer**: `pages/pharmacy/StoreProductsManagerPage` (`/store/my-products`).

### 1-2. `@o4o/store-asset-policy-core` ⚠️ 핵심 drift

| 컴포넌트 | 분류 | drift | 위치 |
|---|---|:---:|---|
| `StoreAssetsPanel` | **LEGACY-CUSTOM** | **medium-high** | `src/components/StoreAssetsPanel.tsx` L337-349 — raw `<table>` + `<thead>` + `<tbody>` |
| `ForcedSection` | **LEGACY-CUSTOM** | **medium** | `src/components/ForcedSection.tsx` L29-30 — raw `<table>` + `<tbody>` (forced asset pinned row) |
| `AssetRow` | (내부 cell renderer) | — | per-row 컴포넌트, family 분류 외 |

**consumer**: `pages/pharmacy/StoreAssetsPage.tsx` (`/store/content`) — IR-Store-Hub 가 "WRAPPER" 로 분류했으나 **내부는 raw `<table>` 2개**.

**execution UX 판단**:
- 2-tier 정책 분리 (forced pinned + regular paginated) 자체는 적절
- 그러나 raw HTML 으로 구현 → BaseTable 의 system 컬럼 + sticky / sort / row reorder 기능 활용 불가
- 정비 시 BaseTable + 컬럼 grouping 으로 2-tier 표현 가능 (정책 보존)

### 1-3. `@o4o/shared-space-ui`

| 컴포넌트 | 분류 | drift | 비고 |
|---|---|:---:|---|
| `StoreHubTemplate` | CARD-FIRST | low | 카드 그리드 + 흐름도, 리스트 없음 — 정책 의도 |
| `ForumHubTemplate` | CARD-FIRST | low | 카테고리 + 최근 게시글 카드, 리스트 없음 |
| **`ContentHubTemplate`** | **LEGACY-CUSTOM (default)** | **medium** | L388-399, L493-494 — **default 렌더러에 raw `<table>` × 2** (renderItems override 시 호출 안 됨) |
| `SignageHubTemplate` | SIMPLE-DATATABLE / HYBRID | low | renderItems override 패턴 (직접 검증 미수행) |
| **`SignageManagerTemplate`** | **LEGACY-CUSTOM + scope creep** | **high** | L307 (video), L444 (playlist) — raw `<table>` × 2, 자체 checkbox toggle, ActionBar slot 만 정의 (실제 ActionBar 통합 없음) |
| `ResourcesHubTemplate` | **TRUE-CANONICAL-TABLE** | low | L32 BaseTable import, L270 `selectedKeys: Set<string>`, L488 `onBulkDelete` → ✅ 모범 사례 |
| `LmsHubTemplate` | **TRUE-CANONICAL-TABLE** | low | L18-23 BaseTable + ActionBar import, L101 `selectedKeys: Set<string>`, L334-337 selection-conditional ActionBar → ✅ 모범 사례 |

> Note: 에이전트가 `LmsHubTemplate` 를 SIMPLE 로 분류했으나 직접 검증 결과 selection + ActionBar 까지 갖춰 **TRUE-CANONICAL-TABLE** 로 정정.

### 1-4. 비-렌더러 패키지 (skip)

| 패키지 | 내용 | 비고 |
|---|---|---|
| `@o4o/store-core` | types / adapters / engines | UI 컴포넌트 없음 |
| `@o4o/hub-core` | HubCard / HubLayout / HubSection (카드형 layout 컴포넌트) | 리스트 렌더러 없음 |
| `@o4o/store-ui-core` | Layout / TopBar / Sidebar / menu config | 리스트 렌더러 없음 |
| `@o4o/asset-copy-core` | entities / services / factories (백엔드 로직) | UI 없음 |

→ 모두 본 IR scope 외 (이미 확인됨).

---

## 2. Hidden Legacy Drift 상세

### 2-1. 🚨 `StoreAssetsPanel` (store-asset-policy-core) — Raw `<table>` 2곳

[L337-349 직접 검증](packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx#L337):
```typescript
<table className="w-full text-sm">
  <thead>
    {/* manual th columns */}
  </thead>
  <tbody className="divide-y divide-slate-100">
    {/* manual tr rows */}
  </tbody>
</table>
```

[`ForcedSection.tsx` L29-30](packages/store-asset-policy-core/src/components/ForcedSection.tsx#L29):
```typescript
<table className="w-full text-sm">
  <tbody className="divide-y divide-red-100">
```

**영향 범위**: `/store/content` (KPA 전체). 페이지 layer 의 `StoreAssetsPage` 자체는 wrapper 로 분류되어 "low drift" 처럼 보였으나 **실제 렌더링은 raw HTML**.

**정책 컨텍스트**:
- forced (강제 배포) + regular asset 의 2-tier 구조 자체는 의도된 정책
- `isForcedActive` / `canEdit` / `canToggleStatus` 등 정책 게이트는 row-level
- 정비 가능 — BaseTable 의 컬럼 grouping + system 컬럼으로 2-tier 표현 가능

**drift 분류**: LEGACY-CUSTOM (정책 컨텍스트 보존 시 medium-high).

### 2-2. 🚨 `SignageManagerTemplate` (shared-space-ui) — Raw `<table>` 2곳 + scope creep

[L307 (Video table), L444 (Playlist table) 직접 검증](packages/shared-space-ui/src/SignageManagerTemplate.tsx#L307):
- video 탭과 playlist 탭 두 곳 모두 raw `<table>` + 자체 `<thead>/<tbody>` + 자체 checkbox 로직 (L289-303 영역)
- `selectable?: boolean` opt-in (L103)
- `ActionBar` 슬롯 (L112) 정의되어 있으나 실제 ActionBar 통합은 wrapper 외부 책임 — wrapper 내부에서 ActionBar 렌더하지 않음
- WO-KPA-SIGNAGE-LIST-UX-REFACTOR-V1 코멘트로 "체크 선택 + ActionBar + 컬럼 제어 opt-in 추가" 라고 표기 — operator-style 패턴을 store wrapper 에 retrofit

**영향 범위**: KPA signage manager 영역 (확인 필요 — `/operator/signage/*` 또는 store 측 사용 여부).

**drift 분류**: **LEGACY-CUSTOM + scope-creep high drift**.
- raw `<table>` 사용 (BaseTable 미적용)
- store 컨텍스트 wrapper 에 operator-style multi-select 패턴 retrofit
- ActionBar 슬롯만 정의되고 실제 결합은 외부 책임 → BulkResultModal 통합 없음

### 2-3. ⚠️ `ContentHubTemplate` (shared-space-ui) — Raw `<table>` 2곳 (default 렌더러)

[L388-399 + L493-494 직접 검증](packages/shared-space-ui/src/ContentHubTemplate.tsx#L388):
```typescript
<table style={st.table}>
  <thead>
    {/* ... */}
  </thead>
  <tbody>
    {/* ... */}
  </tbody>
</table>
```

- L130 `renderItems?` callback — KPA 같은 consumer 가 자체 렌더링 override 시 default raw `<table>` 호출 안 됨
- 그러나 override 없는 consumer 는 raw `<table>` 노출
- L334-335: `config.renderItems ? config.renderItems(items, itemCtx) : <default raw table>` 패턴

**영향 범위**:
- KPA `HubContentLibraryPage` (`/store-hub/content`) — renderItems override 제공 시 default 미사용 (확인 필요)
- 다른 서비스 (GlycoPharm / K-Cosmetics) 가 override 제공 안 하면 raw `<table>` 노출

**drift 분류**: LEGACY-CUSTOM (default 렌더러), HYBRID (override pattern 자체는 정상).

### 2-4. ⚠️ `SignageHubTemplate` (shared-space-ui) — 직접 검증 미수행

에이전트는 ContentHub 와 유사 패턴(renderItems override) 으로 추정했으나 본 IR 단계에서 직접 검증 안 함. **별도 mini-audit 권장**.

---

## 3. canonical 모범 사례 (drift 없음)

### 3-1. ✅ `ResourcesHubTemplate` (shared-space-ui)

검증 hits:
- L16-23 헤더 주석: "renderItems override 를 의도적으로 제공하지 않는다 ... ActionBar (선택 시) ... Resource List (BaseTable + pagination)"
- L32 `import { BaseTable } from '@o4o/ui'`
- L34 `import ActionBar`
- L270 `const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())`
- L488 `await config.onBulkDelete(Array.from(selectedKeys))`

→ TRUE-CANONICAL-TABLE 완전 구현. **wrapper 정상 사례**.

### 3-2. ✅ `LmsHubTemplate` (shared-space-ui)

검증 hits:
- L18-23 `BaseTable, ActionBar, ActionBarAction` import
- L101 `useState<Set<string>>(new Set())`
- L294 `bulkActions: ActionBarAction[]`
- L335-336 `selectedKeys.size > 0 && <ActionBar>`
- L349-353 `<BaseTable<LmsHubCourse> selectable selectedKeys={selectedKeys}>`

→ TRUE-CANONICAL-TABLE 완전 구현.

### 3-3. ✅ `StoreProductsManagerPage` (store-products-ui)

- L21 `import { BaseTable } from '@o4o/ui'`
- L725 `<BaseTable<StoreListingItem>`
- selection / ActionBar / BulkResultModal **없음** — store products 의 단건 액션 정책에 적합
- 커스텀 페이지네이션 (L745-768) 잔존 — store 컨텍스트에서 수용 가능

→ SIMPLE-DATATABLE 적절.

---

## 4. Mock / Dead Residue

**0건 발견**. 모든 wrapper 가 실제 API adapter 호출 — `config.fetchItems` / `config.onSomething` callback 으로 데이터 외부 주입. mock placeholder 없음.

→ wrapper-layer 의 dead-or-mock 정비 부담 없음.

---

## 5. 페이지 → wrapper 영향 매핑

| KPA-Society 페이지 | wrapper | wrapper 분류 | 페이지 IR 분류 | 실제 drift |
|---|---|---|---|---|
| `/store/my-products` `StoreProductsManagerPage` | `store-products-ui` | SIMPLE-DATATABLE | WRAPPER | low ✅ |
| `/store/content` `StoreAssetsPage` | `store-asset-policy-core` `StoreAssetsPanel` | **LEGACY-CUSTOM** | WRAPPER | **medium-high 🚨 hidden** |
| `/store-hub` `StoreHubPage` | `shared-space-ui` `StoreHubTemplate` | CARD-FIRST | WRAPPER | low ✅ |
| `/store-hub/content` `HubContentLibraryPage` | `shared-space-ui` `ContentHubTemplate` | **LEGACY-CUSTOM (default) / HYBRID (override)** | SIMPLE-DATATABLE | KPA override 시 ✅ / 미override 시 drift |
| `/store-hub/signage` `HubSignageLibraryPage` | (직접 `@o4o/operator-ux-core DataTable` 사용 — wrapper 미경유 확인됨) | TRUE-CANONICAL | TRUE-CANONICAL | low ✅ |
| `/store-hub/b2b` `HubB2BCatalogPage` | (직접 `@o4o/operator-ux-core DataTable` 사용 — wrapper 미경유 확인됨) | TRUE-CANONICAL | TRUE-CANONICAL | low ✅ |
| `/forum` `ForumHomePage` | `shared-space-ui` `ForumHubTemplate` | CARD-FIRST | WRAPPER | low ✅ |
| `/resources` `ResourcesHubPage` | `shared-space-ui` `ResourcesHubTemplate` | **TRUE-CANONICAL-TABLE** | WRAPPER | low ✅ |
| `/lms` (사용 시) | `shared-space-ui` `LmsHubTemplate` | **TRUE-CANONICAL-TABLE** | (per service) | low ✅ |
| KPA Signage Manager | `shared-space-ui` `SignageManagerTemplate` | **LEGACY-CUSTOM** | (확인 필요) | **high 🚨 hidden** |

### 핵심 — 페이지 IR 결론 정정 사항

| 페이지 | 페이지 IR | 본 IR 발견 |
|---|---|---|
| `/store/content` `StoreAssetsPage` | "WRAPPER (외부 위임)" | 실제는 wrapper 내부 raw `<table>` 2 개 — **drift 페이지로 분류 갱신 필요** |
| `/store-hub/content` `HubContentLibraryPage` | "SIMPLE-DATATABLE" | KPA renderItems override 검증 필요 — override 있으면 ✅ / 없으면 wrapper raw |
| Signage Manager 사용처 | 미식별 | wrapper 가 LEGACY-CUSTOM + scope creep — 사용처 확인 권장 |

---

## 6. Execution UX 적합성 평가

각 wrapper 가 **store execution UX 에 적합한 canonical** 인지:

| Wrapper | execution UX 평가 |
|---|---|
| `StoreProductsManagerPage` | ✅ 적절 — 매장 상품 단건 관리 (가격/설명/채널 수정 modal). selection 없음 정당 |
| `StoreAssetsPanel` | ⚠️ 정책 적절 / 구현 부적절 — 2-tier 정책은 OK, raw HTML 은 정비 가능 |
| `ForcedSection` | ⚠️ 동일 — 정책 OK, raw `<table>` 정비 가능 |
| `ContentHubTemplate` (default) | ⚠️ override 패턴은 OK, default 가 raw `<table>` — service 가 override 안 하면 부적절 |
| `ContentHubTemplate` (KPA override) | 확인 필요 — KPA 가 override 제공하는지 직접 검증 권장 |
| `SignageManagerTemplate` | ❌ **부적절** — store/manager 경계 모호, operator-style controls retrofit, raw `<table>` |
| `StoreHubTemplate` | ✅ 적절 — 랜딩 페이지 카드 / 흐름도, 리스트 아님 |
| `ResourcesHubTemplate` | ✅ 적절 — TRUE-CANONICAL, bulk delete 워크플로우 |
| `LmsHubTemplate` | ✅ 적절 — TRUE-CANONICAL, course bulk action |
| `ForumHubTemplate` | ✅ 적절 — community discovery card |

→ 전체적으로 **operator canonical 강제 흔적 없음** (Store 측에 적절). 단 raw `<table>` 잔존이 표면 canonical 정렬을 무력화.

---

## 7. 즉시 cleanup 후보 (우선순위)

### Priority 1 — 🚨 영향 범위 큰 raw `<table>` 정비

| 대상 | 작업 | 정책 보존 |
|---|---|---|
| `StoreAssetsPanel` + `ForcedSection` (store-asset-policy-core) | raw `<table>` × 2 → BaseTable. 2-tier (forced + regular) 는 컬럼 grouping 또는 section 분리로 표현 | forced row pinning, policy gate, KPI panel 모두 유지 |
| `SignageManagerTemplate` (shared-space-ui) | raw `<table>` × 2 → BaseTable. selectable opt-in 은 BaseTable 의 selectable prop 으로 위임. ActionBar slot 결합 방식 명확화 | 2-tab(video/playlist) 구조 유지, selection opt-in 정책 유지 |

### Priority 2 — ⚠️ ContentHubTemplate default 보강

| 대상 | 작업 |
|---|---|
| `ContentHubTemplate` (shared-space-ui) | default 렌더러를 raw `<table>` → BaseTable (SIMPLE-DATATABLE) 으로 정렬. renderItems override 가 있는 service 는 영향 없음 (override 우선) |

### Priority 3 — observational (cleanup 불요)

- `ResourcesHubTemplate`, `LmsHubTemplate`, `StoreProductsManagerPage`, `StoreHubTemplate`, `ForumHubTemplate` — 현 상태 유지

---

## 8. 유지 권장 hybrid / card 구조

| 컴포넌트 | 사유 |
|---|---|
| `StoreHubTemplate` | 랜딩 카드 그리드 + 흐름도 — 시각적 onboarding UX |
| `ForumHubTemplate` | community discovery — card-first 정책 |
| `ContentHubTemplate` (override 경유) | service 가 시각적 카드 그리드 override 가능성 보존 |

→ table 강제 전환 금지.

---

## 9. Wrapper 재설계 필요 여부

| 컴포넌트 | 재설계 필요? | 사유 |
|---|:---:|---|
| `StoreAssetsPanel` | 부분 (raw → BaseTable migration 만) | 외부 인터페이스 유지 가능, 내부만 정비 |
| `SignageManagerTemplate` | **재검토 권장** | store/operator 경계 모호 — store-owner 와 operator manager 분리 결정 필요. ActionBar slot 정책 명확화 필요 |
| `ContentHubTemplate` | 부분 (default 보강) | 외부 인터페이스 유지, default 만 정렬 |
| 나머지 wrapper | 불필요 | 현 상태 유지 |

---

## 10. 위험 신호 / 추가 결정 사항

| # | 항목 | 비고 |
|---|---|---|
| 1 | **페이지 IR 의 "WRAPPER" 분류가 hidden drift 를 가린다** | 페이지 layer 만 보면 "low drift" 처럼 보이는데 실제는 wrapper 내부 raw HTML — IR 작성 표준에 wrapper 내부 mini-audit 포함 권장 |
| 2 | **`StoreAssetsPanel` raw `<table>` 영향 범위 확인** | KPA 외 GlycoPharm / K-Cosmetics 도 사용 여부 확인 — cleanup 시 multi-service 영향 |
| 3 | **`SignageManagerTemplate` 사용처 정확 식별 필요** | store-owner vs operator manager 어느 컨텍스트에서 사용되는지 — wrapper 재설계 결정 prerequisite |
| 4 | **`ContentHubTemplate` 의 KPA override 검증 미수행** | KPA `HubContentLibraryPage` 가 `renderItems` 제공하는지 확인 필요 (제공 시 raw `<table>` 미노출) |
| 5 | **`SignageHubTemplate` 직접 검증 미수행** | 본 IR 에서 ContentHub 유사 패턴으로 추정만 — 별도 mini-audit 권장 |
| 6 | **canonical 모범 사례 패키지 패턴 (ResourcesHubTemplate / LmsHubTemplate)** 을 cleanup 대상 wrapper 에 적용 가능 | 두 모범 사례는 동일 패키지 내 존재 — 정비 시 참조 가능 |

---

## 11. 본 IR 범위 외 (후속)

- `ContentHubTemplate` 의 KPA override 검증 (`HubContentLibraryPage` 의 renderItems 제공 여부)
- `SignageHubTemplate` 내부 직접 검증
- `SignageManagerTemplate` 의 실제 사용처 정확 식별 (operator vs store)
- GlycoPharm / K-Cosmetics 의 wrapper 사용 패턴 (multi-service 영향 확인)
- 후속 WO 작성:
  - `WO-O4O-STORE-ASSETS-PANEL-BASETABLE-MIGRATION-V1`
  - `WO-O4O-SIGNAGE-MANAGER-TEMPLATE-REFACTOR-V1`
  - `WO-O4O-CONTENT-HUB-TEMPLATE-DEFAULT-CANONICAL-V1`
  - (본 IR 단계에서는 작성 금지)

---

## 12. 참조

### 🚨 LEGACY-RAW drift (정비 후보)
- `packages/store-asset-policy-core/src/components/StoreAssetsPanel.tsx` (L337)
- `packages/store-asset-policy-core/src/components/ForcedSection.tsx` (L29)
- `packages/shared-space-ui/src/SignageManagerTemplate.tsx` (L307 video, L444 playlist)
- `packages/shared-space-ui/src/ContentHubTemplate.tsx` (L388, L493 — default 렌더러)

### ✅ Canonical 모범 사례
- `packages/shared-space-ui/src/ResourcesHubTemplate.tsx` (BaseTable + Set<string> + ActionBar + onBulkDelete)
- `packages/shared-space-ui/src/LmsHubTemplate.tsx` (BaseTable + selectable + ActionBar)
- `packages/store-products-ui/src/StoreProductsManagerPage.tsx` (BaseTable, SIMPLE 적절)

### Card-first (정책상 table 미사용 — 유지)
- `packages/shared-space-ui/src/StoreHubTemplate.tsx`
- `packages/shared-space-ui/src/ForumHubTemplate.tsx`

### 비-렌더러 (audit scope 외)
- `packages/store-core/`, `packages/hub-core/`, `packages/store-ui-core/`, `packages/asset-copy-core/`

### 연관 IR
- `IR-O4O-STORE-HUB-LIST-UX-CANONICAL-AUDIT-V1` (페이지 layer)
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1`
- `IR-O4O-COMMUNITY-LIST-UX-CANONICAL-AUDIT-V1`

### Canonical 기준
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`

---

*조사 전용 — 코드/DB 수정 없음. 본 IR 단계에서 후속 WO 작성 금지.*
