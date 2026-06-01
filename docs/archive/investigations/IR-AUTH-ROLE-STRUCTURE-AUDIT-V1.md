# IR-AUTH-ROLE-STRUCTURE-AUDIT-V1

## WO-AUTH-IDENTITY-ROLE-NORMALIZATION-INVESTIGATION-V1

**Date**: 2026-02-26
**Status**: Investigation Complete
**Verdict**: RED (Role 체계 정규화 필요)

---

## 1. Executive Summary

O4O 플랫폼의 가입-로그인-역할 구조를 전수 조사한 결과,
**정상 모델(Identity-Qualification-BusinessRole-FunctionalRole 분리 구조)과
현재 구조 사이에 심각한 혼재가 존재**한다.

| 평가 | 등급 |
|------|------|
| Identity 분리 | GREEN — users 테이블 단일 출처 |
| Qualification 관리 | RED — 자격 검증 부재, 자기 신고 |
| Business Role 분리 | RED — pharmacistRole이 User 엔티티에 전역 저장 |
| Functional Role 분리 | YELLOW — 서비스 프리픽스 전환 중, 이중 시스템 |
| 약사 면허 검증 | RED — 검증 프로세스 전무 |

---

## 2. 정상 모델 기준

```
Identity (계정)
 ├─ Qualification (자격/직능): 약사, 약대생, 일반
 ├─ Business Role (사업자 역할): pharmacy_owner, store_owner
 └─ Functional Role (운영자/조직 권한): admin, operator, 임원, 위원
```

**원칙**:
- Identity는 하나, 서비스 간 공유
- Qualification은 검증 기반 (면허 검증)
- Business Role은 사업체 소유/운영 시점에 부여
- Functional Role은 서비스별 네임스페이스 분리
- 임원/위원/위원장은 KPA-b, KPA-c 조직 서비스에만 존재

---

## 3. 현재 구조 다이어그램

```
┌──────────────────────────────────────────────────────────────┐
│                      users (Identity)                        │
│                                                              │
│  id, email, password, name, phone, avatar                    │
│                                                              │
│  ┌── DEPRECATED ──────────────────────────────────────────┐  │
│  │ role (ENUM)        — 단일 레거시 역할                    │  │
│  │ roles (TEXT[])     — 복수 레거시 역할 배열                │  │
│  │ dbRoles (M2M)      — user_roles 조인 테이블              │  │
│  │ activeRole (FK)    — 활성 역할 선택기                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌── QUALIFICATION (전역, 미검증) ────────────────────────┐  │
│  │ pharmacist_function — pharmacy|hospital|industry|other  │  │
│  │ pharmacist_role     — general|pharmacy_owner|hospital   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌── BUSINESS INFO ──────────────────────────────────────┐  │
│  │ business_info (JSON) — businessName, businessNumber    │  │
│  │ service_key          — 데이터 격리 키                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  permissions (JSON), status, isActive, isEmailVerified       │
└──────────────────────────────────────────────────────────────┘
         │
         │  1:N
         ▼
┌──────────────────────────────────────────────────────────────┐
│              role_assignments (P0 RBAC — SSOT)               │
│                                                              │
│  user_id, role (VARCHAR 50), is_active, valid_from,          │
│  valid_until, assigned_by, scope_type, scope_id              │
│                                                              │
│  Roles: 'platform:super_admin', 'kpa:admin',                │
│         'glycopharm:operator', 'cosmetics:seller', ...       │
│  UNIQUE(user_id, role, is_active)                            │
└──────────────────────────────────────────────────────────────┘
         │
         │  별도 테이블
         ▼
┌──────────────────┐  ┌───────────────────┐  ┌───────────────────────┐
│   kpa_members    │  │  kpa_stewards     │  │ kpa_branch_officers   │
│                  │  │                   │  │                       │
│ user_id          │  │ member_id         │  │ member_id (nullable)  │
│ organization_id  │  │ organization_id   │  │ organization_id       │
│ role (member/    │  │ scope_type        │  │ role (president/      │
│   operator/admin)│  │ scope_id          │  │   secretary/...)      │
│ membership_type  │  │ is_active         │  │ position (display)    │
│ license_number   │  │ assigned_by       │  │ term_start/end        │
│ activity_type    │  │                   │  │                       │
│ status           │  │                   │  │                       │
└──────────────────┘  └───────────────────┘  └───────────────────────┘
         │
         │  1:N
         ▼
┌──────────────────────┐     ┌──────────────────────────────┐
│ kpa_member_services  │     │ user_service_enrollments      │
│                      │     │                              │
│ member_id            │     │ user_id                      │
│ service_key          │     │ service_code                 │
│ status (pending/     │     │ status (not_applied/         │
│   approved/rejected) │     │   applied/approved/rejected) │
└──────────────────────┘     └──────────────────────────────┘

┌────────────────────────────┐
│ cosmetics_store_members    │
│ (cosmetics schema 격리)     │
│                            │
│ store_id, user_id          │
│ role (owner/manager/staff) │
└────────────────────────────┘
```

