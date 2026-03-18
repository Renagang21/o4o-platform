# IR-O4O-OPERATOR-USER-MANAGEMENT-AUDIT-V1

> **O4O 운영자 회원관리 표준 정의를 위한 현황 조사 보고서**
>
> 조사일: 2026-03-18
> 대상: 4개 서비스 (neture, glycopharm, kpa-society, k-cosmetics) + glucoseview + account

---

## 1. Executive Summary

O4O 플랫폼의 운영자 회원관리는 **3-Layer 아키텍처**로 구성:

| Layer | 역할 | 엔드포인트 |
|-------|------|-----------|
| **Platform Admin** | 전체 사용자 CRUD + 역할 관리 | `/api/v1/admin/users` |
| **Operator Console** | 서비스 범위 회원 관리 (MembershipConsole) | `/api/v1/operator/members` |
| **Service-Specific** | 도메인별 고유 로직 (KPA 약사 등) | `/api/v1/{service}/members` |

### 현재 구현 수준

| 서비스 | Frontend | Backend | Detail Page | Role Mgmt | Business Info | 상태 |
|--------|----------|---------|-------------|-----------|---------------|------|
| **K-Cosmetics** | UsersPage + UserDetailPage | MembershipConsole | ✅ 완전 | ✅ CRUD | ✅ 표시 | **가장 완성도 높음** |
| **GlycoPharm** | UsersPage + UserDetailPage | MembershipConsole | ✅ 기본 | ❌ 없음 | ❌ 없음 | 기능 일부 누락 |
| **GlucoseView** | UsersPage + UserDetailPage | MembershipConsole | ✅ 기본 | ❌ 없음 | ❌ 없음 | GlycoPharm과 동일 |
| **Neture** | UsersManagementPage | MembershipConsole + 자체 | ❌ 없음 | ❌ 없음 | ❌ 없음 | 목록만, 상세 없음 |
| **KPA Society** | MembersPage (mock) | 자체 member.controller | ❌ 목업 | ❌ 없음 | N/A | **API 미연동** |

---

## 2. Backend API 구조

### 2.1 Platform Admin API (`/api/v1/admin/users`)

**Controller:** `AdminUserController.ts`
**Guard:** `requireRole(['admin', 'super_admin', 'platform:admin', 'platform:super_admin'])`

| Method | Route | 기능 |
|--------|-------|------|
| GET | `/` | 전체 사용자 목록 (페이지네이션, 검색, 상태/역할 필터) |
| GET | `/statistics` | 사용자 통계 (총, 활성, 상태별) |
| GET | `/:id` | 사용자 상세 |
| POST | `/` | 사용자 생성 + 역할 할당 + 서비스 멤버십 자동 생성 |
| PUT | `/:id` | 사용자 수정 (이름, 이메일, 역할, 상태) |
| PATCH | `/:id/status` | 상태 변경 |
| DELETE | `/:id` | 삭제 |

**핵심 로직:**
- 역할 필터: `role_assignments` EXISTS 서브쿼리 (Phase3-E 호환)
- 사용자 생성 시: `ensureServiceMemberships()` → 역할 prefix에서 serviceKey 추출 → 멤버십 자동 생성
- 기존 사용자에 역할 추가 가능 (WO-OPERATOR-MULTI-SERVICE-V1)

### 2.2 Operator MembershipConsole API (`/api/v1/operator/members`)

**Controller:** `MembershipConsoleController.ts`
**Guard:** `requireRole([...operator/admin roles...])` + `injectServiceScope`

| Method | Route | 기능 |
|--------|-------|------|
| GET | `/` | 서비스 범위 회원 목록 |
| GET | `/stats` | 회원 통계 |
| GET | `/:userId` | 회원 상세 (user + roles + memberships) |
| PUT | `/:userId` | 프로필 수정 (비밀번호, 이름, 사업자 정보) |
| PATCH | `/:userId/status` | 상태 변경 |
| DELETE | `/:userId` | 회원 삭제 (atomic: user + memberships + roles) |
| POST | `/:userId/roles` | 역할 할당 |
| DELETE | `/:userId/roles/:role` | 역할 제거 |
| PATCH | `/:membershipId/approve` | 멤버십 승인 (atomic 3-table) |
| PATCH | `/:membershipId/reject` | 멤버십 거절 |

