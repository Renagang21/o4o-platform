# KPA-a Auth Flow Audit V1

> WO-KPA-A-AUTH-FLOW-AUDIT-V1 | As-Is 조사 결과 | 2026-02-27

---

## 1. 상태 전이도 (State Diagram)

### 1-1. 계정/승인 상태 (Approval State)

```
Guest
  │
  ├─ (회원가입 POST /auth/register) ──────────┐
  │                                            ▼
  │                                   users.status = 'pending'
  │                                   kpa_members.status = 'pending'
  │                                   kpa_member_services.status = 'pending'
  │                                            │
  │                          ┌─────────────────┼─────────────────┐
  │                          ▼                 ▼                 ▼
  │              PATCH /members/:id/status
  │                          │
  │              ┌───────────┼──────────┐
  │              ▼           ▼          ▼
  │          'active'    'rejected'  (유지 pending)
  │              │       → REJECTED
  │              ▼
  │     kpa_members.status = 'active'
  │     kpa_member_services.status = 'approved'
  │     users.status = 'active'
  │     users.isActive = true
  │     ⚠ users.roles = array_append(kpaRole)  ← BROKEN (column dropped)
  │     ❌ role_assignments INSERT 누락
  │              │
  │              ▼
  │          APPROVED (로그인 가능)
  │              │
  │     ┌────────┼──────────┐
  │     ▼        ▼          ▼
  │  SUSPEND   WITHDRAW   FUNCTION_CHANGE
  │     │        │          │
  │     ▼        ▼          ▼
  │  'suspended' 'withdrawn'  activity_type 변경
  │     │                      (PATCH /members/me/profession)
  │     ▼
  │  REACTIVATE → 'active'
```

### 1-2. 전문 구분 (Professional Type)

```
가입 시 선택: membership_type = 'pharmacist' | 'student'
→ kpa_members.membership_type에 저장
→ 변경 API 없음 (약대생→약사 전환 경로 부재)
```

### 1-3. 직무 (Function = activity_type)

```
가입 시 선택(선택사항):
  pharmacy_owner | pharmacy_employee | hospital | manufacturer |
  importer | wholesaler | other_industry | government | school | other | inactive

저장 위치: kpa_members.activity_type + kpa_pharmacist_profiles.activity_type (중복)

변경: PATCH /kpa/members/me/profession → kpa_members.activity_type 업데이트
     PATCH /auth/pharmacist-profile → kpa_pharmacist_profiles.activity_type UPSERT
```

### 1-4. 시스템 권한 (Role)

```
SSOT: role_assignments 테이블
KPA roles: 'kpa:pharmacist', 'kpa:student', 'kpa:admin', 'kpa:operator'

⚠ 승인 시 role_assignments에 INSERT하지 않음 (Gap-1)
```

---

## 2. API Evidence Table (서버 증거표)

### 2-1. 가입

| Endpoint | Guard | 동작 | 테이블 변경 | 파일 |
|----------|-------|------|------------|------|
| `POST /api/v1/auth/register` (service=kpa-society) | 없음 | User 생성 + kpa_members + kpa_member_services + kpa_pharmacist_profiles | users, kpa_members, kpa_member_services, kpa_pharmacist_profiles | `auth.controller.ts:274` |
| `POST /api/v1/kpa/members/apply` | requireAuth | KpaMember 생성 + KpaMemberService 생성 | kpa_members, kpa_member_services | `member.controller.ts:88` |

### 2-2. 승인

| Endpoint | Guard | 동작 | 테이블 변경 | 파일 |
|----------|-------|------|------------|------|
| `PATCH /api/v1/kpa/members/:id/status` | kpa:operator | member.status 변경 + User sync + service record sync | kpa_members, kpa_member_services, users (BROKEN) | `member.controller.ts:251` |
| `PATCH /api/v1/kpa/applications/:id/review` | kpa:admin | application.status 변경 | kpa_applications (member/role 변경 없음) | `application.controller.ts:317` |

### 2-3. 로그인/인증 응답

| Endpoint | 반환 데이터 | 근거 소스 | 파일 |
|----------|-----------|----------|------|
| `GET /api/v1/auth/me` | roles[], pharmacistRole, pharmacistFunction, isStoreOwner | role_assignments (middleware) + kpa_pharmacist_profiles (derive) | `auth.controller.ts:40-87, 544` |
| `GET /api/v1/kpa/members/me` | member status, role, activity_type, fee_category | kpa_members | `member.controller.ts:41` |
| `GET /api/v1/kpa/me/membership` | organizationId, role, status | kpa_members + organizations | `kpa.routes.ts:253` |

