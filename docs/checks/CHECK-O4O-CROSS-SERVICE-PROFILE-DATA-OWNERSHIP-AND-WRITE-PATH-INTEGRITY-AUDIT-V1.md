# CHECK-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1

> **WO**: `IR-O4O-CROSS-SERVICE-PROFILE-DATA-OWNERSHIP-AND-WRITE-PATH-INTEGRITY-AUDIT-V1`
> **성격**: 조사 전용 (read-only) — 코드 / DB / 운영 데이터 / 배포 변경 0
> **기준 커밋**: `2e69b85fb` (`origin/main`, 2026-08-12)
> **대상 서비스**: KPA-Society · GlycoPharm · K-Cosmetics · Neture · Pharmacy-Hub

---

## 0. 판정 요약

| 항목 | 결과 |
|---|---|
| 프로필 저장소 개수 | 7 (`users` · `service_memberships` · `service_credentials` · `kpa_members` · `kpa_pharmacist_profiles` / `kpa_student_profiles` · `neture_suppliers` / `glycopharm_members` · `organizations` / `organization_members`) |
| 신규 통합 테이블 필요 | **아니오** — 기존 7개로 경계 확정 가능 |
| 확정 결함 (P0) | 2건 (D-1 `users.updated_at` 존재하지 않는 컬럼 write · D-2 KPA 승인 sync 예외 삼킴) |
| 확정 결함 (P1) | 4건 (D-3 주소 키 비대칭 · D-4 `pharmacy_phone` 키 이중 · D-5 KPA 운영자 대리수정 비원자 · D-6 `organizations` 이중 entity) |
| DEAD 판정 | 3건 |
| 종합 | **DUPLICATED_BUT_RECOVERABLE** — 정본은 대부분 결정 가능하며, migration 없이 read/write 키 정렬 + 트랜잭션 묶기만으로 해소 |

---

## 1. 서비스별 프로필 구조와 API 대응표

| 서비스 | 사용자 화면 | Frontend client | API | Controller / Service | write 대상 table |
|---|---|---|---|---|---|
| **공통 (전 서비스)** | 직역/사업자 정보 수정 | `authClient` | `PATCH /api/v1/auth/me/profile` | `modules/auth/controllers/auth-account.controller.ts` | `kpa_pharmacist_profiles` · `kpa_members` · `users.businessInfo` · `role_assignments` |
| **공통 (전 서비스)** | 가입 | — | `POST /api/v1/auth/register` | `modules/auth/controllers/auth-register.controller.ts` | `users` · `service_memberships` · `service_credentials` · `kpa_members` · `kpa_pharmacist_profiles` · `glycopharm_members` · `glycopharm_applications` · `neture_suppliers` · `organizations` |
| **KPA** | `pages/mypage/MyProfilePage.tsx` | `api/mypage.ts` | `GET/PUT /api/v1/kpa/mypage/profile` | `routes/kpa/services/mypage.service.ts` | `users` (name/nickname/phone) · `kpa_members.university_name` · `users.businessInfo.metadata.workplace` |
| **KPA** | 매장 `약국 정보` | — | `GET/PUT /api/v1/{svc}/store/info` | `routes/o4o-store/controllers/pharmacy-info.controller.ts` | `organizations`(name/phone/address/address_detail/metadata) + `users.businessInfo`(P2/P4 4필드) |
| **KPA** | `operator/MemberManagementPage.tsx` | `apiClient(/api/v1/kpa)` | `PATCH /api/v1/kpa/members/:id/info` · `/:id/status` | `routes/kpa/controllers/member.controller.ts` | `kpa_members` · `users`(name/nickname/businessInfo) · `kpa_pharmacist_profiles` · `service_memberships` · `role_assignments` · `organizations` · `organization_members` |
| **GlycoPharm** | `pages/mypage/MyProfilePage.tsx` | `api/mypage.ts` | `PATCH /api/v1/glycopharm/mypage/business-info` | `routes/glycopharm/controllers/mypage.controller.ts` | `users.businessInfo` (jsonb concat, 단일 write) |
| **K-Cosmetics** | `pages/mypage/MyProfilePage.tsx` | `api/mypage.ts` | `PATCH /api/v1/cosmetics/mypage/business-info` | `routes/cosmetics/controllers/cosmetics-mypage.controller.ts` | `users.businessInfo` (jsonb concat, 단일 write) |
| **Neture** | `pages/mypage/MyBusinessProfilePage.tsx` | `lib/api/supplier.ts` | `GET/PATCH /api/v1/neture/supplier/profile` | `modules/neture/services/supplier.service.ts` | `neture_suppliers` + `organizations`(읽기 SSOT) + `users.businessInfo`(P4 2필드) |
| **Pharmacy-Hub** | `pages/store-owner/AccountPage.tsx` | `lib/api/pharmacyHubAccount.ts` | `PUT /api/v1/users/password` 등 | `PharmacyHubMembershipConsoleController` (읽기) · `PharmacyHubStoreProvisioningService` | `users.businessInfo` **읽기 전용** — 자체 프로필 write 경로 없음 |
| **공통 운영자** | Membership Console | — | `PATCH /api/v1/operator/members/:userId` | `controllers/operator/MembershipConsoleController.ts` | `users`(이름/연락처/businessInfo) · `service_memberships` · `service_credentials` |

