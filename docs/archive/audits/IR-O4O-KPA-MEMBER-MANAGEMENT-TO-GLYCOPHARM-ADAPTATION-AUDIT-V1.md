# IR-O4O-KPA-MEMBER-MANAGEMENT-TO-GLYCOPHARM-ADAPTATION-AUDIT-V1

> **Investigation Report — KPA 회원 구조 분석 및 GlycoPharm 적용 설계**
> 작성일: 2026-04-15
> 상태: READ-ONLY 조사 완료
> 목적: KPA Society 최신 회원 구조를 기준으로 GlycoPharm용 역할/회원 구조를 재설계

---

## 1. 전체 판정

| 항목 | 판정 |
|------|------|
| KPA 회원 구조 복잡도 | **HIGH** — 6개 membership_type, 11개 activity_type, 4개 profile 테이블, 2개 승인 엔진 |
| GlycoPharm 적용 난이도 | **MEDIUM** — KPA 패턴 재사용 가능하나 약국 경영 도메인에 맞는 축소/재설계 필요 |
| Core 구조 변경 필요 여부 | **NO** — users, service_memberships, role_assignments 변경 불필요 (F11 준수) |

---

## 2. KPA Society 회원 구조 요약

### 2.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                         users (auth-core)                          │
│   id, email, name, roles[], service_key                            │
├────────────┬────────────┬──────────────────────────────────────────┤
│            │            │                                          │
│  ┌─────────▼──────┐  ┌─▼─────────────────┐  ┌───────────────────┐ │
│  │  kpa_members   │  │ service_memberships│  │ role_assignments  │ │
│  │  (KPA 전용)     │  │ (플랫폼 공통)       │  │ (RBAC SSOT)      │ │
│  │  role, status, │  │ serviceKey, role,  │  │ role, assignedBy  │ │
│  │  membership_   │  │ status             │  │                   │ │
│  │  type, sub_role│  │                    │  │                   │ │
│  └────────┬───────┘  └────────────────────┘  └───────────────────┘ │
│           │                                                        │
│  ┌────────▼───────────────────────────────────────────────────┐    │
│  │              Profile Tables (membership_type별)             │    │
│  │  kpa_pharmacist_profiles     (약사)                         │    │
│  │  kpa_external_expert_profiles (외부전문가)                    │    │
│  │  kpa_supplier_staff_profiles  (업체직원)                     │    │
│  │  instructor_profiles          (강사 — 자격 기반)             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              Qualification System (자격 엔진)               │    │
│  │  member_qualifications       (자격 상태)                    │    │
│  │  qualification_requests      (신청 이력)                    │    │
│  │  kpa_approval_requests       (범용 승인 — entity_type 기반)  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 테이블 관계

| 테이블 | 역할 | 1:N 관계 |
|--------|------|----------|
| `users` | 인증 주체 (auth-core, FROZEN F11) | 1 user : N memberships |
| `kpa_members` | KPA 회원 정보 (role, status, membership_type, sub_role, activity_type) | 1 user : 1 kpa_member |
| `kpa_pharmacist_profiles` | 약사 자격 프로필 (license, activity_type) | 1 user : 1 profile |
| `kpa_external_expert_profiles` | 외부전문가 프로필 (domain, institution, qualification) | 1 user : 1 profile |
| `kpa_supplier_staff_profiles` | 업체직원 프로필 (company, job_title, business_reg) | 1 user : 1 profile |
| `instructor_profiles` | 강사 프로필 (expertise, lecture_topics, bio) | 1 user : 1 profile |
| `member_qualifications` | 자격 상태 추적 (instructor, content_provider, etc.) | 1 user : N qualifications |

---

## 3. Role / Sub-role / MembershipType 정리

### 3.1 KPA Role 체계 (3계층)

