# CHECK-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1

- **WO**: `WO-O4O-MEMBERSHIP-CONSOLE-ROLE-REVOKE-SAFETY-GUARDS-V1`
- **일자**: 2026-08-11
- **판정**: PASS
- **선행**: `CHECK-O4O-CENTRAL-OPERATOR-ROLE-REVOKE-SAFETY-GUARDS-V1` (중앙 `/operators` 해제 경로 안전 가드)

---

## 1. 목표

`MembershipConsoleController.removeMemberRole` 이 중앙 역할 해제 안전 계약을 우회하지 못하게 한다.
직전 WO 에서 중앙 `AdminUserController.revokeRoleAssignment` 에만 가드를 넣었기 때문에,
같은 `role_assignments` soft revoke 를 수행하는 운영자 콘솔 경로가 열린 채로 남아 있었다.

---

## 2. 조사 결과

### 2-1. 실제 경로와 소비처

| 항목 | 값 |
|---|---|
| Route | `DELETE /api/v1/operator/members/:userId/roles/:role` |
| 등록 | `apps/api-server/src/routes/operator/membership.routes.ts:50` |
| Guard | `authenticate` + `requireRole([platform:super_admin, {neture,glycopharm,cosmetics,kpa}:{admin,operator}])` + `injectServiceScope` |
| 프런트 소비처 | `packages/ui/src/operator-user-detail/UserDetailPage.tsx:460` (`handleRemoveRole`) — **유일** |
| 노출 화면 | web-glycopharm / web-k-cosmetics / web-kpa-society / web-neture 의 운영자 `UserDetailPage` + `packages/operator-core-ui` `OperatorMembersConsolePage` |

### 2-2. 확정된 우회 (핵심)

`removeMemberRole` 의 역할 부여·해제 tier 제한(`ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY`,
`IR-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-V1`)은 **`if (!scope.isPlatformAdmin) { ... }` 블록 안에만** 있다.

즉 `scope.isPlatformAdmin === true` 인 요청자는 서비스 경계 검사·scope 검사·tier 제한을 **모두 건너뛰고**
곧바로 `roleAssignmentService.removeRole(userId, role)` 에 도달했다. 결과:

- 어떤 서비스든 **마지막 활성 `{service}:admin` 해제 가능** → 해당 서비스 관리 주체 소실
- **자기 자신의 역할 해제 가능** → 스스로 잠금
- 마지막 보유자 보호는 `platform:super_admin` 한 역할에만 존재(409 `LAST_PLATFORM_SUPER_ADMIN`)

### 2-3. 서비스 admin 역할·자기 역할 처리 여부

이 경로는 `roleService.getRoleByName()` 으로 검증만 하고 role 문자열을 그대로 해제하므로
`{service}:admin` 을 **실제로 처리한다**(가정이 아님). 자기 역할 해제를 막는 검사도 없었다.
→ WO 의 "이 경로가 서비스 admin 역할을 실제로 처리하지 않으면 수정하지 말라" 조건에 해당하지 않아 적용을 진행했다.

---

## 3. 적용 내용

### 3-1. 공통 판정 유틸 확장 — `apps/api-server/src/utils/role-revoke-safety.ts`

직전 WO 의 판정 규칙(`getServiceAdminRoleServiceKey` / `SELF_ROLE_REVOKE_FORBIDDEN_*` /
`LAST_ADMIN_PROTECTED_CODE` / `lastAdminProtectedMessage`)을 그대로 재사용하고,
**잠금·판정·UPDATE 를 하나로 묶은 정본 함수**를 추가했다.

```ts
revokeServiceAdminRoleWithLock(runner, userId, role)
  → { status: 'not_holder' } | { status: 'last_admin' } | { status: 'revoked', affected }
```

- 같은 트랜잭션 안에서 `SELECT user_id FROM role_assignments WHERE role = $1 AND is_active = true FOR UPDATE`
  → 보유 여부(404)와 마지막 admin 여부(403)를 **한 번의 잠금 읽기로** 판정
- 통과 시 같은 트랜잭션에서 `UPDATE ... SET is_active = false` (soft revoke 유지)
- `runner` 는 `transaction()` 만 요구하는 최소 인터페이스 → 테스트 주입 가능

### 3-2. 중앙 컨트롤러 리팩터 — `AdminUserController.revokeRoleAssignment`

직전 WO 에서 인라인으로 넣었던 트랜잭션 로직을 위 정본 함수 호출로 교체했다.
**SQL 문자열·응답 코드·메시지는 동일**하므로 기존 16개 테스트가 그대로 통과한다(중복 구현 제거 목적).

### 3-3. `MembershipConsoleController.removeMemberRole`

