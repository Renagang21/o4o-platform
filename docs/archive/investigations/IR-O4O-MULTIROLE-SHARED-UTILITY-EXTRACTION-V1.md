# IR-O4O-MULTIROLE-SHARED-UTILITY-EXTRACTION-V1

> **조사 목적**: KPA, GlycoPharm, K-Cosmetics, Neture에서 정렬된 multi-role dashboard/workspace 구조를 기준으로, 공통 utility로 추출 가능한 영역과 서비스별로 유지해야 하는 영역을 정리한다.
>
> **상태**: COMPLETE
> **날짜**: 2026-05-15
> **조사 범위**: Read-only (코드 변경 없음)

---

## 1. 현재 서비스별 구조 비교표

### 1-A. PRIORITY + MAP + Resolver

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| PRIORITY 배열 | `KPA_ROLE_PRIORITY` | `GLYCOPHARM_ROLE_PRIORITY` | `KCOSMETICS_ROLE_PRIORITY` | `NETURE_ROLE_PRIORITY` |
| DASHBOARD_MAP | `KPA_DASHBOARD_MAP` | `GLYCOPHARM_DASHBOARD_MAP` | `KCOSMETICS_DASHBOARD_MAP` | `NETURE_DASHBOARD_MAP` |
| resolver 함수 | `getKpaPostLoginRoute(user)` | `getGlycopharmDashboardRoute(roles)` | `getKCosmeticsDashboardRoute(roles)` | `getNetureDashboardRoute(roles)` |
| resolver 입력 | `User` 객체 (context fallback 포함) | `roles[]` | `roles[]` | `roles[]` |
| context fallback | ✅ `isStoreOwner`, `activityType` | ❌ | ❌ | ❌ |
| mypage null 처리 | ✅ (`/mypage` → null) | ❌ | ❌ | ❌ |
| role label helper | ❌ | ❌ | ❌ | ✅ `getNetureRoleLabel()` |

---

### 1-B. PostLoginRedirect 진입점

| 서비스 | 진입점 | 구조 |
|--------|--------|------|
| KPA | `App.tsx` `<PostLoginRedirect />` | `useRef` 이중 가드 + `wasAuthenticatedRef` + `didRedirectRef` + early exit paths + context loading wait |
| GlycoPharm | `LoginPage.tsx` 내부 `handleSubmit` | `loginType` override 분기 → `getGlycopharmDashboardRoute(user.roles)` |
| K-Cosmetics | `LoginPage.tsx` + `LoginModal.tsx` 내부 | `result.roles?.length` 체크 → `getKCosmeticsDashboardRoute(result.roles)` |
| Neture | 없음 | LoginModal 기반 — 역할 redirect 없이 `/` 이동 |

---

### 1-C. isStoreOwner 판정

| 서비스 | 판정 방식 | dual-source |
|--------|----------|------------|
| KPA GlobalHeader | `user.isStoreOwner === true \|\| roles.includes('kpa:store_owner')` | ✅ |
| KPA PharmacyGuard | `hasAnyRole(roles, STORE_OWNER_ROLES) \|\| user.isStoreOwner === true` | ✅ |
| GlycoPharm GlobalHeader | `roles.includes('glycopharm:pharmacist')` (store_owner 별도 체크 없음) | ❌ |
| K-Cosmetics GlobalHeader | `roles.includes('cosmetics:store_owner')` | ❌ |
| Neture GlobalHeader | `roles.some(r => r === 'neture:supplier' \|\| r === 'supplier')` | ❌ |

---

### 1-D. role-based menu entry

| 서비스 | 워크스페이스 드롭다운 링크 | 판정 |
|--------|------------------------|------|
| KPA | ✅ "내 매장" (`/store`) | `isStoreOwner` (dual-source) |
| GlycoPharm | ❌ 없음 | — |
| K-Cosmetics | ❌ 없음 | — |
| Neture | ❌ 없음 (대시보드 링크 별도 구성) | `hasDashboardRole` → `getNetureDashboardRoute()` |

