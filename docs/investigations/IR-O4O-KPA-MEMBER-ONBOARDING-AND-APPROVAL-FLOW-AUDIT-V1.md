# IR-O4O-KPA-MEMBER-ONBOARDING-AND-APPROVAL-FLOW-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**선행 WO**: WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1 (commit `2e5f6c914`) 적용 직후 상태 기준
**선행 IR**: [IR-O4O-KPA-REGISTER-ROUTE-AND-TYPE-AUDIT-V1.md](IR-O4O-KPA-REGISTER-ROUTE-AND-TYPE-AUDIT-V1.md)

---

## 0. 한 줄 결론

> **현재 회원가입은 단일 승인이지만, "개설약사 = store_owner" 활성화는 사실상 2단계 승인 구조다.**
> 가입 모달 + AuthGate(ActivitySetupPage) + pharmacy-request 3-단 onboarding이 직렬로 존재한다.
> canonical 정책(가입 단계 직역+근무처+사업자정보 입력 → 1회 승인 → 즉시 store_owner) 으로 가려면 RegisterModal 확장 + `auth-register.controller.createKpaRecords` 확장 + 승인 시 자동 organization 생성 + role_assignment 자동 부여의 통합 변경이 필요하다.

---

## 1. 현재 회원가입 입력/저장 구조

### 1.1 RegisterModal 입력 필드 (canonical cleanup 이후)

| 영역 | 필드 | 약사 | 약대생 | required |
|---|---|---|---|---|
| 공통 | email, password, lastName, firstName, nickname, phone, agreeTerms, agreePrivacy | ✓ | ✓ | Yes |
| 약사 전용 | licenseNumber | ✓ | — | Yes |
| 약대생 전용 | universityName | — | ✓ | Yes |
| 약대생 전용 | studentYear | — | ✓ | No |

