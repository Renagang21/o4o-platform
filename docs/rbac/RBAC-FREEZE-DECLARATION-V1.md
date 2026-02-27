# RBAC Freeze Declaration V1

> **Status: FROZEN** | 2026-02-27 | WO-RBAC-CLOSEOUT-FREEZE-AND-RUNBOOK-V1

---

## 1. RBAC SSOT 선언

현재 플랫폼의 권한 단일 소스(Single Source of Truth):

```
role_assignments (Layer A)
```

다음은 더 이상 권한 소스로 사용하지 않는다:

| 제거 항목 | 상태 |
|-----------|------|
| `users.role` 컬럼 | DROP 완료 (Phase3-E PR2) |
| `users.roles` 배열 | DROP 완료 (Phase3-E PR2) |
| `user_roles` 테이블 | DROP 완료 (Phase3-E PR2) |
| `dbRoles` relation (ManyToMany) | 코드 제거 완료 (Phase3-E PR1) |
| `activeRole` relation (ManyToOne) | 코드 제거 완료 (Phase3-E PR1) |
| `users_role_enum` 타입 | DROP 완료 (Phase3-E PR2) |

---

## 2. 읽기/쓰기/검증 경로 확정

| 영역 | 단일 경로 |
|------|-----------|
| **Read** | `roleAssignmentService.getRoleNames()` → `user.roles` (middleware override) |
| **Write** | `roleAssignmentService.assignRole()` / `removeRole()` / `removeAllRoles()` |
| **JWT** | `roleAssignmentService.getRoleNames()` → token payload |
| **Guard** | `requireAdmin` / `requireRole` / `createServiceScopeGuard` (모두 RA 기반) |

---

## 3. 금지 사항

다음은 재도입 금지:

- `users.role` 컬럼 복구
- `users.roles` 배열 컬럼 재도입
- `user_roles` bridge 테이블 재생성
- `dbRoles` / `activeRole` relation 재도입
- `deriveRoles` 기반 fallback 로직
- `legacyRoles` 배열 체크 (security-core에서 이미 `[]`로 비활성화)
- `administrator` / `superadmin` 등 오타 역할 재사용
- `user.roles = [...]` 직접 배열 할당 (dead write)
- `userRepo.create({ roles: [...] })` 패턴

---

## 4. Role 추가 정책

새 role 추가 시 필수 절차:

1. `UserRole` enum에 등록 (문자열 상수)
2. `roleAssignmentService.assignRole()` 기반 할당만 허용
3. Guard 정책 명확화 (어떤 scope guard에 포함할지)
4. `RBAC-ROLE-CATALOG-V1.md` 문서 갱신
5. 해당 서비스의 scope config (`service-configs.ts`) 업데이트

---

## 5. 전환 이력

| Phase | 내용 | 커밋 |
|-------|------|------|
| Phase3-D | Middleware override + dual-write 구현 | — |
| Phase3-E PR1 | @Column 제거, query builder 전환, dual-write/fallback 제거 | `cd7c8d9a1` |
| Phase3-E PR2 | DB 스키마 DROP (role, roles, user_roles, enum) | `36dd2d18a` |
| Phase2G | Write-path 통일 (모든 역할 쓰기 → assignRole) | `9f6285324` |

---

*Frozen: 2026-02-27*
*버그 수정·성능 개선·문서·테스트는 허용. 구조 변경은 명시적 WO 필수.*
