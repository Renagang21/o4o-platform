# CHECK-O4O-KPA-OPERATOR-DASHBOARD-LOCAL-LAYOUT-OVERRIDE-DESIGN-V1

> WO: `WO-O4O-KPA-OPERATOR-DASHBOARD-LOCAL-LAYOUT-OVERRIDE-DESIGN-V1`  
> Date: 2026-07-25  
> Result: **DESIGN CONFIRMED / IMPLEMENTATION DEFERRED**

## 1. 결론

공통 `OperatorDashboardLayout`을 변경하지 않고 KPA 운영자 대시보드만 block 순서를 바꾸는 additive local override는 **구현 가능**하다.

권장안은 KPA 서비스 내부에 `KpaOperatorDashboardLayout` composer를 만들고, 이미 public export된 공통 block primitives를 재사용하는 것이다.

```text
@o4o/operator-ux-core
  ├─ KpiGrid
  ├─ AiSummaryBlock
  ├─ ActionQueueBlock
  ├─ ActivityLogBlock
  └─ QuickActionBlock

KPA local composer
  └─ 위 block을 데이터 변경 없이 KPA 순서로 한 번씩 조립
```

공통 기본 layout, 공통 exports, API, 권한, KPI 종류는 모두 그대로 유지된다.

## 2. 현재 공통 계약

### 2.1 `OperatorDashboardConfig`

현재 config는 다음 데이터를 제공한다.

- `kpis`
- `aiSummary`
- `actionQueue`
- `activityLog`
- `quickActions`
- optional `aboveBlocks`

block 순서나 visibility 정책을 지정하는 prop은 없다.

### 2.2 공통 layout 고정 순서

`OperatorDashboardLayout`은 다음 순서를 직접 렌더한다.

```text
aboveBlocks
KpiGrid
AiSummaryBlock
ActionQueueBlock
ActivityLogBlock
QuickActionBlock
```

### 2.3 public block exports

`@o4o/operator-ux-core` root export에 다음이 이미 포함되어 있다.

```ts
KpiGrid
AiSummaryBlock
ActionQueueBlock
ActivityLogBlock
QuickActionBlock
```

KPA가 내부 파일 경로나 비공개 API에 의존할 필요가 없다. 신규 common export도 필요 없다.

### 2.4 소비처

공통 `OperatorDashboardLayout` 직접 소비처:

- KPA Society
- GlycoPharm
- K-Cosmetics
- Neture

권장안은 KPA 소비처 한 곳만 local composer로 전환하고 나머지 세 서비스는 기존 공통 layout을 계속 사용한다.

## 3. 구현안 비교

| 안 | 방식 | 공통 변경 | 중복/위험 | 판단 |
|---|---|---:|---|---|
| A | KPA-local composer가 public blocks 조립 | 없음 | runtime 중복 없음 | **권장** |
| B | 공통 layout에 `blockOrder`/visibility prop 추가 | 있음 | 공통 frozen 계약·전체 소비처 검증 필요 | 제외 |
| C | CSS `order`, `nth-child`, `:has()`로 DOM 재배치 | 없음 | slot fragment와 조건부 block에 취약 | 제외 |
| D | 공통 layout을 여러 번 호출하고 빈 config로 분할 | 없음 | empty state·wrapper 중복 렌더 | 중지 조건 해당, 제외 |
| E | 공통 block markup을 KPA에 복사 | 없음 | UI 구현 복제·drift | 중지 조건 해당, 제외 |

## 4. 권장안 상세

### 4.1 KPA-local composer 책임

`KpaOperatorDashboardLayout`은 다음만 담당한다.

1. 공통 block primitives를 import한다.
2. KPA 전용 순서로 각 block을 정확히 한 번 렌더한다.
3. 빈 Queue와 빈 AI Summary는 block을 호출하지 않는다.
4. KPA 보조 영역을 마지막에 렌더한다.

block 내부 markup, grid, typography, icon, link 동작은 수정하지 않는다.

### 4.2 권장 렌더 순서

```tsx
<div className="space-y-6">
  {config.actionQueue.length > 0 && (
    <ActionQueueBlock items={config.actionQueue} />
  )}

  <KpiGrid items={config.kpis} />
  <QuickActionBlock items={config.quickActions} />

  {(config.aiSummary?.length ?? 0) > 0 && (
    <AiSummaryBlock items={config.aiSummary ?? []} />
  )}

  <ActivityLogBlock items={config.activityLog} />

  {auxiliary}
</div>
```

`auxiliary`는 현재의 다음 두 영역이다.

1. `AxisNavigationSection`
2. `OperatorRoleGuideCard`

보조 영역 내부 순서는 운영 네비게이션을 역할 안내보다 먼저 둔다.

### 4.3 empty state 정책

| block | 데이터 있음 | 데이터 없음 |
|---|---|---|
| Action Queue | 최상단 렌더 | 렌더하지 않음 |
| AI Summary | Quick Action 뒤 렌더 | 렌더하지 않음 |
| KPI | 기존 렌더 | 기존 `KpiGrid` 동작 |
| Activity | 기존 렌더 | 기존 `ActivityLogBlock` empty state 유지 |
| Quick Action | 기존 렌더 | 기존 `QuickActionBlock` 동작 |

