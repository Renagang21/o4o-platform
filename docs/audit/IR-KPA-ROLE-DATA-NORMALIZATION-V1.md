# IR-KPA-ROLE-DATA-NORMALIZATION-V1

> Investigation Report: KPA-B Role Data Normalization
> Date: 2026-03-06
> Status: In Progress (마이그레이션 배포 대기)
> WO: WO-KPA-ROLE-DATA-NORMALIZATION-V1

---

## Executive Summary

KPA-B 데모 서비스 운영자 목록에서 동일 사용자에게 2개 역할이 표시되는 문제를 조사했다.

**코드 조사 결과**: 현재 코드는 generic role을 자동 추가하지 **않는다**.
**데이터 원인 추정**: 이전 버전 코드 또는 수동 할당으로 인한 레거시 데이터.

### 조치

| 항목 | 상태 |
|------|------|
| 코드 자동 생성 여부 | **확인 완료** — 자동 추가 없음 |
| 데이터 진단 | **마이그레이션 배포 대기** |
| 데이터 정리 | **마이그레이션 배포 대기** |

---

## 1. 현재 현상

운영자 리스트에서 한 사용자에게 두 개 Role이 표시된다:

```
KPA-b BranchOperator
  - KPA 데모: 분회 Operator     ← kpa-b:branch
  - KPA 데모: branch operator   ← operator (generic)

KPA-B DistrictOperator
  - KPA 데모: 지부 Operator     ← kpa-b:district
  - KPA 데모: operator          ← operator (generic)
```

---

## 2. 코드 조사 결과

### 2.1 운영자 생성 흐름

```
Admin Dashboard (OperatorsPage.tsx)
  → POST /admin/users { roles: ['kpa-b:district'] }
  → AdminUserController.createUser()
    → for (const r of rolesArray) {
        roleAssignmentService.assignRole({ userId, role: r })
      }
```

**파일**: `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` (Line 322-337)
**파일**: `apps/api-server/src/controllers/admin/AdminUserController.ts` (Line 140-217)

### 2.2 Generic Role 자동 추가 여부: **없음**

| 검사 항목 | 결과 |
|----------|------|
| `AdminUserController.createUser()` | 명시된 roles만 할당 |
| `AdminUserController.updateUser()` | `removeAllRoles()` 후 새 roles만 할당 |
| `roleAssignmentService.assignRole()` | 단일 role만 INSERT, 추가 role 없음 |
| KPA 회원 승인 시 | `kpa:pharmacist` 또는 `kpa:student`만 할당 |
| 회원가입 시 | `user` 또는 `customer`만 할당 |

**결론**: 현재 코드는 `kpa-b:district` 할당 시 `operator`를 자동으로 추가하지 않는다.

### 2.3 중복 원인 추정

1. **이전 버전 코드**: WO-OPERATOR-FIX-V1 이전에는 `role: formData.roles[0]?.split(':')[1] || 'operator'` 값이 legacy `role` 필드로 전달됨. 이 값이 role_assignments에도 저장되었을 가능성.
2. **수동 할당**: Admin이 UI에서 `operator` + `kpa-b:district` 두 역할을 동시 선택.
3. **초기 시드 데이터**: 테스트용 seed 데이터에 generic role 포함.

---

## 3. 데이터 정리 원칙

### 유지할 역할

```
kpa-b:district-admin    (지부 Admin)
kpa-b:district          (지부 Operator)
kpa-b:branch-admin      (분회 Admin)
kpa-b:branch            (분회 Operator)
```

### 제거할 역할 (kpa-b 사용자에 한함)

```
admin      → kpa-b 사용자에게 불필요 (kpa-b:district-admin이 대체)
operator   → kpa-b 사용자에게 불필요 (kpa-b:district가 대체)
```

### 보호 조건

- 다른 서비스(neture, kpa-a 등)에서도 사용되는 사용자의 generic role은 유지
- 삭제가 아닌 **비활성화** (`is_active = false`)로 처리 (복구 가능)

---

## 4. 마이그레이션

**파일**: `apps/api-server/src/migrations/1771200000009-KpaBRoleDataNormalization.ts`

### 마이그레이션 동작

| Step | 설명 |
|------|------|
| 1 | KPA 관련 모든 active role_assignments 조회 + 로그 |
| 2 | `kpa-b:*` 역할을 가진 user_id 목록 추출 |
| 3 | 해당 사용자의 generic `admin`/`operator` 역할 조회 |
| 4 | generic 역할 `is_active = false`로 비활성화 |
| 5 | 정리 후 상태 확인 + 로그 |

### Rollback

`down()` 메서드로 비활성화된 generic 역할 복구 가능.

---

## 5. 검증 (배포 후)

마이그레이션 CI/CD 로그에서 다음을 확인:

1. Step 1 출력: 현재 KPA 관련 role_assignments 전체 상태
2. Step 3 출력: 발견된 중복 generic role 목록
3. Step 4 출력: 비활성화된 role 수
4. Step 5 출력: 정리 후 상태

### 예상 결과

```
Before:
  user1@test.com | kpa-b:district | active=true
  user1@test.com | operator       | active=true  ← 중복

After:
  user1@test.com | kpa-b:district | active=true
  user1@test.com | operator       | active=false ← 비활성화됨
```

---

## 6. 파일 매니페스트

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/migrations/1771200000009-KpaBRoleDataNormalization.ts` | 데이터 진단 + 정리 마이그레이션 |
| `apps/api-server/src/controllers/admin/AdminUserController.ts` | 운영자 생성/수정 (조사 대상) |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | 역할 할당 서비스 (조사 대상) |
| `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` | 운영자 UI (조사 대상) |

---

*Investigation completed: 2026-03-06*
*Migration deployed: (pending CI/CD)*
*Investigator: Claude Code (AI)*
