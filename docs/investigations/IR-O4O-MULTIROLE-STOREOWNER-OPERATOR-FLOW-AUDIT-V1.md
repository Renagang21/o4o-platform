# IR-O4O-MULTIROLE-STOREOWNER-OPERATOR-FLOW-AUDIT-V1

> **조사 목적**: KPA-Society에서 동일 User가 kpa:operator/kpa:admin과 kpa:store_owner 역할을 동시에 보유할 수 있는지, 전환/온보딩 프로세스가 존재하는지 코드 기준으로 확인한다.
>
> **조사 날짜**: 2026-05-15
> **조사 범위**: 코드 읽기 전용. 수정 없음.

---

## 1. 현재 구현 상태 판정

| 항목 | 판정 |
|------|------|
| kpa:operator + kpa:store_owner 동시 보유 | **기술적으로 가능** (DB 제약 없음) |
| 동시 보유를 위한 공식 UI/API | **없음** |
| 동시 보유 시 Post-Login Redirect | **미정의** (운영자 early return으로 store redirect 미발생) |
| 동시 보유 시 메뉴 노출 | **부분** (RoleGuard는 ANY 로직 지원, 명시적 UI 없음) |
| operator/admin의 store 온보딩 경로 | **없음** |
| 중복 이메일 가입 차단 | **구현됨** (kpa_members 기준) |
| inactive/withdrawn 다중 역할 영향 | **MembershipGate 차단** (role 무관) |

---

## 2. 역할 정의 현황

### 2-1. 공식 KpaRole 타입

**파일**: `apps/api-server/src/types/roles.ts`

```typescript
export type KpaRole =
  | 'kpa:admin'        // KPA 관리자
  | 'kpa:operator'     // KPA 운영자
  | 'kpa:store_owner'  // KPA 약국 경영자
  | 'kpa:pharmacist'   // 약사 정회원
  | 'kpa:student';     // 학생 준회원
```

`kpa:store_owner`는 공식 타입으로 정의되어 있으나 **RBAC 카탈로그(`docs/rbac/RBAC-ROLE-CATALOG-V1.md`)에는 누락**되어 있다.

### 2-2. kpa_members.role vs role_assignments.role

| 소스 | 값 범위 | 용도 |
|------|---------|------|
| `kpa_members.role` | `member \| operator \| admin` | KPA 내부 운영 역할 |
| `role_assignments.role` | `kpa:operator`, `kpa:admin`, `kpa:store_owner`, ... | 플랫폼 RBAC 소스 |

두 소스는 독립적으로 관리되며, `MembershipApprovalService`에서 승인 시 `kpa_members.role` 값을 `role_assignments`에 복제한다.
`kpa_members.role`에는 `store_owner`가 없으므로, `kpa:store_owner`는 **오직 `role_assignments`에만 존재**한다.

---

## 3. 존재하는 프로세스

### 3-1. kpa:store_owner 역할 부여 경로 (2가지)

#### 경로 A — 약국 개설 신청 승인

**파일**: `apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts:225-231`

```typescript
// 5. WO-O4O-STORE-OWNER-ROLE-BASED-ACCESS-UNIFICATION-V1: kpa:store_owner 역할 부여
const roleAssignmentService = new RoleAssignmentService();
await roleAssignmentService.assignRole({
  userId: request.user_id,
  role: 'kpa:store_owner',
  assignedBy: user.id,
});
```

- **트리거**: `PATCH /api/v1/kpa/pharmacy-requests/:id/approve` (kpa:operator 권한 필요)
- **선행 조건**: 해당 user가 약국 개설 신청(`pharmacy_requests`)을 제출한 상태
- **부작용**: organization 생성 + organization_members(owner) 추가도 함께 처리됨

#### 경로 B — 백필 마이그레이션

**파일**: `apps/api-server/src/database/migrations/20260900000000-BackfillStoreOwnerRoles.ts`

```sql
INSERT INTO role_assignments (..., 'kpa:store_owner', ...)
SELECT DISTINCT sub.user_id ...
FROM organization_members om
WHERE om.role = 'owner' AND om.left_at IS NULL
UNION
SELECT kpa_pharmacist_profiles.user_id ...
WHERE activity_type = 'pharmacy_owner'
ON CONFLICT DO NOTHING;
```

- **트리거**: 마이그레이션 실행 시 1회
- **대상**: 이미 organization owner이거나 activity_type='pharmacy_owner'인 사용자 전체

---

## 4. 존재하지 않는 프로세스

### 4-1. operator/admin 계정의 별도 store 온보딩 경로

기존 operator/admin 계정이 재가입 없이 약국 경영자로 전환하는 UI, API, 운영자 기능이 **존재하지 않는다**.

- operator 계정이 약국 개설 신청을 하려면 일반 회원(kpa_members)으로 가입되어 있어야 하며, pharmacy_request를 신청한 후 다른 operator가 승인해야 한다.
- 자기 자신을 승인하는 셀프 승인은 시스템적으로 막혀 있지 않으나, 운영 정책상 금지 대상이다.

