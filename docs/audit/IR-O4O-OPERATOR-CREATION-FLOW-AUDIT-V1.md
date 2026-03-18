# IR-O4O-OPERATOR-CREATION-FLOW-AUDIT-V1

> O4O Platform — Operator Creation & Service Access Flow Audit
> Date: 2026-03-18
> Status: **Investigation Complete**
> Priority: **P0 (Critical)**

---

## 1. 조사 결과 요약 (Executive Summary)

### Root Cause 확정 — 2개

| # | 원인 | 심각도 | 확인 |
|---|------|--------|------|
| **RC-1** | Operator 생성 시 `service_memberships` INSERT 없음 | **P0** | 코드 확인 완료 |
| **RC-2** | 기존 유저에 역할 추가 시 비밀번호 무시 (password 덮어쓰기 안됨) | **P0** | 코드 확인 완료 |

### 한 줄 요약

```
AdminUserController.createUser()는 users + role_assignments만 생성하고
service_memberships를 생성하지 않는다.
기존 유저인 경우 비밀번호도 무시된다.
```

---

## 2. 조사 항목별 결과

### 항목 1 — Operator 생성 흐름

**파일**: `apps/api-server/src/controllers/admin/AdminUserController.ts:147-238`

| 작업 | 수행 여부 | 코드 위치 |
|------|----------|----------|
| `users` INSERT | ✅ YES | Line 200-211 |
| Password Hash (bcrypt) | ✅ YES | Line 198 |
| `role_assignments` INSERT | ✅ YES | Line 215-221 |
| `service_memberships` INSERT | ❌ **NO** | **없음** |

**신규 유저 생성 시:**
```typescript
// Line 200-211: users 테이블에만 INSERT
const newUser = userRepo.create({
  email, password: hashedPassword,
  firstName, lastName, name,
  status,        // default: UserStatus.APPROVED ('approved')
  isActive,      // default: true
  permissions: []
});
const savedUser = await userRepo.save(newUser);

// Line 215-221: role_assignments에만 INSERT
for (const r of rolesArray) {
  await roleAssignmentService.assignRole({ userId: savedUser.id, role: r });
}

// ❌ service_memberships INSERT → 없음
```

**기존 유저에 역할 추가 시 (Line 176-195):**
```typescript
if (existingUser) {
  // ✅ role_assignments만 추가
  for (const r of rolesToAssign) {
    await roleAssignmentService.assignRole({ userId: existingUser.id, role: r });
  }
  // ❌ service_memberships INSERT → 없음
  // ❌ password 업데이트 → 없음 (Admin이 설정한 비밀번호 무시됨)
  return response;
}
```

---

### 항목 2 — 동일 이메일 계정 중복

| 결과 | 상태 |
|------|------|
| DB UNIQUE 제약 | `users.email` UNIQUE → 중복 불가 |
| 코드 처리 | `findOne({ where: { email } })` → 존재 시 역할만 추가 |

**판정: 계정 중복 아님** — 단일 email = 단일 user_id

---

### 항목 3 — 서비스별 Membership 상태

**Operator Users 조회 쿼리** (`MembershipConsoleController.ts:73-85`):

```sql
-- Service Operator (비 platform-admin)
WHERE EXISTS (
  SELECT 1 FROM service_memberships sm2
  WHERE sm2.user_id = u.id
  AND sm2.service_key = ANY($N)
)
```

**결론**: `service_memberships` 레코드 없으면 → **조회 불가 (INVISIBLE)**

| 엔드포인트 | Membership 필수? | 방식 |
|-----------|:---------------:|------|
| `GET /operator/members` (목록) | ✅ | `EXISTS` 서브쿼리 |
| `GET /operator/members/:userId` (상세) | ✅ | `checkServiceBoundary()` 404 반환 |
| `GET /operator/members/stats` (통계) | ✅ | `INNER JOIN service_memberships` |

---

### 항목 4 — RoleAssignment 상태

**Admin 생성 시 역할 예시:**
```
Frontend: roles: ['glycopharm:operator', 'neture:admin']
→ role_assignments에 INSERT됨 ✅
```

**문제**: role_assignment는 정상 생성되지만, service_memberships가 없으므로:
- 역할은 있지만 서비스에 "소속"되지 않음
- Operator 페이지에서 조회 불가
- 실질적으로 권한 행사 불가

---

### 항목 5 — Auth(로그인) 흐름

