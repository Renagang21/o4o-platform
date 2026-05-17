---
id: IR-O4O-KPA-MEMBER-ROLE-TYPE-CANONICAL-AUDIT-V1
title: "KPA 회원관리 — 유형 / 활동 유형 / 권한 / 매장 권한 / 닉네임 canonical source 감사"
status: investigation-complete
date: 2026-05-17
type: investigation
scope:
  - /operator/members 목록·상세·수정 화면 각 표시 컬럼의 source-of-truth 추적
  - 권한 컬럼에 “일반회원/약사/관리자/운영자/super_admin” 가 혼입되는 경로 확인
  - 닉네임이 mypage 에는 있지만 operator 회원관리에는 누락된 이유
  - pharmacy_owner ↔ store_owner ↔ /store hub 접근 판정 chain
  - 목록(GET /kpa/members) ↔ 상세 Drawer ↔ 수정 PATCH /kpa/members/:id/info 간 source 일치성
related:
  - IR-O4O-KPA-MYPROFILE-NICKNAME-SAVE-READ-AUDIT-V1
  - IR-O4O-KPA-MYPROFILE-ROLE-INFO-VIEW-EDIT-SOURCE-AUDIT-V1
  - IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1
  - IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1
  - IR-O4O-KPA-STOREOWNER-HEADER-MENU-VISIBILITY-AUDIT-V1
canonical-references:
  - docs/architecture/USER-OPERATOR-FREEZE-V1.md (F11)
  - docs/baseline/USER-DOMAIN-SSOT-V1.md
  - docs/baseline/ROLE-POLICY-AND-GUARD-V1.md
  - docs/rbac/RBAC-CANONICAL-STATE-V1.md
  - docs/rbac/RBAC-ROLE-CATALOG-V1.md
  - docs/baseline/KPA-ROLE-MATRIX-V1.md
---

# IR-O4O-KPA-MEMBER-ROLE-TYPE-CANONICAL-AUDIT-V1

> Read-only 조사. 코드 수정 / DB 변경 없음. CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료) 준수.

---

## 0. Executive Summary

KPA-Society 회원관리(`/operator/members`)의 표시 컬럼 5종 (`유형 / 활동 유형 / 권한 / 매장 권한 / 닉네임`) 의 source 를 전수 추적한 결과, 본 화면 자체에는 **role merge / fallback 로직이 더 이상 존재하지 않는다**. 단, 백엔드 API 응답 ↔ 캐노니컬 freeze 문서 ↔ 인접 화면(`mypage`, `KpaGlobalHeader`) 사이에 다음 4 가지 drift 가 확인된다.

| # | 사실 | 영향 |
|---|------|------|
| **F1** | **목록 API 의 `유형` (`m.membership_type`) 은 `kpa_members` 단독 source** — service_memberships 에는 회원이 있어도 kpa_members 가 비어 있으면 '미분류' 표시 | 가입 직후·backfill 미적용 회원이 “미분류” 로 표시 |
| **F2** | **`활동 유형` (`m.activity_type`) 은 `COALESCE(kpa_pharmacist_profiles.activity_type, kpa_members.activity_type)` — SSOT/legacy mirror 의 2-step COALESCE** | 두 값이 다르면 SSOT(pp) 가 우선. 그러나 mypage 의 `setActivityType` 은 `kpa_pharmacist_profiles + kpa_members` 양쪽에 mirror write 하므로 정상상태에서는 동일. drift 가능성은 backfill 또는 legacy 데이터 한정 |
| **F3** | **`권한` (`capabilities`) 는 `role_assignments` 단독 source** — frontend 는 fallback / merge 없이 chip 형태로 그대로 표시. ‘일반 회원’ 은 capabilities 가 빈 배열일 때의 화면 텍스트일 뿐, 실제 role 이 아님 | 권한 컬럼에 보이는 ‘약사 / 관리자 / 운영자 / 매장 운영 / 플랫폼 관리자’ 는 모두 `role_assignments` 의 활성 role chip. 단, `kpa:pharmacist` 는 마이그레이션 `20260326300000-DeactivateQualificationRoles` 로 **soft-deactivate 되었기 때문에 신규 발생은 정책상 없음**. 그러나 historical row 가 다시 `is_active=true` 로 활성화되면 표시됨 |
| **F4** | **`닉네임` 은 회원관리 API 응답에 존재하지 않음** — `GET /kpa/members` SELECT 절에 `u.nickname` 컬럼이 빠져 있고, drawer / table / edit form 어느 곳에도 nickname 항목이 없음. mypage 의 nickname write/read 와 완전 분리된 단방향 누락 | 운영자가 회원 nickname 을 인지하지 못함. 별건이지만, `IR-O4O-KPA-MYPROFILE-NICKNAME-SAVE-READ-AUDIT-V1` 의 controller PUT 누락과 함께 ‘nickname 도메인 SSOT 책임자 부재’ 패턴을 형성 |

> **본 IR 의 결론은 “canonical source 후보 정리 + drift 지점 표시 + 후속 WO 분리 권장” 까지다. 코드 수정은 다음 WO 에서 분리 진행.**

---

## 1. 조사 방법