```
계층 1: PrefixedRole (role_assignments / JWT roles[])
  ├── kpa:admin           — KPA 서비스 관리자
  ├── kpa:operator        — KPA 서비스 운영자
  ├── kpa:district_admin  — 시도약사회 관리자
  ├── kpa:branch_admin    — 분회 관리자
  ├── kpa:branch_operator — 분회 운영자
  ├── kpa:pharmacist      — 약사 (DEPRECATED → membership_type 기반)
  ├── kpa:student          — 약대생 (DEPRECATED → membership_type 기반)
  └── lms:instructor       — LMS 강사 (자격 승인 시 자동 부여)

계층 2: KpaMember.role (조직 내 역할)
  ├── member     — 일반 회원
  ├── operator   — 조직 운영자
  └── admin      — 조직 관리자

계층 3: KpaMember.membership_type (회원 유형)
  ├── pharmacist              — 약사 정회원 (legacy)
  ├── pharmacist_member       — 약사 정회원 (신규)
  ├── student                 — 약대생 준회원 (legacy)
  ├── pharmacy_student_member — 약대생 준회원 (신규)
  ├── external_expert         — 외부전문가 준회원
  └── supplier_staff          — 제약/의료기기 업체 직원
```

**소스**: [kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts), [roles.ts](apps/api-server/src/types/roles.ts)

### 3.2 Sub-role / Activity Type

| 필드 | 테이블 | 값 목록 | 용도 |
|------|--------|--------|------|
| `sub_role` | kpa_members | 자유 입력 (varchar 100) | 외부전문가 세부 분류 (의사, 연구원, MR 등) |
| `activity_type` | kpa_members, kpa_pharmacist_profiles | `pharmacy_owner`, `pharmacy_employee`, `hospital`, `manufacturer`, `importer`, `wholesaler`, `other_industry`, `government`, `school`, `other`, `inactive` | 약사 직능 분류 |
| `fee_category` | kpa_members | `A1_pharmacy_owner` ~ `D_fee_exempted` (7값) | 회비 분류 |

**핵심 발견**: `activity_type`이 사실상 **약사의 sub_role** 역할을 수행.
- `pharmacy_owner` = 약국 개설약사 (경영자)
- `pharmacy_employee` = 약국 근무약사

### 3.3 강사 (Instructor) 처리

```
신청 → member_qualifications (qualification_type='instructor', status='pending')
  │
  ├── qualification_requests (신청 이력)
  │
  ▼
Operator 승인 (PATCH /qualifications/requests/:id)
  │
  ├── member_qualifications.status = 'approved'
  ├── instructor_profiles 생성 (display_name, expertise, lecture_topics, bio)
  └── role_assignments += 'lms:instructor'
```

**소스**: [qualification.controller.ts](apps/api-server/src/routes/kpa/controllers/qualification.controller.ts):276-310

**핵심**: 강사는 **별도 membership_type이 아니라 자격(qualification)**으로 관리. 기존 약사/학생 회원이 추가로 강사 자격을 취득하는 구조.

---

## 4. 프로필 구조

| Role/Type | Profile 테이블 | 주요 필드 | 생성 시점 |
|-----------|---------------|----------|----------|
| pharmacist | `kpa_pharmacist_profiles` | license_number, license_verified, activity_type, verified_at | 가입 신청 시 (SSOT sync) |
| external_expert | `kpa_external_expert_profiles` | expert_domain, institution_name, institution_type, department, qualification, qualification_type | 가입 승인 시 |
| supplier_staff | `kpa_supplier_staff_profiles` | company_name, company_type, job_title, department, business_registration_number | 가입 승인 시 |
| instructor (자격) | `instructor_profiles` | display_name, organization, job_title, expertise[], lecture_topics[], bio, experience, portfolio_url | 자격 승인 시 |

---

## 5. 승인 흐름

### 5.1 회원 가입 승인

| Role/Type | 승인 필요 | 흐름 | Guard |
|-----------|----------|------|-------|
| pharmacist | YES | `POST /kpa/members/apply` → status=pending → Operator 승인 → active | `requireAuth` |
| student | YES | 동일 | `requireAuth` |
| external_expert | YES | 동일 + `kpa_external_expert_profiles` INSERT | `requireAuth` |
| supplier_staff | YES | 동일 + `kpa_supplier_staff_profiles` INSERT | `requireAuth` |

**가입 신청 API**: `POST /api/v1/kpa/members/apply`
- Body: `{ membership_type, organization_id, license_number?, sub_role?, activity_type?, fee_category?, ... }`
- 모든 유형 승인 필요 (자동 승인 없음)

**소스**: [member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts):90-219

### 5.2 강사 자격 승인

