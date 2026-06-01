# IR-O4O-MULTIROLE-WORKSPACE-ENTRY-UX-POLICY-V1

> **조사 목적**: O4O 플랫폼에서 다중 역할 사용자(operator/admin/store_owner/instructor/supplier 동시 보유)의 로그인 이후 진입 구조와 workspace/dashboard 노출 정책을 조사하고, canonical UX 방향을 정의한다.
>
> **조사 날짜**: 2026-05-15
> **Canonical 기준**: KPA-Society (reference implementation)
> **조사 범위**: 코드 읽기 전용. 수정 없음.

---

## 1. 현재 구조

### 1-1. 서비스별 Post-Login Redirect 구조

#### K-Cosmetics — 가장 완성된 구조 (benchmark)

**파일**: `services/web-k-cosmetics/src/config/dashboard.ts`

```typescript
// 우선순위 배열 (앞이 높을수록 우선)
export const KCOSMETICS_ROLE_PRIORITY = [
  'platform:super_admin',
  'k-cosmetics:admin',
  'k-cosmetics:operator',
  'k-cosmetics:supplier',
  'k-cosmetics:partner',
  'cosmetics:store_owner',
  'consumer',
] as const;

// 역할 → 경로 매핑
export const KCOSMETICS_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'k-cosmetics:admin':    '/admin',
  'k-cosmetics:operator': '/operator',
  'k-cosmetics:supplier': '/',
  'k-cosmetics:partner':  '/partner',
  'cosmetics:store_owner': '/store',
};

export function getKCosmeticsDashboardRoute(roles: string[]): string {
  return getPrimaryDashboardRoute(roles, KCOSMETICS_ROLE_PRIORITY, KCOSMETICS_DASHBOARD_MAP);
}
```

**공유 유틸리티**: `packages/auth-utils/src/getPrimaryDashboardRoute.ts`

```typescript
// 우선순위 배열을 순회하며 첫 번째 매칭 역할의 경로 반환
for (const role of priorityOrOverrides) {
  if (roles.includes(role)) {
    return dashboardMap[role] ?? '/';
  }
}
return '/';
```

**핵심**: 다중 역할 보유 시 **우선순위가 높은 역할 하나**의 경로로 자동 이동한다.

---

#### KPA-Society — 현재 구조 (불완전)

**파일**: `services/web-kpa-society/src/config/dashboard.ts`

```typescript
export function getKpaPostLoginRoute(user: User): string | null {
  // 운영자/관리자: redirect 없음 (null 반환)
  if (isKpaPrivilegedUser(user)) return null;

  // 약국 경영자: /store
  if (user.isStoreOwner || user.activityType === 'pharmacy_owner') return '/store';

  // 일반 회원: redirect 없음
  return null;
}
```

**K-Cosmetics 대비 차이점**:
- Priority 배열 없음 → 다중 역할 우선순위 미정의
- `instructor(lms:instructor)` redirect 없음
- `operator + store_owner` 동시 보유 시 early return → store redirect 미발생

**이중 처리 구조** (비효율):
- 1단계: `LoginModal.tsx:87-113` — 로그인 즉시 (KPA context 미로드 상태)
- 2단계: `App.tsx:302-348 PostLoginRedirect` — KPA context 로드 완료 후 fallback

---

#### GlycoPharm — 중간 구조

`LoginPage.tsx`에서 `getGlycopharmDashboardRoute()` 호출. 단일 진입 경로.

---

### 1-2. Header 메뉴 역할별 Workspace 진입점

**파일**: `services/web-kpa-society/src/components/KpaGlobalHeader.tsx:68-160`

```typescript
const isAdmin      = isAdminOrAbove(user.roles, 'kpa');       // kpa:admin, super_admin
const isOperator   = isOperatorOrAbove(user.roles, 'kpa');    // kpa:operator, admin, super_admin
const isInstructor = user.roles.includes('lms:instructor');
const isStoreOwner = user?.isStoreOwner === true;

// 메뉴 노출 패턴:
// 강의 대시보드  → isInstructor OR isAdmin
// 관리자 대시보드 → isAdmin (또는 isOperator이면 운영 대시보드)
// 마이페이지     → 항상
// 설정          → 항상
// ❌ 내 매장    → userMenuItems에 없음 (상단 nav에만 포함)
```

**발견된 문제**: `isStoreOwner`는 상단 nav(KPA_CONTEXTUAL_NAV)에는 "내 매장" 항목으로 포함되지만, **userMenuItems dropdown에는 없다**. store_owner만인 사용자가 로그인 후 드롭다운에서 매장으로 직접 이동할 수 없다.

