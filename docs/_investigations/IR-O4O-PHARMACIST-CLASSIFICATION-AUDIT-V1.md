# IR-O4O-PHARMACIST-CLASSIFICATION-AUDIT-V1

> **약국 개설자 분류 저장 위치 조사**
> Investigator: Claude Code | Date: 2026-02-13 | Status: **COMPLETE**

---

## 1. Executive Summary

**결론: "경우 D" + "경우 B" 혼합 — 그러나 연결이 끊어져 있다.**

약국 개설자 분류는 **3개 레이어에 분산 저장**되어 있으나, 레이어 간 연결이 단절되어 있다:

| 레이어 | 저장 위치 | 필드 | 서비스 | 영속성 |
|--------|----------|------|--------|--------|
| **L1: User 프로필** | `users.pharmacistFunction` / `users.pharmacistRole` | VARCHAR(50) | KPA 전용 | DB 컬럼 존재, **Frontend→Server 저장 미구현** |
| **L2: KPA 멤버십** | `kpa_members.activity_type` / `kpa_members.fee_category` | VARCHAR(50) | KPA 전용 | DB 컬럼 존재, Phase 5 추가 |
| **L3: GlycoPharm 약국** | `glycopharm_pharmacies` 존재 여부 | Entity 존재 = 약국 개설자 | GlycoPharm | Application 승인 시 생성 |

**핵심 발견:**
- `pharmacistFunction`/`pharmacistRole`은 User 테이블에 컬럼이 존재하지만, **Frontend에서 서버로 저장하는 API 호출이 구현되어 있지 않음**
- Application 승인 시 **어떤 서비스에서도 역할(Role) 할당이 일어나지 않음** — CRITICAL GAP
- GlycoPharm은 `glycopharm:pharmacy` 역할이 정의되어 있지만 **아무도 이 역할을 부여하지 않음**

---

## 2. 조사 결과 상세

### 2.1 User Entity — 약사 분류 필드

**파일:** `apps/api-server/src/modules/auth/entities/User.ts`

| 필드 | 타입 | 용도 | 추가 시점 |
|------|------|------|----------|
| `pharmacistFunction` | VARCHAR(50) | 직능 구분: `pharmacy` / `hospital` / `industry` / `other` | Migration 20260205104038 |
| `pharmacistRole` | VARCHAR(50) | 직역 구분: `general` / `pharmacy_owner` / `hospital` / `other` | Migration 20260205104038 |
| `role` | ENUM(UserRole) | **DEPRECATED** — `super_admin`, `admin`, `user`, `vendor`, etc. | 초기 |
| `roles` | TEXT[] | **DEPRECATED** — 레거시 다중 역할 | Phase 4 변환 |
| `serviceKey` | VARCHAR(100) | 서비스 격리: `kpa-society`, `platform`, etc. | Migration 20260205104038 |

**판정:**
- `pharmacistFunction = 'pharmacy'` + `pharmacistRole = 'pharmacy_owner'` → **약국 개설자**
- 이 필드들은 DB 컬럼으로 존재하나, **실제로 채워지고 있는지가 문제**

---

### 2.2 Frontend 수집 경로 — FunctionGateModal

**파일:** `services/web-kpa-society/src/components/FunctionGateModal.tsx`

로그인 직후 표시되는 1회성 모달. **KPA Society 전용.**

| 선택지 | `pharmacistFunction` | `pharmacistRole` |
|--------|---------------------|------------------|
| 근무 약사 | `pharmacy` | `general` |
| **개설 약사** | `pharmacy` | **`pharmacy_owner`** |
| 병원 약사 | `hospital` | `hospital` |
| 산업 약사 | `industry` | `general` |
| 기타 약사 | `other` | `other` |

**Admin/Operator 제외:** `admin`, `super_admin`, `district_admin`, `branch_admin`, `operator` 역할은 모달 자동 닫힘

**CRITICAL GAP — 서버 저장 미구현:**
```
FunctionGateModal
    ↓ setPharmacistFunction(value)  ← AuthContext state만 업데이트
    ↓ setPharmacistRole(value)      ← AuthContext state만 업데이트
    ✗ API 호출 없음                  ← 서버에 저장되지 않음!
```