- 작업 디렉토리: `c:\Users\sohae\o4o-platform`
- 기준 브랜치: `main` (현재 working tree)
- Read-only 대상
  - Frontend
    - [services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) (1703 lines, 목록/Drawer/Edit)
    - [services/web-kpa-society/src/contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx) (User 인터페이스 + `ACTIVITY_TYPE_LABELS` + fetchKpaContext)
    - [services/web-kpa-society/src/lib/role-constants.ts](services/web-kpa-society/src/lib/role-constants.ts) (ROLES SSOT)
    - [services/web-kpa-society/src/components/auth/PharmacyGuard.tsx](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx) (store_owner gate)
    - [services/web-kpa-society/src/components/KpaGlobalHeader.tsx](services/web-kpa-society/src/components/KpaGlobalHeader.tsx) (header visibility)
    - [services/web-kpa-society/src/config/dashboard.ts](services/web-kpa-society/src/config/dashboard.ts) (post-login route)
  - Backend
    - [apps/api-server/src/routes/kpa/controllers/member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts) (1390 lines, GET / PATCH /:id/status / PATCH /:id/info / PATCH /:id/role)
    - [apps/api-server/src/routes/kpa/controllers/me-context.controller.ts](apps/api-server/src/routes/kpa/controllers/me-context.controller.ts) (single-SQL me-context)
    - [apps/api-server/src/routes/kpa/services/mypage.service.ts](apps/api-server/src/routes/kpa/services/mypage.service.ts) (getProfile / updateProfile)
  - Canonical 문서: USER-OPERATOR-FREEZE-V1, USER-DOMAIN-SSOT-V1, ROLE-POLICY-AND-GUARD-V1, RBAC-CANONICAL-STATE-V1, RBAC-ROLE-CATALOG-V1, KPA-ROLE-MATRIX-V1
- DB 접근: `gcloud sql connect o4o-platform-db --user=o4o_api --database=o4o_platform` 으로 5분 IP allowlist 후 read-only SELECT 시도. CLI 에서 stdin 으로 SQL 파일 redirect 시 psql 가 password prompt 대기로 멈춰 자동 실행 실패. **테스트 계정 5명의 실제 DB 상태 verification 은 본 IR 에서 자동 수행하지 못함** — §6 에 운영자가 동일 환경에서 실행 가능한 SQL 을 첨부.
- `git status`: 작업 전후 동일 (untracked IR 1 개 추가만).

---

## 2. 컬럼별 source 매핑 (목록 화면 = `MemberManagementPage.tsx`)

### 2-1. `이름 / 이메일`

| 표시 | 위치 | source |
|------|------|--------|
| `이름` | [MemberManagementPage.tsx:709](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L709) | `m.user?.name` ← `users.name` (`u.name` SELECT [member.controller.ts:315](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L315)) |
| `이메일` | [MemberManagementPage.tsx:719](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L719) | `m.user?.email` ← `users.email` |

→ **nickname 미사용**. 운영자는 `user.name` 만 본다 (B5 후술).

### 2-2. `유형` (membership_type)

| 위치 | render 규칙 |
|------|-------------|
| Column [MemberManagementPage.tsx:723-748](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L723-L748) | `m.membership_type` 없음 → ‘미분류’. `'student' / 'pharmacy_student_member'` → ‘약대생’. 그 외 → ‘약사’ |

| API 응답 | source |
|---|---|
| `membership_type` ([member.controller.ts:359](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L359)) | `km.membership_type` (LEFT JOIN kpa_members) |

→ **kpa_members 단독 source.** kpa_members 미존재 시 `'미분류'`. fallback/merge 없음.

### 2-3. `활동 유형` (activity_type)

| 위치 | render 규칙 |
|------|-------------|
| Column [MemberManagementPage.tsx:752-761](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L752-L761) | `ACTIVITY_TYPE_LABELS[m.activity_type]` (한글 라벨) — 미설정 시 `'-'` |
| Drawer 직역 [:1303-1313](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1303-L1313) | 동일. `'pharmacy_owner'` 일 때 우측에 ‘개설약사’ 라벨 chip 추가 |

| API 응답 | source |
|---|---|
| `activity_type` ([member.controller.ts:307](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L307)) | **`COALESCE(pp.activity_type, km.activity_type)`** — `kpa_pharmacist_profiles.activity_type` SSOT 우선, `kpa_members.activity_type` legacy mirror fallback. WO-O4O-KPA-ACTIVITY-TYPE-SSOT-ROLE-CANONICAL-ALIGN-V1 Phase 1 |

→ **2-step COALESCE.** 둘이 일치하면 결과 동일. drift 시에는 `kpa_pharmacist_profiles` 가 이김. write path 는 PATCH `/info` ([member.controller.ts:1048-1060](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1048-L1060)) 와 `setActivityType` 둘 다 양쪽에 mirror write 하도록 작성되어 있어 정상상태에선 일치한다.

### 2-4. `권한` (capabilities) — **사용자가 “섞여있다” 고 지적한 컬럼**

| 위치 | render 규칙 |
|------|-------------|
| Column [MemberManagementPage.tsx:768-791](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L768-L791) | `m.capabilities` 가 빈 배열 → `'일반 회원'` (text). 그 외에는 sort 후 chip 으로 표시. `CAPABILITY_LABELS` 매핑은 [:126-133](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L126-L133) |
| Drawer 권한 [:1451-1473](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1451-L1473) | 동일한 render 로직 |

| API 응답 | source |
|---|---|
| `capabilities` ([member.controller.ts:382-398](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L382-L398)) | 별도 batch SELECT — **`SELECT user_id, role FROM role_assignments WHERE user_id = ANY($1::uuid[]) AND is_active = true`**. user_id 별로 grouped 후 attach |

#### CAPABILITY_LABELS 매핑표 (Frontend)

