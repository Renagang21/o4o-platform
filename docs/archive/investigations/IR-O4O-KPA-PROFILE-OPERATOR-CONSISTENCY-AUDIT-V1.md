# IR-O4O-KPA-PROFILE-OPERATOR-CONSISTENCY-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드 / migration / UI / contract 수정 없음, **commit / push 금지**)
**대상**: KPA-Society 의 **사용자 프로필 화면** (`/mypage/profile`) 과 **operator 회원관리 / 가입 승인 / 매장 경영자 신청 처리 화면** 간의 데이터 / 상태 / 라벨 / 승인 흐름 정합성.

**배경**: 최근 다수의 WO 가 프로필·직역·store_owner·membership·operator 영역에 적용됨 (`WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1`, `WO-O4O-KPA-PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1`, `WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1`, `WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1`, `WO-O4O-KPA-MEMBER-APPROVAL-STORE-OWNER-AUTO-ACTIVATION-V1`, `WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1` 등). 본 IR 은 변경의 누적이 양쪽 화면 사이에 만든 sync gap / dead field / label drift / stale state 위험을 통합 점검한다.

**관련 IR (직접 의존)**:
- `IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1` — businessInfo canonical 정책
- `IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1` — businessInfo 7 write path
- `IR-O4O-KPA-ACTIVITY-TYPE-CHANGE-FLOW-AUDIT-V1` — activity_type 전환 흐름
- `IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1` — guard / stale JWT
- `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` — auto-activation policy
- `IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1` — operator UI canonical 적용 상태

---

## 0. 결론 요약

### 0-1. 핵심 진단

> **사용자 프로필과 operator 회원관리 화면은 "같은 도메인 모델, 다른 read source, 부분 동기" 관계로, sync 가 silent fail 할 수 있는 7 개 mismatch surface 가 존재한다.** 라벨 (한국어 표시값) 은 양쪽이 동일한 `ACTIVITY_TYPE_LABELS` 를 사용해 일치하지만, **값(데이터) 동기 / 상태 의미 / 자동 부여 결과 가시화** 의 정합성이 깨질 수 있는 구조.

### 0-2. mismatch 위험 등급

| # | mismatch | 등급 | 즉시 수정 가능? |
|---|---|:---:|:---:|
| M1 | **operator 가 activity_type 변경 → 사용자 profile 에 stale 표시** (AuthContext `user.activityType` 가 login 직후 async fetch 1 회만 수행) | 🔴 HIGH | Phase 1 (재fetch 트리거 / SSE / 폴링) |
| M2 | **operator 가 자동 부여 skip (businessNumber / 약국명 누락)** 시 사용자 profile 에 신호 없음 (operator 만 `warnings[]` 봄) | 🔴 HIGH | Phase 2 (사용자 측 surface 추가) |
| M3 | **profile 의 매장 운영 신청 status 와 operator 의 capability 컬럼 source 불일치** — profile=`/pharmacy-requests/my`, operator=`role_assignments` + 별도 `/pharmacy-requests/pending` 큐 | 🟠 MID | Phase 2 (단일 view 통합 검토) |
| M4 | **`kpa_members.activity_type` ↔ `kpa_pharmacist_profiles.activity_type` 이중 저장** — 명목 SSOT 는 후자, operator list 는 전자 읽음 | 🟠 MID | Phase 3 (read source 통일) |
| M5 | **operator 측 `KpaMember.business_info` type 이 legacy key 만 선언** (`representativeName`, `taxEmail`) — backend 는 양쪽 fallback 정규화하나 type-level 미정렬 | 🟡 LOW | Phase 1 (type 수정만) |
| M6 | **JWT `user.roles` 의 stale** — operator 자동 부여 / 회수 후 사용자 재로그인 전까지 `kpa:store_owner` 인식 mismatch (관련 IR 별도 추적 중) | 🔴 HIGH | 별도 IR/WO (Phase 2 / 큰 작업) |
| M7 | **withdrawal lifecycle 의 owner 잔존** — `organization_members(role='owner')` 는 withdraw 시에도 삭제하지 않고 audit warning 만 — operator 화면 / 사용자 profile 어디서도 사용자에게 가시 신호 없음 | 🟠 MID | Phase 2 (정책 결정 + UI 신호) |

### 0-3. 핵심 결정 필요 사항 (정책)

