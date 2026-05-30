# IR-O4O-NETURE-OPERATOR-DASHBOARD-DATA-ACCURACY-AUDIT-V1

> 조사 전용 IR — 원인 판정·후속 분류까지가 목표. **코드 수정 없음.**
> 일자: 2026-05-30
> 출발점: `https://neture.co.kr/operator` 대시보드 "공급자 승인 대기 2건" 표시가 실제 운영 상태와 다름.
>          → 단일 숫자 오류가 아닌 **대시보드 데이터 소스·카드 의미·action queue·AI summary 전반의 정합성** 점검.

---

## 1. Executive Summary

- **숫자 오류 자체는 backend count query 결함이 아니다.** Frontend ([NetureOperatorDashboard.tsx](../../services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx)) 는 pass-through, 백엔드 ([modules/neture/controllers/operator-dashboard.controller.ts](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts) L73-77) 는 `SELECT status, COUNT(*) FROM neture_suppliers GROUP BY status` 로 `status='PENDING'` 행 개수를 그대로 반환. → **Case A 기각 / Case B 기각 / Case C 기각**.
- **숫자 출처는 신뢰할 수 있는 SQL 이며, "2건" 은 실제 `neture_suppliers` 테이블에 PENDING row 가 2건 존재한다는 의미.** 이는 Neture 의 **two-step supplier activation** 흐름과 결합되어 "가입은 승인됐으나 공급 활성화 미완료" 상태를 카운트한다. → **Case D (stale/legacy 잔존 데이터) + Case F (실제 row 는 존재하나 운영자에게 의미 있는 처리 대상은 아님) 가능성 높음. DB row 확인 필요**.
- **별개의 정합성 결함 2건 확정** (숫자와 무관하게 dashboard 자체 정비가 필요한 항목):
  1. **Dead link 2건** — Action Queue 의 `pending-suppliers` → `/operator/admin-suppliers` 와 `unread-messages` → `/operator/contact-messages` 는 operator scope route 가 존재하지 않음 (각 `/admin/admin-suppliers`, `/admin/contact-messages` 만 정의됨, [App.tsx:930-932](../../services/web-neture/src/App.tsx#L930-L932)). 클릭 시 404 또는 root redirect.
  2. **KPI label "활성 약국" drift** — Neture 는 약국 운영 서비스가 아님에도 KPI 첫 카드 label 이 "활성 약국" (controller L187). KPA Society 로부터 copy-paste 된 흔적. 데이터 자체는 `organizations` JOIN `organization_service_enrollments WHERE service_code='neture'` 로 정확하지만 label 의미가 어긋남.
- AI Summary 는 rule-based (실제 AI 호출 아님). `suppliers.pending>0` 이면 "공급사 승인 대기 N건이 있습니다." 가 무조건 생성됨. **숫자 오정렬이 곧 AI Summary 오정렬**이라는 종속 관계 확인.
- 정비 우선순위는 본 IR §10 참조.

---

## 2. 현재 Dashboard API / Frontend 구조

### 2.1 Route 진입

[services/web-neture/src/App.tsx:968](../../services/web-neture/src/App.tsx#L968)
```tsx
<Route path="/operator" element={<NetureOperatorDashboard />} />
```

### 2.2 Frontend → 단일 API 호출 → pass-through

```text
NetureOperatorDashboard.tsx
   │
   ▼ fetchOperatorDashboard()
operatorDashboard.ts
   │
   ▼ GET /api/v1/neture/operator/dashboard
   │
   ▼ buildNetureOperatorConfig(data)  ← pass-through (operatorConfig.ts L18-38)
   │
OperatorDashboardLayout(config)  ← 5-Block 표준 layout (@o4o/operator-ux-core)
```

- [NetureOperatorDashboard.tsx:27-42](../../services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx#L27-L42) — 단일 fetch, 단일 setError
- [operatorDashboard.ts:14-22](../../services/web-neture/src/lib/api/operatorDashboard.ts#L14-L22) — `authClient.api.get('/neture/operator/dashboard')`
- [operatorConfig.ts:18-38](../../services/web-neture/src/pages/operator/operatorConfig.ts#L18-L38) — `{ kpis, aiSummary, actionQueue, activityLog, quickActions }` 그대로 반환

**→ Frontend 는 데이터 가공·정렬·계산 책임이 0. 모든 데이터 의미는 backend controller 가 결정.**

### 2.3 Backend Controller

[apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts)
- Auth: `requireAuth + requireNetureScope('neture:operator')` (L40-41)
- 핵심: 11개 SQL 을 `Promise.all` 로 병렬 실행 → 결과 파싱 → 5-block response 생성 (L50-249)
- 5-block 출력: `kpis[]` / `aiSummary[]` / `actionQueue[]` / `activityLog[]` / `quickActions[]`

---

## 3. Overview 카드별 데이터 소스 Matrix

KPI 8개 출처 ([operator-dashboard.controller.ts:186-195](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts#L186-L195)):

| # | KPI label (현재) | 값 출처 | SQL/계산 | 정합성 평가 |
|---|---|---|---|---|
| 1 | **활성 약국** | `activeOrgs` | `organizations JOIN organization_service_enrollments WHERE service_code='neture' AND isActive=true` | **Label drift** — 데이터는 정확하지만 "약국" 어휘 부적절. 실질은 "neture 가입 조직" |
| 2 | 활성 공급사 | `activeSuppliers` | `neture_suppliers WHERE status='ACTIVE'` GROUP BY | ✅ |
| 3 | 판매 상품 | `products.active` | `supplier_product_offers WHERE is_active=true AND approval_status='APPROVED'` | ✅ |
| 4 | 월간 주문 | `orders.total_orders` | `neture.neture_orders WHERE created_at >= NOW()-INTERVAL '30 days'` (`.catch` 방어) | 데이터 정확. 단 `neture_orders` 미존재 시 0 으로 fallback |
| 5 | 월간 매출 | `orders.total_revenue` | 위 동일 query, `SUM(final_amount) FILTER (status IN ('paid','preparing','shipped','delivered'))` | 동일 |
| 6 | 게시 콘텐츠 | `cms.published` | `cms_contents WHERE serviceKey='neture' AND status='published'` | ✅ |
| 7 | 활성 파트너 | `activePartners` | `neture.neture_partners WHERE status='active'` (`.catch` 방어) | ✅ |
| 8 | 정산 대기 | `pendingSettlements` | `neture_settlements WHERE status='pending'` | ✅ (값 > 0 시 warning status) |

**관찰**: 8 카드 중 5 카드가 운영 초기/저활동기에 0 으로 나오기 쉬움 (orders / revenue / partners / settlements / cms 의존). KPI 의미를 항상 의미 있게 유지하는 카드 선별이 필요.

---

## 4. "공급자 승인 대기 2건" 오류 원인

### 4.1 정확한 추적 경로

1. **카드/AI Summary 노출**: 두 위치에서 동일 값 사용
   - **Action Queue**: `{ id: 'pending-suppliers', label: '공급사 승인 대기', count: pendingSuppliers, link: '/operator/admin-suppliers' }` (controller L215)
   - **AI Summary**: rule-based `checkApprovalBacklog` 의 `'suppliers.pending'` path 가 `> 0` 이면 "공급사 승인 대기 N건이 있습니다." 생성 ([insight-rules.ts:82-86, 109-119](../../apps/api-server/src/copilot/insight-rules.ts#L82-L119))
2. **값 출처**: `pendingSuppliers = supplierCounts.find(r => r.status === 'PENDING')?.cnt || 0` (controller L171)
3. **SQL**: `SELECT status, COUNT(*)::int AS cnt FROM neture_suppliers GROUP BY status` (controller L73-77)

### 4.2 PENDING row 가 생성되는 모든 write-path (확정)

[apps/api-server/src/modules/neture/services/operator-registration.service.ts:144-215](../../apps/api-server/src/modules/neture/services/operator-registration.service.ts#L144-L215)
- **유일한 write-path**: 가입 승인 (`approveRegistration`) 트랜잭션 안에서 `service_memberships.role === 'supplier'` 인 경우 → `INSERT INTO neture_suppliers (..., status, ...) VALUES (..., 'PENDING', ...)` 실행
- 주석 (L169-170): "**WO-NETURE-SUPPLIER-APPROVAL-TWO-STEP-ACTIVATION-V1**: 가입 승인 시 PENDING으로 생성 → 운영자가 별도 공급 승인 후 ACTIVE"

[apps/api-server/src/modules/neture/services/supplier.service.ts:96](../../apps/api-server/src/modules/neture/services/supplier.service.ts#L96)
- `Supplier registered: ... (PENDING) by user ...` — `registerSupplier` 경로 (셀프 등록 흐름 — 사용자가 직접 공급자 신청 시)

### 4.3 의미 해석 — "공급 활성화 2단계 대기"

| 단계 | 상태 변화 | 행위자 | 카운트 영향 |
|---|---|---|---|
| 1단계 — 가입 신청 | `service_memberships.status='pending'` | 사용자 | "가입 승인 대기" |
| 2단계 — 가입 승인 | `service_memberships.status='active'` + `neture_suppliers` row 생성 with `status='PENDING'` | 운영자 (registration approval) | **"공급사 승인 대기" 시작 — pendingSuppliers++** |
| 3단계 — 공급 활성화 승인 | `neture_suppliers.status='ACTIVE'` | 운영자 (supplier approval, 별도 화면) | **pendingSuppliers--** |

**→ "2건" 의 실체**: `neture_suppliers` 에 `status='PENDING'` 으로 2 row 가 존재함. 이는 다음 중 하나:
- **(D) Legacy/stale**: 과거 2단계 흐름 도입 전 데이터 또는 테스트/시드 데이터가 PENDING 으로 남아 있음
- **(F) 실제 대기 상태**: 가입 승인은 끝났으나 공급 활성화 단계까지 처리되지 않은 row 가 정말 2건 존재 (운영자가 이 row 들을 "이미 끝난 건" 으로 인식하는 unintended state)

### 4.4 Case 판정

| Case | 판정 | 근거 |
|---|---|---|
| **A** Backend count query 오류 | ❌ 기각 | SQL 정확, status enum 값 매칭 정확, 결과 파싱 정확 |
| **B** Frontend mapping 오류 | ❌ 기각 | Frontend pass-through, 가공 없음 |
| **C** status enum mapping 오류 | ❌ 기각 | `'PENDING'` 대문자 일관 (write-path · count query · 비교 모두 일치) |
| **D** stale/legacy 잔존 데이터 | ⚠️ **가능성 높음 — DB 확인 필요** | 2-step activation 흐름 도입 이전의 시드/테스트 데이터 가능성 |
| **E** admin/operator dashboard 혼용 | ❌ count 자체는 기각 | 단, action queue link 차원에서 `/operator/admin-suppliers` (없음) → `/admin/admin-suppliers` (있음) 으로 admin scope 로 새는 dead link 확정 (§7 참조) |
| **F** 실제 pending 존재, UI 의미 다름 | ⚠️ **가능성 높음** | 운영자가 "공급 활성화 2단계" 의 존재를 인지하지 못해 PENDING row 가 누적될 수 있음 |

**Combined judgment**: **D + F + (별개) E-class link drift**. 숫자 자체는 신뢰 가능한 SQL 결과이지만, 그 의미가 운영자에게 명확하지 않거나 (F) / 데이터가 stale (D). 본 IR 단계에서 DB 행 확인 (created_at, user_id, organization_id, last_activity 등) 이 없으면 D vs F 확정 불가.

### 4.5 DB 확인 항목 (CLAUDE.md §0 SQL 검증 채널 — read-only)

```sql
-- 1) PENDING row 실체
SELECT ns.id, ns.user_id, ns.organization_id, ns.status,
       ns.created_at, ns.updated_at, ns.approved_at,
       u.email, u.name, u.status AS user_status
FROM neture_suppliers ns
LEFT JOIN users u ON u.id = ns.user_id
WHERE ns.status = 'PENDING'
ORDER BY ns.created_at;

-- 2) service_memberships 동기화 상태 (가입 승인 여부)
SELECT sm.user_id, sm.status AS sm_status, sm.approved_at AS sm_approved_at,
       ns.id AS supplier_id, ns.status AS ns_status, ns.approved_at AS ns_approved_at
FROM service_memberships sm
LEFT JOIN neture_suppliers ns ON ns.user_id = sm.user_id
WHERE sm.service_key = 'neture' AND ns.status = 'PENDING';
```

판정:
- created_at 이 매우 오래된 경우 → **D (stale)** 강하게 시사
- created_at 이 최근이고 가입 승인 후 의도적으로 보류된 row 면 → **F (UX 의미 차이)**

---

## 5. AI Summary 생성 로직 분석

[apps/api-server/src/copilot/insight-rules.ts](../../apps/api-server/src/copilot/insight-rules.ts)

### 5.1 핵심 사실

- **rule-based** — 실제 AI 호출 아님. 5개 패턴 (Approval Backlog / Growth Trend / Activity Drop / Order Spike / Inactivity) 의 단순 규칙 평가
- max 3 items, severity 우선 정렬 (critical → warning → info)
- 결과 0 건이면 `{ id: 'all-clear', message: '현재 긴급한 처리 항목이 없습니다.', level: 'info' }` fallback ([L274-280](../../apps/api-server/src/copilot/insight-rules.ts#L274-L280))

### 5.2 관측된 두 문구의 출처

| 화면 표시 | rule | 트리거 조건 | 생성 위치 |
|---|---|---|---|
| "공급사 승인 대기 2건이 있습니다." | `checkApprovalBacklog` | `getNum(metrics, 'suppliers.pending') > 0` (Neture case L82-86) | [insight-rules.ts:109-119](../../apps/api-server/src/copilot/insight-rules.ts#L109-L119) |
| "최근 주문이 없습니다. 플랫폼 활동을 점검하세요." | `checkInactivity` | `(orders.monthly \|\| orders.active) === 0` AND service ∈ ['neture', 'cosmetics'] | [insight-rules.ts:223-233](../../apps/api-server/src/copilot/insight-rules.ts#L223-L233) |

### 5.3 결함 분류

- **공급사 메시지**: 숫자 정렬 종속 — controller §4 의 pendingSuppliers 카운트가 의미상 stale 이면 메시지도 stale. **별개 결함 아님**, 동일 원인.
- **주문 메시지**: 문구 자체가 모호 ("플랫폼 활동을 점검하세요"). 운영자가 취해야 할 구체 action 부재. 또한 `orders.monthly === 0` 만으로 "비정상 inactivity" 판정은 서비스 초기/저트래픽 환경에서 false positive 다수.

### 5.4 권장 방향 후보 (수정 미확정 — 후속 WO 참조)

- summary 가 항상 "공급사 승인 대기 N건" 처럼 단일 metric 으로 결정되는 구조 → 실제 운영자가 행동할 수 있는 action 으로 통합
- "플랫폼 활동을 점검하세요" 처럼 vague 문구는 link 동봉 + 구체 검토 항목 명시 (예: "공급사 목록을 확인하세요" + `/operator/supply` link)
- 0 데이터일 때 inactivity 메시지를 자동 생성하지 않고 all-clear 로 통합

---

## 6. Action Queue 생성 로직 분석

[operator-dashboard.controller.ts:213-218](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts#L213-L218)

```ts
const actionQueue: ActionItem[] = [
  { id: 'pending-regs',      label: '가입 승인 대기',  count: pendingRegs,        link: '/operator/applications' },
  { id: 'pending-suppliers', label: '공급사 승인 대기', count: pendingSuppliers,   link: '/operator/admin-suppliers' },  // ⚠ dead link
  { id: 'partner-requests',  label: '파트너 요청',     count: partnerRequests,    link: '/operator/applications' },     // ⚠ pending-regs 와 동일 link
  { id: 'unread-messages',   label: '미확인 문의',     count: unreadMessages,     link: '/operator/contact-messages' }, // ⚠ dead link
];
```

### 6.1 결함

| # | id | 결함 | 영향 |
|---|---|---|---|
| 1 | pending-regs | — | 정상 |
| 2 | **pending-suppliers** | `/operator/admin-suppliers` 미정의 (App.tsx 에 `/admin/admin-suppliers` 만 존재 L932) | **클릭 시 404 또는 root redirect** |
| 3 | **partner-requests** | link 가 pending-regs 와 동일 (`/operator/applications`). 의미 분리 안 됨. partner-requests 전용 페이지 부재? | 운영자가 partner 요청을 별도로 처리할 진입점 없음 |
| 4 | **unread-messages** | `/operator/contact-messages` 미정의 (App.tsx 에 `/admin/contact-messages` 만 존재 L930) | **클릭 시 404 또는 root redirect** |

### 6.2 Empty state 처리

- Action Queue 는 `count` 가 0 이어도 항목을 제거하지 않음. 사용자에게 "처리할 항목 없음" 을 어떻게 보여줄지 layout 측 (`@o4o/operator-ux-core` `OperatorDashboardLayout`) 정책 의존. 본 IR 범위 외.

---

## 7. Route / Link 정합성

### 7.1 KPI 카드 (8개)

KPI 는 link 미보유 (KPI block 은 metric 만 표시). 영향 없음.

### 7.2 Action Queue (4개)

§6.1 참조 — **dead link 2건 확정**.

### 7.3 Quick Actions (7개)

[operator-dashboard.controller.ts:231-239](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts#L231-L239)

| id | link | App.tsx 정의 | 결과 |
|---|---|---|---|
| manage-suppliers | `/operator/supply` | L984 → redirect `/operator/all-registered-products` (L986) | ✅ |
| manage-products | `/operator/supply` | 동일 | ✅ |
| manage-orders | `/operator/orders` | L976 | ✅ |
| manage-content | `/operator/homepage-cms` | L997 | ✅ |
| manage-signage | `/operator/signage/hq-media` | L991 | ✅ |
| manage-forum | `/operator/community` | L980 | ✅ |
| manage-registrations | `/operator/applications` | L979 | ✅ |

### 7.4 AI Summary link (`SERVICE_LINKS.neture`)

[insight-rules.ts:39-44](../../apps/api-server/src/copilot/insight-rules.ts#L39-L44)

| linkKey | path | 결과 |
|---|---|---|
| suppliers | `/operator/supply` | ✅ |
| registrations | `/operator/applications` | ✅ |
| products | `/operator/product-service-approvals?status=pending` | ✅ (L1005) |
| orders | `/operator/orders` | ✅ |

### 7.5 정합성 요약

- Quick Actions / AI Summary link → 정상
- **Action Queue → dead link 2건 확정** (`/operator/admin-suppliers`, `/operator/contact-messages`)

---

## 8. 실제 운영자에게 필요한 Dashboard 구조 제안

### 8.1 현재 구조의 문제

1. **데이터-라벨 의미 분리** (활성 약국 ↔ Neture organizations)
2. **메시지 의미가 1개 metric 으로 결정** (공급사 PENDING 2건 → AI Summary 가 stale 종속)
3. **Action Queue 와 Quick Actions 의 중복** (manage-registrations vs pending-regs 둘 다 `/operator/applications`)
4. **0 으로 항상 표시되는 카드 다수** (저활동기 KPI 가독성 저하)
5. **Dead link** → 운영자의 즉시 처리 흐름 단절

### 8.2 정비 방향 (수정 미확정)

- KPI label 을 Neture 도메인 어휘로 정렬:
  - "활성 약국" → "활성 가맹 조직" 또는 "활성 매장 조직"
  - O4O-BUSINESS-PHILOSOPHY-V1 §3 의 참여 주체 어휘 (공급자 / 운영사업자 / 매장) 기반 정렬 권장
- KPI 8 카드 중 항상 0 인 항목은 hide 또는 "데이터 없음" 명시
- Action Queue 항목별 link 의 operator scope 존재 여부 verify → dead link 제거 또는 operator route 추가
- AI Summary 의 inactivity 규칙 (zero orders) 은 서비스 초기 단계와 분리 (예: `orders.total === 0 AND first_order_attempt 기간 경과` 조건 추가) — single metric 으로 단정 금지
- 공급사 PENDING 흐름 → 운영자가 "공급 활성화 처리" 페이지로 직접 진입 가능한 link 필요. 현재 Action Queue 에 그 link 가 dead 인 상태

---

## 9. 후속 WO 후보

본 IR 의 발견 사항을 case 별로 분류:

### 9.1 Case A — Backend count query 정확성 결함 → 해당 없음 (제안 WO 없음)

→ Backend SQL 자체는 정확. 수정 불필요.

### 9.2 Case B — Frontend mapping/label 결함

- **WO-O4O-NETURE-OPERATOR-DASHBOARD-KPI-LABEL-DRIFT-FIX-V1**
  - "활성 약국" KPI label 을 Neture 도메인 어휘로 정렬 (controller L187)
  - Backend KpiItem.label 1줄 수정. 범위 최소

### 9.3 Case C — Dashboard 구조 자체 정비

- **WO-O4O-NETURE-OPERATOR-DASHBOARD-ACTION-QUEUE-LINK-FIX-V1**
  - Action Queue 의 dead link 2건 제거 또는 정정 (controller L215 + L217)
  - 동시에 `/operator/admin-suppliers` / `/operator/contact-messages` 의 operator route 신설 여부 결정 필요 — admin scope 와 operator scope 가 다른 공급사·문의 처리 화면을 어떻게 분리할지 별도 설계 (POLICY 차원 결정)
  - **이 결정은 단순 string 수정이 아님** — 후속 IR 또는 별도 디자인 노트 가능

### 9.4 Case D — AI Summary / Action Queue 별도 정비

- **WO-O4O-NETURE-OPERATOR-DASHBOARD-AI-SUMMARY-INACTIVITY-RULE-REFINE-V1**
  - "최근 주문이 없습니다. 플랫폼 활동을 점검하세요." 문구의 false-positive 조건 차단
  - inactivity 규칙을 service-state-aware 하게 조정

### 9.5 Case D-side — 데이터 정합성 트랙 (UI 와 분리)

- **CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1**
  - §4.5 의 DB 쿼리로 PENDING 2건의 실체 확인 (created_at, user_status, sm_status)
  - 결과에 따라 두 가지 follow-up:
    - stale 확정 시 → `WO-O4O-NETURE-SUPPLIERS-STALE-PENDING-CLEANUP-V1` (데이터 cleanup 마이그레이션)
    - 실제 처리 대기 확정 시 → `WO-O4O-NETURE-SUPPLIER-ACTIVATION-FLOW-OPERATOR-VISIBILITY-V1` (운영자가 처리할 수 있는 화면/링크 보강)

### 9.6 (선택) Dashboard 구조 재정의 — 범위 큼

- **WO-O4O-NETURE-OPERATOR-DASHBOARD-CANONICAL-RESTRUCTURE-V1**
  - KPI 8개 → 운영자에게 의미 있는 핵심 지표로 선별 (예: 5개)
  - 0-값 카드 hide/empty state 일관화
  - Action Queue ↔ Quick Actions 중복 정리
  - **9.2/9.3/9.4 보다 큰 범위. 위 3개를 먼저 진행한 후 별도 검토 권장.**

---

## 10. 우선순위 제안

사용자 요청 의도 ("숫자 정확성 → AI Summary/Action Queue → 카드 구성/문구 정비") 와 본 조사 결과를 결합:

| 순위 | 작업 | 근거 |
|---|---|---|
| **P0** | **CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1** | 숫자의 실체 (stale vs 실제 pending) 확인이 다른 모든 결정의 전제. read-only SQL 2건. |
| **P1** | **WO-O4O-NETURE-OPERATOR-DASHBOARD-ACTION-QUEUE-LINK-FIX-V1** | dead link 는 사용자가 클릭 즉시 발견하는 결함. 범위 작음. 단, admin/operator scope 결정이 정책 차원 필요 → "link 제거 only" 와 "operator route 신설 포함" 두 옵션 분리 검토. |
| **P2** | **WO-O4O-NETURE-OPERATOR-DASHBOARD-KPI-LABEL-DRIFT-FIX-V1** | "활성 약국" 라벨 1줄 수정. Neture 도메인 어휘 정합. |
| **P3** | **P0 결과 기반 후속 WO** | stale 확정 시 cleanup, 실제 pending 확정 시 operator visibility 보강 (둘 중 하나) |
| **P4** | **WO-O4O-NETURE-OPERATOR-DASHBOARD-AI-SUMMARY-INACTIVITY-RULE-REFINE-V1** | "플랫폼 활동을 점검하세요" 문구 + zero-orders 규칙 정비 |
| **P5 (선택)** | **WO-O4O-NETURE-OPERATOR-DASHBOARD-CANONICAL-RESTRUCTURE-V1** | KPI 카드 재선별, 중복 정리. 범위 가장 큼. P1~P4 결과 보고 결정. |

---

## 11. Current Structure vs O4O Philosophy Conflict Check

[docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) 와의 정렬 점검:

| 영역 | 현재 dashboard | Philosophy SSOT | 정합성 |
|---|---|---|---|
| KPI "활성 약국" 어휘 | Neture organizations 를 "약국" 으로 표시 | §3 참여 주체 = 공급자 / 운영사업자 / **매장** | ❌ "약국" 은 KPA 영역 어휘. Neture 매장은 "약국" 으로 한정되지 않음 |
| AI Summary 문구 | 단일 metric → "공급사 승인 대기 N건" 으로 운영자 행동 유도 | §6 AI 역할 — 운영자가 행동 가능한 인사이트 제공 | ⚠️ 단일 숫자 종속이라 stale data 시 false alarm 발생 |
| Action Queue 의미 분리 | pending-regs 와 partner-requests 가 동일 link | §4 Canonical Flow — 가입 / 입점 / 파트너 협업은 별개 흐름 | ⚠️ 운영자 입장에서 두 흐름의 구분 진입점 부재 |
| Hard delete 미노출 정책 | 본 dashboard 범위 외 | 운영자 vs 관리자 권한 분리 (USER-OPERATOR-FREEZE-V1 F11) | ✅ Dashboard 자체에 hard delete 노출 없음 |
| dead link `/admin/*` → operator scope 누수 | Action Queue 의 dead link 가 admin 화면으로 새는 흐름 | F11 — Operator=membership 기반, scope 격리 | ⚠️ 운영자가 dashboard 에서 admin scope 화면으로 이동하려 시도하는 의도하지 않은 link |

**결론**: 본 dashboard 의 구조적 결함은 O4O philosophy 와 직접 충돌하지 않지만, **어휘·흐름·scope 의 세 축에서 alignment drift** 가 누적되어 있음. P1~P3 의 정렬 작업이 곧 철학 정합 작업과 동치.

---

## 12. 미확인 항목 (추적)

- [ ] `neture_suppliers` 의 `status='PENDING'` 2 row 실체 — created_at, user 상태, organization 연동 여부 (§4.5 의 SQL 실행 필요)
- [ ] `partner-requests` count 의 출처 `neture_partnership_requests WHERE status='OPEN'` 가 실제 운영 흐름과 일치하는지 (별도 IR/CHECK 필요 시)
- [ ] `/operator/admin-suppliers` / `/operator/contact-messages` 의 operator scope 화면 미정의가 의도된 정책 (admin only) 인지, 누락된 신규 작업인지 결정 (정책 차원)

---

*본 IR 은 코드 분석 기반으로 작성됨. DB 실데이터 확인 항목은 §4.5 / §12 에 명시.*
*코드 수정 없음. 후속 WO 분류 + 우선순위 제안만 포함.*
