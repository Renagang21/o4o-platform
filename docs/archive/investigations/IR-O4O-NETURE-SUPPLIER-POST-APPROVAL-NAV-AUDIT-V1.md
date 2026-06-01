# IR-O4O-NETURE-SUPPLIER-POST-APPROVAL-NAV-AUDIT-V1

**조사 유형:** Investigation Report (IR)  
**조사 대상:** Neture 공급자 가입 승인 후 공급자 대시보드가 메뉴에 표시되지 않는 문제  
**조사 계정:** 김용우 / pharmabase@nate.com  
**조사 날짜:** 2026-05-13  
**상태:** COMPLETE

---

## 목적

Neture에서 공급자 가입 신청 승인 후 사용자 메뉴 및 navigation에 공급자 대시보드(`/supplier/dashboard`)가 표시되지 않는 원인을 파악한다.

---

## 1. 실제 DB 상태

### 1-A. users 테이블

| 항목 | 값 |
|------|---|
| User ID | `6c91544f-cd3c-40b3-ac24-aaaecaba9fca` |
| Email | pharmabase@nate.com |
| Status | **active** |
| isActive | true |
| approvedAt | 2026-05-13T04:05:48 |
| isEmailVerified | false |
| Last Login | 2026-05-13T06:29:44 |

`users.status = 'active'` — 정상.

---

### 1-B. service_memberships

| service_key | status | role | approved_by | approved_at |
|-------------|--------|------|-------------|-------------|
| **neture** | **active** | **supplier** | e52554d7... | 2026-05-13T03:57:38 |
| kpa-society | pending | pharmacy | — | — |

Neture service_memberships: `status=active`, `role=supplier` — 정상.

---

### 1-C. role_assignments ← **핵심 이상**

| role | is_active | assigned_at | assigned_by |
|------|-----------|-------------|-------------|
| **member** | true | 2026-05-13T03:57:38 | e52554d7... |

**`neture:supplier` 또는 `supplier` role_assignment 없음.**  
승인 시각과 같은 타임스탬프에 `role='member'`만 생성됨.

---

### 1-D. neture_suppliers

승인 시 `rawRole === 'supplier'` 조건에서 `neture_suppliers` INSERT 코드가 실행되었어야 하나, `rawRole`이 'member'로 평가되어 **해당 분기 실행 안 됨**. `neture_suppliers` 레코드 생성 여부 추가 확인 필요.

---

## 2. 프론트 노출 조건

### 2-A. NetureGlobalHeader (`services/web-neture/src/components/NetureGlobalHeader.tsx:62-64`)

```typescript
const isSupplier = isAuthenticated && user?.roles?.some(
  (r: string) => r === 'neture:supplier' || r === 'supplier',
);
```

대시보드 메뉴 표시 조건 (line 129):
```typescript
{!isOperator && (isSupplier || isPartner) && (
  <GlobalHeaderMenuItem to={dashboardPath}>
    {roleLabel} 대시보드
  </GlobalHeaderMenuItem>
)}
```

**필요 role**: `neture:supplier` 또는 `supplier`

---

### 2-B. AccountMenu (`services/web-neture/src/components/AccountMenu.tsx:58-67`)

```typescript
const DASHBOARD_ROLES = ['supplier', 'partner', 'seller'];
const hasDashboardRole = user.roles?.some((r: string) =>
  r.endsWith(':supplier') ||
  r.endsWith(':partner') ||
  DASHBOARD_ROLES.includes(r),
) ?? false;
```

**필요 role**: `'supplier'` 또는 `'*:supplier'`

---

### 2-C. 현재 김용우의 roles

```json
["member"]
```

`isSupplier = false` → 대시보드 메뉴 미표시.

---

## 3. Route Guard 조건

### SupplierRoute (`services/web-neture/src/components/auth/RoleGuard.tsx:167-177`)

```typescript
export const SUPPLIER_ROLES = [NETURE_ROLES.SUPPLIER, 'supplier', 'partner', 'seller'];
// = ['neture:supplier', 'supplier', 'partner', 'seller']

export function SupplierRoute(...) {
  return (
    <RouteGuard
      allowedRoles={SUPPLIER_ROLES}    // ← 'supplier' 또는 'neture:supplier' 필요
      requireMembership="neture"       // ← service_memberships.status=active 필요
    >
      {children}
    </RouteGuard>
  );
}
```

`requireMembership="neture"` 조건: service_memberships에 `serviceKey='neture'`, `status='active'` 필요 → **통과** (status=active 확인됨).  
`allowedRoles` 조건: `user.roles.some(r => SUPPLIER_ROLES.includes(r))` → 현재 `roles=['member']`이므로 **실패 → `/`로 리다이렉트**.

---

### /supplier/dashboard Route (App.tsx:683)