---

## 2. 주요 필드별 현재 정본과 write 주체 (필드 판정)

### 2-1. 개인 계정 — `ACCOUNT_CORE` (`users`)

| 필드 | 정본 | write 주체 | 판정 |
|---|---|---|---|
| `email` · `password` | `users` | 가입 · 계정복구 | ACCOUNT_CORE |
| `firstName` / `lastName` / `name` | `users` | 본인(KPA mypage) · 운영자(공통 콘솔 · KPA 콘솔) | ACCOUNT_CORE |
| `nickname` | `users` | 본인 · 운영자 2경로 | ACCOUNT_CORE |
| `phone` | `users.phone` | 본인 · 운영자 | ACCOUNT_CORE |
| `status` / `isActive` | `users` | 승인/반려/탈퇴 경로 | ACCOUNT_CORE |
| `approvedAt` / `approvedBy` | `users` | **KPA 승인 경로만** write. 다른 서비스는 `service_memberships.approved_at` 사용 | **DUPLICATED** (§2-1 주석 · R8) |
| `serviceKey` | — | write 없음 (`@deprecated`) | **DEAD** |
| `permissions` (json) | — | 백엔드 write 경로 0 | **DEAD** |

### 2-2. 서비스 회원정보 · 직역 — `SERVICE_PROFILE`

| 필드 | 정본 | 복제 위치 | write 주체 | 판정 |
|---|---|---|---|---|
| membership 상태(승인) | `service_memberships.status` | `kpa_members.status` · `glycopharm_members.status` · `users.status` | 승인 콘솔 · KPA `PATCH /:id/status` | SERVICE_PROFILE (정본 명확, 동기화 결함은 D-2) |
| membership role | `service_memberships.role` | `kpa_members.role` | 운영자 콘솔 | SERVICE_PROFILE |
| 서비스별 비밀번호 | `service_credentials.password_hash` | `users.password`(플랫폼 계정용) | 가입 · 운영자 비밀번호 재설정 | SERVICE_PROFILE (경계 명확) |
| **직역 `activity_type`** | `kpa_pharmacist_profiles.activity_type` | `kpa_members.activity_type` (mirror) | `PATCH /auth/me/profile` (transaction O) · KPA 운영자 콘솔 | SERVICE_PROFILE + 의도된 mirror |
| **면허번호** | `kpa_pharmacist_profiles.license_number` | `kpa_members.license_number` · `users.businessInfo.licenseNumber` · `glycopharm_members.metadata.licenseNumber` | 가입 · KPA 운영자 콘솔 | **DUPLICATED** (4곳 — 정본 외 3곳은 mirror) |
| 대학/학년 | `kpa_student_profiles` / `kpa_members.university_name` | — | KPA mypage(`university_name`만) | SERVICE_PROFILE (write 경로가 mirror 쪽 = 역방향) |
| `workplace` | `users.businessInfo.metadata.workplace` | — | KPA mypage | SERVICE_PROFILE (잘못된 저장소, §7) |
| Neture 공급자 프로필 (`representative_name`/`manager_*`/`business_type`/`business_item`/`tax_invoice_email`) | `neture_suppliers` | `users.businessInfo` 동명 키 | 공급자 본인 | **DUPLICATED** (§4 참조) |