---

### 1-3. Route 구조 및 RoleGuard 적용 현황

| 경로 | Guard | allowedRoles | enforceMembership |
|------|-------|-------------|-------------------|
| `/operator/*` | RoleGuard | PLATFORM_ROLES (operator/admin/super_admin) | true (기본) |
| `/admin/*` | AdminAuthGuard | kpa:admin, super_admin | 별도 처리 |
| `/store/*` | PharmacyGuard | kpa:store_owner | 별도 처리 |
| `/instructor/*` | 없음 | 없음 (헤더 링크로만 진입) | 없음 |
| `/mypage/*` | RoleGuard | 없음 (인증만) | true (기본) |

**PharmacyGuard 특이사항** (`components/auth/PharmacyGuard.tsx`):
- PLATFORM_ROLES(operator/admin)는 `/store` 접근 **불가** (명시적 차단)
- operator + store_owner 동시 보유 계정도 store 진입이 PharmacyGuard에서 막힐 가능성 존재

---

### 1-4. localStorage/sessionStorage 활용 현황

| 키 | 저장 위치 | 목적 |
|----|----------|------|
| `kpasociety_remember_email` | localStorage | 이메일 저장 |
| `last_logged_in_user_id` | localStorage | 마지막 로그인 사용자 ID |
| `supplier_suggestion_dismissed` | sessionStorage | UI 상태 |

**마지막 workspace 기억** — **미구현**. 재로그인 시 이전 workspace로 복귀 불가.

---

### 1-5. Instructor 역할 현황

```typescript
// role-constants.ts:23
LMS_INSTRUCTOR: 'lms:instructor',
```

- **Header 노출**: `isInstructor || isAdmin` 조건으로 "강의 대시보드" 표시
- **Route guard**: 없음 (`/instructor/*` 라우트에 RoleGuard 미적용)
- **Post-login redirect**: 미구현 (isPrivileged가 아니면 redirect 없음)
- **다중 역할 시**: instructor + operator 동시 보유 시 메뉴에 둘 다 표시됨 (정상)

---

### 1-6. Supplier 역할 현황

- **K-Cosmetics**: `k-cosmetics:supplier` 정의됨, dashboard map에 포함 (`/`)
- **KPA**: **미정의** — `/supplier/event-offers` 라우트는 존재하나 역할 정의 없음
- **GlycoPharm**: 미정의

---

## 2. 문제점

### 문제 1 — KPA Post-Login Redirect 우선순위 미정의

K-Cosmetics는 PRIORITY 배열로 다중 역할 우선순위를 명시하지만, KPA는 `isPrivileged` boolean 체크만 사용한다.

```
operator + store_owner → isPrivileged=true → early return → store redirect 없음
instructor + store_owner → isPrivileged=false → store redirect 발생 (의도한 것인지 불명확)
```

### 문제 2 — PharmacyGuard의 operator 차단 정책

`/store` 경로에 operator가 접근 불가 처리되어 있다면, operator + store_owner 동시 보유 계정이 `/store`에 진입 자체가 막힌다. 이 경우 매장 기능 사용이 불가능하다.

### 문제 3 — Header userMenuItems에 "내 매장" 미포함

store_owner 단독 사용자는 상단 nav에서 "내 매장"으로 이동 가능하지만, operator + store_owner는 운영자 화면에서 매장으로 이동하는 드롭다운 진입점이 없다.

### 문제 4 — Instructor Route Guard 없음

`/instructor/*`에 RoleGuard 미적용. 헤더에서만 링크 노출하지만, URL 직접 입력 시 비강사 계정도 진입 가능.

### 문제 5 — 이중 redirect 로직 (LoginModal + PostLoginRedirect)

KPA만 모달 로그인 구조로 인해 redirect가 두 단계로 분리되어 있다. 로직이 중복되고 일관성이 떨어진다.

---

## 3. Canonical UX 방향

### 3-1. 원칙

```
다중 역할 보유 사용자는:
1. 우선순위가 높은 역할 하나의 workspace로 자동 이동한다.
2. 다른 workspace는 Header 드롭다운에서 명시적으로 전환한다.
3. "마지막 workspace 기억"은 선택적 개선이며, 1차 목표가 아니다.
```

### 3-2. KPA 역할 우선순위 (Canonical)

```
platform:super_admin > kpa:admin > kpa:operator > lms:instructor > kpa:store_owner > kpa:pharmacist > kpa:student
```

