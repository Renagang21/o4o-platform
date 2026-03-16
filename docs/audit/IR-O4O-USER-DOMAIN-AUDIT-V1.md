# IR-O4O-USER-DOMAIN-AUDIT-V1

> O4O Platform User Domain 전수 조사
>
> Date: 2026-03-16
> Status: Complete
> 근거: IR-GLYCOPHARM-OPERATOR-SYSTEM-AUDIT-V1 (P0 문제 발견)

---

## 1. 조사 목적

O4O 플랫폼의 User 데이터 구조와 Service Isolation 상태를 검증한다.

선행 조사에서 `/api/v1/operator/members` API가 **서비스 격리 없이 플랫폼 전체 사용자를 반환**할 수 있는 구조가 발견되었다. 이 구조는 O4O 플랫폼의 "Single Account, Multi Service, Service Data Isolation" 원칙에 위배될 수 있다.

---

## 2. User Domain 구조 지도

### 2-1. 핵심 테이블 관계

```
┌─────────────────────────────────────────────────────────┐
│ users (Platform-Common Identity)                        │
│ PK: id (UUID)                                           │
│ UNIQUE: email                                           │
│ service_key (VARCHAR, nullable, legacy)                  │
│ roles[] (runtime-only, from JWT payload)                │
│ memberships[] (runtime-only, from JWT payload)          │
└─────────────────────────────────────────────────────────┘
       │
       ├── 1:N ── service_memberships (User ↔ Service 연결)
       │          PK: id
       │          FK: user_id → users(id) ON DELETE CASCADE
       │          UNIQUE: (user_id, service_key)
       │          Columns: service_key, status, role, approved_by, approved_at
       │
       ├── 1:N ── role_assignments (RBAC SSOT)
       │          PK: id
       │          FK: user_id → users(id) ON DELETE CASCADE
       │          UNIQUE: (user_id, role, is_active)
       │          Columns: role, is_active, scope_type, scope_id
       │
       └── 1:N ── user_service_enrollments (서비스 가입 신청)
                  PK: id
                  FK: user_id → users(id) ON DELETE CASCADE
                  UNIQUE: (user_id, service_code)
                  Columns: service_code, status, metadata
```

### 2-2. 서비스 격리 메커니즘 3중 구조

| # | 메커니즘 | 테이블 | 용도 | 상태 |
|---|---------|--------|------|------|
| 1 | `users.service_key` | users | Legacy 데이터 격리 | Legacy (유지) |
| 2 | `service_memberships` | service_memberships | 서비스별 멤버십 | **현행 표준** |
| 3 | `user_service_enrollments` | user_service_enrollments | 서비스 가입 승인 | 플랫폼 레벨 |

### 2-3. 역할 격리 메커니즘

| 메커니즘 | 방식 | 상태 |
|---------|------|------|
| Role Prefix | `{service}:{role}` 형식 (e.g., `neture:operator`) | **현행 표준** |
| scope_type / scope_id | `role_assignments` 컬럼 (global / organization) | **정의만 존재, 미사용** |

**핵심 발견: `role_assignments.scope_type`과 `scope_id`는 스키마에 정의되어 있으나, RoleAssignmentService의 어떤 쿼리 메서드에서도 사용하지 않는다.** 서비스 격리는 전적으로 role prefix (`neture:`, `kpa:` 등)에 의존한다.

---

## 3. User 접근 API 전수 조사

### 3-1. 사용자 목록 조회 API (4개 발견)

| # | Endpoint | Controller | Service Isolation | 위험도 |
|---|----------|-----------|:-----------------:|:------:|
| 1 | `GET /api/v1/operator/members` | MembershipConsoleController | **YES** | LOW |
| 2 | `GET /api/v1/admin/users` | AdminUserController | **NO** | MEDIUM |
| 3 | `GET /api/v1/users` | UserManagementController | **NO** | MEDIUM |
| 4 | `GET /api/v1/kpa/members` | KPA MemberController | **YES** (org 기반) | LOW |

### 3-2. 상세 분석

#### (1) `/api/v1/operator/members` — SAFE

**파일:** `apps/api-server/src/controllers/operator/MembershipConsoleController.ts`

