# IR-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1

> **성격**: **설계 조사(IR)** — 구현 · migration · 신규 테이블 · 컬럼 삭제 · 개인정보 이동 없음. Architecture 정본 아님(사용자 검토 후 별도 승격).
> **기준 WO**: [`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1`](../work-orders/WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-V1.md)
> **입력**: [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](IR-O4O-PRIVACY-DATA-CENSUS-V1.md) 의 219 필드 / 62 테이블 (Census 재실행 없음 · 프로덕션 실값 조회 없음)
> **선행**: 0단계 [`WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1`](../work-orders/WO-O4O-AUTH-SERVICE-TOKEN-BOUNDARY-HARDENING-V1.md) CLOSED(44101be12)
> **관련 정본**: [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) · [`O4O-IDENTITY-ARCHITECTURE-V2`](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)
> **상태**: COMPLETE — 사용자 검토 대기 (2026-09-17)

---

## 0. 결론 요약

```text
219 필드 → 16 판정 (합계 219)
  users 잔존(개인정보 분류 24 중)   10   email · name · nickname · phone · 동의 3 · kakao 채널 2 · refresh_token_family
  users 밖 정본 이동                28   Identity 3 · Credential 2 · Business 12 · Store 9 · Contact 2
  Relationship 전환                 10   Business 3 · Store 3 · Organization 4
  Claim / Role 만 전달              11   Credential 7 · Role 4
  Service-local 잔존                84   문의·주문 스냅샷·감사·시스템 비밀·법정정보·정산
  삭제 후보                         56   password 계열 10 · dead auth 테이블 21 · 스냅샷 이름/IP/UA 25
  REVIEW(필드)                       1   service_credentials.password_hash (Identity V2 L2 재정의 선결)

신규 테이블: 0 (user_contacts · *_memberships · connected_channels · consents · professional_credentials 모두 불필요 — 기존 구조 승격으로 충족)
정본: 면허번호 4곳→1곳(kpa_pharmacist_profiles) · 사업자번호 7+1곳→1곳(organizations) · Identity=linked_accounts 재사용(Google sub)
```

가장 중요한 세 결과:

1. **`users` 는 개인정보 컬럼 10개(그중 실제 식별정보는 email · name · phone 3개)까지 줄어든다.** 나머지는 세션 상태(1) · 동의 기록(3) · 커뮤니티 표시명(1) · Connected Channel(2).
2. **면허번호 · 사업자번호 정본은 각각 이미 존재하는 테이블 1곳**이다 — `kpa_pharmacist_profiles.license_number` · `organizations.business_number`. 신규 객체 없이 나머지 사본을 참조 → 삭제로 바꾸면 된다.
3. **Google `sub` 전환은 `linked_accounts` 를 정리해 재사용**하며, 기존 사용자는 **로그인 상태에서 본인이 명시적으로 연결**한다. 이메일 동일성 자동 병합은 Target 에서 금지(현행 `socialAuthService.handleSocialAuth` · `auth-login.service.ts:388` 의 자동 병합 경로는 삭제 대상).

---

## 1. 조사 범위와 방법

- 입력: Census IR §3 의 219 필드(62 테이블). 본 세션의 census 집계 스크립트(`inv_count.py`)로 테이블별 건수를 재확인했다(62 테이블 · 219 필드 일치).
- 방법: 각 필드에 대해 (현재 entity 정의 · writer/reader · 기존 참조 컬럼 유무) 를 정적으로 확인하고 16 판정 중 하나를 부여했다. 이름 스냅샷 컬럼은 **같은 row 에 `user_id`/`requester_id`/`created_by` 참조가 이미 있는지**를 확인한 뒤에만 DELETE 로 판정했다.
- 제약 준수: 동결 Core(auth-core · organization-core) 변경이 필요한 항목은 **REVIEW 목록(§5)** 에만 기록. 프로덕션 실값 미조회. 다른 세션 untracked(`scripts/dev/`) 미접촉.

### 1-1. Census 정정 사항 (기록물이므로 Census 본문은 수정하지 않음)

| 항목 | Census 기재 | 확인 결과 |
|---|---|---|
| 사업자번호 저장 위치 | 8곳 | **물리 7곳 + 가상 1곳** — `neture_suppliers.business_number` 는 `WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1`(migration 20260327000300) 에서 이미 컬럼 제거 · `organizations` 로 읽음(`NetureSupplier.entity.ts` 주석 · `getOrgDataBatch()`). 즉 **organizations 를 사업자번호 정본으로 삼는 선례가 이미 존재**한다 |

---

## 2. Target Entity Matrix (§6-1)

신규 테이블을 만들지 않는다. 모든 Target Entity 는 **기존 테이블의 역할 재정의**다.

| Entity | 역할 | Canonical Data | 개인정보 여부 | 주요 Consumer | 물리 실체 |
|---|---|---|---|---|---|
| **User** | 사람 1명의 최소 식별 | id · email · name · nickname · phone · status · 동의 3 · refresh_token_family | ○ | 모든 서비스(표시 · 알림) | `users` (현행, 컬럼 축소) |
| **Auth Identity** | 로그인 수단 ↔ User 연결 | provider(google) · provider_user_id(sub) · status · last_used_at · linked_at | △ (sub 는 가명식별자) | auth-core 로그인 | `linked_accounts` (정리 후 재사용 · rename 은 REVIEW) |
| **Session** | 발급 토큰 | token · device_id · family | × | auth-core | `refresh_tokens` |
| **Professional Credential** | 전문 자격 정본 | user_id · credential_type(pharmacist/student/…) · license_number(암호화+lookup hash) · status · verified_at/by · activity_type | ○ (민감) | KPA · KPA-Branch · Pharmacy-Hub · GlycoPharm · LMS 강사 — **Claim 만** | `kpa_pharmacist_profiles` (+ `kpa_student_profiles` 통합 후보) |
| **Business** | 사업자(법적 주체) | business_number(unique) · name · representative_name · tax_invoice_email · 증빙(kyc_documents) | ○ (사업자 정보) | Neture 정산 · KPA 약국 · Cosmetics 매장 · 세금계산서 | `organizations` (type pharmacy/store/supplier) |
| **Store** | 물리 매장 · 소재지 | address · address_detail · phone · storefront_* | △ (매장 공개정보) | Store Workspace · QR · Tablet · Hub | `organizations` (Business 와 1:1 이면 같은 row · 다점포는 parent/child) |
| **Organization** | 협회 · 분회 · 비사업 조직 | name · type · 공개 연락처 | × | KPA-Branch · Community | `organizations` + `kpa_organizations` (이원화 REVIEW) |
| **Business/Store Relationship** | User ↔ Business/Store | organization_id · user_id · role(owner/manager/staff) · is_primary · joined/left | × (관계) | 매장 콘솔 · 승인 흐름 | `organization_members` (+ `cosmetics_store_members` 정리) |
| **Organization Relationship** | User ↔ 분회/협회 | branch_memberships(status · left_at · fee_category) · branch_officers(user_id) | × | KPA-Branch | `branch_memberships` · `branch_officers` |
| **Service Membership** | 서비스 참여 상태 | service_key · status · approved_by | × | JWT `memberships[]` | `service_memberships` (L3 · 불변) |
| **Authorization** | 권한 SSOT | `{service}:{role}` · scope | × | 모든 guard · JWT `roles[]` | `role_assignments` (불변) |
| **Connected Channel** | 외부 메신저 채널 자산(OAuth 아님) | kakao_open_chat_url · kakao_channel_url · contact_enabled / supplier contact_kakao(+visibility) | △ | 매장 공개 페이지 · Supplier 프로필 | `users.kakao_*` · `neture_suppliers.contact_kakao` (별도 테이블은 2번째 채널 유형 등장 시) |
| **Consent** | 동의 기록 | tos/privacy/marketing(users) · 문의 privacy_consent · media consented_at | × | 법무 · 처리방침 | 현행 컬럼 유지 (consents 테이블 불필요) |
| **Service-local** | 서비스 고유 스냅샷/설정/감사 | 문의 · 주문 스냅샷 · 감사 로그 · 시스템 비밀 · 정산 · 법정정보 | ○/× 혼재 | 각 서비스 | 각 테이블 (보유기간 정책 적용) |

---

## 3. §3 순서별 조사 결과

### 3-1. 219 필드 전수 매핑 (§6-2)

판정별 소계 (합계 219):

| Disposition | 건수 |
|---|---|
| USER_MINIMAL | 3 |
| AUTH_IDENTITY | 8 |
| CONTACT | 3 |
| CREDENTIAL | 7 |
| BUSINESS | 16 |
| BUSINESS_RELATIONSHIP | 3 |
| STORE | 12 |
| STORE_RELATIONSHIP | 3 |
| ORGANIZATION | 5 |
| ORG_RELATIONSHIP | 4 |
| CONNECTED_CHANNEL | 3 |
| CONSENT | 7 |
| ROLE | 4 |
| SERVICE_LOCAL | 84 |
| DELETE | 56 |
| REVIEW | 1 |
| **합계** | **219** |

테이블별 분포 (62 테이블):

