# WO-KPA-B-AUTH-MEMBERSHIP-STATE-AUDIT-V1

> KPA-b 가입→승인→로그인→역할 분기 전체 흐름 상태 머신 조사
> Audit Date: 2026-02-28 | Status: READ-ONLY INVESTIGATION

---

## 1. 상태 전이도 (ASCII)

```
┌──────────────────────────────────────────────────────────────────┐
│                    IDENTITY LAYER (users)                        │
│                                                                  │
│  [Register]                                                      │
│      │                                                           │
│      ▼                                                           │
│  users.status = PENDING  ──── 로그인 차단 ────                    │
│      │                                                           │
│      │  (KPA Member 승인 시 함께 변경)                            │
│      ▼                                                           │
│  users.status = ACTIVE   ──── 로그인 가능 ────                    │
│      │                                                           │
│      │  (정지 시)                                                 │
│      ▼                                                           │
│  users.status = SUSPENDED ─── 로그인 차단 ────                    │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              KPA MEMBERSHIP LAYER (kpa_members)                  │
│              SSOT: kpa_members.status + kpa_members.role         │
│                                                                  │
│  [POST /kpa/members/apply]                                       │
│      │                                                           │
│      ▼                                                           │
│  kpa_members.status = 'pending'                                  │
│  kpa_member_services.status = 'pending'                          │
│      │                                                           │
│      │  [PATCH /kpa/members/:id/status → active]                 │
│      │  (kpa:operator 권한)                                      │
│      ▼                                                           │
│  kpa_members.status = 'active'      ◄─── 재활성화 가능           │
│  kpa_member_services.status = 'approved'                         │
│  users.status → ACTIVE                                           │
│  role_assignments + kpa:pharmacist/student                       │
│      │                                                           │
│      ├── [정지] ──► kpa_members.status = 'suspended'             │
│      │              users.status → SUSPENDED                     │
│      │              role_assignments − kpa:pharmacist/student     │
│      │                                                           │
│      └── [탈퇴] ──► kpa_members.status = 'withdrawn'             │
│                     role_assignments − kpa:pharmacist/student     │
│                     (users.status 변경 없음!)                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│           ORGANIZATION LAYER (organization_members)              │
│           SSOT: organization_members.role + leftAt              │
│                                                                  │
│  [POST /kpa/organization-join-requests]                          │
│      │                                                           │
│      ▼                                                           │
│  kpa_organization_join_requests.status = 'pending'               │
│      │                                                           │
│      ├── [PATCH /:id/approve] (kpa:admin 권한)                   │
│      │       │                                                   │
│      │       ▼                                                   │
│      │   organization_members 생성                               │
│      │   role = requested_role (admin/manager/member/moderator)  │
│      │   leftAt = NULL (활성)                                    │
│      │   users.status → ACTIVE (if not already)                  │
│      │                                                           │
│      └── [PATCH /:id/reject] ──► status = 'rejected'            │
│                                                                  │
│  [탈퇴] ──► leftAt = NOW() (소프트 삭제)                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. API Evidence Table

### 가입/신청 API

| Endpoint | Method | Auth | Scope | 생성 테이블 | 기본 status |
|----------|--------|------|-------|------------|-------------|
| `/kpa/members/apply` | POST | Required | None | kpa_members, kpa_member_services, kpa_pharmacist_profiles | pending |
| `/kpa/organization-join-requests` | POST | Required | None | kpa_organization_join_requests | pending |
| `/kpa/organization-join-requests/my` | GET | Required | None | (조회) | — |

### 승인/관리 API

| Endpoint | Method | Scope | 변경 테이블 | 상태 변경 |
|----------|--------|-------|------------|----------|
| `/kpa/members/:id/status` | PATCH | kpa:operator | kpa_members, users, role_assignments, kpa_member_services | pending→active/suspended/withdrawn |
| `/kpa/organization-join-requests/:id/approve` | PATCH | kpa:admin | organization_members, users, role_assignments | pending→approved, org member 생성 |
| `/kpa/organization-join-requests/:id/reject` | PATCH | kpa:admin | kpa_organization_join_requests | pending→rejected |

### 조회 API

| Endpoint | Method | Scope | 소스 테이블 | 반환 필드 |
|----------|--------|-------|------------|----------|
| `/kpa/me/membership` | GET | auth | kpa_members + organizations | role, status, organizationId, organizationType, organizationName, parentId |
| `/auth/me` | GET | auth | users + role_assignments + kpa_pharmacist_profiles + organization_members | roles, scopes, pharmacistRole, pharmacistFunction, isStoreOwner |

### Evidence: 코드 위치

| 항목 | 파일 | 라인 |
|------|------|------|
| KPA Member 승인 | member.controller.ts | 288-399 |
| Org Join Request 승인 | organization-join-request.controller.ts | 298-429 |
| 로그인 차단 | authentication.service.ts | 176-180 |
| /kpa/me/membership | kpa.routes.ts | 253-283 |
| /auth/me 응답 빌드 | auth.controller.ts | 515-560 |
| derivePharmacistQualification | auth.controller.ts | 43-88 |
| roleAssignmentService.assignRole | member.controller.ts | 319-323 |

---

## 3. DB Separation Table

### 세 개의 독립 상태 시스템

| 테이블 | SSOT 대상 | 상태 컬럼 | 유효값 | 역할 컬럼 | 유효값 |
|--------|----------|----------|--------|----------|--------|
| **users** | Identity/로그인 | status | PENDING, ACTIVE, APPROVED, SUSPENDED | — | (deprecated) |
| **kpa_members** | KPA 회원 자격 | status | pending, active, suspended, withdrawn | role | member, operator, admin |
| **organization_members** | 조직 소속 | (없음, leftAt으로 판정) | leftAt=NULL→활성, leftAt!=NULL→탈퇴 | role | admin, manager, member, moderator, owner |
| **kpa_member_services** | 서비스별 승인 | status | pending, approved, rejected, suspended | — | — |
| **role_assignments** | RBAC 플랫폼 역할 | — | — | role | kpa:pharmacist, kpa:student, kpa:admin, kpa:operator |

### 상태 동기화 관계

```
KPA Member 승인 (pending → active):
  kpa_members.status     = 'active'           ← 직접 UPDATE
  kpa_member_services    = 'approved'          ← 직접 UPDATE
  users.status           = 'active'            ← 직접 UPDATE
  role_assignments       + kpa:pharmacist      ← roleAssignmentService.assignRole()