---

## 4. 서비스별 Role 구조 비교표

| 서비스 | 가입 방식 | Role 저장 위치 | Role 부여 시점 | 검증 |
|--------|----------|---------------|--------------|------|
| **Auth Core** | 자유 가입 | users.role, users.roles | 가입 시 (user/customer) | 없음 |
| **KPA-a (커뮤니티)** | Auth Core + auto-enroll | kpa_members.role | 가입 시 member/pending | 없음 |
| **KPA-b (지부)** | Admin 생성 | kpa_branch_officers.role | Admin 수동 | 없음 |
| **KPA-c (분회)** | Admin 생성 | kpa_stewards.scope_type | Admin 수동 | 없음 |
| **GlycoPharm** | 신청서 기반 | role_assignments + users.roles | 승인 시 glycopharm:store_owner | 없음 |
| **Cosmetics** | 신청서 기반 | cosmetics_store_members.role | 승인 시 owner | 없음 |
| **Neture** | 신청서 기반 | neture_suppliers.user_id FK | 승인 시 ACTIVE | 없음 |
| **Store Domain** | 매장 생성 연동 | organization_service_enrollments | 매장 승인 시 | 없음 |
| **RBAC (P0)** | Admin 부여 | role_assignments | Admin 수동 | 없음 |

---

## 5. 혼재/중복 항목 분석

### 5-A. Qualification 혼재

| # | 문제 | 위치 | 영향도 |
|---|------|------|--------|
| Q1 | `pharmacistRole`이 User 엔티티(전역)에 저장됨 | `users.pharmacist_role` | **HIGH** |
| Q2 | `pharmacistFunction`이 User 엔티티(전역)에 저장됨 | `users.pharmacist_function` | **HIGH** |
| Q3 | `kpa_members.membership_type`과 User.pharmacistRole 이중 관리 | users + kpa_members | **HIGH** |
| Q4 | `kpa_members.activity_type` (10종)과 `User.pharmacistFunction` (4종) 불일치 | users + kpa_members | **MEDIUM** |
| Q5 | `kpa_members.license_number`과 `User.businessInfo.licenseNumber` 이중 저장 | users + kpa_members | **MEDIUM** |
| Q6 | 약사 면허번호 검증 부재 — 중복 체크만 존재 | kpa member controller | **RED** |

**분석**: pharmacistRole/pharmacistFunction은 KPA 서비스의 Qualification인데
User 엔티티(전역 Identity)에 저장되어 있다.
이는 KPA가 아닌 서비스(GlycoPharm, Cosmetics)에서도 이 필드에 접근 가능하며,
Qualification이 Identity와 분리되지 않은 상태이다.

### 5-B. Business Role 혼합

