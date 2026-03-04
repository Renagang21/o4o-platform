# IR-O4O-OPERATOR-SERVICE-ROLE-ARCHITECTURE-AUDIT-V1

> **조사 보고서** — Operator 서비스 역할 아키텍처 감사
> 작성일: 2026-03-04
> 상태: 완료

---

## 요약

O4O 플랫폼에서 Operator 역할이 "서비스 운영자(Service Operator)"로 정의된 구조를 조사했다.
조사 결과, **RBAC 인프라는 준비되어 있으나 Operator 흐름의 프론트엔드-백엔드 연동에 4개의 구조적 결함**이 발견되었다.

```
핵심 문제 요약:
1. Operator가 대시보드에 접근할 수 없음 (프론트엔드 Route Guard 차단)
2. Operator 생성 시 다중 role이 저장되지 않음 (백엔드가 단일 role만 처리)
3. Operator 목록 조회에 role 데이터가 없음 (role_assignments JOIN 누락)
4. scope_type/scope_id가 사용되지 않음 (서비스별 범위 연결 불가)
```

---

## 1. RBAC 구조 분석

### 1.1 role_assignments 테이블 구조

**파일**: `apps/api-server/src/modules/auth/entities/RoleAssignment.ts`

| 컬럼 | 타입 | Null | 기본값 | 설명 |
|------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| user_id | UUID | NO | - | FK → users.id |
| role | VARCHAR(50) | NO | - | 역할명 (예: 'kpa:operator') |
| is_active | BOOLEAN | NO | true | 활성 여부 |
| valid_from | TIMESTAMP | NO | NOW() | 역할 시작일 |
| valid_until | TIMESTAMP | YES | NULL | 역할 만료일 (임시 할당용) |
| assigned_at | TIMESTAMP | NO | NOW() | 할당 시점 |
| assigned_by | UUID | YES | - | 할당자 (관리자) |
| **scope_type** | VARCHAR(50) | YES | **'global'** | 범위 유형 |
| **scope_id** | UUID | YES | **NULL** | 범위 ID |

**제약조건:**
- UNIQUE: `(user_id, role, is_active)` — 사용자당 동일 역할 중복 방지
- CHECK: `(scope_type='global' AND scope_id IS NULL) OR (scope_type='organization' AND scope_id IS NOT NULL) OR (scope_type IS NULL)`

### 1.2 scope_type/scope_id 사용 현황

```
실태: 인프라 준비 완료, 실제 사용 없음

전체 97개 레코드 중:
- scope_type='global', scope_id=NULL: 97건 (100%)
- scope_type='organization': 0건
```

**RoleAssignmentService.assignRole()** 메서드가 scope 파라미터를 받지 않음:
```typescript
// 현재 인터페이스 — scope 없음
interface AssignRoleInput {
  userId: string;
  role: string;
  assignedBy?: string;
  validFrom?: Date;
  validUntil?: Date;
}
```

### 1.3 현재 role 분포 (프로덕션 DB)

| 역할 | Active | Inactive | 유형 |
|------|--------|----------|------|
| kpa:pharmacist | 65 | 0 | 서비스 프리픽스 |
| kpa:student | 5 | 0 | 서비스 프리픽스 |
| user | 4 | 0 | 레거시 |
| pharmacist | 3 | 0 | 레거시 |
| kpa:admin | 2 | 0 | 서비스 프리픽스 |
| platform:super_admin | 1 | 0 | 플랫폼 프리픽스 |
| neture:admin | 1 | 0 | 서비스 프리픽스 |
| **operator** | **1** | 0 | **레거시 (프리픽스 없음)** |
| partner | 1 | 0 | 레거시 |
| glucoseview:admin | 1 | 0 | 서비스 프리픽스 |
| glycopharm:admin | 1 | 0 | 서비스 프리픽스 |
| supplier | 1 | 0 | 레거시 |
| admin | 1 | 5 | 레거시 |
| platform:admin | 0 | 4 | 플랫폼 프리픽스 |
| super_admin | 0 | 1 | 레거시 |

### 1.4 Operator 역할 정의

**파일**: `apps/api-server/src/types/roles.ts`

정의된 Operator 역할 목록:

| 서비스 | 역할명 | 라인 | 상태 |
|--------|--------|------|------|
| platform | platform:operator | L227-234 | **DEPRECATED** |
| kpa | kpa:operator | L277-284 | Active |
| kpa | kpa:branch_operator | L301-308 | Active |
| kpa-c | kpa-c:operator | L345-352 | Active |
| neture | neture:operator | L371-378 | Active |
| glycopharm | glycopharm:operator | L413-420 | Active |
| cosmetics | cosmetics:operator | L463-470 | Active |
| glucoseview | glucoseview:operator | L521-528 | Active |