**격리 방식:**
```sql
-- 서비스 운영자: 필수 필터
EXISTS (SELECT 1 FROM service_memberships sm2
        WHERE sm2.user_id = u.id AND sm2.service_key = ANY($1))

-- 플랫폼 관리자: 선택적 필터
EXISTS (SELECT 1 FROM service_memberships sm2
        WHERE sm2.user_id = u.id AND sm2.service_key = $1)
```

- `injectServiceScope` 미들웨어로 요청자의 서비스 범위 추출
- 서비스 운영자는 자신의 서비스 회원만 조회 가능
- 플랫폼 관리자는 선택적으로 서비스 필터 적용 가능
- **판정: 정상**

#### (2) `/api/v1/admin/users` — RISK (Medium)

**파일:** `apps/api-server/src/controllers/admin/AdminUserController.ts`

```sql
SELECT u.id, u.email, u."firstName", u."lastName", u.name, u.phone,
       u.status, u."isActive", u."createdAt", u."updatedAt",
       u."businessInfo"->>'businessName' AS company
FROM users u
${whereClause}
ORDER BY ${sortField} ${order}
```

- Guard: `requireRole(['admin', 'super_admin', 'manager', 'operator'])`
- **`operator` 역할이 포함되어 있어 서비스 운영자도 접근 가능**
- service_memberships JOIN 없음 → 전체 플랫폼 사용자 반환
- **판정: 서비스 운영자가 전체 사용자를 볼 수 있는 구조**

#### (3) `/api/v1/users` — RISK (Medium)

**파일:** `apps/api-server/src/modules/user/controllers/user-management.controller.ts`

```typescript
const queryBuilder = userRepository.createQueryBuilder('user');
// 검색, 상태 필터만 적용. 서비스 필터 없음.
```

- Guard: `requireAdmin`
- service_memberships JOIN 없음
- **판정: 플랫폼 admin 전용이면 허용 가능, 서비스 운영자 접근 시 문제**

#### (4) `/api/v1/kpa/members` — SAFE

**파일:** `apps/api-server/src/routes/kpa/controllers/member.controller.ts`

- KPA 전용 도메인 테이블 (`kpa_members`) 사용
- `organization_id` 기반 필터
- **판정: 정상 (도메인 격리)**

---

## 4. 서비스별 User 접근 패턴

### 4-1. Neture

| 쿼리 위치 | 패턴 | 격리 | 판정 |
|-----------|------|:----:|------|
| `operator-registration.service.ts` L32 | `JOIN service_memberships WHERE service_key = 'neture'` | YES | SAFE |
| `operator-registration.service.ts` L127 | `JOIN service_memberships WHERE service_key = 'neture'` | YES | SAFE |
| `neture.service.ts` L382, L503 | `SELECT FROM users WHERE id = ANY($1)` | NO | SAFE (ID 기반) |
| `partner.service.ts` L296 | `JOIN users ON partner_commissions` | NO | MEDIUM (전 서비스 파트너) |
| `partner.service.ts` L539 | `JOIN users ON partner_settlements` | NO | MEDIUM (전 서비스 정산) |

### 4-2. GlycoPharm / GlucoseView

| 쿼리 위치 | 패턴 | 격리 | 판정 |
|-----------|------|:----:|------|
| `patient-coaching.controller.ts` | `glucoseview_customers` 전용 테이블 | YES | SAFE |
| `pharmacist.service.ts` | `glucoseview_pharmacists` 전용 테이블 | YES | SAFE |
| GlycoPharm Care 모듈 | `care-pharmacy-context.middleware.ts` 조직 기반 | YES | SAFE |

### 4-3. KPA

| 쿼리 위치 | 패턴 | 격리 | 판정 |
|-----------|------|:----:|------|
| `mypage.service.ts` L26 | `findOne({ where: { id: userId } })` | NO | LOW (자기 정보만) |
| `branch-member.service.ts` L41 | `JOIN users ON kpa_approval_requests WHERE organization_id = $1` | YES | SAFE |
| `pharmacy-request.controller.ts` L132 | `SELECT FROM users WHERE id = $1` (N+1 루프) | NO | LOW (ID 기반) |
| `instructor.service.ts` L151 | `JOIN users ON kpa_approval_requests WHERE organization_id = $1` | YES | SAFE |

---

## 5. 위험 쿼리 패턴 분류