### 4-2. 동시 보유 계정의 명시적 UX

operator + store_owner를 동시에 보유한 계정을 위한 전용 대시보드, 역할 전환 스위처, 통합 메뉴가 없다.

### 4-3. kpa:store_owner를 getDefaultRouteByRole에 반영

**파일**: `services/web-kpa-society/src/lib/auth-utils.ts`

```typescript
export function getDefaultRouteByRole(userRoles?: string[]): string {
  if (userRoles?.includes('kpa:admin')) return '/admin';
  if (userRoles?.includes('kpa:operator')) return '/operator';
  return '/mypage';  // kpa:store_owner → /mypage로 fallback (의도 불명확)
}
```

`kpa:store_owner`에 대한 명시적 기본 라우트가 없다.

---

## 5. 위험한 흐름

### 5-1. operator + store_owner 동시 보유 시 Post-Login Redirect 미작동

**파일**: `services/web-kpa-society/src/App.tsx:336-345`

```typescript
// 운영자/관리자: redirect 없음 (early return)
const isPrivileged = user.roles?.some((r) =>
  r.includes(':operator') || r.includes(':admin') || r === 'platform:super_admin',
);
if (isPrivileged) { didRedirectRef.current = true; return; }  // ← /store 이동 없음

// 약국 경영자: /store 이동
if (user.isStoreOwner || user.activityType === 'pharmacy_owner') {
  navigate('/store', { replace: true });
}
```

**결과**: `kpa:operator + kpa:store_owner` 동시 보유 시 `isPrivileged=true`로 early return → `/store` redirect가 발생하지 않는다. 사용자는 매장 진입 경로를 수동으로 탐색해야 한다.

### 5-2. DB Constraint 분석 — 동시 보유는 차단되지 않음

**파일**: `apps/api-server/src/modules/auth/entities/RoleAssignment.ts`

```typescript
@Unique('unique_active_role_per_user', ['userId', 'role', 'isActive'])
```

제약 조건: `(user_id, role, is_active)` 조합이 유일해야 함.
**서로 다른 role 값**은 동일 user_id에서 여러 행이 존재 가능하다.

예시 — DB에 공존 가능한 상태:
```
user_id=A, role='kpa:operator',   is_active=true  ← 유효
user_id=A, role='kpa:store_owner', is_active=true  ← 유효 (별도 row)
```

### 5-3. isStoreOwner 판정 vs role_assignments 불일치 위험

**파일**: `apps/api-server/src/routes/kpa/controllers/me-context.controller.ts:43-56`

```sql
CASE WHEN ra.user_id IS NOT NULL THEN true ELSE false END AS is_store_owner
...
AND role IN ('kpa:store_owner','glycopharm:store_owner','cosmetics:store_owner')
```

`isStoreOwner`는 role_assignments 기준으로 판정한다. kpa_pharmacist_profiles.activity_type과 동기화가 깨지면 판정이 달라질 수 있다.

### 5-4. inactive/withdrawn 상태의 다중 역할 계정에 대한 영향

**파일**: `services/web-kpa-society/src/components/auth/MembershipGate.tsx`

```
RoleGuard (role 체크) → MembershipGate (kpa-society membership status 체크)
```

MembershipGate는 **서비스 멤버십 상태**를 검사한다. `service_memberships.status='inactive'`이면 어떤 역할을 보유하고 있더라도 MembershipStatusScreen을 표시하고 진입을 차단한다.

단, `enforceMembership=false`로 RoleGuard를 호출하는 라우트가 있다면 이 차단을 우회한다. 현재 operator/admin 전용 라우트에서 `enforceMembership` 설정을 확인해야 한다.

### 5-5. kpa:operator 권한으로 자기 자신의 pharmacy_request 승인 가능성

약국 개설 신청 승인 API(`/pharmacy-requests/:id/approve`)는 `requireScope('kpa:operator')`만 체크하며 **자기 자신의 신청을 셀프 승인하는 로직을 차단하지 않는다**.

---

## 6. 역할 판정 기준 정리

| 계층 | 기준 소스 | 위치 |
|------|---------|------|
| **JWT payload** | `payload.roles[]` — 로그인 시 role_assignments에서 생성 | `auth-login.service.ts` |
| **requireAuth middleware** | `user.roles = payload.roles` — DB 쿼리 없음 | `auth.middleware.ts` |
| **RoleGuard (프론트)** | `user.roles.some(r => allowedRoles.includes(r))` | `RoleGuard.tsx` |
| **MembershipGate (프론트)** | `user.memberships[].status` — JWT payload 내 | `MembershipGate.tsx` |
| **requireScope (백엔드)** | JWT payload roles 기준 | scope guard |
| **isStoreOwner (API)** | role_assignments JOIN (DB 직접 쿼리) | `me-context.controller.ts` |

**핵심**: 프론트엔드 RoleGuard는 JWT payload 기준 → 로그인 시점의 스냅샷. role_assignments 변경 후 재로그인 전까지 반영 안 됨.