| 자격 | 승인 필요 | 흐름 |
|------|----------|------|
| instructor | YES | `POST /qualifications/apply` → member_qualifications pending → Operator PATCH → approved → instructor_profiles 생성 + lms:instructor 역할 |
| content_provider | YES | 동일 (profile 미생성) |
| survey_operator | YES | 동일 |
| reviewer | YES | 동일 |

### 5.3 범용 승인 엔진 (KpaApprovalRequest)

entity_type 기반 범용 승인:
- `forum_category` — 포럼 카테고리 생성
- `instructor_qualification` — 강사 자격 (legacy → member_qualifications로 통합됨)
- `course` — 강좌 기획안
- `membership` — 조직 가입

**소스**: [kpa-approval-request.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-approval-request.entity.ts)

---

## 6. Operator 회원 관리 UI (KPA Society)

### 6.1 MemberManagementPage

**파일**: [MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx)

**구조**:
- `MemberListLayout` + `DataTable` 기반 (operator-ux-core)
- 탭: 전체 | 약사 | 약대생 | 가입 신청
- 상태 필터: pending, active, rejected, suspended
- `StatusBadge` from `@o4o/operator-ux-core`

**기능**:
- 회원 목록 조회 (role, status 필터)
- 가입 승인/반려
- 회원 정보 수정 (EditMemberModal)
- 회원 삭제 (소프트 삭제)

### 6.2 역할 기반 라우팅

**KPA Society**: `RoleGuard` → user.roles에 kpa:admin/operator 있는지 체크 → Operator 대시보드
**GlycoPharm**: `OperatorRoute` → glycopharm:admin 또는 service_memberships(glycopharm, active) → Operator 대시보드

---

## 7. GlycoPharm 현재 상태

### 7.1 현재 역할 구조

| Role | 타입 정의 | 용도 |
|------|----------|------|
| `glycopharm:admin` | GlycoPharmRole | 관리자 |
| `glycopharm:operator` | GlycoPharmRole | 운영자 |
| `pharmacy` | GlycoPharmRole (prefix 없음) | 약국 |
| `supplier` | GlycoPharmRole | 공급자 |
| `partner` | GlycoPharmRole | 파트너 |
| `customer` | GlycoPharmRole | 당뇨인 |

**소스**: [roles.ts](apps/api-server/src/types/roles.ts):61-67

### 7.2 현재 회원 구조의 문제

| # | 문제 | 심각도 |
|---|------|--------|
| G1 | **GlycoPharm 전용 member 테이블 없음** | HIGH — 약사/약국 경영자 구분 불가 |
| G2 | **`pharmacy` role에 prefix 없음** | MEDIUM — `glycopharm:pharmacy`가 아닌 `pharmacy`로 정의됨 |
| G3 | **약사 프로필 구조 부재** | HIGH — KPA의 pharmacist_profiles 같은 테이블 없음 |
| G4 | **강사 역할 경로 없음** | MEDIUM — LMS 연동은 KPA 전용, GlycoPharm에 강사 진입점 없음 |
| G5 | **가입 신청이 약국 단위** | MEDIUM — ApplicationsPage는 약국(organization) 참여 신청만 처리 |

### 7.3 GlycoPharm Guard 구조

```typescript
// RoleGuard: user.roles에서 allowedRoles 체크
<RoleGuard allowedRoles={['glycopharm:admin', 'glycopharm:operator']}>

// OperatorRoute: glycopharm:admin 또는 service_memberships(glycopharm, active)
<OperatorRoute>
```

**소스**: [RoleGuard.tsx](services/web-glycopharm/src/components/auth/RoleGuard.tsx)

### 7.4 GlycoPharm 프론트엔드 User 타입

```typescript
interface User {
  id, email, name, roles[], memberships?, status
  pharmacyId?: string;  // 약국 연결
}

interface PharmacyUser extends User {
  role: 'pharmacy';
  pharmacy: { id, name, businessNumber, address, phone, storeSlug, isStoreActive };
}
```

**소스**: [types/index.ts](services/web-glycopharm/src/types/index.ts):67-97

### 7.5 Care 제거 상태

Care 라우트/페이지는 코드에 **여전히 존재** (파일 잔존). 하지만 기능적으로 비활성화 상태.

---

## 8. KPA → GlycoPharm 적용 분석

### 8.1 공통 적용 가능 요소

