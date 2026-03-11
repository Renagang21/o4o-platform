# O4O Platform Core Architecture — Freeze Declaration V1

> **WO-O4O-CORE-FREEZE-V1** | 2026-03-11
> E2E Round 4 검증 완료 후 Core Layer 고정

---

## 1. Core Layer 정의

E2E Round 4에서 검증된 4개 핵심 모듈을 **O4O Core Layer**로 지정한다.

```
O4O Core Layer
├── Auth System          — 로그인, 회원가입, 토큰 갱신, 상태 확인
├── Service Membership   — 서비스별 가입, 상태 관리, 스코프 관리
├── Approval Engine      — 가입 승인/거부, 회원 관리
└── RBAC Role System     — role_assignments SSOT, 역할 기반 접근 제어
```

---

## 2. Core 파일 목록

### 2.1 Auth Core

| 파일 | 역할 |
|------|------|
| `modules/auth/entities/User.ts` | User 엔티티 (Identity) |
| `modules/auth/entities/RefreshToken.ts` | RefreshToken 엔티티 |
| `modules/auth/controllers/auth.controller.ts` | login, register, refresh, logout |
| `modules/auth/routes/auth.routes.ts` | Auth API 라우트 |
| `modules/auth/services/user.service.ts` | User 서비스 |
| `modules/auth/services/refresh-token.service.ts` | 토큰 갱신 서비스 |
| `common/middleware/auth.middleware.ts` | requireAuth, requireAdmin, requireAnyRole |

### 2.2 Service Membership Core

| 파일 | 역할 |
|------|------|
| `modules/auth/entities/ServiceMembership.ts` | ServiceMembership 엔티티 |
| `common/middleware/membership-guard.middleware.ts` | Membership Guard 미들웨어 |

**상태 머신:**
```
pending → approved → suspended
pending → rejected
```

### 2.3 Approval Engine

| 파일 | 역할 |
|------|------|
| `controllers/admin/AdminUserController.ts` | 회원 목록, 상태 변경, 비밀번호 변경, 삭제 |
| `routes/admin/users.routes.ts` | Admin Users API 라우트 |

**핵심 API:**
```
GET    /api/v1/admin/users              — 회원 목록 (필터, 페이지네이션)
PATCH  /api/v1/admin/users/:id/status   — 상태 변경 (approve/reject/suspend)
PUT    /api/v1/admin/users/:id          — 비밀번호 변경
DELETE /api/v1/admin/users/:id          — 사용자 삭제
```

### 2.4 RBAC Role System

| 파일 | 역할 |
|------|------|
| `modules/auth/entities/RoleAssignment.ts` | RoleAssignment 엔티티 (RBAC SSOT) |
| `modules/auth/services/role-assignment.service.ts` | 역할 조회, 할당, 검증 |

**RBAC 흐름:**
```
Login  → roleAssignmentService.getRoleNames(userId) → generateTokens(user, roles, domain)
Guard  → requireAuth: user.roles = payload.roles (JWT, no DB query)
Admin  → requireAdmin: roleAssignmentService.hasAnyRole(userId, ['admin','super_admin','operator'])
Status → /auth/status: roleAssignmentService.getRoleNames(userId) (fresh RA query)
```

---

## 3. Core 보호 규칙

### 3.1 수정 금지 원칙

위 Core 파일을 수정하려면 반드시:
1. `CORE_CHANGE_REQUIRED` 코멘트를 남기고 작업 중단
2. 명시적 Work Order 승인 필요
3. 수정 후 E2E 전체 플로우 재검증 필수

### 3.2 허용되는 작업

| 허용 | 금지 |
|------|------|
| 버그 수정 | 구조 변경 |
| 성능 개선 | 엔티티 컬럼 추가/삭제 |
| 문서/주석 추가 | API 계약 변경 |
| 테스트 추가 | 미들웨어 체인 변경 |

### 3.3 서비스 확장 패턴

새 기능은 **Extension Layer**에서 구현:

```
Core (수정 금지)
├── Auth
├── Membership
├── Approval
└── RBAC

Extension (자유 확장)
├── modules/kpa/          — KPA 서비스 확장
├── modules/glycopharm/   — GlycoPharm 서비스 확장
├── modules/neture/       — Neture 서비스 확장
├── modules/cosmetics/    — K-Cosmetics 서비스 확장
└── modules/glucoseview/  — GlucoseView 서비스 확장
```

### 3.4 서비스별 Role 확장

허용:
```
glycopharm:admin, glycopharm:operator, glycopharm:user
kpa:admin, kpa:operator, kpa:pharmacist
```

금지:
```
Core role 구조 변경
hasRole() 로직 변경
membership 상태 구조 변경
role_assignments 테이블 구조 변경
```

---

## 4. 검증 근거

### E2E Round 4 결과 (2026-03-11)

| 항목 | 결과 |
|------|------|
| 회원가입 (4 서비스) | 4/4 성공 |
| 운영자 승인 | 4/4 성공 |
| 승인 후 로그인 | 4/4 성공 (status=approved, roles=["customer"]) |
| UI 회원관리 | GlycoPharm 완전 동작 |

상세: `docs/audit/WO-O4O-E2E-REGISTRATION-APPROVAL-LOGIN-TEST-V1-REPORT.md` Round 4 섹션

---

## 5. 관련 Freeze 선언

| Freeze | 대상 | 일자 |
|--------|------|------|
| **F9** | RBAC SSOT — role_assignments 단일 소스 | 2026-02-27 |
| **F10** | **O4O Core** — Auth, Membership, Approval, RBAC | **2026-03-11** |

---

## 6. Core Registry

파일: `apps/api-server/src/core/core-modules.ts`

런타임에서 Core 모듈 목록을 참조할 수 있는 레지스트리.

---

*Freeze Date: 2026-03-11*
*Verified by: E2E Round 4*
*Status: Active*
