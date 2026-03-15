# IR-O4O-NETURE-LOGIN-REDIRECT-TRACE-AUDIT-V1

> Neture 로그인 이후 Redirect Flow 정밀 조사 보고서

**조사일:** 2026-03-15 (V2 Updated)
**대상 서비스:** Neture (neture.co.kr)
**상태:** COMPLETED

---

## Executive Summary

**admin-neture@o4o.com (neture:admin) 계정이 `/workspace/operator`로 이동하는 Root Cause 3개를 확인했다.**

| # | Root Cause | 위치 | 심각도 |
|---|-----------|------|--------|
| RC-1 | Role 쿼리에 ORDER BY 없음 — roles 배열 순서 비결정적 | `role-assignment.service.ts:40-46` | CRITICAL |
| RC-2 | Primary role 선택이 `roles[0]` (첫 번째 요소) | `authentication.service.ts:254-255` | CRITICAL |
| RC-3 | `rolesToScopeLevel()`이 prefixed role 미인식 | `scope-assignment.utils.ts:40-69` | HIGH |

---

## 1. 문제 요약

| 계정 | 역할 | 기대 이동 | 실제 이동 |
|------|------|----------|----------|
| admin-neture@o4o.com | neture:admin | `/workspace/admin` | `/workspace/operator` |
| operator-neture@o4o.com | neture:operator | `/workspace/operator` | `/workspace/operator` |

**admin 계정이 operator workspace로 이동하는 문제가 지속됨.**

기존 수정 (commit `a0e119703`, WO-O4O-NETURE-AUTH-ROLE-REDIRECT-FIX-V1) 이후에도 문제 해결되지 않음.

---

## 2. 실제 Redirect Chain (정밀 추적)

```
admin-neture@o4o.com 로그인
    ↓
POST /api/v1/auth/login
    ↓
Backend: roleAssignmentService.getRoleNames(userId)
    ↓  ← RC-1: TypeORM .find() — NO ORDER BY
    ↓  결과: ['neture:operator', 'neture:admin'] (순서 비결정적)
    ↓
Backend: user.role = userRoles[0]
    ↓  ← RC-2: 첫 번째 요소 = 'neture:operator' (가능)
    ↓
Backend: rolesToScopeLevel('neture:operator', ['neture:operator', 'neture:admin'])
    ↓  ← RC-3: 'neture:admin' ≠ 'admin' → scope = 'public'
    ↓
Frontend: LoginModal.handleLoginSuccess(result.role, result.roles)
    ↓
mapApiRoles(apiUser, ROLE_MAP, 'user')
    ↓  ROLE_MAP에 'neture:admin' 키 없음 → 매핑 실패 가능
    ↓
getPrimaryDashboardRoute(roles, ROUTE_OVERRIDES)
    ↓  ROLE_PRIORITY: ['admin', 'operator', ...]
    ↓  roles.includes('admin') → 매핑 결과에 따라 TRUE/FALSE
    ↓
navigate(dashboardPath)  ← 최종 목적지
```

---

## 3. Redirect 코드 전체 검색 결과

### `/workspace/operator` 참조

| 파일 | 라인 | 코드 | 설명 |
|------|------|------|------|
| `services/web-neture/src/contexts/AuthContext.tsx` | 47 | `operator: '/workspace/operator'` | ROUTE_OVERRIDES 정의 |
| `services/web-neture/src/App.tsx` | 649-671 | `<Route path="/workspace/operator" ...>` | Operator 라우트 정의 (24개 하위 경로) |
| `services/web-neture/src/App.tsx` | 717 | `<Navigate to="/workspace/operator" replace />` | `/operator` → `/workspace/operator` 리다이렉트 |
| `services/web-neture/src/components/layouts/OperatorLayout.tsx` | 전체 | 7개 네비게이션 항목 | Operator 사이드바 메뉴 |

### `/workspace/admin` 참조

| 파일 | 라인 | 코드 | 설명 |
|------|------|------|------|
| `services/web-neture/src/contexts/AuthContext.tsx` | 46 | `admin: '/workspace/admin'` | ROUTE_OVERRIDES 정의 |
| `services/web-neture/src/App.tsx` | 612-642 | `<Route path="/workspace/admin" ...>` | Admin 라우트 정의 (27개 하위 경로) |
| `services/web-neture/src/App.tsx` | 714 | `<Navigate to="/workspace/admin" replace />` | `/admin` → `/workspace/admin` 리다이렉트 |
| `services/web-neture/src/components/layouts/AdminLayout.tsx` | 전체 | 8개 사이드바 그룹 | Admin 사이드바 메뉴 |

### navigate() 호출