| 질문 | 답 후보 |
|---|---|
| activity_type SSOT 는 무엇인가? (kpa_pharmacist_profiles vs kpa_members) | 명목상 kpa_pharmacist_profiles. operator list / member edit 도 SSOT 만 read 하도록 통일 필요 |
| 매장 운영 권한 (capability) 의 "상태" 단일 view 가 가능한가? | `role_assignments(kpa:store_owner, is_active)` + 최근 `pharmacy_request.status` 의 union view 정의 필요 |
| auto-activation 실패 시 사용자에게 어떤 신호를 보낼 것인가? | profile 의 capability 카드에 "운영자에게 사업자번호 / 약국명 보완 요청 중" 표시 + operator 측 dashboard 카드 |
| operator 가 자기 화면에서 본 정보 (kpa_members.activity_type 등) 가 사용자가 본인 profile 에서 본 값과 다를 수 있는 시점은? | activity_type sync 트랜잭션이 silent fail 시 + AuthContext stale + JWT stale 3 layer 누적 |
| representativeName / taxEmail 잔존 필요한가? | 정책: legacy fallback 만 — type / form / 검증 모두 ceoName + taxInvoiceEmail 로 정렬 |

---

## 1. 조사 방법

- 직접 Read + Grep (4 개 Explore subagent 병렬 수집 후 통합)
- 사용자 프로필 → operator 화면의 read source / write target / DB 영향 line-by-line 매핑
- 코드 흐름 매핑만 — **운영 데이터 검증 없음** (별도 작업 분리)
- 사용자 보고된 구체 incident 없음 — 정합성 surface 의 사전 점검 IR

---

## 2. 데이터 Source 매핑표 (Profile ↔ Operator)

### 2-1. 사용자 프로필 (`/mypage/profile` — [MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx))

| 표시/편집 항목 | Read API | Write API | DB SSOT |
|---|---|---|---|
| 이름 / 닉네임 / 이메일 / 전화 | `GET /mypage/profile` (`mypageApi.getProfile`) | `PUT /mypage/profile` | `users.first_name`, `users.last_name`, `users.nickname`, `users.email`, `users.phone` |
| 약사면허 / 출신교 / 근무처 | `GET /mypage/profile` | `PUT /mypage/profile` | `kpa_pharmacist_profiles.{license_number,university,workplace}` |
| 직역 (activity_type) | **`GET /kpa/me-context`** (async, 1 회 login 직후) | `PATCH /auth/me/profile` | `kpa_pharmacist_profiles.activity_type` (SSOT) + `kpa_members.activity_type` (mirror) |
| 사업자 정보 (약국명 / 대표자 / 세금계산서 / 주소 / 전화 / 매니저폰) | `GET /mypage/profile` (canonical key + legacy fallback read) | `PATCH /auth/me/profile` (canonical key write) | `users.businessInfo` JSONB |
| 매장 운영 권한 상태 (capability card) | `GET /pharmacy-requests/my` + `user.roles.includes('kpa:store_owner')` (JWT) | (CTA → `/pharmacy` page 의 신청 flow) | `kpa_pharmacy_requests.status` + `role_assignments(role='kpa:store_owner', is_active)` |
| 소속 조직 (분회 / 약국) | `GET /mypage/profile` (`profile.organizations[]`) | (read-only) | `organizations` + `organization_members` |
| 탈퇴 요청 ([MySettingsPage](services/web-kpa-society/src/pages/mypage/MySettingsPage.tsx)) | — | `POST /kpa/members/me/withdraw-request` (정확 경로 별도 확인) | `kpa_member_withdraw_requests` 또는 유사 큐 → 운영자 처리 |

**핵심 비대칭**:
- 직역 (`activityType`) 만 **`/kpa/me-context` 별도 엔드포인트** 에서 비동기 fetch (login latency cleanup WO). `/mypage/profile` 에는 포함되지 않음.
- `user.activityType` (AuthContext) 는 **login 직후 1 회 fetch 후 갱신 트리거 없음** → operator 변경 후 stale.
- 매장 운영 권한 상태 도출: `hasStoreOwnerRole` (JWT `user.roles`) 우선 → fallback `pharmacy_requests/my` 최신 row.

---

### 2-2. operator 회원관리 (`/operator/members` — [MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx))