**우선순위 근거**:
- admin/operator는 플랫폼 운영 책임이 있으므로 최우선
- instructor는 운영에 준하는 전문 역할
- store_owner는 개인 매장 운영자
- pharmacist/student는 일반 회원

### 3-3. 역할별 진입 경로 (Canonical)

| 역할 | 진입 경로 | 비고 |
|------|---------|------|
| platform:super_admin | `/admin` | |
| kpa:admin | `/admin` | |
| kpa:operator | `/operator` | |
| lms:instructor | `/instructor` | 현재 redirect 없음 → 추가 필요 |
| kpa:store_owner | `/store` | |
| kpa:pharmacist | 현재 화면 유지 (`/`) | 커뮤니티 철학 보존 |
| kpa:student | 현재 화면 유지 (`/`) | |

### 3-4. Header 드롭다운 Workspace 진입점 (Canonical)

```
보유 역할에 해당하는 항목만 표시:
- [강의 대시보드]  → lms:instructor OR kpa:admin
- [관리자 대시보드] → kpa:admin
- [운영 대시보드]   → kpa:operator (kpa:admin은 관리자로 이미 표시)
- [내 매장]        → isStoreOwner (현재 userMenuItems 누락 → 추가 필요)
- [마이페이지]     → 항상
- [설정]           → 항상
```

---

## 4. 금지 정책

```
1. redirect 로직을 App.tsx 본문에 직접 작성하지 않는다.
   → 반드시 config/dashboard.ts의 getKpaPostLoginRoute()에서 처리한다.

2. boolean(isPrivileged) 단독으로 우선순위를 판정하지 않는다.
   → PRIORITY 배열 + DASHBOARD_MAP 패턴(K-Cosmetics 방식)을 사용한다.

3. 역할이 없는 workspace 진입점을 메뉴에 노출하지 않는다.
   → isStoreOwner가 false면 "내 매장" 메뉴 미표시.

4. PharmacyGuard에서 operator를 무조건 차단하지 않는다.
   → operator + store_owner 동시 보유 계정은 /store 접근이 허용되어야 한다.

5. redirect 로직을 두 군데(LoginModal + PostLoginRedirect)에 분산하지 않는다.
   → PostLoginRedirect 단일 처리로 통일한다.
```

---

## 5. 추천 구조

### 5-1. KPA dashboard.ts 재구성 (K-Cosmetics 패턴 적용)

```typescript
// config/dashboard.ts

export const KPA_ROLE_PRIORITY = [
  'platform:super_admin',
  'kpa:admin',
  'kpa:operator',
  'lms:instructor',
  'kpa:store_owner',
] as const;

export const KPA_DASHBOARD_MAP: Record<string, string> = {
  'platform:super_admin': '/admin',
  'kpa:admin':            '/admin',
  'kpa:operator':         '/operator',
  'lms:instructor':       '/instructor',
  'kpa:store_owner':      '/store',
};

export function getKpaPostLoginRoute(user: User): string | null {
  const route = getPrimaryDashboardRoute(user.roles, KPA_ROLE_PRIORITY, KPA_DASHBOARD_MAP);
  return route === '/' ? null : route;  // null = 현재 화면 유지
}
```

### 5-2. PostLoginRedirect 단순화

```typescript
// App.tsx PostLoginRedirect

const route = getKpaPostLoginRoute(user);
if (route && !location.pathname.startsWith(route)) {
  navigate(route, { replace: true });
}
```

LoginModal의 1단계 redirect 제거 → PostLoginRedirect 단일화.

### 5-3. Header userMenuItems에 "내 매장" 추가

```typescript
// KpaGlobalHeader.tsx userMenuItems

{isStoreOwner && (
  <GlobalHeaderMenuItem to="/store" icon={<Store />}>
    내 매장
  </GlobalHeaderMenuItem>
)}
```

### 5-4. PharmacyGuard operator 접근 허용

```typescript
// PharmacyGuard — operator + store_owner 동시 보유 계정 허용

const isOperator = isOperatorOrAbove(user.roles, 'kpa');
const hasStoreOwner = user.roles.includes('kpa:store_owner');

if (isOperator && hasStoreOwner) {
  return <>{children}</>;  // 동시 보유 계정은 통과
}
```

### 5-5. Instructor Route Guard 추가

```typescript
// /instructor 라우트에 RoleGuard 추가
<Route path="/instructor/*"
  element={
    <RoleGuard allowedRoles={['lms:instructor', 'kpa:admin', 'platform:super_admin']} enforceMembership={false}>
      <InstructorLayout>...</InstructorLayout>
    </RoleGuard>
  }
/>
```

