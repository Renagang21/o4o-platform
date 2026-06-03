# IR-O4O-NETURE-ADMIN-USERS-SCOPE-AUDIT-V1

> **조사 요청서 (Investigation Report)**
>
> 코드 수정 없음 / UI 수정 없음 / 데이터 수정 없음
>
> Neture 관리자 회원관리 화면(`/admin/users`)에 Neture 회원이 아닌 사용자(platform, KPA, GlycoPharm, K-Cosmetics)가 함께 표시되는 문제를 조사한 보고서이다. 본 IR 은 **현재 동작을 코드 경로로 확정**하고, 정식 조회 범위를 정의하기 위한 1차 분석 자료이다.

- **작성일:** 2026-05-23
- **분류:** Investigation Report (Read Only — 코드 미수정)
- **대상 영역:** `https://neture.co.kr/admin/users` (Neture 관리자 회원관리)
- **연관 영역:**
  - `https://neture.co.kr/operator/users` (Neture 운영자 회원관리)
  - Backend `GET /api/v1/operator/members` 및 `GET /api/v1/operator/members/stats`
- **참조 정책:**
  - CLAUDE.md §7 Boundary Policy — Domain Primary Boundary 필터 필수
  - CLAUDE.md §F11 User/Operator Freeze — users · service_memberships · role_assignments 3-table
  - `docs/architecture/USER-OPERATOR-FREEZE-V1.md`
  - `docs/baseline/USER-DOMAIN-SSOT-V1.md`
  - `docs/architecture/O4O-BOUNDARY-POLICY-V1.md`
- **버전:** V1

---

## 0. 조사 목적

Neture 관리자 회원관리(`/admin/users`)에 다른 서비스(platform / KPA / GlycoPharm / K-Cosmetics) 사용자까지 함께 표시되는 현상의 **원인 경로를 코드 레벨로 확정**한다.

본 조사는:

1. 어떤 코드 경로에서 cross-service 사용자 leak 이 발생하는가
2. 탭(전체 / 공급자 / 파트너 / 셀러 / 가입 신청)의 카운트 산출 기준은 무엇인가
3. `/admin/users` 와 `/operator/users` 가 동일/상이 한가
4. 정식 Neture 관리자 회원관리의 조회 범위는 어떻게 정의되어야 하는가

를 확정하여, 후속 WO 단계의 수정 범위·우선순위·리스크 판단의 근거를 만든다.

> **본 IR 은 코드를 수정하지 않는다.** 수정 제안 섹션(§5) 은 *제안* 일 뿐이며, 최종 적용은 별도 WO 에서 사용자 확정 후 진행한다.

---

## 1. 조사 대상