| 표시 항목 | Read API | Action API | DB Source |
|---|---|---|---|
| 회원 리스트 (탭: 전체/약사/약대생/가입 신청) | `GET /api/v1/kpa/members?status=...&page=...` | — | `service_memberships sm LEFT JOIN kpa_members km LEFT JOIN users u` (WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1) |
| status (회원 상태) | sm.status | — | **`service_memberships.status` (SSOT)** |
| kpa_status (진단용) | km.status | — | `kpa_members.status` (mirror — sm.status 와 다를 수 있음) |
| membership_type | km.membership_type | — | `kpa_members.membership_type` |
| activity_type | km.activity_type | — | **`kpa_members.activity_type`** (SSOT 가 아닌 mirror!) |
| capabilities (역할 칩) | batch `role_assignments(is_active=true)` per user | — | `role_assignments` (SSOT) |
| pharmacy_name | km.pharmacy_name | — | `kpa_members.pharmacy_name` |
| business_info | km/user join | (edit 시 PATCH) | `users.businessInfo` JSONB |
| 가입 승인 (pending → active) | — | `PATCH /api/v1/kpa/members/:id/status` body=`{status:'active'}` | `users.status=active` + `service_memberships.status=active` + `kpa_pharmacist_profiles/.student_profiles` upsert + **auto-activate pharmacy_owner (회원의 activity_type='pharmacy_owner' 시)** |
| 회원 정보 수정 (activity_type / pharmacy_name / 사업자번호 등) | — | `PATCH /api/v1/kpa/members/:id/info` | `kpa_members.*` + `kpa_pharmacist_profiles.activity_type` (SSOT sync) + role grant/revoke + organization 자동 생성 |
| 반려 / 정지 | — | `PATCH .../status` body=`{status:'rejected'/'suspended'}` → `MembershipApprovalService.suspendMembership()` | service_memberships.status + role_assignments.is_active=false |
| 탈퇴 처리 | — | `PATCH .../status` body=`{status:'withdrawn'}` 또는 `DELETE /kpa/members/:id` (soft) → `MembershipApprovalService.withdrawMembership()` | sm.status='withdrawn' + role_assignments(서비스 prefix).is_active=false + kpa_members.status='withdrawn' + organization_members(role='member') DELETE |

---

### 2-3. 매장 경영자 신청 처리 (`/operator/pharmacy-requests` — [PharmacyRequestManagementPage.tsx](services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx))

| 항목 | API | DB |
|---|---|---|
| 대기 리스트 | `GET /api/v1/kpa/pharmacy-requests/pending` | `kpa_pharmacy_requests` (status='pending') + service_memberships join (user enrich) |
| 승인 | `PATCH /kpa/pharmacy-requests/:id/approve` | organizations(`kpa-pharm-{biz}`) ensure + organization_members(owner) + kpa_pharmacist_profiles(activity_type='pharmacy_owner') upsert + role_assignments(`kpa:store_owner`) |
| 반려 | `PATCH /kpa/pharmacy-requests/:id/reject` | status='rejected' + review_note 저장 |

> **이 큐의 정체성**: auto-activation 실패 / 다른 직역 / 자동 부여 prerequisite 미충족 사용자의 **manual fallback**. (관련 IR `IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1` §5).
> 자동 부여 성공 사용자는 이 큐를 거치지 않음 → operator 화면에 자동 부여 회원은 **다른 경로** (회원 정보 수정 + 자동 부여 트리거 / 가입 승인의 inline 부여) 로 처리됨.

---

## 3. 라벨·값 비교표

### 3-1. activity_type (직역)

| 값 | 사용자 프로필 라벨 | operator 라벨 | 라벨 source | 일치? |
|---|---|---|---|:---:|
| `pharmacy_owner` | 약국 개설자 | 약국 개설자 | `ACTIVITY_TYPE_LABELS` (AuthContext.tsx) — 양쪽 import 동일 | ✅ |
| `pharmacy_employee` | 약국 근무 약사 | 약국 근무 약사 | 동상 | ✅ |
| `hospital` | 병원 약사 | 병원 약사 | 동상 | ✅ |
| `manufacturer` / `importer` / `wholesaler` / `other_industry` / `government` / `school` / `other` / `inactive` | (동일) | (동일) | 동상 | ✅ |

→ **라벨 일치 ✅**. operator (`MemberManagementPage.tsx:43`) 와 profile (`MyProfilePage.tsx:19`) 모두 `ACTIVITY_TYPE_LABELS` from `'../../contexts/AuthContext'` import.

### 3-2. capability / role 라벨

| 값 | profile 라벨 | operator 라벨 | 일치? |
|---|---|---|:---:|
| `kpa:store_owner` | "매장 운영 권한" (카드 제목) | "매장 운영" (capability chip, `CAPABILITY_LABELS`) | ⚠️ 부분 일치 (의미는 같으나 표기 다름) |
| `kpa:admin` / `kpa:operator` | (profile 미노출) | (operator-ux-core 라벨 매핑) | N/A |

→ **부분 일치 ⚠️** — "매장 운영" vs "매장 운영 권한" 의 미세 표기 차이. semantic 동일.

### 3-3. status (회원 상태)

