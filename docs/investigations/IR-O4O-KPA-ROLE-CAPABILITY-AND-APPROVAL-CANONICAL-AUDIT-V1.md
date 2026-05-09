# IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1

> KPA-Society 의 가입 → 직역(profile) → 승인 → Store Owner → 직역 변경 구조를 정적 분석한 보고서.
> **수정 없음. 조사 + canonical 정비 기준 제안.**

- 작성일: 2026-05-09
- 기준 브랜치: `main` (`b5d10d807` 시점, sync 완료)
- 조사 대상
  - `services/web-kpa-society` (frontend Guard + AuthContext + 가입/프로필 페이지)
  - `apps/api-server/src/modules/auth` (User / RoleAssignment / ServiceMembership / register / profile)
  - `apps/api-server/src/routes/kpa` (KpaMember / KpaPharmacyRequest / KpaApprovalRequest / pharmacy-request 컨트롤러)
  - `apps/api-server/src/services/approval` (MembershipApprovalService)
- 범위 제약
  - **KPA-Society 만 1차 정리**. GlycoPharm / Neture / K-Cosmetics 공통화 여부는 Phase 3 별도 검토.
  - schema migration / auth rewrite / audience system 도입 / forum membership 개편 모두 **본 IR 범위 외**.

---

## 0. 결론 요약 (TL;DR)

> **가설 검증 결과: 거의 그렇다.**
> 현재 KPA-Society 에서 *실제 서비스 접근에 차이를 만드는* 권한은 사실상 **두 가지뿐**이다.
>
> 1. **`kpa:store_owner` role** — Store HUB(`/store-hub`) 와 내 매장(`/store/*`) 접근 게이트
> 2. **`kpa:operator` / `kpa:admin` role** — Operator 대시보드(`/operator/*`) 와 운영자 전용 백엔드 routes(`requireScope('kpa:operator')`, `requireScope('kpa:admin')`)
>
> 그 외 11개의 `KpaActivityType` (pharmacy_owner / pharmacy_employee / hospital / manufacturer / importer / wholesaler / other_industry / government / school / other / inactive) 와 6개의 `KpaMemberType` (pharmacist / student / pharmacist_member / pharmacy_student_member / external_expert / supplier_staff) 는 **현재 코드 기준 거의 모두 profile metadata** 다. Forum / LMS / Content 접근은 직역(activity_type)에 따라 차별화되지 않는다 (단, `PharmacistOnlyGuard` 가 student 의 일부 forum 진입을 차단하는 단일 예외 존재).

**핵심 문제 4가지** (현 구조에서 확인됨):