### 2-3. 조직 · 약국 · 매장 — `DOMAIN_EXTENSION`

| 필드 | 정본 | 복제 위치 | 판정 |
|---|---|---|---|
| 약국/매장 이름 | `organizations.name` | `kpa_members.pharmacy_name` · `users.businessInfo.businessName` | **DUPLICATED** |
| 약국/매장 주소 | `organizations.address` + `address_detail` | `kpa_members.pharmacy_address` · `users.businessInfo.{businessAddress,address,storeAddress}` | **DUPLICATED** (§3-3 · D-3, 최악 케이스) |
| 사업자등록번호 | `organizations.business_number` | `users.businessInfo.businessNumber` | DUPLICATED (Neture 는 org 를 SSOT 로 명시 선언 — 참조 모델) |
| 매장 대표 연락처 | `organizations.phone` | `users.businessInfo.phone` / `ownerPhone` | DUPLICATED |
| `taxInvoiceEmail` / `ceoName` / `contactName` / `managerPhone` | 미확정 | `organizations.metadata.*` **및** `users.businessInfo.*` 양쪽 | **DUPLICATED** (동일 키명, 정본 불명) |
| 조직 소속 · 임원 | `organization_members` | — | DOMAIN_EXTENSION |

### 2-4. 가입 · 신청 임시 데이터 — `INPUT_CACHE`

| 위치 | 용도 | 판정 |
|---|---|---|
| `users.businessInfo` 의 사업자등록증 4필드 (`businessType`/`businessItem`/`businessEntityType`/`businessStartDate`) | 가입 폼 입력 → 운영자 승인 판단 근거. 승인 후 `organizations` 로 이관되지 않음 | INPUT_CACHE → 승인 후 사실상 정본이 되어버림 (§6 경계 선언) |
| `glycopharm_applications` | 신청 스냅샷 | INPUT_CACHE (정상) |
| `kpa_pharmacy_requests` | 약국 개설 신청 스냅샷 | INPUT_CACHE (정상) |

### 2-5. `DEAD`

| 대상 | 근거 |
|---|---|
| `users.serviceKey` | `@deprecated`, runtime write 0 |
| `users.permissions` | 백엔드 write 0 (프론트가 채워질 것으로 기대하면 전원 잠김 — 기존 메모와 일치) |
| `profileCompletenessService` 가 평가하는 legacy 키 (`ceoName`/`phone`/`email`/`address`/`telecomLicense`) | 현재 canonical write 는 `representativeName`/`businessPhone`/`businessEmail`/`businessAddress` 로 저장 → 완성도 점수가 구조적으로 저평가. Neture 소비처만 존재 |

---

## 3. `users.businessInfo` 전체 소비 지도

### 3-1. 소비처 (backend, 파일당 참조 수)

| 파일 | refs | 역할 |
|---|---|---|
| `routes/kpa/controllers/member.controller.ts` | 45 | KPA 운영자 read+write |
| `modules/auth/controllers/auth-register.controller.ts` | 29 | 가입 write (canonical 키) |
| `modules/neture/services/operator-registration.service.ts` | 21 | Neture 운영자 read (**legacy 키만**) |
| `routes/o4o-store/controllers/pharmacy-info.controller.ts` | 14 | 매장 약국정보 read+write(P2/P4) |
| `services/profileCompletenessService.ts` | 13 | 완성도 점수 read (legacy 키) |
| `modules/neture/services/supplier.service.ts` | 13 | 공급자 프로필 read+write(P4) |
| `modules/auth/controllers/auth-account.controller.ts` | 12 | 본인 수정 write (canonical+legacy 혼용 허용) |
| `services/CommissionCalculator.ts` | 10 | read |
| `routes/glycopharm/controllers/mypage.controller.ts` | 10 | GP 본인 수정 write |
| `routes/cosmetics/services/cosmetics-store.service.ts` | 10 | read |
| `routes/kpa/services/mypage.service.ts` | 8 | KPA mypage read + `metadata.workplace` write |
| `routes/cosmetics/controllers/cosmetics-mypage.controller.ts` | 8 | KCos 본인 수정 write |
| `controllers/operator/MembershipConsoleController.ts` | 8 | 공통 운영자 write |
| `routes/debug/user-debug.controller.ts` | 7 | 진단 read |
| `routes/glycopharm/controllers/admin.controller.ts` | 6 | read |
| `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` | 5 | 조직 provisioning read (`businessName`/`businessNumber`) |
| `services/account-linking.service.ts` · `modules/auth/services/user.service.ts` | 4 / 4 | read |
| `controllers/pharmacy-hub/PharmacyHubMembershipConsoleController.ts` | 3 | 운영자 read |
| `controllers/admin/admin-user-sanitizer.ts` | 3 | 응답 마스킹 |