| 값 | 라벨 | profile 표시 | operator 표시 |
|---|---|---|---|
| `pending` | 가입 대기 | (자기 자신: 가입 단계 화면 별도) | 노란색 chip |
| `active` | 활동 중 | (기본 노출) | 녹색 chip |
| `suspended` | 정지 | ? (별도 안내 화면) | 빨간색 chip |
| `rejected` | 반려 | ? | 회색 chip |
| `withdrawn` | 탈퇴 | ? (재가입 안내?) | 회색 chip |

→ **profile 측 status 노출 정책 불명** — withdrawn / suspended 상태 사용자의 `/mypage/profile` 접근 시 화면 동작은 별도 검증 필요 (본 IR 범위 외 — §10).

### 3-4. 사업자 정보 필드 라벨

| 필드 | profile 라벨 | profile 값 source | operator 라벨 | operator 값 source | 일치? |
|---|---|---|---|---|:---:|
| 약국명 | 약국명 | `businessInfo.businessName` | 약국명 | `kpa_members.pharmacy_name` (별도 컬럼!) | ⚠️ 다른 컬럼 |
| 대표자명 | 대표자명 | `businessInfo.ceoName` (legacy fallback `representativeName`) | (operator 측은 type 정의에서 legacy 만 선언) | `business_info.representativeName` | 🔴 type drift |
| 세금계산서 이메일 | 세금계산서 이메일 | `businessInfo.taxInvoiceEmail` (legacy fallback `taxEmail`) | (operator 측 legacy 만 선언) | `business_info.taxEmail` | 🔴 type drift |
| 사업자번호 | 사업자등록번호 | `businessInfo.businessNumber` | 사업자번호 | `business_info.businessNumber` | ✅ |
| 매장 주소 | 약국 주소 | `businessInfo.storeAddress.{zipCode/baseAddress/detailAddress}` (canonical) + legacy fallback (`address`/`address2`/`zipCode`) | `pharmacy_address` (선택적 컬럼) | `kpa_members.pharmacy_address` | ⚠️ 다른 컬럼 |
| 약국 전화번호 | 약국 전화번호 | `businessInfo.phone` | (operator 측 표시 여부 별도 확인) | — | — |

→ **M5 위험 확정**: operator `KpaMember.business_info` type 이 legacy key 만 선언 ([MemberManagementPage.tsx:75-80](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L75-L80)) — backend 가 canonical 정규화하면 type 가 falsy 로 표시될 위험. 또한 약국명 / 약국 주소 는 두 곳 (`businessInfo` vs `kpa_members.pharmacy_name/.pharmacy_address`) 에 저장되어 divergence 가능.

---

## 4. Mismatch 가능 지점 목록 (상세)

### M1: activity_type stale (사용자 측)

**시나리오**:
1. operator 가 `PATCH /kpa/members/:id/info` 로 회원의 activity_type 변경
2. 사용자가 로그인 상태로 `/mypage/profile` 진입 — `user.activityType` 는 login 직후 fetch 된 값 (stale)
3. profile 의 직역 표시가 변경 전 값