| 항목 | 값 |
|------|------|
| 대상 URL | `https://neture.co.kr/admin/users` |
| 대상 컴포넌트 | [services/web-neture/src/pages/operator/UsersManagementPage.tsx](services/web-neture/src/pages/operator/UsersManagementPage.tsx) |
| 라우트 정의 | [services/web-neture/src/App.tsx:876](services/web-neture/src/App.tsx#L876) |
| 라우트 가드 | `AdminRoute` → `allowedRoles = ['neture:admin', 'platform:super_admin']` + `requireMembership = 'neture'` |
| API 엔드포인트 (목록) | `GET /api/v1/operator/members` |
| API 엔드포인트 (통계) | `GET /api/v1/operator/members/stats` |
| Backend Controller | [apps/api-server/src/controllers/operator/MembershipConsoleController.ts](apps/api-server/src/controllers/operator/MembershipConsoleController.ts) |
| Backend Route | [apps/api-server/src/routes/operator/membership.routes.ts](apps/api-server/src/routes/operator/membership.routes.ts) |
| Service Scope 결정 | [apps/api-server/src/utils/serviceScope.ts](apps/api-server/src/utils/serviceScope.ts) |

---

## 2. 조사 결과

### 2.1 `/admin/users` 와 `/operator/users` 는 동일 컴포넌트

[services/web-neture/src/App.tsx:876](services/web-neture/src/App.tsx#L876), [952](services/web-neture/src/App.tsx#L952):

```tsx
<Route path="/admin/users"    element={<UsersManagementPage />} />
<Route path="/operator/users" element={<UsersManagementPage />} />
```

- 라우트는 분리, 가드는 분리(`AdminRoute` vs `OperatorRoute`), **컴포넌트는 동일**.
- 동일 fetch 로직, 동일 API 엔드포인트, 동일 탭 구성, 동일 카운트 산출.

**의미**

`/admin/users` 와 `/operator/users` 의 **표시 내용 차이는 없다**. 차이는 오직 *접근 권한* 뿐이다.

---

### 2.2 화면 호출 API

[services/web-neture/src/pages/operator/UsersManagementPage.tsx:242-262](services/web-neture/src/pages/operator/UsersManagementPage.tsx#L242-L262):

```tsx
const params = new URLSearchParams();
params.set('page', String(page));
params.set('limit', '20');
if (activeTab === 'pending') params.set('status', 'pending');
if (searchQuery) params.set('search', searchQuery);

const { data } = await api.get(`/operator/members?${params}`);
```

**확인된 사실**

- 프론트엔드는 `serviceKey=neture` 쿼리 파라미터를 **전혀 전달하지 않는다**.
- 즉 "Neture 회원만 조회" 라는 의도는 코드 어디에도 표현되지 않는다.
- 화면 상단 주석(파일 line 2)에는 *"UsersManagementPage — Neture 회원 관리"* 로 명시되어 있으나, 실제 fetch 로직은 그 의도를 보장하지 않는다.

---

### 2.3 백엔드 service_key 필터 — Platform Admin 분기

[apps/api-server/src/controllers/operator/MembershipConsoleController.ts:87-102](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L87-L102):

```ts
// WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1: Service scope filter
if (!scope.isPlatformAdmin) {
  smConditions.push(`sm_f.service_key = ANY($${paramIdx})`);
  params.push(scope.serviceKeys);
  paramIdx++;
} else if (serviceKey && serviceKey !== 'all') {
  smConditions.push(`sm_f.service_key = $${paramIdx}`);
  params.push(serviceKey);
  paramIdx++;
}

if (smConditions.length > 0) {
  conditions.push(
    `EXISTS (SELECT 1 FROM service_memberships sm_f WHERE sm_f.user_id = u.id AND ${smConditions.join(' AND ')})`
  );
}
```

**확인된 사실**

| 호출자 유형 | service_key 필터 | 결과 |
|------------|------------------|------|
| `neture:admin` (Neture 전용 admin) | `sm_f.service_key = ANY(['neture'])` | **Neture 회원만** 표시 — 정상 |
| `neture:operator` | `sm_f.service_key = ANY(['neture'])` | **Neture 회원만** 표시 — 정상 |
| `platform:super_admin` | **필터 없음** (쿼리 파라미터 `serviceKey` 도 미전달) | **전체 서비스 사용자** 표시 — **leak 발생** |
| `platform:admin` | **필터 없음** | **전체 서비스 사용자** 표시 — **leak 발생** |

**판정**

- `service_key` 필터는 `!scope.isPlatformAdmin` 일 때만 자동 적용된다.
- platform admin 의 경우 프론트가 `serviceKey` 쿼리를 명시해야 필터가 걸린다.
- 프론트가 그 파라미터를 보내지 않으므로 **platform admin 으로 `/admin/users` 진입 시 cross-service 사용자 leak 이 항상 발생**한다.

---

### 2.4 Service Scope 결정 (`isPlatformAdmin`)

[apps/api-server/src/utils/serviceScope.ts:42-63](apps/api-server/src/utils/serviceScope.ts#L42-L63):

```ts
export function extractServiceScope(userRoles: string[]): ServiceScope {
  if (isPlatformAdmin(userRoles)) {
    return { serviceKeys: [], rolePrefixes: [], isPlatformAdmin: true };
  }
  // ...
}
```

[apps/api-server/src/routes/operator/membership.routes.ts:21-28](apps/api-server/src/routes/operator/membership.routes.ts#L21-L28):

```ts
router.use(requireRole([
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
  'kpa-society:admin', 'kpa-society:operator',
]));
router.use(injectServiceScope);
```

**확인된 사실**

- `platform:admin` / `platform:super_admin` 보유 사용자는 `isPlatformAdmin = true` 로 설정.
- `serviceKeys = []`, `rolePrefixes = []` 가 되어 §2.3 의 분기에서 필터가 비활성.

---

### 2.5 화면 진입이 가능한 사용자 — Frontend Guard

[services/web-neture/src/components/auth/RoleGuard.tsx:152-162](services/web-neture/src/components/auth/RoleGuard.tsx#L152-L162):

```tsx
export function AdminRoute({ children, fallback = '/login' }) {
  return (
    <RouteGuard
      allowedRoles={ADMIN_ROLES}        // ['neture:admin', 'platform:super_admin']
      requireMembership="neture"
      fallback={fallback}
    >
      {children}
    </RouteGuard>
  );
}
```

[services/web-neture/src/lib/role-constants.ts:35](services/web-neture/src/lib/role-constants.ts#L35):

```ts
export const ADMIN_ROLES: string[] = [NETURE_ROLES.ADMIN, NETURE_ROLES.PLATFORM_SUPER_ADMIN];
```

**확인된 사실**

- `/admin/users` 진입 가능: `neture:admin` 또는 `platform:super_admin` (둘 다 Neture 멤버십 active 필요)
- `/operator/users` 진입 가능: `neture:operator` (Neture 멤버십 active 필요)
- 따라서 **현재 leak 의 직접 대상은 `platform:super_admin` 으로 `/admin/users` 접근하는 운영자**다.
- `neture:admin` 으로 접근 시는 `scope.serviceKeys = ['neture']` 가 되어 정상 필터 적용 — leak 없음.

---

### 2.6 탭 카운트 (전체 / 공급자 / 파트너 / 셀러 / 가입 신청)

[services/web-neture/src/pages/operator/UsersManagementPage.tsx:264-291](services/web-neture/src/pages/operator/UsersManagementPage.tsx#L264-L291):

```tsx
const fetchStats = useCallback(async () => {
  const { data } = await api.get('/operator/members/stats');
  const byStatus = data.statistics?.byStatus || [];
  const getCount = (s: string) => byStatus.find((b: any) => b.status === s)?.count || 0;

  const allData = (await api.get('/operator/members?limit=1000')).data;
  const allUsers: UserData[] = allData.users || [];

  setStats({
    total:         data.statistics?.total || 0,
    active:        getCount('active') + getCount('approved'),
    pending:       getCount('pending'),
    rejected:      getCount('rejected'),
    supplierCount: allUsers.filter(u => supplierRoles.includes(getPrimaryRole(u))).length,
    partnerCount:  allUsers.filter(u => partnerRoles.includes(getPrimaryRole(u))).length,
    sellerCount:   allUsers.filter(u => sellerRoles.includes(getPrimaryRole(u))).length,
  });
}, []);
```

[apps/api-server/src/controllers/operator/MembershipConsoleController.ts:1150-1184](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L1150-L1184) (`getStats`):

```ts
const serviceFilter = scope.isPlatformAdmin
  ? ''
  : `WHERE sm.service_key = ANY($1)`;
const params = scope.isPlatformAdmin ? [] : [scope.serviceKeys];

const rows = await AppDataSource.query(
  `SELECT sm.status, COUNT(*)::int AS count
   FROM service_memberships sm
   ${serviceFilter}
   GROUP BY sm.status`,
  params
);

const total = rows.reduce((sum, r) => sum + (r.count || 0), 0);
```

**카운트 산출 기준 정리**

| 탭 | 소스 | Scope (platform admin 케이스) |
|----|------|------------------------------|
| **전체** | `/operator/members/stats` → `service_memberships` 전체 row 수 합산 | **전 서비스 멤버십 row 합산** (neture + kpa + glycopharm + cosmetics) |
| **활성/대기/거부** | 동일 stats API | 동일 — **전 서비스** |
| **공급자/파트너/셀러** | `/operator/members?limit=1000` 후 클라이언트 사이드에서 `getPrimaryRole(u)` 일치 필터 | 최대 1000명 cross-service 사용자 대상으로 primary role 매칭 |
| **가입 신청** | `getCount('pending')` (stats API) | **전 서비스** pending 멤버십 row 수 |

**`getPrimaryRole` 동작** ([UsersManagementPage.tsx:102-107](services/web-neture/src/pages/operator/UsersManagementPage.tsx#L102-L107)):

```tsx
function getPrimaryRole(u: UserData): string {
  const netureMembership = u.memberships?.find(m => m.serviceKey === 'neture');
  if (netureMembership?.role) return NETURE_ROLE_DISPLAY[netureMembership.role] || netureMembership.role;
  const roles = u.roles || (u.role ? [u.role] : []);
  return roles[0] || 'user';
}
```

- Neture 멤버십이 있으면 그 role 사용 → tab 매칭은 Neture 기준으로 동작
- Neture 멤버십이 없으면 `u.roles[0]` 으로 fallback → KPA / GlycoPharm 등의 prefix role 이 들어올 수 있음 → **tab 카운트가 cross-service 사용자도 일부 포함**

**판정**

- "전체" 카운트는 **service_memberships row count** (사용자 수가 아니라 멤버십 수). neture-only 사용자는 1, 다중 멤버십 보유자는 N 으로 계산됨 → platform admin 케이스에서 의미적 부정확.
- "공급자/파트너/셀러" 는 list API 결과에 의존 → §2.3 leak 영향 그대로 받음.
- "가입 신청" 도 동일 — stats API 가 cross-service pending 멤버십을 합산.

---

### 2.7 화면이 표시하는 17명의 사용자 — 추정 분포

> **본 조사는 read-only 이며, 운영 DB 에 직접 쿼리를 실행하지 않았다.** 아래는 §2.3 의 코드 경로로부터 **추정한 분포**이며, 실제 17명의 service_memberships / role_assignments 상태는 후속 검증(별도 read-only SQL 검증) 에서 확정한다.

**추정 근거**

`platform:super_admin` 으로 `/admin/users` 접근 시 backend SQL 은:

```sql
SELECT u.id, u.email, ...
FROM users u
-- WHERE clause는 search/status가 없으면 비어 있음
ORDER BY u."createdAt" DESC
LIMIT 20 OFFSET 0
```

즉 **모든 `users` row 를 정렬하여 페이지네이션**. service_memberships 의 존재 여부조차 강제하지 않는다.

**추정 결과**

- platform 가입자, KPA-society 가입자, GlycoPharm 가입자, K-Cosmetics 가입자, Neture 가입자 — **모두 등장 가능**
- 17명 = 현재 `users` 테이블 첫 페이지 20명 한도 내의 row (status 등 필터에 따라 그 이하).

**검증 필요**

후속 단계에서 다음을 read-only 로 확정:

```sql
-- 17명 각각의 멤버십 / 역할 상태
SELECT u.id, u.email,
       array_agg(DISTINCT sm.service_key) AS service_keys,
       array_agg(DISTINCT ra.role) FILTER (WHERE ra.is_active) AS active_roles
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra    ON ra.user_id = u.id AND ra.is_active = true
GROUP BY u.id, u.email
ORDER BY u."createdAt" DESC
LIMIT 17;
```

> CLAUDE.md §0 에 따라 read-only SELECT 는 Claude Code 직접 수행 가능 — 사용자 승인 후 별도 단계에서 실행.

---

### 2.8 `/admin/users` 와 `/operator/users` 동작 차이

| 항목 | `/admin/users` | `/operator/users` |
|------|----------------|-------------------|
| 라우트 가드 | `AdminRoute` (`neture:admin` / `platform:super_admin`) | `OperatorRoute` (`neture:operator`) |
| 진입 가능 role | `platform:super_admin` 포함 | platform admin 미포함 (`OperatorRoute` redirectMap 으로 `/admin` 이동) |
| 렌더 컴포넌트 | `UsersManagementPage` | `UsersManagementPage` |
| API 호출 | `/operator/members` | `/operator/members` |
| Service scope 필터 | 호출자가 `platform:super_admin` 이면 **무필터** | 호출자가 `neture:operator` 이면 `service_key='neture'` 강제 |

**판정**

- 컴포넌트·API 가 동일 → 차이는 *누가 접근하는가* 에서만 발생.
- `/operator/users` 는 `neture:operator` 만 접근 가능하므로 항상 Neture-scoped (leak 없음).
- `/admin/users` 는 `platform:super_admin` 도 접근 가능 → **leak 의 단일 진입점**.

---

## 3. 문제 확정

### 3.1 핵심 문제

**Neture 관리자 회원관리(`/admin/users`)는 페이지 의도(Neture 회원 관리)와 실제 동작 사이에 불일치가 있다.**

- 의도: Neture 서비스 회원 관리
- 실제: 호출자가 `platform:super_admin` 일 때 **모든 서비스의 사용자**(neture + kpa + glycopharm + cosmetics + platform-only)를 cross-service 로 표시.

### 3.2 직접 원인

**Frontend 가 `serviceKey=neture` 쿼리 파라미터를 전달하지 않는다.**

- Backend `MembershipConsoleController.getMembers` 는 platform admin 의 경우 **명시적 `serviceKey` 파라미터**가 있을 때만 필터를 적용한다 (§2.3).
- Frontend `UsersManagementPage` 는 이 파라미터를 전혀 전달하지 않는다 (§2.2).
- 결과: platform admin 호출 시 `WHERE` 절이 사실상 비어 있다.

### 3.3 부수 문제

- "전체" 카운트가 **사용자 수가 아니라 service_memberships row 수**다 (§2.6). neture-only 환경에서는 1:1 이지만, cross-service 케이스에서는 사용자 1명이 N 개 멤버십으로 가중 계산됨.
- "공급자/파트너/셀러" 카운트는 클라이언트 사이드 1000건 fetch + primary role 매칭 → API leak 영향 그대로 받음 + `u.roles[0]` fallback 으로 KPA/GlycoPharm 의 unprefixed 역할(`supplier` 등)과 충돌 가능.
- `/admin/users` 와 `/operator/users` 가 동일 컴포넌트인 점은 *나쁜 것은 아니지만*, 두 화면의 의미적 정체성을 명확히 분리할지 통합할지 결정이 필요.

### 3.4 정책 위반 여부

| 정책 | 위반 여부 | 비고 |
|------|----------|------|
| CLAUDE.md §7 Boundary Policy — Domain Primary Boundary 필터 필수 | **위반 가능성** | 백엔드는 platform admin 분기에서 boundary 우회를 *명시적으로 허용*하고 있다. 이것이 정책 예외인지 잘못된 우회인지 확정 필요. |
| F11 User/Operator Freeze — Operator = membership 기반 | 부분 위반 | `getPrimaryRole` fallback 에서 `u.roles[0]` 사용 — 표시 전용이지만 user.role 직접 참조. |
| F11 — users · service_memberships · role_assignments 3-table | 준수 | API 와 통계 모두 3-table 정합. |

---

## 4. Neture 관리자 회원관리의 정식 조회 범위 (제안)

본 조사 결과를 바탕으로 다음 정의를 **제안**한다. (사용자 확정 필요 — §6 참조)

### 4.1 원칙

| 항목 | 정의 |
|------|------|
| **목록 조회 기준** | `service_memberships.service_key = 'neture'` 보유 사용자만 |
| **상태 기준** | `service_memberships.status` (sm SSOT) — `users.status` 아님 |
| **타 서비스 단독 회원** | KPA / GlycoPharm / K-Cosmetics 단독 회원은 **제외** |
| **platform 단독 계정** | 별도 화면(예: `/admin/platform-accounts`)에서 관리. Neture 회원 목록에는 섞지 않음 |
| **Neture + 타 서비스 다중 멤버십** | Neture 멤버십이 있으면 표시. 다른 서비스 멤버십은 "서비스" 컬럼에 부가 정보로 표시 (현재 동작 유지) |

### 4.2 호출자 별 동작

| 호출자 role | 표시 범위 |
|-------------|----------|
| `neture:admin` | Neture 회원 (현재 동작 — 변경 없음) |
| `neture:operator` | Neture 회원 (현재 동작 — 변경 없음) |
| `platform:super_admin` | **Neture 회원만** (현재 leak 수정 대상) |

### 4.3 탭 카운트

| 탭 | 정의 (제안) |
|----|------------|
| 전체 | Neture 멤버십 보유 사용자 수 (멤버십 row 합산 아님 — distinct user count) |
| 공급자 | Neture 멤버십 role = `supplier` 또는 `neture:supplier` |
| 파트너 | Neture 멤버십 role = `partner` 또는 `neture:partner` |
| 셀러 | Neture 멤버십 role = `seller` 또는 `neture:seller` |
| 가입 신청 | Neture 멤버십 status = `pending` 또는 `rejected` 의 row |

→ 모두 backend SQL 기반 (현재의 클라이언트 사이드 1000건 fetch 제거 권장).

---

## 5. 수정 후보 (제안 — WO 단계에서 확정)

> **본 IR 은 코드를 수정하지 않는다.** 아래는 수정 범위 *후보* 이며 실제 적용 / 범위 / 순서는 사용자 확정 후 WO 에서 진행.

### 5.1 최소 수정 (Minimal Patch)

**Frontend 단일 수정** — 가장 작은 범위, 즉시 효과.

| 파일 | 변경 |
|------|------|
| [services/web-neture/src/pages/operator/UsersManagementPage.tsx](services/web-neture/src/pages/operator/UsersManagementPage.tsx) | `fetchUsers` 와 `fetchStats` 에서 `serviceKey=neture` 쿼리 파라미터 강제 전달 |

**효과**

- `platform:super_admin` 호출자에 대해 backend `MembershipConsoleController.getMembers` 의 platform admin 분기에서 명시적 `serviceKey` 가 들어가 `sm_f.service_key = 'neture'` 필터가 활성화됨 (§2.3 line 92-95).
- `neture:admin` / `neture:operator` 호출자는 영향 없음 (`!isPlatformAdmin` 분기는 이미 `scope.serviceKeys = ['neture']` 적용 중).
- `getStats` 도 동일 처리 필요 — 단 백엔드 `getStats` 는 현재 `serviceKey` query 를 받지 않음 → §5.2 동반 필요.

### 5.2 중간 수정 (Recommended)

§5.1 + Backend `getStats` 도 `serviceKey` 쿼리 수용.

| 파일 | 변경 |
|------|------|
| [apps/api-server/src/controllers/operator/MembershipConsoleController.ts](apps/api-server/src/controllers/operator/MembershipConsoleController.ts) | `getStats` 에 `serviceKey` query 수용 분기 추가 (platform admin 전용) |
| UsersManagementPage.tsx | 위 + 클라이언트 사이드 1000건 fetch 로직 제거하고 backend stats 기반으로 공급자/파트너/셀러 카운트 분리 |

**효과**

- "전체"/"가입 신청" 등 카운트가 Neture-scoped 로 정확히 산출됨.
- 클라이언트 사이드 1000건 fetch 제거 → 성능 + 정합성 동시 개선.
- 단, backend 가 role 별 (supplier/partner/seller) 카운트 endpoint 를 추가 제공해야 함 → 신규 endpoint 또는 stats API 확장 필요.

### 5.3 구조 수정 (Long Term)

- `/admin/users` 와 `/operator/users` 의 의미적 분리:
  - `/admin/users` = "Neture 관리자 회원관리" (정책·승인·역할 관리 중심)
  - `/operator/users` = "Neture 운영자 회원관리" (일상 운영 중심)
  - 혹은 통합하여 단일 화면 + 권한 별 액션 표시.
- `/admin/platform-accounts` 신규 — platform-level 계정(super admin 등) 관리 전용.
- 본 항목은 **본 IR 의 범위 밖**. 별도 설계 IR 필요.

---

## 6. 사용자 확정 필요 항목

본 IR 만으로 WO 단계로 넘어가기 전 다음을 확정해야 한다.

| # | 항목 | 본 IR 의 권고 |
|---|------|--------------|
| 1 | `/admin/users` 의 정식 조회 범위 = `service_memberships.service_key='neture'` 만 | **Yes** (§4.1) |
| 2 | `platform:super_admin` 도 동일 범위 적용 (예외 표시 안 함) | **Yes** (§4.2) |
| 3 | platform 단독 계정은 별도 화면으로 분리 | **권고** — 본 IR 의 범위 밖, 후속 IR 필요 |
| 4 | "전체" 카운트를 멤버십 row 수 → distinct user 수로 변경 | **Yes** — 단 backend stats 변경 동반 필요 (§5.2) |
| 5 | 공급자/파트너/셀러 카운트 산출을 클라이언트 → backend 로 이전 | **권고** — 정합성·성능 개선. 단 신규 endpoint 필요 |
| 6 | 수정 범위 — §5.1 (최소) / §5.2 (중간) / §5.3 (구조) 중 어디까지 | **사용자 결정** |
| 7 | `/admin/users` 와 `/operator/users` 의 동일 컴포넌트 유지 / 분리 | **사용자 결정** — 본 IR 의 범위 밖 |
| 8 | platform admin 분기 (§2.3 의 `!scope.isPlatformAdmin`) 정책 위치 — Boundary Policy 의 정당한 예외인지, 잘못된 우회인지 | **사용자 / 아키텍처 확정** — F6 Boundary Policy 와 정합 검토 필요 |

---

## 7. 후속 작업 (Suggested Next Steps)

본 IR 의 결과에 따라 다음 단계가 가능하다 (사용자 확정 후 진행).

| 단계 | 산출물 |
|------|--------|
| **A. 실제 17명 상태 확정** | read-only SQL 로 §2.7 검증. 별도 IR 또는 본 IR 의 §2.7 채움 |
| **B. WO — 최소 수정** | `WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1` (§5.1) |
| **C. WO — 중간 수정** | `WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1` (§5.2) — B 의 확장 |
| **D. IR — 구조 분리** | `IR-O4O-PLATFORM-ACCOUNTS-SEPARATION-V1` (§5.3) — 별도 화면 분리 설계 |
| **E. Boundary Policy 정합 검토** | `IR-O4O-BOUNDARY-POLICY-PLATFORM-ADMIN-EXEMPTION-V1` — §6 항목 8 확정 |

---

## 8. 수정 필요 파일 (요약)

§5.1 (최소 수정 채택 시):

- [services/web-neture/src/pages/operator/UsersManagementPage.tsx](services/web-neture/src/pages/operator/UsersManagementPage.tsx) — `fetchUsers` / `fetchStats` 에 `serviceKey=neture` 강제 전달

§5.2 (중간 수정 채택 시):

- 위 +
- [apps/api-server/src/controllers/operator/MembershipConsoleController.ts](apps/api-server/src/controllers/operator/MembershipConsoleController.ts) — `getStats` 에 `serviceKey` query 수용

§5.3 (구조 수정 채택 시) — 본 IR 의 범위 밖.

---

*Version: V1 (2026-05-23)*
*Status: Investigation Report — 사용자 확정 대기*
*Next: 사용자 검토 → §6 항목 확정 → WO 단계 진입 또는 후속 IR 작성*