### 3-2. write 경로 (6개)

| # | 경로 | 방식 | 원자성 |
|---|---|---|---|
| W1 | `POST /auth/register` (신규 · 기존계정 서비스추가) | `{...existing, ...newBiz}` merge | **O** (transaction 내부) |
| W2 | `PATCH /auth/me/profile` | SELECT → merge → UPDATE | **O** (transaction 내부) |
| W3 | `PATCH /operator/members/:userId` | SELECT → merge → UPDATE (단일 UPDATE 에 합류) | **O** (단일 문장) |
| W4 | `PATCH /kpa/members/:id/info` | SELECT → merge → UPDATE | **X** (§5, D-5) |
| W5 | GP / KCos `PATCH …/mypage/business-info` | `COALESCE(...) \|\| $2::jsonb` | **O** (단일 문장, 손실 없음) |
| W6 | `PUT /{svc}/store/info` · Neture `PATCH /supplier/profile` | jsonb concat, **try/catch 삼킴** | **X** (부분 성공 무보고) |

> W5 의 jsonb concat 패턴이 가장 안전하다. W1~W4 의 read-modify-write 는 동시 편집 시 last-writer-wins 로 타 필드를 되돌릴 수 있다 (운영자와 본인이 동시에 수정하는 경우).

### 3-3. 키 tier 별 read/write 매트릭스 (핵심 불일치)

| 의미 | canonical 키 (write) | legacy 키 (write) | 구조화 키 | 읽기만 하는 곳 |
|---|---|---|---|---|
| 사업장 주소 | `businessAddress` / `businessAddressDetail` ← **가입(W1)** | `address` / `address2` ← **KPA 운영자(W4) · 공통 운영자(W3) · 본인(W2)** | `storeAddress{zipCode,baseAddress,detailAddress}` ← W2 · W3 | KPA 목록: `address`/`address2` **만** · Neture 운영자: `address`/`address2` **만** · GP mypage: `businessAddress ?? address` (fallback O) |
| 대표자명 | `representativeName` ← W1 | `ceoName` ← W3 | — | 소비처 대부분 `?? ` fallback 보유 (안전) |
| 약국 전화 | `metadata.pharmacy_phone` ← W4 | `pharmacyPhone` ← W3 | — | KPA 목록은 `metadata.pharmacy_phone` **만** 읽음 |
| 세금계산서 이메일 | `taxInvoiceEmail` | `taxEmail` / `email` | `organizations.metadata.taxInvoiceEmail` | fallback O |

---

## 4. 조직 · 약국 · 매장 · 공급자 데이터와의 중복

| 개념 | `users.businessInfo` | `organizations` | 서비스 entity | 정본 판정 |
|---|---|---|---|---|
| 상호/약국명 | `businessName` | `name` | `kpa_members.pharmacy_name` | **`organizations.name`** (실체 소유) |
| 주소 | `businessAddress`/`address`/`storeAddress` | `address` + `address_detail` | `kpa_members.pharmacy_address` | **`organizations`** |
| 사업자번호 | `businessNumber` | `business_number` | — | **`organizations.business_number`** (Neture 가 이미 이렇게 선언) |
| 대표자 | `representativeName`/`ceoName` | `metadata.ceoName` | `neture_suppliers.representative_name` | 서비스 entity 있으면 그것, 없으면 `organizations.metadata` |
| 담당자 이름/전화 | `contactName`/`managerPhone` | `metadata.contactName`/`managerPhone` | `neture_suppliers.manager_name`/`manager_phone` | 동일 |
| 업태/종목/사업자유형/개업일 | `businessType`/`businessItem`/`businessEntityType`/`businessStartDate` | — | `neture_suppliers.business_type`/`business_item` (2/4만) | **`users.businessInfo`** — 유일 저장소인 2필드가 있으므로 4필드를 여기 묶어두는 것이 최소 변경 |
| 면허번호 | `licenseNumber` | — | `kpa_pharmacist_profiles.license_number` · `kpa_members.license_number` · `glycopharm_members.metadata` | **`kpa_pharmacist_profiles`** |

