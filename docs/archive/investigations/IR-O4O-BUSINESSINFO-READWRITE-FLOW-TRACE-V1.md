# IR-O4O-BUSINESSINFO-READWRITE-FLOW-TRACE-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB/migration/UI/contract 수정 없음, **commit/push 안 함**)
**대상**: 사업자 정보 (users.businessInfo + organizations + kpa_members + kpa_pharmacy_requests + neture_suppliers) 의 **실제 코드 read/write 흐름** end-to-end trace.

**조사 목적**:
- 선행 IR 이 매핑한 SSOT 구조의 **실제 운영 동작** 검증
- canonical source 후보 확정 + overwrite hotspot 정확 라인 + organization ensure lifecycle 완전 매핑
- runtime consumer (실제 다운스트림) 식별

**선행 IR**:
- `IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1` (entity / schema / SSOT 후보 매핑)
- `IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1` (auto-activation 흐름)

**방법론**:
- 4 개 Explore agent 병렬 (businessInfo write/read / organizations lifecycle / 3 flow E2E / cross-cutting fields + runtime consumers)
- 본 작성자 직접 grep + Read 로 모순 해소 (특히 A1 ↔ A3 의 EditUserModal endpoint 모순)
- 모든 finding 은 `file:line` 단위 인용

---

## 0. 결론 요약

> **결론: 선행 IR 의 SSOT 구조 매핑은 대체로 정확하나, 본 IR 의 코드 trace 가 6 가지 핵심 정정 + 5 가지 신규 위험 발견.**

### 0-1. 선행 IR 의 정정 사항

| # | 선행 IR 진술 | 본 IR 정정 |
|---|---|---|
| C1 | "users.businessInfo write 흐름 5 개" | **실제 7 개 write entrypoint** (Auth Profile + KPA mypage + Account-linking 추가) |
| C2 | "businessInfo → organizations 단방향 일회성 sync (auto-activation 시만)" | **3 곳에서 trigger** (member 승인 + PATCH /auth/me/profile + PATCH /kpa/members/:id/info) |
| C3 | "Neture supplier → organizations 통합 design only (미실행)" | **이미 실행 중** — register 시 inactive org 생성 + approve 시 activate + profile update 시 org sync |
| C4 | "tax invoice email 5 곳 drift, 최우선 정비 후보" | **세금계산서 생성 시스템 자체 부재** — 정비 시급도 낮음, 향후 invoice 시스템 구축 시 미리 정렬 |
| C5 | "Neture supplier organizations 연결 없음" | **`organizations` 와 양방향 연결** (`syncSupplierOrganization`), 단 supplier-specific 필드는 별도 |
| C6 | EditUserModal businessInfo 처리 미확정 | **저장됨** (MembershipConsoleController.updateMember:799-826), A3 의 silent discard 우려는 KPA-society 흐름 외 (admin-dashboard 측 별도) |

### 0-2. 본 IR 의 신규 위험 발견

| # | 위험 | 심각도 | 위치 |
|---|---|:---:|---|
| N1 | **FLOW P (PATCH /auth/me/profile) 비-원자적** | 🔴 HIGH | 4 개 serial query (kpa_pharmacist_profiles + kpa_members + users.businessInfo + role_assignments), partial failure 시 불일치 가능 |
| N2 | **FLOW O (PUT /admin/users/:id) businessInfo silent discard** | 🔴 HIGH | admin-dashboard 측 AdminUserController.updateUser:337-356 — KPA-society 흐름 외에도 admin-dashboard 가 이 엔드포인트 사용 시 사업자 정보 손실 |
| N3 | **`pharmacy_owner` → other 전환 시 organizations record orphan** | 🟠 MID | role_assignments 만 deactivate, organizations 자체는 미삭제 → stale 데이터 잔존 |
| N4 | **세금계산서 발행 시스템 부재 — `taxInvoiceEmail` dead data 가능성** | 🟡 LOW (현재) / 🟠 MID (향후) | 5 곳 수집되지만 operator display 외 consumer 없음. 향후 invoice 도입 시 어느 데이터가 정답인지 결정 어려움 |
| N5 | **Dead writes 4 건** | 🟡 LOW | `users.businessInfo.address2`, `users.businessInfo.zipCode`, `kpa_pharmacy_requests.pharmacy_phone/owner_phone`, `glycopharm_applications.metadata` — write 됨 but read 안 됨 |

### 0-3. 핵심 질문 답변 (요약)

| 질문 | 답 |
|---|---|
| `users.businessInfo` 는 무엇인가? | **3-역할 동시 수행**: ① form input cache (signup/profile/operator edit) ② runtime denormalized copy (operator/admin display) ③ organization ensure 의 read source. SSOT 아님 — input/cache layer |
| `organizations` 는 실제 SSOT 인가? | **partial SSOT** — create + update + read 경로 모두 존재하나 reverse sync 부재. `users.businessInfo` 와 `organizations` 가 stale divergence 위험 |
| business canonical source 는 어디인가? | **read context 별로 다름** — KPA store-owner 의 사업자 정보는 `organizations.address_detail` + `organizations.metadata.taxInvoiceEmail` 가 de-facto SSOT. operator member list 의 사업자 정보는 `users.businessInfo` 가 source. **단일 SSOT 없음** |
| operator/profile/register 가 동일 source 를 쓰는가? | **NO** — Register/Profile 은 `users.businessInfo` write, Operator (KPA-society) 는 `users.businessInfo` + `kpa_members` write (atomic transaction 아님), Operator (admin-dashboard 가능성) 은 silent discard |
| `taxInvoiceEmail` canonical home 은? | **현재 5 곳 분산 + 다운스트림 consumer 부재**. 정책 결정 시점은 invoice 시스템 도입 시. 현재 de-facto = `organizations.metadata.taxInvoiceEmail` (KPA store) 또는 `neture_suppliers.tax_email` (Neture) |
| address canonical home 은? | **`organizations.address_detail` (jsonb StoreAddress) = 표준**. `users.businessInfo.storeAddress` 는 fallback. `kpa_members.pharmacy_address` (varchar) 는 denormalized cache |
| organization ensure 의 lifecycle 은? | **4 ensureOrganization 호출 사이트** — KPA member approval (auto), KPA pharmacy_request approval (manual), Neture supplier register (inactive), Neture supplier approval (activate). 모두 `created` boolean 받지만 side-effects 분기에 사용 안 함 |

---

## 1. 조사 방법 + 이전 IR 정정

### 1-1. 4 개 병렬 agent 결과 종합

| Agent | Scope | 주요 산출 |
|---|---|---|
| A1 | `users.businessInfo` write/read 전수 | 7 write entrypoint, 9 read consumer, 3 free-field hotspot |
| A2 | `organizations` lifecycle | 8 create, 6 update, 10 read, 4 ensure call site, 5 metadata jsonb 키 |
| A3 | Register / Self-Profile / Operator-Edit E2E | atomic transaction 비교, cross-flow source 분석 |
| A4 | Cross-cutting 4 field family + runtime consumer | de-facto source per service, **세금계산서 시스템 부재 확인**, dead writes 4 건 |

### 1-2. A1 ↔ A3 모순 해소

A1 과 A3 가 **EditUserModal 의 backend handler 에 대해 다른 결론** 보고:
- **A1**: `MembershipConsoleController.updateMember:799-826` — businessInfo 저장됨
- **A3**: `AdminUserController.updateUser:337-356` — businessInfo silent discard