| # | 문제 | 근거 |
|---|------|------|
| **P1** | **직역 자유 변경** — 가입 승인 후 사용자가 MyProfilePage 의 `setActivityType` 호출로 11개 activity_type 사이를 자유 전환. 그러나 `pharmacy_owner` 선택만으로는 `kpa:store_owner` role 이 부여되지 않으므로 *권한 변화는 없음* | [MyProfilePage.tsx:142-148](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L142) → `setActivityType` → PATCH `/api/v1/auth/me/profile` ([auth-account.controller.ts:106-198](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L106)). 승인 절차 없음 |
| **P2** | **`kpa:store_owner` 부여 트리거가 별도 신청 흐름** — `pharmacy_owner` activity_type 을 선택하는 것 ≠ Store 접근. 별도로 `/kpa/pharmacy-requests` POST → operator 승인을 거쳐야만 role 부여 ([pharmacy-request.controller.ts:226-231](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L226)). 사용자가 두 흐름의 차이를 인지하기 어려움 |
| **P3** | **이중 승인 흐름이 별도 테이블에 존재** — `service_memberships` (가입 승인, `MembershipApprovalService`) 와 `kpa_pharmacy_requests` (매장 경영자 승인) 는 **독립된 두 테이블·두 큐** ([kpa-pharmacy-request.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts) line 5-8 주석: *"약국 join은 '조직 가입'이 아니라 '개인 속성 변경'"*). 사용자 한 명이 두 번 pending 가능 |
| **P4** | **`isStoreOwner` boolean flag 와 `roles[]` 배열 이중화** — `KpaGlobalHeader.tsx:70` 은 `user.isStoreOwner` 로, `PharmacyGuard.tsx:24` 는 `user.roles` 에서 `kpa:store_owner` 검사. 두 값이 동기화되지 않을 가능성 + JWT stale 시 `PharmacyGuard` 가 `/pharmacy-requests/my` API 까지 호출해서 보강 ([PharmacyGuard.tsx:38-58](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx#L38)). 부수효과: `kpa_members.status` 는 `MembershipApprovalService` 가 자동 동기화하지 않음 |

**Canonical 정리 권장 (Phase 1 우선순위)**:

1. **profile metadata 와 approval-required capability 의 어휘 분리** — `KpaActivityType` 은 profile, `kpa:store_owner` / `kpa:operator` / `kpa:admin` 은 capability 로 명시 분리 (코드 변경은 Phase 1 後반).
2. **MyProfilePage `university` / `workplace` 입력 동작 정상화** — 직전 WO `WO-O4O-MYPAGE-PROFILE-COLUMN-ROUTING-V1` (커밋 `b5d10d807`) 로 500 해결 완료.
3. **활동유형 자유 변경 vs 승인형 capability 분리 명시** — 사용자 UI 에서 "직역 정보 변경" (자유) 와 "매장 경영자로 등록 신청" (승인) 의 구분 강화.
4. **2개 approval queue 통합 검토** — `kpa_approval_requests` 의 `entity_type` 에 `'pharmacy_request'` 추가 가능성 평가 (현재는 `'membership' / 'forum_category' / 'instructor_qualification' / 'course'` 4종만 등록).

---

## 1. 현재 가입 → 직역 → 승인 → Store Owner 흐름 (사실 정리)

### 1-1. 회원가입 entrypoint

**Endpoint**: `POST /api/v1/auth/register` ([auth-register.controller.ts:23-303](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L23))

**가입 시 받는 필드** (line 23-303):
- 기본: `email`, `password`, `name` / `lastName` / `firstName`, `phone`
- 사업자: `businessInfo` (JSONB), `licenseNumber`, `businessName`, `businessNumber`, `businessType`, `representativeName`, `zipCode`, `address1` / `address2`, `taxEmail`
- KPA 분기: `membershipType` (`pharmacist | student | pharmacist_member | pharmacy_student_member | external_expert | supplier_staff`)

**자동 생성 row** (가입 즉시):
- `users` (status=`pending`)
- `service_memberships` (serviceKey=`kpa-society`, status=`pending`, role=`customer`)
- `kpa_members` (status=`pending`, role=`member`, identity_status=`active`)
- `kpa_member_services` (service_key=`kpa-a`, status=`pending`)
- `membership_type` 별 profile row:
  - `pharmacist` / `pharmacist_member` → `kpa_pharmacist_profiles` (license_number, activity_type)
  - `student` / `pharmacy_student_member` → `kpa_student_profiles` (university_name, student_year)
  - `external_expert` → `kpa_external_expert_profiles`
  - `supplier_staff` → `kpa_supplier_staff_profiles`

### 1-2. 첫 로그인 직역(activity_type) 선택

**Page**: `services/web-kpa-society/src/pages/ActivitySetupPage.tsx`

- AuthGate ([AuthGate.tsx:26-62](services/web-kpa-society/src/components/auth/AuthGate.tsx#L26)) 가 `activityType` 미설정 사용자를 `/setup-activity` 로 강제 이동
- 사용자가 `pharmacy_owner` 선택 시 약국 정보(이름/주소/전화/우편번호) 추가 입력
- 제출 → `setActivityType(activityType, businessInfo)` ([AuthContext.tsx:394-402](services/web-kpa-society/src/contexts/AuthContext.tsx#L394)) → PATCH `/api/v1/auth/me/profile`
- **승인 단계 없음** — 즉시 `kpa_pharmacist_profiles.activity_type` 와 `kpa_members.activity_type` 두 곳에 mirror 저장 ([auth-account.controller.ts:106-198](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L106))

### 1-3. 가입 승인 (Operator)

**Endpoint**: `PATCH /api/v1/kpa/members/:id/status` ([member.controller.ts:336-508](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L336))
**Guard**: `requireScope('kpa:operator')`

**부수효과** (status='active' 로 변경 시, line 383-432):
1. `users.status = 'active'` + `isActive = true` + `approvedAt` / `approvedBy`
2. `kpa_member_services.status = 'approved'`
3. `kpa_members.role` 은 `member` 로 유지 (이미 `member` 인 상태에서 status 만 active 로)
4. `role_assignments` INSERT (ON CONFLICT) — 기본 `member` 역할 (단순 회원)
5. membership_type 별 profile row UPSERT

> **부수효과 누락 사실**: `kpa_members.status` 는 `MembershipApprovalService.approveMembership()` ([MembershipApprovalService.ts:83-198](apps/api-server/src/services/approval/MembershipApprovalService.ts#L83)) 가 자동 동기화하지 않음. 별도 컨트롤러 (`/kpa/members/:id/status`) 가 명시적으로 update 해야 한다.

### 1-4. 매장 경영자 (`kpa:store_owner`) 신청 → 승인

**별도의 흐름** — kpa_approval_requests 가 아닌 독립 테이블 사용.

**Submit**: `POST /api/v1/kpa/pharmacy-requests` ([pharmacy-request.controller.ts:40-101](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L40))
- 받는 필드: `pharmacy_name` (필수), `business_number` (필수), `pharmacy_phone`, `owner_phone`, `tax_invoice_email`
- 사전 가드 (line 58-68): 이미 `organization_members.role='owner'` 인 사용자는 reject

**Approve**: `PATCH /api/v1/kpa/pharmacy-requests/:id/approve` ([pharmacy-request.controller.ts:170-240](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L170))
**Guard**: `requireScope('kpa:operator')`

**부수효과** (line 191-231):
1. `kpa_pharmacy_requests.status = 'approved'` + reviewer / timestamp
2. `organization_store` 멱등 생성 (code=`kpa-pharm-{business_number}`)
3. `kpa_members.organization_id` UPDATE (`IS NULL` 인 경우만 — 기존 분회 보호)
4. `organization_members` INSERT (role=`'owner'`)
5. `kpa_pharmacist_profiles.activity_type = 'pharmacy_owner'` UPSERT
6. **`role_assignments` INSERT — `kpa:store_owner` 역할 부여** (line 226-231)

### 1-5. activityType 변경 (가입 승인 후, 자유)

**Page**: [MyProfilePage.tsx:137-159](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L137) "직역 정보" 탭

- `roleForm.activityType` 변경 → `setActivityType(activityType)` 호출
- PATCH `/api/v1/auth/me/profile` ([auth-account.controller.ts:106-198](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L106))
- **승인 없음, scope 없음** — `authenticate` 만 통과하면 11개 enum 사이 자유 전환
- `pharmacy_owner` 로 변경해도 `role_assignments` 의 `kpa:store_owner` 는 **자동 부여되지 않음** — 별도로 `/pharmacy-requests` 신청해야 함

---

## 2. KPA 직역(profile) 카탈로그 전체

### 2-1. `KpaMemberType` (6개) — 회원 분류 ([kpa-member.entity.ts:22-28](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L22))

| 값 | 의미 | profile row |
|---|---|---|
| `pharmacist` | 정회원 약사 | `kpa_pharmacist_profiles` |
| `student` | 약대생 | `kpa_student_profiles` |
| `pharmacist_member` | 약사 (다른 분류) | `kpa_pharmacist_profiles` |
| `pharmacy_student_member` | 약대생 (다른 분류) | `kpa_student_profiles` |
| `external_expert` | 외부 전문가 (전문강사 등) | `kpa_external_expert_profiles` |
| `supplier_staff` | 공급사 직원 | `kpa_supplier_staff_profiles` |

### 2-2. `KpaActivityType` (11개) — 활동 유형 ([kpa-member.entity.ts:31-42](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L31))

| 값 | 의미 |
|---|---|
| `pharmacy_owner` | 약국 개설자 (경영자) |
| `pharmacy_employee` | 약국 근무약사 |
| `hospital` | 병원약사 |
| `manufacturer` | 제약회사 |
| `importer` | 수입회사 |
| `wholesaler` | 도매회사 |
| `other_industry` | 기타 산업 |
| `government` | 공공기관 |
| `school` | 교육기관 |
| `other` | 기타 |
| `inactive` | 미활동 |

### 2-3. `KpaFeeCategory` (7개) — 회비 분류 ([kpa-member.entity.ts:45-52](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L45))

`A1_pharmacy_owner` / `A2_pharma_manager` / `B1_pharmacy_employee` / `B2_pharma_company_employee` / `C1_hospital` / `C2_admin_edu_research` / `D_fee_exempted`

→ **회비 산정 전용** — 권한과 무관.

### 2-4. `kpa_members.role` (3개) — 조직 내 역할 ([kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts) line 65)

`'member'` / `'operator'` / `'admin'` — 조직(분회/지부) 내 역할. role_assignments 와 별개로 저장됨 (이중화).

---

## 3. 직역별 실제 서비스 접근 차이 매트릭스

| 영역 \ 직역 | pharmacy_owner (role 보유) | pharmacy_employee | hospital | wholesaler / manufacturer / etc | student | external_expert / supplier_staff | kpa:operator / kpa:admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **/forum 읽기·쓰기** | ✅ | ✅ | ✅ | ✅ | ⚠️ `PharmacistOnlyGuard` 일부 차단 | ✅ | ✅ |
| **/lms 수강** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **/content 조회** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **/store-hub 진입** | ✅ HubGuard | ❌ | ❌ | ❌ | ❌ | ❌ | redirect → /operator |
| **/store/* (내 매장)** | ✅ PharmacyGuard | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **/store/my-products** | ✅ PharmacyOwnerOnlyGuard | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **POP / QR / 블로그 작성** | ✅ (Store 하위) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **/operator/*** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **AI 콘텐츠 생성** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**관찰**:
- 11개 activity_type 중 **`pharmacy_owner` 만 권한 차이를 만든다** — 그것도 별도의 `kpa:store_owner` role 부여를 통해서.
- `pharmacy_employee` 와 `hospital` / `wholesaler` 등은 **서비스 접근 측면에서 동일** (모두 forum/lms/content 만 가능).
- `student` 만 `PharmacistOnlyGuard` 가 일부 forum 페이지에서 차단 — 사실상의 유일한 *profile-based* 차별.
- `external_expert` / `supplier_staff` 는 향후 LMS 강사 / Neture 공급자 등으로 확장될 수 있는 분류이나 **현재 KPA 코드에서는 특별한 가드 없음**.

---

## 4. 가드(Guard) 컴포넌트 카탈로그

| Guard | 검사 로직 | 통과 조건 | file |
|---|---|---|---|
| `AuthGate` | `serviceAccess` + `activityType` | `serviceAccess !== 'blocked'/'pending'` AND `activityType` 설정됨 | [AuthGate.tsx:26-62](services/web-kpa-society/src/components/auth/AuthGate.tsx#L26) |
| `PharmacyGuard` | role + API check 이중 | `STORE_OWNER_ROLES` 보유 OR `/pharmacy-requests/my` 에서 `status='approved'` 발견 | [PharmacyGuard.tsx:19-86](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx#L19) |
| `HubGuard` | role only | `STORE_OWNER_ROLES` 보유 (PLATFORM_ROLES 는 /operator 로 redirect) | [HubGuard.tsx:16-41](services/web-kpa-society/src/components/auth/HubGuard.tsx#L16) |
| `PharmacyOwnerOnlyGuard` | role only | `STORE_OWNER_ROLES` OR `PLATFORM_ROLES` | [PharmacyOwnerOnlyGuard.tsx:18-39](services/web-kpa-society/src/components/auth/PharmacyOwnerOnlyGuard.tsx#L18) |
| `PharmacistOnlyGuard` | membershipType | `student` 차단, 나머지 통과 | [PharmacistOnlyGuard.tsx:27-51](services/web-kpa-society/src/components/auth/PharmacistOnlyGuard.tsx#L27) |
| `RoleGuard` | allowedRoles | 명시된 role 중 하나라도 보유 | [RoleGuard.tsx:25-49](services/web-kpa-society/src/components/auth/RoleGuard.tsx#L25) |

**STORE_OWNER_ROLES** (role-constants.ts): `['kpa:store_owner']`
**PLATFORM_ROLES**: `['kpa:admin', 'kpa:operator', 'platform:super_admin']`

**Backend `requireScope` 사용**: `kpa:operator`, `kpa:admin` 만 `/operator/*` / `/kpa/admin/*` route 들에서 검증. `kpa:store_owner` 는 frontend Guard 외에 backend 에서도 일부 `/store-hub/capabilities` / `/kpa/assets/copy` 등에서 검증.

---

## 5. 승인(approval) 구조 — 이중 흐름 검증

### 5-1. 두 개의 독립 테이블

| 테이블 | 용도 | controller |
|---|---|---|
| `kpa_approval_requests` | "통합 승인 엔진" — entity_type 다중 (`'membership'` / `'forum_category'` / `'instructor_qualification'` / `'course'`) | [kpa-approval-request.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-approval-request.entity.ts), `organization-join-request.controller.ts` |
| `kpa_pharmacy_requests` | **독립 테이블** — 매장 경영자 승인 전용 | [kpa-pharmacy-request.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts), `pharmacy-request.controller.ts` |

`kpa_pharmacy_requests` 가 통합 엔진 외부에 별도로 존재하는 이유는 entity 헤더 주석 (line 5-8): *"약국 join은 '조직 가입'이 아니라 '개인 속성 변경'"*. 즉 회원가입(=조직 가입) 흐름과 매장 경영자(=개인 속성 변경) 흐름을 의도적으로 분리.

### 5-2. 가입 승인 ↔ 매장 경영자 승인 — 동일 사용자가 두 번 받을 수 있는가?

**YES, 가능하다**. 두 흐름은 독립적이며 동일 사용자가 **두 번 pending 상태에 동시 존재 가능**:

1. 가입 직후: `service_memberships.status = 'pending'` (회원 승인 대기)
2. 가입 승인 받음: `service_memberships.status = 'active'`, `users.status = 'active'`, `role_assignments` 에 `member` 부여
3. 사용자가 `/store-hub` 진입 시도 → HubGuard 차단 → "매장 경영자 신청" 안내
4. 사용자가 `/pharmacy-requests` POST → `kpa_pharmacy_requests.status = 'pending'` (매장 경영자 승인 대기)
5. 매장 경영자 승인 받음: `role_assignments` 에 `kpa:store_owner` 부여, organization 생성

→ **두 단계는 시간 차를 두고 발생할 수 있고, 두 큐는 분리된 운영자 화면에서 처리됨**.

### 5-3. status 3중 동기화 (users / service_memberships / kpa_members)

| 동기화 시점 | users.status | service_memberships.status | kpa_members.status |
|---|:---:|:---:|:---:|
| `MembershipApprovalService.approveMembership()` | ✅ active | ✅ active | ❌ NOT auto-updated |
| `MembershipApprovalService.suspendMembership()` | ❌ unchanged | ✅ suspended | ❌ NOT auto-updated |
| `MembershipApprovalService.reactivateMembership()` | ✅ (suspended → active) | ✅ active | ❌ NOT auto-updated |
| `/kpa/members/:id/status` PATCH (member.controller) | ✅ active | (호출 안 함) | ✅ status 직접 update |
| `/kpa/pharmacy-requests/:id/approve` | ❌ unchanged | ❌ unchanged | ❌ unchanged (organization_id 만 update) |

**관찰**: 두 경로(`MembershipApprovalService` vs `member.controller.ts:336`)가 *부분적으로 다른 컬럼을 업데이트* 한다. `kpa_members.status` 가 `MembershipApprovalService` 에 의해 자동 동기화되지 않음 → 운영자가 명시적으로 `/kpa/members/:id/status` 를 호출해야 동기화. 이 단절이 "회원은 활성인데 kpa_members 는 여전히 pending" 같은 상태 불일치를 만들 수 있다.

---

## 6. profile metadata vs capability — 분리 기준 제안

### 6-1. 분류표

| 구분 | 항목 | 변경 정책 | 부여 시점 |
|---|---|---|---|
| **A. profile metadata** | `KpaActivityType` (11개), `KpaMemberType` (6개), `KpaFeeCategory` (7개), `university_name`, `pharmacy_name` (등록만), `businessInfo.metadata.workplace` | 자유 변경 가능 (사용자 본인) | 가입 시 / 직역 변경 시 |
| **B. capability** (서비스 접근 권한) | (현재 코드 기준 없음 — 모든 것이 C 로 분류됨) | — | — |
| **C. approval-required capability** | `kpa:store_owner`, `kpa:operator`, `kpa:admin` | 신청 → 운영자 승인 → 부여 | 별도 신청·승인 흐름 |
| **D. service access difference** (위 권한이 만드는 차이) | Store HUB, 내 매장, Operator 대시보드 | — | — |
| **E. profile-only difference** (capability 없이 profile 만으로 만드는 차이) | `student` 의 일부 forum 차단 | 단일 케이스 | — |

### 6-2. 분리 기준 (canonical 제안)

> **profile metadata = 사용자가 자신의 *상태* 를 자유롭게 선언하는 것**
> **capability = 시스템이 사용자에게 *권한* 을 부여하기 위해 운영자가 검증하는 것**

| 기준 | profile | capability |
|---|---|---|
| **변경 권한** | 사용자 본인 | 운영자 승인 |
| **API endpoint** | `PATCH /api/v1/auth/me/profile` (현재) | `POST /api/v1/kpa/{capability}-requests` → `PATCH .../approve` |
| **저장 위치** | `kpa_members` / `kpa_*_profiles` / `users.businessInfo` | `role_assignments` (RBAC SSOT) |
| **검증 위치** | (없음 — 단순 표시) | Frontend Guard + Backend `requireScope` |
| **변경 이력** | optional | `role_assignments.created_at` + audit log |
| **존재 의미** | "어떤 사람인가" (자기소개) | "무엇을 할 수 있는가" (실제 권한) |

→ 이 기준으로 보면 **현재 KPA 의 모든 `KpaActivityType` 11개는 profile** 이며, **실제 capability 는 `kpa:store_owner` / `kpa:operator` / `kpa:admin` 3개뿐**.

---

## 7. 가입 흐름 canonical 초안

> Phase 1 에서 schema 변경 없이도 어휘·UX 만으로 정렬 가능한 안.

```
Stage 1: 기본 회원 가입 (현재 흐름 유지)
  POST /auth/register
  → users(pending) + service_memberships(pending) + kpa_members(pending) + 
    membership_type 별 profile row 자동 생성
  → 가입 즉시 activityType 미설정 상태

Stage 2: 직역(profile) 자유 선택 (승인 없음)
  AuthGate 가 /setup-activity 강제 → ActivitySetupPage
  PATCH /auth/me/profile { activityType, businessInfo? }
  → kpa_pharmacist_profiles.activity_type SSOT 저장
  → kpa_members.activity_type mirror 저장
  → 변경 후 자유롭게 재변경 가능 (MyProfilePage 직역 정보 탭)

Stage 3: 회원 자격 승인 (Operator 검증)
  Operator: PATCH /kpa/members/:id/status { status: 'active' }
  → users.status='active', isActive=true
  → kpa_member_services.status='approved'
  → role_assignments INSERT (member)
  → kpa_members.status='active' (명시적)
  → ❗ MembershipApprovalService 와 동기화 (현재는 단절 — Phase 1 정렬 대상)

Stage 4: capability 신청 (선택, 사용자가 필요 시)
  4a) 매장 경영자 신청
    POST /kpa/pharmacy-requests { pharmacy_name, business_number, ... }
    → kpa_pharmacy_requests.status='pending'
    Operator: PATCH /kpa/pharmacy-requests/:id/approve
    → role_assignments INSERT (kpa:store_owner)
    → organization 생성 + organization_members(role=owner) 추가
    → kpa_pharmacist_profiles.activity_type='pharmacy_owner' upsert (mirror)

  4b) 운영자 신청 (현재 별도 흐름 — kpa_approval_requests entity_type='membership' 의 promotion request_type)
    POST /kpa/organization-join-requests { request_type: 'operator', ... }
    Operator: PATCH /kpa/organization-join-requests/:id/approve
    → role_assignments INSERT (kpa:operator)
```

**핵심 변경 포인트** (canonical 제안):
1. **Stage 2 와 Stage 4a 의 차이를 UX 에서 명시** — 직역 정보 탭에서 `pharmacy_owner` 선택은 *프로필 표시* 일 뿐이며, *실제 매장 접근 권한 부여를 원하면 별도 "매장 경영자 등록 신청" 으로 진입* 하도록 안내 문구 추가.
2. **Stage 3 와 MembershipApprovalService 의 status 동기화 단절 해소** — `MembershipApprovalService.approveMembership()` 가 `kpa_members.status` 도 함께 update 하도록 Phase 1 후반에 보강.
3. **Stage 4a/4b 를 통합 큐로 일원화 검토** — `kpa_approval_requests.entity_type` 에 `'pharmacy_request'` 추가하여 운영자 화면 단일화 (별도 WO).

---

## 8. 직역 변경 canonical 초안

```
일반 profile 변경 (자유):
  - activityType
  - membershipType (학생 ↔ 약사 전환은 신중 — 별도 검토)
  - university_name (kpa_members)
  - workplace (users.businessInfo.metadata.workplace)
  - businessInfo (사업자 정보)

  → MyProfilePage "직역 정보" / "기본 정보" 탭
  → PATCH /auth/me/profile (인증만 필요)
  → 즉시 반영, 이력 기록 optional

capability 변경 (신청 + 승인):
  - kpa:store_owner 요청 / 철회
    → POST /kpa/pharmacy-requests (요청)
    → DELETE /kpa/pharmacy-requests/:id (철회 — 현재 미구현, Phase 2)
    → Operator approve/reject

  - kpa:operator / kpa:admin 부여 / 회수
    → POST /kpa/organization-join-requests (request_type='operator')
    → Operator approve/reject

  → 모든 capability 변경은 role_assignments 레벨에서 INSERT/UPDATE
  → audit trail 필수 (assignedAt, assignedBy)
```

**현재 코드의 갭**:
- `kpa:store_owner` 회수(매장 경영자 자격 박탈) API 부재 — 폐업/은퇴 시 처리 미정의
- `kpa:operator` / `kpa:admin` 자기 신청 흐름 부재 — 현재는 운영자가 직접 부여
- 직역(activityType) 변경 시 부수적 영향 (매장 보유자가 활동유형을 `inactive` 로 바꾸면 `kpa:store_owner` 가 어떻게 되는가?) 미정의

---

## 9. 최소 변경 우선순위 (Phase 1 후반)

| 순위 | 항목 | 변경 범위 | 위험 |
|:---:|---|---|---|
| **1** | `MembershipApprovalService.approveMembership()` 가 `kpa_members.status` 도 동기화 | `MembershipApprovalService.ts` 단일 함수 + 트랜잭션 보강 | 낮음 — 현재 분리된 두 update 가 동기화되어 일관성 회복 |
| **2** | MyProfilePage 직역 정보 탭에 "매장 경영자 등록 신청은 별도 흐름" 안내 문구 + `pharmacy_owner` 선택 시 안내 모달 | `MyProfilePage.tsx` UI only | 낮음 — UX 정렬 |
| **3** | `kpa:store_owner` 권한 회수 API (`DELETE /kpa/pharmacy-requests/:id` 또는 `POST /kpa/pharmacy-requests/withdraw`) | controller + service + audit log | 중간 — 회수 시 organization / Store 잔존 데이터 정책 필요 |
| **4** | `isStoreOwner` boolean flag 제거 → `roles` 배열만 SSOT | `User` entity / AuthContext / KpaGlobalHeader | 중간 — 여러 위치 수정, 회귀 검증 필요 |
| **5** | `kpa_approval_requests.entity_type` 에 `'pharmacy_request'` 추가하여 통합 큐화 | schema migration + controller + 운영자 페이지 | 높음 — 별도 WO 권장 |
| **6** | activity_type 변경 시 `kpa:store_owner` 보유자에 대한 정책 (예: 변경 차단 또는 경고) | MyProfilePage + auth-account.controller | 중간 |

---

## 10. Migration 위험 요소

| 항목 | 위험 | 완화 방안 |
|---|---|---|
| `kpa_members.status` ↔ `service_memberships.status` 분리 → 통합 시 기존 row 들의 불일치 | 운영 중 데이터에서 두 status 가 다른 사용자가 존재할 가능성. update 시 어느 쪽을 신뢰할지 결정 필요 | Pre-migration audit query → 케이스별 정책 결정 (예: `service_memberships.status` 우선) |
| `isStoreOwner` boolean 제거 → 외부 클라이언트 / 모바일 앱이 이 필드를 의존하면 회귀 | 현재 `KpaGlobalHeader` 외 활용처 그렙 후 정리 | grep `isStoreOwner` 후 모든 caller 가 `roles.includes('kpa:store_owner')` 로 전환되었는지 확인 |
| `kpa_pharmacy_requests` 통합 시 `entity_type='pharmacy_request'` 추가 | 기존 별도 테이블의 데이터 마이그레이션 또는 view 도입 필요 | Phase 2 별도 WO — schema rollout 단계 분리 |
| activity_type 자유 변경 차단 시 운영 중인 사용자의 변경 시도가 차단되어 CS 증가 | 정책 변경 안내 + 운영자 경유 변경 흐름 마련 필요 | UI 안내 + "직역 변경 신청" 흐름 도입 검토 |

---

## 11. 이후 공통화(Phase 3) 가능 영역 — 사전 평가

> **GlycoPharm / Neture / K-Cosmetics 공통화는 본 IR 범위 외**. 단, 향후 평가에 사용할 수 있는 사전 단서 정리.

| 영역 | 공통화 가능성 | 근거 |
|---|---|---|
| **profile metadata 구조** | 낮음 | 각 서비스마다 활동유형이 다름 (KPA: 약사 11종 / GlycoPharm: 환자/약사 / Neture: 공급자/판매자). 공유 base table + 서비스별 extension 패턴 필요 |
| **capability(role_assignments) SSOT** | 높음 | 이미 `role_assignments` 가 4개 서비스 공통 사용. role 키만 서비스별 prefix (`kpa:` / `glyco:` / `cosmetics:`) |
| **승인(approval) 엔진** | 중간 | `kpa_approval_requests` 패턴은 generic 하지만 entity_type 별 sideeffect 가 서비스 종속. 추상화 가능 |
| **Store/HUB capability** | 높음 | `useStoreCapabilities` + `StoreDashboardConfig` 가 이미 4개 서비스 공통 (`packages/store-ui-core`) |
| **PharmacyGuard 패턴** | 낮음 | KPA 도메인 특화 ("약국 신청 → 승인 → 매장 경영자 role"). 다른 서비스는 다른 도메인 흐름 (예: GlycoPharm 환자 vs 약사). 패턴은 같으나 구체화는 서비스별 |

→ Phase 3 권장: **`role_assignments` SSOT 와 `kpa_approval_requests` 패턴은 우선 공통화**, profile / Guard 는 서비스별 유지.

---

## 12. 요약 — 답해야 할 핵심 질문

> 본 IR 의 "현재 가설" 섹션 항목별 응답.

| 질문 | 답 |
|---|---|
| Q1. KPA의 다수 직역이 실제 권한 차이를 가지는가? | **아니오**. 11개 `KpaActivityType` 중 `pharmacy_owner` 만 권한 차이를 만들고, 그것도 별도 `kpa:store_owner` role 부여를 통해서임. 나머지 10개는 profile metadata. |
| Q2. 단순 profile metadata 로 축소 가능한가? | **가능**. UI 어휘 분리 (Phase 1) → schema 단순화는 별도 검토. |
| Q3. 실제 승인형 capability 가 몇 개인가? | **3개** — `kpa:store_owner`, `kpa:operator`, `kpa:admin`. |
| Q4. 가입 승인 + capability 승인 이중 구조 제거 가능한가? | **부분 가능**. Stage 3 (회원 승인) 은 모든 사용자에게 필요하므로 유지. Stage 4 (capability 승인) 은 선택적이므로 분리 유지가 자연스러움. 다만 두 흐름의 운영자 큐는 통합 가능 (`kpa_approval_requests.entity_type` 확장). |
| Q5. Store 생성 트리거를 capability 승인으로 이동 가능한가? | **이미 그렇게 됨**. `kpa_pharmacy_requests` 승인 시 `organization_store` 생성 + `kpa:store_owner` role 부여가 같은 트랜잭션. 추가 정렬은 회수 시 정책만 추가하면 됨. |
| Q6. 현재 O4O 철학(Store Capability 중심)과 맞는가? | **대체로 맞음**. `useStoreCapabilities` / `StoreDashboardConfig` 가 capability 중심으로 사이드바를 구성하고 있으며, `kpa:store_owner` 가 그 capability 의 게이트로 작동. 개선 여지: profile/capability 어휘 분리, status 동기화, 회수 흐름. |

---

## 부록 A. 핵심 파일 인벤토리

### Frontend (services/web-kpa-society)
- App.tsx — `/store-hub` (line 632), `/store` (line 826), `/store/my-products` (line 850) 라우트 가드 정의
- pages/auth + pages/ActivitySetupPage.tsx — 가입 / 직역 선택
- pages/mypage/MyProfilePage.tsx — 직역 정보 탭 (line 137-159)
- components/auth/PharmacyGuard.tsx, HubGuard.tsx, PharmacyOwnerOnlyGuard.tsx, PharmacistOnlyGuard.tsx, RoleGuard.tsx, AuthGate.tsx
- components/KpaGlobalHeader.tsx — `isStoreOwner` 사용 (line 70)
- contexts/AuthContext.tsx — `setActivityType` (line 394), `fetchKpaContext` (line 256)
- hooks/useStoreCapabilities.ts
- pages/operator/MemberManagementPage.tsx — 운영자 회원 관리 큐
- config/role-constants.ts — `STORE_OWNER_ROLES`, `PLATFORM_ROLES`
- config/navigation.ts — `KPA_CONTEXTUAL_NAV` + `filterContextualNav`

### Backend (apps/api-server)
- modules/auth/controllers/auth-register.controller.ts — POST /register
- modules/auth/controllers/auth-account.controller.ts — PATCH /me/profile (line 106-198)
- modules/auth/entities/User.ts — businessInfo JSONB (line 66), roles runtime (line 74)
- modules/auth/entities/RoleAssignment.ts — RBAC SSOT
- routes/kpa/entities/kpa-member.entity.ts — KpaMemberType / KpaActivityType / KpaFeeCategory enum
- routes/kpa/entities/kpa-approval-request.entity.ts — 통합 승인 entity
- routes/kpa/entities/kpa-pharmacy-request.entity.ts — 매장 경영자 신청 (독립)
- routes/kpa/controllers/member.controller.ts — `/kpa/members/:id/status` PATCH (line 336-508)
- routes/kpa/controllers/pharmacy-request.controller.ts — 매장 경영자 신청 / 승인 (line 40-274)
- routes/kpa/controllers/organization-join-request.controller.ts — 통합 entity_type='membership' 흐름
- services/approval/MembershipApprovalService.ts — Core 승인 엔진 (status 동기화)

### 공통 패키지
- packages/store-ui-core/src/config/storeMenuConfig.ts — `KPA_SOCIETY_STORE_CONFIG` 사이드바
- packages/store-ui-core/src/components/StoreSidebar.tsx — accordion + active 자동 펼침 (`WO-O4O-STORE-SIDEBAR-MENU-UX-IMPROVEMENT-V1`)

---

*IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1*
*Updated: 2026-05-09*
*Status: Investigation Complete — Phase 1 후속 WO 분기 대기 (변경 없음)*