Org Join Request 승인:
  organization_members   = 생성 (role=requested_role) ← memberService.addMember()
  users.status           = 'active' (if != active)     ← 직접 UPDATE
  role_assignments       변경 없음!                     ← ❌ Org role은 role_assignments에 미반영
```

---

## 4. 로그인 이후 Route 분기 흐름도

```
사용자 로그인 성공
  │
  ▼
checkAuth() → /auth/me + /kpa/me/membership
  │
  ├── user.roles = ['kpa:admin'] or ['kpa:operator']
  │   └── getDefaultRouteByRole() → '/operator'
  │       └── Operator/Admin Dashboard
  │
  ├── user.membershipRole = 'admin' or 'operator'  (kpa_members.role)
  │   └── getDefaultRouteByRole() → '/branch-services'
  │       └── BranchServicesPage (분회 서비스 허브)
  │           ├── /branch-services/:branchId/admin/*
  │           │   └── BranchAdminAuthGuard
  │           │       ├── kpa:admin role → BYPASS (모든 분회 접근)
  │           │       └── /kpa/me/membership → orgId + role 검증
  │           └── /branch-services/:branchId/operator/*
  │               └── BranchOperatorAuthGuard (동일 패턴)
  │
  └── 일반 사용자 (membershipRole = 'member' or undefined)
      └── getDefaultRouteByRole() → '/dashboard'
          │
          ▼
        AuthGate 판정
          │
          ├── membershipStatus = 'pending' or 'suspended'
          │   └── /pending-approval (PendingApprovalPage)
          │
          ├── activityType 미설정 + 비면제
          │   └── /setup-activity (ActivitySetupPage)
          │
          └── 정상
              └── UserDashboardPage (activityType 기반 카드 차등)
```

### Route Decision SSOT

| 판정 단계 | SSOT 소스 | 읽기 위치 |
|----------|----------|----------|
| Platform vs Branch vs User | user.roles + membershipRole | getDefaultRouteByRole() (auth-utils.ts:12) |
| 승인 대기 | user.membershipStatus | AuthGate.tsx:31 |
| 직능 설정 필요 | user.activityType + isExempt | AuthGate.tsx:36 |
| 분회 Admin 권한 | /kpa/me/membership → role | BranchAdminAuthGuard |
| 약국경영 접근 | user.isStoreOwner | PharmacyGuard |

---

## 5. Gap List

### HIGH

| # | Gap | 위치 | 영향 | 설명 |
|---|-----|------|------|------|
| H1 | **membershipStatus 범위 모호** | AuthGate.tsx:31 | UX 차단 오류 가능 | `membershipStatus`는 `kpa_members.status` 기반. Org Join Request 대기 중인 사용자는 kpa_members.status=active일 수 있어 AuthGate를 통과하지만, 실제 분회 접근 불가 |
| H2 | **Org role이 role_assignments 미반영** | organization-join-request.controller.ts:369 | Guard 비대칭 | org join 승인 시 organization_members.role만 설정, role_assignments에는 미기록. 분회 역할은 매번 API 호출로만 확인 가능 |
| H3 | **/auth/me에 membershipStatus 미포함** | auth.controller.ts:530 | 프론트 추가 API 필요 | `/auth/me` 응답에 kpa_members.status 없음. 프론트가 `/kpa/me/membership` 별도 호출 필요 → 로딩 지연, 경쟁 상태 가능 |