| # | 문제 | 위치 | 영향도 |
|---|------|------|--------|
| B1 | `pharmacy_owner`가 `users.pharmacist_role`에 VARCHAR로 저장 | users 테이블 | **HIGH** |
| B2 | `glycopharm:store_owner`가 `users.roles[]`에 추가 (승인 시) | users.roles 배열 | **HIGH** |
| B3 | Business Role과 Qualification이 같은 필드(`pharmacist_role`)에 혼합 | users 테이블 | **RED** |
| B4 | `cosmetics_store_members.role = 'owner'`는 별도 테이블 — 일관성 부재 | cosmetics schema | **MEDIUM** |

**분석**: `pharmacy_owner`는 사업자 역할(Business Role)인데
`users.pharmacist_role` 필드에 약사 직무(Qualification)와 함께 저장된다.
`general`, `hospital`, `other`는 Qualification이고 `pharmacy_owner`만 Business Role이다.
하나의 필드에 두 가지 성격의 값이 공존한다.

### 5-C. Functional Role 중복/전환 중

| # | 문제 | 위치 | 영향도 |
|---|------|------|--------|
| F1 | Legacy `users.role` (ENUM) + `users.roles` (TEXT[]) 아직 존재 | users 테이블 | **MEDIUM** |
| F2 | `role_assignments` (P0 RBAC)가 SSOT이지만 이중 시스템 | role_assignments + users | **MEDIUM** |
| F3 | `kpa_members.role`과 `role_assignments`의 역할 중복 가능 | kpa_members + role_assignments | **MEDIUM** |
| F4 | Branch officer 역할이 RBAC와 연결되지 않음 | kpa_branch_officers | **LOW** |
| F5 | Steward 역할이 RBAC와 연결되지 않음 | kpa_stewards | **LOW** |
| F6 | Legacy role 거부 로직은 있으나, 레거시 데이터 정리 미완 | auth.middleware | **MEDIUM** |

### 5-D. 서비스 간 침투

| # | 문제 | 위치 | 영향도 |
|---|------|------|--------|
| S1 | KPA 전용 필드(pharmacistRole)가 User 전역에 존재 → 모든 서비스 접근 가능 | users 테이블 | **HIGH** |
| S2 | GlycoPharm 승인 시 `users.roles[]`에 직접 push → RBAC 우회 | glycopharm admin controller | **HIGH** |
| S3 | `platform:admin`이 모든 서비스 admin 체크를 통과 → 의도적 설계이나 문서화 부재 | role.utils.ts | **LOW** |
| S4 | `pharmacistRole = 'pharmacy_owner'`와 `KpaMember.membership_type = 'student'` 동시 가능 — 충돌 검증 없음 | users + kpa_members | **HIGH** |

---

## 6. 약사 면허 검증 프로세스 조사 결과

### 현재 상태: **검증 전무**

| 항목 | 상태 | 위치 |
|------|------|------|
| 면허번호 저장 | O | `kpa_members.license_number`, `users.business_info.licenseNumber` |
| 면허번호 중복 체크 | O | `kpa member controller` — 동일 번호 재등록 방지 |
| 면허번호 형식 검증 | X | 형식 규칙 없음 (자유 입력) |
| 외부 DB 검증 | X | 대한약사회/보건복지부 면허 DB 연동 없음 |
| 수동 검증 워크플로우 | X | 관리자 승인 시 면허 확인 절차 없음 |
| 면허 만료/취소 추적 | X | 면허 상태 변경 추적 없음 |

### 위험 시나리오

1. **비약사가 약사로 가입** → `pharmacistRole = 'pharmacy_owner'` 자기 신고 가능
2. **면허 도용** → 다른 사람의 면허번호 입력 가능 (중복 체크만 존재)
3. **면허 취소 후 계속 사용** → 면허 상태 추적 없음
4. **약대생이 pharmacy_owner 신고** → `User.pharmacistRole`과 `KpaMember.membership_type` 교차 검증 없음

---

## 7. 가입 프로세스 상세 흐름

### Auth Core (POST /api/v1/auth/register)

