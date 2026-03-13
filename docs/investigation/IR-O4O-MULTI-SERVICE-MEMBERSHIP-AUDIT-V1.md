# IR-O4O-MULTI-SERVICE-MEMBERSHIP-AUDIT-V1

> **조사일**: 2026-03-13
> **조사 트리거**: GlycoPharm 사용자(sohae21@naver.com)가 Neture 서비스 가입 시 차단됨
> **조사 범위**: 멀티 서비스 가입 플로우 전체 (Backend + Frontend)

---

## 1. 요약

**결론: 멀티 서비스 가입 백엔드는 정상 동작한다.** (WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1 적용 완료)

사용자가 경험한 에러는 **PASSWORD_MISMATCH** (401) — 기존 GlycoPharm 비밀번호가 아닌 새 비밀번호를 입력했기 때문. 이는 설계 의도대로 보안 검증이 작동한 것이다.

**발견된 부차적 문제**: 가입 시 RoleAssignment에 서비스 접두사 누락 (`supplier` vs `neture:supplier`)

---

## 2. 현재 가입 플로우 (auth.controller.ts:310-491)

### 기존 사용자 → 다른 서비스 가입 (정상 경로)

```
1. findOne({ email }) → existingUser 발견
2. smRepository.findOne({ userId, serviceKey }) → 서비스별 멤버십 확인
   → 이미 가입: 409 SERVICE_ALREADY_JOINED
   → 미가입: 계속 진행
3. bcrypt.compare(입력 비밀번호, existingUser.password)
   → 불일치: 401 PASSWORD_MISMATCH "기존 비밀번호를 입력해주세요"
   → 일치: 계속 진행
4. 트랜잭션으로 ServiceMembership + RoleAssignment 생성
5. 201 Created (pendingApproval: true)
```

### sohae21@naver.com 시나리오 재현

| 단계 | 동작 | 결과 |
|------|------|------|
| 1 | Neture 가입 페이지에서 sohae21@naver.com 입력 | - |
| 2 | **새 비밀번호** 입력 (GlycoPharm 비밀번호가 아닌 다른 비밀번호) | - |
| 3 | POST /api/v1/auth/register `{service: 'neture'}` | - |
| 4 | 서버: existingUser 발견 (GlycoPharm 계정) | - |
| 5 | ServiceMembership 확인: neture 멤버십 없음 → 계속 | - |
| 6 | bcrypt.compare 실패 (입력 비밀번호 ≠ GlycoPharm 비밀번호) | **401 PASSWORD_MISMATCH** |
| 7 | 프론트엔드: "이미 다른 서비스에 가입된 계정입니다. 기존 비밀번호를 입력해주세요." | 사용자 혼란 |

**근본 원인**: 사용자가 GlycoPharm 가입 시 사용한 비밀번호와 다른 비밀번호를 입력함. 정상 보안 동작.

---

## 3. 코드 위치 매핑

### Backend (auth.controller.ts)

| 라인 | 코드 | 역할 |
|------|------|------|
| 330-331 | `getRepository(User)`, `getRepository(ServiceMembership)` | Repository 준비 |
| 356 | `findOne({ where: { email: data.email } })` | 기존 사용자 조회 |
| 362-368 | `smRepository.findOne({ userId, serviceKey })` | 서비스별 중복 체크 |
| 370-375 | `bcrypt.compare(data.password, existingUser.password)` | 비밀번호 검증 |
| 377-400 | `AppDataSource.transaction(...)` | ServiceMembership + RA 생성 |

### Frontend (6개 서비스 RegisterPage)

| 서비스 | 파일 | PASSWORD_MISMATCH 처리 |
|--------|------|----------------------|
| Neture | `services/web-neture/src/pages/RegisterPage.tsx:91-92` | Error 메시지 표시 |
| Neture (Modal) | `services/web-neture/src/components/RegisterModal.tsx:146-147` | Error 메시지 표시 |
| GlycoPharm | `services/web-glycopharm/src/pages/auth/RegisterPage.tsx:103-104` | Error 메시지 표시 |
| GlucoseView | `services/web-glucoseview/src/pages/RegisterPage.tsx:129-130` | Error 메시지 표시 |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/auth/RegisterPage.tsx:80-81` | Error 메시지 표시 |
| KPA Society | `services/web-kpa-society/src/pages/auth/RegisterPage.tsx:121-122` | Error 메시지 표시 |

---

## 4. 발견된 부차적 문제: RoleAssignment 서비스 접두사 누락

### 문제

가입 시 생성되는 RoleAssignment의 role 값에 서비스 접두사가 없음:

```typescript
// auth.controller.ts:392 (기존 사용자 멀티 서비스 가입)
assignment.role = effectiveRole;  // 'supplier' (접두사 없음)