**서비스 격리 (Boundary Enforcement):**
- Platform admin: 전체 접근 (선택적 serviceKey 필터)
- Service operator: `scope.serviceKeys`로 모든 쿼리 필터 강제
- 역할 prefix 경계: 자신의 서비스 prefix 외 역할 할당 불가

**승인 플로우 (MembershipApprovalService — Atomic Transaction):**
```
STEP0: SELECT membership FOR UPDATE (row lock)
STEP1: UPDATE service_memberships → status='active'
STEP2: UPDATE users → status='active', isActive=true
STEP3: INSERT INTO role_assignments ON CONFLICT → reactivate
COMMIT
```

### 2.3 KPA 자체 API (`/api/v1/kpa/members`)

| Method | Route | 기능 |
|--------|-------|------|
| GET | `/` | 약사 회원 목록 |
| GET | `/me` | 내 프로필 |
| POST | `/apply` | 가입 신청 (self-service) |
| PATCH | `/:id/status` | 상태 변경 (pending→active/suspended) |
| PATCH | `/:id/role` | 역할 변경 (member/operator/admin) |
| PATCH | `/me/profession` | 활동유형 변경 (self-service) |

**KPA 고유 동기화 로직:**
- 상태 변경 `active`: kpa_members + users + role_assignments + kpa_member_service 4곳 동시 업데이트
- 상태 변경 `suspended`: kpa_members + users + role removal 3곳 동시 업데이트
- 감사 로그: `kpa_audit_logs` 별도 테이블

### 2.4 Neture 자체 API

- `/api/v1/neture/operator/registrations/:userId/approve` — 가입 승인
- `/api/v1/neture/operator/registrations/:userId/reject` — 가입 거절
- 나머지는 MembershipConsole 공유

---

## 3. Database Entity 구조

### 3.1 Core Auth Entities (O4O Core Freeze F10)

#### users 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `email` | VARCHAR(255) UNIQUE | 로그인 ID |
| `password` | VARCHAR(255) | bcrypt 해시 |
| `firstName` | VARCHAR(100) | |
| `lastName` | VARCHAR(100) | |
| `name` | VARCHAR(200) | 표시 이름 (default: '운영자') |
| `nickname` | VARCHAR(100) | 포럼/공개 닉네임 |
| `phone` | VARCHAR(20) | |
| `status` | ENUM | PENDING/ACTIVE/APPROVED/INACTIVE/SUSPENDED/REJECTED |
| `isActive` | BOOLEAN | |
| `businessInfo` | JSON | 사업자 정보 (중첩 객체) |
| `serviceKey` | VARCHAR(100) | **DEPRECATED** — service_memberships로 대체 |
| `createdAt` | TIMESTAMP | |
| `updatedAt` | TIMESTAMP | |

**Runtime-only 속성 (DB 컬럼 아님):**
- `roles` — requireAuth 미들웨어에서 role_assignments로부터 설정
- `memberships` — JWT payload에서 설정

#### role_assignments 테이블 (RBAC SSOT)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `userId` | UUID FK→users | |
| `role` | VARCHAR(50) | 역할명 (예: 'kpa:operator', 'neture:admin') |
| `isActive` | BOOLEAN | 활성 여부 |
| `validFrom` | TIMESTAMP | 유효 시작 |
| `validUntil` | TIMESTAMP | 유효 종료 (NULL=무기한) |
| `assignedBy` | UUID | 할당자 |
| `scopeType` | VARCHAR(50) | 'global' or 'organization' |
| `scopeId` | UUID | 조직 ID (scopeType='organization' 시) |

**UNIQUE:** `(userId, role, isActive)`

#### service_memberships 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `userId` | UUID FK→users | |
| `serviceKey` | VARCHAR(100) | 서비스 키: neture/glycopharm/glucoseview/kpa-society/k-cosmetics |
| `status` | VARCHAR(50) | pending/active/suspended/rejected |
| `role` | VARCHAR(50) | 서비스 내 역할 (default: 'customer') |
| `approvedBy` | UUID | 승인자 |
| `approvedAt` | TIMESTAMP | |
| `rejectionReason` | TEXT | |

**UNIQUE:** `(userId, serviceKey)`