| Table | 필드 수 | 판정 분포 |
|---|---|---|
| `users` | 24 | USER_MINIMAL 3 · DELETE 10 · CONTACT 1 · CONNECTED_CHANNEL 2 · BUSINESS 1 · AUTH_IDENTITY 4 · CONSENT 3 |
| `service_credentials` | 1 | REVIEW 1 |
| `service_memberships` | 1 | ROLE 1 |
| `role_assignments` | 1 | ROLE 1 |
| `refresh_tokens` | 4 | AUTH_IDENTITY 2 · DELETE 2 |
| `login_attempts` | 5 | DELETE 5 |
| `linking_sessions` | 3 | DELETE 3 |
| `linked_accounts` | 6 | AUTH_IDENTITY 2 · DELETE 4 |
| `account_activities` | 4 | DELETE 1 · SERVICE_LOCAL 3 |
| `user_activity_logs` | 3 | DELETE 3 |
| `audit_logs` | 2 | SERVICE_LOCAL 2 |
| `email_verification_tokens` | 2 | DELETE 2 |
| `password_reset_tokens` | 2 | DELETE 2 |
| `kyc_documents` | 4 | BUSINESS 3 · ROLE 1 |
| `kpa_members` | 7 | DELETE 5 · BUSINESS_RELATIONSHIP 1 · STORE 1 |
| `kpa_pharmacist_profiles` | 4 | CREDENTIAL 3 · ROLE 1 |
| `kpa_student_profiles` | 2 | CREDENTIAL 2 |
| `kpa_instructor_qualifications` | 2 | DELETE 1 · SERVICE_LOCAL 1 |
| `instructor_profiles` | 3 | SERVICE_LOCAL 2 · ORG_RELATIONSHIP 1 |
| `kpa_pharmacy_requests` | 6 | BUSINESS 3 · STORE 1 · CONTACT 1 · SERVICE_LOCAL 1 |
| `member_qualifications` | 2 | CREDENTIAL 2 |
| `branch_memberships` | 3 | BUSINESS_RELATIONSHIP 1 · STORE 1 · ORG_RELATIONSHIP 1 |
| `branch_officers` | 1 | ORG_RELATIONSHIP 1 |
| `branch_sites` | 1 | ORGANIZATION 1 |
| `organizations` | 6 | STORE 3 · BUSINESS 1 · ORGANIZATION 2 |
| `organization_members` | 1 | ORG_RELATIONSHIP 1 |
| `kpa_organizations` | 2 | ORGANIZATION 2 |
| `cosmetics_stores` | 5 | BUSINESS 1 · STORE_RELATIONSHIP 1 · STORE 3 |
| `cosmetics_store_applications` | 5 | BUSINESS 1 · STORE_RELATIONSHIP 2 · STORE 2 |
| `physical_stores` | 2 | BUSINESS 1 · STORE 1 |
| `role_applications` | 3 | BUSINESS 2 · SERVICE_LOCAL 1 |
| `neture_suppliers` | 17 | SERVICE_LOCAL 11 · CONNECTED_CHANNEL 1 · BUSINESS 3 · BUSINESS_RELATIONSHIP 1 · CONTACT 1 |
| `foreign_visitor_partners` | 3 | SERVICE_LOCAL 3 |
| `contact_inquiries` | 8 | SERVICE_LOCAL 6 · CONSENT 1 · DELETE 1 |
| `contact_requests` | 6 | SERVICE_LOCAL 5 · CONSENT 1 |
| `platform_inquiries` | 6 | SERVICE_LOCAL 4 · DELETE 2 |
| `neture_contact_messages` | 8 | SERVICE_LOCAL 5 · DELETE 2 · CONSENT 1 |
| `kpa_join_inquiries` | 3 | SERVICE_LOCAL 1 · DELETE 2 |
| `forum_category_requests` | 2 | DELETE 2 |
| `kpa_approval_requests` | 2 | DELETE 2 |
| `tablet_interest_requests` | 1 | SERVICE_LOCAL 1 |
| `neture_orders` | 3 | SERVICE_LOCAL 3 |
| `checkout_orders` | 1 | SERVICE_LOCAL 1 |
| `lms_survey_responses` | 4 | DELETE 2 · SERVICE_LOCAL 2 |
| `lms_attendance` | 1 | SERVICE_LOCAL 1 |
| `ai_query_logs` | 3 | SERVICE_LOCAL 3 |
| `operator_notification_settings` | 2 | SERVICE_LOCAL 2 |
| `service_contact_settings` | 1 | SERVICE_LOCAL 1 |
| `service_legal_profiles` | 8 | SERVICE_LOCAL 8 |
| `store_qr_scan_events` | 2 | DELETE 1 · SERVICE_LOCAL 1 |
| `foreign_visitor_partner_qr_scan_events` | 3 | SERVICE_LOCAL 3 |
| `channel_heartbeats` | 1 | SERVICE_LOCAL 1 |
| `neture_product_logs` | 1 | DELETE 1 |
| `cosmetics_price_logs` | 1 | DELETE 1 |
| `cosmetics_product_logs` | 1 | DELETE 1 |
| `cosmetics_contents` | 1 | DELETE 1 |
| `media_assets` | 1 | CONSENT 1 |
| `smtp_settings` | 6 | SERVICE_LOCAL 6 |
| `platform_store_payment_configs` | 2 | SERVICE_LOCAL 2 |
| `cafe24_connections` | 2 | SERVICE_LOCAL 2 |
| `cafe24_member_links` | 1 | SERVICE_LOCAL 1 |
| `branch_domains` | 1 | SERVICE_LOCAL 1 |

전체 매핑:

