# User Domain SSOT Declaration V1

> User Domain 단일 소스 선언
>
> Date: 2026-03-16
> Status: Active
> 근거: IR-O4O-USER-DOMAIN-AUDIT-V1, WO-O4O-USER-DOMAIN-ALIGNMENT-V1, WO-O4O-USER-DOMAIN-FINALIZATION-V1, WO-O4O-USER-DOMAIN-CLEANUP-V1

---

## 1. User Domain ERD

```
┌─────────────────────────────────────────────────────────────┐
│ users (Platform-Common Identity)                            │
│ PK: id (UUID)                                               │
│ UNIQUE: email                                               │
│ Columns: name, firstName, lastName, nickname, phone,        │
│          status, isActive, domain, password, avatar,         │
│          businessInfo, permissions, isEmailVerified,          │
│          refreshTokenFamily, lastLoginAt, loginAttempts,     │
│          provider, provider_id, onboardingCompleted,         │
│          tosAcceptedAt, privacyAcceptedAt, marketingAccepted │
│ DEPRECATED: service_key (→ service_memberships)             │
│ DROPPED: role, roles (→ role_assignments)                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────────────┐
    │             │                     │
    ▼             ▼                     ▼
┌────────────┐ ┌────────────┐ ┌─────────────────────┐
│ service_   │ │ role_      │ │ organization_       │
│ memberships│ │ assignments│ │ members             │
│ (SSOT)     │ │ (SSOT)     │ │ (Business Role)     │
├────────────┤ ├────────────┤ ├─────────────────────┤
│ user_id    │ │ user_id    │ │ user_id             │
│ service_key│ │ role       │ │ organization_id     │
│ status     │ │ is_active  │ │ role                │
│ role       │ │ scope_type │ │ is_active           │
│ approved_by│ │ scope_id   │ │                     │
│ approved_at│ │ valid_from │ │                     │
│            │ │ valid_until│ │                     │
├────────────┤ ├────────────┤ ├─────────────────────┤
│UQ: user_id │ │UQ: user_id │ │UQ: user_id          │
│  +svc_key  │ │  +role     │ │  +organization_id   │
│            │ │  +is_active│ │                     │
└────────────┘ └────────────┘ └─────────────────────┘
```

---

## 2. User Domain 테이블 역할 정의

| 테이블 | 역할 | SSOT 여부 | 상태 |
|--------|------|:---------:|------|
| `users` | Identity (신원 정보) | Identity SSOT | Core Frozen |
| `service_memberships` | 서비스별 멤버십 (가입/활성/정지) | **Service Membership SSOT** | Core Frozen |
| `role_assignments` | RBAC 역할 (권한) | **RBAC SSOT** | Core Frozen |
| `organization_members` | 조직 멤버십 (비즈니스 역할) | Business Role | Active |

### user_service_enrollments — DROPPED

`user_service_enrollments`는 WO-O4O-USER-DOMAIN-CLEANUP-V1에서 **DROP** 되었다.

- 이전 상태: Platform Service Catalog의 enrollment 워크플로우 테이블
- 실제 사용처: `PlatformServiceCatalogService` (5개 enrollment 메서드), KPA Society 프론트엔드
- 문제: `service_memberships`와 기능 중복 (이중 워크플로우)
- 조치: enrollment 로직을 `service_memberships` 기반으로 전환 후 테이블 DROP
- Migration: `20260316100000-DropUserServiceEnrollments`

---

## 3. 서비스 격리 표준

### 3-1. 서비스 멤버십 격리

서비스별 사용자 목록 조회 시 반드시 `service_memberships` JOIN 필요:

```sql
-- ✅ 표준 패턴
SELECT u.*
FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE sm.service_key = $1

-- ❌ 금지 패턴 1: service filter 없음
SELECT u.* FROM users u

-- ❌ 금지 패턴 2: legacy service_key 사용
SELECT u.* FROM users u WHERE u.service_key = $1
```

### 3-2. 역할 격리

서비스별 역할은 prefix 기반:

```
{serviceKey}:{roleName}
```

| 서비스 | Admin | Operator |
|--------|-------|----------|
| neture | `neture:admin` | `neture:operator` |
| glycopharm | `glycopharm:admin` | `glycopharm:operator` |
| glucoseview | `glucoseview:admin` | `glucoseview:operator` |
| k-cosmetics | `cosmetics:admin` | `cosmetics:operator` |
| kpa-society | `kpa:admin` | `kpa:operator` |