**핵심 발견**: `kpa-a:operator`는 **정의되어 있지 않음**. 프론트엔드 OperatorsPage에서는 `kpa:operator`를 사용.

---

## 2. JWT 인증 구조

### 2.1 토큰 생성 흐름

**파일**: `apps/api-server/src/utils/token.utils.ts` (L237-248)

```
로그인 → roleAssignmentService.getRoleNames(userId) → generateTokens(user, roles, domain)
```

JWT Payload 구조:
```typescript
{
  userId, sub, email,
  role: roles[0] || 'user',     // 단일 역할 (레거시 호환)
  roles: string[],               // Phase3-E: role_assignments에서 조회
  permissions: [],
  scopes: [],                    // deriveUserScopes()
  domain: 'neture.co.kr',
  tokenType: 'user',
  iss, aud, exp, iat
}
```

### 2.2 requireAuth 미들웨어

**파일**: `apps/api-server/src/common/middleware/auth.middleware.ts` (L56-125)

```
JWT 토큰 추출 → 서명 검증 → userId로 DB 조회 → user.roles = payload.roles
```

**핵심**: `user.roles`는 JWT payload에서 설정됨 (DB 재조회 없음)

### 2.3 requireAdmin 미들웨어 — 두 가지 구현

| 위치 | 체크 방식 | 허용 역할 | operator 포함 |
|------|----------|----------|:------------:|
| `common/middleware/auth.middleware.ts` L163-169 | roleAssignmentService.hasAnyRole() (DB) | admin, super_admin, **operator**, platform:admin, platform:super_admin | **YES** |
| `middleware/permission.middleware.ts` L188 | User.hasAnyRole() (메모리) | admin, super_admin | **NO** |

**불일치**: 백엔드에서 operator를 admin으로 취급하는 미들웨어와 그렇지 않은 미들웨어가 공존.

### 2.4 User.hasRole() 구현

**파일**: `apps/api-server/src/modules/auth/entities/User.ts` (L213-218)

```typescript
hasRole(role: UserRole | string): boolean {
  const roleStr = role as string;
  if (!this.roles || this.roles.length === 0) return false;
  return this.roles.some(r => r === roleStr || r === `platform:${roleStr}`);
}
```

- `hasRole('admin')` → `platform:admin` 매칭 **가능**
- `hasRole('operator')` → `platform:operator` 매칭 **가능**
- `hasRole('admin')` → `kpa:admin` 매칭 **불가능** (platform 프리픽스만 지원)

---

## 3. Route Guard 구조

### 3.1 AuthProvider.tsx — isAdmin 판정

**파일**: `packages/auth-context/src/AuthProvider.tsx` (L260)

```typescript
const adminRoleNames = [
  'admin', 'administrator', 'super_admin',
  'platform:admin', 'platform:super_admin'
];
```

**operator 포함 여부**: **NO** — operator는 isAdmin = false

### 3.2 AdminProtectedRoute.tsx — 접근 제어

**파일**: `packages/auth-context/src/AdminProtectedRoute.tsx` (L168)

```typescript
const adminRoleNames = [
  'admin', 'administrator', 'super_admin',
  'platform:admin', 'platform:super_admin'
];
```

역할 계층 확장 (L134-145):
```
requiredRoles에 'admin' 포함 시:
  → super_admin, platform:admin, platform:super_admin 자동 추가

requiredRoles에 'super_admin' 포함 시:
  → platform:super_admin 자동 추가
```

**operator 포함 여부**: **NO** — operator는 모든 관리자 라우트에서 차단됨

### 3.3 App.tsx 라우트 구조

**파일**: `apps/admin-dashboard/src/App.tsx`

```typescript
<AdminProtectedRoute requiredRoles={['admin']}>
  <AdminLayout>
    <Routes>
      {/* 모든 관리자 라우트 */}
    </Routes>
  </AdminLayout>
</AdminProtectedRoute>
```

- Operator 전용 라우트: **없음**
- Operator 전용 레이아웃: **없음**
- Operator 전용 Route Guard: **없음**

---

## 4. UI 구조 분석

### 4.1 대시보드 구조

| 구분 | 존재 여부 | 설명 |
|------|:---------:|------|
| Admin Dashboard | ✅ | 전체 관리자 대시보드 (`/home`) |
| Service Dashboard | ❌ | 서비스별 운영자 대시보드 없음 |
| Operator Dashboard | ❌ | Operator 전용 대시보드 없음 |

### 4.2 Operator 접근 가능한 메뉴

현재 상태: **없음** — AdminProtectedRoute가 모든 라우트를 차단

### 4.3 Operator 관리 UI (OperatorsPage)

**파일**: `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx`

서비스 탭 → 역할 매핑:

| 서비스 탭 | 서비스키 | Admin 역할 | Operator 역할 |
|----------|---------|-----------|--------------|
| Platform | platform | platform:super_admin | — |
| KPA 커뮤니티 | kpa-a | kpa:admin | kpa:operator |
| KPA 데모 | kpa-b | kpa-b:district | kpa-b:branch |
| KPA 분회 | kpa-c | kpa-c:admin | kpa-c:operator |
| Neture | neture | neture:admin | neture:operator |
| GlycoPharm | glycopharm | glycopharm:admin | glycopharm:operator |
| K-Cosmetics | cosmetics | cosmetics:admin | cosmetics:operator |
| GlucoseView | glucoseview | glucoseview:admin | glucoseview:operator |

---

## 5. Operator 생성 로직 분석

### 5.1 프론트엔드 → 백엔드 전송

**파일**: `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` (L323-335)

프론트엔드가 보내는 데이터:
```typescript
{
  email, password, firstName, lastName, name,
  roles: ['kpa:admin', 'kpa:operator'],  // 다중 역할 배열
  role: 'admin',                          // 레거시 단일 역할
  isEmailVerified: true,
  isActive: true
}
```

### 5.2 백엔드 처리

**파일**: `apps/api-server/src/controllers/admin/AdminUserController.ts` (L116-185)

```typescript
const { role = UserRole.USER, ... } = req.body;
// roles 배열은 무시됨
await roleAssignmentService.assignRole({ userId: savedUser.id, role });
```

**문제**: `roles` 배열을 무시하고 `role` 단일 값만 처리

### 5.3 백엔드 라우트 검증

**파일**: `apps/api-server/src/routes/admin/users.routes.ts` (L27-30)

```typescript
body('role').optional().isIn([
  'super_admin', 'admin', 'operator', 'manager', 'moderator',
  'vendor', 'seller', 'customer', 'business', 'partner', 'supplier', 'affiliate'
])
```

**문제**: 서비스 프리픽스 역할 (`kpa:operator`, `neture:admin` 등) 미허용

---

## 6. Operator 조회 API 분석

### 6.1 AdminUserController.getUsers()

**파일**: `apps/api-server/src/controllers/admin/AdminUserController.ts` (L11-81)

```typescript
const queryBuilder = userRepo.createQueryBuilder('user');
// role_assignments JOIN 없음
// role 필터링 주석 처리됨 (L35-37)
const [users, total] = await queryBuilder.getManyAndCount();
```

**문제**:
1. role_assignments 테이블과 JOIN하지 않음
2. 응답에 roles 데이터가 포함되지 않음
3. role 기반 필터링이 주석 처리됨

### 6.2 프론트엔드 목록 처리

**파일**: `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` (L108-142)

```typescript
const operatorUsers = userData
  .map(user => ({
    roles: user.roles || [user.role].filter(Boolean),  // roles가 없으면 빈 배열
  }))
  .filter(user => user.roles.some(r => isOperatorRole(r)));  // operator 역할 필터
```

**결과**: 백엔드가 roles를 반환하지 않으므로 → 모든 사용자가 필터링되어 → **빈 목록 표시**

---

## 7. 발견된 문제 목록

| ID | 문제 위치 | 문제 원인 | 영향 범위 | 심각도 |
|----|----------|----------|----------|--------|
| **ISS-01** | `AdminProtectedRoute.tsx` L168 / `AuthProvider.tsx` L260 | adminRoleNames에 operator 미포함 | Operator 대시보드 접근 전면 차단 | **CRITICAL** |
| **ISS-02** | `AdminUserController.ts` L116-185 | roles 배열 무시, 단일 role만 assignRole() | Operator 생성 시 서비스별 역할 미할당 | **HIGH** |
| **ISS-03** | `AdminUserController.ts` L11-81 | role_assignments JOIN 없음 | Operator 목록 항상 비어있음 | **HIGH** |
| **ISS-04** | `users.routes.ts` L27-30 | role 검증에 서비스 프리픽스 역할 미포함 | kpa:operator 등 할당 불가 | **HIGH** |
| **ISS-05** | `role-assignment.service.ts` assignRole() | scope_type/scope_id 파라미터 미지원 | 서비스 범위 제한 불가 | **MEDIUM** |
| **ISS-06** | `permission.middleware.ts` L188 vs `auth.middleware.ts` L163 | requireAdmin 두 구현체의 operator 처리 불일치 | 라우트에 따라 operator 권한 다름 | **MEDIUM** |
| **ISS-07** | App.tsx | Operator 전용 라우트/레이아웃 부재 | Operator UX 없음 | **MEDIUM** |
| **ISS-08** | `User.hasRole()` | platform: 프리픽스만 지원, 서비스 프리픽스(kpa: 등) 미지원 | 서비스 역할 체크 불완전 | **LOW** |

---

## 8. 정비 방향 제안

### 8.1 정비 옵션 비교