| # | Current Table | Current Field | Target Entity | Target Field/Concept | Disposition | 근거 |
|---|---|---|---|---|---|---|
| 1 | `users` | `email` | users | email (표시·알림용 · 전역 unique 유지) | **USER_MINIMAL** | Google 로그인 후에도 알림·표시 필요. identity key 는 sub 가 담당 |
| 2 | `users` | `password` | — | (없음) | **DELETE** | Google 연결 완료 계정부터 NULL → 컬럼 폐기. Core Freeze §5-A F10 예외 승인 필요 |
| 3 | `users` | `firstName` | users | name 으로 통합 | **DELETE** | name 과 중복. Google profile 은 name 단일 제공 |
| 4 | `users` | `lastName` | users | name 으로 통합 | **DELETE** | 동상 |
| 5 | `users` | `name` | users | name | **USER_MINIMAL** | 최소 표시명 |
| 6 | `users` | `nickname` | users | nickname (선택 · 커뮤니티 표시명) | **USER_MINIMAL** | 소비 49 파일(forum·댓글 표시). name 과 통합 여부는 질문 A |
| 7 | `users` | `avatar` | — | (없음) | **DELETE** | Google picture URL 미저장 · UI 는 initial 표시 |
| 8 | `users` | `phone` | users | phone (선택) | **CONTACT** | user_contacts 신설 없이 users 잔존. 매장/사업체 전화는 organizations 로 분리 |
| 9 | `users` | `kakao_open_chat_url` | users | connected_channel: kakao_open_chat | **CONNECTED_CHANNEL** | 채널 자산(OAuth 아님). 위치는 users 유지 — 2번째 채널 유형 전까지 별도 테이블 없음 |
| 10 | `users` | `kakao_channel_url` | users | connected_channel: kakao_channel | **CONNECTED_CHANNEL** | 동상 |
| 11 | `users` | `businessInfo(json)` | organizations / kpa_pharmacist_profiles | businessNumber→organizations.business_number · licenseNumber→kpa_pharmacist_profiles.license_number · address/phone→organizations | **BUSINESS** | 분해 이동 후 컬럼 폐기(Core Freeze 예외). 승인 동기화(organizationContactSync) 선례 |
| 12 | `users` | `provider` | linked_accounts(→auth_identities) | provider (google 고정) | **AUTH_IDENTITY** | Identity 는 users 밖 계층. 연결 완료 후 users 컬럼 폐기 |
| 13 | `users` | `provider_id` | linked_accounts(→auth_identities) | provider_user_id = Google sub | **AUTH_IDENTITY** | 동상 |
| 14 | `users` | `refreshTokenFamily` | users | refresh_token_family (세션 상태 · 개인정보 아님 · users 잔존) | **AUTH_IDENTITY** | 세션 계층. handoff family 승계(3a182eb92) 유지 |
| 15 | `users` | `lastLoginAt` | linked_accounts(→auth_identities) | last_used_at | **AUTH_IDENTITY** | LinkedAccount.lastUsedAt 이미 존재 |
| 16 | `users` | `lastLoginIp` | — | (없음) | **DELETE** | Census DELETE_CANDIDATE. account_activities 감사로 충분 |
| 17 | `users` | `loginAttempts` | — | (없음) | **DELETE** | password 로그인 폐기와 함께 무의미 |
| 18 | `users` | `lockedUntil` | — | (없음) | **DELETE** | 동상 |
| 19 | `users` | `reset_password_token` | — | (없음) | **DELETE** | password 폐기 |
| 20 | `users` | `reset_password_expires` | — | (없음) | **DELETE** | 동상 |
| 21 | `users` | `tos_accepted_at` | users | consent: tos_accepted_at | **CONSENT** | consents 테이블 신설 없이 users 컬럼 유지(3개뿐) |
| 22 | `users` | `privacy_accepted_at` | users | consent: privacy_accepted_at | **CONSENT** | 동상 |
| 23 | `users` | `marketing_accepted` | users | consent: marketing_accepted | **CONSENT** | 동상 |
| 24 | `users` | `approvedBy` | service_memberships | approved_by 가 대체 | **DELETE** | 승인은 L3 membership 단위. users 전역 승인자 컬럼은 중복 |
| 25 | `service_credentials` | `password_hash` | — | (Google 전환 후 불필요) | **REVIEW** | Identity V2 L2(서비스별 password) 정의와 Google 단일 로그인 충돌 — V2 §3 L2 재정의 별도 WO 후 판정 |
| 26 | `service_memberships` | `approved_by` | service_memberships | approved_by (승인 감사) | **ROLE** | L3 유지 |
| 27 | `role_assignments` | `assigned_by` | role_assignments | assigned_by | **ROLE** | Authorization SSOT 유지 |
| 28 | `refresh_tokens` | `token` | refresh_tokens | token (세션) | **AUTH_IDENTITY** | 세션 계층 유지 |
| 29 | `refresh_tokens` | `deviceId` | refresh_tokens | device_id (세션 구분) | **AUTH_IDENTITY** | family 구분에 사용 |
| 30 | `refresh_tokens` | `userAgent` | — | (없음) | **DELETE** | Census DELETE_CANDIDATE |
| 31 | `refresh_tokens` | `ipAddress` | — | (없음) | **DELETE** | 동상 |
| 32 | `login_attempts` | `email` | — | (테이블 은퇴) | **DELETE** | password 로그인 폐기 후 테이블 은퇴(보유 30일 소진 후) |
| 33 | `login_attempts` | `ipAddress` | — | (테이블 은퇴) | **DELETE** | password 로그인 폐기 후 테이블 은퇴(보유 30일 소진 후) |
| 34 | `login_attempts` | `userAgent` | — | (테이블 은퇴) | **DELETE** | password 로그인 폐기 후 테이블 은퇴(보유 30일 소진 후) |
| 35 | `login_attempts` | `deviceId` | — | (테이블 은퇴) | **DELETE** | password 로그인 폐기 후 테이블 은퇴(보유 30일 소진 후) |
| 36 | `login_attempts` | `location` | — | (테이블 은퇴) | **DELETE** | password 로그인 폐기 후 테이블 은퇴(보유 30일 소진 후) |
| 37 | `linking_sessions` | `provider` | — | (테이블 은퇴) | **DELETE** | Kakao/Naver linking 흐름 writer dead |
| 38 | `linking_sessions` | `verificationToken` | — | (테이블 은퇴) | **DELETE** | Kakao/Naver linking 흐름 writer dead |
| 39 | `linking_sessions` | `metadata` | — | (테이블 은퇴) | **DELETE** | Kakao/Naver linking 흐름 writer dead |
| 40 | `linked_accounts` | `provider` | linked_accounts(→auth_identities) | provider enum → google 만 | **AUTH_IDENTITY** | 기존 테이블 재사용(신설 없음). email/kakao/naver 값 정리 |
| 41 | `linked_accounts` | `providerId` | linked_accounts(→auth_identities) | provider_user_id (Google sub) · unique(provider,provider_user_id) | **AUTH_IDENTITY** | 인덱스 기존 존재 |
| 42 | `linked_accounts` | `email` | — | (없음) | **DELETE** | Google email 은 users.email 로 갱신만. 별도 저장 = 자동병합 유혹 |
| 43 | `linked_accounts` | `displayName` | — | (없음) | **DELETE** | profile 스냅샷 미저장 |
| 44 | `linked_accounts` | `profileImage` | — | (없음) | **DELETE** | 동상 |
| 45 | `linked_accounts` | `providerData` | — | (없음) | **DELETE** | raw provider JSON 미저장 |
| 46 | `account_activities` | `email` | — | user_id 참조로 대체 | **DELETE** | 스냅샷 이메일 중복 |
| 47 | `account_activities` | `ipAddress` | account_activities | ip_address (감사 1년) | **SERVICE_LOCAL** | 보유기간 정책 audit 1년 |
| 48 | `account_activities` | `userAgent` | account_activities | user_agent (감사 1년) | **SERVICE_LOCAL** | 동상 |
| 49 | `account_activities` | `details` | account_activities | details (감사) | **SERVICE_LOCAL** | 개인정보 혼입 금지 규칙 필요 |
| 50 | `user_activity_logs` | `ipAddress` | — | (테이블 은퇴) | **DELETE** | Census DELETE_CANDIDATE · writer 사실상 dead |
| 51 | `user_activity_logs` | `userAgent` | — | (테이블 은퇴) | **DELETE** | Census DELETE_CANDIDATE · writer 사실상 dead |
| 52 | `user_activity_logs` | `metadata` | — | (테이블 은퇴) | **DELETE** | Census DELETE_CANDIDATE · writer 사실상 dead |
| 53 | `audit_logs` | `ipAddress` | audit_logs | ipAddress (감사 1년) | **SERVICE_LOCAL** | 보유기간 정책 |
| 54 | `audit_logs` | `userAgent` | audit_logs | userAgent (감사 1년) | **SERVICE_LOCAL** | 보유기간 정책 |
| 55 | `email_verification_tokens` | `email` | — | (테이블 은퇴) | **DELETE** | Google 이메일 검증 대체 |
| 56 | `email_verification_tokens` | `token` | — | (테이블 은퇴) | **DELETE** | Google 이메일 검증 대체 |
| 57 | `password_reset_tokens` | `email` | — | (테이블 은퇴) | **DELETE** | password 폐기 |
| 58 | `password_reset_tokens` | `token` | — | (테이블 은퇴) | **DELETE** | password 폐기 |
| 59 | `kyc_documents` | `documentType` | kyc_documents | business_registration 만 허용 | **BUSINESS** | id_card/tax_certificate 유형 DELETE(Census). 사업자 증빙만 |
| 60 | `kyc_documents` | `fileUrl` | kyc_documents | file_url (사업자 증빙) | **BUSINESS** | organizations 에 연결 |
| 61 | `kyc_documents` | `fileName` | kyc_documents | file_name | **BUSINESS** | 동상 |
| 62 | `kyc_documents` | `verifiedBy` | kyc_documents | verified_by | **ROLE** | 검증자 감사 |
| 63 | `kpa_members` | `license_number` | kpa_pharmacist_profiles | license_number 정본 참조 | **DELETE** | read fallback 전용(entity 주석). 정본 1곳 |
| 64 | `kpa_members` | `university_name` | kpa_student_profiles | 정본 참조 | **DELETE** | 중복 |
| 65 | `kpa_members` | `student_year` | kpa_student_profiles | 정본 참조 | **DELETE** | 중복 |
| 66 | `kpa_members` | `pharmacy_name` | organization_members | organization_id 참조(약국 organizations row) | **BUSINESS_RELATIONSHIP** | Census §4-2 |
| 67 | `kpa_members` | `pharmacy_address` | organizations | address | **STORE** | 소재지는 매장/약국 row |
| 68 | `kpa_members` | `activity_type` | kpa_pharmacist_profiles | 정본 참조 | **DELETE** | 직역은 profile canonical |
| 69 | `kpa_members` | `fee_category` | branch_memberships | 정본 참조 | **DELETE** | 분회별 속성은 membership canonical |
| 70 | `kpa_pharmacist_profiles` | `license_number` | kpa_pharmacist_profiles(=professional credential) | license_number (단일 정본 · 암호화+lookup hash 옵션) | **CREDENTIAL** | 승격 대상. 서비스에는 Claim 만 |
| 71 | `kpa_pharmacist_profiles` | `license_verified` | kpa_pharmacist_profiles | status(verified) 로 일반화 | **CREDENTIAL** | bool→status enum 은 REVIEW 항목 |
| 72 | `kpa_pharmacist_profiles` | `activity_type` | kpa_pharmacist_profiles | activity_type (직역) | **CREDENTIAL** | 자격 부속 |
| 73 | `kpa_pharmacist_profiles` | `verified_by` | kpa_pharmacist_profiles | verified_by | **ROLE** | 검증자 감사 |
| 74 | `kpa_student_profiles` | `university_name` | kpa_student_profiles | university_name (학생 자격) | **CREDENTIAL** | credential_type=student 로 통합 후보 |
| 75 | `kpa_student_profiles` | `student_year` | kpa_student_profiles | student_year (학생 자격) | **CREDENTIAL** | credential_type=student 로 통합 후보 |
| 76 | `kpa_instructor_qualifications` | `license_number` | kpa_pharmacist_profiles | 정본 참조(user_id) | **DELETE** | 4번째 사본 제거 |
| 77 | `kpa_instructor_qualifications` | `supporting_documents` | kpa_instructor_qualifications | supporting_documents (강사 증빙 · 면허증 사본 제외) | **SERVICE_LOCAL** | LMS 로컬 |
| 78 | `instructor_profiles` | `display_name` | instructor_profiles | display_name | **SERVICE_LOCAL** | LMS 공개 프로필 |
| 79 | `instructor_profiles` | `bio` | instructor_profiles | bio | **SERVICE_LOCAL** | 동상 |
| 80 | `instructor_profiles` | `organization` | organization_members | organization_id 참조 | **ORG_RELATIONSHIP** | 자유문자열→참조 |
| 81 | `kpa_pharmacy_requests` | `pharmacy_name` | organizations | 승인 시 name 으로 이관 | **BUSINESS** | 신청 row 는 처리 후 보유기간 |
| 82 | `kpa_pharmacy_requests` | `business_number` | organizations | business_number | **BUSINESS** | 정본 1곳 |
| 83 | `kpa_pharmacy_requests` | `pharmacy_phone` | organizations | phone | **STORE** | 매장 연락처 |
| 84 | `kpa_pharmacy_requests` | `owner_phone` | users | phone | **CONTACT** | 개인 연락처 |
| 85 | `kpa_pharmacy_requests` | `tax_invoice_email` | organizations | tax_invoice_email (metadata 또는 컬럼 — REVIEW) | **BUSINESS** | 조직 세금계산서 수신처 |
| 86 | `kpa_pharmacy_requests` | `payload` | kpa_pharmacy_requests | payload (신청 스냅샷) | **SERVICE_LOCAL** | 처리 후 1년 삭제 대상 |
| 87 | `member_qualifications` | `qualification_type` | kpa_pharmacist_profiles / credential registry | qualification_type | **CREDENTIAL** | 자격 유형 registry 통합 후보(REVIEW) |
| 88 | `member_qualifications` | `metadata` | kpa_pharmacist_profiles / credential registry | metadata | **CREDENTIAL** | 자격 유형 registry 통합 후보(REVIEW) |
| 89 | `branch_memberships` | `workplace_name` | organization_members | organization_id 참조 | **BUSINESS_RELATIONSHIP** | Census §4-2 |
| 90 | `branch_memberships` | `workplace_address` | organizations | address | **STORE** | 소재지 |
| 91 | `branch_memberships` | `fee_category` | branch_memberships | fee_category (분회 membership 속성) | **ORG_RELATIONSHIP** | 정본화 결정(WO① CLOSED) 유지 |
| 92 | `branch_officers` | `name` | branch_officers | user_id 참조 | **ORG_RELATIONSHIP** | 임원 = 관계 |
| 93 | `branch_sites` | `contact` | branch_sites | contact (분회 공개 연락처) | **ORGANIZATION** | 개인 아님 |
| 94 | `organizations` | `address` | organizations | address | **STORE** | 매장/약국 소재지 정본 |
| 95 | `organizations` | `address_detail` | organizations | address_detail | **STORE** | 동상 |
| 96 | `organizations` | `phone` | organizations | phone | **STORE** | 매장 대표 연락처 |
| 97 | `organizations` | `business_number` | organizations | business_number (단일 정본 · unique 인덱스 REVIEW) | **BUSINESS** | 8곳 → 1곳 |
| 98 | `organizations` | `metadata` | organizations | metadata (개인정보 혼입 금지) | **ORGANIZATION** | serviceKey 등 비개인 메타만 |
| 99 | `organizations` | `created_by_user_id` | organizations | created_by_user_id | **ORGANIZATION** | 생성 감사 참조 |
| 100 | `organization_members` | `metadata` | organization_members | metadata | **ORG_RELATIONSHIP** | 관계 속성 |
| 101 | `kpa_organizations` | `address` | kpa_organizations | address (분회 공개 연락처) | **ORGANIZATION** | organizations 이원화는 REVIEW |
| 102 | `kpa_organizations` | `phone` | kpa_organizations | phone (분회 공개 연락처) | **ORGANIZATION** | organizations 이원화는 REVIEW |
| 103 | `cosmetics_stores` | `business_number` | organizations | business_number | **BUSINESS** | organization_id 링크 존재 → 컬럼 폐기 |
| 104 | `cosmetics_stores` | `owner_name` | organization_members | owner 관계(user_id) | **STORE_RELATIONSHIP** | 이름 스냅샷→관계 |
| 105 | `cosmetics_stores` | `contact_phone` | organizations | phone | **STORE** | 매장 연락처 |
| 106 | `cosmetics_stores` | `address` | organizations | address | **STORE** | 동상 |
| 107 | `cosmetics_stores` | `address_detail` | organizations | address_detail | **STORE** | 동상 |
| 108 | `cosmetics_store_applications` | `business_number` | organizations | 승인 시 business_number | **BUSINESS** | 신청 스냅샷 |
| 109 | `cosmetics_store_applications` | `owner_name` | organization_members | 승인 시 owner 관계 | **STORE_RELATIONSHIP** | 동상 |
| 110 | `cosmetics_store_applications` | `contact_phone` | organizations | 승인 시 phone | **STORE** | 동상 |
| 111 | `cosmetics_store_applications` | `address` | organizations | 승인 시 address | **STORE** | 동상 |
| 112 | `cosmetics_store_applications` | `applicant_user_id` | organization_members | user_id | **STORE_RELATIONSHIP** | 신청자=예비 owner |
| 113 | `physical_stores` | `business_number` | organizations | business_number | **BUSINESS** | physical_stores 는 RETIRE 후보(§3-6) |
| 114 | `physical_stores` | `store_name` | organizations | name | **STORE** | 동상 |
| 115 | `role_applications` | `business_name` | organizations | name (승인 시) | **BUSINESS** | 신청 스냅샷 |
| 116 | `role_applications` | `business_number` | organizations | business_number (승인 시) | **BUSINESS** | 동상 |
| 117 | `role_applications` | `metadata` | role_applications | metadata (신청 스냅샷) | **SERVICE_LOCAL** | 처리 후 보유기간 |
| 118 | `neture_suppliers` | `contact_email` | neture_suppliers | contact_email (공급자 공개 연락처) | **SERVICE_LOCAL** | 사업체 공개 연락처 · 노출 정책과 결합 |
| 119 | `neture_suppliers` | `contact_phone` | neture_suppliers | contact_phone | **SERVICE_LOCAL** | 동상 |
| 120 | `neture_suppliers` | `contact_kakao` | neture_suppliers | connected_channel: kakao (공급자) | **CONNECTED_CHANNEL** | 채널 자산 |
| 121 | `neture_suppliers` | `contact_email_visibility` | neture_suppliers | visibility flag | **SERVICE_LOCAL** | 노출 정책 |
| 122 | `neture_suppliers` | `contact_phone_visibility` | neture_suppliers | visibility flag | **SERVICE_LOCAL** | 동상 |
| 123 | `neture_suppliers` | `contact_kakao_visibility` | neture_suppliers | visibility flag | **SERVICE_LOCAL** | 동상 |
| 124 | `neture_suppliers` | `representative_name` | organizations | 대표자명 (metadata 또는 컬럼 — REVIEW) | **BUSINESS** | 사업자등록 정보 |
| 125 | `neture_suppliers` | `manager_name` | organization_members | 담당자 관계(user_id) | **BUSINESS_RELATIONSHIP** | Census §4-2 |
| 126 | `neture_suppliers` | `manager_phone` | users | phone | **CONTACT** | 담당자 개인 연락처 |
| 127 | `neture_suppliers` | `tax_invoice_email` | organizations | tax_invoice_email | **BUSINESS** | kpa_pharmacy_requests 와 동일 개념 |
| 128 | `neture_suppliers` | `business_registration_document_id` | kyc_documents / organizations | 사업자 증빙 참조 | **BUSINESS** | 증빙 |
| 129 | `neture_suppliers` | `settlement_bank_name` | neture_suppliers | settlement_* (정산 · 암호화 REVIEW) | **SERVICE_LOCAL** | 정산 도메인 로컬 |
| 130 | `neture_suppliers` | `settlement_account_number` | neture_suppliers | settlement_* (암호화 필수) | **SERVICE_LOCAL** | 동상 |
| 131 | `neture_suppliers` | `settlement_account_holder` | neture_suppliers | settlement_* | **SERVICE_LOCAL** | 동상 |
| 132 | `neture_suppliers` | `settlement_bankbook_document_id` | neture_suppliers | settlement_* | **SERVICE_LOCAL** | 동상 |
| 133 | `neture_suppliers` | `settlement_contact_name` | neture_suppliers | settlement_contact_* | **SERVICE_LOCAL** | 동상 |
| 134 | `neture_suppliers` | `settlement_contact_email` | neture_suppliers | settlement_contact_* | **SERVICE_LOCAL** | 동상 |
| 135 | `foreign_visitor_partners` | `contact_name` | foreign_visitor_partners | contact_name | **SERVICE_LOCAL** | 타 도메인 파트너 연락처 |
| 136 | `foreign_visitor_partners` | `contact_email` | foreign_visitor_partners | contact_email | **SERVICE_LOCAL** | 타 도메인 파트너 연락처 |
| 137 | `foreign_visitor_partners` | `contact_phone` | foreign_visitor_partners | contact_phone | **SERVICE_LOCAL** | 타 도메인 파트너 연락처 |
| 138 | `contact_inquiries` | `name` | contact_inquiries | name | **SERVICE_LOCAL** | 문의 1년 |
| 139 | `contact_inquiries` | `email` | contact_inquiries | email | **SERVICE_LOCAL** | 동상 |
| 140 | `contact_inquiries` | `phone` | contact_inquiries | phone | **SERVICE_LOCAL** | 동상 |
| 141 | `contact_inquiries` | `organization_name` | contact_inquiries | organization_name | **SERVICE_LOCAL** | 동상 |
| 142 | `contact_inquiries` | `message` | contact_inquiries | message | **SERVICE_LOCAL** | 동상 |
| 143 | `contact_inquiries` | `privacy_consent` | contact_inquiries | privacy_consent | **CONSENT** | 동의 기록 |
| 144 | `contact_inquiries` | `user_agent` | — | (없음) | **DELETE** | 수집 근거 없음 |
| 145 | `contact_inquiries` | `ip_hash` | contact_inquiries | ip_hash | **SERVICE_LOCAL** | 남용 방지 해시 |
| 146 | `contact_requests` | `organization_name` | contact_requests | organization_name | **SERVICE_LOCAL** | 문의 1년 |
| 147 | `contact_requests` | `name` | contact_requests | name | **SERVICE_LOCAL** | 문의 1년 |
| 148 | `contact_requests` | `email` | contact_requests | email | **SERVICE_LOCAL** | 문의 1년 |
| 149 | `contact_requests` | `phone` | contact_requests | phone | **SERVICE_LOCAL** | 문의 1년 |
| 150 | `contact_requests` | `message` | contact_requests | message | **SERVICE_LOCAL** | 문의 1년 |
| 151 | `contact_requests` | `privacy_consent` | contact_requests | privacy_consent | **CONSENT** | 동의 기록 |
| 152 | `platform_inquiries` | `name` | platform_inquiries | name | **SERVICE_LOCAL** | 문의 1년 |
| 153 | `platform_inquiries` | `email` | platform_inquiries | email | **SERVICE_LOCAL** | 문의 1년 |
| 154 | `platform_inquiries` | `phone` | platform_inquiries | phone | **SERVICE_LOCAL** | 문의 1년 |
| 155 | `platform_inquiries` | `message` | platform_inquiries | message | **SERVICE_LOCAL** | 문의 1년 |
| 156 | `platform_inquiries` | `ipAddress` | — | (없음) | **DELETE** | 해시 없이 raw IP |
| 157 | `platform_inquiries` | `userAgent` | — | (없음) | **DELETE** | 수집 근거 없음 |
| 158 | `neture_contact_messages` | `name` | neture_contact_messages | name | **SERVICE_LOCAL** | 문의 1년 |
| 159 | `neture_contact_messages` | `email` | neture_contact_messages | email | **SERVICE_LOCAL** | 문의 1년 |
| 160 | `neture_contact_messages` | `phone` | neture_contact_messages | phone | **SERVICE_LOCAL** | 문의 1년 |
| 161 | `neture_contact_messages` | `message` | neture_contact_messages | message | **SERVICE_LOCAL** | 문의 1년 |
| 162 | `neture_contact_messages` | `ipAddress` | — | (없음) | **DELETE** | ipHash 존재 |
| 163 | `neture_contact_messages` | `ipHash` | neture_contact_messages | ipHash | **SERVICE_LOCAL** | 남용 방지 |
| 164 | `neture_contact_messages` | `privacyConsent` | neture_contact_messages | privacyConsent | **CONSENT** | 동의 기록 |
| 165 | `neture_contact_messages` | `userAgent` | — | (없음) | **DELETE** | 수집 근거 없음 |
| 166 | `kpa_join_inquiries` | `message` | kpa_join_inquiries | message | **SERVICE_LOCAL** | 문의 1년 |
| 167 | `kpa_join_inquiries` | `ip_address` | — | (없음) | **DELETE** | raw IP |
| 168 | `kpa_join_inquiries` | `user_agent` | — | (없음) | **DELETE** | 수집 근거 없음 |
| 169 | `forum_category_requests` | `requester_name` | — | requester_id 참조로 대체 | **DELETE** | requester_id 존재(ForumControllerBase.ts:321) |
| 170 | `forum_category_requests` | `reviewer_name` | — | requester_id 참조로 대체 | **DELETE** | requester_id 존재(ForumControllerBase.ts:321) |
| 171 | `kpa_approval_requests` | `requester_name` | — | requester_id 참조로 대체 | **DELETE** | requester_id 존재(entity:60) |
| 172 | `kpa_approval_requests` | `requester_email` | — | requester_id 참조로 대체 | **DELETE** | requester_id 존재(entity:60) |
| 173 | `tablet_interest_requests` | `customer_name` | tablet_interest_requests | customer_name | **SERVICE_LOCAL** | 비회원 관심 신청 · 보유기간 |
| 174 | `neture_orders` | `orderer_name` | neture_orders | orderer_name (주문 스냅샷) | **SERVICE_LOCAL** | B2B 주문 기록 |
| 175 | `neture_orders` | `orderer_phone` | neture_orders | orderer_phone (주문 스냅샷) | **SERVICE_LOCAL** | B2B 주문 기록 |
| 176 | `neture_orders` | `orderer_email` | neture_orders | orderer_email (주문 스냅샷) | **SERVICE_LOCAL** | B2B 주문 기록 |
| 177 | `checkout_orders` | `shippingAddress` | checkout_orders | shippingAddress (주문 스냅샷) | **SERVICE_LOCAL** | commerce 기록 |
| 178 | `lms_survey_responses` | `ipAddress` | — | (없음) | **DELETE** | 설문 응답에 raw IP 불필요 |
| 179 | `lms_survey_responses` | `userAgent` | — | (없음) | **DELETE** | 동상 |
| 180 | `lms_survey_responses` | `anonymous_token` | lms_survey_responses | anonymous_token | **SERVICE_LOCAL** | 익명 응답 키 |
| 181 | `lms_survey_responses` | `answers` | lms_survey_responses | answers | **SERVICE_LOCAL** | 설문 본문 |
| 182 | `lms_attendance` | `geoLocation` | lms_attendance | geoLocation (출석 검증 · 보유기간 REVIEW) | **SERVICE_LOCAL** | LMS 로컬 |
| 183 | `ai_query_logs` | `question` | ai_query_logs | question (AI 메타 1년) | **SERVICE_LOCAL** | 보유기간 정책 |
| 184 | `ai_query_logs` | `answer` | ai_query_logs | answer (AI 메타 1년) | **SERVICE_LOCAL** | 보유기간 정책 |
| 185 | `ai_query_logs` | `contextData` | ai_query_logs | contextData (AI 메타 1년) | **SERVICE_LOCAL** | 보유기간 정책 |
| 186 | `operator_notification_settings` | `operator_email` | operator_notification_settings | operator_email | **SERVICE_LOCAL** | 운영 설정(직무 이메일) |
| 187 | `operator_notification_settings` | `operator_email_secondary` | operator_notification_settings | operator_email_secondary | **SERVICE_LOCAL** | 운영 설정(직무 이메일) |
| 188 | `service_contact_settings` | `recipient_emails` | service_contact_settings | recipient_emails | **SERVICE_LOCAL** | 운영 설정 |
| 189 | `service_legal_profiles` | `representative_name` | service_legal_profiles | representative_name | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 190 | `service_legal_profiles` | `business_registration_number` | service_legal_profiles | business_registration_number | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 191 | `service_legal_profiles` | `business_address` | service_legal_profiles | business_address | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 192 | `service_legal_profiles` | `customer_service_phone` | service_legal_profiles | customer_service_phone | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 193 | `service_legal_profiles` | `customer_service_email` | service_legal_profiles | customer_service_email | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 194 | `service_legal_profiles` | `privacy_officer_name` | service_legal_profiles | privacy_officer_name | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 195 | `service_legal_profiles` | `privacy_officer_email` | service_legal_profiles | privacy_officer_email | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 196 | `service_legal_profiles` | `privacy_officer_phone` | service_legal_profiles | privacy_officer_phone | **SERVICE_LOCAL** | 법정정보 SSOT(사업자 공개정보 · 직무 정보) |
| 197 | `store_qr_scan_events` | `user_agent` | — | (없음) | **DELETE** | raw UA 불필요(해시/요약으로) |
| 198 | `store_qr_scan_events` | `ip_hash` | store_qr_scan_events | ip_hash | **SERVICE_LOCAL** | 집계용 |
| 199 | `foreign_visitor_partner_qr_scan_events` | `ip_hash` | foreign_visitor_partner_qr_scan_events | ip_hash | **SERVICE_LOCAL** | 이미 해시/요약 |
| 200 | `foreign_visitor_partner_qr_scan_events` | `user_agent_hash` | foreign_visitor_partner_qr_scan_events | user_agent_hash | **SERVICE_LOCAL** | 이미 해시/요약 |
| 201 | `foreign_visitor_partner_qr_scan_events` | `user_agent_summary` | foreign_visitor_partner_qr_scan_events | user_agent_summary | **SERVICE_LOCAL** | 이미 해시/요약 |
| 202 | `channel_heartbeats` | `ip_address` | channel_heartbeats | ip_address (기기 운영) | **SERVICE_LOCAL** | 태블릿 기기 진단 · 보유기간 REVIEW |
| 203 | `neture_product_logs` | `ip_address` | — | (없음) | **DELETE** | user_id 로 충분 |
| 204 | `cosmetics_price_logs` | `user_name` | — | user_id 참조로 대체 | **DELETE** | user_id 컬럼 존재 |
| 205 | `cosmetics_product_logs` | `user_name` | — | user_id 참조로 대체 | **DELETE** | user_id 컬럼 존재 |
| 206 | `cosmetics_contents` | `author_name` | — | created_by 참조로 대체 | **DELETE** | created_by 존재(entity:79) |
| 207 | `media_assets` | `consented_at` | media_assets | consented_at | **CONSENT** | 초상/저작 동의 기록 |
| 208 | `smtp_settings` | `password` | smtp_settings | password (시스템 자격 · 암호화) | **SERVICE_LOCAL** | 개인정보 아닌 시스템 비밀 |
| 209 | `smtp_settings` | `accessToken` | smtp_settings | accessToken (시스템 자격 · 암호화) | **SERVICE_LOCAL** | 개인정보 아닌 시스템 비밀 |
| 210 | `smtp_settings` | `refreshToken` | smtp_settings | refreshToken (시스템 자격 · 암호화) | **SERVICE_LOCAL** | 개인정보 아닌 시스템 비밀 |
| 211 | `smtp_settings` | `clientSecret` | smtp_settings | clientSecret (시스템 자격 · 암호화) | **SERVICE_LOCAL** | 개인정보 아닌 시스템 비밀 |
| 212 | `smtp_settings` | `apiKey` | smtp_settings | apiKey (시스템 자격 · 암호화) | **SERVICE_LOCAL** | 개인정보 아닌 시스템 비밀 |
| 213 | `smtp_settings` | `apiSecret` | smtp_settings | apiSecret (시스템 자격 · 암호화) | **SERVICE_LOCAL** | 개인정보 아닌 시스템 비밀 |
| 214 | `platform_store_payment_configs` | `api_key` | platform_store_payment_configs | api_key (암호화) | **SERVICE_LOCAL** | 시스템 비밀 |
| 215 | `platform_store_payment_configs` | `api_secret` | platform_store_payment_configs | api_secret (암호화) | **SERVICE_LOCAL** | 시스템 비밀 |
| 216 | `cafe24_connections` | `access_token_enc` | cafe24_connections | access_token_enc | **SERVICE_LOCAL** | 이미 암호화 |
| 217 | `cafe24_connections` | `refresh_token_enc` | cafe24_connections | refresh_token_enc | **SERVICE_LOCAL** | 이미 암호화 |
| 218 | `cafe24_member_links` | `member_hash` | cafe24_member_links | member_hash | **SERVICE_LOCAL** | 해시 링크 |
| 219 | `branch_domains` | `verification_token` | branch_domains | verification_token | **SERVICE_LOCAL** | 도메인 검증 토큰 |

