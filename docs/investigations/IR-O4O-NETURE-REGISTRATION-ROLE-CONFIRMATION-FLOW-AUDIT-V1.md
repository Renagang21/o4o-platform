---
id: IR-O4O-NETURE-REGISTRATION-ROLE-CONFIRMATION-FLOW-AUDIT-V1
title: Neture 가입 신청 → 운영자 승인 → 역할 확정 흐름 read-only 조사
status: completed
date: 2026-05-27
domain: neture / auth / membership / role-assignment / approval-flow
related:
  - WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1
  - WO-O4O-NETURE-SELLER-LEGACY-CLEANUP-TO-STORE-OWNER-PARTICIPANT-V1
  - WO-O4O-SERVICE-MEMBERSHIP-LOGIN-GATE-V1
  - WO-NETURE-SUPPLIER-APPROVAL-TWO-STEP-ACTIVATION-V1
  - WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1
  - WO-NETURE-ROLE-NORMALIZATION-V1
constitution:
  - CLAUDE.md §0 (read-only / DB 직접 수정 금지)
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §11 (Admin / Operator 역할 구분)
  - CLAUDE.md §14 F9 (RBAC SSOT — role_assignments)
  - CLAUDE.md §14 F11 (User/Operator Freeze — service_memberships)
baseline_process:
  - 1. 기본 정보 입력
  - 2. 신청 역할 선택 (공급자 / 파트너 / 운영자 — 소비자/일반회원 제외)
  - 3. 역할별 추가 입력
  - 4. 가입 신청 제출
  - 5. 운영자 승인
  - 6. 승인 후 Neture 역할 확정
  - 7. 확정된 역할에 따라 대시보드 접근 권한 부여
---

# IR-O4O-NETURE-REGISTRATION-ROLE-CONFIRMATION-FLOW-AUDIT-V1

> Neture 가입 신청 화면 → 운영자 승인 → 역할 확정 → 대시보드 접근 권한 부여 흐름이 **기준 프로세스 (서론 baseline_process) 와 어디서 어긋나는지** read-only 로 추적한다.
>
> 코드 / DB / migration 변경 없음. Renagang21 데이터 보정은 사용자 수작업 영역으로 본 IR 범위 외.

---

## 0. 조사 원칙

```
코드 수정 금지
DB 수정 금지
migration 생성 금지
Renagang21 데이터 보정 금지
hard delete / role 보정 SQL 실행 금지
read-only 조사만 수행
```

CLAUDE.md §0 production DB 방화벽 제약으로 운영 데이터 SELECT 도 본 세션이 직접 수행 불가. 진단 SQL 셋은 §15 에 명시.

---

## 1. 현재 가입 화면 흐름

**파일**: [services/web-neture/src/components/RegisterModal.tsx](../../services/web-neture/src/components/RegisterModal.tsx)

### 1-A. 진입 메커니즘