### 3.2 KPA 전용 Entity

#### kpa_members 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID FK→users | |
| `organization_id` | UUID FK→organizations | |
| `role` | VARCHAR(50) | member/operator/admin |
| `status` | VARCHAR(50) | pending/active/suspended/withdrawn |
| `membership_type` | VARCHAR(50) | pharmacist/student |
| `license_number` | VARCHAR(100) | 약사 면허번호 |
| `pharmacy_name` | VARCHAR(200) | |
| `activity_type` | VARCHAR(50) | 활동 유형 (예: pharmacy_owner, pharmacy_employee) |
| `fee_category` | VARCHAR(50) | 연회비 카테고리 |

#### kpa_pharmacist_profiles 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `user_id` | UUID UNIQUE FK→users | |
| `license_number` | VARCHAR(100) | |
| `license_verified` | BOOLEAN | |
| `activity_type` | VARCHAR(50) | |

### 3.3 사업자 정보

#### business_info 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | |
| `userId` | UUID UNIQUE FK→users | |
| `businessName` | VARCHAR(255) | 상호명 |
| `businessNumber` | VARCHAR | 사업자등록번호 |
| `businessType` | ENUM | 개인/법인 등 |
| `defaultCommissionRate` | DECIMAL(5,2) | 기본 수수료율 |
| `isVerified` | BOOLEAN | |

### 3.4 Entity 관계도

```
users (1) ─── (N) role_assignments    [RBAC SSOT]
      ├───── (N) service_memberships  [서비스 멤버십]
      ├───── (1) business_info        [사업자 정보]
      ├───── (1) kpa_pharmacist_profiles [약사 자격]
      ├───── (N) kpa_members          [KPA 회원]
      ├───── (N) approval_logs        [승인 이력]
      ├───── (N) user_activity_logs   [활동 로그]
      └───── (N) linked_accounts      [소셜 로그인]
```

---

## 4. Frontend 구현 현황

### 4.1 K-Cosmetics (가장 완성도 높음)

**라우트:**
- `/operator/users` → [UsersPage.tsx](services/web-k-cosmetics/src/pages/operator/UsersPage.tsx)
- `/operator/users/:id` → [UserDetailPage.tsx](services/web-k-cosmetics/src/pages/operator/UserDetailPage.tsx)

**UsersPage 기능:**
- 탭: "회원 목록" / "가입 신청"
- 통계 대시보드: 4개 카드 (전체/활성/대기/거절)
- 검색 (이름/이메일) + 상태 필터
- 인라인 액션: 승인/거절/정지/활성화/편집/비밀번호/삭제
- 페이지네이션 (20건)
- PasswordModal, EditUserModal

**UserDetailPage 기능:**
- 기본 정보 섹션: 이름, 이메일, 전화, 상태, 가입일
- 약국 정보 섹션 (businessInfo 존재 시): 상호명, 사업자번호, 주소
- **역할 관리 섹션: 추가/제거 가능** (ASSIGNABLE_ROLES 기반)
- 서비스 멤버십 섹션: 승인/거절 가능
- EditUserModal: 기본 정보 + 사업자 정보 편집

**API 호출:**
```
GET  /api/v1/operator/members?page=X&limit=20&status=X&search=X
GET  /api/v1/operator/members/stats
GET  /api/v1/operator/members/{userId}
PUT  /api/v1/operator/members/{userId}
PATCH /api/v1/operator/members/{userId}/status
PATCH /api/v1/operator/members/{membershipId}/approve
PATCH /api/v1/operator/members/{membershipId}/reject
POST  /api/v1/operator/members/{userId}/roles
DELETE /api/v1/operator/members/{userId}/roles/{role}
DELETE /api/v1/operator/members/{userId}
```

### 4.2 GlycoPharm

**라우트:**
- `/operator/users` → [UsersPage.tsx](services/web-glycopharm/src/pages/operator/UsersPage.tsx)
- `/operator/users/:id` → [UserDetailPage.tsx](services/web-glycopharm/src/pages/operator/UserDetailPage.tsx)

**K-Cosmetics 대비 차이점:**
- ❌ 역할 관리 섹션 없음
- ❌ 사업자 정보 표시 없음
- 상태 변경 로직 단순 (membershipId 기반 대신 userId 기반)
- 나머지 기본 구조 동일

