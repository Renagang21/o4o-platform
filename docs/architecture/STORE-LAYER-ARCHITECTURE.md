# Store Layer Architecture — Freeze Specification

> **WO-O4O-STORE-ARCHITECTURE-FREEZE-V1**
> **Date: 2026-02-22**
> **Status: FROZEN**

---

## 1. Overview

O4O Store 계층은 5개 패키지로 구성되며, 각 패키지는 명확한 책임 경계를 가진다.
이 문서는 계층 구조, 의존 방향, 확장 규칙을 확정하고 고정한다.

---

## 2. Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                    web-* Services                     │
│  (web-kpa-society, web-glycopharm, web-k-cosmetics,  │
│   web-glucoseview)                                    │
│                                                       │
│  역할: 데이터 페칭, API 호출, 라우트 정의              │
│  패턴: thin wrapper (config + API 호출만)              │
└───────┬──────────────┬──────────────┬─────────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌───────────────┐ ┌──────────┐
│ store-ui-    │ │ store-asset-  │ │ hub-core │
│ core         │ │ policy-core   │ │ (FROZEN) │
│              │ │               │ │          │
│ Shell Layer  │ │ Policy UI     │ │ Hub      │
│              │ │ Layer         │ │ Layout   │
└──────────────┘ └───────────────┘ └──────────┘
        ×              ×              ×
        │              │              │
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
   │  Frontend / Backend boundary          │
   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
        │              │
        ▼              ▼
┌──────────────┐ ┌───────────────┐
│ store-core   │ │ asset-copy-   │
│              │ │ core (FROZEN) │
│ KPI Engine   │ │               │
│              │ │ Snapshot      │
│              │ │ Engine        │
└──────────────┘ └───────────────┘
        │              │
        ▼              ▼