**결과:** 사용자가 "개설 약사"를 선택해도 **페이지 새로고침 시 초기화됨**

---

### 2.3 등록(Registration) 시점 — pharmacistFunction 미수집

**파일:** `services/web-kpa-society/src/components/RegisterModal.tsx`

회원가입 API 페이로드:
```typescript
{
  email, password, name, nickname, phone,
  role: membershipType === 'student' ? 'student' : 'pharmacist',
  membershipType,           // 'pharmacist' | 'student'
  licenseNumber,            // 약사면허번호 (약사만)
  universityName,           // 대학명 (약대생만)
  organizationId,           // 소속 분회 ID
  // ✗ pharmacistFunction 없음
  // ✗ pharmacistRole 없음
}
```

**판정:** 회원가입 시점에는 약국 개설자 분류를 수집하지 않음. 로그인 후 FunctionGateModal에서 수집하려 하나, 서버 저장이 안 됨.

---

### 2.4 KpaMember Entity — 독립 분류 체계

**파일:** `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts`

| 필드 | 타입 | 값 범위 | Phase |
|------|------|---------|-------|
| `membership_type` | VARCHAR(50) | `pharmacist` / `student` | Phase 4 |
| `activity_type` | VARCHAR(50) | `pharmacy_owner` / `pharmacy_employee` / `hospital` / `manufacturer` / `importer` / `wholesaler` / `other_industry` / `government` / `school` / `other` / `inactive` | Phase 5 |
| `fee_category` | VARCHAR(50) | `A1_pharmacy_owner` / `A2_pharma_manager` / `B1_pharmacy_employee` / `B2_pharma_company_employee` / `C1_hospital` / `C2_admin_edu_research` / `D_fee_exempted` | Phase 5 |
| `license_number` | VARCHAR(100) | 약사면허번호 | 초기 |
| `pharmacy_name` | VARCHAR(200) | 소속 약국명 | 초기 |

**판정:**
- `KpaMember.activity_type = 'pharmacy_owner'` → **약국 개설자 (KPA 멤버십 기준)**
- `KpaMember.fee_category = 'A1_pharmacy_owner'` → **약국 개설자 (회비 기준)**
- User.pharmacistRole과 KpaMember.activity_type은 **별도 필드, 별도 관리, 동기화 없음**

---

### 2.5 RBAC 시스템 — Role Assignment

**파일:** `apps/api-server/src/modules/auth/entities/RoleAssignment.ts`

| 테이블 | 키 필드 | 역할 형식 |
|--------|---------|----------|
| `role_assignments` | userId, role, isActive | `{service}:{roleName}` |

**정의된 서비스 역할:**

| 서비스 | 약국/약사 관련 역할 | 할당 여부 |
|--------|-------------------|----------|
| GlycoPharm | `glycopharm:pharmacy` | **정의됨, 할당 안 됨** |
| KPA | `kpa:pharmacist` | **정의됨, 할당 안 됨** |
| GlucoseView | (없음) | — |

---

### 2.6 Application 승인 시 동작 분석

#### GlycoPharm Application 승인

**파일:** `apps/api-server/src/routes/glycopharm/controllers/admin.controller.ts` (Lines 206-359)

```
PATCH /api/v1/glycopharm/applications/:id/review  {status: 'approved'}
    ↓
    1. application.status = 'approved'
    2. application.decidedAt = now()
    3. application.decidedBy = adminUserId
    ↓
    4. GlycopharmPharmacy 생성 (code: GP-{timestamp}-{random})
       - name = application.organizationName
       - business_number = application.businessNumber
       - status = 'active'
       - enabled_services = application.serviceTypes
    ↓
    ✗ roleAssignmentService.assignRole() 호출 없음
    ✗ glycopharm:pharmacy 역할 부여 없음
    ✗ User.pharmacistRole 업데이트 없음
```

#### GlucoseView Application 승인

**파일:** `apps/api-server/src/routes/glucoseview/controllers/application.controller.ts` (Lines 479-672)

```
PATCH /api/v1/glucoseview/applications/:id/review  {status: 'approved'}
    ↓
    1. application.status = 'approved'
    2. GlucoseViewPharmacy 생성 (glycopharmPharmacyId 연계)
    ↓
    ✗ 역할 부여 없음
```