| Step | 내용 | 파일 위치 |
|:----:|------|----------|
| 진입 | `LoginModalContext.openRegisterModal()` 호출 → `setActiveModal('register')` | [LoginModalContext.tsx:34-36](../../services/web-neture/src/contexts/LoginModalContext.tsx#L34-L36) |
| 모달 | `<RegisterModal>` 컴포넌트 활성화 (3-step 모달) | RegisterModal.tsx:70-1101 |
| Redirect | `/register` 직접 접근 시 `RegisterRedirect` → 홈으로 redirect + 모달 자동 open | [App.tsx:570-578](../../services/web-neture/src/App.tsx#L570-L578) |

### 1-B. 3-step 구조

| Step | 라벨 | 라인 범위 | 입력 필드 |
|:----:|------|---------|----------|
| 1 | 기본 정보 입력 | 407-646 | email, password, passwordConfirm, lastName/firstName, phone, (기존 O4O 계정이면 currentPassword + servicePassword) |
| 2 | 참여 유형 선택 + 역할별 추가 입력 | 650-981 | selectedRole 선택 → 역할별 폼 분기 + 동의 항목 (약관/개인정보/마케팅) |
| 3 | 완료 안내 | 1043-1059 | 3초 후 자동 닫기 |

### 1-C. Step 2 의 역할 선택 — `roleOptions` 배열

```typescript
// RegisterModal.tsx:22, 30-55
type SignupRole = 'supplier' | 'partner' | 'store_owner' | 'user';

const roleOptions = [
  { role: 'user',        label: '일반 이용자',  description: '플랫폼을 이용하는 일반 회원',     emoji: '👤' },
  { role: 'store_owner', label: '매장 경영자',  description: '매장을 운영하는 경영자',         emoji: '🏪' },
  { role: 'supplier',    label: '공급자',       description: '제품을 공급하는 공급사·제조사', emoji: '🏭' },
  { role: 'partner',     label: '파트너',       description: '마케팅·협업으로 참여하는 파트너', emoji: '🤝' },
];
```

### 1-D. 역할별 추가 입력 분기

| 역할 | 추가 입력 필드 | 라인 |
|------|----------------|------|
| `user` | 없음 | - |
| `store_owner` | 매장명(필수) + 업종 + 매장 지역 + 담당자명 + 담당자 연락처 | 697-771 |
| `supplier` | 회사명(필수) + 대표자명(필수) + 사업장 주소(필수) + 담당자명(필수) + 담당자 연락처(필수, ≥10자) + 사업자등록번호 + 세금계산서 이메일 + 업종 | 775-909 |
| `partner` | 활동명/회사명(필수) + 활동 분야 + 담당자명 + 담당자 연락처 | 913-974 |

### 1-E. 제출 흐름

```typescript
// RegisterModal.tsx:220-291
await api.post('/auth/register', {
  email, password, name, lastName, firstName, phone,
  role: selectedRole,    // 'supplier' | 'partner' | 'store_owner' | 'user'
  service: 'neture',
  companyName, businessNumber, businessType, representativeName,
  taxInvoiceEmail, contactName, managerPhone,
  address1: businessAddress, address2: businessAddressDetail,
  agreeTerms, agreePrivacy, agreeMarketing,
});
```

성공 시 → `setStep(3)` 완료 화면 → 자동 로그인 **없음** → 운영자 승인 대기.

---

## 2. 현재 가입 신청 API 흐름

### 2-A. 호출 endpoint

**전역 공용** (KPA / GlycoPharm / K-Cosmetics / Neture 모두 동일):
- `POST /api/v1/auth/register` (또는 alias `/api/v1/auth/signup`)
- 마운트: [apps/api-server/src/modules/auth/routes/auth.routes.ts:49-61](../../apps/api-server/src/modules/auth/routes/auth.routes.ts#L49-L61)
- Controller: [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts)

### 2-B. 가입 시점 생성/변경 row

| 테이블 | 동작 | 값 | 비고 |
|--------|------|-----|------|
| `users` | INSERT | `status='PENDING'`, password hashed, `businessInfo` JSON 저장 | `role` 컬럼 자체는 Phase3-E 에서 제거됨 |
| `service_memberships` | INSERT | `service_key='neture'`, `status='pending'`, `role={frontend role}` | UNIQUE(userId, serviceKey) |
| `service_credentials` | INSERT (dual-write) | service 별 비밀번호 — 기존 O4O 계정과 분리된 비밀번호 지원 | 라인 309-321 |
| `role_assignments` | **생성 안 함** | - | **승인 시에만 생성** |
| `neture_suppliers` | **생성 안 함** | - | **승인 시에만 PENDING 으로 생성** |
| `organizations` | **생성 안 함** | - | supplier 승인 시 자동 생성 |

### 2-C. role 정규화 (가입 시점)

```typescript
// auth-register.controller.ts:56-60
const VALID_ROLES = [
  'super_admin', 'admin', 'vendor', 'seller', 'store_owner', 'user',
  'business', 'partner', 'supplier', 'manager', 'customer', 'pharmacy'
];
const rawRole = data.membershipType === 'student'
  ? 'user'
  : (data.role || 'customer');   // ⚠ default fallback = 'customer'
const effectiveRole = VALID_ROLES.includes(rawRole) ? rawRole : 'user';
```

> **⚠ 발견 1 (Smoking Gun)**: `data.role` 미전송 시 default 가 `'customer'`. frontend RegisterModal 은 항상 `role` 을 전송하지만, 다른 진입 경로/legacy 호출에서 빈 값으로 들어오면 service_memberships.role 이 `'customer'` 로 저장됨 → 운영자 화면에서 "소비자" 로 표시되는 원인.

---

## 3. 현재 운영자 승인 화면 흐름

### 3-A. UI

**파일**: [services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx](../../services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx)
**라우트**: `/operator/applications` ([App.tsx:975](../../services/web-neture/src/App.tsx#L975))
**Guard**: `<OperatorRoute>` → `OPERATOR_OR_ABOVE_ROLES` + `requireMembership='neture'`

### 3-B. 데이터 조회

| API | 메서드 | 비고 |
|-----|--------|------|
| `GET /neture/operator/registrations` | `operatorRegistrationApi.getRegistrations()` | service_memberships JOIN users JOIN neture_suppliers (좌조인) |
| `POST /neture/operator/registrations/:userId/approve` | `.approve(userId)` | 단일 승인 |
| `POST /neture/operator/registrations/:userId/reject` | `.reject(userId, reason)` | 단일 거부 |
| `PATCH /neture/operator/registrations/:userId/notes` | `.updateNotes(userId, notes)` | 운영자 메모 |
| `POST /neture/operator/registrations/batch` | 배치 처리 (max 50) | 각 항목 독립 트랜잭션 |

### 3-C. 화면 역할 표시

[RegistrationRequestsPage.tsx:74-84](../../services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx#L74-L84) 의 `roleLabels`:

```typescript
{
  ALL: '전체',
  admin: '관리자',
  operator: '운영자',
  supplier: '공급자',
  partner: '파트너',
  user: '사용자',
  seller: '판매자',      // legacy
  pharmacist: '약사회원', // legacy
}
```

직전 `8ee4c0f97` (WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1) 에서 `consumer: '소비자'` 라벨 제거 + default fallback `'consumer' → 'user'` 정렬. 단, **§2-C 의 backend default fallback `'customer'` 는 여전히 살아 있음**.

---

## 4. 현재 승인 처리 로직

**파일**: [apps/api-server/src/modules/neture/services/operator-registration.service.ts](../../apps/api-server/src/modules/neture/services/operator-registration.service.ts)

### 4-A. `approveRegistration()` 트랜잭션 (라인 85-218)

```
[BEGIN]
  1. SELECT id, role FROM service_memberships
       WHERE user_id = $1 AND service_key='neture' AND status IN ('pending','rejected')
     → currentRole 확보
  2. UPDATE service_memberships SET status='active', approved_by, approved_at=NOW()
  3. UPDATE users SET status='active', isActive=true, approvedAt, approvedBy
  4. INSERT role_assignments (role={normalize(currentRole)}, is_active=true, valid_from=NOW())
       ON CONFLICT(user_id, role, is_active) DO UPDATE SET updated_at
  5. IF rawRole === 'supplier':
       INSERT neture_suppliers (status='PENDING', slug, contact_email, ...)
       IF businessName: INSERT organizations (code='neture-supplier-xxxxxxxx')
[COMMIT]
```

### 4-B. role 정규화 규칙 (승인 시)

`apps/api-server/src/modules/neture/services/operator-registration.service.ts` (WO-NETURE-ROLE-NORMALIZATION-V1):

| 입력 role | role_assignments.role | 비고 |
|----------|----------------------|------|
| `admin` | `neture:admin` | prefix 부여 |
| `operator` | `neture:operator` | prefix 부여 |
| `supplier` | `supplier` (unprefixed) | legacy 유지 |
| `partner` | `partner` (unprefixed) | legacy 유지 |
| `store_owner` | `store_owner` (unprefixed) | canonical, prefix 없음 |
| `user`, `customer` 등 | 그대로 (unprefixed) | RBAC role 로 동작하지 않음 |

> **⚠ 발견 2**: admin/operator 만 prefix. 다른 service-membership role 은 unprefixed 로 role_assignments 에 INSERT. KPA 의 `kpa:pharmacist` / `kpa:store_owner` 패턴과 비대칭.

### 4-C. `rejectRegistration()` (라인 224-242)

```sql
UPDATE service_memberships
SET status='rejected', approved_by, approved_at=NOW(), rejection_reason=$1
WHERE user_id=$2 AND service_key='neture' AND status='pending'
```

- `users.status` 는 변경하지 않음 (다른 서비스 가입 영향 차단)
- `role_assignments` 생성 안 함

---

## 5. 현재 role_assignments 생성 시점

| 단계 | role_assignments | 비고 |
|------|------------------|------|
| Step 1 가입 신청 | ❌ 생성 안 함 | service_memberships(status=pending) 만 |
| Step 4 운영자 승인 | ✅ INSERT (is_active=true, valid_from=NOW()) | role 은 service_memberships.role 에서 정규화 후 사용 |
| Step 4 거부 | ❌ 생성 안 함 | - |
| 승인 후 추가 가입 (다른 서비스) | 동일 흐름 — 각 service 별 별도 row | - |

→ **기준 프로세스 6 단계 (승인 후 역할 확정) 와 일치**.

---

## 6. 현재 service_memberships role/status 처리 방식

### 6-A. 컬럼 의미

| 컬럼 | 가입 시 | 승인 후 | 거부 후 | 정지 후 |
|------|---------|---------|---------|---------|
| `status` | `'pending'` | `'active'` | `'rejected'` | `'suspended'` |
| `role` | frontend 가 보낸 값 (`'supplier'`/`'partner'`/`'store_owner'`/`'user'` 등) | 변경 없음 (가입 시 값 그대로 확정) | 변경 없음 | 변경 없음 |
| `approved_by` | NULL | 운영자 user_id | 운영자 user_id | 운영자 user_id |
| `approved_at` | NULL | 시각 | 시각 | 시각 |
| `rejection_reason` | NULL | NULL | 운영자 입력 | NULL |
| `operator_notes` | NULL | NULL/메모 | NULL/메모 | NULL/메모 |

### 6-B. SSOT 정합

- `service_memberships.status` → MembershipGate 의 SSOT (frontend + backend middleware 모두 이 값을 본다)
- `service_memberships.role` → 운영자 화면 표시용. RBAC 게이트로는 사용 안 함
- `role_assignments.role` → 실제 RBAC 게이트의 SSOT (RoleGuard.hasAnyRole)
- **두 테이블 동시에 일관성 유지** — 승인 트랜잭션 안에서 동시 갱신

---

## 7. supplier / partner / operator 별 저장 위치와 상태 변화

### 7-A. supplier (공급자)

| 단계 | users | service_memberships | role_assignments | neture_suppliers | organizations |
|------|-------|--------------------|--------------------|--------------------|----------------|
| 가입 | PENDING, businessInfo JSON | role='supplier', status='pending' | 없음 | 없음 | 없음 |
| 승인 | active, isActive=true | role='supplier', status='active' | role='supplier', is_active=true | status='**PENDING**' (2-step) | code='neture-supplier-XXXX' |
| **공급 승인** (별도) | - | - | - | status='**ACTIVE**' | - |
| 거부 | - | status='rejected' | 없음 | 없음 | 없음 |

> **⚠ 발견 3 (2-step activation)**: 가입 승인 ≠ 공급 승인. 가입 승인 시 neture_suppliers 는 `PENDING` 으로만 생성. 공급자 대시보드 진입 자체는 role_assignments + service_memberships 만으로도 가능하나, 실제 supplier 기능 (상품 등록 등) 은 neture_suppliers.status='ACTIVE' 필요.

### 7-B. partner (파트너)

| 단계 | users | service_memberships | role_assignments | partner-specific |
|------|-------|--------------------|--------------------|--------------------|
| 가입 | PENDING | role='partner', status='pending' | 없음 | 없음 |
| 승인 | active | role='partner', status='active' | role='partner', is_active=true | (별도 partner entity 자동 생성 흐름은 본 IR 범위에서 확정 못 함 — `apps/api-server/src/modules/partner/` 추가 조사 필요) |
| 거부 | - | status='rejected' | 없음 | - |

> **⚠ 발견 4**: supplier 와 달리 partner 의 도메인 entity 자동 생성 흐름이 `operator-registration.service.ts` 에 명시되지 않음. partner 가입 승인 후 추가 partner_application 절차가 별도 존재하는지 확인 필요.

### 7-C. operator (운영자)

> **가입 시점 선택 불가** — RegisterModal 의 `SignupRole` type 에 `'operator'` 부재. operator role 은 admin 수동 부여 경로로만 생성됨.

| 단계 | 비고 |
|------|------|
| 가입 | operator 옵션 없음 (의도적 — KPA-Society 도 동일) |
| 수동 부여 | admin 이 `/admin/operators` 또는 `EditUserModal` 의 `adminRoleOptions` 에서 `neture:operator` 할당 |
| RBAC | role_assignments INSERT (`role='neture:operator'`) |

---

## 8. consumer / customer / user / seller legacy 값 잔존 여부

### 8-A. Frontend

| 위치 | 잔존 키 | 노출 여부 | 비고 |
|------|--------|----------|------|
| RegisterModal `roleOptions` | `user` (일반 이용자) | ✅ 노출 | 기준 프로세스 위반 — "소비자/일반회원은 사용하지 않는다" |
| RegisterModal `SignupRole` type | `'user'` | ✅ | 위와 동일 |
| EditUserModal `membershipRoleOptions` | (없음 — 직전 커밋으로 customer/seller 제거) | ❌ | 정렬 완료 |
| UsersManagementPage `NETURE_ROLE_DISPLAY` | (빈 객체) | ❌ | 정렬 완료 |
| RegistrationRequestsPage `roleLabels` | `seller`, `pharmacist`, `user` | legacy 데이터 표시용 | consumer 제거 완료 |
| RegistrationRequestsPage `UserRole` type | `'user'` (consumer 제거 완료) | - | 정렬 완료 |
| `config/dashboard.ts` ROLE_LABELS | `store_owner`, `neture:seller`, `seller` (legacy) | - | store_owner canonical 정렬 진행 중 |

### 8-B. Backend

| 위치 | 잔존 키 | 비고 |
|------|--------|------|
| `auth-register.controller.ts:56` VALID_ROLES | `'customer'`, `'vendor'`, `'seller'`, `'pharmacy'`, `'manager'`, `'business'` | legacy 호환 — Neture 외 다른 서비스 가입 흐름 호환 |
| `auth-register.controller.ts:59` default fallback | `(data.role \|\| 'customer')` | **⚠ 가장 위험한 잔존** — Neture 가입 시 role 누락되면 customer 저장 |
| `operator-registration.service.ts:287-297` 우선순위 분류 | `'supplier'`, `'seller'` 모두 medium | seller 가 supplier 와 동급으로 처리되는 legacy 흐름 |

### 8-C. DB

- `service_memberships.role` 컬럼에 'customer' / 'seller' / 'consumer' row 존재 가능 (가입 시 frontend 가 role 미전송했거나 legacy 흐름)
- `role_assignments.role` 컬럼은 admin/operator 만 prefix → 'customer' 같은 값이 raw 로 들어 있을 가능성
- 진단 SQL §15.2 로 확인

---

## 9. 공급자 신청자가 소비자로 표시될 수 있는 원인 후보

### 9-A. 후보 1 — Backend default fallback (가장 가능성 높음) ⚠⚠⚠

**위치**: [auth-register.controller.ts:59](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L59)

```typescript
const rawRole = data.membershipType === 'student'
  ? 'user'
  : (data.role || 'customer');   // ← role 미전송 시 customer
```

**시나리오**:
- frontend 가 `selectedRole` 을 정상 전송 (`'supplier'`) — 정상 흐름은 영향 없음
- 그러나 과거 RegisterModal 버전이 `role` 필드를 다른 키로 보냈거나, axios payload 가 직렬화 과정에 누락된 케이스가 있다면 `data.role` 이 `undefined` → `'customer'` 로 저장
- 결과: `service_memberships.role = 'customer'` → 운영자 화면에서 "소비자" 로 표시

**검증 방법**: §15.4 진단 SQL

### 9-B. 후보 2 — frontend 가 'user' 로 보낸 케이스

- 사용자가 Step 2 에서 '일반 이용자(user)' 를 선택한 후 가입 — 이 경우 정상 동작 (소비자 아님, '사용자' 라벨)
- 단, 사용자가 의도는 공급자였는데 실수로 '일반 이용자' 선택했을 가능성. UI 측면에서 supplier/partner 선택을 우선 노출하지 않아 발생 가능

### 9-C. 후보 3 — DB 직접 조작 / legacy data

- 운영 초기 / 마이그레이션 / seed 등에서 'customer' / 'consumer' role 이 직접 들어간 row
- 진단 SQL §15.2 로 확인 — created_at 분포로 시점 추적

### 9-D. 후보 4 — 다른 서비스 가입 시 backend 가 동일 controller 사용

- 동일 `/auth/register` 가 KPA / GlycoPharm / K-Cosmetics 도 사용. service='neture' 미전송 + role 미전송이면 Neture 가입으로 처리되어 'customer' fallback

### 9-E. 후보 5 — `EditUserModal` 의 customer 옵션 (정렬 전)

- 본 세션 직전 `8ee4c0f97` 커밋 이전, 운영자가 회원 편집 모달에서 "소비자(customer)" 옵션을 선택해 role 변경한 흔적이 있을 수 있음
- 옵션 자체는 제거되었지만 DB 에 customer 로 저장된 row 는 남아 있을 가능성

---

## 10. 현재 구조와 기준 프로세스의 GAP 목록

| # | 기준 프로세스 항목 | 현재 구조 | GAP | 심각도 |
|:-:|--------------------|----------|------|:------:|
| G1 | "소비자/일반회원은 Neture 신청 역할로 사용하지 않는다" | `roleOptions` 에 `'user' = '일반 이용자'` 노출 | **위반** — '일반 이용자' 옵션 제거 또는 의미 재정의 필요 | **High** |
| G2 | Step 2 신청 역할 = 공급자/파트너/운영자 | 가입 시 `operator` 선택 불가 (의도적) | 의도된 제약 — KPA 와 동일 패턴. **GAP 아님** (기준 프로세스 재해석 필요) | Info |
| G3 | "운영자 승인 후에 Neture 역할이 확정된다" | service_memberships.role 은 가입 시점에 확정 — 승인 시에는 status 만 변경 | 부분 위반 — role 확정 시점은 가입 시점, 운영자가 승인하면서 role 을 바꿀 수 있는 UI 부재 | Medium |
| G4 | "확정된 역할에 따라 해당 대시보드 접근 권한이 부여된다" | role_assignments 는 승인 시 생성됨 ✅ + MembershipGate ✅ | **충족** | Info |
| G5 | 기본 정보와 역할 선택의 분리 | Step 1=기본정보, Step 2=역할+추가입력 (분리됨) | **충족** | Info |
| G6 | Backend default fallback `'customer'` (auth-register.controller:59) | data.role 미전송 시 'customer' 저장 | **위반** — Neture default 는 'user' 가 되어야 함 | **High** |
| G7 | VALID_ROLES 에 `customer`, `vendor`, `seller`, `pharmacy` 잔존 | legacy 호환을 위해 유지 | 다른 서비스(KPA/GlycoPharm/K-Cos) 호환 필요 — Neture 분리 호출은 별도 검증 | Low |
| G8 | RegistrationRequestsPage 의 seller/pharmacist 라벨 잔존 | legacy data 표시 호환 위해 유지 | 의도적 — **GAP 아님** | Info |
| G9 | partner 승인 시 partner-specific entity 자동 생성 흐름 미확정 | operator-registration.service.ts 에 partner 자동 생성 로직 부재 | 추가 조사 필요 (별도 partner_application 절차 존재 여부) | Medium |
| G10 | supplier 2-step activation (가입 승인 ≠ 공급 승인) | neture_suppliers.status='PENDING' → 별도 공급 승인 필요 | 의도된 설계 (WO-NETURE-SUPPLIER-APPROVAL-TWO-STEP-ACTIVATION-V1) | Info |
| G11 | 거부 시 신청자에게 이메일 알림 | UI 안내 문구는 있으나 backend 이메일 발송 로직 미구현 | 위반 — 알림 미발송 | Medium |
| G12 | service_memberships.role 정규화 (supplier vs neture:supplier) | unprefixed 저장 + role_assignments 도 unprefixed (admin/operator 만 prefix) | KPA-Society 와 비대칭 (`kpa:pharmacist` 패턴) | Low |
| G13 | 가입 시 store_owner 옵션 (canonical) | 노출 ✅, backend VALID_ROLES 포함 ✅ | **충족** (직전 `72a191b76` 정렬) | Info |

---

## 11. 수정이 필요한 파일 목록

### 11-A. **High Priority** (G1, G6)

| 파일 | 변경 내용 | 영향 |
|------|----------|------|
| [services/web-neture/src/components/RegisterModal.tsx](../../services/web-neture/src/components/RegisterModal.tsx) | `roleOptions` 에서 `user` 제거 (또는 의미 재정의 — "광고/소식 받기"용 free user 라면 유지하되 별도 group 으로 분리) | 가입 화면 UX 변경 |
| [services/web-neture/src/components/RegisterModal.tsx](../../services/web-neture/src/components/RegisterModal.tsx) | `SignupRole` type 에서 `'user'` 제거 (또는 유지) | type-level |
| [apps/api-server/src/modules/auth/controllers/auth-register.controller.ts](../../apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) | L59: `(data.role \|\| 'customer')` → service 별 default 분기. Neture 의 경우 `'user'` 또는 명시적 에러 발생 | backend 호환성 영향 — KPA/GlycoPharm/K-Cos 와 분기 필요 |

### 11-B. **Medium Priority** (G3, G9, G11)

| 파일 | 변경 내용 |
|------|----------|
| [apps/api-server/src/modules/neture/services/operator-registration.service.ts](../../apps/api-server/src/modules/neture/services/operator-registration.service.ts) | partner 승인 시 partner-specific entity 자동 생성 흐름 추가 검토 |
| 동일 파일 | 거부 시 신청자 이메일 알림 발송 추가 |
| (선택) RegistrationRequestsPage | 승인 시 운영자가 service_memberships.role 변경 가능한 UI 추가 (G3 보완) |

### 11-C. **Low Priority** (G12)

| 파일 | 변경 내용 |
|------|----------|
| `operator-registration.service.ts` role 정규화 | supplier/partner 도 `neture:supplier` / `neture:partner` prefix 부여 검토 (KPA 정렬). 단 SUPPLIER_ROLES 배열·MembershipGate·기존 데이터 영향 큼 — 별도 IR 필수 |

---

## 12. Backend 수정 필요 여부

✅ **필요** — 다음 항목들:

1. **G6 (High)**: `auth-register.controller.ts:59` default fallback `'customer'` → service 별 분기 또는 에러 처리
2. **G9 (Medium)**: partner 승인 시 partner_application/entity 자동 생성 흐름 확정·구현
3. **G11 (Medium)**: 거부 시 이메일 알림 backend 발송 로직 추가
4. **G12 (Low)**: supplier/partner role prefix 정렬 (별도 IR 선행)

영향 영역: `apps/api-server/src/modules/auth/`, `apps/api-server/src/modules/neture/`

---

## 13. Frontend 수정 필요 여부

✅ **필요** — 다음 항목들:

1. **G1 (High)**: `RegisterModal.tsx` 의 `roleOptions` 에서 `'user'` 제거 또는 의미 분리 (예: "광고/소식 알림용 일반 계정" 별도 group)
2. **G1 (High)**: `SignupRole` type 정합
3. **G3 (Medium)**: RegistrationRequestsPage 의 승인 시 운영자가 role 변경 가능 옵션 (옵션)

영향 영역: `services/web-neture/src/components/RegisterModal.tsx`, `services/web-neture/src/pages/operator/registrations/`

---

## 14. DB 보정 필요 여부

⚠ **조건부 필요** — 진단 SQL (§15) 결과에 따라:

| 진단 결과 | 보정 필요 |
|----------|-----------|
| `service_memberships.role='customer'` row 0 건 | 불필요 |
| `service_memberships.role='customer'` row 존재 + 해당 사용자가 실제 공급자/파트너 가입자 | **개별 보정** (사용자 단위 — `service_memberships.role` 갱신 + role_assignments INSERT) |
| `service_memberships.role='consumer'` 또는 기타 비정상 값 | 보정 또는 cleanup |
| supplier 신청자인데 role_assignments 누락 | role_assignments INSERT 보정 |

**Renagang21 계정 보정**: 사용자 수작업 예정 — Claude Code 가 보정하지 않음 (사용자 지시).

---

## 15. 진단 SQL 셋 (사용자 직접 실행)

> 모두 read-only SELECT. CLAUDE.md §0 에 따라 Cloud SQL Studio 또는 `gcloud sql connect` 로 실행.

### 15.1 Neture 가입 신청 현황

```sql
SELECT
  sm.status AS membership_status,
  sm.role AS membership_role,
  COUNT(*) AS row_count
FROM service_memberships sm
WHERE sm.service_key = 'neture'
GROUP BY sm.status, sm.role
ORDER BY sm.status, row_count DESC;
```

**판독**: role 값 분포. `customer` / `consumer` / `user` 가 얼마나 있는지 확인.

### 15.2 Customer/Consumer 잔존 row 상세 (G6 검증)

```sql
SELECT
  u.id, u.email, u.status AS user_status,
  sm.role AS membership_role, sm.status AS membership_status,
  sm.created_at, sm.approved_at,
  ARRAY(
    SELECT ra.role FROM role_assignments ra
    WHERE ra.user_id = u.id AND ra.is_active = true
  ) AS active_roles
FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE sm.service_key = 'neture'
  AND sm.role IN ('customer', 'consumer')
ORDER BY sm.created_at DESC
LIMIT 50;
```

**판독**: 가입 시점, 실제 사용자 의도 (businessInfo JSON 으로 확인 가능), 보정 우선순위.

### 15.3 Pending 가입 신청 분포

```sql
SELECT
  sm.role AS requested_role,
  COUNT(*) AS pending_count,
  MIN(sm.created_at) AS earliest_pending,
  MAX(sm.created_at) AS latest_pending
FROM service_memberships sm
WHERE sm.service_key = 'neture'
  AND sm.status = 'pending'
GROUP BY sm.role
ORDER BY pending_count DESC;
```

### 15.4 Role 누락 row (G6 — backend fallback 영향)

```sql
SELECT
  u.id, u.email,
  sm.role AS membership_role,
  u."businessInfo"->>'requestedRole' AS business_info_requested_role,
  u."businessInfo"->>'businessNumber' AS business_number,
  u."businessInfo"->>'companyName' AS company_name,
  sm.created_at
FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE sm.service_key = 'neture'
  AND sm.role = 'customer'
  AND (u."businessInfo"->>'businessNumber' IS NOT NULL
       OR u."businessInfo"->>'companyName' IS NOT NULL)
ORDER BY sm.created_at DESC;
```

**판독**: role=customer 인데 사업자 정보가 있는 사용자 → 실제로는 공급자/파트너 가입자였으나 default fallback 으로 customer 저장된 케이스. 보정 우선순위 1.

### 15.5 승인 후 role_assignments 누락 row (G3/G4 검증)

```sql
SELECT
  u.email, sm.role, sm.status, sm.approved_at,
  COUNT(ra.id) AS active_role_count
FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra
  ON ra.user_id = u.id AND ra.is_active = true
WHERE sm.service_key = 'neture'
  AND sm.status = 'active'
GROUP BY u.email, sm.role, sm.status, sm.approved_at
HAVING COUNT(ra.id) = 0
ORDER BY sm.approved_at DESC;
```

**판독**: 승인됐는데 role_assignments 가 없는 사용자 → 승인 트랜잭션이 부분 성공한 흔적. 보정 필요.

### 15.6 Renagang21 종합 진단 (사용자 검증용)

```sql
-- (1) 사용자 식별
SELECT id, email, status, "isActive", "isEmailVerified", "createdAt"
FROM users WHERE email ILIKE '%renagang%' OR email = 'renagang21@gmail.com';

-- (2) service_memberships (Neture)
SELECT id, user_id, service_key, role, status, created_at, approved_at, rejection_reason
FROM service_memberships
WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%renagang%')
ORDER BY service_key, created_at;

-- (3) role_assignments
SELECT user_id, role, is_active, valid_from, valid_until, assigned_by, scope_type, scope_id
FROM role_assignments
WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%renagang%')
ORDER BY role;

-- (4) neture_suppliers (공급자 데이터)
SELECT id, user_id, slug, status, contact_email, business_number, organization_id, created_at, approved_at
FROM neture_suppliers
WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%renagang%');

-- (5) businessInfo (가입 시 제출한 원본)
SELECT id, email, "businessInfo"
FROM users WHERE email ILIKE '%renagang%';
```

---

## 부록 A. 권장 후속 WO 제안

| # | 권장 WO | 우선순위 | 범위 |
|:-:|---------|:--------:|------|
| W1 | **WO-O4O-NETURE-AUTH-REGISTER-DEFAULT-FALLBACK-FIX-V1** | High | `auth-register.controller.ts:59` default fallback `'customer'` → service 별 분기 (Neture='user', KPA=식별 안 함 등). Smoke + DB 보정 SQL 포함. |
| W2 | **WO-O4O-NETURE-REGISTER-MODAL-ROLE-OPTIONS-REALIGN-V1** | High | RegisterModal.tsx `roleOptions` 에서 `'user'` 제거 또는 "광고 알림용 free 계정" 으로 의미 분리. SignupRole type 정합. |
| W3 | **WO-O4O-NETURE-LEGACY-ROLE-DATA-CLEANUP-V1** | Medium | §15.2 / §15.4 진단 SQL 결과 기반 데이터 보정 마이그레이션. supplier/partner 의도였는데 customer 로 저장된 row 단위 정정 + role_assignments INSERT. |
| W4 | **WO-O4O-NETURE-REGISTRATION-REJECTION-NOTIFICATION-V1** | Medium | 거부 시 신청자 이메일 발송 backend 흐름 추가. UI 안내 문구 정합. |
| W5 | **IR-O4O-NETURE-PARTNER-APPROVAL-ACTIVATION-FLOW-V1** | Medium | partner 승인 시 partner-specific entity 자동 생성 흐름 조사 (현 IR 에서 미확정 — operator-registration.service.ts 에 명시 부재). |
| W6 | **IR-O4O-NETURE-ROLE-PREFIX-NORMALIZATION-V1** | Low | supplier/partner role 의 `neture:` prefix 부여 가능성 + 영향 범위 (SUPPLIER_ROLES, MembershipGate, 기존 데이터) 조사. |

---

## 부록 B. 최종 보고

| 항목 | 값 |
|------|-----|
| 코드 수정 없음 | ✅ 확인 |
| DB 수정 없음 | ✅ 확인 |
| Renagang21 보정 없음 | ✅ 확인 |
| migration 생성 없음 | ✅ 확인 |
| 조사 보고서 작성 위치 | `docs/investigations/IR-O4O-NETURE-REGISTRATION-ROLE-CONFIRMATION-FLOW-AUDIT-V1.md` |
| 핵심 GAP | G1 (RegisterModal `user` 옵션 노출) + G6 (auth-register default fallback `'customer'`) |
| Smoking Gun | `auth-register.controller.ts:59` 의 `(data.role \|\| 'customer')` |
| 권장 첫 번째 WO | **WO-O4O-NETURE-AUTH-REGISTER-DEFAULT-FALLBACK-FIX-V1** (W1) |

---

*Author: Claude (read-only investigation)*
*Investigation date: 2026-05-27*
*Status: completed — awaiting first cleanup WO scope confirmation*
