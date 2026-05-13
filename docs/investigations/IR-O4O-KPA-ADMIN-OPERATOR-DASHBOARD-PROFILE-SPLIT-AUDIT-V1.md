# IR-O4O-KPA-ADMIN-OPERATOR-DASHBOARD-PROFILE-SPLIT-AUDIT-V1

**조사 유형:** Investigation Report (IR)  
**조사 대상:** KPA admin/operator 진입 경로·프로필 메뉴·사이드바 분기 상태  
**조사 날짜:** 2026-05-13  
**상태:** COMPLETE

---

## 목적

admin 역할(`kpa:admin`)을 가진 사용자가 operator 프로필 메뉴와 진입 경로를 그대로 사용하고 있는 현황을 파악하고, admin 전용 공간(`/admin/*`)과 operator 공간(`/operator/*`)이 실제로 어떻게 분리되어 있는지 또는 혼용되고 있는지 확인한다.

목표 구조:
- admin: `/admin` 진입, 프로필에 "관리자 대시보드" 표시
- operator: `/operator` 진입, operator 전용 프로필 메뉴
- admin은 `/operator/*` 접근 가능, 단 프로필/메뉴는 admin 맥락 유지

---

## 1. 현재 레이아웃 시스템 구조

두 개의 독립적인 레이아웃 시스템이 공존한다.

### 1-A. `/admin/*` — AdminRoutes

```
AdminRoutes
  Guard: AdminAuthGuard
    → user.roles.includes('kpa:admin') || user.membershipRole === 'admin'
  Layout: AdminLayout
    → KpaGlobalHeader (Layer A)
    → AdminSidebar (Layer C)
```

**AdminSidebar 메뉴 구성 (5그룹):**

| 그룹 | 항목 |
|------|------|
| Overview | 대시보드 (`/admin/dashboard`), 플랫폼 운영 (`/admin/kpa-dashboard`) |
| Users | 회원 관리 (`/admin/members`), 위원회 관리 (`/admin/committee-requests`), Steward 관리 (`/admin/stewards`) |
| Approvals | 신상신고 (`/admin/annual-report`) |
| Finance | 연회비 (`/admin/fee`) |
| System | 임원 관리 (`/admin/officers`), 설정 (`/admin/settings`) |

**AdminRoutes에 실제로 정의된 Route:**
- `/admin/kpa-dashboard` → `KpaOperatorDashboardPage`
- `/admin/committee-requests` → `CommitteeRequestsPage`
- `/admin/stewards` → `StewardManagementPage`
- 그 외 경로(`/admin/*`) → `/admin/kpa-dashboard`로 리디렉트

**불일치:** AdminSidebar에 9개 메뉴가 있으나 AdminRoutes에 실제 구현된 Route는 3개뿐이다.  
나머지 6개 경로(`/admin/dashboard`, `/admin/members`, `/admin/annual-report`, `/admin/fee`, `/admin/officers`, `/admin/settings`)는 fallback redirect로 `/admin/kpa-dashboard`로 이동한다.

### 1-B. `/operator/*` — OperatorRoutes

```
OperatorRoutes
  Guard: RoleGuard([KPA_ADMIN, KPA_OPERATOR, PLATFORM_SUPER_ADMIN])
    → kpa:admin도 통과함 ← 핵심
  Layout: KpaOperatorLayoutWrapper
    → KpaGlobalHeader (Layer A)
    → OperatorShell sidebar (filterMenuByRole(UNIFIED_MENU, isAdmin))
```

admin(`kpa:admin`)은 `PLATFORM_ROLES` 배열에 포함되므로 `RoleGuard`를 통과한다.  
`filterMenuByRole(UNIFIED_MENU, isAdmin)`로 admin일 때 추가 메뉴 항목이 노출된다.

**admin 전용 inner RoleGuard (operator routes 내부):**
- `/operator/legal` — `RoleGuard([KPA_ADMIN, PLATFORM_SUPER_ADMIN])`
- `/operator/audit-logs` — `RoleGuard([KPA_ADMIN, PLATFORM_SUPER_ADMIN])`
- `/operator/roles` — `RoleGuard([KPA_ADMIN, PLATFORM_SUPER_ADMIN])`

이 3개 경로는 operator route 구조 안에 있으면서 admin만 접근 가능한 기능이다.

---

## 2. 프로필 메뉴 분기 현황

### 2-A. `KpaGlobalHeader` 프로필 메뉴 코드

