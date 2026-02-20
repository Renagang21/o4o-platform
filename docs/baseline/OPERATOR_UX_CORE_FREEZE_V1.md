# Operator UX Core Freeze v1.0

> **Status: FROZEN**
> **Tag: `o4o-operator-ux-core-freeze-v1`**
> **Date: 2026-02-17**
> **WO: WO-O4O-OPERATOR-UX-CORE-FREEZE-V1**

---

## 1. Purpose

O4O Platform Operator 영역의 기본 대시보드 구조를 **5-Block 모델로 공식 표준화**하고
`@o4o/operator-ux-core` 패키지를 **Frozen Core**로 선언한다.

본 문서는 다음을 확정한다:

1. Operator 영역의 기본 대시보드 구조는 **5-Block으로 고정**
2. 신규 서비스는 반드시 동일 구조를 사용
3. 기존 서비스는 구조 변경 없이 유지
4. Admin UX와는 철학적으로 분리
5. `@o4o/operator-ux-core` 패키지를 Frozen Core로 전환

---

## 2. 5-Block 표준 정의

```
┌─────────────────────────────────────────┐
│  Block 1: KPI Grid                      │
│  핵심 운영 수치 (최소 4개)                │
├─────────────────────────────────────────┤
│  Block 2: AI / Insight Summary          │
│  상태 기반 인사이트 (선택적)              │
├─────────────────────────────────────────┤
│  Block 3: Action Queue                  │
│  즉시 처리 항목                          │
├─────────────────────────────────────────┤
│  Block 4: Activity Log                  │
│  최근 운영 활동 타임라인                  │
├─────────────────────────────────────────┤
│  Block 5: Quick Actions                 │
│  빠른 작업 카드                          │
└─────────────────────────────────────────┘
```

### Block 1 — KPI Grid

| 항목 | 요구사항 |
|------|----------|
| 최소 항목 | 4개 이상 |
| 데이터 | 실시간 API 기반 |
| 목적 | 운영 상태 요약 (3초 판단) |
| 상태 표시 | `neutral` / `warning` / `critical` |

### Block 2 — AI / Insight Summary

| 항목 | 요구사항 |
|------|----------|
| 방식 | AI 또는 Rule 기반 가능 |
| 최소 | 1개 메시지 (또는 "특이사항 없음" 표시) |
| 목적 | 경고 / 권고 중심 |
| 선택적 | `aiSummary` 미제공 시 빈 상태 렌더 |

### Block 3 — Action Queue

| 항목 | 요구사항 |
|------|----------|
| 내용 | 현재 처리 필요 항목 |
| 0건 | "모든 항목 처리 완료" 명시적 표시 |
| 링크 | 각 항목 → 처리 페이지 연결 필수 |

### Block 4 — Activity Log

| 항목 | 요구사항 |
|------|----------|
| 최소 | 5건 이상 (데이터 존재 시) |
| 최대 | 10~15건 권장 |
| 통합 | 복수 도메인(콘텐츠, 포럼, 주문 등) 통합 허용 |
| 정렬 | 시간순 내림차순 |

### Block 5 — Quick Actions

| 항목 | 요구사항 |
|------|----------|
| 개수 | 6~8개 |
| 구성 | 서비스 특성에 맞게 |
| 목적 | 주요 기능 진입점 |

---

## 3. Block별 최소 요구사항 요약

| Block | 필수 | 최소 항목 | 빈 상태 처리 |
|-------|------|----------|-------------|
| KPI Grid | **필수** | 4개 | - |
| AI Summary | 선택 | 0개 | "특이사항 없음" |
| Action Queue | **필수** | 0개 | "모든 항목 처리 완료" |
| Activity Log | **필수** | 0개 | "최근 활동 없음" |
| Quick Actions | **필수** | 6개 | - |

---

## 4. Core 패키지 Frozen 선언

### `@o4o/operator-ux-core`

| 항목 | 상태 |
|------|------|
| 패키지 | `packages/operator-ux-core/` |
| 공개 API | **Frozen** |
| 내부 구현 | 개선 허용 |
| 타입 인터페이스 | **Frozen** |

### Frozen Types

```typescript
// 이하 인터페이스는 구조 변경 금지
interface KpiItem { key, label, value, delta?, status? }
interface AiSummaryItem { id, message, level, link? }
interface ActionItem { id, label, count, link }
interface ActivityItem { id, message, timestamp }
interface QuickActionItem { id, label, link, icon? }
interface OperatorDashboardConfig { kpis, aiSummary?, actionQueue, activityLog, quickActions }
```

### Frozen Exports

```typescript
// Layout
OperatorDashboardLayout

// Blocks
KpiGrid
AiSummaryBlock
ActionQueueBlock
ActivityLogBlock
QuickActionBlock
```

---

## 5. 서비스별 적용 현황

| 서비스 | 특성 | 5-Block | 커밋 | 상태 |
|--------|------|---------|------|------|
| Neture | AI 중심 | PASS | `f5de08c36` | Frozen |
| GlycoPharm | 운영 중심 | PASS | `b19ff8809` | Frozen |
| K-Cosmetics | 이커머스 중심 | PASS | `3f321489a` | Frozen |
| KPA-a | 콘텐츠 흐름 중심 | PASS | `bf41b174f` | Frozen |
| KPA-b | 조직 계층 관리 | PASS | `7beb12e91` | Frozen |
| KPA-c | 경량 조직 운영 | PASS | `dda8ccb5f` | Frozen |