### 3-2. Duplicate Cluster Resolution (§6-3)

| 정보 | 현재 저장 위치 | Target 정본 | 서비스 전달방식 |
|---|---|---|---|
| **면허번호** (4곳) | `kpa_pharmacist_profiles.license_number` · `kpa_members.license_number`(read fallback) · `users.businessInfo.licenseNumber` · `kpa_instructor_qualifications.license_number` | **`kpa_pharmacist_profiles.license_number`** (암호화 값 + lookup hash · `utils/crypto.ts` 사용) | Claim `credential.pharmacist = {status, verified_at}` · 원번호는 KPA 검증 화면(kpa:operator 이상)만 |
| **사업자등록번호** (7+1곳) | `organizations.business_number` · `cosmetics_stores` · `cosmetics_store_applications` · `physical_stores` · `kpa_pharmacy_requests` · `role_applications` · `users.businessInfo.businessNumber` · (`neture_suppliers` = 가상, 이미 organizations 읽음) | **`organizations.business_number`** (unique 인덱스 추가는 REVIEW) | 신청 테이블은 승인 시 organizations 로 이관 후 스냅샷 보유기간 · 서비스는 `organization_id` 로 참조 |
| **직역/활동유형** (2곳) | `kpa_pharmacist_profiles.activity_type` · `kpa_members.activity_type` | `kpa_pharmacist_profiles.activity_type` | Claim |
| **학생 정보** (2곳) | `kpa_student_profiles` · `kpa_members.university_name/student_year` | `kpa_student_profiles` (Credential type=student 로 통합 후보) | Claim `credential.student` |
| **분회 회비구분** (2곳) | `branch_memberships.fee_category` · `kpa_members.fee_category` | `branch_memberships.fee_category` | Relationship 속성 (분회 서비스 내부) |
| **약국명/근무처명** (3곳) | `kpa_members.pharmacy_name` · `branch_memberships.workplace_name` · `users.businessInfo` | `organization_members.organization_id` → `organizations.name` | Relationship |
| **약국/매장 주소** (5곳) | `organizations.address` · `cosmetics_stores.address` · `kpa_members.pharmacy_address` · `branch_memberships.workplace_address` · `users.businessInfo.address` | `organizations.address / address_detail` | `organization_id` 참조 |
| **매장/사업체 전화** (5곳) | `organizations.phone` · `cosmetics_stores.contact_phone` · `kpa_pharmacy_requests.pharmacy_phone` · `users.businessInfo.phone` · `neture_suppliers.contact_phone`(공개용) | `organizations.phone` (Supplier 공개 연락처는 노출 정책 컬럼과 함께 SERVICE_LOCAL 유지) | 참조 |
| **개인 전화** (3곳) | `users.phone` · `kpa_pharmacy_requests.owner_phone` · `neture_suppliers.manager_phone` | `users.phone` | 원 정보 필요 시 users 조회(운영자 권한) |
| **세금계산서 이메일** (2곳) | `kpa_pharmacy_requests.tax_invoice_email` · `neture_suppliers.tax_invoice_email` | `organizations` (컬럼 추가 or metadata — REVIEW) | 참조 |
| **Identity(provider)** (2곳) | `users.provider/provider_id` · `linked_accounts.provider/providerId` | `linked_accounts` | JWT `sub` 는 users.id 유지, Google sub 는 토큰에 싣지 않음 |