| 요소 | KPA 구현 | GlycoPharm 재사용 방식 |
|------|---------|----------------------|
| **Member 전용 테이블 패턴** | `kpa_members` | `glycopharm_members` 생성 (동일 패턴) |
| **membership_type 분류** | 6종 | 축소: pharmacist, pharmacy_owner, instructor |
| **activity_type (직능)** | 11종 | 축소: pharmacy_owner, pharmacy_employee |
| **승인 흐름** | POST apply → pending → approve | 동일 패턴 |
| **Profile 분리 방식** | 역할별 profile 테이블 | pharmacist_profile + instructor_profile (KPA 것 재사용 가능) |
| **Qualification 시스템** | member_qualifications | 강사 자격 신청에 동일 사용 (이미 서비스 무관 구조) |
| **Operator 회원관리 UI** | MemberListLayout + DataTable | 동일 패턴 적용 |

### 8.2 GlycoPharm 불필요 요소 (제거 대상)

| KPA 요소 | 제거 사유 |
|---------|---------|
| `student` / `pharmacy_student_member` | GlycoPharm에 학생 회원 불필요 |
| `external_expert` + profile | GlycoPharm 도메인 외 |
| `supplier_staff` + profile | Neture 도메인과 중복, GlycoPharm에서는 `supplier` role로 충분 |
| `fee_category` (회비 분류) | KPA 전용 |
| `kpa:district_admin`, `kpa:branch_admin`, `kpa:branch_operator` | KPA 조직 계층 전용 |
| `activity_type` 11종 중 대부분 | 약국 경영 외 직능 불필요 |

### 8.3 GlycoPharm 추가 필요 요소

| 요소 | 필요성 | 비고 |
|------|--------|------|
| **glycopharm_members 테이블** | 필수 | 약사 역할 재도입의 기본 인프라 |
| **pharmacist sub-role 구분** | 필수 | pharmacy_owner / staff_pharmacist |
| **강사 자격 경로** | 필수 | member_qualifications + instructor_profiles 재사용 |
| **약국(organization) 연결** | 필수 | organization_id FK |
| **Operator 회원 관리 페이지** | 필수 | MemberManagementPage 패턴 적용 |

---

## 9. GlycoPharm 최종 설계안

### 9.1 Role 구조

```
PrefixedRole (role_assignments / JWT)
  ├── glycopharm:admin      — 관리자 (기존 유지)
  ├── glycopharm:operator   — 운영자 (기존 유지)
  ├── glycopharm:pharmacist — 약사 회원 (신규)
  └── lms:instructor        — 강사 (기존 qualification 시스템 재사용)

GlycoPharm 미사용 (제거 또는 deprecated):
  ├── pharmacy   → glycopharm:pharmacist로 통합
  ├── customer   → care 제거로 불필요
  ├── supplier   → Neture 도메인으로 이관
  └── partner    → Neture 도메인으로 이관
```

### 9.2 Member 테이블 설계