#### KPA Application 승인

**파일:** `apps/api-server/src/routes/kpa/controllers/application.controller.ts` (Lines 313-391)

```
PATCH /kpa/applications/:id/review  {status: 'approved'}
    ↓
    1. application.status = 'approved'
    2. application.reviewer_id = adminUserId
    ↓
    ✗ KpaMember 생성/업데이트 없음
    ✗ 역할 부여 없음
    ✗ activity_type 설정 없음
```

---

### 2.7 Frontend 메뉴 노출 로직

#### GlycoPharm — Role 기반

**파일:** `services/web-glycopharm/src/App.tsx`

```typescript
// 역할 → 대시보드 매핑
<Route path="pharmacy" element={
  <ProtectedRoute allowedRoles={['pharmacy']}>
    <DashboardLayout role="pharmacy" />
  </ProtectedRoute>
}>

<Route path="operator" element={
  <ProtectedRoute allowedRoles={['operator']}>
    <DashboardLayout role="operator" />
  </ProtectedRoute>
}>
```

**Role 매핑 (API → Web):**
```typescript
'pharmacy' → 'pharmacy'  // 약사
'seller' → 'pharmacy'    // 판매자 → 약사로 매핑
'admin' → 'operator'     // 관리자 → 운영자로 매핑
'super_admin' → 'operator'
```

**판정:** GlycoPharm에서 "약국 개설자" 구분은 **메뉴 레벨에서 없음** — `pharmacy` 역할이면 모두 동일한 약국 대시보드 접근

#### KPA Society — Organization Context 기반

**파일:** `services/web-kpa-society/src/components/common/DashboardSwitcher.tsx`

```typescript
// 약국경영 메뉴: pharmacy context 존재 여부
const hasPharmacyContext = accessibleOrganizations.some(org => org.type === 'pharmacy');
if (hasPharmacyContext) {
  items.push({ label: '약국경영', path: '/pharmacy' });
}
```

**판정:** KPA에서 "약국경영" 메뉴는 `pharmacistRole`이 아닌 `accessibleOrganizations`에 pharmacy 타입 조직이 있는지로 결정

---

## 3. 구조 판정

### 3.1 최종 판정: "경우 D" (Application 승인 기반) + 부분적 "경우 B" (Profile 속성)

