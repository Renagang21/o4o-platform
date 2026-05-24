---
id: IR-O4O-NETURE-ADMIN-DASHBOARD-AND-ACTIONS-IA-AUDIT-V1
title: Neture /admin · /admin/actions IA 정합성 점검 및 재설계 방향
status: completed
date: 2026-05-24
domain: neture / operator-admin / IA / dashboard
related:
  - IR-O4O-NETURE-ADMIN-DASHBOARD-KPI-SCOPE-AUDIT-V1
  - WO-O4O-ADMIN-OPERATOR-DASHBOARD-SEPARATION-V1
  - WO-O4O-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
  - WO-NETURE-OSA-PHASEA-DECISION-PRESSURE-REMOVE-V1
  - F11 USER-OPERATOR-FREEZE-V1
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §7 (Boundary Policy — serviceKey/storeId)
  - CLAUDE.md §11 (Operator Dashboard 표준 — Admin/Operator 역할 구분)
  - CLAUDE.md §14 F11 (Operator=membership 기반)
  - 사업철학 SSOT §3.2 (운영사업자 정의)
---

# IR-O4O-NETURE-ADMIN-DASHBOARD-AND-ACTIONS-IA-AUDIT-V1

> Neture 의 `/admin` 및 `/admin/actions` 화면 전체를 코드 레벨에서 조사하여, 현재 URL · 데이터 · 권한 구조가 운영 의사결정에 적합한지 평가하고 IA 재설계 방향을 확정한다.

---

## 0. TL;DR

| 의문 | 코드 fact 기반 답 |
|------|-----------------|
| `/admin` 이 platform admin 화면인가? | **아니다** — Neture 멤버십 필수 (`requireMembership='neture'`), Neture 내부 admin tier |
| `/admin` 과 `/operator` URL 분리는 의미 있나? | 권한·레이아웃은 분리됨 (AdminRoute vs OperatorRoute) |
| `/admin/actions` 가 admin 고유 의미가 있나? | **없다** — `/operator/actions` 와 **동일한 OperatorActionQueuePage 컴포넌트** 공유, routePrefix 분기만 다름 → IA Drift |
| 재설계 필요한가? | 부분 재설계 권장 — `/admin/actions` Rebuild + Structure Actions link 정렬 + `/admin` 라벨 명확화 |