**파일**: `apps/api-server/src/services/authentication.service.ts:134-205`

| 단계 | 코드 | 동작 |
|------|------|------|
| User 조회 | Line 134 | `findOne({ where: { email } })` — **email만, service_key 없음** |
| Password 검증 | Line 169 | `comparePassword(password, user.password)` — 단일 비밀번호 |
| Status 확인 | Line 177 | `status !== 'active' && status !== 'approved'` |
| Membership 조회 | Line 198 | `SELECT ... FROM service_memberships WHERE user_id = $1` |
| 토큰 생성 | Line 205 | `generateTokens(user, roles, 'neture.co.kr', memberships)` |

**핵심 발견:**
1. 로그인은 service-agnostic (서비스 구분 없음)
2. 모든 서비스에서 같은 user, 같은 password
3. Domain 하드코딩: `'neture.co.kr'`
4. 서비스별 membership 필터링 없음 — 전체 membership 반환

---

### 항목 6 — Password Sync

**파일**: `apps/api-server/src/modules/auth/controllers/auth.controller.ts:302-323`

| 항목 | 상태 |
|------|------|
| `passwordSyncAvailable` | ✅ 활성 |
| `syncToken` | ✅ Redis 5분 TTL |
| 범위 | **글로벌** — 비밀번호 변경 시 모든 서비스에 적용 |

**동작:** PASSWORD_MISMATCH → syncToken 발급 → 사용자가 새 비밀번호 설정 → users.password 업데이트

---

### 항목 7 — Operator Users 조회 로직

**정상 Flow (Registration) vs Admin Flow 비교:**

| 항목 | Registration (`/auth/register`) | Admin (`/admin/users`) |
|------|:-----------------------------:|:---------------------:|
| users INSERT | ✅ | ✅ |
| Password Hash | ✅ bcrypt(12) | ✅ bcrypt(10) |
| service_memberships INSERT | ✅ (pending/active) | ❌ **없음** |
| role_assignments INSERT | ❌ (승인 시 생성) | ✅ (즉시 생성) |
| 트랜잭션 | ✅ 단일 Transaction | ❌ 개별 쿼리 |
| 서비스 소속 | ✅ serviceKey 지정 | ❌ 소속 없음 |

---

## 3. Root Cause 상세

### RC-1: service_memberships 미생성 (P0-CRITICAL)

**증상**: Admin에서 생성한 Operator가 서비스별 운영자 페이지에서 보이지 않음

**원인 체인:**
```
Admin 생성 (POST /admin/users)
  → users ✅
  → role_assignments ✅
  → service_memberships ❌ (코드 없음)
    → Operator 페이지 WHERE EXISTS (service_memberships) 통과 불가
    → 404 Not Found / 목록에서 누락
```

**영향 범위**: Admin에서 생성한 **모든 Operator** (glycopharm, glucoseview, neture, k-cosmetics, kpa-society)

---

### RC-2: 기존 유저 비밀번호 무시 (P0-CRITICAL)

**증상**: Admin이 설정한 비밀번호로 로그인 시 "비밀번호 불일치"

**원인 체인:**
```
기존 유저 존재 (이미 다른 서비스에서 가입)
  → Admin이 새 비밀번호 설정
  → existingUser 분기 진입 (Line 178)
  → role만 추가, password 무시
  → Admin이 알려준 비밀번호 ≠ 실제 DB 비밀번호
  → 로그인 시 PASSWORD_MISMATCH
```

**시나리오:**
1. 사용자 A가 neture.co.kr에서 비밀번호 "abc123"으로 가입
2. Admin이 동일 email로 glycopharm operator 생성, 비밀번호 "xyz789" 입력
3. 코드는 기존 유저에 role만 추가, 비밀번호 "xyz789" 무시
4. Admin이 사용자에게 "xyz789"로 로그인하라고 안내
5. 사용자가 "xyz789"로 로그인 시도 → 실제 비밀번호 "abc123" ≠ "xyz789" → **PASSWORD_MISMATCH**

---

## 4. 프론트엔드 → 백엔드 데이터 흐름