---

## 6. Freeze 범위

### Frozen (변경 금지)

| 항목 | 상태 |
|------|------|
| 5-Block 구조 | Frozen |
| Block 순서 (1→2→3→4→5) | Frozen |
| 최소 구성 규칙 | Frozen |
| `OperatorDashboardLayout` 인터페이스 | Frozen |
| Core 패키지 공개 API | Frozen |
| 타입 인터페이스 필드 | Frozen |

### 금지 사항

| 금지 | 이유 |
|------|------|
| Block 삭제 | 구조 일관성 파괴 |
| Block 순서 변경 | UX 학습 비용 증가 |
| KPI-only 회귀 | 단일 블록 대시보드 회귀 |
| Hub 카드형 대시보드 복귀 | 표준 위반 |
| 서비스별 독자 레이아웃 생성 | 분산 UX 방지 |
| 새로운 export 추가 | API surface 변경 |
| 타입 필드 삭제/변경 | 하위 호환성 파괴 |

### 허용 사항

| 허용 | 조건 |
|------|------|
| Block 내부 UI 개선 | 인터페이스 불변 |
| KPI 항목 조정 | 서비스별 자유 |
| AI → Rule 기반 대체 | 방식 자유 |
| Activity 데이터 소스 확장 | 인터페이스 준수 |
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
   └─ 4개 서비스 (Neture, GlycoPharm, K-Cosmetics, KPA-a)
   └─ 향후 적용 서비스 (KPA-b, KPA-c)

3. CLAUDE.md 규칙 확인
   └─ Core 동결 정책 준수

4. 문서 업데이트
   └─ 본 문서 버전 변경
   └─ 변경 이력 추가

5. 승인 후 구현
```

---

## 8. Admin UX와의 분리 원칙

| 구분 | Admin | Operator |
|------|-------|----------|
| 철학 | 구조 관리 (Structure) | 상태 운영 (State) |
| UX 패턴 | 설정/테이블 중심 | 5-Block 대시보드 |
| 진입 빈도 | 낮음 (설정 변경 시) | 높음 (일상 운영) |
| 데이터 성격 | 마스터 데이터 | 실시간 운영 데이터 |
| 패키지 | 서비스별 자체 구현 | `@o4o/operator-ux-core` |

---

## 9. 신규 서비스 적용 가이드

### Step 1: 의존성 추가

```json
{
  "dependencies": {
    "@o4o/operator-ux-core": "workspace:*"
  }
}
```

### Step 2: Dashboard Config 빌더 작성

```typescript
import type { OperatorDashboardConfig } from '@o4o/operator-ux-core';

function buildDashboardConfig(data: YourApiData): OperatorDashboardConfig {
  return {
    kpis: [...],          // 최소 4개
    aiSummary: [...],     // 선택적
    actionQueue: [...],   // 빈 배열 허용
    activityLog: [...],   // 시간순 정렬
    quickActions: [...],  // 6~8개
  };
}
```

### Step 3: Dashboard 컴포넌트 작성

```typescript
import { OperatorDashboardLayout } from '@o4o/operator-ux-core';

export default function MyOperatorDashboard() {
  // 1. fetch data
  // 2. transform to OperatorDashboardConfig
  // 3. render
  return <OperatorDashboardLayout config={config} />;
}
```

### Step 4: 라우트 연결

Operator 라우트의 index에 Dashboard 컴포넌트를 배치한다.

---

## 10. 서비스별 Block 강조도 참고

각 서비스는 동일 5-Block을 사용하되, 데이터 밀도와 강조도가 다르다:

| Block | Neture | GlycoPharm | K-Cosmetics | KPA-a | KPA-b | KPA-c |
|-------|--------|------------|-------------|-------|-------|-------|
| KPI Grid | 중 | 높음 | 중 | 중 | 중 | 높음 |
| AI Summary | **높음** | 낮음 | 낮음 | 낮음 | 낮음 | 중 |
| Action Queue | 중 | 중 | 중 | 중 | 낮음 | **높음** |
| Activity Log | 중 | 중 | 중 | **높음** | **높음** | 중 |
| Quick Actions | 중 | 중 | 중 | **높음** | **높음** | 중 |

---

## 11. 전략적 의미

이 Freeze는 다음을 의미한다:

- **1인 운영자 모델 표준화** — 소규모 팀이 즉시 파악 가능한 UX
- **서비스 확장 비용 최소화** — 신규 서비스는 Config 빌더만 작성
- **AI 밀도 차이 흡수** — Block 2를 Rule/AI 선택형으로 설계
- **조직 복잡도 흡수 기반 확보** — KPA-b/c 확장 시 동일 구조 적용 가능
- **UX 아키텍처 안정화** — Operator 영역의 시각적/구조적 일관성 보장

---

## 12. Related Documents

| 문서 | 경로 |
|------|------|
| Operator OS Baseline | `docs/_platform/BASELINE-OPERATOR-OS-V1.md` |
| Admin/Operator Role Policy | `docs/platform-core/ADMIN_OPERATOR_ROLE_POLICY_V1.md` |
| Operator UI Realignment | `docs/platform-core/OPERATOR_UI_REALIGNMENT_V1.md` |
| Hub UX Guidelines | `docs/platform/hub/HUB-UX-GUIDELINES-V1.md` |
| CLAUDE.md (Constitution) | `CLAUDE.md` Section 20 |

---

*Created: 2026-02-17*
*Version: 1.0*
*Status: FROZEN*