**엔티티 이중 매핑**: `organizations` 테이블에 두 개의 entity 클래스가 매핑되어 있다 —
`packages/organization-core/src/entities/Organization.ts` 와 `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts`(`OrganizationStore`).
두 클래스의 컬럼 집합이 다르며(`OrganizationStore` 만 `storefront_config`/`template_profile`/`address_detail` 보유), `relations: ['organization']` 이 어느 쪽을 잡는지가 파일마다 다르다 → **D-6**.

---

## 5. 비원자적 write · 부분 실패 · drift 위험

### D-1 (P0) — `users.updated_at` 존재하지 않는 컬럼에 write

`routes/kpa/controllers/member.controller.ts:1210`

```
UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2
```

`users` 의 갱신 컬럼은 `@UpdateDateColumn() updatedAt` → PostgreSQL 실컬럼 `"updatedAt"`.
저장소 전체에서 `users` 에 대해 snake_case `updated_at` 을 쓰는 곳은 **이 한 줄뿐**이며, 같은 파일 9줄 아래(1219)는 `"updatedAt"` 을 쓴다. 마이그레이션에도 `users.updated_at` 을 만드는 구문이 없다.
→ **운영자가 KPA 회원의 이름을 수정하면 이 쿼리에서 예외 → 500.** 그런데 그 직전 `memberRepo.save(member)` 는 이미 커밋되어 있으므로 **kpa_members 만 반영되고 users.name 은 안 바뀐 채 실패**한다.
(정적 판정. 프로덕션 DB 컬럼 실측은 이번 조사에서 수행하지 않음 — §10)

### D-2 (P0) — KPA 회원 승인 동기화 예외 삼킴

`member.controller.ts:549~622`. `PATCH /kpa/members/:id/status` 의 pending→active 경로는

1. `memberRepo.save(member)` — `kpa_members.status='active'` (선행 커밋)
2. `UPDATE users SET status='active', approvedAt, approvedBy`
3. `INSERT kpa_pharmacist_profiles / kpa_student_profiles`
4. `UPDATE service_memberships SET status='active', approved_by, approved_at`

2~4 가 하나의 `try { } catch (syncError) { console.error(...) }` 안에 있고 **재던지지 않는다**. 응답은 200.
→ 2~4 중 어디서든 실패하면 `kpa_members`=active / `service_memberships`=pending / `users`=pending 인 **3중 불일치**가 무보고로 남는다. 목록 필터는 `sm.status` 기준이므로 승인했는데 승인대기 탭에 계속 남는 증상으로 나타난다.

### D-3 (P1) — 주소 키 비대칭 (write canonical / read legacy)

가입(W1)은 `businessAddress`·`businessAddressDetail` 로 저장하는데,
KPA 운영자 회원목록 projection(`member.controller.ts:398-400`)과 Neture 운영자 등록조회(`operator-registration.service.ts:49-50`)는 `address`·`address2` **만** 읽는다(fallback 없음).
→ 가입 경로로만 정보를 입력한 회원은 **운영자 화면에서 주소가 빈칸**으로 보이며, 운영자가 다시 입력하면 legacy 키에 저장되어 같은 사람의 주소가 두 키에 각각 남는다.

### D-4 (P1) — 약국 전화 키 이중화

공통 운영자 콘솔(W3)은 `businessInfo.pharmacyPhone`, KPA 운영자 콘솔(W4)은 `businessInfo.metadata.pharmacy_phone` 에 저장한다.
KPA 목록은 `metadata.pharmacy_phone` 만 읽는다 → **공통 콘솔에서 수정한 약국 전화는 KPA 화면에 절대 나타나지 않는다.**

### D-5 (P1) — KPA 운영자 대리 수정 비원자