```
사용자 입력:
  email, password, firstName, lastName, nickname, phone
  membershipType: 'pharmacist' | 'student' (선택)
  licenseNumber (선택, 약사만)
  pharmacistFunction, pharmacistRole (선택, 자기 신고)
  businessName, businessNumber (선택)
  organizationId (선택, KPA 자동 등록용)
  service: 'kpa-society' | 'platform' | ... (데이터 격리 키)

처리:
  1. User 생성 (role = 'user'/'customer', status = 'PENDING')
  2. pharmacistFunction, pharmacistRole 저장 (검증 없음)
  3. businessInfo JSON 저장
  4. if (service === 'kpa-society' && organizationId):
     → kpa_members 레코드 생성 (role='member', status='pending')
     → kpa_member_services 생성 (service_key='kpa-a', status='pending')
  5. 이메일 인증 요청 (비차단)
  6. 자동 로그인 없음 — 운영자 승인 대기
```

### GlycoPharm 매장 가입 (POST /api/v1/glycopharm/applications)

```
입력: organizationType, organizationName, businessNumber, serviceTypes, requestedSlug
상태: submitted → 운영자 검토

승인 시 (PATCH /:id/review):
  1. OrganizationStore 생성 (type='pharmacy')
  2. GlycopharmPharmacyExtension 생성
  3. organization_service_enrollments 생성
  4. users.roles[] 에 'glycopharm:store_owner' 직접 push  ← 문제점
  5. Slug 예약
```

### Cosmetics 매장 가입 (POST /api/v1/cosmetics/stores/apply)

```
입력: store_name, business_number, owner_name, contact_phone, address
상태: draft/submitted → 관리자 검토

승인 시:
  1. cosmetics_stores 레코드 생성 (격리 스키마)
  2. cosmetics_store_members 생성 (role='owner')
```

---

## 8. 로그인/인증 후 처리 구조

### JWT Token Claims

```typescript
{
  userId: string,
  email: string,
  role: UserRole,           // deprecated, 하위호환
  roles: string[],          // ['kpa:admin', 'platform:super_admin']
  permissions: string[],
  scopes: string[],         // ['kpa:membership:manage', 'glycopharm:products:read']
  domain: 'neture.co.kr',
  tokenType: 'user',
  iss: 'o4o-platform',
  aud: 'o4o-api',
  exp: 15분
}
```

### Guard 체계

| Guard | 확인 대상 | 소스 |
|-------|----------|------|
| `requireAuth` | User.isActive | users 테이블 |
| `requireAdmin` | platform:admin / platform:super_admin | role_assignments |
| `requireRole(roles)` | 지정 역할 보유 | role_assignments |
| `requireOrgRole(min)` | KPA 조직 내 역할 계층 | kpa_members |
| `requireScope(scope)` | 스코프 문자열 | JWT claims |
| `hasAnyServiceRole` | 서비스 프리픽스 역할 | JWT claims (roles[]) |
| `isStoreOwnerRole` | 매장 소유자 | JWT roles + pharmacistRole |

### Scope 계층

```
public → member → operator → admin (누적)

예: kpa 서비스
  public:   kpa:info:read
  member:   + kpa:membership:read, kpa:events:read
  operator: + kpa:membership:manage, kpa:forum:*, kpa:content:manage
  admin:    + kpa:admin:access
```

---

## 9. 역할 변경 프로세스

| 변경 유형 | 셀프서비스 | Admin 게이트 | 자동 부여 |
|----------|:---------:|:-----------:|:--------:|
| RBAC 역할 부여 | X | O | X |
| RBAC 역할 제거 | X | O | X |
| KPA 회원 등록 | O (신청) | O (승인) | X |
| KPA 임원 부여 | X | O | X |
| KPA Steward 부여 | X | O | X |
| pharmacistFunction 변경 | O (가입 시) | X | X |
| pharmacistRole 변경 | O (가입 시) | X | X |
| 면허번호 변경 | O (가입 시) | X | X |
| 매장 소유자 역할 | X | O (승인 시 자동) | O |
| 역할 만료 | — | — | O (valid_until) |

**문제점**: 매장 비활성화 시 역할 자동 제거 없음. Admin이 수동으로 제거해야 함.

---

## 10. 문제 분류표