// auth.controller.ts:484 (신규 사용자 가입)
assignment.role = effectiveRole;  // 'supplier' (접두사 없음)
```

### 비교: 승인 플로우에서는 접두사 포함

```typescript
// neture.service.ts:289-291 (공급자 승인 시)
await roleAssignmentService.assignRole({
  userId: supplier.userId,
  role: 'neture:supplier',  // ← 접두사 포함
});
```

### 영향

| 시점 | role_assignments.role | Neture Scope Guard 통과 |
|------|----------------------|------------------------|
| 가입 직후 | `supplier` | ❌ (`neture:supplier` 필요) |
| 승인 후 | `neture:supplier` | ✅ |

현재는 가입 → 승인 → 접두사 역할 할당 순서이므로 **실제 접근 권한에는 문제 없음**.
단, 불필요한 접두사 없는 `supplier` RA 레코드가 잔존함.

### 권고

가입 시 RoleAssignment 생성을 **제거**하거나, 서비스 접두사를 포함:

```typescript
// Option A: 가입 시 RA 생성 생략 (승인 시에만 생성)
// Option B: 접두사 포함
assignment.role = `${serviceKey}:${effectiveRole}`;  // 'neture:supplier'
```

---

## 5. ServiceMembership 아키텍처 현황

### Entity (Core Frozen — O4O-CORE-FREEZE-V1)

```
service_memberships
├── id (UUID PK)
├── user_id (UUID FK → users.id, ON DELETE CASCADE)
├── service_key (VARCHAR 100) — 'neture' | 'glycopharm' | 'kpa-society' | ...
├── status (VARCHAR 50) — 'pending' | 'active' | 'suspended' | 'rejected'
├── role (VARCHAR 50) — 'customer' | 'supplier' | 'partner' | ...
├── approved_by (UUID, nullable)
├── approved_at (TIMESTAMP, nullable)
├── created_at / updated_at
└── UNIQUE(user_id, service_key)
```

### 멀티 서비스 지원 상태

| 구성 요소 | 상태 | 비고 |
|-----------|------|------|
| ServiceMembership Entity | ✅ Core Frozen | UNIQUE(userId, serviceKey) |
| Register API 멀티 서비스 | ✅ 구현 완료 | WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1 |
| Admin 운영자 멀티 역할 | ✅ 구현 완료 | WO-OPERATOR-MULTI-SERVICE-V1 (e30ea518a) |
| Neture 승인 플로우 | ✅ 연동 완료 | neture.service.ts |
| Frontend PASSWORD_MISMATCH 처리 | ⚠️ UX 개선 필요 | 에러 메시지만 표시 |
| RoleAssignment 접두사 | ⚠️ 불일치 | 가입 시 접두사 없음 |

---

## 6. 이전 조사와의 관계

### IR-O4O-MULTI-SERVICE-USER-MODEL-AUDIT-V1 (2026-03-10)

이 조사에서 발견된 **Model B → Model A 전환 미비** 문제:

| 문제 | 당시 상태 | 현재 상태 |
|------|-----------|-----------|
| 기존 사용자 이메일로 다른 서비스 가입 불가 | ❌ 409 Conflict | ✅ 해결 (ServiceMembership 추가 플로우) |
| service_memberships 테이블 미사용 | ❌ | ✅ 가입 시 생성 |
| 서비스별 승인 권한 | ❌ 플랫폼 admin만 | ✅ 서비스 운영자 승인 가능 |

**WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1이 이 문제들을 모두 해결함.**

---

## 7. 후속 작업 권고

### P1 (UX 개선 — 비기능 버그)

**프론트엔드 PASSWORD_MISMATCH 처리 개선**:
- 현재: 에러 메시지만 표시 → 사용자 혼란
- 개선안: 팝업/모달로 "이 이메일은 [GlycoPharm] 서비스에 이미 가입되어 있습니다. 기존 비밀번호를 입력해주세요." + 비밀번호 찾기 링크

### P2 (코드 정리)

**가입 시 RoleAssignment 접두사 통일**:
- `effectiveRole` → `${serviceKey}:${effectiveRole}` 또는 승인 시에만 RA 생성

### P3 (향후)

**ServiceMembership status 기반 접근 제어**:
- 현재: 승인 전에도 'supplier' RA가 존재 (isActive=true)
- 개선안: 승인 전에는 RA 미생성, 승인 시에만 RA 생성

---

## 8. 결론

| 항목 | 판정 |
|------|------|
| 백엔드 멀티 서비스 가입 | ✅ **정상 동작** |
| sohae21@naver.com 차단 원인 | **PASSWORD_MISMATCH** (기존 비밀번호 불일치, 설계 의도대로) |
| 코드 버그 | ❌ 없음 |
| UX 개선 필요 | ⚠️ PASSWORD_MISMATCH 처리 UX |
| RoleAssignment 접두사 | ⚠️ 가입 시 접두사 누락 (기능 영향 없음, 정리 권고) |

---

*Author: Claude Code (IR-O4O-MULTI-SERVICE-MEMBERSHIP-AUDIT-V1)*
*Date: 2026-03-13*