```
┌──────────────────────────────────────────────────────────┐
│                  약국 개설자 분류 현황                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [User Table]                                            │
│    pharmacistFunction = 'pharmacy'     ← 컬럼 존재        │
│    pharmacistRole = 'pharmacy_owner'   ← 컬럼 존재        │
│    ✗ Frontend에서 서버 저장 API 미구현    ← 데이터 없음!     │
│                                                          │
│  [KpaMember Table]                                       │
│    activity_type = 'pharmacy_owner'    ← 컬럼 존재        │
│    fee_category = 'A1_pharmacy_owner'  ← 컬럼 존재        │
│    ✗ 언제/어떻게 채워지는지 불명           ← 입력 경로 불명    │
│                                                          │
│  [RoleAssignment Table]                                  │
│    role = 'glycopharm:pharmacy'        ← 정의됨           │
│    role = 'kpa:pharmacist'             ← 정의됨           │
│    ✗ 승인 시 할당 로직 없음               ← 아무도 안 부여!   │
│                                                          │
│  [GlycopharmPharmacy Table]                              │
│    EXISTS where created_by_user_id = ?  ← 유일한 실동작     │
│    = "이 사용자는 약국 개설자"                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.2 실제 동작하는 유일한 경로

**GlycoPharm에서 "약국 개설자"를 판별하는 실제 코드 경로:**

```
1. 사용자가 StoreApplyPage에서 약국 참여 신청
2. Operator가 StoreApprovalDetailPage에서 승인
3. Backend: GlycopharmPharmacy 레코드 생성 (created_by_user_id = userId)
4. 이후: GlycopharmPharmacy EXISTS 여부 → "이 사용자는 약국을 개설했다"
```

**이것이 현재 시스템에서 유일하게 동작하는 "약국 개설자" 판정 근거.**

---

## 4. GAP 종합

### CRITICAL

| ID | GAP | 영향 |
|----|-----|------|
| **P-1** | FunctionGateModal에서 수집한 pharmacistFunction/pharmacistRole이 **서버에 저장되지 않음** (API 호출 미구현) | User.pharmacistFunction 컬럼은 항상 NULL |
| **P-2** | Application 승인 시 **어떤 서비스에서도 Role 할당이 일어나지 않음** | glycopharm:pharmacy, kpa:pharmacist 역할이 정의만 되고 아무에게도 부여 안 됨 |
| **P-3** | KPA Application 승인 시 **KpaMember 생성/업데이트가 일어나지 않음** | activity_type, fee_category 미설정 |

### HIGH

| ID | GAP | 영향 |
|----|-----|------|
| **P-4** | User.pharmacistRole과 KpaMember.activity_type 간 **동기화 메커니즘 없음** | 같은 정보가 2곳에 다른 형식으로 존재, 불일치 위험 |
| **P-5** | GlycoPharm AuthContext의 역할 매핑이 **약국 개설자를 구분하지 못함** | `pharmacy` 역할 하나로 근무약사/개설약사 구분 불가 |
| **P-6** | KPA 약국경영 메뉴 노출이 **pharmacistRole이 아닌 accessibleOrganizations 기반** | pharmacistRole = 'pharmacy_owner'여도 pharmacy 조직이 없으면 메뉴 미노출 |

### MEDIUM

| ID | GAP | 영향 |
|----|-----|------|
| **P-7** | User.role (레거시)과 RoleAssignment (신규) 이중 시스템 병존 | 코드에 따라 어떤 시스템을 체크하는지 불일치 |
| **P-8** | pharmacistFunction/pharmacistRole 값 범위가 Frontend 코드에만 정의 — Backend enum/validation 없음 | 임의 값 저장 가능 |
| **P-9** | KpaMember.activity_type의 값 목록(11종)과 FunctionGateModal 선택지(5종) 불일치 | 데이터 모델 ↔ UI 간극 |

---

## 5. 데이터 흐름 정리

### 현재 상태 (실선 = 동작, 점선 = 단절)

```
[회원가입]
    RegisterModal
        ↓ POST /auth/register
        ↓ membershipType: 'pharmacist'/'student'
        ↓ licenseNumber, organizationId
        ✗ pharmacistFunction 미수집
        ✗ pharmacistRole 미수집
            ↓
        User 생성 (pharmacistFunction=NULL, pharmacistRole=NULL)

[로그인 후]
    FunctionGateModal (KPA only)
        ↓ 사용자 선택: "개설 약사"
        ↓ pharmacistFunction='pharmacy', pharmacistRole='pharmacy_owner'
        ↓ AuthContext state 업데이트 (클라이언트만)
        ✗ API 호출 없음 → 서버 미저장
        ✗ 새로고침 시 초기화

[GlycoPharm 약국 신청]
    StoreApplyPage
        ↓ POST glycopharm/applications
        ↓ organizationName, businessNumber, serviceTypes
            ↓
        GlycopharmApplication (status: submitted)
            ↓ Operator 승인
        GlycopharmPharmacy 생성
        ✗ glycopharm:pharmacy 역할 미부여
        ✗ User.pharmacistRole 미업데이트

[KPA 가입 신청]
    POST kpa/applications
        ↓ organization_id, type: 'membership'
            ↓
        KpaApplication (status: submitted)
            ↓ Operator 승인
        ✗ KpaMember 미생성
        ✗ kpa:pharmacist 역할 미부여
        ✗ activity_type 미설정