### 3-3. 최소 `users` (§3-3)

`User.ts` 전 컬럼의 처분(개인정보 24 + 비개인 컬럼):

| 구분 | 컬럼 | 처분 |
|---|---|---|
| 유지 (식별·표시) | `id` · `email` · `name` · `nickname` · `phone` | 유지. `email` 전역 unique 유지(알림 · 표시 · 운영자 조회 키) |
| 유지 (상태) | `status` · `isActive` · `isEmailVerified` · `onboardingCompleted` · `createdAt` · `updatedAt` | 유지 (`isEmailVerified` 는 Google 연결 시 true 로 세팅되는 파생값) |
| 유지 (동의) | `tos_accepted_at` · `privacy_accepted_at` · `marketing_accepted` | 유지 (consents 테이블 불필요) |
| 유지 (채널) | `kakao_open_chat_url` · `kakao_channel_url` · `contact_enabled` | 유지 — Connected Channel (§3-9) |
| 유지 (세션) | `refreshTokenFamily` | 유지 |
| 이동 | `provider` · `provider_id` · `lastLoginAt` | → `linked_accounts` (연결 완료 후 컬럼 폐기) |
| 이동 | `businessInfo`(json) | → `organizations`(businessNumber · address · phone) + `kpa_pharmacist_profiles`(licenseNumber) 후 컬럼 폐기 |
| 삭제 | `password` · `loginAttempts` · `lockedUntil` · `reset_password_token` · `reset_password_expires` | Google 연결 완료 계정부터 NULL → 전원 연결 후 컬럼 폐기 |
| 삭제 | `firstName` · `lastName` · `avatar` · `lastLoginIp` · `approvedBy` | 중복/미사용 |
| 삭제 (deprecated) | `serviceKey`(@deprecated · SSOT=service_memberships) · `domain` · `approvedAt` | 이미 deprecated 표기 · L3 로 대체 |
| REVIEW | `roles`(런타임 전용 배열) | 컬럼 아님 · 변경 없음 |