```
[Admin Dashboard - OperatorsPage.tsx:303]
  POST /admin/users
  {
    email: "operator@example.com",
    password: "NewPassword123",
    firstName: "홍",
    lastName: "길동",
    roles: ["glycopharm:operator"],     ← 서비스:역할 형태
    role: "operator",                   ← Legacy 필드
    isEmailVerified: true,
    isActive: true
  }
         │
         ▼
[AdminUserController.ts:147]
  createUser()
    │
    ├─ existingUser? ──YES──► role만 추가 (Line 183-184)
    │                         password 무시 ❌
    │                         service_memberships 없음 ❌
    │                         return
    │
    └─ NO ──► users INSERT (Line 200-211) ✅
              role_assignments INSERT (Line 215-221) ✅
              service_memberships INSERT → 없음 ❌
```

---

## 5. 비교: Registration 정상 흐름

```
[GlycoPharm - RegisterPage.tsx:110]
  POST /auth/register
  {
    email, password,
    role: "seller",
    service: "glycopharm",            ← serviceKey 전달됨 ✅
  }
         │
         ▼
[auth.controller.ts:475-550]
  register()
    │
    └─► Transaction 시작
        ├─ users INSERT ✅
        ├─ service_memberships INSERT ✅  ← service: "glycopharm", status: "pending"
        └─ Transaction 커밋
```

**핵심 차이**: Registration은 `service` 파라미터를 받아 service_memberships를 생성하지만, Admin 생성은 serviceKey 자체를 전달하지 않음.

---

## 6. 정상 기준 (Expected State)

Operator가 정상 작동하려면 3개 테이블 모두 레코드 필요:

```sql
-- 1. users: 계정 존재
SELECT id, email, status FROM users WHERE email = 'operator@example.com';
-- → status = 'approved' or 'active'

-- 2. role_assignments: 역할 존재
SELECT role, is_active FROM role_assignments WHERE user_id = :userId AND is_active = true;
-- → 'glycopharm:operator' 등

-- 3. service_memberships: 서비스 소속 ← 현재 누락됨
SELECT service_key, status, role FROM service_memberships WHERE user_id = :userId;
-- → service_key = 'glycopharm', status = 'active'
```

---

## 7. Fix 방향 (WO-O4O-OPERATOR-CREATION-FLOW-FIX-V1)

### Fix 1: AdminUserController — service_memberships 자동 생성

**위치**: `AdminUserController.ts:createUser()` (Line 221 이후)

**로직**:
1. `roles` 배열에서 serviceKey 추출 (예: `'glycopharm:operator'` → `'glycopharm'`)
2. 각 serviceKey에 대해 `service_memberships` INSERT
3. status = `'active'` (Admin 생성이므로 승인 불필요)
4. role = roles에서 추출한 역할명

### Fix 2: 기존 유저 분기 — 비밀번호 정책 결정

**위치**: `AdminUserController.ts:existingUser 분기` (Line 176-195)

**옵션:**
- A) 비밀번호 무시 + Admin에게 "기존 비밀번호 사용" 알림 (안전)
- B) Admin이 명시적으로 요청 시 비밀번호 업데이트 (선택적)
- C) 비밀번호 리셋 링크 발송 (가장 안전)

### Fix 3: 기존 유저 분기 — service_memberships 추가

**위치**: `AdminUserController.ts:existingUser 분기` (Line 183 이후)

**로직**: 역할 추가와 함께 해당 서비스 membership도 생성

### Fix 4: 프론트엔드 응답 개선

**위치**: `OperatorsPage.tsx`

**로직**: 기존 유저 시 "기존 비밀번호로 로그인하세요" 안내 메시지 표시

---

## 8. 영향 범위

| 서비스 | 영향 |
|--------|------|
| glycopharm | Admin 생성 Operator 조회/로그인 불가 |
| glucoseview | 동일 |
| neture | 동일 |
| k-cosmetics | 동일 |
| kpa-society | 동일 |

**영향 받는 모든 Operator**: Admin 대시보드에서 생성된 전원

---

## 9. 검증 방법

Fix 적용 후 확인:

```sql
-- 1. 신규 Operator 생성 후
SELECT u.id, u.email, u.status,
       sm.service_key, sm.status as sm_status,
       ra.role, ra.is_active as ra_active
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
WHERE u.email = :email;

-- 정상 결과:
-- | id | email | status   | service_key | sm_status | role              | ra_active |
-- | xx | ...   | approved | glycopharm  | active    | glycopharm:operator | true     |
```

---

*Investigation Complete: 2026-03-18*
*Investigator: Claude Code*
*Next Action: WO-O4O-OPERATOR-CREATION-FLOW-FIX-V1*