┌─────────────────────────────────────────────────────┐
│                    api-server                         │
└─────────────────────────────────────────────────────┘
```

**의존 방향 요약:**

```
web-* → store-ui-core          (Shell: Layout + Menu)
web-* → store-asset-policy-core (Policy: Snapshot UI)
web-* → hub-core                (일부 서비스만)
api-server → store-core         (KPI Engine)
api-server → asset-copy-core    (Snapshot Engine)
```

---

## 3. Package Responsibility Matrix

### 3.1 `@o4o/store-ui-core` — Shell Layer

| 항목 | 내용 |
|------|------|
| **역할** | StoreDashboardLayout, 메뉴 구성, 서비스별 config, Insight 계산 |
| **소비자** | web-kpa-society, web-glycopharm, web-k-cosmetics, web-glucoseview |

**Public API:**

| Export | 종류 |
|--------|------|
| `StoreDashboardLayout` | Component |
| `StorePlaceholderPage` | Component |
| `computeStoreInsights` | Function |
| `ALL_STORE_MENUS` | Constant |
| `KPA_SOCIETY_STORE_CONFIG` | Constant |
| `GLYCOPHARM_STORE_CONFIG` | Constant |
| `COSMETICS_STORE_CONFIG` | Constant |
| `GLUCOSEVIEW_STORE_CONFIG` | Constant |
| `StoreMenuKey`, `StoreDashboardConfig`, `StoreMenuItemDef` | Type |
| `StoreInsight`, `StoreInsightAction`, `StoreInsightInput`, `InsightLevel` | Type |

**금지:**
- Snapshot 정책 판단 로직 추가 금지
- lifecycle 계산 금지
- execution gate 판단 금지

---

### 3.2 `@o4o/store-asset-policy-core` — Policy UI Layer

| 항목 | 내용 |
|------|------|
| **역할** | Snapshot 정책 해석, 필터, 배지, 버튼 제어, UI 컴포넌트 |
| **소비자** | web-kpa-society, web-glycopharm |

**Public API:**

| Export | 종류 | 설명 |
|--------|------|------|
| `StoreAssetsPanel` | Component | 메인 오케스트레이션 패널 |
| `ForcedSection` | Component | HQ_FORCED 고정 섹션 |
| `AssetRow` | Component | 정책 인지 테이블 행 |
| `SnapshotTypeBadge` | Component | snapshot_type 배지 |
| `LifecycleStatusPill` | Component | lifecycle_status 필 |
| `PolicyFilterBar` | Component | 3그룹 필터 바 |
| `isForcedActive` | Function | 필수 콘텐츠 활성 판단 |
| `isForcedExpired` | Function | 필수 콘텐츠 만료 판단 |
| `canEdit` | Function | 편집 가능 여부 (user_copy, template_seed) |
| `canToggleStatus` | Function | 상태 토글 가능 여부 (user_copy, campaign_push) |
| `FORCED_WARN_DAYS` | Constant | 만료 경고 일수 (7일) |
| `daysUntil` | Function | 날짜 간격 계산 |
| `isForcedExpiringSoon` | Function | 만료 임박 판단 |
| `STATUS_CONFIG` | Constant | 상태별 표시 설정 |
| `SNAPSHOT_TYPE_CONFIG` | Constant | 타입별 표시 설정 |
| `formatDate`, `formatShortDate` | Function | 날짜 포맷 |
| Types | Type | `StoreAssetItem`, `AssetPublishStatus`, `SnapshotType`, `LifecycleStatus`, etc. |

**금지:**
- API 호출 직접 수행 금지
- KPI 계산 금지
- Layout 제어 금지
- 서비스별 조건 분기 금지

---

### 3.3 `@o4o/store-core` — KPI Engine

| 항목 | 내용 |
|------|------|
| **역할** | StoreSummaryEngine, StoreInsightsEngine, Insight Rule |
| **소비자** | api-server |

**Public API:**

| Export | 종류 |
|--------|------|
| `StoreSummaryEngine` | Class |
| `StoreInsightsEngine` | Class |
| `DEFAULT_INSIGHT_RULES` | Constant |
| `revenueRule`, `channelRule`, `productRule`, `activityRule` | Function |
| `StoreDataAdapter` | Interface |
| Types | `StoreSummaryStats`, `StoreSummary`, `StoreInsight`, etc. |

**금지:**
- UI 코드 포함 금지
- Snapshot 정책 판단 금지

---

### 3.4 `@o4o/asset-copy-core` — Snapshot Engine (FROZEN)

| 항목 | 내용 |
|------|------|
| **역할** | Snapshot 생성 엔진, Entity, Controller Factory |
| **소비자** | api-server |
| **동결** | o4o-operator-os-baseline-v1 (2026-02-16) |

**Public API:**

| Export | 종류 |
|--------|------|
| `AssetSnapshot` | Entity |
| `AssetCopyService` | Class |
| `BaseResolver` | Class |
| `DefaultPermissionChecker` | Class |
| `createAssetCopyController` | Factory |
| Types | `CopyAssetInput`, `ContentResolver`, `PermissionChecker`, etc. |

---

### 3.5 `@o4o/hub-core` — Hub Layout (FROZEN)

| 항목 | 내용 |
|------|------|
| **역할** | HubLayout, HubSection, HubCard, AI Signal |
| **소비자** | web-glycopharm, web-neture |
| **동결** | o4o-operator-os-baseline-v1 (2026-02-16) |

**Public API:**

| Export | 종류 |
|--------|------|
| `HubLayout` | Component |
| `HubSection` | Component |
| `HubCard` | Component |
| `filterCardsByRole`, `filterSectionsByRole` | Function |
| `createSignal`, `createActionSignal`, `mergeSignals` | Function |
| Types | `HubCardDefinition`, `HubSectionDefinition`, `HubSignal`, etc. |

**금지:**
- StoreAsset 정책 UI 포함 금지
- Snapshot 판단 로직 추가 금지

---

## 4. Dependency Direction Rules

### 4.1 허용된 의존 방향

```
web-* ──→ store-ui-core            (Layout + Menu)
web-* ──→ store-asset-policy-core  (Policy UI)
web-* ──→ hub-core                 (Hub Layout, 일부 서비스)
api-server ──→ store-core          (KPI Engine)
api-server ──→ asset-copy-core     (Snapshot Engine)
```

### 4.2 금지된 의존 방향

| 금지 | 이유 |
|------|------|
| `store-ui-core` → `store-asset-policy-core` | Shell이 Policy에 의존하면 경계 붕괴 |
| `store-asset-policy-core` → `store-core` | Frontend Policy가 Backend Engine에 의존 불가 |
| `hub-core` → `store-asset-policy-core` | FROZEN 패키지가 비동결 패키지에 의존 불가 |
| `store-asset-policy-core` → `store-ui-core` | Policy가 Shell에 역참조 금지 |
| Core 패키지 상호 참조 | 단방향 의존만 허용 |

### 4.3 서비스별 사용 현황

| 서비스 | store-ui-core | store-asset-policy-core | hub-core |
|--------|:---:|:---:|:---:|
| web-kpa-society | O | O | - |
| web-glycopharm | O | O | O |
| web-k-cosmetics | O | - | - |
| web-glucoseview | O | - | - |

---

## 5. Snapshot Contract

### 5.1 SnapshotType (확정)

| Type | 설명 | canEdit | canToggleStatus |
|------|------|:---:|:---:|
| `user_copy` | 사용자가 복사한 콘텐츠 | O | O |
| `hq_forced` | 본부 필수 배포 콘텐츠 | X | X |
| `campaign_push` | 캠페인 푸시 콘텐츠 | X | O |
| `template_seed` | 템플릿 초기 콘텐츠 | O | X |

**확장 규칙:** 새 SnapshotType 추가 시 반드시:
1. `store-asset-policy-core/types/snapshot.ts` — 타입 추가
2. `store-asset-policy-core/policy/policyGate.ts` — canEdit, canToggleStatus 판단 정의
3. `store-asset-policy-core/policy/mapping.ts` — SNAPSHOT_TYPE_CONFIG 매핑 추가
4. `store-asset-policy-core/components/PolicyFilterBar.tsx` — 필터 옵션 추가

### 5.2 LifecycleStatus (확정)

| Status | 설명 | Execution Gate |
|--------|------|:-:|
| `active` | 활성 | 실행 가능 |
| `expired` | 만료 | 실행 불가 |
| `archived` | 보관 | 실행 불가 |

**확장 규칙:** 새 lifecycle_status 추가 시 반드시:
1. Execution Gate 조건 정의
2. UI 표시 규칙 정의 (LifecycleStatusPill)
3. 필터 동작 정의

### 5.3 AssetPublishStatus (확정)

| Status | 설명 |
|--------|------|
| `draft` | 초안 |
| `published` | 게시됨 |
| `hidden` | 숨김 |

---

## 6. Service Wrapper Pattern

모든 서비스는 **thin wrapper** 패턴을 따른다:

```typescript
// Service wrapper (예: web-kpa-society/pages/pharmacy/StoreAssetsPage.tsx)
import { StoreAssetsPanel, canToggleStatus } from '@o4o/store-asset-policy-core';
import { storeAssetControlApi } from '../../api/assetSnapshot';

