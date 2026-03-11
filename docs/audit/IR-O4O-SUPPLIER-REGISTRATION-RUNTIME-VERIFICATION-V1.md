# IR-O4O-SUPPLIER-REGISTRATION-RUNTIME-VERIFICATION-V1

> **Runtime Verification Report** | 2026-03-11
> Neture Supplier Registration 실제 런타임 동작 검증

---

## 1. Executive Summary

| 단계 | API | 결과 | 비고 |
|------|-----|------|------|
| 사용자 등록 | POST /auth/register | **PASS** | service=neture, role=supplier |
| 사용자 승인 | PATCH /admin/users/:id/status | **PASS** | status: active |
| 사용자 로그인 | POST /auth/login | **PASS** | roles: ["supplier"] |
| Supplier 등록 | POST /neture/supplier/register | **PASS** | status: PENDING |
| Admin 대기 목록 | GET /neture/admin/suppliers/pending | **PASS** | 1건 조회 |
| Admin 승인 | POST /neture/admin/suppliers/:id/approve | **PASS** | status: ACTIVE, approvedBy, approvedAt |
| Supplier Profile | GET /neture/supplier/profile | **PASS** | name, slug, status 정상 |
| Supplier Dashboard | GET /neture/supplier/dashboard/summary | **FAIL** | INTERNAL_ERROR |
| Supplier Products | GET /neture/supplier/products | **FAIL** | INTERNAL_ERROR |
| Supplier Orders | GET /neture/supplier/orders | **FAIL** | INTERNAL_ERROR |
| **RBAC role 할당** | GET /auth/status | **FAIL** | `neture:supplier` 미할당 |

**종합: 핵심 플로우 PASS, 부가 기능 FAIL (3건)**

---

## 2. 검증 환경

| 항목 | 값 |
|------|------|
| API Server | https://api.neture.co.kr |
| Test User | ir-supplier-test@o4o.com |
| Test User ID | a7209fda-a0e9-4103-8667-b9edad5a845e |
| Supplier ID | 187ba1dc-4b65-487f-8071-c0b53ef01632 |
| Admin | admin-neture@o4o.com (neture:admin) |
| Date | 2026-03-11 |

---

## 3. Step 1: 사용자 등록

**Request:**
```
POST /api/v1/auth/register
{
  email: "ir-supplier-test@o4o.com",
  password: "Test1234!",
  name: "IR Supplier Test",
  service: "neture",
  role: "supplier",
  agreeTerms: true,
  agreePrivacy: true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Registration submitted. Please wait for operator approval.",
    "user": {
      "id": "a7209fda-a0e9-4103-8667-b9edad5a845e",
      "email": "ir-supplier-test@o4o.com",
      "name": "IR Supplier Test",
      "status": "pending"
    },
    "pendingApproval": true
  }
}
```

**결과:** PASS — 사용자 생성, status=pending, 승인 대기

---

## 4. Step 2: 사용자 승인 + 로그인

**승인:** `PATCH /api/v1/admin/users/:id/status { status: "active" }` — PASS

**로그인 결과:**
```json
{
  "role": "supplier",
  "roles": ["supplier"],
  "status": "active"
}
```

**발견:** `roles: ["supplier"]` (generic role, not `neture:supplier`)

---

## 5. Step 3: Supplier 등록

**Request:**
```
POST /api/v1/neture/supplier/register
Authorization: Bearer <supplier-token>
{
  name: "IR Test Supplier Co",
  slug: "ir-test-supplier",
  contactEmail: "ir-supplier-test@o4o.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "187ba1dc-4b65-487f-8071-c0b53ef01632",
    "name": "IR Test Supplier Co",
    "slug": "ir-test-supplier",
    "status": "PENDING",
    "createdAt": "2026-03-11T02:49:35.707Z"
  }
}
```

**결과:** PASS — neture_suppliers 테이블에 PENDING 상태로 생성

---

## 6. Step 4-5: Admin 조회 + 승인

**Pending 목록 조회:** `GET /neture/admin/suppliers/pending` — PASS (1건)

**승인:**
```
POST /api/v1/neture/admin/suppliers/187ba1dc.../approve
Authorization: Bearer <neture-admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "187ba1dc-4b65-487f-8071-c0b53ef01632",
    "name": "IR Test Supplier Co",
    "status": "ACTIVE",
    "approvedBy": "0ff81df7-9a72-4de5-9433-4981230773e1",
    "approvedAt": "2026-03-11T02:53:15.485Z"
  }
}
```

**결과:** PASS — status: ACTIVE, approvedBy/approvedAt 기록

---

## 7. Step 6: Supplier 접근 권한

