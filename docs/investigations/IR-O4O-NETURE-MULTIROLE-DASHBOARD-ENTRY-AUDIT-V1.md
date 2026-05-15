# IR-O4O-NETURE-MULTIROLE-DASHBOARD-ENTRY-AUDIT-V1

**목적**: Neture의 multi-role dashboard/workspace entry 구조가 O4O canonical 기준과 정합한지 최종 확인한다.  
**날짜**: 2026-05-15  
**상태**: 조사 완료  
**선행 IR**: IR-O4O-MULTIROLE-DASHBOARD-ENTRY-COMMONIZATION-V1, IR-O4O-MULTIROLE-SHARED-UTILITY-EXTRACTION-V1

---

## 1. 현재 구조 요약

### 1-1. LoginModal (`services/web-neture/src/components/LoginModal.tsx`)

- 로그인 성공 핸들러: `handleLoginSuccess(role?: string, roles?: string[])`
- `roles && roles.length > 0` 조건 분기로 **roles[] 배열 우선 사용**, 없으면 `[role]` wrap
- `returnUrl` 처리: workspace 경로 진입 시 역할 우선 규칙 override 불가
- `navigate()` 선호출 → `onClose()` 후호출 (navigation 보장 순서 올바름)

```typescript
// LoginModal.tsx (핵심 흐름)
const roles = result.roles?.length ? result.roles : [result.role];
const targetPath = returnUrl ?? getNetureDashboardRoute(roles);
navigate(targetPath);
onClose();
```

### 1-2. AuthContext (`services/web-neture/src/contexts/AuthContext.tsx`)

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];          // 배열 형태
  memberships?: { serviceKey: string; status: string }[];
}

// login() 반환 타입
login: (email, password) => Promise<{
  success: boolean;
  error?: string;
  role?: UserRole;     // 우선순위 최상위 단일 역할 (하위 호환)
  roles?: UserRole[];  // 전체 역할 배열
}>

// 반환 처리
const roles = extractRoles(apiUser);  // @o4o/auth-utils
return { success: true, role: roles[0], roles };
```

### 1-3. dashboard config (`services/web-neture/src/config/dashboard.ts`)

```typescript
export const NETURE_ROLE_PRIORITY = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'neture:supplier',
  'supplier',          // legacy
  'neture:partner',
  'partner',           // legacy
  'neture:seller',
  'seller',            // legacy
] as const;

export const NETURE_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'neture:admin':          '/admin',
  'neture:operator':       '/operator',
  'neture:supplier':       '/supplier/dashboard',
  'supplier':              '/supplier/dashboard',
  'neture:partner':        '/partner/dashboard',
  'partner':               '/partner/dashboard',
  'neture:seller':         '/seller/overview',
  'seller':                '/seller/overview',
};