---

### 1-E. @o4o/auth-utils 현재 공유 유틸

```typescript
// 이미 공유됨
getPrimaryDashboardRoute(roles, priority?, dashboardMap?) — overloaded
hasRole(userRoles, role)
hasAnyRole(userRoles, roles[])
isOperatorOrAbove(roles, serviceKey)
isAdminOrAbove(roles, serviceKey)
extractRoles(apiUser, fallback?)
ROLE_PRIORITY          // legacy 비접두사 배열
ROLE_DASHBOARD_MAP     // legacy 비접두사 맵
```

---

## 2. 공통화 가능한 영역

### 2-A. `isStoreOwnerDual()` — 추출 가치 높음

**현재 중복**: KPA GlobalHeader + PharmacyGuard에 동일 로직이 2번 구현되어 있고, GlycoPharm/K-Cosmetics는 context fallback 없이 role-only로 처리 중.

**제안 API**:
```typescript
// packages/auth-utils/src/isStoreOwnerDual.ts
export function isStoreOwnerDual(
  roles: string[],
  storeOwnerRole: string,          // e.g. 'kpa:store_owner', 'glycopharm:store_owner'
  contextFlag?: boolean,           // e.g. user.isStoreOwner
): boolean {
  return roles.includes(storeOwnerRole) || contextFlag === true;
}
```

**사용 예**:
```typescript
// KPA GlobalHeader
const isStoreOwner = isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner);

// GlycoPharm GlobalHeader (upgrade path)
const isStoreOwner = isStoreOwnerDual(user.roles, 'glycopharm:store_owner');
```

---

### 2-B. `getRoleLabel()` — Neture 패턴 일반화

**현재 상태**: Neture만 `getNetureRoleLabel(roles)` 보유. 다른 3개 서비스는 없음.

**제안 API**:
```typescript
// packages/auth-utils/src/getRoleLabel.ts
export function getRoleLabel(
  roles: string[],
  priority: readonly string[],
  labels: Record<string, string>,
  fallback = '회원',
): string {
  for (const role of priority) {
    if (roles.includes(role) && labels[role]) return labels[role];
  }
  return fallback;
}
```

**사용 예**:
```typescript
// KPA
const label = getRoleLabel(user.roles, KPA_ROLE_PRIORITY, KPA_ROLE_LABELS);

// Neture (현재 getNetureRoleLabel()를 이 함수로 위임)
export function getNetureRoleLabel(roles) {
  return getRoleLabel(roles, NETURE_ROLE_PRIORITY, NETURE_ROLE_LABELS, '사용자');
}
```

---

### 2-C. `usePostLoginRedirect()` hook — 추출 가치 중간

**현재 상태**: KPA만 `PostLoginRedirect` 컴포넌트 구현. 패턴은 재사용 가능하나 서비스별 차이가 있음.

**공통 로직**:
- `wasAuthenticatedRef` + `didRedirectRef` 이중 가드
- `isAuthenticated` 전환 감지 (`false → true`)
- `isContextLoaded` 대기 (서비스별 context 로딩 여부)
- workspace early exit paths 체크
- `getPostLoginRoute(user)` 호출 → navigate

**제안 API**:
```typescript
// packages/auth-utils/src/ (혹은 @o4o/react-auth-utils)
export function usePostLoginRedirect(options: {
  isAuthenticated: boolean;
  isContextLoaded: boolean;
  user: unknown;
  getPostLoginRoute: (user: unknown) => string | null;
  workspacePrefixes: string[];  // e.g. ['/store', '/operator', '/admin']
  onLoginSuccess?: (() => void) | null;
}): void
```

**주의**: React hook이므로 `@o4o/auth-utils` (pure TS)에 넣으려면 React 의존성이 생김. 별도 `@o4o/react-auth-utils` 패키지 또는 서비스별 local hook으로 유지하는 것이 적절.

