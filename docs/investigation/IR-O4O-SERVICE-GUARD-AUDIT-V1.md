# IR-O4O-SERVICE-GUARD-AUDIT-V1

> **조사 일시**: 2026-03-10
> **상태**: 완료
> **유형**: Investigation Report (코드 수정 없음)
> **선행 작업**: WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1

---

## 1. 조사 목적

WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1에서 `service_memberships` 테이블을 생성하고 Register API를 수정하여 Global User + Service Membership 모델을 구현함.

이 구조에서는 서비스 접근 시 반드시 다음 조건을 만족해야 함:

```
service_memberships.status = 'active'
```

현재 코드가 이 조건을 **실제로 강제하는지** 조사.

---

## 2. 판정 결과

### **UNSAFE — service_memberships.status 검사 미구현**

```
service_memberships 테이블은 가입 시 생성되지만,
이후 어떤 인증/인가 흐름에서도 조회되지 않음.

pending 상태 사용자도 role만 있으면 서비스 접근 가능.
```

---

## 3. 인증 미들웨어 조사

### requireAuth (`common/middleware/auth.middleware.ts`)

| 항목 | 확인 여부 |
|------|----------|
| JWT 서명/만료 검증 | **YES** |
| users.isActive 확인 | **YES** (DB 쿼리) |
| JWT payload → user.roles 할당 | **YES** |
| service_memberships 조회 | **NO** |

```typescript
// 현재 동작 (line 108-109)
user.roles = payload.roles || [];
// → service_memberships 확인 없음
```

### requireAdmin / requireRole / requirePermission

| 미들웨어 | 확인 대상 | service_memberships |
|----------|----------|---------------------|
| requireAdmin | role_assignments (DB) | **NO** |
| requireRole | role_assignments (DB) | **NO** |
| requirePermission | role_assignments (DB) | **NO** |

### createServiceScopeGuard (security-core)

| 항목 | 확인 여부 |
|------|----------|
| JWT scopes 배열 | **YES** |
| user.roles 배열 | **YES** |
| DB 쿼리 | **NO** (JWT만 사용) |
| service_memberships | **NO** |

```typescript
// packages/security-core/src/service-scope-guard.ts
const hasScope = userScopes.includes(scope);
const hasServiceRole = userRoles.some(r => rolesToCheck.includes(r));
// → membership 조회 없음
```

---

## 4. 로그인 플로우 조사

### POST /auth/login (`authentication.service.ts`)

```
1. email → users 테이블 조회
2. 비밀번호 검증
3. user.status 확인 (active/approved만 허용)
4. roleAssignmentService.getRoleNames(userId) → role_assignments 조회
5. generateTokens(user, roles, domain) → JWT 생성
```

| 항목 | 확인 여부 |
|------|----------|
| users.status 확인 | **YES** |
| role_assignments 조회 | **YES** |
| service_memberships 조회 | **NO** |

### JWT Payload 구조

```typescript
{
  userId, email,
  role: roles[0],     // primary role
  roles: string[],    // 모든 active roles
  permissions: [],
  scopes: [],
  domain: string,     // 정보용
  // memberships: ???  ← 없음
}
```

**memberships 정보 미포함.**

### GET /auth/status

```typescript
const roles = await roleAssignmentService.getRoleNames(req.user.id);
userData.roles = roles;
userData.scopes = deriveUserScopes({ role: roles[0], roles });
// → service_memberships 조회 없음
```

---

## 5. 서비스별 라우트 Guard 조사

### Neture