| # | 유형 | 설명 | 서비스 | 영향도 |
|---|------|------|--------|--------|
| 1 | Qualification 혼재 | pharmacistRole이 User 전역에 저장 (KPA 전용이어야 함) | Auth Core | **HIGH** |
| 2 | Qualification 미검증 | 약사 면허 검증 프로세스 전무 | 전체 | **RED** |
| 3 | BusinessRole 혼합 | pharmacy_owner가 pharmacistRole 필드에 Qualification과 혼합 | Auth Core | **RED** |
| 4 | FunctionalRole 이중 시스템 | users.roles[] + role_assignments 공존 | Auth Core | **MEDIUM** |
| 5 | Qualification 이중 관리 | User.pharmacistRole vs KpaMember.membership_type 교차 검증 없음 | KPA-a | **HIGH** |
| 6 | Qualification 이중 저장 | license_number가 users.businessInfo + kpa_members 양쪽 저장 | Auth Core + KPA | **MEDIUM** |
| 7 | 서비스 침투 | GlycoPharm 승인 시 users.roles[]에 직접 push (RBAC 우회) | GlycoPharm | **HIGH** |
| 8 | Qualification 세분도 불일치 | User.pharmacistFunction (4종) vs KpaMember.activity_type (10+종) | KPA | **MEDIUM** |
| 9 | 역할 비활성화 누락 | 매장 비활성화 시 owner 역할 자동 제거 없음 | Store Domain | **MEDIUM** |
| 10 | Legacy 정리 미완 | users.role, users.roles, dbRoles 등 deprecated 필드 잔존 | Auth Core | **MEDIUM** |
| 11 | Branch Officer 비연결 | kpa_branch_officers.role이 RBAC과 연결 안 됨 | KPA-b/c | **LOW** |
| 12 | Steward 비연결 | kpa_stewards가 RBAC과 연결 안 됨 | KPA-b/c | **LOW** |

---

## 11. 정상 모델 대비 차이점

### Identity (계정) — GREEN

```
현재: users 테이블 단일 출처 ✓
정상: Identity는 하나, 서비스 간 공유
차이: 없음. Identity 분리는 정상.
```

### Qualification (자격/직능) — RED

```
정상:
  - 자격은 검증 기반 (면허 검증)
  - 서비스별 분리 저장
  - Identity와 독립

현재:
  ✗ 자격(pharmacistRole/Function)이 User 엔티티에 전역 저장
  ✗ 약사 면허 검증 없음 (자기 신고)
  ✗ kpa_members.membership_type과 User.pharmacistRole 이중 관리
  ✗ pharmacy_owner(사업자 역할)가 pharmacistRole(자격)에 혼합
  ✗ 면허번호 이중 저장 (users.businessInfo + kpa_members)
```

### Business Role (사업자 역할) — RED

```
정상:
  - 사업체 소유/운영 시점에 부여
  - 서비스별 독립 관리
  - Qualification과 분리

현재:
  ✗ pharmacy_owner가 users.pharmacist_role에 저장 (Qualification 필드)
  ✗ glycopharm:store_owner는 users.roles[]에 직접 push (RBAC 우회)
  ✗ cosmetics는 별도 store_members 테이블 사용 (일관성 없음)
  ✗ 매장 비활성화 시 Business Role 자동 제거 없음
```

### Functional Role (운영자/조직 권한) — YELLOW

```
정상:
  - 서비스별 네임스페이스 분리
  - 임원/위원은 KPA-b/c에만 존재
  - RBAC 단일 소스

현재:
  ✓ 서비스 프리픽스 (kpa:admin, platform:super_admin) 도입 완료
  ✓ role_assignments 테이블 (P0 RBAC) SSOT
  ✗ Legacy users.role/roles[] 아직 존재 (이중 시스템)
  ✗ kpa_members.role과 role_assignments 중복 가능
  ✗ Branch officers/Stewards가 RBAC과 비연결
  ~ 임원/위원은 KPA-b/c에만 존재 (정상) ✓
```