### MEDIUM

| # | Gap | 위치 | 영향 | 설명 |
|---|-----|------|------|------|
| M1 | **탈퇴(withdrawn) 시 users.status 미변경** | member.controller.ts:331 | 계정 유령화 | role_assignments에서 역할 제거하지만 users.status는 'active' 유지. 탈퇴한 사용자가 다른 서비스에 여전히 로그인 가능 |
| M2 | **kpa_member_services 동기화 미보장** | member.controller.ts:356 | 데이터 불일치 | kpa_members.status와 kpa_member_services.status 간 FK 없음. 트랜잭션 중단 시 불일치 가능 |
| M3 | **분회 가입 신청 UI 부재** | BranchAdminAuthGuard | 사용자 접근 막힘 | joinRequestApi 백엔드 존재하나, 사용자가 분회에 가입 신청하는 프론트 UI 없음. 권한 없음 시 "돌아가기"만 표시 |
| M4 | **분회 Admin 승인 UI 부재** | /branch-services/:branchId/admin/* | 운영 불가 | 분회 admin이 가입 신청을 승인할 수 있는 페이지가 /branch-services 내에 없음. 플랫폼 /operator에서만 가능 |

### LOW

| # | Gap | 위치 | 영향 | 설명 |
|---|-----|------|------|------|
| L1 | **Legacy 역할 상수 잔존** | role-constants.ts:24-26 | 혼란 | kpa:district_admin, kpa:branch_admin, kpa:branch_operator 상수 정의됨 (주석으로 "제거 예정" 표기) |
| L2 | **MemberApplyPage 데드 코드** | pages/MemberApplyPage.tsx | 코드 부풀림 | 레거시 가입 신청 페이지. App.tsx 라우트에 미등록, 사실상 데드 코드 |
| L3 | **분회 역할 → /branch-services 리다이렉트 맹목적** | auth-utils.ts:16 | UX 미흡 | membershipRole='admin'이면 무조건 /branch-services로 보내나, 어떤 분회인지 지정하지 않음 |

---

## 6. To-Be 단일 상태 머신 제안 (개념안)

### 현재: 3개 독립 상태 시스템

```
users.status          ← 로그인 게이트
kpa_members.status    ← KPA 회원 자격 + 서비스 접근
organization_members  ← 조직 소속 (status 컬럼 없음, leftAt으로 판정)
```

### 제안: 2-Layer 상태 모델

```
Layer 1: Identity (변경 없음)
  users.status = ACTIVE/SUSPENDED
  → 로그인 가능 여부만 판정
  → 변경 주체: KPA Member 승인 / Admin 정지

Layer 2: Service Context (통합)
  kpa_members.status = 'active' + organization_members.leftAt = NULL
  → 합산하여 "서비스 접근 컨텍스트" 판정
  → 프론트에 단일 API로 전달

  서비스 접근 상태:
  ┌────────────────┬──────────────────┬──────────────────┐
  │ kpa_members    │ org_members      │ 접근 수준         │
  ├────────────────┼──────────────────┼──────────────────┤
  │ active         │ 없음             │ KPA-a (커뮤니티)  │
  │ active         │ leftAt=NULL      │ KPA-a + KPA-b    │
  │ active         │ leftAt!=NULL     │ KPA-a만           │
  │ pending        │ —                │ 대기 화면          │
  │ suspended      │ —                │ 정지 화면          │
  │ withdrawn      │ —                │ 탈퇴 화면          │
  └────────────────┴──────────────────┴──────────────────┘
```

### 프론트 통합 판정 함수 (개념)

```typescript
function deriveServiceAccess(user: User): 'full' | 'community-only' | 'pending' | 'blocked' {
  // Layer 1: 로그인 자체가 차단되므로 이 함수 도달 불가

  // Layer 2: KPA 회원 상태
  if (user.membershipStatus === 'pending') return 'pending';
  if (user.membershipStatus === 'suspended') return 'blocked';
  if (user.membershipStatus === 'withdrawn') return 'blocked';

  // Layer 2: 조직 소속
  if (user.membershipOrgId) return 'full';        // KPA-a + KPA-b
  return 'community-only';                         // KPA-a only
}
```

### 서버 통합 제안: /auth/me 응답 확장

```typescript
// 현재 /auth/me + /kpa/me/membership 2번 호출 → 1번으로 통합
{
  ...existingFields,
  kpaMembership: {
    status: 'active',           // kpa_members.status
    role: 'member',             // kpa_members.role
    organizationId: 'uuid',     // kpa_members.organization_id
    organizationName: '종로구약사회',
    organizationType: 'branch',
    activityType: 'pharmacy_owner',
    isOrgMember: true,          // organization_members 존재 여부
    orgRole: 'admin',           // organization_members.role (있는 경우)
  }
}
```

이렇게 하면:
- 프론트 API 호출 1회로 축소
- AuthGate에서 kpa-a/kpa-b 접근 수준 동시 판정
- getDefaultRouteByRole() 판정이 더 정확

---

## 7. KPA-a vs KPA-b 구조 대칭성 비교

| 항목 | KPA-a (커뮤니티) | KPA-b (분회) | 대칭성 |
|------|-----------------|-------------|--------|
| 가입 API | POST /kpa/members/apply | POST /kpa/organization-join-requests | 별도 (적절) |
| 승인 API | PATCH /kpa/members/:id/status | PATCH /org-join-requests/:id/approve | 별도 (적절) |
| 승인 주체 | kpa:operator | kpa:admin | 분리됨 |
| 상태 SSOT | kpa_members.status | organization_members.leftAt | **비대칭** (컬럼 구조 다름) |
| 역할 SSOT | kpa_members.role | organization_members.role | 별도 테이블 (적절) |
| RBAC 연동 | roleAssignmentService ✅ | ❌ role_assignments 미사용 | **비대칭** |
| 프론트 Guard | AuthGate (상태 기반) | BranchAdminAuthGuard (API 기반) | **비대칭** |
| 대기 UI | PendingApprovalPage (공유) | PendingApprovalPage (공유) | 공유 (단, 맥락 구분 없음) |
| 가입 UI | 없음 (공개 접근) | **없음** (UI 미구현) | 둘 다 부재 |
| 역할 분기 | activityType 기반 카드 차등 | BranchAdmin/Operator Guard | **비대칭** (설계상 적절) |

---

## 8. 조사 요약

### 작동하는 것

1. **로그인 게이트**: users.status 기반 차단 정상 동작 (authentication.service.ts:177)
2. **KPA Member 승인 → RBAC**: roleAssignmentService 정상 연동 (member.controller.ts:319)
3. **Route 분기**: getDefaultRouteByRole() 3단계 분기 정상 (admin→/operator, branch→/branch-services, user→/dashboard)
4. **AuthGate 상태 기반**: pending/suspended → /pending-approval, activityType 미설정 → /setup-activity
5. **분회 Guard**: BranchAdminAuthGuard 2단계 검증 (fast: kpa:admin bypass, slow: API membership 확인)

### 구조적 위험

1. **2회 API 호출 의존**: /auth/me + /kpa/me/membership → 경쟁 상태, 로딩 지연
2. **Org role과 RBAC 단절**: organization_members.role이 role_assignments에 미반영
3. **탈퇴 시 users.status 미변경**: 유령 계정 가능성
4. **분회 가입/승인 UI 부재**: 백엔드 준비됨, 프론트 미구현

---

*Audit completed: 2026-02-28*
*Scope: KPA-b server + frontend full flow analysis*
*Changes: NONE (audit only)*