**핵심 Drift 1 건**: [App.tsx:919-921](services/web-neture/src/App.tsx#L919) — `/admin/actions` 와 `/operator/actions` 가 같은 `OperatorActionQueuePage` 를 렌더 → admin tier 고유 액션 없음.

---

## 1. 배경

- 선행 IR ([IR-O4O-NETURE-ADMIN-DASHBOARD-KPI-SCOPE-AUDIT-V1](docs/audit/IR-O4O-NETURE-ADMIN-DASHBOARD-KPI-SCOPE-AUDIT-V1.md)) 에서 `총 사용자 22` 단일 쿼리 Drift 확인.
- 추가 의문: 이 1 라인이 Drift 의 전부인지, 아니면 `/admin` IA 자체가 모호한지.
- 사용자 시그널:
  - `/admin` URL 의미 불명확 (platform admin 인가, Neture 운영 화면인가)
  - `/admin/actions` 가 운영 의사결정 화면이라기보다 구조 스냅샷/로그에 가까움
- 본 IR 은 IA 전체 재검토로 확장한다.

---

## 2. 조사 범위

| # | 범위 | 산출물 |
|---|------|--------|
| 1 | 라우트/권한 구조 — `/admin*` `/operator*` 매핑 | 라우트 표 + Guard / role 매핑 |
| 2 | 화면 구성 전수 — `/admin` 4-block, `/admin/actions` 항목 | 항목별 표 |
| 3 | 데이터 source / scope | API + SQL + service_key 필터 검증 |
| 4 | 실용성 평가 (Keep/Rename/Move/Remove/Rebuild) | 항목별 분류 |
| 5 | URL/IA 재설계안 (A/B/C/D) | 비교표 + 권장안 |
| 6 | 역할별 대시보드 첫 화면 제안 | neture:operator / neture:admin / platform:super_admin |
| 7 | Philosophy Conflict Check | CLAUDE.md §7, §11, §14 F11, 사업철학 SSOT §3.2 정합성 |
| 8 | 후속 WO 제안 | 우선순위 + 작업 경계 |

---

## 3. 조사 결과 — 라우트/권한 구조

### 3.1 프론트엔드 라우트 매핑

**파일**: [services/web-neture/src/App.tsx](services/web-neture/src/App.tsx)

| URL | Guard | 허용 role | 레이아웃 | 라인 |
|-----|-------|----------|---------|-----:|
| `/admin/*` | `AdminRoute` | `neture:admin`, `platform:super_admin` | AdminLayoutWrapper ("Neture Admin") | [L878-881](services/web-neture/src/App.tsx#L878-L881) |
| `/operator/*` | `OperatorRoute` | `neture:operator` (admin 은 `/admin` 으로 리디렉트) | OperatorLayoutWrapper ("Neture") | [L954-957](services/web-neture/src/App.tsx#L954-L957) |

공통: `requireMembership='neture'` — 두 URL 모두 **Neture 가입자만 접근 가능 → platform 화면 아님**.

**Guard 정의**: [services/web-neture/src/components/auth/RoleGuard.tsx:128-162](services/web-neture/src/components/auth/RoleGuard.tsx#L128-L162)

```typescript
// AdminRoute (L152-162)
<RouteGuard
  allowedRoles={ADMIN_ROLES}              // ['neture:admin', 'platform:super_admin']
  requireMembership="neture"
  fallback={fallback}
/>

// OperatorRoute (L128-142)
<RouteGuard
  allowedRoles={OPERATOR_ROLES}           // ['neture:operator']
  requireMembership="neture"
  redirectMap={{
    [NETURE_ROLES.ADMIN]: '/admin',       // admin 은 /admin 으로 강제 이동
    [NETURE_ROLES.PLATFORM_SUPER_ADMIN]: '/admin',
  }}
/>
```

**역할 상수**: [services/web-neture/src/lib/role-constants.ts:35-48](services/web-neture/src/lib/role-constants.ts#L35-L48)

### 3.2 백엔드 라우터 매핑

| 경로 | 미들웨어 | 위치 |
|------|---------|-----:|
| `/api/v1/neture/admin/*` | `requireAuth` + `requireNetureScope('neture:admin')` | [neture.routes.ts:80](apps/api-server/src/modules/neture/neture.routes.ts#L80) |
| `/api/v1/neture/operator/*` | `requireAuth` + scope 별 (`'neture:operator'`) | [neture.routes.ts:145-165](apps/api-server/src/modules/neture/neture.routes.ts#L145-L165) |

**Scope 정의**: [packages/security-core/src/service-configs.ts:138-155](packages/security-core/src/service-configs.ts#L138-L155)
- `scopeRoleMapping['neture:operator'] = ['neture:operator', 'neture:admin']` → operator API 는 admin 도 호출 가능 (하위호환)
- `platformBypass: true` → `platform:super_admin` 모든 scope 통과

### 3.3 IA 정합성 판정 (라우트 차원)

| 항목 | 판정 |
|------|------|
| `/admin` 은 platform 화면인가 | ❌ 아니다 — `requireMembership='neture'` 강제 |
| `/admin` 과 `/operator` 분리는 명확한가 | ✅ Guard·레이아웃·백엔드 모두 분리 |
| URL 이름이 적절한가 | ⚠️ "admin" 이 platform admin 으로 오해되기 쉬움. 의미상 "Neture admin tier" 이나 URL 만 보면 모호 |
| CLAUDE.md §11 정합성 | ✅ Admin=구조/정책/거버넌스/금융, Operator=운영/콘텐츠/모니터링 — 분리 의도와 일치 |

---

## 4. 조사 결과 — `/admin` 화면 구성 (4-block)

**페이지**: [services/web-neture/src/pages/admin/AdminDashboardPage.tsx:20-69](services/web-neture/src/pages/admin/AdminDashboardPage.tsx#L20-L69)
**API**: `GET /api/v1/neture/admin/dashboard` → [admin-dashboard.controller.ts](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts)
**레이아웃**: [packages/admin-ux-core/src/AdminDashboardLayout.tsx](packages/admin-ux-core/src/AdminDashboardLayout.tsx) — 4-block 순차

### 4.1 Block A — Structure Snapshot (6 KPI)

| # | 라벨 | SQL | Scope | 사용자 행동 유발 |
|---|------|-----|------|---------------|
| 1 | **총 사용자** | (선행 fix) `service_memberships WHERE service_key='neture' AND status='active'` | Neture | N — 상태 정보 |
| 2 | 활성 공급사 | `neture_suppliers WHERE status='ACTIVE'` | Neture | N — 상태 정보 |
| 3 | 승인 대기 | `offer_service_approvals WHERE service_key='neture' AND approval_status='pending'` | Neture | Y — `status='attention'` 시 |
| 4 | 활성 파트너 | `neture.neture_partners WHERE status='active'` | Neture | N — 상태 정보 |
| 5 | 활성 상품 | `supplier_product_offers WHERE is_active=true AND approval_status='APPROVED'` | ⚠️ service_key 필터 부재 (Neture 전용 테이블 가정) | N — 상태 정보 |
| 6 | 정산 대기 | `neture_settlements WHERE status='pending'` | Neture | Y — `status='attention'` 시 |

→ **6 개 중 2 개만 액션 유발 (승인 대기, 정산 대기). 나머지 4 개는 readout. admin tier 의 "구조 지표" 라벨에 부합.**

### 4.2 Block B — Policy Overview (3 항목)

| 라벨 | source | link 대상 | 페이지 존재 |
|------|-------|---------|----------|
| 공급사 승인 대기 | `neture_suppliers WHERE status='PENDING'` | `/admin/admin-suppliers` | ✅ AdminSupplierApprovalPage |
| 가입 승인 대기 | `service_memberships WHERE service_key='neture' AND status='pending'` | `/admin/applications` | ✅ RegistrationRequestsPage |
| 파트너 요청 | `neture_partnership_requests WHERE status='OPEN'` | `/admin/applications` | ✅ (동일) |

→ **3 개 모두 admin tier 의 정책/승인 영역 — 라벨/링크 정합.**

### 4.3 Block C — Governance Alerts (AI insights)

- 5 rule (Approval Backlog / Growth / Activity Drop / Order Spike / Inactivity) + LLM 보강 (3s timeout, fallback rule)
- 위치: [apps/api-server/src/copilot/insight-rules.ts:70-236](apps/api-server/src/copilot/insight-rules.ts#L70-L236) + [copilot-engine.service.ts:73-119](apps/api-server/src/copilot/copilot-engine.service.ts#L73-L119)
- 표시: 최대 3 개, 0 개면 "구조 이상 없음" 초록 배경

→ **admin 시점의 거버넌스 경보 — admin tier 고유 가치 있음.**

### 4.4 Block D — Structure Actions (6 link)

| ID | 라벨 | 대상 URL | 페이지 |
|----|------|---------|-------|
| manage-users | 사용자 관리 | `/admin/users` | ✅ UsersManagementPage |
| manage-operators | 운영자 관리 | `/admin/operators` | ✅ OperatorsPage |
| manage-suppliers | 공급사 승인 | `/admin/admin-suppliers` | ✅ AdminSupplierApprovalPage |
| manage-settlements | 정산 관리 | `/admin/settlements` | ✅ AdminSettlementsPage |
| manage-commissions | 커미션 관리 | `/admin/commissions` | ✅ AdminCommissionsPage |
| manage-roles | 역할 관리 | `/admin/roles` | ✅ RoleManagementPage |

→ **6 개 모두 admin tier 의 구조/금융/권한 진입점 — 라벨/링크 정합.**

---

## 5. 조사 결과 — `/admin/actions` 화면 구성

### 5.1 라우트 매핑 — **핵심 Drift 위치**

[services/web-neture/src/App.tsx:919](services/web-neture/src/App.tsx#L919) 및 동일 라우트군:

```typescript
<Route path="/admin/actions" element={<OperatorActionQueuePage />} />   // L919
...
<Route path="/operator/actions" element={<OperatorActionQueuePage />} />  // L967
```

**동일 컴포넌트** [`OperatorActionQueuePage`](services/web-neture/src/pages/operator/OperatorActionQueuePage.tsx) 가 두 URL 에서 렌더됨. 차이는 페이지 내부 `routePrefix` 분기 ([L54](services/web-neture/src/pages/operator/OperatorActionQueuePage.tsx#L54)) — link URL 만 `/admin` vs `/operator` 로 치환.

### 5.2 화면 구성

- KPI 카드 3 개 (총 작업 / 긴급 / AI 추천)
- Action 테이블 — system + AI 추천 항목

| ID | 타입 | 라벨 | 우선순위 | 액션 |
|----|------|------|---------|------|
| `pending-regs` | approval | 가입 승인 대기 | high | NAVIGATE `/operator/applications` (or `/admin/applications`) |
| `pending-suppliers` | approval | 공급사 승인 대기 | high | NAVIGATE `/operator/admin-suppliers` (or `/admin/admin-suppliers`) |
| `unread-messages` | inquiry | 미확인 문의 | medium | **EXECUTE** — POST `/neture/operator/actions/execute/inquiries-mark-read` |
| `partner-requests` | approval | 파트너 요청 | medium | NAVIGATE `/operator/applications` |
| `ai-inquiry` (AI) | rule | 응답 지연 안내 | confidence 90% | EXECUTE |
| `ai-supplier-delay` (AI) | rule | 공급사 온보딩 지연 | confidence 75% | NAVIGATE |

**Backend**: [operator-action-queue.controller.ts](apps/api-server/src/modules/neture/controllers/operator-action-queue.controller.ts) + [operator-ai-action.service.ts](apps/api-server/src/modules/neture/services/operator-ai-action.service.ts)

### 5.3 Drift 정합성 판정 (`/admin/actions`)

| 항목 | 판정 |
|------|------|
| admin tier 고유 액션 표시 | ❌ — operator action queue 와 동일 |
| admin 시점에서 의미가 다른가 | ❌ — `routePrefix` 만 다르고 데이터는 동일 |
| admin 이 봐야 할 항목인가 | ⚠️ — 가입/공급사/파트너 승인은 admin 정책 영역에 걸침, 미확인 문의 / 응답 지연은 operator 영역 |
| URL 명명 정합성 | ❌ — `OperatorActionQueuePage` 라는 이름의 컴포넌트가 `/admin/actions` 에 매핑됨 |

→ **이건 명백한 IA Drift. admin/operator 의 화면 분리가 시각적으로만 존재 (레이아웃 라벨), 내용은 동일.**

---

## 6. 실용성 평가 (항목별)

| 화면/항목 | 분류 | 근거 |
|----------|------|------|
| `/admin` Block A — 총 사용자 | **Keep** (선행 IR fix 적용 후) | Neture 가입자 수 — admin 의 사용자 베이스 모니터링 |
| `/admin` Block A — 활성 공급사/파트너/상품 | **Keep** | 구조 지표 readout, admin tier 적합 |
| `/admin` Block A — 승인 대기 / 정산 대기 | **Keep** | attention 트리거 + admin 직접 처리 영역 |
| `/admin` Block B — 3 항목 | **Keep** | 정책/승인 카드 — admin 정책 영역 |
| `/admin` Block C — Governance Alerts | **Keep** | admin tier 고유 — 거버넌스 관점 |
| `/admin` Block D — 6 진입점 | **Keep** | 모두 admin 영역 페이지로 연결 |
| `/admin/actions` 전체 | **Rebuild** | admin tier 고유 action queue 없음 — operator 화면 중복 |
| `OperatorActionQueuePage` 컴포넌트 | **Move (semantic)** | 이름·실체 모두 operator. `/admin/actions` 매핑 제거 필요 |

---

## 7. URL/IA 재설계안 (4 후보 비교)

| 안 | 내용 | 장점 | 단점 |
|----|------|------|------|
| **A. 현재 `/admin` 유지** | 변경 없음 | 무비용 | `/admin/actions` Drift 잔존, IA 모호 지속 |
| **B. `/operator` 로 통합** | `/admin/*` 제거, 모든 화면 `/operator` 로 | URL 단일화 | admin/operator 권한 차이 소실 — CLAUDE.md §11 위반 |
| **C. `/operator/dashboard`, `/operator/actions` 로 이동** | admin 도 operator URL 사용 | URL 일관성 | admin tier 고유 화면 (Governance Alerts, Structure Actions) 표현 어려움 |
| **D. `/admin` = Neture admin tier 유지, `/admin/actions` 만 Rebuild** ★ | `/admin` 4-block + admin 고유 action queue 분리 | CLAUDE.md §11 정합, 최소 변경 | admin 고유 action queue 설계 필요 |

### 7.1 권장: **변형 D**

- `/admin` Dashboard (4-block) **유지**
- `/admin/actions` **Rebuild** — admin tier 고유 action queue 로 재정의
  - 후보 항목 (admin 책임 영역):
    - Governance Alerts critical level 미해결
    - 정책 변경 요청 (역할/커미션/공급사 정책)
    - 미정산 금액 임계치 초과
    - 신규 공급사 정책 검토 필요
    - AI 거버넌스 정책 변경 제안 (`/admin/ai-admin/policy`)
- `/operator/actions` 의 `OperatorActionQueuePage` 는 그대로 — operator 의 일상 처리 화면
- `/admin/actions` 라우트에서 `OperatorActionQueuePage` 매핑 **제거**

### 7.2 URL 명명 명확화

- `/admin` URL 이 platform admin 으로 오해되는 우려에 대한 옵션 두 가지:
  - **옵션 1** (권장 — 코드 변경 없음): URL 유지 + 레이아웃 상단에 "Neture 관리자" 라벨 강조. 코드에서는 이미 `serviceName="Neture Admin"` ([AdminLayoutWrapper.tsx L1-41](services/web-neture/src/components/layouts/AdminLayoutWrapper.tsx#L1-L41)) 적용됨 → 추가 변경 불필요.
  - **옵션 2** (장기): platform 전용 admin 화면이 생긴다면 `/platform/admin/*` 으로 분리하고, Neture admin 은 그대로 `/admin/*` 유지. 현재는 platform admin 화면 자체가 없으므로 미선택.

---

## 8. 역할별 대시보드 첫 화면 제안

| 역할 | 첫 화면 | 근거 |
|------|--------|------|
| `neture:operator` | `/operator` (NetureOperatorDashboard) | 일상 운영 처리 — 현 상태 유지 |
| `neture:admin` | `/admin` (AdminDashboardPage 4-block) | 구조·정책·거버넌스 — 현 상태 유지, `/admin/actions` 만 Rebuild |
| `platform:super_admin` | `/admin` (현재 bypass 통과) — 장기적으로 `/platform/admin` 분리 검토 | scopeRoleMapping 의 `platformBypass: true` 활용. 단, platform admin 화면이 만들어지기 전까지는 `/admin` 으로 충분 |

**OperatorRoute redirectMap** ([RoleGuard.tsx L128-142](services/web-neture/src/components/auth/RoleGuard.tsx#L128-L142)) 은 이미 `neture:admin` 을 `/admin` 으로 자동 보냄 → 첫 화면 정렬은 코드 레벨에서 이미 구현되어 있음.

---

## 9. Philosophy Conflict Check

| 정합성 검증 항목 | 현재 상태 | 판정 |
|----------------|---------|------|
| CLAUDE.md §11 Admin/Operator 역할 정의 | Admin=구조/정책/거버넌스/금융, Operator=운영/콘텐츠/모니터링 | ✅ `/admin` Dashboard 와 정렬 / ❌ `/admin/actions` 만 Drift |
| CLAUDE.md §7 Boundary Policy (serviceKey 분리) | 모든 KPI/Action 이 Neture scope (선행 IR fix 적용 후) | ✅ |
| CLAUDE.md §14 F11 (User/Operator Freeze, membership 기반) | Operator = service_memberships 기반, role 단독 사용 금지 | ✅ AdminRoute / OperatorRoute 모두 `requireMembership='neture'` 적용 |
| 사업철학 SSOT §3.2 (운영사업자 정의) | "서비스 운영 사업자" = Operator. Admin 은 plaform/policy tier. | ⚠️ Neture 의 admin 은 사업철학상 "운영사업자의 정책/구조 책임자" 로 해석 — CLAUDE.md §11 의 권한 매트릭스 subset 정의에 따름 |
| service operator 책임이 platform admin 과 섞여 있는가 | ❌ 섞임 없음 — Neture admin/operator 모두 Neture 멤버십 안에서만 작동 | ✅ |
| URL 의미와 boundary 일치 | ⚠️ `/admin/actions` 만 misalignment | Rebuild 필요 |

---

## 10. 산출물 — 항목별 조사표 (요약)

### 10.1 `/admin` 화면 항목별

| 영역 | 항목 수 | Keep | Rebuild | Remove |
|------|-------:|-----:|--------:|-------:|
| Block A KPI | 6 | 6 | 0 | 0 |
| Block B Policy | 3 | 3 | 0 | 0 |
| Block C Alerts | n | n | 0 | 0 |
| Block D Actions | 6 | 6 | 0 | 0 |

→ **전체 Keep**. 단 Block A 의 `총 사용자` 는 선행 IR fix 가 commit 되어야 정합.

### 10.2 `/admin/actions` 화면 항목별

| 영역 | 항목 | 판정 |
|------|------|------|
| `OperatorActionQueuePage` 매핑 | — | **Remove** (라우트 제거) |
| admin 고유 action queue | 미존재 | **Rebuild** (신규 설계) |
| 가입/공급사/파트너 승인 항목 | 4 system + 2 AI | operator 화면에 남김, admin 측은 별도 정의 필요 |

### 10.3 API/source/scope 분석

| API | source | scope |
|-----|-------|-------|
| `GET /neture/admin/dashboard` | 9 parallel SQL (neture_suppliers, neture_settlements, neture_partners, neture_partnership_requests, offer_service_approvals, supplier_product_offers, service_memberships) | Neture (1 라인 fix 후 모두 일치) |
| `GET /neture/operator/actions` | 5 parallel SQL (service_memberships, neture_suppliers, neture_contact_messages, neture_partnership_requests, supplier_product_offers) | Neture |
| `POST /neture/operator/actions/execute/inquiries-mark-read` | neture_contact_messages UPDATE | Neture |

→ scope 정합 OK. Drift 는 URL/IA 레이어에 국한.

---

## 11. 후속 WO 제안

### 11.1 즉시 (Phase A)

**WO-O4O-NETURE-ADMIN-DASHBOARD-TOTAL-USERS-SCOPE-FIX-V1**

- 선행 IR 의 1 라인 fix — 본 IR 권장안 D 와 충돌 없음
- 현재 working tree 에 변경 보류 상태 → 본 IR 승인 후 commit
- 작업: [admin-dashboard.controller.ts:56](apps/api-server/src/modules/neture/controllers/admin-dashboard.controller.ts#L56) (이미 edit 적용됨)

### 11.2 단기 (Phase B)

**WO-O4O-NETURE-ADMIN-ACTIONS-REBUILD-V1**

- 범위:
  1. `/admin/actions` 라우트에서 `OperatorActionQueuePage` 매핑 **제거** ([App.tsx:919](services/web-neture/src/App.tsx#L919))
  2. Admin 고유 action queue 컴포넌트 신규 작성 (`AdminActionQueuePage` or 4-block 중 Block C 확장)
  3. Backend API 신규: `GET /api/v1/neture/admin/actions` — admin tier 액션 (governance critical / 정책 변경 / 미정산 / 정책 승인 미결)
  4. Block D Structure Actions 에 `/admin/actions` 진입점 명시 (현재 미포함)
- 영향: 백엔드 2 파일 + 프론트 2 파일 신규, 라우팅 1 라인 제거
- 작업 시간: 1-2 일

### 11.3 중기 (Phase C, 옵션)

**WO-O4O-NETURE-ADMIN-LABEL-CLARIFICATION-V1**

- 범위:
  - 헤더/타이틀에 "Neture 관리자" 명시 강화 (이미 `serviceName="Neture Admin"` 적용 — 사용자 시각 확인 후 추가 라벨 필요시)
  - 사이드바 sectionTitle 에 "Neture 운영/관리" 명확화
  - 우선순위 낮음 — 코드 변경보다 운영 가이드 문서 수정으로 가능

### 11.4 장기 (Phase D, 미결)

**Platform Admin 화면 분리 여부**

- 현재 platform admin 전용 화면 자체가 없음
- 필요 시 `/platform/admin/*` 신규 도메인 + super_admin 전용
- 운영 요구 미확인 → 본 IR 에서는 **결정 보류**

---

## 12. 결론

- **`/admin` 은 Neture 내부 admin tier 화면이며, platform admin 화면이 아니다.** 코드 사실 (`requireMembership='neture'`) 로 확정.
- **`/admin` Dashboard (4-block) 는 admin tier 정의 (CLAUDE.md §11) 와 정합한다.** 항목 전체 Keep.
- **`/admin/actions` 만 IA Drift.** `/operator/actions` 와 동일 컴포넌트를 공유하여 admin tier 고유 가치가 없음.
- **권장 재설계 (변형 D)**: `/admin` 유지 + `/admin/actions` Rebuild (admin 고유 action queue 신규 설계)
- **선행 IR 의 1 라인 fix** 는 본 IR 의 변형 D 와 충돌 없음 → Phase A 로 즉시 commit 가능

---

## 13. 본 IR 의 선행 IR 과의 관계

| 항목 | 선행 IR (KPI-SCOPE-AUDIT) | 본 IR (IA-AUDIT) |
|------|--------------------------|---------------|
| 발견 | 1 라인 쿼리 Drift | IA 모호 + `/admin/actions` 중복 |
| 수정 | SQL 1 라인 | 라우트 1 라인 제거 + 신규 컴포넌트 |
| Phase | A (즉시) | B (단기) |
| 충돌 | 없음 | 본 IR 권장안과 정합 |

→ 두 IR 은 동일 도메인의 Drift 를 두 layer 에서 잡은 결과. Phase A 후 Phase B 로 순차 진행 권장.

---

*Author: Claude (Investigation only — no code change executed in this IR)*
*Investigation date: 2026-05-24*
*Status: completed — ready for follow-up WO (Phase A 즉시, Phase B 단기, Phase C/D 보류)*