| role_assignments.role | 한글 라벨 | 정렬 우선순위 |
|---|---|---|
| `platform:super_admin` | 플랫폼 관리자 | 0 |
| `kpa:admin` | 관리자 | 1 |
| `kpa:operator` | 운영자 | 2 |
| `kpa:store_owner` | 매장 운영 | 3 |
| `lms:instructor` | 강사 | 4 |
| `kpa:pharmacist` | 약사 | 5 |
| (미매핑) | role 키 그대로 | 99 |
| (빈 배열) | ‘일반 회원’ (text only) | — |

#### ‘약사’ 가 권한 컬럼에 표시되는 경로 (검증됨)

- `CAPABILITY_LABELS['kpa:pharmacist'] = '약사'` 매핑은 존재한다.
- 그러나 마이그레이션 [20260326300000-DeactivateQualificationRoles.ts](apps/api-server/src/database/migrations/20260326300000-DeactivateQualificationRoles.ts) 가 **2026-03-26 시점에 `kpa:pharmacist`, `kpa:student` 의 role_assignments row 를 soft-deactivate** (`is_active = false`) 처리했다.
- 현재 코드 ([member.controller.ts:459](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L459)) 의 승인 절차는 `WO-KPA-A-ROLE-CLEANUP-V1` 에 따라 `kpa:pharmacist` / `kpa:student` 를 **재할당하지 않는다** (`kpa_pharmacist_profiles` / `kpa_student_profiles` 로 대체).
- 따라서 **신규 회원에서 ‘약사’ chip 이 표시될 경로는 없다.** ‘약사’ chip 이 보이는 회원이 있다면 다음 중 하나:
  1. 마이그레이션 이전부터 `kpa:pharmacist` 를 보유했고 마이그레이션 down() 이 실행됐을 가능성
  2. 외부 시드 스크립트 / 운영 수동 SQL 로 다시 활성화한 경우
  3. canonical 정책과 무관하게 role_assignments 에 직접 INSERT 한 경로
- → §6 SQL 의 `kpa:pharmacist` 활성 row count 로 직접 확인 가능.

#### ‘일반 회원’ 텍스트의 의미

- 실제 role 이름이 아니다. **frontend 표시용 placeholder text** ([MemberManagementPage.tsx:775](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L775)).
- `m.capabilities.length === 0` 일 때만 렌더링.
- SSOT 측면: `role_assignments` 에 active row 가 0 개라는 사실의 frontend 라벨일 뿐, RBAC-ROLE-CATALOG-V1 의 platform role `'user'` (일반 사용자) 와는 관계 없다.

#### → **“혼입” 의 정체**

권한 컬럼에 나타나는 값들의 *성격* 이 사실은 서로 다르다:

| chip 텍스트 | 정체 | 가시화 정당성 |
|---|---|---|
| 플랫폼 관리자 (`platform:super_admin`) | 플랫폼 전역 RBAC role | ✅ |
| 관리자 (`kpa:admin`) | KPA 서비스 admin role | ✅ |
| 운영자 (`kpa:operator`) | KPA 서비스 operator role | ✅ |
| 매장 운영 (`kpa:store_owner`) | KPA 서비스 capability — pharmacy_owner 승인의 결과 | ✅ (capability 정의상) |
| 강사 (`lms:instructor`) | LMS 서비스 instructor capability | ✅ |
| 약사 (`kpa:pharmacist`) | **deprecated** (마이그레이션 20260326300000 으로 soft-deactivate) | ❌ 현 정책상 chip 표시 자체가 leak |
| 일반 회원 | placeholder text (role 아님) | ⚠️ ‘role’ chip 자리에 텍스트가 섞이는 것은 일관성 부족 |

→ **혼입의 본질**: `권한` 컬럼은 RBAC-CANONICAL-STATE-V1 §2 의 "role_assignments = RBAC SSOT" 정의를 그대로 반영하지만, RBAC role 자체가 **(a) 플랫폼/서비스 거버넌스 role** 과 **(b) 서비스 내 capability** 두 가지 의미를 동시에 가지고 있어 운영자에게 의미 부담을 준다. 또한 ‘약사’ chip 은 deprecated 라는 사실이 frontend 표시 매핑에 남아있어 deprecated chip 이 보일 여지가 있다.

### 2-5. `상태` (status)

| 위치 | source |
|---|---|
| Column [MemberManagementPage.tsx:796](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L796) | `m.status` ← **`sm.status`** (service_memberships.status, `kpa_members.status` 아님) ([member.controller.ts:297](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L297)) |

→ status canonical = `service_memberships.status`. `kpa_members.status` 는 별도 컬럼(`kpa_status`)으로만 응답에 포함되며 진단 목적 외 화면 표시 없음.

### 2-6. `매장 권한` (Drawer 전용)

| 위치 | render 규칙 |
|---|---|
| Drawer 매장 권한 [MemberManagementPage.tsx:1316-1328](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1316-L1328) | `(selectedMember.capabilities ?? []).includes('kpa:store_owner')` → '`store_owner 보유`' chip / 미보유 시 '`없음`' 텍스트 |

→ **role_assignments 단독 source.** activity_type, kpa_members.role, organization_members.role 모두 무관. (단, 백엔드는 activity_type 변경 시 store_owner 부여/회수 트리거 — §4 참조.)

### 2-7. `닉네임` — **미사용** (별건)

`GET /kpa/members` SELECT 절 ([member.controller.ts:293-322](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L293-L322)) 에 **`u.nickname` 없음**. JSON shape 에도 nickname 필드 없음 ([:373-376](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L373-L376)).