---

### 2-D. `PLATFORM_ADMIN_ROLES` / `STORE_OWNER_ROLES` 상수 확장

**현재 상태**: `@o4o/auth-utils`의 `hasAnyRole`과 함께 사용하는 역할 상수 배열이 서비스별로 분산.

KPA에는 `STORE_OWNER_ROLES`, `PLATFORM_ROLES` 상수가 별도 `role-constants.ts`에 있음.

**제안**: `isOperatorOrAbove`, `isAdminOrAbove`처럼 `isStoreOwner(roles, serviceKey)` 함수 형태가 더 단순하고 확장성 있음.

```typescript
// packages/auth-utils/src/hasRole.ts 확장
export function isStoreOwner(roles: string[], serviceKey: string): boolean {
  return roles.some(r =>
    r === `${serviceKey}:store_owner` ||
    r === 'cosmetics:store_owner'  // k-cosmetics prefix 예외
  );
}
```

단, k-cosmetics의 `cosmetics:store_owner` prefix 불일치로 인해 `isStoreOwnerDual(roles, storeOwnerRole, contextFlag)` 방식이 더 유연.

---

## 3. 공통화 금지 영역

| 영역 | 이유 |
|------|------|
| `{SERVICE}_ROLE_PRIORITY` 배열 | 서비스마다 역할 체계 다름 (kpa:pharmacist vs glycopharm:store_owner vs neture:supplier) |
| `{SERVICE}_DASHBOARD_MAP` | 서비스마다 워크스페이스 경로 다름 (`/store` vs `/store/hub` vs `/supplier/dashboard`) |
| `get{Service}PostLoginRoute()` 함수 body | context fallback 이름, mypage null 처리, activityType 체크 등 서비스별 상이 |
| `loginType` override 분기 | GlycoPharm 전용 (pharmacy/operator URL 쿼리 파라미터) |
| `MembershipGate` 내부 serviceKey | 서비스별 고정값 |
| `ROLE_LABELS`, `ROLE_ICONS` | 서비스별 표시 텍스트/이모지 상이 |

---

## 4. 추천 패키지 구조

### Option A: `@o4o/auth-utils` 확장 (권장)

기존 패키지에 pure TS 유틸만 추가. React 의존성 없음.

```
packages/auth-utils/src/
├── (기존)
│   ├── getPrimaryDashboardRoute.ts  ✅
│   ├── hasRole.ts                   ✅
│   ├── extractRoles.ts              ✅
│   ├── rolePriority.ts              (legacy)
│   └── roleDashboardMap.ts          (legacy)
├── (신규 추가 후보)
│   ├── isStoreOwnerDual.ts          ← P1 추출 후보
│   └── getRoleLabel.ts              ← P2 추출 후보
└── index.ts                         (re-export 추가)
```

### Option B: `@o4o/react-auth-utils` 신규 패키지 (선택적)

`usePostLoginRedirect()` hook이 필요한 경우 React 의존성 분리를 위해 별도 패키지.

```
packages/react-auth-utils/src/
├── usePostLoginRedirect.ts    ← hook
└── index.ts
```

**현재 시점에서는 Option A만 진행 권장.** `usePostLoginRedirect`는 각 서비스별 context 구조 차이가 커서 완전 추상화보다 "문서화된 패턴 + 서비스별 local 구현"이 더 실용적.

---

## 5. utility 후보 목록

| 유틸 | 현재 위치 | 추출 대상 | 우선순위 |
|------|----------|----------|---------|
| `isStoreOwnerDual(roles, roleKey, contextFlag?)` | KPA 로컬 중복 | `@o4o/auth-utils` | P1 |
| `getRoleLabel(roles, priority, labels, fallback?)` | Neture 로컬 | `@o4o/auth-utils` | P2 |
| `usePostLoginRedirect(options)` | KPA App.tsx | `@o4o/react-auth-utils` or 문서화 | P3 |
| `isStoreOwner(roles, serviceKey)` | 없음 | `@o4o/auth-utils` `hasRole.ts` 확장 | P3 |

