# IR-O4O-KPA-REGISTER-ROUTE-AND-TYPE-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**: KPA-Society 회원가입 라우트·가입 유형·권한 연결 구조
**근거 컨텍스트**:
- canonical 정책: "약사 / 약대생만 회원가입 가능"
- 현 코드: 4유형(pharmacist / student / external_expert / supplier_staff) 모두 LIVE
- 상위 freeze: F9 RBAC SSOT, F11 User/Operator (role_assignments 단일 소스)

---

## 0. 결론 요약

| 항목 | 현재 상태 | canonical 부합 여부 |
|---|---|---|
| `/register` route 존재 | 존재하나 redirect-only (`/mypage` + RegisterModal open) | ▲ route 자체는 있으나 page 없음 |
| `/login` route 존재 | 존재하나 redirect-only (`/` + LoginModal open) | ▲ 동상 |
| `/mypage` 비로그인 가드 | 없음 (페이지 셸 렌더, 데이터 로드만 실패) | ✗ 비로그인 접근 가능 |
| 회원가입 진입 방식 | **modal-only** (페이지 폼 없음) | OK |
| 회원가입 유형 enum | 4유형 LIVE (pharmacist_member / pharmacy_student_member / external_expert / supplier_staff) | ✗ canonical=2유형 |
| external_expert 백엔드 처리 | LIVE (DTO·apply·status patch·profile insert·migration) | ✗ |
| supplier_staff 백엔드 처리 | LIVE (DTO·apply·status patch·profile insert·migration) | ✗ |
| admin-dashboard 측 두 유형 분기 UI | **없음** (membership_type 분기 0건) | — |
| 회원가입 유형 → role_assignments 자동 부여 | **없음** (가입 승인은 users.status + 프로필 insert만) | ✓ 이미 분리됨 |
| 강사(instructor) 자격 부여 | role_assignments(`lms:instructor`)로 분리 운영 중 | ✓ canonical 정렬 완료 |

**핵심 판단**: external_expert / supplier_staff는 "회원가입 유형"으로만 존재하고, **권한/역할 결정에는 관여하지 않는다**. 따라서 canonical 정리(가입 유형 2종 축소)는 **권한 구조에 영향 없음**. 다만 가입 폼·DB·legacy 회원 데이터·신청 endpoint(`/kpa/members/apply`) 5개 분기 모두 정리 대상.

---

## 1. 라우트/URL 구조 조사

### 1.1 라우트 테이블 (실측)