| 항목 | mypage | operator/members |
|---|---|---|
| nickname read | `profile.nickname` ([mypage.service.ts:70](apps/api-server/src/routes/kpa/services/mypage.service.ts#L70)) | **없음** |
| nickname write | `users.nickname` ([mypage.service.ts:135](apps/api-server/src/routes/kpa/services/mypage.service.ts#L135)) — controller passthrough 누락은 자매 IR | **없음** |
| 검색 가능성 | mypage 전용 | nickname 으로 검색 불가 (`u.name OR u.email` 만 — [member.controller.ts:270](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L270)) |

→ canonical 측면: `users.nickname` 은 USER-DOMAIN-SSOT-V1 §1 의 users 테이블 식별 컬럼으로 정식 등록되어 있으나, KPA-Society 내부의 노출 정책은 `MyProfilePage` 단독으로만 정의되어 있다. 운영자 회원관리에서 보이지 않는 것은 의도된 정책인지, 단순 누락인지 명문화된 결정이 없다.

---

## 3. 상세 Drawer vs 목록 source 일치성

| 컬럼 | 목록 source | Drawer source | 일치 여부 |
|------|------------|--------------|----------|
| 이름 | `m.user.name` | `selectedMember.user.name` | ✅ 동일 (동일 row 객체) |
| 이메일 | `m.user.email` | `selectedMember.user.email` | ✅ 동일 |
| 유형 | `m.membership_type` | `selectedMember.membership_type` | ✅ 동일 |
| 활동 유형 | `m.activity_type` | `selectedMember.activity_type` | ✅ 동일 |
| 권한 (chip) | `m.capabilities` | `selectedMember.capabilities` | ✅ 동일 |
| 매장 권한 | (목록 미표시) | `selectedMember.capabilities.includes('kpa:store_owner')` | n/a |
| 상태 | `m.status` | `selectedMember.status` | ✅ 동일 |
| 면허번호 | (목록 미표시) | `selectedMember.license_number` | ✅ |
| 약국명 | (목록 미표시) | `selectedMember.pharmacy_name` | ✅ |
| 사업자번호 | (목록 미표시) | `selectedMember.business_info.businessNumber` | ✅ |
| 대표자명 | (목록 미표시) | `business_info.ceoName ?? representativeName` | ✅ (canonical fallback) |
| 닉네임 | (목록 미표시) | (Drawer 도 미표시) | **B5 — Drawer 에도 누락** |
| 가입일 | `m.joined_at ?? m.created_at` | 동일 | ✅ |

→ **목록 ↔ Drawer 간 source mismatch 없음.** selectedMember 는 동일 row 객체이고, 재조회 시 [:563-569](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L563-L569) 에서 fresh members[] 에서 같은 ID 로 갱신된다.

---

## 4. 수정(Edit) 화면 vs 목록 source 일치성

수정은 Drawer 내부 인라인 편집 ([:1148-1397](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L1148-L1397)). 백엔드: PATCH `/kpa/members/:id/info` ([member.controller.ts:909-1158](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L909-L1158)).

| 편집 필드 | form state | 백엔드 write target |
|---|---|---|
| 이름 | `editForm.name` | `users.name` (UPDATE) |
| 유형 (membership_type) | `editForm.membership_type` | `kpa_members.membership_type` |
| 직역 (activity_type) | `editForm.activity_type` | `kpa_members.activity_type` + `kpa_pharmacist_profiles.activity_type` (UPSERT) — 둘 다 |
| 면허번호 | `editForm.license_number` | `kpa_members.license_number` |
| 약국명 | `editForm.pharmacy_name` | `kpa_members.pharmacy_name` |
| 약국 주소 | `editForm.pharmacy_address` | `kpa_members.pharmacy_address` (비어있으면 변경 안 함) |
| 사업자번호 | `editForm.business_number` | **`users.businessInfo.businessNumber`** (JSONB merge) |
| 약국 전화 | `editForm.pharmacy_phone` | **`users.businessInfo.metadata.pharmacy_phone`** (JSONB merge) |
| 상태 | `editForm.status` | PATCH `/:id/status` 별도 호출 (순차) |

**`activity_type='pharmacy_owner'` 전환 시 부수효과** ([member.controller.ts:1085-1133](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1085-L1133)):

1. `users.businessInfo.businessNumber` 와 `kpa_members.pharmacy_name` (또는 `businessInfo.businessName`) 둘 다 있어야 진행. 누락 시 `warnings[]` 에 사유 추가하고 store_owner 부여 보류 (silent skip 제거됨).
2. `organizations` ensure (`code = kpa-pharm-{businessNumberDigits}`).
3. `kpa_members.organization_id` 가 null 인 경우에만 set (분회 연결 보호).
4. `organization_members(role='owner')` 멱등 추가.
5. `role_assignments` 에 `kpa:store_owner` 부여 (`roleAssignmentService.assignRole` 멱등).

**`pharmacy_owner → 다른 직역` 전환 시 부수효과** ([:1062-1080](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1062-L1080)):

- `role_assignments` 의 `kpa:store_owner` row 를 `is_active=false` 로 deactivate.
- `organization_members` 의 owner row 는 **revoke 안 함** (member.controller.ts 에서 별도 처리 없음).

→ **수정 form ↔ 목록 source 일치성**: 수정이 정상 완료되면 다음 fetch 에서 `m.activity_type` 과 `m.capabilities.includes('kpa:store_owner')` 가 동기화된다. **이 화면에는 fallback 로직이 없으므로**, 수정 form 의 source mismatch 는 발견되지 않았다.

> **단**, mypage 직역 정보 탭의 form 초기화 source 와 본 회원관리 화면의 form 초기화 source 는 **서로 다른 fallback chain** 을 사용한다. mypage 의 약국명 form 은 `users.businessInfo.businessName` 만 보고 `kpa_members.pharmacy_name` 을 무시한다 (IR-O4O-KPA-MYPROFILE-ROLE-INFO-VIEW-EDIT-SOURCE-AUDIT-V1 §3 B1). 운영자 화면은 `selectedMember.pharmacy_name` (kpa_members) 을 보므로 정합. 사용자 입장에서는 ‘같은 약국명 인데 화면마다 다르게 보이는’ 현상의 원인 — 본 IR 범위는 운영자 화면 한정이므로 별도 IR 참조.

---

## 5. pharmacy_owner / store_owner / 내 매장 / store hub 접근 판정 chain

> CLAUDE.md §11 + IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1 와 본 IR 의 frontend 코드를 종합.

### 5-1. 판정 SSOT

| 항목 | source-of-truth |
|------|-----------------|
| `activity_type='pharmacy_owner'` (직역) | `kpa_pharmacist_profiles.activity_type` (SSOT) → mirror `kpa_members.activity_type` |
| `kpa:store_owner` (RBAC capability) | `role_assignments` `role='kpa:store_owner' AND is_active=true` (RBAC SSOT) |
| `user.isStoreOwner` (auth context flag) | me-context 응답 ← [me-context.controller.ts:42-44](apps/api-server/src/routes/kpa/controllers/me-context.controller.ts#L42-L44) 의 `EXISTS(SELECT 1 FROM role_assignments WHERE role IN ('kpa:store_owner','glycopharm:store_owner','cosmetics:store_owner') AND is_active=true)` |
| `organization_members` (owner row) | 별도 — store_owner 부여 시 자동 생성되나 deactivate 동기화 없음 (§4 주석) |

### 5-2. 판정 결과 표

| 시나리오 | activity_type | role_assignments.store_owner | header `내 매장` | `/store` 접근 | `PharmacyGuard` |
|---|---|---|---|---|---|
| 일반 약사 | `pharmacy_employee` | 없음 | ❌ | ❌ → `/pharmacy` redirect | 차단 |
| 개설약사 (정상 승인) | `pharmacy_owner` | 활성 | ✅ | ✅ | 통과 |
| pharmacy_owner 직역만 변경, store_owner 미부여 (사업자번호/약국명 누락) | `pharmacy_owner` | 없음 | ❌ | ❌ | 차단 |
| pharmacy_owner 직역만 변경, store_owner 활성, JWT stale (token 갱신 전) | `pharmacy_owner` | 활성 (DB) / 없음 (JWT) | **(stale 시 false)** ← `isStoreOwnerDual()` 가 `user.isStoreOwner` (me-context) 로 fallback → ✅ | 동일 fallback ✅ | 동일 fallback ✅ |
| operator + store_owner 겸직 | (자유) | 활성 | ✅ | ✅ | 통과 |
| operator 단독 | (자유) | 없음 | ❌ | ❌ → `/pharmacy` 차단 | 차단 (`isPlatformOnlyUser=true`) |

### 5-3. Header / Guard 로직 (frontend SSOT)

- **Header** ([KpaGlobalHeader.tsx:97](services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L97)):
  `const isStoreOwner = isStoreOwnerDual(user.roles, 'kpa:store_owner', user.isStoreOwner)` — **role OR contextFlag**.
- **PharmacyGuard** ([PharmacyGuard.tsx:37-38](services/web-kpa-society/src/components/auth/PharmacyGuard.tsx#L37-L38)):
  동일하게 `isStoreOwnerDual` 사용. 추가로 stale 시 `/pharmacy-requests/my` 의 approved 존재 여부로 회복 시도 → 후 `checkAuth()` 로 JWT 갱신.
- **`PharmacyGuard` 와 `Header` 의 SSOT 함수가 동일**: 같은 단일 함수 [isStoreOwnerDual](packages/auth-utils/src/isStoreOwnerDual.ts) 호출.
- **`/store` 접근의 minimum 조건**: role 또는 contextFlag — `kpa:store_owner` 가 `role_assignments` 에 존재하기만 하면 (JWT stale 여부와 무관) header / guard 모두 통과.

### 5-4. activity_type=`pharmacy_owner` 단독은 더 이상 store hub 접근을 부여하지 않는다 (확정)

- `getKpaPostLoginRoute` ([dashboard.ts:55-62](services/web-kpa-society/src/config/dashboard.ts#L55-L62)) 가 명시적으로 “store_owner 활성 여부 canonical source = role_assignments. activity_type === 'pharmacy_owner' 단독 판단 제거 — 직역은 capability 아님” 주석으로 박혀 있음.
- 따라서 **pharmacy_owner 인데 store_owner 가 비어있는 회원** 은:
  - operator 화면 `매장 권한` = ‘없음’
  - `/store` 접근 차단
  - 자동 부여 trigger 가 누락된 사유: `users.businessInfo.businessNumber` 또는 `kpa_members.pharmacy_name` 누락 (백엔드 warnings 노출)

→ 사용자 질문 *“pharmacy_owner 인데 store_owner 미표시 원인”* 의 정답: **승인 또는 PATCH `/info` 시 자동 부여 trigger 가 약국명/사업자번호 누락으로 보류된 케이스**. operator 화면에서 약국명+사업자번호 입력 후 저장하면 자동 부여 (`warnings` 표시 사라짐).

---

## 6. 테스트 계정 5명 실제 DB 상태 확인용 SQL (운영자가 직접 실행)

> **DB 직접 verification 미수행 사유**: 본 환경에서 `gcloud sql connect <db>` 가 IP allowlist 후 psql 을 interactive mode 로 spawn 하여 stdin redirect 가 동작하지 않음. 운영자가 동일 명령으로 인터랙티브 shell 진입 후 아래 SQL 을 paste 하여 결과 확인 권장.

```bash
gcloud sql connect o4o-platform-db --user=postgres --database=o4o_platform
```

```sql
WITH target_users AS (
  SELECT id, email, name, nickname, "businessInfo", "isActive"
  FROM users
  WHERE email IN (
    'renagang21@gmail.com', 'pharmacy1@o4o.com', 'sohae2100@gmail.com',
    'kpa-operator@o4o.com', 'kpa-admin@o4o.com'
  )
)
-- (1) users 기본
SELECT email, id, name, nickname, "isActive",
       ("businessInfo"->>'businessNumber') AS biz_number,
       ("businessInfo"->>'businessName')   AS biz_name
FROM target_users ORDER BY email;

-- (2) role_assignments 활성 role 전체
SELECT u.email, ra.role, ra.is_active, ra.scope_type, ra.assigned_at
FROM role_assignments ra JOIN users u ON u.id = ra.user_id
WHERE u.email IN ('renagang21@gmail.com','pharmacy1@o4o.com','sohae2100@gmail.com','kpa-operator@o4o.com','kpa-admin@o4o.com')
ORDER BY u.email, ra.role;

-- (3) service_memberships
SELECT u.email, sm.service_key, sm.status, sm.role, sm.is_active, sm.approved_at
FROM service_memberships sm JOIN users u ON u.id = sm.user_id
WHERE u.email IN ('renagang21@gmail.com','pharmacy1@o4o.com','sohae2100@gmail.com','kpa-operator@o4o.com','kpa-admin@o4o.com')
ORDER BY u.email, sm.service_key;

-- (4) kpa_members
SELECT u.email, km.id AS km_id, km.role, km.status, km.membership_type,
       km.activity_type, km.license_number, km.pharmacy_name, km.organization_id
FROM kpa_members km JOIN users u ON u.id = km.user_id
WHERE u.email IN ('renagang21@gmail.com','pharmacy1@o4o.com','sohae2100@gmail.com','kpa-operator@o4o.com','kpa-admin@o4o.com')
ORDER BY u.email;

-- (5) kpa_pharmacist_profiles (activity_type SSOT)
SELECT u.email, pp.activity_type, pp.license_number, pp.updated_at
FROM kpa_pharmacist_profiles pp JOIN users u ON u.id = pp.user_id
WHERE u.email IN ('renagang21@gmail.com','pharmacy1@o4o.com','sohae2100@gmail.com','kpa-operator@o4o.com','kpa-admin@o4o.com')
ORDER BY u.email;

-- (6) organization_members
SELECT u.email, om.organization_id, o.name AS org_name, o.type AS org_type, om.role, om.is_primary, om.left_at
FROM organization_members om JOIN users u ON u.id = om.user_id
LEFT JOIN organizations o ON o.id = om.organization_id
WHERE u.email IN ('renagang21@gmail.com','pharmacy1@o4o.com','sohae2100@gmail.com','kpa-operator@o4o.com','kpa-admin@o4o.com')
ORDER BY u.email;

-- (7) kpa:pharmacist deprecated role 잔존 점검
SELECT u.email, ra.role, ra.is_active, ra.updated_at
FROM role_assignments ra JOIN users u ON u.id = ra.user_id
WHERE ra.role IN ('kpa:pharmacist','kpa:student')
  AND u.email IN ('renagang21@gmail.com','pharmacy1@o4o.com','sohae2100@gmail.com','kpa-operator@o4o.com','kpa-admin@o4o.com')
ORDER BY u.email, ra.role;
```

### 6-1. 운영 검증 예상 결과 vs 실제 매핑

| 계정 | 운영자 화면 ‘유형’ 예상 | ‘활동 유형’ 예상 | ‘권한’ chip 예상 | ‘매장 권한’ 예상 |
|---|---|---|---|---|
| `renagang21@gmail.com` (운영자 본인 추정) | 약사 또는 미분류 | (선택값) | `관리자` 또는 `운영자` chip + (선택) | 활성/비활성 (선택) |
| `pharmacy1@o4o.com` | 약사 | 약국 개설자 | `매장 운영` chip | store_owner 보유 |
| `sohae2100@gmail.com` | 약사 또는 미분류 | (선택값) | `플랫폼 관리자` 가능성 (super_admin) — 운영자 화면에서 편집 차단 | (선택) |
| `kpa-operator@o4o.com` | 약사 또는 미분류 | (자유) | `운영자` chip | 없음 (또는 store_owner 겸직) |
| `kpa-admin@o4o.com` | (자유) | (자유) | `관리자` chip | 없음 |

→ 실제 DB 결과가 위 예상과 다르면, 그 차이가 곧 “canonical source vs 표시 결과 drift” 의 instance 이므로 후속 WO 의 대상이 된다.

---

## 7. 권한 컬럼 canonical 정의 — 후보 정리

| 후보 | 정의 | 장점 | 단점 |
|------|------|------|------|
| **A. RBAC SSOT 유지 (현재 구조)** | `role_assignments WHERE is_active=true` → 그대로 표시 | RBAC-CANONICAL-STATE-V1 / USER-OPERATOR-FREEZE-V1 와 일치. 다른 도메인(LMS, neture) 과 동일한 SSOT | 표시되는 role 의 성격(governance vs capability)이 섞여 보임. ‘일반 회원’ placeholder 가 role chip 자리에 텍스트로 뜸. deprecated chip(`kpa:pharmacist`) 매핑이 잔존 |
| **B. governance role ↔ capability 분리 표시** | `kpa:admin / kpa:operator / platform:super_admin` = ‘권한’ 컬럼 / `kpa:store_owner / lms:instructor / etc.` = ‘capability’ 컬럼 분리 | 운영자 인지 부담 감소. capability 부여/회수 워크플로우와 governance role 부여를 분리해 audit 추적 명료화 | 컬럼 1개 추가 → DataTable 폭 증가. CAPABILITY_LABELS 정의 분리 필요. 정의 합의 필요 |
| **C. governance only 표시 + capability 는 별 컬럼/별 영역** | ‘권한’ = governance role 전용 chip. capability(`store_owner`, `instructor` 등) 은 별도 ‘capability’ 영역(예: ‘활동’) 으로 | 컬럼 의미 정합 | governance 와 capability 의 경계 정의 필요. RBAC-ROLE-CATALOG-V1 에 분류 boolean 컬럼 추가 필요할 수 있음 |
| **D. activityType + role 통합 single chip (overlay)** | activity_type 라벨에 store_owner 보유 표시(개설약사 chip) 통합 | 운영자 인지에 가장 직관적 | RBAC SSOT 분리 원칙(USER-OPERATOR-FREEZE-V1) 과 어긋남. activity_type 은 profile metadata 이므로 capability 표시 source 로 쓰면 안 됨 |

→ **권고 (Phase 0 결정 후 결정)**: 본 IR 범위에서는 **A 유지 + 다음 cleanup 만** 권장:
1. `CAPABILITY_LABELS['kpa:pharmacist']` 매핑 항목 제거 (deprecated, 표시될 일 없으나 표시되면 misleading)
2. `m.capabilities.length === 0` 에 대한 텍스트를 ‘권한 없음’ 또는 빈 칸으로 변경 (`'일반 회원'` 텍스트가 RBAC role 처럼 보이는 시각적 혼동 해소)
3. governance vs capability 분리 (후보 B) 는 별도 IR + 디자인 결정 필요

---

## 8. Canonical Source 결정 (현 시점 사실)

| 화면 표시 컬럼 | Canonical Source | Drift 시 우선 | 비고 |
|---|---|---|---|
| 유형 (membership_type) | `kpa_members.membership_type` | kpa_members 단독 | kpa_members 미존재 → ‘미분류’ |
| 활동 유형 (activity_type) | **`kpa_pharmacist_profiles.activity_type`** (SSOT) | pp > km mirror | mypage 의 setActivityType / operator PATCH 둘 다 양쪽 mirror write |
| 권한 (capabilities) | **`role_assignments` WHERE is_active=true** | RBAC SSOT | F9 (RBAC freeze) / F11 (USER/Operator freeze) |
| 매장 권한 (Drawer) | `role_assignments.role='kpa:store_owner' AND is_active=true` | RBAC SSOT | activityType=‘pharmacy_owner’ 만으로는 부여되지 않는다 |
| 상태 (status) | **`service_memberships.status`** | sm > kpa_members.status | kpa_members.status 는 진단용(`kpa_status`)으로만 응답 |
| 가입일 | `kpa_members.joined_at` ?? `service_memberships.created_at` | km > sm | km 미존재 시 sm.created_at |
| 닉네임 | (operator 화면 미노출) | n/a | mypage 만 노출. canonical = `users.nickname` |
| 사업자번호 | `users.businessInfo.businessNumber` (JSONB) | — | canonical key `businessNumber` |
| 대표자명 | `users.businessInfo.ceoName` (canonical) → `representativeName` (legacy fallback) | canonical > legacy | WO-O4O-KPA-OPERATOR-MEMBER-LIST-BUSINESSINFO-TYPE-CANONICAL-ALIGN-V1 |

---

## 9. 발견된 drift / 일관성 결함 정리

| ID | 결함 | source 위치 | 영향 | 수정 분류 |
|---|------|------------|------|----------|
| **D1** | 권한 컬럼에 deprecated `kpa:pharmacist` 라벨 매핑 잔존 | `CAPABILITY_LABELS` ([MemberManagementPage.tsx:130](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L130)) | 데이터에 historical row 가 있으면 ‘약사’ chip 노출 — deprecated 라는 사실 가시화 안 됨 | **즉시 수정 가능** (라벨 제거 또는 ‘약사(deprecated)’ 라벨링) |
| **D2** | `'일반 회원'` placeholder text 가 role chip 자리에 섞임 | [:775](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L775) | 사용자가 이를 RBAC role 로 오인할 가능성 | **즉시 수정 가능** (텍스트 변경 또는 칩 색상 분리) |
| **D3** | 닉네임 컬럼/Drawer/검색 모두 누락 | `GET /kpa/members` SELECT 절 ([member.controller.ts:316](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L316)), Drawer DOM | 운영자가 nickname 인지 불가. mypage 와 단방향 분리 | **정책 결정 필요** (회원관리에 nickname 노출할지) — 결정 후 코드 추가 |
| **D4** | `kpa_members.role` (member/operator/admin) 응답 필드 잔존 + frontend 미사용 | [:301](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L301), [MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) 어디에도 `m.role` 표시 없음 (Drawer 의 ‘조직 역할’ UI 제거됨) | 정보 leak / 사용처 없음 / capability vs role 혼동 가속 | **구조 정비 필요** (응답에서 제거 vs `PATCH /:id/role` 의존성 확인 후) |
| **D5** | `activity_type` 의 2-step COALESCE 가 응답 layer 에 박혀 있음 | [:307](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L307) — `COALESCE(pp.activity_type, km.activity_type)` | SSOT 가 항상 pp 라는 사실이 SQL 1줄에 박힘 — backfill 누락 케이스에서 km value 가 stale 노출 가능. UPDATE path 가 양쪽 mirror 하므로 정상은 동일하나 SSOT 사용 원칙은 SSOT 단독 SELECT 가 더 명료 | **fallback 제거 검토** (drift 잔존 row 가 0 임을 SQL 로 verify 후 km.activity_type 컬럼 deprecate) |
| **D6** | 운영자 화면 form 의 약국명 source 와 mypage 직역 form 의 약국명 source 가 다름 | mypage 의 resetRoleForm 은 `users.businessInfo.businessName` 만 (IR-O4O-KPA-MYPROFILE-ROLE-INFO-VIEW-EDIT-SOURCE-AUDIT-V1 B1) | 사용자가 보기·수정 화면을 오가며 ‘약국명이 사라졌다 보였다’ 한다. 본 IR 범위 외이나 cross-screen 일관성 관점에서 기록 | **공통화 필요** (자매 IR 의 WO 후속) |
| **D7** | activity_type=pharmacy_owner 회수(`→ 다른 직역`) 시 `organization_members.owner` row 의 revoke 가 자동화되어 있지 않음 | [member.controller.ts:1062-1080](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1062-L1080) — `kpa:store_owner` role 만 deactivate, organization_members 는 그대로 | 데이터 정합 — 비-개설약사인데 organization_members 의 owner 잔존 | **정책 결정 필요** (revoke 정책 정의 후) — 본 IR 범위 외 |
| **D8** | USER-OPERATOR-FREEZE-V1 §8.2 의 “승인 시 kpa:pharmacist / kpa:student role 할당” canonical 흐름 기술이 **현재 코드와 불일치** (코드는 `WO-KPA-A-ROLE-CLEANUP-V1` 으로 role 할당 제거됨, 마이그레이션으로 deactivate 됨) | docs vs code | 문서/코드 drift | **문서 업데이트 필요** (USER-OPERATOR-FREEZE-V1 §8.2 또는 KPA exception 절 갱신) |

---

## 10. 수정 우선순위 제안 (코드 수정 없음 — 후속 WO 분리)

### 즉시 수정 가능 (각각 1 파일, < 5 line)

1. **WO 후보 1**: `CAPABILITY_LABELS` 에서 `'kpa:pharmacist': '약사'` 매핑 제거 (deprecated). 보유자가 표시되면 raw key chip 으로 노출되어 정책 변경이 명시화됨.
2. **WO 후보 2**: `'일반 회원'` placeholder text 를 빈 chip(`—`) 또는 ‘권한 없음’ 으로 변경. role chip 시각 일관성 회복.
3. **WO 후보 3 (별 IR — D3)**: `GET /kpa/members` SELECT 에 `u.nickname` 추가 + Drawer 표시 라인 + 검색 절(`u.name OR u.email`) 에 nickname OR 검색 추가. **단, 정책 결정 선행 — 회원관리에서 nickname 을 공개해야 하는가?**

### 구조 정비 필요 (다중 파일, 정책 결정 선행)

4. **WO 후보 4 (D5)**: `activity_type` 응답 layer 의 `COALESCE(pp.activity_type, km.activity_type)` 제거 → `pp.activity_type` 단독 사용. 사전 SQL 검증 — `kpa_pharmacist_profiles` 와 `kpa_members` 의 activity_type drift count 가 0 임을 verify.
5. **WO 후보 5 (D4)**: `kpa_members.role` 응답 필드 제거. 사전 코드 검증 — `m.role` 사용처 grep ⇒ frontend 0건 확인.

### Fallback 제거 / 공통화 필요

6. **WO 후보 6 (자매 IR 후속)**: mypage 직역 form 과 operator 회원관리 form 의 약국명/주소 source 공통화 — `kpa_members.pharmacy_*` 우선 + `users.businessInfo` fallback 으로 통일.

### 정책 결정 필요 (문서 업데이트 우선)

7. **WO 후보 7 (D8)**: `USER-OPERATOR-FREEZE-V1` §8.2 의 KPA-a Role 파생 흐름 기술 업데이트 — `WO-KPA-A-ROLE-CLEANUP-V1` 이후의 “profile-based, pharmacist/student role 할당 없음” 상태를 freeze doc 에 반영.
8. **WO 후보 8 (D7)**: pharmacy_owner → 다른 직역 회수 시 `organization_members.owner` revoke 정책 결정 (revoke vs preserve) 후 코드 반영.

### Governance vs capability 시각 분리 (디자인 결정)

9. **WO 후보 9**: §7 후보 B/C 중 하나로 권한 컬럼 분할 — 별도 IR + UX 결정 필요.

---

## 11. 본 IR 범위 외 (명시)

- DB 직접 SQL 수정 / 마이그레이션 / row backfill.
- `kpa_members.role` 컬럼 자체의 schema 변경.
- `users.nickname` 사용 정책의 전사 결정 (마이페이지 공개 vs 운영자 가시).
- `mypage` 직역 form 의 fallback source 동일화 — 자매 IR `IR-O4O-KPA-MYPROFILE-ROLE-INFO-VIEW-EDIT-SOURCE-AUDIT-V1` 후속 WO 가 다룸.
- `kpa:pharmacist` 역할 row backfill / cleanup — 본 IR 은 frontend label 매핑 cleanup 만 권장.

---

## 12. 변경 사항 / 산출물

- 본 IR 작성 외 코드 / DB / 설정 변경 없음.
- `git status`: 작업 전후 untracked file 1 개(본 IR) 추가 외 동일.
- 후속 WO 후보 9 개 식별 (§10) — 본 IR 은 어느 것도 실행하지 않는다.