### 4.3 GlucoseView

**라우트:**
- `/operator/users` → [UsersPage.tsx](services/web-glucoseview/src/pages/operator/UsersPage.tsx)
- `/operator/users/:id` → [UserDetailPage.tsx](services/web-glucoseview/src/pages/operator/UserDetailPage.tsx)

**GlycoPharm과 거의 동일** (동일 패턴 복사)

### 4.4 Neture

**라우트:**
- `/operator/users` → [UsersManagementPage.tsx](services/web-neture/src/pages/operator/UsersManagementPage.tsx)

**주요 차이점:**
- ❌ **상세 페이지 없음** (목록만 존재)
- 상태 변경 시 **Neture 전용 엔드포인트** 사용:
  ```
  POST /neture/operator/registrations/{userId}/approve
  POST /neture/operator/registrations/{userId}/reject
  ```
- 나머지(정지/활성화)는 MembershipConsole 공유 엔드포인트

### 4.5 KPA Society

**라우트:**
- `/admin-branch/members` → [MembersPage.tsx](services/web-kpa-society/src/pages/admin-branch/MembersPage.tsx)

**상태: API 미연동 (목업 데이터)**
- 정적 배열 3명의 샘플 데이터
- KPA 고유 컬럼: 면허번호, 약국명, 소속 분회, 연회비 상태, 신상신고 상태
- Excel 내보내기 버튼 (placeholder)
- **API 호출 없음**

---

## 5. 기능 비교 매트릭스

### 5.1 Frontend 기능

| 기능 | K-Cosmetics | GlycoPharm | GlucoseView | Neture | KPA |
|------|:-----------:|:----------:|:-----------:|:------:|:---:|
| 회원 목록 | ✅ | ✅ | ✅ | ✅ | ⚠️ 목업 |
| 검색 (이름/이메일) | ✅ | ✅ | ✅ | ✅ | ⚠️ 목업 |
| 상태 필터 | ✅ | ✅ | ✅ | ✅ | ⚠️ 목업 |
| 통계 대시보드 | ✅ | ✅ | ✅ | ✅ | ⚠️ 목업 |
| 탭 (전체/대기) | ✅ | ✅ | ✅ | ✅ | ❌ |
| 페이지네이션 | ✅ | ✅ | ✅ | ✅ | ❌ |
| **상세 페이지** | ✅ | ✅ | ✅ | ❌ | ❌ |
| 인라인 승인/거절 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 인라인 정지/활성화 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 비밀번호 변경 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 프로필 편집 | ✅ | ✅ | ✅ | ❌ | ❌ |
| **사업자 정보 표시** | ✅ | ❌ | ❌ | ❌ | N/A |
| **역할 관리 (CRUD)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **멤버십 승인/거절** | ✅ | ✅ | ✅ | ⚠️ 자체 | ❌ |
| 삭제 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 새로고침 | ✅ | ✅ | ✅ | ✅ | ❌ |

### 5.2 Backend API Coverage

| 엔드포인트 | K-Cosmetics | GlycoPharm | GlucoseView | Neture | KPA |
|-----------|:-----------:|:----------:|:-----------:|:------:|:---:|
| GET /operator/members | ✅ | ✅ | ✅ | ✅ | ❌ (자체) |
| GET /operator/members/stats | ✅ | ✅ | ✅ | ✅ | ❌ |
| GET /operator/members/:userId | ✅ | ✅ | ✅ | ❌ | ❌ |
| PUT /operator/members/:userId | ✅ | ✅ | ✅ | ❌ | ❌ |
| PATCH /operator/members/:userId/status | ✅ | ✅ | ✅ | ⚠️ 부분 | ❌ |
| PATCH /operator/members/:id/approve | ✅ | ✅ | ✅ | ⚠️ 자체 | ❌ |
| PATCH /operator/members/:id/reject | ✅ | ✅ | ✅ | ⚠️ 자체 | ❌ |
| POST /operator/members/:userId/roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| DELETE /operator/members/:userId/roles/:role | ✅ | ❌ | ❌ | ❌ | ❌ |
| DELETE /operator/members/:userId | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 6. 응답 형식 비교

