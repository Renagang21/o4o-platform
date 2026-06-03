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

상세: `docs/archive/work-orders/WO-O4O-E2E-REGISTRATION-APPROVAL-LOGIN-TEST-V1-REPORT.md` Round 4 섹션

---

## 5. 관련 Freeze 선언

| Freeze | 대상 | 일자 |
|--------|------|------|
| **F9** | RBAC SSOT — role_assignments 단일 소스 | 2026-02-27 |
| **F10** | **O4O Core** — Auth, Membership, Approval, RBAC | **2026-03-11** |

---

## 5-A. Identity Architecture V2 채택과의 관계 (2026-05-23 추가)

[O4O-IDENTITY-ARCHITECTURE-V2.md](O4O-IDENTITY-ARCHITECTURE-V2.md) 가 **Canonical Identity Baseline** 으로 채택됨에 따라 (2026-05-23, [DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1](../decisions/DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1.md)), 본 F10 Freeze 와의 관계를 명시한다.

### 5-A.1 F10 영향 범위

V2 의 핵심 변경 (Credential 의 서비스 범위 독립) 은 **Auth Core 의 구조 확장** 을 수반한다:

| V2 변경 항목 | F10 영향 | 명시적 예외 승인 필요 |
|-------------|---------|--------------------|
| `service_credentials` 신규 테이블 신설 (Auth Core 확장) | **HIGH** | ✅ **필수** |
| `users.password` 컬럼 deprecation / 제거 | **HIGH** | ✅ **필수** |
| `login` / `register` / `change` / `reset` 컨트롤러의 dual-read 또는 분기 로직 | **HIGH** | ✅ **필수** |
| `service_memberships` 구조 자체 변경 | 없음 (V2 도 유지) | 해당 없음 |
| `role_assignments` 구조 자체 변경 | 없음 (V2 도 유지) | 해당 없음 |

### 5-A.2 명시적 예외 승인 절차

Identity V2 의 Phase 1 이후 구현 WO 들은 **본 F10 Freeze 의 명시적 예외 승인 절차**를 거쳐 진행한다:

1. **선행 조건**: V2 Canonical 문서 채택 완료 (2026-05-23 — 완료)
2. **WO 생성**: 후속 구현 WO 작성 (예: `WO-O4O-IDENTITY-V2-PHASE1-SCHEMA-V1`)
3. **F10 예외 승인 요청**: WO 본문에 "F10 예외 승인 사유" 명시 — V2 Canonical 인용
4. **이해관계자 승인**: 사용자/책임자의 명시적 승인 (구두 또는 문서)
5. **E2E 재검증 의무**: V2 모델 도입 후 §4 의 검증 항목 (회원가입 / 운영자 승인 / 승인 후 로그인 / UI 회원관리) **전부 재검증** 필수

### 5-A.3 Identity V2 와 무관한 Core 변경

V2 와 관련 없는 Auth / Membership / Approval / RBAC Core 변경은 **기존 F10 절차 그대로** 진행한다 (§3.1 수정 금지 원칙 + CORE_CHANGE_REQUIRED).

---

## 6. Core Registry

파일: `apps/api-server/src/core/core-modules.ts`

런타임에서 Core 모듈 목록을 참조할 수 있는 레지스트리.

---

*Freeze Date: 2026-03-11*
*Verified by: E2E Round 4*
*Status: Active*
*Updated: 2026-05-23 — Identity V2 Canonical 채택과의 관계 (§5-A) 추가. Freeze 자체는 변경 없음.*