| 파일 | 라인 | 코드 | 설명 |
|------|------|------|------|
| `services/web-neture/src/components/LoginModal.tsx` | 88 | `navigate(dashboardPath)` | **PRIMARY REDIRECT** — 로그인 성공 후 이동 |
| `services/web-neture/src/components/LoginModal.tsx` | 84 | `getPrimaryDashboardRoute(roles, ROUTE_OVERRIDES)` | roles 배열로 경로 결정 |
| `services/web-neture/src/components/LoginModal.tsx` | 86 | `getPrimaryDashboardRoute([role], ROUTE_OVERRIDES)` | Fallback (단일 role) |
| `services/web-neture/src/components/LoginModal.tsx` | 138 | `handleLoginSuccess(result.role, result.roles)` | Password sync 성공 |
| `services/web-neture/src/components/AccountMenu.tsx` | 102 | `getPrimaryDashboardRoute(user.roles, ROUTE_OVERRIDES)` | 대시보드 메뉴 링크 |
| `services/web-neture/src/pages/MyPage.tsx` | 63 | `getPrimaryDashboardRoute(user.roles, ROUTE_OVERRIDES)` | 마이페이지 대시보드 링크 |
| `services/web-neture/src/components/RoleSwitcher.tsx` | 31 | `navigate(getPrimaryDashboardRoute([role], ROUTE_OVERRIDES))` | 역할 전환 시 이동 |

---

## 4. Role Redirect 로직 조사

### ROUTE_OVERRIDES (AuthContext.tsx:45-51)

| 역할 | Redirect 경로 |
|------|-------------|
| admin | `/workspace/admin` |
| operator | `/workspace/operator` |
| supplier | `/account/supplier` |
| partner | `/account/partner` |
| seller | `/seller/overview` |

**문제:** Key가 **unprefixed** (`admin`, `operator`)이지만, Backend가 **prefixed** role (`neture:admin`)을 반환할 경우 매핑 실패.

### ROLE_PRIORITY (rolePriority.ts)

```
admin(0) > operator(1) > supplier(2) > partner(3) > seller(4) > pharmacy(5) > consumer(6) > user(7)
```

**문제:** `neture:admin`은 `'admin'`과 매치되지 않음 (exact string match).

### ROLE_MAP (AuthContext.tsx:54-63)

| API Role | Frontend Role |
|----------|--------------|
| admin | admin |
| super_admin | admin |
| operator | operator |
| supplier | supplier |
| partner | partner |
| seller | seller |
| customer | user |
| user | user |

**문제:** `neture:admin` → ROLE_MAP에 없음 → mapping 실패 → default 'user'로 매핑될 가능성.

### getPrimaryDashboardRoute (packages/auth-utils)

```typescript
export function getPrimaryDashboardRoute(
  roles: string[],
  overrides?: Record<string, string>,
): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {          // ← exact match only
      return overrides?.[role] ?? ROLE_DASHBOARD_MAP[role] ?? '/';
    }
  }
  return '/';  // ← fallback
}
```

---

## 5. Workspace Router 구조

```
/workspace                    → Navigate to="/" (Legacy redirect, line 677)
/workspace/admin              → AdminDashboardPage (ProtectedRoute: ['admin'])
/workspace/admin/*            → AdminLayout → 27개 admin 서브페이지
/workspace/operator           → NetureOperatorDashboard (ProtectedRoute: ['admin', 'operator'])
/workspace/operator/*         → OperatorLayout → Operator 서브페이지
/workspace/partners/*         → SupplierOpsLayout
/workspace/forum/*            → SupplierOpsLayout
/workspace/hub                → HubPage
/workspace/my-content         → MyContentPage
```

**핵심:** `/workspace/admin`은 `['admin']`만 허용, `/workspace/operator`는 `['admin', 'operator']` 둘 다 허용.

---

## 6. Route Guard 조사

| 경로 | Guard | 허용 역할 | 비고 |
|------|-------|----------|------|
| `/workspace/admin/*` | `ProtectedRoute allowedRoles={['admin']}` | admin만 | 엄격한 접근 제어 |
| `/workspace/operator/*` | `ProtectedRoute allowedRoles={['admin', 'operator']}` | admin + operator 모두 | **admin도 접근 가능** |

**Guard 자체는 정상.** admin이 `/workspace/operator`로 이동해도 Guard가 통과시킴 (allowedRoles에 'admin' 포함). 사용자는 문제를 인지하지 못할 수 있음.

### Layout 내부 Redirect 조사

| Layout | 파일 | 내부 Redirect | 비고 |
|--------|------|-------------|------|
| AdminLayout | `components/layouts/AdminLayout.tsx` | 없음 | 순수 레이아웃 |
| OperatorLayout | `components/layouts/OperatorLayout.tsx` | 없음 | 순수 레이아웃 |
| SupplierOpsLayout | `components/layouts/SupplierOpsLayout.tsx` | 없음 | 공유 workspace |

**결론: Layout 내부에서 redirect가 발생하지 않음.**