**결과: 개인정보 컬럼 24 → 10 (식별정보 3 · 세션 1 · 동의 3 · 표시명 1 · 채널 2).** 모든 컬럼 삭제는 auth-core 동결 대상이므로 F10 예외 WO(§5 REVIEW-1) 로만 진행한다.

### 3-4. Auth Identity · Google `sub` 전환 (§3-4 · §6-6)

**구조**: `linked_accounts` 를 `auth_identities` 역할로 재사용한다.

| 현행 `linked_accounts` | Target |
|---|---|
| `provider` enum email/google/kakao/naver | `google` 만 (email/kakao/naver 값 row 는 삭제 · enum 축소는 REVIEW) |
| `providerId` | Google `sub` (unique (provider, providerId) 인덱스 기존) |
| `email` · `displayName` · `profileImage` · `providerData` | 삭제 (자동 병합 유혹 · 프로필 스냅샷 불필요) |
| `isVerified` · `isPrimary` | `status`(active/revoked) 로 단순화 (REVIEW) |
| `lastUsedAt` · `linkedAt` | 유지 (users.lastLoginAt 대체) |

**로그인 규칙**: Google ID token 검증 → `sub` 로 `linked_accounts` 조회 → hit 이면 해당 `user_id` 로 세션 발급. **miss 이면 이메일로 users 를 찾아 연결하지 않는다** — 신규 가입 흐름으로 보내거나(신규 사용자), "기존 계정에 연결하려면 기존 방식으로 로그인 후 연결" 안내(기존 사용자).

**Google Migration Matrix**:

| 기존 사용자 상태 | Google 연결 방법 | 자동병합 여부 | 예외처리 |
|---|---|---|---|
| ① email+password 활성 · Google 미연결 | 로그인 상태에서 "Google 연결" → ID token 검증 → `linked_accounts` insert → 성공 시 `users.password=NULL` | **없음** (본인 세션 + 명시 동작) | 연결 전 재인증(password 재입력) 요구 |
| ② Google 연결 완료 | `sub` 로 즉시 로그인 · password 경로 차단 | — | 연결 해제는 다른 Identity 가 없으면 불가(잠금 방지) |
| ③ 제시된 `sub` 가 **다른 user 에 이미 연결** | 연결 거부 | **없음** | 운영자 지원 흐름(본인 확인 후 수동 재배정 · 감사 로그) |
| ④ 기존 계정 접근 불가(password 분실 · Google 미연결) | 운영자 본인확인(가입 정보 · 서비스 membership 대조) 후 **연결 링크 발급(1회성 · 만료)** → 사용자가 Google 로그인으로 링크 소비 | **없음** (운영자 승인 + 사용자 행위) | 이메일만으로 발급 금지 · 발급/소비 감사 |
| ⑤ 같은 사람이 users row 2개 이상 보유(이메일 상이) | 연결은 1 row 에만 · 나머지는 별도 병합 도구(관계 · membership · role 이관)로 처리 | **없음** | Phase 6 이후 REVIEW — Target Model 범위 밖 |
| ⑥ 신규 사용자 | Google 로그인 즉시 users + linked_accounts 동시 생성 (password 없음) | — | 이메일이 기존 users 와 같아도 **새 row 생성하지 않고 ①/④ 안내** (중복 방지 · 자동 병합 금지 양립) |

**password 폐기 순서**: 계정 단위(연결 완료 시 NULL) → 전체 연결 완료 후 login/register 의 password 분기 제거 → 컬럼 폐기. `service_credentials.password_hash`(L2) 는 같은 순서를 따르되 Identity V2 문서 정합(§6)이 먼저다.

### 3-5. Professional Credential (§3-5)

- 정본: `kpa_pharmacist_profiles` (user_id unique · license_number · license_verified · activity_type · verified_at/by). **신규 `professional_credentials` 테이블 불필요.**
- 승격 시 필요한 변경(REVIEW-3): ① `license_verified` bool → `status` enum(pending/verified/rejected/expired) ② `verification_method`(document/registry/operator) ③ `license_number` 암호화 + `license_number_hash`(lookup · unique) ④ (선택) `credential_type` 컬럼 추가로 `kpa_student_profiles` · `member_qualifications` 흡수. ④ 는 테이블 위치가 `routes/kpa/` 인 점(공통 자격영역으로의 이동)이 REVIEW.
- 나머지 3곳(`kpa_members` · `users.businessInfo` · `kpa_instructor_qualifications`)은 **참조 → 삭제**. `kpa_members.license_number` 는 이미 read fallback 전용으로 선언돼 있어 순서상 가장 먼저 지울 수 있다.
- 면허증 사진은 받지 않는다(확정 정책). `kpa_instructor_qualifications.supporting_documents` 는 면허증 사본 제외 조건으로 SERVICE_LOCAL.