| 순서 | 내용 |
|---|---|
| ① | `role` 누락 400 검사 직후 **자기 역할 해제 403** (`SELF_ROLE_REVOKE_FORBIDDEN_CODE`) — `isPlatformAdmin` 여부와 무관하게 적용 |
| ② | 기존 role 검증 · `platform:super_admin` 409 가드 · `if (!scope.isPlatformAdmin)` 블록 **그대로 유지** |
| ③ | `removeRole` 직전에 `getServiceAdminRoleServiceKey(role)` 판정 → 서비스 admin 이면 `revokeServiceAdminRoleWithLock` 경로 |
| ④ | `not_holder` → 404 `Role not found or already inactive` (기존 문구 유지) / `last_admin` → 403 `LAST_ADMIN_PROTECTED` |
| ⑤ | 성공 시 `removeRole` 을 우회했으므로 `invalidateRoles(userId)` 를 직접 호출 (WO-O4O-AUTH-ROLE-FRESHEN-V1 계약 유지) |
| ⑥ | 서비스 admin 이 아닌 역할은 기존 `roleAssignmentService.removeRole` 경로 **무변경** |

**서비스 admin 판정**은 직전 WO 와 동일하게 `/^([a-z0-9][a-z0-9-]*):admin$/` + `platform` 접두 제외 규칙이다.
`roles.is_admin_role` 카탈로그를 쓰지 않는 이유도 동일하다 — `kpa:district_admin` / `kpa:branch_admin` 이
과다 포함되고, 조회 실패 시 fail-open 이 된다.

---

## 4. 유지된 계약 (변경 없음)

- `platform:super_admin` 의 정상적인 하위 역할 관리 권한
- 일반 회원 역할 제거와 비플랫폼 요청자의 서비스 경계·scope·tier 규칙
- `role_assignments.is_active = false` soft revoke (DELETE 없음)
- 서비스별 role · membership · credential 의미
- `users.isActive` / service membership · credential · 로그인 구조 / DB schema · migration — 미접촉
- Neture 전용 운영자 화면과 API — 미접촉

---

## 5. 검증

### 5-1. 신규 테스트 — `MembershipConsoleController.roleRevokeSafety.test.ts` (16 PASS)

| WO 필수 항목 | 테스트 |
|---|---|
| 자기 역할 해제 거절 | platform admin 자기 해제 403 (role 조회 이전 차단) / 서비스 운영자 자기 해제 403 |
| 마지막 활성 `{serviceKey}:admin` 해제 거절 | platform admin 이어도 403 · UPDATE 미실행 |
| admin 2명 이상이면 1명 해제 허용 | 성공 + `invalidateRoles` 호출 확인 |
| 다른 사용자 operator · 일반 하위 역할 해제 허용 | `neture:operator` / `neture:seller` 성공 + 잠금 트랜잭션 미진입 |
| 비활성 assignment 제외 | SELECT 에 `is_active = true` 고정 |
| 타 서비스 admin 제외 | 조회 role 파라미터가 대상 role 하나뿐임을 고정 |
| 플랫폼 관리자의 정상 타인 역할 관리 유지 | 위 operator/seller/`district_admin` 케이스 + `platform:super_admin` 다수 시 해제 허용 |
| 비플랫폼 요청자 권한·tier 가드 무회귀 | `ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY` 403 · scope 밖 403 · 미지정 역할 400 |
| 중앙 안전 계약과 오류 코드 일치 | `SELF_ROLE_REVOKE_FORBIDDEN_CODE` · `LAST_ADMIN_PROTECTED_CODE` 를 중앙 정본 모듈에서 import 하여 단언 |
| 동시 해제 우회 차단 | `FOR UPDATE` + 동일 트랜잭션 UPDATE · soft revoke SQL 계약 |

### 5-2. 회귀

```
npx jest src/controllers/operator/__tests__ src/controllers/admin/__tests__
→ Test Suites: 8 passed, Tests: 107 passed
npx tsc --noEmit -p tsconfig.json  → exit 0
```

---

## 6. 범위 밖 관찰 (수정하지 않음)

1. **중앙 `AdminUserController.revokeRoleAssignment` 는 `invalidateRoles` 를 호출하지 않는다.**
   이번 WO 이전부터 있던 갭이며 이번 변경으로 악화되지 않았다. 별도 WO 대상.
2. **접두 없는 `role` 파라미터.** `roleService.getRoleByName('admin')` 이 서비스 role 로 해석되더라도
   해제는 전달된 문자열 그대로 수행된다. 기존부터 있던 불일치이며 이번 가드도 문자열 기준으로 동작한다.
3. **비활성 유령 assignment.** `unique_active_role_per_user` 가 3컬럼 UNIQUE 이므로 비활성 행이 누적될 수 있다.
   사용자 지시에 따라 이번 흐름과 분리한다.

---

## 7. 후속 순서

1. Neture `/admin/operators` 를 중앙 `/operators` 안내 화면으로 교체
2. `adminOperatorApi` 소비처 0 재확인
3. Neture 전용 운영자 관리 API 은퇴 (권한 부여 우회 경로 실제 폐쇄)

이번 WO 로 **1번의 직접 선행 조건인 `removeMemberRole` 안전 가드가 닫혔다.**

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(범위 밖 관찰 1번)