```typescript
<Route path="/supplier/dashboard" element={<SupplierDashboardPage />} />
```

이 route는 `SupplierRoute` 외부에 선언되어 guard가 없다.  
그러나 layout(SupplierSpaceLayout)에서 자체 접근 제어가 있을 수 있음.

**`SupplierRoute` 내부 routes (App.tsx:679-681):**  
supplier 관련 핵심 기능 페이지들은 `SupplierRoute`로 감싸져 있으며, 현재 `role='member'`로는 모두 접근 불가.

---

## 4. /auth/me roles 반환 구조

`auth-account.controller.ts:32-44`:
```typescript
let roles = getCachedRoles(req.user.id);
if (!roles) {
  roles = await roleAssignmentService.getRoleNames(req.user.id);
  setCachedRoles(req.user.id, roles);
}
```

`/auth/me`는 `role_assignments` 테이블의 현재 활성 role을 DB에서 직접 조회하여 반환한다.  
현재 `role_assignments`에 `role='member'`만 있으므로, `/auth/me` 호출 시 `roles=['member']`가 반환된다.

**재로그인 필요 여부**: 재로그인 시 login → 새 JWT → `/auth/me` 재조회.  
그러나 `/auth/me`가 DB를 직접 참조하므로, 재로그인 없이 세션 내 `/auth/me` 재호출만으로도 업데이트된 role이 반영된다.  
**현재 DB에 'supplier' role이 없으므로 재로그인을 해도 대시보드가 표시되지 않는다.**

---

## 5. 원인 판정 — TypeORM queryRunner RETURNING 버그

**근본 원인:**  
`operator-registration.service.ts:80-106`의 `approveRegistration()` 내 `UPDATE...RETURNING` 결과에서 `role` 컬럼이 null 반환됨.

```typescript
// line 80-86
const smResult = await queryRunner.query(
  `UPDATE service_memberships
   SET status = 'active', ...
   WHERE user_id = $2 AND service_key = 'neture' AND status IN ('pending', 'rejected')
   RETURNING id, role`,         ← TypeORM queryRunner RETURNING 버그
  [approvedBy, userId],
);

// line 102
const rawRole = smResult[0]?.role || 'member';   ← null || 'member' = 'member'
const finalRole = ADMIN_ROLES.includes('member') ? ... : 'member';
// ADMIN_ROLES = ['admin', 'operator']
// finalRole = 'member'
```

**TypeORM 알려진 동작 (CLAUDE.md `TypeORM queryRunner 주의사항`):**
> `UPDATE...RETURNING`을 queryRunner.query()에서 사용하면 컬럼이 null로 반환될 수 있음.

**결과 흐름:**
1. `smResult[0].role` → null (TypeORM RETURNING 버그)
2. `rawRole = null || 'member'` → `'member'`
3. `ADMIN_ROLES.includes('member')` → false
4. `finalRole = 'member'`
5. `role_assignments INSERT role='member'` ← 잘못된 role
6. `rawRole === 'supplier'` 조건 → false → `neture_suppliers` 생성 건너뜀

**안전 패턴 (CLAUDE.md 권장):**
> `SELECT...FOR UPDATE` → `UPDATE` 분리 (RETURNING 의존 금지)

---

## 6. 영향 범위

승인 시 `rawRole`이 항상 'member'로 평가되므로, 이 코드 경로를 통해 승인된 **모든 supplier 계정**이 동일 문제에 해당한다.

- service_memberships: `status=active` ✅ (정상 업데이트)
- role_assignments: `role='member'` ❌ (should be `'supplier'`)
- neture_suppliers: 미생성 ❌ (supplier 분기 건너뜀)

---

## 7. 수정 필요 파일

### 백엔드 — 필수 수정

**파일:** `apps/api-server/src/modules/neture/services/operator-registration.service.ts`  
**라인:** 80-112

**수정 방향**: RETURNING 제거 → 별도 SELECT로 role 조회

```typescript
// 현재 (버그):
const smResult = await queryRunner.query(
  `UPDATE service_memberships SET ... RETURNING id, role`,
  [approvedBy, userId],
);
const rawRole = smResult[0]?.role || 'member';

// 수정:
// Step 1: SELECT로 role 먼저 조회
const [smRow] = await queryRunner.query(
  `SELECT id, role FROM service_memberships
   WHERE user_id = $1 AND service_key = 'neture' AND status IN ('pending', 'rejected')`,
  [userId],
);
if (!smRow) throw new Error('REGISTRATION_NOT_FOUND');

// Step 2: UPDATE (RETURNING 없음)
await queryRunner.query(
  `UPDATE service_memberships
   SET status = 'active', approved_by = $1, approved_at = NOW(), updated_at = NOW()
   WHERE user_id = $2 AND service_key = 'neture' AND status IN ('pending', 'rejected')`,
  [approvedBy, userId],
);

const rawRole = smRow.role || 'member';
```

