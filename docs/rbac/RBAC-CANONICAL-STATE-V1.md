# RBAC-CANONICAL-STATE-V1

> O4O RBAC 구조 — Phase3-E 완료 후 canonical 상태
>
> Status: Active
> Version: 1.0
> Created: 2026-05-07
> 관련 작업: WO-RBAC-FULL-STABILIZATION-V1 (Phase3-E 완료, 2026-02-27)
> 선행 문서:
>   - `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)
>   - `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11)
>   - `docs/rbac/RBAC-RUNBOOK-V1.md`

---

## 1. 이 문서의 목적

RBAC Phase3-E 완료 이후 실제 운영 중인 canonical 상태를 기록한다.
"어떤 상태가 되었는가"와 "왜 이 구조인가"를 설명한다.

---

## 2. 현재 테이블 구조 (확정)

```
users               → Identity ONLY
                      (권한 속성 없음, users.role DB column 제거됨)

role_assignments    → RBAC SSOT (Single Source of Truth)
                      (활성 여부: is_active = true)

service_memberships → Service membership + service role
                      (service_key, status, role)

organization_members → Business role
kpa_pharmacist_profiles → KPA 자격 정보
```

> `users.role`, `users.roles`, `user_roles` 테이블/컬럼은 **DB에서 완전히 제거됨**
> (Phase3-E Migration: `CleanupLegacyRoles`)

---

## 3. 인증 흐름

### 3.1 로그인 시

```
POST /auth/login
  → roleAssignmentService.getRoleNames(userId)   ← DB 신규 조회
  → generateTokens(user, roles[], domain)
  → JWT payload: { userId, roles: ['neture:operator', ...] }
```

### 3.2 요청 인증 (requireAuth)

```
모든 API 요청
  → requireAuth middleware
  → user.roles = payload.roles        ← JWT payload 직접 할당
  → DB 조회 없음 (성능)
```

### 3.3 /auth/status

```
GET /api/v1/auth/status
  → optionalAuth (토큰 선택적)
  → roleAssignmentService.getRoleNames(userId)   ← fresh DB 조회
  → 응답에 현재 roles 포함
```

`/auth/status`는 항상 DB에서 역할을 새로 조회한다.
권한 변경 후 즉시 반영이 필요한 경우 이 엔드포인트를 사용한다.

### 3.4 /auth/me

```
GET /api/v1/auth/me
  → requireAuth (JWT 필수)
  → 60s 인메모리 캐시
  → getCachedRoles() → getRoleNames() fallback
  → 응답에 캐시된 roles 포함
```

`/auth/me`는 60초 캐시를 사용한다.
역할 변경 직후에는 `/auth/status`를 사용해야 최신 상태를 확인할 수 있다.

---

## 4. Role Write 경로 (canonical)

모든 역할 부여/제거는 `roleAssignmentService`를 통한다.

```typescript
// 역할 부여 (canonical)
await roleAssignmentService.assignRole({
  userId: user.id,
  role: 'neture:operator',
  assignedBy: 'admin:userId',
});

// 역할 제거 (canonical)
await roleAssignmentService.removeRole(userId, role);

// 역할 조회 (canonical)
await roleAssignmentService.getRoleNames(userId);
await roleAssignmentService.hasAnyRole(userId, ['admin', 'super_admin']);
```

**금지 패턴:**
```typescript
// ❌ user.role = 'admin'        (users.role 컬럼 제거됨)
// ❌ user.roles = [...]         (runtime-only, DB 저장 불가)
// ❌ UPDATE users SET role = ... (users.role 컬럼 없음)
```

---

## 5. Guard 사용 기준

```typescript
// 플랫폼 전역 admin 확인
requireAdmin()
  → roleAssignmentService.hasAnyRole(userId, ['admin', 'super_admin'])

// 서비스 scope 확인 (service-aware, 권장)
requireNetureScope('neture:operator')
requireKpaScope('kpa-society:pharmacy_owner')
requireCosmeticsScope('k-cosmetics:store_owner')

// KPA-a 예외: RoleGuard + allowedRoles (F11)
<RoleGuard allowedRoles={['kpa-society:pharmacist', ...]} />
```

> `requireAdmin()`의 "서비스 레벨" 버전은 사용 금지.
> 서비스별 scope guard를 항상 사용한다.

---