```

---

## 6. 우선순위 권고

### Phase 1: 즉시 수정 (데이터 영속성)

1. **FunctionGateModal → Server 저장 API 구현**
   - `PATCH /api/v1/auth/profile` 또는 `PUT /api/v1/users/me/pharmacist-function`
   - `pharmacistFunction`, `pharmacistRole`을 User 테이블에 영속

2. **Application 승인 시 Role 할당 추가**
   - GlycoPharm: `roleAssignmentService.assignRole({ userId, role: 'glycopharm:pharmacy' })`
   - KPA: `roleAssignmentService.assignRole({ userId, role: 'kpa:pharmacist' })`

### Phase 2: 데이터 정합성

3. **KPA Application 승인 시 KpaMember 생성/업데이트**
   - `activity_type` 설정
   - `membership_type` 설정

4. **User.pharmacistRole ↔ KpaMember.activity_type 동기화 정책 결정**
   - 단일 출처(Single Source of Truth) 결정 필요

### Phase 3: 메뉴 연결

5. **GlycoPharm 약국 대시보드 내 개설자/근무자 분기**
   - 현재 모두 `pharmacy` 역할로 동일 대시보드

6. **KPA 약국경영 메뉴 노출 조건 정비**
   - `pharmacistRole = 'pharmacy_owner'` 조건 추가 검토

---

## 7. 부록: 조사 범위

### 조사한 Entity

| Entity | 파일 |
|--------|------|
| User | `apps/api-server/src/modules/auth/entities/User.ts` |
| RoleAssignment | `apps/api-server/src/modules/auth/entities/RoleAssignment.ts` |
| Role | `apps/api-server/src/entities/Role.ts` |
| Permission | `apps/api-server/src/entities/Permission.ts` |
| RoleApplication | `apps/api-server/src/entities/RoleApplication.ts` |
| UserServiceEnrollment | `apps/api-server/src/entities/UserServiceEnrollment.ts` |
| KpaMember | `apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts` |
| KpaMemberService | `apps/api-server/src/routes/kpa/entities/kpa-member-service.entity.ts` |
| KpaSteward | `apps/api-server/src/routes/kpa/entities/kpa-steward.entity.ts` |
| KpaOrganization | `apps/api-server/src/routes/kpa/entities/kpa-organization.entity.ts` |
| KpaApplication | `apps/api-server/src/routes/kpa/entities/kpa-application.entity.ts` |
| GlycopharmApplication | `apps/api-server/src/routes/glycopharm/entities/glycopharm-application.entity.ts` |
| GlycopharmPharmacy | `apps/api-server/src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts` |
| GlucoseViewApplication | `apps/api-server/src/routes/glucoseview/entities/glucoseview-application.entity.ts` |
| GlucoseViewPharmacy | `apps/api-server/src/routes/glucoseview/entities/glucoseview-pharmacy.entity.ts` |

### 조사한 Controller / Service

| 파일 | 조사 내용 |
|------|----------|
| `routes/glycopharm/controllers/admin.controller.ts` | Application 승인 로직 (L206-359) |
| `routes/glucoseview/controllers/application.controller.ts` | Application 승인 로직 (L479-672) |
| `routes/kpa/controllers/application.controller.ts` | Application 승인 로직 (L313-391) |
| `middleware/auth.middleware.ts` | requireAuth, requireAdmin, requireRole |
| `utils/role.utils.ts` | hasServiceRole, hasAnyServiceRole |
| `modules/auth/services/role-assignment.service.ts` | RoleAssignment CRUD |

### 조사한 Frontend

| 파일 | 조사 내용 |
|------|----------|
| `web-glycopharm/src/contexts/AuthContext.tsx` | 역할 매핑, 사용자 타입 |
| `web-glycopharm/src/App.tsx` | ProtectedRoute, 역할 기반 라우팅 |
| `web-glycopharm/src/components/layouts/DashboardLayout.tsx` | 역할별 메뉴 구성 |
| `web-kpa-society/src/contexts/AuthContext.tsx` | pharmacistFunction 필드 |
| `web-kpa-society/src/components/RegisterModal.tsx` | 회원가입 페이로드 |
| `web-kpa-society/src/components/FunctionGateModal.tsx` | 직능 선택 모달 |
| `web-kpa-society/src/components/common/DashboardSwitcher.tsx` | 대시보드 접근 로직 |
| `web-kpa-society/src/contexts/OrganizationContext.tsx` | 조직 컨텍스트 |
| `web-k-cosmetics/src/contexts/AuthContext.tsx` | 역할 매핑 |

### 조사한 타입/역할 정의

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/types/roles.ts` | 서비스 프리픽스 역할 전체 정의 |
| `apps/api-server/src/types/auth.ts` | UserRole enum (레거시) |
| `services/web-glycopharm/src/types/store.ts` | PharmacyStore 타입 |

---

*End of Report*