### 2-4. 직무/역할 변경

| Endpoint | Guard | 동작 | 테이블 | 파일 |
|----------|-------|------|--------|------|
| `PATCH /api/v1/kpa/members/me/profession` | requireAuth | activity_type, fee_category 변경 | kpa_members | `member.controller.ts:393` |
| `PATCH /api/v1/auth/pharmacist-profile` | requireAuth | activity_type UPSERT | kpa_pharmacist_profiles | `auth.controller.ts:594` |
| `PATCH /api/v1/kpa/members/:id/role` | kpa:admin | member.role (member/operator/admin) 변경 | kpa_members | `member.controller.ts:435` |

---

## 3. DB Separation View (As-Is)

### 3-1. 저장 위치 도표

| 관심사 | 저장 위치 | 컬럼 | 비고 |
|--------|----------|------|------|
| **Identity** | `users` | id, email, password, name, status, isActive | Core |
| **Approval (Service)** | `kpa_member_services` | member_id, service_key, status | 서비스별 승인 |
| **Approval (Member)** | `kpa_members` | user_id, organization_id, status | 조직 가입 승인 |
| **Approval (Application)** | `kpa_applications` | user_id, organization_id, type, status | 범용 신청 |
| **Professional Type** | `kpa_members` | membership_type ('pharmacist'/'student') | 변경 API 없음 |
| **Function (Activity)** | `kpa_members` | activity_type, fee_category | 주 저장소 |
| **Function (Profile)** | `kpa_pharmacist_profiles` | activity_type, license_number, license_verified | 중복 저장 |
| **Pharmacy Info** | `kpa_members` | pharmacy_name, pharmacy_address | |
| **Pharmacy Request** | `kpa_pharmacy_requests` | pharmacy_name, business_number, status | 약국 개설 신청 |
| **Org Role (Layer B)** | `organization_members` | userId, organizationId, role | 조직 내 역할 |
| **System Role (Layer A)** | `role_assignments` | user_id, role, is_active | SSOT |

### 3-2. 분리 원칙 판정

| 관심사 | 현재 | 판정 | 사유 |
|--------|------|------|------|
| Identity ↔ Approval | **분리됨** | PASS | users vs kpa_members/kpa_member_services |
| Approval ↔ Role | **혼재** | **FAIL** | 승인 시 role_assignments 미연동 (Gap-1) |
| Function ↔ Role | **분리됨** | PASS | activity_type는 kpa_members/profiles, role은 role_assignments |
| Function 저장 | **중복** | RISK | kpa_members.activity_type ≠ kpa_pharmacist_profiles.activity_type 동기화 미보장 |
| Professional Type 변경 | **부재** | RISK | 약대생→약사 전환 API 없음 |

---

## 4. JSON 검증 포인트 목록

### 4-1. `/api/v1/auth/me` 응답 구조

```json
{
  "user": {
    "id": "uuid",
    "email": "string",
    "roles": ["kpa:pharmacist"],      // ← role_assignments 기반 (middleware)
    "role": "kpa:pharmacist",          // ← roles[0] computed
    "status": "active",                // ← users.status
    "pharmacistRole": "pharmacy_owner", // ← kpa_pharmacist_profiles.activity_type 파생
    "pharmacistFunction": "employed",   // ← kpa_pharmacist_profiles.activity_type 파생
    "isStoreOwner": false,             // ← organization_members 'owner' 파생
    "isActive": true
  }
}
```

### 4-2. 단계별 Expected Values

| 단계 | roles[] | status | pharmacistRole | 비고 |
|------|---------|--------|---------------|------|
| 가입 직후 (미승인) | `['user']` (또는 비어있음) | `pending` | null | kpa_members.status='pending' |
| 승인 후 | `['kpa:pharmacist']` ← **현재 안 됨** | `active` | 파생값 | **Gap-1**: role_assignments 미생성 |
| 직무 저장 후 | 변화 없음 | `active` | 파생값 업데이트 | kpa_pharmacist_profiles 기반 |
| 정지 | `[]` ← **현재 안 됨** | `suspended` | null | **Gap-1**: role_assignments 미변경 |