### 3-6. Business ≠ Store ≠ User (§3-6)

- **Business 정본 = `organizations` row (business_number 보유)**. type 값은 이미 런타임에서 `pharmacy` · `store` · `supplier` 가 쓰인다(`kpa-store-organization.provisioning.ts:69` · `supplier.service.ts:1391` · StoreConsoleController 필터). organization-core 의 type 선언은 `'division'|'branch'` 뿐이므로 **enum 확장 선언은 REVIEW-2**.
- **Store = 소재지 · 매장 공개정보**. Business 와 1:1(약국 대부분)이면 같은 row, 다점포면 Business row(parent) + Store row(child, `parentId`) — 기존 계층 컬럼(`parentId`/`level`/`path`)으로 표현 가능.
- `physical_stores`(+`physical_store_links`) 는 "business_number 로 서비스 간 매장 연결" 목적인데 `organizations.business_number` 가 그 역할을 이미 하고 `cosmetics_stores.organization_id` 링크도 존재한다 → **RETIRE 후보**(§4 삭제표). 단 organizations.business_number 에 unique 인덱스가 없으므로 RETIRE 전 unique 보장이 선행(REVIEW-2).
- `cosmetics_stores` 는 organization_id 를 가진 **서비스 프로필**로 남고(slug · logo · hero · region · status), business_number · owner_name · contact_phone · address 는 organizations 로.
- **Relationship**: `organization_members`(user_id · organization_id · role · is_primary) 가 Business/Store 관계 정본. `cosmetics_store_members`(owner/manager/staff) 는 organization_members 로 흡수 — role 어휘(admin/manager/member/moderator vs owner/manager/staff) 정렬은 REVIEW-2. 신규 `business_memberships` · `store_memberships` **불필요**.

### 3-7. Organization / Membership (§3-7)

| 현재 표현 | Target Relationship | 기존 Role 과 관계 | Migration 난이도 |
|---|---|---|---|
| `kpa_members.organization_id` + `pharmacy_name` | `organization_members`(약국 org) | `kpa:pharmacist/store_owner` 는 role_assignments 그대로 · 관계와 분리 | 중 (약국 org row 생성 필요) |
| `branch_memberships`(status · left_at · fee_category · workplace_*) | 유지 — 분회 membership 정본. workplace_* 만 organization_id 참조로 | `kpa-branch:member` 는 role · 관계 종료(left_at) 와 role 만료(valid_until) 별도 | 하 (workplace 2컬럼) |
| `branch_officers.name` | `branch_officers.user_id` 참조 | 임원 role 은 role_assignments(scope=branch) | 하 |
| `instructor_profiles.organization`(문자열) | `organization_members` 참조 | `lms:instructor` role 유지 | 하 |
| `cosmetics_stores.owner_name` / `cosmetics_store_members` | `organization_members` | `cosmetics:store_owner` role 유지 | 중 (role 어휘 정렬) |
| `cosmetics_store_applications.applicant_user_id` | 승인 시 `organization_members`(owner) | 승인 시 role 부여는 별도 단계 유지 | 하 |
| `neture_suppliers.manager_name/representative_name` | manager → `organization_members` · representative → organizations(BUSINESS) | `neture:supplier` role 유지 | 중 (manager 가 users 가 아닐 수 있음) |
| `users.businessInfo` | organizations + organization_members | 무관 | 중 (json 분해 · 승인 sync 선례 있음) |
| `kpa_organizations`(분회 registry 209행) ↔ `organizations` | **REVIEW-4** — 분회 membership 은 kpa_organizations, Business 관계는 organizations 로 **이원 유지** 가 현실적 최소안 | — | 상 (통합 시) / 하 (이원 유지) |

원칙: **관계 종료는 row 갱신(left_at/status), 새 관계는 새 row.** `organization_members` 에는 `leftAt` 이, `branch_memberships` 에는 `status+left_at` 이 이미 있어 이력형 모델로 쓸 수 있다.

### 3-8. Credential / Relationship / Authorization 분리 · Service Claim Matrix (§3-8 · §6-5)

JWT 현행 claim(`token.utils.ts`): `userId · sub · email · role · roles[] · memberships[] · accountAccess · tokenType`. **Target 은 여기에 개인정보를 더 싣지 않는다.** Credential/Relationship Claim 은 토큰이 아니라 **요청 시 서버 내부 조회(claim resolver)** 로 제공한다 — 토큰 크기와 stale 문제 회피.

| Service | 필요한 Credential Claim | Relationship Claim | Role (role_assignments) | 원 개인정보 필요 여부 |
|---|---|---|---|---|
| KPA (community) | `pharmacist.status` · `student.status` | 약국 org 소속(있으면) | kpa:member/pharmacist/store_owner/operator/admin | 검증 화면(operator+)만 면허번호 원값 |
| KPA-Branch | `pharmacist.status` | 분회 membership(status · fee_category) · 임원 | kpa-branch:member/operator/admin | 회비 · 연락은 users.phone 조회(operator+) |
| Pharmacy-Hub | `pharmacist.status` | 매장 org 소속 · role | pharmacy-hub:store_owner/member/supplier/… | 불필요 |
| GlycoPharm | `pharmacist.status` | 매장 org 소속 | glycopharm:pharmacist/store_owner/… | 불필요 |
| Cosmetics | — | 매장 org 소속(owner/manager/staff) | cosmetics:store_owner/seller/… | 매장 공개정보만(organizations) |
| Neture | — | 공급자 org 소속 | neture:supplier/operator/admin | 정산 · 세금계산서는 Neture SERVICE_LOCAL/organizations 직접 조회(operator+) |
| LMS | `pharmacist.status`(강사 자격) | instructor org | lms:instructor | 불필요 |
| Platform | — | — | platform:super_admin/admin/operator | 운영자 콘솔만 원값 (Access Boundary §3-10) |

`role_assignments` 는 어떤 경우에도 Credential · Relationship 과 합치지 않는다. Credential 상태 변화(면허 만료)는 role 을 자동 회수하지 않고 **정책이 결정**한다(질문 H).

### 3-9. Connected Channel (§3-9)

`users.kakao_*` 전수:

| 컬럼 | 성격 | Target |
|---|---|---|
| `kakao_open_chat_url` | 매장/약사 공개 상담 채널 URL | CONNECTED_CHANNEL — users 유지 |
| `kakao_channel_url` | 카카오 채널 URL | CONNECTED_CHANNEL — users 유지 |
| `contact_enabled` | 채널 노출 스위치 | 유지 (Census 개인정보 분류 외) |
| `neture_suppliers.contact_kakao` (+`_visibility`) | 공급자 채널 자산 | CONNECTED_CHANNEL / 노출 정책 SERVICE_LOCAL |

Kakao **OAuth/Login legacy** 는 전부 DELETE: passport Kakao/Naver 전략 · env · settings kakao 항목 · `AuthProvider.kakao/naver` · `linking_sessions` · `socialAuthService` Kakao 분기 · `SocialLoginButtons.tsx`. 별도 `connected_channels` 테이블은 2번째 채널 유형(LINE/WhatsApp)이 실제 등장할 때 만든다 — 지금은 컬럼 2개.

### 3-10. Access Boundary (§3-10)

| 정보 | 누가 원값을 볼 수 있는가 | 서비스 화면 |
|---|---|---|
| 면허번호 | KPA 검증 담당(kpa:operator 이상) · platform:admin | 마스킹(`****-1234`) 또는 Claim 만 |
| 사업자번호 | 해당 org 의 owner/manager · 서비스 operator 이상 · 정산 담당 | 마스킹 |
| 개인 전화/이메일 | 본인 · 서비스 operator 이상(업무 목적) | 비노출 |
| 정산 계좌 | Neture admin(정산) · 본인 org owner | 마스킹 · 암호화 저장 |
| Google sub | 아무도 화면에서 보지 않음 (내부 키) | — |
| 감사 로그 IP/UA | platform:admin | — |

접근은 모두 `role_assignments` + 관계(org membership) 조합으로 결정하고 `users.id` 단독 조회를 허용하지 않는다(Boundary Guard Rule 1 과 동일 원칙).

---

## 4. Delete / Retire Candidate (§6-7)

| 대상 | 현재 사용 여부 | Target 대체 | 삭제 Phase |
|---|---|---|---|
| `users.password` + reset/lock 5컬럼 | 활성(현행 로그인) | Google Identity | Phase 2 완료 후(전원 연결) — F10 예외 |
| `users.firstName/lastName/avatar/lastLoginIp/approvedBy` | 저사용/중복 | name · service_memberships | Phase 3 (F10 예외) |
| `users.provider/provider_id/lastLoginAt/businessInfo` | 활성 | linked_accounts · organizations · profiles | Phase 3 이동 후 |
| `login_attempts` · `email_verification_tokens` · `password_reset_tokens` | password 경로 전용 | 없음 | Phase 5 (보유 30일 소진 후) |
| `linking_sessions` · `linked_accounts` 의 email/kakao/naver row + 4 스냅샷 컬럼 | dead writer | linked_accounts(google) | Phase 2 정리 시 |
| `user_activity_logs` | writer dead(Census) | account_activities · audit_logs | Phase 5 |
| Kakao/Naver OAuth 코드 · env · settings · `SocialLoginButtons.tsx` | dead | Connected Channel(컬럼) | Phase 2 |
| `kyc_documents` id_card/tax_certificate 유형 | 미사용 | business_registration 만 | Phase 5 |
| `kpa_members` license_number/university_name/student_year/activity_type/fee_category | read fallback | profiles · branch_memberships | Phase 3 |
| `kpa_instructor_qualifications.license_number` | 사본 | profiles 참조 | Phase 3 |
| `cosmetics_stores` business_number/owner_name/contact_phone/address/address_detail | 활성 | organizations(organization_id 존재) | Phase 3 |
| `physical_stores` + `physical_store_links` | 활성(교차 서비스 매장 연결) | organizations.business_number(unique) | Phase 3 후 — REVIEW-2 선행 |
| `cosmetics_store_members` | 활성 | organization_members | Phase 4 (role 어휘 정렬 후) |
| 이름/이메일 스냅샷 9컬럼 (forum_category_requests 2 · kpa_approval_requests 2 · cosmetics_*_logs 2 · cosmetics_contents 1 · account_activities.email · neture_suppliers.manager_name) | 표시용 | user_id 참조 JOIN | Phase 5 |
| raw IP/UA 12컬럼 (refresh_tokens 2 · platform_inquiries 2 · neture_contact_messages 2 · kpa_join_inquiries 2 · lms_survey_responses 2 · contact_inquiries 1 · store_qr_scan_events 1) + neture_product_logs.ip_address | 수집 근거 없음 | 해시 컬럼(있는 곳) 또는 없음 | Phase 7 |
| `socialAuthService.handleSocialAuth` · `auth-login.service.ts:388` 이메일 자동 병합 | 활성(Google 경로) | 명시 연결 흐름 | **Phase 2 첫 항목** |