| 엔드포인트 | Auth | Scope Guard | Membership Check |
|-----------|------|------------|------------------|
| GET /neture/* | **NO** (공개) | NO | NO |

Neture는 공개 정보 플랫폼. 인증 불필요.

### GlycoPharm

| 엔드포인트 | Auth | Scope Guard | Membership Check |
|-----------|------|------------|------------------|
| GET /glycopharm/pharmacies | NO | NO | NO |
| /glycopharm/admin/* | requireAuth | requireGlycopharmScope | **NO** |

```typescript
router.get('/admin/pharmacies',
  requireAuth,
  requireScope('glycopharm:admin'),  // role만 확인
  handler
);
```

### KPA Society

| 엔드포인트 | Auth | Scope Guard | Membership Check |
|-----------|------|------------|------------------|
| /kpa/admin/* | requireAuth | requireKpaScope | **NO** (service_memberships) |
| /kpa/branches/* | requireAuth | verifyBranchAdmin | kpa_members.status (별도 테이블) |

**KPA는 자체 `kpa_member_services` 테이블 사용** (global service_memberships와 별도):
```typescript
// kpa_members.status === 'active' 확인 (kpa 전용)
const [member] = await ds.query(
  `SELECT id FROM kpa_members WHERE user_id = $1 AND status = 'active'`,
  [userId]
);
```

### GlucoseView

| 엔드포인트 | Auth | Scope Guard | Membership Check |
|-----------|------|------------|------------------|
| GET /glucoseview/* | NO | NO | NO |
| /glucoseview/admin/* | requireAuth | requireGlucoseViewScope | **NO** |

### K-Cosmetics

| 엔드포인트 | Auth | Scope Guard | Membership Check |
|-----------|------|------------|------------------|
| GET /cosmetics/* | NO | NO | NO |
| /cosmetics/admin/* | requireAuth | requireCosmeticsScope | **NO** |

---

## 6. 프론트엔드 접근 제어 조사

### 서비스별 프론트엔드 Guard 패턴

| 서비스 | Status 저장 | Status 검사 | Membership 검사 | 차단 UI |
|--------|:---------:|:---------:|:-------------:|---------|
| **Neture** | NO | NO | NO | 없음 |
| **GlycoPharm** | YES (미사용) | NO | NO | 없음 |
| **KPA Society** | YES | **YES** | **YES** (kpaMembership) | PendingApprovalPage |
| **GlucoseView** | YES | **YES** | NO | PendingPage |
| **K-Cosmetics** | NO | NO | NO | 없음 |

### KPA Society (유일한 멤버십 검사 서비스)

```tsx
// AuthGate.tsx
const sa = user.kpaMembership?.serviceAccess;
if (sa === 'pending' || sa === 'blocked') {
  return <Navigate to="/pending-approval" replace />;
}
```

- `kpaMembership`은 `kpa_members` + `organization_members`에서 파생
- **global `service_memberships` 테이블과 무관**

### GlucoseView

```tsx
// App.tsx ProtectedRoute
if (isPending || isRejected) {
  return <Navigate to="/pending" replace />;
}
```

- `approvalStatus`는 `users.status`에서 파생
- **`service_memberships.status`가 아닌 `users.status` 기반**

---

## 7. 보안 위험 시나리오

### 시나리오 1: pending 상태에서 서비스 접근

```
1. User A: Neture 가입 (active)
2. User A: GlycoPharm 추가 가입 (pending)
3. Register API → service_memberships에 GlycoPharm pending 생성
4. Register API → role_assignments에 customer 역할 생성
5. User A 로그인 → JWT에 모든 active roles 포함
6. GlycoPharm API 접근 → role 확인만 → 접근 허용
```

**결과: service_memberships.status='pending'이지만 접근 가능**

### 시나리오 2: suspended 상태에서 서비스 접근

```
1. 운영자가 service_memberships.status → 'suspended' 변경
2. role_assignments는 변경하지 않음 (별도 관리)
3. 사용자 로그인 → JWT에 roles 포함
4. 서비스 접근 → role 확인만 → 접근 허용
```

**결과: 정지된 멤버십이지만 접근 가능**

### 시나리오 3: 교차 서비스 역할 오용

```
현재 Register API에서 기존 사용자 추가 가입 시:
→ RoleAssignment에 effectiveRole (접두사 없는 'customer') 생성
→ 서비스별 구분 없이 모든 역할이 JWT에 포함
```

---

## 8. service_memberships 참조 현황

### 참조하는 코드

| 위치 | 용도 |
|------|------|
| `auth.controller.ts` register() | 가입 시 생성/조회 |
| `ServiceMembership.ts` | Entity 정의 |
| `connection.ts` | Entity 등록 |
| `1771200000010-CreateServiceMemberships.ts` | 테이블 생성 |

### 참조하지 않는 코드 (문제)

| 위치 | 누락된 기능 |
|------|------------|
| requireAuth | membership 조회 |
| requireRole / requireAdmin | membership status 확인 |
| createServiceScopeGuard | membership 기반 접근 제어 |
| authentication.service.ts login() | 로그인 시 membership 확인 |
| token.utils.ts | JWT에 memberships 포함 |
| /auth/status | membership 정보 반환 |

---

## 9. 현재 접근 제어 데이터 흐름

```
가입:
  Register API → users + service_memberships + role_assignments

로그인:
  Login → users (status) + role_assignments (roles) → JWT
  ※ service_memberships 조회 안 함

요청:
  requireAuth → JWT 검증 + users.isActive
  requireRole → role_assignments (또는 JWT payload)
  scopeGuard → JWT scopes + user.roles
  ※ service_memberships 조회 안 함
```

### 누락된 흐름

```
필요한 흐름:
  Login → service_memberships(serviceKey, status='active') 확인
  OR
  requireAuth → service_memberships 조회 (매 요청)
  OR
  scopeGuard → service_memberships.status 확인 (서비스별)
```

---

## 10. 서비스별 Guard 구조 요약

| Service | Auth | Role Guard | Scope Guard | Membership Guard | 판정 |
|---------|:----:|:----------:|:-----------:|:----------------:|:----:|
| **Neture** | 없음 | 없음 | 없음 | 없음 | N/A (공개) |
| **GlycoPharm** | requireAuth | requireRole | requireGlycopharmScope | **없음** | **UNSAFE** |
| **KPA Society** | requireAuth | requireRole | requireKpaScope | kpa_members (자체) | **PARTIAL** |
| **GlucoseView** | requireAuth | requireRole | requireGlucoseViewScope | **없음** | **UNSAFE** |
| **K-Cosmetics** | requireAuth | requireRole | requireCosmeticsScope | **없음** | **UNSAFE** |

---

## 11. 결론

### 판정: **UNSAFE**

```
service_memberships 테이블은 생성되었지만,
인증/인가 흐름에서 전혀 참조되지 않음.

pending/suspended 상태의 멤버십을 가진 사용자도
role_assignments에 역할이 있으면 서비스에 접근 가능.
```

### 수정 필요 사항

**긴급도 높음 (보안)**:

1. **로그인 시 서비스별 멤버십 검증**
   - Login API에서 `service_memberships` 조회
   - active 상태인 서비스의 역할만 JWT에 포함

2. **서비스 Scope Guard에 멤버십 확인 추가**
   - `createServiceScopeGuard()`에서 `service_memberships.status` 체크
   - 또는 별도 `requireServiceMembership()` 미들웨어 생성

3. **JWT payload에 memberships 정보 추가**
   - `memberships: [{ serviceKey, status }]` 포함
   - 또는 서비스별 역할 필터링

4. **승인 API에서 service_memberships.status 변경 연동**
   - 승인 시: `status → active` + `role_assignments` 활성화
   - 정지 시: `status → suspended` + `role_assignments` 비활성화

**긴급도 중간 (기능)**:

5. **프론트엔드에서 멤버십 상태 표시**
   - `/auth/status` 응답에 `memberships[]` 포함
   - 각 서비스 프론트엔드에서 pending 상태 차단 UI

6. **운영자 대시보드에서 서비스별 멤버십 관리**
   - 서비스별 pending 사용자 목록
   - 승인/거부 기능

---

## 12. 현재 안전한 부분

- **KPA Society**: 자체 `kpa_members` + `kpa_member_services` 테이블로 별도 멤버십 관리. 프론트엔드 AuthGate에서 차단. **단, 백엔드 API는 role만 확인**
- **GlucoseView**: 프론트엔드에서 `users.status` 기반 차단 UI 존재. **단, API 레벨 강제 없음**
- **Neture**: 공개 플랫폼으로 멤버십 확인 불필요

---

## 13. 다음 단계 권장

이 보고서의 발견사항을 바탕으로 다음 WO가 필요:

```
WO-O4O-SERVICE-MEMBERSHIP-GUARD-V1
- 서비스 Scope Guard에 membership 검증 추가
- 로그인 시 서비스별 역할 필터링
- 승인 API와 role_assignments 연동
```

**이 WO는 WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1의 보안 보완으로,
구조 구현 후 반드시 수행되어야 함.**

---

*Investigation completed: 2026-03-10*
*Author: Claude Code (IR-O4O-SERVICE-GUARD-AUDIT-V1)*