직접 검증 ([EditUserModal.tsx:159](services/web-kpa-society/src/pages/operator/EditUserModal.tsx#L159)):

```typescript
await apiFetch(`/api/v1/operator/members/${userId}`, {
  method: 'PUT',
  body: JSON.stringify(payload),
});
```

→ KPA-society 의 EditUserModal 은 `/api/v1/operator/members/{userId}` 으로 보내며, 이 endpoint 는 **MembershipConsoleController.updateMember** 가 처리 (A1 맞음). businessInfo **저장됨**.

**A3 의 silent discard 우려는 admin-dashboard 측 별도 EditUserModal** (`packages/ui/src/operator-user-detail/EditUserModal.tsx`) 의 경로. KPA-society 흐름과 별개. → admin-dashboard 측 EditUserModal 이 어느 endpoint 로 보내는지는 본 IR 범위 외 (별도 조사 가치 — 위험 N2 참조).

### 1-3. 이전 IR 의 6 가지 정정 사항 상세

선행 IR (`IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1`) 와의 차이:

#### C1: businessInfo write entrypoint 5 → 7

선행 IR 매핑:
1. RegisterModal → POST /auth/register
2. EditUserModal → PUT /operator/members/{userId}
3. PharmacyApprovalGate → POST /pharmacy-requests (실제로는 kpa_pharmacy_requests, businessInfo 아님)
4. PharmacyInfoPage → PUT /pharmacy/info (실제로는 organizations, businessInfo 아님)
5. MyProfilePage (read-only)

본 IR 추가 발견:
- **WRITE-2**: `PATCH /auth/me/profile` → auth-account.controller — businessInfo PARTIAL_MERGE + activity_type=pharmacy_owner 시 org sync
- **WRITE-3**: `PATCH /kpa/mypage/profile` → mypage.service:138-147 — businessInfo.metadata.workplace 만
- **WRITE-5**: `PATCH /kpa/members/:id/info` → member.controller:1020-1037 — operator 가 activity_type/businessNumber 보완 + 조건부 org sync
- **WRITE-6**: account-linking.service:553-558 — 계정 merge 시 sourceUser.businessInfo → targetUser
- **WRITE-7**: user.service:116-117 — 내부 setter (rare)

#### C2: businessInfo → organizations sync 가 3 곳에서 trigger

선행 IR: "auto-activation (운영자 승인) 시만"

본 IR:
1. **member.controller:550-614** (운영자 회원 승인 — pending→active + activity_type=pharmacy_owner)
2. **auth-account.controller:148-159** (PATCH /auth/me/profile — self-profile 에서 activity_type=pharmacy_owner 진입 시)
3. **member.controller:1020-1037** (PATCH /kpa/members/:id/info — operator 가 activity_type 변경)

#### C3: Neture supplier 통합

선행 IR: "WO-O4O-NETURE-ORG-DATA-MODEL-V1 design only, 미실행"

본 IR: **이미 실행 중** —
- `supplier.service.ts:99` `registerSupplier` → `syncSupplierOrganization` → `organizations(type='supplier', code=neture-{slug}, isActive=false)` 생성
- `supplier.service.ts:142` approve → `setOrgActive(true)` + role assign
- `supplier.service.ts:612-641` profile update → organizations.business_number/address/phone/address_detail update

단, `neture_suppliers.representative_name`, `manager_name`, `manager_phone`, `tax_email` 등은 organizations 에 매핑 안 됨 → supplier 자체 테이블이 그 데이터의 SSOT.

#### C4: taxInvoiceEmail 정비 시급도

선행 IR: "최우선 정비 후보"

본 IR: **세금계산서 발행 시스템 자체 부재 확인** (A4 직접 grep) — `invoice.*generate`, `settlement.*generate`, `tax.*generate` 검색 결과 무관한 연회비 invoice 만 발견. taxInvoiceEmail 은 5 곳 수집되지만 **operator display 외 다운스트림 consumer 없음**. 정비 시급도 낮음, 향후 invoice 시스템 구축 시 사전 정렬 필요.

#### C5: Neture supplier ↔ organizations 연결

선행 IR: "연결 없음"

본 IR: **양방향 연결**, 단 partial — `neture_suppliers.user_id` (non-enforced FK) + `organizations.metadata.netureSupplierSlug` (reverse lookup). 단 supplier-specific 컬럼은 organizations 표준 컬럼으로 sync 안 됨.

#### C6: EditUserModal backend handler

§1-2 참조.

---

## 2. businessInfo Read/Write Flow Map

### 2-1. 7 Write Entrypoint

| ID | Entrypoint | File:Line | Mode | Fields | Org Sync | Overwrite Hazard |
|---|---|---|---|---|:---:|---|
| W1 | RegisterModal `POST /auth/register` | [auth-register.controller.ts:230-238](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L230-L238) | FULL_REPLACE | businessName, businessNumber, businessType, businessCategory, phone, address, address2, zipCode, storeAddress (dual-write), email (overwrite from taxEmail!), representativeName (free field!) | NO (org 은 approval 시 생성) | 🚨 taxEmail → email, representativeName free field |
| W2 | MyProfile `PATCH /auth/me/profile` | [auth-account.controller.ts:148-159](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts#L148-L159) | PARTIAL_MERGE | businessName, phone, storeAddress, address, address2, zipCode | YES (activity_type=pharmacy_owner 시 ensure) | 없음 (allowed list 화이트리스트) |
| W3 | KPA mypage `PATCH /kpa/mypage/profile` | [mypage.service.ts:138-147](apps/api-server/src/routes/kpa/services/mypage.service.ts#L138-L147) | PARTIAL_MERGE (metadata only) | metadata.workplace | NO | 없음 |
| W4 | Operator `PUT /operator/members/:userId` | [MembershipConsoleController.ts:799-826](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L799-L826) | PARTIAL_MERGE | businessName, businessNumber, email (overwrite from taxEmail!), businessType, businessCategory, zipCode, address, address2, storeAddress (dual-write) | NO | 🚨 taxEmail → email |
| W5 | Operator `PATCH /kpa/members/:id/info` | [member.controller.ts:1020-1037](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L1020-L1037) | PARTIAL_MERGE | businessNumber, metadata.pharmacy_phone | YES (activity_type 변경 시) | 없음 |
| W6 | Account merge (service-level) | [account-linking.service.ts:553-558](apps/api-server/src/services/account-linking.service.ts#L553-L558) | PARTIAL_MERGE (shallow) | sourceUser.businessInfo 전체 | NO | 🟠 sourceUser 의 모든 필드가 target 을 overwrite (per-field null-safe 아님) |
| W7 | user.service.updateBusinessInfo | [user.service.ts:116-117](apps/api-server/src/modules/auth/services/user.service.ts#L116-L117) | FULL_REPLACE | caller-determined | NO | caller-dependent |

### 2-2. 9 Read Consumer

| ID | Consumer | File:Line | Fields | Purpose | ALIVE? |
|---|---|---|---|---|:---:|
| R1 | Member list (operator) | [member.controller.ts:330-340](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L330-L340) | businessNumber, businessName, representativeName, taxEmail | Operator member 승인 화면 display | ✅ |
| R2 | Member approval gate | [member.controller.ts:550-589](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L550-L589) | businessNumber, businessName | Auto-activation prerequisite check + org ensure | ✅ |
| R3 | Member update pre-flight | [member.controller.ts:989-996](apps/api-server/src/routes/kpa/controllers/member.controller.ts#L989-L996) | 전체 businessInfo | PARTIAL_MERGE 의 prev 값 보존 + activity_type 변경 감지 | ✅ |
| R4 | ProfileCompletenessService | [profileCompletenessService.ts:114-124](apps/api-server/src/services/profileCompletenessService.ts#L114-L124) | dynamic key access | profile 완성도 % 계산 | ✅ |
| R5 | Operator member detail | [MembershipConsoleController.ts:257, 311](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L257) | 전체 businessInfo | GET /api/v1/operator/members/:userId 응답 | ✅ |
| R6 | UserDetailPage (frontend) | [packages/ui/.../UserDetailPage.tsx:558-605](packages/ui/src/operator-user-detail/UserDetailPage.tsx#L558-L605) | businessName, businessNumber, email, businessType, businessCategory, address, address2 | Operator UI read-only 표시 | ✅ |
| R7 | EditUserModal (frontend) | [packages/ui/.../EditUserModal.tsx:45-59](packages/ui/src/operator-user-detail/EditUserModal.tsx#L45-L59) | 동일 | Form 초기화 | ✅ |
| R8 | MyProfilePage | [MyProfilePage.tsx:305-314](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx#L305-L314) | businessInfo, storeAddress (nested), businessName, phone, address | Profile display 의 fallback (profile.pharmacy → businessInfo.storeAddress → businessInfo.address) | ✅ |
| R9 | Member list SQL (company) | [MembershipConsoleController.ts:129](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L129) | businessName (`"businessInfo"->>'businessName'`) | Member list 의 company 필드 | ✅ |

### 2-3. Flow Map (요약 다이어그램)

```
                        [W1 Auth Register]
                              │ FULL_REPLACE
                              ↓
                        users.businessInfo
                              │
            ┌─────────────────┼────────────────────┐
            │                 │                    │
[W2 Auth Profile]       [W4 Operator PUT]   [W5 KPA Member]
  PARTIAL_MERGE          PARTIAL_MERGE       PARTIAL_MERGE
  +org sync (pharmacy)   (no org sync)       +conditional org sync
            │                 │                    │
            ↓                 ↓                    ↓
                        users.businessInfo
                              │
            ┌─────────────────┼──────────┬────────────────┐
            ↓                 ↓          ↓                ↓
       [R1] member list  [R2] approval [R4] completeness [R5/R6/R7/R8/R9] display
                              │ gate
                              ↓
                         organizations.ensureOrganization
                              │
                              ↓
                         organization_members
                         role_assignments
```

---

## 3. Organizations Lifecycle Map

### 3-1. 8 CREATE Entrypoint

| ID | Trigger | File | Code Logic | Type | Fields at create |
|---|---|---|---|---|---|
| C1 | KPA member approval | [member.controller.ts:~670-750](apps/api-server/src/routes/kpa/controllers/member.controller.ts) | `kpa-pharm-{bizno digits}` | 'pharmacy' | name (pharmacy_name), code, type, created_by_user_id |
| C2 | KPA pharmacy_request approval | [pharmacy-request.controller.ts:~280-330](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts) | `kpa-pharm-{bizno digits}` (C1 과 동일) | 'pharmacy' | 동일 (source: request.pharmacy_name) |
| C3 | Neture supplier register | [supplier.service.ts:99](apps/api-server/src/modules/neture/services/supplier.service.ts#L99) | `neture-{slug}` | 'supplier' | name (slug), code, type, metadata={serviceKey:'neture', netureSupplierSlug}, isActive=false |
| C4 | Neture operator self-register | [operator-registration.service.ts:~310-330](apps/api-server/src/modules/neture/services/operator-registration.service.ts) | `neture-{slug}` | 'supplier' | name (bizName), code, type, isActive=true |
| C5 | Cosmetics store bridge migration | `20260311200000-CosmeticsStoreOrgBridge.ts:96-118` | cosmetics_stores.code | 'store' | name, code, type, address, phone, business_number, metadata={serviceKey:'cosmetics', cosmeticsStoreId} |
| C6 | KPA orgs sync migration | `20260221000000-OrgServiceModelNormalizationPhaseA.ts:128-252` | `kpa-{uuid_no_dash}` | (from kpa_organizations.type) | name, type, parent_id, address, phone, description |
| C7 | Glycopharm bridge migration | `20260221000000-OrgServiceModelNormalizationPhaseA.ts:254-310` | `gp-{uuid_no_dash}` | 'pharmacy' | name, address, phone, description (from glycopharm_pharmacies) |
| C8 | Forum/Community seed migration | `2026020400002-SeedForumServiceOrganizations.ts` | (hardcoded) | 'community' | seed data |

### 3-2. 6 UPDATE Entrypoint

| ID | Trigger | File | Fields | Bidir sync to businessInfo? |
|---|---|---|---|:---:|
| U1 | Neture supplier profile update | [supplier.service.ts:612-641](apps/api-server/src/modules/neture/services/supplier.service.ts#L612-L641) | business_number, address, phone, address_detail | ❌ NO (one-way org←supplier) |
| U2 | Store settings update | `store-settings.controller.ts` | storefront_config, storefront_blocks | ❌ |
| U3 | Operator console store edit | `StoreConsoleController.ts` | dynamic SET (name, address, phone, business_number) | ❌ |
| U4 | Neture supplier activation | [supplier.service.ts:946-957](apps/api-server/src/modules/neture/services/supplier.service.ts#L946-L957) | isActive | N/A |
| U5 | Address normalization migration | `20260318200000-AddStructuredAddress.ts` | address_detail (jsonb) populated from address text | N/A (one-shot) |
| U6 | Pharmacy info PUT | [pharmacy-info.controller.ts:206-220](apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts#L206-L220) | name, phone, address, address_detail, metadata.taxInvoiceEmail, metadata.ownerPhone | ❌ |

### 3-3. ensureOrganization 4 호출 사이트

[organization-ops.service.ts:58-92](apps/api-server/src/modules/organization/services/organization-ops.service.ts#L58-L92) 의 `ensureOrganization()` 호출:

| ID | 호출 위치 | Context | Dedup Key | created boolean 사용? |
|---|---|---|---|:---:|
| E1 | member.controller.ts:~710 | KPA member 승인 (pharmacy_owner) | `kpa-pharm-{bizno}` | ❌ 사용 안 함 |
| E2 | pharmacy-request.controller.ts:~300 | KPA pharmacy_request 승인 | `kpa-pharm-{bizno}` | ❌ 사용 안 함 |
| E3 | supplier.service.ts:857-872 | Neture supplier register (inactive) | `neture-{slug}` | ❌ |
| E4 | supplier.service.ts:142 | Neture supplier approve (activate) | `neture-{slug}` | ❌ |

**Dedup risk**: E1 + E2 가 동일 `kpa-pharm-{bizno}` 생성. ON CONFLICT (code) DO UPDATE 가 처리하지만 **name 분기 시 어느 값이 보존되는지 규칙 불명**.

### 3-4. 10 READ Consumer

| ID | Consumer | File | Fields | Purpose |
|---|---|---|---|---|
| OR1 | Neture supplier profile GET | [supplier.service.ts:965-984](apps/api-server/src/modules/neture/services/supplier.service.ts#L965-L984) | name, business_number, address, phone, address_detail | Supplier profile display |
| OR2 | Neture batch org read | supplier.service.ts:990-1012 | id, name, business_number, address, phone | Supplier listings (high-freq) |
| OR3 | StoreConsoleController list | StoreConsoleController.ts:60-150 | name, code, type, isActive, storefront_config, address, phone, created_by_user_id | Operator store list |
| OR4 | Pharmacy context middleware | glycopharm/pharmacy-context.middleware.ts | id, isActive | Order/checkout 가드 |
| OR5 | Glycopharm pharmacy resolve | resolve-pharmacy.ts | id/code → pharmacy 결정 | Order placement |
| OR6 | Neture operator dashboard | operator-dashboard.controller.ts | summary | KPI/analytics |
| OR7 | Forum organizations controller | forum/forum-organizations.ts | full object scope-filtered | Forum API |
| OR8 | Platform store-policy guard | store-policy.routes.ts | id, created_by_user_id | Authorization |
| OR9 | Store-network service | store-network.service.ts | id, service enrollment | Catalog |
| OR10 | Physical-store service | physical-store.service.ts | name, service_store_id | Platform display |

### 3-5. Metadata jsonb 키

| Key | Written by | Used for | Service |
|---|---|---|---|
| `serviceKey` | supplier.service.ts:861 (neture), cosmetics bridge migration | metadata filter query (`metadata->>'serviceKey'`) | neture / cosmetics / forum |
| `netureSupplierSlug` | supplier.service.ts:861 | reverse lookup supplier→org | neture |
| `cosmeticsStoreId` | cosmetics bridge migration | reverse lookup cosmetics→org | cosmetics |
| `taxInvoiceEmail` | pharmacy-info.controller.ts:219 (PUT /pharmacy/info) | PharmacyInfoPage GET 의 fallback (de-facto SSOT for KPA store) | KPA store |
| `ownerPhone` | pharmacy-info.controller.ts:220 | 동일 | KPA store |

→ **metadata 가 typed schema 없는 free-key 영역으로 사용됨**. 향후 표준화 필요 (선행 IR §12 후속 IR 권장 #7).

### 3-6. Lifecycle Diagram (KPA pharmacy_owner)

```
[User Signup]
  ↓ W1 (auth-register.controller)
users.businessInfo (businessNumber, pharmacyName, ...) + kpa_members.pending
  ↓
[Operator 회원 승인 또는 Pharmacy Request 승인]
  ↓ E1 또는 E2 (ensureOrganization)
organizations(type='pharmacy', code='kpa-pharm-{bizno}') ← FIRST WRITE
  ↓
organization_members(owner) ← addMember
  ↓
role_assignments(kpa:store_owner) ← assignRole
  ↓
[Store owner 가 PharmacyInfoPage 에서 사후 보완]
  ↓ U6 (pharmacy-info.controller)
organizations.address_detail / phone / metadata.taxInvoiceEmail / metadata.ownerPhone UPDATE
  ↓
[Store owner 가 MyProfilePage 에서 자신 businessInfo 수정]
  ↓ W2 (auth-account.controller)
users.businessInfo PARTIAL_MERGE + (activity_type=pharmacy_owner 인 경우만) org ensure 재호출
   ⚠️ organizations 의 기존 address_detail 은 그대로 (sync 없음) — stale 위험
```

→ businessInfo 와 organizations 의 분기점은 **PharmacyInfoPage 사용 여부**. 사용자가 PharmacyInfoPage 로 organizations 직접 수정 후, MyProfilePage 에서 businessInfo 만 수정하면 **organizations.address_detail 가 stale**.

---

## 4. Field Ownership Matrix

| 필드 | Write site | Read site | de-facto SSOT (per context) | Runtime consumer |
|---|---|---|---|---|
| businessName | W1, W2, W4 | R1, R5, R6, R7, R9 (SQL), OR3 | `users.businessInfo.businessName` (KPA), `organizations.name` (post-approval) | Operator member list / EditUserModal / UserDetailPage |
| businessNumber | W1, W4, W5 | R1, R2, R3, OR1, OR2, OR3 | `organizations.business_number` (post-approval, KPA/Neture), `users.businessInfo.businessNumber` (pre-approval) | PharmacyInfoPage GET, Neture supplier profile, KPA member list |
| representativeName / ceoName | W1 (free field), neture_suppliers | R1, supplier.service.ts:521 | `users.businessInfo.representativeName` (free field) / `neture_suppliers.representative_name` (Neture) | Operator UI display only |
| address (legacy varchar) | W1, W2, W4, U6 | OR3 (org), supplier prefill | `organizations.address` (legacy backfill source) | Display fallback |
| address_detail (StoreAddress) | W1, W2 (dual-write), W4 (dual-write), U1, U6 | OR1, R8 (MyProfile), pharmacy-info GET | **`organizations.address_detail` (jsonb)** | KPA PharmacyInfoPage, Neture supplier profile |
| zipCode | W1, W2, W4 (flat) + storeAddress.zipCode | R8 (storeAddress) | **dead write** for flat zipCode, alive for storeAddress.zipCode | (storeAddress.zipCode 만 사용) |
| address2 | W1, W4 | (없음) | **dead write** | (없음) |
| taxInvoiceEmail | W1 (overwrite email!), W1 (metadata), kpa_pharmacy_requests, U6 (org metadata), neture_suppliers | pharmacy-info GET (org metadata + kpa_pharmacy_requests fallback), R1 (display), supplier.service.ts:528 | **분산** — KPA store: `organizations.metadata.taxInvoiceEmail`, Neture: `neture_suppliers.tax_email` | **다운스트림 consumer 부재** (operator display 외) |
| phone (사업장) | W1, W2, W4 | (display only) | `users.businessInfo.phone` + `organizations.phone` (PharmacyInfoPage 시 sync) | KPA member display |
| metadata.pharmacy_phone | W5 (KPA member info) | (Pharmacy info fallback chain) | `users.businessInfo.metadata.pharmacy_phone` (KPA only) | PharmacyInfoPage GET fallback |
| metadata.workplace | W3 (KPA mypage) | MyProfilePage display | `users.businessInfo.metadata.workplace` | MyProfile only |
| metadata.taxEmail | W1 (KPA pharmacy_owner branch) | (dead — display 안 함) | dead duplicate of W1 's email overwrite | **dead write** |
| metadata.representativeName | W1 (KPA pharmacy_owner branch) | (dead — display 안 함) | dead duplicate | **dead write** |
| ownerPhone | U6 (org metadata) | pharmacy-info GET | `organizations.metadata.ownerPhone` | PharmacyInfoPage |
| organization.code | C1-C8 (각 create site) | OR1-OR10 (대부분 join key) | `organizations.code` UNIQUE | Dedup + all org references |
| organization.metadata.serviceKey | C3-C5 | metadata filter SQL | metadata-based service scoping | Neture/cosmetics/forum |
| activity_type | W1 (kpa_pharmacist_profiles + kpa_members + businessInfo metadata), W2 (kpa_pharmacist_profiles SSOT), W5 (operator) | many | **`kpa_pharmacist_profiles.activity_type` = SSOT** (per WO-ROLE-NORMALIZATION-PHASE3-B-V1) | Auto-activation gate, role display |

---

## 5. Overwrite Hotspot 상세

### 5-1. 🚨 H1: `taxEmail → businessInfo.email` overwrite (가장 심각)

**위치 2 곳**:
- W1: [auth-register.controller.ts:124](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L124) — `if (data.taxEmail) newBiz.email = data.taxEmail;`
- W1: [auth-register.controller.ts:208-209](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L208-L209) — `if (data.taxEmail) { businessInfo.email = data.taxEmail; }`
- W4: [MembershipConsoleController.ts:803](apps/api-server/src/controllers/operator/MembershipConsoleController.ts#L803) — `bizFields.email = taxEmail;`

**의미 충돌**:
- `BusinessInfo.email` 의 type 정의는 "사업자 이메일 (대표 이메일)"
- 코드는 form 입력 `taxEmail` (세금계산서 이메일) 을 그 필드에 저장
- → BusinessInfo.email 의 의미가 **"대표 이메일" 또는 "세금계산서 이메일"** 둘 중 무엇인지 케이스마다 다름

**보존 호환성 문제**: 향후 세금계산서 시스템 도입 시 `BusinessInfo.email` 가 어떤 의미였는지 데이터별 구분 불가.

### 5-2. 🚨 H2: `representativeName` free-field 저장 (type 위반)

**위치 3 곳** (모두 W1):
- L127, L215, L500 — `representativeName` 을 `BusinessInfo` 에 직접 저장
- L559 — `metadata.representativeName` 도 동시 저장 (이중)

**Type 정의 위반**:
- `BusinessInfo` type 의 canonical 필드는 **`ceoName`** ([types/user.ts:16](apps/api-server/src/types/user.ts#L16))
- 코드는 `ceoName` 미사용, `representativeName` 으로 free field 저장
- TypeScript jsonb 컬럼이라 컴파일 에러 안 남

**위험**: 향후 type 정리 시 `representativeName` 데이터 손실 위험. jsonb migration 시 어느 키가 정답인지 결정 어려움.

### 5-3. 🟠 H3: Account merge 의 shallow overwrite

**위치**: W6 = [account-linking.service.ts:553-558](apps/api-server/src/services/account-linking.service.ts#L553-L558)

```typescript
targetUser.businessInfo = { ...(targetUser.businessInfo || {}), ...sourceUser.businessInfo };
```

→ sourceUser 의 **모든** 필드가 target 을 덮어씀. per-field null-safe 아님 → target 의 비어있지 않은 필드가 source 의 빈 값으로 덮여쓰일 위험.

### 5-4. 🟠 H4: dual-write 일관성 (storeAddress 동시 저장)

**위치**: W1 + W4 — `address`/`address2`/`zipCode` (legacy varchar) + `storeAddress.{baseAddress, detailAddress, zipCode}` (구조화) 양쪽 동시 저장

**위험**: form 이 둘 중 하나만 update 하면 두 표현이 divergent.

---

## 6. Drift Hotspot 상세

### 6-1. businessInfo ↔ organizations sync gap

| Scenario | businessInfo | organizations | drift |
|---|---|---|---|
| Register → 미승인 상태 | written | not yet created | 정상 (pre-approval) |
| Register → 승인 시점 | written (W1) | created (E1/E2) — businessInfo 에서 read | 동일 |
| 승인 후 PharmacyInfoPage 로 organizations 수정 | (unchanged) | updated (U6) | **drift** — businessInfo 가 stale |
| 승인 후 MyProfilePage 로 businessInfo 수정 | updated (W2) — activity_type=pharmacy_owner 면 org ensure 재호출 | re-ensure 만 (기존 address_detail 보존) | **drift** — organizations 가 stale |
| 승인 후 Operator EditUserModal 로 businessInfo 수정 | updated (W4) | no sync | **drift** — organizations 가 stale |
| 승인 후 Operator member info update | updated (W5) — activity_type 변경 시만 org sync | conditional | partial |

→ **bidirectional sync 부재로 인한 long-term drift**. 사용자가 어느 화면에서 수정하느냐에 따라 다른 source 가 stale.

### 6-2. KPA pharmacy_owner 전환 orphan

**시나리오**:
1. User 가 `pharmacy_owner` 로 활성화됨 — organizations(type='pharmacy') 생성, role_assignments(kpa:store_owner) 부여
2. User 가 MyProfilePage 또는 Operator 가 activity_type 을 `pharmacy_employee` 로 변경
3. FLOW P (auth-account.controller:200-207) — `role_assignments(kpa:store_owner)` deactivate
4. **organizations(type='pharmacy') 자체는 미삭제** — orphan record 잔존
5. 다시 같은 user 가 `pharmacy_owner` 로 재전환 시 같은 businessNumber → `ensureOrganization` 가 기존 orphan 의 record 를 reactivate

**문제**:
- Orphan org 의 name/address 가 stale 일 수 있음 (당시 데이터 그대로)
- organization_members(owner) 도 retain 됨 (role 만 disable)

### 6-3. Dedup race (E1 vs E2)

두 흐름이 같은 `kpa-pharm-{bizno}` 동시 생성 시도:
- ON CONFLICT (code) DO UPDATE — name/metadata 업데이트
- 그러나 **어느 호출자의 name 이 보존되는지 미정의**

실제로 사용자가 Pharmacy Request 도 신청 + Operator 가 동시에 회원 승인 시 발생 가능.

### 6-4. Neture supplier-organizations partial sync

`neture_suppliers` 의 일부 컬럼만 organizations 와 sync:
- ✅ sync: business_number, address, phone, address_detail (via `writeOrgBusinessData`)
- ❌ no sync: representative_name, manager_name, manager_phone, tax_email, business_type, min_order_amount, ...

→ supplier 자체 컬럼이 SSOT 역할 (organizations 가 partial mirror).

### 6-5. GlycoPharm application snapshot dead

[auth-register.controller.ts:538-584](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts#L538-L584):
- Register 시 `glycopharm_applications.metadata` 에 representativeName/taxEmail/address 등 snapshot
- **이후 어디서도 read 안 됨** (A4 확인)
- → **dead write**

---

## 7. Sync Gap 상세

| Write source | Target needing sync | 현재 동작 | 영향 |
|---|---|---|---|
| W1 businessInfo write | organizations | approval 시점만 ensure (자동활성화) | pre-approval 데이터는 organizations 없음 (정상) |
| W2 self-profile write | organizations | activity_type=pharmacy_owner 시만 ensure 재호출, address_detail 미동기화 | **organizations.address_detail stale** |
| W4 operator PUT | organizations | sync 없음 | **organizations 전체 stale** |
| W5 kpa member info | organizations | conditional org sync (activity_type 변경 시만) | non-activity-type 수정 시 stale |
| U6 PharmacyInfoPage PUT | users.businessInfo | sync 없음 | **businessInfo stale** (reverse) |
| U1 Neture supplier update | users.businessInfo / neture_suppliers (representative_name 등) | partial — org 만 sync, neture_suppliers 의 supplier-specific 컬럼은 별도 write | manager_name/manager_phone 등은 supplier 만 SSOT |
| W3 metadata.workplace | (없음 — KPA only) | no further sync | 정상 (mypage 만 사용) |
| W6 account-linking merge | organizations / role_assignments / service_memberships | sync 없음 | account merge 후 org 데이터 stale 가능 |
| W1 KPA pharmacy_owner 분기 metadata | (다른 곳) | 어디서도 read 안 됨 | **dead write** |
| Glycopharm application metadata snapshot | (다른 곳) | 어디서도 read 안 됨 | **dead write** |

---

## 8. Organization Ensure Timing Map

### 8-1. KPA Auto-Activation Path (E1)

```
T0: User signup (POST /auth/register)
    → W1 users.businessInfo 작성 (businessNumber 포함)
    → kpa_members.pending 작성
    [organizations: 미생성]

T1: User 가 MyProfilePage 에서 activity_type 을 pharmacy_owner 로 변경 (가능 시)
    또는 RegisterModal 에서 pharmacy_owner 선택 후 가입 → T0 의 활동유형이 처음부터 pharmacy_owner
    → kpa_pharmacist_profiles.activity_type = 'pharmacy_owner'

T2: Operator 가 회원 승인 (PATCH /kpa/members/:id/status pending→active)
    → member.controller.ts:550-614
    → IF kpa_members.activity_type == 'pharmacy_owner' AND businessInfo.businessNumber 존재 AND (businessName OR pharmacy_name) 존재:
       → E1 organizationOpsService.ensureOrganization(code=`kpa-pharm-${bizno}`, type='pharmacy', name=pharmacy_name, createdByUserId=user.id)
       [organizations: 생성됨]
       → kpa_members.organization_id = org.id (null 일 때만)
       → organization_members(organization_id, user_id, role='owner', is_primary=false) INSERT (idempotent)
       → roleAssignmentService.assignRole(user.id, 'kpa:store_owner')
       [role_assignments: 생성됨]
    ELSE:
       → graceful skip + warn log
       [organizations: 미생성, organization_members: 미생성, role_assignments: 미생성]
       → 사용자는 manual pharmacy_request path 진행 필요

T3: Store owner 가 PharmacyInfoPage 에서 사후 보완 (PUT /pharmacy/info)
    → U6 organizations.address_detail / phone / metadata.taxInvoiceEmail / metadata.ownerPhone UPDATE
    [businessInfo 와 organizations 가 분기 시작]

T4: Store owner 가 MyProfilePage 또는 Operator 가 EditUserModal 로 businessInfo 수정
    → W2 또는 W4 users.businessInfo UPDATE
    → IF W2 + activity_type 이 pharmacy_owner 로 변경:
       → E1 재호출 (ensureOrganization)
       → 단 기존 organizations 의 address_detail/phone 은 변경 없음 (sync 안 됨)
    [organizations 가 stale 가능]
```

### 8-2. KPA Manual Path (E2)

```
T0: User signup (W1) — 위와 동일

T1': User 가 PharmacyApprovalGatePage 에서 pharmacy_name + business_number + tax_invoice_email + owner_phone + pharmacy_phone 직접 입력
    → POST /pharmacy-requests
    → kpa_pharmacy_requests INSERT
    [organizations: 미생성]
    
T2': Operator 가 pharmacy_request 승인 (PATCH /pharmacy-requests/:id/approve)
    → pharmacy-request.controller.ts:169-251
    → E2 ensureOrganization(code=`kpa-pharm-${bizno}`, type='pharmacy', name=request.pharmacy_name)
       [organizations: 생성됨 또는 E1 과 동일 code → UPDATE]
    → organization_members + role_assignments
    → 추가: kpa_pharmacist_profiles.activity_type = 'pharmacy_owner' upsert
```

### 8-3. Neture Path (E3 + E4)

```
T0: Supplier 가 신청 (POST /neture/suppliers)
    → supplier.service.ts:99 registerSupplier
    → neture_suppliers INSERT (status='PENDING')
    → E3 syncSupplierOrganization (ensureOrganization, code=`neture-${slug}`, type='supplier', metadata={serviceKey:'neture', netureSupplierSlug:slug}, isActive=false)
    [organizations: 생성됨 inactive]
    → organization_members(role='owner')

T1: Operator 가 승인 (approve API)
    → supplier.service.ts:142
    → E4 syncSupplierOrganization (재호출 — 위 org 이미 존재)
    → setOrgActive(true)
    [organizations.isActive = true]
    → role_assignments(neture:supplier) 부여

T2: Supplier 가 profile 수정 (PUT /neture/supplier/profile)
    → supplier.service.ts:612-641
    → U1 organizations.business_number/address/phone/address_detail UPDATE (writeOrgBusinessData)
    → neture_suppliers.representative_name/manager_name/manager_phone/tax_email 등 UPDATE (자체 컬럼)
    [동기 — organizations 와 neture_suppliers 양쪽 모두 update, 단 columns 가 다름]
```

---

## 9. Runtime Consumer 목록

### 9-1. ALIVE consumer (실제 사용 중)

| ID | Consumer | 핵심 source | Missing-data 동작 |
|---|---|---|---|
| RC1 | KPA PharmacyInfo GET/PUT (`/pharmacy/info`) | organizations.* + organizations.metadata + kpa_pharmacy_requests fallback + users.businessInfo.storeAddress fallback | graceful chain |
| RC2 | KPA PharmacyGuard (`/store/*` 접근) | role_assignments(kpa:store_owner) | role 없으면 fallback API check |
| RC3 | KPA Operator Member List | users.businessInfo (businessNumber, businessName, representativeName, taxEmail) | silent (null) |
| RC4 | KPA Operator Member Edit | users.businessInfo | display + write |
| RC5 | Neture Supplier Profile | neture_suppliers + organizations + users.businessInfo (prefill) | org-primary 체인 |
| RC6 | Neture Supplier Dashboard | neture_suppliers + org | 404 if supplier 없음 |
| RC7 | Glycopharm pharmacy resolve | organizations | order 차단 |
| RC8 | Operator Console Store List | organizations | display |
| RC9 | Forum Organizations API | organizations | display |
| RC10 | Platform Store Policy | organizations.created_by_user_id | authorization gate |
| RC11 | UserDetailPage / EditUserModal (packages/ui) | users.businessInfo | display + edit form |
| RC12 | Glycopharm Application creation | request payload only (snapshot) | dead post-create |

### 9-2. 부재 Consumer (있을 것으로 예상되나 없음)

A4 직접 grep 결과 **존재하지 않는 시스템**:

| 부재 시스템 | 의미 |
|---|---|
| **세금계산서 발행/송부 시스템** (invoice.generate, settlement.generate, tax.generate) | `taxInvoiceEmail` 데이터가 다운스트림 미사용 — dead data 가능성 |
| **B2B order placement 시 사업자정보 사용** | 주문에 공급자 사업자번호/주소 포함 안 됨 |
| **Signage / storefront 의 사업자정보 표시** | 매장 정보 화면에 organizations.business_number/representative 표시 안 됨 |
| **결제/정산 시스템의 사업자번호 reconciliation** | settlement 자체 시스템 부재 |
| **규제 신고 시스템** | 전자상거래법 / 통신판매업 신고 자동화 시스템 부재 |

→ **사업자 데이터가 "수집은 되나 활용 안 됨"** 상태. 미래 시스템 도입 시 SSOT 정렬 prerequisite.

---

## 10. Canonical Ownership 권장

### 10-1. 영역별 SSOT 권장 (정책 결정 제안)

| 영역 | 권장 SSOT | 현재 상태 | 정렬 방향 |
|---|---|---|---|
| Business Entity (매장/약국/공급자) | **`organizations`** | partial SSOT (create + update 일부 + 대다수 read) | reverse sync 추가, kpa_organizations 완전 통합, service-specific 컬럼 deprecate |
| User Identity | **`users`** (Frozen F10) | 완전 SSOT | 변경 없음 |
| Service Membership | **`service_memberships`** (Frozen F11) | 완전 SSOT | 변경 없음 |
| RBAC | **`role_assignments`** (Frozen F9) | 완전 SSOT | 변경 없음 |
| Org Membership Role | **`organization_members`** | 완전 SSOT | 변경 없음 |
| Address (구조화) | **`StoreAddress` type + `organizations.address_detail` jsonb** | 표준 적용됨 (organizations/glycopharm/cosmetics) | kpa_members.pharmacy_address denormalized 제거, neture_partners 의 자체 구조 정렬 |
| Personal Business Cache | **`users.businessInfo`** (form input + display cache) | 7 write path, single canonical write path 부재 | 명시적 "cache only" 선언 + bidirectional sync 보장 OR deprecate 후 frontend 가 organizations 직접 호출 |
| Tax Invoice Email | **(시스템 부재 — 결정 보류)** | 5 곳 분산 | 향후 invoice 시스템 도입 시 결정. 후보: `organizations.tax_invoice_email` 컬럼 신설 (선행 IR §4-4 Option B) |
| Manager (담당자) | **(현재 Neture-only)** | service-local | 향후 cross-service 필요 시 organizations 표준 컬럼 |
| 대표자명 | **`BusinessInfo.ceoName`** (canonical type) | 코드는 `representativeName` 으로 사용 (type 위반) | code 의 representativeName 표기 정리, jsonb migration |
| `activity_type` (직역) | **`kpa_pharmacist_profiles.activity_type`** (per WO-ROLE-NORMALIZATION-PHASE3-B-V1) | SSOT 적용됨 | kpa_members.activity_type 은 mirror, businessInfo metadata 는 dead |

### 10-2. Single Canonical Write Path 권장

**현재 7 개 write path 분산 — 각자 merge 로직 수동 관리.**

권장:
- 모든 사업자 정보 write 가 통과해야 할 **단일 service layer** 신설 (예: `BusinessProfileWriteService.upsertBusinessProfile(userId, fields)`)
- 이 service 가:
  1. `users.businessInfo` write
  2. `organizations` ensure / update (필요 시)
  3. `kpa_pharmacist_profiles` activity_type sync (필요 시)
  4. `role_assignments` update (필요 시)
  5. 모두 단일 transaction
- 모든 controller (auth-register / auth-account / MembershipConsoleController / member.controller) 가 이 service 호출

### 10-3. Bidirectional Sync 정책

- `users.businessInfo` write → `organizations` 자동 update (현재는 activity_type=pharmacy_owner 일 때만, partial)
- `organizations` update → `users.businessInfo` write-back (현재는 부재)
- 또는 `users.businessInfo` 를 view-only (organizations 의 read derived cache) 로 deprecate

---

## 11. 7 Critical Questions 답변

### Q1. `users.businessInfo` 는 무엇인가?

**답**: 3-역할 동시 수행 중인 **input/display cache layer**.
- ① form input cache (signup/profile/operator edit 의 user-side write)
- ② runtime display cache (operator member list / EditUserModal / UserDetailPage / MyProfilePage 의 display source)
- ③ organization ensure 의 read source (businessNumber / businessName)

SSOT 아님. 단 현재는 form-side 의 사실상 canonical (single source for what user submitted).

### Q2. `organizations` 는 실제 SSOT 인가?

**답**: **partial SSOT**.
- ✅ create + update + read 경로 모두 존재
- ✅ KPA / GlycoPharm / Cosmetics / Neture 가 모두 organization_id FK 또는 metadata 로 연결
- ❌ reverse sync (organizations → users.businessInfo) 부재
- ❌ kpa_organizations dual maintenance (전환 진행 중)
- ❌ neture_suppliers 의 supplier-specific 컬럼은 별도 SSOT (representative_name/manager_*/tax_email)
- ❌ `users.businessInfo.metadata.pharmacy_phone` 가 organizations.phone 으로 sync 안 됨

→ Full SSOT 가 되려면 reverse sync + 통합 컬럼 표준화 필요.

### Q3. business canonical source 는 어디인가?

**답**: **read context 별로 다름** — 단일 SSOT 부재.

| Read context | de-facto source |
|---|---|
| Operator member list | `users.businessInfo` (W1 결과의 cache) |
| Operator member detail | `users.businessInfo` |
| MyProfilePage display | `users.businessInfo` + `profile.pharmacy` fallback |
| KPA PharmacyInfo display | `organizations.address_detail` + `organizations.metadata` + `kpa_pharmacy_requests` fallback + `users.businessInfo.storeAddress` fallback |
| Neture supplier profile | `neture_suppliers` + `organizations` (org-primary) |
| Auto-activation gate | `users.businessInfo.businessNumber` / `businessName` |
| Glycopharm order routing | `organizations` (resolve-pharmacy) |

→ 사용자가 어디서 보느냐에 따라 다른 source. 정렬 후에는 `organizations` 가 모든 post-approval context 의 source 가 되어야.

### Q4. operator/profile/register 가 동일 source 를 쓰는가?

**답**: **부분적 NO**.

| Flow | businessInfo write? | organizations write? | kpa_members write? | atomic transaction? |
|---|:---:|:---:|:---:|:---:|
| Register (W1) | ✅ FULL_REPLACE | ❌ (approval 시점) | ✅ (pharmacy_name, activity_type) | ✅ atomic |
| Self-Profile (W2) | ✅ PARTIAL_MERGE | ✅ (activity_type=pharmacy_owner 시 ensure 재호출) | ✅ (activity_type mirror) | ❌ **NOT atomic** |
| Operator Edit (W4) | ✅ PARTIAL_MERGE | ❌ no sync | ❌ no write | ❌ |

→ 모두 `users.businessInfo` 를 공통 write target 으로 사용. 하지만 trigger 되는 추가 동작 (org sync / activity_type mirror) 이 흐름마다 다름. 일관된 single canonical write path 부재.

### Q5. taxInvoiceEmail canonical home 은 어디인가?

**답**: **현재 결정 불가 — invoice 시스템 부재**.

| 현재 de-facto source | scope |
|---|---|
| `users.businessInfo.email` (overwrite!) | KPA register/operator edit 시 |
| `users.businessInfo.metadata.taxEmail` | KPA pharmacy_owner 분기 |
| `kpa_pharmacy_requests.tax_invoice_email` | KPA manual 신청 |
| `organizations.metadata.taxInvoiceEmail` | KPA PharmacyInfoPage 수정 후 (de-facto post-approval SSOT) |
| `neture_suppliers.tax_email` | Neture |

다운스트림 invoice 시스템 부재로 **사용 안 됨 = dead data**. 향후 invoice 시스템 도입 시 결정:
- **권장**: `organizations.tax_invoice_email` 컬럼 신설 (선행 IR §4-4 Option B), 다른 5 곳 deprecate

### Q6. address canonical home 은 어디인가?

**답**: **`organizations.address_detail` (jsonb `StoreAddress` type)**.

근거:
- `WO-O4O-STORE-PROFILE-UNIFICATION-V1` migration (`20260318200000`) 으로 표준 적용
- KPA PharmacyInfoPage GET/PUT 의 primary source
- Neture supplier profile 의 org-primary source
- GlycoPharm / Cosmetics 도 같은 패턴 적용

비표준 (deprecate 권장):
- `users.businessInfo.address` / `address2` (legacy varchar)
- `kpa_members.pharmacy_address` (varchar denormalized)
- `users.businessInfo.zipCode` / `address2` flat fields (**dead writes**)
- `neture_partners.address` (자체 6-field jsonb — 글로벌 호환 의도?)

### Q7. organization ensure 의 정확한 lifecycle 은 무엇인가?

**답**: **4 호출 사이트 + 2 자연 entrypoint (KPA 승인 / Neture 등록·승인)**.

```
KPA auto path:
  signup → kpa_members.pending → operator 승인 → E1 ensure → org_members + role_assignments

KPA manual path:
  signup → pharmacy_request POST → operator 승인 → E2 ensure → 동일 side effects + kpa_pharmacist_profiles.activity_type='pharmacy_owner'

Neture register path:
  POST /neture/suppliers → E3 ensure (inactive) → operator approve → E4 ensure (activate) → role_assignments(neture:supplier)

Cosmetics / GlycoPharm:
  migration 으로 backfill (C5, C7) — runtime ensure 부재 (별도 도메인 테이블이 primary)
```

ensure call 의 dedup: `code` UNIQUE. E1 ↔ E2 race 시 ON CONFLICT DO UPDATE 동작하나 **name 분기 보존 규칙 미정의**.

`ensureOrganization` 가 `created: boolean` 반환하지만 **모든 호출자가 무시** — side effects 가 분기되지 않음.

---

## 12. 다음 단계 WO Prerequisite

### 12-1. Phase 0 (본 IR 단계 — 완료)

- IR 작성 + SSOT 정렬 정책 합의 prerequisite

### 12-2. Phase 1 (정책 결정 — 사용자/팀)

**결정 필요 항목**:
1. `users.businessInfo` 의 미래 — (a) bidirectional sync 강제 / (b) deprecate, frontend 가 organizations 직접 호출
2. `taxInvoiceEmail` canonical home — 현재 결정 보류 OK / invoice 시스템 도입 시점에 결정
3. 담당자 (manager) — cross-service 표준 필요 여부
4. `organizations.metadata` jsonb 의 typed schema 전환 여부 (선행 IR §12 후속 IR #7)
5. `kpa_pharmacy_requests` deprecate 가능 여부 (current dead-or-fallback 검증 후)

### 12-3. Phase 2 (정비 WO — 정책 결정 후)

**우선순위 (본 IR 의 위험 매트릭스 기반)**:

| 우선순위 | WO | 위험 해소 | 의존 |
|---|---|---|---|
| P1 🔴 | `WO-O4O-AUTH-PROFILE-ATOMIC-TRANSACTION-V1` — FLOW P (PATCH /auth/me/profile) 의 4 query 를 단일 transaction 으로 묶기 | N1 | 없음 (작은 작업) |
| P1 🔴 | `WO-O4O-ADMIN-DASHBOARD-EDIT-USER-MODAL-AUDIT-V1` — admin-dashboard 측 EditUserModal 의 endpoint 와 silent discard 확인 | N2 | admin-dashboard 코드 접근 |
| P2 🟠 | `WO-O4O-PHARMACY-OWNER-ROLE-TRANSITION-ORG-CLEANUP-V1` — pharmacy_owner → other 전환 시 organizations record orphan 처리 (soft-archive) | N3 | 정책 결정 (orphan 보존 vs 삭제) |
| P2 🟠 | `WO-O4O-BUSINESSINFO-CEO-NAME-CANONICAL-V1` — code 의 representativeName 표기를 ceoName 으로 통일 + jsonb migration | H2 (selve IR 위험 #2) | type 정리 |
| P3 🟡 | `WO-O4O-BUSINESSINFO-EMAIL-SEMANTIC-RESTORE-V1` — taxEmail → businessInfo.email overwrite 패턴 제거. businessInfo.email 의미를 "대표 이메일" 으로 복원 | H1 | invoice 시스템 결정 prerequisite |
| P3 🟡 | `WO-O4O-DEAD-WRITE-CLEANUP-V1` — address2/zipCode flat field, glycopharm_applications.metadata, kpa_pharmacy_requests.pharmacy_phone/owner_phone 의 dead write 제거 | N5 | 검증 후 |
| P4 🟡 | `WO-O4O-NETURE-SUPPLIER-COLUMN-CONSOLIDATION-V1` — neture_suppliers.representative_name/manager_*/tax_email 의 organizations 통합 (또는 명시적 service-local 정책 선언) | C5 transitional | 정책 결정 (cross-service 표준 vs service-local) |
| P5 🟡 | `WO-O4O-BUSINESSINFO-SINGLE-WRITE-PATH-V1` — 모든 사업자 정보 write 를 단일 service (BusinessProfileWriteService) 로 통합 | 7 write path drift | 위 WO 들 선행 |

---

## 13. 본 IR 범위 외 (후속)

1. **admin-dashboard 측 EditUserModal** (`packages/ui/src/operator-user-detail/EditUserModal.tsx`) 의 실제 endpoint + AdminUserController.updateUser:337-356 의 silent discard 영향 범위 (위험 N2)
2. **GlycoPharm RegisterPage / K-Cosmetics RegisterPage** 의 write trace (선행 IR §12 후속 IR #1, #2 와 동일)
3. **`kpa_pharmacy_requests` deprecate 가능 여부 검증** — auto-path 정착 후 사용 빈도
4. **`organizations.metadata` 의 typed schema 전환 검토** (선행 IR §12 후속 IR #7)
5. **`activity_type` 매핑표** — pharmacy_owner / kpa:store_owner / employed_pharmacist / pharmacy_employee 등 (선행 IR #5)
6. **`kpa_member_services` vs `service_memberships` 동기화 계약** (선행 IR #8)
7. **`address` 단일 free-text → StoreAddress 마이그레이션 정책** — register 시점 free-text 가 어디까지 보존되어야 하는가
8. **dead writes 4 건 의 영향 검증** (특히 glycopharm_applications.metadata)

---

## 14. 참조

### Backend Controllers / Services (write entrypoint)
- [auth-register.controller.ts](apps/api-server/src/modules/auth/controllers/auth-register.controller.ts) — W1
- [auth-account.controller.ts](apps/api-server/src/modules/auth/controllers/auth-account.controller.ts) — W2
- [mypage.service.ts](apps/api-server/src/routes/kpa/services/mypage.service.ts) — W3
- [MembershipConsoleController.ts](apps/api-server/src/controllers/operator/MembershipConsoleController.ts) — W4
- [member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts) — W5, R1-R3, E1
- [account-linking.service.ts](apps/api-server/src/services/account-linking.service.ts) — W6
- [user.service.ts](apps/api-server/src/modules/auth/services/user.service.ts) — W7
- [pharmacy-request.controller.ts](apps/api-server/src/routes/kpa/controllers/pharmacy-request.controller.ts) — E2
- [pharmacy-info.controller.ts](apps/api-server/src/routes/o4o-store/controllers/pharmacy-info.controller.ts) — U6
- [supplier.service.ts](apps/api-server/src/modules/neture/services/supplier.service.ts) — U1, E3, E4
- [organization-ops.service.ts](apps/api-server/src/modules/organization/services/organization-ops.service.ts) — ensureOrganization

### Frontend Flows
- [RegisterModal.tsx](services/web-kpa-society/src/components/RegisterModal.tsx) → W1
- [MyProfilePage.tsx](services/web-kpa-society/src/pages/mypage/MyProfilePage.tsx) → W2 + R8
- [EditUserModal.tsx](services/web-kpa-society/src/pages/operator/EditUserModal.tsx) → W4 (verified L159: PUT /api/v1/operator/members/:userId)
- [PharmacyApprovalGatePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyApprovalGatePage.tsx) → POST /pharmacy-requests
- [PharmacyInfoPage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyInfoPage.tsx) → U6

### Types
- [BusinessInfo type](apps/api-server/src/types/user.ts) — canonical (사용 현실과 drift)
- [StoreAddress type](apps/api-server/src/types/store-address.ts) — address canonical (적용 진행 중)

### 연관 IR
- [IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1](docs/investigations/IR-O4O-BUSINESS-REGISTRATION-CANONICAL-STRUCTURE-AUDIT-V1.md) — 본 IR 의 선행
- [IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1](docs/investigations/IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1.md) — auto-activation 흐름

### Canonical / Governance docs (선행 IR §2-4 참조)

---

*조사 전용 — 코드/DB/migration/UI/contract 수정 없음. 본 IR 단계에서 후속 WO 작성 금지. **commit/push 금지** (사용자 명시) — IR 파일은 working tree 에 두고 검토 대기.*