---

## 6. canonical API 제안

### `isStoreOwnerDual` 확정 시그니처

```typescript
/**
 * JWT roles 또는 context flag 기반 store_owner 판정.
 * stale JWT 대응: role이 누락된 경우 contextFlag로 보완.
 *
 * @param roles       - user.roles (JWT payload)
 * @param storeOwnerRole - 서비스별 store_owner role string (e.g. 'kpa:store_owner')
 * @param contextFlag - user.isStoreOwner 등 context에서 파생된 boolean (optional)
 */
export function isStoreOwnerDual(
  roles: string[],
  storeOwnerRole: string,
  contextFlag?: boolean,
): boolean {
  return roles.includes(storeOwnerRole) || contextFlag === true;
}
```

### `getRoleLabel` 확정 시그니처

```typescript
/**
 * PRIORITY 순서 기준으로 roles 중 가장 높은 역할의 표시 이름 반환.
 * Neture getNetureRoleLabel() 패턴의 일반화.
 *
 * @param roles    - user.roles
 * @param priority - 서비스별 ROLE_PRIORITY 배열
 * @param labels   - role → 표시 이름 맵
 * @param fallback - 매칭 없을 때 반환값 (default: '회원')
 */
export function getRoleLabel(
  roles: string[],
  priority: readonly string[],
  labels: Record<string, string>,
  fallback = '회원',
): string {
  for (const role of priority) {
    if (roles.includes(role) && labels[role]) return labels[role];
  }
  return fallback;
}
```

---

## 7. PostLoginRedirect canonical 패턴 (문서화)

추출 대신 문서화로 표준화. 각 서비스는 아래 구조를 따른다.

```typescript
/**
 * PostLoginRedirect — canonical pattern (WO-O4O-KPA-DASHBOARD-REDIRECT-UNIFICATION-V1 기준)
 *
 * 서비스별 파일: services/web-{service}/src/App.tsx
 * 서비스별 hook: useAuth()에서 isAuthenticated, user, isContextLoaded 추출
 * 서비스별 config: get{Service}PostLoginRoute(user) 호출
 */
function PostLoginRedirect() {
  const { user, isAuthenticated, isContextLoaded } = useAuth(); // 서비스별 필드명
  const navigate = useNavigate();
  const location = useLocation();

  const wasAuthRef = useRef(isAuthenticated);
  const didRedirectRef = useRef(false);

  useEffect(() => {
    const justLoggedIn = !wasAuthRef.current && isAuthenticated;
    wasAuthRef.current = isAuthenticated;

    if (!isAuthenticated) { didRedirectRef.current = false; return; }
    if (!justLoggedIn && !didRedirectRef.current) return;
    if (!isContextLoaded || !user) return;
    if (didRedirectRef.current) return;

    // 서비스별 workspace 경로 목록
    const WORKSPACE_PREFIXES = ['/store', '/operator', '/admin', '/instructor'];
    if (WORKSPACE_PREFIXES.some(p => location.pathname.startsWith(p))) {
      didRedirectRef.current = true; return;
    }

    const target = get{Service}PostLoginRoute(user);  // 서비스별 함수
    didRedirectRef.current = true;
    if (target) navigate(target, { replace: true });
  }, [isAuthenticated, isContextLoaded, user, navigate, location.pathname]);

  return null;
}
```

**각 서비스 적용 상태**:
- KPA: ✅ 구현됨 (reference)
- GlycoPharm: ❌ LoginPage 내부 — P2 이관 대상
- K-Cosmetics: ❌ LoginPage + LoginModal 내부 — P2 이관 대상
- Neture: ❌ 미구현 — 현재 gap 없음 (P3)