`PATCH /kpa/members/:id/info` 는 `memberRepo.save()` + 최대 6개의 독립 `dataSource.query()` (users.name / users.nickname / users.businessInfo / kpa_members 주소동기화 / kpa_pharmacist_profiles upsert / role_assignments)를 트랜잭션 없이 순차 실행한다. D-1 과 결합하면 첫 실패 지점 이후 전부 미반영.
대비: 같은 목적의 `PATCH /auth/me/profile` 은 이미 `AppDataSource.transaction()` 으로 묶여 있다 (WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1 에서 교정됨) → **운영자 경로만 교정이 누락된 상태**.

### D-6 (P1) — `organizations` 이중 entity

§4 참조. 동일 테이블에 두 entity 클래스. `mypage.service.ts` 는 문자열 이름 `getRepository('OrganizationMember')` 로 접근하며 실패를 `catch {}` 로 무시한다 → relation 해석이 어긋나도 조용히 빈 배열이 되어 `userType.isOfficer=false` 로 표시된다.

### D-7 (P2) — read-modify-write 경합

W1~W4 는 `businessInfo` 전체를 읽어 통째로 덮는다. 본인 수정과 운영자 대리 수정이 겹치면 **나중에 커밋한 쪽이 상대 필드를 과거 값으로 되돌린다**. GP/KCos 의 jsonb concat(W5) 은 이 문제가 없다.

### D-8 (P2) — 매장 정보 저장 분할 + 실패 은폐

`pharmacy-info.controller.ts:332~358`: `organizations` 저장 후 `users.businessInfo` P2/P4 갱신을 별도로 실행하며 실패를 `console.error` 로만 처리하고 200 을 반환한다. Neture `supplier.service.ts:1155~1167` 도 동일 패턴.

---

## 6. 유지할 공통 Core 와 서비스별 Extension (최종 경계)

```
ACCOUNT_CORE      users
                  ├ 신원: email, password, firstName/lastName/name, nickname, phone, avatar
                  └ 계정 상태: status, isActive, isEmailVerified, 잠금/토큰
                  ✗ businessInfo 는 ACCOUNT_CORE 가 아니다 (아래)

SERVICE_PROFILE   service_memberships   ← 서비스 가입/승인 상태·role (승인 정본)
                  service_credentials   ← 서비스별 비밀번호
                  kpa_pharmacist_profiles / kpa_student_profiles ← 자격(면허·직역) 정본
                  kpa_members / glycopharm_members / neture_suppliers ← 서비스 회원 속성

DOMAIN_EXTENSION  organizations         ← 약국·매장·공급사 실체 (이름/주소/전화/사업자번호) 정본
                  organization_members  ← 소속·직위

INPUT_CACHE       users.businessInfo    ← 가입·신청 시점 사업자 입력 스냅샷
                  glycopharm_applications, kpa_pharmacy_requests
```

**핵심 경계 선언**: `users.businessInfo` 는 *플랫폼 계정 필드가 아니라 **사업자 입력 스냅샷 + 전용 컬럼이 없는 4개 필드의 임시 정본*** 이다. 이 두 역할만 남기고, 실체가 생긴 뒤(조직 승인 후)의 이름·주소·전화·사업자번호는 `organizations` 를 읽는다.
Neture 공급자 프로필(`supplier.service.ts:1176~1190`)이 이미 정확히 이 모델을 주석으로 선언하고 구현하고 있다 → **참조 구현으로 삼는다.**

---

## 7. 제거 · 읽기 전용화 · 이관이 필요한 경로

| # | 대상 | 조치 | 근거 |
|---|---|---|---|
| R1 | `users.serviceKey` · `users.permissions` | **읽기/쓰기 모두 제거** (컬럼은 유지, DROP 은 별도 WO) | write 0, DEAD |
| R2 | `businessInfo.pharmacyPhone` (공통 콘솔 write) | `metadata.pharmacy_phone` 으로 통일하거나, 읽는 쪽에 fallback 추가 | D-4 |
| R3 | KPA 목록 · Neture 운영자 조회의 주소 read | `COALESCE(businessAddress, address)` fallback 추가 (write 는 건드리지 않음) | D-3, migration 불필요 |
| R4 | `users.businessInfo.licenseNumber` | **읽기 전용화** — 정본은 `kpa_pharmacist_profiles.license_number` | §2-2 |
| R5 | `mypage.service.ts` 의 `businessInfo.metadata.workplace` | 유지하되 SERVICE_PROFILE 로 명시 (전용 컬럼 신설 안 함) | 최소 변경 |
| R6 | `profileCompletenessService` 평가 키 | canonical 키로 교체 (`ceoName`→`representativeName` 등) | DEAD 평가 |
| R7 | `organizations` 이중 entity | 신규 코드는 `OrganizationStore` 단일 사용으로 수렴, 문자열 repository 조회 금지 | D-6 |
| R8 | `users.approvedAt/approvedBy` | KPA 만 write → 유지하되 **승인 정본은 `service_memberships.approved_at`** 임을 문서·주석에 고정 | §2-1 |