---

## 7. 회원가입 중복 처리

### 7-1. KPA 멤버 가입 (`POST /api/v1/kpa/members`)

**파일**: `apps/api-server/src/routes/kpa/controllers/member.controller.ts:123-130`

```typescript
const existing = await memberRepo.findOne({ where: { user_id: req.user!.id } });
if (existing) {
  res.status(409).json({
    error: { code: 'ALREADY_MEMBER', message: 'Already a member or pending application exists' }
  });
  return;
}
```

- **기준**: `kpa_members.user_id` 기준 중복 체크 (이미 로그인된 상태에서 신청)
- **이메일 중복은 users 테이블에서 차단** (`/auth/register` 레벨)

### 7-2. 약국 개설 신청 (`POST /api/v1/kpa/pharmacy-requests`)

**파일**: `apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts:57-68`

```typescript
const [existingOwner] = await dataSource.query(
  `SELECT 1 FROM organization_members WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL LIMIT 1`,
  [user.id]
);
if (existingOwner) {
  return res.status(409).json({
    error: { code: 'ALREADY_MEMBER', message: '이미 약국 개설자로 승인된 계정입니다.' }
  });
}
```

- 이미 약국 owner인 경우 추가 신청을 차단한다.

---

## 8. 권장 운영 절차 (현재 코드 기준)

### 8-1. operator/admin 계정에 store_owner 역할 추가 시

현재 구현에서 가장 안전한 절차:

1. 별도 계정으로 KPA 일반회원으로 가입 → 약국 신청 → 승인 (권장)
2. 불가피하게 동일 계정에 추가할 경우:
   - DB 직접 조작 또는 관리자 API로 `pharmacy_requests` 레코드 생성 후 다른 operator가 승인
   - 승인 시 organization 생성 + kpa:store_owner role_assignment 자동 부여됨
   - **셀프 승인 금지** (운영 정책)
3. 승인 후 해당 계정은 재로그인 필요 (JWT 갱신)

### 8-2. 동시 보유 계정의 매장 진입

현재 post-login redirect가 `/store`로 이동하지 않으므로, 사용자가 수동으로 `/store` URL 직접 입력 또는 메뉴에서 진입해야 한다.

---

## 9. 개발 필요 항목

### P1 — Post-Login Redirect 개선

**파일**: `services/web-kpa-society/src/App.tsx:PostLoginRedirect()`

```typescript
// 현재: isPrivileged → early return (store redirect 없음)
// 필요: isPrivileged + isStoreOwner → 선택 화면 또는 /operator 기본 + /store 링크 제공
```

operator + store_owner 동시 보유 시 역할 선택 화면 또는 메뉴 내 바로가기가 필요하다.

### P2 — operator/admin의 약국 온보딩 경로

현재 operator는 pharmacy_request 신청 UI가 없거나 진입이 어렵다. operator 대시보드에서 약국 등록 신청이 가능하도록 경로를 개설해야 한다.

### P3 — 셀프 승인 차단

**파일**: `apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts:170`

```typescript
// 추가 필요:
if (request.user_id === user.id) {
  return res.status(403).json({ error: { code: 'SELF_APPROVE_DENIED', message: '자기 신청을 직접 승인할 수 없습니다.' }});
}
```

### P4 — RBAC 카탈로그에 kpa:store_owner 추가

**파일**: `docs/rbac/RBAC-ROLE-CATALOG-V1.md`

카탈로그에 `kpa:store_owner` 역할 추가 및 부여 조건 명시.

### P5 — getDefaultRouteByRole에 kpa:store_owner 반영

**파일**: `services/web-kpa-society/src/lib/auth-utils.ts`

```typescript
if (userRoles?.includes('kpa:store_owner') && !isPrivileged) return '/store';
```

### P6 — operator 라우트에서 enforceMembership 검토

operator/admin 라우트가 `enforceMembership=false`로 설정되어 있는지 확인하고, inactive/withdrawn 계정이 operator 기능에 접근 가능한지 점검.

---

## 10. 후속 WO 필요 여부

| WO | 우선순위 | 내용 |
|----|---------|------|
| WO-O4O-MULTIROLE-POST-LOGIN-REDIRECT-FIX-V1 | P1 | operator+store_owner 동시 보유 계정 redirect 처리 |
| WO-O4O-OPERATOR-PHARMACY-ONBOARDING-PATH-V1 | P2 | operator 계정의 약국 등록 신청 경로 개설 |
| WO-O4O-PHARMACY-REQUEST-SELFAPPROVE-GUARD-V1 | P2 | 셀프 승인 차단 |
| WO-O4O-RBAC-CATALOG-STORE-OWNER-SYNC-V1 | P3 | RBAC 카탈로그 kpa:store_owner 추가 |

---

*조사자: Claude Sonnet 4.6 (AI)*
*기준 브랜치: main @ 2026-05-15*
*Status: 조사 완료. 코드/DB 변경 없음.*