### 6.1 회원 목록 응답 (MembershipConsole)

```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "길동",
      "lastName": "홍",
      "name": "홍길동",
      "nickname": "gildong",
      "company": "약국이름",
      "phone": "010-1234-5678",
      "status": "active",
      "isActive": true,
      "roles": ["glycopharm:operator"],
      "memberships": [
        {
          "id": "uuid",
          "serviceKey": "glycopharm",
          "status": "active",
          "role": "operator",
          "approvedBy": "admin-uuid",
          "approvedAt": "2026-01-01T00:00:00Z",
          "rejectionReason": null,
          "createdAt": "2026-01-01T00:00:00Z"
        }
      ],
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 6.2 회원 상세 응답 (MembershipConsole)

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "길동",
    "lastName": "홍",
    "name": "홍길동",
    "status": "active",
    "isActive": true,
    "businessInfo": {
      "businessName": "글로벌약국",
      "businessNumber": "123-45-67890",
      "email": "tax@pharmacy.com",
      "businessType": "소매업",
      "businessCategory": "의약품",
      "address": "서울시 강남구..."
    },
    "roles": [
      {
        "id": "uuid",
        "role": "glycopharm:operator",
        "isActive": true,
        "scopeType": "global",
        "scopeId": null,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "memberships": [
      {
        "id": "uuid",
        "serviceKey": "glycopharm",
        "status": "active",
        "role": "operator",
        "approvedBy": "admin-uuid",
        "approvedAt": "2026-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
}
```

### 6.3 KPA 자체 API 응답 (다른 구조)

KPA는 MembershipConsole과 다른 응답 구조 사용:
- `kpa_members` 중심 (users JOIN)
- 면허번호, 약국명, 활동유형 등 KPA 고유 필드 포함
- 분회(branch) 계층 구조 연동

---

## 7. 권한/Guard 구조

### 7.1 Backend Guard 패턴

| Guard | 용도 | 확인 대상 |
|-------|------|----------|
| `requireAuth` | 인증 확인 | JWT payload → user.roles 설정 |
| `requireRole(roles[])` | 역할 확인 | roleAssignmentService.hasAnyRole() |
| `requireAdmin` | 관리자 확인 | platform:admin, platform:super_admin, admin, super_admin |
| `injectServiceScope` | 서비스 범위 주입 | role prefix에서 serviceKeys 추출 |
| `require{Service}Scope(role)` | 서비스 역할 확인 | 예: requireGlycopharmScope('glycopharm:operator') |

### 7.2 Frontend Guard 패턴

- Route-level RoleGuard (예: `<RoleGuard roles={['operator', 'admin']}>`)
- 페이지 내부 권한 체크 없음 (RoleGuard 통과 시 모든 액션 허용)
- **문제점:** 세분화된 액션 권한 체크 부재 (승인/삭제 등 위험 액션에 대한 별도 Guard 없음)

### 7.3 서비스 격리

**MembershipConsole의 서비스 격리:**
- Platform admin: 모든 서비스 접근 (선택적 serviceKey 필터)
- Service operator: 자신의 서비스 멤버만 조회 가능
- 역할 할당 시 prefix 경계 체크: `neture:operator`는 `glycopharm:admin` 할당 불가

---

## 8. Data Flow 분석

### 8.1 일반 회원 관리 플로우 (K-Cosmetics/GlycoPharm/GlucoseView)

```
[Frontend]                    [Backend]                    [Database]
UsersPage                     MembershipConsoleController
    │                              │
    ├─GET /operator/members────────┤
    │                              ├─ Raw SQL + scope filter──── service_memberships
    │                              │                             + users JOIN
    │◄─────── users[] + pagination─┤
    │                              │
    ├─PATCH /:userId/status────────┤
    │   {status: 'approved'}       ├─ MembershipApprovalService
    │                              │   STEP0: SELECT FOR UPDATE── service_memberships
    │                              │   STEP1: UPDATE ──────────── service_memberships
    │                              │   STEP2: UPDATE ──────────── users
    │                              │   STEP3: INSERT/UPDATE ───── role_assignments
    │◄─────── success ─────────────┤
```

### 8.2 Neture 승인 플로우 (자체 엔드포인트)