| 옵션 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. Admin UI 통합 + 권한별 메뉴 분기** | 기존 admin-dashboard에 operator를 포함시키고 역할별 메뉴 노출 제어 | 빠른 구현, 단일 앱 유지 | 메뉴 분기 로직 복잡 |
| **B. Admin UI + Operator UI 분리** | Operator 전용 대시보드 앱 신규 생성 | 깔끔한 권한 분리 | 개발 비용 높음, 앱 증가 |

### 8.2 권장 방향: 옵션 A (Admin UI 통합 + 권한별 메뉴 분기)

이유:
- Operator는 Admin의 **부분집합**을 접근하는 역할
- 별도 앱 생성 시 코드 중복 발생
- 기존 AdminProtectedRoute에 역할 기반 분기만 추가하면 해결

### 8.3 RBAC 정비 방향

```
Phase A: 긴급 — Operator 접근 차단 해소
  1. AdminProtectedRoute + AuthProvider의 adminRoleNames에 operator 역할 추가
  2. 또는 별도 OperatorProtectedRoute 생성

Phase B: 핵심 — Operator 생성/조회 정상화
  1. AdminUserController.createUser()에서 roles 배열 처리
  2. AdminUserController.getUsers()에서 role_assignments JOIN 추가
  3. users.routes.ts 검증에 서비스 프리픽스 역할 허용

Phase C: 구조 — 서비스 범위 연결
  1. RoleAssignmentService.assignRole()에 scope_type/scope_id 파라미터 추가
  2. Operator 생성 시 서비스 범위(scope) 연결
  3. requireAdmin 두 구현체 통합 또는 역할 분담 명확화
```

### 8.4 Admin / Operator 권한 분리 기준

```
Platform Admin (platform:super_admin)
  → 전체 메뉴 접근
  → 모든 서비스 관리
  → Operator 생성/관리

Service Admin (kpa:admin, neture:admin 등)
  → 해당 서비스 메뉴만 접근
  → 해당 서비스 Operator 관리

Service Operator (kpa:operator, neture:operator 등)
  → 해당 서비스 운영 메뉴만 접근
  → 콘텐츠 관리, 주문 처리 등 운영 업무

일반 사용자 (user, kpa:pharmacist 등)
  → 대시보드 접근 불가
  → 프론트엔드 앱만 사용
```

---

## 조사 완료 기준 응답

| 질문 | 답변 |
|------|------|
| Operator role이 시스템에서 어떻게 정의되어 있는가? | `types/roles.ts`에 8개 서비스별 operator 역할 정의. DB에는 프리픽스 없는 `operator` 1건만 존재. scope 미사용. |
| Operator가 왜 대시보드 접근이 차단되는가? | `AdminProtectedRoute`와 `AuthProvider`의 `adminRoleNames`에 operator 미포함. isAdmin=false 판정. |
| Operator UI 구조가 존재하는가? | **존재하지 않음.** Operator 전용 라우트, 레이아웃, Route Guard 모두 없음. |
| Admin과 Operator의 권한 경계는 어디인가? | **경계 미정의.** 백엔드 일부(auth.middleware.ts)에서만 operator를 admin 동등 취급. 프론트엔드와 다른 백엔드 미들웨어에서는 차단. |

---

## 참조 파일 목록

### Backend
| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` | role_assignments 엔티티 |
| `apps/api-server/src/modules/auth/entities/Role.ts` | roles 테이블 (레거시) |
| `apps/api-server/src/modules/auth/entities/User.ts` | User 엔티티 + hasRole() |
| `apps/api-server/src/modules/auth/services/role-assignment.service.ts` | RBAC 서비스 |
| `apps/api-server/src/types/roles.ts` | 역할 카탈로그 |
| `apps/api-server/src/utils/token.utils.ts` | JWT 토큰 생성 |
| `apps/api-server/src/services/authentication.service.ts` | 로그인 흐름 |
| `apps/api-server/src/common/middleware/auth.middleware.ts` | requireAuth + requireAdmin (DB) |
| `apps/api-server/src/middleware/permission.middleware.ts` | requireAdmin (메모리) |
| `apps/api-server/src/controllers/admin/AdminUserController.ts` | 사용자 CRUD |
| `apps/api-server/src/routes/admin/users.routes.ts` | 라우트 + 검증 |

### Frontend
| 파일 | 역할 |
|------|------|
| `packages/auth-context/src/AuthProvider.tsx` | isAdmin 판정 |
| `packages/auth-context/src/AdminProtectedRoute.tsx` | 라우트 가드 |
| `apps/admin-dashboard/src/App.tsx` | 라우트 구조 |
| `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` | Operator 관리 UI |

---

*조사 완료: 2026-03-04*
*조사자: Claude Code (IR-O4O-OPERATOR-SERVICE-ROLE-ARCHITECTURE-AUDIT-V1)*
*다음 단계: ChatGPT 검토 후 정비 WO 수립*
