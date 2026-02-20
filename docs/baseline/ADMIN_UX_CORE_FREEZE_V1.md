# Admin UX Core Freeze v1.0

> **Status: FROZEN**
> **Tag: `v0.95-admin-ux-baseline`**
> **Date: 2026-02-17**
> **WO: WO-O4O-ADMIN-UX-CORE-FREEZE-V1**

---

## 1. Purpose

O4O Platform Admin 영역의 기본 대시보드 구조를 **4-Block 모델로 공식 표준화**하고
`@o4o/admin-ux-core` 패키지를 **Frozen Core**로 선언한다.

본 문서는 다음을 확정한다:

1. Admin 영역의 기본 대시보드 구조는 **4-Block으로 고정**
2. 신규 서비스는 반드시 동일 구조를 사용
3. 기존 서비스는 구조 변경 없이 유지
4. Operator UX 5-Block과는 **완전 분리**
5. `@o4o/admin-ux-core` 패키지를 Frozen Core로 전환

---

## 2. 4-Block 표준 정의

```
┌─────────────────────────────────────────┐
│  Block A: Structure Snapshot            │
│  구조 지표 표시 (운영 KPI 금지)          │
├─────────────────────────────────────────┤
│  Block B: Policy Overview               │
│  정책/설정 상태 표시                     │
├─────────────────────────────────────────┤
│  Block C: Governance Alerts             │
│  구조 리스크 감지 (핵심)                 │
├─────────────────────────────────────────┤
│  Block D: Structure Actions             │
│  구조 변경 진입점                        │
└─────────────────────────────────────────┘
```

### Block A — Structure Snapshot

| 항목 | 요구사항 |
|------|----------|
| 최소 항목 | 3개 이상 |
| 데이터 | 구조 지표만 (KPI 금지) |
| 목적 | 구조 건강도 요약 |
| 상태 표시 | `stable` / `attention` / `critical` |
| 금지 | 매출, 주문, 운영 KPI |

### Block B — Policy Overview

| 항목 | 요구사항 |
|------|----------|
| 최소 항목 | 2개 이상 |
| 상태 | `configured` / `not_configured` / `partial` |
| 목적 | 정책 설정 현황 파악 |
| 링크 | 정책 관리 페이지 연결 |

### Block C — Governance Alerts

| 항목 | 요구사항 |
|------|----------|
| 내용 | 구조적 리스크만 (운영 이슈 금지) |
| 0건 | "구조 이상 없음" 명시적 표시 |
| 수준 | `info` / `warning` / `critical` |
| 링크 | 해결 페이지 연결 |

### Block D — Structure Actions

| 항목 | 요구사항 |
|------|----------|
| 개수 | 3~6개 |
| 구성 | Admin 전용 구조 진입점 |
| 목적 | 구조 변경 작업 진입 |
| 금지 | 운영 기능 링크 |

---

## 3. Block별 최소 요구사항 요약

| Block | 필수 | 최소 항목 | 빈 상태 처리 |
|-------|------|----------|-------------|
| Structure Snapshot | **필수** | 3개 | - |
| Policy Overview | **필수** | 2개 | - |
| Governance Alerts | **필수** | 0개 | "구조 이상 없음" |
| Structure Actions | **필수** | 3개 | - |

---

## 4. Core 패키지 Frozen 선언

### `@o4o/admin-ux-core`

| 항목 | 상태 |
|------|------|
| 패키지 | `packages/admin-ux-core/` |
| 공개 API | **Frozen** |
| 내부 구현 | 개선 허용 |
| 타입 인터페이스 | **Frozen** |

### Frozen Types

```typescript
// 이하 인터페이스는 구조 변경 금지
interface StructureMetric { key, label, value, previousValue?, status? }
interface PolicyItem { key, label, status, version?, link? }
interface GovernanceAlert { id, message, level, link? }
interface StructureAction { id, label, link, icon?, description? }
interface AdminDashboardConfig { structureMetrics, policies, governanceAlerts, structureActions }
```

### Frozen Exports

```typescript
// Layout
AdminDashboardLayout

// Blocks
StructureSnapshotBlock
PolicyOverviewBlock
GovernanceAlertBlock
StructureActionBlock
```

---

## 5. 서비스별 적용 현황

| 서비스 | 특성 | 4-Block | 커밋 | 상태 |
|--------|------|---------|------|------|
| Neture | 정책/AI 중심 | PASS | `7d5c9c5d0` | Frozen |
| GlycoPharm | 네트워크/조직 구조 중심 | PASS | `5b3e9733a` | Frozen |
| K-Cosmetics | - | - | - | 별도 WO |
| KPA-a | - | - | - | Admin 대시보드 없음 |
| KPA-b | 분회 조직 관리 | PASS | `7beb12e91` | Frozen |
| KPA-c | 지부 구조 관리 | PASS | `dda8ccb5f` | Frozen |

---

## 6. Freeze 범위

### Frozen (변경 금지)

| 항목 | 상태 |
|------|------|
| 4-Block 구조 | Frozen |
| Block 순서 (A→B→C→D) | Frozen |
| Block 책임 정의 | Frozen |
| `AdminDashboardLayout` 인터페이스 | Frozen |
| Core 패키지 공개 API | Frozen |
| 타입 인터페이스 필드 | Frozen |