---

## 8. Data migration 없이 가능한 최소 변경안

신규 테이블 0 · 신규 컬럼 0 · 데이터 backfill 0.

| # | 변경 | 파일 | 규모 |
|---|---|---|---|
| M1 | `updated_at` → `"updatedAt"` 오타 교정 | `member.controller.ts:1210` | 1줄 |
| M2 | KPA 승인 sync 블록의 `catch` 를 삼킴 → **재던짐 + 트랜잭션** 으로 교체 (`auth-account.controller.ts` 패턴 복사) | `member.controller.ts:549-622` | ~30줄 |
| M3 | `PATCH /kpa/members/:id/info` 전체를 `AppDataSource.transaction()` 으로 감싸기 | `member.controller.ts:1102-1360` | 래핑 |
| M4 | 주소 read fallback 추가 (`businessAddress ?? address`) | `member.controller.ts:398-400` · `operator-registration.service.ts:49-50` | 4줄 |
| M5 | `pharmacyPhone` read fallback 추가 | `member.controller.ts:395` | 1줄 |
| M6 | read-modify-write(W1~W4) → jsonb concat(W5 패턴)으로 교체 | 4개 파일 | 각 5~10줄 |
| M7 | 매장/공급자 프로필의 `businessInfo` write 실패를 200 이 아닌 에러로 승격 | `pharmacy-info.controller.ts` · `supplier.service.ts` | 각 5줄 |
| M8 | `profileCompletenessService` 키 canonical 정렬 | 1개 파일 | ~8줄 |

> 즉시 통합(테이블 병합·필드 이전)은 **하지 않는다.** 위 8건은 모두 "정본은 그대로 두고, 읽는 쪽이 정본을 못 읽는 문제와 write 원자성"만 교정한다.

---

## 9. 후속 구현 WO 와 우선순위

| 우선 | WO 후보 | 범위 | 근거 |
|:--:|---|---|---|
| **P0** | `WO-O4O-KPA-OPERATOR-MEMBER-WRITE-ATOMICITY-AND-COLUMN-FIX-V1` | M1 + M2 + M3 | D-1 · D-2 · D-5. 운영자 대리 수정/승인이 조용히 부분 실패 |
| **P1** | `WO-O4O-CROSS-SERVICE-BUSINESSINFO-KEY-READ-ALIGNMENT-V1` | M4 + M5 | D-3 · D-4. 운영자 화면 빈칸/미표시 해소 |
| **P1** | `WO-O4O-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1` | M6 + M7 | D-7 · D-8. 동시 편집 되돌림·실패 은폐 |
| **P2** | `WO-O4O-PROFILE-OWNERSHIP-BOUNDARY-DOC-V1` | §6 경계를 baseline 문서로 고정 + R1/R4/R8 주석 | 재발 방지 |
| **P2** | `WO-O4O-ORGANIZATION-ENTITY-DUAL-MAPPING-CONVERGENCE-V1` | R7 | D-6 |
| **P3** | `WO-O4O-PROFILE-COMPLETENESS-CANONICAL-KEY-V1` | M8 + R6 | Neture 완성도 저평가 |

---

## 10. 검증 · Git

| 항목 | 결과 |
|---|---|
| 코드 write | **0** |
| DB write | **0** |
| DB read | **0** (Cloud SQL proxy 세션이 응답하지 않아 프로덕션 컬럼 실측 미수행 — D-1 은 정적 근거로만 판정) |
| 운영 데이터 변경 | 없음 |
| 배포 | 없음 |
| 다른 세션 파일 접촉 | 없음 |
| 자격증명 기록 | 없음 |
| 기준 커밋 | `2e69b85fb` |

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 6건 (§9)