export default function StoreAssetsPage() {
  // 1. 데이터 페칭 (서비스 API)
  // 2. 상태 변경 핸들러 (서비스 API)
  // 3. StoreAssetsPanel에 위임
  return <StoreAssetsPanel items={...} onToggleStatus={...} onEdit={...} />;
}
```

**원칙:**
- 서비스 wrapper는 데이터 페칭 + API 호출만 담당
- 정책 판단, 필터링, 정렬, 렌더링은 `StoreAssetsPanel`에 위임
- 서비스별 조건 분기 금지 (UI 차이가 필요하면 APP을 분리)

---

## 7. Freeze Declaration

이 문서 이후 다음 규칙이 적용된다:

### 허용되는 변경
- 버그 수정 (Bug fix)
- 성능 개선 (Performance improvement)
- 문서 추가 (Documentation)
- 테스트 추가 (Test addition)

### 금지되는 변경
- 패키지 간 의존 방향 변경
- 책임 경계 위반 (Shell에 Policy 로직 추가 등)
- Public API surface 변경 (export 추가/삭제/시그니처 변경)
- 서비스별 조건 분기 추가
- **위 금지 항목은 명시적 Work Order를 통해서만 승인**

---

*WO-O4O-STORE-ARCHITECTURE-FREEZE-V1*
*Updated: 2026-02-22*