### Block 책임 정의 (Frozen)

| Block | 책임 | 금지 |
|-------|------|------|
| Structure Snapshot | 구조 지표 표시 | 매출/주문/운영 KPI |
| Policy Overview | 정책/설정 상태 표시 | 운영 상태 표시 |
| Governance Alerts | 구조 리스크 감지 | 운영 이슈 표시 |
| Structure Actions | 구조 변경 진입점 | 운영 기능 진입점 |

### 금지 사항

| 금지 | 이유 |
|------|------|
| Block 삭제 | 구조 일관성 파괴 |
| Block 순서 변경 | UX 학습 비용 증가 |
| Block 병합 | 책임 경계 파괴 |
| 매출/주문 KPI를 Snapshot에 포함 | Admin ≠ Operator |
| Activity Log 추가 | Operator 영역 침범 |
| Quick Actions를 운영 기능으로 확장 | Admin ≠ Operator |
| Operator UX와 컴포넌트 공유 | 철학적 분리 위반 |
| 새로운 export 추가 | API surface 변경 |
| 타입 필드 삭제/변경 | 하위 호환성 파괴 |

### 허용 사항

| 허용 | 조건 |
|------|------|
| Block 내부 UI 개선 | 인터페이스 불변 |
| Structure Metric 항목 조정 | 서비스별 자유 |
| Policy 항목 조정 | 서비스별 자유 |
| Governance Alert 규칙 추가 | 인터페이스 준수 |
| 버그 수정 | 무조건 허용 |
| 성능 개선 | 인터페이스 불변 |
| 문서/테스트 추가 | 무조건 허용 |

---

## 7. 변경 절차

Freeze 영역을 변경하려면 다음 절차를 따른다:

```
1. 신규 Work Order 작성
   └─ 변경 사유 명시
   └─ 영향 범위 명시

2. 전 서비스 영향도 분석
   └─ Neture, GlycoPharm (적용 완료)
   └─ K-Cosmetics, KPA-a (향후 적용)

3. CLAUDE.md 규칙 확인
   └─ Core 동결 정책 준수

4. 문서 업데이트
   └─ 본 문서 버전 변경
   └─ 변경 이력 추가

5. 승인 후 구현
```

---

## 8. Admin ↔ Operator 분리 원칙 (Frozen)

| 구분 | Admin (4-Block) | Operator (5-Block) |
|------|-----------------|-------------------|
| 철학 | 구조 관리 (Structure) | 상태 운영 (State) |
| 패키지 | `@o4o/admin-ux-core` | `@o4o/operator-ux-core` |
| Block 수 | 4 | 5 |
| KPI 포함 | 금지 | 필수 |
| Activity Log | 없음 | 있음 |
| Quick Actions | 구조 진입점만 | 운영 기능 포함 |
| 진입 빈도 | 낮음 (설정 변경 시) | 높음 (일상 운영) |
| 데이터 성격 | 마스터/구조 데이터 | 실시간 운영 데이터 |

---

## 9. 신규 서비스 적용 가이드

### Step 1: 의존성 추가

```json
{
  "dependencies": {
    "@o4o/admin-ux-core": "workspace:*"
  }
}
```

### Step 2: Dashboard Config 빌더 작성

```typescript
import type { AdminDashboardConfig } from '@o4o/admin-ux-core';

function buildAdminConfig(data: YourApiData): AdminDashboardConfig {
  return {
    structureMetrics: [...],    // 최소 3개, 구조 지표만
    policies: [...],            // 최소 2개
    governanceAlerts: [...],    // 구조 리스크만
    structureActions: [...],    // 3~6개, Admin 전용
  };
}
```

### Step 3: Dashboard 컴포넌트 작성

```typescript
import { AdminDashboardLayout } from '@o4o/admin-ux-core';

export default function MyAdminDashboard() {
  // 1. fetch data
  // 2. transform to AdminDashboardConfig
  // 3. render
  return <AdminDashboardLayout config={config} />;
}
```

### Step 4: 라우트 연결

Admin 라우트의 index에 Dashboard 컴포넌트를 배치한다.
Operator 라우트와 완전 분리 유지.

---

## 10. 전략적 의미

이 Freeze는 다음을 의미한다:

- **Admin/Operator 완전 분리 달성** — 두 영역이 구조적으로 독립
- **서비스 확장 비용 최소화** — 신규 서비스는 Config 빌더만 작성
- **구조 거버넌스 표준화** — Governance Alerts로 구조 리스크 가시화
- **플랫폼 UX 아키텍처 완성** — Operator 5-Block + Admin 4-Block = 통합 UX 체계

---

## 11. Related Documents

| 문서 | 경로 |
|------|------|
| Operator UX Core Freeze | `docs/platform-core/OPERATOR_UX_CORE_FREEZE_V1.md` |
| Admin/Operator Role Policy | `docs/platform-core/ADMIN_OPERATOR_ROLE_POLICY_V1.md` |
| Operator UI Realignment | `docs/platform-core/OPERATOR_UI_REALIGNMENT_V1.md` |
| Operator OS Baseline | `docs/_platform/BASELINE-OPERATOR-OS-V1.md` |
| CLAUDE.md (Constitution) | `CLAUDE.md` Section 20 |

---

*Created: 2026-02-17*
*Version: 1.0*
*Status: FROZEN*
