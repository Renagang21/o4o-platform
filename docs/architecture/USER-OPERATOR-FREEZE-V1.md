# USER-OPERATOR-FREEZE-V1

O4O Platform — User Domain / Operator Structure Freeze Declaration

**Freeze Date:** 2026-03-19
**Status:** FROZEN
**WO:** WO-O4O-OPERATOR-VISIBILITY-UNIFICATION-V1 + WO-O4O-USER-OPERATOR-FREEZE-AND-VALIDATION-V1

---

## 1. Frozen Structure

### 1.1 Tables (SSOT)

| Table | Purpose | Status |
|-------|---------|--------|
| `users` | Identity ONLY (no auth attributes) | FROZEN |
| `service_memberships` | Service 소속 (SSOT) | FROZEN |
| `role_assignments` | 권한 (SSOT) | FROZEN |

### 1.2 Core Rules

```
Operator = service_memberships 존재 (active + is_active)
Role = 권한 판단 전용 (role_assignments)
Platform Admin = admin/super_admin in role_assignments → 모든 서비스 접근
```

---

## 2. Forbidden Patterns

```
❌ user.role 기반 operator 판단
❌ users.service_key 사용
❌ role만으로 operator 판단
❌ 서비스별 예외 로직
❌ membership bypass 로직
❌ 독립 권한 테이블 생성
```

---

## 3. Frontend Guard

### OperatorRoute (각 서비스 RoleGuard.tsx)

```typescript
// Platform admin → 항상 허용
const isAdmin = (user.roles as string[]).some(
  r => r === 'admin' || r === 'super_admin'
);

// 그 외 → service_memberships 기반
const hasOperatorMembership = user.memberships?.some(
  m => m.serviceKey === SERVICE_KEY && m.status === 'active'
);

if (!isAdmin && !hasOperatorMembership) {
  return <Navigate to="/" replace />;
}
```

| Service | SERVICE_KEY |
|---------|-------------|
| web-neture | `neture` |
| web-glycopharm | `glycopharm` |
| web-glucoseview | `glucoseview` |
| web-k-cosmetics | `k-cosmetics` |

---

## 4. Backend Guard

### MembershipConsoleController

```sql
WHERE EXISTS (
  SELECT 1 FROM service_memberships sm
  WHERE sm.user_id = u.id
    AND sm.service_key = ANY($serviceKeys)
    AND sm.status = 'active'
    AND sm.is_active = true
)
```

### checkServiceBoundary

```sql
SELECT 1 FROM service_memberships
WHERE user_id = $1 AND service_key = ANY($2) LIMIT 1
```

### API Response Standard

```json
{
  "user": { "id", "email", ... },
  "memberships": [{ "serviceKey": "neture", "status": "active" }],
  "roles": ["operator"]
}
```

---

## 5. Auth Flow (Frozen)

```
Login:
  roleAssignmentService.getRoleNames(userId)
  → service_memberships query
  → generateTokens(user, roles, domain, memberships)

JWT Payload:
  { id, email, roles: string[], memberships: { serviceKey, status }[] }

requireAuth:
  user.roles = payload.roles
  user.memberships = payload.memberships

/auth/status:
  Fresh RA query + service_memberships query

Frontend OperatorRoute:
  admin/super_admin → pass
  OR membership.serviceKey === SERVICE_KEY → pass
```

---

## 6. Validation Scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | glycopharm membership 있음 | glycopharm operator 화면 진입 가능 |
| 2 | neture membership 없음 | neture operator 화면 진입 불가 |
| 3 | role만 존재, membership 없음 | operator 화면 절대 불가 |
| 4 | multi-service membership | 각 서비스 독립 접근 |
| 5 | platform admin (admin/super_admin) | 모든 서비스 접근 가능 |

---

## 7. Migration History

| Date | Change |
|------|--------|
| 2026-02-27 | RBAC SSOT: users.role/roles/user_roles → role_assignments |
| 2026-03-19 | Legacy user.role → user.roles[] 전환 (11개 파일) |
| 2026-03-19 | OperatorRoute: allowedRoles → membership 기반 (4개 서비스) |
| 2026-03-19 | @o4o/types User: roles?: string[] 추가 |
| 2026-03-19 | Freeze 선언 |

---

## 8. KPA-a Exception

> **WO-O4O-KPA-EXCEPTION-DOCUMENTATION-V1** (2026-03-19)

KPA-a(`kpa-society`)는 다층 조직 구조(Branch, Organization Role, Qualification)를 가지므로
일반 서비스의 OperatorRoute 패턴을 적용하지 않는다.

### 8.1 KPA-a Guard 구조

```
일반 서비스:
  OperatorRoute → user.memberships 직접 확인

KPA-a:
  RoleGuard + allowedRoles → user.roles 확인
  (role은 membership 승인 시 roleAssignmentService.assignRole()로 파생)

결과: 두 구조 모두 membership 기반 접근 제어
```

### 8.2 KPA-a Role 파생 흐름 (불변)

```
service_memberships 승인 (kpa_member_services.status = 'approved')
→ roleAssignmentService.assignRole({ role: 'kpa:pharmacist' | 'kpa:student' })
→ role_assignments 생성
→ JWT payload.roles에 포함
→ Frontend RoleGuard에서 확인
```

### 8.3 KPA-a 전용 Guard 목록

| Guard | 용도 |
|-------|------|
| `RoleGuard` | 일반 역할 기반 접근 |
| `AdminAuthGuard` | KPA admin 접근 |
| `BranchAdminAuthGuard` | 분회 admin 접근 |
| `BranchOperatorAuthGuard` | 분회 operator 접근 |
| `IntranetAuthGuard` | 인트라넷 접근 |
| `PharmacistOnlyGuard` | 약사 전용 |
| `PharmacyGuard` | 약국 관련 |

### 8.4 금지 사항

```
❌ KPA-a에 OperatorRoute 강제 적용 금지
❌ role 기반 접근을 "독립 구조"로 해석 금지
❌ membership 없이 role 직접 생성 금지
❌ KPA-a 구조를 일반 서비스 구조로 단순화 금지
```

### 8.5 허용 사항

```
✅ RoleGuard + allowedRoles 유지
✅ 조직 단위(role scope) 확장 허용
✅ Branch/Organization role 구조 유지
✅ 복수 role 구조 허용
```

---

## 9. Allowed Changes (버그 수정만)

```
✅ 버그 수정
✅ 성능 개선
✅ 문서/테스트 추가
❌ 구조 변경 → 명시적 WO 필수
```

---

*Version: 1.1*
*Author: AI-assisted development*
