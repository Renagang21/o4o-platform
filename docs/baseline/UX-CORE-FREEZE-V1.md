# UX Core Freeze v1.0

> **Status: FROZEN** | **Date: 2026-02-17**
> **Tags:** `o4o-operator-ux-core-freeze-v1`, `v0.95-admin-ux-baseline`

---

## 1. 개요

O4O Platform 대시보드를 두 패키지로 표준화하고 Frozen Core로 선언한다.

| 패키지 | 대상 | 모델 | 철학 |
|--------|------|------|------|
| `@o4o/operator-ux-core` | Operator | **5-Block** | 상태 운영 (State) |
| `@o4o/admin-ux-core` | Admin | **4-Block** | 구조 관리 (Structure) |

**Admin/Operator 완전 분리 원칙**: 컴포넌트 공유 금지, 철학적 독립.

---

## 2. Operator 5-Block 표준

```
┌─────────────────────────────────────────┐
│  Block 1: KPI Grid        (필수, 4+개)  │
├─────────────────────────────────────────┤
│  Block 2: AI/Insight      (선택적)      │
├─────────────────────────────────────────┤
│  Block 3: Action Queue    (필수)        │
├─────────────────────────────────────────┤
│  Block 4: Activity Log    (필수)        │
├─────────────────────────────────────────┤
│  Block 5: Quick Actions   (필수, 6~8개) │
└─────────────────────────────────────────┘
```

### Frozen Types

```typescript
interface KpiItem { key, label, value, delta?, status? }
interface AiSummaryItem { id, message, level, link? }
interface ActionItem { id, label, count, link }
interface ActivityItem { id, message, timestamp }
interface QuickActionItem { id, label, link, icon? }
interface OperatorDashboardConfig { kpis, aiSummary?, actionQueue, activityLog, quickActions }
```

### Frozen Exports

```typescript
OperatorDashboardLayout, KpiGrid, AiSummaryBlock, ActionQueueBlock, ActivityLogBlock, QuickActionBlock
```

### 서비스별 적용

| 서비스 | 커밋 | 상태 |
|--------|------|------|
| Neture | `f5de08c36` | Frozen |
| GlycoPharm | `b19ff8809` | Frozen |
| K-Cosmetics | `3f321489a` | Frozen |
| KPA-a | `bf41b174f` | Frozen |
| KPA-b | `7beb12e91` | Frozen |
| KPA-c | `dda8ccb5f` | Frozen |

---

## 3. Admin 4-Block 표준

```
┌─────────────────────────────────────────┐
│  Block A: Structure Snapshot (필수, 3+) │
├─────────────────────────────────────────┤
│  Block B: Policy Overview  (필수, 2+)   │
├─────────────────────────────────────────┤
│  Block C: Governance Alerts (필수)      │
├─────────────────────────────────────────┤
│  Block D: Structure Actions (필수, 3~6) │
└─────────────────────────────────────────┘
```

**Block A 금지**: 매출/주문/운영 KPI (Admin ≠ Operator)
**Block C**: 구조 리스크만 (운영 이슈 금지)
**Block D**: 구조 진입점만 (운영 기능 금지)

### Frozen Types

```typescript
interface StructureMetric { key, label, value, previousValue?, status? }
interface PolicyItem { key, label, status, version?, link? }
interface GovernanceAlert { id, message, level, link? }
interface StructureAction { id, label, link, icon?, description? }
interface AdminDashboardConfig { structureMetrics, policies, governanceAlerts, structureActions }
```

### Frozen Exports

```typescript
AdminDashboardLayout, StructureSnapshotBlock, PolicyOverviewBlock, GovernanceAlertBlock, StructureActionBlock
```

### 서비스별 적용

| 서비스 | 커밋 | 상태 |
|--------|------|------|
| Neture | `7d5c9c5d0` | Frozen |
| GlycoPharm | `5b3e9733a` | Frozen |
| KPA-b | `7beb12e91` | Frozen |
| KPA-c | `dda8ccb5f` | Frozen |
| K-Cosmetics | - | 별도 WO |
| KPA-a | - | Admin 없음 |

---

## 4. Freeze 규칙 (공통)

### Frozen (변경 금지)

- Block 구조 및 순서
- 최소 구성 규칙
- Layout 인터페이스
- Core 패키지 공개 API 및 타입 필드

### 금지

| 금지 | 이유 |
|------|------|
| Block 삭제/병합/순서 변경 | 구조 일관성 |
| 서비스별 독자 레이아웃 | 분산 UX 방지 |
| Admin/Operator 컴포넌트 공유 | 철학적 분리 위반 |
| 새 export / 타입 필드 변경 | API surface 고정 |

### 허용

- Block 내부 UI 개선 (인터페이스 불변)
- KPI/Quick Actions 항목 조정 (서비스별 자유)
- AI → Rule 기반 대체
- 4-Block 외부 서비스 고유 섹션 추가 (KPA-b 회계 패턴)
- 버그 수정, 성능 개선, 문서/테스트 추가

---

## 5. 신규 서비스 적용 가이드

```typescript
// Operator
import { OperatorDashboardLayout } from '@o4o/operator-ux-core';
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

// Admin
import { AdminDashboardLayout } from '@o4o/admin-ux-core';
import type { AdminDashboardConfig } from '@o4o/admin-ux-core';

// Config 빌더 작성 → Layout에 전달 → 라우트 연결
```

---

## 6. 변경 절차

Freeze 영역 변경 시: **Work Order 작성 → 전 서비스 영향도 분석 → CLAUDE.md 확인 → 문서 갱신 → 승인 후 구현**

---

*Merged from: OPERATOR_UX_CORE_FREEZE_V1.md + ADMIN_UX_CORE_FREEZE_V1.md*
*Governed by: CLAUDE.md §20, §21*