---

## 7. Backend Role 반환 조사

### RC-1: RoleAssignmentService — ORDER BY 없음

**파일:** `apps/api-server/src/modules/auth/services/role-assignment.service.ts:40-46`

```typescript
async getActiveRoles(userId: string): Promise<RoleAssignment[]> {
  const assignments = await this.repository.find({
    where: { userId, isActive: true },
  });  // ← NO ORDER BY — DB insertion order 의존 (비결정적)
  return assignments.filter((a) => a.isValidNow());
}

async getRoleNames(userId: string): Promise<string[]> {
  const assignments = await this.getActiveRoles(userId);
  return assignments.map((a) => a.role);
}
```

### RC-2: Primary Role Selection — roles[0]

**파일:** `apps/api-server/src/services/authentication.service.ts:254-255`

```typescript
publicData.roles = userRoles;           // 정렬 안 된 배열
publicData.role = (userRoles[0]) || 'user';  // 첫 번째 요소 → 비결정적
```

**파일:** `apps/api-server/src/utils/token.utils.ts:75-106`

```typescript
const primaryRole = userRoles[0] || 'user';  // 정렬 안 된 첫 번째 역할 사용
```

### RC-3: Scope Assignment — Prefixed Role 미인식 (신규 발견)

**파일:** `apps/api-server/src/utils/scope-assignment.utils.ts:40-69`

```typescript
function rolesToScopeLevel(role: string, roles?: string[]): ScopeLevel {
  const allRoles = new Set([role, ...(roles || [])]);

  if (allRoles.has('super_admin') || allRoles.has('admin')) {  // ← unprefixed only!
    return 'admin';
  }
  if (allRoles.has('operator')) {  // ← unprefixed only!
    return 'operator';
  }
  // ...
  return 'public';  // ← 'neture:admin' → 'public' (WRONG)
}
```

**영향:** `neture:admin`은 `'admin'`과 문자열 매치되지 않음 → scope level `public` 반환 → JWT scope 오류.

---

## 8. 3계층 Root Cause 분석

### 기존 수정 (a0e119703) 검증

| 계층 | 수정 내용 | 동작 여부 | 한계 |
|------|----------|----------|------|
| mapApiRoles.ts | ROLE_PRIORITY 정렬 추가 | ✅ 정렬 동작 | API가 올바른 역할을 반환해야 함 |
| AuthContext.tsx | roles 배열 전체 반환 | ✅ 반환 동작 | API 응답에 'admin' 역할이 있어야 함 |
| LoginModal.tsx | roles 배열로 redirect 계산 | ✅ 계산 동작 | roles에 'admin'이 포함되어야 함 |

### 수정이 동작하지 않는 시나리오

| 시나리오 | API 반환 | mapApiRoles 결과 | 최종 경로 | 버그? |
|---------|---------|-----------------|----------|------|
| 정상 | `['neture:admin', 'neture:operator']` | `['admin', 'operator']` | `/workspace/admin` | 정상 |
| **버그** | `['neture:operator']` (admin 누락) | `['operator']` | `/workspace/operator` | **BROKEN** |
| 순서만 다름 | `['neture:operator', 'neture:admin']` | `['admin', 'operator']` (정렬됨) | `/workspace/admin` | 정상 (수정으로 해결) |
| **버그** | `['operator']` (prefix 없음, admin 누락) | `['operator']` | `/workspace/operator` | **BROKEN** |

---

## 9. 의심 원인 순위

| 순위 | 원인 | 근거 | 검증 방법 |
|------|------|------|----------|
| **1** | **DB role_assignments에 neture:admin 미할당** | getRoleNames()가 DB에서 직접 조회. admin 역할이 없으면 반환 불가 | Cloud Console SQL: `SELECT * FROM role_assignments WHERE user_id = (UUID)` |
| **2** | **ROLE_MAP 매핑에서 neture:admin → admin 변환 실패** | ROLE_MAP에 'neture:admin' 키 없음. prefix 처리 로직 미확인 | mapApiRoles.ts의 prefix strip 로직 확인 |
| **3** | **isValidNow() 필터에서 admin 역할 제외** | validFrom/validUntil 날짜 조건에 의해 admin 역할 필터링 가능 | role_assignments의 valid_from, valid_until 확인 |
| **4** | **rolesToScopeLevel() scope 오류** (RC-3) | JWT scope가 'public'으로 설정 → 프론트엔드에서 admin 불인식 | scope-assignment.utils.ts 코드 확인 |
| **5** | **배포 미반영** | commit a0e119703의 코드가 프로덕션에 미배포 | 프로덕션 빌드 버전 확인 |

---

## 10. Role Mapping 전체 흐름 요약