## 6. JWT Payload 구조

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];          // ['neture:operator', ...]
  domain?: string;
  iat: number;
  exp: number;
}
```

- `roles`는 로그인 시점의 `role_assignments` 스냅샷
- 변경은 다음 로그인 또는 `/auth/status` 호출 시 반영

---

## 7. 왜 users.role을 제거했는가

기존 구조 문제:
- `users.role` → `role_assignments.role` → `service_memberships.role` 3개 중복
- 불일치 발생 시 어느 것이 권위 소스인지 불명확
- 서비스별 role 확장이 단일 컬럼으로 불가능

현재 구조:
- `role_assignments` = **유일한 RBAC 소스** (SSOT)
- `service_memberships` = 서비스 가입 + 서비스 역할 (별도 도메인)
- `users` = Identity 전용 (권한 없음)
- 충돌 없음, 단방향 권위

> 📄 상세: `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)

---

## 8. 검증 쿼리

```sql
-- 특정 사용자의 활성 역할 확인
SELECT role, is_active, scope_type, assigned_at
FROM role_assignments
WHERE user_id = '<USER_UUID>'
  AND is_active = true
ORDER BY assigned_at;

-- 역할 분포 확인
SELECT role, COUNT(*)::int AS cnt
FROM role_assignments
WHERE is_active = true
GROUP BY role
ORDER BY cnt DESC;
```

---

## 8-A. 권한 판정 계약 (authorization contract)

> 추가: 2026-08-25 · WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
> 이 절은 §6 "JWT Payload 구조" 를 **대체하지 않고 한정**한다. JWT 의 `roles`/`memberships`
> 는 여전히 로그인 시점 스냅샷이지만, **진입 게이트의 최종 판정 근거는 DB** 다.

### 권한 = active membership + 필요한 role/capability

두 축은 역할이 다르다.

| 축 | 질문 | SSOT |
|----|------|------|
| `users.id` | 너는 누구인가 (전역 identity) | `users` |
| `service_memberships.status` | 이 서비스에 **들어올 수 있는가** | `service_memberships` |
| `role_assignments.role` | 그 안에서 **무엇을 할 수 있는가** | `role_assignments` |

금지되는 판정 형태:

- `service role only` — role 만 보고 membership 을 보지 않음
- `JWT role snapshot only` — 토큰 스냅샷만 보고 DB 를 확인하지 않음
- `bare legacy role only` — 무접두 `admin` / `super_admin` 단독 판정

`suspended` 와 `rejected` 는 서로 다른 상태이며, 서비스별로 재해석하지 않는다.

### 정지 즉시성

게이트에서의 membership 판정은 DB 를 본다. 운영자가 회원을 정지시키면 그 회원의
기존 토큰이 만료되기를 기다리지 않고 즉시 차단된다.

- `common/middleware/membership-guard.middleware.ts` — JWT 사전검사(빠른 거부) 후 DB 확정검사
- `utils/store-owner.utils.ts` `isStoreOwner()` — DB `service_memberships(active)` 선검사
- `middleware/signage-role.middleware.ts` — signage 6개 게이트 전부 active membership 요구
- `utils/service-membership.ts` — 위 판정의 공용 SSOT (`resolveCanonicalServiceKey` 경유, 실패 시 fail-closed)

정지 시 refresh token 을 일괄 폐기하는 방식은 **쓰지 않는다** — 토큰은 전역이라
한 서비스의 정지가 다른 서비스의 세션까지 끊는 cross-service fan-out 이 된다.

### platform override

`platform:super_admin` 단독 통과는 **경로별로 명시된 경우에만** 허용한다.

| 경로 | override | 근거 |
|------|----------|------|
| `createMembershipScopeGuard` | `config.platformBypass === true` 인 서비스만 | 서비스별 설정 (KPA 는 `false`) |
| signage 게이트 | `hasSignageAdminPermission()` | 운영/디버깅 최소 예외 |
| Neture `PlatformRoute` | membership 요구 안 함 | cross-service surface (서비스 멤버십과 무관) |
| `requireAdmin` | `platform:super_admin` 전용 | 플랫폼 관리 API |

### 프런트엔드

membership 판정 SSOT 는 `@o4o/auth-utils` 의 `membershipGate` 이며 데이터원은
`GET /auth/me` 다(JWT 아님). 5개 서비스가 각자 `lib/membershipGate.ts` 에서
자기 `SERVICE_KEY` 만 바인딩해 re-export 한다 —
`kpa-society` · `k-cosmetics` · `glycopharm` · `neture` · `pharmacy-hub`.

---

## 9. 관련 문서

| 문서 | 관계 |
|------|------|
| `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9) | RBAC SSOT freeze 선언 |
| `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11) | users/role_assignments/memberships 테이블 freeze |
| `docs/rbac/RBAC-RUNBOOK-V1.md` | 운영 장애 대응 절차 |
| `docs/rbac/RBAC-ROLE-CATALOG-V1.md` | 역할 목록 및 분류 |
| `docs/checks/WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1-CHECK.md` | 권한 판정 계약 최종 감사 (§8-A 근거) |

---

*Created: 2026-05-07*
*Status: Active*