```sql
CREATE TABLE glycopharm_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES users(id),
  organization_id UUID REFERENCES organization_stores(id),

  -- 역할 (조직 내)
  role          VARCHAR(50) NOT NULL DEFAULT 'member',
    -- 'member' | 'operator' | 'admin'

  -- 상태
  status        VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn'

  -- 회원 유형
  membership_type VARCHAR(50) NOT NULL DEFAULT 'pharmacist',
    -- 'pharmacist' (약사)

  -- 세부 역할 (약사 하위)
  sub_role      VARCHAR(50),
    -- 'pharmacy_owner'    (약국 경영자/개설약사)
    -- 'staff_pharmacist'  (근무약사)

  -- 약사 정보
  license_number VARCHAR(100),
  pharmacy_name  VARCHAR(200),
  pharmacy_address VARCHAR(300),

  -- Audit
  joined_at     DATE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

### 9.3 Profile 구조

| 역할 | Profile 테이블 | 전략 |
|------|--------------|------|
| pharmacist (약사) | `kpa_pharmacist_profiles` 재사용 | user_id 기반 UNIQUE → KPA/GlycoPharm 공유 가능 |
| instructor (강사) | `instructor_profiles` 재사용 | 이미 서비스 무관 구조 |

**판단 근거**: 약사 면허는 사용자 단위 속성 (서비스 무관). KPA에서 면허 인증받은 약사가 GlycoPharm에서도 동일 프로필 사용 가능.

### 9.4 Organization 관계

| sub_role | organization 필수 여부 | 연결 방식 |
|----------|----------------------|----------|
| `pharmacy_owner` | **필수** | organization_id → organization_stores |
| `staff_pharmacist` | **선택** | organization_id = 소속 약국 (없으면 NULL) |

### 9.5 승인 정책

| 대상 | 승인 방식 | 승인 주체 |
|------|----------|----------|
| pharmacist 가입 (pharmacy_owner) | **수동 승인** | glycopharm:operator |
| pharmacist 가입 (staff_pharmacist) | **수동 승인** | glycopharm:operator |
| instructor 자격 신청 | **수동 승인** | glycopharm:operator (qualification 시스템 재사용) |

### 9.6 로그인 후 분기

| 역할 | Redirect | 대시보드 |
|------|----------|---------|
| `pharmacy_owner` | `/store/hub` | Store Hub 대시보드 (기존 유지) |
| `staff_pharmacist` | `/store/hub` | 동일 (권한 제한 TBD) |
| `instructor` | `/lms/instructor` | 강사 대시보드 (신규 또는 KPA LMS 연동) |
| `glycopharm:operator` | `/operator` | Operator 5-Block 대시보드 |
| `glycopharm:admin` | `/admin` | Admin 대시보드 |

---

## 10. 후속 작업 제안

### WO 단위 분류

| # | WO | 범위 | 난이도 | 선행 조건 |
|---|-----|------|--------|----------|
| 1 | **WO-GLYCOPHARM-MEMBER-TABLE-CREATION-V1** | glycopharm_members 테이블 생성 마이그레이션 + Entity | LOW | 없음 |
| 2 | **WO-GLYCOPHARM-MEMBER-REGISTER-FLOW-V1** | 가입 신청 API (POST /glycopharm/members/apply) + 승인 API | MEDIUM | WO-1 |
| 3 | **WO-GLYCOPHARM-ROLE-PREFIX-MIGRATION-V1** | pharmacy → glycopharm:pharmacist 역할 전환 | MEDIUM | WO-1 |
| 4 | **WO-GLYCOPHARM-OPERATOR-MEMBER-MANAGEMENT-V1** | Operator 회원관리 페이지 (MemberListLayout 패턴) | MEDIUM | WO-2 |
| 5 | **WO-GLYCOPHARM-INSTRUCTOR-PATHWAY-V1** | 강사 자격 신청 경로 (qualification 시스템 연동) | LOW | WO-2 |
| 6 | **WO-GLYCOPHARM-PHARMACY-ROLE-CLEANUP-V1** | pharmacy/customer/supplier/partner deprecated 처리 | LOW | WO-3 |

### 실행 순서 권장

```
Phase 1: 기반 (WO-1 → WO-2)
  glycopharm_members 테이블 + 가입/승인 API

Phase 2: 역할 정리 (WO-3 → WO-6)
  prefix 통일 + deprecated 제거

Phase 3: UI (WO-4)
  Operator 회원 관리 페이지

Phase 4: 확장 (WO-5)
  강사 자격 경로
```

---

## 11. 핵심 결론

**KPA Society는 6개 membership_type + 4개 profile 테이블 + 2개 승인 엔진의 복잡한 회원 구조를 가지고 있으며, GlycoPharm에는 이 중 약사(pharmacist) + 강사(instructor) 경로만 선별 적용하면 된다.**

GlycoPharm 최종 회원 구조:

```
glycopharm_members
  ├── membership_type = 'pharmacist'
  │     ├── sub_role = 'pharmacy_owner'    (약국 경영자)
  │     └── sub_role = 'staff_pharmacist'  (근무약사)
  │
  └── instructor 자격 = member_qualifications 재사용
        └── instructor_profiles 재사용
```

- **Core 변경 불필요** (F11 User/Operator Freeze 준수)
- **기존 테이블 재사용**: kpa_pharmacist_profiles, instructor_profiles, member_qualifications
- **신규 생성 필요**: glycopharm_members 1개 테이블
- **역할 정리 필요**: `pharmacy` → `glycopharm:pharmacist` prefix 통일

---

*End of IR-O4O-KPA-MEMBER-MANAGEMENT-TO-GLYCOPHARM-ADAPTATION-AUDIT-V1*