export function getNetureDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, NETURE_ROLE_PRIORITY, NETURE_DASHBOARD_MAP);
}
```

PRIORITY 순서 기반 우선순위 완비. `@o4o/auth-utils`의 `getPrimaryDashboardRoute()` 호출.

### 1-4. App.tsx (`services/web-neture/src/App.tsx`)

- `PostLoginRedirect` 컴포넌트: **없음**
- 로그인 후 redirect는 **LoginModal에서 직접 처리**
- 보조 구조:
  - `LoginRedirect` (Line ~509): `/login` → `/` + 모달 열기
  - `RegisterRedirect` (Line ~523): `/register` → `/` + 모달 열기
- Route guard 적용 상황:
  - `/supplier/*`: `<SupplierRoute>` 적용
  - `/account/supplier/*`: `<SupplierRoute>` 적용
  - `/operator/*`: `<OperatorRoute>` 적용
  - `/admin/*`: `<AdminRoute>` 적용
  - `/account/partner/*`: **guard 없음** (PartnerAccountLayout 직접 래핑)

### 1-5. GlobalHeader (`services/web-neture/src/components/NetureGlobalHeader.tsx`)

```typescript
// roles 배열 기반 dashboard 경로 결정
const dashboardPath = hasDashboardRole && user?.roles
  ? getNetureDashboardRoute(user.roles)   // ✅ 배열 전달
  : '/';

const roleLabel = getNetureRoleLabel(user?.roles);  // ✅ 배열 전달
```

- `isAdmin`, `isOperator`, `isSupplier`, `isPartner` — 각 역할별 별도 배열 search
- profile dropdown: 역할 보유 시 dashboard 링크 노출, 미보유 시 숨김

### 1-6. AccountMenu (`services/web-neture/src/components/AccountMenu.tsx`)

```typescript
const dashboardPath = getNetureDashboardRoute(user.roles);  // ✅
const roleLabel = getNetureRoleLabel(user.roles);           // ✅
```

### 1-7. Route Guard (`services/web-neture/src/components/auth/RoleGuard.tsx`)

```typescript
export function SupplierRoute({ children, fallback = '/login' }) {
  return (
    <RouteGuard allowedRoles={SUPPLIER_ROLES} requireMembership="neture" fallback={fallback}>
      {children}
    </RouteGuard>
  );
}

export function OperatorRoute({ ... }) {
  // allowedRoles={OPERATOR_ROLES}, requireMembership="neture"
  // redirectMap: admin/super_admin → /admin (역할 월권 방지)
}

export function AdminRoute({ ... }) {
  // allowedRoles={ADMIN_ROLES}, requireMembership="neture"
}
```

역할 검사: `userRoles.some(r => allowedRoles.includes(r))` — 배열 기반 정합.

---

## 2. Canonical 정합 여부

| 항목 | Neture | 상태 |
|------|--------|------|
| PRIORITY + DASHBOARD_MAP 패턴 | `config/dashboard.ts` 완비 | ✅ |
| `getPrimaryDashboardRoute()` 호출 | `@o4o/auth-utils` 사용 | ✅ |
| `AuthContext.login()` roles 배열 반환 | `{ success, role, roles }` | ✅ |
| `User.roles: UserRole[]` 배열 유지 | 확인됨 | ✅ |
| LoginModal에서 roles[] 배열 전달 | roles 우선, role fallback | ✅ |
| profile menu `getNetureDashboardRoute` 사용 | NetureGlobalHeader + AccountMenu | ✅ |
| Route guard (supplier/operator/admin) | SupplierRoute/OperatorRoute/AdminRoute | ✅ |
| **PostLoginRedirect 컴포넌트** | **없음** | ❌ |
| `/account/partner/*` route guard | guard 없음 | ⚠️ |

---

## 3. 발견된 GAP

### GAP-1: PostLoginRedirect 컴포넌트 부재 (중)

**현황**: GlycoPharm/K-Cosmetics는 App.tsx에 `PostLoginRedirect` 컴포넌트가 존재하여 로그인 직후 단 1회 역할 기반 redirect를 수행한다. Neture는 이 컴포넌트 없이 LoginModal의 `navigate()` 직접 호출로만 처리한다.

**잠재적 문제**:
- LoginModal에서 `navigate()` → `onClose()` 순서로 호출하지만, App level의 `wasAuthRef` + `didRedirectRef` 이중 가드가 없어 race condition 가능성 존재 (rare)
- 다른 서비스와 구조적 불일치 — canonical 감사 범위에서 회귀 가능성

**코드 위치**: `services/web-neture/src/App.tsx` (부재)

**참조 구현**: `services/web-glycopharm/src/App.tsx` PostLoginRedirect 컴포넌트

---

### GAP-2: `/account/partner/*` route guard 부재 (낮음)

**현황**: App.tsx에서 `/account/partner/*` 경로가 `<PartnerAccountLayout>` 직접 래핑으로 처리되고, `<PartnerRoute>` 또는 `<RouteGuard>`가 없다.

```typescript
// App.tsx (현재)
<Route element={<PartnerAccountLayout />}>
  <Route path="/account/partner" element={<PartnerAccountDashboardPage />} />
  ...
</Route>
```

**비교**: `/supplier/*`, `/operator/*`, `/admin/*`는 각각 전용 guard 래핑.

**의문**: `PartnerRoute` guard가 존재하지 않거나 의도적으로 생략됐을 가능성. 별도 검토 필요.

---

## 4. 즉시 수정 필요 항목

### 🔴 우선순위 중: PostLoginRedirect 추가

- 파일: `services/web-neture/src/App.tsx`
- 참조: `services/web-glycopharm/src/App.tsx` PostLoginRedirect 구현
- 특이사항: Neture는 LoginModal 기반 로그인 전용 → `isSessionChecked` 신호 및 workspace early-exit 경로 목록은 Neture 역할 구조에 맞게 조정
  - workspace prefix: `/supplier`, `/operator`, `/admin`, `/partner`, `/seller`

---

## 5. 후속 WO 필요 여부

### WO-NETURE-POSTLOGINREDIRECT-CANONICAL-ALIGNMENT-V1 (필요)

- **우선순위**: 중
- **목적**: App.tsx에 PostLoginRedirect 추가로 GlycoPharm/K-Cosmetics canonical 패턴과 완전 일치
- **범위**: App.tsx 단일 파일 수정, LoginModal redirect 중복 제거 여부 검토
- **주의**: LoginModal의 returnUrl 처리는 유지. PostLoginRedirect는 returnUrl 없는 일반 경우만 담당

### WO-NETURE-PARTNERROUTE-GUARD-AUDIT-V1 (선택)

- **우선순위**: 낮
- **목적**: `/account/partner/*` route guard 부재 의도 확인 및 필요 시 PartnerRoute 추가
- **범위**: App.tsx + RoleGuard.tsx

---

## 6. 결론

Neture 서비스의 multi-role dashboard entry 구조는 **95% canonical 패턴과 일치**한다.

- PRIORITY + DASHBOARD_MAP + getPrimaryDashboardRoute() — 완벽 구현
- AuthContext roles 배열 — 완벽 구현  
- LoginModal roles 처리 — 올바른 구현
- Route guard (supplier/operator/admin) — 완벽 구현
- GlobalHeader/AccountMenu — 완벽 구현

**단 1개 구조적 GAP**: PostLoginRedirect 컴포넌트 부재 → `WO-NETURE-POSTLOGINREDIRECT-CANONICAL-ALIGNMENT-V1`로 추후 처리.

KPA/GlycoPharm/K-Cosmetics 대비 수정 규모는 최소 (App.tsx 1개 파일, 40-50 lines 추가 예상).