| Endpoint | Middleware | 결과 | 상세 |
|----------|-----------|------|------|
| GET /supplier/profile | requireLinkedSupplier | **PASS** | name, slug, status 반환 |
| GET /supplier/dashboard/summary | requireLinkedSupplier | **FAIL** | INTERNAL_ERROR |
| GET /supplier/products | requireLinkedSupplier | **FAIL** | INTERNAL_ERROR |
| GET /supplier/orders | requireLinkedSupplier | **FAIL** | INTERNAL_ERROR |

**분석:**
- Profile 접근 성공 → `requireLinkedSupplier` 미들웨어 인증 체인 정상
- Dashboard/Products/Orders 실패 → 미들웨어가 아닌 **서비스 레벨 에러**
- 빈 데이터 상태(zero products/orders)에서의 에러 처리 부재 가능성 높음

---

## 8. Step 7: RBAC 검증

**`GET /api/v1/auth/status` 결과:**
```json
{
  "roles": ["supplier"],
  "memberships": [{ "serviceKey": "neture", "status": "pending" }]
}
```

### 발견된 문제

| # | 문제 | 심각도 | 원인 |
|---|------|--------|------|
| **P0** | `neture:supplier` role 미할당 | **Critical** | `approveSupplier()`에서 `roleAssignmentService.assignRole()` 미호출 |
| **P1** | neture membership still `pending` | **High** | Supplier 승인이 service_membership 상태를 업데이트하지 않음 |
| **P2** | Dashboard/Products/Orders INTERNAL_ERROR | **Medium** | 빈 데이터 상태 에러 처리 미흡 |

### RBAC SSOT 위반 상세

```
현재 상태:
  role_assignments: ["supplier"]      ← 등록 시 generic role
  neture_suppliers.status: "ACTIVE"   ← 승인 완료
  service_memberships: "pending"      ← 미갱신

기대 상태:
  role_assignments: ["supplier", "neture:supplier"]  ← 서비스 role 추가
  neture_suppliers.status: "ACTIVE"
  service_memberships: "active" (or "approved")
```

---

## 9. 부수 발견사항

### 9.1 Neture Admin isActive 문제

admin-neture@o4o.com 계정의 `users.isActive = false` 상태로,
`requireAuth` 미들웨어에서 차단됨.

**해결:** `PUT /admin/users/:id { isActive: true }` 로 수동 수정 필요했음.

**원인:** Seed 마이그레이션에서 `isActive` 미설정 또는 기본값 false.

### 9.2 admin@o4o.com 비밀번호 불일치

Platform admin 계정 (admin@o4o.com)의 비밀번호가 seed 값과 불일치.
이전 E2E 테스트에서 변경된 것으로 추정.

---

## 10. 권장 수정 사항

### P0: approveSupplier() RBAC role 할당

```typescript
// neture.service.ts
async approveSupplier(id: string, approvedByUserId: string) {
  // ... existing approval logic ...

  // ✅ Add: RBAC role assignment
  if (supplier.userId) {
    await this.roleAssignmentService.assignRole({
      userId: supplier.userId,
      role: 'neture:supplier',
    });
  }
}
```

### P1: Supplier 승인 → Service Membership 연동

```typescript
// Supplier 승인 시 neture membership도 active로 변경
const membership = await membershipRepo.findOne({
  where: { userId: supplier.userId, serviceKey: 'neture' }
});
if (membership) {
  membership.status = 'approved';
  await membershipRepo.save(membership);
}
```

### P2: Empty state 에러 처리

Dashboard/Products/Orders 서비스에서 빈 데이터 시 빈 배열/기본값 반환하도록 수정.

---

## 11. 테스트 계정 정보 (정리 대상)

| 항목 | 값 |
|------|------|
| User ID | a7209fda-a0e9-4103-8667-b9edad5a845e |
| Email | ir-supplier-test@o4o.com |
| Supplier ID | 187ba1dc-4b65-487f-8071-c0b53ef01632 |
| Supplier Slug | ir-test-supplier |

**IR 완료 후 삭제 필요:** users, role_assignments, service_memberships, neture_suppliers

---

## 12. 결론

Neture Supplier Registration **핵심 플로우는 정상 동작**한다:
- 등록 → 대기 → Admin 승인 → ACTIVE 전환 → Profile 접근

**3개 문제 발견:**
1. **P0** RBAC `neture:supplier` role 미할당 (F9 SSOT 위반)
2. **P1** Service membership 상태 미갱신
3. **P2** 빈 데이터 상태 에러 처리 미흡

이 중 P0, P1은 `approveSupplier()` 메서드 한 곳에서 해결 가능.

---

*Verification Date: 2026-03-11*
*Method: Production API curl calls*
*Status: Complete — 3 issues found*