```
[Frontend]                    [Backend]
UsersManagementPage           Neture RegistrationController
    │                              │
    ├─POST /neture/operator/       │
    │  registrations/:id/approve───┤
    │                              ├─ 자체 승인 로직
    │                              │   (MembershipApprovalService와 다른 경로)
    │◄─────── success ─────────────┤
```

### 8.3 KPA 회원 관리 플로우 (독립 구조)

```
[Frontend]                    [Backend]                     [Database]
MembersPage (mock)            KPA MemberController
    │                              │
    ├─ (API 미연동) ────────────── │
    │                              │
    │  PATCH /kpa/members/:id/     │
    │  status {status: 'active'}───┤
    │                              ├─ UPDATE kpa_members ──────── kpa_members
    │                              ├─ UPDATE users ────────────── users
    │                              ├─ assignRole() ────────────── role_assignments
    │                              ├─ UPDATE kpa_member_service── kpa_member_service
    │                              ├─ INSERT audit log ────────── kpa_audit_logs
    │◄─────── success ─────────────┤
```

---

## 9. 이름 표시 표준 (Name Normalization)

**WO-O4O-NAME-NORMALIZATION-V1 패턴:**

```typescript
// 우선순위: lastName+firstName > name > email prefix > '사용자'
const displayName = (user.lastName && user.firstName)
  ? `${user.lastName}${user.firstName}`
  : user.name || user.email?.split('@')[0] || '사용자';
```

- K-Cosmetics: ✅ 적용
- GlycoPharm: ✅ 적용
- GlucoseView: ✅ 적용
- Neture: ✅ 적용
- KPA: ❌ 미적용 (목업 데이터)

---

## 10. UI 패턴 일관성

### 10.1 공통 패턴 (K-Cosmetics/GlycoPharm/GlucoseView)

| 요소 | 패턴 |
|------|------|
| 헤더 | 제목 + 부제목 + 새로고침 버튼 |
| 통계 | 4컬럼 그리드, 아이콘 + 숫자 + 라벨 |
| 탭 | border-b-2 언더라인 스타일 |
| 테이블 | bg-slate-50 헤더, hover:bg-slate-50 행 |
| 배지 | inline-flex, rounded-full, px-2 py-0.5 |
| 모달 | fixed overlay, max-w-sm/lg, rounded-xl |
| 로딩 | Loader2 animate-spin + 텍스트 |
| 에러 | bg-red-50, AlertCircle 아이콘 |
| 빈 상태 | Users w-12 아이콘 + 메시지 |
| 아이콘 | Lucide React 전체 일관 |

### 10.2 비일관 패턴

| 항목 | K-Cosmetics | GlycoPharm | Neture | KPA |
|------|-------------|------------|--------|-----|
| 검색 트리거 | Enter + 버튼 | Enter | Enter + 버튼 | N/A |
| 스타일링 | Tailwind | Tailwind | Tailwind | **인라인 스타일** |
| 상세 네비게이션 | 행 클릭 | 행 클릭 | ❌ 없음 | ❌ 없음 |

---

## 11. 발견된 문제점 (Findings)

### F-1. KPA 프론트엔드 API 미연동 (Critical)

**현상:** MembersPage가 정적 목업 데이터 사용, 실제 API 호출 없음
**영향:** KPA 운영자가 회원 관리 불가
**원인:** KPA 회원 관리가 MembershipConsole이 아닌 자체 API 사용 필요
**권장:** KPA 자체 API (`/kpa/members`) 연동 또는 MembershipConsole 확장

### F-2. Neture 상세 페이지 부재 (Major)

**현상:** 목록 페이지만 존재, 회원 상세 정보 확인 불가
**영향:** 운영자가 개별 회원 정보/역할/멤버십 관리 불가
**권장:** UserDetailPage 추가 (K-Cosmetics 패턴 복사)

### F-3. 역할 관리 K-Cosmetics에만 존재 (Major)

**현상:** K-Cosmetics만 역할 추가/제거 UI 보유
**영향:** 다른 서비스 운영자가 역할 관리 시 Platform Admin 필요
**권장:** 표준 UserDetailPage에 역할 관리 섹션 통합

### F-4. 사업자 정보 K-Cosmetics에만 표시 (Minor)