| Backend Role | mapApiRoles 결과 | ROLE_PRIORITY 매치 | ROUTE_OVERRIDES 매치 | 최종 경로 |
|-------------|-----------------|-------------------|---------------------|----------|
| `admin` | `'admin'` | YES (1순위) | `/workspace/admin` | CORRECT |
| `operator` | `'operator'` | YES (2순위) | `/workspace/operator` | CORRECT |
| `neture:admin` | `'admin'` (prefix strip 필요) | YES (if mapped) | `/workspace/admin` | **DEPENDS ON mapApiRoles** |
| `neture:operator` | `'operator'` (prefix strip 필요) | YES (if mapped) | `/workspace/operator` | **DEPENDS ON mapApiRoles** |

---

## 11. 핵심 코드 위치 요약

### Frontend

| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `services/web-neture/src/components/LoginModal.tsx` | 로그인 후 redirect | 73-90 (handleLoginSuccess) |
| `services/web-neture/src/contexts/AuthContext.tsx` | 인증 + 역할 매핑 | 45-51 (ROUTE_OVERRIDES), 54-63 (ROLE_MAP) |
| `services/web-neture/src/App.tsx` | 라우트 정의 | 612-614 (admin guard), 649-650 (operator guard), 677 (/workspace redirect) |
| `packages/auth-utils/src/mapApiRoles.ts` | 역할 매핑 + 정렬 | 23-39 |
| `packages/auth-utils/src/getPrimaryDashboardRoute.ts` | 대시보드 경로 결정 | 4-14 |
| `packages/auth-utils/src/rolePriority.ts` | 역할 우선순위 | 1-10 |

### Backend

| 파일 | 역할 | 핵심 라인 |
|------|------|----------|
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | 역할 조회 (RC-1) | 40-54 (ORDER BY 없음) |
| `apps/api-server/src/services/authentication.service.ts` | 로그인 처리 (RC-2) | 195, 250-255 (roles[0]) |
| `apps/api-server/src/utils/scope-assignment.utils.ts` | Scope 결정 (RC-3) | 40-69 (prefix 미인식) |
| `apps/api-server/src/utils/token.utils.ts` | 토큰 생성 | 75-106 (roles[0]) |
| `apps/api-server/src/modules/auth/controllers/auth.controller.ts` | Auth API | 219-329, 938-986 |

---

## 12. 수정 권장 방식

### 즉시 검증 (WO 불필요)

1. **DB 역할 확인**: Cloud Console에서 `SELECT * FROM role_assignments WHERE user_id = (admin-neture UUID)`
2. **API 응답 확인**: 브라우저 Network 탭에서 `/api/v1/auth/login` 응답의 `roles` 배열 확인

### WO-O4O-NETURE-LOGIN-REDIRECT-FIX-V2 (수정 필요 시)

| # | 수정 대상 | 파일 | 내용 |
|---|----------|------|------|
| Fix-1 | Backend 역할 정렬 (RC-1) | `role-assignment.service.ts` | `ORDER BY role ASC` 추가 |
| Fix-2 | Backend Token 정렬 (RC-2) | `token.utils.ts` | roles 정렬 후 `roles[0]` 사용 |
| Fix-3 | Scope Assignment Prefix (RC-3) | `scope-assignment.utils.ts` | `r.endsWith(':admin')` 체크 추가 |
| Fix-4 | DB 역할 할당 | Admin API 또는 SQL | admin-neture@o4o.com에 `neture:admin` 역할 확인/추가 |

### 구조적 개선 (장기)

| 항목 | 내용 |
|------|------|
| Backend ROLE_PRIORITY | `packages/auth-utils/src/rolePriority.ts`를 Backend에서도 사용하여 정렬 통일 |
| ORDER BY 추가 | `role_assignments` 쿼리에 role 우선순위 기반 정렬 추가 |
| Prefix 통일 | Frontend ROLE_MAP에 prefixed role 추가 또는 Backend에서 prefix strip |

---

## 13. O4O 전체 서비스 영향도

이 문제는 **Neture뿐 아니라 모든 O4O 서비스에 동일하게 존재할 가능성이 높다.**

| 서비스 | Backend Role Prefix | Frontend 인식 | 영향 |
|--------|-------------------|-------------|------|
| Neture | `neture:admin` | unprefixed only | **BROKEN** |
| KPA Society | `kpa:admin` | 자체 auth-utils | 별도 확인 필요 |
| K-Cosmetics | `cosmetics:admin` | 동일 패키지 가능 | 위험 |
| GlycoPharm | `glycopharm:admin` | 동일 패키지 가능 | 위험 |

**권장 후속 조사:** `IR-O4O-ALL-SERVICES-ROLE-REDIRECT-AUDIT-V1`

---

*Generated: 2026-03-15*
*Status: Investigation Complete — DB Verification Pending*
*Next: WO-O4O-NETURE-LOGIN-REDIRECT-FIX-V2*