---

## 8. 역할 확장 시 유지 가능성 검토

| 신규 역할 | PRIORITY 추가 | MAP 추가 | 비고 |
|----------|-------------|---------|------|
| `kpa:instructor` | ✅ 이미 `lms:instructor` | ✅ `/instructor` | KPA 적용됨 |
| `neture:supplier` (upgrade) | ✅ 기존 `supplier` 아래에 추가 | ✅ | legacy `supplier` 공존 유지 |
| `kpa:branch` (분회) | ✅ pharmacist 아래 추가 | ✅ `/branch` | 향후 WO 필요 |
| `glycopharm:partner` | ✅ store_owner 아래 추가 | ✅ | 신규 역할 시 MAP 확장만 |

**결론**: PRIORITY+MAP 구조는 신규 역할 추가 시 배열/맵에 항목만 추가하면 됨. `getPrimaryDashboardRoute()`는 변경 불필요. **확장성 충분**.

---

## 9. 단계별 후속 WO 우선순위

| 우선순위 | WO ID | 내용 | 범위 |
|---------|-------|------|------|
| P1 | WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1 | `isStoreOwnerDual()` → `@o4o/auth-utils` 추출 + KPA 적용 | 패키지 |
| P1 | WO-O4O-INSTRUCTOR-ROUTE-GUARD-V1 | `/instructor` RoleGuard 추가 | KPA |
| P2 | WO-O4O-AUTH-UTILS-ROLE-LABEL-V1 | `getRoleLabel()` → `@o4o/auth-utils` 추출 + Neture 위임 | 패키지 |
| P2 | WO-O4O-GLYCOPHARM-POSTLOGIN-REDIRECT-UNIFICATION-V1 | LoginPage → App.tsx PostLoginRedirect 이관 | GlycoPharm |
| P2 | WO-O4O-KCOSMETICS-POSTLOGIN-REDIRECT-UNIFICATION-V1 | LoginPage+Modal → App.tsx PostLoginRedirect 이관 | K-Cosmetics |
| P3 | WO-O4O-GLYCOPHARM-STORE-MENU-ENTRY-V1 | 헤더 드롭다운 "내 매장" 추가 (KPA 패턴) | GlycoPharm |
| P3 | WO-O4O-KCOSMETICS-STORE-MENU-ENTRY-V1 | 헤더 드롭다운 "내 매장" 추가 | K-Cosmetics |
| P3 | WO-O4O-NETURE-POSTLOGIN-REDIRECT-V1 | 역할 기반 redirect 구현 | Neture |
| P4 | WO-O4O-LEGACY-ROLE-PRIORITY-CLEANUP-V1 | `rolePriority.ts` / `roleDashboardMap.ts` legacy 비접두사 제거 | 패키지 |

---

## 10. 결론

**현재 달성된 것:**
- 4개 서비스 PRIORITY+MAP 구조 통일 ✅
- `getPrimaryDashboardRoute()` 공유 ✅
- K-Cosmetics roles array 버그 수정 ✅
- GlycoPharm store_owner Map 추가 ✅

**즉시 추출 가능한 유틸:**
- `isStoreOwnerDual()` — 구현 단순, 가치 명확, stale JWT 문제 해결
- `getRoleLabel()` — Neture 패턴 일반화, 4개 서비스 모두 혜택

**패턴화 + 문서화로 충분한 영역:**
- `PostLoginRedirect` — hook 추출보다 canonical 패턴 문서화가 현실적
- `PRIORITY/MAP` 값 — 서비스별 고유 정보이므로 공유 불가

**divergence 방지 핵심 원칙:**
> "config(값)는 서비스별, logic(함수)는 공유"

---

*Author: Claude Code (IR 조사)*
*Date: 2026-05-15*
*Status: COMPLETE — 후속 WO는 우선순위에 따라 별도 실행*