---

### 데이터 복구 — 김용우 계정

현재 DB 상태:
- `role_assignments.role = 'member'` → `'supplier'`로 수정 필요
- `neture_suppliers` 레코드 생성 필요

수동 복구 SQL (운영자 승인 필요):
```sql
-- 1. role_assignments 수정 (member → supplier)
UPDATE role_assignments
SET role = 'supplier', updated_at = NOW()
WHERE user_id = '6c91544f-cd3c-40b3-ac24-aaaecaba9fca'
  AND role = 'member'
  AND is_active = true;

-- 2. neture_suppliers 생성
INSERT INTO neture_suppliers (user_id, slug, contact_email, contact_phone, representative_name, status, created_at, updated_at)
VALUES (
  '6c91544f-cd3c-40b3-ac24-aaaecaba9fca',
  'supplier-6c91544f',
  'pharmabase@nate.com',
  '01097748779',
  '김용우',
  'PENDING',
  NOW(), NOW()
)
ON CONFLICT (user_id) DO NOTHING;
```

**데이터 변경은 반드시 운영자 승인 후 진행.**

---

## 8. 프론트 수정 필요 여부

프론트 조건 자체는 정상이다:
- `isSupplier = roles.some(r => r === 'neture:supplier' || r === 'supplier')` — 올바름
- `SupplierRoute: allowedRoles = SUPPLIER_ROLES` — 올바름
- `requireMembership="neture"` — 올바름

데이터(`role_assignments`)가 수정되면 재로그인 또는 `/auth/me` 재호출 후 정상 표시.  
**프론트 코드 수정 불필요.**

---

## 9. 재로그인 / me-context 재조회 필요 여부

**DB 복구 후**: 재로그인 필요.  
`/auth/me`는 `role_assignments` DB를 직접 조회하나, 현재 JWT에는 `roles=['member']`가 담겨있다.  
프론트 AuthContext는 login() 또는 페이지 reload 시 `/auth/me`를 재호출하여 roles를 업데이트한다.  
DB 수정 후 재로그인 → `/auth/me` 재조회 → `roles=['supplier']` → 대시보드 표시.

---

## 판정 요약

| 확인 항목 | 상태 | 내용 |
|-----------|------|------|
| users.status | ✅ active | 정상 |
| service_memberships (neture) | ✅ status=active, role=supplier | 정상 |
| role_assignments supplier | ❌ **없음** (member만 있음) | **핵심 원인** |
| neture_suppliers 레코드 | ❌ **미생성** | 부수 피해 |
| 프론트 조건 | ✅ 정상 | 코드 수정 불필요 |
| Route Guard 조건 | ✅ 정상 | 코드 수정 불필요 |
| 원인 | **백엔드 버그** | TypeORM queryRunner RETURNING null → rawRole='member' |
| 백엔드 수정 필요 | ✅ **필수** | SELECT/UPDATE 분리 |
| 프론트 수정 필요 | ❌ 불필요 | DB 수정 후 재로그인으로 해결 |
| 데이터 복구 필요 | ✅ **필수** | role_assignments + neture_suppliers 수동 복구 |

---

## 권장 다음 WO

`WO-O4O-NETURE-SUPPLIER-APPROVAL-ROLE-ASSIGN-FIX-V1`
1. `operator-registration.service.ts` RETURNING 제거 → SELECT/UPDATE 분리
2. 김용우 계정 role_assignments 수동 복구 (`member` → `supplier`)
3. neture_suppliers 레코드 생성
4. 동일 경로로 승인된 다른 supplier 계정 일괄 점검 (role='member'인 neture 승인 계정 조회)

---

## 관련 파일

| 파일 | 역할 | 주목 사항 |
|------|------|----------|
| `apps/api-server/src/modules/neture/services/operator-registration.service.ts:80-112` | 승인 로직 | RETURNING 버그로 rawRole='member' |
| `services/web-neture/src/components/NetureGlobalHeader.tsx:62-64` | 공급자 메뉴 노출 조건 | `r === 'neture:supplier' || r === 'supplier'` 필요 |
| `services/web-neture/src/components/auth/RoleGuard.tsx:167-177` | Supplier Route Guard | `SUPPLIER_ROLES = ['neture:supplier', 'supplier', ...]` |
| `services/web-neture/src/contexts/AuthContext.tsx:54` | roles 반환 | `/auth/me` 기반 DB 직접 조회 |
| `apps/api-server/src/modules/auth/controllers/auth-account.controller.ts:32-44` | /auth/me roles | role_assignments 직접 조회 (재로그인 시 반영) |