위치: [RegisterModal.tsx:113-127](services/web-kpa-society/src/components/RegisterModal.tsx#L113-L127)

**가입 모달에 부재**: activity_type(직역), pharmacy_name(근무처), pharmacy_address, business_number, businessRegistration(파일).

### 1.2 register.dto.ts 수용 필드 (canonical cleanup 이후)

수용 키: email/password/lastName/firstName/name/nickname/phone/role/service/membershipType/licenseNumber/universityName/studentYear/organizationId/pharmacistFunction(@deprecated)/businessName/businessNumber/businessType/businessCategory/representativeName/companyName/taxEmail/zipCode/address1/address2/displayName/pharmacyName/tos/privacyAccepted/agreeTerms/agreePrivacy/marketingAccepted/agreeMarketing

위치: [register.dto.ts](apps/api-server/src/modules/auth/dto/register.dto.ts)

**핵심 발견**: GlycoPharm 가입 흐름에는 사업자 정보(`businessName/businessNumber/representativeName/zipCode/address1/address2/businessCategory`) 가 이미 DTO에 정의·연결되어 있으나 **KPA 흐름의 `createKpaRecords` 는 이 필드들을 무시한다** ([auth-register.controller.ts:351-414](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L351-L414)).

부재 키: `activityType`, `pharmacyName`(KPA), `pharmacyAddress`, `businessRegistration`(파일/URL).

### 1.3 kpa_members 컬럼 (이미 존재)

| 컬럼 | 가입 시 INSERT 여부 | 비고 |
|---|---|---|
| user_id, organization_id, membership_type, role, status, identity_status | ✓ | 기본 |
| license_number | ✓ (약사만) | |
| university_name, student_year | ✓ (약대생만) | |
| **pharmacy_name** (varchar 200) | **✗ NULL** | 컬럼 정의는 존재 |
| **pharmacy_address** (varchar 300) | **✗ NULL** | 컬럼 정의는 존재 |
| **activity_type** (varchar 50) | **✗ NULL** | 컬럼 정의는 존재 |
| sub_role (varchar 100) | ✗ NULL | 컬럼 정의는 존재 (legacy) |
| fee_category (varchar 50) | ✗ NULL | 컬럼 정의는 존재 |
| joined_at | — | 승인 시 NOW() |

위치: [kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts)

→ **DB 컬럼은 이미 준비되어 있고, INSERT 로직만 연결 안 되어 있다.**

### 1.4 kpa_pharmacist_profiles (SSOT for activity_type)

컬럼: id, user_id (UNIQUE), license_number, license_verified, **activity_type** (11값 enum: pharmacy_owner / pharmacy_employee / hospital / manufacturer / importer / wholesaler / other_industry / government / school / other / inactive), verified_at, verified_by, created_at, updated_at.

위치: [kpa-pharmacist-profile.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacist-profile.entity.ts), enum [kpa-member.entity.ts:31-42](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L31-L42)

가입 단계 INSERT: 약사인 경우 + `data.pharmacistFunction || data.licenseNumber` 이면 INSERT — 그러나 `activity_type` 은 `pharmacistFunction` 이 있을 때만 매핑되며 RegisterModal은 이 필드를 전송하지 않으므로 **현재 activity_type = NULL** ([auth-register.controller.ts:407-413](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L407-L413)).

### 1.5 사업자등록증 파일 업로드 구조

- 회원가입 시 파일 업로드 UI: **부재**
- 백엔드 파일 업로드 endpoint(가입용): **부재**
- `business_registration_file` 또는 유사 컬럼: **부재** (어느 entity에도 없음)
- 사업자번호(`business_number`)는 `organizations.business_number` (varchar 20) 에 저장 가능 [organization-store.entity.ts]
- 사업자 정보 임시 저장 위치: `users.businessInfo` (JSONB, allowedFields = businessName, phone, storeAddress, address, address2, zipCode)

→ **사업자등록증 첨부는 가입 단계·약국 신청 단계 어디에도 구현되어 있지 않다.**

---

## 2. 승인 흐름 단계 수 정확 판정

### 2.1 회원 승인 endpoint

**유일 endpoint**: `PATCH /kpa/members/:id/status` (`kpa:operator` scope) — [member.controller.ts:438-583](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L438-L583)

**body**: `{ status: 'pending'|'active'|'suspended'|'rejected'|'withdrawn' }`

승인(pending → active) 시 부수효과:
1. `kpa_members.status='active'`, `joined_at=NOW()`
2. `users.status='active'`, `isActive=true`, `approvedAt=NOW()`, `approvedBy`
3. `kpa_pharmacist_profiles` 또는 `kpa_student_profiles` safety-net INSERT (ON CONFLICT DO NOTHING)
4. `kpa_member_services.status='approved'`
5. `service_memberships` 상태 동기화 (MembershipApprovalService 경로)
6. **`role_assignments` INSERT 없음** (코드 주석: `kpa:pharmacist / kpa:student role 할당 제거 — profile 기반 전환`)
7. **`organization_stores` 자동 생성 없음**
8. **`kpa:store_owner` 자동 부여 없음**

### 2.2 케이스 트레이싱

#### 케이스 A — 약대생
1. `POST /api/v1/auth/register` → `kpa_members.status='pending'`
2. 운영자 `PATCH /:id/status` → `active`, `kpa_student_profiles` INSERT, `users.status='active'`
3. 로그인 → AuthGate: `serviceAccess='active'` + `membershipType='student'` → **면제** ([role-constants.ts:91-98](services/web-kpa-society/src/lib/role-constants.ts#L91)) → 정상 진입
4. **=== 1단계 단일 승인 완료 ===**

#### 케이스 B — 약사 정회원 (근무약사·병원약사 등)
1. 가입 → pending
2. 운영자 승인 → active
3. 로그인 → AuthGate: `serviceAccess='active'` + `activityType=NULL` + 비면제 → **`/setup-activity` 강제 redirect** ([AuthGate.tsx:53-58](services/web-kpa-society/src/components/auth/AuthGate.tsx#L53-L58))
4. ActivitySetupPage Step1(직역 선택) → Step2(근무지 정보) → `PATCH /auth/me/profile` ([auth-account.controller.ts:106-198](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L106-L198))
   - `kpa_pharmacist_profiles.activity_type` UPSERT
   - `kpa_members.activity_type` mirror UPDATE
   - `users.businessInfo` JSONB merge
   - **별도 운영자 승인 불요** — 사용자가 직접 입력
5. `/mypage` 이동, 정상 진입
6. **=== 1단계 승인 + 강제 onboarding (재승인 없음) ===**

#### 케이스 C — 개설약사 (목표 사용자)
1~5는 케이스 B와 동일 (Step1에서 `pharmacy_owner` 선택)
6. 사용자가 `/pharmacy` 또는 `/store-hub` 접근 시도
7. PharmacyGuard → `isStoreOwnerDual(roles, 'kpa:store_owner', isStoreOwner) === false` → `/pharmacy` (PharmacyApprovalGatePage) redirect ([PharmacyGuard.tsx:37-41](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx#L37-L41))
8. **PharmacyApprovalGatePage 에서 사업자등록번호, 세금계산서 이메일, 약국명, 약국 전화, 개설자 전화 입력** ([PharmacyApprovalGatePage.tsx:22-100](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx#L22-L100))
9. `POST /api/v1/kpa/pharmacy-requests` → `kpa_pharmacy_requests.status='pending'`
10. **운영자 2번째 승인** `PATCH /kpa/pharmacy-requests/:id/approve` ([pharmacy-request.controller.ts:200-241](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L200-L241)):
    - `organizationOpsService.ensureOrganization({type:'pharmacy', code='kpa-pharm-{biznum}'})` — 멱등
    - `kpa_members.organization_id` UPDATE (null인 경우만)
    - `organization_members.role='owner'` INSERT (멱등)
    - `kpa_pharmacist_profiles.activity_type='pharmacy_owner'` UPSERT
    - **`roleAssignmentService.assignRole({role:'kpa:store_owner'})` ← store_owner 활성화** ([pharmacy-request.controller.ts:236-241](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L236-L241))
11. 사용자 재로그인/세션 갱신 후 `isStoreOwner=true` → `/pharmacy` 접근 가능
12. **=== 2단계 승인 완료 ===**

### 2.3 단일 vs 2단계 정확 판정

| 사용자 유형 | 승인 단계 수 | 강제 onboarding | store_owner 자동 활성 |
|---|---|---|---|
| 약대생 | **1단계** | 없음 (면제) | N/A |
| 일반 약사 (근무약사 등) | **1단계** | **있음** (ActivitySetupPage) | N/A |
| **개설약사** | **2단계** (회원 승인 + 약국 신청 승인) | **있음** (ActivitySetupPage) | 약국 승인 시점에만 |

**사용자 정의 ("가입 승인 → 다시 로그인 → 직역 입력 → 다시 승인")** 와 정확히 일치하는 것은 케이스 C(개설약사). 일반 약사도 직역 입력 강제 onboarding이 있으나 별도 승인은 없다.

### 2.4 운영자 UI 가 보는 데이터

`GET /kpa/members` 응답에 다음 필드 노출 ([member.controller.ts:289-432](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L289-L432)):
- membership_type, license_number, university_name, student_year, **activity_type**, **pharmacy_name**, **pharmacy_address**, capabilities, status, identity_status, organization_id, joined_at, sub_role

→ **운영자는 회원 승인 화면에서 약사 여부(`license_number`)와 개설약사 여부(`activity_type='pharmacy_owner'`)를 모두 확인할 수 있는 데이터를 받는다.** 단, 현재 가입 단계에서는 activity_type/pharmacy_name이 NULL이므로 회원 승인 시점엔 표시할 데이터가 없다.

UI: [MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx), [MemberApprovalPage.tsx](apps/admin-dashboard/src/pages/yaksa-admin/MemberApprovalPage.tsx)

---

## 3. store_owner 활성화 로직

### 3.1 SSOT (백엔드)

[store-owner.utils.ts:71-99](apps/api-server/src/utils/store-owner.utils.ts#L71-L99) `isStoreOwner(dataSource, userId, serviceKey)`:
- `role_assignments WHERE user_id=$1 AND role IN ('kpa:store_owner') AND is_active=true` 존재 여부
- 부가: `organization_members WHERE user_id=$1 AND role IN ('owner','admin','manager') AND left_at IS NULL` 으로 organization_id 추출

→ **store_owner = `kpa:store_owner` role_assignments 1건만으로 결정.** activity_type='pharmacy_owner' 만으로는 부족.

### 3.2 frontend dual

[isStoreOwnerDual.ts:28-34](packages/auth-utils/src/isStoreOwnerDual.ts) — `roles.includes('kpa:store_owner') || contextFlag === true`. 백엔드 SSOT와 정합.

### 3.3 organization_stores 생성 트리거

| 트리거 | 위치 | 트리거 시점 |
|---|---|---|
| `organizationOpsService.ensureOrganization()` | [pharmacy-request.controller.ts:205-210](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L205-L210) | **pharmacy_request 승인 시에만** |

→ **회원가입·회원 승인 시점에는 organization 생성 안 됨.** 유일 생성 경로는 pharmacy_request 승인.

### 3.4 약국 HUB 접근 가드 매트릭스

| 가드 | 통과 조건 | 실패 시 |
|---|---|---|
| [PharmacyGuard](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx) | `isStoreOwnerDual(roles,'kpa:store_owner',contextFlag)` 또는 API approved pharmacy_request 발견 | `/pharmacy` (ApprovalGate) |
| [HubGuard](services/web-kpa-society/src/components/auth/HubGuard.tsx) | `hasAnyRole(roles, STORE_OWNER_ROLES)` | `/pharmacy` |
| [PharmacyOwnerOnlyGuard](services/web-kpa-society/src/components/auth/PharmacyOwnerOnlyGuard.tsx) | platform 또는 store_owner role | 권한 없음 |
| [MembershipGate](services/web-kpa-society/src/components/auth/MembershipGate.tsx) | `service_memberships.status='active'` | 상태별 안내 |

### 3.5 허위 개설약사 방지 구조

| 검증 | 존재 여부 | 위치 |
|---|---|---|
| 중복 신청(pending) 차단 | ✓ | [pharmacy-request.controller.ts:71-81](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L71-L81) |
| 이미 organization owner 차단 | ✓ | [pharmacy-request.controller.ts:57-68](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L57-L68) |
| 셀프 승인 차단 | ✓ | [pharmacy-request.controller.ts:183-191](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts#L183-L191) |
| 사업자번호 진위 검증 | ✗ | (형식 체크만) |
| **사업자등록증 첨부 강제 검증** | ✗ | (UI/필드 자체 부재) |
| 사업자번호 unique 제약 | ✗ | `organizations.business_number` UNIQUE 없음 |
| 운영자 검토(반려 가능) | ✓ | reject endpoint 있음, 자동 검증 규칙은 없음 |

---

## 4. 직역(activity_type) / 근무처 구조

### 4.1 enum 정의 (현존)

`KpaActivityType` 11값: `pharmacy_owner | pharmacy_employee | hospital | manufacturer | importer | wholesaler | other_industry | government | school | other | inactive`

위치: [kpa-member.entity.ts:31-42](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L31-L42), 라벨 [AuthContext.tsx:82-94](services/web-kpa-society/src/contexts/AuthContext.tsx#L82-L94)

### 4.2 사용자 정의 6종 vs 현재 11값 매핑

| canonical 6종 | 현재 enum 매핑 | 비고 |
|---|---|---|
| 개설약사 | `pharmacy_owner` | 1:1 |
| 근무약사 | `pharmacy_employee` | 1:1 |
| 병원약사 | `hospital` | 1:1 |
| **산업약사** | `manufacturer` + `importer` + `wholesaler` + `other_industry` + `government` + `school` | **6:1 (세분화)** |
| 기타 | `other` | 1:1 |
| 면허 미사용 | `inactive` | 1:1 |

→ **산업약사 1종을 표현하려면 5~6개 sub-type 중 선택해야 함.** UI에서 6종으로 추상화하고 backend는 11종 유지하거나, enum을 6종으로 축소하는 정책 결정 필요.

### 4.3 ActivitySetupPage 직역 분기

[ActivitySetupPage.tsx:73-110](services/web-kpa-society/src/pages/ActivitySetupPage.tsx#L73-L110):
- **full** (`pharmacy_owner`): 약국명/주소/전화 입력 필수
- **minimal** (`pharmacy_employee`, `hospital`, `manufacturer`, `wholesaler`, `importer`, `government`, `school`, `other_industry`): 근무지명/전화 입력
- **skip** (`inactive`, `other`, 학생): 정보 없이 완료

→ **현재 ActivitySetupPage 자체가 canonical 정책 "약사 가입 시 직역+근무처 입력" 의 강제 후처리 형태**. 가입 모달로 이전 가능.

### 4.4 근무처 컬럼 매핑

| 위치 | 컬럼 | 사용 시점 |
|---|---|---|
| `kpa_members.pharmacy_name`/`pharmacy_address` | varchar(200/300), nullable | mirror only (PATCH /auth/me/profile) |
| `users.businessInfo` (JSONB) | businessName / address / storeAddress 등 | PATCH /auth/me/profile merge |
| `organizations.name` / `address` | varchar(255/500) | pharmacy_request 승인 시점 |

→ 동일 정보가 3곳에 중복 저장될 수 있음 (mirror 패턴). canonical은 organization을 신원의 일부로 만드는 방향.

---

## 5. 과거 2단계 승인 흔적 분류 (A/B/C)

| 항목 | 상태 | 코드 근거 | 비고 |
|---|---|---|---|
| ActivitySetupPage 강제 진입 | **A (Active)** | [AuthGate.tsx:52-58](services/web-kpa-society/src/components/auth/AuthGate.tsx#L52-L58) | 활성 사용자 + activityType=NULL + 비면제 시 강제 redirect |
| PendingApprovalPage | **A (Active)** | [PendingApprovalPage.tsx:56-64](services/web-kpa-society/src/pages/PendingApprovalPage.tsx#L56-L64) | serviceAccess='pending'/'blocked' 시 노출 |
| `/auth/me/profile` PATCH | **A (Active)** | [auth-account.controller.ts:106-198](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L106-L198) | ActivitySetupPage + MyProfilePage + AnnualReportFormPage 가 호출 |
| pharmacy_request 흐름 | **A (Active)** | [pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts) + [PharmacyApprovalGatePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx) + [PharmacyRequestManagementPage.tsx](services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx) | UI·운영자 화면 모두 활성 |
| pharmacistFunction 매핑 | C (Partially) | [register.dto.ts:122-130 (deprecated)](apps/api-server/src/modules/auth/dto/register.dto.ts) + auth-register.controller.ts:407-413 | `@deprecated` 표기, fallback 경로 |
| pharmacistRole 필드 | B (Dead) | register.dto.ts:127-130 | `@deprecated`, derived 표기, 호출자 없음 |
| sub_role 컬럼 (kpa_members) | C (Partially) | entity 컬럼 정의는 있으나 register/apply에서 INSERT 안 함 | WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1 잔재 |

→ **A 4개는 모두 사용자가 제거 대상으로 명시한 "2단계 승인 + 강제 onboarding" 구조의 living 컴포넌트.**

---

## 6. 현재 흐름 다이어그램 (개설약사 케이스)

```
[1] 회원가입 모달
    POST /api/v1/auth/register
    payload: email, password, name, phone, licenseNumber (직역/사업자정보 부재)
       │
       ▼
[2] kpa_members.status='pending' 생성
    users.status='pending'
       │
       ▼
[3] 운영자 1차 승인 (회원 승인)
    PATCH /kpa/members/:id/status → 'active'
    kpa_pharmacist_profiles INSERT (activity_type=NULL)
    users.status='active'
    role_assignments 부여 없음
       │
       ▼
[4] 로그인 후 AuthGate
    serviceAccess='active' + activityType=NULL + 비면제
       │ → /setup-activity 강제 redirect
       ▼
[5] ActivitySetupPage Step1+Step2
    PATCH /auth/me/profile {activityType: 'pharmacy_owner', businessInfo: {...}}
    → kpa_pharmacist_profiles.activity_type UPSERT
    → kpa_members.activity_type / pharmacy_name / pharmacy_address mirror UPDATE
    → users.businessInfo JSONB merge
    (운영자 승인 불요)
       │
       ▼
[6] /mypage 이동, 정상 사용
    그러나 isStoreOwner=false → /pharmacy 접근 시 PharmacyGuard 차단
       │
       ▼
[7] PharmacyApprovalGatePage
    POST /kpa/pharmacy-requests
    {businessRegistrationNumber, taxInvoiceEmail, pharmacyName, pharmacyPhone, ownerPhone}
    kpa_pharmacy_requests.status='pending' 생성
       │
       ▼
[8] 운영자 2차 승인 (약국 승인)
    PATCH /kpa/pharmacy-requests/:id/approve
    → organizationOpsService.ensureOrganization (organizations 생성)
    → kpa_members.organization_id UPDATE
    → organization_members.role='owner' INSERT
    → kpa_pharmacist_profiles.activity_type='pharmacy_owner' UPSERT (idempotent)
    → roleAssignmentService.assignRole('kpa:store_owner')
       │
       ▼
[9] (재로그인/세션 갱신 후) isStoreOwner=true
    /pharmacy, /store-hub 접근 가능
```

---

## 7. canonical 방향 적합성 평가

### 7.1 정책 요구사항

| # | 요구사항 |
|---|---|
| R1 | 약대생: 기본정보 + 학교 정보 → 1회 승인 |
| R2 | 약사: 가입 단계에서 기본정보 + 면허번호 + **직역 + 근무처** 입력 |
| R3 | 개설약사: 가입 단계에서 추가로 **사업자등록번호 + 사업자등록증 + 약국명 + 사업장주소** 입력 |
| R4 | 운영자: 약사·개설약사 여부 **단일 승인 안에서** 확인 |
| R5 | 승인 즉시: 회원 활성화 + store_owner capability + 약국 HUB/내 약국 사용 가능 |
| R6 | 2단계 승인(가입→로그인→직역입력→재승인) **제거** |

### 7.2 현재 코드 충족도

| # | 충족 | 부족 / Gap |
|---|---|---|
| R1 | ✅ 충족 | — |
| R2 | ❌ 미충족 | 가입 모달에 직역/근무처 UI 부재 (DB 컬럼·DTO 일부는 준비) |
| R3 | ❌ 미충족 | 사업자정보 UI 부재 (DTO에 일부 있음, 사업자등록증 파일 업로드 인프라 부재) |
| R4 | ⚠️ 부분 충족 | 운영자 API/UI 는 activity_type/pharmacy_name 노출 가능, 단 현재 가입 시 미입력 |
| R5 | ❌ 미충족 | 회원 승인 시 organization 생성·`kpa:store_owner` 부여 흐름 없음 |
| R6 | ❌ 미충족 | ActivitySetupPage 강제 onboarding + pharmacy_request 2차 승인 모두 active |

### 7.3 복원 가능성 정확 답변

> Q: "가입 단계에서 직역+사업자 정보 입력" 으로 쉽게 복원 가능한가?

**A: 가능하다. 인프라(DB 컬럼·DTO 필드·enum·운영자 UI 응답)는 모두 이미 존재한다. 필요한 작업은 (a) 가입 모달 폼 확장, (b) `createKpaRecords` 에 INSERT 로직 추가, (c) ActivitySetupPage 강제 redirect 비활성화 또는 제거, (d) 회원 승인 시점에 organization 자동 생성 + role_assignment 부여 통합. 사업자등록증 파일 업로드만 신규 인프라(S3 또는 동등 + 파일 업로드 endpoint + 저장 컬럼) 필요.**

> Q: 현재 store_owner 자동 활성화 정책과 충돌하는가?

**A: 충돌 없음.** store_owner SSOT는 `role_assignments.role='kpa:store_owner'` 단일 조건이고, 이미 pharmacy-request 승인 시점에서 부여 패턴이 검증되어 있다. 회원 승인 시점으로 이 호출을 이동/복제하면 된다.

> Q: 추가 승인 단계 제거가 가능한가?

**A: 가능하다.** pharmacy_request 엔티티 자체를 제거할 필요 없고, "가입 모달이 사업자정보까지 받음 → 회원 승인 시 자동으로 ensureOrganization + role_assignment(kpa:store_owner)" 흐름으로 전환하면 pharmacy-request 신청 단계가 자연스럽게 우회된다. 단 backward compat 정책 결정 필요 (기존 pharmacy-request 흐름을 admin override 경로로 보존할지).

> Q: 어떤 부분이 이미 존재하고, 어떤 부분만 복원/재연결하면 되나?

| 영역 | 이미 존재 | 신규/연결 필요 |
|---|---|---|
| DB | kpa_members(pharmacy_name, pharmacy_address, activity_type), kpa_pharmacist_profiles, organizations(business_number), role_assignments, organization_members | 사업자등록증 file 컬럼(또는 별도 file_uploads 테이블) |
| DTO | businessName, businessNumber, representativeName, zipCode, address1/2 | activityType, pharmacyName(KPA), pharmacyAddress, businessRegistration(file/URL) |
| Backend | organizationOpsService.ensureOrganization, addMember, roleAssignmentService.assignRole | createKpaRecords 에 위 흐름 통합 + 회원 승인(`PATCH /:id/status`)에 동일 호출 |
| Frontend | ActivitySetupPage 폼 구조(직역+사업장정보 UI 컴포넌트 존재) | RegisterModal 폼 확장 (직역 select + 근무처 + 사업자정보 + 파일 업로드), ActivitySetupPage 강제 redirect 제거 |
| 운영자 UI | GET /kpa/members 응답이 이미 noted 필드 모두 포함 | 회원 승인 화면에 약사여부/개설약사여부 노출 패널 추가 |

---

## 8. 위험 요소

| # | 위험 | 완화 방안 |
|---|---|---|
| W1 | 기존 회원 데이터의 activity_type=NULL 다수 | "가입 시 입력 강제는 신규 회원에만. 기존 회원은 ActivitySetupPage 유지하거나 일괄 inactive 마이그레이션" 정책 결정 |
| W2 | 산업약사 6:1 표현 갭 | UI는 6종, backend는 11종 유지하고 매핑 dict 도입; 또는 enum 축소(legacy migration 필요) |
| W3 | 사업자등록증 파일 업로드 인프라 부재 | 별도 file upload 인프라 도입 필요 (S3-compatible storage + 파일 검증/scan/유효기간 정책) |
| W4 | 셀프 승인(자가 store_owner) 차단 | pharmacy-request에는 이미 차단 로직 존재; 회원 승인 흐름으로 이동 시에도 동일 가드 반드시 복제 |
| W5 | pharmacy_request 별도 흐름 backward compat | 가입 단계로 통합한 후에도 운영자가 신규 약국 추가/이전 시점에 사용할 수 있어야 — pharmacy_request endpoint 보존 + admin manual grant 경로 유지 |
| W6 | role_assignment 자동 부여 후 운영자가 거절했을 때 revoke 흐름 | 회원 승인 거절(rejected) 시 role_assignments.is_active=false 처리 필요 |
| W7 | "회원 승인 화면" 단일 인터페이스 안에서 약사 여부·개설약사 여부 확인 UX 정의 | 운영자 UI WO 별도 필요 (현 IR 범위 밖) |
| W8 | ActivitySetupPage 강제 redirect 제거 시 기존 active+activityType=NULL 사용자 정합성 | maintenance migration: 기존 사용자 activity_type=NULL → 운영자 alert / manual fill / inactive default |

---

## 9. 추천 구현 방향 (단계별 WO 분할)

### Stage 1 — DTO·Frontend 확장 (low risk)
- WO 후보: `WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-FIELDS-V1`
- RegisterModal에 약사 케이스 한정: 직역 select(6종 abstraction) + 근무처(name/address/phone) form 추가
- DTO에 `activityType`, `pharmacyName`, `pharmacyAddress` 필드 추가
- `createKpaRecords` 가 receive 시 `kpa_members.activity_type/pharmacy_name/pharmacy_address` INSERT (이미 컬럼 존재)
- ActivitySetupPage 는 일단 유지 (기존 회원 대응)

### Stage 2 — 개설약사 가입 경로 (medium risk)
- WO 후보: `WO-O4O-KPA-REGISTER-MODAL-PHARMACY-OWNER-FIELDS-V1`
- 직역='개설약사' 선택 시 추가 form (사업자번호, 약국명, 사업장 주소) 노출
- DTO에 `businessNumber` 등 KPA-가입용으로 routing
- `createKpaRecords` 가 개설약사인 경우 `users.businessInfo` merge

### Stage 3 — 사업자등록증 업로드 (high risk, 신규 인프라)
- WO 후보: `WO-O4O-KPA-BUSINESS-REGISTRATION-FILE-UPLOAD-V1`
- 파일 업로드 인프라(S3-compatible + size/format/scan 검증)
- 가입 모달에 파일 attach UI
- 운영자 승인 화면에서 파일 미리보기

### Stage 4 — 회원 승인 + store_owner 자동 활성화 (high risk)
- WO 후보: `WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-V1`
- `PATCH /kpa/members/:id/status` (pending→active) 시 개설약사인 경우 자동:
  - `organizationOpsService.ensureOrganization()` 호출
  - `organization_members.role='owner'` INSERT
  - `roleAssignmentService.assignRole('kpa:store_owner')` 호출
- (반려 시 revoke 흐름 포함)

### Stage 5 — ActivitySetupPage 강제 redirect 제거 (low risk)
- WO 후보: `WO-O4O-KPA-AUTHGATE-FORCE-ONBOARDING-REMOVAL-V1`
- AuthGate에서 `activityType=NULL` redirect 로직 제거
- ActivitySetupPage는 `/mypage/profile/activity-setup` 같은 선택 페이지로 보존 (또는 완전 제거)
- 기존 active+NULL 사용자에 대한 데이터 마이그레이션 정책 별도 결정

### Stage 6 — pharmacy_request 흐름 정리 (decision needed)
- WO 후보: `WO-O4O-KPA-PHARMACY-REQUEST-LEGACY-DECISION-V1`
- 가입 단계 통합 후 pharmacy_request 흐름을 보존(약국 변경 신청용) vs 완전 제거 정책 결정
- 보존 시: 별도 endpoint 유지, UI 라벨링 변경 ("약국 정보 변경 신청" 등)
- 제거 시: PharmacyApprovalGatePage / pharmacy-request.controller / kpa_pharmacy_requests 테이블 정리 마이그레이션

---

## 10. 미수행 검증 (사용자 승인 후 추가 가능)

- 운영 DB에서 `kpa_members WHERE activity_type IS NULL AND status='active'` row 개수 (Stage 5 마이그레이션 정책 결정용)
- `kpa_pharmacy_requests` row 분포(pending/approved/rejected) 및 시점 분석 (Stage 6 결정용)
- `organizations WHERE type='pharmacy'` 개수 + 평균 멤버 수 (canonical 이동 시 데이터 정합 영향)

---

## 11. 참조

- 선행: [IR-O4O-KPA-REGISTER-ROUTE-AND-TYPE-AUDIT-V1.md](IR-O4O-KPA-REGISTER-ROUTE-AND-TYPE-AUDIT-V1.md)
- WO: `WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1` (`2e5f6c914`)
- 관련 IR: `IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1`, `IR-O4O-MULTIROLE-STOREOWNER-OPERATOR-FLOW-AUDIT-V1`
- Freeze 정책: `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11), `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)
- 주요 코드 진입점:
  - [RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx)
  - [AuthGate.tsx](services/web-kpa-society/src/components/auth/AuthGate.tsx)
  - [ActivitySetupPage.tsx](services/web-kpa-society/src/pages/ActivitySetupPage.tsx)
  - [auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts)
  - [auth-account.controller.ts](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts)
  - [member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts)
  - [pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts)
  - [store-owner.utils.ts](apps/api-server/src/utils/store-owner.utils.ts)

---

*조사 전용 — 코드/DB 수정 없음. 후속 작업은 §9 단계별 WO로 분리.*