| Path | 정의 위치 | 컴포넌트 | Auth Guard | 동작 |
|---|---|---|---|---|
| `/register` | [App.tsx:618](services/web-kpa-society/src/App.tsx#L618) | `RegisterRedirect` | 없음 | `navigate('/mypage', {replace:true})` + `openRegisterModal()` |
| `/login` | [App.tsx:617](services/web-kpa-society/src/App.tsx#L617) | `LoginRedirect` | 없음 | `navigate('/')` + `openLoginModal()` |
| `/mypage` | [App.tsx:776](services/web-kpa-society/src/App.tsx#L776) | `MyDashboardPage` (Layout 포함) | **없음** | 비로그인이어도 셸 렌더 |
| `/join/pharmacy` | [App.tsx:576](services/web-kpa-society/src/App.tsx#L576) | `PharmacyJoinPage` | 없음 | 약국 가입 페이지 (별도) |

**RegisterRedirect 정의** ([App.tsx:380-391](services/web-kpa-society/src/App.tsx#L380-L391)):
```ts
function RegisterRedirect() {
  const navigate = useNavigate();
  const { openRegisterModal } = useAuthModal();
  useEffect(() => {
    navigate('/mypage', { replace: true });
    openRegisterModal();
  }, [navigate, openRegisterModal]);
  return null;
}
```

> 주석에 **`WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1`** 표기 — 과거 register page → modal 전환 이력. 따라서 page 형태는 의도적으로 제거됨.

### 1.2 RegisterModal 진입점

| Trigger | 위치 |
|---|---|
| `/register` URL 직접 접근 | [App.tsx:380-391](services/web-kpa-society/src/App.tsx#L380-L391) |
| Global 헤더 "회원가입" 버튼 | [KpaGlobalHeader.tsx:114](services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L114) → `onRegister={openRegisterModal}` |
| LoginModal 내 "회원가입" 링크 | [LoginModal.tsx:165](services/web-kpa-society/src/components/LoginModal.tsx#L165) → `openRegisterModal()` |

**모달 상태 관리**: `AuthModalContext` ([AuthModalContext.tsx:48-50](services/web-kpa-society/src/contexts/AuthModalContext.tsx#L48-L50)) — `activeModal === 'register'`일 때 렌더.
**전역 마운트**: [App.tsx:491](services/web-kpa-society/src/App.tsx#L491).

### 1.3 `/mypage` 가드 동작

- 라우트 수준 가드 **없음** ([App.tsx:776](services/web-kpa-society/src/App.tsx#L776)). `Layout` 은 단순 셸.
- `MyDashboardPage` 내부에서 `useAuth()`로 user 확인 ([MyDashboardPage.tsx:58](services/web-kpa-society/src/pages/mypage/MyDashboardPage.tsx#L58)) — user 없을 시 데이터 로드만 실패, 페이지 자체는 렌더.
- 사용자가 "/mypage에서 회원가입 모달이 열린다"고 본 이유: `/register` 입력 → `/mypage`로 replace된 직후 `openRegisterModal()` 실행 → URL은 `/mypage`인데 모달이 떠 있는 상태.

### 1.4 판정

- canonical `/register` route **= 존재 (redirect-only)**, page 컴포넌트 **= 없음**
- canonical `/login` route **= 존재 (redirect-only)**, page 컴포넌트 **= 없음**
- **modal 기반 / route 기반**: **완전 modal 기반**
- `/mypage` 비로그인 접근 가능 — 이 자체가 canonical 정책 부합 여부 별도 검토 필요

---

## 2. 회원가입 유형 구조 조사

### 2.1 유형 enum / constant 정의

**Frontend** ([RegisterModal.tsx:19](services/web-kpa-society/src/components/RegisterModal.tsx#L19)):
```ts
type MemberType = 'pharmacist_member' | 'pharmacy_student_member' | 'external_expert' | 'supplier_staff';
```

**Backend DTO** ([register.dto.ts:61-62](apps/api-server/src/modules/auth/dto/register.dto.ts#L61-L62)):
```ts
@IsIn(['pharmacist', 'student', 'pharmacist_member', 'pharmacy_student_member', 'external_expert', 'supplier_staff'])
membershipType?: ...;
```
(legacy 'pharmacist'/'student' alias 병존)

**Backend Entity** ([kpa-member.entity.ts:22-28](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L22-L28)): 동일 6값 union 정의.

**Bootstrap seed** ([20260927100000-BootstrapCanonicalSeedAccounts.ts:69](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts#L69)): seed account의 `kpaProfile.membershipType` 타입에 4값 모두 선언.

### 2.2 유형별 form field 매트릭스

| 유형 | Required | Optional | 위치 |
|---|---|---|---|
| **pharmacist_member** | email/password/이름/연락처/`licenseNumber`/약관 | — | [RegisterModal.tsx:452-468](services/web-kpa-society/src/components/RegisterModal.tsx#L452-L468) |
| **pharmacy_student_member** | 공통 + `universityName` | `studentYear` | [RegisterModal.tsx:471-491](services/web-kpa-society/src/components/RegisterModal.tsx#L471-L491) |
| **external_expert** | 공통 + `expertDomain`(=subRole) | `institutionName/Type`, `qualification(Type)`, `department` | [RegisterModal.tsx:494-526](services/web-kpa-society/src/components/RegisterModal.tsx#L494-L526) |
| **supplier_staff** | 공통 + `companyName`, `companyType` | `jobTitle`, `department` | [RegisterModal.tsx:529-558](services/web-kpa-society/src/components/RegisterModal.tsx#L529-L558) |

UI 선택 그리드는 `MEMBER_GROUP_INFO`를 순회해 4유형 모두 노출 ([RegisterModal.tsx:70-95](services/web-kpa-society/src/components/RegisterModal.tsx#L70-L95)). **숨김/feature flag/주석 없음**.

### 2.3 submit 흐름

- Endpoint: **`POST /api/v1/auth/register`** ([auth-register.controller.ts:23](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L23))
- 공통 payload: email, password, lastName, firstName, nickname, phone, service='kpa-society', role, membershipType, tos, privacyAccepted
- 유형별 추가 payload: 위 form field 매핑 그대로 전송 (RegisterModal `handleSubmit` [L209-240](services/web-kpa-society/src/components/RegisterModal.tsx#L209-L240))
- 백엔드 처리: `User` 생성 → `ServiceMembership(status=pending)` 생성 → `createKpaRecords()` 호출 (전체 트랜잭션)

### 2.4 백엔드 분기 처리 — `createKpaRecords` ([auth-register.controller.ts:351-455](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L351-L455))

```ts
const isPharmacist = memberType === 'pharmacist' || memberType === 'pharmacist_member';
const isStudent = memberType === 'student' || memberType === 'pharmacy_student_member';
const isExternalExpert = memberType === 'external_expert';
const isSupplierStaff = memberType === 'supplier_staff';
```

| 유형 | INSERT 대상 테이블 | 분기 라인 |
|---|---|---|
| pharmacist(_member) | `kpa_members` + `kpa_pharmacist_profiles` | [L408-422](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L408-L422) |
| (pharmacy_)student(_member) | `kpa_members` (프로필 insert는 승인 시 별도) | — |
| external_expert | `kpa_members` + `kpa_external_expert_profiles` | [L425-439](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L425-L439) |
| supplier_staff | `kpa_members` + `kpa_supplier_staff_profiles` | [L442-454](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L442-L454) |

모든 유형 공통: `kpa_member_services(service_key='kpa-a', status='pending')` insert.

### 2.5 별도 경로: `POST /kpa/members/apply`

추가로, 로그인 사용자의 KPA 가입 신청 endpoint가 **별도로 존재** ([member.controller.ts:91](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L91)). DTO·entity와 동일 4유형 분기 보유. external_expert/supplier_staff 모두 처리됨 ([L204-244](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L204-L244)).

### 2.6 승인 처리: `PATCH /kpa/members/:id/status` ([member.controller.ts:438-531](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L438-L531))

승인(pending→active) 시:
1. `users.status='active', isActive=true, approvedAt=NOW()` 업데이트
2. **`role_assignments` INSERT 없음** (주석: `kpa:pharmacist / kpa:student role 할당 제거 — profile 기반 전환`)
3. 유형별 profile 테이블 safety-net INSERT (ON CONFLICT DO NOTHING):
   - pharmacist → `kpa_pharmacist_profiles`
   - student → `kpa_student_profiles`
   - external_expert → `kpa_external_expert_profiles`
   - supplier_staff → `kpa_supplier_staff_profiles`

→ **가입 유형은 role과 분리되어 있음**. 권한은 별도 부여(role_assignments 직접 grant 또는 자격 신청 흐름)에 의함.

---

## 3. 외부전문가 / 제약업체 직원 제거 영향도

### 3.1 실제 가입 가능 여부

| 항목 | 상태 |
|---|---|
| 프론트 UI 노출 | ✅ 4개 카드 모두 선택 가능 |
| backend 가입 처리 | ✅ DTO·createKpaRecords·apply·status patch 모두 분기 처리 |
| 승인 가능 여부 | ✅ PATCH /:id/status에서 동일 흐름 |
| 마이그레이션 적용 | ✅ [1771200000024-CreateKpaExternalExpertProfiles.ts](apps/api-server/src/database/migrations/1771200000024-CreateKpaExternalExpertProfiles.ts), [1771200000025-CreateKpaSupplierStaffProfiles.ts](apps/api-server/src/database/migrations/1771200000025-CreateKpaSupplierStaffProfiles.ts) |
| WO 추적 | `WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1` (최근 활성 WO) |

### 3.2 admin/operator UI 연결

- admin-dashboard 코드에서 `external_expert` / `supplier_staff` 키워드 **0건** 검색 결과.
- admin-dashboard에서 `membership_type` / `membershipType` 키워드 **0건**.
- → **별도 분기 UI 없음**. 운영자 화면은 회원 목록·승인/반려를 type-agnostic으로 처리.
- 실제 영향: 회원 리스트에 `membership_type` 컬럼이 노출될 수 있으나(백엔드 응답에 포함), UI에서 라벨링/필터링 미구현.

### 3.3 기존 데이터 존재 여부

- 본 IR은 read-only 검증 범위 — 운영 DB row 개수 미확인.
- Bootstrap seed 계정 중 external_expert/supplier_staff 유형 **없음** ([20260927100000-BootstrapCanonicalSeedAccounts.ts:106-119](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts#L106-L119)) — pharmacist 1건만 seed됨.
- 실제 사용자 가입 데이터는 별도 `SELECT COUNT(*) FROM kpa_members WHERE membership_type IN ('external_expert','supplier_staff')` 검증 필요 (CLAUDE.md §0에 따라 사용자 승인 후 `gcloud sql connect`로 실행 가능).

### 3.4 legacy / dead 코드 여부

- 주석 처리·`@deprecated`·feature flag **없음**.
- WO `WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1` 가 4유형 모두 구현한 **신규 코드**.
- 따라서 dead code가 아닌 **최근 추가된 LIVE 기능**. canonical 정책 변경으로 인한 **제거 대상**으로 재분류해야 함.

### 3.5 제거 시 영향 범위

| Layer | 파일 | 변경 종류 |
|---|---|---|
| Frontend | [RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx) | MemberType union 축소, `MEMBER_GROUP_INFO` 2개 항목 제거, 분기 UI 2블록 제거, formData 외부전문가/업체 필드 제거, validation 분기 단순화 |
| Backend DTO | [register.dto.ts:61](apps/api-server/src/modules/auth/dto/register.dto.ts#L61) | `@IsIn` 배열에서 2값 제거, type union 축소 |
| Backend Controller | [auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) | `createKpaRecords` 의 `isExternalExpert`/`isSupplierStaff` 분기 + 2개 INSERT 블록 제거 |
| Backend Apply | [member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts) | `/apply` validation IsIn 축소, 분기 2블록 제거, status patch 분기 2블록 제거 |
| Entity | [kpa-member.entity.ts:22-28](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts#L22-L28) | union 축소 |
| Bootstrap seed | [20260927100000-BootstrapCanonicalSeedAccounts.ts:69](apps/api-server/src/database/migrations/20260927100000-BootstrapCanonicalSeedAccounts.ts#L69) | 타입 축소 |
| DB 테이블 | `kpa_external_expert_profiles`, `kpa_supplier_staff_profiles` | (선택) drop 또는 보존. 보존 시 신규 INSERT 차단만으로 충분 |
| 기존 회원 데이터 | `kpa_members.membership_type IN ('external_expert','supplier_staff')` | 마이그레이션 정책 결정 필요 (변환/표시 처리/삭제 중 택1) |

---

## 4. 강사/외부 역할 부여 구조

### 4.1 instructor 자격 부여 (이미 canonical)

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| `InstructorService.applyQualification` | [instructor.service.ts](apps/api-server/src/routes/kpa/services/instructor.service.ts) | 활성 회원이 강사 자격 신청 → `kpa_approval_requests(entity_type='instructor_qualification', status='pending')` INSERT |
| `InstructorService.approveQualification` | [instructor.service.ts:233-295](apps/api-server/src/routes/kpa/services/instructor.service.ts#L233-L295) | 트랜잭션 내: 신청 status='approved' 업데이트 + `roleAssignmentService.assignRole({role:'lms:instructor'})` |
| `roleAssignmentService.assignRole` | [role-assignment.service.ts](apps/api-server/src/modules/auth/services/role-assignment.service.ts) | role_assignments 단일점 INSERT/UPDATE (F9 SSOT) |

**핵심**: 강사 권한은 **회원가입 유형과 무관**. 4유형 중 누구든(약사/약대생/외부전문가/업체직원) 활성 회원이면 강사 신청 가능 → 승인 시 `lms:instructor` role_assignment 부여.

### 4.2 회원가입 유형 vs role assignment 매트릭스

| 가입 유형 | 자동 부여 role | 자동 부여 service_membership.role | 별도 신청 가능 role |
|---|---|---|---|
| pharmacist(_member) | 없음 (registration 시 role_assignments INSERT 없음) | `customer/user/pharmacy` (frontend role 필드 기반) | `lms:instructor` 등 |
| (pharmacy_)student(_member) | 없음 | `customer/user` | `lms:instructor` 등 |
| external_expert | 없음 | `customer/user` | `lms:instructor` 등 |
| supplier_staff | 없음 | `customer/user` | `lms:instructor` 등 |

→ **회원가입 유형은 권한 결정 요소가 아님**. 권한은 (1) `service_memberships.role` (2) `role_assignments` (3) 자격 신청(`kpa_approval_requests`) 의 합으로 결정.

### 4.3 canonical 분리 가능성

✅ **이미 분리되어 있음**:
- 가입 유형 = 신원/프로필 분류 (약사면허/대학명/소속 등 식별 정보 저장 목적)
- 권한 = role_assignments SSOT (F9 freeze 준수)
- 강사·운영자·외부전문가 권한 = 별도 신청/grant 흐름

→ canonical 정책으로 가입 유형 2종 축소해도 **권한 모델·자격 신청 흐름은 영향 없음**.
다만 "외부전문가/업체직원이 회원이 되는 경로"가 사라지므로, **외부전문가/업체직원에게 강사 자격을 부여하는 흐름**을 어떻게 대체할지(별도 가입 후 신청 / 운영자가 manual grant / 별도 서비스 등) 별도 정책 결정 필요.

---

## 5. Canonical 방향 검토

### 5.1 사용자 제시 방향에 대한 평가

| 제안 | 평가 |
|---|---|
| `/register` canonical route 사용 | ✅ 이미 route는 존재. page 컴포넌트로 승격할지(redirect 유지 vs page 신설) 정책 결정 필요. modal-only 정책을 유지한다면 현 redirect 그대로 OK. |
| `/mypage`는 로그인 사용자 전용 | ❌ 현재 가드 없음. 라우트 가드 추가 필요. (별 WO 추천: `WO-KPA-MYPAGE-AUTH-GUARD-V1`) |
| 회원가입 유형 = 약사 정회원 / 약대생 준회원만 유지 | ✅ 권한 모델 충돌 없음. 6 layer 코드 정리 필요 (위 §3.5). |
| 강사/운영자/외부 역할 = role assignment 기반만 운영 | ✅ 이미 정렬됨 (F9 SSOT, instructor.service). 신규 정책 변경 불요. |

### 5.2 정리 단계 (권장)

**즉시 정리 가능 (low risk)**
- 신규 가입 시 external_expert/supplier_staff 선택 차단 (frontend `MEMBER_GROUP_INFO`에서 2개 항목 제거 또는 feature flag로 숨김)
- 효과: 신규 데이터 유입 즉시 차단, 기존 회원·DB·승인 흐름은 그대로 유지

**단계적 정리 (정책 결정 후)**
1. 기존 external_expert / supplier_staff 회원 데이터 마이그레이션 정책 결정
   - (a) pharmacist_member 또는 별도 신원 분류로 전환
   - (b) 비활성화(`identity_status='withdrawn'`)
   - (c) 별도 운영자 부여 role로 재분류
2. DTO·entity·controller·apply·status-patch에서 2유형 분기 코드 제거
3. profile 테이블(`kpa_external_expert_profiles`, `kpa_supplier_staff_profiles`) 보존 또는 archive
4. bootstrap seed 타입 축소
5. `/mypage` route guard 추가 (canonical "로그인 사용자 전용" 정책 적용 시)

**별도 결정 필요**
- 약사·약대생이 아닌 사람이 강사 자격을 받는 경로 (운영자 manual grant only? 별도 서비스 가입? 외부 LMS instructor 신청 폼?)
- `/register` page 컴포넌트 신설 여부 (현 modal-only 정책 유지면 불필요)

### 5.3 권장 canonical 구조

```
[가입 진입]
  /register (modal trigger, 현 redirect 패턴 유지) ── 또는 ── /mypage 헤더 "회원가입" 버튼
                                ↓
                  RegisterModal (2유형만 노출)
                  ├── pharmacist_member
                  └── pharmacy_student_member
                                ↓
                  POST /api/v1/auth/register
                                ↓
                  User + ServiceMembership(pending) + kpa_members(pending) + 유형별 profile
                                ↓
                  운영자 승인 (PATCH /kpa/members/:id/status)
                                ↓
                  users.active + 유형별 profile safety-net insert
                                ↓
                  (필요 시) 강사·운영자 등 추가 role은 별도 신청/grant
                  ── instructor: InstructorService.approveQualification → role_assignments(lms:instructor)
                  ── operator/admin: bootstrap seed 또는 운영자 manual grant via role_assignments
```

---

## 6. 검증 미수행 항목 (read-only 범위 밖 / 추후 사용자 승인 필요)

- 운영 DB에서 `kpa_members.membership_type IN ('external_expert','supplier_staff')` row 개수 (CLAUDE.md §0: SELECT는 Claude Code 직접 가능, 사용자 승인 절차에 따라 별도 실행)
- `kpa_external_expert_profiles`, `kpa_supplier_staff_profiles` 실제 row 개수
- 운영 환경에서 두 유형으로 가입한 사용자가 실제 사용 중인지 (로그 조회 가능)

---

## 7. 산출물 요약

| 항목 | 결과 |
|---|---|
| **실제 사용 중인 구조** | 4유형 회원가입 LIVE, modal-only 진입, `/register` redirect-only, `/mypage` 가드 없음 |
| **dead code 여부** | 없음 — external_expert/supplier_staff는 최근 추가된 LIVE 기능 (`WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1`) |
| **제거 가능 여부** | ✅ 권한 모델 충돌 없음. 코드 6 layer + DB 마이그레이션 정책 결정 필요 |
| **영향 범위** | Frontend RegisterModal, Backend register.dto·auth-register·member.controller·kpa-member.entity·bootstrap seed, DB 2 profile 테이블 + kpa_members.row |
| **즉시 정리 가능 항목** | 신규 가입 시 2유형 선택 차단 (frontend `MEMBER_GROUP_INFO` 축소) |
| **단계적 정리 필요 항목** | 기존 데이터 마이그레이션, backend 분기 코드 제거, profile 테이블 처분, `/mypage` 가드 |
| **권장 canonical 구조** | §5.3 참조 |

---

## 8. 참조 문서

- `docs/architecture/USER-OPERATOR-FREEZE-V1.md` (F11)
- `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` (F9)
- `docs/rbac/RBAC-ROLE-CATALOG-V1.md`
- `docs/baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md`
- `docs/baseline/ROLE-POLICY-AND-GUARD-V1.md`
- `docs/investigations/IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1.md` (선행 IR)
- `docs/audit/IR-O4O-KPA-MEMBER-MANAGEMENT-TO-GLYCOPHARM-ADAPTATION-AUDIT-V1.md`
- WO 추적: `WO-O4O-REGISTRATION-STRUCTURE-REFACTOR-V1` (4유형 도입 WO)
- WO 추적: `WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1` (modal 전환 WO)
- WO 추적: `WO-KPA-SOCIETY-DASHBOARD-TO-MYPAGE-CONSOLIDATION-V1`

---

*조사 전용 — 코드/DB 수정 없음. 후속 작업은 정책 결정 후 별도 WO로 분리.*