**근거**:
- `AuthContext` 의 `user.activityType` 는 `/kpa/me-context` async fetch 결과 ([Agent #1 mapping, MyProfilePage.tsx 사용처])
- 재fetch 트리거 = 로그인 / `checkAuth()` 호출 / 페이지 reload
- profile 내부 자동 polling 없음

**해소 후보**:
- `MyProfilePage` mount 시 `checkAuth()` 강제 호출 (성능 영향 검토)
- 또는 `/kpa/me-context` 결과를 매 navigation 마다 refresh
- 또는 operator 변경 시 사용자 측 invalidation 신호 (낮은 비용 / 큰 작업)

### M2: auto-activation skip 의 silent fail

**시나리오** ([member.controller.ts:1081-1099](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1081-L1099)):
1. operator 가 회원 activity_type 을 `pharmacy_owner` 로 변경
2. 사용자의 `users.businessInfo.businessNumber` 또는 약국명 누락 → backend 가 `changes._store_owner_activation = 'skipped:missing:사업자번호,약국명'` 기록 + `warnings[]` 에 메시지 추가
3. operator 는 응답 `warnings[]` 확인 가능 (UI 표시 여부 별도 확인)
4. **사용자는 신호 없음** — profile 의 capability 카드 = `unsubmitted` (다른 직역으로 보였다가) → 사용자 입장에선 "왜 매장 권한이 없는가?" 만 인지

**해소 후보**:
- profile capability 카드에 "운영자가 사업자번호 / 약국명 정보 보완 요청 중" 신호 추가 (`changes._store_owner_activation` 상태를 사용자 read API 로 노출)
- 또는 audit_log 에서 user-facing notification 생성

### M3: 매장 운영 권한 상태 view 불일치

**read source 차이**:
- profile capability 카드: `pharmacy_requests/my` 최신 row (status) + `user.roles.includes('kpa:store_owner')`
- operator member list: `capabilities[]` from `role_assignments(is_active=true)`
- operator pharmacy_requests 큐: `kpa_pharmacy_requests` 별도 테이블

**시나리오**:
- 사용자 A: pharmacy_request 제출 → operator 가 `pharmacy-requests/:id/approve` 처리 → 자동 부여 → role_assignments 추가 + pharmacy_request.status='approved'. 양쪽 view 모두 "승인" 일관.
- 사용자 B: operator 가 회원 정보 수정으로 activity_type='pharmacy_owner' 변경 + 자동 부여 성공 → role_assignments 추가, **but pharmacy_request row 없음**. profile 카드: `hasStoreOwnerRole=true` → "승인 완료" 표시. operator pharmacy_requests 큐: 안 보임. (정상)
- 사용자 C: 동일 시나리오에서 자동 부여 skip → role_assignments 없음 + pharmacy_request row 없음. profile 카드: `unsubmitted` (사용자는 자기 직역이 pharmacy_owner 라도 신청한 적 없음 안내). operator member list: activity_type='pharmacy_owner' 보이나 capabilities 없음. **operator 와 사용자 사이 신호 단절**.

### M4: activity_type 이중 저장 read 불일치

**저장 위치**:
- `kpa_pharmacist_profiles.activity_type` — 명목 SSOT (auth-account.controller.ts `/auth/me/profile` 가 1차 write)
- `kpa_members.activity_type` — denormalization mirror (위 동일 트랜잭션 내 동기)

**read 위치**:
- profile (`/kpa/me-context`): `kpa_pharmacist_profiles.activity_type` (SSOT)
- operator list (`/kpa/members`): `kpa_members.activity_type` (mirror)
- operator member info edit: `kpa_members.activity_type` write + `kpa_pharmacist_profiles.activity_type` SSOT sync

**위험**:
- sync 가 silent fail (try-catch around UPSERT, console.error only — [member.controller.ts:1053-1055](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1053-L1055)) 시 두 값 divergence
- 정합성 모니터링 / 정기 reconcile 부재

### M5: operator 측 legacy type 잔존

[MemberManagementPage.tsx:75-80](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx#L75-L80):
```ts
business_info?: {
  businessNumber: string | null;
  businessName: string | null;
  representativeName: string | null;  // legacy
  taxEmail: string | null;             // legacy
} | null;
```

**현실**:
- Backend 응답 (member.controller.ts list 정규화) 은 `ceoName` (fallback `representativeName`) + `taxInvoiceEmail` (fallback `taxEmail`) 형태로 정규화 (Agent #2 보고).
- frontend type 이 canonical key 미선언 → canonical 만 채워진 응답이면 `representativeName` / `taxEmail` 가 `null` 로 보임 → operator UI 빈 칸.

**위험도 LOW** (legacy fallback 가 작동 중이라 backend 가 양쪽 다 채울 가능성 높음. 단 정렬 부재).

### M6: JWT user.roles stale (별도 추적)

`IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1` 에서 이미 추적됨. 본 IR 은 cross-reference 만 기재.

### M7: withdrawal 의 owner 잔존 + 사용자 불가시 신호

[MembershipApprovalService.ts:679-718] (Agent #3 보고):
- withdrawal 시 `organization_members.role='member'` 만 DELETE — owner/admin/operator 는 잔존 + audit warning 만 기록.

**위험**:
- 약국 owner 가 KPA 회원에서 탈퇴 → `kpa:store_owner` role 은 deactivate, but `organizations(type='pharmacy')` + `organization_members(role='owner')` 잔존 → 다른 staff 접근 / 매장 노출 정책 모호.
- 사용자 profile: 탈퇴 직후 화면 동작 unverified.
- operator 화면: `status='withdrawn'` 표시되나 owner 잔존 사실은 추가 view 없이 미노출 (audit log 만).

---

## 5. 화면별 cross-write 영향 매트릭스

| 변경 source | 변경 대상 (write) | profile 측 영향 | operator 측 영향 |
|---|---|---|---|
| **사용자 self** (`PATCH /auth/me/profile`) | `kpa_pharmacist_profiles.activity_type` + `kpa_members.activity_type` + `users.businessInfo` + (pharmacy_owner→other 시) `role_assignments.is_active=false` | 즉시 반영 (자기 trigger) | next list refresh 시 반영 |
| **사용자 self** (`PUT /mypage/profile`) | `users.{first,last,phone,email}` + `kpa_pharmacist_profiles.{university,workplace}` | 즉시 | next refresh |
| **operator member edit** (`PATCH /kpa/members/:id/info`) | `kpa_members.*` + SSOT sync + role grant/revoke + organization 생성 | **stale (M1)** — `checkAuth()` 없이는 user.activityType / user.roles / hasStoreOwnerRole 모두 stale | 즉시 |
| **operator 가입 승인** (`PATCH /kpa/members/:id/status` to 'active') | `users.status='active'` + sm.status + km.status + pharmacist/student profile upsert + auto-activate 분기 | **stale** + 다음 로그인 시 `/kpa/me-context` 가 fresh | 즉시 |
| **operator pharmacy 신청 승인** (`PATCH /kpa/pharmacy-requests/:id/approve`) | organizations + organization_members(owner) + kpa_pharmacist_profiles(activity_type='pharmacy_owner') + role_assignments(kpa:store_owner) | **stale** — user.roles 갱신 안 됨 → `/store-hub` 접근 시 IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1 의 chain 트리거 | 즉시 (queue 에서 제거) |
| **operator 정지/반려/탈퇴** | sm.status + role_assignments.is_active=false (+ withdraw 시 km.status + organization_members(member) DELETE) | **사용자 측 surface 미정** — MembershipGate 동작이지만 profile 화면 표시 unverified | 즉시 |

---

## 6. 즉시 수정 가능 / 정책 필요 / 보류 분류

### 6-1. 즉시 수정 가능 (Phase 1 — 작은 변경)

| ID | 항목 | 대상 파일 | 작업 크기 |
|---|---|---|---|
| Q1 | operator `KpaMember.business_info` type 에 canonical key (`ceoName`, `taxInvoiceEmail`) 추가 (legacy fallback 유지) | `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx:75-80` + EditModal | S |
| Q2 | profile capability card 라벨 통일 ("매장 운영 권한" ↔ operator "매장 운영" 둘 중 하나로 정렬) | `MyProfilePage.tsx` + `@o4o/operator-ux-core` CAPABILITY_LABELS | S |
| Q3 | `MyProfilePage` mount 시 / focus 복귀 시 `checkAuth()` 호출 → activity_type / roles refresh (M1 부분 해소) | `MyProfilePage.tsx` | S-M |

### 6-2. 정책 결정 필요 (Phase 2)

| ID | 결정 사항 | 영향 |
|---|---|---|
| P1 | auto-activation skip warning 을 사용자에게 어떻게 노출할 것인가 (profile capability card 의 새 상태 vs 별도 알림) | M2 해소 |
| P2 | activity_type SSOT read 통일 (operator list 가 `kpa_pharmacist_profiles.activity_type` 직접 read 로 전환할 것인가) | M4 해소 |
| P3 | 매장 운영 권한 status 의 unified view 정의 (`role` + `pharmacy_request.status` 의 union 의 의미 / 화면 표기 정책) | M3 해소 |
| P4 | withdrawal 시 owner 잔존 정책 — 신호를 어디에 / 누가 본 후속 처리 흐름은? | M7 해소 |
| P5 | JWT roles stale 의 근본 해소 (re-issue / refresh 패턴) — 별도 IR/WO 진행 중 | M6 |

### 6-3. 보류 (조사 후속 / 별도 IR)

| ID | 항목 | 사유 |
|---|---|---|
| H1 | 사용자 status (suspended / withdrawn / rejected) 가 profile 화면 동작에 미치는 영향 verification | 본 IR 코드 흐름만, MembershipGate / profile 별도 동작 별도 trace 필요 |
| H2 | `users.businessInfo` ↔ `organizations` ↔ `organization_members` bidirectional sync 부재 (관련 IR 다수 추적) | IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1 §N1 / N2 / N3 에서 추적 중 |
| H3 | mobile app / API 외부 consumer 의 stale 영향 | 본 IR 범위 외 |

---

## 7. 후속 WO 후보

본 IR 은 조사만. 아래는 향후 WO 작성 시 후보 — **본 IR 단계에서 WO 작성 / 코드 수정 / commit 금지**.

### Phase 1 (작은 정렬)

- **WO-O4O-KPA-OPERATOR-MEMBER-LIST-BUSINESSINFO-TYPE-CANONICAL-ALIGN-V1**: operator KpaMember type 에 canonical key 추가. legacy fallback 유지. (Q1)
- **WO-O4O-KPA-CAPABILITY-LABEL-NORMALIZE-V1**: "매장 운영" / "매장 운영 권한" 단일화 + CAPABILITY_LABELS 정렬. (Q2)
- **WO-O4O-KPA-MYPROFILE-AUTH-REFRESH-ON-MOUNT-V1**: MyProfilePage mount + visibility 복귀 시 `checkAuth()` 호출. (Q3)

### Phase 2 (정책 결정 + 구조)

- **WO-O4O-KPA-AUTO-ACTIVATION-USER-SURFACE-V1**: profile capability card 에 auto-activation skip 신호 / 보완 요청 표시. (P1)
- **WO-O4O-KPA-OPERATOR-LIST-ACTIVITY-TYPE-SSOT-READ-V1**: operator member list 의 activity_type read source 를 `kpa_pharmacist_profiles` 로 통일. (P2)
- **WO-O4O-KPA-STORE-OWNER-CAPABILITY-UNIFIED-VIEW-V1**: role + pharmacy_request union view 의 의미 / API / 화면 표기 정의. (P3)

### Phase 3 (반응형 staleness 해소 — 큰 작업)

- JWT roles stale 의 근본 해소 (별도 IR 결정)
- AuthContext 의 `user.activityType` polling / SSE / invalidation 정책

### Phase 4 (운영 검증 — 선행 prerequisite)

- DB sync 정합성 검사 스크립트 (`kpa_pharmacist_profiles.activity_type` vs `kpa_members.activity_type` divergence row count)
- auto-activation skip 카운트 (audit log 의 `changes._store_owner_activation = 'skipped'` 집계)

---

## 8. dead UI / dead field 발견

본 IR 시각에서 발견된 항목 (다른 IR 에서 이미 추적 중인 항목은 cross-ref):

| 항목 | 위치 | 판정 | cross-ref |
|---|---|:---:|---|
| `kpa_members.pharmacy_address` (별도 컬럼) | km 엔티티 | ⚠️ 부분 dead — businessInfo.storeAddress 도입 후 source-of-truth 모호. operator list 노출 / 사용자 profile 미사용 (storeAddress 우선) | IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1 |
| `kpa_members.pharmacy_name` (별도 컬럼) | km 엔티티 | ⚠️ businessInfo.businessName 과 중복. profile read 는 storeAddress / businessName 우선 / km.pharmacy_name 미사용 (operator list 만 사용) | 동상 |
| `representativeName` / `taxEmail` (legacy keys in businessInfo) | users.businessInfo JSONB | 🟡 fallback 으로만 유효. canonical write 후 deprecation 경로 미정 | IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1 |
| profile capability card 의 "신청" CTA → `/pharmacy` → `/pharmacy/approval` chain | MyProfilePage capability section | 🟠 auto-activation 정책 도입 후, role 미보유 사용자만 노출되지만 chain 의 사용자 경험은 별도 정비 필요 | IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1 |
| `kpa_members.identity_status` (active/suspended/withdrawn) | km 엔티티 | ⚠️ km.status 와 별도 컬럼. semantic separation 의 의도는 있지만 frontend 어느 화면에서도 노출 안 됨 | (본 IR 신규 발견) |

→ **identity_status 가 새로운 dead field 후보** — frontend 미사용. backend 의 withdrawal flow 가 km.status 와 함께 갱신하나, 운영자/사용자 view 에 노출 안 됨. **의도된 백엔드-only 필드인지 확인 필요** (`WO-O4O-KPA-MEMBER-STATUS-SEMANTICS-SEPARATION-V1` 의 의도 확인).

---

## 9. 운영 데이터 검증 prerequisite (본 IR 범위 외)

코드 흐름만 매핑함. 아래는 별도 작업으로 운영 데이터 확인이 필요한 항목:

1. `kpa_pharmacist_profiles.activity_type` vs `kpa_members.activity_type` divergence row count
2. `users.businessInfo` 의 canonical 키 (`ceoName`, `taxInvoiceEmail`, `storeAddress`) 채워진 비율 vs legacy 키 (`representativeName`, `taxEmail`, `address`/`address2`/`zipCode`) 만 채워진 비율
3. `role_assignments(kpa:store_owner, is_active=true)` 보유 user 중 `kpa_pharmacist_profiles.activity_type` 가 `pharmacy_owner` 가 아닌 row 수 (sync skew)
4. `users.status='active'` + `service_memberships(kpa-society).status='active'` + `kpa_members.status='active'` 가 일치하지 않는 user count
5. `organization_members(role='owner', left_at IS NULL)` 보유 user 중 `service_memberships(kpa-society).status='withdrawn'` 인 row (M7 의 실제 발생 수)
6. audit log 에서 `_store_owner_activation = 'skipped'` 카운트 (M2 의 발생 빈도)

→ 각 항목은 별도 CHECK 작업으로 분리. SELECT-only.

---

## 10. 본 IR 범위 외 (후속)

1. profile 화면이 status=`suspended`/`withdrawn`/`rejected` 사용자에게 어떻게 동작하는지 실제 trace (MembershipGate / 화면 분기)
2. operator EditUserModal (`admin-dashboard` 측) 의 동작 검증 — IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1 §N2 와 연계
3. mobile-app / API 외부 consumer 의 stale 영향
4. PharmacyInfoPage (`/store/info`) 와 MyProfilePage 사이의 약국 정보 sync — 부분 추적 IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1
5. role grant / revoke 의 트랜잭션 atomicity (현재 try-catch silent fail allow 패턴) — RBAC freeze 정책과 정렬 검토 필요
6. KPA-society 외 서비스 (GlycoPharm / K-Cosmetics) 의 동등 profile/operator 화면 정합성 — 본 IR 은 KPA-only

---

## 11. 참조

### 핵심 코드 (Profile 측)
- [MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx) — profile 화면
- [MySettingsPage.tsx](services/web-kpa-society/src/pages/mypage/MySettingsPage.tsx) — 탈퇴 요청
- [contexts/AuthContext.tsx](services/web-kpa-society/src/contexts/AuthContext.tsx) — `user.activityType`, `user.roles`, `ACTIVITY_TYPE_LABELS`
- [api/mypage.ts](services/web-kpa-society/src/api/mypage.ts) — `mypageApi.getProfile()`
- [api/pharmacyRequestApi.ts](services/web-kpa-society/src/api/pharmacyRequestApi.ts) — capability fetch

### 핵심 코드 (Operator 측)
- [MemberManagementPage.tsx](services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) — operator 회원관리
- [PharmacyRequestManagementPage.tsx](services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx) — 매장 경영자 신청 처리

### 핵심 코드 (Backend)
- [member.controller.ts:533-619](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L533-L619) — auto-activation
- [member.controller.ts:1044-1130](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1044-L1130) — operator member info edit + grant/revoke
- [auth-account.controller.ts:106-275](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L106-L275) — `/auth/me/profile` + `/auth/status`
- [me-context.controller.ts:30-121](apps/api-server/src/routes/kpa/controllers/me-context.controller.ts#L30-L121) — `/kpa/me-context`
- [pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts) — manual fallback flow
- [MembershipApprovalService.ts](apps/api-server/src/services/approval/MembershipApprovalService.ts) — withdraw / suspend

### 핵심 엔티티
- `KpaMember` ([kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts))
- `KpaPharmacistProfile` ([kpa-pharmacist-profile.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacist-profile.entity.ts))
- `KpaStudentProfile` ([kpa-student-profile.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-student-profile.entity.ts))
- `KpaPharmacyRequest` ([kpa-pharmacy-request.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacy-request.entity.ts))
- `RoleAssignment` ([RoleAssignment.ts](apps/api-server/src/modules/auth/entities/RoleAssignment.ts))
- `User` ([User.ts](apps/api-server/src/modules/auth/entities/User.ts))

### 연관 IR
- [IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1](docs/investigations/IR-O4O-BUSINESS-CANONICAL-POLICY-ALIGNMENT-V1.md)
- [IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1](docs/investigations/IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1.md)
- [IR-O4O-KPA-ACTIVITY-TYPE-CHANGE-FLOW-AUDIT-V1](docs/investigations/IR-O4O-KPA-ACTIVITY-TYPE-CHANGE-FLOW-AUDIT-V1.md)
- [IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1](docs/investigations/IR-O4O-KPA-PHARMACY-OWNER-POST-APPROVAL-ACCESS-FLOW-AUDIT-V1.md)
- [IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1](docs/investigations/IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1.md)
- [IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1](docs/investigations/IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1.md)

### Canonical 기준 문서
- `docs/architecture/USER-OPERATOR-FREEZE-V1.md` — User/Operator 3-table SSOT
- `docs/rbac/RBAC-CANONICAL-STATE-V1.md` — role_assignments 단일 소스
- `docs/architecture/O4O-CORE-FREEZE-V1.md` — Auth/Membership/Approval/RBAC core

---

*조사 전용 — 코드 / DB / migration / UI / contract 수정 없음. 본 IR 단계에서 후속 WO 작성 금지. **commit / push 금지** (IR 정책) — IR 파일은 working tree 에 두고 결정 대기.*