---

## 6. 서비스 공통화 가능 여부

| 서비스 | 현재 구조 | 공통화 가능 여부 |
|--------|---------|--------------|
| **K-Cosmetics** | PRIORITY + MAP + getPrimaryDashboardRoute | ✅ 기준 구조 |
| **GlycoPharm** | LoginPage에서 처리, 유사 구조 | ✅ 공통화 용이 |
| **KPA** | boolean + 이중 처리 | ⚠️ 리팩토링 필요 |
| **Neture** | 미조사 (구조 확인 필요) | ❓ |

**공통화 원칙**:
- `getPrimaryDashboardRoute()` — 이미 `@o4o/auth-utils`에 공유됨 ✅
- `ROLE_PRIORITY + DASHBOARD_MAP` — 서비스별 `config/dashboard.ts`에서 정의 ✅
- `PostLoginRedirect` 컴포넌트 — 서비스별 구현 (공통 컴포넌트화 가능하나 현재 불필요)

---

## 7. Mobile/Tablet 환경 충돌 가능성

- 현재 역할 전환 UI(드롭다운)는 header 기반 → mobile에서 드롭다운 UX가 좁을 수 있음
- "역할 선택 화면"(workspace launcher)은 mobile에서 오히려 유리할 수 있음
- store/operator 화면 모두 responsive layout 미확인 → 별도 점검 필요

---

## 8. 단계별 후속 WO

### WO-O4O-KPA-DASHBOARD-REDIRECT-UNIFICATION-V1 (P1)

**대상**: `services/web-kpa-society/src/config/dashboard.ts`, `App.tsx`

- `getKpaPostLoginRoute()`를 PRIORITY + MAP 패턴으로 재구성
- LoginModal 1단계 redirect 제거, PostLoginRedirect 단일화
- `lms:instructor` redirect 추가
- operator + store_owner 동시 보유 처리

---

### WO-O4O-KPA-HEADER-STORE-MENU-ENTRY-V1 (P1)

**대상**: `services/web-kpa-society/src/components/KpaGlobalHeader.tsx`

- userMenuItems에 "내 매장" 항목 추가 (`isStoreOwner` 조건)
- operator + store_owner 동시 보유 계정에서 매장 진입점 확보

---

### WO-O4O-KPA-PHARMACYGUARD-OPERATOR-FIX-V1 (P1)

**대상**: `services/web-kpa-society/src/components/auth/PharmacyGuard.tsx`

- operator + store_owner 동시 보유 계정의 `/store` 접근 허용
- PLATFORM_ROLES 단독 보유자(operator only)는 여전히 차단 유지

---

### WO-O4O-KPA-INSTRUCTOR-ROUTE-GUARD-V1 (P2)

**대상**: `services/web-kpa-society/src/App.tsx`

- `/instructor/*` 라우트에 RoleGuard 추가
- allowedRoles: `lms:instructor`, `kpa:admin`, `platform:super_admin`
- enforceMembership: false (강사는 서비스 membership 무관)

---

### WO-O4O-DASHBOARD-REDIRECT-CROSS-SERVICE-AUDIT-V1 (P3)

**대상**: 전 서비스 비교 분석

- Neture/GlycoPharm redirect 구조 현행화 확인
- 서비스별 PRIORITY + MAP 일관성 점검
- 공통 PostLoginRedirect 컴포넌트 후보 검토

---

## 요약

| 항목 | 현재 | Canonical |
|------|------|-----------|
| 다중 역할 redirect 우선순위 | boolean(isPrivileged) | PRIORITY 배열 + DASHBOARD_MAP |
| instructor redirect | 없음 | /instructor 추가 |
| operator+store_owner 처리 | early return (store 미이동) | 우선순위(operator>store_owner) 적용 |
| Header 내 매장 항목 | userMenuItems 누락 | isStoreOwner 조건으로 추가 |
| PharmacyGuard operator 처리 | 차단 | 동시 보유 시 허용 |
| Instructor route guard | 없음 | RoleGuard 추가 |
| 마지막 workspace 기억 | 미구현 | 선택적 개선 (현재 불필요) |
| 역할 선택 화면(launcher) | 없음 | 불필요 (PRIORITY로 충분) |

---

*조사자: Claude Sonnet 4.6 (AI)*
*기준 브랜치: main @ 2026-05-15*
*Status: 조사 완료. 코드/DB 변경 없음.*