### 4-3. `/api/v1/kpa/members/me` 응답

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "organization_id": "uuid",
    "role": "member",           // ← kpa_members.role (member/operator/admin)
    "status": "active",         // ← kpa_members.status
    "membership_type": "pharmacist",
    "activity_type": "pharmacy_owner",
    "fee_category": "A1_pharmacy_owner",
    "license_number": "12345",
    "pharmacy_name": "OO약국",
    "joined_at": "2026-02-27"
  }
}
```

---

## 5. UX 화면 시나리오

### 시나리오 1: 약사 가입 → 승인 → 첫 로그인

1. **가입 화면** (`/auth/register`): 약사/약대생 선택 + 기본 정보 + 면허번호 + 조직 선택
2. **가입 완료**: users(pending) + kpa_members(pending) + kpa_member_services(pending) 생성
3. **승인 대기**: 로그인은 가능하나 users.status='pending'
4. **운영자 승인** (`/operator` 또는 `/admin`): PATCH /kpa/members/:id/status → 'active'
5. **승인 후 로그인**: users.status='active' → 정상 이용
6. **직무 확정**: PATCH /kpa/members/me/profession 또는 /auth/pharmacist-profile

### 시나리오 2: 약대생 가입

- membership_type='student' → 직무(activity_type) 선택 없음
- 승인 후 kpa:student role 부여 **예정** (현재 broken)

### 시나리오 3: 직무 변경

- `/mypage/profile` → activity_type 변경 → PATCH /kpa/members/me/profession
- 별도 토큰 재발급 불필요 (pharmacistFunction은 /auth/me에서 매번 DB derive)

### 시나리오 4: 약대생 → 약사 전환

- **API 없음** → Gap-5
- 수동 운영 필요 (kpa_members.membership_type 직접 변경)

---

## 6. Gap 리스트

### HIGH (즉시 수정 필요)

| # | Gap | 위치 | 영향 | 수정 방향 |
|---|-----|------|------|----------|
| **Gap-1** | **승인 시 `users.roles` 직접 SQL 조작 — 컬럼 DROP됨** | `member.controller.ts:296-334` | 승인해도 kpa:pharmacist/kpa:student role이 부여되지 않음. 사용자가 서비스 접근 불가. | `roleAssignmentService.assignRole()` 사용으로 전환 |
| **Gap-2** | **승인 시 role_assignments INSERT 누락** | `member.controller.ts:295` | Gap-1과 동일. RBAC SSOT 위반. | 승인 → assignRole(), 정지 → removeRole(), 복원 → assignRole() |

### MEDIUM (운영 리스크)

| # | Gap | 위치 | 영향 | 수정 방향 |
|---|-----|------|------|----------|
| **Gap-3** | **kpa_applications 승인이 member/role 생성 안 함** | `application.controller.ts:317-401` | application 'approved' 후 실제 회원 활성화/역할 부여 별도 필요 | application 승인 → member status 연동 또는 flow 통합 |
| **Gap-4** | **activity_type 이중 저장** | `kpa_members` + `kpa_pharmacist_profiles` | 두 테이블 값이 달라질 수 있음 | 단일 소스 지정 (kpa_pharmacist_profiles 권장) |

### LOW (개선 사항)

| # | Gap | 위치 | 영향 | 수정 방향 |
|---|-----|------|------|----------|
| **Gap-5** | **약대생→약사 전환 API 없음** | 전체 | 수동 운영 필요 | membership_type 변경 API + role 전환 로직 |
| **Gap-6** | **User.toPublicData()에서 pharmacistFunction=null 하드코딩** | `User.ts:296` | Entity 직접 호출 시 항상 null | Auth controller derive 로직과 통합 검토 |

---

## 7. 수정 우선순위 제안

> "수정이 필요하다면 어떤 지점부터 고쳐야 미려해지는지"

### Phase 1: 즉시 수정 (Gap-1, Gap-2)

**`member.controller.ts` 승인 로직을 roleAssignmentService로 전환**

이것만 고치면:
- 승인 → kpa:pharmacist/kpa:student가 role_assignments에 생성
- 정지 → role이 비활성화
- 복원 → role이 재활성화
- RBAC SSOT 완전 준수

```
승인 시: await roleAssignmentService.assignRole({ userId, role: kpaRole })
정지 시: await roleAssignmentService.removeRole(userId, kpaRole)
복원 시: await roleAssignmentService.assignRole({ userId, role: kpaRole })
```

### Phase 2: activity_type 단일화 (Gap-4)

kpa_pharmacist_profiles를 SSOT로 지정, kpa_members.activity_type은 cache/denormalized로 전환하거나 제거.

### Phase 3: 전환 경로 (Gap-5)

약대생→약사 전환 API 구현 (membership_type 변경 + role 전환).

---

*Document Version: 1.0*
*Created: 2026-02-27*
*Audit Type: As-Is Investigation (코드 변경 없음)*
