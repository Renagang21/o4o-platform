# IR-O4O-OPERATOR-CONSOLE-ARCHITECTURE-AUDIT-V1

**Date:** 2026-03-11
**Status:** Investigation Complete
**Type:** Architecture Audit (Read-Only)
**Scope:** 6 Services + Backend API

---

## 1. Operator Console 전체 구조

### 현재 상태 요약

O4O Platform은 **6개 프론트엔드 서비스 + 1개 Admin Dashboard 앱 + 1개 API 서버**로 구성되어 있으며, 각 서비스가 **독립적으로 Admin/Operator 콘솔을 구현**하고 있다. 통합된 Operator Console 아키텍처는 존재하지 않는다.

```
┌─────────────────────────────────────────────────────────────┐
│                    O4O Platform Services                     │
├─────────────┬───────────┬──────────┬──────────┬─────────────┤
│   Neture    │GlycoPharm │   KPA    │GlucoseV. │K-Cosmetics  │
│ /workspace/ │  /admin   │ /admin   │  /admin  │  /admin     │
│   admin     │ /operator │/operator │/operator/│ /operator   │
│ /workspace/ │           │/branch-* │glucoseview│             │
│  operator   │           │          │          │             │
├─────────────┴───────────┴──────────┴──────────┴─────────────┤
│                   API Server (o4o-core-api)                   │
│      /admin/* (requireAdmin) + Service-specific guards       │
├──────────────────────────────────────────────────────────────┤
│                  Admin Dashboard App                          │
│                 /admin (standalone)                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 서비스별 Dashboard 구조

### 2.1 Route 구조 매트릭스

| 서비스 | Admin Route | Operator Route | Guard 방식 | Dashboard 타입 |
|--------|------------|----------------|-----------|---------------|
| **Neture** | `/workspace/admin` | `/workspace/operator` | RoleGuard `['admin']` / `['admin','operator']` | Admin 4-Block / Operator 8-Block |
| **GlycoPharm** | `/admin` | `/operator` | ProtectedRoute `['admin']` / `['operator']` | Admin 4-Block / Operator 5-Block |
| **KPA** | `/admin` → `/demo/admin` | `/operator` | AdminAuthGuard / RoleGuard PLATFORM_ROLES | Admin 4-Block / Operator 5-Block |
| **GlucoseView** | `/admin` | `/operator/glucoseview/*` | RoleGuard `['admin']` / `['admin','operator']` | Monolithic AdminPage / OperatorLayout |
| **K-Cosmetics** | `/admin` | `/operator` | ProtectedRoute `['admin']` / `['operator']` | 5-Block (공유) / 5-Block (공유) |

### 2.2 추가 Dashboard (KPA 전용)

| Route | Guard | 용도 |
|-------|-------|------|
| `/branch-services/:branchId/admin` | BranchAdminAuthGuard (scope check) | 분회 관리자 4-Block |
| `/branch-services/:branchId/operator` | BranchOperatorAuthGuard (scope check) | 분회 운영자 5-Block |
| `/dashboard` | AuthGate (status check) | 일반 사용자 대시보드 |

---

## 3. Profile → Dashboard 연결 상태

### 3.1 연결 매트릭스

| 서비스 | Profile 위치 | Dashboard 링크 | 연결 방식 | 문제 |
|--------|-------------|---------------|----------|------|
| **Neture** | AccountMenu + MyPage | "내 대시보드" | `getPrimaryDashboardRoute()` + ROUTE_OVERRIDES | **정상** |
| **GlycoPharm** | Header User Menu | "운영자 대시보드" | `roleDashboardLinks` 동적 생성 | **Admin 경로 누락** (Header에서 admin은 `/operator`로 이동) |
| **KPA** | Header | DashboardSwitcher 또는 `/dashboard` 직접 링크 | `getDefaultRouteByRole()` | **정상** (다중 대시보드 지원) |
| **GlucoseView** | Layout User Menu | MyPage/Settings 링크만 존재 | Admin은 nav bar에 별도 표시 | **Operator 대시보드 링크 없음** |
| **K-Cosmetics** | Header + MyPage | "대시보드" + "대시보드로 이동" | `getPrimaryDashboardRoute()` | **정상** |

### 3.2 발견된 Profile 연결 문제

#### Problem B1: GlucoseView — Operator Dashboard 링크 없음
- Layout.tsx 네비게이션에 Admin 링크만 존재 (`isAdmin` 조건)
- Operator용 대시보드 링크가 Profile/Header 어디에도 없음
- 사용자가 `/operator/glucoseview`에 직접 URL 입력해야만 접근 가능

#### Problem B2: GlycoPharm — Admin 대시보드 직접 링크 없음
- Header의 `roleDashboardLinks`에서 `isOperator` 조건으로 `/operator`만 생성
- admin 사용자도 `/operator`로 이동 (admin 전용 `/admin` 경로 접근 수단 없음)

---

## 4. Role / Permission 구조

### 4.1 Frontend Role Mapping 비교

| 서비스 | API `admin` → | API `operator` → | API `super_admin` → | Default Role |
|--------|:-------------|:-----------------|:-------------------|:------------|
| **Neture** | `admin` | `operator` | `admin` | `user` |
| **GlycoPharm** | **`operator`** ⚠️ | `operator` | **`operator`** ⚠️ | `consumer` |
| **KPA** | 직접 사용 (`kpa:admin`) | 직접 사용 (`kpa:operator`) | `platform:super_admin` | — |
| **GlucoseView** | `admin` | **(미매핑)** ⚠️ | `admin` | `pharmacist` |
| **K-Cosmetics** | `admin` | `operator` | `admin` | `seller` |

### 4.2 Critical Role Mapping Issues

#### Issue C1: GlycoPharm — admin → operator 매핑 (CRITICAL)
- **파일:** `services/web-glycopharm/src/contexts/AuthContext.tsx` (lines 107-108)
- API에서 `admin` 역할을 받은 사용자가 프론트엔드에서 `operator`로 매핑됨
- **결과:** `/admin` 라우트 (allowedRoles: `['admin']`) 접근 불가
- Admin 대시보드가 사실상 사용 불가능한 상태

#### Issue C2: GlucoseView — operator 역할 미매핑
- **파일:** `services/web-glucoseview/src/contexts/AuthContext.tsx` (lines 56-64)
- ROLE_MAP에 `operator` 키가 없음
- API에서 `operator` 역할을 받아도 프론트엔드에서 인식 불가
- `/operator/glucoseview/*` 라우트 (allowedRoles: `['admin', 'operator']`)는 admin으로만 접근 가능

### 4.3 Backend Role Guard 구조

| Guard | 허용 역할 | 사용 위치 |
|-------|----------|----------|
| `requireAdmin` | admin, super_admin, operator, platform:admin, platform:super_admin | `/admin/*` 전체 |
| `requireRole(roles)` | 지정 역할 | 개별 라우트 |
| `createMembershipScopeGuard(config)` | 서비스별 scope 역할 + 멤버십 활성 | 서비스별 라우트 |
| `createServiceScopeGuard(config)` | 서비스별 scope 역할 | @o4o/security-core |

### 4.4 Frontend Role Guard 패턴

| 서비스 | Guard 컴포넌트 | Role Check 방식 |
|--------|--------------|---------------|
| **Neture** | `RoleGuard` | `user.roles.some(r => allowedRoles.includes(r))` |
| **GlycoPharm** | `RoleGuard` (= ProtectedRoute) | 동일 |
| **KPA** | `RoleGuard` + `AdminAuthGuard` + `BranchAdminAuthGuard` + `BranchOperatorAuthGuard` | 동일 + scope check |
| **GlucoseView** | `RoleGuard` (= RoleProtectedRoute) | 동일 |
| **K-Cosmetics** | `RoleGuard` (= ProtectedRoute) | 동일 |

**결론:** Frontend Role Guard 패턴은 통일됨 (`user.roles.some(r => allowedRoles.includes(r))`)
**문제:** Role Mapping이 서비스별로 다르기 때문에 같은 Guard라도 동작이 달라짐

---

## 5. 서비스별 Admin / Operator 구조

### 5.1 Neture

```
Admin
  Dashboard: /workspace/admin (4-Block)
  Menu: 대시보드, AI 카드 규칙, AI 관리, 운영자 관리, 공급자 승인, 상품 승인, 파트너 모니터링, 카탈로그 임포트

Operator
  Dashboard: /workspace/operator (8-Block Copilot)
  Menu: 대시보드, AI 리포트, 가입 승인, 포럼 관리, 공급 현황

Profile → Dashboard: AccountMenu "내 대시보드" + MyPage 퀵 링크
Role Guard: RoleGuard (admin: ['admin'], operator: ['admin','operator'])
Layout: SupplierOpsLayout (공유 상단 네비게이션)
```

### 5.2 GlycoPharm

```
Admin
  Dashboard: /admin (4-Block)
  Menu: 대시보드, 약국 네트워크, 회원 관리, 설정

Operator
  Dashboard: /operator (5-Block)
  Menu: 대시보드, 신청 관리, 상품 관리, 주문 관리, 재고/공급, 정산 관리,
        분석/리포트, 마케팅, 사이니지, 고객지원, 회원 관리, AI 리포트 (20+ 페이지)

Profile → Dashboard: Header "운영자 대시보드" (admin/operator 모두 /operator로)
Role Guard: ProtectedRoute (admin: ['admin'], operator: ['operator'])
Layout: DashboardLayout with role-specific sidebar
⚠️ 문제: API admin → frontend operator 매핑으로 admin 대시보드 접근 불가
```

### 5.3 KPA Society

```
Platform Admin (KPA-a)
  Dashboard: /admin → /demo/admin (4-Block + 회계)
  Menu: 대시보드, KPA 플랫폼 운영, 지부 관리, 회원 관리, 위원회 요청,
        간사 관리, 연례 보고서, 회비 관리, 임원 관리, 설정

Platform Operator (KPA-a)
  Dashboard: /operator (5-Block)
  Menu: 대시보드, AI 리포트, 포럼 관리, 포럼 분석, 콘텐츠 관리,
        사이니지 콘텐츠, 법률 관리, 감사 로그, 뉴스, 문서, 포럼,
        회원 관리, 조직 요청, 약국 요청, 상품 신청, 운영자 관리

Branch Admin (KPA-c)
  Dashboard: /branch-services/:branchId/admin (4-Block + 회계)
  Menu: 대시보드, 임원 관리, 공동구매 현황, 분회 설정

Branch Operator (KPA-c)
  Dashboard: /branch-services/:branchId/operator (5-Block)
  Menu: 대시보드, 포럼 관리, 사이니지 콘텐츠, 운영자, 뉴스, 포럼, 문서

Profile → Dashboard: DashboardSwitcher (다중 대시보드 접근 가능)
Role Guard: RoleGuard + AdminAuthGuard + BranchAdminAuthGuard + BranchOperatorAuthGuard
```

### 5.4 GlucoseView

```
Admin
  Dashboard: /admin (단일 AdminPage, 957줄 monolithic)
  탭: Members (승인/거부), Banners (슬라이드), Partners (로고), Settings (사이트)

Operator
  Dashboard: /operator/glucoseview (OperatorLayout)
  Menu: 신청 관리, 회원 관리, AI 리포트

Profile → Dashboard: Layout nav에 Admin 링크 (isAdmin 조건)
Role Guard: RoleGuard (admin: ['admin'], operator: ['admin','operator'])
⚠️ 문제: operator 역할 미매핑, Operator Dashboard 링크 없음
```

### 5.5 K-Cosmetics

```
Admin
  Dashboard: /admin (5-Block, Operator와 동일 컴포넌트)
  Menu: 대시보드, 매장 네트워크, 회원 관리, 설정

Operator
  Dashboard: /operator (5-Block)
  Menu: 대시보드, 내 매장, 신청 관리, 상품 관리, 주문 관리, 재고/공급,
        정산 관리, 분석/리포트, 마케팅, 사이니지 콘텐츠, 고객지원,
        AI 리포트, 회원 관리

Profile → Dashboard: Header "대시보드" + MyPage "대시보드로 이동"
Role Guard: ProtectedRoute (admin: ['admin'], operator: ['operator'])
RoleSwitcher: admin/seller/operator 전환 가능
```

---

## 6. 발견된 구조 문제

### A. Dashboard Missing

| # | 서비스 | 문제 | 영향 |
|---|--------|------|------|
| A1 | GlucoseView | Operator 전용 대시보드 홈 없음 (layout만 존재) | 운영자가 첫 진입 시 빈 페이지 또는 서브페이지로 이동해야 함 |

### B. Profile Link Missing

| # | 서비스 | 문제 | 영향 |
|---|--------|------|------|
| B1 | GlucoseView | Operator Dashboard 링크가 Header/Profile에 없음 | URL 직접 입력 필요 |
| B2 | GlycoPharm | Admin Dashboard 링크가 Header에 없음 (operator로만 이동) | Admin 대시보드 사실상 접근 불가 |

### C. Role Guard Conflict

| # | 서비스 | 문제 | 심각도 | 영향 |
|---|--------|------|--------|------|
| C1 | GlycoPharm | API `admin` → frontend `operator` 매핑 | **CRITICAL** | Admin Dashboard 접근 불가 |
| C2 | GlucoseView | `operator` 역할이 ROLE_MAP에 없음 | **HIGH** | Operator 전용 기능 분리 불가능 |
| C3 | 전체 | Role prefix 사용 비통일 (KPA만 prefix 사용) | **MEDIUM** | 서비스 간 역할 체계 불일치 |

### D. Route Structure Conflict

| # | 문제 | 서비스 |
|---|------|--------|
| D1 | Admin 경로 불일치 | Neture: `/workspace/admin` / 나머지: `/admin` |
| D2 | Operator 경로 불일치 | Neture: `/workspace/operator` / GlucoseView: `/operator/glucoseview/*` / 나머지: `/operator` |
| D3 | Dashboard 컴포넌트 구조 불일치 | 4-Block (admin) vs 5-Block (operator) vs 8-Block (Neture operator) vs Monolithic (GlucoseView admin) |

### E. UX 공유 라이브러리 활용도

| 서비스 | @o4o/admin-ux-core (4-Block) | @o4o/operator-ux-core (5-Block) |
|--------|:---------------------------:|:-------------------------------:|
| Neture | ✅ Admin | ❌ (자체 8-Block) |
| GlycoPharm | ✅ Admin | ✅ Operator |
| KPA | ✅ Admin + Branch Admin | ✅ Operator + Branch Operator |
| GlucoseView | ❌ (Monolithic) | ❌ (자체 Layout) |
| K-Cosmetics | ❌ (5-Block 공유) | ✅ Operator |

---

## 7. Operator Console 통합 설계 제안

### 7.1 현재 구조의 근본 문제

```
문제: 각 서비스가 독립적으로 Admin/Operator 콘솔을 구현
결과:
  1. Role Mapping이 서비스마다 다름
  2. Route 구조가 서비스마다 다름
  3. Dashboard 컴포넌트 재사용율 낮음
  4. Profile → Dashboard 연결이 일부 서비스에서 누락
  5. 운영자가 서비스별 다른 UI를 학습해야 함
```

### 7.2 통합 가능성 분석

#### 즉시 통합 가능한 영역

| 영역 | 현재 | 통합 방향 | 난이도 |
|------|------|----------|--------|
| **Role Mapping** | 서비스별 다름 | 표준 ROLE_MAP 정의 | LOW |
| **Route 패턴** | 5가지 패턴 | `/operator`, `/admin` 표준화 | LOW |
| **RoleGuard** | 이미 동일 패턴 | 공유 패키지화 가능 | LOW |
| **Profile → Dashboard 링크** | 일부 누락 | 표준 AccountMenu 패턴 적용 | LOW |

#### 중기 통합 가능한 영역

| 영역 | 현재 | 통합 방향 | 난이도 |
|------|------|----------|--------|
| **Dashboard Layout** | 서비스별 자체 구현 | @o4o/operator-ux-core 통일 | MEDIUM |
| **Admin 4-Block** | 3/5 서비스 사용 | 전체 서비스 적용 | MEDIUM |
| **Operator 5-Block** | 3/5 서비스 사용 | 전체 서비스 적용 | MEDIUM |

#### 장기 통합 (Single Admin Architecture)

| 영역 | 현재 | 통합 방향 | 난이도 |
|------|------|----------|--------|
| **Single Admin App** | 서비스별 분산 | 단일 관리 콘솔 | HIGH |
| **서비스 전환** | 별도 로그인 | 서비스 스위처 | HIGH |
| **통합 사이드바** | 서비스별 메뉴 | 서비스 → 기능 계층 | HIGH |

### 7.3 권장 우선순위

```
Phase 1: Role Mapping 표준화 (C1, C2 해결)
  - 모든 서비스에서 API admin → frontend admin 통일
  - operator 역할 매핑 추가 (GlucoseView)
  - 표준 ROLE_MAP 정의

Phase 2: Route 패턴 표준화 (D1, D2 해결)
  - /admin, /operator 패턴 통일
  - Profile → Dashboard 연결 표준화 (B1, B2 해결)

Phase 3: Dashboard 컴포넌트 통일
  - Admin: @o4o/admin-ux-core 4-Block 전체 적용
  - Operator: @o4o/operator-ux-core 5-Block 전체 적용

Phase 4: Single Admin Architecture
  - 서비스 스위처
  - 통합 대시보드
```

---

## 8. 부록: 핵심 파일 경로

### Frontend

| 서비스 | App.tsx | AuthContext | RoleGuard | Dashboard Layout |
|--------|---------|------------|-----------|-----------------|
| Neture | `services/web-neture/src/App.tsx` | `contexts/AuthContext.tsx` | `components/auth/RoleGuard.tsx` | `components/layouts/SupplierOpsLayout.tsx` |
| GlycoPharm | `services/web-glycopharm/src/App.tsx` | `contexts/AuthContext.tsx` | `components/auth/RoleGuard.tsx` | `components/layouts/DashboardLayout.tsx` |
| KPA | `services/web-kpa-society/src/App.tsx` | `contexts/AuthContext.tsx` | `components/auth/RoleGuard.tsx` | `routes/OperatorRoutes.tsx` |
| GlucoseView | `services/web-glucoseview/src/App.tsx` | `contexts/AuthContext.tsx` | `components/auth/RoleGuard.tsx` | `components/layouts/OperatorLayout.tsx` |
| K-Cosmetics | `services/web-k-cosmetics/src/App.tsx` | `contexts/AuthContext.tsx` | `components/auth/RoleGuard.tsx` | `components/layouts/DashboardLayout.tsx` |

### Backend

| 영역 | 파일 |
|------|------|
| Auth Middleware | `apps/api-server/src/common/middleware/auth.middleware.ts` |
| Permission Middleware | `apps/api-server/src/middleware/permission.middleware.ts` |
| Membership Guard | `apps/api-server/src/common/middleware/membership-guard.middleware.ts` |
| Admin User Controller | `apps/api-server/src/controllers/admin/AdminUserController.ts` |
| Admin Routes | `apps/api-server/src/routes/admin/users.routes.ts` |
| Role Assignment Service | `apps/api-server/src/modules/auth/services/role-assignment.service.ts` |

---

## 9. 조사 결론

### 핵심 발견

1. **Operator Console 아키텍처 부재** — 각 서비스가 독립 구현, 통합 설계 없음
2. **Role Mapping 불일치가 가장 심각한 문제** — GlycoPharm의 admin→operator 매핑이 admin 대시보드를 사용 불가능하게 만듬
3. **RoleGuard 패턴은 이미 통일됨** — 5개 서비스 모두 동일한 `user.roles.some()` 패턴 사용
4. **Dashboard UX 라이브러리 활용도 불균일** — 3/5만 표준 블록 레이아웃 사용
5. **KPA가 가장 완성도 높은 구조** — 4-tier 대시보드 + DashboardSwitcher + scope-based guard

### 다음 단계

이 조사 결과를 기반으로 **WO-O4O-OPERATOR-CONSOLE-ARCHITECTURE-V1** 작업 요청서를 작성하여:
1. Role Mapping 표준 정의
2. Route 패턴 표준 정의
3. Profile → Dashboard 연결 표준 정의
4. Dashboard 컴포넌트 표준 적용 계획

을 수립한다.

---

*Investigation Complete: 2026-03-11*
*Investigator: Claude Code (IR, no modifications)*