빈 Queue/AI를 숨기는 것은 count나 업무 정책을 변경하지 않는다. 데이터가 생기면 즉시 같은 공통 block으로 다시 나타난다.

### 4.4 Action Queue 우선 규칙

- `actionQueue.length > 0`: 화면 첫 block.
- `actionQueue.length === 0`: 공간을 사용하지 않음.
- Queue 내부 항목 순서·count·link는 backend 응답 그대로 사용.
- KPA-local에서 정렬하거나 필터링하지 않음.

## 5. 중복 렌더링 검토

권장안은 runtime에서 공통 layout과 local layout을 함께 렌더하지 않는다.

```text
현재: KpaOperatorDashboard → OperatorDashboardLayout → 5 blocks
변경: KpaOperatorDashboard → KpaOperatorDashboardLayout → 동일 5 blocks
```

- block component 복사 없음
- block markup 복사 없음
- 동일 block 이중 렌더 없음
- config 변환/복제 없음
- KPA-local에는 조립 순서와 visibility 조건만 존재

따라서 중지 조건의 “KPA-local override가 중복 렌더링 구조를 만드는 경우”에 해당하지 않는다.

## 6. 예상 변경 파일

구현 WO의 최소 범위:

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/components/kpa-operator/KpaOperatorDashboardLayout.tsx` | 신규 local composer |
| `services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` | 공통 layout import를 KPA-local composer로 교체, auxiliary 전달 |

선택적 검증 파일:

| 파일 | 목적 |
|---|---|
| `services/web-kpa-society/src/components/kpa-operator/KpaOperatorDashboardLayout.test.tsx` | Queue 유무, AI 유무, block 순서 검증 |

변경하지 않는 파일:

- `packages/operator-ux-core/src/OperatorDashboardLayout.tsx`
- `packages/operator-ux-core/src/types.ts`
- `packages/operator-ux-core/src/index.ts`
- backend dashboard service
- route/guard/menu
- GlycoPharm/K-Cosmetics/Neture dashboard

## 7. 타 서비스 영향

직접 영향은 없다.

| 서비스 | 영향 |
|---|---|
| KPA | local composer opt-in |
| GlycoPharm | 기존 공통 layout 유지 |
| K-Cosmetics | 기존 공통 layout 유지 |
| Neture | 기존 공통 layout 유지 |

공통 package 파일, exports, type contract, build output을 변경하지 않으므로 타 서비스의 렌더 순서와 empty state도 바뀌지 않는다.

## 8. API·권한·정책 영향

- API response shape 변경 없음
- backend query/count 변경 없음
- KPI 추가·삭제·숨김 정책 변경 없음
- operator/admin 분기 변경 없음
- route/link 변경 없음
- RBAC/guard 변경 없음
- DB 변경 없음

admin 응답의 9개 KPI 문제는 별도 정책 결정 대상이며 본 override 설계에 포함하지 않는다.

## 9. 반응형 안전성

각 block 내부 grid와 breakpoint는 기존 공통 component가 그대로 담당한다.

- KPI: `grid-cols-2 md:grid-cols-4`
- Quick Action: `grid-cols-2 md:grid-cols-4`
- Axis Navigation: `grid-cols-1 md:grid-cols-2`
- 전체 spacing: 기존 `space-y-6`

따라서 새 breakpoint나 CSS 계산은 필요 없다. 다만 DOM 순서가 달라지므로 구현 WO의 배포 전후에 인증 화면을 다음 크기로 검증해야 한다.

- 1440×900
- 1366×768
- 1024×768
- 390×844

인증 브라우저가 없으면 구현 WO에서 배포 완료 판정을 하지 않는다.

## 10. 구현 가능 여부

**가능.**

다음 구현 WO는 아래 범위로 제한할 수 있다.

```text
KPA frontend 2 files
공통 package 0 files
backend/API/권한/route/DB 0 files
```

구현 후 필수 검증:

1. Queue 있음/없음 DOM 순서
2. AI 있음/없음 visibility
3. operator Quick Action 6개
4. admin Quick Action 8개와 admin KPI 보존
5. KPA web typecheck/build
6. 네 viewport 인증 browser smoke
7. KPA web 단독 배포 revision 확인

## 11. 이번 WO 수행 범위

- 설계 조사 완료
- 권장안 확정
- UI 코드 변경 없음
- 공통 코드 변경 없음
- typecheck/build 미실행(코드 변경 없음)
- 배포 미수행

## 12. 기존 작업공간 상태 보존

기존 `docs/investigations/CHECK-CODEX-ENV-SETUP-V1.md`, `.codex/`, `apps/api-server/_msm.mjs`, `apps/api-server/_msmx.mjs` 및 Neture 작업 파일은 다른 세션 소유 상태로 보존했다.