---

## 12. 종합 판정

| 영역 | 판정 | 근거 |
|------|------|------|
| Identity | GREEN | users 단일 출처 |
| Qualification | RED | 미검증, 전역 저장, 이중 관리, 혼합 |
| Business Role | RED | Qualification 필드에 혼합, RBAC 우회, 비일관 |
| Functional Role | YELLOW | 전환 진행 중, 이중 시스템 잔존 |
| 약사 면허 검증 | RED | 검증 프로세스 전무, 자기 신고 |
| **종합** | **RED** | **Role 체계 정규화 필요** |

---

## 13. 핵심 파일 참조

| 컴포넌트 | 경로 |
|----------|------|
| User Entity | `apps/api-server/src/modules/auth/entities/User.ts` |
| RoleAssignment Entity | `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` |
| RoleAssignment Service | `apps/api-server/src/modules/auth/services/role-assignment.service.ts` |
| Auth Middleware | `apps/api-server/src/middleware/auth.middleware.ts` |
| Role Utilities | `apps/api-server/src/utils/role.utils.ts` |
| Role Types | `apps/api-server/src/types/roles.ts` |
| Auth Types | `apps/api-server/src/types/auth.ts` |
| Scope Assignment | `apps/api-server/src/utils/scope-assignment.utils.ts` |
| Service Scopes | `apps/api-server/src/config/service-scopes.ts` |
| KPA Member Entity | `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` |
| KPA Member Service Entity | `apps/api-server/src/routes/kpa/entities/kpa-member-service.entity.ts` |
| KPA Steward Entity | `apps/api-server/src/routes/kpa/entities/kpa-steward.entity.ts` |
| KPA Branch Officer Entity | `apps/api-server/src/routes/kpa/entities/kpa-branch-officer.entity.ts` |
| Cosmetics Store Member | `apps/api-server/src/routes/cosmetics/entities/cosmetics-store-member.entity.ts` |
| User Service Enrollment | `apps/api-server/src/entities/UserServiceEnrollment.ts` |
| Auth Controller (Register) | `apps/api-server/src/modules/auth/controllers/auth.controller.ts` |
| Register DTO | `apps/api-server/src/modules/auth/dto/register.dto.ts` |
| Token Utilities | `apps/api-server/src/utils/token.utils.ts` |
| GlycoPharm Admin (Approval) | `apps/api-server/src/routes/glycopharm/controllers/admin.controller.ts` |
| Cosmetics Store Controller | `apps/api-server/src/routes/cosmetics/controllers/cosmetics-store.controller.ts` |

---

## 14. 향후 정규화 예상 범위

### Phase 2 — 정상 모델 설계 확정 시 예상 변경

1. **Qualification 분리**: `pharmacistRole`, `pharmacistFunction`을 User에서 제거 → 서비스별 자격 테이블로 이동
2. **Business Role 분리**: `pharmacy_owner`를 pharmacistRole에서 제거 → 별도 Business Role 시스템
3. **면허 검증 워크플로우**: 면허번호 형식 검증 + Admin 수동 확인 절차 최소 도입
4. **이중 시스템 정리**: Legacy users.role/roles[]/dbRoles 컬럼 제거
5. **RBAC 통합**: GlycoPharm 승인 시 users.roles[] push → role_assignments 사용으로 전환
6. **교차 검증**: User.pharmacistRole과 KpaMember.membership_type 일관성 검증

### 예상 수정 파일 규모

| 영역 | 파일 수 | 위험도 |
|------|---------|--------|
| User Entity + Auth | ~5 | HIGH |
| KPA Members | ~8 | MEDIUM |
| GlycoPharm Approval | ~3 | MEDIUM |
| Role Utilities | ~4 | MEDIUM |
| Frontend Auth | ~10+ | MEDIUM |
| Migration | ~3 | HIGH |
| **합계** | **~33+** | — |

---

*Investigation completed: 2026-02-26*
*Investigator: Claude Code*
*Status: Ready for Phase 2 (정상 모델 설계 확정)*