### 5-1. CRITICAL — 서비스 격리 없는 다중 사용자 목록

| # | 파일 | 위치 | 문제 | Guard |
|---|------|------|------|-------|
| C1 | `AdminUserController.ts` | L30-64 | 전체 사용자 목록, 서비스 필터 없음 | `requireRole` (operator 포함) |
| C2 | `UserManagementController.ts` | L34-67 | 전체 사용자 목록, 서비스 필터 없음 | `requireAdmin` |
| C3 | `/routes/v1/users.routes.ts` | L21-49 | 전체 사용자 목록, 서비스 필터 없음 | `requireAdmin` |

### 5-2. MEDIUM — Debug 엔드포인트 노출

| # | 파일 | 위치 | 문제 |
|---|------|------|------|
| D1 | `service-users-audit.controller.ts` | L36-89 | **인증 없이** 서비스별 사용자 열거 가능 |
| D2 | `rbac-db-audit.controller.ts` | L65-72 | **인증 없이** 사용자 통계 조회 가능 |

### 5-3. LOW — ID 기반 단건 조회 (경계 없음)

| # | 파일 | 위치 | 문제 |
|---|------|------|------|
| L1 | `mypage.service.ts` | L26-27 | UUID만으로 사용자 조회 |
| L2 | `pharmacy-request.controller.ts` | L132-135 | UUID 루프 조회 (N+1) |
| L3 | `partner.service.ts` | L296, L539 | partner/settlement JOIN 시 서비스 필터 없음 |

---

## 6. role_assignments 상세 분석

### 6-1. 현재 구조

```
role_assignments
├── user_id       (FK → users)
├── role          (VARCHAR: 'neture:operator', 'kpa:admin', 'platform:super_admin' 등)
├── is_active     (BOOLEAN)
├── scope_type    (VARCHAR: 'global' | 'organization')  ← 미사용
├── scope_id      (UUID: organization ID)                 ← 미사용
├── valid_from    (TIMESTAMP)
└── valid_until   (TIMESTAMP, nullable)
```

### 6-2. RoleAssignmentService 메서드 분석

| 메서드 | scope 사용 | 비고 |
|--------|:----------:|------|
| `getActiveRoles(userId)` | NO | user_id + is_active + valid window만 |
| `getRoleNames(userId)` | NO | getActiveRoles() 래핑 |
| `hasRole(userId, role)` | NO | role string 직접 비교 |
| `hasAnyRole(userId, roles[])` | NO | role IN (...) 비교 |
| `isAdmin(userId)` | NO | hasAnyRole(['super_admin', 'admin']) |
| `assignRole(input)` | WRITE만 | scopeType/scopeId 저장은 하지만 조회 시 무시 |
| `getUsersWithRole(role)` | NO | role string 직접 비교 |

**결론: scope_type/scope_id는 데이터만 저장되고 인가 로직에서 완전히 무시된다.**

### 6-3. 서비스 격리 실제 동작

```
서비스 격리 = role prefix 기반
  neture:operator → extractServiceScope() → serviceKeys: ['neture']
  kpa:admin       → extractServiceScope() → serviceKeys: ['kpa-society']

조직 격리 = organization_members 테이블 기반 (role_assignments.scope_id 아님)
```

---

## 7. service_memberships 상세 분석

### 7-1. 데이터 흐름

```
회원가입 → auth.controller.ts
  │
  ├── users INSERT (email, service_key)
  │
  └── service_memberships INSERT (user_id, service_key, status='pending')
      │
      ├── 운영자 승인 → status='active'
      │   ├── operator-registration.service.ts (Neture)
      │   ├── MembershipConsoleController.ts (전체)
      │   └── user-management.controller.ts (Admin)
      │
      └── Handoff → handoff.controller.ts
          └── 다른 서비스 가입 시 새 membership INSERT
```

### 7-2. 쿼리 사용처

| 사용처 | 쿼리 방식 | 용도 |
|--------|----------|------|
| Auth (login/register) | SELECT WHERE user_id | JWT payload에 memberships[] 포함 |
| MembershipConsoleController | EXISTS subquery | **사용자 목록 서비스 격리** |
| OperatorRegistrationService | JOIN WHERE service_key = 'neture' | Neture 가입 신청 관리 |
| HandoffController | SELECT/INSERT/UPDATE | 서비스 간 이동 시 멤버십 관리 |
| PasswordController | SELECT WHERE user_id | 비밀번호 변경 시 멤버십 확인 |