### 3-3. role_assignments.scope_type / scope_id

현재 상태: **스키마 정의됨, 인가 로직에서 미사용**

- `scope_type`: 'global' | 'organization' (기본값: 'global')
- `scope_id`: organization UUID (scope_type = 'organization' 시)
- RoleAssignmentService의 모든 조회 메서드에서 scope 필터 미적용
- 서비스 격리는 role prefix 기반으로 동작

결정: **현 상태 유지** (향후 조직 레벨 RBAC 확장 시 활용 가능)

---

## 4. Legacy 컬럼 상태

| 컬럼 | 상태 | WRITE | READ | 비고 |
|------|------|:-----:|:----:|------|
| `users.service_key` | **@deprecated** | 금지 | 가능 (debug 전용) | service_memberships로 대체 |
| `users.role` | **DROP 완료** | — | — | Phase3-E migration |
| `users.roles` | **DROP 완료** | — | — | Phase3-E migration |

`users.service_key`는 인덱스(`idx_users_service_key`)와 함께 DB에 유지되나:
- 신규 코드에서 **WRITE 금지** (WO-O4O-USER-DOMAIN-FINALIZATION-V1)
- User Entity에 `@deprecated` 표기됨
- 향후 DROP 대상 (service_memberships 100% 정착 확인 후)

---

## 5. 승인 흐름 (Registration → Approval → Membership)

```
회원가입 (auth.controller.ts)
  ├── INSERT users (Identity)
  └── INSERT service_memberships (status='pending')

승인 (3가지 경로):
  ├── Neture: operator-registration.service.ts
  │   └── UPDATE service_memberships SET status='active'
  │
  ├── General: MembershipConsoleController.ts
  │   └── UPDATE service_memberships SET status='active'
  │
  └── Admin: user-management.controller.ts
      └── UPDATE service_memberships SET status='active'

서비스 추가 (handoff.controller.ts)
  └── INSERT service_memberships (status='active')
```

---

## 6. Admin vs Operator 사용자 접근 경계

| API | Guard | 대상 |
|-----|-------|------|
| `GET /api/v1/admin/users` | `requireRole(['admin', 'super_admin'])` | 플랫폼 Admin 전용 |
| `GET /api/v1/operator/members` | `authenticate` + `injectServiceScope` | 서비스 Operator (서비스 격리) |
| `GET /api/v1/kpa/members` | `requireScope('kpa:operator')` | KPA 도메인 전용 |
| `GET /__debug__/*` | `authenticate` + `requireAdmin` | 플랫폼 Admin 전용 |

서비스 운영자(Operator)는 `/api/v1/operator/members`를 통해
자신의 서비스에 속한 사용자만 조회할 수 있다.

---

## 7. User Query 규칙

| 시나리오 | 패턴 |
|---------|------|
| 서비스 사용자 목록 | `JOIN service_memberships WHERE service_key = $1` |
| 단일 사용자 조회 (인증 컨텍스트) | `WHERE id = $1` (auth 미들웨어 통과 후) |
| 역할 기반 사용자 목록 | `JOIN role_assignments WHERE role LIKE '{service}:%'` |
| 조직 멤버 목록 | `JOIN organization_members WHERE organization_id = $1` |

---

## 8. Platform Service Catalog

`platform_services` 테이블은 서비스 카탈로그 (목록/노출/추천 정보)를 관리한다.

| API | 기능 |
|-----|------|
| `GET /api/v1/platform-services` | 가시 서비스 목록 (로그인 시 membership 상태 포함) |
| `GET /api/v1/admin/platform-services` | Admin 전체 서비스 목록 |
| `PATCH /api/v1/admin/platform-services/:code` | 서비스 설정 수정 |

멤버십 상태는 `service_memberships` 테이블에서 조회한다 (enrollment 워크플로우 제거됨).

---

## 9. 참조

| 문서 | 용도 |
|------|------|
| `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` | RBAC SSOT (F9) |
| `docs/architecture/O4O-CORE-FREEZE-V1.md` | Core 모듈 동결 (F10) |
| `docs/architecture/O4O-BOUNDARY-POLICY-V1.md` | 경계 정책 (F6) |
| `docs/audit/IR-O4O-USER-DOMAIN-AUDIT-V1.md` | 전수 조사 결과 |
| `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` | Admin/Operator 역할 표준 |

---

*Version: 3.0*
*Status: Active*