```typescript
const isAdmin = user ? isAdminOrAbove(user.roles, 'kpa') : false;
const isOperator = user ? isOperatorOrAbove(user.roles, 'kpa') : false;

// 프로필 드롭다운:
{(isInstructor || isAdmin) && <MenuItem to="/instructor">강의 대시보드</MenuItem>}
{(isOperator || isAdmin) && <MenuItem to="/operator" icon={<Shield>}>운영 대시보드</MenuItem>}
<MenuItem to="/mypage">마이페이지</MenuItem>
<MenuItem to="/mypage/settings">설정</MenuItem>
```

### 2-B. `isOperatorOrAbove` 함수 동작

```typescript
export function isOperatorOrAbove(roles: string[], serviceKey: string): boolean {
  return roles.some(r =>
    r === 'platform:super_admin' ||
    r === `${serviceKey}:admin` ||   // ← kpa:admin도 여기서 true
    r === `${serviceKey}:operator`
  );
}
```

`kpa:admin`은 `isOperatorOrAbove('kpa')`에서 true를 반환하므로,  
admin은 항상 `isOperator = true`이기도 하다.

### 2-C. 현재 admin의 프로필 메뉴 실제 표시

| 조건 | 표시 여부 | 이동 경로 |
|------|----------|----------|
| 강의 대시보드 | ✅ (isAdmin=true) | `/instructor` |
| **관리자 대시보드** | ❌ **없음** | — |
| 운영 대시보드 | ✅ (isOperator=true, isAdmin=true 모두 해당) | `/operator` |
| 마이페이지 | ✅ | `/mypage` |

**결론**: admin에게 `/admin`으로 이동하는 프로필 메뉴 항목이 존재하지 않는다.  
admin은 프로필 메뉴에서 "운영 대시보드" → `/operator`로만 진입 가능하다.

---

## 3. Admin 진입 경로 분석

### 3-A. 로그인 후 리디렉션

`roleDashboardMap.ts`:
```typescript
admin → /admin
operator → /operator
```
이 맵은 unprefixed 역할 이름(`admin`, `operator`) 기준이다.  
실제 JWT payload에는 `kpa:admin`, `kpa:operator`로 prefixed된 역할이 담긴다.

로그인 후 redirect 로직이 `kpa:admin` 역할을 `roleDashboardMap`에서 `admin`으로 매핑하는지,  
아니면 prefix 제거 없이 매핑 실패하여 기본 경로(`/`)로 이동하는지는 추가 확인 필요.

### 3-B. admin이 `/admin`에 접근하는 현실적 방법

1. URL 직접 입력 (`/admin/kpa-dashboard`)
2. 로그인 직후 redirect (roleDashboardMap이 `kpa:admin` → `/admin` 매핑 성공한 경우)
3. 현재 **프로필 메뉴에서는 접근 불가**

---

## 4. 두 공간의 기능 중복 분석

### 4-A. `/admin/kpa-dashboard` vs `/operator/*`

`/admin/kpa-dashboard`에 렌더되는 컴포넌트: **`KpaOperatorDashboardPage`**

즉, admin 공간의 대시보드가 operator 대시보드 컴포넌트를 공유한다.  
admin 전용 대시보드 컴포넌트가 별도로 존재하지 않는다.

### 4-B. admin 전용 기능 위치 현황

| 기능 | 위치 |
|------|------|
| `/admin/*` admin 공간 고유 기능 | 3개 Route만 구현 (kpa-dashboard, committee-requests, stewards) |
| admin only 기능 | `/operator/legal`, `/operator/audit-logs`, `/operator/roles` (operator 공간 내 inner guard) |
| AdminSidebar 메뉴 | 9개 항목 중 6개 미구현 (fallback redirect) |

**구조적 현실**: admin 전용 기능의 상당수가 `/admin/*`이 아니라 `/operator/*` 안에 inner guard 방식으로 존재한다.

---

## 5. 현재 상태 요약 판정

### 5-A. 문제 항목

| 항목 | 현재 상태 | 기대 상태 |
|------|----------|----------|
| admin 프로필 메뉴 | "운영 대시보드" → `/operator` | "관리자 대시보드" → `/admin` 추가 필요 |
| operator 프로필 메뉴 | "운영 대시보드" → `/operator` | operator만 해당 (현재 admin도 동일 메뉴 — 의도적이라면 유지) |
| admin 로그인 후 진입 경로 | 불명확 (roleDashboardMap prefix 처리 여부) | `/admin` 진입 |
| `/admin/*` Route 완성도 | 9개 메뉴 중 3개만 구현 | AdminSidebar 메뉴와 Route 정합성 필요 |
| admin 전용 기능 위치 | `/operator/*` inner guard에 산재 | `/admin/*` 또는 명시적 구조 정의 필요 |
| admin 대시보드 컴포넌트 | `KpaOperatorDashboardPage` 공유 | admin 전용 대시보드 또는 명시적 공유 선언 필요 |