---

## 8. 핵심 발견 요약

### 8-1. 정상 작동 영역

| 영역 | 격리 방식 | 상태 |
|------|----------|------|
| `/api/v1/operator/members` | service_memberships EXISTS | **정상** |
| Neture 가입 관리 | `service_key = 'neture'` 하드코딩 | **정상** |
| KPA 멤버 관리 | `organization_id` 필터 | **정상** |
| GlycoPharm/GlucoseView | 도메인 전용 테이블 | **정상** |
| Auth 로그인/가입 | email unique + service_memberships | **정상** |

### 8-2. 문제 영역

| Priority | 문제 | 영향 | 위치 |
|:--------:|------|------|------|
| **P0** | Debug 엔드포인트 인증 없이 사용자 열거 가능 | 정보 노출 | `service-users-audit.controller.ts` |
| **P1** | `/api/v1/admin/users`에 operator 역할 접근 허용 | 서비스 경계 위반 | `AdminUserController.ts` |
| **P2** | role_assignments scope_type/scope_id 미사용 | 설계 불일치 | `role-assignment.service.ts` |
| **P3** | partner/settlement 쿼리 서비스 필터 없음 | 교차 서비스 조회 | `partner.service.ts` |

### 8-3. 구조적 이슈

1. **서비스 격리 3중 구조의 중복**
   - `users.service_key` (legacy)
   - `service_memberships` (현행)
   - `user_service_enrollments` (플랫폼)
   - 어느 것이 최종 SSOT인지 명확하지 않음

2. **role_assignments의 scope 미활용**
   - 스키마에 `scope_type`, `scope_id`, CHECK 제약, 인덱스까지 존재
   - 실제 인가 로직에서 완전히 무시
   - Role prefix 기반 격리와 scope 기반 격리가 혼재

3. **Admin vs Operator Guard 불일치**
   - `AdminUserController`: `requireRole(['admin', 'super_admin', 'manager', 'operator'])`
   - `operator` 포함 → 서비스 운영자도 전체 사용자 목록 접근 가능
   - **OPERATOR-DASHBOARD-STANDARD-V1** 기준으로는 사용자 관리가 Admin 전용이어야 함

---

## 9. 후속 작업 제안: WO-O4O-USER-DOMAIN-ALIGNMENT-V1

### Phase 1: 긴급 (P0)

| # | 작업 | 설명 |
|---|------|------|
| 1-1 | Debug 엔드포인트 인증 추가 | `service-users-audit`, `rbac-db-audit` 에 `requireAdmin` 추가 |
| 1-2 | AdminUserController Guard 수정 | `requireRole`에서 `operator` 제거 → admin/super_admin만 |

### Phase 2: 구조 정비 (P1-P2)

| # | 작업 | 설명 |
|---|------|------|
| 2-1 | service_memberships SSOT 선언 | 서비스 멤버십의 단일 소스를 service_memberships로 확정 |
| 2-2 | role_assignments scope 활용 결정 | scope_type/scope_id 활성화 또는 제거 결정 |
| 2-3 | partner 쿼리 서비스 필터 추가 | partner.service.ts에 서비스 경계 필터 추가 |

### Phase 3: 정리 (P3)

| # | 작업 | 설명 |
|---|------|------|
| 3-1 | users.service_key 역할 정리 | Legacy 컬럼의 향후 처리 방향 결정 |
| 3-2 | user_service_enrollments 통합 검토 | service_memberships와의 관계 정리 |

---

## 10. 참조 문서

| 문서 | 용도 |
|------|------|
| `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` | Guard Rule 5개 (F6) |
| `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` | RBAC SSOT 선언 (F9) |
| `docs/architecture/O4O-CORE-FREEZE-V1.md` | Core 모듈 동결 (F10) |
| `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` | Admin/Operator 역할 분리 표준 |
| `docs/audit/IR-GLYCOPHARM-OPERATOR-SYSTEM-AUDIT-V1.md` | 선행 조사 (P0 문제 발견) |

---

*Version: 1.0*
*Status: Complete*
*Investigator: AI (Claude Opus 4.6)*