**현상:** K-Cosmetics의 UserDetailPage만 businessInfo 섹션 표시
**영향:** 다른 서비스에서 사업자 정보 확인 불가
**권장:** 표준 UserDetailPage에 businessInfo 표시 통합

### F-5. Neture 승인 엔드포인트 비표준 (Minor)

**현상:** Neture가 MembershipConsole 대신 자체 registration 엔드포인트 사용
**영향:** 유지보수 복잡도 증가, 표준 승인 플로우와 불일치 가능
**권장:** MembershipConsole로 통합 또는 명시적 분리 문서화

### F-6. Frontend 세분화 권한 체크 부재 (Minor)

**현상:** RoleGuard만으로 페이지 접근 제어, 개별 액션(삭제/승인)에 대한 별도 체크 없음
**영향:** 페이지 접근 가능한 모든 사용자가 모든 액션 수행 가능
**권장:** 위험 액션(삭제, 역할 할당)에 대한 추가 Guard 또는 UI 조건부 렌더링

### F-7. ASSIGNABLE_ROLES 하드코딩 (Minor)

**현상:** K-Cosmetics UserDetailPage에서 할당 가능 역할이 프론트엔드에 하드코딩
**영향:** 새 역할 추가 시 프론트엔드 수정 필요
**권장:** Backend에서 할당 가능 역할 목록 제공 API 추가

---

## 12. 표준화 권장 사항

### 12.1 표준 Operator 회원관리 페이지 구성

```
/operator/users           → UsersPage (목록 + 검색 + 필터 + 통계 + 인라인 액션)
/operator/users/:id       → UserDetailPage (상세 + 역할관리 + 멤버십관리 + 사업자정보)
```

### 12.2 표준 기능 세트

**UsersPage (필수):**
- [x] 회원 목록 (페이지네이션 20건)
- [x] 통계 대시보드 (4개 카드)
- [x] 탭: 전체 / 가입 대기
- [x] 검색 (이름/이메일)
- [x] 상태 필터 드롭다운
- [x] 인라인 액션: 승인/거절/정지/활성화/편집/비밀번호/삭제
- [x] 행 클릭 → 상세 페이지 이동
- [x] 새로고침 버튼

**UserDetailPage (필수):**
- [x] 기본 정보 섹션 (이름, 이메일, 전화, 상태, 가입일)
- [x] 사업자 정보 섹션 (businessInfo 존재 시)
- [x] 역할 관리 섹션 (추가/제거)
- [x] 서비스 멤버십 섹션 (승인/거절)
- [x] 프로필 편집 모달
- [x] 비밀번호 변경 모달
- [x] 상태 변경 버튼

### 12.3 표준 API (MembershipConsole 기반)

모든 서비스가 공유해야 할 엔드포인트:

```
GET    /api/v1/operator/members
GET    /api/v1/operator/members/stats
GET    /api/v1/operator/members/:userId
PUT    /api/v1/operator/members/:userId
PATCH  /api/v1/operator/members/:userId/status
PATCH  /api/v1/operator/members/:membershipId/approve
PATCH  /api/v1/operator/members/:membershipId/reject
POST   /api/v1/operator/members/:userId/roles
DELETE /api/v1/operator/members/:userId/roles/:role
DELETE /api/v1/operator/members/:userId
```

KPA는 추가로 자체 엔드포인트 유지 (면허, 분회 등 고유 로직)

---

## 13. 다음 단계 (Next Steps)

| 우선순위 | 작업 | 대상 |
|---------|------|------|
| **P0** | KPA MembersPage API 연동 | web-kpa-society |
| **P1** | Neture UserDetailPage 추가 | web-neture |
| **P1** | GlycoPharm/GlucoseView 역할 관리 섹션 추가 | web-glycopharm, web-glucoseview |
| **P2** | GlycoPharm/GlucoseView/Neture businessInfo 표시 | 3개 서비스 |
| **P2** | Neture 승인 플로우 MembershipConsole 통합 검토 | web-neture + API |
| **P3** | ASSIGNABLE_ROLES Backend API 추가 | API server |
| **P3** | Frontend 액션별 권한 체크 추가 | 전체 서비스 |

---

*작성: Claude Opus 4.6 / 2026-03-18*
*상태: 조사 완료 — 표준 정의 작업의 시작점*