### 5-B. 현재 상태가 야기하는 UX 문제

1. **진입점 혼선**: admin 사용자가 프로필 메뉴에서 "운영 대시보드"만 보이므로 자신이 admin임에도 operator 공간에 진입
2. **admin 공간 인지 부재**: `/admin/*` 공간이 존재하지만 프로필 메뉴에서 접근 방법이 없어 사실상 비노출
3. **AdminSidebar 메뉴 허위 노출**: 사이드바에 표시되는 9개 항목 중 6개가 실제로는 `/admin/kpa-dashboard`로 redirect됨

---

## 6. 수정이 필요한 경우 최소 수정 방안

### Case A. 프로필 메뉴 분기 추가 (프론트, 최소 수정)

`KpaGlobalHeader` 프로필 메뉴에:
```typescript
// 기존:
{(isOperator || isAdmin) && <MenuItem to="/operator">운영 대시보드</MenuItem>}

// 수정:
{isAdmin && <MenuItem to="/admin">관리자 대시보드</MenuItem>}
{isOperator && !isAdmin && <MenuItem to="/operator">운영 대시보드</MenuItem>}
// 또는 admin도 /operator 접근이 필요하다면:
{isAdmin && <MenuItem to="/admin">관리자 대시보드</MenuItem>}
{isAdmin && <MenuItem to="/operator">운영 대시보드</MenuItem>}
{!isAdmin && isOperator && <MenuItem to="/operator">운영 대시보드</MenuItem>}
```

### Case B. AdminSidebar–Route 정합성 맞추기

AdminSidebar에 있는 미구현 6개 경로에 대응하는 Route를 `AdminRoutes`에 추가하거나,  
없는 항목은 AdminSidebar에서 제거하여 허위 메뉴를 정리.

### Case C. admin 전용 기능 위치 정리 (구조적 수정)

현재 `/operator/*` inner guard로 분산된 admin 전용 기능(`/operator/legal` 등)을  
`/admin/*` 하위로 이전할지, 또는 현행 혼합 구조를 유지할지 결정 필요.  
이는 Case A보다 큰 변경으로, 별도 WO 필요.

---

## 7. 관련 파일

| 파일 | 역할 | 주목 사항 |
|------|------|----------|
| `services/web-kpa-society/src/components/KpaGlobalHeader.tsx` | 프로필 메뉴 | admin/operator 분기 없음 — 핵심 수정 대상 |
| `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx` | admin 진입 guard | `kpa:admin` 또는 `membershipRole === 'admin'` 조건 |
| `services/web-kpa-society/src/components/admin/AdminLayout.tsx` | admin 레이아웃 | `KpaGlobalHeader` + `AdminSidebar` |
| `services/web-kpa-society/src/components/admin/AdminSidebar.tsx` | admin 사이드바 | 9개 메뉴 정의, 6개 Route 미구현 |
| `services/web-kpa-society/src/routes/AdminRoutes.tsx` | admin 라우트 | 3개 Route만 구현, 나머지 fallback redirect |
| `services/web-kpa-society/src/routes/OperatorRoutes.tsx` | operator 라우트 | admin 진입 허용, inner guard로 admin 전용 3개 경로 |
| `services/web-kpa-society/src/components/kpa-operator/KpaOperatorLayoutWrapper.tsx` | operator 레이아웃 | `filterMenuByRole(UNIFIED_MENU, isAdmin)` — admin 여부로 메뉴 분기 |
| `packages/auth-utils/src/hasRole.ts` | 역할 판별 유틸 | `isOperatorOrAbove`에 `kpa:admin` 포함 → admin이 operator 조건 만족 |

---

## 판정 요약

| 질문 | 판정 |
|------|------|
| admin 전용 레이아웃이 존재하는가 | ✅ 존재 (`AdminLayout` + `AdminSidebar`, `/admin/*`) |
| admin 프로필 메뉴에 admin 진입점이 있는가 | ❌ 없음 — "운영 대시보드" → `/operator`만 표시 |
| admin이 `/operator/*`에 진입할 수 있는가 | ✅ 가능 (`RoleGuard`에 KPA_ADMIN 포함) |
| `/admin/*` Route 완성도 | ⚠️ 부분 — 9개 메뉴 중 3개만 Route 구현 |
| admin 전용 기능 위치가 일관적인가 | ❌ `/operator/*` inner guard에 산재 |
| 권장 다음 WO | `WO-O4O-KPA-ADMIN-PROFILE-MENU-SPLIT-V1` — 프로필 메뉴 admin/operator 분기 추가 (최소 수정) |