---

## 5. REVIEW — 동결 Core 변경이 필요한 범위 (구현 아님 · 필요 범위 기록만)

| # | 대상 Core | 필요 변경 | 근거 |
|---|---|---|---|
| REVIEW-1 | auth-core `User.ts` | 컬럼 폐기 14(password 계열 5 · 중복 5 · 이동 4) · login/register password 분기 제거 | F10 §5-A "HIGH 명시 예외 승인 필수" |
| REVIEW-2 | organization-core `Organization.ts` / `OrganizationMember.ts` | type enum 에 pharmacy/store/supplier 선언(런타임 이미 사용) · `business_number` unique 인덱스 · (선택) tax_invoice_email/representative_name 컬럼 vs metadata · member role 어휘에 owner/staff 정렬 | Business 정본 승격 |
| REVIEW-3 | `kpa_pharmacist_profiles` (routes/kpa · 동결 아님) | status enum · verification_method · 암호화+hash · credential_type(학생 흡수) · 공통 자격영역으로의 위치 이동 여부 | Credential 정본 승격 |
| REVIEW-4 | `kpa_organizations` ↔ `organizations` 이원화 | 이원 유지(최소안) vs 통합 | organization-core 동결 · 209행 registry |
| REVIEW-5 | auth-core `LinkedAccount.ts` | provider enum 축소(google) · 4 스냅샷 컬럼 삭제 · isVerified/isPrimary → status · (선택) 테이블명 `auth_identities` | Identity 재사용 |
| REVIEW-6 | `service_credentials.password_hash` (Identity V2 L2) | Google 전환 후 L2 password 의미 상실 — V2 §3 L2 재정의 또는 V3 | 문서 정합 §6 |
| REVIEW-7 | 보유기간 정책 미기재 항목 | `lms_attendance.geoLocation` · `channel_heartbeats.ip_address` · 신청 스냅샷(kpa_pharmacy_requests.payload · role_applications.metadata) · 정산 계좌 암호화 | RETENTION-POLICY V1 보강 |

---

## 6. 문서 정합 (CLAUDE.md §16 — 보고만 · 인라인 수정 없음)

| # | 문서 | drift | 처리 |
|---|---|---|---|
| 1 | [`O4O-IDENTITY-ARCHITECTURE-V2`](../architecture/O4O-IDENTITY-ARCHITECTURE-V2.md) (CANONICAL) | L2 = 서비스별 `service_credentials.password_hash` 를 정의하지만 확정 정책(Google 단일 로그인 · `sub` 기준)에서는 L2 password 가 존재하지 않는다. Phase 4(backfill) · Phase 5(users.password deprecation) 도 Google 전환 순서와 충돌 | **별도 WO 제안** — V2 §3 L2 를 "Auth Identity(google sub)" 로 재정의하거나 V3 승격. SUPERSEDED 표기는 대체 문서가 없어 불가(§16-3 ①) |
| 2 | [`IR-O4O-PRIVACY-DATA-CENSUS-V1`](IR-O4O-PRIVACY-DATA-CENSUS-V1.md) | 사업자번호 "8곳" 중 neture_suppliers 는 물리 컬럼 없음 | 기록물 — 본 IR §1-1 에 정정만 기록 |

---

## 7. §7 보고 항목 요약

| # | 항목 | 결과 |
|---|---|---|
| 1 | Target `users` 남는 필드 | 개인정보 분류 24 → **10** (email · name · nickname · phone · 동의 3 · kakao 2 · refresh_token_family). 실제 식별정보 3 |
| 2 | Core/공통 정본으로 이동 | **28** (Identity 3 → linked_accounts · Credential 2 → kpa_pharmacist_profiles · Business 12 + Store 9 → organizations · Contact 2 → users.phone) |
| 3 | Relationship 전환 | **10** (Business 3 · Store 3 · Organization 4) |
| 4 | Claim/Role 만 전달 | **11** (Credential 7 · Role 4) + Service Claim Matrix §3-8 |
| 5 | Service-local 잔존 | **84** (문의 5테이블 21 · 공급자 연락·정산 11 · 법정정보 8 · 감사/해시 10 · 시스템 비밀 12 · 주문/설문/AI/LMS/설정 등 22) |
| 6 | 삭제 후보 | **56** 필드 + 테이블 5(login_attempts · email_verification_tokens · password_reset_tokens · linking_sessions · user_activity_logs) + RETIRE 2(physical_stores · cosmetics_store_members) + Kakao OAuth 코드 |
| 7 | REVIEW | 필드 1(service_credentials.password_hash) · 구조 7건(§5) |
| 8 | Phase 2 이후 순서 | §8 |

### 7-1. 사용자 질문 A~J 에 대한 판정

| Q | 판정 |
|---|---|
| A. users 최소 구성 | email · name · phone + 상태/동의/세션. `nickname` 은 커뮤니티 표시명으로 유지하되 name 과 통합 여부는 사용자 결정(49 파일 소비) |
| B. Identity 위치 | users 밖 `linked_accounts` 재사용. 신규 테이블 없음 |
| C. user_contacts | **불필요** — phone 1컬럼뿐 |
| D. Credential 정본 | `kpa_pharmacist_profiles` 승격 · 학생/기타 자격은 credential_type 으로 흡수(REVIEW-3) |
| E. Business vs Store | `organizations` 단일 테이블 · 1:1 은 같은 row · 다점포는 parent/child |
| F. *_memberships 신설 | **불필요** — organization_members(Business/Store) · branch_memberships(분회) |
| G. kpa_organizations 이원화 | 이원 유지가 최소안(REVIEW-4) |
| H. Credential 상태 ↔ Role | 자동 회수하지 않음 · 정책 결정 사항 (role_assignments 불변) |
| I. Connected Channel 테이블 | 지금은 컬럼 유지 · 2번째 채널 유형 때 테이블 |
| J. Google 전환 자동 병합 | **금지** · 6 케이스 명시 연결(§3-4) · 현행 자동 병합 코드는 Phase 2 첫 삭제 항목 |

---

## 8. Phase 2~7 WO 재제안 (의존 순서)

```text
Phase 2  Google Identity 전환
  2-A  문서 정합: Identity V2 L2 재정의(별도 WO · 선결)
  2-B  자동 병합 경로 제거 + linked_accounts 정리(REVIEW-5) + 명시 연결 UI(케이스 ①~⑥) + 운영자 복구 링크(④)
  2-C  Kakao/Naver OAuth 코드 · settings 삭제(Connected Channel 컬럼 보존)
  2-D  연결 완료 계정 password NULL 화 (계정 단위 · 회귀 없음)
Phase 3  정본화 (expand → deploy → contract)
  3-A  organizations Business 승격(REVIEW-2: type enum · business_number unique · tax_invoice_email/representative)
  3-B  kpa_pharmacist_profiles Credential 승격(REVIEW-3: status · 암호화+hash · credential_type)
  3-C  users.businessInfo 분해 이동 · cosmetics_stores/kpa_pharmacy_requests/role_applications 사본 → organizations
  3-D  kpa_members 사본 5컬럼 · kpa_instructor_qualifications.license_number 참조 전환
Phase 4  Relationship / Claim
  4-A  organization_members 로 cosmetics_store_members · owner_name · manager_name · branch workplace · instructor org 전환
  4-B  claim resolver(credential · relationship) 도입 · 서비스 화면 마스킹 · JWT 무변경
Phase 5  중복 · dead 삭제 (contract)
  5-A  users 컬럼 14 폐기(REVIEW-1 · F10 예외 WO) · login_attempts/email_verification/password_reset/linking_sessions/user_activity_logs 은퇴
  5-B  스냅샷 이름 9컬럼 · physical_stores RETIRE · kyc 유형 축소
Phase 6  운영자 접근 최소화
  6-A  Access Boundary §3-10 을 guard 로 (원값 화면 = operator+ · 마스킹 기본)
  6-B  중복 계정 병합 도구(케이스 ⑤)
Phase 7  로그 · AI · 외부전송
  7-A  raw IP/UA 13컬럼 제거 · 보유기간 정책 보강(REVIEW-7) · 정산 계좌 암호화
```

각 Phase 는 migration 이 수반되므로 PRODUCTION-MIGRATION-STANDARD(expand→deploy→contract) 를 따르고, Core 변경(REVIEW-1 · 2 · 5)은 F10 명시 예외 WO 로 분리한다.

---

*작성: 2026-09-17 · 상태: COMPLETE — 사용자 검토 대기 · 구현 0 · migration 0 · 개인정보 이동 0 · 정본 승격 없음*
